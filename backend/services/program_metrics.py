"""Program Metrics Service — derived metrics layer for school-level recruiting relationships.

Computes and caches per-program metrics from raw collections:
  interactions, program_stage_history, program_signals,
  coach_flags, director_actions, programs.

Idempotent and recomputable. Stores results in `program_metrics` collection.

Usage (internal):
    from services.program_metrics import get_metrics, recompute_metrics, recompute_all

    metrics = await get_metrics(program_id, tenant_id)
    await recompute_metrics(program_id, tenant_id)
    await recompute_all()
"""

import logging
import statistics
from datetime import datetime, timezone, timedelta
from db_client import db

log = logging.getLogger(__name__)


# ── Public API ───────────────────────────────────────────────────────────────

async def get_metrics(program_id: str, tenant_id: str, *, max_age_hours: int = 6) -> dict:
    """Get cached metrics, recomputing if stale or missing."""
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=max_age_hours)).isoformat()

    cached = await db.program_metrics.find_one(
        {"program_id": program_id, "tenant_id": tenant_id, "computed_at": {"$gte": cutoff}},
        {"_id": 0},
    )
    if cached:
        return cached

    return await recompute_metrics(program_id, tenant_id)


async def recompute_metrics(program_id: str, tenant_id: str) -> dict:
    """Recompute and store metrics for a single program."""
    program = await db.programs.find_one(
        {"program_id": program_id, "tenant_id": tenant_id}, {"_id": 0}
    )
    if not program:
        return _empty_metrics(program_id, tenant_id, "Program not found")

    athlete = await db.athletes.find_one({"tenant_id": tenant_id}, {"_id": 0})
    athlete_id = (athlete or {}).get("id", "")
    org_id = (athlete or {}).get("org_id")

    interactions = await db.interactions.find(
        {"program_id": program_id, "tenant_id": tenant_id}, {"_id": 0}
    ).sort("date_time", -1).to_list(500)

    stage_history = await db.program_stage_history.find(
        {"program_id": program_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)

    coach_flags = await db.coach_flags.find(
        {"program_id": program_id, "tenant_id": tenant_id}, {"_id": 0}
    ).to_list(100)

    director_actions_query = {"athlete_id": athlete_id} if athlete_id else {"athlete_id": "__none__"}
    director_actions = await db.director_actions.find(
        director_actions_query, {"_id": 0}
    ).to_list(100)

    signals = await db.program_signals.find(
        {"program_id": program_id, "is_active": True}, {"_id": 0}
    ).to_list(100)

    now = datetime.now(timezone.utc)

    # ── Compute metrics ──────────────────────────────────────────────────
    m = _compute_interaction_metrics(interactions, now)
    m.update(_compute_meaningful_engagement(interactions, now))
    m.update(_compute_stage_metrics(program, stage_history, now))
    m.update(_compute_flag_metrics(coach_flags, director_actions))
    m.update(_compute_signal_metrics(signals, interactions))
    m.update(_compute_engagement_trend(interactions, now))

    # Pipeline health (depends on all previous metrics)
    m["pipeline_health_state"] = _compute_pipeline_health(m)

    # Data confidence
    confidence = _compute_data_confidence(m, interactions, stage_history)

    metrics = {
        "program_id": program_id,
        "tenant_id": tenant_id,
        "athlete_id": athlete_id,
        "org_id": org_id,
        "university_name": program.get("university_name", ""),
        **m,
        "data_confidence": confidence,
        "computed_at": now.isoformat(),
    }

    await db.program_metrics.update_one(
        {"program_id": program_id, "tenant_id": tenant_id},
        {"$set": metrics},
        upsert=True,
    )

    return metrics


async def recompute_all() -> dict:
    """Recompute metrics for every active program. Returns summary."""
    programs = await db.programs.find(
        {"is_active": {"$ne": False}},
        {"_id": 0, "program_id": 1, "tenant_id": 1},
    ).to_list(10000)

    computed = 0
    errors = 0
    for p in programs:
        try:
            await recompute_metrics(p["program_id"], p["tenant_id"])
            computed += 1
        except Exception as e:
            log.warning(f"Failed to compute metrics for {p['program_id']}: {e}")
            errors += 1

    log.info(f"program_metrics: recomputed {computed}, errors {errors}")
    return {"computed": computed, "errors": errors, "total": len(programs)}


# ── Internal computation functions ───────────────────────────────────────────

def _parse_dt(val) -> datetime | None:
    if not val:
        return None
    if isinstance(val, datetime):
        return val if val.tzinfo else val.replace(tzinfo=timezone.utc)
    try:
        dt = datetime.fromisoformat(str(val).replace("Z", "+00:00"))
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except Exception:
        return None


# ── Meaningful engagement ruleset ────────────────────────────────────────

_MEANINGFUL_TYPES = {
    "coach_reply", "coach reply",
    "phone_call", "phone call",
    "video_call", "video call",
    "campus_visit", "campus visit",
    "camp",
}


def _is_meaningful_engagement(ix: dict, interactions: list) -> bool:
    """Determine if an interaction qualifies as meaningful engagement.

    Rules:
    1. Type is in _MEANINGFUL_TYPES (coach reply, call, visit, camp)
    2. Any signal field is set: coach_question_detected, request_type,
       invite_type, offer_signal, scholarship_signal
    3. is_meaningful flag is True
    4. Athlete outbound email that is a reply within 48h of a meaningful
       coach interaction (advancing a live thread)
    """
    # Flag-based
    if ix.get("is_meaningful"):
        return True

    # Type-based
    ix_type = ix.get("type", "").lower().replace(" ", "_")
    if ix_type in _MEANINGFUL_TYPES:
        return True

    # Signal-based
    if ix.get("coach_question_detected"):
        return True
    if ix.get("request_type"):
        return True
    if ix.get("invite_type"):
        return True
    if ix.get("offer_signal"):
        return True
    if ix.get("scholarship_signal"):
        return True

    # Athlete outbound reply advancing a live meaningful thread
    outbound_types = {"email_sent", "email sent", "text_message", "text message"}
    if ix_type in outbound_types or ix.get("initiated_by") == "athlete":
        ix_dt = _parse_dt(ix.get("date_time") or ix.get("created_at"))
        if ix_dt:
            window = ix_dt - timedelta(hours=48)
            for prior in interactions:
                prior_dt = _parse_dt(prior.get("date_time") or prior.get("created_at"))
                if not prior_dt or prior_dt >= ix_dt or prior_dt < window:
                    continue
                # Prior interaction must be a meaningful coach-initiated one
                prior_type = prior.get("type", "").lower().replace(" ", "_")
                is_coach_meaningful = (
                    prior_type in _MEANINGFUL_TYPES
                    or prior.get("coach_question_detected")
                    or prior.get("request_type")
                    or prior.get("invite_type")
                )
                if is_coach_meaningful:
                    return True

    return False


def _compute_meaningful_engagement(interactions: list, now: datetime) -> dict:
    """Find last meaningful engagement and derive freshness label."""
    if not interactions:
        return {
            "last_meaningful_engagement_at": None,
            "last_meaningful_engagement_type": None,
            "days_since_last_meaningful_engagement": None,
            "engagement_freshness_label": "no_recent_engagement",
        }

    last_at = None
    last_type = None

    for ix in interactions:  # sorted newest-first
        if _is_meaningful_engagement(ix, interactions):
            dt = _parse_dt(ix.get("date_time") or ix.get("created_at"))
            if dt:
                last_at = dt
                last_type = ix.get("type", "unknown")
                break  # newest first, so first match is the most recent

    if not last_at:
        return {
            "last_meaningful_engagement_at": None,
            "last_meaningful_engagement_type": None,
            "days_since_last_meaningful_engagement": None,
            "engagement_freshness_label": "no_recent_engagement",
        }

    days = (now - last_at).days
    label = _freshness_label(days)

    return {
        "last_meaningful_engagement_at": last_at.isoformat(),
        "last_meaningful_engagement_type": last_type,
        "days_since_last_meaningful_engagement": days,
        "engagement_freshness_label": label,
    }


def _freshness_label(days: int) -> str:
    """Map days since last meaningful engagement to a user-facing label."""
    if days <= 7:
        return "active_recently"
    if days <= 14:
        return "needs_follow_up"
    if days <= 30:
        return "momentum_slowing"
    return "no_recent_engagement"


def _compute_interaction_metrics(interactions: list, now: datetime) -> dict:
    """Derive reply rate, response times, engagement freshness from interactions."""
    total = len(interactions)
    if total == 0:
        return {
            "reply_rate": None,
            "median_response_time_hours": None,
            "meaningful_interaction_count": 0,
            "days_since_last_engagement": None,
            "unanswered_coach_questions": 0,
        }

    # Outbound interactions (athlete-initiated)
    outbound_types = {"email_sent", "email sent", "text_message", "text message", "video_call", "video call", "phone_call", "phone call"}
    inbound_types = {"coach_reply", "coach reply", "email_received", "email received"}

    outbound_count = sum(1 for ix in interactions if ix.get("type", "").lower().replace(" ", "_") in outbound_types or ix.get("initiated_by") == "athlete")
    inbound_count = sum(1 for ix in interactions if ix.get("type", "").lower().replace(" ", "_") in inbound_types or ix.get("initiated_by") == "coach")

    # Reply rate: inbound / outbound
    reply_rate = round(inbound_count / outbound_count, 2) if outbound_count > 0 else None

    # Response times
    response_times = [ix["response_time_hours"] for ix in interactions if ix.get("response_time_hours") is not None]
    median_rt = round(statistics.median(response_times), 1) if response_times else None

    # Meaningful interactions
    meaningful_count = sum(
        1 for ix in interactions
        if _is_meaningful_engagement(ix, interactions)
    )

    # Days since last engagement
    last_dt = _parse_dt(interactions[0].get("date_time") or interactions[0].get("created_at"))
    days_since = (now - last_dt).days if last_dt else None

    # Unanswered coach questions
    unanswered = 0
    for ix in interactions:
        if ix.get("coach_question_detected"):
            # Check if there's a later athlete-initiated interaction
            ix_dt = _parse_dt(ix.get("date_time") or ix.get("created_at"))
            if ix_dt:
                has_followup = any(
                    _parse_dt(later.get("date_time") or later.get("created_at"))
                    and _parse_dt(later.get("date_time") or later.get("created_at")) > ix_dt
                    and (later.get("initiated_by") == "athlete" or later.get("type", "").lower().replace(" ", "_") in outbound_types)
                    for later in interactions
                )
                if not has_followup:
                    unanswered += 1

    return {
        "reply_rate": reply_rate,
        "median_response_time_hours": median_rt,
        "meaningful_interaction_count": meaningful_count,
        "days_since_last_engagement": days_since,
        "unanswered_coach_questions": unanswered,
    }


def _compute_stage_metrics(program: dict, stage_history: list, now: datetime) -> dict:
    """Derive stage velocity, stall detection from stage history."""
    stage_entered_at = _parse_dt(program.get("stage_entered_at"))
    stage_stalled_days = (now - stage_entered_at).days if stage_entered_at else None

    # Stage velocity: average days between transitions
    if len(stage_history) >= 2:
        deltas = []
        for i in range(len(stage_history) - 1):
            dt_a = _parse_dt(stage_history[i].get("created_at"))
            dt_b = _parse_dt(stage_history[i + 1].get("created_at"))
            if dt_a and dt_b:
                deltas.append(abs((dt_a - dt_b).days))
        stage_velocity = round(statistics.mean(deltas), 1) if deltas else None
    else:
        stage_velocity = None

    # Overdue followups
    next_due = _parse_dt(program.get("next_action_due"))
    overdue = 0
    if next_due and now > next_due:
        overdue = 1

    return {
        "stage_velocity": stage_velocity,
        "stage_stalled_days": stage_stalled_days,
        "overdue_followups": overdue,
    }


def _compute_flag_metrics(coach_flags: list, director_actions: list) -> dict:
    """Count coach flags and director actions."""
    return {
        "coach_flag_count": len(coach_flags),
        "director_action_count": len(director_actions),
    }


def _compute_signal_metrics(signals: list, interactions: list) -> dict:
    """Count invite/info request signals from interactions and program_signals."""
    invite_count = sum(1 for ix in interactions if ix.get("invite_type"))
    info_request_count = sum(1 for ix in interactions if ix.get("request_type"))

    # Also count from program_signals
    invite_count += sum(1 for s in signals if s.get("signal_type") == "invite")
    info_request_count += sum(1 for s in signals if s.get("signal_type") == "info_request")

    return {
        "invite_count": invite_count,
        "info_request_count": info_request_count,
    }


def _compute_engagement_trend(interactions: list, now: datetime) -> dict:
    """Classify engagement trend based on recent vs older interaction cadence."""
    if len(interactions) < 2:
        return {"engagement_trend": "insufficient_data"}

    recent_cutoff = now - timedelta(days=14)
    older_cutoff = now - timedelta(days=42)

    recent = [ix for ix in interactions if _parse_dt(ix.get("date_time") or ix.get("created_at")) and _parse_dt(ix.get("date_time") or ix.get("created_at")) >= recent_cutoff]
    older = [ix for ix in interactions if _parse_dt(ix.get("date_time") or ix.get("created_at")) and recent_cutoff > _parse_dt(ix.get("date_time") or ix.get("created_at")) >= older_cutoff]

    recent_count = len(recent)
    older_count = len(older)

    if recent_count == 0 and older_count == 0:
        trend = "inactive"
    elif recent_count > older_count:
        trend = "accelerating"
    elif recent_count == older_count:
        trend = "steady"
    elif recent_count > 0:
        trend = "decelerating"
    else:
        trend = "stalled"

    return {"engagement_trend": trend}


def _compute_pipeline_health(m: dict) -> str:
    """Derive pipeline_health_state from pre-computed metrics.

    Scoring approach: accumulate positive and negative signals, then map
    the net score to one of five supportive, action-oriented states.

    States (best → needs attention):
        strong_momentum  — relationship is thriving
        active           — healthy engagement, keep going
        needs_follow_up  — time to reach out
        cooling_off      — engagement is fading, act soon
        at_risk          — relationship needs immediate attention
    """
    score = 0  # higher = healthier

    # ── Meaningful engagement recency (strongest signal) ──
    days_meaningful = m.get("days_since_last_meaningful_engagement")
    if days_meaningful is not None:
        if days_meaningful <= 7:
            score += 3
        elif days_meaningful <= 14:
            score += 1
        elif days_meaningful <= 30:
            score -= 1
        else:
            score -= 3
    else:
        # Never had meaningful engagement
        score -= 2

    # ── Engagement trend ──
    trend = m.get("engagement_trend", "insufficient_data")
    if trend == "accelerating":
        score += 2
    elif trend == "steady":
        score += 1
    elif trend == "decelerating":
        score -= 1
    elif trend in ("stalled", "inactive"):
        score -= 2

    # ── Meaningful interaction depth ──
    meaningful_count = m.get("meaningful_interaction_count", 0)
    if meaningful_count >= 5:
        score += 2
    elif meaningful_count >= 2:
        score += 1
    elif meaningful_count == 0:
        score -= 1

    # ── Overdue follow-ups (negative signal) ──
    if m.get("overdue_followups", 0) > 0:
        score -= 2

    # ── Unanswered coach questions (urgent negative signal) ──
    if m.get("unanswered_coach_questions", 0) > 0:
        score -= 2

    # ── Stage velocity (if available) ──
    velocity = m.get("stage_velocity")
    if velocity is not None:
        if velocity <= 14:
            score += 1  # fast progression
        elif velocity >= 45:
            score -= 1  # slow progression

    # ── Map score to state ──
    if score >= 5:
        return "strong_momentum"
    if score >= 2:
        return "active"
    if score >= 0:
        return "needs_follow_up"
    if score >= -3:
        return "cooling_off"
    return "at_risk"


def _compute_data_confidence(metrics: dict, interactions: list, stage_history: list) -> str:
    """Assess how much data underpins these metrics: HIGH / MEDIUM / LOW."""
    score = 0
    total = 8

    if len(interactions) >= 5:
        score += 1
    if len(interactions) >= 1:
        score += 1
    if metrics.get("reply_rate") is not None:
        score += 1
    if metrics.get("meaningful_interaction_count", 0) >= 1:
        score += 1
    if len(stage_history) >= 1:
        score += 1
    if metrics.get("median_response_time_hours") is not None:
        score += 1
    if metrics.get("engagement_trend") not in (None, "insufficient_data"):
        score += 1
    if metrics.get("last_meaningful_engagement_at") is not None:
        score += 1

    pct = round((score / total) * 100)
    if pct >= 70:
        return "HIGH"
    if pct >= 40:
        return "MEDIUM"
    return "LOW"


def _empty_metrics(program_id: str, tenant_id: str, reason: str) -> dict:
    return {
        "program_id": program_id,
        "tenant_id": tenant_id,
        "athlete_id": "",
        "org_id": None,
        "university_name": "",
        "reply_rate": None,
        "median_response_time_hours": None,
        "meaningful_interaction_count": 0,
        "days_since_last_engagement": None,
        "unanswered_coach_questions": 0,
        "last_meaningful_engagement_at": None,
        "last_meaningful_engagement_type": None,
        "days_since_last_meaningful_engagement": None,
        "engagement_freshness_label": "no_recent_engagement",
        "overdue_followups": 0,
        "stage_velocity": None,
        "stage_stalled_days": None,
        "engagement_trend": "insufficient_data",
        "pipeline_health_state": "at_risk",
        "invite_count": 0,
        "info_request_count": 0,
        "coach_flag_count": 0,
        "director_action_count": 0,
        "data_confidence": "LOW",
        "computed_at": datetime.now(timezone.utc).isoformat(),
        "_error": reason,
    }

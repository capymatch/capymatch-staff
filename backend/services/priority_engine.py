"""Priority Engine v2 — Single Source of Truth for all priority, attention,
and urgency logic across CapyMatch.

This module is the ONLY place where priority scoring, attention status,
urgency classification, and mission control ordering are computed.
No other file may independently invent priority/urgency logic.

Canonical Inputs (consumed, never recomputed):
    - pipeline_stage  → from services/stage_engine.py
    - signals/metrics → from services/program_metrics.py
    - top_action      → from services/top_action_engine.py (actionability)

Output Contract (per-program):
    priority_score, priority_band, attention_status, urgency,
    momentum, opportunity_tier, stale_flag, blocker_flag, overdue_flag,
    primary_action, why_this_is_priority, cta_label, hero_eligible,
    flags, owner, risk_context

Phase 1-2 Audit + Phase 3 Implementation for Sprint: Priority Engine v2.
"""

from datetime import datetime, timezone
import logging

log = logging.getLogger(__name__)

# ── Scoring Constants ────────────────────────────────────────────────────

STAGE_URGENCY_PTS = {
    "committed": 0,
    "archived": 0,
    "added": 0,
    "outreach": 4,
    "in_conversation": 8,
    "campus_visit": 12,
    "offer": 15,
}

HEALTH_PTS = {
    "at_risk": 30,
    "cooling_off": 20,
    "needs_follow_up": 15,
    "awaiting_reply": 10,
    "active": 5,
    "strong_momentum": 0,
    "still_early": 0,
}

MOMENTUM_FROM_HEALTH = {
    "at_risk": "cooling",
    "cooling_off": "cooling",
    "needs_follow_up": "cooling",
    "awaiting_reply": "steady",
    "active": "steady",
    "strong_momentum": "building",
    "still_early": "steady",
}

# Priority band thresholds
_BAND_CRITICAL = 120
_BAND_HIGH = 80
_BAND_MEDIUM = 40


# ── Per-Program Priority ────────────────────────────────────────────────

def compute_program_priority(
    program: dict,
    top_action: dict | None = None,
    metrics: dict | None = None,
) -> dict:
    """Compute canonical priority for a single program.

    This is the SSOT for priority/attention/urgency — no other system
    should independently score these dimensions.

    Scoring dimensions:
        1. Actionability        (0-100 pts) — from top_action priority
        2. Time urgency         (0-80 pts)  — due dates
        3. Activity recency     (0-40 pts)  — days since last activity
        4. Stage urgency        (0-15 pts)  — pipeline_stage value
        5. Coach engagement     (0-60 pts)  — reply, visit signals
        6. Health signal        (0-30 pts)  — pipeline health state

    Returns a dict conforming to the Priority Output Contract.
    """
    score = 0
    flags = []

    signals = program.get("signals") or {}
    days_since = signals.get("days_since_activity")
    if days_since is None:
        days_since = signals.get("days_since_last_activity", 99)
    if days_since is None:
        days_since = 99

    # ── 1. Actionability (0-100 pts) ─────────────────────────────────
    ta_priority = 8
    if top_action:
        ta_priority = top_action.get("priority", 8)
        ta_score = max(0, (8 - ta_priority)) * 14  # P1=98, P2=84 ... P8=0
        score += ta_score
        if ta_priority <= 1:
            flags.append("coachFlag")
        if ta_priority <= 2:
            flags.append("escalation")

    # ── 2. Time Urgency (0-80 pts) ───────────────────────────────────
    days_until_due = None
    due = program.get("next_action_due")
    if due:
        try:
            due_str = str(due).replace("Z", "+00:00")
            due_dt = datetime.fromisoformat(due_str)
            if due_dt.tzinfo is None:
                due_dt = due_dt.replace(tzinfo=timezone.utc)
            days_until_due = (due_dt - datetime.now(timezone.utc)).days
            if days_until_due < 0:
                score += 80
                flags.append("overdue")
            elif days_until_due <= 1:
                score += 60
                flags.append("dueSoon")
            elif days_until_due <= 3:
                score += 40
            elif days_until_due <= 7:
                score += 20
        except (ValueError, TypeError):
            pass

    # ── 3. Activity Recency (0-40 pts) ───────────────────────────────
    stale_flag = days_since > 14
    if stale_flag:
        score += 40
    elif days_since > 7:
        score += 25
    elif days_since > 3:
        score += 10

    # ── 4. Stage Urgency (0-15 pts) ──────────────────────────────────
    from services.stage_engine import compute_pipeline_stage
    stage = program.get("pipeline_stage") or compute_pipeline_stage(program, signals)
    score += STAGE_URGENCY_PTS.get(stage, 0)

    # ── 5. Coach Engagement Signals (0-60 pts) ───────────────────────
    if signals.get("has_coach_reply"):
        score += 30
        flags.append("coachReply")
    if signals.get("has_campus_visit"):
        score += 30

    # ── 6. Health Signal (0-30 pts) ──────────────────────────────────
    health = "active"
    if metrics:
        health = metrics.get("pipeline_health_state", "active")
        score += HEALTH_PTS.get(health, 0)

    # ── Classify priority_band ───────────────────────────────────────
    hard_flags = {"overdue", "dueSoon", "coachFlag", "escalation"}
    has_hard = bool(set(flags) & hard_flags)

    if score >= _BAND_CRITICAL or ("escalation" in flags):
        priority_band = "critical"
    elif score >= _BAND_HIGH or has_hard:
        priority_band = "high"
    elif score >= _BAND_MEDIUM:
        priority_band = "medium"
    else:
        priority_band = "low"

    # ── attention_status ─────────────────────────────────────────────
    blocker_flag = "coachFlag" in flags or "escalation" in flags
    overdue_flag = "overdue" in flags

    if blocker_flag:
        attention_status = "blocker"
    elif overdue_flag or health == "at_risk":
        attention_status = "at_risk"
    elif priority_band in ("high", "critical"):
        attention_status = "needs_action"
    else:
        attention_status = "on_track"

    # ── urgency ──────────────────────────────────────────────────────
    if overdue_flag or "escalation" in flags:
        urgency = "critical"
    elif "dueSoon" in flags or score >= 60:
        urgency = "soon"
    else:
        urgency = "monitor"

    # ── momentum ─────────────────────────────────────────────────────
    if metrics:
        momentum = MOMENTUM_FROM_HEALTH.get(health, "steady")
    else:
        if days_since >= 7:
            momentum = "cooling"
        elif days_since >= 3:
            momentum = "steady"
        else:
            momentum = "building"

    # ── opportunity_tier ─────────────────────────────────────────────
    from services.stage_engine import PIPELINE_STAGE_RANK
    stage_rank = PIPELINE_STAGE_RANK.get(stage, 0)
    if stage_rank >= 3:      # campus_visit, offer, committed
        opportunity_tier = "high_value"
    elif stage_rank >= 2:    # in_conversation
        opportunity_tier = "growing"
    elif stage_rank >= 1:    # outreach
        opportunity_tier = "early"
    else:
        opportunity_tier = "inactive"

    # ── Primary action / CTA / reason ────────────────────────────────
    if top_action:
        primary_action = top_action.get("action", "Review this school")
        cta_label = top_action.get("cta_label", "Review")
        reason = top_action.get("reason", "")
    elif overdue_flag:
        primary_action = "Follow up — action is overdue"
        cta_label = "Follow Up"
        reason = "Next action was due and hasn't been completed"
    elif stage == "added":
        primary_action = "Send your first message to this school"
        cta_label = "Start Outreach"
        reason = "No outreach has been sent yet"
    else:
        primary_action = "Review this school"
        cta_label = "Review"
        reason = ""

    # ── why_this_is_priority ─────────────────────────────────────────
    why_parts = []
    if blocker_flag:
        why_parts.append("Coach flagged this school for attention")
    if overdue_flag:
        why_parts.append("Overdue follow-up needs action")
    if "coachReply" in flags and score >= 60:
        why_parts.append("Coach responded — momentum is building")
    if stale_flag:
        why_parts.append(f"No activity in {days_since} days")
    if stage_rank >= 4 and days_since > 3:
        why_parts.append(f"High-value opportunity ({stage}) needs attention")
    if not why_parts and score >= _BAND_HIGH:
        why_parts.append("High priority based on current activity")
    why_this_is_priority = "; ".join(why_parts) if why_parts else ""

    # ── hero_eligible ────────────────────────────────────────────────
    hero_eligible = priority_band in ("critical", "high") or score >= _BAND_HIGH

    # ── risk_context ─────────────────────────────────────────────────
    risk_context = None
    if overdue_flag:
        risk_context = "Action overdue — follow up needed"
    elif stale_flag:
        risk_context = f"No activity in {days_since} days"
    elif "escalation" in flags:
        risk_context = "Escalation from support team"

    # ── Build output (Priority Output Contract) ──────────────────────
    return {
        # Identity
        "programId": program.get("program_id", ""),
        "universityName": program.get("university_name", ""),
        # Core priority
        "priority_score": score,
        "priority_band": priority_band,
        "attention_status": attention_status,
        "urgency": urgency,
        "momentum": momentum,
        "opportunity_tier": opportunity_tier,
        # Flags
        "stale_flag": stale_flag,
        "blocker_flag": blocker_flag,
        "overdue_flag": overdue_flag,
        "flags": flags,
        # Action
        "primary_action": primary_action,
        "why_this_is_priority": why_this_is_priority,
        "cta_label": cta_label,
        "risk_context": risk_context,
        "hero_eligible": hero_eligible,
        "owner": (top_action.get("owner", "athlete") if top_action else "athlete"),
        # ── Legacy aliases (backward compat with PipelinePage components) ──
        "attentionScore": score,
        "tier": priority_band if priority_band != "critical" else "high",
        "attentionLevel": priority_band if priority_band != "critical" else "high",
        "heroEligible": hero_eligible,
        "primaryAction": primary_action,
        "reason": reason,
        "reasonShort": reason[:80] if reason else "",
        "heroReason": why_this_is_priority,
        "ctaLabel": cta_label,
        "riskContext": risk_context,
        "prioritySource": "live",
        "recapRank": None,
    }


def compute_all_program_priorities(
    programs: list,
    top_actions_map: dict,
    metrics_map: dict,
) -> list:
    """Compute priority for all active programs, sorted by score desc.

    Args:
        programs: list of program dicts (must have signals, pipeline_stage)
        top_actions_map: {program_id: top_action_dict}
        metrics_map: {program_id: metrics_dict}
    """
    results = []
    for p in programs:
        if not p.get("is_active", True):
            continue
        pid = p.get("program_id", "")
        priority = compute_program_priority(
            program=p,
            top_action=top_actions_map.get(pid),
            metrics=metrics_map.get(pid),
        )
        results.append(priority)

    results.sort(key=lambda x: x["priority_score"], reverse=True)
    return results


def pick_top_priority(priorities: list) -> dict | None:
    """Pick the single top priority from a sorted priority list.

    Returns the highest-scored hero-eligible program, or the highest
    overall if none are hero-eligible.
    """
    if not priorities:
        return None
    hero = next((p for p in priorities if p.get("hero_eligible")), None)
    return hero or priorities[0]


# ── Mission Control Athlete Ranking ──────────────────────────────────────

def rank_athletes_for_mission_control(
    athletes: list,
    athlete_programs_map: dict,
    metrics_map: dict,
) -> list:
    """Rank athletes for mission control ordering.

    Each athlete is scored based on:
        - Worst-case program priority (highest urgency program)
        - Days since activity
        - Pipeline momentum

    Args:
        athletes: list of athlete dicts
        athlete_programs_map: {athlete_id: [program_dicts]}
        metrics_map: {program_id: metrics_dict}

    Returns list of athlete dicts with `_mc_score` and `_mc_rank` attached,
    sorted by descending urgency.
    """
    scored = []
    for a in athletes:
        aid = a.get("id", "")
        programs = athlete_programs_map.get(aid, [])

        # Compute max urgency across this athlete's programs
        max_urgency_score = 0
        worst_health = "active"
        for p in programs:
            pid = p.get("program_id", "")
            mx = metrics_map.get(pid, {})
            health = mx.get("pipeline_health_state", "active")
            health_score = HEALTH_PTS.get(health, 0)
            days = mx.get("days_since_last_engagement") or 0
            recency_score = 40 if days > 14 else (25 if days > 7 else (10 if days > 3 else 0))
            program_urgency = health_score + recency_score
            if program_urgency > max_urgency_score:
                max_urgency_score = program_urgency
                worst_health = health

        # Athlete-level signals
        days_inactive = a.get("days_since_activity", 0) or 0
        momentum = a.get("pipeline_momentum", 0) or 0

        mc_score = max_urgency_score
        mc_score += 30 if days_inactive > 14 else (15 if days_inactive > 7 else 0)
        mc_score += 20 if momentum < 0.3 else 0

        a_copy = {**a}
        a_copy["_mc_score"] = mc_score
        a_copy["_mc_worst_health"] = worst_health
        scored.append(a_copy)

    scored.sort(key=lambda x: x["_mc_score"], reverse=True)
    for i, a in enumerate(scored):
        a["_mc_rank"] = i + 1
    return scored


# ── School Health Classification (canonical) ────────────────────────────

def classify_program_health(metrics: dict | None) -> str:
    """Classify a program's health status from canonical metrics.

    This replaces school_pod._compute_health() and any other
    independent health classification logic.
    """
    if not metrics:
        return "no_data"
    return metrics.get("pipeline_health_state", "active")

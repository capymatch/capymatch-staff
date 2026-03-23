import logging
"""Athlete-facing routes: programs CRUD, college coaches, interactions, dashboard.

All data is scoped by `tenant_id`, resolved from the athlete's claimed record.
Uses the unified JWT auth middleware throughout.
"""

log = logging.getLogger(__name__)
from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timezone, timedelta
from typing import Optional
import asyncio
import uuid

from auth_middleware import get_current_user_dep
from db_client import db
from services.athlete_store import recompute_derived_data

router = APIRouter()

# ─────────────────────────────────────────────────────────────────────────
# Adapter: JWT user → tenant_id
# ─────────────────────────────────────────────────────────────────────────

async def get_athlete_tenant(current_user: dict) -> str:
    """Resolve tenant_id from the user's linked athlete record."""
    if current_user["role"] not in ("athlete", "parent"):
        raise HTTPException(403, "Only athletes/parents can access this")
    athlete = await db.athletes.find_one(
        {"user_id": current_user["id"]}, {"_id": 0, "tenant_id": 1}
    )
    if not athlete or not athlete.get("tenant_id"):
        raise HTTPException(404, "No claimed athlete profile found")
    return athlete["tenant_id"]


# ─────────────────────────────────────────────────────────────────────────
# Interaction signal computation (ported from athlete app programs.py)
# ─────────────────────────────────────────────────────────────────────────

def _compute_signals_from_interactions(interactions: list) -> dict:
    """Pure computation of signals from a list of interactions."""
    now = datetime.now(timezone.utc)
    outreach_count = 0
    reply_count = 0
    has_coach_reply = False
    last_outreach_date = None
    last_reply_date = None
    last_activity_date = None
    total_interactions = len(interactions)

    for ix in interactions:
        ix_type = (ix.get("type") or "").lower()
        dt_str = ix.get("date_time") or ix.get("created_at", "")
        try:
            dt = datetime.fromisoformat(str(dt_str).replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
        except Exception as e:  # noqa: E722
            log.warning("Handled exception (handled): %s", e)
            dt = None

        if dt and (last_activity_date is None or dt > last_activity_date):
            last_activity_date = dt

        if ix_type not in ("coach_reply", "email_received"):
            outreach_count += 1
            if dt and (last_outreach_date is None or dt > last_outreach_date):
                last_outreach_date = dt

        if ix_type in ("coach_reply", "email_received"):
            has_coach_reply = True
            reply_count += 1
            if dt and (last_reply_date is None or dt > last_reply_date):
                last_reply_date = dt

    days_since_outreach = (now - last_outreach_date).days if last_outreach_date else None
    days_since_reply = (now - last_reply_date).days if last_reply_date else None
    days_since_activity = (now - last_activity_date).days if last_activity_date else None

    return {
        "outreach_count": outreach_count,
        "reply_count": reply_count,
        "has_coach_reply": has_coach_reply,
        "last_outreach_date": last_outreach_date.isoformat() if last_outreach_date else None,
        "last_reply_date": last_reply_date.isoformat() if last_reply_date else None,
        "days_since_outreach": days_since_outreach,
        "days_since_reply": days_since_reply,
        "days_since_activity": days_since_activity,
        "total_interactions": total_interactions,
    }


async def _batch_signals(tenant_id: str, program_ids: list) -> dict:
    """Batch compute interaction signals for multiple programs in ONE query."""
    all_interactions = await db.interactions.find(
        {"tenant_id": tenant_id, "program_id": {"$in": program_ids}},
        {"_id": 0},
    ).to_list(5000)

    by_program = {}
    for ix in all_interactions:
        pid = ix.get("program_id")
        by_program.setdefault(pid, []).append(ix)

    return {
        pid: _compute_signals_from_interactions(by_program.get(pid, []))
        for pid in program_ids
    }



# ─────────────────────────────────────────────────────────────────────────
# Coach Watch — Weighted Relationship State Engine
# ─────────────────────────────────────────────────────────────────────────

def _time_decay(days):
    """Signal strength decay: 100%→80%→55%→30%→10%."""
    if days is None:
        return 0.1
    if days <= 3:
        return 1.0
    if days <= 7:
        return 0.8
    if days <= 14:
        return 0.55
    if days <= 21:
        return 0.30
    return 0.10


# ── Transition explanation copy (state A → state B) ──
_TRANSITION_COPY = {
    ("no_signals", "waiting_for_signal"): "A first outreach was sent. Coach Watch is now waiting for a response.",
    ("waiting_for_signal", "follow_up_window_open"): "Enough time has passed without engagement, so a follow-up is now recommended.",
    ("waiting_for_signal", "emerging_interest"): "Coach-side activity was detected after your recent outreach.",
    ("emerging_interest", "active_conversation"): "A coach replied or took a direct next step.",
    ("active_conversation", "hot_opportunity"): "Stronger engagement signals suggest this relationship is accelerating.",
    ("active_conversation", "cooling"): "Direct engagement slowed down and has not been reinforced recently.",
    ("cooling", "re_engaged"): "A new meaningful signal appeared after a quiet period.",
    ("re_engaged", "active_conversation"): "The renewed interest turned into direct conversation.",
    ("follow_up_window_open", "stalled"): "Repeated effort did not create traction, and the relationship is no longer progressing.",
    ("stalled", "deprioritize"): "This school has remained inactive long enough that it should not stay a top priority.",
}

# ── "What to do now" action copy (per state) ──
_WHAT_TO_DO_NOW = {
    "no_signals": "Start outreach now to get on the coach's radar early.",
    "waiting_for_signal": "Wait before following up — it's too soon to reach out again.",
    "follow_up_window_open": "Send a follow-up now to increase your chances of a response.",
    "emerging_interest": "Follow up now — the coach is showing early interest.",
    "active_conversation": "Reply quickly to keep the conversation moving.",
    "hot_opportunity": "Act now — this is a high-opportunity moment.",
    "cooling": "Re-engage now before this opportunity fades.",
    "re_engaged": "Follow up now to rebuild momentum.",
    "stalled": "Try a new approach — your current strategy isn't working.",
    "deprioritize": "Focus on other schools with stronger signals.",
}

# ── Confidence level (per state) ──
_CONFIDENCE_LEVEL = {
    "no_signals": "low",
    "waiting_for_signal": "medium",
    "follow_up_window_open": "medium",
    "emerging_interest": "medium",
    "active_conversation": "high",
    "hot_opportunity": "high",
    "cooling": "medium",
    "re_engaged": "medium",
    "stalled": "medium",
    "deprioritize": "low",
}



def _compute_coach_watch(program: dict, interactions: list, email_tracking: list):
    """
    Compute Coach Watch using the 10-state relationship matrix.
    Scoring uses 4 weighted buckets + time decay.
    State is deterministic from the matrix, not score-derived.
    """
    now = datetime.now(timezone.utc)

    # ── Parse dates ──
    def _parse_dt(val):
        if not val:
            return None
        try:
            dt = datetime.fromisoformat(str(val).replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except Exception as e:  # noqa: E722
            log.warning("Handled exception (fallback): %s", e)
            return None

    reply_status = (program.get("reply_status") or "").lower()
    recruiting_status = (program.get("recruiting_status") or "").lower()
    initial_contact_dt = _parse_dt(program.get("initial_contact_sent"))
    last_follow_up_dt = _parse_dt(program.get("last_follow_up"))

    has_outreach = initial_contact_dt is not None
    days_since_outreach = (now - initial_contact_dt).days if initial_contact_dt else None
    days_since_follow_up = (now - last_follow_up_dt).days if last_follow_up_dt else None
    days_since_last_activity = min(
        d for d in [days_since_outreach, days_since_follow_up] if d is not None
    ) if any(d is not None for d in [days_since_outreach, days_since_follow_up]) else None

    # ── Coach-side signals ──
    has_reply = "reply" in reply_status and reply_status not in ("no reply", "")
    has_visit = "visit" in recruiting_status
    has_offer = "offer" in recruiting_status

    total_opens = sum(int(t.get("opens", 0)) for t in email_tracking)
    total_clicks = sum(int(t.get("clicks", 0)) for t in email_tracking)

    coach_replies_ix = 0
    athlete_outreach_ix = 0
    for ix in interactions:
        ix_type = (ix.get("type") or "").lower()
        if ix_type in ("coach_reply", "email_received"):
            coach_replies_ix += 1
        else:
            athlete_outreach_ix += 1

    has_coach_signal = has_reply or has_visit or has_offer or total_clicks > 0 or total_opens > 0 or coach_replies_ix > 0
    has_passive_signal = (total_clicks > 0 or total_opens > 0) and not has_reply
    outreach_count = athlete_outreach_ix + (1 if has_outreach else 0)

    # ═══ SCORING (4 buckets, unchanged weights) ═══
    score = 0
    signal_log = []

    if has_offer:
        pts = round(50 * _time_decay(days_since_follow_up))
        score += pts
        signal_log.append({"type": "offer", "label": "Offer received", "points": pts, "strength": "strong"})

    if has_visit:
        pts = round(45 * _time_decay(days_since_follow_up))
        score += pts
        signal_log.append({"type": "visit_invite", "label": "Campus visit scheduled or completed", "points": pts, "strength": "strong"})

    if has_reply:
        pts = round(35 * _time_decay(days_since_follow_up))
        score += pts
        signal_log.append({"type": "coach_reply", "label": "Coach replied to your message", "points": pts, "strength": "strong"})

    if total_clicks > 0:
        pts = round(16 * _time_decay(days_since_last_activity))
        score += pts
        signal_log.append({"type": "coach_click", "label": "Coach clicked a link in your outreach", "points": pts, "strength": "medium"})

    if total_opens > 2:
        pts = round(10 * _time_decay(days_since_last_activity))
        score += pts
        signal_log.append({"type": "repeat_open", "label": f"Message opened {total_opens} times", "points": pts, "strength": "medium"})
    elif total_opens > 0:
        pts = round(8 * _time_decay(days_since_last_activity))
        score += pts
        signal_log.append({"type": "coach_open", "label": "Coach opened your message", "points": pts, "strength": "low"})

    if coach_replies_ix > 0 and not has_reply:
        pts = round(25 * _time_decay(days_since_last_activity))
        score += pts
        signal_log.append({"type": "ix_reply", "label": "Coach interaction logged", "points": pts, "strength": "medium"})

    # Negative / cooling
    if has_outreach and not has_coach_signal:
        if days_since_outreach is not None and days_since_outreach > 14:
            p = -18
            score += p
            signal_log.append({"type": "no_engagement_14d", "label": f"No coach engagement after {days_since_outreach} days", "points": p, "strength": "negative"})
        elif days_since_outreach is not None and days_since_outreach > 7:
            p = -10
            score += p
            signal_log.append({"type": "no_engagement_7d", "label": "No coach engagement after 7+ days", "points": p, "strength": "negative"})

    if has_outreach and not has_reply and outreach_count > 2:
        p = -15
        score += p
        signal_log.append({"type": "repeated_no_response", "label": "Multiple outreach attempts with no response", "points": p, "strength": "negative"})

    score = max(0, score)

    # ═══ 10-STATE MATRIX ═══
    # Priority order: hot > active > re_engaged > emerging > cooling > stalled > follow_up > waiting > deprioritize > no_signals

    # State 6: Hot Opportunity
    if has_visit or has_offer or (has_reply and score >= 70):
        state = "hot_opportunity"
        interest_level = "High" if score >= 70 else "Medium"
        trend = "Increasing"
        headline = "Interest is active"
        summary = "This school is showing strong interest right now. Act while the window is open."
        why_line = "High-value signals were detected, such as repeated engagement, multiple staff activity, or a next-step request."
        recommended_action = "Respond now and move to the next step."
        primary_cta = "Respond Now"
        secondary_cta = "Prepare Next Step"

    # State 5: Active Conversation
    elif has_reply or coach_replies_ix > 0:
        state = "active_conversation"
        interest_level = "Medium" if score < 70 else "High"
        trend = "Increasing" if days_since_follow_up is not None and days_since_follow_up <= 7 else "Stable"
        headline = "Conversation is active"
        summary = "A coach has engaged directly. Keep momentum moving while the relationship is live."
        why_line = "A reply or direct next-step signal was detected."
        recommended_action = "Reply promptly and keep the conversation going."
        primary_cta = "Reply Promptly"
        secondary_cta = "Draft Response"

    # State 8: Re-Engaged (was dormant > 21 days, then new signal appeared)
    elif has_coach_signal and days_since_outreach is not None and days_since_outreach > 21:
        state = "re_engaged"
        interest_level = "Emerging" if score < 50 else "Medium"
        trend = "Reactivated"
        headline = "Interest has restarted"
        summary = "This school became active again after a quieter period."
        why_line = "A new meaningful signal appeared after dormancy."
        recommended_action = "Follow up now while interest is fresh."
        primary_cta = "Follow Up Now"
        secondary_cta = "Generate Message"

    # State 4: Emerging Interest (passive signals, no direct reply)
    elif has_passive_signal:
        state = "emerging_interest"
        interest_level = "Emerging"
        trend = "Increasing" if total_clicks > 0 else "Stable"
        headline = "Interest is starting"
        summary = "Coach activity suggests this school is paying attention, but the conversation has not started yet."
        why_line = "Passive signals like views, opens, or clicks are rising."
        recommended_action = "Follow up while interest is building."
        primary_cta = "Follow Up"
        secondary_cta = "Generate Message"

    # State 7: Cooling (had engagement before, now stale)
    elif has_outreach and has_coach_signal and days_since_last_activity is not None and days_since_last_activity > 14:
        state = "cooling"
        interest_level = "Emerging" if score >= 25 else "No signals yet"
        trend = "Cooling"
        headline = "Interest is cooling"
        summary = "This relationship had traction before, but recent activity has slowed down."
        why_line = "Earlier engagement has not been reinforced by recent signals."
        recommended_action = "Re-engage with a fresh angle or new content."
        primary_cta = "Re-Engage"
        secondary_cta = "Reassess"

    # State 9: Stalled (repeated attempts, not converting, > 10 days)
    elif has_outreach and not has_coach_signal and outreach_count > 2 and days_since_outreach is not None and days_since_outreach > 10:
        state = "stalled"
        interest_level = "No signals yet"
        trend = "Cooling"
        headline = "Progress has stalled"
        summary = "You've put effort into this school, but the relationship is not moving forward."
        why_line = "The stage is aging and recent attempts have not converted into momentum."
        recommended_action = "Try a completely different approach or reassess priority."
        primary_cta = "Re-Engage with New Angle"
        secondary_cta = "Consider Lower Priority"

    # State 3: Follow-Up Window Open (outreach 5-10 days, no engagement)
    elif has_outreach and not has_coach_signal and days_since_outreach is not None and 5 <= days_since_outreach <= 10:
        state = "follow_up_window_open"
        interest_level = "No signals yet"
        trend = "Stable"
        headline = "Follow-up window is open"
        summary = "There has been no response yet, and this is now a good time for a light follow-up."
        why_line = "Your outreach has been sitting long enough to justify another touchpoint."
        recommended_action = "Send a friendly follow-up referencing your earlier message."
        primary_cta = "Follow Up"
        secondary_cta = "Generate Follow-up"

    # State 2: Waiting for Signal (outreach < 5 days)
    elif has_outreach and not has_coach_signal and days_since_outreach is not None and days_since_outreach < 5:
        state = "waiting_for_signal"
        interest_level = "No signals yet"
        trend = "Stable"
        headline = "Waiting for a response"
        summary = "Your outreach was sent recently. Give the coach a little time before following up."
        why_line = "A message was sent, but there has not been any coach activity yet."
        recommended_action = "Wait a few more days before following up."
        primary_cta = "Wait"
        secondary_cta = "Generate Follow-up"

    # State 10: Deprioritize (stale, no signals, outreach > 14 days)
    elif has_outreach and not has_coach_signal and days_since_outreach is not None and days_since_outreach > 14:
        state = "deprioritize"
        interest_level = "No signals yet"
        trend = "Cooling"
        headline = "Focus elsewhere for now"
        summary = "There is not enough traction here right now to make this a priority."
        why_line = "Signals are weak, progress is stale, or stronger schools deserve more attention."
        recommended_action = "Lower priority and redirect energy to active schools."
        primary_cta = "Lower Priority"
        secondary_cta = "Keep on Watch"

    # State 1: No Signals Yet (default — no outreach, no signals)
    else:
        state = "no_signals"
        interest_level = "Not started"
        trend = "Stable"
        headline = "No coach engagement yet"
        summary = "This school looks worth pursuing, but the relationship has not started yet."
        why_line = "No outreach or coach-side activity has been recorded."
        recommended_action = "Send your first email to start the conversation."
        primary_cta = "Send First Email"
        secondary_cta = "Generate Message"

    return {
        "score": score,
        "interestLevel": interest_level,
        "trend": trend,
        "state": state,
        "headline": headline,
        "summary": summary,
        "whyLine": why_line,
        "whyThisMatters": _WHAT_TO_DO_NOW.get(state, ""),
        "confidenceLevel": _CONFIDENCE_LEVEL.get(state, "low"),
        "recommendedAction": recommended_action,
        "primaryCta": primary_cta,
        "secondaryCta": secondary_cta,
        "mostEngagedContact": None,
        "signals": signal_log,
        "meta": {
            "hasOutreach": has_outreach,
            "hasReply": has_reply,
            "hasVisit": has_visit,
            "hasOffer": has_offer,
            "totalOpens": total_opens,
            "totalClicks": total_clicks,
            "daysSinceActivity": days_since_last_activity,
            "outreachCount": outreach_count,
        },
    }


@router.get("/coach-watch/{program_id}")
async def get_coach_watch(program_id: str, current_user: dict = get_current_user_dep()):
    """Compute Coach Watch relationship intelligence for a program."""
    tenant_id = await get_athlete_tenant(current_user)
    program = await db.programs.find_one(
        {"tenant_id": tenant_id, "program_id": program_id}, {"_id": 0}
    )
    if not program:
        raise HTTPException(404, "Program not found")

    # Gather all data sources in parallel
    interactions, email_tracking, college_coaches, prev_state_doc = await asyncio.gather(
        db.interactions.find(
            {"tenant_id": tenant_id, "program_id": program_id}, {"_id": 0}
        ).to_list(500),
        db.email_tracking.find(
            {"program_id": program_id}, {"_id": 0}
        ).to_list(500),
        db.college_coaches.find(
            {"tenant_id": tenant_id, "university_name": program.get("university_name")}, {"_id": 0}
        ).to_list(20),
        db.coach_watch_states.find_one(
            {"tenant_id": tenant_id, "program_id": program_id}, {"_id": 0}
        ),
    )

    result = _compute_coach_watch(program, interactions, email_tracking)

    # Populate most engaged contact
    if college_coaches:
        primary = next(
            (c for c in college_coaches if "head" in (c.get("title") or "").lower()),
            next(
                (c for c in college_coaches if "recruit" in (c.get("title") or "").lower()),
                college_coaches[0]
            )
        )
        result["mostEngagedContact"] = primary.get("name") or primary.get("title") or "Coach"

    # ── State transition tracking ──
    now = datetime.now(timezone.utc)
    current_state = result["state"]
    previous_state = prev_state_doc.get("state") if prev_state_doc else None

    result["previousState"] = previous_state
    result["currentState"] = current_state
    result["stateChangedAt"] = None
    result["stateChangeReason"] = None
    result["whatChangedCopy"] = None
    result["triggeringSignals"] = [s["type"] for s in result.get("signals", [])]

    if previous_state and previous_state != current_state:
        transition_key = (previous_state, current_state)
        result["whatChangedCopy"] = _TRANSITION_COPY.get(transition_key)
        result["stateChangedAt"] = now.isoformat()
        result["stateChangeReason"] = f"{previous_state} \u2192 {current_state}"

    # Persist current state (upsert)
    await db.coach_watch_states.update_one(
        {"tenant_id": tenant_id, "program_id": program_id},
        {"$set": {
            "tenant_id": tenant_id,
            "program_id": program_id,
            "state": current_state,
            "updated_at": now.isoformat(),
        }},
        upsert=True,
    )

    return result


# ─────────────────────────────────────────────────────────────────────────
# Board grouping (ported from athlete app programs.py)
# ─────────────────────────────────────────────────────────────────────────

def compute_journey_rail(program: dict) -> dict:
    """
    Compute the 6-stage journey rail for a program.
    Stages: added, outreach, in_conversation, campus_visit, offer, committed
    Auto-detects stages from signals/interactions. Manual override cascades.
    """
    signals = program.get("signals", {})
    manual_stage = program.get("journey_stage", "")

    LEGACY_MAP = {"outreach_sent": "outreach", "coach_replied": "in_conversation"}
    if manual_stage in LEGACY_MAP:
        manual_stage = LEGACY_MAP[manual_stage]

    RAIL_ORDER = ["added", "outreach", "in_conversation", "campus_visit", "offer", "committed"]

    # Auto-detect stages from data
    stages = {
        "added": True,
        "outreach": signals.get("outreach_count", 0) > 0,
        "in_conversation": signals.get("has_coach_reply", False),
        "campus_visit": False,
        "offer": False,
        "committed": False,
    }

    # Manual override: cascade fill all stages up to and including the manual stage
    if manual_stage and manual_stage in RAIL_ORDER:
        manual_idx = RAIL_ORDER.index(manual_stage)
        for i in range(manual_idx + 1):
            stages[RAIL_ORDER[i]] = True

    # Active = last consecutively completed stage
    active = "added"
    for s in RAIL_ORDER:
        if stages[s]:
            active = s
        else:
            break

    line_fill = active

    # Compute pulse — relationship health
    days = signals.get("days_since_activity")
    if days is None:
        pulse = "neutral"
    elif days <= 7:
        pulse = "hot"
    elif days <= 14:
        pulse = "warm"
    else:
        pulse = "cold"

    return {
        "stages": stages,
        "active": active,
        "line_fill": line_fill,
        "pulse": pulse,
    }


def categorize_program(program: dict) -> str:
    """
    5-stage recruiting funnel:
    1. archived — is_active = false
    2. overdue  — follow-up date has passed
    3. in_conversation — college coach has replied
    4. waiting_on_reply — outreach sent, no reply
    5. needs_outreach — no interactions yet
    """
    if not program.get("is_active", True):
        return "archived"

    next_action_due = program.get("next_action_due", "")
    if next_action_due:
        try:
            due_date = datetime.strptime(next_action_due, "%Y-%m-%d").date()
            if due_date < datetime.now(timezone.utc).date():
                return "overdue"
        except ValueError:
            pass

    signals = program.get("signals", {})

    if signals.get("has_coach_reply", False):
        return "in_conversation"

    if signals.get("outreach_count", 0) > 0:
        return "waiting_on_reply"

    return "needs_outreach"


# ─────────────────────────────────────────────────────────────────────────
# Programs CRUD
# ─────────────────────────────────────────────────────────────────────────

@router.get("/athlete/programs")
async def list_programs(
    current_user: dict = get_current_user_dep(),
    grouped: Optional[bool] = Query(False),
    recruiting_status: Optional[str] = None,
    division: Optional[str] = None,
    priority: Optional[str] = None,
    search: Optional[str] = None,
):
    tenant_id = await get_athlete_tenant(current_user)
    query = {"tenant_id": tenant_id}
    if recruiting_status:
        query["recruiting_status"] = recruiting_status
    if division:
        query["division"] = division
    if priority:
        query["priority"] = priority
    if search:
        query["university_name"] = {"$regex": search, "$options": "i"}

    programs = await db.programs.find(query, {"_id": 0}).to_list(200)

    # Batch-fetch signals, college coaches, and KB logos
    program_ids = [p["program_id"] for p in programs]
    uni_names = list({p["university_name"] for p in programs if p.get("university_name")})
    signals_map, all_coaches, kb_entries = await asyncio.gather(
        _batch_signals(tenant_id, program_ids),
        db.college_coaches.find(
            {"tenant_id": tenant_id, "program_id": {"$in": program_ids}},
            {"_id": 0},
        ).to_list(2000),
        db.university_knowledge_base.find(
            {"university_name": {"$in": uni_names}},
            {"_id": 0, "university_name": 1, "logo_url": 1, "domain": 1, "social_links": 1},
        ).to_list(500),
    )

    kb_by_name = {e["university_name"]: e for e in kb_entries}

    coaches_by_program = {}
    for c in all_coaches:
        coaches_by_program.setdefault(c["program_id"], []).append(c)

    for p in programs:
        pid = p["program_id"]
        coaches = coaches_by_program.get(pid, [])
        primary = next(
            (c for c in coaches if c.get("role") == "Head Coach"),
            coaches[0] if coaches else None,
        )
        p["primary_college_coach"] = primary.get("coach_name", "") if primary else ""
        p["college_coach_email"] = primary.get("email", "") if primary else ""
        p["signals"] = signals_map.get(pid, {})
        p["board_group"] = categorize_program(p)
        p["journey_rail"] = compute_journey_rail(p)
        # Enrich with KB logo and domain
        kb = kb_by_name.get(p.get("university_name"), {})
        if not p.get("logo_url"):
            p["logo_url"] = kb.get("logo_url", "")
        if not p.get("domain"):
            p["domain"] = kb.get("domain", "")
        if not p.get("social_links") and kb.get("social_links"):
            p["social_links"] = kb["social_links"]

    if grouped:
        groups = {
            "overdue": [],
            "needs_outreach": [],
            "waiting_on_reply": [],
            "in_conversation": [],
            "archived": [],
        }
        for p in programs:
            g = p.get("board_group", "needs_outreach")
            if g in groups:
                groups[g].append(p)
        return {
            "groups": groups,
            "counts": {k: len(v) for k, v in groups.items()},
            "total": len(programs),
        }

    return programs


@router.get("/athlete/programs/{program_id}")
async def get_program(program_id: str, current_user: dict = get_current_user_dep()):
    tenant_id = await get_athlete_tenant(current_user)
    prog = await db.programs.find_one(
        {"tenant_id": tenant_id, "program_id": program_id}, {"_id": 0}
    )
    if not prog:
        raise HTTPException(404, "Program not found")

    coaches_f = db.college_coaches.find(
        {"tenant_id": tenant_id, "program_id": program_id}, {"_id": 0}
    ).to_list(50)
    interactions_f = db.interactions.find(
        {"tenant_id": tenant_id, "program_id": program_id}, {"_id": 0}
    ).sort("date_time", -1).to_list(100)

    coaches, interactions = await asyncio.gather(coaches_f, interactions_f)
    prog["college_coaches"] = coaches
    prog["interactions"] = interactions
    prog["signals"] = _compute_signals_from_interactions(interactions)
    prog["board_group"] = categorize_program(prog)
    prog["journey_rail"] = compute_journey_rail(prog)

    # Enrich with KB data (social_links, logo, domain)
    uni_name = prog.get("university_name", "")
    if uni_name:
        kb = await db.university_knowledge_base.find_one(
            {"university_name": uni_name},
            {"_id": 0, "logo_url": 1, "domain": 1, "social_links": 1},
        )
        if kb:
            if not prog.get("logo_url"):
                prog["logo_url"] = kb.get("logo_url", "")
            if not prog.get("domain"):
                prog["domain"] = kb.get("domain", "")
            if not prog.get("social_links") and kb.get("social_links"):
                prog["social_links"] = kb["social_links"]

    return prog


@router.get("/athlete/programs/{program_id}/journey")
async def get_program_journey(program_id: str, current_user: dict = get_current_user_dep()):
    """Get timeline of all interactions with a program, formatted for conversation view."""
    tenant_id = await get_athlete_tenant(current_user)
    program = await db.programs.find_one(
        {"tenant_id": tenant_id, "program_id": program_id}, {"_id": 0}
    )
    if not program:
        raise HTTPException(404, "Program not found")

    interactions = await db.interactions.find(
        {"tenant_id": tenant_id, "program_id": program_id}, {"_id": 0}
    ).sort("date_time", -1).to_list(200)

    timeline = []
    for ix in interactions:
        itype = (ix.get("type") or "").strip()
        itype_lower = itype.lower().replace(" ", "_")

        type_map = {
            "email": "email_sent", "email_sent": "email_sent",
            "email_received": "email_received", "phone_call": "phone_call",
            "video_call": "video_call", "text_message": "text_message",
            "coach_reply": "email_received", "camp": "camp",
            "camp_meeting": "camp", "campus_visit": "campus_visit",
            "showcase": "showcase", "stage_update": "stage_update",
            "follow_up": "email_sent",
            "coach_directive": "coach_directive", "flag_completed": "flag_completed",
        }
        event_type = type_map.get(itype_lower, "interaction")

        uni_name = ix.get("university_name") or ""
        is_coach_msg = itype_lower in ("coach_reply", "email_received")
        is_coach_flag = itype_lower in ("coach_directive", "flag_completed")
        if is_coach_msg:
            title = "Coach replied"
        elif itype_lower == "coach_directive":
            title = "Coach Directive"
        elif itype_lower == "flag_completed":
            title = "Flag Completed"
        elif itype_lower in ("camp", "camp_meeting", "campus_visit", "showcase"):
            title = f"{uni_name} {itype}".strip() if uni_name else itype
        elif itype_lower == "stage_update":
            title = "Stage updated"
        else:
            title = f"{itype} logged" if itype else "Interaction"

        timeline.append({
            "id": ix.get("interaction_id"),
            "event_type": event_type,
            "type": itype,
            "title": title,
            "date": ix.get("date_time") or ix.get("created_at"),
            "date_time": ix.get("date_time") or ix.get("created_at"),
            "content": ix.get("notes") or "",
            "notes": ix.get("notes") or "",
            "outcome": ix.get("outcome") or "",
            "coach_name": ix.get("coach_name", "Coach") if is_coach_msg else "",
            "created_by_name": ix.get("created_by_name") if is_coach_flag else "",
        })

    # Also include linked events
    events = await db.athlete_events.find(
        {"tenant_id": tenant_id, "program_id": program_id}, {"_id": 0}
    ).to_list(100)
    for e in events:
        etype = e.get("event_type", "").lower()
        event_type = "camp"
        if etype == "visit":
            event_type = "campus_visit"
        elif etype == "showcase":
            event_type = "showcase"
        timeline.append({
            "id": e.get("event_id"),
            "event_type": event_type,
            "type": e.get("event_type", "Event"),
            "title": e.get("title", ""),
            "date": e.get("start_date"),
            "date_time": e.get("start_date"),
            "content": e.get("description") or "",
            "notes": e.get("description") or "",
            "outcome": "",
            "coach_name": "",
        })

    # Include event signals (coach notes from live events)
    athlete_doc = await db.athletes.find_one({"tenant_id": tenant_id}, {"_id": 0, "id": 1})
    athlete_id_for_notes = (athlete_doc or {}).get("id", "")
    if athlete_id_for_notes:
        signal_notes = await db.athlete_notes.find(
            {"athlete_id": athlete_id_for_notes, "program_id": program_id, "tag": "event_signal"},
            {"_id": 0}
        ).sort("created_at", -1).to_list(50)
        for sn in signal_notes:
            timeline.append({
                "id": sn.get("id"),
                "event_type": "coach_signal",
                "type": "Coach Signal",
                "title": "Coach Signal",
                "date": sn.get("created_at"),
                "date_time": sn.get("created_at"),
                "content": sn.get("text", ""),
                "notes": sn.get("text", ""),
                "outcome": "",
                "coach_name": sn.get("author", "Coach"),
                "created_by_name": sn.get("author", "Coach"),
            })

    # Sort by date descending
    timeline.sort(key=lambda x: x.get("date") or "", reverse=True)

    # Re-sort after adding events
    timeline.sort(key=lambda x: x.get("date") or "", reverse=True)

    # Enrich timeline with per-message engagement tracking
    msg_ids = [e["id"] for e in timeline if e.get("id")]
    if msg_ids:
        tracking = await db.email_tracking.find(
            {"message_id": {"$in": msg_ids}},
            {"_id": 0, "message_id": 1, "opens": 1, "clicks": 1}
        ).to_list(200)
        tracking_map = {t["message_id"]: t for t in tracking}
        for event in timeline:
            t = tracking_map.get(event.get("id"), {})
            event["opens"] = t.get("opens", 0)
            event["clicks"] = t.get("clicks", 0)

    return {"timeline": timeline}


@router.post("/athlete/programs")
async def create_program(body: dict, current_user: dict = get_current_user_dep()):
    tenant_id = await get_athlete_tenant(current_user)

    existing = await db.programs.find_one(
        {"tenant_id": tenant_id, "university_name": body.get("university_name", "")},
        {"_id": 0},
    )
    if existing:
        raise HTTPException(400, "University already on your board")

    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "program_id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "university_name": body.get("university_name", ""),
        "division": body.get("division", ""),
        "conference": body.get("conference", ""),
        "region": body.get("region", ""),
        "recruiting_status": body.get("recruiting_status", "Not Contacted"),
        "reply_status": body.get("reply_status", "No Reply"),
        "priority": body.get("priority", "Medium"),
        "is_active": body.get("is_active", True),
        "next_action": body.get("next_action", ""),
        "next_action_due": body.get("next_action_due", ""),
        "notes": body.get("notes", ""),
        "website": body.get("website", ""),
        "initial_contact_sent": body.get("initial_contact_sent", ""),
        "last_follow_up": body.get("last_follow_up", ""),
        "follow_up_days": body.get("follow_up_days", 14),
        "stage_entered_at": now,
        "source_added": body.get("source_added", "manual"),
        "coach_contact_confidence": None,
        "engagement_trend": None,
        "last_meaningful_engagement_at": None,
        "created_at": now,
        "updated_at": now,
    }
    await db.programs.insert_one(doc)
    doc.pop("_id", None)
    await recompute_derived_data()
    return doc


@router.put("/athlete/programs/{program_id}")
async def update_program(program_id: str, body: dict, current_user: dict = get_current_user_dep()):
    tenant_id = await get_athlete_tenant(current_user)

    # Snapshot old status for stage history tracking
    old_program = await db.programs.find_one(
        {"tenant_id": tenant_id, "program_id": program_id},
        {"_id": 0, "recruiting_status": 1},
    )
    old_status = (old_program or {}).get("recruiting_status")

    for key in ("_id", "program_id", "tenant_id"):
        body.pop(key, None)
    now = datetime.now(timezone.utc).isoformat()
    body["updated_at"] = now

    # If recruiting_status is changing, update stage_entered_at
    new_status = body.get("recruiting_status")
    if new_status and new_status != old_status:
        body["stage_entered_at"] = now

    result = await db.programs.update_one(
        {"tenant_id": tenant_id, "program_id": program_id},
        {"$set": body},
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Program not found")

    # Record stage history if status changed
    if new_status and new_status != old_status:
        athlete = await db.athletes.find_one({"tenant_id": tenant_id}, {"_id": 0, "id": 1, "org_id": 1})
        await db.program_stage_history.insert_one({
            "program_id": program_id,
            "athlete_id": (athlete or {}).get("id", ""),
            "org_id": (athlete or {}).get("org_id"),
            "from_stage": old_status,
            "to_stage": new_status,
            "changed_by_user_id": current_user["id"],
            "changed_by_role": current_user.get("role", ""),
            "reason_code": body.get("reason_code"),
            "note": body.get("stage_change_note"),
            "created_at": now,
        })

    updated = await db.programs.find_one(
        {"tenant_id": tenant_id, "program_id": program_id}, {"_id": 0}
    )
    await recompute_derived_data()
    return updated


@router.delete("/athlete/programs/{program_id}")
async def delete_program(program_id: str, current_user: dict = get_current_user_dep()):
    tenant_id = await get_athlete_tenant(current_user)
    result = await db.programs.delete_one(
        {"tenant_id": tenant_id, "program_id": program_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(404, "Program not found")
    # Cascade delete related college coaches and interactions
    await db.college_coaches.delete_many(
        {"tenant_id": tenant_id, "program_id": program_id}
    )
    await db.interactions.delete_many(
        {"tenant_id": tenant_id, "program_id": program_id}
    )
    await recompute_derived_data()
    return {"deleted": True}


# ─────────────────────────────────────────────────────────────────────────
# College Coaches CRUD
# ─────────────────────────────────────────────────────────────────────────

@router.get("/athlete/college-coaches")
async def list_college_coaches(
    current_user: dict = get_current_user_dep(),
    program_id: Optional[str] = None,
):
    tenant_id = await get_athlete_tenant(current_user)
    query = {"tenant_id": tenant_id}
    if program_id:
        query["program_id"] = program_id
    coaches = await db.college_coaches.find(query, {"_id": 0}).to_list(500)
    return coaches


@router.post("/athlete/college-coaches")
async def create_college_coach(body: dict, current_user: dict = get_current_user_dep()):
    tenant_id = await get_athlete_tenant(current_user)
    program_id = body.get("program_id")
    prog = await db.programs.find_one(
        {"tenant_id": tenant_id, "program_id": program_id}, {"_id": 0}
    )
    if not prog:
        raise HTTPException(404, "Program not found")

    doc = {
        "coach_id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "program_id": program_id,
        "university_name": prog["university_name"],
        "coach_name": body.get("coach_name", ""),
        "role": body.get("role", "Head Coach"),
        "email": body.get("email", ""),
        "phone": body.get("phone", ""),
        "notes": body.get("notes", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.college_coaches.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/athlete/college-coaches/{coach_id}")
async def update_college_coach(coach_id: str, body: dict, current_user: dict = get_current_user_dep()):
    tenant_id = await get_athlete_tenant(current_user)
    for key in ("_id", "coach_id", "tenant_id"):
        body.pop(key, None)
    result = await db.college_coaches.update_one(
        {"tenant_id": tenant_id, "coach_id": coach_id},
        {"$set": body},
    )
    if result.matched_count == 0:
        raise HTTPException(404, "College coach not found")
    updated = await db.college_coaches.find_one(
        {"tenant_id": tenant_id, "coach_id": coach_id}, {"_id": 0}
    )
    return updated


@router.delete("/athlete/college-coaches/{coach_id}")
async def delete_college_coach(coach_id: str, current_user: dict = get_current_user_dep()):
    tenant_id = await get_athlete_tenant(current_user)
    result = await db.college_coaches.delete_one(
        {"tenant_id": tenant_id, "coach_id": coach_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(404, "College coach not found")
    return {"deleted": True}


# ─────────────────────────────────────────────────────────────────────────
# Interactions CRUD
# ─────────────────────────────────────────────────────────────────────────

@router.get("/athlete/interactions")
async def list_interactions(
    current_user: dict = get_current_user_dep(),
    program_id: Optional[str] = None,
):
    tenant_id = await get_athlete_tenant(current_user)
    query = {"tenant_id": tenant_id}
    if program_id:
        query["program_id"] = program_id
    interactions = await db.interactions.find(query, {"_id": 0}).sort(
        "date_time", -1
    ).to_list(200)
    return interactions


@router.post("/athlete/interactions")
async def create_interaction(body: dict, current_user: dict = get_current_user_dep()):
    tenant_id = await get_athlete_tenant(current_user)
    program_id = body.get("program_id")
    prog = await db.programs.find_one(
        {"tenant_id": tenant_id, "program_id": program_id}, {"_id": 0}
    )
    if not prog:
        raise HTTPException(404, "Program not found")

    now = datetime.now(timezone.utc)
    doc = {
        "interaction_id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "program_id": program_id,
        "university_name": prog.get("university_name", ""),
        "type": body.get("type", "Email"),
        "outcome": body.get("outcome", "No Response"),
        "notes": body.get("notes", ""),
        "date_time": body.get("date_time") or now.isoformat(),
        "created_at": now.isoformat(),
        # V2 structured signal fields
        "is_meaningful": body.get("is_meaningful"),
        "response_time_hours": body.get("response_time_hours"),
        "initiated_by": body.get("initiated_by"),
        "coach_question_detected": body.get("coach_question_detected"),
        "request_type": body.get("request_type"),
        "invite_type": body.get("invite_type"),
        "offer_signal": body.get("offer_signal"),
        "scholarship_signal": body.get("scholarship_signal"),
        "sentiment_signal": body.get("sentiment_signal"),
        "urgency_signal": body.get("urgency_signal"),
        "confidence": body.get("confidence"),
    }
    await db.interactions.insert_one(doc)
    doc.pop("_id", None)

    # Invalidate AI insight cache on new interaction
    await db.ai_insight_cache.delete_many({"tenant_id": tenant_id, "program_id": program_id})

    # Update last_meaningful_engagement_at on program if meaningful
    _meaningful_types = {"Coach Reply", "Phone Call", "Campus Visit", "Video Call", "Camp"}
    is_meaningful = (
        body.get("is_meaningful")
        or doc["type"] in _meaningful_types
        or body.get("coach_question_detected")
        or body.get("request_type")
        or body.get("invite_type")
        or body.get("offer_signal")
        or body.get("scholarship_signal")
    )
    if is_meaningful:
        await db.programs.update_one(
            {"tenant_id": tenant_id, "program_id": program_id},
            {"$set": {
                "last_meaningful_engagement_at": now.isoformat(),
                "last_meaningful_engagement_type": doc["type"],
            }},
        )

    # Auto-set follow-up on program based on interaction type
    event_type = (doc["type"]).lower().replace(" ", "_")
    follow_up_days_map = {
        "camp": 3, "campus_visit": 2, "phone_call": 7, "video_call": 7,
        "email_sent": 14, "showcase": 5, "text_message": 7,
        "coach_reply": 2, "email_received": 2,
    }
    days = follow_up_days_map.get(event_type)
    program_updates = {"updated_at": now.isoformat()}

    if days:
        follow_up_date = (now + timedelta(days=days)).strftime("%Y-%m-%d")
        program_updates["next_action_due"] = follow_up_date

    # AUTOMATION: Email sent → recruiting_status = Contacted, reply_status = Awaiting Reply
    if event_type in ("email_sent", "email", "follow_up"):
        current_status = prog.get("recruiting_status", "Not Contacted")
        if current_status == "Not Contacted":
            program_updates["recruiting_status"] = "Contacted"
            program_updates["initial_contact_sent"] = now.strftime("%Y-%m-%d")
        if prog.get("reply_status") in (None, "", "No Reply"):
            program_updates["reply_status"] = "Awaiting Reply"

    # AUTOMATION: Reply received → reply_status = Reply Received, priority = Very High
    if event_type in ("coach_reply", "email_received"):
        program_updates["reply_status"] = "Reply Received"
        program_updates["priority"] = "Very High"

    if program_updates:
        await db.programs.update_one(
            {"program_id": program_id, "tenant_id": tenant_id},
            {"$set": program_updates},
        )

    await recompute_derived_data()
    return doc


# ─────────────────────────────────────────────────────────────────────────
# Mark program as replied
# ─────────────────────────────────────────────────────────────────────────

@router.post("/athlete/programs/{program_id}/mark-replied")
async def mark_as_replied(program_id: str, body: dict, current_user: dict = get_current_user_dep()):
    tenant_id = await get_athlete_tenant(current_user)
    prog = await db.programs.find_one(
        {"tenant_id": tenant_id, "program_id": program_id}, {"_id": 0}
    )
    if not prog:
        raise HTTPException(404, "Program not found")

    note = (body.get("note") or "").strip()
    if not note:
        raise HTTPException(400, "A note is required when marking a reply")

    now = datetime.now(timezone.utc)
    doc = {
        "interaction_id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "program_id": program_id,
        "university_name": prog.get("university_name", ""),
        "type": "coach_reply",
        "outcome": "Positive",
        "notes": note,
        "date_time": now.isoformat(),
        "created_at": now.isoformat(),
    }
    await db.interactions.insert_one(doc)
    doc.pop("_id", None)

    # Invalidate AI insight cache on new reply
    await db.ai_insight_cache.delete_many({"tenant_id": tenant_id, "program_id": program_id})

    # AUTOMATION: Reply received → update program status + priority
    await db.programs.update_one(
        {"program_id": program_id, "tenant_id": tenant_id},
        {"$set": {
            "reply_status": "Reply Received",
            "priority": "Very High",
            "next_action_due": (now + timedelta(days=2)).strftime("%Y-%m-%d"),
            "updated_at": now.isoformat(),
            "last_meaningful_engagement_at": now.isoformat(),
            "last_meaningful_engagement_type": "coach_reply",
        }},
    )

    await recompute_derived_data()
    return doc


# ─────────────────────────────────────────────────────────────────────────
# School Engagement Stats
# ─────────────────────────────────────────────────────────────────────────

@router.get("/athlete/engagement/{program_id}")
async def get_school_engagement(program_id: str, current_user: dict = get_current_user_dep()):
    """Return engagement stats for a program: opens, clicks, unique opens, timeline."""
    tenant_id = await get_athlete_tenant(current_user)

    # Check engagement_events collection first (email tracking pixels)
    engagement_events = await db.engagement_events.find(
        {"tenant_id": tenant_id, "program_id": program_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(200)

    total_opens = sum(1 for e in engagement_events if e.get("event_type") == "email_open")
    total_clicks = sum(1 for e in engagement_events if e.get("event_type") == "link_click")
    unique_emails = set()
    for e in engagement_events:
        if e.get("event_type") == "email_open" and e.get("coach_email"):
            unique_emails.add(e["coach_email"])
    unique_opens = len(unique_emails) if unique_emails else (1 if total_opens > 0 else 0)

    return {
        "total_opens": total_opens,
        "total_clicks": total_clicks,
        "unique_opens": unique_opens,
        "timeline": engagement_events,
    }


# ─────────────────────────────────────────────────────────────────────────
# Follow-ups
# ─────────────────────────────────────────────────────────────────────────

@router.get("/athlete/follow-ups")
async def list_follow_ups(current_user: dict = get_current_user_dep()):
    tenant_id = await get_athlete_tenant(current_user)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    programs = await db.programs.find(
        {
            "tenant_id": tenant_id,
            "next_action_due": {"$ne": "", "$lte": today},
            "is_active": {"$ne": False},
        },
        {"_id": 0},
    ).sort("next_action_due", 1).to_list(200)

    # Enrich with primary college coach
    pids = [p["program_id"] for p in programs]
    coaches = await db.college_coaches.find(
        {"tenant_id": tenant_id, "program_id": {"$in": pids}}, {"_id": 0}
    ).to_list(1000)
    by_pid = {}
    for c in coaches:
        by_pid.setdefault(c["program_id"], []).append(c)

    for p in programs:
        cs = by_pid.get(p["program_id"], [])
        primary = next((c for c in cs if c.get("role") == "Head Coach"), cs[0] if cs else None)
        p["primary_college_coach"] = primary.get("coach_name", "") if primary else ""
        p["college_coach_email"] = primary.get("email", "") if primary else ""

    return programs


@router.post("/athlete/follow-ups/{program_id}/mark-sent")
async def mark_follow_up_sent(program_id: str, body: dict, current_user: dict = get_current_user_dep()):
    tenant_id = await get_athlete_tenant(current_user)
    prog = await db.programs.find_one(
        {"tenant_id": tenant_id, "program_id": program_id}, {"_id": 0}
    )
    if not prog:
        raise HTTPException(404, "Program not found")

    now = datetime.now(timezone.utc)
    today = now.strftime("%Y-%m-%d")
    follow_up_days = prog.get("follow_up_days", 14)
    next_due = (now + timedelta(days=follow_up_days)).strftime("%Y-%m-%d")

    await db.programs.update_one(
        {"program_id": program_id, "tenant_id": tenant_id},
        {"$set": {
            "last_follow_up": today,
            "next_action_due": next_due,
            "reply_status": body.get("reply_status", prog.get("reply_status", "No Reply")),
            "updated_at": now.isoformat(),
        }},
    )

    # Log follow-up as interaction
    interaction_doc = {
        "interaction_id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "program_id": program_id,
        "university_name": prog.get("university_name", ""),
        "type": "Follow Up",
        "outcome": body.get("outcome", "No Response"),
        "notes": f"Follow-up marked sent on {today}",
        "date_time": now.isoformat(),
        "created_at": now.isoformat(),
    }
    await db.interactions.insert_one(interaction_doc)

    # Invalidate AI insight cache on follow-up
    await db.ai_insight_cache.delete_many({"tenant_id": tenant_id, "program_id": program_id})

    updated = await db.programs.find_one(
        {"program_id": program_id, "tenant_id": tenant_id}, {"_id": 0}
    )
    await recompute_derived_data()
    return updated


# ─────────────────────────────────────────────────────────────────────────
# Events CRUD
# ─────────────────────────────────────────────────────────────────────────

@router.get("/athlete/events")
async def list_events(current_user: dict = get_current_user_dep()):
    tenant_id = await get_athlete_tenant(current_user)
    events = await db.athlete_events.find(
        {"tenant_id": tenant_id}, {"_id": 0}
    ).sort("start_date", 1).to_list(200)
    return events


@router.post("/athlete/events")
async def create_event(body: dict, current_user: dict = get_current_user_dep()):
    tenant_id = await get_athlete_tenant(current_user)
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "event_id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "title": body.get("title", ""),
        "event_type": body.get("event_type", "Other"),
        "location": body.get("location", ""),
        "description": body.get("description", ""),
        "start_date": body.get("start_date", ""),
        "end_date": body.get("end_date", ""),
        "start_time": body.get("start_time", ""),
        "end_time": body.get("end_time", ""),
        "program_id": body.get("program_id"),
        "created_at": now,
    }
    await db.athlete_events.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/athlete/events/{event_id}")
async def update_event(event_id: str, body: dict, current_user: dict = get_current_user_dep()):
    tenant_id = await get_athlete_tenant(current_user)
    for key in ("_id", "event_id", "tenant_id"):
        body.pop(key, None)
    result = await db.athlete_events.update_one(
        {"tenant_id": tenant_id, "event_id": event_id},
        {"$set": body},
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Event not found")
    updated = await db.athlete_events.find_one(
        {"tenant_id": tenant_id, "event_id": event_id}, {"_id": 0}
    )
    return updated


@router.delete("/athlete/events/{event_id}")
async def delete_event(event_id: str, current_user: dict = get_current_user_dep()):
    tenant_id = await get_athlete_tenant(current_user)
    result = await db.athlete_events.delete_one(
        {"tenant_id": tenant_id, "event_id": event_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(404, "Event not found")
    return {"deleted": True}


# ─────────────────────────────────────────────────────────────────────────
# Dashboard aggregation
# ─────────────────────────────────────────────────────────────────────────

@router.get("/athlete/dashboard")
async def get_athlete_dashboard(current_user: dict = get_current_user_dep()):
    """Aggregated dashboard for the athlete home page."""
    tenant_id = await get_athlete_tenant(current_user)

    # Parallel fetch
    programs_f = db.programs.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(200)
    events_f = db.athlete_events.find(
        {"tenant_id": tenant_id}, {"_id": 0}
    ).sort("start_date", 1).to_list(50)
    interactions_f = db.interactions.find(
        {"tenant_id": tenant_id}, {"_id": 0}
    ).sort("date_time", -1).to_list(50)
    athlete_f = db.athletes.find_one({"user_id": current_user["id"]}, {"_id": 0})

    programs, events, interactions, athlete = await asyncio.gather(
        programs_f, events_f, interactions_f, athlete_f
    )

    # Compute signals for each program
    program_ids = [p["program_id"] for p in programs]
    signals_map = await _batch_signals(tenant_id, program_ids) if program_ids else {}

    for p in programs:
        p["signals"] = signals_map.get(p["program_id"], {})
        p["board_group"] = categorize_program(p)

    # Stats
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    total_schools = len(programs)
    active_programs = [p for p in programs if p.get("is_active", True)]

    follow_ups_due = [
        p for p in active_programs
        if p.get("next_action_due") and p["next_action_due"] <= today
    ]

    needs_first_outreach = [
        p for p in active_programs
        if p.get("board_group") == "needs_outreach"
    ]

    replied_count = sum(
        1 for p in active_programs
        if p.get("reply_status") in ("Reply Received", "In Conversation")
    )

    awaiting_reply_count = sum(
        1 for p in active_programs
        if p.get("reply_status") == "Awaiting Reply"
    )

    # Response rate
    contacted = [p for p in active_programs if p.get("recruiting_status") not in ("Not Contacted", None)]
    response_rate = round(replied_count / len(contacted) * 100) if contacted else 0

    # Recent interactions for activity feed (last 10)
    recent_interactions = interactions[:10]

    # Upcoming events (future only)
    upcoming_events = [
        e for e in events
        if e.get("start_date", "") >= today
    ][:5]

    # School spotlight — programs with active conversation or recent activity
    spotlight = [
        p for p in active_programs
        if p.get("board_group") in ("in_conversation", "overdue")
    ][:5]

    # Club coach info
    club_coach = None
    if athlete and athlete.get("primary_coach_id"):
        coach_doc = await db.users.find_one(
            {"id": athlete["primary_coach_id"]},
            {"_id": 0, "id": 1, "name": 1, "email": 1},
        )
        if coach_doc:
            club_coach = {"name": coach_doc["name"], "email": coach_doc["email"]}

    return {
        "profile": {
            "first_name": athlete.get("first_name", "") if athlete else "",
            "last_name": athlete.get("last_name", "") if athlete else "",
            "full_name": athlete.get("full_name", "") if athlete else "",
            "position": athlete.get("position", "") if athlete else "",
            "team": athlete.get("team", "") if athlete else "",
            "grad_year": athlete.get("grad_year") if athlete else None,
        },
        "stats": {
            "total_schools": total_schools,
            "response_rate": response_rate,
            "replied_count": replied_count,
            "awaiting_reply": awaiting_reply_count,
            "follow_ups_due": len(follow_ups_due),
        },
        "follow_ups_due": follow_ups_due,
        "needs_first_outreach": needs_first_outreach,
        "spotlight": spotlight,
        "recent_activity": recent_interactions,
        "upcoming_events": upcoming_events,
        "club_coach": club_coach,
        "gmail_connected": False,
    }

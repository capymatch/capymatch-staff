"""School Pod — per-school workspace for coaches.

Provides school-level data scoped to a specific athlete-school relationship.
"""

from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Query
from auth_middleware import get_current_user_dep
from services.ownership import can_access_athlete
from services.program_metrics import recompute_metrics
from db_client import db
import uuid

router = APIRouter()


# ─── Health classification for a school ───────────────────────
HEALTH_ORDER = {
    "at_risk": 0,
    "cooling_off": 1,
    "needs_attention": 2,
    "needs_follow_up": 3,
    "awaiting_reply": 4,
    "active": 5,
    "strong_momentum": 6,
    "still_early": 7,
}

HEALTH_DISPLAY = {
    "at_risk": {"label": "At Risk", "color": "#ef4444", "bg": "rgba(239,68,68,0.08)"},
    "cooling_off": {"label": "Cooling Off", "color": "#f59e0b", "bg": "rgba(245,158,11,0.08)"},
    "needs_attention": {"label": "Needs Attention", "color": "#f59e0b", "bg": "rgba(245,158,11,0.08)"},
    "needs_follow_up": {"label": "Needs Follow-up", "color": "#f59e0b", "bg": "rgba(245,158,11,0.08)"},
    "awaiting_reply": {"label": "Awaiting Reply", "color": "#3b82f6", "bg": "rgba(59,130,246,0.08)"},
    "active": {"label": "Active", "color": "#0d9488", "bg": "rgba(13,148,136,0.08)"},
    "strong_momentum": {"label": "Strong", "color": "#10b981", "bg": "rgba(16,185,129,0.08)"},
    "still_early": {"label": "Early Stage", "color": "#64748b", "bg": "rgba(100,116,139,0.08)"},
}


def classify_school_health(program, metrics, *, actual_days_since_contact=None, playbook_complete=False):
    """Derive a unified health state from program + metrics + real-time context.

    actual_days_since_contact: real days from timeline events (overrides stale metrics)
    playbook_complete: if True, suppress at_risk when contact is recent
    """
    if not metrics:
        return "still_early"

    health = metrics.get("pipeline_health_state", "still_early")
    overdue = metrics.get("overdue_followups", 0)
    freshness = metrics.get("engagement_freshness_label", "")

    # Schools in early stages should never show as at_risk
    recruiting_status = (program.get("recruiting_status") or "").strip()
    is_early_stage = recruiting_status in ("Prospect", "Not Contacted", "Added", "")
    if is_early_stage:
        # Early-stage schools are either still_early or awaiting_reply
        if health in ("at_risk", "cooling_off", "needs_follow_up", "needs_attention"):
            return "still_early"
        return health if health in ("still_early", "awaiting_reply") else "still_early"

    # Use actual contact days when available (more accurate than stale metrics)
    effective_days = actual_days_since_contact if actual_days_since_contact is not None else (metrics.get("days_since_last_engagement") or 999)

    # Clamp the 999 fallback — means "no data", not "999 days stale"
    if effective_days >= 999:
        effective_days = 0

    # Recent real-world contact overrides metric-based risk assessments
    if effective_days <= 3:
        if health in ("at_risk", "cooling_off"):
            return "active"
        if health == "needs_follow_up":
            return "active"
        return health if health in ("strong_momentum", "active") else "active"

    # Playbook complete + reasonably recent contact → not at_risk
    if playbook_complete and effective_days <= 14:
        if health in ("at_risk", "cooling_off"):
            return "needs_follow_up" if effective_days > 7 else "active"

    # Override: overdue follow-ups → needs_attention or at_risk
    if overdue > 0 and effective_days > 7:
        if freshness in ("no_recent_engagement", "momentum_slowing"):
            return "at_risk"
        return "needs_attention"
    if overdue > 0 and effective_days > 3:
        return "needs_attention"

    # Override: stale + no reply
    reply = program.get("reply_status", "")
    if reply in ("No Reply", "Awaiting Reply") and freshness == "no_recent_engagement" and effective_days > 14:
        stage = recruiting_status
        if stage in ("Contacted", "In Conversation"):
            return "needs_attention"

    return health


def compute_school_signals(program, metrics, actual_days_since_contact=None, playbook_complete=False):
    """Generate school-specific signals from program_metrics.
    
    actual_days_since_contact: real days since last pod event (overrides stale metrics)
    playbook_complete: if True, suppress follow-up overdue signals
    """
    signals = []
    if not metrics:
        return signals

    # Schools in early/added stages should not show engagement-based alerts
    recruiting_status = (program.get("recruiting_status") or "").strip()
    is_early_stage = recruiting_status in ("Prospect", "Not Contacted", "Added", "")

    overdue = metrics.get("overdue_followups", 0)
    freshness = metrics.get("engagement_freshness_label", "")
    reply_rate = metrics.get("reply_rate")
    stalled = metrics.get("stage_stalled_days") or 0
    trend = metrics.get("engagement_trend", "")
    days_since = metrics.get("days_since_last_engagement")

    # Use actual contact days when available (more accurate than stale metrics)
    effective_days = actual_days_since_contact if actual_days_since_contact is not None else (days_since or 0)

    # Never surface the 999 fallback — treat it as "no data" not "999 days late"
    if effective_days >= 999:
        effective_days = 0  # No data = don't generate day-count signals

    # Suppress all engagement-based alerts for early-stage schools
    # (no outreach sent yet, so "overdue" and "stale" make no sense)
    if is_early_stage:
        return signals

    # Overdue signal — suppress if recent activity (within 3 days)
    if overdue > 0 and effective_days > 3:
        if effective_days > 0:
            overdue_title = f"Follow-up overdue — no response for {effective_days} day{'s' if effective_days != 1 else ''}"
        else:
            overdue_title = f"Follow-up overdue — {overdue} action{'s' if overdue > 1 else ''} past due"
        signals.append({
            "id": "sig_overdue",
            "type": "alert",
            "priority": "critical",
            "title": overdue_title,
            "description": f"{overdue} follow-up action{'s' if overdue > 1 else ''} past due. This relationship needs immediate attention.",
            "recommendation": "Send a follow-up message or log a recent interaction.",
        })

    reply = program.get("reply_status", "")
    if reply in ("No Reply", "Awaiting Reply") and recruiting_status in ("Contacted", "In Conversation"):
        signals.append({
            "id": "sig_no_reply",
            "type": "warning",
            "priority": "high",
            "title": "No Response from School",
            "description": f"Status: {reply}. Initial contact was sent {program.get('initial_contact_sent', 'unknown')}.",
            "recommendation": "Consider a different outreach approach or escalate to director.",
        })

    # Stale engagement — only if actually no recent contact and not early stage
    if freshness == "no_recent_engagement" and effective_days > 7:
        stale_title = f"Engagement gone cold — {effective_days} days silent"
        stale_desc = f"No activity with this school in {effective_days} days. Trend: {trend}."
        signals.append({
            "id": "sig_stale",
            "type": "warning",
            "priority": "high",
            "title": stale_title,
            "description": stale_desc,
            "recommendation": "Re-engage with this school or reassess priority.",
        })

    if stalled > 14:
        signals.append({
            "id": "sig_stalled_stage",
            "type": "warning",
            "priority": "medium",
            "title": f"Stage Stalled ({stalled} days)",
            "description": f"Recruiting status has been '{program.get('recruiting_status')}' for {stalled} days.",
            "recommendation": "Evaluate if this school is still a viable target.",
        })

    if reply_rate is not None and reply_rate > 0.7 and trend == "accelerating":
        signals.append({
            "id": "sig_momentum",
            "type": "insight",
            "priority": "info",
            "title": "Strong Momentum",
            "description": f"Reply rate: {int(reply_rate * 100)}%. Engagement is accelerating.",
            "recommendation": "Capitalize on this momentum — push toward next stage.",
        })

    return signals


# ─── School-Specific Playbook Generator ───────────────────────
def _get_school_playbook(program, metrics, signals, school_info, athlete):
    """Generate a school-specific action plan based on the school's current signals."""
    if not signals:
        return None

    school = program.get("university_name", "this school")
    coach_name = (school_info or {}).get("primary_coach", "")
    coach_label = coach_name or f"the coach at {school}"
    status = program.get("recruiting_status", "")
    reply = program.get("reply_status", "")
    days_since = (metrics or {}).get("days_since_last_engagement") or 0
    overdue = (metrics or {}).get("overdue_followups", 0)
    stalled = (metrics or {}).get("stage_stalled_days", 0)
    athlete_name = athlete.get("full_name", "the athlete") if athlete else "the athlete"

    # Determine the primary signal to build the playbook around
    sig_ids = [s["id"] for s in signals if s["type"] != "insight"]
    if not sig_ids:
        return None

    # Priority: overdue > stale > no_reply > stalled_stage
    if "sig_overdue" in sig_ids:
        return _school_playbook_followup(school, coach_label, athlete_name, days_since, overdue, status)
    if "sig_stale" in sig_ids:
        return _school_playbook_reengage(school, coach_label, athlete_name, days_since, reply)
    if "sig_no_reply" in sig_ids:
        return _school_playbook_outreach(school, coach_label, athlete_name, reply, status)
    if "sig_stalled_stage" in sig_ids:
        return _school_playbook_advance(school, coach_label, athlete_name, status, stalled)

    return None


def _school_playbook_followup(school, coach, athlete, days_since, overdue, status):
    steps = [
        {"step": 1, "action": f"Review last interaction with {school} — what was discussed and what was promised", "owner": "Coach", "days": "Day 1"},
        {"step": 2, "action": f"Send a follow-up email to {coach} referencing the last conversation", "owner": "Athlete", "days": "Day 1"},
        {"step": 3, "action": f"If no response in 48h, try a different channel (phone call or social media)", "owner": "Coach", "days": "Day 3"},
        {"step": 4, "action": f"Log the outcome and update {school}'s status", "owner": "Coach", "days": "Day 3-5"},
    ]
    if overdue > 1:
        steps.insert(2, {"step": 3, "action": f"Prioritize the most time-sensitive follow-up — {overdue} are overdue", "owner": "Coach", "days": "Day 1"})
        for i, s in enumerate(steps):
            s["step"] = i + 1

    return {
        "title": "Follow-Up Required",
        "description": f"{overdue} overdue follow-up{'s' if overdue > 1 else ''} with {school}. Last engagement was {days_since} days ago.",
        "estimated_days": "3-5 days",
        "success_criteria": f"{coach} responds or {athlete} has a confirmed next step with {school}",
        "steps": steps,
    }


def _school_playbook_reengage(school, coach, athlete, days_since, reply):
    steps = [
        {"step": 1, "action": f"Review the full interaction history with {school} — identify what went cold", "owner": "Coach", "days": "Day 1"},
        {"step": 2, "action": f"Prepare new content to share (updated stats, recent highlights, or tournament results)", "owner": "Athlete", "days": "Day 1-2"},
        {"step": 3, "action": f"Send a re-engagement email to {coach} with fresh content and a specific ask", "owner": "Athlete", "days": "Day 2"},
        {"step": 4, "action": f"If no response after 3 days, evaluate whether {school} is still a realistic target", "owner": "Coach", "days": "Day 5"},
        {"step": 5, "action": f"Log outcome and adjust {school}'s priority if needed", "owner": "Coach", "days": "Day 5-7"},
    ]
    return {
        "title": "Re-engagement Plan",
        "description": f"Engagement with {school} has gone stale — no activity in {days_since} days.",
        "estimated_days": "5-7 days",
        "success_criteria": f"Re-establish contact with {school} or make a clear keep/drop decision",
        "steps": steps,
    }


def _school_playbook_outreach(school, coach, athlete, reply, status):
    if status in ("Not Contacted", ""):
        # First contact playbook
        steps = [
            {"step": 1, "action": f"Research {school}'s program — roster needs, recruiting class, and coaching staff", "owner": "Coach", "days": "Day 1"},
            {"step": 2, "action": f"Draft a personalized introduction email to {coach}", "owner": "Coach + Athlete", "days": "Day 1"},
            {"step": 3, "action": f"Send the introduction email with {athlete}'s highlights and profile link", "owner": "Athlete", "days": "Day 2"},
            {"step": 4, "action": f"Follow up if no response within 5 days", "owner": "Coach", "days": "Day 7"},
        ]
        return {
            "title": "First Outreach Plan",
            "description": f"{school} has not been contacted yet. Time to make a strong first impression.",
            "estimated_days": "1-2 days",
            "success_criteria": f"Introduction email sent to {coach} at {school}",
            "steps": steps,
        }
    else:
        steps = [
            {"step": 1, "action": f"Review what was sent to {school} and when — assess if the approach needs changing", "owner": "Coach", "days": "Day 1"},
            {"step": 2, "action": f"Try a different angle — reference a specific event, mutual connection, or new achievement", "owner": "Coach + Athlete", "days": "Day 2"},
            {"step": 3, "action": f"Send the revised outreach to {coach}", "owner": "Athlete", "days": "Day 2"},
            {"step": 4, "action": f"If still no reply after 5 more days, consider reaching the recruiting coordinator or assistant coach", "owner": "Coach", "days": "Day 7"},
            {"step": 5, "action": f"Evaluate whether to continue pursuing {school} or redirect effort", "owner": "Coach", "days": "Day 10"},
        ]
        return {
            "title": "Outreach Strategy",
            "description": f"No response from {school} despite contact. A different approach may be needed.",
            "estimated_days": "7-10 days",
            "success_criteria": f"Receive a response from {school} or make a clear decision on next steps",
            "steps": steps,
        }


def _school_playbook_advance(school, coach, athlete, status, stalled):
    steps = [
        {"step": 1, "action": f"Assess why {school} has been at '{status}' for {stalled} days — is it the school or {athlete}?", "owner": "Coach", "days": "Day 1"},
        {"step": 2, "action": f"Identify the specific next step needed to move forward (visit, application, commitment talk)", "owner": "Coach", "days": "Day 1"},
        {"step": 3, "action": f"Communicate the next step to {coach} at {school} with a clear timeline", "owner": "Athlete", "days": "Day 2"},
        {"step": 4, "action": f"Follow up and confirm the stage has advanced", "owner": "Coach", "days": "Day 5"},
    ]
    return {
        "title": "Stage Advancement Plan",
        "description": f"Recruiting status with {school} has been '{status}' for {stalled} days. Time to move forward.",
        "estimated_days": "3-5 days",
        "success_criteria": f"Clear next step agreed with {school} and stage updated",
        "steps": steps,
    }


# ─── GET /api/support-pods/:athleteId/schools ─────────────────
@router.get("/support-pods/{athlete_id}/schools")
async def get_athlete_schools(athlete_id: str, refresh: bool = Query(False), current_user: dict = get_current_user_dep()):
    """Return all target schools for an athlete, sorted by urgency."""
    if not can_access_athlete(current_user, athlete_id):
        raise HTTPException(status_code=403, detail="Access denied")

    # Find athlete's user to get tenant_id
    user = await db.users.find_one({"athlete_id": athlete_id}, {"_id": 0, "id": 1})
    if not user:
        # Fallback: check program_metrics which has athlete_id directly
        metrics_list = await db.program_metrics.find(
            {"athlete_id": athlete_id}, {"_id": 0}
        ).to_list(50)
        program_ids = [m["program_id"] for m in metrics_list]
        programs = []
        for pid in program_ids:
            p = await db.programs.find_one({"program_id": pid}, {"_id": 0})
            if p:
                programs.append(p)
    else:
        tenant_id = f"tenant-{user['id']}"
        programs = await db.programs.find(
            {"tenant_id": tenant_id}, {"_id": 0}
        ).to_list(50)

    # Fetch all metrics for this athlete
    # If refresh requested, recompute all program metrics first
    if refresh:
        for p in programs:
            try:
                await recompute_metrics(p["program_id"], p.get("tenant_id", ""))
            except Exception:
                pass

    metrics_map = {}
    metrics_list = await db.program_metrics.find(
        {"athlete_id": athlete_id}, {"_id": 0}
    ).to_list(50)
    for m in metrics_list:
        metrics_map[m["program_id"]] = m

    # Count school-scoped actions per program
    action_counts = {}
    pipeline = [
        {"$match": {"athlete_id": athlete_id, "program_id": {"$exists": True, "$ne": None}, "status": {"$in": ["ready", "open", "overdue"]}}},
        {"$group": {"_id": "$program_id", "count": {"$sum": 1}}},
    ]
    async for doc in db.pod_actions.aggregate(pipeline):
        action_counts[doc["_id"]] = doc["count"]

    # Get the most recent timeline event per program for actual contact days
    program_ids = [p["program_id"] for p in programs]
    last_event_map = {}
    if program_ids:
        last_events_pipeline = [
            {"$match": {"athlete_id": athlete_id, "program_id": {"$in": program_ids}}},
            {"$sort": {"created_at": -1}},
            {"$group": {"_id": "$program_id", "last_created_at": {"$first": "$created_at"}}},
        ]
        async for doc in db.pod_action_events.aggregate(last_events_pipeline):
            last_event_map[doc["_id"]] = doc["last_created_at"]

    # Get playbook completion status per program
    playbook_progress_map = {}
    if program_ids:
        pb_docs = await db.playbook_progress.find(
            {"athlete_id": athlete_id, "program_id": {"$in": program_ids}},
            {"_id": 0, "program_id": 1, "checked_steps": 1}
        ).to_list(50)
        for pb in pb_docs:
            playbook_progress_map[pb["program_id"]] = pb.get("checked_steps", [])

    # Build school list — enrich with KB logos
    uni_names = [p.get("university_name", "") for p in programs]
    kb_docs = await db.university_knowledge_base.find(
        {"university_name": {"$in": uni_names}},
        {"_id": 0, "university_name": 1, "logo_url": 1, "domain": 1},
    ).to_list(200)
    kb_map = {d["university_name"]: d for d in kb_docs}

    now = datetime.now(timezone.utc)
    schools = []
    for p in programs:
        pid = p["program_id"]
        m = metrics_map.get(pid, {})
        kb = kb_map.get(p.get("university_name", ""), {})

        # Compute actual days since last event for this school
        last_evt_at = last_event_map.get(pid)
        actual_days = None
        if last_evt_at:
            try:
                if isinstance(last_evt_at, str):
                    lc_date = datetime.fromisoformat(last_evt_at.replace("Z", "+00:00"))
                else:
                    lc_date = last_evt_at if last_evt_at.tzinfo else last_evt_at.replace(tzinfo=timezone.utc)
                actual_days = (now - lc_date).days
            except Exception:
                pass

        # Check if playbook is complete for this school
        checked = playbook_progress_map.get(pid, [])
        # We need to know total steps — compute signals to get playbook
        # For list view, use a lightweight estimate: if checked_steps > 0, check against overdue
        pb_complete = len(checked) >= 3 and len(checked) > 0  # At least 3 steps checked is a reasonable heuristic

        health = classify_school_health(p, m, actual_days_since_contact=actual_days, playbook_complete=pb_complete)
        health_display = HEALTH_DISPLAY.get(health, HEALTH_DISPLAY["still_early"])

        # Suppress overdue count for early-stage schools — no outreach to be "overdue" on
        recruiting_status = (p.get("recruiting_status") or "").strip()
        is_early = recruiting_status in ("Prospect", "Not Contacted", "Added", "")
        overdue_count = 0 if is_early else m.get("overdue_followups", 0)

        schools.append({
            "program_id": pid,
            "university_name": p.get("university_name", ""),
            "logo_url": kb.get("logo_url") or p.get("logo_url", ""),
            "domain": kb.get("domain") or p.get("domain", ""),
            "division": p.get("division", ""),
            "conference": p.get("conference", ""),
            "recruiting_status": p.get("recruiting_status", ""),
            "reply_status": p.get("reply_status", ""),
            "priority": p.get("priority", ""),
            "next_action": p.get("next_action", ""),
            "next_action_due": p.get("next_action_due", ""),
            "initial_contact_sent": p.get("initial_contact_sent", ""),
            "last_follow_up": p.get("last_follow_up", ""),
            "health": health,
            "health_label": health_display["label"],
            "health_color": health_display["color"],
            "health_bg": health_display["bg"],
            "engagement_trend": m.get("engagement_trend", ""),
            "days_since_last_engagement": actual_days if actual_days is not None else m.get("days_since_last_engagement"),
            "reply_rate": m.get("reply_rate"),
            "overdue_followups": overdue_count,
            "open_actions": action_counts.get(pid, 0),
        })

    # Sort: at_risk first, then needs_attention, etc.
    schools.sort(key=lambda s: (HEALTH_ORDER.get(s["health"], 99), -(s.get("overdue_followups") or 0)))

    return {"athlete_id": athlete_id, "schools": schools, "total": len(schools)}


# ─── GET /api/support-pods/:athleteId/school/:programId ───────
@router.get("/support-pods/{athlete_id}/school/{program_id}")
async def get_school_pod(athlete_id: str, program_id: str, current_user: dict = get_current_user_dep()):
    """Return full school pod data for a specific athlete-school relationship."""
    if not can_access_athlete(current_user, athlete_id):
        raise HTTPException(status_code=403, detail="Access denied")

    program = await db.programs.find_one({"program_id": program_id}, {"_id": 0})
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")

    # Always recompute fresh metrics for the School Pod (single school = fast)
    tenant_id = program.get("tenant_id", "")
    try:
        metrics = await recompute_metrics(program_id, tenant_id)
    except Exception:
        metrics = await db.program_metrics.find_one(
            {"program_id": program_id, "athlete_id": athlete_id}, {"_id": 0}
        )

    # School coach info from knowledge base
    kb = await db.university_knowledge_base.find_one(
        {"university_name": program.get("university_name")}, {"_id": 0}
    )

    # NOTE: Health is computed AFTER we have actual_days + playbook context (below)

    # School-scoped actions (have program_id set)
    actions = await db.pod_actions.find(
        {"athlete_id": athlete_id, "program_id": program_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)

    # School-scoped notes
    notes = await db.athlete_notes.find(
        {"athlete_id": athlete_id, "program_id": program_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)

    # School-scoped timeline events
    events = await db.pod_action_events.find(
        {"athlete_id": athlete_id, "program_id": program_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)

    # Stage history for this program
    stage_history = await db.program_stage_history.find(
        {"program_id": program_id, "athlete_id": athlete_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(20)

    # School-level issues
    school_issues = await db.pod_issues.find(
        {"athlete_id": athlete_id, "program_id": program_id, "status": "active"},
        {"_id": 0}
    ).sort("severity", 1).to_list(10)
    current_issue = school_issues[0] if school_issues else None

    # Athlete data for playbook context
    athlete = await db.athletes.find_one({"id": athlete_id}, {"_id": 0})

    # Athlete context for display
    athlete_context = {
        "name": (athlete or {}).get("full_name", ""),
        "graduation_year": (athlete or {}).get("grad_year", ""),
        "position": (athlete or {}).get("position_primary", "") or (athlete or {}).get("position", ""),
        "club_team": (athlete or {}).get("team", ""),
    }

    # Relationship context: count interactions by type
    interaction_counts = {"emails": 0, "calls": 0, "events": 0, "advocacy": 0, "visits": 0, "total": 0}
    last_contact = None
    last_contact_type = ""
    all_events = await db.pod_action_events.find(
        {"athlete_id": athlete_id, "program_id": program_id},
        {"_id": 0, "type": 1, "description": 1, "created_at": 1}
    ).sort("created_at", -1).to_list(500)
    for evt in all_events:
        etype = evt.get("type", "")
        desc = (evt.get("description") or "").lower()
        created = evt.get("created_at")
        if "email" in etype or "email" in desc:
            interaction_counts["emails"] += 1
            if not last_contact:
                last_contact = created
                last_contact_type = "Email"
        elif "call" in etype or "phone" in desc or "call" in desc:
            interaction_counts["calls"] += 1
            if not last_contact:
                last_contact = created
                last_contact_type = "Phone Call"
        elif "visit" in etype or "visit" in desc or "campus" in desc:
            interaction_counts["visits"] += 1
            if not last_contact:
                last_contact = created
                last_contact_type = "Campus Visit"
        elif "event" in etype or "event" in desc:
            interaction_counts["events"] += 1
            if not last_contact:
                last_contact = created
                last_contact_type = "Event Interaction"
        elif "advocacy" in etype or "recommend" in desc or "advocate" in desc:
            interaction_counts["advocacy"] += 1
            if not last_contact:
                last_contact = created
                last_contact_type = "Advocacy"
        else:
            if not last_contact and created:
                last_contact = created
                last_contact_type = etype.replace("_", " ").title() if etype else "Interaction"
        interaction_counts["total"] += 1

    # Also check advocacy/recommendations collection
    advocacy_count = await db.recommendations.count_documents({
        "athlete_id": athlete_id,
        "$or": [
            {"school_name": program.get("university_name")},
            {"program_id": program_id},
        ]
    })
    interaction_counts["advocacy"] += advocacy_count

    # Determine relationship strength — richer calculation
    days_eng = (metrics or {}).get("days_since_last_engagement") or 999
    rr = (metrics or {}).get("reply_rate") or 0
    mic = (metrics or {}).get("meaningful_interaction_count", 0)
    total_ints = interaction_counts["total"]
    has_visit = interaction_counts["visits"] > 0
    has_advocacy = interaction_counts["advocacy"] > 0

    if has_visit and rr > 0.4 and days_eng < 21:
        relationship_strength = "strong"
    elif rr > 0.5 and mic >= 3 and days_eng < 14:
        relationship_strength = "active"
    elif (mic >= 1 and days_eng < 30) or (total_ints >= 3 and days_eng < 45):
        relationship_strength = "warm"
    else:
        relationship_strength = "cold"

    # Response rate detail
    outbound_count = max(interaction_counts["emails"], 1)
    reply_count = round(rr * outbound_count)
    response_detail = f"{reply_count} / {outbound_count} replies"

    # Contact health message — prefer actual last_contact date over metrics fallback
    if last_contact:
        try:
            from datetime import datetime as dt_cls
            lc = last_contact if isinstance(last_contact, str) else str(last_contact)
            lc_date = dt_cls.fromisoformat(lc.replace("Z", "+00:00")) if isinstance(lc, str) else lc
            actual_days = (datetime.now(timezone.utc) - lc_date).days if hasattr(lc_date, 'day') else days_eng
        except Exception:
            actual_days = days_eng
    else:
        actual_days = days_eng

    # Clamp the 999 fallback — means "no data" not "999 days stale"
    if actual_days >= 999:
        actual_days = None  # No data available

    # Early-stage schools: suppress day-count messaging entirely
    recruiting_status = (program.get("recruiting_status") or "").strip()
    is_early_stage = recruiting_status in ("Prospect", "Not Contacted", "Added", "")

    if is_early_stage:
        contact_health = "Not yet contacted — school just added to pipeline"
        actual_days_for_signals = None
    elif actual_days is None and not last_contact:
        contact_health = "No recorded contact yet"
        actual_days_for_signals = None
    elif actual_days is None and last_contact:
        contact_health = "Recently active"
        actual_days_for_signals = 0
    elif actual_days == 0:
        contact_health = "Contacted today"
        actual_days_for_signals = 0
    elif actual_days <= 3:
        contact_health = f"Recently active — {actual_days} day{'s' if actual_days != 1 else ''} ago"
        actual_days_for_signals = actual_days
    elif actual_days <= 7:
        contact_health = f"Awaiting reply — {actual_days} days"
        actual_days_for_signals = actual_days
    elif actual_days <= 14:
        contact_health = f"Follow-up recommended — {actual_days} days since last contact"
        actual_days_for_signals = actual_days
    elif actual_days <= 30:
        contact_health = f"Going cold — {actual_days} days without contact"
        actual_days_for_signals = actual_days
    elif last_contact:
        contact_health = f"Re-engagement needed — {actual_days} days since last contact"
        actual_days_for_signals = actual_days
    else:
        contact_health = "No recorded contact yet"
        actual_days_for_signals = None

    # Use actual_days_for_signals for downstream signal/health computation
    actual_days = actual_days_for_signals if actual_days_for_signals is not None else 0

    # Pipeline stage context
    status_to_stage_idx = {
        "Not Contacted": 0, "Prospect": 0, "Added": 0,
        "Contacted": 1, "Initial Contact": 1,
        "In Conversation": 2, "Engaged": 2,
        "Interested": 3,
        "Visit Scheduled": 4, "Visit": 4, "Campus Visit": 4,
        "Offer": 5, "Committed": 5,
    }
    current_stage = program.get("recruiting_status", "Prospect")
    stage_idx = status_to_stage_idx.get(current_stage, 0)

    # Compute stage_days: how long in the CURRENT stage
    # For contacted/initial contact stages, use initial_contact_sent
    # For other stages, use stage_entered_at or fall back to initial_contact_sent/created_at
    stage_days = 0
    if stage_idx >= 1 and program.get("initial_contact_sent"):
        # For any stage past Prospect, the initial_contact_sent is the baseline
        # But stage_entered_at should win if it's AFTER initial_contact_sent (means a real stage transition)
        stage_date_str = program.get("initial_contact_sent")
        entered_at = program.get("stage_entered_at")
        if entered_at and stage_date_str:
            try:
                entered_dt = datetime.fromisoformat(str(entered_at).replace("Z", "+00:00"))
                contact_dt = datetime.fromisoformat(str(stage_date_str).replace("Z", "+00:00"))
                # Use stage_entered_at only if it's after initial contact (real stage transition)
                if entered_dt > contact_dt:
                    stage_date_str = entered_at
            except Exception:
                pass
    else:
        stage_date_str = program.get("stage_entered_at") or program.get("created_at")

    if stage_date_str:
        try:
            stage_date = datetime.fromisoformat(str(stage_date_str).replace("Z", "+00:00"))
            stage_days = max(0, (datetime.now(timezone.utc) - stage_date).days)
        except Exception:
            pass

    # Now compute signals with actual contact context
    signals = compute_school_signals(program, metrics, actual_days_since_contact=actual_days)

    # Generate school-specific action plan playbook
    school_info_dict = {
        "primary_coach": (kb or {}).get("primary_coach", ""),
        "coach_email": (kb or {}).get("coach_email", ""),
        "recruiting_coordinator": (kb or {}).get("recruiting_coordinator", ""),
        "coordinator_email": (kb or {}).get("coordinator_email", ""),
        "website": (kb or {}).get("website", ""),
        "scholarship_type": (kb or {}).get("scholarship_type", ""),
    } if kb else None
    playbook = _get_school_playbook(program, metrics, signals, school_info_dict, athlete)

    # Load saved playbook progress
    progress_doc = await db.playbook_progress.find_one(
        {"athlete_id": athlete_id, "program_id": program_id}, {"_id": 0}
    )
    playbook_checked_steps = progress_doc.get("checked_steps", []) if progress_doc else []

    # Determine playbook completion state
    total_steps = len(playbook.get("steps", [])) if playbook else 0
    pb_complete = total_steps > 0 and len(playbook_checked_steps) >= total_steps

    # ── UNIFIED HEALTH + SIGNAL CONSISTENCY ──
    # Suppress signals based on context (playbook complete, recent contact)
    if pb_complete:
        signals = [s for s in signals if s["priority"] != "critical"]
    if actual_days <= 3:
        signals = [s for s in signals if s["priority"] not in ("critical", "high")]

    # Compute health WITH full context (actual contact days + playbook)
    # This ensures health badge, hero card, and signals all agree
    health = classify_school_health(program, metrics, actual_days_since_contact=actual_days, playbook_complete=pb_complete)
    health_display = HEALTH_DISPLAY.get(health, HEALTH_DISPLAY["still_early"])

    # Derive hero status from the unified health + remaining signals
    # This is the single source of truth the frontend should use
    remaining_critical = any(s["priority"] == "critical" for s in signals)
    remaining_high = any(s["priority"] == "high" for s in signals)
    remaining_medium = any(s["priority"] == "medium" for s in signals)
    if current_issue:
        hero_status = {"label": "Active Issue", "color": "#dc2626", "severity": "critical"}
    elif remaining_critical:
        hero_status = {"label": "Critical", "color": "#dc2626", "severity": "critical"}
    elif remaining_high:
        hero_status = {"label": "Needs Attention", "color": "#d97706", "severity": "high"}
    elif health in ("at_risk",):
        hero_status = {"label": "At Risk", "color": "#ef4444", "severity": "high"}
    elif health in ("needs_attention", "needs_follow_up", "cooling_off"):
        hero_status = {"label": "Needs Attention", "color": "#d97706", "severity": "medium"}
    elif remaining_medium:
        hero_status = {"label": "Monitor", "color": "#f59e0b", "severity": "medium"}
    elif health in ("awaiting_reply",):
        hero_status = {"label": "Awaiting Reply", "color": "#3b82f6", "severity": "info"}
    else:
        hero_status = {"label": "On Track", "color": "#10b981", "severity": "ok"}

    return {
        "program": {
            "program_id": program_id,
            "university_name": program.get("university_name", ""),
            "division": program.get("division", ""),
            "conference": program.get("conference", ""),
            "region": program.get("region", ""),
            "recruiting_status": program.get("recruiting_status", ""),
            "reply_status": program.get("reply_status", ""),
            "priority": program.get("priority", ""),
            "next_action": program.get("next_action", ""),
            "next_action_due": program.get("next_action_due", ""),
            "initial_contact_sent": program.get("initial_contact_sent", ""),
            "last_follow_up": program.get("last_follow_up", ""),
            "notes": program.get("notes", ""),
        },
        "metrics": {
            "engagement_trend": (metrics or {}).get("engagement_trend", ""),
            "reply_rate": (metrics or {}).get("reply_rate"),
            "overdue_followups": (metrics or {}).get("overdue_followups", 0),
            "stage_stalled_days": (metrics or {}).get("stage_stalled_days", 0),
            "days_since_last_engagement": (metrics or {}).get("days_since_last_engagement"),
            "engagement_freshness_label": (metrics or {}).get("engagement_freshness_label", ""),
            "meaningful_interaction_count": (metrics or {}).get("meaningful_interaction_count", 0),
            "pipeline_health_state": (metrics or {}).get("pipeline_health_state", ""),
        },
        "health": health,
        "health_display": health_display,
        "hero_status": hero_status,
        "signals": signals,
        "current_issue": current_issue,
        "actions": actions,
        "playbook": playbook,
        "playbook_checked_steps": playbook_checked_steps,
        "notes": notes,
        "timeline_events": events,
        "stage_history": stage_history,
        "school_info": school_info_dict,
        "athlete_context": athlete_context,
        "relationship": {
            "strength": relationship_strength,
            "interactions": interaction_counts,
            "last_contact": last_contact if isinstance(last_contact, str) else (last_contact.isoformat() if last_contact else None),
            "last_contact_type": last_contact_type,
            "response_detail": response_detail,
            "contact_health": contact_health,
        },
        "pipeline": {
            "current_stage": current_stage,
            "stage_index": stage_idx,
            "stage_days": stage_days,
        },
    }


# ─── POST: School-scoped actions ─────────────────────────────
@router.post("/support-pods/{athlete_id}/school/{program_id}/actions")
async def create_school_action(athlete_id: str, program_id: str, body: dict, current_user: dict = get_current_user_dep()):
    """Create an action scoped to a specific school."""
    if not can_access_athlete(current_user, athlete_id):
        raise HTTPException(status_code=403, detail="Access denied")

    program = await db.programs.find_one({"program_id": program_id}, {"_id": 0, "university_name": 1})
    school_name = program.get("university_name", "") if program else ""
    now = datetime.now(timezone.utc).isoformat()

    doc = {
        "id": str(uuid.uuid4()),
        "athlete_id": athlete_id,
        "program_id": program_id,
        "school_name": school_name,
        "title": body.get("title", ""),
        "owner": body.get("owner", current_user.get("name", "")),
        "assigned_to_athlete": body.get("assigned_to_athlete", False),
        "action_type": body.get("action_type", "general"),
        "status": "ready",
        "due_date": body.get("due_date", (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()),
        "source": "manual",
        "notes": body.get("notes", ""),
        "created_by": current_user["name"],
        "created_at": now,
        "completed_at": None,
    }
    await db.pod_actions.insert_one(doc)
    doc.pop("_id", None)

    # Timeline event
    await db.pod_action_events.insert_one({
        "id": str(uuid.uuid4()),
        "athlete_id": athlete_id,
        "program_id": program_id,
        "type": "action_created",
        "description": f"[{school_name}] Created action: {doc['title']}",
        "actor": current_user["name"],
        "created_at": now,
    })

    return doc


# ─── POST: School-scoped note ────────────────────────────────
@router.post("/support-pods/{athlete_id}/school/{program_id}/notes")
async def create_school_note(athlete_id: str, program_id: str, body: dict, current_user: dict = get_current_user_dep()):
    """Create a note scoped to a specific school."""
    if not can_access_athlete(current_user, athlete_id):
        raise HTTPException(status_code=403, detail="Access denied")

    program = await db.programs.find_one({"program_id": program_id}, {"_id": 0, "university_name": 1})
    school_name = program.get("university_name", "") if program else ""
    now = datetime.now(timezone.utc).isoformat()

    doc = {
        "id": str(uuid.uuid4()),
        "athlete_id": athlete_id,
        "program_id": program_id,
        "school_name": school_name,
        "author": current_user["name"],
        "text": body.get("text", ""),
        "tag": body.get("tag", ""),
        "category": body.get("category", "recruiting"),
        "created_at": now,
    }
    await db.athlete_notes.insert_one(doc)
    doc.pop("_id", None)

    # Timeline event
    await db.pod_action_events.insert_one({
        "id": str(uuid.uuid4()),
        "athlete_id": athlete_id,
        "program_id": program_id,
        "type": "note_added",
        "description": f"[{school_name}] Note: {doc['text'][:80]}",
        "actor": current_user["name"],
        "created_at": now,
    })

    return doc


# ─── PATCH: Complete/update school-scoped action ─────────────
@router.patch("/support-pods/{athlete_id}/school/{program_id}/actions/{action_id}")
async def update_school_action(athlete_id: str, program_id: str, action_id: str, body: dict, current_user: dict = get_current_user_dep()):
    """Update a school-scoped action (complete, reassign, etc.)."""
    if not can_access_athlete(current_user, athlete_id):
        raise HTTPException(status_code=403, detail="Access denied")

    now = datetime.now(timezone.utc).isoformat()
    update_dict = {}
    status = body.get("status")
    if status:
        update_dict["status"] = status
        if status == "completed":
            update_dict["completed_at"] = now
            update_dict["completed_by"] = current_user.get("name", "")
    if body.get("owner"):
        update_dict["owner"] = body["owner"]

    existing = await db.pod_actions.find_one({"id": action_id, "athlete_id": athlete_id})
    if not existing:
        raise HTTPException(404, "Action not found")

    await db.pod_actions.update_one({"id": action_id}, {"$set": update_dict})

    action_title = existing.get("title", "")
    school_name = existing.get("school_name", "")
    event_desc = f"[{school_name}] "
    if status == "completed":
        event_desc += f'Completed: "{action_title}"'
    elif body.get("owner"):
        event_desc += f'Reassigned "{action_title}" to {body["owner"]}'
    else:
        event_desc += f'Updated "{action_title}"'

    await db.pod_action_events.insert_one({
        "id": str(uuid.uuid4()),
        "athlete_id": athlete_id,
        "program_id": program_id,
        "type": "action_completed" if status == "completed" else "action_updated",
        "description": event_desc,
        "actor": current_user["name"],
        "action_id": action_id,
        "created_at": now,
    })

    return {"updated": True, "action_id": action_id}



# ─── Playbook progress persistence ───────────────────────────
@router.get("/support-pods/{athlete_id}/school/{program_id}/playbook-progress")
async def get_playbook_progress(athlete_id: str, program_id: str, current_user: dict = get_current_user_dep()):
    """Get the saved playbook step completion state."""
    if not can_access_athlete(current_user, athlete_id):
        raise HTTPException(status_code=403, detail="Access denied")
    doc = await db.playbook_progress.find_one(
        {"athlete_id": athlete_id, "program_id": program_id}, {"_id": 0}
    )
    return {"checked_steps": doc.get("checked_steps", []) if doc else []}


@router.patch("/support-pods/{athlete_id}/school/{program_id}/playbook-progress")
async def save_playbook_progress(athlete_id: str, program_id: str, body: dict, current_user: dict = get_current_user_dep()):
    """Save playbook step completion state (upsert)."""
    if not can_access_athlete(current_user, athlete_id):
        raise HTTPException(status_code=403, detail="Access denied")
    checked = body.get("checked_steps", [])
    await db.playbook_progress.update_one(
        {"athlete_id": athlete_id, "program_id": program_id},
        {"$set": {
            "athlete_id": athlete_id,
            "program_id": program_id,
            "checked_steps": checked,
            "updated_by": current_user.get("name", ""),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return {"saved": True, "checked_steps": checked}


# ─── GET: Athlete's own assigned actions (athlete-facing, "me" routes first) ───
@router.get("/athletes/me/assigned-actions")
async def get_my_assigned_actions(current_user: dict = get_current_user_dep()):
    """Get all actions assigned to the current athlete by coaches."""
    athlete_id = current_user.get("athlete_id", current_user.get("id", ""))
    actions = await db.pod_actions.find(
        {
            "athlete_id": athlete_id,
            "assigned_to_athlete": True,
            "status": {"$in": ["ready", "open"]},
        },
        {"_id": 0},
    ).sort("created_at", -1).to_list(50)
    return {"actions": actions}


@router.patch("/athletes/me/assigned-actions/{action_id}/complete")
async def complete_my_assigned_action(action_id: str, current_user: dict = get_current_user_dep()):
    """Athlete marks a coach-assigned action as completed."""
    athlete_id = current_user.get("athlete_id", current_user.get("id", ""))
    now = datetime.now(timezone.utc).isoformat()
    result = await db.pod_actions.update_one(
        {"id": action_id, "athlete_id": athlete_id, "assigned_to_athlete": True},
        {"$set": {"status": "completed", "completed_at": now, "completed_by": "athlete"}},
    )
    if result.modified_count == 0:
        raise HTTPException(404, "Action not found")
    return {"status": "completed", "completed_at": now}



@router.get("/athletes/me/school/{program_id}/assigned-actions")
async def get_my_school_assigned_actions(program_id: str, current_user: dict = get_current_user_dep()):
    """Get assigned actions for the current athlete for a specific school."""
    athlete_id = current_user.get("athlete_id", current_user.get("id", ""))
    actions = await db.pod_actions.find(
        {
            "athlete_id": athlete_id,
            "program_id": program_id,
            "assigned_to_athlete": True,
            "status": {"$in": ["ready", "open"]},
        },
        {"_id": 0},
    ).sort("created_at", -1).to_list(20)
    return {"actions": actions}


# ─── GET: Athlete's assigned actions (coach-facing, parameterized) ─────────
@router.get("/athletes/{athlete_id}/assigned-actions")
async def get_athlete_assigned_actions(athlete_id: str, current_user: dict = get_current_user_dep()):
    """Get all actions assigned to athlete by coaches, across all schools."""
    actions = await db.pod_actions.find(
        {
            "athlete_id": athlete_id,
            "assigned_to_athlete": True,
            "status": {"$in": ["ready", "open"]},
        },
        {"_id": 0},
    ).sort("created_at", -1).to_list(50)
    return {"actions": actions}


@router.get("/athletes/{athlete_id}/school/{program_id}/assigned-actions")
async def get_athlete_school_assigned_actions(athlete_id: str, program_id: str, current_user: dict = get_current_user_dep()):
    """Get assigned actions for a specific school."""
    actions = await db.pod_actions.find(
        {
            "athlete_id": athlete_id,
            "program_id": program_id,
            "assigned_to_athlete": True,
            "status": {"$in": ["ready", "open"]},
        },
        {"_id": 0},
    ).sort("created_at", -1).to_list(20)
    return {"actions": actions}

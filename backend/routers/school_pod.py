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
    "needs_attention": 1,
    "awaiting_reply": 2,
    "active": 3,
    "strong_momentum": 4,
    "still_early": 5,
}

HEALTH_DISPLAY = {
    "at_risk": {"label": "At Risk", "color": "#ef4444", "bg": "rgba(239,68,68,0.08)"},
    "needs_attention": {"label": "Needs Attention", "color": "#f59e0b", "bg": "rgba(245,158,11,0.08)"},
    "awaiting_reply": {"label": "Awaiting Reply", "color": "#3b82f6", "bg": "rgba(59,130,246,0.08)"},
    "active": {"label": "Active", "color": "#0d9488", "bg": "rgba(13,148,136,0.08)"},
    "strong_momentum": {"label": "Strong", "color": "#10b981", "bg": "rgba(16,185,129,0.08)"},
    "still_early": {"label": "Early Stage", "color": "#64748b", "bg": "rgba(100,116,139,0.08)"},
}


def classify_school_health(program, metrics):
    """Derive a health state from program + metrics data."""
    if not metrics:
        return "still_early"

    health = metrics.get("pipeline_health_state", "still_early")
    overdue = metrics.get("overdue_followups", 0)
    freshness = metrics.get("engagement_freshness_label", "")
    trend = metrics.get("engagement_trend", "")

    # Override: overdue follow-ups → needs_attention or at_risk
    if overdue > 0 and freshness in ("no_recent_engagement", "needs_follow_up"):
        return "at_risk"
    if overdue > 0:
        return "needs_attention"

    # Override: stale + no reply
    reply = program.get("reply_status", "")
    if reply in ("No Reply", "Awaiting Reply") and freshness == "no_recent_engagement":
        stage = program.get("recruiting_status", "")
        if stage in ("Contacted", "In Conversation"):
            return "needs_attention"

    return health


def compute_school_signals(program, metrics):
    """Generate school-specific signals from program_metrics."""
    signals = []
    if not metrics:
        return signals

    overdue = metrics.get("overdue_followups", 0)
    freshness = metrics.get("engagement_freshness_label", "")
    reply_rate = metrics.get("reply_rate")
    stalled = metrics.get("stage_stalled_days") or 0
    trend = metrics.get("engagement_trend", "")
    days_since = metrics.get("days_since_last_engagement") or 0

    if overdue > 0:
        signals.append({
            "id": "sig_overdue",
            "type": "alert",
            "priority": "critical",
            "title": f"{overdue} Overdue Follow-up{'s' if overdue > 1 else ''}",
            "description": f"Follow-up actions are overdue. Last engagement was {days_since} day{'s' if days_since != 1 else ''} ago.",
            "recommendation": "Send a follow-up message or log a recent interaction.",
        })

    reply = program.get("reply_status", "")
    if reply in ("No Reply", "Awaiting Reply") and program.get("recruiting_status") in ("Contacted", "In Conversation"):
        signals.append({
            "id": "sig_no_reply",
            "type": "warning",
            "priority": "high",
            "title": "No Response from School",
            "description": f"Status: {reply}. Initial contact was sent {program.get('initial_contact_sent', 'unknown')}.",
            "recommendation": "Consider a different outreach approach or escalate to director.",
        })

    if freshness == "no_recent_engagement" and days_since > 7:
        signals.append({
            "id": "sig_stale",
            "type": "warning",
            "priority": "high",
            "title": "Engagement Gone Stale",
            "description": f"No engagement in {days_since} days. Trend: {trend}.",
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

    # Build school list
    schools = []
    for p in programs:
        pid = p["program_id"]
        m = metrics_map.get(pid, {})
        health = classify_school_health(p, m)
        health_display = HEALTH_DISPLAY.get(health, HEALTH_DISPLAY["still_early"])

        schools.append({
            "program_id": pid,
            "university_name": p.get("university_name", ""),
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
            "days_since_last_engagement": m.get("days_since_last_engagement"),
            "reply_rate": m.get("reply_rate"),
            "overdue_followups": m.get("overdue_followups", 0),
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

    # Health and signals
    health = classify_school_health(program, metrics)
    health_display = HEALTH_DISPLAY.get(health, HEALTH_DISPLAY["still_early"])
    signals = compute_school_signals(program, metrics)

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
        "signals": signals,
        "current_issue": current_issue,
        "actions": actions,
        "playbook": playbook,
        "notes": notes,
        "timeline_events": events,
        "stage_history": stage_history,
        "school_info": school_info_dict,
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

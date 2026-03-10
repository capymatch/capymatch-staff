"""Athlete Tasks — auto-generated action items from pipeline + profile state.

Generates smart tasks based on:
- Overdue follow-ups
- Due-today / due-soon follow-ups
- Schools needing first outreach
- Profile completion (missing measurables)
"""

from fastapi import APIRouter
from datetime import datetime, timezone, timedelta

from auth_middleware import get_current_user_dep
from db_client import db

router = APIRouter()

MEASURABLE_FIELDS = ["height", "approach_touch", "block_touch", "gpa"]


def _days_until(date_str: str) -> int:
    """Return days from today to the given YYYY-MM-DD date string."""
    today = datetime.now(timezone.utc).date()
    try:
        target = datetime.strptime(date_str, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return 999
    return (target - today).days


async def _get_tenant(current_user: dict) -> str:
    from routers.athlete_dashboard import get_athlete_tenant
    return await get_athlete_tenant(current_user)


@router.get("/athlete/tasks")
async def get_tasks(current_user: dict = get_current_user_dep()):
    tenant_id = await _get_tenant(current_user)

    # Fetch programs + athlete profile in parallel
    import asyncio
    programs_f = db.programs.find(
        {"tenant_id": tenant_id, "is_active": {"$ne": False}},
        {"_id": 0}
    ).to_list(200)
    athlete_f = db.athletes.find_one(
        {"user_id": current_user["id"]},
        {"_id": 0}
    )
    programs, athlete = await asyncio.gather(programs_f, athlete_f)

    tasks = []

    # ── 1. Overdue follow-ups (past due) ──
    for p in programs:
        due = p.get("next_action_due", "")
        if not due:
            continue
        days = _days_until(due)
        if days < 0:
            tasks.append({
                "task_id": f"followup-{p['program_id']}",
                "type": "follow_up_overdue",
                "priority": "high",
                "title": f"Follow up with {p.get('university_name', 'Unknown')}",
                "description": f"Your follow-up is {abs(days)} day{'s' if abs(days) != 1 else ''} overdue.",
                "school": p.get("university_name", ""),
                "program_id": p["program_id"],
                "due_date": due,
                "days_diff": days,
                "link": f"/pipeline/{p['program_id']}",
            })

    # ── 2. Due today ──
    for p in programs:
        due = p.get("next_action_due", "")
        if not due:
            continue
        days = _days_until(due)
        if days == 0:
            tasks.append({
                "task_id": f"duetoday-{p['program_id']}",
                "type": "follow_up_today",
                "priority": "high",
                "title": f"Follow up with {p.get('university_name', 'Unknown')}",
                "description": "Follow-up is due today.",
                "school": p.get("university_name", ""),
                "program_id": p["program_id"],
                "due_date": due,
                "days_diff": 0,
                "link": f"/pipeline/{p['program_id']}",
            })

    # ── 3. Due soon (1-3 days) ──
    for p in programs:
        due = p.get("next_action_due", "")
        if not due:
            continue
        days = _days_until(due)
        if 1 <= days <= 3:
            tasks.append({
                "task_id": f"duesoon-{p['program_id']}",
                "type": "follow_up_soon",
                "priority": "medium",
                "title": f"Follow up with {p.get('university_name', 'Unknown')}",
                "description": f"Follow-up due in {days} day{'s' if days != 1 else ''}.",
                "school": p.get("university_name", ""),
                "program_id": p["program_id"],
                "due_date": due,
                "days_diff": days,
                "link": f"/pipeline/{p['program_id']}",
            })

    # ── 4. Needs first outreach ──
    # Fetch interaction counts per program
    program_ids = [p["program_id"] for p in programs]
    interaction_counts = {}
    if program_ids:
        pipeline = [
            {"$match": {"tenant_id": tenant_id, "program_id": {"$in": program_ids}}},
            {"$group": {"_id": "$program_id", "count": {"$sum": 1}}},
        ]
        agg = await db.interactions.aggregate(pipeline).to_list(500)
        interaction_counts = {r["_id"]: r["count"] for r in agg}

    for p in programs:
        pid = p["program_id"]
        if interaction_counts.get(pid, 0) == 0:
            rs = (p.get("recruiting_status") or "").lower()
            js = (p.get("journey_stage") or "").lower()
            if rs not in ("committed",) and js not in ("committed",):
                tasks.append({
                    "task_id": f"outreach-{pid}",
                    "type": "first_outreach",
                    "priority": "medium",
                    "title": f"Send first outreach to {p.get('university_name', 'Unknown')}",
                    "description": "You haven't contacted this school yet. Send an introductory email.",
                    "school": p.get("university_name", ""),
                    "program_id": pid,
                    "due_date": None,
                    "days_diff": None,
                    "link": f"/pipeline/{pid}",
                })

    # ── 5. Profile completion ──
    if athlete:
        missing = []
        for field in MEASURABLE_FIELDS:
            val = athlete.get(field)
            if not val or str(val).strip() == "":
                missing.append(field)
        if missing:
            labels = {"height": "Height", "approach_touch": "Approach Touch", "block_touch": "Block Touch", "gpa": "GPA"}
            missing_labels = [labels.get(f, f) for f in missing]
            tasks.append({
                "task_id": "profile-measurables",
                "type": "profile_completion",
                "priority": "low",
                "title": "Complete your athlete profile",
                "description": f"Missing: {', '.join(missing_labels)}. Filling these improves match accuracy.",
                "school": None,
                "program_id": None,
                "due_date": None,
                "days_diff": None,
                "link": "/profile",
            })

    # Sort: high priority first, then medium, then low
    priority_order = {"high": 0, "medium": 1, "low": 2}
    tasks.sort(key=lambda t: (priority_order.get(t["priority"], 9), t.get("days_diff") or 999))

    return {"tasks": tasks, "total": len(tasks)}

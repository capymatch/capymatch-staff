"""Athlete Tasks — upcoming follow-ups due in the next 1-3 days.

Only returns tasks that are due soon (not overdue, not today, not outreach).
Those urgent items appear on the hero card instead.
"""

from fastapi import APIRouter
from datetime import datetime, timezone

from auth_middleware import get_current_user_dep
from db_client import db

router = APIRouter()


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

    programs = await db.programs.find(
        {"tenant_id": tenant_id, "is_active": {"$ne": False}},
        {"_id": 0}
    ).to_list(200)

    tasks = []

    # System-generated tasks (follow-ups due in 1-3 days)
    for p in programs:
        due = p.get("next_action_due", "")
        if not due:
            continue
        days = _days_until(due)
        if 1 <= days <= 3:
            tasks.append({
                "task_id": f"duesoon-{p['program_id']}",
                "type": "follow_up_soon",
                "source": "system",
                "priority": "medium",
                "title": f"Follow up with {p.get('university_name', 'Unknown')}",
                "description": f"Follow-up due in {days} day{'s' if days != 1 else ''}.",
                "school": p.get("university_name", ""),
                "program_id": p["program_id"],
                "due_date": due,
                "days_diff": days,
                "link": f"/pipeline/{p['program_id']}",
            })

    # Coach-flagged tasks (active flags)
    flags = await db.coach_flags.find(
        {"tenant_id": tenant_id, "status": "active"},
        {"_id": 0},
    ).sort("created_at", -1).to_list(50)

    for f in flags:
        # Skip flags without flag_id
        flag_id = f.get("flag_id")
        if not flag_id:
            continue
            
        due_label = ""
        days_diff = 999
        if f.get("due_date"):
            days_diff = _days_until(f["due_date"])
            if days_diff == 0:
                due_label = "Due today"
            elif days_diff > 0:
                due_label = f"Due in {days_diff}d"
            else:
                due_label = f"Overdue by {abs(days_diff)}d"
        elif f.get("due") == "today":
            due_label = "Due today"
            days_diff = 0
        elif f.get("due") == "this_week":
            due_label = "Due this week"
            days_diff = 3

        desc = f.get("reason_label", "")
        if f.get("note"):
            desc += f" — {f['note']}"

        tasks.append({
            "task_id": flag_id,
            "type": "coach_flag",
            "source": "coach",
            "priority": "high",
            "title": f"{f.get('university_name', 'Unknown')}",
            "description": desc,
            "school": f.get("university_name", ""),
            "program_id": f.get("program_id", ""),
            "due_date": f.get("due_date", ""),
            "due_label": due_label,
            "days_diff": days_diff,
            "link": f"/pipeline/{f.get('program_id', '')}",
            "flagged_by_name": f.get("flagged_by_name", "Coach"),
            "flag_id": flag_id,
        })

    tasks.sort(key=lambda t: (0 if t.get("source") == "coach" else 1, t.get("days_diff") or 999))

    return {"tasks": tasks, "total": len(tasks)}

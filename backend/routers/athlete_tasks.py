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

    tasks.sort(key=lambda t: t.get("days_diff") or 999)

    return {"tasks": tasks, "total": len(tasks)}

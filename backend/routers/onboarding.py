"""Onboarding — lightweight coach checklist for first-time activation."""

from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone

from db_client import db
from auth_middleware import get_current_user_dep
from services.ownership import get_visible_athlete_ids

router = APIRouter()

STEPS = [
    {
        "key": "mission_control",
        "label": "Explore Mission Control",
        "description": "Get oriented with your daily priorities and alerts",
        "route": "/mission-control",
    },
    {
        "key": "meet_roster",
        "label": "Meet your roster",
        "description": "Open an athlete profile to learn about who you're coaching",
        "route": "/mission-control",
    },
    {
        "key": "support_pod",
        "label": "Open your first Support Pod",
        "description": "See the full support picture for one of your athletes",
        "route": None,  # dynamic — depends on athlete
    },
    {
        "key": "events",
        "label": "Check upcoming events",
        "description": "Review what's coming up on the recruiting calendar",
        "route": "/events",
    },
    {
        "key": "log_activity",
        "label": "Log a note or complete an action",
        "description": "Record your first observation or finish a pending task",
        "route": None,
    },
]


def _build_steps(completed: list, has_athletes: bool, first_athlete_id: str | None):
    """Build the step list with completion status and personalization."""
    result = []
    for s in STEPS:
        step = {**s, "completed": s["key"] in completed}

        if s["key"] == "meet_roster" and not has_athletes:
            step["label"] = "Awaiting athlete assignments"
            step["description"] = "Your director will assign athletes to you soon"
            step["disabled"] = True

        if s["key"] == "support_pod" and first_athlete_id:
            step["route"] = f"/support-pods/{first_athlete_id}"

        result.append(step)
    return result


@router.get("/onboarding/status")
async def get_onboarding_status(current_user: dict = get_current_user_dep()):
    """Return the onboarding checklist state for the current coach."""
    if current_user["role"] != "coach":
        return {"show_checklist": False}

    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    onboarding = user.get("onboarding", {})
    completed_steps = onboarding.get("completed_steps", [])

    # If fully dismissed or completed, don't show
    if onboarding.get("dismissed") or onboarding.get("completed_at"):
        return {"show_checklist": False, "completed_steps": completed_steps}

    # Auto-detect log_activity: check for notes or completed actions by this coach
    if "log_activity" not in completed_steps:
        has_note = await db.athlete_notes.find_one(
            {"created_by": current_user["id"]}, {"_id": 0, "id": 1}
        )
        has_action = await db.actions.find_one(
            {"$or": [
                {"created_by": current_user["id"]},
                {"completed_by": current_user["id"]},
            ]},
            {"_id": 0, "id": 1},
        )
        has_event_note = await db.event_notes.find_one(
            {"created_by": current_user["id"]}, {"_id": 0, "id": 1}
        )
        if has_note or has_action or has_event_note:
            completed_steps.append("log_activity")
            await db.users.update_one(
                {"id": current_user["id"]},
                {"$addToSet": {"onboarding.completed_steps": "log_activity"}},
            )

    # Check athlete assignment
    visible_ids = get_visible_athlete_ids(current_user)
    has_athletes = len(visible_ids) > 0
    first_athlete_id = next(iter(visible_ids), None) if visible_ids else None

    steps = _build_steps(completed_steps, has_athletes, first_athlete_id)
    total = len([s for s in steps if not s.get("disabled")])
    done = len([s for s in steps if s["completed"] and not s.get("disabled")])

    return {
        "show_checklist": True,
        "steps": steps,
        "completed_count": done,
        "total_count": total,
        "all_done": done >= total,
        "started_at": onboarding.get("started_at"),
    }


@router.post("/onboarding/complete-step")
async def complete_step(body: dict, current_user: dict = get_current_user_dep()):
    """Mark an onboarding step as complete."""
    if current_user["role"] != "coach":
        raise HTTPException(status_code=403, detail="Coach only")

    step_key = body.get("step")
    valid_keys = {s["key"] for s in STEPS}
    if step_key not in valid_keys:
        raise HTTPException(status_code=400, detail=f"Invalid step: {step_key}")

    now = datetime.now(timezone.utc).isoformat()

    # Initialize onboarding if not exists, add step
    await db.users.update_one(
        {"id": current_user["id"]},
        {
            "$addToSet": {"onboarding.completed_steps": step_key},
            "$setOnInsert": {"onboarding.started_at": now},
        },
    )

    # Set started_at if this is the first step
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "onboarding": 1})
    onboarding = user.get("onboarding", {})
    if not onboarding.get("started_at"):
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$set": {"onboarding.started_at": now}},
        )

    # Check if all steps are now complete
    completed = onboarding.get("completed_steps", [])
    if step_key not in completed:
        completed.append(step_key)

    if len(completed) >= len(STEPS):
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$set": {"onboarding.completed_at": now}},
        )

    return {"status": "ok", "step": step_key}


@router.post("/onboarding/dismiss")
async def dismiss_onboarding(current_user: dict = get_current_user_dep()):
    """Dismiss the onboarding checklist (can be re-shown if needed)."""
    if current_user["role"] != "coach":
        raise HTTPException(status_code=403, detail="Coach only")

    now = datetime.now(timezone.utc).isoformat()
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"onboarding.dismissed": True, "onboarding.dismissed_at": now}},
    )

    return {"status": "dismissed"}

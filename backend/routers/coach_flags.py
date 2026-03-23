"""Coach → Athlete flag-for-follow-up.

Coaches flag specific schools in an athlete's pipeline with a preset reason,
optional note, and optional due timing. Creates a task, timeline entry, and
notification for the athlete. Directors cannot flag directly in V1.
"""

import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from db_client import db
from auth_middleware import get_current_user_dep
from services.athlete_store import get_by_id as get_athlete_by_id
from services.notifications import create_notification

router = APIRouter()
log = logging.getLogger(__name__)

PRESET_REASONS = {
    "reply_needed": "Reply needed",
    "followup_overdue": "Follow-up overdue",
    "strong_interest": "Strong interest worth pursuing",
    "review_school": "Review this school",
}

DUE_OPTIONS = {
    "today": 0,
    "this_week": 7,
    "none": None,
}


class FlagRequest(BaseModel):
    program_id: str
    reason: str               # One of PRESET_REASONS keys
    note: Optional[str] = ""  # Optional short note
    due: str = "none"         # today | this_week | none


class FlagDismissRequest(BaseModel):
    resolution_note: Optional[str] = ""


def _compute_due_date(due: str) -> Optional[str]:
    days = DUE_OPTIONS.get(due)
    if days is None:
        return None
    return (datetime.now(timezone.utc) + timedelta(days=days)).strftime("%Y-%m-%d")


@router.post("/roster/athlete/{athlete_id}/flag-followup")
async def flag_for_followup(
    athlete_id: str,
    data: FlagRequest,
    current_user: dict = get_current_user_dep(),
):
    """Coach flags a school in an athlete's pipeline for follow-up."""

    # V1: coach-only
    if current_user["role"] != "club_coach":
        raise HTTPException(403, "Only coaches can flag follow-ups in V1.")

    # Verify athlete exists
    athlete = await get_athlete_by_id(athlete_id)
    if not athlete:
        raise HTTPException(404, "Athlete not found")

    # Enforce assignment-aware access
    if athlete.get("primary_coach_id") != current_user["id"]:
        raise HTTPException(403, "You can only flag follow-ups for your assigned athletes.")

    tenant_id = athlete.get("tenant_id")
    athlete_user_id = athlete.get("user_id")

    # Validate reason
    if data.reason not in PRESET_REASONS:
        raise HTTPException(400, f"Invalid reason. Use: {', '.join(PRESET_REASONS.keys())}")

    # Validate due
    if data.due not in DUE_OPTIONS:
        raise HTTPException(400, f"Invalid due. Use: {', '.join(DUE_OPTIONS.keys())}")

    # Get program info
    program = None
    if tenant_id:
        program = await db.programs.find_one(
            {"tenant_id": tenant_id, "program_id": data.program_id},
            {"_id": 0, "university_name": 1, "program_id": 1},
        )
    university_name = program.get("university_name", "Unknown") if program else "Unknown"

    now = datetime.now(timezone.utc).isoformat()
    flag_id = f"flag_{uuid.uuid4().hex[:12]}"
    due_date = _compute_due_date(data.due)
    reason_label = PRESET_REASONS[data.reason]
    coach_name = current_user.get("name", "Coach")

    # 1. Create coach_flags document
    flag_doc = {
        "flag_id": flag_id,
        "athlete_id": athlete_id,
        "tenant_id": tenant_id,
        "program_id": data.program_id,
        "university_name": university_name,
        "reason": data.reason,
        "reason_label": reason_label,
        "note": (data.note or "").strip()[:300],
        "due": data.due,
        "due_date": due_date,
        "owner": "athlete",
        "status": "active",
        "flagged_by": current_user["id"],
        "flagged_by_name": coach_name,
        "created_at": now,
        "completed_at": None,
    }
    await db.coach_flags.insert_one(flag_doc)
    flag_doc.pop("_id", None)

    # 2. Create interactions/timeline entry
    interaction_doc = {
        "interaction_id": f"ix_{uuid.uuid4().hex[:12]}",
        "tenant_id": tenant_id,
        "program_id": data.program_id,
        "university_name": university_name,
        "type": "Coach Directive",
        "notes": f"{reason_label}" + (f" — {data.note.strip()}" if data.note and data.note.strip() else ""),
        "outcome": "Flagged",
        "source": "coach_flag",
        "created_by": current_user["id"],
        "created_by_name": coach_name,
        "created_at": now,
        "date_time": now,
    }
    await db.interactions.insert_one(interaction_doc)

    # 3. Create notification for the athlete
    if athlete_user_id and tenant_id:
        due_text = ""
        if data.due == "today":
            due_text = " (due today)"
        elif data.due == "this_week":
            due_text = " (due this week)"

        await create_notification(
            tenant_id,
            athlete_user_id,
            "coach_flag",
            f"Coach flagged {university_name}",
            f"{reason_label}{due_text}",
            f"/pipeline/{data.program_id}",
        )

    log.info(f"Coach {coach_name} flagged {university_name} for {athlete_id}: {reason_label}")

    return {
        "flag_id": flag_id,
        "message": f"Flagged {university_name} for follow-up",
        "university_name": university_name,
        "reason_label": reason_label,
    }


@router.get("/athlete/flags")
async def get_athlete_flags(current_user: dict = get_current_user_dep()):
    """Athlete fetches their active coach flags."""
    from routers.athlete_dashboard import get_athlete_tenant
    tenant_id = await get_athlete_tenant(current_user)

    flags = await db.coach_flags.find(
        {"tenant_id": tenant_id, "status": "active"},
        {"_id": 0},
    ).sort("created_at", -1).to_list(50)

    return {"flags": flags, "total": len(flags)}


@router.post("/athlete/flags/{flag_id}/complete")
async def complete_flag(
    flag_id: str,
    body: FlagDismissRequest,
    current_user: dict = get_current_user_dep(),
):
    """Athlete marks a coach flag as handled/complete."""
    from routers.athlete_dashboard import get_athlete_tenant
    tenant_id = await get_athlete_tenant(current_user)

    flag = await db.coach_flags.find_one(
        {"flag_id": flag_id, "tenant_id": tenant_id},
        {"_id": 0},
    )
    if not flag:
        raise HTTPException(404, "Flag not found")
    if flag["status"] != "active":
        raise HTTPException(400, "Flag is already completed")

    now = datetime.now(timezone.utc).isoformat()

    await db.coach_flags.update_one(
        {"flag_id": flag_id},
        {"$set": {"status": "completed", "completed_at": now}},
    )

    # Timeline entry for completion
    await db.interactions.insert_one({
        "interaction_id": f"ix_{uuid.uuid4().hex[:12]}",
        "tenant_id": tenant_id,
        "program_id": flag.get("program_id"),
        "university_name": flag.get("university_name", ""),
        "type": "Flag Completed",
        "notes": f"Handled: {flag.get('reason_label', '')}" + (f" — {body.resolution_note.strip()}" if body.resolution_note and body.resolution_note.strip() else ""),
        "outcome": "Completed",
        "source": "athlete_action",
        "created_by": current_user["id"],
        "created_by_name": current_user.get("name", "Athlete"),
        "created_at": now,
        "date_time": now,
    })

    # Notify the coach who flagged it
    coach_id = flag.get("flagged_by")
    if coach_id and tenant_id:
        athlete_name = current_user.get("name", "Athlete")
        await create_notification(
            tenant_id,
            coach_id,
            "flag_completed",
            f"{athlete_name} handled your flag",
            f"{flag.get('university_name', '')}: {flag.get('reason_label', '')}",
            "",
        )

    from services.athlete_store import recompute_derived_data
    await recompute_derived_data()

    return {"message": "Flag marked as complete", "flag_id": flag_id}

"""Roster — athlete assignment, reassignment, and roster views (director-only)."""

import logging
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
import uuid

from db_client import db
from auth_middleware import get_current_user_dep
from models import ReassignRequest, UnassignRequest
from services.ownership import (
    refresh_ownership_cache,
    get_coach_athlete_map,
    get_unassigned_athlete_ids,
)
from mock_data import ATHLETES

log = logging.getLogger(__name__)
router = APIRouter()


def _require_director(user: dict):
    if user["role"] != "director":
        raise HTTPException(status_code=403, detail="Only directors can manage roster assignments")


def _athlete_by_id(athlete_id: str) -> dict | None:
    return next((a for a in ATHLETES if a["id"] == athlete_id), None)


async def _get_open_actions_warning(athlete_id: str, from_coach_id: str) -> list:
    """Check for open work items still owned by the previous coach."""
    warnings = []

    # Open recommendations created by the previous coach for this athlete
    open_recs = await db.recommendations.find(
        {"athlete_id": athlete_id, "created_by": from_coach_id, "status": {"$nin": ["closed"]}},
        {"_id": 0, "id": 1, "school_name": 1, "status": 1},
    ).to_list(50)
    for r in open_recs:
        warnings.append({
            "type": "recommendation",
            "id": r["id"],
            "description": f"Open recommendation to {r.get('school_name', 'unknown')} (status: {r.get('status', 'draft')})",
        })

    # Open support pod actions for this athlete owned by previous coach
    open_actions = await db.actions.find(
        {"athlete_id": athlete_id, "owner": from_coach_id, "status": {"$nin": ["completed", "dismissed"]}},
        {"_id": 0, "id": 1, "title": 1, "status": 1},
    ).to_list(50)
    for a in open_actions:
        warnings.append({
            "type": "action",
            "id": a["id"],
            "description": f"Open action: {a.get('title', 'untitled')} (status: {a.get('status', 'open')})",
        })

    return warnings


@router.get("/roster")
async def get_roster(current_user: dict = get_current_user_dep()):
    """Director view: all athletes grouped by coach, with unassigned section."""
    _require_director(current_user)

    # Get all coaches
    coaches = await db.users.find(
        {"role": "coach"}, {"_id": 0, "id": 1, "name": 1, "email": 1, "team": 1}
    ).to_list(100)

    # Build roster groups
    athlete_map = get_coach_athlete_map()
    unassigned_ids = get_unassigned_athlete_ids()

    groups = []

    # Unassigned group first
    if unassigned_ids:
        unassigned_athletes = []
        for a in ATHLETES:
            if a["id"] in unassigned_ids:
                unassigned_athletes.append({
                    "id": a["id"],
                    "name": a.get("fullName", a.get("name", "Unknown")),
                    "grad_year": a.get("gradYear"),
                    "position": a.get("position"),
                    "team": a.get("team"),
                    "unassigned_reason": a.get("unassigned_reason", "imported_without_owner"),
                })
        groups.append({
            "coach_id": None,
            "coach_name": "Unassigned",
            "coach_email": None,
            "coach_team": None,
            "athletes": unassigned_athletes,
            "count": len(unassigned_athletes),
        })

    # Coach groups
    for coach in coaches:
        cid = coach["id"]
        assigned_ids = athlete_map.get(cid, set())
        coach_athletes = []
        for a in ATHLETES:
            if a["id"] in assigned_ids:
                coach_athletes.append({
                    "id": a["id"],
                    "name": a.get("fullName", a.get("name", "Unknown")),
                    "grad_year": a.get("gradYear"),
                    "position": a.get("position"),
                    "team": a.get("team"),
                })
        groups.append({
            "coach_id": cid,
            "coach_name": coach["name"],
            "coach_email": coach["email"],
            "coach_team": coach.get("team"),
            "athletes": coach_athletes,
            "count": len(coach_athletes),
        })

    # Summary stats
    total = len(ATHLETES)
    assigned = total - len(unassigned_ids)

    return {
        "groups": groups,
        "summary": {
            "total_athletes": total,
            "assigned": assigned,
            "unassigned": len(unassigned_ids),
            "coach_count": len(coaches),
        },
    }


@router.get("/roster/coaches")
async def list_coaches(current_user: dict = get_current_user_dep()):
    """List all coaches (for reassignment dropdowns)."""
    _require_director(current_user)
    coaches = await db.users.find(
        {"role": "coach"}, {"_id": 0, "id": 1, "name": 1, "email": 1, "team": 1}
    ).to_list(100)
    return coaches


@router.post("/athletes/{athlete_id}/reassign")
async def reassign_athlete(
    athlete_id: str,
    body: ReassignRequest,
    current_user: dict = get_current_user_dep(),
):
    """Reassign an athlete from one coach to another. Director-only."""
    _require_director(current_user)

    # Validate athlete exists
    athlete = _athlete_by_id(athlete_id)
    if not athlete:
        raise HTTPException(status_code=404, detail="Athlete not found")

    # Validate target coach exists and is a coach
    new_coach = await db.users.find_one(
        {"id": body.new_coach_id, "role": "coach"}, {"_id": 0, "id": 1, "name": 1}
    )
    if not new_coach:
        raise HTTPException(status_code=404, detail="Target coach not found")

    # Get current coach info
    from_coach_id = athlete.get("primary_coach_id")
    from_coach_name = None
    if from_coach_id:
        from_coach = await db.users.find_one({"id": from_coach_id}, {"_id": 0, "name": 1})
        from_coach_name = from_coach["name"] if from_coach else from_coach_id

    if from_coach_id == body.new_coach_id:
        raise HTTPException(status_code=400, detail="Athlete is already assigned to this coach")

    # Check for open work items
    open_warnings = []
    if from_coach_id:
        open_warnings = await _get_open_actions_warning(athlete_id, from_coach_id)

    # Perform reassignment in DB
    await db.athletes.update_one(
        {"id": athlete_id},
        {"$set": {"primary_coach_id": body.new_coach_id, "unassigned_reason": None}}
    )

    # Update in-memory ATHLETES list
    for a in ATHLETES:
        if a["id"] == athlete_id:
            a["primary_coach_id"] = body.new_coach_id
            a.pop("unassigned_reason", None)
            break

    # Write reassignment log (structured for timeline display)
    log_entry = {
        "id": str(uuid.uuid4()),
        "athlete_id": athlete_id,
        "athlete_name": athlete.get("fullName", athlete.get("name", "Unknown")),
        "type": "reassign",
        "from_coach_id": from_coach_id,
        "from_coach_name": from_coach_name,
        "to_coach_id": body.new_coach_id,
        "to_coach_name": new_coach["name"],
        "reassigned_by": current_user["id"],
        "reassigned_by_name": current_user["name"],
        "reason": body.reason,
        "open_actions_at_time": len(open_warnings),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.reassignment_log.insert_one(log_entry)
    log_entry.pop("_id", None)

    # Refresh cache
    await refresh_ownership_cache()

    return {
        "status": "reassigned",
        "athlete_id": athlete_id,
        "athlete_name": athlete.get("fullName", athlete.get("name")),
        "from_coach": from_coach_name,
        "to_coach": new_coach["name"],
        "open_actions_warning": open_warnings,
        "log_entry": log_entry,
    }


@router.post("/athletes/{athlete_id}/unassign")
async def unassign_athlete(
    athlete_id: str,
    body: UnassignRequest,
    current_user: dict = get_current_user_dep(),
):
    """Remove coach assignment from an athlete. Director-only."""
    _require_director(current_user)

    athlete = _athlete_by_id(athlete_id)
    if not athlete:
        raise HTTPException(status_code=404, detail="Athlete not found")

    from_coach_id = athlete.get("primary_coach_id")
    if not from_coach_id:
        raise HTTPException(status_code=400, detail="Athlete is already unassigned")

    from_coach = await db.users.find_one({"id": from_coach_id}, {"_id": 0, "name": 1})
    from_coach_name = from_coach["name"] if from_coach else from_coach_id

    # Check for open work
    open_warnings = await _get_open_actions_warning(athlete_id, from_coach_id)

    # Perform unassignment
    await db.athletes.update_one(
        {"id": athlete_id},
        {"$set": {"primary_coach_id": None, "unassigned_reason": body.reason or "manually_unassigned"}}
    )

    for a in ATHLETES:
        if a["id"] == athlete_id:
            a["primary_coach_id"] = None
            a["unassigned_reason"] = body.reason or "manually_unassigned"
            break

    # Write log
    log_entry = {
        "id": str(uuid.uuid4()),
        "athlete_id": athlete_id,
        "athlete_name": athlete.get("fullName", athlete.get("name", "Unknown")),
        "type": "unassign",
        "from_coach_id": from_coach_id,
        "from_coach_name": from_coach_name,
        "to_coach_id": None,
        "to_coach_name": None,
        "reassigned_by": current_user["id"],
        "reassigned_by_name": current_user["name"],
        "reason": body.reason or "manually_unassigned",
        "open_actions_at_time": len(open_warnings),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.reassignment_log.insert_one(log_entry)
    log_entry.pop("_id", None)

    await refresh_ownership_cache()

    return {
        "status": "unassigned",
        "athlete_id": athlete_id,
        "athlete_name": athlete.get("fullName", athlete.get("name")),
        "from_coach": from_coach_name,
        "open_actions_warning": open_warnings,
        "log_entry": log_entry,
    }


@router.get("/athletes/{athlete_id}/reassignment-history")
async def get_reassignment_history(
    athlete_id: str,
    current_user: dict = get_current_user_dep(),
):
    """Get reassignment history for an athlete (for timeline display)."""
    _require_director(current_user)

    entries = await db.reassignment_log.find(
        {"athlete_id": athlete_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)

    return entries

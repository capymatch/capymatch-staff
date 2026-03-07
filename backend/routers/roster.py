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


# ── Coach Activation / Engagement ──────────────────────────────────────────


def _derive_status(coach_data: dict) -> str:
    """Derive a concise activation status label for a coach."""
    invite_status = coach_data.get("invite_status")
    if invite_status == "pending":
        return "pending"

    onboarding = coach_data.get("onboarding_progress", 0)
    total_steps = coach_data.get("onboarding_total", 5)
    has_activity = coach_data.get("has_first_activity", False)
    last_active = coach_data.get("last_active")

    # Needs support: accepted 3+ days ago but zero onboarding or no activity in 14 days
    accepted_at = coach_data.get("accepted_at")
    if accepted_at:
        try:
            accepted_dt = datetime.fromisoformat(accepted_at)
            days_since_accept = (datetime.now(timezone.utc) - accepted_dt).days
        except Exception:
            days_since_accept = 0
    else:
        days_since_accept = 0

    if last_active:
        try:
            last_dt = datetime.fromisoformat(last_active)
            days_inactive = (datetime.now(timezone.utc) - last_dt).days
        except Exception:
            days_inactive = 999
    else:
        days_inactive = 999

    if days_since_accept >= 3 and onboarding == 0:
        return "needs_support"
    if days_inactive >= 14 and invite_status == "accepted":
        return "needs_support"

    # Active: onboarding complete or has recent activity
    if onboarding >= total_steps or (has_activity and days_inactive < 7):
        return "active"

    # Activating: accepted but still working through onboarding
    if invite_status == "accepted":
        return "activating"

    # Seed coaches without invite — check activity
    if has_activity:
        return "active"
    return "activating"


@router.get("/roster/activation")
async def get_coach_activation(current_user: dict = get_current_user_dep()):
    """Director: overview of coach activation and engagement signals."""
    _require_director(current_user)

    # Get all coaches
    coaches = await db.users.find(
        {"role": "coach"},
        {"_id": 0, "id": 1, "name": 1, "email": 1, "team": 1,
         "created_at": 1, "onboarding": 1, "last_active": 1},
    ).to_list(100)

    # Get all invites for cross-referencing
    invites = await db.invites.find(
        {}, {"_id": 0, "email": 1, "status": 1, "accepted_at": 1,
             "accepted_user_id": 1, "team": 1}
    ).to_list(200)
    invite_by_email = {}
    for inv in invites:
        # Keep the most relevant invite per email (accepted > pending > others)
        existing = invite_by_email.get(inv["email"])
        if not existing or inv["status"] == "accepted" or (
            inv["status"] == "pending" and existing.get("status") not in ("accepted",)
        ):
            invite_by_email[inv["email"]] = inv

    # Athlete counts per coach
    athlete_map = get_coach_athlete_map()

    # Check for first activity per coach (notes, actions, event_notes)
    result = []
    for coach in coaches:
        cid = coach["id"]
        onboarding = coach.get("onboarding") or {}
        completed_steps = onboarding.get("completed_steps", [])

        # Cross-ref invite
        invite = invite_by_email.get(coach["email"])
        invite_status = invite["status"] if invite else None
        accepted_at = invite.get("accepted_at") if invite else None

        # First activity detection
        first_note = await db.notes.find_one(
            {"created_by": cid}, {"_id": 0, "created_at": 1}
        )
        first_action = await db.actions.find_one(
            {"$or": [{"created_by": cid}, {"completed_by": cid}]},
            {"_id": 0, "created_at": 1},
        )
        first_event_note = await db.event_notes.find_one(
            {"created_by": cid}, {"_id": 0, "created_at": 1}
        )

        # Earliest activity timestamp
        activity_dates = []
        for item in [first_note, first_action, first_event_note]:
            if item and item.get("created_at"):
                activity_dates.append(item["created_at"])
        first_activity_at = min(activity_dates) if activity_dates else None
        has_first_activity = len(activity_dates) > 0

        # Last active = latest of last_active field, onboarding update, or activity
        last_active = coach.get("last_active")
        if not last_active and activity_dates:
            last_active = max(activity_dates)

        athlete_count = len(athlete_map.get(cid, set()))

        coach_data = {
            "id": cid,
            "name": coach["name"],
            "email": coach["email"],
            "team": coach.get("team"),
            "invite_status": invite_status,
            "accepted_at": accepted_at,
            "created_at": coach.get("created_at"),
            "onboarding_progress": len(completed_steps),
            "onboarding_total": 5,
            "onboarding_dismissed": onboarding.get("dismissed", False),
            "onboarding_completed_at": onboarding.get("completed_at"),
            "athlete_count": athlete_count,
            "has_first_activity": has_first_activity,
            "first_activity_at": first_activity_at,
            "last_active": last_active,
        }

        coach_data["status"] = _derive_status(coach_data)
        result.append(coach_data)

    # Sort: needs_support first, then pending, then activating, then active
    status_order = {"needs_support": 0, "pending": 1, "activating": 2, "active": 3}
    result.sort(key=lambda c: status_order.get(c["status"], 99))

    # Summary counts
    counts = {"pending": 0, "activating": 0, "active": 0, "needs_support": 0}
    for c in result:
        counts[c["status"]] = counts.get(c["status"], 0) + 1

    return {"coaches": result, "summary": counts, "total": len(result)}

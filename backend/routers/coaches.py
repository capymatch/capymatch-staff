"""Coaches — Director-facing coach management CRUD."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional

from db_client import db
from auth_middleware import get_current_user_dep
from services.ownership import refresh_ownership_cache

router = APIRouter()


class CoachUpdate(BaseModel):
    name: Optional[str] = None
    team: Optional[str] = None
    status: Optional[str] = None  # active | inactive


def _safe_coach(doc: dict, athlete_count: int = 0) -> dict:
    return {
        "id": doc["id"],
        "email": doc.get("email", ""),
        "name": doc.get("name", "Unknown"),
        "role": doc.get("role", "club_coach"),
        "team": doc.get("team"),
        "status": doc.get("status", "active"),
        "invited_by": doc.get("invited_by"),
        "created_at": doc.get("created_at"),
        "last_active": doc.get("last_active"),
        "athlete_count": athlete_count,
    }


@router.get("/coaches")
async def list_coaches(current_user: dict = get_current_user_dep()):
    """Director: list all registered coaches with stats."""
    if current_user["role"] != "director":
        raise HTTPException(status_code=403, detail="Only directors can manage coaches")

    coaches = await db.users.find(
        {"role": "club_coach"}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)

    # Count athletes per coach
    athlete_counts = {}
    cursor = db.athletes.aggregate([
        {"$match": {"primary_coach_id": {"$ne": None}}},
        {"$group": {"_id": "$primary_coach_id", "count": {"$sum": 1}}},
    ])
    async for doc in cursor:
        athlete_counts[doc["_id"]] = doc["count"]

    return [_safe_coach(c, athlete_counts.get(c["id"], 0)) for c in coaches]


@router.get("/coaches/{coach_id}")
async def get_coach(coach_id: str, current_user: dict = get_current_user_dep()):
    """Director: get a single coach's details."""
    if current_user["role"] != "director":
        raise HTTPException(status_code=403, detail="Only directors can manage coaches")

    coach = await db.users.find_one(
        {"id": coach_id, "role": "club_coach"}, {"_id": 0}
    )
    if not coach:
        raise HTTPException(status_code=404, detail="Coach not found")

    athlete_count = await db.athletes.count_documents({"primary_coach_id": coach_id})

    # Get assigned athletes for detail view
    athletes = await db.athletes.find(
        {"primary_coach_id": coach_id},
        {"_id": 0, "id": 1, "full_name": 1, "name": 1, "position": 1, "grad_year": 1, "team": 1}
    ).to_list(100)

    result = _safe_coach(coach, athlete_count)
    result["athletes"] = [
        {
            "id": a["id"],
            "name": a.get("full_name", a.get("name", "Unknown")),
            "position": a.get("position"),
            "grad_year": a.get("grad_year"),
            "team": a.get("team"),
        }
        for a in athletes
    ]
    return result


@router.put("/coaches/{coach_id}")
async def update_coach(coach_id: str, body: CoachUpdate, current_user: dict = get_current_user_dep()):
    """Director: update a coach's name, team, or status."""
    if current_user["role"] != "director":
        raise HTTPException(status_code=403, detail="Only directors can manage coaches")

    coach = await db.users.find_one(
        {"id": coach_id, "role": "club_coach"}, {"_id": 0}
    )
    if not coach:
        raise HTTPException(status_code=404, detail="Coach not found")

    updates = {}
    if body.name is not None:
        updates["name"] = body.name
    if body.team is not None:
        updates["team"] = body.team
    if body.status is not None:
        if body.status not in ("active", "inactive"):
            raise HTTPException(status_code=400, detail="Status must be 'active' or 'inactive'")
        updates["status"] = body.status

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.users.update_one({"id": coach_id}, {"$set": updates})

    updated = await db.users.find_one({"id": coach_id}, {"_id": 0})
    athlete_count = await db.athletes.count_documents({"primary_coach_id": coach_id})
    return _safe_coach(updated, athlete_count)


@router.delete("/coaches/{coach_id}")
async def remove_coach(coach_id: str, current_user: dict = get_current_user_dep()):
    """Director: remove a coach. Unassigns their athletes."""
    if current_user["role"] != "director":
        raise HTTPException(status_code=403, detail="Only directors can manage coaches")

    coach = await db.users.find_one(
        {"id": coach_id, "role": "club_coach"}, {"_id": 0}
    )
    if not coach:
        raise HTTPException(status_code=404, detail="Coach not found")

    # Unassign all athletes from this coach
    unassigned = await db.athletes.update_many(
        {"primary_coach_id": coach_id},
        {"$set": {"primary_coach_id": None, "unassigned_reason": "Coach removed"}}
    )

    # Delete the coach user
    await db.users.delete_one({"id": coach_id})

    # Refresh ownership cache
    await refresh_ownership_cache()

    return {
        "status": "removed",
        "coach_name": coach.get("name"),
        "athletes_unassigned": unassigned.modified_count,
    }

"""Athlete self-service endpoints — data the athlete sees about themselves."""

from fastapi import APIRouter, HTTPException
from auth_middleware import get_current_user_dep
from db_client import db

router = APIRouter()


def _safe_athlete(doc: dict) -> dict:
    """Return athlete dict safe for the athlete to see (no internal staff fields)."""
    return {
        "id": doc.get("id"),
        "firstName": doc.get("firstName", ""),
        "lastName": doc.get("lastName", ""),
        "fullName": doc.get("fullName", ""),
        "email": doc.get("email", ""),
        "phone": doc.get("phone", ""),
        "gradYear": doc.get("gradYear"),
        "position": doc.get("position", ""),
        "team": doc.get("team", ""),
        "height": doc.get("height", ""),
        "weight": doc.get("weight", ""),
        "gpa": doc.get("gpa", ""),
        "high_school": doc.get("high_school", ""),
        "hudl_url": doc.get("hudl_url", ""),
        "video_link": doc.get("video_link", ""),
        "photo_url": doc.get("photo_url", ""),
        "bio": doc.get("bio", ""),
        "recruitingStage": doc.get("recruitingStage", ""),
        "momentumScore": doc.get("momentumScore"),
        "momentumTrend": doc.get("momentumTrend", ""),
        "schoolTargets": doc.get("schoolTargets", 0),
        "activeInterest": doc.get("activeInterest", 0),
        "lastActivity": doc.get("lastActivity", ""),
        "primary_coach_id": doc.get("primary_coach_id"),
        "org_id": doc.get("org_id"),
        "tenant_id": doc.get("tenant_id"),
        "claimed_at": doc.get("claimed_at"),
    }


@router.get("/athlete/me")
async def get_my_athlete_profile(current_user: dict = get_current_user_dep()):
    """Return the athlete record linked to the current user, if any."""
    if current_user["role"] not in ("athlete", "parent"):
        raise HTTPException(status_code=403, detail="Only athletes and parents can access this endpoint")

    user_id = current_user["id"]

    athlete = await db.athletes.find_one({"user_id": user_id}, {"_id": 0})
    if not athlete:
        # User registered but no athlete record claimed
        return {
            "claimed": False,
            "athlete": None,
            "coach": None,
        }

    # Fetch the assigned coach name if present
    coach = None
    if athlete.get("primary_coach_id"):
        coach_doc = await db.users.find_one(
            {"id": athlete["primary_coach_id"]},
            {"_id": 0, "id": 1, "name": 1, "email": 1},
        )
        if coach_doc:
            coach = {"id": coach_doc["id"], "name": coach_doc["name"], "email": coach_doc["email"]}

    return {
        "claimed": True,
        "athlete": _safe_athlete(athlete),
        "coach": coach,
    }

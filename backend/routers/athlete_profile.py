"""Athlete Profile — self-managed profile editor + public profile page.

Reads/writes the canonical `athletes` collection, mapping field names
between the unified schema and the athlete app's expected field names.
"""

from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
from auth_middleware import get_current_user_dep
from db_client import db

router = APIRouter()

# ── Field mapping: canonical athletes → athlete-app profile names ──────

_TO_PROFILE = {
    "fullName": "athlete_name",
    "gradYear": "graduation_year",
    "position": "position",
    "team": "club_team",
    "height": "height",
    "email": "contact_email",
    "phone": "contact_phone",
    "high_school": "high_school",
    "gpa": "gpa",
    "hudl_url": "hudl_profile_url",
    "video_link": "video_link",
    "photo_url": "photo_url",
    "bio": "bio",
}

_FROM_PROFILE = {v: k for k, v in _TO_PROFILE.items()}

# Extra profile fields stored directly on the athlete doc (no rename)
_EXTRA_FIELDS = {
    "weight", "jersey_number", "standing_reach", "approach_touch",
    "block_touch", "wingspan", "handed", "city", "state",
    "parent_name", "parent_email", "parent_phone",
    "sat_score", "act_score",
}

_ALL_PROFILE_FIELDS = set(_TO_PROFILE.values()) | _EXTRA_FIELDS

_EMPTY_PROFILE = {f: "" for f in _ALL_PROFILE_FIELDS}


def _athlete_to_profile(doc: dict) -> dict:
    """Convert an athletes collection doc to the profile field namespace."""
    out = dict(_EMPTY_PROFILE)
    for canon, prof in _TO_PROFILE.items():
        if doc.get(canon):
            out[prof] = doc[canon]
    for f in _EXTRA_FIELDS:
        if doc.get(f):
            out[f] = doc[f]
    out["tenant_id"] = doc.get("tenant_id", "")
    return out


def _profile_to_updates(body: dict) -> dict:
    """Convert profile-namespace fields to canonical athletes updates."""
    updates = {}
    for prof_key, value in body.items():
        if prof_key in _FROM_PROFILE:
            updates[_FROM_PROFILE[prof_key]] = value
        elif prof_key in _EXTRA_FIELDS:
            updates[prof_key] = value
    # Keep fullName in sync if athlete_name is set
    if "athlete_name" in body and body["athlete_name"]:
        updates["fullName"] = body["athlete_name"]
        parts = body["athlete_name"].strip().split(" ", 1)
        updates["firstName"] = parts[0]
        updates["lastName"] = parts[1] if len(parts) > 1 else ""
    if "graduation_year" in body:
        updates["gradYear"] = body["graduation_year"]
    return updates


# ── Adapter ────────────────────────────────────────────────────────────

async def _get_athlete(current_user: dict) -> dict:
    if current_user["role"] not in ("athlete", "parent"):
        raise HTTPException(403, "Only athletes/parents can access this")
    athlete = await db.athletes.find_one(
        {"user_id": current_user["id"]}, {"_id": 0}
    )
    if not athlete:
        raise HTTPException(404, "No claimed athlete profile found")
    return athlete


# ── Profile CRUD ───────────────────────────────────────────────────────

@router.get("/athlete/profile")
async def get_profile(current_user: dict = get_current_user_dep()):
    athlete = await _get_athlete(current_user)
    return _athlete_to_profile(athlete)


@router.put("/athlete/profile")
async def update_profile(body: dict, current_user: dict = get_current_user_dep()):
    athlete = await _get_athlete(current_user)
    updates = _profile_to_updates(body)
    if not updates:
        return _athlete_to_profile(athlete)
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.athletes.update_one(
        {"id": athlete["id"]},
        {"$set": updates},
    )
    updated = await db.athletes.find_one({"id": athlete["id"]}, {"_id": 0})
    return _athlete_to_profile(updated)


@router.post("/athlete/profile/photo")
async def upload_photo(body: dict, current_user: dict = get_current_user_dep()):
    athlete = await _get_athlete(current_user)
    photo_data = body.get("photo_data", "")
    if not photo_data:
        raise HTTPException(400, "photo_data required")
    if len(photo_data) > 5_000_000:
        raise HTTPException(400, "Photo too large (max 5MB)")
    await db.athletes.update_one(
        {"id": athlete["id"]},
        {"$set": {
            "photo_url": photo_data,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    return {"ok": True, "photo_url": photo_data}


@router.get("/athlete/share-link")
async def get_share_link(current_user: dict = get_current_user_dep()):
    athlete = await _get_athlete(current_user)
    return {"tenant_id": athlete.get("tenant_id", "")}


# ── Public Profile (no auth) ──────────────────────────────────────────

PRIVATE_FIELDS = {"sat_score", "act_score"}


@router.get("/public/athlete/{tenant_id}")
async def public_athlete_profile(tenant_id: str):
    """Public-facing athlete profile. No auth required."""
    athlete = await db.athletes.find_one(
        {"tenant_id": tenant_id}, {"_id": 0}
    )
    if not athlete:
        raise HTTPException(404, "Athlete not found")

    profile = _athlete_to_profile(athlete)
    # Strip private fields
    safe_profile = {k: v for k, v in profile.items() if k not in PRIVATE_FIELDS}

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    upcoming = await db.athlete_events.find(
        {"tenant_id": tenant_id, "start_date": {"$gte": today}},
        {"_id": 0},
    ).sort("start_date", 1).to_list(50)

    past = await db.athlete_events.find(
        {"tenant_id": tenant_id, "start_date": {"$lt": today}},
        {"_id": 0},
    ).sort("start_date", -1).to_list(20)

    return {
        "profile": safe_profile,
        "upcoming_events": upcoming,
        "past_events": past,
    }

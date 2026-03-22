"""Profile — coach self-service profile management."""

import logging
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone

from db_client import db
from auth_middleware import get_current_user_dep

router = APIRouter()
log = logging.getLogger(__name__)

VALID_CONTACT_METHODS = {"email", "phone", "text", "slack"}

EDITABLE_FIELDS = {"name", "phone", "contact_method", "availability", "bio"}

MAX_PHOTO_SIZE = 2 * 1024 * 1024  # 2MB


def compute_completeness(user_doc: dict) -> str:
    """Incomplete / Basic / Complete based on filled profile fields."""
    profile = user_doc.get("profile") or {}
    name = (user_doc.get("name") or "").strip()
    if not name:
        return "incomplete"

    filled = 0
    if (profile.get("contact_method") or "").strip():
        filled += 1
    if (profile.get("availability") or "").strip():
        filled += 1
    if (profile.get("bio") or "").strip():
        filled += 1
    if (profile.get("phone") or "").strip():
        filled += 1

    # Complete = name + contact_method + availability + bio (phone optional)
    has_contact = bool((profile.get("contact_method") or "").strip())
    has_avail = bool((profile.get("availability") or "").strip())
    has_bio = bool((profile.get("bio") or "").strip())
    if has_contact and has_avail and has_bio:
        return "complete"

    if filled >= 2:
        return "basic"

    return "incomplete"


def _build_profile_response(user_doc: dict) -> dict:
    profile = user_doc.get("profile") or {}
    return {
        "id": user_doc["id"],
        "name": user_doc.get("name", ""),
        "email": user_doc.get("email", ""),
        "role": user_doc.get("role", ""),
        "team": user_doc.get("team"),
        "phone": profile.get("phone"),
        "contact_method": profile.get("contact_method"),
        "availability": profile.get("availability"),
        "bio": profile.get("bio"),
        "avatar_url": profile.get("avatar_url"),
        "completeness": compute_completeness(user_doc),
        "updated_at": profile.get("updated_at"),
    }


@router.get("/profile")
async def get_my_profile(current_user: dict = get_current_user_dep()):
    """Get current user's profile."""
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return _build_profile_response(user)


@router.put("/profile")
async def update_my_profile(body: dict, current_user: dict = get_current_user_dep()):
    """Update current user's editable profile fields."""
    updates = {}
    now = datetime.now(timezone.utc).isoformat()

    # Name is top-level
    if "name" in body:
        name_val = (body["name"] or "").strip()
        if not name_val:
            raise HTTPException(status_code=400, detail="Name cannot be empty")
        updates["name"] = name_val

    # Profile sub-fields
    profile_updates = {}
    if "phone" in body:
        profile_updates["profile.phone"] = (body["phone"] or "").strip() or None
    if "contact_method" in body:
        cm = (body["contact_method"] or "").strip().lower()
        if cm and cm not in VALID_CONTACT_METHODS:
            raise HTTPException(status_code=400, detail=f"Invalid contact method. Use: {', '.join(VALID_CONTACT_METHODS)}")
        profile_updates["profile.contact_method"] = cm or None
    if "availability" in body:
        profile_updates["profile.availability"] = (body["availability"] or "").strip() or None
    if "bio" in body:
        bio_val = (body["bio"] or "").strip()
        if bio_val and len(bio_val) > 500:
            raise HTTPException(status_code=400, detail="Bio must be 500 characters or less")
        profile_updates["profile.bio"] = bio_val or None

    profile_updates["profile.updated_at"] = now
    updates.update(profile_updates)

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    await db.users.update_one({"id": current_user["id"]}, {"$set": updates})

    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    return _build_profile_response(user)


@router.post("/profile/photo")
async def upload_profile_photo(body: dict, current_user: dict = get_current_user_dep()):
    """Upload a profile photo as base64 data URL."""
    photo_data = body.get("photo_url", "")
    if not photo_data:
        raise HTTPException(status_code=400, detail="No photo data provided")
    if not photo_data.startswith("data:image/"):
        raise HTTPException(status_code=400, detail="Invalid image format")
    if len(photo_data) > MAX_PHOTO_SIZE * 1.37:  # base64 overhead
        raise HTTPException(status_code=400, detail="Image too large (max 2MB)")

    now = datetime.now(timezone.utc).isoformat()
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"photo_url": photo_data, "profile.avatar_url": photo_data, "profile.updated_at": now}},
    )
    return {"photo_url": photo_data}



@router.get("/profile/{coach_id}")
async def get_coach_profile(coach_id: str, current_user: dict = get_current_user_dep()):
    """Director: view any coach's profile."""
    if current_user["role"] != "director":
        raise HTTPException(status_code=403, detail="Director only")

    user = await db.users.find_one({"id": coach_id, "role": "club_coach"}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Coach not found")
    return _build_profile_response(user)

"""Organization-scoped access control.

Provides middleware and helpers for multi-tenant data isolation:
- Directors see all athletes in their org
- Club coaches see assigned athletes in their org
- Athletes see only their own data
- Parents see linked athletes
- Platform admins see everything
"""

from fastapi import HTTPException
from db_client import db

STAFF_ROLES = {"director", "club_coach"}


async def get_org_athletes_query(user: dict) -> dict:
    """Return a MongoDB query filter for athletes visible to this user.

    - platform_admin: {} (all)
    - director: {"org_id": user.org_id}
    - club_coach: {"org_id": user.org_id, "primary_coach_id": user.id} or assigned
    - athlete: {"user_id": user.id}
    - parent: athletes linked via athlete_user_links
    """
    role = user.get("role", "")
    user_id = user["id"]
    org_id = user.get("org_id")

    if role == "platform_admin":
        return {}

    if role == "director":
        if not org_id:
            return {"_impossible": True}
        return {"org_id": org_id}

    if role == "club_coach":
        if not org_id:
            return {"_impossible": True}
        return {"org_id": org_id, "primary_coach_id": user_id}

    if role == "athlete":
        return {"user_id": user_id}

    if role == "parent":
        links = await db.athlete_user_links.find(
            {"user_id": user_id}, {"_id": 0, "athlete_id": 1}
        ).to_list(100)
        athlete_ids = [l["athlete_id"] for l in links]
        if not athlete_ids:
            return {"_impossible": True}
        return {"id": {"$in": athlete_ids}}

    return {"_impossible": True}


async def require_same_org(user: dict, target_org_id: str):
    """Raise 403 if user doesn't belong to the target org.

    Platform admins bypass this check.
    """
    if user.get("role") == "platform_admin":
        return
    if not target_org_id:
        raise HTTPException(403, "No organization context")
    if user.get("org_id") != target_org_id:
        raise HTTPException(403, "You don't have access to this organization")


async def require_athlete_access(user: dict, athlete_id: str):
    """Verify user can access a specific athlete's data.

    - platform_admin: always
    - director/club_coach: athlete must be in their org
    - athlete: must be their own record
    - parent: must be linked via athlete_user_links
    """
    role = user.get("role", "")

    if role == "platform_admin":
        return

    athlete = await db.athletes.find_one({"id": athlete_id}, {"_id": 0, "org_id": 1, "user_id": 1})
    if not athlete:
        raise HTTPException(404, "Athlete not found")

    if role == "director":
        if athlete.get("org_id") and athlete["org_id"] == user.get("org_id"):
            return
        raise HTTPException(403, "Athlete is not in your organization")

    if role == "club_coach":
        if athlete.get("org_id") and athlete["org_id"] == user.get("org_id"):
            return
        raise HTTPException(403, "Athlete is not in your organization")

    if role == "athlete":
        if athlete.get("user_id") == user["id"]:
            return
        raise HTTPException(403, "Not your athlete record")

    if role == "parent":
        link = await db.athlete_user_links.find_one({
            "user_id": user["id"], "athlete_id": athlete_id,
        })
        if link:
            return
        raise HTTPException(403, "You are not linked to this athlete")

    raise HTTPException(403, "Access denied")


def is_staff(user: dict) -> bool:
    return user.get("role") in STAFF_ROLES


def is_platform_admin(user: dict) -> bool:
    return user.get("role") == "platform_admin"

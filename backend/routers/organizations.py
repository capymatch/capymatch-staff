"""Organizations — CRUD, invite management, member listing."""

import uuid
import secrets
from fastapi import APIRouter, HTTPException, Request, Depends
from datetime import datetime, timezone
from db_client import db
from auth_middleware import get_current_user_dep
from org_access import require_same_org, is_platform_admin

router = APIRouter(prefix="/organizations")


@router.post("")
async def create_org(request: Request, current_user: dict = get_current_user_dep()):
    if current_user["role"] not in ("platform_admin", "director"):
        raise HTTPException(403, "Only directors or platform admins can create organizations")
    body = await request.json()
    name = (body.get("name") or "").strip()
    if not name:
        raise HTTPException(400, "Organization name is required")
    slug = body.get("slug", "").strip() or name.lower().replace(" ", "-")[:40]
    existing = await db.organizations.find_one({"slug": slug})
    if existing:
        raise HTTPException(400, f"Organization slug '{slug}' already taken")
    org = {
        "id": f"org-{uuid.uuid4().hex[:12]}",
        "name": name,
        "slug": slug,
        "owner_id": current_user["id"],
        "plan": body.get("plan", "free"),
        "billing_customer_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.organizations.insert_one(org)
    org.pop("_id", None)
    # Attach creator to org
    if current_user["role"] == "director" and not current_user.get("org_id"):
        await db.users.update_one({"id": current_user["id"]}, {"$set": {"org_id": org["id"]}})
    return org


@router.get("")
async def list_orgs(current_user: dict = get_current_user_dep()):
    if current_user["role"] == "platform_admin":
        orgs = await db.organizations.find({}, {"_id": 0}).to_list(500)
    elif current_user.get("org_id"):
        orgs = await db.organizations.find({"id": current_user["org_id"]}, {"_id": 0}).to_list(5)
    else:
        orgs = []
    for org in orgs:
        org["member_count"] = await db.users.count_documents({"org_id": org["id"]})
        org["athlete_count"] = await db.athletes.count_documents({"org_id": org["id"]})
    return {"organizations": orgs}


@router.get("/{org_id}")
async def get_org(org_id: str, current_user: dict = get_current_user_dep()):
    if not is_platform_admin(current_user):
        await require_same_org(current_user, org_id)
    org = await db.organizations.find_one({"id": org_id}, {"_id": 0})
    if not org:
        raise HTTPException(404, "Organization not found")
    org["member_count"] = await db.users.count_documents({"org_id": org_id})
    org["athlete_count"] = await db.athletes.count_documents({"org_id": org_id})
    directors = await db.users.find({"org_id": org_id, "role": "director"}, {"_id": 0, "id": 1, "name": 1, "email": 1}).to_list(50)
    coaches = await db.users.find({"org_id": org_id, "role": "club_coach"}, {"_id": 0, "id": 1, "name": 1, "email": 1}).to_list(100)
    athletes = await db.users.find({"org_id": org_id, "role": "athlete"}, {"_id": 0, "id": 1, "name": 1, "email": 1}).to_list(500)
    org["directors"] = directors
    org["coaches"] = coaches
    org["athletes"] = athletes
    return org


@router.put("/{org_id}")
async def update_org(org_id: str, request: Request, current_user: dict = get_current_user_dep()):
    if not is_platform_admin(current_user):
        await require_same_org(current_user, org_id)
        if current_user["role"] != "director":
            raise HTTPException(403, "Only directors can update their organization")
    body = await request.json()
    update = {}
    for field in ("name", "slug", "plan"):
        if field in body:
            update[field] = body[field]
    if not update:
        raise HTTPException(400, "Nothing to update")
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.organizations.update_one({"id": org_id}, {"$set": update})
    org = await db.organizations.find_one({"id": org_id}, {"_id": 0})
    return org


# ── Org Invites ──

@router.post("/{org_id}/invites")
async def create_invite(org_id: str, request: Request, current_user: dict = get_current_user_dep()):
    if not is_platform_admin(current_user):
        await require_same_org(current_user, org_id)
        if current_user["role"] not in ("director", "club_coach"):
            raise HTTPException(403, "Only staff can create invites")
    body = await request.json()
    role = body.get("role", "athlete")
    if role not in ("athlete", "club_coach", "director"):
        raise HTTPException(400, f"Cannot invite role: {role}")
    invite = {
        "id": f"inv-{uuid.uuid4().hex[:12]}",
        "org_id": org_id,
        "code": secrets.token_urlsafe(16),
        "role": role,
        "email": body.get("email", "").strip().lower() or None,
        "created_by": current_user["id"],
        "used": False,
        "used_by": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": None,
    }
    await db.org_invites.insert_one(invite)
    invite.pop("_id", None)
    return invite


@router.get("/{org_id}/invites")
async def list_invites(org_id: str, current_user: dict = get_current_user_dep()):
    if not is_platform_admin(current_user):
        await require_same_org(current_user, org_id)
    invites = await db.org_invites.find(
        {"org_id": org_id, "used": False}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return {"invites": invites}


@router.post("/join")
async def join_org(request: Request, current_user: dict = get_current_user_dep()):
    body = await request.json()
    code = (body.get("code") or "").strip()
    if not code:
        raise HTTPException(400, "Invite code is required")
    invite = await db.org_invites.find_one({"code": code, "used": False}, {"_id": 0})
    if not invite:
        raise HTTPException(400, "Invalid or used invite code")
    if invite.get("email") and invite["email"] != current_user["email"]:
        raise HTTPException(403, "This invite is for a different email address")
    org_id = invite["org_id"]
    org = await db.organizations.find_one({"id": org_id})
    if not org:
        raise HTTPException(404, "Organization not found")
    # Update user's org and role
    update = {"org_id": org_id}
    if invite.get("role") and current_user["role"] in ("athlete", "parent", "club_coach"):
        update["role"] = invite["role"]
    await db.users.update_one({"id": current_user["id"]}, {"$set": update})
    # If athlete, update athlete record too
    if current_user["role"] == "athlete" or invite.get("role") == "athlete":
        await db.athletes.update_many(
            {"user_id": current_user["id"]},
            {"$set": {"org_id": org_id}},
        )
    # Mark invite as used
    await db.org_invites.update_one(
        {"code": code},
        {"$set": {"used": True, "used_by": current_user["id"], "used_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"ok": True, "org_id": org_id, "org_name": org["name"]}


# ── Athlete-User Links (separate from org invites) ──

@router.post("/links/athlete")
async def link_athlete(request: Request, current_user: dict = get_current_user_dep()):
    """Link a parent/guardian to an athlete. Separate from org invites."""
    body = await request.json()
    athlete_id = (body.get("athlete_id") or "").strip()
    relationship = body.get("relationship_type", "parent")
    if not athlete_id:
        raise HTTPException(400, "athlete_id is required")
    if relationship not in ("parent", "guardian", "athlete"):
        raise HTTPException(400, "Invalid relationship type")
    athlete = await db.athletes.find_one({"id": athlete_id}, {"_id": 0, "id": 1, "org_id": 1})
    if not athlete:
        raise HTTPException(404, "Athlete not found")
    existing = await db.athlete_user_links.find_one({
        "athlete_id": athlete_id, "user_id": current_user["id"],
    })
    if existing:
        return {"ok": True, "message": "Already linked"}
    await db.athlete_user_links.insert_one({
        "athlete_id": athlete_id,
        "user_id": current_user["id"],
        "relationship_type": relationship,
        "permissions": body.get("permissions", ["view"]),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"ok": True, "linked": True}


@router.get("/links/my-athletes")
async def get_my_linked_athletes(current_user: dict = get_current_user_dep()):
    """Get athletes linked to current user (for parents)."""
    links = await db.athlete_user_links.find(
        {"user_id": current_user["id"]}, {"_id": 0}
    ).to_list(50)
    athlete_ids = [l["athlete_id"] for l in links]
    athletes = []
    if athlete_ids:
        athletes = await db.athletes.find(
            {"id": {"$in": athlete_ids}}, {"_id": 0, "id": 1, "full_name": 1, "email": 1, "org_id": 1}
        ).to_list(50)
    return {"links": links, "athletes": athletes}



# ── Admin: Add / Remove Members ──

@router.post("/{org_id}/members")
async def add_member_to_org(org_id: str, request: Request, current_user: dict = get_current_user_dep()):
    """Add an existing user to an organization by user_id or email."""
    if not is_platform_admin(current_user):
        await require_same_org(current_user, org_id)
        if current_user["role"] != "director":
            raise HTTPException(403, "Only directors or admins can add members")
    org = await db.organizations.find_one({"id": org_id}, {"_id": 0})
    if not org:
        raise HTTPException(404, "Organization not found")
    body = await request.json()
    user_id = body.get("user_id")
    email = (body.get("email") or "").strip().lower()
    if not user_id and not email:
        raise HTTPException(400, "user_id or email is required")
    query = {"id": user_id} if user_id else {"email": email}
    user = await db.users.find_one(query, {"_id": 0})
    if not user:
        raise HTTPException(404, "User not found")
    if user.get("org_id") == org_id:
        return {"ok": True, "message": "Already a member"}
    await db.users.update_one({"id": user["id"]}, {"$set": {"org_id": org_id}})
    if user.get("role") == "athlete" and user.get("athlete_id"):
        await db.athletes.update_many({"id": user["athlete_id"]}, {"$set": {"org_id": org_id}})
    return {"ok": True, "user_id": user["id"], "name": user.get("name", "")}


@router.delete("/{org_id}/members/{user_id}")
async def remove_member_from_org(org_id: str, user_id: str, current_user: dict = get_current_user_dep()):
    """Remove a user from an organization."""
    if not is_platform_admin(current_user):
        await require_same_org(current_user, org_id)
        if current_user["role"] != "director":
            raise HTTPException(403, "Only directors or admins can remove members")
    user = await db.users.find_one({"id": user_id, "org_id": org_id}, {"_id": 0})
    if not user:
        raise HTTPException(404, "User not in this organization")
    await db.users.update_one({"id": user_id}, {"$unset": {"org_id": ""}})
    if user.get("role") == "athlete" and user.get("athlete_id"):
        await db.athletes.update_many({"id": user["athlete_id"]}, {"$unset": {"org_id": ""}})
    return {"ok": True, "removed": user_id}


@router.delete("/{org_id}")
async def delete_org(org_id: str, current_user: dict = get_current_user_dep()):
    """Delete an organization (platform_admin only)."""
    if not is_platform_admin(current_user):
        raise HTTPException(403, "Only platform admins can delete organizations")
    org = await db.organizations.find_one({"id": org_id})
    if not org:
        raise HTTPException(404, "Organization not found")
    # Unlink all members
    await db.users.update_many({"org_id": org_id}, {"$unset": {"org_id": ""}})
    await db.athletes.update_many({"org_id": org_id}, {"$unset": {"org_id": ""}})
    await db.organizations.delete_one({"id": org_id})
    await db.org_invites.delete_many({"org_id": org_id})
    return {"ok": True, "deleted": org_id}

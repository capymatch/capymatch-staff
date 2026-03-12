"""Team management for athlete collaboration (invite parent/helper/teammate)."""

from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone
import uuid

from auth_middleware import get_current_user_dep
from db_client import db

router = APIRouter()


def _safe_user(u):
    return {
        "user_id": u["id"],
        "name": u.get("name", ""),
        "email": u.get("email", ""),
        "role": u.get("team_role", "member"),
    }


@router.get("/team")
async def get_team(current_user: dict = get_current_user_dep()):
    """Get the current user's team info."""
    user_id = current_user["id"]

    # Check if user owns a team
    team = await db.teams.find_one({"owner_id": user_id}, {"_id": 0})
    if not team:
        # Check if user is a member of someone else's team
        membership = await db.team_members.find_one({"user_id": user_id, "status": "active"}, {"_id": 0})
        if membership:
            team = await db.teams.find_one({"id": membership["team_id"]}, {"_id": 0})
        else:
            # Auto-create team for the athlete
            team = {
                "id": str(uuid.uuid4()),
                "owner_id": user_id,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            await db.teams.insert_one(team)

    is_owner = team["owner_id"] == user_id

    # Get owner info
    owner_user = await db.users.find_one({"id": team["owner_id"]}, {"_id": 0})
    owner_info = {
        "user_id": team["owner_id"],
        "name": owner_user.get("name", "") if owner_user else "",
        "email": owner_user.get("email", "") if owner_user else "",
    }

    # Get members
    members_cursor = db.team_members.find({"team_id": team["id"], "status": "active"}, {"_id": 0})
    member_docs = await members_cursor.to_list(50)
    members = []
    for m in member_docs:
        u = await db.users.find_one({"id": m["user_id"]}, {"_id": 0})
        if u:
            members.append({
                "user_id": m["user_id"],
                "name": u.get("name", ""),
                "email": u.get("email", ""),
            })

    # Get pending invitations
    pending = await db.team_invitations.find(
        {"team_id": team["id"], "status": "pending"}, {"_id": 0}
    ).to_list(50)
    pending_invitations = [
        {"invite_id": p["id"], "email": p["email"], "created_at": p.get("created_at", "")}
        for p in pending
    ]

    # Limits based on subscription (default: allow 2 members for now)
    athlete = await db.athletes.find_one({"user_id": team["owner_id"]}, {"_id": 0})
    tier = "basic"
    if athlete:
        sub = await db.subscriptions.find_one({"tenant_id": athlete.get("tenant_id")}, {"_id": 0})
        if sub:
            tier = sub.get("tier", "basic")

    max_members = 2 if tier == "basic" else 5 if tier == "pro" else -1

    return {
        "id": team["id"],
        "owner": owner_info,
        "members": members,
        "pending_invitations": pending_invitations,
        "current_user_role": "owner" if is_owner else "member",
        "limits": {
            "max_members": max_members,
            "current_count": 1 + len(members),  # owner + members
        },
    }


@router.post("/team/invite")
async def invite_to_team(request: Request, current_user: dict = get_current_user_dep()):
    """Owner invites someone to their team by email."""
    body = await request.json()
    email = body.get("email", "").strip().lower()
    if not email:
        raise HTTPException(400, "Email is required")

    # Must own a team
    team = await db.teams.find_one({"owner_id": current_user["id"]}, {"_id": 0})
    if not team:
        raise HTTPException(403, "Only team owners can invite")

    # Can't invite yourself
    if email == current_user.get("email", "").lower():
        raise HTTPException(400, "You can't invite yourself")

    # Check for existing pending invite
    existing = await db.team_invitations.find_one(
        {"team_id": team["id"], "email": email, "status": "pending"}, {"_id": 0}
    )
    if existing:
        raise HTTPException(400, "An invitation is already pending for this email")

    # Check if already a member
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    if existing_user:
        existing_member = await db.team_members.find_one(
            {"team_id": team["id"], "user_id": existing_user["id"], "status": "active"}, {"_id": 0}
        )
        if existing_member:
            raise HTTPException(400, "This person is already on your team")

    invite_doc = {
        "id": str(uuid.uuid4()),
        "team_id": team["id"],
        "email": email,
        "invited_by": current_user["id"],
        "invited_by_name": current_user.get("name", ""),
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.team_invitations.insert_one(invite_doc)

    # If user exists, create a notification for them
    if existing_user:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": existing_user["id"],
            "type": "team_invite",
            "title": "Team Invitation",
            "message": f"{current_user.get('name', 'Someone')} invited you to join their team",
            "data": {"invite_id": invite_doc["id"], "team_id": team["id"]},
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    return {"ok": True, "invite_id": invite_doc["id"]}


@router.delete("/team/invitations/{invite_id}")
async def cancel_team_invite(invite_id: str, current_user: dict = get_current_user_dep()):
    """Owner cancels a pending team invitation."""
    team = await db.teams.find_one({"owner_id": current_user["id"]}, {"_id": 0})
    if not team:
        raise HTTPException(403, "Only team owners can cancel invitations")

    invite = await db.team_invitations.find_one(
        {"id": invite_id, "team_id": team["id"]}, {"_id": 0}
    )
    if not invite:
        raise HTTPException(404, "Invitation not found")

    await db.team_invitations.update_one(
        {"id": invite_id}, {"$set": {"status": "cancelled"}}
    )
    return {"ok": True}


@router.delete("/team/members/{user_id}")
async def remove_team_member(user_id: str, current_user: dict = get_current_user_dep()):
    """Owner removes a member from the team."""
    team = await db.teams.find_one({"owner_id": current_user["id"]}, {"_id": 0})
    if not team:
        raise HTTPException(403, "Only team owners can remove members")

    result = await db.team_members.update_one(
        {"team_id": team["id"], "user_id": user_id, "status": "active"},
        {"$set": {"status": "removed", "removed_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(404, "Member not found")

    return {"ok": True}


@router.post("/team/leave")
async def leave_team(current_user: dict = get_current_user_dep()):
    """Member leaves the team they're on."""
    membership = await db.team_members.find_one(
        {"user_id": current_user["id"], "status": "active"}, {"_id": 0}
    )
    if not membership:
        raise HTTPException(400, "You are not a member of any team")

    await db.team_members.update_one(
        {"user_id": current_user["id"], "status": "active"},
        {"$set": {"status": "left", "left_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"ok": True}


@router.post("/team/accept/{invite_id}")
async def accept_team_invite(invite_id: str, current_user: dict = get_current_user_dep()):
    """Accept a team invitation."""
    invite = await db.team_invitations.find_one({"id": invite_id, "status": "pending"}, {"_id": 0})
    if not invite:
        raise HTTPException(404, "Invitation not found or already processed")

    if invite["email"].lower() != current_user.get("email", "").lower():
        raise HTTPException(403, "This invitation is for a different email address")

    # Add as team member
    await db.team_members.insert_one({
        "id": str(uuid.uuid4()),
        "team_id": invite["team_id"],
        "user_id": current_user["id"],
        "status": "active",
        "joined_at": datetime.now(timezone.utc).isoformat(),
    })

    # Mark invite as accepted
    await db.team_invitations.update_one(
        {"id": invite_id},
        {"$set": {"status": "accepted", "accepted_at": datetime.now(timezone.utc).isoformat()}}
    )

    return {"ok": True}

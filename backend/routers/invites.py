"""Invites — director-only coach invitation system."""

from fastapi import APIRouter, HTTPException
from passlib.hash import bcrypt
from datetime import datetime, timezone, timedelta
import uuid
import secrets

from db_client import db
from models import InviteCreate, InviteAccept
from auth_middleware import get_current_user_dep, create_token

router = APIRouter()

INVITE_EXPIRY_DAYS = 7


def _safe_invite(doc):
    """Return invite dict without _id. Include token for link sharing."""
    return {
        "id": doc["id"],
        "email": doc["email"],
        "name": doc["name"],
        "team": doc.get("team"),
        "token": doc.get("token", ""),
        "status": doc["status"],
        "invited_by": doc["invited_by"],
        "invited_by_name": doc.get("invited_by_name", ""),
        "created_at": doc["created_at"],
        "expires_at": doc["expires_at"],
        "accepted_at": doc.get("accepted_at"),
    }


@router.post("/invites")
async def create_invite(body: InviteCreate, current_user: dict = get_current_user_dep()):
    """Director creates an invite for a new coach."""
    if current_user["role"] != "director":
        raise HTTPException(status_code=403, detail="Only directors can invite coaches")

    # Check if email already has an account
    existing_user = await db.users.find_one({"email": body.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="A user with this email already exists")

    # Check for existing pending invite
    existing_invite = await db.invites.find_one(
        {"email": body.email, "status": "pending"}, {"_id": 0}
    )
    if existing_invite:
        raise HTTPException(status_code=400, detail="A pending invite already exists for this email")

    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)

    invite_doc = {
        "id": str(uuid.uuid4()),
        "email": body.email,
        "name": body.name,
        "team": body.team,
        "role": "coach",
        "token": token,
        "status": "pending",
        "invited_by": current_user["id"],
        "invited_by_name": current_user["name"],
        "created_at": now.isoformat(),
        "expires_at": (now + timedelta(days=INVITE_EXPIRY_DAYS)).isoformat(),
        "accepted_at": None,
    }
    await db.invites.insert_one(invite_doc)

    return _safe_invite({**invite_doc, "token": token})


@router.get("/invites")
async def list_invites(current_user: dict = get_current_user_dep()):
    """Director lists all invites they've sent."""
    if current_user["role"] != "director":
        raise HTTPException(status_code=403, detail="Only directors can view invites")

    invites = await db.invites.find(
        {"invited_by": current_user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)

    # Auto-expire old pending invites
    now = datetime.now(timezone.utc)
    result = []
    for inv in invites:
        if inv["status"] == "pending":
            expires = datetime.fromisoformat(inv["expires_at"])
            if now > expires:
                inv["status"] = "expired"
                await db.invites.update_one({"id": inv["id"]}, {"$set": {"status": "expired"}})
        result.append(_safe_invite(inv))

    return result


@router.delete("/invites/{invite_id}")
async def cancel_invite(invite_id: str, current_user: dict = get_current_user_dep()):
    """Director cancels a pending invite."""
    if current_user["role"] != "director":
        raise HTTPException(status_code=403, detail="Only directors can cancel invites")

    invite = await db.invites.find_one({"id": invite_id, "invited_by": current_user["id"]}, {"_id": 0})
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    if invite["status"] != "pending":
        raise HTTPException(status_code=400, detail="Only pending invites can be cancelled")

    await db.invites.update_one({"id": invite_id}, {"$set": {"status": "cancelled"}})
    return {"status": "cancelled"}


@router.get("/invites/validate/{token}")
async def validate_invite(token: str):
    """Public — validate an invite token before signup."""
    invite = await db.invites.find_one({"token": token}, {"_id": 0})
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid invite link")

    if invite["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Invite is {invite['status']}")

    expires = datetime.fromisoformat(invite["expires_at"])
    if datetime.now(timezone.utc) > expires:
        await db.invites.update_one({"id": invite["id"]}, {"$set": {"status": "expired"}})
        raise HTTPException(status_code=400, detail="Invite has expired")

    return {
        "email": invite["email"],
        "name": invite["name"],
        "team": invite.get("team"),
        "invited_by_name": invite.get("invited_by_name", ""),
    }


@router.post("/invites/accept/{token}")
async def accept_invite(token: str, body: InviteAccept):
    """Public — invited coach completes account setup."""
    invite = await db.invites.find_one({"token": token}, {"_id": 0})
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid invite link")

    if invite["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Invite is {invite['status']}")

    expires = datetime.fromisoformat(invite["expires_at"])
    if datetime.now(timezone.utc) > expires:
        await db.invites.update_one({"id": invite["id"]}, {"$set": {"status": "expired"}})
        raise HTTPException(status_code=400, detail="Invite has expired")

    # Check no user exists with this email yet
    existing = await db.users.find_one({"email": invite["email"]}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Account already exists for this email")

    # Create the user
    final_name = body.name or invite["name"]
    user_doc = {
        "id": str(uuid.uuid4()),
        "email": invite["email"],
        "password_hash": bcrypt.hash(body.password),
        "name": final_name,
        "role": "coach",
        "team": invite.get("team"),
        "invited_by": invite["invited_by"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)

    # Mark invite accepted
    await db.invites.update_one(
        {"id": invite["id"]},
        {"$set": {"status": "accepted", "accepted_at": datetime.now(timezone.utc).isoformat()}}
    )

    safe_user = {
        "id": user_doc["id"],
        "email": user_doc["email"],
        "name": user_doc["name"],
        "role": user_doc["role"],
        "created_at": user_doc["created_at"],
    }
    jwt_token = create_token(safe_user)
    return {"token": jwt_token, "user": safe_user}

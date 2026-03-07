"""Invites — director-only coach invitation system with email delivery."""

from fastapi import APIRouter, HTTPException, Request
from passlib.hash import bcrypt
from datetime import datetime, timezone, timedelta
import uuid
import secrets

from db_client import db
from models import InviteCreate, InviteAccept
from auth_middleware import get_current_user_dep, create_token
from services.email import send_invite_email

router = APIRouter()

INVITE_EXPIRY_DAYS = 7


def _safe_invite(doc):
    """Return invite dict without _id."""
    return {
        "id": doc["id"],
        "email": doc["email"],
        "name": doc["name"],
        "team": doc.get("team"),
        "token": doc.get("token", ""),
        "status": doc["status"],
        "delivery_status": doc.get("delivery_status", "pending"),
        "sent_at": doc.get("sent_at"),
        "last_error": doc.get("last_error"),
        "resend_count": doc.get("resend_count", 0),
        "invited_by": doc["invited_by"],
        "invited_by_name": doc.get("invited_by_name", ""),
        "created_at": doc["created_at"],
        "expires_at": doc["expires_at"],
        "accepted_at": doc.get("accepted_at"),
    }


def _build_invite_url(request: Request, token: str) -> str:
    """Build the frontend invite URL from the request origin."""
    origin = request.headers.get("origin", "")
    if not origin:
        referer = request.headers.get("referer", "")
        if referer:
            from urllib.parse import urlparse
            parsed = urlparse(referer)
            origin = f"{parsed.scheme}://{parsed.netloc}"
    if not origin:
        origin = "https://capy-match.preview.emergentagent.com"
    return f"{origin}/invite/{token}"


async def _send_and_track(invite_doc: dict, request: Request) -> dict:
    """Send invite email and update delivery status in DB."""
    invite_url = _build_invite_url(request, invite_doc["token"])

    result = await send_invite_email(
        to_email=invite_doc["email"],
        invite_name=invite_doc["name"],
        invited_by=invite_doc.get("invited_by_name", "A director"),
        team=invite_doc.get("team"),
        invite_url=invite_url,
    )

    now = datetime.now(timezone.utc).isoformat()
    if result["success"]:
        await db.invites.update_one(
            {"id": invite_doc["id"]},
            {"$set": {"delivery_status": "sent", "sent_at": now, "last_error": None}}
        )
        invite_doc["delivery_status"] = "sent"
        invite_doc["sent_at"] = now
        invite_doc["last_error"] = None
    else:
        await db.invites.update_one(
            {"id": invite_doc["id"]},
            {"$set": {"delivery_status": "failed", "last_error": result["error"]}}
        )
        invite_doc["delivery_status"] = "failed"
        invite_doc["last_error"] = result["error"]

    return invite_doc


@router.post("/invites")
async def create_invite(body: InviteCreate, request: Request, current_user: dict = get_current_user_dep()):
    """Director creates an invite for a new coach. Email sent automatically."""
    if current_user["role"] != "director":
        raise HTTPException(status_code=403, detail="Only directors can invite coaches")

    existing_user = await db.users.find_one({"email": body.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="A user with this email already exists")

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
        "delivery_status": "pending",
        "sent_at": None,
        "last_error": None,
        "resend_count": 0,
        "invited_by": current_user["id"],
        "invited_by_name": current_user["name"],
        "created_at": now.isoformat(),
        "expires_at": (now + timedelta(days=INVITE_EXPIRY_DAYS)).isoformat(),
        "accepted_at": None,
    }
    await db.invites.insert_one(invite_doc)

    # Send email (non-blocking failure — invite still exists with copy-link fallback)
    invite_doc = await _send_and_track(invite_doc, request)

    return _safe_invite(invite_doc)


@router.post("/invites/{invite_id}/resend")
async def resend_invite(invite_id: str, request: Request, current_user: dict = get_current_user_dep()):
    """Director resends an invite email."""
    if current_user["role"] != "director":
        raise HTTPException(status_code=403, detail="Only directors can resend invites")

    invite = await db.invites.find_one(
        {"id": invite_id, "invited_by": current_user["id"]}, {"_id": 0}
    )
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    if invite["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Cannot resend — invite is {invite['status']}")

    # Check expiry
    expires = datetime.fromisoformat(invite["expires_at"])
    if datetime.now(timezone.utc) > expires:
        await db.invites.update_one({"id": invite_id}, {"$set": {"status": "expired"}})
        raise HTTPException(status_code=400, detail="Invite has expired")

    # Increment resend count
    new_count = invite.get("resend_count", 0) + 1
    await db.invites.update_one(
        {"id": invite_id}, {"$set": {"resend_count": new_count}}
    )
    invite["resend_count"] = new_count

    # Send email
    invite = await _send_and_track(invite, request)

    return _safe_invite(invite)


@router.get("/invites")
async def list_invites(current_user: dict = get_current_user_dep()):
    """Director lists all invites they've sent."""
    if current_user["role"] != "director":
        raise HTTPException(status_code=403, detail="Only directors can view invites")

    invites = await db.invites.find(
        {"invited_by": current_user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)

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

    existing = await db.users.find_one({"email": invite["email"]}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Account already exists for this email")

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

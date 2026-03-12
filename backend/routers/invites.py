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
from services.ownership import refresh_ownership_cache
from services.athlete_store import get_all as get_athletes, recompute_derived_data

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
        origin = "https://pod-task-manager.preview.emergentagent.com"
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
        "role": "club_coach",
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
        "role": "club_coach",
        "team": invite.get("team"),
        "invited_by": invite["invited_by"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)

    await db.invites.update_one(
        {"id": invite["id"]},
        {"$set": {
            "status": "accepted",
            "accepted_at": datetime.now(timezone.utc).isoformat(),
            "accepted_user_id": user_doc["id"],
            "assignment_reviewed": False,
        }}
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



# ── Team-Aware Assignment Suggestions ─────────────────────────────────────


@router.get("/invites/pending-assignments")
async def get_pending_assignments(current_user: dict = get_current_user_dep()):
    """Director: get accepted invites with team context that need athlete assignment."""
    if current_user["role"] != "director":
        raise HTTPException(status_code=403, detail="Director only")

    accepted = await db.invites.find(
        {"status": "accepted", "assignment_reviewed": {"$ne": True}},
        {"_id": 0},
    ).to_list(50)

    # Filter to invites that have a team
    results = []
    for inv in accepted:
        team = inv.get("team")
        if not team:
            continue

        coach_id = inv.get("accepted_user_id")
        if not coach_id:
            continue

        # Find unassigned athletes on this team
        unassigned_on_team = [
            {
                "id": a["id"],
                "name": a.get("full_name", a.get("name", "Unknown")),
                "position": a.get("position"),
                "grad_year": a.get("grad_year"),
                "team": a.get("team"),
            }
            for a in get_athletes()
            if a.get("team") == team and not a.get("primary_coach_id")
        ]

        # Also count assigned athletes on the team (for context, not suggestion)
        assigned_on_team = sum(
            1 for a in get_athletes()
            if a.get("team") == team and a.get("primary_coach_id")
        )

        results.append({
            "invite_id": inv["id"],
            "coach_name": inv["name"],
            "coach_email": inv["email"],
            "coach_id": coach_id,
            "team": team,
            "accepted_at": inv.get("accepted_at"),
            "suggested_athletes": unassigned_on_team,
            "suggested_count": len(unassigned_on_team),
            "already_assigned_on_team": assigned_on_team,
        })

    return results


@router.post("/invites/{invite_id}/assign-athletes")
async def assign_athletes_from_invite(
    invite_id: str,
    body: dict,
    current_user: dict = get_current_user_dep(),
):
    """Director: bulk-assign selected athletes to the coach from an accepted invite."""
    if current_user["role"] != "director":
        raise HTTPException(status_code=403, detail="Director only")

    invite = await db.invites.find_one({"id": invite_id}, {"_id": 0})
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    if invite["status"] != "accepted":
        raise HTTPException(status_code=400, detail="Invite not in accepted state")

    coach_id = invite.get("accepted_user_id")
    if not coach_id:
        raise HTTPException(status_code=400, detail="No coach account linked to this invite")

    athlete_ids = body.get("athlete_ids", [])
    if not athlete_ids:
        raise HTTPException(status_code=400, detail="No athletes selected")

    # Validate all athletes exist and are unassigned
    assigned = []
    for aid in athlete_ids:
        athlete = next((a for a in get_athletes() if a["id"] == aid), None)
        if not athlete:
            continue
        if athlete.get("primary_coach_id"):
            continue  # skip already-assigned — no silent reassignment

        await db.athletes.update_one(
            {"id": aid},
            {"$set": {"primary_coach_id": coach_id, "unassigned_reason": None}},
        )

        # Log the assignment
        await db.reassignment_log.insert_one({
            "id": str(uuid.uuid4()),
            "athlete_id": aid,
            "athlete_name": athlete.get("full_name", athlete.get("name", "Unknown")),
            "type": "assign",
            "from_coach_id": None,
            "from_coach_name": None,
            "to_coach_id": coach_id,
            "to_coach_name": invite["name"],
            "reassigned_by": current_user["id"],
            "reassigned_by_name": current_user["name"],
            "reason": f"Team onboarding: {invite.get('team', '')}",
            "open_actions_at_time": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        assigned.append(aid)

    # Mark invite as reviewed
    await db.invites.update_one(
        {"id": invite_id},
        {"$set": {"assignment_reviewed": True}},
    )

    await recompute_derived_data()
    await refresh_ownership_cache()

    return {
        "status": "assigned",
        "assigned_count": len(assigned),
        "assigned_ids": assigned,
        "coach_name": invite["name"],
        "team": invite.get("team"),
    }


@router.post("/invites/{invite_id}/dismiss-assignment")
async def dismiss_assignment(
    invite_id: str,
    current_user: dict = get_current_user_dep(),
):
    """Director: dismiss the assignment suggestion without assigning anyone."""
    if current_user["role"] != "director":
        raise HTTPException(status_code=403, detail="Director only")

    invite = await db.invites.find_one({"id": invite_id}, {"_id": 0})
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")

    await db.invites.update_one(
        {"id": invite_id},
        {"$set": {"assignment_reviewed": True}},
    )

    return {"status": "dismissed"}
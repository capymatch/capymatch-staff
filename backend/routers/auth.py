"""Auth — registration, login, current user, password reset, Google OAuth."""

import os
import uuid
import hashlib
import secrets
from fastapi import APIRouter, HTTPException, BackgroundTasks
from passlib.hash import bcrypt
from datetime import datetime, timezone, timedelta

from db_client import db
from pydantic import BaseModel
from models import UserCreate, UserLogin, TokenResponse, UserOut, MeResponse
from auth_middleware import create_token, create_refresh_token, decode_refresh_token, get_current_user_dep

import logging

log_auth = logging.getLogger(__name__)

router = APIRouter()


ALLOWED_ROLES = {"director", "club_coach", "athlete", "parent"}
SELF_REGISTER_ROLES = {"club_coach", "athlete", "parent"}


def _safe_user(doc):
    """Return user dict without password or _id."""
    safe = {
        "id": doc["id"],
        "email": doc["email"],
        "name": doc["name"],
        "role": doc["role"],
        "org_id": doc.get("org_id"),
        "created_at": doc.get("created_at", ""),
        "photo_url": doc.get("photo_url", ""),
    }
    if doc.get("athlete_id"):
        safe["athlete_id"] = doc["athlete_id"]
    return safe


async def _try_claim_athlete(user_doc: dict) -> dict | None:
    """Attempt to claim an athlete record by exact email match.

    Rules:
    - Match: athletes.email == user.email (case-insensitive, exact match)
    - Skip if athlete already has user_id set (already claimed)
    - On match: set athlete.user_id, generate tenant_id, update user.org_id
    - Returns the claimed athlete dict, or None if no match/already claimed
    """
    email = user_doc["email"].strip().lower()
    user_id = user_doc["id"]

    # Find unclaimed athlete with matching email
    athlete = await db.athletes.find_one(
        {"email": {"$regex": f"^{email}$", "$options": "i"}, "user_id": None},
        {"_id": 0},
    )

    if not athlete:
        log_auth.info(f"Claim: no unclaimed athlete match for {email}")
        return None

    athlete_id = athlete["id"]
    athlete_org_id = athlete.get("org_id")

    # Check idempotency — if this exact user already claimed this athlete
    if athlete.get("user_id") == user_id:
        log_auth.info(f"Claim: athlete {athlete_id} already claimed by this user — idempotent skip")
        return athlete

    # Generate tenant_id for the athlete's private data space
    tenant_id = f"tenant-{user_id}"

    # Claim the athlete record
    result = await db.athletes.update_one(
        {"id": athlete_id, "user_id": None},  # double-check unclaimed
        {"$set": {
            "user_id": user_id,
            "tenant_id": tenant_id,
            "claimed_at": datetime.now(timezone.utc).isoformat(),
        }},
    )

    if result.modified_count == 0:
        # Race condition: another request claimed it between our read and write
        log_auth.warning(f"Claim: athlete {athlete_id} was claimed by another user concurrently")
        return None

    # Update user's org_id from the athlete record
    if athlete_org_id:
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"org_id": athlete_org_id}},
        )
        user_doc["org_id"] = athlete_org_id

    log_auth.info(
        f"Claim successful: user {user_id} claimed athlete {athlete_id} "
        f"(org_id={athlete_org_id}, tenant_id={tenant_id})"
    )
    return {**athlete, "user_id": user_id, "tenant_id": tenant_id}


@router.post("/auth/register", response_model=TokenResponse)
async def register(body: UserCreate):
    if body.role not in SELF_REGISTER_ROLES:
        raise HTTPException(
            status_code=403,
            detail=f"Role '{body.role}' cannot be self-registered",
        )

    existing = await db.users.find_one({"email": body.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_doc = {
        "id": str(uuid.uuid4()),
        "email": body.email,
        "password_hash": bcrypt.hash(body.password),
        "name": body.name,
        "role": body.role,
        "org_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)

    # If registering as athlete, attempt to claim an existing athlete record
    claimed_athlete = None
    if body.role == "athlete":
        claimed_athlete = await _try_claim_athlete(user_doc)

    # If no existing athlete record was claimed, create a fresh one
    if body.role == "athlete" and not claimed_athlete:
        tenant_id = f"tenant-{user_doc['id']}"
        now_str = datetime.now(timezone.utc).isoformat()
        parts = body.name.strip().split(" ", 1)
        new_athlete = {
            "id": str(uuid.uuid4()),
            "user_id": user_doc["id"],
            "tenant_id": tenant_id,
            "org_id": None,
            "email": body.email,
            "full_name": body.name,
            "first_name": parts[0],
            "last_name": parts[1] if len(parts) > 1 else "",
            "position": "",
            "grad_year": "",
            "team": "",
            "height": "",
            "city": "",
            "state": "",
            "high_school": "",
            "gpa": "",
            "recruiting_stage": "prospect",
            "recruiting_profile": None,
            "onboarding_completed": False,
            "created_at": now_str,
            "updated_at": now_str,
            "claimed_at": now_str,
        }
        await db.athletes.insert_one(new_athlete)
        new_athlete.pop("_id", None)
        claimed_athlete = new_athlete
        log_auth.info(f"Created fresh athlete record for user {user_doc['id']}")

    # Seed demo pipeline data only for athletes who claimed an existing record.
    # Fresh athletes (onboarding_completed=False) get the onboarding EmptyBoardState instead.
    should_seed = claimed_athlete and claimed_athlete.get("tenant_id") and claimed_athlete.get("onboarding_completed") is not False
    if should_seed:
        from seeders.seed_athlete_demo import seed_athlete_demo_data
        await seed_athlete_demo_data(
            db,
            claimed_athlete["tenant_id"],
            claimed_athlete.get("full_name", body.name),
        )

    safe = _safe_user(user_doc)
    token = create_token(safe)
    refresh_token, refresh_id = create_refresh_token(safe["id"])

    # Store refresh token in DB
    await db.refresh_tokens.insert_one({
        "token_id": refresh_id,
        "user_id": safe["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "revoked": False,
    })

    response = {"token": token, "refresh_token": refresh_token, "user": safe}
    if claimed_athlete:
        response["claimed_athlete_id"] = claimed_athlete["id"]
    return response


@router.post("/auth/login", response_model=TokenResponse)
async def login(body: UserLogin, background_tasks: BackgroundTasks):
    user = await db.users.find_one({"email": body.email}, {"_id": 0})
    if not bcrypt.verify(body.password, user["password_hash"]) if user else True:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    safe = _safe_user(user)

    # For athletes, pull the profile photo from athletes collection
    if safe.get("athlete_id") and not safe.get("photo_url"):
        athlete_doc = await db.athletes.find_one(
            {"id": safe["athlete_id"]},
            {"_id": 0, "photo_url": 1}
        )
        if athlete_doc and athlete_doc.get("photo_url"):
            safe["photo_url"] = athlete_doc["photo_url"]

    token = create_token(safe)
    refresh_token, refresh_id = create_refresh_token(safe["id"])

    # Store refresh token in DB
    await db.refresh_tokens.insert_one({
        "token_id": refresh_id,
        "user_id": safe["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "revoked": False,
    })

    # Background: check weekly measurables nudge for athletes
    if safe.get("role") in ("athlete", "parent"):
        athlete = await db.athletes.find_one({"user_id": safe["id"]}, {"_id": 0, "tenant_id": 1})
        if athlete and athlete.get("tenant_id"):
            from services.notifications import check_and_send_measurables_nudge
            background_tasks.add_task(check_and_send_measurables_nudge, safe["id"], athlete["tenant_id"])

    return {"token": token, "refresh_token": refresh_token, "user": safe}


# ── Google OAuth ──
class GoogleAuthRequest(BaseModel):
    credential: str  # Google ID token from frontend


@router.post("/auth/google", response_model=TokenResponse)
async def google_auth(body: GoogleAuthRequest, background_tasks: BackgroundTasks):
    """Authenticate with Google OAuth. Creates account if first login."""
    # REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    from google.oauth2 import id_token
    from google.auth.transport import requests as google_requests

    client_id = os.environ.get("GOOGLE_CLIENT_ID")
    if not client_id:
        raise HTTPException(status_code=503, detail="Google OAuth not configured")

    try:
        idinfo = id_token.verify_oauth2_token(
            body.credential, google_requests.Request(), client_id
        )
    except Exception as e:
        log_auth.error(f"Google token verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid Google token")

    email = idinfo.get("email", "").strip().lower()
    name = idinfo.get("name", email.split("@")[0])
    photo_url = idinfo.get("picture", "")

    if not email:
        raise HTTPException(status_code=400, detail="No email in Google token")

    # Check if user exists
    user = await db.users.find_one({"email": email}, {"_id": 0})

    if user:
        # Existing user — update photo if available
        if photo_url and not user.get("photo_url"):
            await db.users.update_one({"id": user["id"]}, {"$set": {"photo_url": photo_url}})
            user["photo_url"] = photo_url
    else:
        # New user — create account as athlete
        user = {
            "id": str(uuid.uuid4()),
            "email": email,
            "password_hash": bcrypt.hash(secrets.token_urlsafe(32)),  # random password for OAuth users
            "name": name,
            "role": "athlete",
            "org_id": None,
            "photo_url": photo_url,
            "google_sub": idinfo.get("sub"),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(user)
        user.pop("_id", None)

        # Create athlete record
        claimed_athlete = await _try_claim_athlete(user)
        if not claimed_athlete:
            tenant_id = f"tenant-{user['id']}"
            now_str = datetime.now(timezone.utc).isoformat()
            parts = name.strip().split(" ", 1)
            new_athlete = {
                "id": str(uuid.uuid4()),
                "user_id": user["id"],
                "tenant_id": tenant_id,
                "org_id": None,
                "email": email,
                "full_name": name,
                "first_name": parts[0],
                "last_name": parts[1] if len(parts) > 1 else "",
                "position": "", "grad_year": "", "team": "", "height": "",
                "city": "", "state": "", "high_school": "", "gpa": "",
                "recruiting_stage": "prospect",
                "recruiting_profile": None,
                "onboarding_completed": False,
                "created_at": now_str, "updated_at": now_str, "claimed_at": now_str,
            }
            await db.athletes.insert_one(new_athlete)
            new_athlete.pop("_id", None)
            claimed_athlete = new_athlete
            log_auth.info(f"Google OAuth: created fresh athlete for {email}")

        # Link athlete_id to user
        if claimed_athlete:
            await db.users.update_one(
                {"id": user["id"]},
                {"$set": {"athlete_id": claimed_athlete["id"], "org_id": claimed_athlete.get("org_id")}},
            )
            user["athlete_id"] = claimed_athlete["id"]
            user["org_id"] = claimed_athlete.get("org_id")

    safe = _safe_user(user)
    if photo_url:
        safe["photo_url"] = photo_url

    token = create_token(safe)
    refresh_token, refresh_id = create_refresh_token(safe["id"])

    await db.refresh_tokens.insert_one({
        "token_id": refresh_id,
        "user_id": safe["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "revoked": False,
    })

    # Background tasks for athletes
    if safe.get("role") in ("athlete", "parent"):
        athlete = await db.athletes.find_one({"user_id": safe["id"]}, {"_id": 0, "tenant_id": 1})
        if athlete and athlete.get("tenant_id"):
            from services.notifications import check_and_send_measurables_nudge
            background_tasks.add_task(check_and_send_measurables_nudge, safe["id"], athlete["tenant_id"])

    log_auth.info(f"Google OAuth login successful for {email}")
    return {"token": token, "refresh_token": refresh_token, "user": safe}



class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/auth/refresh")
async def refresh(body: RefreshRequest):
    """Exchange a valid refresh token for a new access + refresh token pair."""
    payload = decode_refresh_token(body.refresh_token)
    token_id = payload.get("jti")
    user_id = payload["sub"]

    # Verify token not revoked
    stored = await db.refresh_tokens.find_one({"token_id": token_id, "revoked": False}, {"_id": 0})
    if not stored:
        raise HTTPException(status_code=401, detail="Refresh token revoked or invalid")

    # Revoke old refresh token (rotation)
    await db.refresh_tokens.update_one({"token_id": token_id}, {"$set": {"revoked": True}})

    # Load user
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    safe = _safe_user(user)
    new_access = create_token(safe)
    new_refresh, new_refresh_id = create_refresh_token(user_id)

    await db.refresh_tokens.insert_one({
        "token_id": new_refresh_id,
        "user_id": user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "revoked": False,
    })

    return {"token": new_access, "refresh_token": new_refresh, "user": safe}


@router.post("/auth/logout")
async def logout(current_user: dict = get_current_user_dep()):
    """Revoke all refresh tokens for the user."""
    await db.refresh_tokens.update_many(
        {"user_id": current_user["id"]},
        {"$set": {"revoked": True}},
    )
    return {"message": "Logged out"}



@router.get("/auth/me", response_model=MeResponse)
async def me(current_user: dict = get_current_user_dep()):
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    if not user:
        return current_user
    safe = _safe_user(user)
    # For athletes, pull the profile photo from athletes collection
    if safe.get("athlete_id") and not safe.get("photo_url"):
        athlete = await db.athletes.find_one(
            {"id": safe["athlete_id"]},
            {"_id": 0, "photo_url": 1}
        )
        if athlete and athlete.get("photo_url"):
            safe["photo_url"] = athlete["photo_url"]
    return safe


# ── Password Reset ─────────────────────────────────────────────────────────

import os
import asyncio
import logging
import resend

log = logging.getLogger(__name__)
resend.api_key = os.environ.get("RESEND_API_KEY", "")
_FROM_EMAIL = os.environ.get("RESEND_FROM_EMAIL", "onboarding@resend.dev")
_FRONTEND_URL = os.environ.get("FRONTEND_URL", "")

RESET_TOKEN_EXPIRY_HOURS = 1


def _hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def _build_reset_html(user_name: str, reset_url: str) -> str:
    return f"""
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:32px 0;">
      <div style="background:#0f172a;border-radius:12px 12px 0 0;padding:24px 28px;text-align:center;">
        <div style="width:36px;height:36px;background:rgba(255,255,255,0.1);border-radius:8px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
          <span style="color:#fff;font-weight:700;font-size:13px;">CM</span>
        </div>
        <h1 style="margin:0;color:#fff;font-size:18px;font-weight:600;">CapyMatch</h1>
      </div>
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:28px;">
        <p style="margin:0 0 16px;font-size:14px;color:#111827;">Hi {user_name},</p>
        <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.6;">
          We received a request to reset your password. Click the button below to set a new one.
        </p>
        <div style="text-align:center;margin:24px 0;">
          <a href="{reset_url}"
             style="display:inline-block;background:#0f172a;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
            Reset Password
          </a>
        </div>
        <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
          This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    </div>
    """


@router.post("/auth/forgot-password")
async def forgot_password(body: dict):
    """Request a password reset link. Always returns success to not reveal email existence."""
    email = (body.get("email") or "").strip().lower()
    generic_msg = "If an account exists for that email, we sent a reset link."

    if not email:
        return {"message": generic_msg}

    user = await db.users.find_one({"email": email}, {"_id": 0, "id": 1, "name": 1, "email": 1})
    if not user:
        return {"message": generic_msg}

    # Invalidate all older unused tokens for this email
    await db.password_resets.update_many(
        {"email": email, "used": False},
        {"$set": {"used": True}},
    )

    # Generate token
    raw_token = secrets.token_urlsafe(32)
    token_hash = _hash_token(raw_token)
    now = datetime.now(timezone.utc)

    await db.password_resets.insert_one({
        "id": str(uuid.uuid4()),
        "email": email,
        "token_hash": token_hash,
        "expires_at": (now + timedelta(hours=RESET_TOKEN_EXPIRY_HOURS)).isoformat(),
        "used": False,
        "created_at": now.isoformat(),
    })

    # Build reset URL
    from config import FRONTEND_URL as _CFG_FRONTEND_URL
    frontend_url = _CFG_FRONTEND_URL or _FRONTEND_URL
    reset_url = f"{frontend_url}/reset-password?token={raw_token}"

    # Send email
    try:
        await asyncio.to_thread(resend.Emails.send, {
            "from": _FROM_EMAIL,
            "to": [email],
            "subject": "Reset your CapyMatch password",
            "html": _build_reset_html(user["name"], reset_url),
        })
        log.info(f"Password reset email sent to {email}")
    except Exception as e:
        log.error(f"Failed to send reset email to {email}: {e}")

    return {"message": generic_msg}


@router.post("/auth/reset-password")
async def reset_password(body: dict):
    """Reset password using a valid token."""
    raw_token = (body.get("token") or "").strip()
    new_password = (body.get("password") or "").strip()

    if not raw_token or not new_password:
        raise HTTPException(status_code=400, detail="Token and password are required")

    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    token_hash = _hash_token(raw_token)
    reset_doc = await db.password_resets.find_one(
        {"token_hash": token_hash, "used": False},
        {"_id": 0},
    )

    if not reset_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    # Check expiry
    try:
        expires_at = datetime.fromisoformat(reset_doc["expires_at"])
        if datetime.now(timezone.utc) > expires_at:
            await db.password_resets.update_one(
                {"token_hash": token_hash}, {"$set": {"used": True}}
            )
            raise HTTPException(status_code=400, detail="Reset link has expired")
    except HTTPException:
        raise
    except Exception as e:  # noqa: E722
        log.warning("Handled exception (handled): %s", e)
        raise HTTPException(status_code=400, detail="Invalid reset link")

    # Update password
    email = reset_doc["email"]
    new_hash = bcrypt.hash(new_password)
    result = await db.users.update_one(
        {"email": email},
        {"$set": {"password_hash": new_hash}},
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Account not found")

    # Mark token as used
    await db.password_resets.update_one(
        {"token_hash": token_hash}, {"$set": {"used": True}}
    )

    log.info(f"Password reset completed for {email}")
    return {"message": "Password has been reset. You can now sign in."}

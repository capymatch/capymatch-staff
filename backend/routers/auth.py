"""Auth — registration, login, current user, password reset."""

import uuid
import hashlib
import secrets
from fastapi import APIRouter, HTTPException
from passlib.hash import bcrypt
from datetime import datetime, timezone, timedelta

from db_client import db
from models import UserCreate, UserLogin, TokenResponse
from auth_middleware import create_token, get_current_user_dep

import logging

log_auth = logging.getLogger(__name__)

router = APIRouter()


ALLOWED_ROLES = {"director", "coach", "athlete", "parent"}
SELF_REGISTER_ROLES = {"coach", "athlete", "parent"}


def _safe_user(doc):
    """Return user dict without password or _id."""
    return {
        "id": doc["id"],
        "email": doc["email"],
        "name": doc["name"],
        "role": doc["role"],
        "org_id": doc.get("org_id"),
        "created_at": doc.get("created_at", ""),
    }


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

    # Seed demo pipeline data for a newly claimed athlete
    if claimed_athlete and claimed_athlete.get("tenant_id"):
        from seeders.seed_athlete_demo import seed_athlete_demo_data
        await seed_athlete_demo_data(
            db,
            claimed_athlete["tenant_id"],
            claimed_athlete.get("fullName", body.name),
        )

    safe = _safe_user(user_doc)
    token = create_token(safe)
    response = {"token": token, "user": safe}
    if claimed_athlete:
        response["claimed_athlete_id"] = claimed_athlete["id"]
    return response


@router.post("/auth/login", response_model=TokenResponse)
async def login(body: UserLogin):
    user = await db.users.find_one({"email": body.email}, {"_id": 0})
    if not user or not bcrypt.verify(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    safe = _safe_user(user)
    token = create_token(safe)
    return {"token": token, "user": safe}


@router.get("/auth/me")
async def me(current_user: dict = get_current_user_dep()):
    return current_user


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
    frontend_url = _FRONTEND_URL or os.environ.get("CORS_ORIGINS", "").split(",")[0].strip()
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
    except Exception:
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

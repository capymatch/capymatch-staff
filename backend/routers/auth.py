"""Auth — registration, login, current user."""

from fastapi import APIRouter, HTTPException
from passlib.hash import bcrypt
from datetime import datetime, timezone

from db_client import db
from models import UserCreate, UserLogin, TokenResponse
from auth_middleware import create_token, get_current_user_dep

router = APIRouter()


def _safe_user(doc):
    """Return user dict without password or _id."""
    return {
        "id": doc["id"],
        "email": doc["email"],
        "name": doc["name"],
        "role": doc["role"],
        "created_at": doc.get("created_at", ""),
    }


@router.post("/auth/register", response_model=TokenResponse)
async def register(body: UserCreate):
    existing = await db.users.find_one({"email": body.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    import uuid
    user_doc = {
        "id": str(uuid.uuid4()),
        "email": body.email,
        "password_hash": bcrypt.hash(body.password),
        "name": body.name,
        "role": body.role,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)

    safe = _safe_user(user_doc)
    token = create_token(safe)
    return {"token": token, "user": safe}


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

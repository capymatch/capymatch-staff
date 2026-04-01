"""JWT helpers and FastAPI dependency for protected routes."""

import os
import jwt
import uuid
from datetime import datetime, timezone, timedelta
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / ".env")

SECRET = os.environ["JWT_SECRET"]
ALGORITHM = "HS256"
ACCESS_EXPIRY_HOURS = 1
REFRESH_EXPIRY_DAYS = 7

_bearer = HTTPBearer(auto_error=False)


def create_token(user: dict) -> str:
    """Short-lived access token (1 hour)."""
    payload = {
        "sub": user["id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "org_id": user.get("org_id"),
        "athlete_id": user.get("athlete_id"),
        "roles": user.get("roles"),
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(hours=ACCESS_EXPIRY_HOURS),
    }
    return jwt.encode(payload, SECRET, algorithm=ALGORITHM)


def create_refresh_token(user_id: str) -> tuple[str, str]:
    """Long-lived refresh token (7 days). Returns (token_string, token_id)."""
    token_id = str(uuid.uuid4())
    payload = {
        "sub": user_id,
        "jti": token_id,
        "type": "refresh",
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_EXPIRY_DAYS),
    }
    return jwt.encode(payload, SECRET, algorithm=ALGORITHM), token_id


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def decode_refresh_token(token: str) -> dict:
    """Decode and validate a refresh token specifically."""
    try:
        payload = jwt.decode(token, SECRET, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


async def _get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(_bearer),
):
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(creds.credentials)
    if payload.get("type") == "refresh":
        raise HTTPException(status_code=401, detail="Cannot use refresh token for API access")
    return {
        "id": payload["sub"],
        "email": payload["email"],
        "name": payload["name"],
        "role": payload["role"],
        "org_id": payload.get("org_id"),
        "athlete_id": payload.get("athlete_id"),
        "roles": payload.get("roles"),
    }


def get_current_user_dep():
    """Return the Depends() object for use in route signatures."""
    return Depends(_get_current_user)

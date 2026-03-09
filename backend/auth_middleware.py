"""JWT helpers and FastAPI dependency for protected routes."""

import os
import jwt
from datetime import datetime, timezone, timedelta
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / ".env")

SECRET = os.environ["JWT_SECRET"]
ALGORITHM = "HS256"
EXPIRY_HOURS = 72

_bearer = HTTPBearer(auto_error=False)


def create_token(user: dict) -> str:
    payload = {
        "sub": user["id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "org_id": user.get("org_id"),
        "exp": datetime.now(timezone.utc) + timedelta(hours=EXPIRY_HOURS),
    }
    return jwt.encode(payload, SECRET, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def _get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(_bearer),
):
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(creds.credentials)
    return {
        "id": payload["sub"],
        "email": payload["email"],
        "name": payload["name"],
        "role": payload["role"],
        "org_id": payload.get("org_id"),
    }


def get_current_user_dep():
    """Return the Depends() object for use in route signatures."""
    return Depends(_get_current_user)

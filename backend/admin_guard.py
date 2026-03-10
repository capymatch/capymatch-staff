"""Admin guard — FastAPI dependency that requires director role."""

from fastapi import Depends, HTTPException
from auth_middleware import _get_current_user


async def require_admin(current_user: dict = Depends(_get_current_user)):
    if current_user.get("role") not in ("director", "admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

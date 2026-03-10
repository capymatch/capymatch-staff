"""Admin guard — FastAPI dependency that requires admin access.

- platform_admin: always allowed (superadmin)
- director: allowed for org-level admin actions
"""

from fastapi import Depends, HTTPException
from auth_middleware import _get_current_user

ADMIN_ROLES = {"platform_admin", "director"}


async def require_admin(current_user: dict = Depends(_get_current_user)):
    if current_user.get("role") not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


async def require_platform_admin(current_user: dict = Depends(_get_current_user)):
    if current_user.get("role") != "platform_admin":
        raise HTTPException(status_code=403, detail="Platform admin access required")
    return current_user

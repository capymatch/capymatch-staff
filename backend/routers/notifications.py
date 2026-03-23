"""Notifications API router.

Endpoints:
  GET  /api/notifications        — Fetch user's notifications (paginated)
  GET  /api/notifications/count  — Unread count
  POST /api/notifications/read   — Mark all (or type) as read
"""

from fastapi import APIRouter, Query
from auth_middleware import get_current_user_dep
from services.notifications import get_notifications, mark_read, unread_count
from services.pagination import paginate_query
from pydantic import BaseModel
from typing import Optional
from db_client import db

router = APIRouter()


@router.get("/notifications")
async def list_notifications(
    page: Optional[int] = Query(None, ge=1),
    page_size: Optional[int] = Query(None, ge=1, le=200),
    current_user: dict = get_current_user_dep(),
):
    """Get the current user's notifications."""
    if page is not None:
        result = await paginate_query(
            db.notifications,
            {"user_id": current_user["id"]},
            {"_id": 0},
            sort=[("created_at", -1)],
            page=page,
            page_size=page_size or 20,
        )
        return {
            "notifications": result["items"],
            **{k: result[k] for k in ("total", "page", "page_size", "total_pages")},
        }
    notifs = await get_notifications(current_user["id"])
    return {"notifications": notifs}


@router.get("/notifications/count")
async def get_unread_count(current_user: dict = get_current_user_dep()):
    """Get count of unread notifications."""
    count = await unread_count(current_user["id"])
    return {"unread": count}


class MarkReadBody(BaseModel):
    type: Optional[str] = None


@router.post("/notifications/read")
async def mark_notifications_read(body: MarkReadBody = MarkReadBody(), current_user: dict = get_current_user_dep()):
    """Mark notifications as read."""
    count = await mark_read(current_user["id"], body.type)
    return {"marked": count}

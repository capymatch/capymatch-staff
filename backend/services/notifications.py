"""Notifications service.

Handles creating, fetching, and managing in-app notifications.
Includes weekly measurables nudge logic.
"""

import logging
from datetime import datetime, timezone, timedelta
from db_client import db

logger = logging.getLogger(__name__)


async def create_notification(tenant_id: str, user_id: str, notif_type: str, title: str, message: str, action_url: str = ""):
    """Create an in-app notification."""
    doc = {
        "tenant_id": tenant_id,
        "user_id": user_id,
        "type": notif_type,
        "title": title,
        "message": message,
        "action_url": action_url,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.notifications.insert_one(doc)
    logger.info(f"Notification created: {notif_type} for user {user_id}")


async def get_notifications(user_id: str, limit: int = 20):
    """Fetch latest notifications for a user."""
    cursor = db.notifications.find(
        {"user_id": user_id},
        {"_id": 0},
    ).sort("created_at", -1).limit(limit)
    return await cursor.to_list(limit)


async def mark_read(user_id: str, notif_type: str = None):
    """Mark notifications as read. If notif_type given, only that type."""
    query = {"user_id": user_id, "read": False}
    if notif_type:
        query["type"] = notif_type
    result = await db.notifications.update_many(query, {"$set": {"read": True}})
    return result.modified_count


async def unread_count(user_id: str) -> int:
    """Count unread notifications."""
    return await db.notifications.count_documents({"user_id": user_id, "read": False})


async def check_and_send_measurables_nudge(user_id: str, tenant_id: str):
    """Check if athlete needs a weekly measurables nudge.
    
    Rules:
    - Only if approach_touch OR block_touch is missing
    - Max once per 7 days
    - Stops once both fields are filled
    """
    athlete = await db.athletes.find_one(
        {"user_id": user_id},
        {"_id": 0, "approach_touch": 1, "block_touch": 1},
    )
    if not athlete:
        return

    has_approach = bool(athlete.get("approach_touch"))
    has_block = bool(athlete.get("block_touch"))

    if has_approach and has_block:
        return

    one_week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    recent = await db.notifications.find_one({
        "user_id": user_id,
        "type": "measurables_nudge",
        "created_at": {"$gte": one_week_ago},
    })

    if recent:
        return

    missing = []
    if not has_approach:
        missing.append("approach touch")
    if not has_block:
        missing.append("block touch")

    await create_notification(
        tenant_id=tenant_id,
        user_id=user_id,
        notif_type="measurables_nudge",
        title="Improve your match accuracy",
        message=f"Add your {' and '.join(missing)} to get better school match scores.",
        action_url="/athlete-profile",
    )

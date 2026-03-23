"""
Support Messages — Internal coach ↔ athlete/helper communication.

Separate from school/recruiting email lane. CapyMatch is the source of truth.
Email notifications are pings only — replies happen in-app.
"""

import os
import uuid
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from db_client import db
from auth_middleware import get_current_user_dep
from services.ownership import can_access_athlete
from middleware.security import sanitize_text

log = logging.getLogger(__name__)
router = APIRouter(tags=["support-messages"])

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
RESEND_FROM = os.environ.get("RESEND_FROM_EMAIL", "noreply@capymatch.com")


# ─── Models ───────────────────────────────────────────────────

class SendMessage(BaseModel):
    athlete_id: str
    subject: str
    body: str
    recipient_ids: list[str] = []       # user IDs of recipients
    school_id: Optional[str] = None     # optional school context link
    thread_id: Optional[str] = None     # reply to existing thread
    attachments: list[dict] = []        # [{file_id, filename, content_type, size}]

class ReplyMessage(BaseModel):
    body: str
    attachments: list[dict] = []  # [{file_id, filename, content_type, size}]


# ─── Helpers ──────────────────────────────────────────────────

async def _send_email_notification(to_email: str, to_name: str, sender_name: str, subject: str, body: str):
    """Send a notification email via Resend. Fire-and-forget."""
    if not RESEND_API_KEY or RESEND_API_KEY.startswith("re_test"):
        log.info(f"Resend: skipping email (no key or test key) → {to_email}")
        return

    try:
        import resend
        resend.api_key = RESEND_API_KEY
        resend.Emails.send({
            "from": f"CapyMatch Notifications <{RESEND_FROM}>",
            "to": [to_email],
            "subject": f"[CapyMatch] {subject}",
            "html": f"""
                <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto;">
                    <p style="color: #475569; font-size: 14px;">
                        <strong>{sender_name}</strong> sent you a message on CapyMatch:
                    </p>
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
                        <p style="color: #1e293b; font-size: 14px; margin: 0; white-space: pre-wrap;">{body[:500]}</p>
                    </div>
                    <p style="color: #94a3b8; font-size: 12px;">
                        Reply in the CapyMatch app — this email is a notification only.
                    </p>
                </div>
            """,
        })
        log.info(f"Resend: notification sent to {to_email}")
    except Exception as e:
        log.warning(f"Resend: failed to send notification to {to_email}: {e}")


async def _get_user_email(user_id: str) -> tuple[str, str]:
    """Look up a user's email and name by user_id or athlete_id."""
    user = await db.users.find_one(
        {"$or": [{"id": user_id}, {"athlete_id": user_id}]},
        {"_id": 0, "email": 1, "name": 1, "first_name": 1, "last_name": 1},
    )
    if user:
        name = user.get("name") or f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()
        return user.get("email", ""), name
    # Try athletes collection
    athlete = await db.athletes.find_one({"id": user_id}, {"_id": 0, "email": 1, "full_name": 1})
    if athlete:
        return athlete.get("email", ""), athlete.get("full_name", "")
    return "", ""


# ─── Endpoints ────────────────────────────────────────────────

@router.post("/support-messages")
async def send_message(msg: SendMessage, current_user: dict = get_current_user_dep()):
    """Coach sends a support message. Creates or continues a thread."""
    if not can_access_athlete(current_user, msg.athlete_id):
        raise HTTPException(403, "You don't have access to this athlete")

    now = datetime.now(timezone.utc).isoformat()
    thread_id = msg.thread_id or str(uuid.uuid4())
    message_id = str(uuid.uuid4())

    # Build recipient list
    recipients = []
    for rid in msg.recipient_ids:
        email, name = await _get_user_email(rid)
        recipients.append({"id": rid, "name": name, "email": email})

    # If no explicit recipients, default to the athlete
    if not recipients:
        email, name = await _get_user_email(msg.athlete_id)
        recipients = [{"id": msg.athlete_id, "name": name, "email": email}]

    doc = {
        "id": message_id,
        "thread_id": thread_id,
        "athlete_id": msg.athlete_id,
        "school_id": msg.school_id,
        "sender_id": current_user["id"],
        "sender_name": current_user.get("name", "Coach"),
        "sender_role": current_user.get("role", "club_coach"),
        "recipients": [{"id": r["id"], "name": r["name"]} for r in recipients],
        "subject": sanitize_text(msg.subject),
        "body": sanitize_text(msg.body),
        "attachments": msg.attachments or [],
        "read_by": [current_user["id"]],
        "created_at": now,
    }
    await db.support_messages.insert_one(doc)
    doc.pop("_id", None)

    # Update thread metadata
    await db.support_threads.update_one(
        {"thread_id": thread_id},
        {"$set": {
            "thread_id": thread_id,
            "athlete_id": msg.athlete_id,
            "school_id": msg.school_id,
            "subject": msg.subject,
            "last_message_at": now,
            "last_sender_name": current_user.get("name", "Coach"),
            "last_snippet": msg.body[:120],
            "participant_ids": list({current_user["id"]} | {r["id"] for r in recipients}),
        },
        "$inc": {"message_count": 1},
        },
        upsert=True,
    )

    # Log to pod timeline
    await db.pod_action_events.insert_one({
        "id": str(uuid.uuid4()),
        "athlete_id": msg.athlete_id,
        "type": "support_message_sent",
        "description": f'{current_user.get("name", "Coach")} sent message: "{msg.subject}"',
        "actor": current_user.get("name", "Coach"),
        "message_id": message_id,
        "thread_id": thread_id,
        "created_at": now,
    })

    # Send email notifications (fire-and-forget)
    for r in recipients:
        if r.get("email") and r["id"] != current_user["id"]:
            await _send_email_notification(
                to_email=r["email"],
                to_name=r["name"],
                sender_name=current_user.get("name", "Your coach"),
                subject=msg.subject,
                body=msg.body,
            )

    # Auto-resolve follow_up_overdue issues
    from pod_issues import auto_resolve_on_outreach
    await auto_resolve_on_outreach(msg.athlete_id, current_user.get("name", "Coach"))

    return {
        "id": message_id,
        "thread_id": thread_id,
        "status": "sent",
        "recipients": [{"id": r["id"], "name": r["name"]} for r in recipients],
    }


@router.post("/support-messages/{thread_id}/reply")
async def reply_to_thread(thread_id: str, reply: ReplyMessage, current_user: dict = get_current_user_dep()):
    """Reply to an existing support message thread."""
    thread = await db.support_threads.find_one(
        {"$or": [{"thread_id": thread_id}, {"id": thread_id}]}, {"_id": 0}
    )
    if not thread:
        raise HTTPException(404, "Thread not found")

    # Normalize thread_id
    tid = thread.get("thread_id") or thread.get("id")

    # Verify user is a participant
    if current_user["id"] not in thread.get("participant_ids", []):
        # Also allow if user is linked to the athlete
        athlete_id = thread.get("athlete_id")
        user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "athlete_id": 1})
        if not (user and user.get("athlete_id") == athlete_id) and current_user["id"] != athlete_id:
            if not can_access_athlete(current_user, athlete_id):
                raise HTTPException(403, "Not a participant in this thread")

    now = datetime.now(timezone.utc).isoformat()
    message_id = str(uuid.uuid4())

    doc = {
        "id": message_id,
        "thread_id": thread_id,
        "athlete_id": thread.get("athlete_id"),
        "school_id": thread.get("school_id"),
        "sender_id": current_user["id"],
        "sender_name": current_user.get("name", "User"),
        "sender_role": current_user.get("role", "athlete"),
        "recipients": [],  # reply goes to all thread participants
        "subject": sanitize_text(f"Re: {thread.get('subject', '')}"),
        "body": sanitize_text(reply.body),
        "attachments": reply.attachments or [],
        "read_by": [current_user["id"]],
        "created_at": now,
    }
    await db.support_messages.insert_one(doc)
    doc.pop("_id", None)

    # Update thread
    await db.support_threads.update_one(
        {"$or": [{"thread_id": tid}, {"id": tid}]},
        {"$set": {
            "thread_id": tid,
            "last_message_at": now,
            "last_sender_name": current_user.get("name", "User"),
            "last_snippet": reply.body[:120],
        },
        "$inc": {"message_count": 1},
        "$addToSet": {"participant_ids": current_user["id"]},
        },
    )

    # Log to pod timeline
    athlete_id = thread.get("athlete_id")
    if athlete_id:
        await db.pod_action_events.insert_one({
            "id": str(uuid.uuid4()),
            "athlete_id": athlete_id,
            "type": "support_message_reply",
            "description": f'{current_user.get("name", "User")} replied to "{thread.get("subject", "")}"',
            "actor": current_user.get("name", "User"),
            "message_id": message_id,
            "thread_id": thread_id,
            "created_at": now,
        })

    # Send email notifications to other participants
    for pid in thread.get("participant_ids", []):
        if pid != current_user["id"]:
            email, name = await _get_user_email(pid)
            if email:
                await _send_email_notification(
                    to_email=email,
                    to_name=name,
                    sender_name=current_user.get("name", "Someone"),
                    subject=f"Re: {thread.get('subject', '')}",
                    body=reply.body,
                )

    return {"id": message_id, "thread_id": thread_id, "status": "sent"}


@router.get("/support-messages/inbox")
async def get_inbox(
    page: Optional[int] = Query(None, ge=1),
    page_size: Optional[int] = Query(None, ge=1, le=200),
    current_user: dict = get_current_user_dep(),
):
    """Get all support message threads for the current user."""
    user_id = current_user["id"]
    athlete_id = current_user.get("athlete_id")
    lookup_ids = [user_id]
    if athlete_id:
        lookup_ids.append(athlete_id)

    # For athlete users without athlete_id set, find their linked athlete by email
    if not athlete_id and current_user.get("role") in ("athlete", "parent"):
        from services.athlete_store import get_all as get_all_athletes
        user_email = current_user.get("email", "")
        for ath in await get_all_athletes():
            if ath.get("email") == user_email or ath.get("id") in user_email:
                lookup_ids.append(ath["id"])
                break
        # Also check athlete name match
        if len(lookup_ids) == 1:
            user_name = current_user.get("name", "")
            for ath in await get_all_athletes():
                if ath.get("full_name") == user_name:
                    lookup_ids.append(ath["id"])
                    break

    threads = await db.support_threads.find(
        {"$or": [
            {"participant_ids": {"$in": lookup_ids}},
            {"athlete_id": {"$in": lookup_ids}},
            {"created_by": {"$in": lookup_ids}},
        ]},
        {"_id": 0},
    ).sort("last_message_at", -1).to_list(100)

    # Get unread counts per thread
    for t in threads:
        tid = t.get("thread_id") or t.get("id")
        if not tid:
            t["unread_count"] = 0
            continue
        t["thread_id"] = tid
        unread = await db.support_messages.count_documents({
            "thread_id": tid,
            "read_by": {"$nin": lookup_ids},
        })
        t["unread_count"] = unread

    total_unread = sum(t["unread_count"] for t in threads)

    if page is not None:
        from services.pagination import paginate_list
        result = paginate_list(threads, page=page, page_size=page_size or 20)
        return {
            "threads": result["items"],
            "total_unread": total_unread,
            **{k: result[k] for k in ("total", "page", "page_size", "total_pages")},
        }

    return {
        "threads": threads,
        "total_unread": total_unread,
    }


@router.get("/support-messages/unread-count")
async def get_unread_count(current_user: dict = get_current_user_dep()):
    """Quick unread count for badge display."""
    user_id = current_user["id"]
    athlete_id = current_user.get("athlete_id")
    lookup_ids = [user_id]
    if athlete_id:
        lookup_ids.append(athlete_id)

    # For athlete users without athlete_id set, find their linked athlete
    if not athlete_id and current_user.get("role") in ("athlete", "parent"):
        from services.athlete_store import get_all as get_all_athletes
        user_email = current_user.get("email", "")
        user_name = current_user.get("name", "")
        for ath in await get_all_athletes():
            if ath.get("email") == user_email or ath.get("full_name") == user_name:
                lookup_ids.append(ath["id"])
                break

    # First find all thread IDs the user belongs to
    thread_filter = {"$or": [
        {"participant_ids": {"$in": lookup_ids}},
        {"athlete_id": {"$in": lookup_ids}},
        {"created_by": {"$in": lookup_ids}},
    ]}
    thread_ids = []
    async for t in db.support_threads.find(thread_filter, {"_id": 0, "thread_id": 1, "id": 1}):
        tid = t.get("thread_id") or t.get("id")
        if tid:
            thread_ids.append(tid)

    if not thread_ids:
        return {"unread_count": 0}

    count = await db.support_messages.count_documents({
        "thread_id": {"$in": thread_ids},
        "read_by": {"$nin": lookup_ids},
        "sender_id": {"$nin": lookup_ids},
    })
    return {"unread_count": count}


@router.get("/support-messages/thread/{thread_id}")
async def get_thread_messages(thread_id: str, current_user: dict = get_current_user_dep()):
    """Get all messages in a thread."""
    thread = await db.support_threads.find_one(
        {"$or": [{"thread_id": thread_id}, {"id": thread_id}]}, {"_id": 0}
    )
    if not thread:
        raise HTTPException(404, "Thread not found")

    # Normalize thread_id
    tid = thread.get("thread_id") or thread.get("id")
    thread["thread_id"] = tid

    messages = await db.support_messages.find(
        {"thread_id": tid},
        {"_id": 0},
    ).sort("created_at", 1).to_list(200)

    # Mark all as read by current user
    user_id = current_user["id"]
    await db.support_messages.update_many(
        {"thread_id": tid, "read_by": {"$ne": user_id}},
        {"$addToSet": {"read_by": user_id}},
    )

    return {
        "thread": thread,
        "messages": messages,
    }

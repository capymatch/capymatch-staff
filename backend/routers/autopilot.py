"""Autopilot — execute suggested actions with director approval.

Thin action layer: director clicks "Approve & Send" and the system
executes the pre-built action using existing flows.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException
from auth_middleware import get_current_user_dep
from db_client import db

router = APIRouter(tags=["autopilot"])


class AutopilotAction(BaseModel):
    action_type: str          # "check_in" | "follow_up" | "request_doc" | "assign_coach"
    athlete_id: str
    athlete_name: str
    school_name: Optional[str] = None
    message_body: Optional[str] = None   # pre-filled or edited


# Default templates
TEMPLATES = {
    "check_in": {
        "subject": "Quick check-in",
        "body": "Hi {first_name}, just checking in — wanted to see how things are going on your end. Let us know if there's anything you need.",
    },
    "follow_up": {
        "subject": "Following up",
        "body": "Hi {first_name}, just following up — would love to hear your thoughts. Let us know if you had a chance to review.",
    },
    "request_doc": {
        "subject": "Missing document needed",
        "body": "Hi {first_name}, we noticed a required document is still missing from your profile. Please upload it at your earliest convenience so we can keep things moving.",
    },
}


@router.post("/autopilot/execute")
async def execute_autopilot(action: AutopilotAction, current_user: dict = get_current_user_dep()):
    now = datetime.now(timezone.utc).isoformat()
    first_name = action.athlete_name.split(" ")[0]
    result = {"status": "completed", "action_type": action.action_type}

    if action.action_type in ("check_in", "follow_up", "request_doc"):
        tmpl = TEMPLATES.get(action.action_type, TEMPLATES["check_in"])
        subject = tmpl["subject"]
        body = action.message_body or tmpl["body"].format(first_name=first_name)
        thread_id = str(uuid.uuid4())
        message_id = str(uuid.uuid4())

        doc = {
            "id": message_id,
            "thread_id": thread_id,
            "athlete_id": action.athlete_id,
            "school_id": None,
            "sender_id": current_user["id"],
            "sender_name": current_user.get("name", "Director"),
            "sender_role": current_user.get("role", "director"),
            "recipients": [{"id": action.athlete_id, "name": action.athlete_name}],
            "subject": subject,
            "body": body,
            "read_by": [current_user["id"]],
            "created_at": now,
        }
        await db.support_messages.insert_one(doc)
        doc.pop("_id", None)

        # Update thread metadata
        await db.support_threads.update_one(
            {"id": thread_id},
            {"$set": {
                "id": thread_id,
                "thread_id": thread_id,
                "athlete_id": action.athlete_id,
                "subject": subject,
                "last_message_at": now,
                "last_sender_id": current_user["id"],
                "last_snippet": body[:80],
                "participant_ids": [current_user["id"], action.athlete_id],
                "created_by": current_user["id"],
                "created_at": now,
            }},
            upsert=True,
        )

        result["message"] = "Message sent"
        result["detail"] = f"Sent \"{subject}\" to {action.athlete_name}"

    elif action.action_type == "assign_coach":
        # For assign, we just log the intent — actual assignment needs coach selection
        result["message"] = "Redirecting to roster"
        result["redirect"] = "/roster"

    else:
        raise HTTPException(400, f"Unknown action type: {action.action_type}")

    # Log the autopilot action for audit
    await db.autopilot_log.insert_one({
        "id": str(uuid.uuid4()),
        "action_type": action.action_type,
        "athlete_id": action.athlete_id,
        "athlete_name": action.athlete_name,
        "school_name": action.school_name,
        "executed_by": current_user["id"],
        "executed_at": now,
        "result": result["message"],
    })

    return result

"""Director Actions — review requests and pipeline escalations.

Directors can request a coach review an athlete's pipeline or escalate
a pipeline as at-risk. Both follow a lightweight lifecycle:
open -> acknowledged -> resolved.

Notifications fire on create (-> coach), acknowledge (-> director),
and resolve (-> director).
"""

import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from db_client import db
from auth_middleware import get_current_user_dep
from services.athlete_store import get_by_id as get_athlete_by_id
from services.notifications import create_notification

router = APIRouter()
log = logging.getLogger(__name__)

# ── Preset reasons ──────────────────────────────

REVIEW_REASONS = {
    "pipeline_stalling": "Pipeline stalling",
    "high_value_recruit": "High-value recruit",
    "scholarship_deadline": "Scholarship deadline approaching",
    "needs_guidance": "Needs guidance",
    "other": "Other",
}

ESCALATION_REASONS = {
    "overdue_followups": "Overdue follow-ups",
    "no_responses": "No responses from schools",
    "momentum_drop": "Momentum drop",
    "deadline_risk": "Deadline risk",
    "other": "Other",
}

VALID_TYPES = {"review_request", "pipeline_escalation"}
VALID_STATUSES = {"open", "acknowledged", "resolved"}
VALID_RISK_LEVELS = {"warning", "critical"}


# ── Request / response models ───────────────────

class CreateActionRequest(BaseModel):
    type: str  # review_request | pipeline_escalation
    athlete_id: str
    coach_id: str
    reason: str
    note: Optional[str] = ""
    risk_level: Optional[str] = None  # warning | critical (escalation only)


class ResolveRequest(BaseModel):
    note: Optional[str] = ""
    notify_director: bool = True
    add_to_timeline: bool = True
    follow_up_title: Optional[str] = None


# ── Helpers ──────────────────────────────────────

def _get_reasons(action_type: str) -> dict:
    return REVIEW_REASONS if action_type == "review_request" else ESCALATION_REASONS


def _require_director(user: dict):
    if user["role"] not in ("director", "platform_admin"):
        raise HTTPException(403, "Only directors can perform this action.")


def _require_coach_or_director(user: dict):
    if user["role"] not in ("club_coach", "director", "platform_admin"):
        raise HTTPException(403, "Access denied.")


async def _get_user_name(user_id: str) -> str:
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "name": 1})
    return user["name"] if user else "Unknown"


# ── 1. Create action ────────────────────────────

@router.post("/director/actions")
async def create_director_action(
    data: CreateActionRequest,
    current_user: dict = get_current_user_dep(),
):
    _require_director(current_user)

    if data.type not in VALID_TYPES:
        raise HTTPException(400, f"Invalid type. Use: {', '.join(VALID_TYPES)}")

    reasons = _get_reasons(data.type)
    if data.reason not in reasons:
        raise HTTPException(400, f"Invalid reason. Use: {', '.join(reasons.keys())}")

    if data.type == "pipeline_escalation":
        if not data.risk_level or data.risk_level not in VALID_RISK_LEVELS:
            raise HTTPException(400, f"Escalations require risk_level: {', '.join(VALID_RISK_LEVELS)}")

    # Verify athlete exists
    athlete = get_athlete_by_id(data.athlete_id)
    if not athlete:
        raise HTTPException(404, "Athlete not found")

    # Verify coach exists
    coach = await db.users.find_one({"id": data.coach_id, "role": "club_coach"}, {"_id": 0, "name": 1, "id": 1})
    if not coach:
        raise HTTPException(404, "Coach not found")

    now = datetime.now(timezone.utc).isoformat()
    action_id = f"da_{uuid.uuid4().hex[:12]}"
    reason_label = reasons[data.reason]

    doc = {
        "action_id": action_id,
        "type": data.type,
        "status": "open",
        "director_id": current_user["id"],
        "coach_id": data.coach_id,
        "athlete_id": data.athlete_id,
        "org_id": current_user.get("org_id"),
        "reason": data.reason,
        "reason_label": reason_label,
        "note": (data.note or "").strip()[:300],
        "risk_level": data.risk_level if data.type == "pipeline_escalation" else None,
        "director_name": current_user.get("name", "Director"),
        "coach_name": coach["name"],
        "athlete_name": athlete.get("full_name") or athlete.get("first_name", "Athlete"),
        "created_at": now,
        "acknowledged_at": None,
        "resolved_at": None,
        "resolved_note": None,
    }

    await db.director_actions.insert_one(doc)
    doc.pop("_id", None)

    # Notify coach
    type_label = "Review Request" if data.type == "review_request" else "Pipeline Escalation"
    risk_tag = f" [{data.risk_level.upper()}]" if data.risk_level else ""
    athlete_name = doc["athlete_name"]
    tenant_id = athlete.get("tenant_id") or current_user.get("org_id") or ""

    if tenant_id:
        await create_notification(
            tenant_id,
            data.coach_id,
            "director_action",
            f"{type_label}{risk_tag}: {athlete_name}",
            f"{reason_label}" + (f" — {data.note.strip()}" if data.note and data.note.strip() else ""),
            "",
        )

    log.info(f"Director action created: {action_id} ({data.type}) for athlete {data.athlete_id}")

    return {
        "action_id": action_id,
        "message": f"{type_label} created for {athlete_name}",
        "type": data.type,
        "status": "open",
    }


# ── 2. List actions ─────────────────────────────

@router.get("/director/actions")
async def list_director_actions(
    status: Optional[str] = None,
    current_user: dict = get_current_user_dep(),
):
    _require_coach_or_director(current_user)

    query = {}
    org_id = current_user.get("org_id")

    if current_user["role"] == "director" or current_user["role"] == "platform_admin":
        if org_id:
            query["org_id"] = org_id
    elif current_user["role"] == "club_coach":
        query["coach_id"] = current_user["id"]

    if status and status in VALID_STATUSES:
        query["status"] = status

    actions = await db.director_actions.find(
        query, {"_id": 0}
    ).sort([
        ("status", 1),  # open first, then acknowledged, then resolved
        ("created_at", -1),
    ]).to_list(200)

    # Reorder: open + acknowledged first for coach views
    open_ack = [a for a in actions if a["status"] in ("open", "acknowledged")]
    resolved = [a for a in actions if a["status"] == "resolved"]
    ordered = open_ack + resolved

    # Compute summary
    all_actions = await db.director_actions.find(
        {k: v for k, v in query.items() if k != "status"}, {"_id": 0, "status": 1, "risk_level": 1, "resolved_at": 1}
    ).to_list(500)

    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    summary = {
        "total_open": sum(1 for a in all_actions if a["status"] == "open"),
        "open_critical": sum(1 for a in all_actions if a["status"] == "open" and a.get("risk_level") == "critical"),
        "open_warning": sum(1 for a in all_actions if a["status"] == "open" and a.get("risk_level") == "warning"),
        "acknowledged": sum(1 for a in all_actions if a["status"] == "acknowledged"),
        "resolved_recently": sum(1 for a in all_actions if a["status"] == "resolved" and (a.get("resolved_at") or "") >= seven_days_ago),
    }

    return {"actions": ordered, "summary": summary, "total": len(ordered)}


# ── 3. Actions for a specific athlete ───────────

@router.get("/director/actions/athlete/{athlete_id}")
async def get_athlete_actions(
    athlete_id: str,
    current_user: dict = get_current_user_dep(),
):
    _require_coach_or_director(current_user)

    query = {"athlete_id": athlete_id}

    if current_user["role"] == "club_coach":
        query["coach_id"] = current_user["id"]

    actions = await db.director_actions.find(
        query, {"_id": 0}
    ).sort([("status", 1), ("created_at", -1)]).to_list(50)

    open_ack = [a for a in actions if a["status"] in ("open", "acknowledged")]
    resolved = [a for a in actions if a["status"] == "resolved"]

    return {"actions": open_ack + resolved, "total": len(actions)}


# ── 4. Acknowledge ──────────────────────────────

@router.post("/director/actions/{action_id}/acknowledge")
async def acknowledge_action(
    action_id: str,
    current_user: dict = get_current_user_dep(),
):
    _require_coach_or_director(current_user)

    action = await db.director_actions.find_one(
        {"action_id": action_id}, {"_id": 0}
    )
    if not action:
        raise HTTPException(404, "Action not found")

    # Only the assigned coach (or director/admin) can acknowledge
    if current_user["role"] == "club_coach" and action["coach_id"] != current_user["id"]:
        raise HTTPException(403, "You can only acknowledge actions assigned to you.")

    if action["status"] != "open":
        raise HTTPException(400, f"Action is already {action['status']}.")

    now = datetime.now(timezone.utc).isoformat()
    coach_name = current_user.get("name", "Coach")

    await db.director_actions.update_one(
        {"action_id": action_id},
        {"$set": {
            "status": "acknowledged",
            "acknowledged_at": now,
            "acknowledged_by": coach_name,
        }},
    )

    # Audit entry in pod timeline
    athlete_id = action.get("athlete_id", "")
    if athlete_id:
        type_label = "Review Request" if action["type"] == "review_request" else "Escalation"
        await db.pod_action_events.insert_one({
            "id": str(uuid.uuid4()),
            "athlete_id": athlete_id,
            "type": "action_updated",
            "description": f"Acknowledged: {action.get('reason_label', type_label)}",
            "actor": coach_name,
            "action_id": action_id,
            "created_at": now,
        })

    # Notify director
    tenant_id = action.get("org_id") or ""
    if tenant_id and action.get("director_id"):
        type_label = "Review Request" if action["type"] == "review_request" else "Escalation"
        await create_notification(
            tenant_id,
            action["director_id"],
            "action_acknowledged",
            f"{coach_name} acknowledged {type_label}",
            f"Re: {action['athlete_name']} — {action['reason_label']}",
            "",
        )

    log.info(f"Action {action_id} acknowledged by {current_user['id']}")
    return {"message": "Action acknowledged", "action_id": action_id, "status": "acknowledged"}


# ── 5. Resolve ──────────────────────────────────

@router.post("/director/actions/{action_id}/resolve")
async def resolve_action(
    action_id: str,
    body: ResolveRequest = ResolveRequest(),
    current_user: dict = get_current_user_dep(),
):
    _require_coach_or_director(current_user)

    action = await db.director_actions.find_one(
        {"action_id": action_id}, {"_id": 0}
    )
    if not action:
        raise HTTPException(404, "Action not found")

    if current_user["role"] == "club_coach" and action["coach_id"] != current_user["id"]:
        raise HTTPException(403, "You can only resolve actions assigned to you.")

    if action["status"] == "resolved":
        raise HTTPException(400, "Action is already resolved.")

    now = datetime.now(timezone.utc).isoformat()
    resolved_note = (body.note or "").strip()[:500]

    await db.director_actions.update_one(
        {"action_id": action_id},
        {"$set": {
            "status": "resolved",
            "resolved_at": now,
            "resolved_note": resolved_note,
            "resolved_by": current_user.get("name", "Unknown"),
        }},
    )

    athlete_id = action.get("athlete_id", "")
    coach_name = current_user.get("name", "Coach")
    type_label = "Review Request" if action["type"] == "review_request" else "Escalation"

    # Log resolution in athlete's pod timeline
    if body.add_to_timeline and athlete_id:
        await db.pod_action_events.insert_one({
            "id": str(uuid.uuid4()),
            "athlete_id": athlete_id,
            "type": "resolution",
            "description": f"Resolved: {action.get('reason_label', type_label)}",
            "resolution_note": resolved_note,
            "resolved_by": coach_name,
            "actor": coach_name,
            "action_id": action_id,
            "created_at": now,
        })

    # Notify director
    tenant_id = action.get("org_id") or ""
    if body.notify_director and tenant_id and action.get("director_id"):
        await create_notification(
            tenant_id,
            action["director_id"],
            "action_resolved",
            f"{coach_name} resolved {type_label}",
            f"Re: {action['athlete_name']} — {action['reason_label']}"
            + (f"\nNote: {resolved_note}" if resolved_note else ""),
            "",
        )

    # Create follow-up task (optional)
    follow_up_id = None
    if body.follow_up_title and athlete_id:
        follow_up_id = str(uuid.uuid4())
        seven_days = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        await db.pod_actions.insert_one({
            "id": follow_up_id,
            "athlete_id": athlete_id,
            "title": body.follow_up_title.strip()[:200],
            "owner": coach_name,
            "status": "ready",
            "due_date": seven_days,
            "source_category": "follow_up",
            "is_suggested": False,
            "created_at": now,
            "completed_at": None,
        })

    log.info(f"Action {action_id} resolved by {current_user['id']}")

    from services.athlete_store import recompute_derived_data
    await recompute_derived_data()

    return {
        "message": "Action resolved",
        "action_id": action_id,
        "status": "resolved",
        "follow_up_id": follow_up_id,
    }

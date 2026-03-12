"""Support Pods — treatment and coordination environment."""

from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone, timedelta
import uuid
from db_client import db
from auth_middleware import get_current_user_dep
from services.ownership import can_access_athlete
from models import ActionCreate, ActionUpdate, ResolveIssue
from support_pod import (
    get_athlete as sp_get_athlete,
    get_athlete_interventions,
    generate_pod_members,
    generate_suggested_actions,
    calculate_pod_health,
    get_relevant_events,
    enrich_members_with_tasks,
    generate_recruiting_timeline,
    generate_recruiting_signals,
    get_intervention_playbook,
)

router = APIRouter()


@router.get("/support-pods/{athlete_id}")
async def get_support_pod(athlete_id: str, context: str = None, current_user: dict = get_current_user_dep()):
    """Get full Support Pod data for an athlete"""
    if not can_access_athlete(current_user, athlete_id):
        raise HTTPException(status_code=403, detail="You don't have access to this athlete")
    athlete = sp_get_athlete(athlete_id)
    if not athlete:
        return {"error": "Athlete not found"}

    interventions = get_athlete_interventions(athlete_id)
    members = generate_pod_members(athlete)

    # Merge saved actions (DB) with suggested actions (from interventions)
    saved_actions = await db.pod_actions.find({"athlete_id": athlete_id}, {"_id": 0}).to_list(100)
    suggested = generate_suggested_actions(athlete_id, interventions)
    saved_ids = {a["id"] for a in saved_actions}
    all_actions = saved_actions + [s for s in suggested if s["id"] not in saved_ids]

    members = enrich_members_with_tasks(members, all_actions)

    # Get timeline data
    notes = await db.athlete_notes.find({"athlete_id": athlete_id}, {"_id": 0}).to_list(100)
    assignments = await db.assignments.find({"athlete_id": athlete_id}, {"_id": 0}).to_list(100)
    messages = await db.messages.find({"athlete_id": athlete_id}, {"_id": 0}).to_list(100)
    resolutions = await db.pod_resolutions.find({"athlete_id": athlete_id}, {"_id": 0}).to_list(100)
    action_events = await db.pod_action_events.find({"athlete_id": athlete_id}, {"_id": 0}).to_list(100)

    # Determine active intervention for banner
    active_intervention = None
    if context:
        active_intervention = next((i for i in interventions if i["category"] == context), None)
    if not active_intervention and interventions:
        active_intervention = interventions[0]

    pod_health = calculate_pod_health(athlete, members, all_actions)
    events = get_relevant_events(athlete)

    unassigned = [a for a in all_actions if a.get("owner") in ("Unassigned", None, "") and a.get("status") != "completed"]

    # New V2 fields
    recruiting_timeline = generate_recruiting_timeline(athlete)
    recruiting_signals = generate_recruiting_signals(athlete, interventions, events)
    playbook = None
    if active_intervention:
        playbook = get_intervention_playbook(active_intervention.get("category"))

    return {
        "athlete": {k: v for k, v in athlete.items() if k != "archetype"},
        "active_intervention": active_intervention,
        "all_interventions": interventions,
        "pod_members": members,
        "actions": all_actions,
        "unassigned_count": len(unassigned),
        "timeline": {
            "notes": notes,
            "assignments": assignments,
            "messages": messages,
            "resolutions": resolutions,
            "action_events": action_events,
        },
        "pod_health": pod_health,
        "upcoming_events": events,
        "recruiting_timeline": recruiting_timeline,
        "recruiting_signals": recruiting_signals,
        "intervention_playbook": playbook,
    }


@router.post("/support-pods/{athlete_id}/actions")
async def create_pod_action(athlete_id: str, action: ActionCreate, current_user: dict = get_current_user_dep()):
    if not can_access_athlete(current_user, athlete_id):
        raise HTTPException(status_code=403, detail="You don't have access to this athlete")
    """Create a new action item in the pod"""
    now = datetime.now(timezone.utc).isoformat()
    athlete = sp_get_athlete(athlete_id) or {}
    athlete_name = athlete.get("full_name", "Unknown Athlete")
    doc = {
        "id": str(uuid.uuid4()),
        "athlete_id": athlete_id,
        "title": action.title,
        "owner": action.owner,
        "owner_role": action.owner_role,
        "status": "ready",
        "due_date": action.due_date or (datetime.now(timezone.utc) + timedelta(days=3)).isoformat(),
        "source": "manual",
        "source_category": action.source_category,
        "notes": action.notes,
        "created_by": current_user["name"],
        "created_at": now,
        "is_suggested": False,
        "completed_at": None,
    }
    await db.pod_actions.insert_one(doc)
    doc.pop("_id", None)

    event = {
        "id": str(uuid.uuid4()),
        "athlete_id": athlete_id,
        "type": "action_created",
        "description": f"Created action: {action.title}",
        "actor": current_user["name"],
        "created_at": now,
    }
    await db.pod_action_events.insert_one(event)

    # In-app notification for the assigned person
    notif = {
        "id": str(uuid.uuid4()),
        "type": "action_assigned",
        "recipient_name": action.owner,
        "recipient_role": action.owner_role,
        "athlete_id": athlete_id,
        "athlete_name": athlete_name,
        "action_title": action.title,
        "due_date": doc["due_date"],
        "assigned_by": current_user["name"],
        "read": False,
        "created_at": now,
    }
    await db.notifications.insert_one(notif)

    # Fire email notification (non-blocking)
    try:
        from services.email import send_action_notification_email
        import asyncio
        asyncio.create_task(send_action_notification_email(
            assignee_name=action.owner,
            athlete_name=athlete_name,
            action_title=action.title,
            due_date=doc["due_date"],
            assigned_by=current_user["name"],
        ))
    except Exception:
        pass  # Email is best-effort

    return doc


@router.patch("/support-pods/{athlete_id}/actions/{action_id}")
async def update_pod_action(athlete_id: str, action_id: str, update: ActionUpdate, current_user: dict = get_current_user_dep()):
    if not can_access_athlete(current_user, athlete_id):
        raise HTTPException(status_code=403, detail="You don't have access to this athlete")
    """Update an action (complete, reassign, change status)"""
    update_dict = {}
    event_desc = ""

    if update.status:
        update_dict["status"] = update.status
        if update.status == "completed":
            update_dict["completed_at"] = datetime.now(timezone.utc).isoformat()
            event_desc = "Completed action"
        else:
            event_desc = f"Status changed to {update.status}"

    if update.owner:
        update_dict["owner"] = update.owner
        event_desc = f"Reassigned to {update.owner}"

    existing = await db.pod_actions.find_one({"id": action_id, "athlete_id": athlete_id})

    if existing:
        await db.pod_actions.update_one({"id": action_id}, {"$set": update_dict})
    else:
        from support_pod import get_athlete_interventions, generate_suggested_actions
        suggested = generate_suggested_actions(athlete_id, get_athlete_interventions(athlete_id))
        original = next((s for s in suggested if s["id"] == action_id), {})
        doc = {
            **original,
            "id": action_id,
            "athlete_id": athlete_id,
            **update_dict,
            "is_suggested": False,
        }
        await db.pod_actions.insert_one(doc)

    if event_desc:
        event = {
            "id": str(uuid.uuid4()),
            "athlete_id": athlete_id,
            "type": "action_updated",
            "description": event_desc,
            "actor": current_user["name"],
            "action_id": action_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.pod_action_events.insert_one(event)

    result = await db.pod_actions.find_one({"id": action_id}, {"_id": 0})
    return result or {"id": action_id, **update_dict}


@router.post("/support-pods/{athlete_id}/resolve")
async def resolve_issue(athlete_id: str, body: ResolveIssue, current_user: dict = get_current_user_dep()):
    if not can_access_athlete(current_user, athlete_id):
        raise HTTPException(status_code=403, detail="You don't have access to this athlete")
    """Resolve an active issue"""
    doc = {
        "id": str(uuid.uuid4()),
        "athlete_id": athlete_id,
        "category": body.category,
        "resolution_note": body.resolution_note or f"Resolved {body.category} issue",
        "resolved_by": current_user["name"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.pod_resolutions.insert_one(doc)
    doc.pop("_id", None)
    return doc



@router.post("/support-pods/{athlete_id}/escalate")
async def escalate_to_director(athlete_id: str, body: dict, current_user: dict = get_current_user_dep()):
    """Coach escalation — creates a director action item."""
    if not can_access_athlete(current_user, athlete_id):
        raise HTTPException(status_code=403, detail="You don't have access to this athlete")

    now = datetime.now(timezone.utc).isoformat()
    action_id = f"da_{uuid.uuid4().hex[:12]}"
    athlete = sp_get_athlete(athlete_id) or {}
    athlete_name = body.get("athlete_name") or athlete.get("full_name", "Unknown")

    doc = {
        "action_id": action_id,
        "type": "coach_escalation",
        "status": "open",
        "coach_id": current_user.get("id"),
        "coach_name": current_user.get("name", "Coach"),
        "athlete_id": athlete_id,
        "athlete_name": athlete_name,
        "org_id": current_user.get("org_id"),
        "reason": body.get("reason", "other"),
        "reason_label": body.get("title", "Coach escalation"),
        "note": (body.get("description", "") or "")[:500],
        "urgency": body.get("urgency", "medium"),
        "source": "coach_escalation",
        "created_at": now,
        "acknowledged_at": None,
        "resolved_at": None,
    }
    await db.director_actions.insert_one(doc)
    doc.pop("_id", None)
    return doc

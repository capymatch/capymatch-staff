"""Athletes — athlete listing, quick actions, timeline."""

from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
import uuid
from db_client import db
from auth_middleware import get_current_user_dep
from services.ownership import get_visible_athlete_ids, can_access_athlete
from services.athlete_store import get_all as get_athletes, get_by_id as get_athlete_by_id
from models import NoteCreate, AssignCreate, MessageCreate

router = APIRouter()


@router.get("/athletes")
async def get_all_athletes(current_user: dict = get_current_user_dep()):
    visible = get_visible_athlete_ids(current_user)
    return [a for a in await get_athletes() if a["id"] in visible]


@router.get("/athletes/{athlete_id}")
async def get_athlete(athlete_id: str, current_user: dict = get_current_user_dep()):
    if not can_access_athlete(current_user, athlete_id):
        raise HTTPException(status_code=403, detail="You don't have access to this athlete")
    athlete = await get_athlete_by_id(athlete_id)
    if not athlete:
        return {"error": "Athlete not found"}
    return athlete


@router.post("/athletes/{athlete_id}/notes")
async def create_note(athlete_id: str, note: NoteCreate, current_user: dict = get_current_user_dep()):
    if not can_access_athlete(current_user, athlete_id):
        raise HTTPException(status_code=403, detail="You don't have access to this athlete")
    """Log a quick note to an athlete's timeline"""
    valid_categories = {"recruiting", "event", "parent", "follow-up", "other"}
    category = (note.category or "other").lower().strip()
    if category not in valid_categories:
        category = "other"

    doc = {
        "id": str(uuid.uuid4()),
        "athlete_id": athlete_id,
        "author": current_user["name"],
        "created_by": current_user["id"],
        "created_by_name": current_user["name"],
        "text": note.text,
        "tag": note.tag,
        "category": category,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.athlete_notes.insert_one(doc)
    doc.pop("_id", None)

    # Auto-resolve system-generated tasks when coach logs an interaction
    now_iso = datetime.now(timezone.utc).isoformat()

    # 1. Resolve DB-persisted system tasks
    system_tasks = await db.pod_actions.find({
        "athlete_id": athlete_id,
        "status": {"$in": ["ready", "open", "overdue"]},
        "source": {"$in": ["system", "intervention"]},
    }).to_list(50)
    for task in system_tasks:
        await db.pod_actions.update_one(
            {"id": task["id"]},
            {"$set": {
                "status": "completed",
                "completed_at": now_iso,
                "completed_by": "System (auto-resolved)",
            }},
        )
        await db.pod_action_events.insert_one({
            "id": str(uuid.uuid4()),
            "athlete_id": athlete_id,
            "type": "action_completed",
            "description": f'Auto-resolved "{task.get("title", "")}" — coach logged interaction',
            "actor": "System",
            "action_id": task["id"],
            "created_at": now_iso,
        })

    # 2. Materialize and resolve suggested (non-persisted) system actions
    from support_pod import get_athlete_interventions, generate_suggested_actions
    interventions = await get_athlete_interventions(athlete_id)
    suggested = generate_suggested_actions(athlete_id, interventions)
    saved_ids = {t["id"] for t in system_tasks}
    all_saved = await db.pod_actions.find({"athlete_id": athlete_id}, {"_id": 0, "id": 1}).to_list(200)
    all_saved_ids = {a["id"] for a in all_saved}

    for s_action in suggested:
        if s_action["id"] not in all_saved_ids and s_action.get("status") in ("ready", "open", "overdue"):
            completed_doc = {
                **s_action,
                "status": "completed",
                "completed_at": now_iso,
                "completed_by": "System (auto-resolved)",
                "is_suggested": False,
            }
            await db.pod_actions.insert_one(completed_doc)
            completed_doc.pop("_id", None)
            await db.pod_action_events.insert_one({
                "id": str(uuid.uuid4()),
                "athlete_id": athlete_id,
                "type": "action_completed",
                "description": f'Auto-resolved "{s_action.get("title", "")}" — coach logged interaction',
                "actor": "System",
                "action_id": s_action["id"],
                "created_at": now_iso,
            })

    # 3. Auto-resolve pod issues (issue lifecycle)
    from pod_issues import auto_resolve_on_interaction
    await auto_resolve_on_interaction(athlete_id, current_user.get("name", "Coach"))

    return doc


@router.post("/athletes/{athlete_id}/assign")
async def assign_owner(athlete_id: str, assignment: AssignCreate, current_user: dict = get_current_user_dep()):
    if not can_access_athlete(current_user, athlete_id):
        raise HTTPException(status_code=403, detail="You don't have access to this athlete")
    """Reassign intervention owner"""
    doc = {
        "id": str(uuid.uuid4()),
        "athlete_id": athlete_id,
        "previous_owner": current_user["name"],
        "new_owner": assignment.new_owner,
        "reason": assignment.reason,
        "intervention_category": assignment.intervention_category,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.assignments.insert_one(doc)
    doc.pop("_id", None)
    from services.athlete_store import recompute_derived_data
    await recompute_derived_data()
    return doc


@router.post("/athletes/{athlete_id}/messages")
async def send_message(athlete_id: str, message: MessageCreate, current_user: dict = get_current_user_dep()):
    if not can_access_athlete(current_user, athlete_id):
        raise HTTPException(status_code=403, detail="You don't have access to this athlete")
    """Send a quick message/update"""
    doc = {
        "id": str(uuid.uuid4()),
        "athlete_id": athlete_id,
        "sender": current_user["name"],
        "recipient": message.recipient,
        "text": message.text,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.messages.insert_one(doc)
    doc.pop("_id", None)

    # Auto-resolve follow-up/engagement issues when outreach is sent
    from pod_issues import auto_resolve_on_outreach
    await auto_resolve_on_outreach(athlete_id, current_user.get("name", "Coach"))

    from services.athlete_store import recompute_derived_data
    await recompute_derived_data()

    return doc


@router.get("/athletes/{athlete_id}/timeline")
async def get_athlete_timeline(athlete_id: str, current_user: dict = get_current_user_dep()):
    if not can_access_athlete(current_user, athlete_id):
        raise HTTPException(status_code=403, detail="You don't have access to this athlete")
    """Get all notes, assignments, messages for an athlete"""
    notes = await db.athlete_notes.find({"athlete_id": athlete_id}, {"_id": 0}).to_list(100)
    assignments = await db.assignments.find({"athlete_id": athlete_id}, {"_id": 0}).to_list(100)
    messages = await db.messages.find({"athlete_id": athlete_id}, {"_id": 0}).to_list(100)
    return {"notes": notes, "assignments": assignments, "messages": messages}


@router.get("/athletes/{athlete_id}/notes")
async def get_athlete_notes(athlete_id: str, current_user: dict = get_current_user_dep()):
    if not can_access_athlete(current_user, athlete_id):
        raise HTTPException(status_code=403, detail="You don't have access to this athlete")
    notes = await db.athlete_notes.find(
        {"athlete_id": athlete_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return {"notes": notes}


@router.delete("/athletes/{athlete_id}/notes/{note_id}")
async def delete_athlete_note(athlete_id: str, note_id: str, current_user: dict = get_current_user_dep()):
    if not can_access_athlete(current_user, athlete_id):
        raise HTTPException(status_code=403, detail="You don't have access to this athlete")
    result = await db.athlete_notes.delete_one({"id": note_id, "athlete_id": athlete_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Note not found")
    return {"deleted": True}


@router.patch("/athletes/{athlete_id}/notes/{note_id}")
async def update_athlete_note(athlete_id: str, note_id: str, body: dict, current_user: dict = get_current_user_dep()):
    if not can_access_athlete(current_user, athlete_id):
        raise HTTPException(status_code=403, detail="You don't have access to this athlete")
    update = {}
    if "text" in body:
        update["text"] = body["text"][:500]
    if not update:
        raise HTTPException(400, "Nothing to update")
    result = await db.athlete_notes.update_one({"id": note_id, "athlete_id": athlete_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(404, "Note not found")
    return {"updated": True}

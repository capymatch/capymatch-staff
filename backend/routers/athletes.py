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
    return [a for a in get_athletes() if a["id"] in visible]


@router.get("/athletes/{athlete_id}")
async def get_athlete(athlete_id: str, current_user: dict = get_current_user_dep()):
    if not can_access_athlete(current_user, athlete_id):
        raise HTTPException(status_code=403, detail="You don't have access to this athlete")
    athlete = get_athlete_by_id(athlete_id)
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

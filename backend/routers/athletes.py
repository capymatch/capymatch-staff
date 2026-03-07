"""Athletes — athlete listing, quick actions, timeline."""

from fastapi import APIRouter
from datetime import datetime, timezone
import uuid
from db_client import db
from auth_middleware import get_current_user_dep
from mock_data import ATHLETES
from models import NoteCreate, AssignCreate, MessageCreate

router = APIRouter()


@router.get("/athletes")
async def get_all_athletes(current_user: dict = get_current_user_dep()):
    return ATHLETES


@router.get("/athletes/{athlete_id}")
async def get_athlete(athlete_id: str, current_user: dict = get_current_user_dep()):
    athlete = next((a for a in ATHLETES if a["id"] == athlete_id), None)
    if not athlete:
        return {"error": "Athlete not found"}
    return athlete


@router.post("/athletes/{athlete_id}/notes")
async def create_note(athlete_id: str, note: NoteCreate, current_user: dict = get_current_user_dep()):
    """Log a quick note to an athlete's timeline"""
    doc = {
        "id": str(uuid.uuid4()),
        "athlete_id": athlete_id,
        "author": "Coach Martinez",
        "text": note.text,
        "tag": note.tag,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.athlete_notes.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.post("/athletes/{athlete_id}/assign")
async def assign_owner(athlete_id: str, assignment: AssignCreate, current_user: dict = get_current_user_dep()):
    """Reassign intervention owner"""
    doc = {
        "id": str(uuid.uuid4()),
        "athlete_id": athlete_id,
        "previous_owner": "Coach Martinez",
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
    """Send a quick message/update"""
    doc = {
        "id": str(uuid.uuid4()),
        "athlete_id": athlete_id,
        "sender": "Coach Martinez",
        "recipient": message.recipient,
        "text": message.text,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.messages.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.get("/athletes/{athlete_id}/timeline")
async def get_athlete_timeline(athlete_id: str, current_user: dict = get_current_user_dep()):
    """Get all notes, assignments, messages for an athlete"""
    notes = await db.athlete_notes.find({"athlete_id": athlete_id}, {"_id": 0}).to_list(100)
    assignments = await db.assignments.find({"athlete_id": athlete_id}, {"_id": 0}).to_list(100)
    messages = await db.messages.find({"athlete_id": athlete_id}, {"_id": 0}).to_list(100)
    return {"notes": notes, "assignments": assignments, "messages": messages}

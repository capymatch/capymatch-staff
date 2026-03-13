"""Event Mode — capture, prep, live, summary, routing, schools."""

from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone, timedelta
import uuid
from db_client import db
from auth_middleware import get_current_user_dep
from services.ownership import filter_events_by_ownership, get_visible_athlete_ids
from mock_data import UPCOMING_EVENTS, SCHOOLS
from models import EventNoteCreate, EventNoteUpdate, EventCreate, EventAthleteAdd
from event_engine import (
    get_event,
    get_all_events,
    get_event_prep,
    toggle_checklist_item,
    capture_note,
    update_note,
    get_event_summary,
    route_note_to_pod,
    bulk_route_to_pods,
)

router = APIRouter()


async def _find_program_id(athlete_id: str, school_name: str):
    """Look up the program_id for an athlete+school combo."""
    if not school_name:
        return None
    # athlete_id → user → tenant_id → programs
    user = await db.users.find_one({"athlete_id": athlete_id}, {"_id": 0, "id": 1})
    if user:
        tenant_id = f"tenant-{user['id']}"
        program = await db.programs.find_one(
            {"tenant_id": tenant_id, "university_name": {"$regex": school_name, "$options": "i"}},
            {"_id": 0, "program_id": 1}
        )
        if program:
            return program["program_id"]
    # Fallback: try program_metrics which has athlete_id directly
    metric = await db.program_metrics.find_one({"athlete_id": athlete_id}, {"_id": 0, "program_id": 1})
    if metric:
        program = await db.programs.find_one(
            {"program_id": metric["program_id"]},
            {"_id": 0, "program_id": 1, "university_name": 1}
        )
        if program and school_name.lower() in program.get("university_name", "").lower():
            return program["program_id"]
    return None


@router.get("/events")
async def list_events(team: str = None, type: str = None, current_user: dict = get_current_user_dep()):
    """Get all events, filtered by coach's athletes."""
    result = get_all_events(team_filter=team, type_filter=type)
    if current_user["role"] == "director":
        return result
    # Filter both upcoming and past lists
    result["upcoming"] = filter_events_by_ownership(result.get("upcoming", []), current_user)
    result["past"] = filter_events_by_ownership(result.get("past", []), current_user)
    return result


@router.get("/events/{event_id}")
async def get_event_detail(event_id: str, current_user: dict = get_current_user_dep()):
    """Get single event detail"""
    event = get_event(event_id)
    if not event:
        return {"error": "Event not found"}
    return {k: v for k, v in event.items() if k != "capturedNotes"}


@router.post("/events")
async def create_event(body: EventCreate, current_user: dict = get_current_user_dep()):
    """Create a new event"""
    from datetime import datetime as dt
    try:
        event_date = dt.fromisoformat(body.date.replace("Z", "+00:00"))
    except Exception:
        event_date = datetime.now(timezone.utc) + timedelta(days=7)

    days_away = (event_date - datetime.now(timezone.utc)).days
    new_event = {
        "id": f"event_{str(uuid.uuid4())[:8]}",
        "name": body.name,
        "type": body.type,
        "date": event_date.isoformat(),
        "daysAway": days_away,
        "location": body.location,
        "expectedSchools": body.expectedSchools,
        "prepStatus": "not_started",
        "status": "upcoming" if days_away >= 0 else "past",
        "athlete_ids": [],
        "school_ids": [],
        "checklist": [
            {"id": "check_1", "label": "Confirm athlete attendance", "completed": False},
            {"id": "check_2", "label": "Identify target school coaches attending", "completed": False},
            {"id": "check_3", "label": "Review highlight reels", "completed": False},
            {"id": "check_4", "label": "Prepare talking points for athlete-school pairs", "completed": False},
            {"id": "check_5", "label": "Confirm travel/logistics", "completed": False},
        ],
        "capturedNotes": [],
        "summaryStatus": None,
        "athleteCount": 0,
    }
    UPCOMING_EVENTS.append(new_event)

    # Persist to MongoDB (without capturedNotes)
    await db.events.insert_one(
        {k: v for k, v in new_event.items() if k != "capturedNotes"}
    )

    return {k: v for k, v in new_event.items() if k != "capturedNotes"}


@router.get("/events/{event_id}/prep")
async def get_prep_data(event_id: str, current_user: dict = get_current_user_dep()):
    """Get prep data: athletes, schools, checklist, blockers"""
    result = get_event_prep(event_id)
    if not result:
        return {"error": "Event not found"}
    return result


@router.patch("/events/{event_id}/checklist/{item_id}")
async def toggle_checklist(event_id: str, item_id: str, current_user: dict = get_current_user_dep()):
    """Toggle a prep checklist item"""
    result = toggle_checklist_item(event_id, item_id)
    if not result:
        return {"error": "Item not found"}

    # Persist checklist + prepStatus to MongoDB
    event = get_event(event_id)
    if event:
        await db.events.update_one(
            {"id": event_id},
            {"$set": {
                "checklist": event.get("checklist", []),
                "prepStatus": event.get("prepStatus", "not_started"),
            }}
        )

    return result


@router.post("/events/{event_id}/athletes")
async def add_event_athlete(event_id: str, body: EventAthleteAdd, current_user: dict = get_current_user_dep()):
    """Add an athlete to an event roster"""
    event = get_event(event_id)
    if not event:
        return {"error": "Event not found"}
    if body.athlete_id not in event["athlete_ids"]:
        event["athlete_ids"].append(body.athlete_id)
        event["athleteCount"] = len(event["athlete_ids"])
    return {"athlete_ids": event["athlete_ids"], "athleteCount": event["athleteCount"]}


@router.delete("/events/{event_id}/athletes/{athlete_id}")
async def remove_event_athlete(event_id: str, athlete_id: str, current_user: dict = get_current_user_dep()):
    """Remove an athlete from an event roster"""
    event = get_event(event_id)
    if not event:
        return {"error": "Event not found"}
    if athlete_id in event["athlete_ids"]:
        event["athlete_ids"].remove(athlete_id)
        event["athleteCount"] = len(event["athlete_ids"])
    return {"athlete_ids": event["athlete_ids"], "athleteCount": event["athleteCount"]}


@router.get("/events/{event_id}/notes")
async def list_event_notes(event_id: str, current_user: dict = get_current_user_dep()):
    """Get all captured notes for an event (reads from MongoDB)"""
    notes = await db.event_notes.find(
        {"event_id": event_id}, {"_id": 0}
    ).sort("captured_at", -1).to_list(1000)
    return notes


@router.post("/events/{event_id}/notes")
async def create_event_note(event_id: str, body: EventNoteCreate, current_user: dict = get_current_user_dep()):
    """Capture a live event note"""
    result = capture_note(event_id, body.model_dump())
    if not result:
        return {"error": "Event not found"}

    result["captured_by"] = current_user["name"]

    # Persist event note to MongoDB
    await db.event_notes.insert_one({**result})

    # Auto-log to athlete timeline
    timeline_doc = {
        "id": str(uuid.uuid4()),
        "athlete_id": body.athlete_id,
        "author": current_user["name"],
        "text": f"[{get_event(event_id)['name']}] {body.school_name or ''} — {body.note_text}".strip(),
        "tag": "event_note",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.athlete_notes.insert_one(timeline_doc)

    return result


@router.patch("/events/{event_id}/notes/{note_id}")
async def edit_event_note(event_id: str, note_id: str, body: EventNoteUpdate, current_user: dict = get_current_user_dep()):
    """Edit a captured note"""
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    result = update_note(event_id, note_id, updates)
    if not result:
        return {"error": "Note not found"}

    db_updates = {k: v for k, v in updates.items()}
    db_updates["advocacy_candidate"] = result.get("advocacy_candidate", False)
    await db.event_notes.update_one({"id": note_id}, {"$set": db_updates})

    return result


@router.get("/events/{event_id}/summary")
async def event_summary(event_id: str, current_user: dict = get_current_user_dep()):
    """Get aggregated summary data for post-event debrief"""
    result = get_event_summary(event_id)
    if not result:
        return {"error": "Event not found"}
    return result


@router.post("/events/{event_id}/notes/{note_id}/route")
async def route_single_note(event_id: str, note_id: str, current_user: dict = get_current_user_dep()):
    """Route a single note's follow-ups to the athlete's Support Pod"""
    result = route_note_to_pod(event_id, note_id)
    if not result:
        return {"error": "Note not found"}

    # Persist route status to MongoDB
    await db.event_notes.update_one(
        {"id": note_id},
        {"$set": {"routed_to_pod": True}}
    )

    # Look up program_id from athlete + school_name
    note = result["note"]
    school_name = note.get("school_name", "")
    athlete_id = result["athlete_id"]
    program_id = await _find_program_id(athlete_id, school_name)

    for action_data in result["actions_to_create"]:
        doc = {
            "id": str(uuid.uuid4()),
            "athlete_id": athlete_id,
            "program_id": program_id,
            "title": action_data["title"],
            "owner": current_user["name"],
            "status": "ready",
            "due_date": action_data["due_date"],
            "source": "event",
            "source_category": action_data["source_category"],
            "created_by": current_user["name"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_suggested": False,
            "completed_at": None,
        }
        await db.pod_actions.insert_one(doc)

    timeline_doc = {
        "id": str(uuid.uuid4()),
        "athlete_id": athlete_id,
        "program_id": program_id,
        "author": current_user["name"],
        "text": result["timeline_text"],
        "tag": "event_routed",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.athlete_notes.insert_one(timeline_doc)

    return {"routed": True, "note": result["note"], "actions_created": len(result["actions_to_create"]), "program_id": program_id}


@router.post("/events/{event_id}/route-to-pods")
async def bulk_route_notes(event_id: str, current_user: dict = get_current_user_dep()):
    """Bulk route all eligible notes to Support Pods"""
    results = bulk_route_to_pods(event_id)

    total_actions = 0
    athletes_routed = set()

    for result in results:
        await db.event_notes.update_one(
            {"id": result["note"]["id"]},
            {"$set": {"routed_to_pod": True}}
        )

        # Look up program_id from athlete + school_name
        note = result["note"]
        school_name = note.get("school_name", "")
        athlete_id = result["athlete_id"]
        program_id = await _find_program_id(athlete_id, school_name)

        for action_data in result["actions_to_create"]:
            doc = {
                "id": str(uuid.uuid4()),
                "athlete_id": athlete_id,
                "program_id": program_id,
                "title": action_data["title"],
                "owner": current_user["name"],
                "status": "ready",
                "due_date": action_data["due_date"],
                "source": "event",
                "source_category": action_data["source_category"],
                "created_by": current_user["name"],
                "created_at": datetime.now(timezone.utc).isoformat(),
                "is_suggested": False,
                "completed_at": None,
            }
            await db.pod_actions.insert_one(doc)
            total_actions += 1

        timeline_doc = {
            "id": str(uuid.uuid4()),
            "athlete_id": athlete_id,
            "program_id": program_id,
            "author": current_user["name"],
            "text": result["timeline_text"],
            "tag": "event_routed",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.athlete_notes.insert_one(timeline_doc)
        athletes_routed.add(athlete_id)

    return {
        "routed_notes": len(results),
        "actions_created": total_actions,
        "athletes_affected": len(athletes_routed),
    }


@router.get("/schools")
async def list_schools(current_user: dict = get_current_user_dep()):
    return SCHOOLS

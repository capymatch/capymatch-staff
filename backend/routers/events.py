"""Event Mode — capture, prep, live, summary, routing, schools."""

from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone, timedelta
import uuid
from db_client import db
from auth_middleware import get_current_user_dep
from services.ownership import filter_events_by_ownership, get_visible_athlete_ids
from mock_data import UPCOMING_EVENTS, SCHOOLS
from models import EventNoteCreate, EventNoteUpdate, EventCreate, EventAthleteAdd, EventSignalCreate, EventAddSchool
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
    try:
        event_date = datetime.fromisoformat(body.date.replace("Z", "+00:00"))
        if event_date.tzinfo is None:
            event_date = event_date.replace(tzinfo=timezone.utc)
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


# ─── Signal type → Pipeline / Follow-up mappings ──────────────
SIGNAL_PIPELINE_MAP = {
    "coach_interest": {"stage": "Engaged", "priority": None},
    "offered_visit": {"stage": "Campus Visit", "priority": None},
    "strong_performance": {"stage": None, "priority": None},
    "needs_film": {"stage": None, "priority": None},
    "good_conversation": {"stage": None, "priority": None},
    "standout_skill": {"stage": None, "priority": None},
}

SIGNAL_ACTION_MAP = {
    "coach_interest": {"title": "Send follow-up message to {school} coach", "due_days": 2},
    "needs_film": {"title": "Send updated highlight film to {school}", "due_days": 3},
    "offered_visit": {"title": "Schedule call to discuss {school} campus visit", "due_days": 2},
    "good_conversation": {"title": "Send thank-you message to {school} coach", "due_days": 3},
}

# Pipeline stage priority order (higher = further in process, never downgrade)
_STAGE_ORDER = {
    "Not Contacted": 0, "Prospect": 1, "Initial Contact": 2,
    "Engaged": 3, "Campus Visit": 4, "Offer": 5,
}


@router.post("/events/{event_id}/signals")
async def log_recruiting_signal(event_id: str, body: EventSignalCreate, current_user: dict = get_current_user_dep()):
    """
    Log a structured recruiting signal during a live event.
    Automatically updates pipeline, creates school pod actions, and feeds timeline.
    """
    event = get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    now = datetime.now(timezone.utc).isoformat()
    athlete_id = body.athlete_id
    school_name = body.school_name or ""
    signal_type = body.signal_type

    # Resolve athlete name
    from services.athlete_store import get_by_id as get_athlete_by_id
    athlete = get_athlete_by_id(athlete_id)
    athlete_name = athlete["full_name"] if athlete else "Unknown"

    # 1. Store structured signal as event_note (extended schema)
    note_id = str(uuid.uuid4())
    signal_doc = {
        "id": note_id,
        "event_id": event_id,
        "athlete_id": athlete_id,
        "athlete_name": athlete_name,
        "school_id": body.school_id,
        "school_name": school_name,
        "interest_level": body.interest_level,
        "signal_type": signal_type,
        "note_text": body.note_text or "",
        "follow_ups": [],
        "captured_by": current_user["name"],
        "captured_at": now,
        "routed_to_pod": False,
        "sent_to_athlete": False,
        "advocacy_candidate": body.interest_level in ("hot", "warm"),
        "program_id": None,
    }

    # Look up program_id for this athlete+school
    program_id = await _find_program_id(athlete_id, school_name) if school_name else None
    signal_doc["program_id"] = program_id

    # Determine auto-generated follow-ups from signal type
    auto_follow_ups = []
    action_cfg = SIGNAL_ACTION_MAP.get(signal_type)
    if action_cfg and school_name:
        auto_follow_ups.append(signal_type)
    signal_doc["follow_ups"] = auto_follow_ups

    await db.event_notes.insert_one({**signal_doc})

    # Also add to in-memory event
    event.setdefault("capturedNotes", []).append(signal_doc)

    pipeline_updated = False
    action_created = False
    school_added = False

    # 2. Pipeline integration — update program status if school selected
    if school_name and program_id:
        pipeline_cfg = SIGNAL_PIPELINE_MAP.get(signal_type, {})
        new_stage = pipeline_cfg.get("stage")
        if new_stage:
            prog = await db.programs.find_one({"program_id": program_id}, {"_id": 0})
            if prog:
                current_stage = prog.get("recruiting_status", "Not Contacted")
                cur_order = _STAGE_ORDER.get(current_stage, 0)
                new_order = _STAGE_ORDER.get(new_stage, 0)
                if new_order > cur_order:
                    await db.programs.update_one(
                        {"program_id": program_id},
                        {"$set": {
                            "recruiting_status": new_stage,
                            "updated_at": now,
                            "last_follow_up": now,
                        }}
                    )
                    pipeline_updated = True

    # 3. Auto-create school pod action
    if action_cfg and school_name:
        action_title = action_cfg["title"].format(school=school_name)
        due = (datetime.now(timezone.utc) + timedelta(days=action_cfg["due_days"])).isoformat()
        await db.pod_actions.insert_one({
            "id": str(uuid.uuid4()),
            "athlete_id": athlete_id,
            "program_id": program_id,
            "school_name": school_name,
            "title": action_title,
            "owner": current_user["name"],
            "status": "ready",
            "due_date": due,
            "source": "event_signal",
            "source_category": "recruiting",
            "created_by": current_user["name"],
            "created_at": now,
            "is_suggested": False,
            "completed_at": None,
        })
        action_created = True

        # Mark as auto-routed
        await db.event_notes.update_one({"id": note_id}, {"$set": {"routed_to_pod": True}})
        signal_doc["routed_to_pod"] = True

    # 4. Timeline entry
    signal_label = signal_type.replace("_", " ").title()
    timeline_text = f"[{event['name']}] {signal_label}"
    if school_name:
        timeline_text += f" — {school_name}"
    if body.note_text:
        timeline_text += f": {body.note_text}"

    await db.athlete_notes.insert_one({
        "id": str(uuid.uuid4()),
        "athlete_id": athlete_id,
        "program_id": program_id,
        "author": current_user["name"],
        "text": timeline_text,
        "tag": "event_signal",
        "created_at": now,
    })

    return {
        **signal_doc,
        "pipeline_updated": pipeline_updated,
        "action_created": action_created,
        "school_added": school_added,
    }


@router.post("/events/{event_id}/add-school")
async def add_school_to_pipeline(event_id: str, body: EventAddSchool, current_user: dict = get_current_user_dep()):
    """Add a new school to an athlete's pipeline from the live event."""
    event = get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Check if program already exists
    existing = await _find_program_id(body.athlete_id, body.school_name)
    if existing:
        return {"added": False, "reason": "already_exists", "program_id": existing}

    # Resolve athlete
    from services.athlete_store import get_by_id as get_athlete_by_id
    athlete = get_athlete_by_id(body.athlete_id)
    if not athlete:
        raise HTTPException(status_code=404, detail="Athlete not found")

    now = datetime.now(timezone.utc).isoformat()
    program_id = str(uuid.uuid4())

    # Look up KB for division/conference
    kb = await db.university_knowledge_base.find_one(
        {"university_name": body.school_name}, {"_id": 0}
    )

    await db.programs.insert_one({
        "program_id": program_id,
        "tenant_id": athlete.get("tenant_id", ""),
        "athlete_id": body.athlete_id,
        "university_name": body.school_name,
        "division": kb.get("division", "") if kb else "",
        "conference": kb.get("conference", "") if kb else "",
        "region": kb.get("region", "") if kb else "",
        "recruiting_status": "Prospect",
        "reply_status": "N/A",
        "priority": "Medium",
        "next_action": "Follow up after event",
        "next_action_due": (datetime.now(timezone.utc) + timedelta(days=3)).isoformat(),
        "initial_contact_sent": now,
        "last_follow_up": now,
        "notes": f"Added from event: {event['name']}",
        "org_id": athlete.get("org_id", ""),
        "created_at": now,
        "updated_at": now,
    })

    # Update athlete school_targets count
    count = await db.programs.count_documents({"athlete_id": body.athlete_id})
    await db.athletes.update_one(
        {"id": body.athlete_id},
        {"$set": {"school_targets": count}}
    )

    # Timeline entry
    await db.athlete_notes.insert_one({
        "id": str(uuid.uuid4()),
        "athlete_id": body.athlete_id,
        "program_id": program_id,
        "author": current_user["name"],
        "text": f"Added {body.school_name} to pipeline from {event['name']}",
        "tag": "school_added",
        "created_at": now,
    })

    return {"added": True, "program_id": program_id, "school_name": body.school_name}
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


@router.post("/events/{event_id}/notes/{note_id}/send-to-athlete")
async def send_note_to_athlete(event_id: str, note_id: str, current_user: dict = get_current_user_dep()):
    """Send a follow-up directly to the athlete as a support message + timeline entry."""
    from event_engine import get_event

    event = get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Find the note in DB
    note = await db.event_notes.find_one({"id": note_id, "event_id": event_id}, {"_id": 0})
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    athlete_id = note["athlete_id"]
    athlete_name = note.get("athlete_name", "Athlete")
    school_name = note.get("school_name", "")
    interest = note.get("interest_level", "").capitalize()
    note_text = note.get("note_text", "")

    # Build message body from the follow-ups
    follow_up_labels = {
        "send_film": "Please update and send your highlight reel",
        "schedule_call": "A coach wants to schedule a call — please be available",
        "add_to_targets": "Consider adding this school to your target list",
        "route_to_pod": "Review the interaction details in your Support Pod",
    }
    follow_ups = note.get("follow_ups", [])
    action_lines = [follow_up_labels.get(fu, fu) for fu in follow_ups]
    action_block = "\n".join(f"- {a}" for a in action_lines) if action_lines else "Review your notes from the event."

    subject = f"Action Needed — {event['name']}"
    if school_name:
        subject += f" ({school_name})"

    body = (
        f"Hi {athlete_name.split(' ')[0]},\n\n"
        f"After {event['name']}, here's what you need to do:\n\n"
        f"{action_block}\n\n"
    )
    if note_text:
        body += f"Coach's note: \"{note_text}\"\n\n"
    if school_name and interest:
        body += f"School: {school_name} — Interest: {interest}\n\n"
    body += "Log in and take action as soon as you can. Let me know if you need help!"

    # 1. Create support message thread + message
    thread_id = str(uuid.uuid4())
    msg_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    await db.support_threads.insert_one({
        "id": thread_id,
        "athlete_id": athlete_id,
        "subject": subject,
        "last_message_at": now,
        "created_by": current_user["id"],
        "created_at": now,
    })
    await db.support_messages.insert_one({
        "id": msg_id,
        "thread_id": thread_id,
        "athlete_id": athlete_id,
        "sender_id": current_user["id"],
        "sender_name": current_user["name"],
        "body": body,
        "created_at": now,
    })

    # 2. Create timeline entry
    await db.athlete_notes.insert_one({
        "id": str(uuid.uuid4()),
        "athlete_id": athlete_id,
        "author": current_user["name"],
        "text": f"[{event['name']}] Sent action to athlete: {', '.join(follow_ups) if follow_ups else 'review event notes'}",
        "tag": "event_athlete_action",
        "created_at": now,
    })

    # 3. Create notification record (for future email integration)
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "type": "event_followup_athlete",
        "athlete_id": athlete_id,
        "event_id": event_id,
        "note_id": note_id,
        "subject": subject,
        "body": body,
        "status": "sent",
        "created_by": current_user["id"],
        "created_at": now,
    })

    # 4. Mark note as sent_to_athlete in DB
    await db.event_notes.update_one(
        {"id": note_id},
        {"$set": {"sent_to_athlete": True}}
    )

    # Also update in-memory
    in_mem_notes = event.get("capturedNotes", [])
    for n in in_mem_notes:
        if n["id"] == note_id:
            n["sent_to_athlete"] = True
            break

    return {
        "sent": True,
        "athlete_id": athlete_id,
        "athlete_name": athlete_name,
        "thread_id": thread_id,
        "message_id": msg_id,
    }


@router.post("/events/{event_id}/debrief-complete")
async def mark_debrief_complete(event_id: str, current_user: dict = get_current_user_dep()):
    """Mark an event's debrief as complete."""
    from event_engine import get_event

    event = get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    event["summaryStatus"] = "complete"
    await db.events.update_one(
        {"id": event_id},
        {"$set": {"summaryStatus": "complete"}}
    )
    return {"status": "complete", "event_id": event_id}


@router.get("/schools")
async def list_schools(current_user: dict = get_current_user_dep()):
    return SCHOOLS

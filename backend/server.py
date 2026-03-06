from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from mock_data import (
    ATHLETES,
    PRIORITY_ALERTS,
    MOMENTUM_SIGNALS,
    UPCOMING_EVENTS,
    ATHLETES_NEEDING_ATTENTION,
    PROGRAM_SNAPSHOT,
    ALL_INTERVENTIONS,
    SCHOOLS,
)
from support_pod import (
    get_athlete as sp_get_athlete,
    get_athlete_interventions,
    generate_pod_members,
    generate_suggested_actions,
    calculate_pod_health,
    get_relevant_events,
    enrich_members_with_tasks,
    explain_pod_health,
)
from event_engine import (
    get_event,
    get_all_events,
    get_event_prep,
    toggle_checklist_item,
    capture_note,
    update_note,
    get_event_notes,
    get_event_summary,
    route_note_to_pod,
    bulk_route_to_pods,
)
from advocacy_engine import (
    get_recommendation,
    list_recommendations,
    create_recommendation,
    update_recommendation,
    send_recommendation,
    log_response,
    mark_follow_up,
    close_recommendation,
    get_school_relationship,
    get_all_relationships,
    get_event_context,
)


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str


# Quick Action Models
class NoteCreate(BaseModel):
    text: str
    tag: Optional[str] = None

class AssignCreate(BaseModel):
    new_owner: str
    reason: Optional[str] = None
    intervention_category: Optional[str] = None

class MessageCreate(BaseModel):
    recipient: str
    text: str


# Support Pod Models
class ActionCreate(BaseModel):
    title: str
    owner: str
    due_date: Optional[str] = None
    source_category: Optional[str] = None

class ActionUpdate(BaseModel):
    status: Optional[str] = None
    owner: Optional[str] = None

class ResolveIssue(BaseModel):
    category: str
    resolution_note: Optional[str] = None

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "CapyMatch Mission Control API"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

# Mission Control endpoints
@api_router.get("/mission-control")
async def get_mission_control_data():
    """Get all Mission Control data with Decision Engine explainability"""

    # Enrich interventions with pod health
    def enrich_with_health(interventions_list):
        enriched = []
        for item in interventions_list:
            item_copy = {**item}
            athlete = sp_get_athlete(item["athlete_id"])
            if athlete:
                athlete_interventions = get_athlete_interventions(item["athlete_id"])
                item_copy["pod_health"] = explain_pod_health(athlete, athlete_interventions)
            enriched.append(item_copy)
        return enriched

    return {
        "priorityAlerts": enrich_with_health(PRIORITY_ALERTS),
        "recentChanges": MOMENTUM_SIGNALS,
        "athletesNeedingAttention": enrich_with_health(ATHLETES_NEEDING_ATTENTION),
        "upcomingEvents": UPCOMING_EVENTS,
        "programSnapshot": PROGRAM_SNAPSHOT,
        
        # Debug info (remove in production)
        "_debug": {
            "total_interventions_detected": len(ALL_INTERVENTIONS),
            "priority_alerts_count": len(PRIORITY_ALERTS),
            "athletes_attention_count": len(ATHLETES_NEEDING_ATTENTION),
            "decision_engine_version": "v1.0"
        }
    }

@api_router.get("/mission-control/alerts")
async def get_priority_alerts():
    """Get priority alerts only"""
    return PRIORITY_ALERTS

@api_router.get("/mission-control/signals")
async def get_momentum_signals():
    """Get momentum signals (what changed today)"""
    return MOMENTUM_SIGNALS

@api_router.get("/mission-control/athletes")
async def get_athletes_attention():
    """Get athletes needing attention"""
    return ATHLETES_NEEDING_ATTENTION

@api_router.get("/mission-control/events")
async def get_upcoming_events():
    """Get upcoming events"""
    return UPCOMING_EVENTS

@api_router.get("/mission-control/snapshot")
async def get_program_snapshot():
    """Get program snapshot"""
    return PROGRAM_SNAPSHOT

@api_router.get("/athletes")
async def get_all_athletes():
    """Get all athletes"""
    return ATHLETES

@api_router.get("/athletes/{athlete_id}")
async def get_athlete(athlete_id: str):
    """Get single athlete by ID"""
    athlete = next((a for a in ATHLETES if a["id"] == athlete_id), None)
    if not athlete:
        return {"error": "Athlete not found"}
    return athlete

# ============================================================================
# QUICK ACTIONS — lightweight operational actions from peek panel
# ============================================================================

@api_router.post("/athletes/{athlete_id}/notes")
async def create_note(athlete_id: str, note: NoteCreate):
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

@api_router.post("/athletes/{athlete_id}/assign")
async def assign_owner(athlete_id: str, assignment: AssignCreate):
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

@api_router.post("/athletes/{athlete_id}/messages")
async def send_message(athlete_id: str, message: MessageCreate):
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

@api_router.get("/athletes/{athlete_id}/timeline")
async def get_athlete_timeline(athlete_id: str):
    """Get all notes, assignments, messages for an athlete"""
    notes = await db.athlete_notes.find({"athlete_id": athlete_id}, {"_id": 0}).to_list(100)
    assignments = await db.assignments.find({"athlete_id": athlete_id}, {"_id": 0}).to_list(100)
    messages = await db.messages.find({"athlete_id": athlete_id}, {"_id": 0}).to_list(100)
    return {"notes": notes, "assignments": assignments, "messages": messages}


# ============================================================================
# SUPPORT POD — treatment and coordination environment
# ============================================================================

@api_router.get("/support-pods/{athlete_id}")
async def get_support_pod(athlete_id: str, context: str = None):
    """Get full Support Pod data for an athlete"""
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

    # Enrich members with task counts
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

    # Count unassigned actions
    unassigned = [a for a in all_actions if a.get("owner") in ("Unassigned", None, "") and a.get("status") != "completed"]

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
    }


@api_router.post("/support-pods/{athlete_id}/actions")
async def create_pod_action(athlete_id: str, action: ActionCreate):
    """Create a new action item in the pod"""
    doc = {
        "id": str(uuid.uuid4()),
        "athlete_id": athlete_id,
        "title": action.title,
        "owner": action.owner,
        "status": "ready",
        "due_date": action.due_date or (datetime.now(timezone.utc) + timedelta(days=3)).isoformat(),
        "source": "manual",
        "source_category": action.source_category,
        "created_by": "Coach Martinez",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_suggested": False,
        "completed_at": None,
    }
    await db.pod_actions.insert_one(doc)
    doc.pop("_id", None)

    # Log to timeline
    event = {
        "id": str(uuid.uuid4()),
        "athlete_id": athlete_id,
        "type": "action_created",
        "description": f"Created action: {action.title}",
        "actor": "Coach Martinez",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.pod_action_events.insert_one(event)

    return doc


@api_router.patch("/support-pods/{athlete_id}/actions/{action_id}")
async def update_pod_action(athlete_id: str, action_id: str, update: ActionUpdate):
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
        # Suggested action being modified — save to DB with original suggested fields preserved
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

    # Log event
    if event_desc:
        event = {
            "id": str(uuid.uuid4()),
            "athlete_id": athlete_id,
            "type": "action_updated",
            "description": event_desc,
            "actor": "Coach Martinez",
            "action_id": action_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.pod_action_events.insert_one(event)

    result = await db.pod_actions.find_one({"id": action_id}, {"_id": 0})
    return result or {"id": action_id, **update_dict}


@api_router.post("/support-pods/{athlete_id}/resolve")
async def resolve_issue(athlete_id: str, body: ResolveIssue):
    """Resolve an active issue — logs to timeline, marks in DB"""
    doc = {
        "id": str(uuid.uuid4()),
        "athlete_id": athlete_id,
        "category": body.category,
        "resolution_note": body.resolution_note or f"Resolved {body.category} issue",
        "resolved_by": "Coach Martinez",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.pod_resolutions.insert_one(doc)
    doc.pop("_id", None)
    return doc


# ============================================================================
# EVENT MODE — capture, prep, live, summary, routing
# ============================================================================

class EventNoteCreate(BaseModel):
    athlete_id: str
    school_id: Optional[str] = None
    school_name: Optional[str] = None
    interest_level: Optional[str] = "none"
    note_text: Optional[str] = ""
    follow_ups: Optional[List[str]] = []

class EventNoteUpdate(BaseModel):
    interest_level: Optional[str] = None
    note_text: Optional[str] = None
    follow_ups: Optional[List[str]] = None
    school_id: Optional[str] = None
    school_name: Optional[str] = None

class EventCreate(BaseModel):
    name: str
    type: str
    date: str
    location: str
    expectedSchools: Optional[int] = 0

class EventAthleteAdd(BaseModel):
    athlete_id: str


@api_router.get("/events")
async def list_events(team: str = None, type: str = None):
    """Get all events grouped by upcoming/past with urgency indicators"""
    return get_all_events(team_filter=team, type_filter=type)


@api_router.get("/events/{event_id}")
async def get_event_detail(event_id: str):
    """Get single event detail"""
    event = get_event(event_id)
    if not event:
        return {"error": "Event not found"}
    return {k: v for k, v in event.items() if k != "capturedNotes"}


@api_router.post("/events")
async def create_event(body: EventCreate):
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
    return {k: v for k, v in new_event.items() if k != "capturedNotes"}


@api_router.get("/events/{event_id}/prep")
async def get_prep_data(event_id: str):
    """Get prep data: athletes, schools, checklist, blockers"""
    result = get_event_prep(event_id)
    if not result:
        return {"error": "Event not found"}
    return result


@api_router.patch("/events/{event_id}/checklist/{item_id}")
async def toggle_checklist(event_id: str, item_id: str):
    """Toggle a prep checklist item"""
    result = toggle_checklist_item(event_id, item_id)
    if not result:
        return {"error": "Item not found"}
    return result


@api_router.post("/events/{event_id}/athletes")
async def add_event_athlete(event_id: str, body: EventAthleteAdd):
    """Add an athlete to an event roster"""
    event = get_event(event_id)
    if not event:
        return {"error": "Event not found"}
    if body.athlete_id not in event["athlete_ids"]:
        event["athlete_ids"].append(body.athlete_id)
        event["athleteCount"] = len(event["athlete_ids"])
    return {"athlete_ids": event["athlete_ids"], "athleteCount": event["athleteCount"]}


@api_router.delete("/events/{event_id}/athletes/{athlete_id}")
async def remove_event_athlete(event_id: str, athlete_id: str):
    """Remove an athlete from an event roster"""
    event = get_event(event_id)
    if not event:
        return {"error": "Event not found"}
    if athlete_id in event["athlete_ids"]:
        event["athlete_ids"].remove(athlete_id)
        event["athleteCount"] = len(event["athlete_ids"])
    return {"athlete_ids": event["athlete_ids"], "athleteCount": event["athleteCount"]}


@api_router.get("/events/{event_id}/notes")
async def list_event_notes(event_id: str):
    """Get all captured notes for an event"""
    return get_event_notes(event_id)


@api_router.post("/events/{event_id}/notes")
async def create_event_note(event_id: str, body: EventNoteCreate):
    """Capture a live event note"""
    result = capture_note(event_id, body.model_dump())
    if not result:
        return {"error": "Event not found"}

    # Auto-log to athlete timeline (every note hits timeline)
    timeline_doc = {
        "id": str(uuid.uuid4()),
        "athlete_id": body.athlete_id,
        "author": "Coach Martinez",
        "text": f"[{get_event(event_id)['name']}] {body.school_name or ''} — {body.note_text}".strip(),
        "tag": "event_note",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.athlete_notes.insert_one(timeline_doc)

    return result


@api_router.patch("/events/{event_id}/notes/{note_id}")
async def edit_event_note(event_id: str, note_id: str, body: EventNoteUpdate):
    """Edit a captured note"""
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    result = update_note(event_id, note_id, updates)
    if not result:
        return {"error": "Note not found"}
    return result


@api_router.get("/events/{event_id}/summary")
async def event_summary(event_id: str):
    """Get aggregated summary data for post-event debrief"""
    result = get_event_summary(event_id)
    if not result:
        return {"error": "Event not found"}
    return result


@api_router.post("/events/{event_id}/notes/{note_id}/route")
async def route_single_note(event_id: str, note_id: str):
    """Route a single note's follow-ups to the athlete's Support Pod"""
    result = route_note_to_pod(event_id, note_id)
    if not result:
        return {"error": "Note not found"}

    # Create action items in Support Pod
    for action_data in result["actions_to_create"]:
        doc = {
            "id": str(uuid.uuid4()),
            "athlete_id": result["athlete_id"],
            "title": action_data["title"],
            "owner": action_data["owner"],
            "status": "ready",
            "due_date": action_data["due_date"],
            "source": "event",
            "source_category": action_data["source_category"],
            "created_by": "Coach Martinez",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_suggested": False,
            "completed_at": None,
        }
        await db.pod_actions.insert_one(doc)

    # Log to athlete timeline
    timeline_doc = {
        "id": str(uuid.uuid4()),
        "athlete_id": result["athlete_id"],
        "author": "Coach Martinez",
        "text": result["timeline_text"],
        "tag": "event_routed",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.athlete_notes.insert_one(timeline_doc)

    return {"routed": True, "note": result["note"], "actions_created": len(result["actions_to_create"])}


@api_router.post("/events/{event_id}/route-to-pods")
async def bulk_route_notes(event_id: str):
    """Bulk route all eligible notes to Support Pods"""
    results = bulk_route_to_pods(event_id)

    total_actions = 0
    athletes_routed = set()

    for result in results:
        for action_data in result["actions_to_create"]:
            doc = {
                "id": str(uuid.uuid4()),
                "athlete_id": result["athlete_id"],
                "title": action_data["title"],
                "owner": action_data["owner"],
                "status": "ready",
                "due_date": action_data["due_date"],
                "source": "event",
                "source_category": action_data["source_category"],
                "created_by": "Coach Martinez",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "is_suggested": False,
                "completed_at": None,
            }
            await db.pod_actions.insert_one(doc)
            total_actions += 1

        # Log timeline
        timeline_doc = {
            "id": str(uuid.uuid4()),
            "athlete_id": result["athlete_id"],
            "author": "Coach Martinez",
            "text": result["timeline_text"],
            "tag": "event_routed",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.athlete_notes.insert_one(timeline_doc)
        athletes_routed.add(result["athlete_id"])

    return {
        "routed_notes": len(results),
        "actions_created": total_actions,
        "athletes_affected": len(athletes_routed),
    }


@api_router.get("/schools")
async def list_schools():
    """Get all schools for selectors"""
    return SCHOOLS


# ============================================================================
# ADVOCACY MODE — recommendations, relationships, response tracking
# ============================================================================

class RecommendationCreate(BaseModel):
    athlete_id: str
    school_id: Optional[str] = ""
    school_name: Optional[str] = ""
    college_coach_name: Optional[str] = ""
    fit_reasons: Optional[List[str]] = []
    fit_note: Optional[str] = ""
    supporting_event_notes: Optional[List[str]] = []
    intro_message: Optional[str] = ""
    desired_next_step: Optional[str] = ""

class RecommendationUpdate(BaseModel):
    college_coach_name: Optional[str] = None
    fit_reasons: Optional[List[str]] = None
    fit_note: Optional[str] = None
    supporting_event_notes: Optional[List[str]] = None
    intro_message: Optional[str] = None
    desired_next_step: Optional[str] = None
    school_id: Optional[str] = None
    school_name: Optional[str] = None

class ResponseLog(BaseModel):
    response_note: str
    response_type: Optional[str] = "warm"

class CloseRequest(BaseModel):
    reason: Optional[str] = "no_response"


@api_router.get("/advocacy/recommendations")
async def list_all_recommendations(status: str = None, athlete: str = None, school: str = None, grad_year: str = None):
    return list_recommendations(status_filter=status, athlete_filter=athlete, school_filter=school, grad_year_filter=grad_year)


@api_router.get("/advocacy/context/{athlete_id}/{school_id}")
async def get_advocacy_context(athlete_id: str, school_id: str):
    return get_event_context(athlete_id, school_id)


@api_router.get("/advocacy/context/{athlete_id}")
async def get_advocacy_context_athlete(athlete_id: str):
    return get_event_context(athlete_id)


@api_router.get("/advocacy/relationships")
async def list_all_relationships():
    return get_all_relationships()


@api_router.get("/advocacy/relationships/{school_id}")
async def get_relationship(school_id: str):
    result = get_school_relationship(school_id)
    if not result:
        return {"error": "School not found"}
    return result


@api_router.post("/advocacy/recommendations")
async def create_new_recommendation(body: RecommendationCreate):
    rec = create_recommendation(body.model_dump())
    return rec


@api_router.get("/advocacy/recommendations/{rec_id}")
async def get_rec_detail(rec_id: str):
    rec = get_recommendation(rec_id)
    if not rec:
        return {"error": "Recommendation not found"}
    # Enrich with relationship summary
    if rec.get("school_id"):
        rel = get_school_relationship(rec["school_id"])
        rec["relationship_summary"] = rel["summary"] if rel else None
    return rec


@api_router.patch("/advocacy/recommendations/{rec_id}")
async def update_rec(rec_id: str, body: RecommendationUpdate):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    result = update_recommendation(rec_id, updates)
    if not result:
        return {"error": "Recommendation not found"}
    return result


@api_router.post("/advocacy/recommendations/{rec_id}/send")
async def send_rec(rec_id: str):
    rec = send_recommendation(rec_id)
    if not rec:
        return {"error": "Cannot send — not a draft or not found"}

    # Log to athlete timeline
    await db.athlete_notes.insert_one({
        "id": str(uuid.uuid4()),
        "athlete_id": rec["athlete_id"],
        "author": "Coach Martinez",
        "text": f"Recommendation sent to {rec['school_name']}: {rec.get('fit_summary', '')}",
        "tag": "advocacy_sent",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return rec


@api_router.post("/advocacy/recommendations/{rec_id}/respond")
async def respond_to_rec(rec_id: str, body: ResponseLog):
    rec = log_response(rec_id, body.response_note, body.response_type)
    if not rec:
        return {"error": "Cannot log response"}

    # Log to athlete timeline
    tag = "advocacy_response" if body.response_type == "warm" else "advocacy_closed"
    await db.athlete_notes.insert_one({
        "id": str(uuid.uuid4()),
        "athlete_id": rec["athlete_id"],
        "author": "Coach Martinez",
        "text": f"{rec['school_name']} response: {body.response_note}",
        "tag": tag,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    # If warm response, create Support Pod action
    if body.response_type == "warm":
        await db.pod_actions.insert_one({
            "id": str(uuid.uuid4()),
            "athlete_id": rec["athlete_id"],
            "title": f"Follow up on {rec['school_name']} warm response",
            "owner": "Coach Martinez",
            "status": "ready",
            "due_date": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
            "source": "advocacy",
            "source_category": "advocacy_response",
            "created_by": "Coach Martinez",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_suggested": False,
            "completed_at": None,
        })

    return rec


@api_router.post("/advocacy/recommendations/{rec_id}/follow-up")
async def follow_up_rec(rec_id: str):
    rec = mark_follow_up(rec_id)
    if not rec:
        return {"error": "Cannot follow up"}
    return rec


@api_router.post("/advocacy/recommendations/{rec_id}/close")
async def close_rec(rec_id: str, body: CloseRequest):
    rec = close_recommendation(rec_id, body.reason)
    if not rec:
        return {"error": "Cannot close"}

    await db.athlete_notes.insert_one({
        "id": str(uuid.uuid4()),
        "athlete_id": rec["athlete_id"],
        "author": "Coach Martinez",
        "text": f"Recommendation to {rec['school_name']} closed ({body.reason.replace('_', ' ')})",
        "tag": "advocacy_closed",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return rec


# Debug endpoints for Decision Engine inspection
@api_router.get("/debug/interventions")
async def get_all_interventions():
    """
    DEBUG: Get all detected interventions with scoring details
    Useful for inspecting Decision Engine behavior
    """
    return {
        "total_interventions": len(ALL_INTERVENTIONS),
        "by_category": {
            "momentum_drop": len([i for i in ALL_INTERVENTIONS if i['category'] == 'momentum_drop']),
            "blocker": len([i for i in ALL_INTERVENTIONS if i['category'] == 'blocker']),
            "deadline_proximity": len([i for i in ALL_INTERVENTIONS if i['category'] == 'deadline_proximity']),
            "engagement_drop": len([i for i in ALL_INTERVENTIONS if i['category'] == 'engagement_drop']),
            "ownership_gap": len([i for i in ALL_INTERVENTIONS if i['category'] == 'ownership_gap']),
            "readiness_issue": len([i for i in ALL_INTERVENTIONS if i['category'] == 'readiness_issue']),
            "event_follow_up": len([i for i in ALL_INTERVENTIONS if i['category'] == 'event_follow_up']),
        },
        "by_tier": {
            "critical": len([i for i in ALL_INTERVENTIONS if i['priority_tier'] == 'critical']),
            "high": len([i for i in ALL_INTERVENTIONS if i['priority_tier'] == 'high']),
            "medium": len([i for i in ALL_INTERVENTIONS if i['priority_tier'] == 'medium']),
            "low": len([i for i in ALL_INTERVENTIONS if i['priority_tier'] == 'low']),
        },
        "interventions": ALL_INTERVENTIONS,
    }

@api_router.get("/debug/interventions/{athlete_id}")
async def debug_athlete_interventions(athlete_id: str):
    """
    DEBUG: Get all interventions for a specific athlete
    Shows full scoring breakdown
    """
    athlete_interventions = [i for i in ALL_INTERVENTIONS if i['athlete_id'] == athlete_id]
    
    if not athlete_interventions:
        return {
            "athlete_id": athlete_id,
            "message": "No interventions detected for this athlete",
            "interventions": []
        }
    
    return {
        "athlete_id": athlete_id,
        "athlete_name": athlete_interventions[0]['athlete_name'],
        "total_interventions": len(athlete_interventions),
        "highest_score": max([i['score'] for i in athlete_interventions]),
        "interventions": athlete_interventions
    }

@api_router.get("/debug/scoring/{intervention_id}")
async def get_intervention_scoring(intervention_id: str):
    """
    DEBUG: Get detailed scoring breakdown for a specific intervention
    Shows how urgency, impact, actionability, ownership combine
    """
    # Find intervention by matching athlete_id + category as pseudo-ID
    # In production, would use actual intervention IDs
    for intervention in ALL_INTERVENTIONS:
        pseudo_id = f"{intervention['athlete_id']}_{intervention['category']}"
        if pseudo_id == intervention_id:
            return {
                "intervention": intervention,
                "scoring_breakdown": {
                    "urgency": {
                        "score": intervention['urgency'],
                        "weight": 40,
                        "contribution": intervention['urgency'] * 40
                    },
                    "impact": {
                        "score": intervention['impact'],
                        "weight": 30,
                        "contribution": intervention['impact'] * 30
                    },
                    "actionability": {
                        "score": intervention['actionability'],
                        "weight": 20,
                        "contribution": intervention['actionability'] * 20
                    },
                    "ownership": {
                        "score": intervention['ownership'],
                        "weight": 10,
                        "contribution": intervention['ownership'] * 10
                    }
                },
                "formula": "(urgency × 40) + (impact × 30) + (actionability × 20) + (ownership × 10) / 10",
                "total_score": intervention['score']
            }
    
    return {"error": "Intervention not found"}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

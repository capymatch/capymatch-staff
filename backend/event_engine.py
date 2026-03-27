"""
Event Engine — Event Mode data aggregation, prep logic, and routing

Handles event listing, prep data, live note management, summary generation,
and routing of event signals to Support Pod and Mission Control.

Data is loaded from db.events at startup via init_event_engine().
"""

from datetime import datetime, timezone, timedelta
import uuid
from services.athlete_store import get_all as get_athletes, get_interventions
from db_client import db

import logging
log = logging.getLogger(__name__)

# ── Module-level caches, populated by init_event_engine() at startup ─────

_events: list = []
_schools: list = []


async def init_event_engine():
    """Load events and schools from DB into memory cache. Called at server startup."""
    global _events, _schools
    _events = await _load_events_from_db()
    _schools = await _load_schools_from_db()
    log.info("event_engine: loaded %d events, %d schools from DB", len(_events), len(_schools))


async def reload_events():
    """Reload events from DB (call after DB writes to stay in sync)."""
    global _events
    _events = await _load_events_from_db()


async def _load_events_from_db() -> list:
    """Load all events from db.events, compute daysAway."""
    events = await db.events.find({}, {"_id": 0}).to_list(500)
    now = datetime.now(timezone.utc)
    for e in events:
        event_date = e.get("date") or e.get("start_date")
        if event_date:
            try:
                if isinstance(event_date, str):
                    edt = datetime.fromisoformat(event_date.replace("Z", "+00:00"))
                elif isinstance(event_date, datetime):
                    edt = event_date
                else:
                    e["daysAway"] = 99
                    continue
                if edt.tzinfo is None:
                    edt = edt.replace(tzinfo=timezone.utc)
                e["daysAway"] = (edt - now).days
            except (ValueError, TypeError):
                e["daysAway"] = 99
        else:
            e.setdefault("daysAway", 99)
        e.setdefault("prepStatus", "not_started")
        e.setdefault("athlete_ids", [])
        e.setdefault("school_ids", [])
        e.setdefault("capturedNotes", [])
        e.setdefault("checklist", [])
    return events


async def _load_schools_from_db() -> list:
    """Load schools from db.schools collection, fallback to university_knowledge_base."""
    schools = await db.schools.find({}, {"_id": 0}).to_list(1000)
    if not schools:
        # Fallback: load from university_knowledge_base (different schema)
        raw = await db.university_knowledge_base.find(
            {}, {"_id": 0, "university_name": 1, "division": 1, "domain": 1}
        ).to_list(1500)
        schools = []
        for r in raw:
            name = r.get("university_name", "")
            if not name:
                continue
            slug = name.lower().replace(" ", "_").replace("'", "")
            schools.append({
                "id": slug,
                "name": name,
                "division": r.get("division", ""),
            })
    return schools


# ── Public accessors ─────────────────────────────────────────────────────

def get_events_list():
    """Return the in-memory events list."""
    return _events


def get_schools_list():
    """Return the in-memory schools list."""
    return _schools


def add_event_to_cache(event: dict):
    """Add a new event to the in-memory cache (after DB write)."""
    _events.append(event)


def add_school_to_cache(school: dict):
    """Add a new school to the in-memory cache (after DB write)."""
    _schools.append(school)


def get_event(event_id):
    return next((e for e in _events if e["id"] == event_id), None)


async def get_all_events(team_filter=None, type_filter=None):
    """Return events grouped as upcoming/past with urgency indicators"""
    upcoming = []
    past = []

    all_athletes_list = await get_athletes()
    all_interventions_list = await get_interventions()

    for event in _events:
        e = {**event}

        # Compute urgency color
        if event["daysAway"] < 0:
            e["urgency"] = "gray"
        elif event["daysAway"] <= 1 and event["prepStatus"] != "ready":
            e["urgency"] = "red"
        elif event["daysAway"] <= 5 and event["prepStatus"] in ("not_started", "in_progress"):
            e["urgency"] = "yellow"
        else:
            e["urgency"] = "green"

        # Prep progress
        checklist = event.get("checklist", [])
        completed = sum(1 for c in checklist if c["completed"])
        e["prepProgress"] = {"completed": completed, "total": len(checklist)}
        e["capturedNotesCount"] = len(event.get("capturedNotes", []))

        # Override expectedSchools with actual school_ids count
        e["expectedSchools"] = len(event.get("school_ids", []))
        # Override athleteCount with actual athlete_ids count
        e["athleteCount"] = len(event.get("athlete_ids", []))

        # Athlete photos for card display
        athlete_photos = []
        for aid in event.get("athlete_ids", []):
            ath = next((a for a in all_athletes_list if a["id"] == aid), None)
            if ath:
                athlete_photos.append({
                    "id": aid,
                    "name": ath.get("full_name", ""),
                    "photo_url": ath.get("photo_url", ""),
                })
        e["athlete_photos"] = athlete_photos

        # Athlete readiness summary for card display
        athlete_ids = event.get("athlete_ids", [])
        blockers_count = 0
        needs_attention_count = 0
        ready_count = 0
        for aid in athlete_ids:
            athlete_intv = [i for i in all_interventions_list if i["athlete_id"] == aid]
            if any(i["category"] == "blocker" for i in athlete_intv):
                blockers_count += 1
            elif any(i["category"] == "readiness_issue" for i in athlete_intv):
                needs_attention_count += 1
            else:
                ready_count += 1
        e["readiness"] = {
            "ready": ready_count,
            "needs_attention": needs_attention_count,
            "blockers": blockers_count,
        }
        # Follow-ups pending (for past events)
        if event.get("status") == "past" or event["daysAway"] < 0:
            notes = event.get("capturedNotes", [])
            e["followUpsPending"] = sum(1 for n in notes if n.get("follow_ups") and not n.get("routed_to_pod"))
        else:
            e["followUpsPending"] = 0

        # Apply filters
        if team_filter:
            roster_athletes = [a for a in all_athletes_list if a["id"] in event.get("athlete_ids", [])]
            teams = {a["team"] for a in roster_athletes}
            if team_filter not in teams:
                continue

        if type_filter and event["type"] != type_filter:
            continue

        if event.get("status") == "past" or event["daysAway"] < 0:
            past.append(e)
        else:
            upcoming.append(e)

    upcoming.sort(key=lambda x: x["daysAway"])
    past.sort(key=lambda x: x["daysAway"], reverse=True)

    return {"upcoming": upcoming, "past": past}


async def get_event_prep(event_id):
    """Build prep data for an event: athletes, schools, checklist, blockers"""
    event = get_event(event_id)
    if not event:
        return None

    athlete_ids = event.get("athlete_ids", [])
    school_ids = event.get("school_ids", [])

    # Athletes attending with prep status
    athletes_attending = []
    blockers = []

    all_athletes_list = await get_athletes()
    all_interventions_list = await get_interventions()

    for aid in athlete_ids:
        athlete = next((a for a in all_athletes_list if a["id"] == aid), None)
        if not athlete:
            continue

        # Get interventions for this athlete
        athlete_interventions = [i for i in all_interventions_list if i["athlete_id"] == aid]
        blocker_interventions = [i for i in athlete_interventions if i["category"] == "blocker"]

        # Determine prep status
        if blocker_interventions:
            prep_status = "blocker"
            for b in blocker_interventions:
                blockers.append({
                    "athleteId": aid,
                    "athleteName": athlete["full_name"],
                    "category": b["category"],
                    "trigger": b["trigger"],
                    "impact": b["why_this_surfaced"],
                    "recommended_action": b.get("recommended_action", ""),
                    "owner": b.get("owner", ""),
                })
        elif any(i["category"] == "readiness_issue" for i in athlete_interventions):
            prep_status = "needs_attention"
        else:
            prep_status = "ready"

        # Cross-reference athlete's target schools with event schools
        athlete_school_targets = []
        for sid in school_ids:
            school = next((s for s in _schools if s["id"] == sid), None)
            if school:
                athlete_school_targets.append(school["name"])
        # Limit to a realistic subset based on athlete's target count
        target_count = min(athlete.get("school_targets", 3), len(athlete_school_targets))
        athlete_school_targets = athlete_school_targets[:target_count]

        athletes_attending.append({
            "id": aid,
            "full_name": athlete["full_name"],
            "photo_url": athlete.get("photo_url", ""),
            "grad_year": athlete["grad_year"],
            "position": athlete["position"],
            "team": athlete["team"],
            "prepStatus": prep_status,
            "targetSchoolsAtEvent": athlete_school_targets,
            "blockers": blocker_interventions,
        })

    # Target schools with athlete overlap count
    target_schools = []
    for sid in school_ids:
        school = next((s for s in _schools if s["id"] == sid), None)
        if school:
            overlap = sum(1 for a in athletes_attending if school["name"] in a["targetSchoolsAtEvent"])
            target_schools.append({
                "id": school["id"],
                "name": school["name"],
                "division": school.get("division", ""),
                "athleteOverlap": overlap,
            })
    target_schools.sort(key=lambda x: x["athleteOverlap"], reverse=True)

    return {
        "event": {k: v for k, v in event.items() if k != "capturedNotes"},
        "athletes": athletes_attending,
        "targetSchools": target_schools,
        "checklist": event.get("checklist", []),
        "blockers": blockers,
    }


def toggle_checklist_item(event_id, item_id):
    """Toggle a checklist item and recompute prep status"""
    event = get_event(event_id)
    if not event:
        return None

    checklist = event.get("checklist", [])
    item = next((c for c in checklist if c["id"] == item_id), None)
    if not item:
        return None

    item["completed"] = not item["completed"]

    # Recompute prepStatus
    completed = sum(1 for c in checklist if c["completed"])
    total = len(checklist)
    if completed == total:
        event["prepStatus"] = "ready"
    elif completed > 0:
        event["prepStatus"] = "in_progress"
    else:
        event["prepStatus"] = "not_started"

    return {"item": item, "prepStatus": event["prepStatus"], "prepProgress": {"completed": completed, "total": total}}


async def capture_note(event_id, data):
    """Capture a live event note"""
    event = get_event(event_id)
    if not event:
        return None

    all_athletes_list = await get_athletes()
    athlete = next((a for a in all_athletes_list if a["id"] == data["athlete_id"]), None)
    interest = data.get("interest_level", "none")

    note = {
        "id": str(uuid.uuid4()),
        "event_id": event_id,
        "athlete_id": data["athlete_id"],
        "athlete_name": athlete["full_name"] if athlete else "Unknown",
        "school_id": data.get("school_id"),
        "school_name": data.get("school_name", ""),
        "interest_level": interest,
        "note_text": data.get("note_text", ""),
        "follow_ups": data.get("follow_ups", []),
        "captured_by": "Coach Martinez",
        "captured_at": datetime.now(timezone.utc).isoformat(),
        "routed_to_pod": False,
        "routed_to_mc": False,
        "advocacy_candidate": interest in ("hot", "warm"),
    }

    if "capturedNotes" not in event:
        event["capturedNotes"] = []
    event["capturedNotes"].append(note)

    return note


def update_note(event_id, note_id, updates):
    """Update an existing event note"""
    event = get_event(event_id)
    if not event:
        return None

    notes = event.get("capturedNotes", [])
    note = next((n for n in notes if n["id"] == note_id), None)
    if not note:
        return None

    for key in ("interest_level", "note_text", "follow_ups", "school_id", "school_name"):
        if key in updates:
            note[key] = updates[key]

    # Update advocacy candidate flag
    note["advocacy_candidate"] = note.get("interest_level") in ("hot", "warm")

    return note


def get_event_notes(event_id):
    """Get all notes for an event"""
    event = get_event(event_id)
    if not event:
        return []
    notes = list(event.get("capturedNotes", []))
    notes.sort(key=lambda x: x.get("captured_at", ""), reverse=True)
    return notes


def get_event_summary(event_id):
    """Generate aggregated summary from captured notes"""
    event = get_event(event_id)
    if not event:
        return None

    notes = event.get("capturedNotes", [])

    # Stats
    schools_interacted = set()
    athletes_seen = set()
    follow_ups_needed = 0

    for n in notes:
        if n.get("school_name"):
            schools_interacted.add(n["school_name"])
        athletes_seen.add(n["athlete_id"])
        follow_ups_needed += len(n.get("follow_ups", []))

    # Hottest interest — sorted by interest level
    interest_order = {"hot": 0, "warm": 1, "cool": 2, "none": 3}
    hottest = sorted(
        [n for n in notes if n.get("interest_level") in ("hot", "warm")],
        key=lambda x: interest_order.get(x.get("interest_level", "none"), 99)
    )

    # Follow-up actions derived from notes
    follow_up_actions = []
    due_map = {"send_film": 2, "schedule_call": 3, "add_to_targets": 1, "route_to_pod": 0}
    title_map = {
        "send_film": "Send {athlete} highlight reel to {school} coach",
        "schedule_call": "Schedule follow-up call with {school} re: {athlete}",
        "add_to_targets": "Add {school} to {athlete} target list",
        "route_to_pod": "Route {athlete} × {school} interaction to Support Pod",
    }

    for n in notes:
        for fu in n.get("follow_ups", []):
            follow_up_actions.append({
                "id": f"followup_{n['id']}_{fu}",
                "note_id": n["id"],
                "title": title_map.get(fu, fu).format(
                    athlete=n.get("athlete_name", "Athlete"),
                    school=n.get("school_name", "School"),
                ),
                "athlete_id": n["athlete_id"],
                "athlete_name": n.get("athlete_name", ""),
                "school_name": n.get("school_name", ""),
                "type": fu,
                "owner": "Coach Martinez",
                "due_date": (datetime.now(timezone.utc) + timedelta(days=due_map.get(fu, 2))).isoformat(),
                "routed": n.get("routed_to_pod", False),
                "sent_to_athlete": n.get("sent_to_athlete", False),
                "interest_level": n.get("interest_level", "none"),
            })

    # Schools seen
    school_stats = {}
    for n in notes:
        sname = n.get("school_name")
        if not sname:
            continue
        if sname not in school_stats:
            school_stats[sname] = {"name": sname, "interactions": 0, "hot": 0, "warm": 0, "cool": 0}
        school_stats[sname]["interactions"] += 1
        level = n.get("interest_level", "none")
        if level in school_stats[sname]:
            school_stats[sname][level] += 1

    schools_seen = sorted(school_stats.values(), key=lambda x: x["interactions"], reverse=True)

    return {
        "event": {k: v for k, v in event.items() if k != "capturedNotes"},
        "stats": {
            "totalNotes": len(notes),
            "schoolsInteracted": len(schools_interacted),
            "athletesSeen": len(athletes_seen),
            "followUpsNeeded": follow_ups_needed,
        },
        "hottestInterest": hottest,
        "followUpActions": follow_up_actions,
        "schoolsSeen": schools_seen,
        "allNotes": notes,
    }


def route_note_to_pod(event_id, note_id):
    """Mark a note as routed to Support Pod and return data needed for pod creation"""
    event = get_event(event_id)
    if not event:
        return None

    notes = event.get("capturedNotes", [])
    note = next((n for n in notes if n["id"] == note_id), None)
    if not note:
        return None

    note["routed_to_pod"] = True

    # Build action items to create in Support Pod
    due_map = {"send_film": 2, "schedule_call": 3, "add_to_targets": 1, "route_to_pod": 0}
    title_map = {
        "send_film": "Send highlight reel to {school} coach",
        "schedule_call": "Schedule follow-up call with {school}",
        "add_to_targets": "Add {school} to target list",
        "route_to_pod": "Review {school} interaction from {event}",
    }

    actions_to_create = []
    for fu in note.get("follow_ups", []):
        actions_to_create.append({
            "title": title_map.get(fu, fu).format(
                school=note.get("school_name", "School"),
                event=event["name"],
            ),
            "owner": "Coach Martinez",
            "due_date": (datetime.now(timezone.utc) + timedelta(days=due_map.get(fu, 2))).isoformat(),
            "source_category": "event_follow_up",
        })

    # Timeline entry text
    interest_label = note.get("interest_level", "").capitalize()
    timeline_text = f"[{event['name']}] {note.get('school_name', '')} — {note.get('note_text', '')}. Interest: {interest_label}"

    return {
        "note": note,
        "athlete_id": note["athlete_id"],
        "actions_to_create": actions_to_create,
        "timeline_text": timeline_text,
    }


def bulk_route_to_pods(event_id):
    """Route all unrouted Hot/Warm notes with follow-ups to Support Pods"""
    event = get_event(event_id)
    if not event:
        return []

    notes = event.get("capturedNotes", [])
    routed = []

    for note in notes:
        if note.get("routed_to_pod"):
            continue
        if note.get("interest_level") not in ("hot", "warm"):
            continue
        if not note.get("follow_ups"):
            continue

        result = route_note_to_pod(event_id, note["id"])
        if result:
            routed.append(result)

    return routed

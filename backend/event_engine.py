"""
Event Engine — Event Mode data aggregation, prep logic, and routing

Handles event listing, prep data, live note management, summary generation,
and routing of event signals to Support Pod and Mission Control.
"""

from datetime import datetime, timezone, timedelta
import uuid
from services.athlete_store import get_all as get_athletes, get_interventions
from mock_data import UPCOMING_EVENTS, SCHOOLS


def get_event(event_id):
    return next((e for e in UPCOMING_EVENTS if e["id"] == event_id), None)


def get_all_events(team_filter=None, type_filter=None):
    """Return events grouped as upcoming/past with urgency indicators"""
    upcoming = []
    past = []

    for event in UPCOMING_EVENTS:
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

        # Athlete readiness summary for card display
        athlete_ids = event.get("athlete_ids", [])
        all_athletes = get_athletes()
        all_interventions = get_interventions()
        blockers_count = 0
        needs_attention_count = 0
        ready_count = 0
        for aid in athlete_ids:
            athlete_intv = [i for i in all_interventions if i["athlete_id"] == aid]
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
            roster_athletes = [a for a in get_athletes() if a["id"] in event.get("athlete_ids", [])]
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


def get_event_prep(event_id):
    """Build prep data for an event: athletes, schools, checklist, blockers"""
    event = get_event(event_id)
    if not event:
        return None

    athlete_ids = event.get("athlete_ids", [])
    school_ids = event.get("school_ids", [])

    # Athletes attending with prep status
    athletes_attending = []
    blockers = []

    for aid in athlete_ids:
        athlete = next((a for a in get_athletes() if a["id"] == aid), None)
        if not athlete:
            continue

        # Get interventions for this athlete
        athlete_interventions = [i for i in get_interventions() if i["athlete_id"] == aid]
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
                })
        elif any(i["category"] == "readiness_issue" for i in athlete_interventions):
            prep_status = "needs_attention"
        else:
            prep_status = "ready"

        # Cross-reference athlete's target schools with event schools
        athlete_school_targets = []
        for sid in school_ids:
            school = next((s for s in SCHOOLS if s["id"] == sid), None)
            if school:
                athlete_school_targets.append(school["name"])
        # Limit to a realistic subset based on athlete's target count
        target_count = min(athlete.get("school_targets", 3), len(athlete_school_targets))
        athlete_school_targets = athlete_school_targets[:target_count]

        athletes_attending.append({
            "id": aid,
            "full_name": athlete["full_name"],
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
        school = next((s for s in SCHOOLS if s["id"] == sid), None)
        if school:
            overlap = sum(1 for a in athletes_attending if school["name"] in a["targetSchoolsAtEvent"])
            target_schools.append({
                "id": school["id"],
                "name": school["name"],
                "division": school["division"],
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


def capture_note(event_id, data):
    """Capture a live event note"""
    event = get_event(event_id)
    if not event:
        return None

    athlete = next((a for a in get_athletes() if a["id"] == data["athlete_id"]), None)
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

"""AI Intelligence endpoints — GPT-5.2 powered insights."""

import logging
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
from auth_middleware import get_current_user_dep
from services.ownership import get_visible_athlete_ids, can_access_athlete
from services.ai import (
    generate_program_narrative,
    generate_event_recap,
    generate_advocacy_draft,
    generate_daily_briefing,
)
from mock_data import (
    ATHLETES,
    PRIORITY_ALERTS,
    UPCOMING_EVENTS,
    ATHLETES_NEEDING_ATTENTION,
    PROGRAM_SNAPSHOT,
    get_program_snapshot,
)
from services.ownership import filter_by_athlete_id, filter_events_by_ownership
from program_engine import compute_all as compute_program_intelligence
from event_engine import get_event, get_event_summary
from advocacy_engine import get_event_context
from support_pod import get_athlete as sp_get_athlete
from db_client import db

log = logging.getLogger(__name__)
router = APIRouter()


@router.post("/ai/program-narrative")
async def program_narrative(current_user: dict = get_current_user_dep()):
    """Generate a narrative briefing for Program Intelligence."""
    coach_id = None
    if current_user["role"] == "coach":
        coach_id = current_user["name"]

    data = compute_program_intelligence(coach_id=coach_id)
    view_mode = data.get("view_mode", "program")

    try:
        text = await generate_program_narrative(data, view_mode)
    except RuntimeError as e:
        log.error(f"AI program narrative failed: {e}")
        raise HTTPException(status_code=503, detail="AI service temporarily unavailable. Please try again.")
    return {
        "text": text,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "view_mode": view_mode,
    }


@router.post("/ai/event-recap/{event_id}")
async def event_recap(event_id: str, current_user: dict = get_current_user_dep()):
    """Generate a recap summary from event notes."""
    event = get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Get notes from DB
    notes = await db.event_notes.find(
        {"event_id": event_id}, {"_id": 0}
    ).to_list(200)

    if not notes:
        raise HTTPException(status_code=400, detail="No notes captured for this event yet")

    # Enrich notes with athlete names
    visible = get_visible_athlete_ids(current_user)
    athlete_map = {a["id"]: a.get("fullName", a.get("name", "Unknown")) for a in ATHLETES}
    enriched_notes = []
    for n in notes:
        if current_user["role"] != "director" and n.get("athlete_id") not in visible:
            continue
        enriched = {**n, "athlete_name": athlete_map.get(n.get("athlete_id"), "Unknown")}
        enriched_notes.append(enriched)

    if not enriched_notes:
        raise HTTPException(status_code=400, detail="No notes for your athletes at this event")

    try:
        text = await generate_event_recap(event, enriched_notes)
    except RuntimeError as e:
        log.error(f"AI event recap failed: {e}")
        raise HTTPException(status_code=503, detail="AI service temporarily unavailable. Please try again.")
    return {
        "text": text,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "event_name": event.get("name"),
        "notes_analyzed": len(enriched_notes),
    }


@router.post("/ai/advocacy-draft/{athlete_id}/{school_id}")
async def advocacy_draft(
    athlete_id: str,
    school_id: str,
    current_user: dict = get_current_user_dep(),
):
    """Generate a recommendation draft for an athlete-school pair."""
    if not can_access_athlete(current_user, athlete_id):
        raise HTTPException(status_code=403, detail="You don't have access to this athlete")

    athlete = sp_get_athlete(athlete_id)
    if not athlete:
        raise HTTPException(status_code=404, detail="Athlete not found")

    # Get school info and event context
    context = get_event_context(athlete_id, school_id)
    school = context.get("school", {"id": school_id, "name": school_id})
    event_notes = context.get("notes", [])

    try:
        text = await generate_advocacy_draft(athlete, school, event_notes)
    except RuntimeError as e:
        log.error(f"AI advocacy draft failed: {e}")
        raise HTTPException(status_code=503, detail="AI service temporarily unavailable. Please try again.")
    return {
        "text": text,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "athlete_name": athlete.get("fullName") or athlete.get("name"),
        "school_name": school.get("name", school_id),
        "notes_used": len(event_notes),
    }


@router.post("/ai/briefing")
async def daily_briefing(current_user: dict = get_current_user_dep()):
    """Generate prioritized daily actions for Mission Control."""
    alerts = filter_by_athlete_id(PRIORITY_ALERTS, current_user)
    attention = filter_by_athlete_id(ATHLETES_NEEDING_ATTENTION, current_user)
    events = filter_events_by_ownership(UPCOMING_EVENTS, current_user)

    if current_user["role"] == "director":
        snapshot = PROGRAM_SNAPSHOT
    else:
        visible = get_visible_athlete_ids(current_user)
        my_athletes = [a for a in ATHLETES if a["id"] in visible]
        snapshot = get_program_snapshot(my_athletes)

    # Enrich alerts and attention with athlete names
    athlete_map = {a["id"]: a.get("fullName", a.get("name", "Unknown")) for a in ATHLETES}
    for a in alerts:
        a["athlete_name"] = athlete_map.get(a.get("athlete_id"), "Unknown")
    for a in attention:
        a["athlete_name"] = athlete_map.get(a.get("athlete_id"), "Unknown")

    data = {
        "alerts": alerts,
        "events": events,
        "attention": attention,
        "snapshot": snapshot,
    }

    try:
        text = await generate_daily_briefing(data, current_user["name"])
    except RuntimeError as e:
        log.error(f"AI daily briefing failed: {e}")
        raise HTTPException(status_code=503, detail="AI service temporarily unavailable. Please try again.")
    return {
        "text": text,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "alerts_count": len(alerts),
        "events_count": len(events),
    }

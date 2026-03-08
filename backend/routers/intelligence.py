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
    generate_suggested_actions,
    generate_pod_actions,
    generate_pod_brief,
    generate_program_insights,
    generate_event_followups,
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
from support_pod import (
    get_athlete as sp_get_athlete,
    get_athlete_interventions,
    generate_suggested_actions as generate_pod_suggested_actions,
    explain_pod_health,
    get_relevant_events,
)
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
    """Generate prioritized daily actions for Mission Control.

    Uses the SAME data filters as the director's dashboard to ensure
    the AI brief is consistent with what the user sees on screen.
    """
    attention = filter_by_athlete_id(ATHLETES_NEEDING_ATTENTION, current_user)
    events = filter_events_by_ownership(UPCOMING_EVENTS, current_user)

    # Filter to future events only — same as dashboard
    upcoming_events = sorted(
        [e for e in events if e.get("daysAway", 99) >= 0],
        key=lambda e: e.get("daysAway", 99),
    )[:5]

    if current_user["role"] == "director":
        snapshot = PROGRAM_SNAPSHOT
    else:
        visible = get_visible_athlete_ids(current_user)
        my_athletes = [a for a in ATHLETES if a["id"] in visible]
        snapshot = get_program_snapshot(my_athletes)

    # Enrich attention items with athlete names
    athlete_map = {a["id"]: a.get("fullName", a.get("name", "Unknown")) for a in ATHLETES}
    for a in attention:
        a["athlete_name"] = athlete_map.get(a.get("athlete_id"), "Unknown")

    # Use attention items (same source as dashboard "Needs Attention" section)
    data = {
        "alerts": attention[:8],
        "events": upcoming_events,
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
        "alerts_count": len(attention),
        "events_count": len(upcoming_events),
    }



# ── AI V2 Endpoints ──────────────────────────────────────────────────────────


def _parse_structured_actions(raw: str) -> list:
    """Parse LLM output into structured action objects."""
    actions = []
    current = {}
    for line in raw.strip().split("\n"):
        line = line.strip()
        if line == "---":
            if current.get("action"):
                actions.append(current)
            current = {}
            continue
        for prefix in ["ACTION:", "WHY:", "EVIDENCE:", "OWNER:", "PRIORITY:", "CATEGORY:", "ATHLETE:", "SEVERITY:", "RECOMMENDATION:"]:
            if line.upper().startswith(prefix):
                key = prefix.rstrip(":").lower()
                current[key] = line[len(prefix):].strip()
                break
    if current.get("action"):
        actions.append(current)
    return actions


def _parse_pod_brief(raw: str) -> dict:
    """Parse LLM output into structured pod brief."""
    lines = raw.strip().split("\n")
    text_lines = []
    status_signal = "stable"
    key_facts = []

    for line in lines:
        stripped = line.strip()
        if stripped.upper().startswith("STATUS_SIGNAL:"):
            val = stripped.split(":", 1)[1].strip().lower()
            if val in ("needs_attention", "stable", "improving"):
                status_signal = val
        elif stripped.upper().startswith("FACT:"):
            parts = stripped.split("|")
            if len(parts) >= 2:
                label = parts[0].replace("FACT:", "").strip()
                value = parts[1].strip() if len(parts) > 1 else ""
                flag = parts[2].strip() if len(parts) > 2 else None
                if flag and flag.lower() == "null":
                    flag = None
                key_facts.append({"label": label, "value": value, "flag": flag})
        elif stripped.upper().startswith("ACTION:") or stripped.upper().startswith("WHY:") or stripped.upper().startswith("EVIDENCE:"):
            continue  # skip action lines if they bleed in
        elif stripped:
            text_lines.append(stripped)

    return {
        "text": " ".join(text_lines),
        "status_signal": status_signal,
        "key_facts": key_facts,
    }


def _parse_program_insights(raw: str) -> dict:
    """Parse LLM output into narrative + structured insights."""
    lines = raw.strip().split("\n")
    narrative_lines = []
    insights = []
    current = {}
    in_insights = False

    for line in lines:
        stripped = line.strip()
        if stripped == "---":
            if current.get("insight"):
                insights.append(current)
            current = {}
            in_insights = True
            continue
        if stripped.upper().startswith("INSIGHT:"):
            in_insights = True
            current["insight"] = stripped.split(":", 1)[1].strip()
        elif stripped.upper().startswith("WHY:") and in_insights:
            current["why"] = stripped.split(":", 1)[1].strip()
        elif stripped.upper().startswith("EVIDENCE:") and in_insights:
            current["evidence"] = stripped.split(":", 1)[1].strip()
        elif stripped.upper().startswith("RECOMMENDATION:") and in_insights:
            current["recommendation"] = stripped.split(":", 1)[1].strip()
        elif stripped.upper().startswith("SEVERITY:") and in_insights:
            current["severity"] = stripped.split(":", 1)[1].strip().lower()
        elif not in_insights and stripped:
            narrative_lines.append(stripped)

    if current.get("insight"):
        insights.append(current)

    return {
        "narrative": " ".join(narrative_lines),
        "insights": insights,
    }


@router.post("/ai/suggested-actions")
async def suggested_actions(current_user: dict = get_current_user_dep()):
    """V2: Generate structured next-action suggestions for Mission Control."""
    visible = get_visible_athlete_ids(current_user)
    athlete_map = {a["id"]: a.get("fullName", a.get("name", "Unknown")) for a in ATHLETES if a["id"] in visible}

    alerts = [a for a in PRIORITY_ALERTS if a.get("athlete_id") in visible]
    for a in alerts:
        a["athlete_name"] = athlete_map.get(a.get("athlete_id"), "Unknown")

    events = filter_events_by_ownership(UPCOMING_EVENTS, current_user)
    attention = [a for a in ATHLETES_NEEDING_ATTENTION if a.get("athlete_id") in visible]
    for a in attention:
        a["athlete_name"] = athlete_map.get(a.get("athlete_id"), "Unknown")

    snapshot = PROGRAM_SNAPSHOT if current_user["role"] == "director" else get_program_snapshot([a for a in ATHLETES if a["id"] in visible])

    # Aging recommendations
    aging_recs = await db.recommendations.find(
        {"status": {"$nin": ["closed"]}, "athlete_id": {"$in": list(visible)}},
        {"_id": 0, "id": 1, "athlete_id": 1, "school_name": 1, "status": 1, "created_at": 1},
    ).to_list(20)
    for r in aging_recs:
        r["athlete_name"] = athlete_map.get(r.get("athlete_id"), "Unknown")
        created = r.get("created_at", "")
        if created:
            try:
                days = (datetime.now(timezone.utc) - datetime.fromisoformat(created)).days
                r["days_since_sent"] = days
            except Exception:
                r["days_since_sent"] = "?"

    data = {
        "alerts": alerts,
        "events": events,
        "attention": attention,
        "snapshot": snapshot,
        "aging_recs": aging_recs,
    }

    scope = "full program" if current_user["role"] == "director" else "your athletes"
    try:
        raw = await generate_suggested_actions(data, current_user["name"], scope)
    except RuntimeError as e:
        log.error(f"AI suggested actions failed: {e}")
        raise HTTPException(status_code=503, detail="AI service temporarily unavailable. Please try again.")

    actions = _parse_structured_actions(raw)

    # Confidence indicator
    n_alerts = len(alerts)
    n_events = len(events)
    n_attention = len(attention)
    n_recs = len(aging_recs)
    total_signals = n_alerts + n_events + n_attention + n_recs
    parts = []
    if n_alerts:
        parts.append(f"{n_alerts} priority alert{'s' if n_alerts != 1 else ''}")
    if n_events:
        parts.append(f"{n_events} upcoming event{'s' if n_events != 1 else ''}")
    if n_attention:
        parts.append(f"{n_attention} athlete{'s' if n_attention != 1 else ''} needing attention")
    if n_recs:
        parts.append(f"{n_recs} open recommendation{'s' if n_recs != 1 else ''}")

    if total_signals >= 8:
        signal = "strong"
    elif total_signals >= 3:
        signal = "moderate"
    else:
        signal = "limited"

    basis = f"Based on {', '.join(parts)}" if parts else "Limited data: no active alerts, events, or recommendations"

    return {
        "actions": actions,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "scope": scope,
        "confidence": {"signal": signal, "basis": basis},
    }


@router.post("/ai/pod-actions/{athlete_id}")
async def pod_actions_ai(athlete_id: str, current_user: dict = get_current_user_dep()):
    """V2: Generate AI-suggested next actions for an athlete's Support Pod."""
    if not can_access_athlete(current_user, athlete_id):
        raise HTTPException(status_code=403, detail="You don't have access to this athlete")

    athlete = sp_get_athlete(athlete_id)
    if not athlete:
        raise HTTPException(status_code=404, detail="Athlete not found")

    interventions = get_athlete_interventions(athlete_id)
    saved_actions = await db.pod_actions.find({"athlete_id": athlete_id}, {"_id": 0}).to_list(100)
    timeline_count = await db.athlete_notes.count_documents({"athlete_id": athlete_id})
    timeline_count += await db.assignments.count_documents({"athlete_id": athlete_id})
    events = get_relevant_events(athlete_id)

    try:
        raw = await generate_pod_actions(athlete, interventions, saved_actions, timeline_count, events)
    except RuntimeError as e:
        log.error(f"AI pod actions failed: {e}")
        raise HTTPException(status_code=503, detail="AI service temporarily unavailable. Please try again.")

    actions = _parse_structured_actions(raw)
    return {
        "actions": actions,
        "athlete_name": athlete.get("fullName", athlete.get("name")),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/ai/pod-brief/{athlete_id}")
async def pod_brief_ai(athlete_id: str, current_user: dict = get_current_user_dep()):
    """V2: Generate a top-level brief for an athlete's Support Pod."""
    if not can_access_athlete(current_user, athlete_id):
        raise HTTPException(status_code=403, detail="You don't have access to this athlete")

    athlete = sp_get_athlete(athlete_id)
    if not athlete:
        raise HTTPException(status_code=404, detail="Athlete not found")

    interventions = get_athlete_interventions(athlete_id)
    pod_health = explain_pod_health(athlete, interventions)
    # pod_health returns {"status": "red/yellow/green", "reason": "..."}
    pod_health_data = {"score": pod_health.get("status", "unknown"), "label": pod_health.get("reason", "")}
    saved_actions = await db.pod_actions.find({"athlete_id": athlete_id}, {"_id": 0}).to_list(100)
    timeline_count = await db.athlete_notes.count_documents({"athlete_id": athlete_id})

    try:
        raw = await generate_pod_brief(athlete, interventions, pod_health_data, saved_actions, timeline_count)
    except RuntimeError as e:
        log.error(f"AI pod brief failed: {e}")
        raise HTTPException(status_code=503, detail="AI service temporarily unavailable. Please try again.")

    parsed = _parse_pod_brief(raw)

    # Confidence indicator
    n_interventions = len(interventions)
    n_actions = len(saved_actions)
    parts = []
    if timeline_count:
        parts.append(f"{timeline_count} timeline event{'s' if timeline_count != 1 else ''}")
    if n_interventions:
        parts.append(f"{n_interventions} intervention{'s' if n_interventions != 1 else ''}")
    if n_actions:
        parts.append(f"{n_actions} pod action{'s' if n_actions != 1 else ''}")
    total = timeline_count + n_interventions + n_actions
    if total >= 6:
        signal = "strong"
    elif total >= 2:
        signal = "moderate"
    else:
        signal = "limited"
    basis = f"Based on {', '.join(parts)}" if parts else "Limited data: no recent pod activity"

    return {
        **parsed,
        "athlete_name": athlete.get("fullName", athlete.get("name")),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "confidence": {"signal": signal, "basis": basis},
    }


@router.post("/ai/program-insights")
async def program_insights_ai(current_user: dict = get_current_user_dep()):
    """V2: Generate strategic program-level insights (director-only)."""
    if current_user["role"] != "director":
        raise HTTPException(status_code=403, detail="Program insights are available to directors only")

    data = compute_program_intelligence()
    try:
        raw = await generate_program_insights(data)
    except RuntimeError as e:
        log.error(f"AI program insights failed: {e}")
        raise HTTPException(status_code=503, detail="AI service temporarily unavailable. Please try again.")

    parsed = _parse_program_insights(raw)

    # Confidence indicator
    n_athletes = len(ATHLETES)
    n_events = len(UPCOMING_EVENTS)
    n_recs = await db.recommendations.count_documents({})
    n_notes = await db.event_notes.count_documents({})
    parts = []
    if n_athletes:
        parts.append(f"{n_athletes} athlete{'s' if n_athletes != 1 else ''}")
    if n_events:
        parts.append(f"{n_events} event{'s' if n_events != 1 else ''}")
    if n_recs:
        parts.append(f"{n_recs} recommendation{'s' if n_recs != 1 else ''}")
    if n_notes:
        parts.append(f"{n_notes} event note{'s' if n_notes != 1 else ''}")
    total = n_athletes + n_events + n_recs + n_notes
    if total >= 30:
        signal = "strong"
    elif total >= 10:
        signal = "moderate"
    else:
        signal = "limited"
    basis = f"Based on {', '.join(parts)}" if parts else "Limited data: program has minimal activity"

    return {
        **parsed,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "confidence": {"signal": signal, "basis": basis},
    }


@router.post("/ai/event-followups/{event_id}")
async def event_followups_ai(event_id: str, current_user: dict = get_current_user_dep()):
    """V2: Generate event-driven follow-up suggestions."""
    event = get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Get notes from DB (same pattern as V1 event-recap)
    all_notes = await db.event_notes.find({"event_id": event_id}, {"_id": 0}).to_list(200)
    if not all_notes:
        raise HTTPException(status_code=400, detail="No notes captured for this event yet")

    # Filter notes by ownership
    visible = get_visible_athlete_ids(current_user)
    athlete_map = {a["id"]: a.get("fullName", a.get("name", "Unknown")) for a in ATHLETES}
    notes = []
    for n in all_notes:
        if current_user["role"] != "director" and n.get("athlete_id") not in visible:
            continue
        enriched = {
            **n,
            "athlete_name": athlete_map.get(n.get("athlete_id"), "Unknown"),
            "note": n.get("note_text", n.get("note", "")),
        }
        notes.append(enriched)

    if not notes:
        raise HTTPException(status_code=400, detail="No notes for your athletes at this event")

    # Get existing follow-ups from the summary for dedup
    summary = get_event_summary(event_id)
    existing_followups = summary.get("follow_up_actions", []) if summary else []

    try:
        raw = await generate_event_followups(event, notes, existing_followups)
    except RuntimeError as e:
        log.error(f"AI event followups failed: {e}")
        raise HTTPException(status_code=503, detail="AI service temporarily unavailable. Please try again.")

    followups = _parse_structured_actions(raw)

    # Confidence indicator
    unique_athletes = len(set(n.get("athlete_id") for n in notes))
    unique_schools = len(set(n.get("school_name") for n in notes if n.get("school_name")))
    n_notes = len(notes)
    parts = [f"{n_notes} event note{'s' if n_notes != 1 else ''}"]
    if unique_athletes > 1:
        parts.append(f"{unique_athletes} athletes observed")
    if unique_schools:
        parts.append(f"{unique_schools} school{'s' if unique_schools != 1 else ''} mentioned")
    if existing_followups:
        parts.append(f"{len(existing_followups)} existing follow-up{'s' if len(existing_followups) != 1 else ''}")
    if n_notes >= 8 and unique_athletes >= 3:
        signal = "strong"
    elif n_notes >= 3:
        signal = "moderate"
    else:
        signal = "limited"
    basis = f"Based on {', '.join(parts)}"

    return {
        "followups": followups,
        "event_name": event.get("name"),
        "notes_analyzed": n_notes,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "confidence": {"signal": signal, "basis": basis},
    }

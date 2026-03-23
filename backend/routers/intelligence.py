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
from services.athlete_store import (
    get_all as get_athletes,
    get_alerts,
    get_needing_attention,
    get_snapshot,
)
from mock_data import (
    UPCOMING_EVENTS,
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
from intelligence.payload_builder import build_payload
from intelligence.agents import school_insight as school_insight_agent, timeline as timeline_agent

log = logging.getLogger(__name__)
router = APIRouter()


@router.post("/ai/program-narrative")
async def program_narrative(current_user: dict = get_current_user_dep()):
    """Generate a narrative briefing for Program Intelligence."""
    coach_id = None
    if current_user["role"] == "club_coach":
        coach_id = current_user["name"]

    data = await compute_program_intelligence(coach_id=coach_id)
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
    athlete_map = {a["id"]: a.get("full_name", a.get("name", "Unknown")) for a in await get_athletes()}
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
    body: dict = {},
    current_user: dict = get_current_user_dep(),
):
    """Generate a recommendation draft for an athlete-school pair."""
    if not can_access_athlete(current_user, athlete_id):
        raise HTTPException(status_code=403, detail="You don't have access to this athlete")

    athlete = await sp_get_athlete(athlete_id)
    if not athlete:
        raise HTTPException(status_code=404, detail="Athlete not found")

    # Get school info and event context
    context = await get_event_context(athlete_id, school_id)
    school = context.get("school", {"id": school_id, "name": school_id})
    event_notes = context.get("notes", [])

    # Build extra context from body params
    extra_parts = []
    fit_reasons = body.get("fit_reasons", [])
    if fit_reasons:
        reasons_map = {
            "athletic_ability": "Athletic ability", "tactical_awareness": "Tactical awareness",
            "academic_fit": "Academic fit", "character_leadership": "Character/leadership",
            "coachability": "Coachability", "program_need_match": "Program need match",
        }
        extra_parts.append("Key fit reasons: " + ", ".join(reasons_map.get(r, r) for r in fit_reasons))
    if body.get("fit_note"):
        extra_parts.append(f"Coach's note: {body['fit_note']}")
    if body.get("highlight_video"):
        extra_parts.append(f"Highlight video available: {body['highlight_video']}")
    existing_context = "\n".join(extra_parts)

    try:
        text = await generate_advocacy_draft(athlete, school, event_notes, existing_context)
    except RuntimeError as e:
        log.error(f"AI advocacy draft failed: {e}")
        raise HTTPException(status_code=503, detail="AI service temporarily unavailable. Please try again.")
    return {
        "text": text,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "athlete_name": athlete.get("full_name") or athlete.get("name"),
        "school_name": school.get("name", school_id),
        "notes_used": len(event_notes),
    }


@router.post("/ai/briefing")
async def daily_briefing(current_user: dict = get_current_user_dep()):
    """Generate prioritized daily actions for Mission Control.

    Uses the SAME data filters as the director's dashboard to ensure
    the AI brief is consistent with what the user sees on screen.
    """
    attention = filter_by_athlete_id(await get_needing_attention(), current_user)
    events = filter_events_by_ownership(UPCOMING_EVENTS, current_user)

    # Filter to future events only — same as dashboard
    upcoming_events = sorted(
        [e for e in events if e.get("daysAway", 99) >= 0],
        key=lambda e: e.get("daysAway", 99),
    )[:5]

    if current_user["role"] == "director":
        snapshot = await get_snapshot()
    else:
        visible = get_visible_athlete_ids(current_user)
        my_athletes = [a for a in await get_athletes() if a["id"] in visible]
        snapshot = get_program_snapshot(my_athletes)

    # Enrich attention items with athlete names
    athlete_map = {a["id"]: a.get("full_name", a.get("name", "Unknown")) for a in await get_athletes()}
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
    athlete_map = {a["id"]: a.get("full_name", a.get("name", "Unknown")) for a in await get_athletes() if a["id"] in visible}

    alerts = [a for a in await get_alerts() if a.get("athlete_id") in visible]
    for a in alerts:
        a["athlete_name"] = athlete_map.get(a.get("athlete_id"), "Unknown")

    events = filter_events_by_ownership(UPCOMING_EVENTS, current_user)
    attention = [a for a in await get_needing_attention() if a.get("athlete_id") in visible]
    for a in attention:
        a["athlete_name"] = athlete_map.get(a.get("athlete_id"), "Unknown")

    snapshot = (await get_snapshot()) if current_user["role"] == "director" else get_program_snapshot([a for a in await get_athletes() if a["id"] in visible])

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

    athlete = await sp_get_athlete(athlete_id)
    if not athlete:
        raise HTTPException(status_code=404, detail="Athlete not found")

    interventions = await get_athlete_interventions(athlete_id)
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
        "athlete_name": athlete.get("full_name", athlete.get("name")),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/ai/pod-brief/{athlete_id}")
async def pod_brief_ai(athlete_id: str, current_user: dict = get_current_user_dep()):
    """V2: Generate a top-level brief for an athlete's Support Pod."""
    if not can_access_athlete(current_user, athlete_id):
        raise HTTPException(status_code=403, detail="You don't have access to this athlete")

    athlete = await sp_get_athlete(athlete_id)
    if not athlete:
        raise HTTPException(status_code=404, detail="Athlete not found")

    interventions = await get_athlete_interventions(athlete_id)
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
        "athlete_name": athlete.get("full_name", athlete.get("name")),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "confidence": {"signal": signal, "basis": basis},
    }


@router.post("/ai/program-insights")
async def program_insights_ai(current_user: dict = get_current_user_dep()):
    """V2: Generate strategic program-level insights (director-only)."""
    if current_user["role"] != "director":
        raise HTTPException(status_code=403, detail="Program insights are available to directors only")

    data = await compute_program_intelligence()
    try:
        raw = await generate_program_insights(data)
    except RuntimeError as e:
        log.error(f"AI program insights failed: {e}")
        raise HTTPException(status_code=503, detail="AI service temporarily unavailable. Please try again.")

    parsed = _parse_program_insights(raw)

    # Confidence indicator
    n_athletes = len(await get_athletes())
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
    athlete_map = {a["id"]: a.get("full_name", a.get("name", "Unknown")) for a in await get_athletes()}
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



# ── Intelligence Pipeline Phase 1 ────────────────────────────────────────────

async def _get_tenant_id(current_user: dict) -> str:
    """Resolve tenant_id from the current user's athlete record."""
    athlete = await db.athletes.find_one(
        {"user_id": current_user["id"]}, {"_id": 0, "tenant_id": 1}
    )
    return (athlete or {}).get("tenant_id", "")


CARD_CACHE_TTL_HOURS = 24

from datetime import timedelta


async def _get_cached_card(card_type: str, program_id: str, tenant_id: str) -> dict | None:
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=CARD_CACHE_TTL_HOURS)).isoformat()
    cached = await db.intelligence_cache.find_one(
        {
            "card_type": card_type,
            "program_id": program_id,
            "tenant_id": tenant_id,
            "generated_at": {"$gte": cutoff},
        },
        {"_id": 0},
    )
    return cached


async def _store_card(card: dict, program_id: str, tenant_id: str):
    card_type = card.get("card_type", "unknown")
    await db.intelligence_cache.update_one(
        {"card_type": card_type, "program_id": program_id, "tenant_id": tenant_id},
        {"$set": {**card, "program_id": program_id, "tenant_id": tenant_id}},
        upsert=True,
    )


@router.get("/intelligence/program/{program_id}/school-insight")
async def intelligence_school_insight(
    program_id: str, force: bool = False, current_user: dict = get_current_user_dep()
):
    """School Insight intelligence card — Why This School / Why Not."""
    tenant_id = await _get_tenant_id(current_user)
    if not tenant_id:
        raise HTTPException(status_code=404, detail="No athlete profile found")

    if not force:
        cached = await _get_cached_card("school_insight", program_id, tenant_id)
        if cached:
            cached["from_cache"] = True
            return cached

    payload = await build_payload(program_id, tenant_id, force=force)
    card = await school_insight_agent.analyze(payload)
    card["from_cache"] = False

    await _store_card(card, program_id, tenant_id)
    return card


@router.get("/intelligence/program/{program_id}/timeline")
async def intelligence_timeline(
    program_id: str, force: bool = False, current_user: dict = get_current_user_dep()
):
    """Timeline intelligence card — recruiting timeline and urgency analysis."""
    tenant_id = await _get_tenant_id(current_user)
    if not tenant_id:
        raise HTTPException(status_code=404, detail="No athlete profile found")

    if not force:
        cached = await _get_cached_card("timeline", program_id, tenant_id)
        if cached:
            cached["from_cache"] = True
            return cached

    payload = await build_payload(program_id, tenant_id, force=force)
    card = await timeline_agent.analyze(payload)
    card["from_cache"] = False

    await _store_card(card, program_id, tenant_id)
    return card


# ── Engagement Outlook Card (deterministic, no LLM) ─────────────────────

def _build_next_step(m: dict) -> dict:
    """Build the primary recommended action from metrics. Action-first framing."""
    unanswered = m.get("unanswered_coach_questions", 0)
    overdue = m.get("overdue_followups", 0)
    days_m = m.get("days_since_last_meaningful_engagement")
    trend = m.get("engagement_trend", "insufficient_data")
    meaningful_count = m.get("meaningful_interaction_count", 0)
    health = m.get("pipeline_health_state", "at_risk")

    # Priority order: urgent items first, then proactive guidance
    if unanswered > 0:
        q_word = "question" if unanswered == 1 else "questions"
        return {
            "action": f"Reply to {unanswered} unanswered coach {q_word}",
            "urgency": "high",
            "context": "Coaches who ask questions are actively engaged — a quick reply keeps the conversation going.",
        }

    if overdue > 0:
        return {
            "action": "Send your scheduled follow-up",
            "urgency": "high",
            "context": "You have an overdue follow-up. Reaching out now shows continued interest.",
        }

    if days_m is not None and days_m > 14:
        return {
            "action": "Reach out to keep the conversation alive",
            "urgency": "medium",
            "context": f"It's been {days_m} days since your last meaningful exchange. A short check-in can reignite momentum.",
        }

    if trend in ("decelerating", "stalled") and meaningful_count >= 2:
        return {
            "action": "Re-engage with a thoughtful update",
            "urgency": "medium",
            "context": "Engagement has slowed down. Share a recent highlight or ask a genuine question about the program.",
        }

    if meaningful_count == 0:
        return {
            "action": "Start a conversation with this program",
            "urgency": "low",
            "context": "You haven't had meaningful contact yet. An introductory email or call request is a great first step.",
        }

    if health == "strong_momentum":
        return {
            "action": "Keep it up — engagement is strong",
            "urgency": "none",
            "context": "This relationship is in a great place. Continue responding promptly and showing genuine interest.",
        }

    return {
        "action": "Stay engaged and respond promptly",
        "urgency": "low",
        "context": "The relationship is active. Keep communication flowing to build on this foundation.",
    }


_FRESHNESS_LABELS = {
    "active_recently": {"label": "Active Recently", "color": "green"},
    "needs_follow_up": {"label": "Needs Follow-Up", "color": "amber"},
    "momentum_slowing": {"label": "Momentum Slowing", "color": "orange"},
    "no_recent_engagement": {"label": "No Recent Engagement", "color": "gray"},
}


@router.get("/intelligence/program/{program_id}/engagement-outlook")
async def intelligence_engagement_outlook(
    program_id: str, current_user: dict = get_current_user_dep()
):
    """Engagement Outlook card — deterministic, action-first, no LLM."""
    from services.program_metrics import get_metrics

    tenant_id = await _get_tenant_id(current_user)
    if not tenant_id:
        raise HTTPException(status_code=404, detail="No athlete profile found")

    # Verify ownership
    program = await db.programs.find_one(
        {"program_id": program_id, "tenant_id": tenant_id},
        {"_id": 0, "program_id": 1, "university_name": 1},
    )
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")

    m = await get_metrics(program_id, tenant_id)

    freshness_key = m.get("engagement_freshness_label", "no_recent_engagement")
    freshness = _FRESHNESS_LABELS.get(freshness_key, _FRESHNESS_LABELS["no_recent_engagement"])
    next_step = _build_next_step(m)

    # Signals breakdown (for Pro users — frontend decides what to show)
    signals = []
    last_type = m.get("last_meaningful_engagement_type")
    days_m = m.get("days_since_last_meaningful_engagement")
    if last_type and days_m is not None:
        type_label = last_type.replace("_", " ").replace("-", " ").title()
        if days_m == 0:
            signals.append({"label": f"{type_label} today", "type": "positive"})
        elif days_m == 1:
            signals.append({"label": f"{type_label} yesterday", "type": "positive"})
        elif days_m <= 7:
            signals.append({"label": f"{type_label} {days_m}d ago", "type": "positive"})
        else:
            signals.append({"label": f"Last meaningful: {type_label} {days_m}d ago", "type": "neutral"})
    elif days_m is None:
        signals.append({"label": "No meaningful engagement yet", "type": "neutral"})

    unanswered = m.get("unanswered_coach_questions", 0)
    if unanswered > 0:
        signals.append({"label": f"{unanswered} unanswered coach question{'s' if unanswered > 1 else ''}", "type": "attention"})

    overdue = m.get("overdue_followups", 0)
    if overdue > 0:
        signals.append({"label": "Overdue follow-up", "type": "attention"})

    trend = m.get("engagement_trend", "insufficient_data")
    trend_labels = {
        "accelerating": ("Engagement accelerating", "positive"),
        "steady": ("Steady engagement", "positive"),
        "decelerating": ("Engagement slowing down", "neutral"),
        "stalled": ("Engagement has stalled", "attention"),
        "inactive": ("No recent activity", "neutral"),
    }
    if trend in trend_labels:
        signals.append({"label": trend_labels[trend][0], "type": trend_labels[trend][1]})

    meaningful_count = m.get("meaningful_interaction_count", 0)
    if meaningful_count > 0:
        signals.append({"label": f"{meaningful_count} meaningful interaction{'s' if meaningful_count > 1 else ''}", "type": "positive"})

    return {
        "card_type": "engagement_outlook",
        "program_id": program_id,
        "university_name": program.get("university_name", ""),
        "freshness_label": freshness["label"],
        "freshness_color": freshness["color"],
        "pipeline_health_state": m.get("pipeline_health_state", "at_risk"),
        "next_step": next_step,
        "signals": signals,
        "data_confidence": m.get("data_confidence", "LOW"),
    }

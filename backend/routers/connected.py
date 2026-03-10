"""Connected Experiences — staff-side view into athlete pipeline progress.

Provides a summary-first endpoint shaped for the director/coach use case,
answering: where the athlete stands, which schools are active, what needs
follow-up, where the risks are, and whether momentum is moving.
"""

import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException

from db_client import db
from auth_middleware import get_current_user_dep
from services.athlete_store import get_by_id as get_athlete_by_id
from routers.athlete_dashboard import compute_journey_rail, categorize_program
from models import PipelineResponse

router = APIRouter()
log = logging.getLogger(__name__)

STAGE_ORDER = ["added", "outreach", "in_conversation", "campus_visit", "offer", "committed"]
STAGE_LABELS = {
    "added": "Added",
    "outreach": "Outreach",
    "in_conversation": "Talking",
    "campus_visit": "Visit",
    "offer": "Offered",
    "committed": "Committed",
}


def _require_director_or_assigned(user: dict, athlete: dict):
    """Only directors or the athlete's assigned coach may view."""
    if user["role"] == "director":
        return
    if user["role"] == "coach" and athlete.get("primary_coach_id") == user["id"]:
        return
    raise HTTPException(403, "You don't have access to this athlete's pipeline")


def _classify_risk(program: dict) -> list:
    """Derive risk indicators from program data."""
    risks = []
    board = program.get("board_group", "")
    if board == "overdue":
        risks.append("overdue_followup")
    reply = program.get("reply_status", "")
    if reply in ("No Response", ""):
        risks.append("no_response")
    fd = program.get("follow_up_days")
    if fd and fd > 21:
        risks.append("stale")
    return risks


@router.get("/roster/athlete/{athlete_id}/pipeline", response_model=PipelineResponse)
async def get_athlete_pipeline_summary(
    athlete_id: str,
    current_user: dict = get_current_user_dep(),
):
    """Staff-shaped pipeline summary for a single athlete."""

    # ── Athlete header ──
    athlete = get_athlete_by_id(athlete_id)
    if not athlete:
        raise HTTPException(404, "Athlete not found")

    _require_director_or_assigned(current_user, athlete)

    tenant_id = athlete.get("tenant_id")

    header = {
        "id": athlete["id"],
        "name": athlete.get("full_name", athlete.get("name", "Unknown")),
        "grad_year": athlete.get("grad_year"),
        "position": athlete.get("position"),
        "team": athlete.get("team"),
        "momentum_score": athlete.get("momentum_score", 0),
        "momentum_trend": athlete.get("momentum_trend", "stable"),
        "recruiting_stage": athlete.get("recruiting_stage", "exploring"),
        "days_since_activity": athlete.get("days_since_activity", 0),
        "photo_url": athlete.get("photo_url", ""),
    }

    # Athletes without tenant (seeded mock data) — return header + empty pipeline
    if not tenant_id:
        ms = athlete.get("momentum_score", 0) or 0
        mt = athlete.get("momentum_trend", "stable")
        mom = "strong" if mt == "rising" and ms > 3 else ("declining" if mt == "declining" or ms < -3 else "steady")
        return {
            "header": header,
            "summary": {"total_schools": athlete.get("school_targets", 0), "response_rate": 0, "active_conversations": 0, "overdue_followups": 0, "waiting_on_reply": 0},
            "stage_distribution": [{"stage": s, "label": STAGE_LABELS.get(s, s), "count": 0} for s in STAGE_ORDER],
            "schools": [],
            "recent_activity": [],
            "momentum_assessment": mom,
        }

    # ── Programs ──
    programs = await db.programs.find(
        {"tenant_id": tenant_id, "is_active": {"$ne": False}},
        {"_id": 0},
    ).to_list(200)

    # Enrich each program with journey_rail and board_group
    uni_names = list({p["university_name"] for p in programs if p.get("university_name")})
    kb_entries = await db.university_knowledge_base.find(
        {"university_name": {"$in": uni_names}},
        {"_id": 0, "university_name": 1, "logo_url": 1},
    ).to_list(500)
    kb_map = {e["university_name"]: e for e in kb_entries}

    for p in programs:
        p["journey_rail"] = compute_journey_rail(p)
        p["board_group"] = categorize_program(p)
        kb = kb_map.get(p.get("university_name"), {})
        if not p.get("logo_url"):
            p["logo_url"] = kb.get("logo_url", "")

    # ── Top summary ──
    total = len(programs)
    replied = sum(1 for p in programs if p.get("reply_status") in ("Reply Received", "Positive"))
    overdue = sum(1 for p in programs if p.get("board_group") == "overdue")
    waiting = sum(1 for p in programs if p.get("board_group") == "waiting_on_reply")
    in_convo = sum(1 for p in programs if p.get("board_group") == "in_conversation")
    response_rate = round((replied / total * 100) if total > 0 else 0)

    summary = {
        "total_schools": total,
        "response_rate": response_rate,
        "active_conversations": in_convo,
        "overdue_followups": overdue,
        "waiting_on_reply": waiting,
    }

    # ── Stage distribution ──
    stage_counts = {s: 0 for s in STAGE_ORDER}
    for p in programs:
        rail = p.get("journey_rail", {})
        active = rail.get("active", "added")
        if active in stage_counts:
            stage_counts[active] += 1
        else:
            stage_counts["added"] += 1

    stage_distribution = [
        {"stage": s, "label": STAGE_LABELS.get(s, s), "count": stage_counts[s]}
        for s in STAGE_ORDER
    ]

    # ── Schools grouped by stage ──
    schools_by_stage = {s: [] for s in STAGE_ORDER}
    for p in programs:
        rail = p.get("journey_rail", {})
        active_stage = rail.get("active", "added")
        if active_stage not in schools_by_stage:
            active_stage = "added"

        risks = _classify_risk(p)

        schools_by_stage[active_stage].append({
            "program_id": p["program_id"],
            "university_name": p.get("university_name", ""),
            "logo_url": p.get("logo_url", ""),
            "division": p.get("division", ""),
            "conference": p.get("conference", ""),
            "primary_coach": p.get("primary_college_coach", ""),
            "reply_status": p.get("reply_status", ""),
            "board_group": p.get("board_group", ""),
            "follow_up_days": p.get("follow_up_days"),
            "next_action": p.get("next_action", ""),
            "next_action_due": p.get("next_action_due", ""),
            "priority": p.get("priority", ""),
            "pulse": rail.get("pulse", ""),
            "risks": risks,
            "updated_at": p.get("updated_at", ""),
        })

    # Filter empty stages from response
    schools_grouped = [
        {"stage": s, "label": STAGE_LABELS.get(s, s), "schools": schools_by_stage[s]}
        for s in STAGE_ORDER
        if schools_by_stage[s]
    ]

    # ── Recent activity ──
    interactions = await db.interactions.find(
        {"tenant_id": tenant_id},
        {"_id": 0},
    ).sort("created_at", -1).to_list(10)

    recent_activity = [
        {
            "type": ix.get("type", ""),
            "university_name": ix.get("university_name", ""),
            "notes": (ix.get("notes", "") or "")[:120],
            "outcome": ix.get("outcome", ""),
            "date": ix.get("created_at", ix.get("date_time", "")),
        }
        for ix in interactions
    ]

    # ── Momentum assessment ──
    ms = athlete.get("momentum_score", 0) or 0
    mt = athlete.get("momentum_trend", "stable")
    if mt == "rising" and ms > 3:
        momentum_assessment = "strong"
    elif mt == "declining" or ms < -3:
        momentum_assessment = "declining"
    else:
        momentum_assessment = "steady"

    return {
        "header": header,
        "summary": summary,
        "stage_distribution": stage_distribution,
        "schools": schools_grouped,
        "recent_activity": recent_activity,
        "momentum_assessment": momentum_assessment,
    }

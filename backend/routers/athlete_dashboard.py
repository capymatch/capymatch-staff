"""Athlete-facing routes — programs (school pipeline), events, interactions, dashboard.

All endpoints are scoped by the athlete's tenant_id, derived from the
athletes collection via the user's JWT user_id.
"""

from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
from auth_middleware import get_current_user_dep
from db_client import db

router = APIRouter()


async def _get_tenant_id(current_user: dict) -> str:
    """Resolve tenant_id from the user's linked athlete record."""
    if current_user["role"] not in ("athlete", "parent"):
        raise HTTPException(403, "Only athletes/parents can access this")
    athlete = await db.athletes.find_one(
        {"user_id": current_user["id"]}, {"_id": 0, "tenant_id": 1}
    )
    if not athlete or not athlete.get("tenant_id"):
        raise HTTPException(404, "No claimed athlete profile found")
    return athlete["tenant_id"]


# ── Programs (School Pipeline) ───────────────────────────────────────────


@router.get("/athlete/programs")
async def list_programs(current_user: dict = get_current_user_dep()):
    tenant_id = await _get_tenant_id(current_user)
    programs = await db.programs.find(
        {"tenant_id": tenant_id}, {"_id": 0}
    ).sort("updated_at", -1).to_list(200)
    return programs


@router.get("/athlete/programs/{program_id}")
async def get_program(program_id: str, current_user: dict = get_current_user_dep()):
    tenant_id = await _get_tenant_id(current_user)
    prog = await db.programs.find_one(
        {"tenant_id": tenant_id, "program_id": program_id}, {"_id": 0}
    )
    if not prog:
        raise HTTPException(404, "Program not found")
    return prog


@router.post("/athlete/programs")
async def add_program(body: dict, current_user: dict = get_current_user_dep()):
    tenant_id = await _get_tenant_id(current_user)
    import uuid
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "program_id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "university_name": body.get("university_name", ""),
        "division": body.get("division", ""),
        "conference": body.get("conference", ""),
        "region": body.get("region", ""),
        "recruiting_status": body.get("recruiting_status", "Not Contacted"),
        "reply_status": body.get("reply_status", "No Reply"),
        "priority": body.get("priority", "Medium"),
        "next_action": body.get("next_action", ""),
        "next_action_due": body.get("next_action_due", ""),
        "notes": body.get("notes", ""),
        "website": body.get("website", ""),
        "initial_contact_sent": "",
        "last_follow_up": "",
        "follow_up_days": 14,
        "created_at": now,
        "updated_at": now,
    }
    await db.programs.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/athlete/programs/{program_id}")
async def update_program(program_id: str, body: dict, current_user: dict = get_current_user_dep()):
    tenant_id = await _get_tenant_id(current_user)
    body.pop("_id", None)
    body.pop("program_id", None)
    body.pop("tenant_id", None)
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.programs.update_one(
        {"tenant_id": tenant_id, "program_id": program_id},
        {"$set": body},
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Program not found")
    updated = await db.programs.find_one(
        {"tenant_id": tenant_id, "program_id": program_id}, {"_id": 0}
    )
    return updated


@router.delete("/athlete/programs/{program_id}")
async def delete_program(program_id: str, current_user: dict = get_current_user_dep()):
    tenant_id = await _get_tenant_id(current_user)
    result = await db.programs.delete_one(
        {"tenant_id": tenant_id, "program_id": program_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(404, "Program not found")
    return {"deleted": True}


# ── Events ────────────────────────────────────────────────────────────────


@router.get("/athlete/events")
async def list_events(current_user: dict = get_current_user_dep()):
    tenant_id = await _get_tenant_id(current_user)
    events = await db.athlete_events.find(
        {"tenant_id": tenant_id}, {"_id": 0}
    ).sort("start_date", 1).to_list(200)
    return events


@router.post("/athlete/events")
async def create_event(body: dict, current_user: dict = get_current_user_dep()):
    tenant_id = await _get_tenant_id(current_user)
    import uuid
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "event_id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "title": body.get("title", ""),
        "event_type": body.get("event_type", "Other"),
        "location": body.get("location", ""),
        "description": body.get("description", ""),
        "start_date": body.get("start_date", ""),
        "end_date": body.get("end_date", ""),
        "start_time": body.get("start_time", ""),
        "end_time": body.get("end_time", ""),
        "program_id": body.get("program_id"),
        "created_at": now,
    }
    await db.athlete_events.insert_one(doc)
    doc.pop("_id", None)
    return doc


# ── Interactions ──────────────────────────────────────────────────────────


@router.get("/athlete/interactions")
async def list_interactions(current_user: dict = get_current_user_dep()):
    tenant_id = await _get_tenant_id(current_user)
    interactions = await db.interactions.find(
        {"tenant_id": tenant_id}, {"_id": 0}
    ).sort("date_time", -1).to_list(50)
    return interactions


# ── Dashboard ─────────────────────────────────────────────────────────────


@router.get("/athlete/dashboard")
async def get_athlete_dashboard(current_user: dict = get_current_user_dep()):
    """Aggregated dashboard data for the athlete."""
    tenant_id = await _get_tenant_id(current_user)

    programs = await db.programs.find(
        {"tenant_id": tenant_id}, {"_id": 0}
    ).to_list(200)

    events = await db.athlete_events.find(
        {"tenant_id": tenant_id}, {"_id": 0}
    ).sort("start_date", 1).to_list(50)

    interactions = await db.interactions.find(
        {"tenant_id": tenant_id}, {"_id": 0}
    ).sort("date_time", -1).to_list(50)

    # Get athlete profile
    athlete = await db.athletes.find_one(
        {"user_id": current_user["id"]}, {"_id": 0}
    )

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    follow_ups_due = len([
        p for p in programs
        if p.get("next_action_due") and p["next_action_due"] <= today
        and p.get("recruiting_status") != "Not a Fit / Closed"
    ])

    return {
        "programs": programs,
        "events": events,
        "interactions": interactions,
        "profile": {
            "athlete_name": athlete.get("fullName", "") if athlete else "",
            "firstName": athlete.get("firstName", "") if athlete else "",
            "position": athlete.get("position", "") if athlete else "",
            "team": athlete.get("team", "") if athlete else "",
            "gradYear": athlete.get("gradYear") if athlete else None,
        },
        "total_schools": len(programs),
        "follow_ups_due": follow_ups_due,
        "gmail_connected": False,  # Gmail not migrated yet
    }

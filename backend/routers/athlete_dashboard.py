"""Athlete-facing routes: programs CRUD, college coaches, interactions, dashboard.

All data is scoped by `tenant_id`, resolved from the athlete's claimed record.
Uses the unified JWT auth middleware throughout.
"""

from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timezone, timedelta
from typing import Optional
import asyncio
import uuid

from auth_middleware import get_current_user_dep
from db_client import db

router = APIRouter()

# ─────────────────────────────────────────────────────────────────────────
# Adapter: JWT user → tenant_id
# ─────────────────────────────────────────────────────────────────────────

async def get_athlete_tenant(current_user: dict) -> str:
    """Resolve tenant_id from the user's linked athlete record."""
    if current_user["role"] not in ("athlete", "parent"):
        raise HTTPException(403, "Only athletes/parents can access this")
    athlete = await db.athletes.find_one(
        {"user_id": current_user["id"]}, {"_id": 0, "tenant_id": 1}
    )
    if not athlete or not athlete.get("tenant_id"):
        raise HTTPException(404, "No claimed athlete profile found")
    return athlete["tenant_id"]


# ─────────────────────────────────────────────────────────────────────────
# Interaction signal computation (ported from athlete app programs.py)
# ─────────────────────────────────────────────────────────────────────────

def _compute_signals_from_interactions(interactions: list) -> dict:
    """Pure computation of signals from a list of interactions."""
    now = datetime.now(timezone.utc)
    outreach_count = 0
    reply_count = 0
    has_coach_reply = False
    last_outreach_date = None
    last_reply_date = None
    last_activity_date = None
    total_interactions = len(interactions)

    for ix in interactions:
        ix_type = (ix.get("type") or "").lower()
        dt_str = ix.get("date_time") or ix.get("created_at", "")
        try:
            dt = datetime.fromisoformat(str(dt_str).replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
        except Exception:
            dt = None

        if dt and (last_activity_date is None or dt > last_activity_date):
            last_activity_date = dt

        if ix_type not in ("coach_reply", "email_received"):
            outreach_count += 1
            if dt and (last_outreach_date is None or dt > last_outreach_date):
                last_outreach_date = dt

        if ix_type in ("coach_reply", "email_received"):
            has_coach_reply = True
            reply_count += 1
            if dt and (last_reply_date is None or dt > last_reply_date):
                last_reply_date = dt

    days_since_outreach = (now - last_outreach_date).days if last_outreach_date else None
    days_since_reply = (now - last_reply_date).days if last_reply_date else None
    days_since_activity = (now - last_activity_date).days if last_activity_date else None

    return {
        "outreach_count": outreach_count,
        "reply_count": reply_count,
        "has_coach_reply": has_coach_reply,
        "last_outreach_date": last_outreach_date.isoformat() if last_outreach_date else None,
        "last_reply_date": last_reply_date.isoformat() if last_reply_date else None,
        "days_since_outreach": days_since_outreach,
        "days_since_reply": days_since_reply,
        "days_since_activity": days_since_activity,
        "total_interactions": total_interactions,
    }


async def _batch_signals(tenant_id: str, program_ids: list) -> dict:
    """Batch compute interaction signals for multiple programs in ONE query."""
    all_interactions = await db.interactions.find(
        {"tenant_id": tenant_id, "program_id": {"$in": program_ids}},
        {"_id": 0},
    ).to_list(5000)

    by_program = {}
    for ix in all_interactions:
        pid = ix.get("program_id")
        by_program.setdefault(pid, []).append(ix)

    return {
        pid: _compute_signals_from_interactions(by_program.get(pid, []))
        for pid in program_ids
    }


# ─────────────────────────────────────────────────────────────────────────
# Board grouping (ported from athlete app programs.py)
# ─────────────────────────────────────────────────────────────────────────

def compute_journey_rail(program: dict) -> dict:
    """
    Compute the 6-stage journey rail for a program.
    Stages: added, outreach, in_conversation, campus_visit, offer, committed
    Auto-detects stages from signals/interactions. Manual override cascades.
    """
    signals = program.get("signals", {})
    manual_stage = program.get("journey_stage", "")

    LEGACY_MAP = {"outreach_sent": "outreach", "coach_replied": "in_conversation"}
    if manual_stage in LEGACY_MAP:
        manual_stage = LEGACY_MAP[manual_stage]

    RAIL_ORDER = ["added", "outreach", "in_conversation", "campus_visit", "offer", "committed"]

    # Auto-detect stages from data
    stages = {
        "added": True,
        "outreach": signals.get("outreach_count", 0) > 0,
        "in_conversation": signals.get("has_coach_reply", False),
        "campus_visit": False,
        "offer": False,
        "committed": False,
    }

    # Manual override: cascade fill all stages up to and including the manual stage
    if manual_stage and manual_stage in RAIL_ORDER:
        manual_idx = RAIL_ORDER.index(manual_stage)
        for i in range(manual_idx + 1):
            stages[RAIL_ORDER[i]] = True

    # Active = last consecutively completed stage
    active = "added"
    for s in RAIL_ORDER:
        if stages[s]:
            active = s
        else:
            break

    line_fill = active

    # Compute pulse — relationship health
    days = signals.get("days_since_activity")
    if days is None:
        pulse = "neutral"
    elif days <= 7:
        pulse = "hot"
    elif days <= 14:
        pulse = "warm"
    else:
        pulse = "cold"

    return {
        "stages": stages,
        "active": active,
        "line_fill": line_fill,
        "pulse": pulse,
    }


def categorize_program(program: dict) -> str:
    """
    5-stage recruiting funnel:
    1. archived — is_active = false
    2. overdue  — follow-up date has passed
    3. in_conversation — college coach has replied
    4. waiting_on_reply — outreach sent, no reply
    5. needs_outreach — no interactions yet
    """
    if not program.get("is_active", True):
        return "archived"

    next_action_due = program.get("next_action_due", "")
    if next_action_due:
        try:
            due_date = datetime.strptime(next_action_due, "%Y-%m-%d").date()
            if due_date < datetime.now(timezone.utc).date():
                return "overdue"
        except ValueError:
            pass

    signals = program.get("signals", {})

    if signals.get("has_coach_reply", False):
        return "in_conversation"

    if signals.get("outreach_count", 0) > 0:
        return "waiting_on_reply"

    return "needs_outreach"


# ─────────────────────────────────────────────────────────────────────────
# Programs CRUD
# ─────────────────────────────────────────────────────────────────────────

@router.get("/athlete/programs")
async def list_programs(
    current_user: dict = get_current_user_dep(),
    grouped: Optional[bool] = Query(False),
    recruiting_status: Optional[str] = None,
    division: Optional[str] = None,
    priority: Optional[str] = None,
    search: Optional[str] = None,
):
    tenant_id = await get_athlete_tenant(current_user)
    query = {"tenant_id": tenant_id}
    if recruiting_status:
        query["recruiting_status"] = recruiting_status
    if division:
        query["division"] = division
    if priority:
        query["priority"] = priority
    if search:
        query["university_name"] = {"$regex": search, "$options": "i"}

    programs = await db.programs.find(query, {"_id": 0}).to_list(200)

    # Batch-fetch signals, college coaches, and KB logos
    program_ids = [p["program_id"] for p in programs]
    uni_names = list({p["university_name"] for p in programs if p.get("university_name")})
    signals_map, all_coaches, kb_entries = await asyncio.gather(
        _batch_signals(tenant_id, program_ids),
        db.college_coaches.find(
            {"tenant_id": tenant_id, "program_id": {"$in": program_ids}},
            {"_id": 0},
        ).to_list(2000),
        db.university_knowledge_base.find(
            {"university_name": {"$in": uni_names}},
            {"_id": 0, "university_name": 1, "logo_url": 1, "domain": 1, "social_links": 1},
        ).to_list(500),
    )

    kb_by_name = {e["university_name"]: e for e in kb_entries}

    coaches_by_program = {}
    for c in all_coaches:
        coaches_by_program.setdefault(c["program_id"], []).append(c)

    for p in programs:
        pid = p["program_id"]
        coaches = coaches_by_program.get(pid, [])
        primary = next(
            (c for c in coaches if c.get("role") == "Head Coach"),
            coaches[0] if coaches else None,
        )
        p["primary_college_coach"] = primary.get("coach_name", "") if primary else ""
        p["college_coach_email"] = primary.get("email", "") if primary else ""
        p["signals"] = signals_map.get(pid, {})
        p["board_group"] = categorize_program(p)
        p["journey_rail"] = compute_journey_rail(p)
        # Enrich with KB logo and domain
        kb = kb_by_name.get(p.get("university_name"), {})
        if not p.get("logo_url"):
            p["logo_url"] = kb.get("logo_url", "")
        if not p.get("domain"):
            p["domain"] = kb.get("domain", "")
        if not p.get("social_links") and kb.get("social_links"):
            p["social_links"] = kb["social_links"]

    if grouped:
        groups = {
            "overdue": [],
            "needs_outreach": [],
            "waiting_on_reply": [],
            "in_conversation": [],
            "archived": [],
        }
        for p in programs:
            g = p.get("board_group", "needs_outreach")
            if g in groups:
                groups[g].append(p)
        return {
            "groups": groups,
            "counts": {k: len(v) for k, v in groups.items()},
            "total": len(programs),
        }

    return programs


@router.get("/athlete/programs/{program_id}")
async def get_program(program_id: str, current_user: dict = get_current_user_dep()):
    tenant_id = await get_athlete_tenant(current_user)
    prog = await db.programs.find_one(
        {"tenant_id": tenant_id, "program_id": program_id}, {"_id": 0}
    )
    if not prog:
        raise HTTPException(404, "Program not found")

    coaches_f = db.college_coaches.find(
        {"tenant_id": tenant_id, "program_id": program_id}, {"_id": 0}
    ).to_list(50)
    interactions_f = db.interactions.find(
        {"tenant_id": tenant_id, "program_id": program_id}, {"_id": 0}
    ).sort("date_time", -1).to_list(100)

    coaches, interactions = await asyncio.gather(coaches_f, interactions_f)
    prog["college_coaches"] = coaches
    prog["interactions"] = interactions
    prog["signals"] = _compute_signals_from_interactions(interactions)
    prog["board_group"] = categorize_program(prog)
    prog["journey_rail"] = compute_journey_rail(prog)

    # Enrich with KB data (social_links, logo, domain)
    uni_name = prog.get("university_name", "")
    if uni_name:
        kb = await db.university_knowledge_base.find_one(
            {"university_name": uni_name},
            {"_id": 0, "logo_url": 1, "domain": 1, "social_links": 1},
        )
        if kb:
            if not prog.get("logo_url"):
                prog["logo_url"] = kb.get("logo_url", "")
            if not prog.get("domain"):
                prog["domain"] = kb.get("domain", "")
            if not prog.get("social_links") and kb.get("social_links"):
                prog["social_links"] = kb["social_links"]

    return prog


@router.get("/athlete/programs/{program_id}/journey")
async def get_program_journey(program_id: str, current_user: dict = get_current_user_dep()):
    """Get timeline of all interactions with a program, formatted for conversation view."""
    tenant_id = await get_athlete_tenant(current_user)
    program = await db.programs.find_one(
        {"tenant_id": tenant_id, "program_id": program_id}, {"_id": 0}
    )
    if not program:
        raise HTTPException(404, "Program not found")

    interactions = await db.interactions.find(
        {"tenant_id": tenant_id, "program_id": program_id}, {"_id": 0}
    ).sort("date_time", -1).to_list(200)

    timeline = []
    for ix in interactions:
        itype = (ix.get("type") or "").strip()
        itype_lower = itype.lower().replace(" ", "_")

        type_map = {
            "email": "email_sent", "email_sent": "email_sent",
            "email_received": "email_received", "phone_call": "phone_call",
            "video_call": "video_call", "text_message": "text_message",
            "coach_reply": "email_received", "camp": "camp",
            "camp_meeting": "camp", "campus_visit": "campus_visit",
            "showcase": "showcase", "stage_update": "stage_update",
            "follow_up": "email_sent",
            "coach_directive": "coach_directive", "flag_completed": "flag_completed",
        }
        event_type = type_map.get(itype_lower, "interaction")

        uni_name = ix.get("university_name") or ""
        is_coach_msg = itype_lower in ("coach_reply", "email_received")
        is_coach_flag = itype_lower in ("coach_directive", "flag_completed")
        if is_coach_msg:
            title = "Coach replied"
        elif itype_lower == "coach_directive":
            title = "Coach Directive"
        elif itype_lower == "flag_completed":
            title = "Flag Completed"
        elif itype_lower in ("camp", "camp_meeting", "campus_visit", "showcase"):
            title = f"{uni_name} {itype}".strip() if uni_name else itype
        elif itype_lower == "stage_update":
            title = "Stage updated"
        else:
            title = f"{itype} logged" if itype else "Interaction"

        timeline.append({
            "id": ix.get("interaction_id"),
            "event_type": event_type,
            "type": itype,
            "title": title,
            "date": ix.get("date_time") or ix.get("created_at"),
            "date_time": ix.get("date_time") or ix.get("created_at"),
            "content": ix.get("notes") or "",
            "notes": ix.get("notes") or "",
            "outcome": ix.get("outcome") or "",
            "coach_name": ix.get("coach_name", "Coach") if is_coach_msg else "",
            "created_by_name": ix.get("created_by_name") if is_coach_flag else "",
        })

    # Also include linked events
    events = await db.athlete_events.find(
        {"tenant_id": tenant_id, "program_id": program_id}, {"_id": 0}
    ).to_list(100)
    for e in events:
        etype = e.get("event_type", "").lower()
        event_type = "camp"
        if etype == "visit":
            event_type = "campus_visit"
        elif etype == "showcase":
            event_type = "showcase"
        timeline.append({
            "id": e.get("event_id"),
            "event_type": event_type,
            "type": e.get("event_type", "Event"),
            "title": e.get("title", ""),
            "date": e.get("start_date"),
            "date_time": e.get("start_date"),
            "content": e.get("description") or "",
            "notes": e.get("description") or "",
            "outcome": "",
            "coach_name": "",
        })

    # Sort by date descending
    timeline.sort(key=lambda x: x.get("date") or "", reverse=True)

    # Re-sort after adding events
    timeline.sort(key=lambda x: x.get("date") or "", reverse=True)

    # Enrich timeline with per-message engagement tracking
    msg_ids = [e["id"] for e in timeline if e.get("id")]
    if msg_ids:
        tracking = await db.email_tracking.find(
            {"message_id": {"$in": msg_ids}},
            {"_id": 0, "message_id": 1, "opens": 1, "clicks": 1}
        ).to_list(200)
        tracking_map = {t["message_id"]: t for t in tracking}
        for event in timeline:
            t = tracking_map.get(event.get("id"), {})
            event["opens"] = t.get("opens", 0)
            event["clicks"] = t.get("clicks", 0)

    return {"timeline": timeline}


@router.post("/athlete/programs")
async def create_program(body: dict, current_user: dict = get_current_user_dep()):
    tenant_id = await get_athlete_tenant(current_user)

    existing = await db.programs.find_one(
        {"tenant_id": tenant_id, "university_name": body.get("university_name", "")},
        {"_id": 0},
    )
    if existing:
        raise HTTPException(400, "University already on your board")

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
        "is_active": body.get("is_active", True),
        "next_action": body.get("next_action", ""),
        "next_action_due": body.get("next_action_due", ""),
        "notes": body.get("notes", ""),
        "website": body.get("website", ""),
        "initial_contact_sent": body.get("initial_contact_sent", ""),
        "last_follow_up": body.get("last_follow_up", ""),
        "follow_up_days": body.get("follow_up_days", 14),
        "stage_entered_at": now,
        "source_added": body.get("source_added", "manual"),
        "coach_contact_confidence": None,
        "engagement_trend": None,
        "last_meaningful_engagement_at": None,
        "created_at": now,
        "updated_at": now,
    }
    await db.programs.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/athlete/programs/{program_id}")
async def update_program(program_id: str, body: dict, current_user: dict = get_current_user_dep()):
    tenant_id = await get_athlete_tenant(current_user)

    # Snapshot old status for stage history tracking
    old_program = await db.programs.find_one(
        {"tenant_id": tenant_id, "program_id": program_id},
        {"_id": 0, "recruiting_status": 1},
    )
    old_status = (old_program or {}).get("recruiting_status")

    for key in ("_id", "program_id", "tenant_id"):
        body.pop(key, None)
    now = datetime.now(timezone.utc).isoformat()
    body["updated_at"] = now

    # If recruiting_status is changing, update stage_entered_at
    new_status = body.get("recruiting_status")
    if new_status and new_status != old_status:
        body["stage_entered_at"] = now

    result = await db.programs.update_one(
        {"tenant_id": tenant_id, "program_id": program_id},
        {"$set": body},
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Program not found")

    # Record stage history if status changed
    if new_status and new_status != old_status:
        athlete = await db.athletes.find_one({"tenant_id": tenant_id}, {"_id": 0, "id": 1, "org_id": 1})
        await db.program_stage_history.insert_one({
            "program_id": program_id,
            "athlete_id": (athlete or {}).get("id", ""),
            "org_id": (athlete or {}).get("org_id"),
            "from_stage": old_status,
            "to_stage": new_status,
            "changed_by_user_id": current_user["id"],
            "changed_by_role": current_user.get("role", ""),
            "reason_code": body.get("reason_code"),
            "note": body.get("stage_change_note"),
            "created_at": now,
        })

    updated = await db.programs.find_one(
        {"tenant_id": tenant_id, "program_id": program_id}, {"_id": 0}
    )
    return updated


@router.delete("/athlete/programs/{program_id}")
async def delete_program(program_id: str, current_user: dict = get_current_user_dep()):
    tenant_id = await get_athlete_tenant(current_user)
    result = await db.programs.delete_one(
        {"tenant_id": tenant_id, "program_id": program_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(404, "Program not found")
    # Cascade delete related college coaches and interactions
    await db.college_coaches.delete_many(
        {"tenant_id": tenant_id, "program_id": program_id}
    )
    await db.interactions.delete_many(
        {"tenant_id": tenant_id, "program_id": program_id}
    )
    return {"deleted": True}


# ─────────────────────────────────────────────────────────────────────────
# College Coaches CRUD
# ─────────────────────────────────────────────────────────────────────────

@router.get("/athlete/college-coaches")
async def list_college_coaches(
    current_user: dict = get_current_user_dep(),
    program_id: Optional[str] = None,
):
    tenant_id = await get_athlete_tenant(current_user)
    query = {"tenant_id": tenant_id}
    if program_id:
        query["program_id"] = program_id
    coaches = await db.college_coaches.find(query, {"_id": 0}).to_list(500)
    return coaches


@router.post("/athlete/college-coaches")
async def create_college_coach(body: dict, current_user: dict = get_current_user_dep()):
    tenant_id = await get_athlete_tenant(current_user)
    program_id = body.get("program_id")
    prog = await db.programs.find_one(
        {"tenant_id": tenant_id, "program_id": program_id}, {"_id": 0}
    )
    if not prog:
        raise HTTPException(404, "Program not found")

    doc = {
        "coach_id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "program_id": program_id,
        "university_name": prog["university_name"],
        "coach_name": body.get("coach_name", ""),
        "role": body.get("role", "Head Coach"),
        "email": body.get("email", ""),
        "phone": body.get("phone", ""),
        "notes": body.get("notes", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.college_coaches.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/athlete/college-coaches/{coach_id}")
async def update_college_coach(coach_id: str, body: dict, current_user: dict = get_current_user_dep()):
    tenant_id = await get_athlete_tenant(current_user)
    for key in ("_id", "coach_id", "tenant_id"):
        body.pop(key, None)
    result = await db.college_coaches.update_one(
        {"tenant_id": tenant_id, "coach_id": coach_id},
        {"$set": body},
    )
    if result.matched_count == 0:
        raise HTTPException(404, "College coach not found")
    updated = await db.college_coaches.find_one(
        {"tenant_id": tenant_id, "coach_id": coach_id}, {"_id": 0}
    )
    return updated


@router.delete("/athlete/college-coaches/{coach_id}")
async def delete_college_coach(coach_id: str, current_user: dict = get_current_user_dep()):
    tenant_id = await get_athlete_tenant(current_user)
    result = await db.college_coaches.delete_one(
        {"tenant_id": tenant_id, "coach_id": coach_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(404, "College coach not found")
    return {"deleted": True}


# ─────────────────────────────────────────────────────────────────────────
# Interactions CRUD
# ─────────────────────────────────────────────────────────────────────────

@router.get("/athlete/interactions")
async def list_interactions(
    current_user: dict = get_current_user_dep(),
    program_id: Optional[str] = None,
):
    tenant_id = await get_athlete_tenant(current_user)
    query = {"tenant_id": tenant_id}
    if program_id:
        query["program_id"] = program_id
    interactions = await db.interactions.find(query, {"_id": 0}).sort(
        "date_time", -1
    ).to_list(200)
    return interactions


@router.post("/athlete/interactions")
async def create_interaction(body: dict, current_user: dict = get_current_user_dep()):
    tenant_id = await get_athlete_tenant(current_user)
    program_id = body.get("program_id")
    prog = await db.programs.find_one(
        {"tenant_id": tenant_id, "program_id": program_id}, {"_id": 0}
    )
    if not prog:
        raise HTTPException(404, "Program not found")

    now = datetime.now(timezone.utc)
    doc = {
        "interaction_id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "program_id": program_id,
        "university_name": prog.get("university_name", ""),
        "type": body.get("type", "Email"),
        "outcome": body.get("outcome", "No Response"),
        "notes": body.get("notes", ""),
        "date_time": body.get("date_time") or now.isoformat(),
        "created_at": now.isoformat(),
        # V2 structured signal fields
        "is_meaningful": body.get("is_meaningful"),
        "response_time_hours": body.get("response_time_hours"),
        "initiated_by": body.get("initiated_by"),
        "coach_question_detected": body.get("coach_question_detected"),
        "request_type": body.get("request_type"),
        "invite_type": body.get("invite_type"),
        "offer_signal": body.get("offer_signal"),
        "scholarship_signal": body.get("scholarship_signal"),
        "sentiment_signal": body.get("sentiment_signal"),
        "urgency_signal": body.get("urgency_signal"),
        "confidence": body.get("confidence"),
    }
    await db.interactions.insert_one(doc)
    doc.pop("_id", None)

    # Update last_meaningful_engagement_at on program if meaningful
    _meaningful_types = {"Coach Reply", "Phone Call", "Campus Visit", "Video Call", "Camp"}
    is_meaningful = (
        body.get("is_meaningful")
        or doc["type"] in _meaningful_types
        or body.get("coach_question_detected")
        or body.get("request_type")
        or body.get("invite_type")
        or body.get("offer_signal")
        or body.get("scholarship_signal")
    )
    if is_meaningful:
        await db.programs.update_one(
            {"tenant_id": tenant_id, "program_id": program_id},
            {"$set": {
                "last_meaningful_engagement_at": now.isoformat(),
                "last_meaningful_engagement_type": doc["type"],
            }},
        )

    # Auto-set follow-up on program based on interaction type
    event_type = (doc["type"]).lower().replace(" ", "_")
    follow_up_days_map = {
        "camp": 3, "campus_visit": 2, "phone_call": 7, "video_call": 7,
        "email_sent": 14, "showcase": 5, "text_message": 7,
        "coach_reply": 2, "email_received": 2,
    }
    days = follow_up_days_map.get(event_type)
    program_updates = {"updated_at": now.isoformat()}

    if days:
        follow_up_date = (now + timedelta(days=days)).strftime("%Y-%m-%d")
        program_updates["next_action_due"] = follow_up_date

    # AUTOMATION: Email sent → recruiting_status = Contacted, reply_status = Awaiting Reply
    if event_type in ("email_sent", "email", "follow_up"):
        current_status = prog.get("recruiting_status", "Not Contacted")
        if current_status == "Not Contacted":
            program_updates["recruiting_status"] = "Contacted"
            program_updates["initial_contact_sent"] = now.strftime("%Y-%m-%d")
        if prog.get("reply_status") in (None, "", "No Reply"):
            program_updates["reply_status"] = "Awaiting Reply"

    # AUTOMATION: Reply received → reply_status = Reply Received, priority = Very High
    if event_type in ("coach_reply", "email_received"):
        program_updates["reply_status"] = "Reply Received"
        program_updates["priority"] = "Very High"

    if program_updates:
        await db.programs.update_one(
            {"program_id": program_id, "tenant_id": tenant_id},
            {"$set": program_updates},
        )

    return doc


# ─────────────────────────────────────────────────────────────────────────
# Mark program as replied
# ─────────────────────────────────────────────────────────────────────────

@router.post("/athlete/programs/{program_id}/mark-replied")
async def mark_as_replied(program_id: str, body: dict, current_user: dict = get_current_user_dep()):
    tenant_id = await get_athlete_tenant(current_user)
    prog = await db.programs.find_one(
        {"tenant_id": tenant_id, "program_id": program_id}, {"_id": 0}
    )
    if not prog:
        raise HTTPException(404, "Program not found")

    note = (body.get("note") or "").strip()
    if not note:
        raise HTTPException(400, "A note is required when marking a reply")

    now = datetime.now(timezone.utc)
    doc = {
        "interaction_id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "program_id": program_id,
        "university_name": prog.get("university_name", ""),
        "type": "coach_reply",
        "outcome": "Positive",
        "notes": note,
        "date_time": now.isoformat(),
        "created_at": now.isoformat(),
    }
    await db.interactions.insert_one(doc)
    doc.pop("_id", None)

    # AUTOMATION: Reply received → update program status + priority
    await db.programs.update_one(
        {"program_id": program_id, "tenant_id": tenant_id},
        {"$set": {
            "reply_status": "Reply Received",
            "priority": "Very High",
            "next_action_due": (now + timedelta(days=2)).strftime("%Y-%m-%d"),
            "updated_at": now.isoformat(),
            "last_meaningful_engagement_at": now.isoformat(),
            "last_meaningful_engagement_type": "coach_reply",
        }},
    )

    return doc


# ─────────────────────────────────────────────────────────────────────────
# School Engagement Stats
# ─────────────────────────────────────────────────────────────────────────

@router.get("/athlete/engagement/{program_id}")
async def get_school_engagement(program_id: str, current_user: dict = get_current_user_dep()):
    """Return engagement stats for a program: opens, clicks, unique opens, timeline."""
    tenant_id = await get_athlete_tenant(current_user)

    # Check engagement_events collection first (email tracking pixels)
    engagement_events = await db.engagement_events.find(
        {"tenant_id": tenant_id, "program_id": program_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(200)

    total_opens = sum(1 for e in engagement_events if e.get("event_type") == "email_open")
    total_clicks = sum(1 for e in engagement_events if e.get("event_type") == "link_click")
    unique_emails = set()
    for e in engagement_events:
        if e.get("event_type") == "email_open" and e.get("coach_email"):
            unique_emails.add(e["coach_email"])
    unique_opens = len(unique_emails) if unique_emails else (1 if total_opens > 0 else 0)

    return {
        "total_opens": total_opens,
        "total_clicks": total_clicks,
        "unique_opens": unique_opens,
        "timeline": engagement_events,
    }


# ─────────────────────────────────────────────────────────────────────────
# Follow-ups
# ─────────────────────────────────────────────────────────────────────────

@router.get("/athlete/follow-ups")
async def list_follow_ups(current_user: dict = get_current_user_dep()):
    tenant_id = await get_athlete_tenant(current_user)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    programs = await db.programs.find(
        {
            "tenant_id": tenant_id,
            "next_action_due": {"$ne": "", "$lte": today},
            "is_active": {"$ne": False},
        },
        {"_id": 0},
    ).sort("next_action_due", 1).to_list(200)

    # Enrich with primary college coach
    pids = [p["program_id"] for p in programs]
    coaches = await db.college_coaches.find(
        {"tenant_id": tenant_id, "program_id": {"$in": pids}}, {"_id": 0}
    ).to_list(1000)
    by_pid = {}
    for c in coaches:
        by_pid.setdefault(c["program_id"], []).append(c)

    for p in programs:
        cs = by_pid.get(p["program_id"], [])
        primary = next((c for c in cs if c.get("role") == "Head Coach"), cs[0] if cs else None)
        p["primary_college_coach"] = primary.get("coach_name", "") if primary else ""
        p["college_coach_email"] = primary.get("email", "") if primary else ""

    return programs


@router.post("/athlete/follow-ups/{program_id}/mark-sent")
async def mark_follow_up_sent(program_id: str, body: dict, current_user: dict = get_current_user_dep()):
    tenant_id = await get_athlete_tenant(current_user)
    prog = await db.programs.find_one(
        {"tenant_id": tenant_id, "program_id": program_id}, {"_id": 0}
    )
    if not prog:
        raise HTTPException(404, "Program not found")

    now = datetime.now(timezone.utc)
    today = now.strftime("%Y-%m-%d")
    follow_up_days = prog.get("follow_up_days", 14)
    next_due = (now + timedelta(days=follow_up_days)).strftime("%Y-%m-%d")

    await db.programs.update_one(
        {"program_id": program_id, "tenant_id": tenant_id},
        {"$set": {
            "last_follow_up": today,
            "next_action_due": next_due,
            "reply_status": body.get("reply_status", prog.get("reply_status", "No Reply")),
            "updated_at": now.isoformat(),
        }},
    )

    # Log follow-up as interaction
    interaction_doc = {
        "interaction_id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "program_id": program_id,
        "university_name": prog.get("university_name", ""),
        "type": "Follow Up",
        "outcome": body.get("outcome", "No Response"),
        "notes": f"Follow-up marked sent on {today}",
        "date_time": now.isoformat(),
        "created_at": now.isoformat(),
    }
    await db.interactions.insert_one(interaction_doc)

    updated = await db.programs.find_one(
        {"program_id": program_id, "tenant_id": tenant_id}, {"_id": 0}
    )
    return updated


# ─────────────────────────────────────────────────────────────────────────
# Events CRUD
# ─────────────────────────────────────────────────────────────────────────

@router.get("/athlete/events")
async def list_events(current_user: dict = get_current_user_dep()):
    tenant_id = await get_athlete_tenant(current_user)
    events = await db.athlete_events.find(
        {"tenant_id": tenant_id}, {"_id": 0}
    ).sort("start_date", 1).to_list(200)
    return events


@router.post("/athlete/events")
async def create_event(body: dict, current_user: dict = get_current_user_dep()):
    tenant_id = await get_athlete_tenant(current_user)
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


@router.put("/athlete/events/{event_id}")
async def update_event(event_id: str, body: dict, current_user: dict = get_current_user_dep()):
    tenant_id = await get_athlete_tenant(current_user)
    for key in ("_id", "event_id", "tenant_id"):
        body.pop(key, None)
    result = await db.athlete_events.update_one(
        {"tenant_id": tenant_id, "event_id": event_id},
        {"$set": body},
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Event not found")
    updated = await db.athlete_events.find_one(
        {"tenant_id": tenant_id, "event_id": event_id}, {"_id": 0}
    )
    return updated


@router.delete("/athlete/events/{event_id}")
async def delete_event(event_id: str, current_user: dict = get_current_user_dep()):
    tenant_id = await get_athlete_tenant(current_user)
    result = await db.athlete_events.delete_one(
        {"tenant_id": tenant_id, "event_id": event_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(404, "Event not found")
    return {"deleted": True}


# ─────────────────────────────────────────────────────────────────────────
# Dashboard aggregation
# ─────────────────────────────────────────────────────────────────────────

@router.get("/athlete/dashboard")
async def get_athlete_dashboard(current_user: dict = get_current_user_dep()):
    """Aggregated dashboard for the athlete home page."""
    tenant_id = await get_athlete_tenant(current_user)

    # Parallel fetch
    programs_f = db.programs.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(200)
    events_f = db.athlete_events.find(
        {"tenant_id": tenant_id}, {"_id": 0}
    ).sort("start_date", 1).to_list(50)
    interactions_f = db.interactions.find(
        {"tenant_id": tenant_id}, {"_id": 0}
    ).sort("date_time", -1).to_list(50)
    athlete_f = db.athletes.find_one({"user_id": current_user["id"]}, {"_id": 0})

    programs, events, interactions, athlete = await asyncio.gather(
        programs_f, events_f, interactions_f, athlete_f
    )

    # Compute signals for each program
    program_ids = [p["program_id"] for p in programs]
    signals_map = await _batch_signals(tenant_id, program_ids) if program_ids else {}

    for p in programs:
        p["signals"] = signals_map.get(p["program_id"], {})
        p["board_group"] = categorize_program(p)

    # Stats
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    total_schools = len(programs)
    active_programs = [p for p in programs if p.get("is_active", True)]

    follow_ups_due = [
        p for p in active_programs
        if p.get("next_action_due") and p["next_action_due"] <= today
    ]

    needs_first_outreach = [
        p for p in active_programs
        if p.get("board_group") == "needs_outreach"
    ]

    replied_count = sum(
        1 for p in active_programs
        if p.get("reply_status") in ("Reply Received", "In Conversation")
    )

    awaiting_reply_count = sum(
        1 for p in active_programs
        if p.get("reply_status") == "Awaiting Reply"
    )

    # Response rate
    contacted = [p for p in active_programs if p.get("recruiting_status") not in ("Not Contacted", None)]
    response_rate = round(replied_count / len(contacted) * 100) if contacted else 0

    # Recent interactions for activity feed (last 10)
    recent_interactions = interactions[:10]

    # Upcoming events (future only)
    upcoming_events = [
        e for e in events
        if e.get("start_date", "") >= today
    ][:5]

    # School spotlight — programs with active conversation or recent activity
    spotlight = [
        p for p in active_programs
        if p.get("board_group") in ("in_conversation", "overdue")
    ][:5]

    # Club coach info
    club_coach = None
    if athlete and athlete.get("primary_coach_id"):
        coach_doc = await db.users.find_one(
            {"id": athlete["primary_coach_id"]},
            {"_id": 0, "id": 1, "name": 1, "email": 1},
        )
        if coach_doc:
            club_coach = {"name": coach_doc["name"], "email": coach_doc["email"]}

    return {
        "profile": {
            "first_name": athlete.get("first_name", "") if athlete else "",
            "last_name": athlete.get("last_name", "") if athlete else "",
            "full_name": athlete.get("full_name", "") if athlete else "",
            "position": athlete.get("position", "") if athlete else "",
            "team": athlete.get("team", "") if athlete else "",
            "grad_year": athlete.get("grad_year") if athlete else None,
        },
        "stats": {
            "total_schools": total_schools,
            "response_rate": response_rate,
            "replied_count": replied_count,
            "awaiting_reply": awaiting_reply_count,
            "follow_ups_due": len(follow_ups_due),
        },
        "follow_ups_due": follow_ups_due,
        "needs_first_outreach": needs_first_outreach,
        "spotlight": spotlight,
        "recent_activity": recent_interactions,
        "upcoming_events": upcoming_events,
        "club_coach": club_coach,
        "gmail_connected": False,
    }

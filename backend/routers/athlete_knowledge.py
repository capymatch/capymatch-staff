"""Athlete Knowledge Base — search/browse volleyball programs.

Global collection `university_knowledge_base` (not tenant-scoped).
Authenticated athletes can search, browse, and view school details.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import re

from auth_middleware import get_current_user_dep
from db_client import db

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────
# Search / List
# ─────────────────────────────────────────────────────────────────────────

@router.get("/athlete/knowledge/search")
async def search_knowledge_base(
    current_user: dict = get_current_user_dep(),
    q: Optional[str] = Query(None, description="Search term"),
    division: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    conference: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    scholarship: Optional[bool] = Query(None),
    sort_by: Optional[str] = Query("university_name"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """Search and filter the university knowledge base."""
    query = {}

    if q:
        query["university_name"] = {"$regex": re.escape(q), "$options": "i"}
    if division:
        query["division"] = division
    if state:
        query["state"] = state
    if conference:
        query["conference"] = conference
    if region:
        query["region"] = region
    if scholarship is not None:
        query["athletic_scholarships"] = scholarship

    # Determine sort
    sort_field = "university_name"
    sort_dir = 1
    if sort_by == "acceptance_rate":
        sort_field = "acceptance_rate"
    elif sort_by == "tuition":
        sort_field = "tuition_in_state"
    elif sort_by == "enrollment":
        sort_field = "enrollment"

    total = await db.university_knowledge_base.count_documents(query)

    schools = await db.university_knowledge_base.find(
        query, {"_id": 0}
    ).sort(sort_field, sort_dir).skip(offset).limit(limit).to_list(limit)

    # Get filter options from all data
    all_divisions = await db.university_knowledge_base.distinct("division")
    all_states = await db.university_knowledge_base.distinct("state")
    all_conferences = await db.university_knowledge_base.distinct("conference")
    all_regions = await db.university_knowledge_base.distinct("region")

    return {
        "schools": schools,
        "total": total,
        "filters": {
            "divisions": sorted(all_divisions),
            "states": sorted(all_states),
            "conferences": sorted(all_conferences),
            "regions": sorted(all_regions),
        },
    }


# ─────────────────────────────────────────────────────────────────────────
# School Detail
# ─────────────────────────────────────────────────────────────────────────

@router.get("/athlete/knowledge/{domain}")
async def get_school_detail(
    domain: str,
    current_user: dict = get_current_user_dep(),
):
    """Get detailed info for a single school by domain."""
    school = await db.university_knowledge_base.find_one(
        {"domain": domain}, {"_id": 0}
    )
    if not school:
        raise HTTPException(404, "School not found")

    # Check if athlete already has this school in their pipeline
    tenant_id = None
    if current_user["role"] in ("athlete", "parent"):
        athlete = await db.athletes.find_one(
            {"user_id": current_user["id"]}, {"_id": 0, "tenant_id": 1}
        )
        if athlete and athlete.get("tenant_id"):
            tenant_id = athlete["tenant_id"]
            existing_program = await db.programs.find_one(
                {"tenant_id": tenant_id, "university_name": school["university_name"]},
                {"_id": 0, "program_id": 1},
            )
            school["in_pipeline"] = existing_program is not None
            if existing_program:
                school["pipeline_program_id"] = existing_program["program_id"]

    if tenant_id is None:
        school["in_pipeline"] = False

    return school


# ─────────────────────────────────────────────────────────────────────────
# Quick-add to pipeline from KB
# ─────────────────────────────────────────────────────────────────────────

@router.post("/athlete/knowledge/{domain}/add-to-pipeline")
async def add_school_to_pipeline(
    domain: str,
    current_user: dict = get_current_user_dep(),
):
    """Add a school from the KB directly to the athlete's pipeline."""
    if current_user["role"] not in ("athlete", "parent"):
        raise HTTPException(403, "Only athletes/parents can add to pipeline")

    athlete = await db.athletes.find_one(
        {"user_id": current_user["id"]}, {"_id": 0, "tenant_id": 1}
    )
    if not athlete or not athlete.get("tenant_id"):
        raise HTTPException(404, "No claimed athlete profile found")
    tenant_id = athlete["tenant_id"]

    school = await db.university_knowledge_base.find_one(
        {"domain": domain}, {"_id": 0}
    )
    if not school:
        raise HTTPException(404, "School not found in knowledge base")

    # Check for duplicate
    existing = await db.programs.find_one(
        {"tenant_id": tenant_id, "university_name": school["university_name"]},
        {"_id": 0},
    )
    if existing:
        raise HTTPException(400, "School already in your pipeline")

    import uuid
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc).isoformat()
    program_doc = {
        "program_id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "university_name": school["university_name"],
        "division": school.get("division", ""),
        "conference": school.get("conference", ""),
        "region": school.get("region", ""),
        "recruiting_status": "Not Contacted",
        "reply_status": "No Reply",
        "priority": "Medium",
        "is_active": True,
        "next_action": "",
        "next_action_due": "",
        "notes": "",
        "website": school.get("website", ""),
        "initial_contact_sent": "",
        "last_follow_up": "",
        "follow_up_days": 14,
        "created_at": now,
        "updated_at": now,
    }
    await db.programs.insert_one(program_doc)
    program_doc.pop("_id", None)

    # Also seed coaching staff as college coaches
    for coach in school.get("coaching_staff", []):
        coach_doc = {
            "coach_id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "program_id": program_doc["program_id"],
            "university_name": school["university_name"],
            "coach_name": coach.get("name", ""),
            "role": coach.get("role", ""),
            "email": coach.get("email", ""),
            "phone": "",
            "notes": "",
            "created_at": now,
        }
        await db.college_coaches.insert_one(coach_doc)

    return {"ok": True, "program": program_doc}

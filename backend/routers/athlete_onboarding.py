"""Athlete Onboarding — recruiting profile quiz + suggested school matching.

Stores recruiting preferences on the athlete doc and provides
a simple matching algorithm against the university_knowledge_base.
"""

from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timezone
from auth_middleware import get_current_user_dep
from db_client import db

router = APIRouter()


# ── Adapter ─────────────────────────────────────────────────────────────

async def _get_athlete(current_user: dict) -> dict:
    if current_user["role"] not in ("athlete", "parent"):
        raise HTTPException(403, "Only athletes/parents can access this")
    athlete = await db.athletes.find_one(
        {"user_id": current_user["id"]}, {"_id": 0}
    )
    if not athlete:
        raise HTTPException(404, "No claimed athlete profile found")
    return athlete


# ── Onboarding Status ───────────────────────────────────────────────────

@router.get("/athlete/onboarding-status")
async def get_onboarding_status(current_user: dict = get_current_user_dep()):
    """Check if the athlete has completed the onboarding quiz."""
    athlete = await _get_athlete(current_user)
    recruiting_profile = athlete.get("recruiting_profile")
    return {
        "completed": recruiting_profile is not None and bool(recruiting_profile),
        "profile": recruiting_profile,
    }


# ── Save Recruiting Profile ────────────────────────────────────────────

@router.post("/athlete/recruiting-profile")
async def save_recruiting_profile(body: dict, current_user: dict = get_current_user_dep()):
    """Save the onboarding quiz answers as recruiting preferences."""
    athlete = await _get_athlete(current_user)

    recruiting_profile = {
        "position": body.get("position", []),
        "division": body.get("division", []),
        "priorities": body.get("priorities", []),
        "regions": body.get("regions", []),
        "gpa": body.get("gpa"),
        "act_score": body.get("act_score"),
        "sat_score": body.get("sat_score"),
        "academic_interests": body.get("academic_interests"),
        "completed_at": datetime.now(timezone.utc).isoformat(),
    }

    # Also update top-level profile fields if provided
    updates = {
        "recruiting_profile": recruiting_profile,
        "onboarding_completed": True,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    # Sync GPA to top-level if provided
    if body.get("gpa"):
        updates["gpa"] = str(body["gpa"])
    if body.get("sat_score"):
        updates["sat_score"] = str(body["sat_score"])
    if body.get("act_score"):
        updates["act_score"] = str(body["act_score"])
    if body.get("position") and isinstance(body["position"], list) and len(body["position"]) > 0:
        updates["position"] = body["position"][0]  # Primary position

    await db.athletes.update_one(
        {"id": athlete["id"]},
        {"$set": updates},
    )

    return {"ok": True, "recruiting_profile": recruiting_profile}


# ── Suggested Schools ───────────────────────────────────────────────────

@router.get("/athlete/suggested-schools")
async def get_suggested_schools(
    current_user: dict = get_current_user_dep(),
    limit: int = Query(3, ge=1, le=10),
):
    """Return KB schools matched against the athlete's recruiting profile."""
    athlete = await _get_athlete(current_user)
    rp = athlete.get("recruiting_profile")
    if not rp:
        return {"suggestions": []}

    pref_divisions = set(rp.get("division", []))
    pref_regions = set(rp.get("regions", []))
    pref_priorities = set(rp.get("priorities", []))
    pref_gpa = float(rp["gpa"]) if rp.get("gpa") else None

    # Region mapping (our KB uses short region names)
    region_map = {
        "Northeast": "East",
        "Southeast": "South",
        "Midwest": "Midwest",
        "Southwest": "South",
        "Mountain West": "West",
        "West Coast": "West",
    }
    mapped_regions = set()
    for r in pref_regions:
        mapped = region_map.get(r)
        if mapped:
            mapped_regions.add(mapped)

    # Get all schools from KB
    schools = await db.university_knowledge_base.find(
        {}, {"_id": 0}
    ).to_list(200)

    # Get athlete's existing pipeline schools to exclude
    tenant_id = athlete.get("tenant_id")
    existing = set()
    if tenant_id:
        programs = await db.programs.find(
            {"tenant_id": tenant_id},
            {"_id": 0, "university_name": 1},
        ).to_list(200)
        existing = {p["university_name"] for p in programs}

    scored = []
    for school in schools:
        if school["university_name"] in existing:
            continue

        score = 0
        reasons = []

        # Division match (30 points)
        if pref_divisions and school.get("division") in pref_divisions:
            score += 30
            reasons.append("Division fit")

        # Region match (20 points)
        if mapped_regions and school.get("region") in mapped_regions:
            score += 20
            reasons.append("Region fit")

        # Scholarship priority (15 points)
        if "Scholarship Availability" in pref_priorities and school.get("athletic_scholarships"):
            score += 15
            reasons.append("Scholarships")

        # Academics priority (15 points)
        if "Strong Academics" in pref_priorities:
            ar = school.get("acceptance_rate", 100)
            if ar and ar < 30:
                score += 15
                reasons.append("Strong academics")
            elif ar and ar < 50:
                score += 8

        # Top athletics priority (10 points)
        if "Top Athletics Program" in pref_priorities:
            stats = school.get("program_stats", {})
            if stats.get("national_championships", 0) > 0:
                score += 10
                reasons.append("Championship program")

        # GPA fit (10 points) - check if athlete GPA meets school avg
        if pref_gpa and school.get("avg_gpa"):
            if pref_gpa >= school["avg_gpa"] - 0.3:
                score += 10
                reasons.append("Academic fit")

        if score > 0:
            scored.append({
                "domain": school["domain"],
                "university_name": school["university_name"],
                "division": school.get("division", ""),
                "conference": school.get("conference", ""),
                "region": school.get("region", ""),
                "match_score": min(score, 100),
                "match_reasons": reasons,
                "program_id": school.get("domain"),
            })

    scored.sort(key=lambda x: x["match_score"], reverse=True)
    return {"suggestions": scored[:limit]}

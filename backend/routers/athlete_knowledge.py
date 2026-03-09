"""Knowledge Base — search/browse volleyball programs.

Global collection `university_knowledge_base` (not tenant-scoped).
Mirrors the original capymatch knowledge.py routes.
"""

from fastapi import APIRouter, HTTPException, Request, Query
from typing import Optional
from datetime import datetime, timezone
import uuid
import os
import re
import logging
import asyncio

from auth_middleware import get_current_user_dep
from db_client import db

logger = logging.getLogger(__name__)

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────
# List / Search (paginated)
# ─────────────────────────────────────────────────────────────────────────

@router.get("/knowledge-base")
async def list_knowledge_base(
    division: Optional[str] = None,
    conference: Optional[str] = None,
    region: Optional[str] = None,
    state: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    fields: Optional[str] = None,
):
    query = {}
    if division:
        query["division"] = division
    if conference:
        query["conference"] = {"$regex": conference, "$options": "i"}
    if region:
        query["region"] = {"$regex": f"^{region}$", "$options": "i"}
    if state:
        query["pr_state"] = {"$regex": f"^{state}$", "$options": "i"}
    if search:
        query["university_name"] = {"$regex": search, "$options": "i"}

    projection = {"_id": 0}
    if fields == "list":
        projection = {
            "_id": 0, "university_name": 1, "division": 1, "conference": 1,
            "region": 1, "logo_url": 1, "scholarship_type": 1, "roster_needs": 1,
            "domain": 1, "pr_state": 1, "scorecard": 1,
        }

    total = await db.university_knowledge_base.count_documents(query)
    skip = (page - 1) * limit
    universities = (
        await db.university_knowledge_base.find(query, projection)
        .sort("university_name", 1)
        .skip(skip)
        .limit(limit)
        .to_list(limit)
    )

    return {
        "universities": universities,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
    }


# ─────────────────────────────────────────────────────────────────────────
# Filters
# ─────────────────────────────────────────────────────────────────────────

@router.get("/knowledge-base/filters")
async def get_filters():
    conferences = await db.university_knowledge_base.distinct("conference")
    regions = await db.university_knowledge_base.distinct("region")
    conferences = sorted([c for c in conferences if c])
    regions = sorted([r for r in regions if r])
    return {"conferences": conferences, "regions": regions}


# ─────────────────────────────────────────────────────────────────────────
# School Detail
# ─────────────────────────────────────────────────────────────────────────

@router.get("/knowledge-base/school/{domain}")
async def get_school_by_domain(domain: str, request: Request):
    uni = await db.university_knowledge_base.find_one({"domain": domain}, {"_id": 0})
    if not uni:
        raise HTTPException(status_code=404, detail="University not found")

    # Try to get current user context for match score and board status
    try:
        from auth_middleware import decode_token
        token = None
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
        if token:
            payload = decode_token(token)
            user_id = payload["sub"]
            if user_id:
                athlete = await db.athletes.find_one(
                    {"user_id": user_id}, {"_id": 0, "tenant_id": 1}
                )
                if athlete and athlete.get("tenant_id"):
                    tenant_id = athlete["tenant_id"]
                    # Check board status
                    on_board = await db.programs.find_one(
                        {"tenant_id": tenant_id, "university_name": uni.get("university_name")},
                        {"_id": 0, "program_id": 1},
                    )
                    uni["on_board"] = bool(on_board)
                    if on_board:
                        uni["program_id"] = on_board.get("program_id")

                    # Compute match score
                    profile = await db.athlete_profiles.find_one(
                        {"tenant_id": tenant_id}, {"_id": 0}
                    )
                    if profile:
                        match = _compute_match(uni, profile)
                        uni["match_score"] = match["score"]
                        uni["match_reasons"] = match["reasons"]
                    else:
                        uni["match_score"] = 0
                        uni["match_reasons"] = []
                else:
                    uni["on_board"] = False
                    uni["match_score"] = 0
                    uni["match_reasons"] = []
    except Exception:
        uni.setdefault("on_board", False)
        uni.setdefault("match_score", 0)
        uni.setdefault("match_reasons", [])

    return uni


# ─────────────────────────────────────────────────────────────────────────
# Add to Board (pipeline)
# ─────────────────────────────────────────────────────────────────────────

@router.post("/knowledge-base/add-to-board")
async def add_to_board(request: Request):
    from auth_middleware import decode_token
    token = None
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(token)
    user_id = payload["sub"]

    athlete = await db.athletes.find_one(
        {"user_id": user_id}, {"_id": 0, "tenant_id": 1}
    )
    if not athlete or not athlete.get("tenant_id"):
        raise HTTPException(status_code=404, detail="No claimed athlete profile found")
    tenant_id = athlete["tenant_id"]

    body = await request.json()
    uni_name = body.get("university_name")
    if not uni_name:
        raise HTTPException(status_code=400, detail="university_name required")

    uni = await db.university_knowledge_base.find_one({"university_name": uni_name}, {"_id": 0})
    if not uni:
        raise HTTPException(status_code=404, detail="University not found in knowledge base")

    existing = await db.programs.find_one(
        {"tenant_id": tenant_id, "university_name": uni_name}, {"_id": 0}
    )
    if existing:
        raise HTTPException(status_code=400, detail="University already on your board")

    now = datetime.now(timezone.utc).isoformat()
    program_id = f"prog_{uuid.uuid4().hex[:12]}"
    doc = {
        "program_id": program_id,
        "tenant_id": tenant_id,
        "university_name": uni.get("university_name", ""),
        "division": uni.get("division", ""),
        "conference": uni.get("conference", ""),
        "region": uni.get("region", ""),
        "website": uni.get("website", ""),
        "domain": uni.get("domain", ""),
        "mascot": uni.get("mascot", ""),
        "primary_coach": uni.get("primary_coach", ""),
        "coach_email": uni.get("coach_email", ""),
        "recruiting_coordinator": uni.get("recruiting_coordinator", ""),
        "coordinator_email": uni.get("coordinator_email", ""),
        "program_interest": "",
        "recruiting_status": "Not Contacted",
        "reply_status": "No Reply",
        "priority": "Medium",
        "initial_contact_sent": "",
        "last_follow_up": "",
        "follow_up_days": 14,
        "next_action": "",
        "next_action_due": "",
        "scholarship_type": uni.get("scholarship_type", ""),
        "roster_needs": uni.get("roster_needs", ""),
        "events_seen": "",
        "video_link": "",
        "coach_contract_expiration": "",
        "notes": "",
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }
    await db.programs.insert_one(doc)
    doc.pop("_id", None)

    # Seed coaching staff as college coaches
    coaches = uni.get("coaches_scraped", [])
    if not coaches:
        coaches = []
        if uni.get("primary_coach"):
            coaches.append({"name": uni["primary_coach"], "title": "Head Coach", "email": uni.get("coach_email", "")})
        if uni.get("recruiting_coordinator"):
            coaches.append({"name": uni["recruiting_coordinator"], "title": "Recruiting Coordinator", "email": uni.get("coordinator_email", "")})

    for coach in coaches:
        coach_doc = {
            "coach_id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "program_id": program_id,
            "university_name": uni.get("university_name", ""),
            "coach_name": coach.get("name", ""),
            "role": coach.get("title", coach.get("role", "Coach")),
            "email": coach.get("email", ""),
            "phone": "",
            "notes": "",
            "created_at": now,
        }
        await db.college_coaches.insert_one(coach_doc)

    return doc


# ─────────────────────────────────────────────────────────────────────────
# Suggested Schools (match-ranked)
# ─────────────────────────────────────────────────────────────────────────

@router.get("/suggested-schools")
async def get_suggested_schools(request: Request):
    try:
        from auth_middleware import decode_token
        token = None
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
        if not token:
            return {"suggestions": []}
        payload = decode_token(token)
        user_id = payload["sub"]

        athlete = await db.athletes.find_one(
            {"user_id": user_id}, {"_id": 0, "tenant_id": 1}
        )
        if not athlete or not athlete.get("tenant_id"):
            return {"suggestions": []}
        tenant_id = athlete["tenant_id"]

        profile = await db.athlete_profiles.find_one(
            {"tenant_id": tenant_id}, {"_id": 0}
        )
        if not profile:
            return {"suggestions": []}

        # Get all universities with lightweight projection
        universities = await db.university_knowledge_base.find(
            {},
            {"_id": 0, "university_name": 1, "division": 1, "conference": 1,
             "region": 1, "domain": 1, "logo_url": 1, "scorecard": 1,
             "scholarship_type": 1, "roster_needs": 1}
        ).to_list(2000)

        # Score each
        scored = []
        for uni in universities:
            match = _compute_match(uni, profile)
            if match["score"] > 0:
                uni["match_score"] = match["score"]
                uni["match_reasons"] = match["reasons"]
                scored.append(uni)

        scored.sort(key=lambda x: x["match_score"], reverse=True)
        return {"suggestions": scored[:20]}
    except Exception as e:
        logger.warning(f"Suggested schools failed: {e}")
        return {"suggestions": []}


# ─────────────────────────────────────────────────────────────────────────
# Match Score Computation
# ─────────────────────────────────────────────────────────────────────────

def _compute_match(uni, profile):
    score = 0
    total_weight = 0
    reasons = []

    pref_divisions = profile.get("division") or []
    if isinstance(pref_divisions, str):
        pref_divisions = [pref_divisions] if pref_divisions else []
    pref_divisions_upper = [d.upper() for d in pref_divisions]
    pref_regions = profile.get("regions") or []
    pref_priorities = profile.get("priorities") or []

    try:
        user_gpa = float(profile["gpa"]) if profile.get("gpa") else None
    except (ValueError, TypeError):
        user_gpa = None
    try:
        user_act = int(profile["act_score"]) if profile.get("act_score") else None
    except (ValueError, TypeError):
        user_act = None
    try:
        user_sat = int(profile["sat_score"]) if profile.get("sat_score") else None
    except (ValueError, TypeError):
        user_sat = None

    school_div = (uni.get("division") or "").upper()
    school_region = uni.get("region") or ""
    scorecard = uni.get("scorecard") or {}

    region_aliases = {
        "West Coast": ["West"], "West": ["West"],
        "Mountain West": ["West", "Central"],
        "Southwest": ["South", "South Central"],
        "South": ["South", "South Central", "Southeast"],
        "South Central": ["South", "South Central"],
        "Northeast": ["Northeast", "East", "Atlantic"],
        "East": ["East", "Atlantic", "Northeast"],
        "Atlantic": ["Atlantic", "East"],
        "Southeast": ["Southeast", "South"],
        "Midwest": ["Midwest", "Great Lakes", "Central"],
        "Central": ["Central", "Midwest"],
        "Great Lakes": ["Great Lakes", "Midwest"],
    }

    # Division match (20 pts)
    total_weight += 20
    if pref_divisions_upper and school_div:
        if school_div in pref_divisions_upper:
            score += 20
            reasons.append("Division Match")
        elif any(
            ("D1" in pd and school_div == "D2") or
            ("D2" in pd and school_div in ("D1", "D3"))
            for pd in pref_divisions_upper
        ):
            score += 8

    # Region match (20 pts)
    total_weight += 20
    if pref_regions:
        matched = False
        for pref_r in pref_regions:
            aliases = region_aliases.get(pref_r, [pref_r])
            if school_region in aliases or school_region == pref_r:
                matched = True
                break
        if matched:
            score += 20
            reasons.append("Preferred Region")
        else:
            score += 4

    # Priority alignment (20 pts)
    total_weight += 20
    per_priority = 20 / max(len(pref_priorities), 1)
    for pr in pref_priorities:
        pr_lower = pr.lower()
        if "academ" in pr_lower and school_div in ("D1", "D2", "D3"):
            score += per_priority
            if "Academics" not in reasons:
                reasons.append("Academics")
        elif "athlet" in pr_lower:
            if school_div == "D1":
                score += per_priority
                if "Athletics" not in reasons:
                    reasons.append("Athletics")
            elif school_div == "D2":
                score += per_priority * 0.6
        elif "scholarship" in pr_lower and school_div in ("D1", "D2", "NAIA"):
            score += per_priority
            if "Scholarship" not in reasons:
                reasons.append("Scholarship")
        elif "location" in pr_lower:
            for pref_r in pref_regions:
                aliases = region_aliases.get(pref_r, [pref_r])
                if school_region in aliases or school_region == pref_r:
                    score += per_priority
                    break
        elif "campus" in pr_lower or "culture" in pr_lower:
            score += per_priority * 0.5
        elif "coach" in pr_lower:
            score += per_priority * 0.5
        elif "conference" in pr_lower:
            if uni.get("conference"):
                score += per_priority * 0.7
        elif "playing" in pr_lower or "roster" in pr_lower:
            if school_div in ("D2", "D3", "NAIA"):
                score += per_priority
            else:
                score += per_priority * 0.3

    # Academic fit (40 pts)
    has_academic_data = bool(user_gpa or user_sat or user_act)
    if has_academic_data:
        total_weight += 40
    metric_scores = []

    DIV_SAT_BENCH = {"D1": 1150, "D2": 1050, "D3": 1100, "NAIA": 1000}
    DIV_ACT_BENCH = {"D1": 25, "D2": 22, "D3": 24, "NAIA": 22}
    DIV_GPA_BENCH = {"D1": 3.2, "D2": 2.9, "D3": 3.1, "NAIA": 2.8}

    if user_gpa:
        school_avg_gpa = scorecard.get("avg_gpa")
        if school_avg_gpa:
            try:
                school_avg_gpa = float(school_avg_gpa)
            except (ValueError, TypeError):
                school_avg_gpa = None
        if school_avg_gpa:
            diff = user_gpa - school_avg_gpa
            if diff >= 0.3:
                metric_scores.append(1.0)
            elif diff >= 0:
                metric_scores.append(0.85)
            elif diff >= -0.3:
                metric_scores.append(0.55)
            elif diff >= -0.6:
                metric_scores.append(0.25)
            else:
                metric_scores.append(0.08)
        elif (uni.get("acceptance_rate") or scorecard.get("admission_rate")) is not None:
            accept_rate = uni.get("acceptance_rate") or scorecard.get("admission_rate")
            accept_pct = accept_rate * 100 if accept_rate <= 1 else accept_rate
            if accept_pct >= 70:
                metric_scores.append(1.0)
            elif accept_pct >= 50:
                metric_scores.append(0.85 if user_gpa >= 3.0 else 0.4)
            elif accept_pct >= 30:
                metric_scores.append(0.8 if user_gpa >= 3.3 else 0.4 if user_gpa >= 2.8 else 0.15)
            else:
                metric_scores.append(0.9 if user_gpa >= 3.7 else 0.4 if user_gpa >= 3.3 else 0.08)
        else:
            bench = DIV_GPA_BENCH.get(school_div, 3.0)
            diff = user_gpa - bench
            if diff >= 0.5:
                metric_scores.append(1.0)
            elif diff >= 0:
                metric_scores.append(0.8)
            elif diff >= -0.3:
                metric_scores.append(0.45)
            elif diff >= -0.7:
                metric_scores.append(0.2)
            else:
                metric_scores.append(0.05)

    if user_sat:
        sat_avg = uni.get("sat_avg") or scorecard.get("sat_avg")
        if not sat_avg:
            sat_avg = DIV_SAT_BENCH.get(school_div, 1100)
        diff = user_sat - sat_avg
        if diff >= 50:
            metric_scores.append(1.0)
        elif diff >= -50:
            metric_scores.append(0.85)
        elif diff >= -150:
            metric_scores.append(0.5)
        elif diff >= -250:
            metric_scores.append(0.2)
        else:
            metric_scores.append(0.05)

    if user_act:
        act_mid = scorecard.get("act_midpoint")
        if not act_mid:
            act_mid = DIV_ACT_BENCH.get(school_div, 24)
        diff = user_act - act_mid
        if diff >= 2:
            metric_scores.append(1.0)
        elif diff >= -1:
            metric_scores.append(0.85)
        elif diff >= -3:
            metric_scores.append(0.5)
        elif diff >= -6:
            metric_scores.append(0.2)
        else:
            metric_scores.append(0.05)

    if metric_scores:
        product = 1.0
        for ms in metric_scores:
            product *= max(ms, 0.01)
        geo_mean = product ** (1.0 / len(metric_scores))
        academic_pts = round(geo_mean * 40)
        score += academic_pts

        if geo_mean >= 0.75:
            reasons.append("Strong Academic Fit")
        elif geo_mean >= 0.50:
            reasons.append("Good Academic Fit")
        elif geo_mean >= 0.35:
            reasons.append("Slight Reach")
        elif geo_mean >= 0.18:
            reasons.append("Reach")
        else:
            reasons.append("High Reach")

    pct = round((score / total_weight) * 100) if total_weight > 0 else 0
    pct = min(pct, 99)
    return {"score": pct, "reasons": reasons}


# ─────────────────────────────────────────────────────────────────────────
# Bulk Enrichment (Scorecard + GPA)
# ─────────────────────────────────────────────────────────────────────────

_enrich_status = {
    "running": False, "processed": 0, "scorecard_filled": 0,
    "gpa_filled": 0, "failed": 0, "total": 0,
}


@router.post("/knowledge-base/bulk-enrich")
async def start_bulk_enrich():
    if _enrich_status["running"]:
        return {"status": "already_running", **_enrich_status}
    asyncio.create_task(_bulk_enrich_schools())
    return {"status": "started", "message": "Bulk enrichment started in background"}


@router.get("/knowledge-base/bulk-enrich-status")
async def get_bulk_enrich_status():
    return _enrich_status


async def _bulk_enrich_schools():
    global _enrich_status
    _enrich_status = {
        "running": True, "processed": 0, "scorecard_filled": 0,
        "gpa_filled": 0, "failed": 0, "total": 0,
    }
    import httpx

    SCORECARD_BASE = "https://api.data.gov/ed/collegescorecard/v1/schools"
    SCORECARD_FIELDS = ",".join([
        "id", "school.name", "school.city", "school.state", "school.school_url",
        "school.student_size", "latest.student.size",
        "latest.admissions.admission_rate.overall",
        "latest.admissions.sat_scores.average.overall",
        "latest.admissions.act_scores.midpoint.cumulative",
        "latest.completion.completion_rate_4yr_100nt",
        "latest.student.retention_rate.four_year.full_time",
        "latest.student.demographics.student_faculty_ratio",
        "latest.cost.tuition.in_state",
        "latest.cost.tuition.out_of_state",
        "latest.cost.avg_net_price.overall",
        "latest.aid.median_debt.completers.overall",
        "latest.earnings.10_yrs_after_entry.median",
    ])

    api_key = os.environ.get("COLLEGE_SCORECARD_API_KEY", "")

    all_schools = await db.university_knowledge_base.find(
        {}, {"_id": 1, "domain": 1, "university_name": 1, "scorecard": 1}
    ).to_list(5000)

    _enrich_status["total"] = len(all_schools)
    logger.info(f"Bulk enrichment started for {len(all_schools)} schools")

    for school in all_schools:
        scorecard = school.get("scorecard") or {}
        updates = {}

        try:
            if not scorecard.get("synced_at") and api_key:
                domain = school.get("domain", "")
                name = school.get("university_name", "")
                async with httpx.AsyncClient(timeout=15) as client:
                    if domain:
                        resp = await client.get(SCORECARD_BASE, params={
                            "api_key": api_key, "school.school_url": domain,
                            "fields": SCORECARD_FIELDS, "per_page": 3
                        })
                        if resp.status_code == 200:
                            results = resp.json().get("results", [])
                            if results:
                                new_sc = _parse_scorecard(results[0])
                                scorecard = new_sc
                                updates["scorecard"] = new_sc
                                _enrich_status["scorecard_filled"] += 1

            if updates:
                await db.university_knowledge_base.update_one(
                    {"_id": school["_id"]}, {"$set": updates}
                )
        except Exception as e:
            _enrich_status["failed"] += 1
            logger.warning(f"Enrichment failed for {school.get('university_name')}: {e}")

        _enrich_status["processed"] += 1
        if _enrich_status["processed"] % 50 == 0:
            logger.info(
                f"Enrich progress: {_enrich_status['processed']}/{_enrich_status['total']}"
            )
        await asyncio.sleep(3)

    _enrich_status["running"] = False
    logger.info(f"Bulk enrichment complete: {_enrich_status}")


def _parse_scorecard(r):
    return {
        "scorecard_id": r.get("id"),
        "city": r.get("school.city"),
        "state": r.get("school.state"),
        "student_size": r.get("latest.student.size") or r.get("school.student_size"),
        "admission_rate": r.get("latest.admissions.admission_rate.overall"),
        "sat_avg": r.get("latest.admissions.sat_scores.average.overall"),
        "act_midpoint": r.get("latest.admissions.act_scores.midpoint.cumulative"),
        "graduation_rate": r.get("latest.completion.completion_rate_4yr_100nt"),
        "retention_rate": r.get("latest.student.retention_rate.four_year.full_time"),
        "student_faculty_ratio": r.get("latest.student.demographics.student_faculty_ratio"),
        "tuition_in_state": r.get("latest.cost.tuition.in_state"),
        "tuition_out_of_state": r.get("latest.cost.tuition.out_of_state"),
        "avg_net_price": r.get("latest.cost.avg_net_price.overall"),
        "median_debt": r.get("latest.aid.median_debt.completers.overall"),
        "median_earnings": r.get("latest.earnings.10_yrs_after_entry.median"),
        "synced_at": datetime.now(timezone.utc).isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────
# Bulk Questionnaire Discovery
# ─────────────────────────────────────────────────────────────────────────

_bulk_q_status = {"running": False, "processed": 0, "found": 0, "failed": 0, "total": 0}


@router.post("/knowledge-base/bulk-discover-questionnaires")
async def start_bulk_discover():
    if _bulk_q_status["running"]:
        return {"status": "already_running", **_bulk_q_status}
    asyncio.create_task(_bulk_discover_questionnaires())
    return {"status": "started", "message": "Bulk discovery started in background"}


@router.get("/knowledge-base/bulk-discover-status")
async def get_bulk_discover_status():
    return _bulk_q_status


async def _bulk_discover_questionnaires():
    global _bulk_q_status
    _bulk_q_status = {"running": True, "processed": 0, "found": 0, "failed": 0, "total": 0}

    schools = await db.university_knowledge_base.find(
        {"$or": [
            {"questionnaire_url": {"$exists": False}},
            {"questionnaire_url": None},
            {"questionnaire_url": ""},
        ]},
        {"_id": 0, "domain": 1, "university_name": 1, "website": 1}
    ).to_list(5000)

    _bulk_q_status["total"] = len(schools)
    logger.info(f"Bulk questionnaire discovery started for {len(schools)} schools")

    for school in schools:
        _bulk_q_status["processed"] += 1
        if _bulk_q_status["processed"] % 50 == 0:
            logger.info(
                f"Q-discovery progress: {_bulk_q_status['processed']}/{_bulk_q_status['total']} "
                f"(found: {_bulk_q_status['found']})"
            )
        await asyncio.sleep(4)

    _bulk_q_status["running"] = False
    logger.info(f"Bulk questionnaire discovery complete: {_bulk_q_status}")


# ─────────────────────────────────────────────────────────────────────────
# Legacy routes (backward compat with old frontend)
# ─────────────────────────────────────────────────────────────────────────

@router.get("/athlete/knowledge/search")
async def search_knowledge_base_legacy(
    current_user: dict = get_current_user_dep(),
    q: Optional[str] = Query(None),
    division: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    conference: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("university_name"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    query = {}
    if q:
        query["university_name"] = {"$regex": re.escape(q), "$options": "i"}
    if division:
        query["division"] = division
    if state:
        query["pr_state"] = {"$regex": f"^{state}$", "$options": "i"}
    if conference:
        query["conference"] = conference
    if region:
        query["region"] = region

    sort_field = "university_name"
    if sort_by == "acceptance_rate":
        sort_field = "scorecard.admission_rate"
    elif sort_by == "tuition":
        sort_field = "scorecard.tuition_in_state"

    total = await db.university_knowledge_base.count_documents(query)
    schools = await db.university_knowledge_base.find(
        query, {"_id": 0}
    ).sort(sort_field, 1).skip(offset).limit(limit).to_list(limit)

    all_divisions = await db.university_knowledge_base.distinct("division")
    all_conferences = await db.university_knowledge_base.distinct("conference")
    all_regions = await db.university_knowledge_base.distinct("region")
    all_states = sorted(set(
        s.get("pr_state", "") for s in await db.university_knowledge_base.find(
            {"pr_state": {"$exists": True, "$ne": ""}}, {"_id": 0, "pr_state": 1}
        ).to_list(2000)
    ))

    return {
        "schools": schools,
        "total": total,
        "filters": {
            "divisions": sorted([d for d in all_divisions if d]),
            "states": [s for s in all_states if s],
            "conferences": sorted([c for c in all_conferences if c]),
            "regions": sorted([r for r in all_regions if r]),
        },
    }


@router.get("/athlete/knowledge/{domain}")
async def get_school_detail_legacy(
    domain: str,
    current_user: dict = get_current_user_dep(),
):
    school = await db.university_knowledge_base.find_one({"domain": domain}, {"_id": 0})
    if not school:
        raise HTTPException(404, "School not found")

    if current_user["role"] in ("athlete", "parent"):
        athlete = await db.athletes.find_one(
            {"user_id": current_user["id"]}, {"_id": 0, "tenant_id": 1}
        )
        if athlete and athlete.get("tenant_id"):
            tenant_id = athlete["tenant_id"]
            existing = await db.programs.find_one(
                {"tenant_id": tenant_id, "university_name": school["university_name"]},
                {"_id": 0, "program_id": 1},
            )
            school["in_pipeline"] = existing is not None
            if existing:
                school["pipeline_program_id"] = existing["program_id"]
                school["on_board"] = True
                school["program_id"] = existing["program_id"]
            else:
                school["on_board"] = False
        else:
            school["in_pipeline"] = False
            school["on_board"] = False
    else:
        school["in_pipeline"] = False
        school["on_board"] = False

    return school


@router.post("/athlete/knowledge/{domain}/add-to-pipeline")
async def add_school_to_pipeline_legacy(
    domain: str,
    current_user: dict = get_current_user_dep(),
):
    if current_user["role"] not in ("athlete", "parent"):
        raise HTTPException(403, "Only athletes/parents can add to pipeline")

    athlete = await db.athletes.find_one(
        {"user_id": current_user["id"]}, {"_id": 0, "tenant_id": 1}
    )
    if not athlete or not athlete.get("tenant_id"):
        raise HTTPException(404, "No claimed athlete profile found")
    tenant_id = athlete["tenant_id"]

    school = await db.university_knowledge_base.find_one({"domain": domain}, {"_id": 0})
    if not school:
        raise HTTPException(404, "School not found in knowledge base")

    existing = await db.programs.find_one(
        {"tenant_id": tenant_id, "university_name": school["university_name"]}, {"_id": 0}
    )
    if existing:
        raise HTTPException(400, "School already in your pipeline")

    now = datetime.now(timezone.utc).isoformat()
    program_id = f"prog_{uuid.uuid4().hex[:12]}"
    program_doc = {
        "program_id": program_id,
        "tenant_id": tenant_id,
        "university_name": school["university_name"],
        "division": school.get("division", ""),
        "conference": school.get("conference", ""),
        "region": school.get("region", ""),
        "website": school.get("website", ""),
        "domain": school.get("domain", ""),
        "mascot": school.get("mascot", ""),
        "primary_coach": school.get("primary_coach", ""),
        "coach_email": school.get("coach_email", ""),
        "recruiting_coordinator": school.get("recruiting_coordinator", ""),
        "coordinator_email": school.get("coordinator_email", ""),
        "recruiting_status": "Not Contacted",
        "reply_status": "No Reply",
        "priority": "Medium",
        "is_active": True,
        "next_action": "",
        "next_action_due": "",
        "notes": "",
        "initial_contact_sent": "",
        "last_follow_up": "",
        "follow_up_days": 14,
        "created_at": now,
        "updated_at": now,
    }
    await db.programs.insert_one(program_doc)
    program_doc.pop("_id", None)

    # Seed coaches
    coaches = school.get("coaches_scraped", [])
    if not coaches:
        coaches = []
        if school.get("primary_coach"):
            coaches.append({"name": school["primary_coach"], "title": "Head Coach", "email": school.get("coach_email", "")})
        if school.get("recruiting_coordinator"):
            coaches.append({"name": school["recruiting_coordinator"], "title": "Recruiting Coordinator", "email": school.get("coordinator_email", "")})

    for coach in coaches:
        coach_doc = {
            "coach_id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "program_id": program_id,
            "university_name": school["university_name"],
            "coach_name": coach.get("name", ""),
            "role": coach.get("title", coach.get("role", "Coach")),
            "email": coach.get("email", ""),
            "phone": "",
            "notes": "",
            "created_at": now,
        }
        await db.college_coaches.insert_one(coach_doc)

    return {"ok": True, "program": program_doc}

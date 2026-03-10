"""Smart Match — Hybrid recommendation engine (Phase 1).

Rule-based scoring with AI-generated explanations.
Scoring categories:
  - Athletic Fit (30%): Division match
  - Academic Fit (25%): GPA + test scores
  - Preference Fit (20%): School size, type, scholarship, priorities
  - Geographic Fit (15%): Region match
  - Opportunity / Reach (10%): Acceptance rate, cost
"""

import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from db_client import db
from auth_middleware import get_current_user_dep
from subscriptions import get_user_subscription, check_feature_access

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Weights ──────────────────────────────────────────────────────────────
W_ATHLETIC = 0.30
W_ACADEMIC = 0.25
W_PREFERENCE = 0.20
W_GEOGRAPHIC = 0.15
W_OPPORTUNITY = 0.10

# ── Region mapping for geographic scoring ────────────────────────────────
ADJACENT_REGIONS = {
    "South": ["Southeast", "South Central"],
    "Southeast": ["South", "Atlantic", "East"],
    "East": ["Atlantic", "Northeast", "Southeast"],
    "Atlantic": ["East", "Southeast", "Northeast"],
    "Northeast": ["East", "Atlantic"],
    "Midwest": ["Central", "Great Lakes", "West"],
    "Central": ["Midwest", "South Central", "West"],
    "South Central": ["South", "Central", "West"],
    "West": ["Central", "Midwest", "South Central"],
    "Great Lakes": ["Midwest", "East"],
}


def _safe_float(val, default=0.0):
    if val is None:
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


# ── Auth helpers ─────────────────────────────────────────────────────────
def _get_user(request: Request):
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(401, "Not authenticated")
    return user["user_id"], user.get("tenant_id") or f'tenant-{user["user_id"]}'


# ── Scoring functions ────────────────────────────────────────────────────
def score_athletic_fit(athlete_divisions: list, school_division: str) -> tuple:
    """Score 0-100: does the school's division match the athlete's preferences?"""
    if not school_division or not athlete_divisions:
        return 50, "Division data unavailable"

    sd = school_division.upper().strip()
    ad = [d.upper().strip() for d in athlete_divisions]

    if sd in ad:
        if ad.index(sd) == 0:
            return 100, f"Matches your top division preference ({sd})"
        return 85, f"Matches your {sd} preference"

    # Adjacent: D1 athlete might consider D2, etc.
    div_order = ["D1", "D2", "D3", "NAIA"]
    athlete_indices = [div_order.index(d) for d in ad if d in div_order]
    school_idx = div_order.index(sd) if sd in div_order else -1
    if athlete_indices and school_idx >= 0:
        min_dist = min(abs(school_idx - ai) for ai in athlete_indices)
        if min_dist == 1:
            return 60, "One division level from your preference"
        if min_dist == 2:
            return 30, "Two division levels away"
    return 15, "Division doesn't match your preference"


def score_academic_fit(athlete_gpa: float, athlete_sat: float, athlete_act: float,
                       school_gpa: float, school_sat: float) -> tuple:
    """Score 0-100: how well do academics align?"""
    scores = []
    reasons = []

    if athlete_gpa > 0 and school_gpa > 0:
        diff = athlete_gpa - school_gpa
        if diff >= 0.3:
            scores.append(95)
            reasons.append("Strong academic fit")
        elif diff >= 0:
            scores.append(85)
            reasons.append("Good academic fit")
        elif diff >= -0.3:
            scores.append(65)
            reasons.append("Academic reach")
        else:
            scores.append(35)
            reasons.append("Academic stretch")

    if athlete_sat > 0 and school_sat > 0:
        diff = athlete_sat - school_sat
        if diff >= 100:
            scores.append(95)
        elif diff >= 0:
            scores.append(80)
        elif diff >= -100:
            scores.append(60)
        else:
            scores.append(30)

    if not scores:
        return 50, "Academic data limited"

    return int(sum(scores) / len(scores)), reasons[0] if reasons else "Academic fit calculated"


def score_preference_fit(athlete_priorities: list, school: dict) -> tuple:
    """Score 0-100: school size, type, scholarship alignment."""
    points = 0
    max_points = 0
    chips = []

    scorecard = school.get("scorecard") or {}
    scholarship = school.get("scholarship_type", "")
    school_type = scorecard.get("school_type", "")
    student_size = scorecard.get("student_size", 0)

    # Scholarship alignment
    max_points += 30
    if "Scholarship" in athlete_priorities or "Financial Aid" in athlete_priorities:
        if "athletic" in scholarship.lower() or "full" in scholarship.lower():
            points += 30
            chips.append("Offers athletic scholarships")
        elif scholarship:
            points += 15
            chips.append("Merit aid available")
    else:
        points += 20  # Neutral if not a priority

    # School size (moderate preference)
    max_points += 20
    if student_size:
        if student_size < 5000:
            chips.append("Small campus")
        elif student_size < 15000:
            chips.append("Mid-size campus")
        else:
            chips.append("Large university")
        points += 15  # Neutral without explicit size preference

    # School type
    max_points += 15
    if school_type:
        points += 10
    
    # General quality signals
    max_points += 20
    grad_rate = scorecard.get("graduation_rate", 0)
    if grad_rate and grad_rate > 0.7:
        points += 20
        chips.append("High graduation rate")
    elif grad_rate and grad_rate > 0.5:
        points += 12

    score = int((points / max_points) * 100) if max_points > 0 else 50
    reason = chips[0] if chips else "Preference data limited"
    return score, reason, chips


def score_geographic_fit(athlete_regions: list, school_region: str, school_state: str) -> tuple:
    """Score 0-100: is the school in a preferred region?"""
    if not athlete_regions or not school_region:
        return 50, "Location data limited"

    sr = school_region.strip()
    ar = [r.strip() for r in athlete_regions]

    if sr in ar:
        return 100, f"In your preferred region ({sr})"

    # Check adjacent regions
    for pref in ar:
        adj = ADJACENT_REGIONS.get(pref, [])
        if sr in adj:
            return 70, "Near your preferred region"

    return 25, "Outside your preferred region"


def score_opportunity(acceptance_rate: float, cost: int) -> tuple:
    """Score 0-100: admission realism and affordability."""
    scores = []

    if acceptance_rate and acceptance_rate > 0:
        if acceptance_rate > 0.7:
            scores.append(90)
        elif acceptance_rate > 0.5:
            scores.append(75)
        elif acceptance_rate > 0.3:
            scores.append(55)
        else:
            scores.append(30)

    if cost and cost > 0:
        if cost < 15000:
            scores.append(95)
        elif cost < 25000:
            scores.append(75)
        elif cost < 40000:
            scores.append(55)
        else:
            scores.append(35)

    if not scores:
        return 50, "Opportunity data limited"
    return int(sum(scores) / len(scores)), ""


def compute_match_score(athlete: dict, profile: dict, school: dict) -> dict:
    """Compute weighted match score for one school."""
    athlete_divisions = profile.get("division") or athlete.get("recruiting_profile", {}).get("division", [])
    athlete_gpa = _safe_float(profile.get("gpa") or athlete.get("gpa"))
    athlete_sat = _safe_float(profile.get("sat_score") or athlete.get("sat_score"))
    athlete_act = _safe_float(profile.get("act_score") or athlete.get("act_score"))
    athlete_regions = profile.get("regions", [])
    athlete_priorities = profile.get("priorities", [])

    scorecard = school.get("scorecard") or {}
    school_division = school.get("division", "")
    school_region = school.get("region", "")
    school_state = scorecard.get("state", "")
    school_gpa = _safe_float(scorecard.get("avg_gpa") or scorecard.get("estimated_avg_gpa"))
    school_sat = _safe_float(scorecard.get("sat_avg"))
    acceptance_rate = _safe_float(scorecard.get("acceptance_rate"))
    cost = scorecard.get("avg_annual_cost") or scorecard.get("tuition_out_of_state") or 0

    ath_score, ath_reason = score_athletic_fit(athlete_divisions, school_division)
    acad_score, acad_reason = score_academic_fit(athlete_gpa, athlete_sat, athlete_act, school_gpa, school_sat)
    pref_score, pref_reason, pref_chips = score_preference_fit(athlete_priorities, school)
    geo_score, geo_reason = score_geographic_fit(athlete_regions, school_region, school_state)
    opp_score, opp_reason = score_opportunity(acceptance_rate, cost)

    total = int(
        ath_score * W_ATHLETIC
        + acad_score * W_ACADEMIC
        + pref_score * W_PREFERENCE
        + geo_score * W_GEOGRAPHIC
        + opp_score * W_OPPORTUNITY
    )

    # Build reason chips (top 3)
    chips = []
    scored = [
        (ath_score, ath_reason, "athletic"),
        (acad_score, acad_reason, "academic"),
        (geo_score, geo_reason, "geographic"),
    ]
    scored.sort(key=lambda x: x[0], reverse=True)
    for s, r, _ in scored:
        if s >= 65 and r and "unavailable" not in r.lower() and "limited" not in r.lower():
            chips.append(r)
    for c in pref_chips:
        if len(chips) < 3:
            chips.append(c)
    chips = chips[:3]

    return {
        "match_score": max(0, min(100, total)),
        "breakdown": {
            "athletic": ath_score,
            "academic": acad_score,
            "preference": pref_score,
            "geographic": geo_score,
            "opportunity": opp_score,
        },
        "chips": chips,
        "top_reason": chips[0] if chips else "Possible fit based on available data",
    }


# ── AI Explanation ───────────────────────────────────────────────────────
async def generate_ai_explanation(school: dict, match: dict, athlete: dict) -> dict:
    """Generate 1-2 sentence AI explanation + next step + red flag (Pro/Premium only)."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            return {"summary": "", "next_step": "", "verify": ""}

        scorecard = school.get("scorecard") or {}
        prompt = f"""You are a college recruiting advisor. Given this match data, write a brief, parent-friendly response in JSON format.

School: {school.get('university_name')}
Division: {school.get('division')} | Conference: {school.get('conference')}
Location: {scorecard.get('city', '')}, {scorecard.get('state', '')}
Match Score: {match['match_score']}/100
Top reasons: {', '.join(match['chips'])}
Athletic fit: {match['breakdown']['athletic']}/100
Academic fit: {match['breakdown']['academic']}/100

Respond with ONLY valid JSON:
{{"summary": "1-2 sentence plain-English explanation of why this school is a good fit", "next_step": "One specific actionable next step", "verify": "One thing to verify or question to ask"}}"""

        chat = LlmChat(
            api_key=api_key,
            session_id=f"smart_match_{uuid.uuid4().hex[:8]}",
            system_message="You are a concise college recruiting advisor. Respond only with valid JSON."
        ).with_model("openai", "gpt-4.1-mini")

        response = await chat.send_message(UserMessage(text=prompt))
        import json
        text = response.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[-1].rsplit("```", 1)[0]
        return json.loads(text)
    except Exception as e:
        logger.warning(f"AI explanation failed: {e}")
        return {"summary": "", "next_step": "", "verify": ""}


# ── API Endpoints ────────────────────────────────────────────────────────
@router.get("/smart-match/recommendations")
async def get_recommendations(limit: int = 50, current_user: dict = get_current_user_dep()):
    user_id = current_user["id"]
    if current_user["role"] not in ("athlete", "parent"):
        raise HTTPException(403, "Only athletes can access Smart Match")

    # Resolve tenant
    athlete_rec = await db.athletes.find_one({"user_id": user_id}, {"_id": 0, "tenant_id": 1})
    if not athlete_rec or not athlete_rec.get("tenant_id"):
        return {"recommendations": [], "total": 0, "tier": "basic", "gated": False}
    tenant_id = athlete_rec["tenant_id"]

    subscription = await get_user_subscription(tenant_id)
    tier = subscription.get("tier", "basic")

    # Get athlete data
    athlete = await db.athletes.find_one({"user_id": user_id}, {"_id": 0})
    if not athlete:
        athlete = await db.athletes.find_one({"tenant_id": tenant_id}, {"_id": 0})
    if not athlete:
        return {"recommendations": [], "total": 0, "tier": tier, "gated": False}

    profile = await db.athlete_profiles.find_one({"tenant_id": tenant_id}, {"_id": 0}) or {}

    # Get schools already in pipeline (to exclude or mark)
    pipeline_schools = set()
    async for p in db.programs.find({"tenant_id": tenant_id}, {"_id": 0, "university_name": 1}):
        pipeline_schools.add(p.get("university_name", "").lower())

    # Fetch all schools from knowledge base
    schools = await db.university_knowledge_base.find(
        {}, {"_id": 0}
    ).to_list(2000)

    # Score each school
    scored = []
    for school in schools:
        name = school.get("university_name", "")
        match = compute_match_score(athlete, profile, school)
        scorecard = school.get("scorecard") or {}

        scored.append({
            "university_name": name,
            "division": school.get("division", ""),
            "conference": school.get("conference", ""),
            "region": school.get("region", ""),
            "state": scorecard.get("state", ""),
            "city": scorecard.get("city", ""),
            "logo_url": school.get("logo_url", ""),
            "domain": school.get("domain", ""),
            "school_type": scorecard.get("school_type", ""),
            "student_size": scorecard.get("student_size"),
            "avg_gpa": scorecard.get("avg_gpa") or scorecard.get("estimated_avg_gpa"),
            "acceptance_rate": scorecard.get("acceptance_rate"),
            "scholarship_type": school.get("scholarship_type", ""),
            "match_score": match["match_score"],
            "breakdown": match["breakdown"],
            "chips": match["chips"],
            "top_reason": match["top_reason"],
            "in_pipeline": name.lower() in pipeline_schools,
            "ai_summary": None,
            "ai_next_step": None,
            "ai_verify": None,
        })

    # Sort by match score descending
    scored.sort(key=lambda x: x["match_score"], reverse=True)

    # Subscription gating
    gated = False
    if tier == "basic":
        # Basic: top 3 only, no AI explanations
        if len(scored) > 3:
            gated = True
        scored = scored[:3]
    else:
        scored = scored[:limit]

    # AI explanations for Pro/Premium (top 10 only to save cost)
    if tier in ("pro", "premium"):
        ai_count = 10 if tier == "premium" else 5
        for rec in scored[:ai_count]:
            school_doc = next(
                (s for s in schools if s.get("university_name") == rec["university_name"]),
                None
            )
            if school_doc:
                ai = await generate_ai_explanation(school_doc, rec, athlete)
                rec["ai_summary"] = ai.get("summary", "")
                rec["ai_next_step"] = ai.get("next_step", "")
                rec["ai_verify"] = ai.get("verify", "")

    return {
        "recommendations": scored,
        "total": len(scored),
        "tier": tier,
        "gated": gated,
        "gated_total": len(schools) if gated else None,
    }

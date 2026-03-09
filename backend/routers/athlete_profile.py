"""Athlete Profile — self-managed profile editor + public profile page.

Reads/writes the canonical `athletes` collection, mapping field names
between the unified schema and the athlete app's expected field names.
"""

from fastapi import APIRouter, HTTPException
import re
import time
import logging

logger = logging.getLogger(__name__)

# ── KB caching ─────────────────────────────────────────────────────────
_kb_cache = {"data": None, "indexes": None, "ts": 0}
_KB_TTL = 300
_scores_cache = {}
_SCORES_TTL = 120


def _normalize_school_name(name: str) -> str:
    n = name.lower().strip()
    for word in ["university of", "university", "college of", "college", "the ", "– ", "- "]:
        n = n.replace(word, " ")
    n = re.sub(r"[^a-z0-9\\s]", "", n)
    n = re.sub(r"\\s+", " ", n).strip()
    return n


def _build_kb_index(all_kb):
    by_name, by_domain, by_norm = {}, {}, {}
    for kb in all_kb:
        name = kb.get("university_name", "")
        by_name[name] = kb
        domain = kb.get("domain", "")
        if domain:
            by_domain[domain] = kb
        norm = _normalize_school_name(name)
        if norm:
            by_norm[norm] = kb
    return by_name, by_domain, by_norm


async def _get_kb_indexed():
    now = time.time()
    if _kb_cache["data"] is not None and (now - _kb_cache["ts"]) < _KB_TTL:
        return _kb_cache["data"], _kb_cache["indexes"]
    all_kb = await db.university_knowledge_base.find({}, {"_id": 0}).to_list(2000)
    indexes = _build_kb_index(all_kb)
    _kb_cache["data"] = all_kb
    _kb_cache["indexes"] = indexes
    _kb_cache["ts"] = now
    return all_kb, indexes


def _find_kb_match(program, by_name, by_domain, by_norm):
    name = program.get("university_name", "")
    if name in by_name:
        return by_name[name]
    domain = program.get("domain", "")
    if domain and domain in by_domain:
        return by_domain[domain]
    norm = _normalize_school_name(name)
    if norm in by_norm:
        return by_norm[norm]
    key_words = [w for w in norm.split() if len(w) > 2]
    if not key_words:
        return None
    min_score = 2.0 if (len(key_words) == 1 and len(norm) < 5) else 1.5
    best, best_score = None, 0
    for kb_norm, kb in by_norm.items():
        matches = sum(1 for w in key_words if w in kb_norm)
        if matches < len(key_words) * 0.6:
            continue
        len_sim = 1 - abs(len(norm) - len(kb_norm)) / max(len(norm), len(kb_norm), 1)
        score = matches + len_sim
        if score > best_score:
            best_score = score
            best = kb
    return best if best_score >= min_score else None


def _compute_risk_badges(school, profile, match_reasons=None):
    badges = []
    reasons = match_reasons or []
    division = (school.get("division") or "").upper()
    if any(r in reasons for r in ("Reach", "High Reach")):
        badges.append({"key": "academic_reach", "label": "Academic Reach", "severity": "warn"})
    if division == "D1":
        badges.append({"key": "roster_tight", "label": "Roster Tight", "severity": "info"})
    grad_year = profile.get("graduation_year") or profile.get("grad_year") or ""
    try:
        grad_yr = int(grad_year)
    except (ValueError, TypeError):
        grad_yr = None
    current_year = datetime.now(timezone.utc).year
    if grad_yr and division in ("D1", "D2"):
        years_out = grad_yr - current_year
        if years_out <= 2:
            badges.append({"key": "timeline_risk", "label": "Timeline Awareness", "severity": "time"})
    if division in ("D2", "NAIA", "D3"):
        badges.append({"key": "funding_dependent", "label": "Funding Dependent", "severity": "funding"})
    return badges
from datetime import datetime, timezone
from auth_middleware import get_current_user_dep
from db_client import db

router = APIRouter()

# ── Field mapping: canonical athletes → athlete-app profile names ──────

_TO_PROFILE = {
    "fullName": "athlete_name",
    "gradYear": "graduation_year",
    "position": "position",
    "team": "club_team",
    "height": "height",
    "email": "contact_email",
    "phone": "contact_phone",
    "high_school": "high_school",
    "gpa": "gpa",
    "hudl_url": "hudl_profile_url",
    "video_link": "video_link",
    "photo_url": "photo_url",
    "bio": "bio",
}

_FROM_PROFILE = {v: k for k, v in _TO_PROFILE.items()}

# Extra profile fields stored directly on the athlete doc (no rename)
_EXTRA_FIELDS = {
    "weight", "jersey_number", "standing_reach", "approach_touch",
    "block_touch", "wingspan", "handed", "city", "state",
    "parent_name", "parent_email", "parent_phone",
    "sat_score", "act_score",
}

_ALL_PROFILE_FIELDS = set(_TO_PROFILE.values()) | _EXTRA_FIELDS

_EMPTY_PROFILE = {f: "" for f in _ALL_PROFILE_FIELDS}


def _athlete_to_profile(doc: dict) -> dict:
    """Convert an athletes collection doc to the profile field namespace."""
    out = dict(_EMPTY_PROFILE)
    for canon, prof in _TO_PROFILE.items():
        if doc.get(canon):
            out[prof] = doc[canon]
    for f in _EXTRA_FIELDS:
        if doc.get(f):
            out[f] = doc[f]
    out["tenant_id"] = doc.get("tenant_id", "")
    return out


def _profile_to_updates(body: dict) -> dict:
    """Convert profile-namespace fields to canonical athletes updates."""
    updates = {}
    for prof_key, value in body.items():
        if prof_key in _FROM_PROFILE:
            updates[_FROM_PROFILE[prof_key]] = value
        elif prof_key in _EXTRA_FIELDS:
            updates[prof_key] = value
    # Keep fullName in sync if athlete_name is set
    if "athlete_name" in body and body["athlete_name"]:
        updates["fullName"] = body["athlete_name"]
        parts = body["athlete_name"].strip().split(" ", 1)
        updates["firstName"] = parts[0]
        updates["lastName"] = parts[1] if len(parts) > 1 else ""
    if "graduation_year" in body:
        updates["gradYear"] = body["graduation_year"]
    return updates


# ── Adapter ────────────────────────────────────────────────────────────

async def _get_athlete(current_user: dict) -> dict:
    if current_user["role"] not in ("athlete", "parent"):
        raise HTTPException(403, "Only athletes/parents can access this")
    athlete = await db.athletes.find_one(
        {"user_id": current_user["id"]}, {"_id": 0}
    )
    if not athlete:
        raise HTTPException(404, "No claimed athlete profile found")
    return athlete


# ── Profile CRUD ───────────────────────────────────────────────────────

@router.get("/athlete/profile")
async def get_profile(current_user: dict = get_current_user_dep()):
    athlete = await _get_athlete(current_user)
    return _athlete_to_profile(athlete)


@router.put("/athlete/profile")
async def update_profile(body: dict, current_user: dict = get_current_user_dep()):
    athlete = await _get_athlete(current_user)
    updates = _profile_to_updates(body)
    if not updates:
        return _athlete_to_profile(athlete)
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.athletes.update_one(
        {"id": athlete["id"]},
        {"$set": updates},
    )
    updated = await db.athletes.find_one({"id": athlete["id"]}, {"_id": 0})
    return _athlete_to_profile(updated)


@router.post("/athlete/profile/photo")
async def upload_photo(body: dict, current_user: dict = get_current_user_dep()):
    athlete = await _get_athlete(current_user)
    photo_data = body.get("photo_data", "")
    if not photo_data:
        raise HTTPException(400, "photo_data required")
    if len(photo_data) > 5_000_000:
        raise HTTPException(400, "Photo too large (max 5MB)")
    await db.athletes.update_one(
        {"id": athlete["id"]},
        {"$set": {
            "photo_url": photo_data,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    return {"ok": True, "photo_url": photo_data}


@router.get("/athlete/share-link")
async def get_share_link(current_user: dict = get_current_user_dep()):
    athlete = await _get_athlete(current_user)
    return {"tenant_id": athlete.get("tenant_id", "")}


# ── Public Profile (no auth) ──────────────────────────────────────────

PRIVATE_FIELDS = {"sat_score", "act_score"}


@router.get("/public/athlete/{tenant_id}")
async def public_athlete_profile(tenant_id: str):
    """Public-facing athlete profile. No auth required."""
    athlete = await db.athletes.find_one(
        {"tenant_id": tenant_id}, {"_id": 0}
    )
    if not athlete:
        raise HTTPException(404, "Athlete not found")

    profile = _athlete_to_profile(athlete)
    # Strip private fields
    safe_profile = {k: v for k, v in profile.items() if k not in PRIVATE_FIELDS}

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    upcoming = await db.athlete_events.find(
        {"tenant_id": tenant_id, "start_date": {"$gte": today}},
        {"_id": 0},
    ).sort("start_date", 1).to_list(50)

    past = await db.athlete_events.find(
        {"tenant_id": tenant_id, "start_date": {"$lt": today}},
        {"_id": 0},
    ).sort("start_date", -1).to_list(20)

    return {
        "profile": safe_profile,
        "upcoming_events": upcoming,
        "past_events": past,
    }


# ── Match Scores ───────────────────────────────────────────────────────

CONFERENCE_REGIONS = {
    "ACC": "Southeast", "SEC": "Southeast", "Big 12": "Southwest",
    "Big Ten": "Midwest", "Big East": "Northeast", "Pac-12": "West Coast",
    "Mountain West": "Mountain West", "AAC": "Southeast", "WCC": "West Coast",
    "A-10": "Northeast", "Colonial": "Northeast", "Patriot": "Northeast",
    "MAAC": "Northeast", "Missouri Valley": "Midwest", "Summit": "Midwest",
    "Horizon": "Midwest", "GLVC": "Midwest", "South Central": "Southwest",
}


def _score_program(p, profile, all_kb_indexed):
    _, (by_name, by_domain, by_norm) = all_kb_indexed
    kb_match = _find_kb_match(p, by_name, by_domain, by_norm)

    # Enrich from KB
    social_links = None
    logo_url = p.get("logo_url")
    if kb_match:
        if not p.get("scorecard_data") and kb_match.get("scorecard"):
            p["scorecard_data"] = kb_match["scorecard"]
        if not logo_url and kb_match.get("logo_url"):
            logo_url = kb_match["logo_url"]
        if kb_match.get("social_links"):
            social_links = kb_match["social_links"]

    pref_divisions = profile.get("division") or []
    if isinstance(pref_divisions, str):
        pref_divisions = [pref_divisions] if pref_divisions else []
    pref_divisions_lower = [d.lower() for d in pref_divisions]
    pref_regions = profile.get("regions") or []
    pref_priorities = profile.get("priorities") or []

    try:
        user_gpa = float(profile["gpa"]) if profile.get("gpa") else None
    except (ValueError, TypeError):
        user_gpa = None
    try:
        user_sat = int(profile["sat_score"]) if profile.get("sat_score") else None
    except (ValueError, TypeError):
        user_sat = None
    try:
        user_act = int(profile["act_score"]) if profile.get("act_score") else None
    except (ValueError, TypeError):
        user_act = None

    score = 0
    total_weight = 0
    match_reasons = []
    prog_div = (p.get("division") or "").lower()

    # Division (30 pts)
    total_weight += 30
    if pref_divisions_lower and prog_div:
        if any(pd in prog_div or prog_div in pd for pd in pref_divisions_lower):
            score += 30
            match_reasons.append("Division Match")
        elif any(("d1" in pd and "d2" in prog_div) or ("d2" in pd and "d1" in prog_div) for pd in pref_divisions_lower):
            score += 12

    # Region (25 pts)
    total_weight += 25
    if pref_regions:
        conf = p.get("conference", "")
        region_name = p.get("region") or CONFERENCE_REGIONS.get(conf, "")
        if region_name in pref_regions or "open" in [r.lower() for r in pref_regions]:
            score += 25
            match_reasons.append("Preferred Region")
        elif region_name:
            score += 8

    # Priority alignment (25 pts)
    total_weight += 25
    priority_score = 0
    per_priority = 25 / max(len(pref_priorities), 1)
    for pr in pref_priorities:
        pr_lower = pr.lower()
        if "academ" in pr_lower:
            if prog_div and ("d1" in prog_div or "d2" in prog_div):
                priority_score += per_priority
                if "Academics" not in match_reasons:
                    match_reasons.append("Academics")
        elif "athlet" in pr_lower:
            if "d1" in prog_div:
                priority_score += per_priority
                match_reasons.append("Athletics")
            elif "d2" in prog_div:
                priority_score += per_priority * 0.6
        elif "scholarship" in pr_lower:
            if prog_div and ("d1" in prog_div or "d2" in prog_div or "naia" in prog_div):
                priority_score += per_priority
                match_reasons.append("Scholarship")
        elif "location" in pr_lower:
            conf = p.get("conference", "")
            region_name = p.get("region") or CONFERENCE_REGIONS.get(conf, "")
            if region_name in pref_regions:
                priority_score += per_priority
        elif "campus" in pr_lower or "culture" in pr_lower:
            priority_score += per_priority * 0.5
        elif "coach" in pr_lower:
            priority_score += per_priority * 0.5
        elif "conference" in pr_lower:
            if p.get("conference"):
                priority_score += per_priority * 0.7
        elif "playing" in pr_lower or "roster" in pr_lower:
            if "d2" in prog_div or "d3" in prog_div or "naia" in prog_div:
                priority_score += per_priority
            else:
                priority_score += per_priority * 0.3
    score += priority_score

    # Academic fit (20 pts)
    total_weight += 20
    academic_score = 0
    academic_checks = 0
    uni_data = p.get("scorecard_data") or {}
    if user_gpa and uni_data.get("acceptance_rate") is not None:
        academic_checks += 1
        accept_rate = uni_data["acceptance_rate"]
        if accept_rate >= 70:
            academic_score += 1.0
        elif accept_rate >= 50:
            academic_score += 0.85 if user_gpa >= 3.0 else 0.5
        elif accept_rate >= 30:
            academic_score += 0.9 if user_gpa >= 3.3 else 0.5 if user_gpa >= 2.8 else 0.2
        else:
            academic_score += 0.9 if user_gpa >= 3.7 else 0.5 if user_gpa >= 3.3 else 0.1
    if user_sat and uni_data.get("sat_avg"):
        academic_checks += 1
        diff = user_sat - uni_data["sat_avg"]
        if diff >= 0:
            academic_score += 1.0
        elif diff >= -100:
            academic_score += 0.7
        elif diff >= -200:
            academic_score += 0.3
        else:
            academic_score += 0.1
    if user_act:
        academic_checks += 1
        if "d1" in prog_div:
            academic_score += 0.9 if user_act >= 24 else 0.5 if user_act >= 20 else 0.2
        elif "d2" in prog_div:
            academic_score += 0.9 if user_act >= 21 else 0.6 if user_act >= 18 else 0.3
        else:
            academic_score += 0.8
    if academic_checks > 0:
        avg_academic = academic_score / academic_checks
        pts = round(avg_academic * 20)
        score += pts
        if avg_academic >= 0.7:
            match_reasons.append("Academic Fit")

    pct = round((score / total_weight) * 100) if total_weight > 0 else 0
    pct = min(pct, 99)

    return {
        "program_id": p.get("program_id"),
        "university_name": p.get("university_name"),
        "match_score": pct,
        "match_reasons": list(set(match_reasons)),
        "risk_badges": _compute_risk_badges(p, profile, match_reasons),
        "logo_url": logo_url,
        "social_links": social_links,
    }


@router.get("/match-scores")
async def get_match_scores(current_user: dict = get_current_user_dep()):
    athlete = await _get_athlete(current_user)
    tenant_id = athlete.get("tenant_id", "")

    now = time.time()
    cached = _scores_cache.get(tenant_id)
    if cached and (now - cached["ts"]) < _SCORES_TTL:
        return cached["data"]

    profile = await db.athlete_profiles.find_one({"tenant_id": tenant_id}, {"_id": 0})
    if not profile:
        return {"scores": [], "profile_exists": False}

    programs = await db.programs.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(200)
    all_kb_indexed = await _get_kb_indexed()

    scores = []
    for p in programs:
        scores.append(_score_program(p, profile, (all_kb_indexed)))

    scores.sort(key=lambda x: x["match_score"], reverse=True)
    result = {"scores": scores, "profile_exists": True}
    _scores_cache[tenant_id] = {"data": result, "ts": time.time()}
    return result

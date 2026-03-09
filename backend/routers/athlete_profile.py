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

# ── Measurables benchmarks by division + position (inches) ─────────────
# Format: { "division": { "position": { "height_min", "height_max", "approach", "block" } } }
MEASURABLE_BENCHMARKS = {
    "d1": {
        "outside hitter":    {"height_min": 71, "height_max": 74, "approach": 116, "block": 109},
        "right side":        {"height_min": 71, "height_max": 74, "approach": 116, "block": 109},
        "middle blocker":    {"height_min": 73, "height_max": 76, "approach": 117, "block": 111},
        "setter":            {"height_min": 69, "height_max": 73, "approach": 114, "block": 108},
        "libero":            {"height_min": 65, "height_max": 72, "approach": 0,   "block": 0},
        "defensive specialist": {"height_min": 65, "height_max": 72, "approach": 0, "block": 0},
        "opposite":          {"height_min": 71, "height_max": 74, "approach": 116, "block": 109},
    },
    "d2": {
        "outside hitter":    {"height_min": 70, "height_max": 72, "approach": 112, "block": 106},
        "right side":        {"height_min": 70, "height_max": 72, "approach": 112, "block": 106},
        "middle blocker":    {"height_min": 72, "height_max": 73, "approach": 113, "block": 108},
        "setter":            {"height_min": 67, "height_max": 69, "approach": 110, "block": 104},
        "libero":            {"height_min": 64, "height_max": 67, "approach": 0,   "block": 0},
        "defensive specialist": {"height_min": 64, "height_max": 67, "approach": 0, "block": 0},
        "opposite":          {"height_min": 70, "height_max": 72, "approach": 112, "block": 106},
    },
    "d3": {
        "outside hitter":    {"height_min": 68, "height_max": 70, "approach": 108, "block": 102},
        "right side":        {"height_min": 68, "height_max": 70, "approach": 108, "block": 102},
        "middle blocker":    {"height_min": 70, "height_max": 72, "approach": 108, "block": 104},
        "setter":            {"height_min": 64, "height_max": 67, "approach": 104, "block": 100},
        "libero":            {"height_min": 62, "height_max": 65, "approach": 0,   "block": 0},
        "defensive specialist": {"height_min": 62, "height_max": 65, "approach": 0, "block": 0},
        "opposite":          {"height_min": 68, "height_max": 70, "approach": 108, "block": 102},
    },
    "naia": {
        "outside hitter":    {"height_min": 68, "height_max": 70, "approach": 108, "block": 102},
        "right side":        {"height_min": 68, "height_max": 70, "approach": 108, "block": 102},
        "middle blocker":    {"height_min": 70, "height_max": 72, "approach": 108, "block": 104},
        "setter":            {"height_min": 64, "height_max": 67, "approach": 104, "block": 100},
        "libero":            {"height_min": 62, "height_max": 65, "approach": 0,   "block": 0},
        "defensive specialist": {"height_min": 62, "height_max": 65, "approach": 0, "block": 0},
        "opposite":          {"height_min": 68, "height_max": 70, "approach": 108, "block": 102},
    },
}

DIV_LABELS = {"d1": "D1", "d2": "D2", "d3": "D3", "naia": "NAIA"}


def _parse_height_inches(h):
    """Convert height string like 5'10 or 5'10\" or 70 to inches."""
    if not h:
        return None
    if isinstance(h, (int, float)):
        return int(h) if h > 12 else None
    h = str(h).strip().replace('"', '').replace('\u2033', '')
    m = re.match(r"(\d+)'?\s*(\d+)?", h)
    if m:
        feet = int(m.group(1))
        inches = int(m.group(2)) if m.group(2) else 0
        return feet * 12 + inches
    try:
        return int(float(h))
    except (ValueError, TypeError):
        return None


def _parse_touch_inches(v):
    """Convert approach/block touch like 9'6 or 114 to inches."""
    if not v:
        return None
    if isinstance(v, (int, float)):
        return int(v)
    v = str(v).strip().replace('"', '').replace('\u2033', '')
    m = re.match(r"(\d+)'?\s*(\d+)?", v)
    if m:
        feet = int(m.group(1))
        inches = int(m.group(2)) if m.group(2) else 0
        return feet * 12 + inches
    try:
        return int(float(v))
    except (ValueError, TypeError):
        return None


def _inches_to_display(inches):
    """Convert inches to display string like 5'10\"."""
    if not inches:
        return None
    ft = inches // 12
    inc = inches % 12
    return f"{ft}'{inc}\""


def _get_benchmark(prog_div, position):
    """Get benchmark for a division and position, with fallback."""
    div_key = prog_div.lower().replace(" ", "")
    if "d1" in div_key:
        div_key = "d1"
    elif "d2" in div_key:
        div_key = "d2"
    elif "naia" in div_key:
        div_key = "naia"
    elif "d3" in div_key or "juco" in div_key:
        div_key = "d3"
    else:
        div_key = "d2"  # default middle ground

    benchmarks = MEASURABLE_BENCHMARKS.get(div_key, MEASURABLE_BENCHMARKS["d2"])

    # Try each position the athlete plays
    positions = position if isinstance(position, list) else [position] if position else []
    for pos in positions:
        pos_lower = pos.lower().strip()
        if pos_lower in benchmarks:
            return benchmarks[pos_lower], div_key, pos_lower
        for key in benchmarks:
            if key in pos_lower or pos_lower in key:
                return benchmarks[key], div_key, key

    return benchmarks.get("outside hitter", {}), div_key, "outside hitter"


def _score_measurables(profile, prog_div):
    """Score measurables (20 pts max). Returns dict with score, details, confidence, fit_label."""
    position = profile.get("position")
    bench, div_key, pos_key = _get_benchmark(prog_div, position)
    div_label = DIV_LABELS.get(div_key, prog_div.upper())
    pos_label = pos_key.replace("_", " ").title()

    height_in = _parse_height_inches(profile.get("height"))
    approach_in = _parse_touch_inches(profile.get("approach_touch"))
    block_in = _parse_touch_inches(profile.get("block_touch"))

    details = {}
    filled_count = 0
    raw_score = 0
    raw_max = 0

    # Height (8 pts)
    if height_in and bench.get("height_min"):
        filled_count += 1
        raw_max += 8
        h_min = bench["height_min"]
        h_max = bench["height_max"]
        diff_from_min = height_in - h_min
        if diff_from_min >= 0:
            raw_score += 8
            status = "above" if height_in > h_max else "within"
        elif diff_from_min >= -1:
            raw_score += 5
            status = "close"
        elif diff_from_min >= -3:
            raw_score += 2
            status = "below"
        else:
            raw_score += 0
            status = "well_below"
        details["height"] = {
            "value": _inches_to_display(height_in),
            "benchmark": f"{_inches_to_display(h_min)}–{_inches_to_display(h_max)}",
            "benchmark_label": f"Typical {div_label} {pos_label} range",
            "status": status,
        }
    elif height_in:
        details["height"] = {"value": _inches_to_display(height_in), "benchmark": None, "status": "no_benchmark"}

    # Approach Touch (7 pts)
    if approach_in and bench.get("approach") and bench["approach"] > 0:
        filled_count += 1
        raw_max += 7
        a_bench = bench["approach"]
        diff = approach_in - a_bench
        if diff >= 0:
            raw_score += 7
            status = "meets"
        elif diff >= -3:
            raw_score += 4
            status = "close"
        elif diff >= -6:
            raw_score += 2
            status = "below"
        else:
            raw_score += 0
            status = "well_below"
        details["approach_touch"] = {
            "value": _inches_to_display(approach_in),
            "benchmark": _inches_to_display(a_bench) + "+",
            "benchmark_label": f"Generally competitive for {div_label}",
            "status": status,
        }
    elif approach_in:
        details["approach_touch"] = {"value": _inches_to_display(approach_in), "benchmark": None, "status": "no_benchmark"}

    # Block Touch (5 pts)
    if block_in and bench.get("block") and bench["block"] > 0:
        filled_count += 1
        raw_max += 5
        b_bench = bench["block"]
        diff = block_in - b_bench
        if diff >= 0:
            raw_score += 5
            status = "meets"
        elif diff >= -3:
            raw_score += 3
            status = "close"
        elif diff >= -4:
            raw_score += 1
            status = "below"
        else:
            raw_score += 0
            status = "well_below"
        details["block_touch"] = {
            "value": _inches_to_display(block_in),
            "benchmark": _inches_to_display(b_bench) + "+",
            "benchmark_label": f"Common benchmark for {div_label}",
            "status": status,
        }
    elif block_in:
        details["block_touch"] = {"value": _inches_to_display(block_in), "benchmark": None, "status": "no_benchmark"}

    # Confidence
    if filled_count >= 3:
        confidence = "high"
        confidence_guidance = None
    elif filled_count == 2:
        confidence = "medium"
        missing = []
        if not height_in:
            missing.append("height")
        if not approach_in:
            missing.append("approach touch")
        if not block_in:
            missing.append("block touch")
        confidence_guidance = f"Add {' and '.join(missing)} to improve match accuracy."
    elif filled_count == 1:
        confidence = "low"
        missing = []
        if not approach_in:
            missing.append("approach touch")
        if not block_in:
            missing.append("block touch")
        if not height_in:
            missing.append("height")
        confidence_guidance = f"Add {' and '.join(missing)} to improve match accuracy."
    else:
        confidence = "estimated"
        confidence_guidance = "Add height and jump metrics to improve match accuracy."

    # Normalize to 20 pts, but cap if data is sparse
    if raw_max > 0:
        pct = raw_score / raw_max
        if filled_count == 1:
            # Only one measurable: cap influence at 10 pts (50% of 20)
            final_score = round(pct * 10)
        elif filled_count == 2:
            final_score = round(pct * 16)
        else:
            final_score = round(pct * 20)
    else:
        # No measurables at all — use 10/20 as neutral baseline so we don't penalize
        final_score = 10
        pct = 0.5

    # Fit label based on raw percentage
    if filled_count == 0:
        fit_label = "Not Enough Data"
    elif pct >= 0.75:
        fit_label = "Strong Fit"
    elif pct >= 0.50:
        fit_label = "Possible Fit"
    elif pct >= 0.25:
        fit_label = "Stretch"
    else:
        fit_label = "Less Likely Fit"

    return {
        "score": final_score,
        "max": 20,
        "raw_score": raw_score,
        "raw_max": raw_max,
        "pct": round(pct * 100),
        "label": fit_label,
        "details": details,
        "confidence": confidence,
        "confidence_guidance": confidence_guidance,
        "filled_count": filled_count,
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

    prog_div = (p.get("division") or "").lower()
    match_reasons = []
    sub_scores = {}

    # ── Division (25 pts) ──
    div_score = 0
    div_max = 25
    if pref_divisions_lower and prog_div:
        if any(pd in prog_div or prog_div in pd for pd in pref_divisions_lower):
            div_score = 25
            match_reasons.append("Division Match")
        elif any(("d1" in pd and "d2" in prog_div) or ("d2" in pd and "d1" in prog_div) for pd in pref_divisions_lower):
            div_score = 10
    sub_scores["division"] = {"score": div_score, "max": div_max, "label": "Division & Preference"}

    # ── Region (20 pts) ──
    region_score = 0
    region_max = 20
    region_name = ""
    if pref_regions:
        conf = p.get("conference", "")
        region_name = p.get("region") or CONFERENCE_REGIONS.get(conf, "")
        if region_name in pref_regions or "open" in [r.lower() for r in pref_regions]:
            region_score = 20
            match_reasons.append("Preferred Region")
        elif region_name:
            region_score = 7
    sub_scores["region"] = {"score": region_score, "max": region_max, "label": "Region"}

    # ── Priority alignment (18 pts) ──
    priority_score = 0
    priority_max = 18
    per_priority = 18 / max(len(pref_priorities), 1)
    for pr in pref_priorities:
        pr_lower = pr.lower()
        if "academ" in pr_lower or "strong academ" in pr_lower:
            if prog_div and ("d1" in prog_div or "d2" in prog_div):
                priority_score += per_priority
                if "Academics" not in match_reasons:
                    match_reasons.append("Academics")
        elif "athlet" in pr_lower or "top athlet" in pr_lower:
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
            rn = p.get("region") or CONFERENCE_REGIONS.get(conf, "")
            if rn in pref_regions:
                priority_score += per_priority
        elif "campus" in pr_lower or "culture" in pr_lower or "social" in pr_lower:
            priority_score += per_priority * 0.5
        elif "coach" in pr_lower:
            priority_score += per_priority * 0.5
        elif "conference" in pr_lower:
            if p.get("conference"):
                priority_score += per_priority * 0.7
        elif "playing" in pr_lower or "roster" in pr_lower or "competitive" in pr_lower:
            if "d2" in prog_div or "d3" in prog_div or "naia" in prog_div:
                priority_score += per_priority
            else:
                priority_score += per_priority * 0.3
    priority_score = round(priority_score)
    sub_scores["priorities"] = {"score": priority_score, "max": priority_max, "label": "Priorities"}

    # ── Academic fit (17 pts) ──
    acad_score = 0
    acad_max = 17
    academic_checks = 0
    academic_sum = 0
    uni_data = p.get("scorecard_data") or {}
    if user_gpa and uni_data.get("acceptance_rate") is not None:
        academic_checks += 1
        accept_rate = uni_data["acceptance_rate"]
        if accept_rate >= 70:
            academic_sum += 1.0
        elif accept_rate >= 50:
            academic_sum += 0.85 if user_gpa >= 3.0 else 0.5
        elif accept_rate >= 30:
            academic_sum += 0.9 if user_gpa >= 3.3 else 0.5 if user_gpa >= 2.8 else 0.2
        else:
            academic_sum += 0.9 if user_gpa >= 3.7 else 0.5 if user_gpa >= 3.3 else 0.1
    if user_sat and uni_data.get("sat_avg"):
        academic_checks += 1
        diff = user_sat - uni_data["sat_avg"]
        if diff >= 0:
            academic_sum += 1.0
        elif diff >= -100:
            academic_sum += 0.7
        elif diff >= -200:
            academic_sum += 0.3
        else:
            academic_sum += 0.1
    if user_act:
        academic_checks += 1
        if "d1" in prog_div:
            academic_sum += 0.9 if user_act >= 24 else 0.5 if user_act >= 20 else 0.2
        elif "d2" in prog_div:
            academic_sum += 0.9 if user_act >= 21 else 0.6 if user_act >= 18 else 0.3
        else:
            academic_sum += 0.8
    if academic_checks > 0:
        avg_acad = academic_sum / academic_checks
        acad_score = round(avg_acad * acad_max)
        if avg_acad >= 0.7:
            match_reasons.append("Academic Fit")
    sub_scores["academics"] = {"score": acad_score, "max": acad_max, "label": "Academic Fit"}

    # ── Measurables fit (20 pts) ──
    meas = _score_measurables(profile, prog_div)
    sub_scores["measurables"] = {"score": meas["score"], "max": meas["max"], "label": "Athletic / Measurables"}

    # ── Total ──
    total_score = div_score + region_score + priority_score + acad_score + meas["score"]
    total_max = div_max + region_max + priority_max + acad_max + meas["max"]
    pct = round((total_score / total_max) * 100) if total_max > 0 else 0
    pct = min(pct, 99)

    # ── Build explanation (2 sentences for cards, longer for detail) ──
    explanation_parts = []
    div_label = DIV_LABELS.get(prog_div.replace(" ", ""), prog_div.upper())
    position = profile.get("position")
    pos_str = position[0] if isinstance(position, list) and position else (position or "")

    if meas["details"].get("height"):
        h_detail = meas["details"]["height"]
        if h_detail["status"] in ("within", "above"):
            explanation_parts.append(f"Your height ({h_detail['value']}) is within the typical {div_label} {pos_str} recruiting range.")
        elif h_detail["status"] == "close":
            explanation_parts.append(f"Your height ({h_detail['value']}) is close to the typical {div_label} {pos_str} range ({h_detail['benchmark']}).")
        elif h_detail["status"] == "below":
            explanation_parts.append(f"Your height ({h_detail['value']}) is below the typical {div_label} {pos_str} range ({h_detail['benchmark']}), but skills and athleticism can compensate.")
        elif h_detail["status"] == "well_below":
            explanation_parts.append(f"At {h_detail['value']}, height is a factor — the typical {div_label} {pos_str} range is {h_detail['benchmark']}.")

    if div_score >= 20:
        explanation_parts.append(f"{div_label} aligns with your division preference.")
    elif div_score > 0:
        explanation_parts.append(f"{div_label} is adjacent to your preferred divisions.")
    else:
        explanation_parts.append(f"{div_label} doesn't match your preferred divisions.")

    if region_score >= 15:
        explanation_parts.append(f"{region_name or p.get('conference', '')} region matches your preference.")
    if acad_score >= acad_max * 0.7:
        explanation_parts.append("Academic profile is a strong fit.")
    elif acad_score >= acad_max * 0.4:
        explanation_parts.append("Academics are a reasonable match.")

    if meas["confidence"] in ("estimated", "low"):
        explanation_parts.append(meas["confidence_guidance"] or "")

    short_explanation = " ".join(explanation_parts[:2])
    full_explanation = " ".join(explanation_parts)

    return {
        "program_id": p.get("program_id"),
        "university_name": p.get("university_name"),
        "match_score": pct,
        "match_reasons": list(set(match_reasons)),
        "sub_scores": sub_scores,
        "measurables_fit": {
            "score": meas["score"],
            "max": meas["max"],
            "pct": meas["pct"],
            "label": meas["label"],
            "details": meas["details"],
        },
        "confidence": meas["confidence"],
        "confidence_guidance": meas["confidence_guidance"],
        "explanation": short_explanation,
        "full_explanation": full_explanation,
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

    recruiting_profile = athlete.get("recruiting_profile") or {}
    fallback_profile = await db.athlete_profiles.find_one({"tenant_id": tenant_id}, {"_id": 0})
    if not fallback_profile:
        fallback_profile = {}

    profile = {
        "division": recruiting_profile.get("division") or fallback_profile.get("division") or [],
        "regions": recruiting_profile.get("regions") or fallback_profile.get("regions") or [],
        "priorities": recruiting_profile.get("priorities") or fallback_profile.get("priorities") or [],
        "gpa": recruiting_profile.get("gpa") or fallback_profile.get("gpa") or athlete.get("gpa"),
        "sat_score": recruiting_profile.get("sat_score") or fallback_profile.get("sat_score") or athlete.get("sat_score"),
        "act_score": recruiting_profile.get("act_score") or fallback_profile.get("act_score") or athlete.get("act_score"),
        "graduation_year": athlete.get("gradYear") or athlete.get("grad_year"),
        "position": recruiting_profile.get("position") or athlete.get("position"),
        "academic_interests": recruiting_profile.get("academic_interests"),
        "height": athlete.get("height"),
        "approach_touch": athlete.get("approach_touch"),
        "block_touch": athlete.get("block_touch"),
        "standing_reach": athlete.get("standing_reach"),
    }

    if not profile["division"] and not profile["regions"]:
        return {"scores": [], "profile_exists": False}

    programs = await db.programs.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(200)
    all_kb_indexed = await _get_kb_indexed()

    scores = []
    for p in programs:
        scores.append(_score_program(p, profile, all_kb_indexed))

    scores.sort(key=lambda x: x["match_score"], reverse=True)
    result = {"scores": scores, "profile_exists": True}
    _scores_cache[tenant_id] = {"data": result, "ts": time.time()}
    return result

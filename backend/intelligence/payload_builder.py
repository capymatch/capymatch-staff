"""Payload Builder — assembles source-aware data for intelligence agents.

Resolves fields from university_knowledge_base, programs, athletes, and interactions.
Produces a structured payload with per-section data quality ratings,
known unknowns, source metadata, and a deterministic confidence score.

Cached for 12 hours per program_id to reduce DB reads.
"""

import logging
from datetime import datetime, timezone, timedelta
from db_client import db

log = logging.getLogger(__name__)

# In-memory cache: key = f"{program_id}:{tenant_id}" → (payload, expires_at)
_cache: dict[str, tuple[dict, datetime]] = {}
CACHE_TTL_HOURS = 12

# Fields tracked for confidence calculation
TRACKED_FIELDS = [
    "school_scorecard",        # UKB: sat_avg OR avg_gpa exists
    "school_division",         # UKB or program: division
    "school_conference",       # UKB: conference
    "school_region",           # UKB: region
    "school_scholarship_type", # UKB: scholarship_type
    "athlete_position",        # Athlete: position
    "athlete_grad_year",       # Athlete: grad_year
    "athlete_gpa",             # Athlete: gpa or recruiting_profile.gpa
    "athlete_test_scores",     # Athlete: SAT or ACT
    "athlete_priorities",      # Recruiting profile: priorities
    "recruiting_status",       # Program: recruiting_status
    "interaction_history",     # At least 1 interaction exists
]


def _confidence_label(pct: float) -> str:
    if pct >= 70:
        return "HIGH"
    if pct >= 40:
        return "MEDIUM"
    return "LOW"


def _source(collection: str, field: str, value, freshness: str = "current") -> dict:
    """Wrap a value with its source metadata."""
    return {
        "value": value,
        "source": collection,
        "field": field,
        "freshness": freshness,
    }


async def build_payload(program_id: str, tenant_id: str, *, force: bool = False) -> dict:
    """Build the intelligence payload for a program+athlete pair.

    Returns a dict with sections: school, athlete, engagement, meta.
    Each populated field carries source metadata.
    """
    cache_key = f"{program_id}:{tenant_id}"

    # Check cache
    if not force and cache_key in _cache:
        payload, expires_at = _cache[cache_key]
        if datetime.now(timezone.utc) < expires_at:
            return payload

    # ── Fetch raw data ──────────────────────────────────────────────────
    program = await db.programs.find_one(
        {"program_id": program_id, "tenant_id": tenant_id}, {"_id": 0}
    )
    if not program:
        return _empty_payload(program_id, tenant_id, "Program not found")

    uni_name = program.get("university_name", "")

    # Try UKB lookup by domain first, then by name
    ukb = None
    domain = program.get("domain")
    if domain:
        ukb = await db.university_knowledge_base.find_one(
            {"domain": domain}, {"_id": 0}
        )
    if not ukb and uni_name:
        ukb = await db.university_knowledge_base.find_one(
            {"university_name": uni_name}, {"_id": 0}
        )
    ukb = ukb or {}
    scorecard = ukb.get("scorecard", {})

    athlete = await db.athletes.find_one(
        {"tenant_id": tenant_id}, {"_id": 0}
    )
    athlete = athlete or {}
    rp = athlete.get("recruiting_profile") or {}

    interactions = await db.interactions.find(
        {"program_id": program_id, "tenant_id": tenant_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)

    # ── Build sections ──────────────────────────────────────────────────
    filled = set()

    # School section
    school = {"university_name": uni_name}

    if scorecard.get("sat_avg") or scorecard.get("avg_gpa") or scorecard.get("acceptance_rate"):
        school["scorecard"] = {
            k: _source("university_knowledge_base", f"scorecard.{k}", v)
            for k, v in scorecard.items() if v is not None
        }
        filled.add("school_scorecard")

    div = ukb.get("division") or program.get("division")
    if div:
        school["division"] = _source("university_knowledge_base" if ukb.get("division") else "programs", "division", div)
        filled.add("school_division")

    conf = ukb.get("conference")
    if conf:
        school["conference"] = _source("university_knowledge_base", "conference", conf)
        filled.add("school_conference")

    region = ukb.get("region") or program.get("region")
    if region:
        school["region"] = _source("university_knowledge_base" if ukb.get("region") else "programs", "region", region)
        filled.add("school_region")

    st = ukb.get("scholarship_type")
    if st:
        school["scholarship_type"] = _source("university_knowledge_base", "scholarship_type", st)
        filled.add("school_scholarship_type")

    # Athlete section
    athlete_sec = {"full_name": athlete.get("full_name", "")}

    pos = athlete.get("position") or (rp.get("position", [None])[0] if isinstance(rp.get("position"), list) else rp.get("position"))
    if pos:
        athlete_sec["position"] = _source("athletes", "position", pos)
        filled.add("athlete_position")

    gy = athlete.get("grad_year") or rp.get("grad_year")
    if gy:
        athlete_sec["grad_year"] = _source("athletes", "grad_year", gy)
        filled.add("athlete_grad_year")

    gpa = athlete.get("gpa") or rp.get("gpa")
    if gpa:
        athlete_sec["gpa"] = _source("athletes", "gpa", gpa)
        filled.add("athlete_gpa")

    sat = rp.get("sat_score")
    act = rp.get("act_score")
    if sat or act:
        athlete_sec["test_scores"] = {}
        if sat:
            athlete_sec["test_scores"]["sat"] = _source("athletes.recruiting_profile", "sat_score", sat)
        if act:
            athlete_sec["test_scores"]["act"] = _source("athletes.recruiting_profile", "act_score", act)
        filled.add("athlete_test_scores")

    priorities = rp.get("priorities")
    if priorities:
        athlete_sec["priorities"] = _source("athletes.recruiting_profile", "priorities", priorities)
        filled.add("athlete_priorities")

    regions = rp.get("regions")
    if regions:
        athlete_sec["preferred_regions"] = _source("athletes.recruiting_profile", "regions", regions)

    academic_interests = rp.get("academic_interests")
    if academic_interests:
        athlete_sec["academic_interests"] = _source("athletes.recruiting_profile", "academic_interests", academic_interests)

    # Engagement section (Sprint 3 SSOT: canonical recruiting_status only)
    engagement = {
        "recruiting_status": program.get("recruiting_status"),
        "priority": program.get("priority"),
    }

    if program.get("recruiting_status"):
        filled.add("recruiting_status")

    if interactions:
        filled.add("interaction_history")
        engagement["interaction_count"] = len(interactions)
        engagement["last_interaction"] = {
            "type": interactions[0].get("type"),
            "outcome": interactions[0].get("outcome"),
            "date": interactions[0].get("date_time") or interactions[0].get("created_at"),
        }
        engagement["interaction_types"] = list({ix.get("type") for ix in interactions if ix.get("type")})
        # Days since last interaction
        last_dt = interactions[0].get("date_time") or interactions[0].get("created_at")
        if last_dt:
            try:
                if isinstance(last_dt, str):
                    last_dt = datetime.fromisoformat(last_dt.replace("Z", "+00:00"))
                delta = (datetime.now(timezone.utc) - last_dt).days
                engagement["days_since_last_interaction"] = delta
            except Exception:
                pass
    else:
        engagement["interaction_count"] = 0

    # ── Confidence calculation ──────────────────────────────────────────
    total_fields = len(TRACKED_FIELDS)
    filled_count = len(filled)
    confidence_pct = round((filled_count / total_fields) * 100) if total_fields > 0 else 0
    confidence_label = _confidence_label(confidence_pct)

    # ── Known unknowns ──────────────────────────────────────────────────
    known_unknowns = []
    if "school_scorecard" not in filled:
        known_unknowns.append("No academic scorecard data available for this school")
    if "school_conference" not in filled:
        known_unknowns.append("Conference information is not available")
    if "school_scholarship_type" not in filled:
        known_unknowns.append("Scholarship structure information is not available")
    if "athlete_test_scores" not in filled:
        known_unknowns.append("No SAT or ACT scores on file for the athlete")
    if "athlete_gpa" not in filled:
        known_unknowns.append("Athlete GPA is not on file")
    if "interaction_history" not in filled:
        known_unknowns.append("No interactions recorded with this school yet")
    if "recruiting_status" not in filled:
        known_unknowns.append("Recruiting status has not been set for this school")

    # ── Assemble payload ────────────────────────────────────────────────
    payload = {
        "program_id": program_id,
        "tenant_id": tenant_id,
        "school": school,
        "athlete": athlete_sec,
        "engagement": engagement,
        "meta": {
            "confidence_pct": confidence_pct,
            "confidence": confidence_label,
            "fields_filled": filled_count,
            "fields_total": total_fields,
            "fields_present": sorted(filled),
            "known_unknowns": known_unknowns,
            "built_at": datetime.now(timezone.utc).isoformat(),
        },
    }

    # Cache for 12 hours
    _cache[cache_key] = (payload, datetime.now(timezone.utc) + timedelta(hours=CACHE_TTL_HOURS))
    return payload


def _empty_payload(program_id: str, tenant_id: str, reason: str) -> dict:
    return {
        "program_id": program_id,
        "tenant_id": tenant_id,
        "school": {},
        "athlete": {},
        "engagement": {},
        "meta": {
            "confidence_pct": 0,
            "confidence": "LOW",
            "fields_filled": 0,
            "fields_total": len(TRACKED_FIELDS),
            "fields_present": [],
            "known_unknowns": [reason],
            "built_at": datetime.now(timezone.utc).isoformat(),
        },
    }


def invalidate_cache(program_id: str = None, tenant_id: str = None):
    """Clear cached payloads. If no args, clear all."""
    if program_id and tenant_id:
        _cache.pop(f"{program_id}:{tenant_id}", None)
    else:
        _cache.clear()

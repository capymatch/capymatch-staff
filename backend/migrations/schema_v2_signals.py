"""Schema V2: Structured signals for future intelligence.

Idempotent migration — safe to run multiple times.
Adds fields to athletes, programs, universities.
Creates indexes for new collections.
Computes profile_completeness for existing athletes.
"""

import logging
from datetime import datetime, timezone
from db_client import db

log = logging.getLogger(__name__)

# ── Profile completeness calculation ─────────────────────────────────────────

COMPLETENESS_FIELDS = [
    "full_name",
    "position",           # -> position_primary
    "grad_year",
    "gpa",
    "height",
    "city",
    "state",
    "high_school",
    "team",               # club_team
    "email",
]

MEASURABLE_FIELDS = [
    "height",
    "approach_touch",
    "block_touch",
    "standing_reach",
    "wingspan",
]

ACADEMIC_FIELDS = [
    "gpa",
    "sat_score",
    "act_score",
]


def compute_profile_completeness(athlete: dict) -> int:
    """Return 0-100 completeness percentage for an athlete doc."""
    all_fields = COMPLETENESS_FIELDS + ["sat_score", "act_score", "approach_touch", "block_touch"]
    filled = 0
    for f in all_fields:
        val = athlete.get(f)
        if val is not None and val != "" and val != 0:
            filled += 1
        else:
            # Check recruiting_profile fallback
            rp = athlete.get("recruiting_profile") or {}
            if rp.get(f):
                filled += 1
    return round((filled / len(all_fields)) * 100)


async def run_migration():
    """Run the V2 schema migration."""
    log.info("Schema V2 migration: starting...")
    now = datetime.now(timezone.utc).isoformat()

    # ── 1. Athletes: add new fields ──────────────────────────────────────
    athlete_defaults = {
        "position_primary": None,
        "position_secondary": None,
        "sat_score": None,
        "act_score": None,
        "approach_touch": None,
        "block_touch": None,
        "standing_reach": None,
        "wingspan": None,
        "profile_completeness": 0,
        "measurables_updated_at": None,
        "academic_profile_updated_at": None,
    }

    # Only set fields that don't exist yet
    for field, default in athlete_defaults.items():
        result = await db.athletes.update_many(
            {field: {"$exists": False}},
            {"$set": {field: default}},
        )
        if result.modified_count > 0:
            log.info(f"  athletes.{field}: set default on {result.modified_count} docs")

    # Backfill position_primary from position
    result = await db.athletes.update_many(
        {"position_primary": None, "position": {"$ne": "", "$exists": True}},
        [{"$set": {"position_primary": "$position"}}],
    )
    if result.modified_count > 0:
        log.info(f"  athletes.position_primary: backfilled from position on {result.modified_count} docs")

    # Backfill sat_score / act_score / gpa from recruiting_profile
    async for athlete in db.athletes.find({"recruiting_profile": {"$ne": None}}, {"_id": 0, "id": 1, "recruiting_profile": 1, "sat_score": 1, "act_score": 1, "gpa": 1}):
        rp = athlete.get("recruiting_profile") or {}
        updates = {}
        if not athlete.get("sat_score") and rp.get("sat_score"):
            updates["sat_score"] = rp["sat_score"]
        if not athlete.get("act_score") and rp.get("act_score"):
            updates["act_score"] = rp["act_score"]
        if not athlete.get("gpa") and rp.get("gpa"):
            updates["gpa"] = rp["gpa"]
        if updates:
            updates["academic_profile_updated_at"] = now
            await db.athletes.update_one({"id": athlete["id"]}, {"$set": updates})

    # Compute profile_completeness for all athletes
    async for athlete in db.athletes.find({}, {"_id": 0}):
        pct = compute_profile_completeness(athlete)
        if pct != athlete.get("profile_completeness", 0):
            await db.athletes.update_one(
                {"id": athlete["id"]},
                {"$set": {"profile_completeness": pct}},
            )
    log.info("  athletes: profile_completeness computed")

    # ── 2. Programs: add new fields ──────────────────────────────────────
    program_defaults = {
        "stage_entered_at": None,
        "source_added": "manual",
        "coach_contact_confidence": None,
        "engagement_trend": None,
        "last_meaningful_engagement_at": None,
    }

    for field, default in program_defaults.items():
        result = await db.programs.update_many(
            {field: {"$exists": False}},
            {"$set": {field: default}},
        )
        if result.modified_count > 0:
            log.info(f"  programs.{field}: set default on {result.modified_count} docs")

    # Backfill stage_entered_at from created_at where null
    result = await db.programs.update_many(
        {"stage_entered_at": None, "created_at": {"$exists": True}},
        [{"$set": {"stage_entered_at": "$created_at"}}],
    )
    if result.modified_count > 0:
        log.info(f"  programs.stage_entered_at: backfilled from created_at on {result.modified_count} docs")

    # ── 3. Interactions: add structured signal fields ────────────────────
    interaction_defaults = {
        "is_meaningful": None,
        "response_time_hours": None,
        "initiated_by": None,
        "coach_question_detected": None,
        "request_type": None,
        "invite_type": None,
        "offer_signal": None,
        "scholarship_signal": None,
        "sentiment_signal": None,
        "urgency_signal": None,
        "confidence": None,
    }

    for field, default in interaction_defaults.items():
        result = await db.interactions.update_many(
            {field: {"$exists": False}},
            {"$set": {field: default}},
        )
        if result.modified_count > 0:
            log.info(f"  interactions.{field}: set default on {result.modified_count} docs")

    # ── 4. Universities: add freshness fields ────────────────────────────
    ukb_defaults = {
        "scorecard_updated_at": None,
        "coach_scrape_updated_at": None,
        "coach_data_freshness": None,
        "scorecard_confidence": None,
    }

    for field, default in ukb_defaults.items():
        result = await db.university_knowledge_base.update_many(
            {field: {"$exists": False}},
            {"$set": {field: default}},
        )
        if result.modified_count > 0:
            log.info(f"  ukb.{field}: set default on {result.modified_count} docs")

    # ── 5. Create indexes for new collections ────────────────────────────
    # program_stage_history
    await db.program_stage_history.create_index([("program_id", 1), ("created_at", -1)])
    await db.program_stage_history.create_index([("athlete_id", 1)])
    await db.program_stage_history.create_index([("org_id", 1)])
    log.info("  program_stage_history: indexes created")

    # program_signals
    await db.program_signals.create_index([("program_id", 1), ("is_active", 1)])
    await db.program_signals.create_index([("athlete_id", 1), ("signal_type", 1)])
    await db.program_signals.create_index([("org_id", 1)])
    await db.program_signals.create_index([("detected_at", -1)])
    log.info("  program_signals: indexes created")

    # program_outcomes
    await db.program_outcomes.create_index([("program_id", 1)])
    await db.program_outcomes.create_index([("athlete_id", 1), ("outcome_type", 1)])
    await db.program_outcomes.create_index([("org_id", 1)])
    log.info("  program_outcomes: indexes created")

    # intelligence_cache
    await db.intelligence_cache.create_index([("card_type", 1), ("program_id", 1), ("tenant_id", 1)])
    await db.intelligence_cache.create_index([("generated_at", -1)])
    log.info("  intelligence_cache: indexes created")

    log.info("Schema V2 migration: complete")

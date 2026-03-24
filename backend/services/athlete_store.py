"""Canonical athlete data access layer.

All athlete reads go through this module.
MongoDB is the single source of truth.
Redis provides a shared cache layer across all workers.
If Redis is down, all reads fall through to MongoDB directly.

NO code should import ATHLETES from mock_data for runtime reads.
"""

import logging
from datetime import datetime, timezone
from db_client import db
from services import cache
from services.cache import Keys

log = logging.getLogger(__name__)


# Stage weights for pipeline momentum (recruiting progress, NOT activity)
STAGE_WEIGHTS = {
    "Not Contacted": 5,
    "Added": 5,
    "Prospect": 10,
    "Contacted": 20,
    "Initial Contact": 20,
    "In Conversation": 35,
    "Engaged": 35,
    "Interested": 50,
    "Campus Visit": 70,
    "Visit Scheduled": 70,
    "Visit": 70,
    "Offer": 90,
    "Committed": 100,
}


# ═══════════════════════════════════════════════════════════════
# Primary reads — Redis cache → MongoDB fallback
# ═══════════════════════════════════════════════════════════════

async def get_all() -> list[dict]:
    """All athletes.  Cached in Redis; falls back to MongoDB."""
    key = Keys.athletes_all()
    cached = await cache.get(key)
    if cached is not None:
        return cached

    athletes = await db.athletes.find({}, {"_id": 0}).to_list(10000)
    _recompute_time_fields(athletes)
    await _compute_pipeline_momentum(athletes)

    await cache.set(key, athletes)
    return athletes


async def get_by_id(athlete_id: str) -> dict | None:
    """Single athlete lookup.  Cached individually in Redis."""
    key = Keys.athlete(athlete_id)
    cached = await cache.get(key)
    if cached is not None:
        return cached

    doc = await db.athletes.find_one({"id": athlete_id}, {"_id": 0})
    if doc:
        _recompute_time_fields([doc])
        await _compute_pipeline_momentum([doc])
        await cache.set(key, doc)
    return doc


# ═══════════════════════════════════════════════════════════════
# Derived data — Redis cache → compute on miss
# ═══════════════════════════════════════════════════════════════

async def _ensure_derived(name: str) -> list | dict:
    """Return derived data from cache, or recompute all derived and return requested key."""
    import time as _time

    key = Keys.derived(name)
    cached = await cache.get(key)
    if cached is not None:
        return cached

    # Local TTL — avoid recomputing on every request when Redis is down
    if name in _local_derived and (_time.monotonic() - _local_derived_ts) < _LOCAL_TTL:
        return _local_derived[name]

    # Cache miss — recompute everything and store each piece
    await _recompute_derived()
    # Re-read from cache (just populated) or return direct
    fresh = await cache.get(key)
    if fresh is not None:
        return fresh

    # Redis down — compute was done but couldn't cache.  Return from local fallback.
    return _local_derived.get(name, [] if name != "program_snapshot" else {})


# Thread-local fallback for when Redis is completely unavailable
_local_derived: dict = {}
_local_derived_ts: float = 0.0   # last recompute timestamp
_LOCAL_TTL = 120                  # 2-minute local cache to prevent flicker


async def _recompute_derived():
    """Reload athletes from DB and recompute ALL derived data.

    Results are stored in Redis (shared across workers).
    Also kept in _local_derived as a last-resort fallback.
    """
    from decision_engine import (
        detect_all_interventions,
        rank_interventions,
        get_priority_alerts as compute_alerts,
        get_athletes_needing_attention as compute_needing_attention,
    )
    from mock_data import UPCOMING_EVENTS, generate_momentum_signals, get_program_snapshot

    athletes = await get_all()

    interventions = []
    for athlete in athletes:
        interventions.extend(detect_all_interventions(athlete, UPCOMING_EVENTS))
    ranked = rank_interventions(interventions)

    derived = {
        "interventions": ranked,
        "priority_alerts": compute_alerts(ranked),
        "needing_attention": compute_needing_attention(ranked),
        "momentum_signals": generate_momentum_signals(athletes),
        "program_snapshot": get_program_snapshot(athletes),
    }

    # Store each piece in Redis with TTL
    for name, value in derived.items():
        await cache.set(Keys.derived(name), value)

    # Local fallback copy
    _local_derived.update(derived)
    global _local_derived_ts
    import time as _time
    _local_derived_ts = _time.monotonic()

    log.info(
        "athlete_store: derived data refreshed — "
        "%d interventions, %d needing attention, %d signals (cache=%s)",
        len(ranked),
        len(derived["needing_attention"]),
        len(derived["momentum_signals"]),
        "redis" if cache.is_available() else "local-only",
    )


async def get_interventions() -> list:
    return await _ensure_derived("interventions")


async def get_needing_attention() -> list:
    return await _ensure_derived("needing_attention")


async def get_signals() -> list:
    return await _ensure_derived("momentum_signals")


async def get_snapshot() -> dict:
    return await _ensure_derived("program_snapshot")


async def get_alerts() -> list:
    return await _ensure_derived("priority_alerts")


# ═══════════════════════════════════════════════════════════════
# Write-path cache invalidation (cross-worker via Redis)
# ═══════════════════════════════════════════════════════════════

async def recompute_derived_data():
    """Invalidate ALL caches and recompute.  Called after write operations."""
    # Invalidate athlete caches (forces fresh DB read on next access)
    await cache.invalidate(Keys.athletes_all())
    await cache.invalidate_pattern(f"{cache.PREFIX}:athlete:*")
    # Invalidate derived caches
    await cache.invalidate_pattern(Keys.derived_all())
    # Recompute derived data and populate caches
    await _recompute_derived()


async def invalidate_athlete(athlete_id: str):
    """Invalidate a single athlete's cache.  Use after single-athlete writes."""
    await cache.invalidate(
        Keys.athlete(athlete_id),
        Keys.athletes_all(),
    )


# ═══════════════════════════════════════════════════════════════
# Internal helpers
# ═══════════════════════════════════════════════════════════════

def _recompute_time_fields(athletes):
    """Recompute days_since_activity from stored last_activity timestamps."""
    now = datetime.now(timezone.utc)
    for a in athletes:
        try:
            last = datetime.fromisoformat(a["last_activity"])
            a["days_since_activity"] = max(0, (now - last).days)
        except (KeyError, ValueError):
            pass


async def _compute_pipeline_momentum(athletes):
    """Compute pipeline-based momentum for each athlete from their school pipeline."""
    athlete_ids = [a["id"] for a in athletes]
    if not athlete_ids:
        return

    programs = await db.programs.find(
        {"athlete_id": {"$in": athlete_ids}},
        {"_id": 0, "athlete_id": 1, "recruiting_status": 1}
    ).to_list(10000)

    athlete_programs = {}
    for p in programs:
        athlete_programs.setdefault(p["athlete_id"], []).append(p)

    for athlete in athletes:
        aid = athlete["id"]
        progs = athlete_programs.get(aid, [])

        if not progs:
            athlete["pipeline_momentum"] = 0
            athlete["pipeline_best_stage"] = "No Schools"
            athlete["momentum_score"] = 0
            continue

        stage_scores = []
        best_stage = "Prospect"
        best_weight = 0
        for p in progs:
            status = (p.get("recruiting_status") or "Prospect").strip()
            weight = STAGE_WEIGHTS.get(status, 10)
            stage_scores.append(weight)
            if weight > best_weight:
                best_weight = weight
                best_stage = status

        advanced = [s for s in stage_scores if s >= 20]
        breadth_bonus = min(10, max(0, len(advanced) - 1) * 3)
        pipeline_momentum = min(100, best_weight + breadth_bonus)

        athlete["pipeline_momentum"] = pipeline_momentum
        athlete["pipeline_best_stage"] = best_stage
        athlete["momentum_score"] = pipeline_momentum

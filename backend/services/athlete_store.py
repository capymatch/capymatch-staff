"""Canonical athlete data access layer.

All athlete reads go through this module.
MongoDB `athletes` collection is the single source of truth.
Primary reads (get_all, get_by_id) always query MongoDB directly.
Derived data (interventions, signals, etc.) is cached with a short TTL
and recomputed on demand from fresh DB data.

NO code should import ATHLETES from mock_data for runtime reads.
"""

import time
import logging
from datetime import datetime, timezone
from db_client import db

log = logging.getLogger(__name__)

# ── TTL cache for derived data (process-local, auto-expires) ──
_derived_cache = {
    "interventions": [],
    "needing_attention": [],
    "momentum_signals": [],
    "program_snapshot": {},
    "priority_alerts": [],
    "last_computed": 0,
}
_CACHE_TTL = 30  # seconds


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
# Primary reads — always query MongoDB directly
# ═══════════════════════════════════════════════════════════════

async def get_all() -> list[dict]:
    """All athletes — always fresh from MongoDB."""
    athletes = await db.athletes.find({}, {"_id": 0}).to_list(10000)
    _recompute_time_fields(athletes)
    await _compute_pipeline_momentum(athletes)
    return athletes


async def get_by_id(athlete_id: str) -> dict | None:
    """Single athlete lookup — always fresh from MongoDB."""
    doc = await db.athletes.find_one({"id": athlete_id}, {"_id": 0})
    if doc:
        _recompute_time_fields([doc])
        await _compute_pipeline_momentum([doc])
    return doc


# ═══════════════════════════════════════════════════════════════
# Derived data — cached with TTL, computed from fresh DB data
# ═══════════════════════════════════════════════════════════════

async def _ensure_derived():
    """Refresh derived cache if stale (older than _CACHE_TTL seconds)."""
    if time.time() - _derived_cache["last_computed"] < _CACHE_TTL:
        return
    await _recompute_derived()


async def _recompute_derived():
    """Reload athletes from DB and recompute ALL derived caches."""
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

    _derived_cache["interventions"] = ranked
    _derived_cache["priority_alerts"] = compute_alerts(ranked)
    _derived_cache["needing_attention"] = compute_needing_attention(ranked)
    _derived_cache["momentum_signals"] = generate_momentum_signals(athletes)
    _derived_cache["program_snapshot"] = get_program_snapshot(athletes)
    _derived_cache["last_computed"] = time.time()

    log.info(
        f"athlete_store: derived data refreshed — "
        f"{len(ranked)} interventions, "
        f"{len(_derived_cache['needing_attention'])} needing attention, "
        f"{len(_derived_cache['momentum_signals'])} signals"
    )


async def get_interventions() -> list:
    await _ensure_derived()
    return _derived_cache["interventions"]


async def get_needing_attention() -> list:
    await _ensure_derived()
    return _derived_cache["needing_attention"]


async def get_signals() -> list:
    await _ensure_derived()
    return _derived_cache["momentum_signals"]


async def get_snapshot() -> dict:
    await _ensure_derived()
    return _derived_cache["program_snapshot"]


async def get_alerts() -> list:
    await _ensure_derived()
    return _derived_cache["priority_alerts"]


# ═══════════════════════════════════════════════════════════════
# Write-path cache invalidation
# ═══════════════════════════════════════════════════════════════

async def recompute_derived_data():
    """Force-refresh derived data cache. Called after write operations."""
    await _recompute_derived()


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

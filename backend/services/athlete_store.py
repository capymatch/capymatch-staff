"""Canonical athlete data access layer.

All athlete reads go through this module.
MongoDB `athletes` collection is the single source of truth.
A local cache is maintained for sync compatibility with existing engine code.
Cache is refreshed from DB on startup and after every athlete write.

NO code should import ATHLETES from mock_data for runtime reads.
"""

import logging
from datetime import datetime, timezone
from db_client import db

log = logging.getLogger(__name__)

# ── Runtime caches (always populated FROM DB, never from mock generation) ──
_athletes: list[dict] = []
_all_interventions: list = []
_needing_attention: list = []
_momentum_signals: list = []
_program_snapshot: dict = {}
_priority_alerts: list = []


# ═══════════════════════════════════════════════════════════════
# Sync read accessors — return from cache (reflects DB state)
# ═══════════════════════════════════════════════════════════════

def get_all() -> list[dict]:
    """All athletes. Cache is always a reflection of current DB state."""
    return _athletes


def get_by_id(athlete_id: str) -> dict | None:
    """Single athlete lookup by ID."""
    return next((a for a in _athletes if a["id"] == athlete_id), None)


def get_interventions() -> list:
    return _all_interventions


def get_needing_attention() -> list:
    return _needing_attention


def get_signals() -> list:
    return _momentum_signals


def get_snapshot() -> dict:
    return _program_snapshot


def get_alerts() -> list:
    return _priority_alerts


# ═══════════════════════════════════════════════════════════════
# Async operations — DB reads and derived-data recomputation
# ═══════════════════════════════════════════════════════════════

async def load_from_db():
    """Load athletes from MongoDB into the local cache."""
    global _athletes
    athletes = await db.athletes.find({}, {"_id": 0}).to_list(10000)
    _recompute_time_fields(athletes)
    _athletes = athletes
    log.info(f"athlete_store: loaded {len(athletes)} athletes from DB")
    return athletes


async def recompute_derived_data():
    """Reload athletes from DB and recompute ALL derived caches.

    This is the SINGLE authoritative recomputation path.
    Called on startup and after every athlete write operation.
    """
    from decision_engine import (
        detect_all_interventions,
        rank_interventions,
        get_priority_alerts as compute_alerts,
        get_athletes_needing_attention as compute_needing_attention,
    )
    from mock_data import UPCOMING_EVENTS, generate_momentum_signals, get_program_snapshot

    # Step 1: Reload athletes from DB
    athletes = await load_from_db()

    # Step 1b: Compute pipeline-based momentum for each athlete
    await _compute_pipeline_momentum(athletes)

    # Step 2: Recompute interventions from athletes + events
    interventions = []
    for athlete in athletes:
        interventions.extend(detect_all_interventions(athlete, UPCOMING_EVENTS))

    _all_interventions.clear()
    _all_interventions.extend(rank_interventions(interventions))

    # Step 3: Recompute alerts and attention lists
    _priority_alerts.clear()
    _priority_alerts.extend(compute_alerts(_all_interventions))

    _needing_attention.clear()
    _needing_attention.extend(compute_needing_attention(_all_interventions))

    # Step 4: Recompute signals and program snapshot
    _momentum_signals.clear()
    _momentum_signals.extend(generate_momentum_signals(athletes))

    _program_snapshot.clear()
    _program_snapshot.update(get_program_snapshot(athletes))

    log.info(
        f"athlete_store: recomputed — "
        f"{len(_all_interventions)} interventions, "
        f"{len(_needing_attention)} needing attention, "
        f"{len(_momentum_signals)} signals"
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


async def _compute_pipeline_momentum(athletes):
    """Compute pipeline-based momentum for each athlete from their school pipeline.

    Momentum reflects RECRUITING PROGRESS (stage advancement), not activity recency.
    - Uses the HIGHEST stage reached across all schools as the primary driver.
    - Breadth bonus: more schools at advanced stages adds a small boost.
    """
    athlete_ids = [a["id"] for a in athletes]
    if not athlete_ids:
        return

    # Batch: get all programs for all athletes
    programs = await db.programs.find(
        {"athlete_id": {"$in": athlete_ids}},
        {"_id": 0, "athlete_id": 1, "recruiting_status": 1}
    ).to_list(1000)

    # Group by athlete
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

        # Get the weight for each school's stage
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

        # Pipeline momentum = best stage weight + breadth bonus
        # Breadth bonus: each additional school past the first at 20+ adds up to 2 pts
        advanced = [s for s in stage_scores if s >= 20]
        breadth_bonus = min(10, max(0, len(advanced) - 1) * 3)
        pipeline_momentum = min(100, best_weight + breadth_bonus)

        athlete["pipeline_momentum"] = pipeline_momentum
        athlete["pipeline_best_stage"] = best_stage
        # Override the old momentum_score with pipeline-based one
        athlete["momentum_score"] = pipeline_momentum

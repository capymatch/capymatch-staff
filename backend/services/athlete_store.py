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
    """Recompute daysSinceActivity from stored lastActivity timestamps."""
    now = datetime.now(timezone.utc)
    for a in athletes:
        try:
            last = datetime.fromisoformat(a["lastActivity"])
            a["daysSinceActivity"] = max(0, (now - last).days)
        except (KeyError, ValueError):
            pass

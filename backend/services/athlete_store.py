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


# Stage weights for pipeline momentum — canonical values from stage_engine
# Sprint 3 SSOT: uses RECRUITING_STATUS_RANK as the basis, scaled to 0-100
STAGE_WEIGHTS = {
    "Not Contacted": 5,
    "Contacted": 20,
    "In Conversation": 40,
    "Campus Visit": 70,
    "Offer": 90,
    "Committed": 100,
    "Archived": 0,
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


async def _fetch_real_events() -> list:
    """Fetch real events from DB. Returns empty list if no events exist."""
    try:
        cursor = db.events.find({}, {"_id": 0})
        events = await cursor.to_list(200)
        now = datetime.now(timezone.utc)
        for e in events:
            # Compute daysAway from event date
            event_date = e.get("date") or e.get("start_date")
            if event_date:
                try:
                    if isinstance(event_date, str):
                        edt = datetime.fromisoformat(event_date.replace("Z", "+00:00"))
                    elif isinstance(event_date, datetime):
                        edt = event_date
                    else:
                        continue
                    if edt.tzinfo is None:
                        edt = edt.replace(tzinfo=timezone.utc)
                    e["daysAway"] = (edt - now).days
                except (ValueError, TypeError):
                    e["daysAway"] = 99
            else:
                e["daysAway"] = 99
            e.setdefault("prepStatus", "not_started")
            e.setdefault("athlete_ids", [])
            e.setdefault("capturedNotes", [])
        return events
    except Exception as exc:
        log.warning("Failed to fetch events from DB: %s — using empty list", exc)
        return []


async def _build_real_momentum_signals(athletes: list) -> list:
    """Build momentum signals from real recent activity in the DB.

    Queries recent interactions and stage changes from the last 48 hours.
    Returns a list of signal dicts matching the shape the frontend expects.
    """
    from datetime import timedelta
    signals = []
    cutoff = datetime.now(timezone.utc) - timedelta(hours=48)
    athlete_map = {a["id"]: a for a in athletes}

    try:
        # Recent interactions
        recent_interactions = await db.interactions.find(
            {"created_at": {"$gte": cutoff.isoformat()}},
            {"_id": 0}
        ).sort("created_at", -1).to_list(20)

        for ix in recent_interactions:
            ath = athlete_map.get(ix.get("athlete_id"))
            name = ath["full_name"] if ath else "An athlete"
            ix_type = ix.get("type", "interaction")
            school = ix.get("university_name", ix.get("school_name", "a school"))
            signals.append({
                "id": ix.get("interaction_id", ix.get("id", "")),
                "type": "interaction",
                "athlete_id": ix.get("athlete_id", ""),
                "athlete_name": name,
                "text": f"{name}: New {ix_type} with {school}",
                "timestamp": ix.get("created_at", cutoff.isoformat()),
                "direction": "positive",
            })

        # Recent stage changes
        recent_stages = await db.program_stage_history.find(
            {"changed_at": {"$gte": cutoff.isoformat()}},
            {"_id": 0}
        ).sort("changed_at", -1).to_list(20)

        for sc in recent_stages:
            ath = athlete_map.get(sc.get("athlete_id"))
            name = ath["full_name"] if ath else "An athlete"
            new_stage = sc.get("new_stage", "next stage")
            school = sc.get("university_name", "a school")
            signals.append({
                "id": sc.get("id", ""),
                "type": "stage_change",
                "athlete_id": sc.get("athlete_id", ""),
                "athlete_name": name,
                "text": f"{name}: Moved to {new_stage} with {school}",
                "timestamp": sc.get("changed_at", cutoff.isoformat()),
                "direction": "positive",
            })

    except Exception as exc:
        log.warning("Failed to build real momentum signals: %s", exc)

    # Sort by timestamp descending, limit to 10
    signals.sort(key=lambda s: s.get("timestamp", ""), reverse=True)
    return signals[:10]


async def _build_real_program_snapshot(athletes: list) -> dict:
    """Build program snapshot from real athlete + program data.

    Computes aggregate counts matching the shape mission_control expects:
    totalAthletes, byStage, byGradYear, needingAttention, positiveMomentum.
    """
    total = len(athletes)

    # Count by grad year
    by_grad_year = {}
    for a in athletes:
        yr = str(a.get("grad_year", "Unknown"))
        by_grad_year[yr] = by_grad_year.get(yr, 0) + 1

    # Count by pipeline stage from athletes' pipeline_best_stage
    by_stage = {}
    for a in athletes:
        stage = a.get("pipeline_best_stage", "unknown")
        by_stage[stage] = by_stage.get(stage, 0) + 1

    # Needing attention: athletes with low momentum or high inactivity
    needing_attention = sum(
        1 for a in athletes
        if a.get("days_since_activity", 0) > 7 or a.get("pipeline_momentum", 1.0) < 0.3
    )

    # Positive momentum: athletes actively progressing
    positive_momentum = sum(
        1 for a in athletes
        if a.get("pipeline_momentum", 0) >= 0.6 and a.get("days_since_activity", 99) <= 7
    )

    # Upcoming events count from real DB
    try:
        now = datetime.now(timezone.utc)
        upcoming_count = await db.events.count_documents({
            "$or": [
                {"date": {"$gte": now.isoformat()}},
                {"start_date": {"$gte": now.isoformat()}}
            ]
        })
    except Exception:
        upcoming_count = 0

    return {
        "totalAthletes": total,
        "byStage": by_stage,
        "byGradYear": by_grad_year,
        "needingAttention": needing_attention,
        "positiveMomentum": positive_momentum,
        "upcomingEvents": upcoming_count,
    }



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

    athletes = await get_all()

    # Fetch real events from DB (no mock data)
    real_events = await _fetch_real_events()

    interventions = []
    for athlete in athletes:
        interventions.extend(detect_all_interventions(athlete, real_events))
    ranked = rank_interventions(interventions)

    derived = {
        "interventions": ranked,
        "priority_alerts": compute_alerts(ranked),
        "needing_attention": compute_needing_attention(ranked),
        "momentum_signals": await _build_real_momentum_signals(athletes),
        "program_snapshot": await _build_real_program_snapshot(athletes),
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
            athlete["pipeline_best_stage"] = "Not Contacted"
            athlete["momentum_score"] = 0
            continue

        from services.stage_engine import normalize_recruiting_status
        stage_scores = []
        best_stage = "Not Contacted"
        best_weight = 0
        for p in progs:
            status = normalize_recruiting_status(p.get("recruiting_status"))
            weight = STAGE_WEIGHTS.get(status, 5)
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

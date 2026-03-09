"""Startup seed/load/recompute logic.

Explicit ordering (dependency chain):
  1. Users (no deps — seed default accounts)
  2. Athletes  (no deps)
  3. Events    (references athlete IDs)
  4. Event Notes (references event IDs)
  5. Recommendations (references athlete + school IDs)
  6. Recompute derived data (interventions, alerts, signals, snapshot)
"""

import logging
from passlib.hash import bcrypt
from database import (
    seed_athletes,
    seed_events,
    seed_event_notes,
    seed_recommendations,
    load_athletes_to_memory,
    load_events_to_memory,
    load_event_notes_to_memory,
    load_recommendations_to_memory,
)

log = logging.getLogger(__name__)

DEFAULT_USERS = [
    {"id": "director-1", "email": "director@capymatch.com", "name": "Clara Adams", "role": "director", "password": "director123"},
    {"id": "coach-williams", "email": "coach.williams@capymatch.com", "name": "Coach Williams", "role": "coach", "password": "coach123"},
    {"id": "coach-garcia", "email": "coach.garcia@capymatch.com", "name": "Coach Garcia", "role": "coach", "password": "coach123"},
]


async def seed_users(db):
    """Seed default user accounts if the collection is empty."""
    count = await db.users.count_documents({})
    if count > 0:
        log.info(f"Users collection already has {count} docs — skipping seed.")
        return
    for u in DEFAULT_USERS:
        doc = {
            "id": u["id"],
            "email": u["email"],
            "name": u["name"],
            "role": u["role"],
            "password_hash": bcrypt.hash(u["password"]),
            "created_at": "2025-01-01T00:00:00+00:00",
        }
        await db.users.insert_one(doc)
    log.info(f"Seeded {len(DEFAULT_USERS)} default users.")


async def assign_coaches_if_needed(db):
    """Assign primary_coach_id to athletes that don't have one yet.

    Splits athletes evenly between the two seed coaches.
    Only runs once — skips athletes that already have an assignment.
    """
    unassigned = await db.athletes.count_documents({
        "$or": [{"primary_coach_id": None}, {"primary_coach_id": {"$exists": False}}]
    })
    if unassigned == 0:
        log.info("All athletes already have coach assignments — skipping.")
        return

    # Get seed coaches
    coaches = await db.users.find(
        {"role": "coach", "id": {"$in": ["coach-williams", "coach-garcia"]}},
        {"_id": 0, "id": 1}
    ).to_list(10)
    if len(coaches) < 2:
        log.warning("Not enough seed coaches to assign — skipping.")
        return

    coach_ids = [c["id"] for c in coaches]
    athletes = await db.athletes.find(
        {"$or": [{"primary_coach_id": None}, {"primary_coach_id": {"$exists": False}}]},
        {"_id": 0, "id": 1}
    ).to_list(500)

    for i, a in enumerate(athletes):
        coach_id = coach_ids[i % len(coach_ids)]
        await db.athletes.update_one(
            {"id": a["id"]},
            {"$set": {"primary_coach_id": coach_id}}
        )

    log.info(f"Assigned {len(athletes)} athletes to {len(coach_ids)} coaches.")


async def run_startup(db):
    """Run the full seed → load → recompute pipeline."""
    import mock_data
    import advocacy_engine
    from decision_engine import (
        detect_all_interventions,
        rank_interventions,
        get_priority_alerts,
        get_athletes_needing_attention,
    )

    # ── Step 0: Seed users if empty ──
    await seed_users(db)

    # ── Step 1: Seed all collections if empty ──
    await seed_athletes(db, mock_data.ATHLETES)
    await seed_events(db, mock_data.UPCOMING_EVENTS)
    await seed_event_notes(db, mock_data.UPCOMING_EVENTS)
    await seed_recommendations(db, advocacy_engine.RECOMMENDATIONS)

    # ── Step 1.5: Assign coaches to athletes if not yet assigned ──
    await assign_coaches_if_needed(db)

    # ── Step 2: Load athletes from DB into athlete_store (canonical source) ──
    from services.athlete_store import recompute_derived_data as recompute_athlete_data

    # ── Step 3: Load events from DB (capturedNotes initialized empty) ──
    loaded_events = await load_events_to_memory(db)
    if loaded_events:
        mock_data.UPCOMING_EVENTS.clear()
        mock_data.UPCOMING_EVENTS.extend(loaded_events)

    # ── Step 4: Load event notes and merge into events ──
    await load_event_notes_to_memory(db, mock_data.UPCOMING_EVENTS)

    # ── Step 5: Load recommendations ──
    loaded_recs = await load_recommendations_to_memory(db)
    if loaded_recs:
        advocacy_engine.RECOMMENDATIONS.clear()
        advocacy_engine.RECOMMENDATIONS.extend(loaded_recs)

    # ── Step 6: Load athletes from DB + recompute all derived data via athlete_store ──
    await recompute_athlete_data()

    # ── Step 7: Seed historical program snapshots for trending ──
    from program_engine import compute_all as compute_program_intelligence
    from services.snapshots import extract_snapshot_metrics, seed_historical_snapshots

    program_data = compute_program_intelligence()
    current_metrics = extract_snapshot_metrics(program_data)
    await seed_historical_snapshots(db, current_metrics)

    # ── Step 8: Refresh ownership cache ──
    from services.ownership import refresh_ownership_cache
    await refresh_ownership_cache()

    from services.athlete_store import get_all, get_interventions
    log.info(
        f"Persistence startup complete: "
        f"{len(get_all())} athletes, "
        f"{len(mock_data.UPCOMING_EVENTS)} events, "
        f"{len(get_interventions())} interventions recomputed"
    )

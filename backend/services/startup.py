"""Startup seed/load/recompute logic.

Explicit ordering (dependency chain):
  1. Athletes  (no deps)
  2. Events    (references athlete IDs)
  3. Event Notes (references event IDs)
  4. Recommendations (references athlete + school IDs)
  5. Recompute derived data (interventions, alerts, signals, snapshot)
"""

import logging
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

    # ── Step 1: Seed all collections if empty ──
    await seed_athletes(db, mock_data.ATHLETES)
    await seed_events(db, mock_data.UPCOMING_EVENTS)
    await seed_event_notes(db, mock_data.UPCOMING_EVENTS)
    await seed_recommendations(db, advocacy_engine.RECOMMENDATIONS)

    # ── Step 2: Load athletes from DB ──
    loaded_athletes = await load_athletes_to_memory(db)
    if loaded_athletes:
        mock_data.ATHLETES.clear()
        mock_data.ATHLETES.extend(loaded_athletes)

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

    # ── Step 6: Recompute all derived data from loaded state ──
    mock_data.ALL_INTERVENTIONS.clear()
    for athlete in mock_data.ATHLETES:
        interventions = detect_all_interventions(athlete, mock_data.UPCOMING_EVENTS)
        mock_data.ALL_INTERVENTIONS.extend(interventions)
    mock_data.ALL_INTERVENTIONS[:] = rank_interventions(mock_data.ALL_INTERVENTIONS)

    mock_data.PRIORITY_ALERTS.clear()
    mock_data.PRIORITY_ALERTS.extend(get_priority_alerts(mock_data.ALL_INTERVENTIONS))

    mock_data.ATHLETES_NEEDING_ATTENTION.clear()
    mock_data.ATHLETES_NEEDING_ATTENTION.extend(
        get_athletes_needing_attention(mock_data.ALL_INTERVENTIONS)
    )

    mock_data.MOMENTUM_SIGNALS.clear()
    mock_data.MOMENTUM_SIGNALS.extend(
        mock_data.generate_momentum_signals(mock_data.ATHLETES)
    )

    mock_data.PROGRAM_SNAPSHOT.clear()
    mock_data.PROGRAM_SNAPSHOT.update(
        mock_data.get_program_snapshot(mock_data.ATHLETES)
    )

    # ── Step 7: Seed historical program snapshots for trending ──
    from program_engine import compute_all as compute_program_intelligence
    from services.snapshots import extract_snapshot_metrics, seed_historical_snapshots

    program_data = compute_program_intelligence()
    current_metrics = extract_snapshot_metrics(program_data)
    await seed_historical_snapshots(db, current_metrics)

    log.info(
        f"Persistence startup complete: "
        f"{len(mock_data.ATHLETES)} athletes, "
        f"{len(mock_data.UPCOMING_EVENTS)} events, "
        f"{len(mock_data.ALL_INTERVENTIONS)} interventions recomputed"
    )

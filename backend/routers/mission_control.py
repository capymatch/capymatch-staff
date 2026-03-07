"""Mission Control — command surface endpoints with ownership filtering."""

from fastapi import APIRouter
from auth_middleware import get_current_user_dep
from services.ownership import filter_by_athlete_id, filter_events_by_ownership, get_visible_athlete_ids, get_unassigned_athlete_ids
from mock_data import (
    PRIORITY_ALERTS,
    MOMENTUM_SIGNALS,
    UPCOMING_EVENTS,
    ATHLETES_NEEDING_ATTENTION,
    PROGRAM_SNAPSHOT,
    ALL_INTERVENTIONS,
    ATHLETES,
    get_program_snapshot,
)
from support_pod import (
    get_athlete as sp_get_athlete,
    get_athlete_interventions,
    explain_pod_health,
)

router = APIRouter()


def enrich_with_health(interventions_list):
    enriched = []
    for item in interventions_list:
        item_copy = {**item}
        athlete = sp_get_athlete(item["athlete_id"])
        if athlete:
            athlete_interventions = get_athlete_interventions(item["athlete_id"])
            item_copy["pod_health"] = explain_pod_health(athlete, athlete_interventions)
        enriched.append(item_copy)
    return enriched


@router.get("/mission-control")
async def get_mission_control_data(current_user: dict = get_current_user_dep()):
    """Get all Mission Control data, filtered by ownership."""
    alerts = filter_by_athlete_id(PRIORITY_ALERTS, current_user)
    attention = filter_by_athlete_id(ATHLETES_NEEDING_ATTENTION, current_user)
    signals = filter_by_athlete_id(MOMENTUM_SIGNALS, current_user)
    events = filter_events_by_ownership(UPCOMING_EVENTS, current_user)

    # Compute snapshot for coach's athletes or full program
    if current_user["role"] == "director":
        snapshot = PROGRAM_SNAPSHOT
        # Add unassigned count for director awareness
        unassigned_ids = get_unassigned_athlete_ids()
        snapshot = {**snapshot, "unassigned_count": len(unassigned_ids)}
    else:
        visible = get_visible_athlete_ids(current_user)
        my_athletes = [a for a in ATHLETES if a["id"] in visible]
        snapshot = get_program_snapshot(my_athletes)

    return {
        "priorityAlerts": enrich_with_health(alerts),
        "recentChanges": signals,
        "athletesNeedingAttention": enrich_with_health(attention),
        "upcomingEvents": events,
        "programSnapshot": snapshot,
        "_debug": {
            "total_interventions_detected": len(ALL_INTERVENTIONS),
            "priority_alerts_count": len(alerts),
            "athletes_attention_count": len(attention),
            "decision_engine_version": "v1.0"
        }
    }


@router.get("/mission-control/alerts")
async def get_priority_alerts_endpoint(current_user: dict = get_current_user_dep()):
    return filter_by_athlete_id(PRIORITY_ALERTS, current_user)


@router.get("/mission-control/signals")
async def get_momentum_signals(current_user: dict = get_current_user_dep()):
    return filter_by_athlete_id(MOMENTUM_SIGNALS, current_user)


@router.get("/mission-control/athletes")
async def get_athletes_attention(current_user: dict = get_current_user_dep()):
    return filter_by_athlete_id(ATHLETES_NEEDING_ATTENTION, current_user)


@router.get("/mission-control/events")
async def get_upcoming_events(current_user: dict = get_current_user_dep()):
    return filter_events_by_ownership(UPCOMING_EVENTS, current_user)


@router.get("/mission-control/snapshot")
async def get_program_snapshot_endpoint(current_user: dict = get_current_user_dep()):
    if current_user["role"] == "director":
        return PROGRAM_SNAPSHOT
    visible = get_visible_athlete_ids(current_user)
    my_athletes = [a for a in ATHLETES if a["id"] in visible]
    return get_program_snapshot(my_athletes)

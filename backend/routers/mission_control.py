"""Mission Control — command surface endpoints."""

from fastapi import APIRouter
from auth_middleware import get_current_user_dep
from mock_data import (
    PRIORITY_ALERTS,
    MOMENTUM_SIGNALS,
    UPCOMING_EVENTS,
    ATHLETES_NEEDING_ATTENTION,
    PROGRAM_SNAPSHOT,
    ALL_INTERVENTIONS,
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
    """Get all Mission Control data with Decision Engine explainability"""
    return {
        "priorityAlerts": enrich_with_health(PRIORITY_ALERTS),
        "recentChanges": MOMENTUM_SIGNALS,
        "athletesNeedingAttention": enrich_with_health(ATHLETES_NEEDING_ATTENTION),
        "upcomingEvents": UPCOMING_EVENTS,
        "programSnapshot": PROGRAM_SNAPSHOT,
        "_debug": {
            "total_interventions_detected": len(ALL_INTERVENTIONS),
            "priority_alerts_count": len(PRIORITY_ALERTS),
            "athletes_attention_count": len(ATHLETES_NEEDING_ATTENTION),
            "decision_engine_version": "v1.0"
        }
    }


@router.get("/mission-control/alerts")
async def get_priority_alerts_endpoint(current_user: dict = get_current_user_dep()):
    return PRIORITY_ALERTS


@router.get("/mission-control/signals")
async def get_momentum_signals(current_user: dict = get_current_user_dep()):
    return MOMENTUM_SIGNALS


@router.get("/mission-control/athletes")
async def get_athletes_attention(current_user: dict = get_current_user_dep()):
    return ATHLETES_NEEDING_ATTENTION


@router.get("/mission-control/events")
async def get_upcoming_events(current_user: dict = get_current_user_dep()):
    return UPCOMING_EVENTS


@router.get("/mission-control/snapshot")
async def get_program_snapshot(current_user: dict = get_current_user_dep()):
    return PROGRAM_SNAPSHOT

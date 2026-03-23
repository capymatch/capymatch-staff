"""Debug — Decision Engine inspection endpoints (director-only)."""

from fastapi import APIRouter, HTTPException
from auth_middleware import get_current_user_dep
from services.athlete_store import get_interventions

router = APIRouter()


@router.get("/debug/interventions")
async def get_all_interventions(current_user: dict = get_current_user_dep()):
    """DEBUG: Get all detected interventions with scoring details"""
    if current_user["role"] != "director":
        raise HTTPException(status_code=403, detail="Director access only")
    return {
        "total_interventions": len(await get_interventions()),
        "by_category": {
            "momentum_drop": len([i for i in await get_interventions() if i['category'] == 'momentum_drop']),
            "blocker": len([i for i in await get_interventions() if i['category'] == 'blocker']),
            "deadline_proximity": len([i for i in await get_interventions() if i['category'] == 'deadline_proximity']),
            "engagement_drop": len([i for i in await get_interventions() if i['category'] == 'engagement_drop']),
            "ownership_gap": len([i for i in await get_interventions() if i['category'] == 'ownership_gap']),
            "readiness_issue": len([i for i in await get_interventions() if i['category'] == 'readiness_issue']),
            "event_follow_up": len([i for i in await get_interventions() if i['category'] == 'event_follow_up']),
        },
        "by_tier": {
            "critical": len([i for i in await get_interventions() if i['priority_tier'] == 'critical']),
            "high": len([i for i in await get_interventions() if i['priority_tier'] == 'high']),
            "medium": len([i for i in await get_interventions() if i['priority_tier'] == 'medium']),
            "low": len([i for i in await get_interventions() if i['priority_tier'] == 'low']),
        },
        "interventions": await get_interventions(),
    }


@router.get("/debug/interventions/{athlete_id}")
async def debug_athlete_interventions(athlete_id: str, current_user: dict = get_current_user_dep()):
    """DEBUG: Get all interventions for a specific athlete"""
    athlete_interventions = [i for i in await get_interventions() if i['athlete_id'] == athlete_id]

    if not athlete_interventions:
        return {
            "athlete_id": athlete_id,
            "message": "No interventions detected for this athlete",
            "interventions": []
        }

    return {
        "athlete_id": athlete_id,
        "athlete_name": athlete_interventions[0]['athlete_name'],
        "total_interventions": len(athlete_interventions),
        "highest_score": max([i['score'] for i in athlete_interventions]),
        "interventions": athlete_interventions
    }


@router.get("/debug/scoring/{intervention_id}")
async def get_intervention_scoring(intervention_id: str, current_user: dict = get_current_user_dep()):
    """DEBUG: Get detailed scoring breakdown for a specific intervention"""
    for intervention in await get_interventions():
        pseudo_id = f"{intervention['athlete_id']}_{intervention['category']}"
        if pseudo_id == intervention_id:
            return {
                "intervention": intervention,
                "scoring_breakdown": {
                    "urgency": {
                        "score": intervention['urgency'],
                        "weight": 40,
                        "contribution": intervention['urgency'] * 40
                    },
                    "impact": {
                        "score": intervention['impact'],
                        "weight": 30,
                        "contribution": intervention['impact'] * 30
                    },
                    "actionability": {
                        "score": intervention['actionability'],
                        "weight": 20,
                        "contribution": intervention['actionability'] * 20
                    },
                    "ownership": {
                        "score": intervention['ownership'],
                        "weight": 10,
                        "contribution": intervention['ownership'] * 10
                    }
                },
                "formula": "(urgency * 40) + (impact * 30) + (actionability * 20) + (ownership * 10) / 10",
                "total_score": intervention['score']
            }

    return {"error": "Intervention not found"}

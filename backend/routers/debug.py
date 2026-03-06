"""Debug — Decision Engine inspection endpoints."""

from fastapi import APIRouter
from mock_data import ALL_INTERVENTIONS

router = APIRouter()


@router.get("/debug/interventions")
async def get_all_interventions():
    """DEBUG: Get all detected interventions with scoring details"""
    return {
        "total_interventions": len(ALL_INTERVENTIONS),
        "by_category": {
            "momentum_drop": len([i for i in ALL_INTERVENTIONS if i['category'] == 'momentum_drop']),
            "blocker": len([i for i in ALL_INTERVENTIONS if i['category'] == 'blocker']),
            "deadline_proximity": len([i for i in ALL_INTERVENTIONS if i['category'] == 'deadline_proximity']),
            "engagement_drop": len([i for i in ALL_INTERVENTIONS if i['category'] == 'engagement_drop']),
            "ownership_gap": len([i for i in ALL_INTERVENTIONS if i['category'] == 'ownership_gap']),
            "readiness_issue": len([i for i in ALL_INTERVENTIONS if i['category'] == 'readiness_issue']),
            "event_follow_up": len([i for i in ALL_INTERVENTIONS if i['category'] == 'event_follow_up']),
        },
        "by_tier": {
            "critical": len([i for i in ALL_INTERVENTIONS if i['priority_tier'] == 'critical']),
            "high": len([i for i in ALL_INTERVENTIONS if i['priority_tier'] == 'high']),
            "medium": len([i for i in ALL_INTERVENTIONS if i['priority_tier'] == 'medium']),
            "low": len([i for i in ALL_INTERVENTIONS if i['priority_tier'] == 'low']),
        },
        "interventions": ALL_INTERVENTIONS,
    }


@router.get("/debug/interventions/{athlete_id}")
async def debug_athlete_interventions(athlete_id: str):
    """DEBUG: Get all interventions for a specific athlete"""
    athlete_interventions = [i for i in ALL_INTERVENTIONS if i['athlete_id'] == athlete_id]

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
async def get_intervention_scoring(intervention_id: str):
    """DEBUG: Get detailed scoring breakdown for a specific intervention"""
    for intervention in ALL_INTERVENTIONS:
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

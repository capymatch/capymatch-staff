"""Advocacy Mode — recommendations, relationships, response tracking."""

from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone, timedelta
import uuid
from db_client import db
from auth_middleware import get_current_user_dep
from services.ownership import filter_by_athlete_id, get_visible_athlete_ids
from models import RecommendationCreate, RecommendationUpdate, ResponseLog, CloseRequest
from advocacy_engine import (
    list_recommendations,
    create_recommendation,
    update_recommendation,
    send_recommendation,
    log_response,
    mark_follow_up,
    close_recommendation,
    get_school_relationship,
    get_all_relationships,
    get_event_context,
)

router = APIRouter()


@router.get("/advocacy/recommendations")
async def list_all_recommendations(status: str = None, athlete: str = None, school: str = None, grad_year: str = None, current_user: dict = get_current_user_dep()):
    all_recs = list_recommendations(status_filter=status, athlete_filter=athlete, school_filter=school, grad_year_filter=grad_year)
    return filter_by_athlete_id(all_recs, current_user)


@router.get("/advocacy/context/{athlete_id}/{school_id}")
async def get_advocacy_context(athlete_id: str, school_id: str, current_user: dict = get_current_user_dep()):
    return get_event_context(athlete_id, school_id)


@router.get("/advocacy/context/{athlete_id}")
async def get_advocacy_context_athlete(athlete_id: str, current_user: dict = get_current_user_dep()):
    return get_event_context(athlete_id)


@router.get("/advocacy/relationships")
async def list_all_relationships_endpoint(current_user: dict = get_current_user_dep()):
    all_rels = get_all_relationships()
    if current_user["role"] == "director":
        return all_rels
    # Filter relationships to those involving coach's athletes
    visible = get_visible_athlete_ids(current_user)
    filtered = []
    for rel in all_rels:
        rec_athlete_ids = {r.get("athlete_id") for r in rel.get("recommendations", [])}
        if rec_athlete_ids & visible:
            filtered.append(rel)
    return filtered


@router.get("/advocacy/relationships/{school_id}")
async def get_relationship(school_id: str, current_user: dict = get_current_user_dep()):
    result = get_school_relationship(school_id)
    if not result:
        return {"error": "School not found"}
    return result


@router.post("/advocacy/recommendations")
async def create_new_recommendation(body: RecommendationCreate, current_user: dict = get_current_user_dep()):
    rec = create_recommendation(body.model_dump())

    # Persist to MongoDB
    await db.recommendations.insert_one({**rec})

    return rec


@router.get("/advocacy/recommendations/{rec_id}")
async def get_rec_detail(rec_id: str, current_user: dict = get_current_user_dep()):
    rec = await db.recommendations.find_one({"id": rec_id}, {"_id": 0})
    if not rec:
        return {"error": "Recommendation not found"}
    if rec.get("school_id"):
        rel = get_school_relationship(rec["school_id"])
        rec["relationship_summary"] = rel["summary"] if rel else None
    return rec


@router.patch("/advocacy/recommendations/{rec_id}")
async def update_rec(rec_id: str, body: RecommendationUpdate, current_user: dict = get_current_user_dep()):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    result = update_recommendation(rec_id, updates)
    if not result:
        return {"error": "Recommendation not found"}

    await db.recommendations.replace_one(
        {"id": rec_id},
        {k: v for k, v in result.items() if k != "_id"}
    )

    return result


@router.post("/advocacy/recommendations/{rec_id}/send")
async def send_rec(rec_id: str, current_user: dict = get_current_user_dep()):
    rec = send_recommendation(rec_id)
    if not rec:
        return {"error": "Cannot send — not a draft or not found"}

    await db.recommendations.replace_one(
        {"id": rec_id},
        {k: v for k, v in rec.items() if k != "_id"}
    )

    await db.athlete_notes.insert_one({
        "id": str(uuid.uuid4()),
        "athlete_id": rec["athlete_id"],
        "author": current_user["name"],
        "text": f"Recommendation sent to {rec['school_name']}: {rec.get('fit_summary', '')}",
        "tag": "advocacy_sent",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return rec


@router.post("/advocacy/recommendations/{rec_id}/respond")
async def respond_to_rec(rec_id: str, body: ResponseLog, current_user: dict = get_current_user_dep()):
    rec = log_response(rec_id, body.response_note, body.response_type)
    if not rec:
        return {"error": "Cannot log response"}

    await db.recommendations.replace_one(
        {"id": rec_id},
        {k: v for k, v in rec.items() if k != "_id"}
    )

    tag = "advocacy_response" if body.response_type == "warm" else "advocacy_closed"
    await db.athlete_notes.insert_one({
        "id": str(uuid.uuid4()),
        "athlete_id": rec["athlete_id"],
        "author": current_user["name"],
        "text": f"{rec['school_name']} response: {body.response_note}",
        "tag": tag,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    if body.response_type == "warm":
        await db.pod_actions.insert_one({
            "id": str(uuid.uuid4()),
            "athlete_id": rec["athlete_id"],
            "title": f"Follow up on {rec['school_name']} warm response",
            "owner": current_user["name"],
            "status": "ready",
            "due_date": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
            "source": "advocacy",
            "source_category": "advocacy_response",
            "created_by": current_user["name"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_suggested": False,
            "completed_at": None,
        })

    return rec


@router.post("/advocacy/recommendations/{rec_id}/follow-up")
async def follow_up_rec(rec_id: str, current_user: dict = get_current_user_dep()):
    rec = mark_follow_up(rec_id)
    if not rec:
        return {"error": "Cannot follow up"}

    await db.recommendations.replace_one(
        {"id": rec_id},
        {k: v for k, v in rec.items() if k != "_id"}
    )

    return rec


@router.post("/advocacy/recommendations/{rec_id}/close")
async def close_rec(rec_id: str, body: CloseRequest, current_user: dict = get_current_user_dep()):
    rec = close_recommendation(rec_id, body.reason)
    if not rec:
        return {"error": "Cannot close"}

    await db.recommendations.replace_one(
        {"id": rec_id},
        {k: v for k, v in rec.items() if k != "_id"}
    )

    await db.athlete_notes.insert_one({
        "id": str(uuid.uuid4()),
        "athlete_id": rec["athlete_id"],
        "author": current_user["name"],
        "text": f"Recommendation to {rec['school_name']} closed ({body.reason.replace('_', ' ')})",
        "tag": "advocacy_closed",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return rec

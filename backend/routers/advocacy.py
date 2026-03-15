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


@router.get("/advocacy/athlete-context/{athlete_id}/{school_id}")
async def get_athlete_recruiting_context(athlete_id: str, school_id: str, current_user: dict = get_current_user_dep()):
    """Get rich athlete context for the recommendation builder."""
    from services.athlete_store import get_all as get_athletes_list

    athlete = next((a for a in get_athletes_list() if a["id"] == athlete_id), None)
    if not athlete:
        raise HTTPException(404, "Athlete not found")

    # Get pipeline status for this school
    pipeline_status = None
    last_contact = None
    program = await db.programs.find_one(
        {"athlete_id": athlete_id, "university_id": school_id},
        {"_id": 0, "recruiting_status": 1, "last_contact_date": 1, "reply_status": 1, "university_name": 1}
    )
    if not program:
        program = await db.programs.find_one(
            {"athlete_id": athlete_id, "program_id": school_id},
            {"_id": 0, "recruiting_status": 1, "last_contact_date": 1, "reply_status": 1, "university_name": 1}
        )
    if not program:
        # Try lookup by university name (from SchoolPod)
        from urllib.parse import unquote
        decoded_name = unquote(school_id)
        program = await db.programs.find_one(
            {"athlete_id": athlete_id, "university_name": {"$regex": f"^{decoded_name}$", "$options": "i"}},
            {"_id": 0, "recruiting_status": 1, "last_contact_date": 1, "reply_status": 1, "university_name": 1}
        )
    if program:
        pipeline_status = program.get("recruiting_status", "unknown")
        last_contact = program.get("last_contact_date")

    # Get event context
    event_ctx = get_event_context(athlete_id, school_id)

    # Get highlight video from athlete profile
    athlete_doc = await db.athletes.find_one({"id": athlete_id}, {"_id": 0, "highlight_video": 1, "profile_url": 1, "video_links": 1})

    # Get previous advocacy (relationship context)
    from advocacy_engine import list_recommendations
    prev_advocacy = []
    try:
        all_recs = list_recommendations()
        for status_key, recs in all_recs.items():
            if isinstance(recs, list):
                for r in recs:
                    if r.get("athlete_id") == athlete_id and (
                        r.get("school_id") == school_id or r.get("school_name", "").lower() == school_id.lower()
                    ):
                        prev_advocacy.append({
                            "id": r.get("id"),
                            "status": r.get("status"),
                            "created_at": r.get("created_at"),
                            "school_name": r.get("school_name"),
                            "fit_summary": r.get("fit_summary", ""),
                        })
    except Exception:
        pass

    return {
        "athlete": {
            "id": athlete["id"],
            "name": athlete.get("full_name", ""),
            "grad_year": athlete.get("grad_year"),
            "position": athlete.get("position", ""),
            "team": athlete.get("team", ""),
            "photo_url": athlete.get("photo_url", ""),
            "momentum_score": athlete.get("momentum_score", 0),
            "momentum_trend": athlete.get("momentum_trend", "stable"),
            "recruiting_stage": athlete.get("recruiting_stage", "exploring"),
            "school_targets": athlete.get("school_targets", 0),
        },
        "pipeline_status": pipeline_status,
        "last_contact": last_contact,
        "event_notes": event_ctx.get("event_notes", []),
        "highlight_video": (athlete_doc or {}).get("highlight_video", ""),
        "profile_url": (athlete_doc or {}).get("profile_url", ""),
        "video_links": (athlete_doc or {}).get("video_links", []),
        "previous_advocacy": prev_advocacy,
    }


@router.get("/advocacy/recommendations")
async def list_all_recommendations(status: str = None, athlete: str = None, school: str = None, grad_year: str = None, current_user: dict = get_current_user_dep()):
    result = list_recommendations(status_filter=status, athlete_filter=athlete, school_filter=school, grad_year_filter=grad_year)
    if current_user["role"] == "director":
        return result
    # Filter each list inside the dict
    return {
        key: filter_by_athlete_id(val, current_user) if isinstance(val, list) else val
        for key, val in result.items()
    }


@router.get("/advocacy/athletes")
async def list_advocacy_athletes(q: str = "", current_user: dict = get_current_user_dep()):
    """Search athletes for the recommendation builder autocomplete."""
    from services.athlete_store import get_all as get_athletes_list
    athletes = get_athletes_list()

    if q and len(q) >= 2:
        q_lower = q.lower()
        athletes = [a for a in athletes if q_lower in a.get("full_name", "").lower()]

    visible = get_visible_athlete_ids(current_user)
    if current_user["role"] != "director":
        athletes = [a for a in athletes if a["id"] in visible]

    return [
        {
            "id": a["id"],
            "name": a.get("full_name", "Unknown"),
            "grad_year": a.get("grad_year"),
            "position": a.get("position", ""),
            "team": a.get("team", ""),
            "photo_url": a.get("photo_url", ""),
        }
        for a in athletes[:20]
    ]


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

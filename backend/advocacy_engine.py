"""
Advocacy Engine — Recommendation management, relationship memory, and routing

Handles recommendation CRUD, status transitions, school relationship aggregation,
and event context lookups for the Recommendation Builder.
"""

from datetime import datetime, timezone, timedelta
import uuid
from services.athlete_store import get_all as get_athletes
from mock_data import UPCOMING_EVENTS, SCHOOLS


# ============================================================================
# IN-MEMORY STORE
# ============================================================================

def _seed_recommendations():
    """Seed realistic recommendations in various states"""
    now = datetime.now(timezone.utc)
    return [
        {
            "id": "rec_1",
            "athlete_id": "athlete_3", "athlete_name": "Marcus Johnson",
            "school_id": "michigan", "school_name": "Michigan",
            "college_coach_name": "Coach Thompson",
            "status": "warm_response",
            "fit_reasons": ["athletic_ability", "program_need_match"],
            "fit_note": "Elite GK reflexes, exactly the profile Michigan needs for their 2026 class",
            "fit_summary": "GK talent, spring camp candidate",
            "supporting_event_notes": ["past_note_3"],
            "intro_message": "Coach Thompson, I wanted to personally recommend Marcus Johnson from our U18 program. His shot-stopping ability is among the best I've coached, and after seeing your staff's interest at Winter Showcase, I believe he'd be an excellent fit for Michigan's system.",
            "desired_next_step": "review_film",
            "created_by": "Coach Martinez",
            "created_at": (now - timedelta(days=8)).isoformat(),
            "sent_at": (now - timedelta(days=6)).isoformat(),
            "response_status": "warm",
            "response_note": "Michigan coach wants to see spring tape. Very interested in his distribution from the back.",
            "response_at": (now - timedelta(days=2)).isoformat(),
            "follow_up_count": 0,
            "last_follow_up_at": None,
            "closed_at": None,
            "closed_reason": None,
            "response_history": [
                {"type": "sent", "date": (now - timedelta(days=6)).isoformat(), "text": "Recommendation sent to Michigan"},
                {"type": "response", "date": (now - timedelta(days=2)).isoformat(), "text": "Michigan coach wants spring tape"},
            ],
        },
        {
            "id": "rec_2",
            "athlete_id": "athlete_2", "athlete_name": "Olivia Anderson",
            "school_id": "stanford", "school_name": "Stanford",
            "college_coach_name": "Coach Williams",
            "status": "awaiting_reply",
            "fit_reasons": ["athletic_ability", "academic_fit", "character_leadership"],
            "fit_note": "Olivia combines elite defensive instincts with 4.0 GPA — perfect Stanford fit",
            "fit_summary": "Academic + athletic fit, strong character",
            "supporting_event_notes": ["past_note_1"],
            "intro_message": "Coach Williams, after your staff showed strong interest in Olivia at Winter Showcase, I wanted to follow up with a personal recommendation. Her combination of elite defensive positioning and academic excellence is rare at this level.",
            "desired_next_step": "schedule_call",
            "created_by": "Coach Martinez",
            "created_at": (now - timedelta(days=6)).isoformat(),
            "sent_at": (now - timedelta(days=5)).isoformat(),
            "response_status": None,
            "response_note": None,
            "response_at": None,
            "follow_up_count": 1,
            "last_follow_up_at": (now - timedelta(days=2)).isoformat(),
            "closed_at": None,
            "closed_reason": None,
            "response_history": [
                {"type": "sent", "date": (now - timedelta(days=5)).isoformat(), "text": "Recommendation sent to Stanford"},
                {"type": "follow_up", "date": (now - timedelta(days=2)).isoformat(), "text": "No response after 3 days — follow-up sent"},
            ],
        },
        {
            "id": "rec_3",
            "athlete_id": "athlete_5", "athlete_name": "Lucas Rodriguez",
            "school_id": "virginia", "school_name": "Virginia",
            "college_coach_name": "Coach Davis",
            "status": "sent",
            "fit_reasons": ["tactical_awareness", "coachability"],
            "fit_note": "Lucas reads the game at a level beyond his age. Virginia's possession system would suit him perfectly.",
            "fit_summary": "Game intelligence, possession system fit",
            "supporting_event_notes": ["past_note_2"],
            "intro_message": "Coach Davis, your assistant mentioned interest in Lucas at Winter Showcase. I can vouch for his tactical intelligence — he processes the game faster than most players I've coached.",
            "desired_next_step": "evaluate_at_event",
            "created_by": "Coach Martinez",
            "created_at": (now - timedelta(days=2)).isoformat(),
            "sent_at": (now - timedelta(days=1)).isoformat(),
            "response_status": None,
            "response_note": None,
            "response_at": None,
            "follow_up_count": 0,
            "last_follow_up_at": None,
            "closed_at": None,
            "closed_reason": None,
            "response_history": [
                {"type": "sent", "date": (now - timedelta(days=1)).isoformat(), "text": "Recommendation sent to Virginia"},
            ],
        },
        {
            "id": "rec_4",
            "athlete_id": "athlete_2", "athlete_name": "Olivia Anderson",
            "school_id": "ucla", "school_name": "UCLA",
            "college_coach_name": "",
            "status": "draft",
            "fit_reasons": ["athletic_ability"],
            "fit_note": "",
            "fit_summary": "Athletic ability (draft in progress)",
            "supporting_event_notes": [],
            "intro_message": "",
            "desired_next_step": "review_film",
            "created_by": "Coach Martinez",
            "created_at": (now - timedelta(days=1)).isoformat(),
            "sent_at": None,
            "response_status": None,
            "response_note": None,
            "response_at": None,
            "follow_up_count": 0,
            "last_follow_up_at": None,
            "closed_at": None,
            "closed_reason": None,
            "response_history": [],
        },
        {
            "id": "rec_5",
            "athlete_id": "athlete_12", "athlete_name": "Ethan Brown",
            "school_id": "georgetown", "school_name": "Georgetown",
            "college_coach_name": "Coach Martin",
            "status": "closed",
            "fit_reasons": ["athletic_ability", "character_leadership"],
            "fit_note": "Ethan is a natural leader — he organizes the backline vocally in ways most college seniors can't.",
            "fit_summary": "Leadership, organizational skills",
            "supporting_event_notes": [],
            "intro_message": "Coach Martin, I wanted to introduce Ethan Brown, a 2026 center-back in our program. His leadership on the field is exceptional.",
            "desired_next_step": "attend_camp",
            "created_by": "Coach Martinez",
            "created_at": (now - timedelta(days=14)).isoformat(),
            "sent_at": (now - timedelta(days=13)).isoformat(),
            "response_status": "warm",
            "response_note": "Georgetown invited Ethan to spring camp",
            "response_at": (now - timedelta(days=10)).isoformat(),
            "follow_up_count": 0,
            "last_follow_up_at": None,
            "closed_at": (now - timedelta(days=7)).isoformat(),
            "closed_reason": "positive_outcome",
            "response_history": [
                {"type": "sent", "date": (now - timedelta(days=13)).isoformat(), "text": "Recommendation sent to Georgetown"},
                {"type": "response", "date": (now - timedelta(days=10)).isoformat(), "text": "Georgetown invited Ethan to spring camp"},
                {"type": "closed", "date": (now - timedelta(days=7)).isoformat(), "text": "Closed — positive outcome (camp invite)"},
            ],
        },
    ]


RECOMMENDATIONS = _seed_recommendations()


# ============================================================================
# RECOMMENDATION CRUD
# ============================================================================

def get_recommendation(rec_id):
    return next((r for r in RECOMMENDATIONS if r["id"] == rec_id), None)


def list_recommendations(status_filter=None, athlete_filter=None, school_filter=None, grad_year_filter=None):
    """Return recommendations grouped by priority status"""
    recs = list(RECOMMENDATIONS)

    if status_filter and status_filter != "all":
        if status_filter == "responded":
            recs = [r for r in recs if r["status"] in ("warm_response", "follow_up_needed")]
        else:
            recs = [r for r in recs if r["status"] == status_filter]

    if athlete_filter:
        recs = [r for r in recs if r["athlete_id"] == athlete_filter]

    if school_filter:
        recs = [r for r in recs if r["school_id"] == school_filter]

    if grad_year_filter:
        for r in recs:
            athlete = next((a for a in get_athletes() if a["id"] == r["athlete_id"]), None)
            if athlete:
                r["_grad_year"] = athlete.get("grad_year")
        recs = [r for r in recs if r.get("_grad_year") == int(grad_year_filter)]

    now = datetime.now(timezone.utc)
    needs_attention = []
    drafts = []
    recently_sent = []
    closed = []

    for r in recs:
        if r["status"] == "draft":
            drafts.append(r)
        elif r["status"] == "closed":
            closed.append(r)
        elif r["status"] in ("warm_response", "follow_up_needed"):
            needs_attention.append(r)
        elif r["status"] == "awaiting_reply":
            sent_at = datetime.fromisoformat(r["sent_at"]) if r.get("sent_at") else now
            days_since = (now - sent_at).days
            if days_since >= 3:
                needs_attention.append(r)
            else:
                recently_sent.append(r)
        elif r["status"] == "sent":
            recently_sent.append(r)
        else:
            recently_sent.append(r)

    stats = {
        "total": len(RECOMMENDATIONS),
        "drafts": sum(1 for r in RECOMMENDATIONS if r["status"] == "draft"),
        "sent": sum(1 for r in RECOMMENDATIONS if r["status"] == "sent"),
        "awaiting": sum(1 for r in RECOMMENDATIONS if r["status"] == "awaiting_reply"),
        "warm": sum(1 for r in RECOMMENDATIONS if r["status"] in ("warm_response", "follow_up_needed")),
        "closed": sum(1 for r in RECOMMENDATIONS if r["status"] == "closed"),
    }

    # Enrich with athlete photos
    all_athletes = get_athletes()
    def enrich(items):
        for r in items:
            ath = next((a for a in all_athletes if a["id"] == r.get("athlete_id")), None)
            if ath:
                r["photo_url"] = ath.get("photo_url", "")
        return items

    return {
        "needs_attention": enrich(needs_attention),
        "drafts": enrich(drafts),
        "recently_sent": enrich(recently_sent),
        "closed": enrich(closed),
        "stats": stats,
    }


def create_recommendation(data):
    """Create a new recommendation (draft)"""
    athlete = next((a for a in get_athletes() if a["id"] == data["athlete_id"]), None)
    school = next((s for s in SCHOOLS if s["id"] == data.get("school_id")), None)

    rec = {
        "id": f"rec_{str(uuid.uuid4())[:8]}",
        "athlete_id": data["athlete_id"],
        "athlete_name": athlete["full_name"] if athlete else "Unknown",
        "school_id": data.get("school_id", ""),
        "school_name": school["name"] if school else data.get("school_name", ""),
        "college_coach_name": data.get("college_coach_name", ""),
        "status": "draft",
        "fit_reasons": data.get("fit_reasons", []),
        "fit_note": data.get("fit_note", ""),
        "fit_summary": ", ".join(data.get("fit_reasons", []))[:60] if data.get("fit_reasons") else "",
        "supporting_event_notes": data.get("supporting_event_notes", []),
        "intro_message": data.get("intro_message", ""),
        "desired_next_step": data.get("desired_next_step", ""),
        "attachments": data.get("attachments", []),
        "created_by": "Coach Martinez",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "sent_at": None,
        "response_status": None,
        "response_note": None,
        "response_at": None,
        "follow_up_count": 0,
        "last_follow_up_at": None,
        "closed_at": None,
        "closed_reason": None,
        "response_history": [],
    }

    RECOMMENDATIONS.append(rec)
    return rec


def update_recommendation(rec_id, updates):
    """Update draft recommendation fields"""
    rec = get_recommendation(rec_id)
    if not rec:
        return None

    editable = ("college_coach_name", "fit_reasons", "fit_note", "supporting_event_notes",
                "intro_message", "desired_next_step", "school_id", "school_name", "athlete_id", "attachments")
    for key in editable:
        if key in updates:
            rec[key] = updates[key]

    if "fit_reasons" in updates:
        reasons_map = {
            "athletic_ability": "Athletic ability",
            "tactical_awareness": "Tactical awareness",
            "academic_fit": "Academic fit",
            "character_leadership": "Character/leadership",
            "coachability": "Coachability",
            "program_need_match": "Program need match",
        }
        rec["fit_summary"] = ", ".join(reasons_map.get(r, r) for r in updates["fit_reasons"])[:80]

    if "athlete_id" in updates:
        athlete = next((a for a in get_athletes() if a["id"] == updates["athlete_id"]), None)
        if athlete:
            rec["athlete_name"] = athlete["full_name"]

    return rec


def send_recommendation(rec_id):
    """Transition recommendation from draft to sent"""
    rec = get_recommendation(rec_id)
    if not rec or rec["status"] != "draft":
        return None

    now = datetime.now(timezone.utc).isoformat()
    rec["status"] = "sent"
    rec["sent_at"] = now
    rec["response_history"].append({
        "type": "sent",
        "date": now,
        "text": f"Recommendation sent to {rec['school_name']}",
    })

    return rec


def log_response(rec_id, response_note, response_type="warm"):
    """Log a response to a recommendation"""
    rec = get_recommendation(rec_id)
    if not rec or rec["status"] not in ("sent", "awaiting_reply", "follow_up_needed"):
        return None

    now = datetime.now(timezone.utc).isoformat()
    rec["status"] = "warm_response" if response_type == "warm" else "closed"
    rec["response_status"] = response_type
    rec["response_note"] = response_note
    rec["response_at"] = now
    rec["response_history"].append({
        "type": "response",
        "date": now,
        "text": response_note,
    })

    if response_type != "warm":
        rec["closed_at"] = now
        rec["closed_reason"] = response_type

    return rec


def mark_follow_up(rec_id):
    """Mark a recommendation as needing follow-up"""
    rec = get_recommendation(rec_id)
    if not rec or rec["status"] in ("draft", "closed"):
        return None

    now = datetime.now(timezone.utc).isoformat()
    rec["status"] = "follow_up_needed"
    rec["follow_up_count"] = rec.get("follow_up_count", 0) + 1
    rec["last_follow_up_at"] = now
    rec["response_history"].append({
        "type": "follow_up",
        "date": now,
        "text": f"Follow-up #{rec['follow_up_count']} — no response yet",
    })

    return rec


def close_recommendation(rec_id, reason="no_response"):
    """Close a recommendation"""
    rec = get_recommendation(rec_id)
    if not rec or rec["status"] == "closed":
        return None

    now = datetime.now(timezone.utc).isoformat()
    reason_labels = {
        "positive_outcome": "Closed — positive outcome",
        "no_response": "Closed — no response",
        "declined": "Closed — declined",
    }
    rec["status"] = "closed"
    rec["closed_at"] = now
    rec["closed_reason"] = reason
    rec["response_history"].append({
        "type": "closed",
        "date": now,
        "text": reason_labels.get(reason, f"Closed — {reason}"),
    })

    return rec


# ============================================================================
# RELATIONSHIP MEMORY
# ============================================================================

def get_school_relationship(school_id):
    """Aggregate all interactions and recommendations for a school"""
    school = next((s for s in SCHOOLS if s["id"] == school_id), None)
    if not school:
        return None

    # Gather recommendations for this school
    school_recs = [r for r in RECOMMENDATIONS if r["school_id"] == school_id]

    # Gather event notes for this school across all events
    event_notes = []
    for event in UPCOMING_EVENTS:
        for note in event.get("capturedNotes", []):
            if note.get("school_id") == school_id:
                event_notes.append({**note, "_event_name": event["name"]})

    # Build timeline (event notes + recommendation events)
    timeline = []
    for note in event_notes:
        timeline.append({
            "type": "event_note",
            "date": note.get("captured_at", ""),
            "athlete_name": note.get("athlete_name", ""),
            "text": note.get("note_text", ""),
            "interest_level": note.get("interest_level", ""),
            "event_name": note.get("_event_name", ""),
        })

    for rec in school_recs:
        for entry in rec.get("response_history", []):
            timeline.append({
                "type": f"recommendation_{entry['type']}",
                "date": entry.get("date", ""),
                "athlete_name": rec.get("athlete_name", ""),
                "text": entry.get("text", ""),
                "desired_next_step": rec.get("desired_next_step", ""),
            })

    timeline.sort(key=lambda x: x.get("date", ""), reverse=True)

    # Aggregate stats
    total_interactions = len(event_notes) + len(school_recs)
    athletes_introduced = len(set(r["athlete_id"] for r in school_recs))
    sent_recs = [r for r in school_recs if r["status"] != "draft"]
    responded = [r for r in sent_recs if r.get("response_status") in ("warm", "positive_outcome")]
    response_rate = len(responded) / len(sent_recs) if sent_recs else 0

    dates = [note.get("captured_at") for note in event_notes] + [r.get("sent_at") for r in school_recs if r.get("sent_at")]
    dates = [d for d in dates if d]
    last_contact = max(dates) if dates else None

    # Warmth calculation
    now = datetime.now(timezone.utc)
    days_since = 999
    if last_contact:
        try:
            last_dt = datetime.fromisoformat(last_contact)
            days_since = (now - last_dt).days
        except (ValueError, TypeError):
            pass

    if response_rate > 0.6 and days_since < 14:
        warmth = "hot"
    elif response_rate > 0.3 or days_since < 30:
        warmth = "warm"
    else:
        warmth = "cold"

    # Athletes with recommendations
    athletes = []
    seen_aids = set()
    for r in school_recs:
        if r["athlete_id"] not in seen_aids:
            seen_aids.add(r["athlete_id"])
            athletes.append({
                "id": r["athlete_id"],
                "name": r["athlete_name"],
                "recommendation_status": r["status"],
                "recommendation_id": r["id"],
            })

    return {
        "school": {"id": school["id"], "name": school["name"], "division": school["division"]},
        "summary": {
            "totalInteractions": total_interactions,
            "athletesIntroduced": athletes_introduced,
            "lastContact": last_contact,
            "responseRate": round(response_rate, 2),
            "warmth": warmth,
        },
        "athletes": athletes,
        "timeline": timeline,
    }


def get_all_relationships():
    """Return summary of all school relationships"""
    relationships = []
    for school in SCHOOLS:
        rel = get_school_relationship(school["id"])
        if rel and rel["summary"]["totalInteractions"] > 0:
            relationships.append({
                "school": rel["school"],
                "summary": rel["summary"],
                "athleteCount": len(rel["athletes"]),
            })
    relationships.sort(key=lambda x: x["summary"]["totalInteractions"], reverse=True)
    return relationships


# ============================================================================
# EVENT CONTEXT LOOKUP
# ============================================================================

def get_event_context(athlete_id, school_id=None):
    """Get event notes relevant to an athlete-school pair for recommendation builder"""
    context_notes = []

    for event in UPCOMING_EVENTS:
        for note in event.get("capturedNotes", []):
            if note.get("athlete_id") != athlete_id:
                continue
            # Include if school matches OR if no school filter (general athlete evidence)
            if school_id and note.get("school_id") != school_id:
                # Still include Hot/Warm notes as general evidence
                if note.get("interest_level") not in ("hot", "warm"):
                    continue
            context_notes.append({
                **note,
                "event_name": event["name"],
                "event_date": event.get("date"),
            })

    # Also build athlete snapshot
    athlete = next((a for a in get_athletes() if a["id"] == athlete_id), None)
    athlete_snapshot = None
    if athlete:
        athlete_snapshot = {
            "id": athlete["id"],
            "full_name": athlete.get("full_name", ""),
            "grad_year": athlete.get("grad_year", ""),
            "position": athlete.get("position", ""),
            "team": athlete.get("team", ""),
            "momentum_score": athlete.get("momentum_score", 0),
            "momentum_trend": athlete.get("momentum_trend", "steady"),
            "recruiting_stage": athlete.get("recruiting_stage", "prospect"),
            "school_targets": athlete.get("school_targets", 0),
        }

    return {
        "event_notes": context_notes,
        "athlete_snapshot": athlete_snapshot,
    }
# force reload

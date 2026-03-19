"""Director Inbox — aggregated "Needs Attention" feed for directors.

Combines signals from escalations, advocacy, roster, and momentum
into a single prioritized list.
"""

from datetime import datetime, timezone, timedelta
from fastapi import APIRouter
from auth_middleware import get_current_user_dep
from db_client import db
from services.athlete_store import get_all as get_athletes
from advocacy_engine import RECOMMENDATIONS

router = APIRouter()


def _iso_or_none(val):
    if not val:
        return None
    try:
        return datetime.fromisoformat(val)
    except (ValueError, TypeError):
        return None


def _time_ago(dt):
    if not dt:
        return ""
    diff = datetime.now(timezone.utc) - dt
    hrs = int(diff.total_seconds() / 3600)
    if hrs < 1:
        return "just now"
    if hrs < 24:
        return f"{hrs}h ago"
    days = int(hrs / 24)
    if days == 1:
        return "1d ago"
    return f"{days}d ago"


@router.get("/director-inbox")
async def get_director_inbox(current_user: dict = get_current_user_dep()):
    items = []
    now = datetime.now(timezone.utc)

    # ── 1. ESCALATIONS ──
    escalations = await db.director_actions.find(
        {"status": {"$in": ["open", "acknowledged"]}, "type": "coach_escalation"},
        {"_id": 0},
    ).sort("created_at", -1).to_list(50)

    for e in escalations:
        ts = _iso_or_none(e.get("created_at"))
        items.append({
            "id": f"esc_{e.get('action_id', e.get('id', ''))}",
            "athleteName": e.get("athlete_name", "Unknown"),
            "schoolName": e.get("school_name"),
            "issueType": "Escalation",
            "priority": "high",
            "timestamp": ts.isoformat() if ts else now.isoformat(),
            "timeAgo": _time_ago(ts),
            "source": "escalation",
            "cta": {
                "label": "Open Pod",
                "url": f"/support-pods/{e.get('athlete_id')}?escalation={e.get('action_id', '')}",
            },
        })

    # ── 2. ADVOCACY — awaiting_reply > 5d OR follow_up_needed ──
    for r in RECOMMENDATIONS:
        if r.get("status") == "awaiting_reply":
            sent = _iso_or_none(r.get("sent_at"))
            if sent and (now - sent).days >= 5:
                items.append({
                    "id": f"adv_{r['id']}",
                    "athleteName": r.get("athlete_name", ""),
                    "schoolName": r.get("school_name"),
                    "issueType": "Awaiting reply",
                    "priority": "medium",
                    "timestamp": (sent or now).isoformat(),
                    "timeAgo": _time_ago(sent),
                    "source": "advocacy",
                    "cta": {
                        "label": "Review",
                        "url": "/advocacy",
                    },
                })
        elif r.get("status") == "follow_up_needed":
            ts = _iso_or_none(r.get("response_at") or r.get("sent_at"))
            items.append({
                "id": f"adv_{r['id']}",
                "athleteName": r.get("athlete_name", ""),
                "schoolName": r.get("school_name"),
                "issueType": "Needs follow-up",
                "priority": "medium",
                "timestamp": (ts or now).isoformat(),
                "timeAgo": _time_ago(ts),
                "source": "advocacy",
                "cta": {
                    "label": "Review",
                    "url": "/advocacy",
                },
            })

    # ── 3. ROSTER INSIGHTS — unassigned athletes ──
    from services.ownership import get_unassigned_athlete_ids
    unassigned = get_unassigned_athlete_ids()
    athletes = get_athletes()

    for uid in unassigned:
        ath = next((a for a in athletes if a["id"] == uid), None)
        if not ath:
            continue
        items.append({
            "id": f"roster_nocoach_{uid}",
            "athleteName": ath.get("full_name", ath.get("name", "Unknown")),
            "schoolName": None,
            "issueType": "No coach assigned",
            "priority": "high",
            "timestamp": now.isoformat(),
            "timeAgo": "",
            "source": "roster",
            "cta": {
                "label": "Assign",
                "url": "/roster",
            },
        })

    # Check for missing documents (athletes without profile completeness)
    for ath in athletes:
        profile_complete = ath.get("profile_complete", True)
        missing = ath.get("missing_documents", [])
        if missing or not profile_complete:
            items.append({
                "id": f"roster_doc_{ath['id']}",
                "athleteName": ath.get("full_name", ath.get("name", "Unknown")),
                "schoolName": None,
                "issueType": "Missing documents",
                "priority": "high",
                "timestamp": now.isoformat(),
                "timeAgo": "",
                "source": "roster",
                "cta": {
                    "label": "Review",
                    "url": f"/support-pods/{ath['id']}",
                },
            })

    # ── 4. MOMENTUM — athletes with no activity > 7 days ──
    for ath in athletes:
        days = ath.get("days_since_activity", 0)
        if days >= 7:
            last = _iso_or_none(ath.get("last_activity"))
            items.append({
                "id": f"momentum_{ath['id']}",
                "athleteName": ath.get("full_name", ath.get("name", "Unknown")),
                "schoolName": None,
                "issueType": "No activity",
                "priority": "medium",
                "timestamp": (last or now).isoformat(),
                "timeAgo": f"{days}d inactive",
                "source": "momentum",
                "cta": {
                    "label": "Open Pod",
                    "url": f"/support-pods/{ath['id']}",
                },
            })

    # ── SORT: high first, then oldest timestamp ──
    priority_rank = {"high": 0, "medium": 1}
    items.sort(key=lambda x: (
        priority_rank.get(x["priority"], 2),
        x.get("timestamp", ""),
    ))

    return {"items": items, "count": len(items)}

"""Director Inbox — aggregated, deduplicated "Needs Attention" feed.

Combines escalations, advocacy, roster, and momentum signals
into a single prioritized list, grouped by athlete+school.
"""

from datetime import datetime, timezone
from fastapi import APIRouter
from auth_middleware import get_current_user_dep
from db_client import db
from services.athlete_store import get_all as get_athletes
from advocacy_engine import RECOMMENDATIONS

router = APIRouter()

# Standardised issue labels
ISSUE_LABELS = {
    "escalation":        "Needs attention",
    "awaiting_reply":    "Awaiting reply",
    "follow_up":         "Needs follow-up",
    "no_activity":       "No activity",
    "missing_documents": "Missing requirement",
    "no_coach_assigned": "No coach assigned",
}

# Priority classification
HIGH_ISSUES = {"escalation", "missing_documents", "no_coach_assigned"}
MEDIUM_ISSUES = {"awaiting_reply", "follow_up", "no_activity"}

# CTA priority: primary CTAs get stronger visual treatment
PRIMARY_CTAS = {"Open Pod"}


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


def _time_ago_short(dt):
    """Shorter format for merged rows: '10d', '2h'."""
    if not dt:
        return ""
    diff = datetime.now(timezone.utc) - dt
    hrs = int(diff.total_seconds() / 3600)
    if hrs < 1:
        return "now"
    if hrs < 24:
        return f"{hrs}h ago"
    days = int(hrs / 24)
    return f"{days}d ago"


@router.get("/director-inbox")
async def get_director_inbox(current_user: dict = get_current_user_dep()):
    raw_items = []
    now = datetime.now(timezone.utc)

    # ── 1. ESCALATIONS ──
    escalations = await db.director_actions.find(
        {"status": {"$in": ["open", "acknowledged"]}, "type": "coach_escalation"},
        {"_id": 0},
    ).sort("created_at", -1).to_list(50)

    for e in escalations:
        ts = _iso_or_none(e.get("created_at"))
        # Extract school from school_name field, or parse from reason_label "[School Name]"
        school = e.get("school_name")
        if not school:
            import re
            m = re.search(r"\[([^\]]+)\]", e.get("reason_label", ""))
            if m:
                school = m.group(1)
        raw_items.append({
            "athleteId": e.get("athlete_id", ""),
            "athleteName": e.get("athlete_name", "Unknown"),
            "schoolName": school,
            "issueKey": "escalation",
            "timestamp": ts or now,
            "source": "escalation",
            "ctaLabel": "Open Pod",
            "ctaUrl": f"/support-pods/{e.get('athlete_id')}?escalation={e.get('action_id', '')}",
        })

    # ── 2. ADVOCACY ──
    for r in RECOMMENDATIONS:
        if r.get("status") == "awaiting_reply":
            sent = _iso_or_none(r.get("sent_at"))
            if sent and (now - sent).days >= 5:
                raw_items.append({
                    "athleteId": r.get("athlete_id", ""),
                    "athleteName": r.get("athlete_name", ""),
                    "schoolName": r.get("school_name"),
                    "issueKey": "awaiting_reply",
                    "timestamp": sent or now,
                    "source": "advocacy",
                    "ctaLabel": "Review",
                    "ctaUrl": "/advocacy",
                })
        elif r.get("status") == "follow_up_needed":
            ts = _iso_or_none(r.get("response_at") or r.get("sent_at"))
            raw_items.append({
                "athleteId": r.get("athlete_id", ""),
                "athleteName": r.get("athlete_name", ""),
                "schoolName": r.get("school_name"),
                "issueKey": "follow_up",
                "timestamp": ts or now,
                "source": "advocacy",
                "ctaLabel": "Review",
                "ctaUrl": "/advocacy",
            })

    # ── 3. ROSTER ──
    from services.ownership import get_unassigned_athlete_ids
    unassigned = get_unassigned_athlete_ids()
    athletes = get_athletes()

    for uid in unassigned:
        ath = next((a for a in athletes if a["id"] == uid), None)
        if not ath:
            continue
        raw_items.append({
            "athleteId": uid,
            "athleteName": ath.get("full_name", ath.get("name", "Unknown")),
            "schoolName": None,
            "issueKey": "no_coach_assigned",
            "timestamp": now,
            "source": "roster",
            "ctaLabel": "Assign",
            "ctaUrl": "/roster",
        })

    for ath in athletes:
        missing = ath.get("missing_documents", [])
        if missing or not ath.get("profile_complete", True):
            raw_items.append({
                "athleteId": ath["id"],
                "athleteName": ath.get("full_name", ath.get("name", "Unknown")),
                "schoolName": None,
                "issueKey": "missing_documents",
                "timestamp": now,
                "source": "roster",
                "ctaLabel": "Review",
                "ctaUrl": f"/support-pods/{ath['id']}",
            })

    # ── 4. MOMENTUM ──
    for ath in athletes:
        days = ath.get("days_since_activity", 0)
        if days >= 7:
            last = _iso_or_none(ath.get("last_activity"))
            raw_items.append({
                "athleteId": ath["id"],
                "athleteName": ath.get("full_name", ath.get("name", "Unknown")),
                "schoolName": None,
                "issueKey": "no_activity",
                "timestamp": last or now,
                "source": "momentum",
                "ctaLabel": "Open Pod",
                "ctaUrl": f"/support-pods/{ath['id']}",
            })

    # ── DEDUPLICATE by athlete+school ──
    groups = {}
    for item in raw_items:
        key = f"{item['athleteId']}||{item.get('schoolName') or '_none_'}"
        if key not in groups:
            groups[key] = {
                "athleteId": item["athleteId"],
                "athleteName": item["athleteName"],
                "schoolName": item["schoolName"],
                "issues": [],
                "timestamps": [],
                "ctaLabel": item["ctaLabel"],
                "ctaUrl": item["ctaUrl"],
                "sources": set(),
            }
        g = groups[key]
        issue_key = item["issueKey"]
        if issue_key not in [i["key"] for i in g["issues"]]:
            g["issues"].append({"key": issue_key, "label": ISSUE_LABELS.get(issue_key, issue_key)})
        g["timestamps"].append(item["timestamp"])
        g["sources"].add(item["source"])
        # Prefer primary CTA (Open Pod > Review > Assign)
        cta_priority = {"Open Pod": 0, "Review": 1, "Assign": 2}
        if cta_priority.get(item["ctaLabel"], 9) < cta_priority.get(g["ctaLabel"], 9):
            g["ctaLabel"] = item["ctaLabel"]
            g["ctaUrl"] = item["ctaUrl"]

    # ── Build final items ──
    merged = []
    for g in groups.values():
        has_high = any(i["key"] in HIGH_ISSUES for i in g["issues"])
        priority = "high" if has_high else "medium"
        most_urgent_ts = min(g["timestamps"])
        issue_labels = [i["label"] for i in g["issues"]]

        merged.append({
            "id": f"inbox_{g['athleteId']}_{(g['schoolName'] or 'none').replace(' ', '_')[:20]}",
            "athleteName": g["athleteName"],
            "schoolName": g["schoolName"],
            "issues": issue_labels,
            "priority": priority,
            "group": "high" if has_high else "at_risk",
            "timestamp": most_urgent_ts.isoformat(),
            "timeAgo": _time_ago_short(most_urgent_ts),
            "ctaPrimary": g["ctaLabel"] in PRIMARY_CTAS,
            "cta": {
                "label": g["ctaLabel"],
                "url": g["ctaUrl"],
            },
        })

    # ── SORT: high first, then oldest ──
    priority_rank = {"high": 0, "medium": 1}
    merged.sort(key=lambda x: (
        priority_rank.get(x["priority"], 2),
        x["timestamp"],
    ))

    high_count = sum(1 for m in merged if m["priority"] == "high")
    return {"items": merged, "count": len(merged), "highCount": high_count}

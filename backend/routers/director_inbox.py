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

    # ── AGGREGATE by athlete (one row per athlete) ──
    athlete_groups = {}
    for item in raw_items:
        aid = item["athleteId"]
        if aid not in athlete_groups:
            athlete_groups[aid] = {
                "athleteId": aid,
                "athleteName": item["athleteName"],
                "school_issues": [],       # [{school, issueKey, issueLabel, timestamp}]
                "general_issues": [],      # [{issueKey, issueLabel, timestamp}]
                "all_timestamps": [],
                "ctaLabel": item["ctaLabel"],
                "ctaUrl": item["ctaUrl"],
            }
        ag = athlete_groups[aid]
        label = ISSUE_LABELS.get(item["issueKey"], item["issueKey"])
        entry = {"issueKey": item["issueKey"], "issueLabel": label, "timestamp": item["timestamp"]}

        if item.get("schoolName"):
            entry["school"] = item["schoolName"]
            # Deduplicate same school+issue
            if not any(s["school"] == item["schoolName"] and s["issueKey"] == item["issueKey"] for s in ag["school_issues"]):
                ag["school_issues"].append(entry)
        else:
            if not any(g["issueKey"] == item["issueKey"] for g in ag["general_issues"]):
                ag["general_issues"].append(entry)

        ag["all_timestamps"].append(item["timestamp"])
        # Prefer primary CTA
        cta_priority = {"Open Pod": 0, "Review": 1, "Assign": 2}
        if cta_priority.get(item["ctaLabel"], 9) < cta_priority.get(ag["ctaLabel"], 9):
            ag["ctaLabel"] = item["ctaLabel"]
            ag["ctaUrl"] = item["ctaUrl"]

    # ── Build final items (one per athlete) ──
    ISSUE_SEVERITY = {"escalation": 6, "missing_documents": 5, "no_coach_assigned": 5,
                      "awaiting_reply": 3, "no_activity": 3, "follow_up": 2}
    merged = []
    for ag in athlete_groups.values():
        all_issues = ag["general_issues"] + ag["school_issues"]
        all_issue_keys = set(i["issueKey"] for i in all_issues)
        has_high = bool(all_issue_keys & HIGH_ISSUES)
        priority = "high" if has_high else "medium"
        most_urgent_ts = min(ag["all_timestamps"])

        # Unique schools involved
        schools = list(dict.fromkeys(s["school"] for s in ag["school_issues"]))
        school_count = len(schools)

        # Primary risk = highest severity issue
        sorted_issues = sorted(all_issues, key=lambda i: ISSUE_SEVERITY.get(i["issueKey"], 0), reverse=True)
        primary_label = sorted_issues[0]["issueLabel"] if sorted_issues else "Needs attention"

        # Unique issue labels for summary
        seen_labels = set()
        unique_labels = []
        for si in sorted_issues:
            if si["issueLabel"] not in seen_labels:
                seen_labels.add(si["issueLabel"])
                unique_labels.append(si["issueLabel"])

        # School breakdown: [{school, issue}] for "Also affected" display
        school_breakdown = []
        for si in ag["school_issues"]:
            school_breakdown.append({"school": si["school"], "issue": si["issueLabel"]})

        # Title + schoolName logic
        if school_count == 0:
            school_name = None
            title_suffix = None
        elif school_count == 1:
            school_name = schools[0]
            title_suffix = None
        else:
            school_name = None
            title_suffix = f"Across {school_count} schools"

        merged.append({
            "id": f"inbox_{ag['athleteId']}",
            "athleteId": ag["athleteId"],
            "athleteName": ag["athleteName"],
            "schoolName": school_name,
            "titleSuffix": title_suffix,
            "schoolCount": school_count,
            "issues": unique_labels,
            "primaryRisk": primary_label,
            "schoolBreakdown": school_breakdown,
            "priority": priority,
            "group": "high" if has_high else "at_risk",
            "timestamp": most_urgent_ts.isoformat(),
            "timeAgo": _time_ago_short(most_urgent_ts),
            "ctaPrimary": ag["ctaLabel"] in PRIMARY_CTAS,
            "cta": {
                "label": ag["ctaLabel"],
                "url": ag["ctaUrl"],
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

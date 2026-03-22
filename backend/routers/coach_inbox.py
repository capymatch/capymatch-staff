"""Coach Inbox — risk-enriched, coach-scoped "Needs Attention" feed.

Returns only the logged-in coach's assigned athletes, filtered to
coach-actionable intervention types (nudge, review, escalate, blocker).
"""

from datetime import datetime, timezone, timedelta
from fastapi import APIRouter
from auth_middleware import get_current_user_dep
from db_client import db
from services.athlete_store import get_all as get_athletes, STAGE_WEIGHTS
from services.ownership import get_visible_athlete_ids
from advocacy_engine import RECOMMENDATIONS
from risk_engine import evaluate_risk

router = APIRouter()

ISSUE_LABELS = {
    "escalation":        "Escalated issue",
    "awaiting_reply":    "Awaiting reply",
    "follow_up":         "Needs follow-up",
    "no_activity":       "No activity",
    "missing_documents": "Missing requirement",
    "no_coach_assigned": "No coach assigned",
    "stalled_stage":     "Stalled stage",
    "event_blocker":     "Event/timeline blocker",
}

COACH_CTA = {
    "nudge":    "Send follow-up",
    "review":   "Open Pod",
    "escalate": "Request director help",
    "blocker":  "Review blocker",
    "monitor":  None,
}


def _iso_or_none(val):
    if not val:
        return None
    try:
        return datetime.fromisoformat(val)
    except (ValueError, TypeError):
        return None


def _time_ago_short(dt):
    if not dt:
        return ""
    diff = datetime.now(timezone.utc) - dt
    hrs = int(diff.total_seconds() / 3600)
    if hrs < 1:
        return "now"
    if hrs < 24:
        return f"{hrs}h ago"
    return f"{int(hrs / 24)}d ago"


def _days_between(dt, now):
    if not dt:
        return None
    return max(0, int((now - dt).total_seconds() / 86400))


@router.get("/coach-inbox")
async def get_coach_inbox(current_user: dict = get_current_user_dep()):
    """Return risk-enriched inbox scoped to the coach's assigned athletes."""
    coach_id = current_user["id"]
    visible = get_visible_athlete_ids(current_user)
    if not visible:
        return {"items": [], "count": 0, "highCount": 0}

    now = datetime.now(timezone.utc)
    raw_items = []

    # ── 1. ESCALATIONS (coach's own athletes only) ──
    escalations = await db.director_actions.find(
        {"status": {"$in": ["open", "acknowledged"]}, "type": "coach_escalation",
         "athlete_id": {"$in": list(visible)}},
        {"_id": 0},
    ).sort("created_at", -1).to_list(50)

    for e in escalations:
        ts = _iso_or_none(e.get("created_at"))
        import re
        school = e.get("school_name")
        if not school:
            m = re.search(r"\[([^\]]+)\]", e.get("reason_label", ""))
            if m:
                school = m.group(1)
        raw_items.append({
            "athleteId": e.get("athlete_id", ""),
            "athleteName": e.get("athlete_name", "Unknown"),
            "schoolName": school,
            "issueKey": "escalation",
            "timestamp": ts or now,
            "ctaUrl": f"/support-pods/{e.get('athlete_id')}?escalation={e.get('action_id', '')}",
        })

    # ── 2. ADVOCACY (coach's athletes) ──
    for r in RECOMMENDATIONS:
        if r.get("athlete_id") not in visible:
            continue
        if r.get("status") == "awaiting_reply":
            sent = _iso_or_none(r.get("sent_at"))
            if sent and (now - sent).days >= 5:
                raw_items.append({
                    "athleteId": r.get("athlete_id", ""),
                    "athleteName": r.get("athlete_name", ""),
                    "schoolName": r.get("school_name"),
                    "issueKey": "awaiting_reply",
                    "timestamp": sent or now,
                    "ctaUrl": f"/support-pods/{r.get('athlete_id', '')}",
                })
        elif r.get("status") == "follow_up_needed":
            ts = _iso_or_none(r.get("response_at") or r.get("sent_at"))
            raw_items.append({
                "athleteId": r.get("athlete_id", ""),
                "athleteName": r.get("athlete_name", ""),
                "schoolName": r.get("school_name"),
                "issueKey": "follow_up",
                "timestamp": ts or now,
                "ctaUrl": f"/support-pods/{r.get('athlete_id', '')}",
            })

    # ── 3. MISSING DOCUMENTS (coach's athletes) ──
    athletes = get_athletes()
    # Merge live DB profile fields to avoid stale static data
    db_athletes = await db.athletes.find(
        {"id": {"$in": list(visible)}},
        {"_id": 0, "id": 1, "profile_complete": 1, "missing_documents": 1}
    ).to_list(500)
    db_map = {a["id"]: a for a in db_athletes}
    for ath in athletes:
        if ath["id"] not in visible:
            continue
        db_ath = db_map.get(ath["id"], {})
        missing = db_ath.get("missing_documents", ath.get("missing_documents", []))
        profile_complete = db_ath.get("profile_complete", ath.get("profile_complete", True))
        if missing or not profile_complete:
            raw_items.append({
                "athleteId": ath["id"],
                "athleteName": ath.get("full_name", ath.get("name", "Unknown")),
                "schoolName": None,
                "issueKey": "missing_documents",
                "timestamp": now,
                "ctaUrl": f"/support-pods/{ath['id']}",
            })

    # ── 4. MOMENTUM / INACTIVITY (coach's athletes) ──
    for ath in athletes:
        if ath["id"] not in visible:
            continue
        days = ath.get("days_since_activity", 0)
        if days >= 7:
            last = _iso_or_none(ath.get("last_activity"))
            raw_items.append({
                "athleteId": ath["id"],
                "athleteName": ath.get("full_name", ath.get("name", "Unknown")),
                "schoolName": None,
                "issueKey": "no_activity",
                "timestamp": last or now,
                "ctaUrl": f"/support-pods/{ath['id']}",
            })

    # ── Recent autopilot actions ──
    seven_days_ago = (now - timedelta(days=7)).isoformat()
    recent_autopilot = await db.autopilot_log.find(
        {"executed_at": {"$gte": seven_days_ago}}, {"_id": 0, "athlete_id": 1},
    ).to_list(200)
    recent_action_counts = {}
    for ra in recent_autopilot:
        aid = ra.get("athlete_id", "")
        recent_action_counts[aid] = recent_action_counts.get(aid, 0) + 1

    # ── Programs for stage context ──
    athlete_ids = list(set(item["athleteId"] for item in raw_items))
    programs = []
    if athlete_ids:
        programs = await db.programs.find(
            {"athlete_id": {"$in": athlete_ids}},
            {"_id": 0, "athlete_id": 1, "recruiting_status": 1, "stage_entered_at": 1, "university_name": 1},
        ).to_list(500)

    athlete_stage_map = {}
    for p in programs:
        aid = p["athlete_id"]
        status = (p.get("recruiting_status") or "Prospect").strip()
        weight = STAGE_WEIGHTS.get(status, 10)
        entered = _iso_or_none(p.get("stage_entered_at"))
        entered_days = _days_between(entered, now) if entered else None
        if aid not in athlete_stage_map or weight > STAGE_WEIGHTS.get(athlete_stage_map[aid]["best_stage"], 0):
            athlete_stage_map[aid] = {"best_stage": status, "stage_entered_days_ago": entered_days}

    athlete_days_inactive = {}
    athlete_photos = {}
    for ath in athletes:
        athlete_days_inactive[ath["id"]] = ath.get("days_since_activity", 0)
        athlete_photos[ath["id"]] = ath.get("photo_url", "")

    # ── Aggregate by athlete ──
    ISSUE_SEVERITY = {"escalation": 6, "missing_documents": 5, "no_coach_assigned": 5,
                      "awaiting_reply": 3, "no_activity": 3, "follow_up": 2}
    athlete_groups = {}
    for item in raw_items:
        aid = item["athleteId"]
        if aid not in athlete_groups:
            athlete_groups[aid] = {
                "athleteId": aid, "athleteName": item["athleteName"],
                "school_issues": [], "general_issues": [], "all_timestamps": [],
                "ctaUrl": item["ctaUrl"],
            }
        ag = athlete_groups[aid]
        label = ISSUE_LABELS.get(item["issueKey"], item["issueKey"])
        entry = {"issueKey": item["issueKey"], "issueLabel": label, "timestamp": item["timestamp"]}
        if item.get("schoolName"):
            entry["school"] = item["schoolName"]
            if not any(s["school"] == item["schoolName"] and s["issueKey"] == item["issueKey"] for s in ag["school_issues"]):
                ag["school_issues"].append(entry)
        else:
            if not any(g["issueKey"] == item["issueKey"] for g in ag["general_issues"]):
                ag["general_issues"].append(entry)
        ag["all_timestamps"].append(item["timestamp"])

    # ── Build enriched items ──
    merged = []
    for ag in athlete_groups.values():
        all_issues = ag["general_issues"] + ag["school_issues"]
        most_urgent_ts = min(ag["all_timestamps"])
        schools = list(dict.fromkeys(s["school"] for s in ag["school_issues"]))
        school_count = len(schools)
        sorted_issues = sorted(all_issues, key=lambda i: ISSUE_SEVERITY.get(i["issueKey"], 0), reverse=True)
        primary_label = sorted_issues[0]["issueLabel"] if sorted_issues else "Needs attention"

        seen_labels = set()
        unique_labels = []
        for si in sorted_issues:
            if si["issueLabel"] not in seen_labels:
                seen_labels.add(si["issueLabel"])
                unique_labels.append(si["issueLabel"])

        school_name = schools[0] if school_count == 1 else None
        title_suffix = f"Across {school_count} schools" if school_count > 1 else None

        # Risk Engine v3
        deduped_keys = list(dict.fromkeys(i["issueKey"] for i in sorted_issues))
        aid = ag["athleteId"]
        stage_info = athlete_stage_map.get(aid, {})
        days_inactive = athlete_days_inactive.get(aid, 0)
        issue_age = _days_between(most_urgent_ts, now)

        risk = evaluate_risk(
            issue_keys=deduped_keys,
            best_stage=stage_info.get("best_stage"),
            school_name=school_name or (schools[0] if schools else None),
            days_inactive=days_inactive if days_inactive > 0 else None,
            issue_age_days=issue_age,
            recent_actions_count=recent_action_counts.get(aid, 0),
            stage_entered_days_ago=stage_info.get("stage_entered_days_ago"),
        )

        # Filter: only coach-actionable interventions
        intervention = risk["interventionType"]
        if intervention == "monitor":
            continue

        severity_to_priority = {"critical": "high", "high": "high", "medium": "medium", "low": "low"}
        priority = severity_to_priority.get(risk["severity"], "medium")

        # Coach-specific CTA
        coach_cta_label = COACH_CTA.get(intervention, "Open Pod")
        coach_action = risk["recommendedActionByRole"].get("coach", "Review")

        merged.append({
            "id": f"inbox_{ag['athleteId']}",
            "athleteId": ag["athleteId"],
            "athleteName": ag["athleteName"],
            "photoUrl": athlete_photos.get(ag["athleteId"], ""),
            "schoolName": school_name,
            "titleSuffix": title_suffix,
            "schoolCount": school_count,
            "issues": unique_labels,
            "primaryRisk": primary_label,
            "priority": priority,
            "timestamp": most_urgent_ts.isoformat(),
            "timeAgo": _time_ago_short(most_urgent_ts),
            "cta": {"label": coach_cta_label, "url": ag["ctaUrl"]},
            # v3 fields
            "riskScore": risk["riskScore"],
            "severity": risk["severity"],
            "trajectory": risk["trajectory"],
            "interventionType": intervention,
            "riskSignals": risk["riskSignals"],
            "whyNow": risk["whyNow"],
            "coachAction": coach_action,
            "secondaryRisks": risk["secondaryRisks"],
            "explanationShort": risk["explanationShort"],
        })

    merged.sort(key=lambda x: (-x["riskScore"], x["timestamp"]))
    high_count = sum(1 for m in merged if m["priority"] == "high")
    return {"items": merged, "count": len(merged), "highCount": high_count}


# ── POST /api/coach/escalate — Create escalation flag for director ──
@router.post("/coach/escalate")
async def coach_escalate(body: dict, current_user: dict = get_current_user_dep()):
    """Coach requests director help — creates an escalation/flag visible in Director Inbox."""
    import uuid
    now = datetime.now(timezone.utc).isoformat()

    athlete_id = body.get("athlete_id", "")
    athlete_name = body.get("athlete_name", "")
    school_name = body.get("school_name", "")
    primary_risk = body.get("primary_risk", "")
    why_now = body.get("why_now", "")
    coach_note = body.get("coach_note", "")

    reason_label = f"[{school_name}] " if school_name else ""
    reason_label += f"Coach escalation: {primary_risk}"

    action_id = f"da_{uuid.uuid4().hex[:12]}"
    doc = {
        "action_id": action_id,
        "type": "coach_escalation",
        "status": "open",
        "coach_id": current_user["id"],
        "coach_name": current_user.get("name", ""),
        "athlete_id": athlete_id,
        "athlete_name": athlete_name,
        "school_name": school_name,
        "org_id": current_user.get("org_id", ""),
        "reason": "needs_intervention",
        "reason_label": reason_label,
        "note": coach_note or why_now,
        "primary_risk": primary_risk,
        "why_now": why_now,
        "urgency": "high",
        "source": "coach_escalation",
        "created_at": now,
        "acknowledged_at": None,
        "resolved_at": None,
    }
    await db.director_actions.insert_one(doc)
    doc.pop("_id", None)

    return {"success": True, "action_id": action_id, "message": "Escalation sent to director"}

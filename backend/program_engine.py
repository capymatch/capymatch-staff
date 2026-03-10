"""
Program Intelligence — Strategic aggregation for program oversight

Computes 5 decision surfaces from existing data:
1. Program Health — fragility, issues, blockers
2. Readiness — by grad year, stalled athletes
3. Event Effectiveness — follow-up completion, downstream impact
4. Advocacy Outcomes — pipeline, response rates, aging recs
5. Support Load — owner distribution, overload, gaps

Supports two modes:
- Director (coach_id=None): full program view with imbalance/overload warnings
- Coach (coach_id="Coach Martinez"): filtered to that coach's athletes only
"""

from datetime import datetime, timezone
from services.athlete_store import get_all as get_athletes, get_interventions
from mock_data import UPCOMING_EVENTS
from support_pod import (
    generate_pod_members,
    generate_suggested_actions,
    calculate_pod_health,
    get_athlete_interventions,
)
from advocacy_engine import RECOMMENDATIONS, get_all_relationships


def _filter_athletes(athlete_ids=None):
    if athlete_ids is None:
        return get_athletes()
    return [a for a in get_athletes() if a["id"] in athlete_ids]


def _filter_interventions(athlete_ids=None):
    if athlete_ids is None:
        return get_interventions()
    return [i for i in get_interventions() if i["athlete_id"] in athlete_ids]


def _filter_recommendations(athlete_ids=None):
    if athlete_ids is None:
        return RECOMMENDATIONS
    return [r for r in RECOMMENDATIONS if r["athlete_id"] in athlete_ids]


def compute_program_health(athlete_ids=None):
    """Section 1: Where is the program fragile?"""
    athletes = _filter_athletes(athlete_ids)
    interventions = _filter_interventions(athlete_ids)

    health_counts = {"healthy": 0, "needs_attention": 0, "at_risk": 0}
    health_map = {"green": "healthy", "yellow": "needs_attention", "red": "at_risk"}

    for athlete in athletes:
        ai = get_athlete_interventions(athlete["id"])
        members = generate_pod_members(athlete)
        actions = generate_suggested_actions(athlete["id"], ai)
        h = calculate_pod_health(athlete, members, actions)
        health_counts[health_map.get(h, "needs_attention")] += 1

    category_counts = {}
    for i in interventions:
        cat = i["category"]
        category_counts[cat] = category_counts.get(cat, 0) + 1

    # Highest-risk cluster
    grad_year_risk = {}
    for i in interventions:
        gy = i.get("grad_year")
        if gy:
            grad_year_risk.setdefault(gy, {"blockers": 0, "momentum_drops": 0, "total": 0})
            grad_year_risk[gy]["total"] += 1
            if i["category"] == "blocker":
                grad_year_risk[gy]["blockers"] += 1
            if i["category"] == "momentum_drop":
                grad_year_risk[gy]["momentum_drops"] += 1

    highest_risk = None
    max_score = 0
    for gy, counts in grad_year_risk.items():
        risk = counts["blockers"] * 3 + counts["momentum_drops"] * 2 + counts["total"]
        if risk > max_score:
            max_score = risk
            parts = []
            if counts["blockers"]:
                parts.append(f"{counts['blockers']} blockers")
            if counts["momentum_drops"]:
                parts.append(f"{counts['momentum_drops']} momentum drops")
            gy_athletes = [a for a in athletes if a["grad_year"] == gy]
            active_count = sum(1 for a in gy_athletes if a["recruiting_stage"] in ("actively_recruiting", "narrowing"))
            stage_note = f"in {'actively recruiting' if active_count > len(gy_athletes) // 2 else 'early'} cohort"
            highest_risk = {
                "type": "grad_year",
                "value": str(gy),
                "reason": f"{', '.join(parts)} {stage_note}",
            }

    return {
        "pod_health": health_counts,
        "open_issues": {
            "blockers": category_counts.get("blocker", 0),
            "overdue_actions": category_counts.get("ownership_gap", 0),
            "ownership_gaps": category_counts.get("ownership_gap", 0),
            "momentum_drops": category_counts.get("momentum_drop", 0),
            "event_follow_ups": category_counts.get("event_follow_up", 0),
            "engagement_drops": category_counts.get("engagement_drop", 0),
        },
        "intervention_total": len(interventions),
        "highest_risk_cluster": highest_risk,
    }


def compute_readiness(athlete_ids=None):
    """Section 2: Which teams/grad years need intervention? Who's stalling?"""
    athletes = _filter_athletes(athlete_ids)

    stall_thresholds = {2025: 30, 2026: 45, 2027: 90}
    expected_stages = {2025: "actively_recruiting", 2026: "actively_recruiting", 2027: "exploring"}

    by_grad_year = {}
    stalled_athletes = []

    for athlete in athletes:
        gy = athlete["grad_year"]
        if gy not in by_grad_year:
            by_grad_year[gy] = {
                "grad_year": gy,
                "team": {"2025": "U18 Academy", "2026": "U17 Premier", "2027": "U16 Elite"}.get(str(gy), ""),
                "total_athletes": 0,
                "actively_recruiting": 0,
                "exploring": 0,
                "narrowing": 0,
                "committed": 0,
                "blockers": 0,
                "on_track_pct": 0,
                "attention_note": None,
            }

        entry = by_grad_year[gy]
        entry["total_athletes"] += 1
        stage = athlete.get("recruiting_stage", "exploring")
        if stage in entry:
            entry[stage] += 1

        athlete_interventions = get_athlete_interventions(athlete["id"])
        blocker_count = sum(1 for i in athlete_interventions if i["category"] == "blocker")
        entry["blockers"] += blocker_count

        days = athlete.get("days_since_activity", 0)
        threshold = stall_thresholds.get(gy, 90)

        is_stalled = False
        if gy == 2025 and stage == "exploring" and days > threshold:
            is_stalled = True
        elif gy == 2026 and stage == "exploring" and days > threshold:
            is_stalled = True
        elif gy == 2027 and stage == "exploring" and days > threshold:
            is_stalled = True

        if is_stalled:
            stalled_athletes.append({
                "id": athlete["id"],
                "name": athlete["full_name"],
                "grad_year": gy,
                "stage": stage,
                "days_in_stage": days,
                "expected_stage": expected_stages.get(gy, "exploring"),
                "blockers": [i["trigger"] for i in athlete_interventions if i["category"] == "blocker"],
                "has_blockers": blocker_count > 0,
            })

    for gy, entry in by_grad_year.items():
        total = entry["total_athletes"]
        if total == 0:
            continue
        if gy == 2025:
            on_track = entry["actively_recruiting"] + entry["narrowing"] + entry["committed"]
        elif gy == 2026:
            on_track = entry["actively_recruiting"] + entry["narrowing"]
        else:
            on_track = total - entry["blockers"]
        entry["on_track_pct"] = round((on_track / total) * 100)

        if entry["blockers"] > 0:
            entry["attention_note"] = f"{entry['blockers']} athletes with active blockers"
        stalled_in_gy = [s for s in stalled_athletes if s["grad_year"] == gy]
        if stalled_in_gy:
            entry["attention_note"] = f"{len(stalled_in_gy)} athletes stalled in exploring stage"

    result = sorted(by_grad_year.values(), key=lambda x: x["grad_year"])
    return {"by_grad_year": result, "stalled_athletes": stalled_athletes}


def compute_event_effectiveness(athlete_ids=None):
    """Section 3: Which events produced outcomes? Where is follow-up breaking?"""
    recs = _filter_recommendations(athlete_ids)
    past_events = []
    upcoming_events = []

    for event in UPCOMING_EVENTS:
        if event.get("daysAway", 0) < 0 or event.get("status") == "past":
            notes = event.get("capturedNotes", [])
            if athlete_ids is not None:
                notes = [n for n in notes if n.get("athlete_id") in athlete_ids]

            hot = sum(1 for n in notes if n.get("interest_level") == "hot")
            warm = sum(1 for n in notes if n.get("interest_level") == "warm")
            with_follow_ups = [n for n in notes if n.get("follow_ups")]
            routed = sum(1 for n in notes if n.get("routed_to_pod"))
            follow_up_total = len(with_follow_ups)
            follow_up_completed = routed
            completion_pct = round((follow_up_completed / follow_up_total) * 100) if follow_up_total > 0 else 0

            event_note_ids = {n["id"] for n in notes}
            recs_from_event = sum(
                1 for r in recs
                if any(nid in event_note_ids for nid in r.get("supporting_event_notes", []))
            )

            attention = None
            if follow_up_total > 0 and completion_pct < 50:
                attention = f"{completion_pct}% follow-up completion — {follow_up_total - follow_up_completed} stale actions"

            if notes:  # Only include events with notes for this coach
                past_events.append({
                    "id": event["id"],
                    "name": event["name"],
                    "date": event.get("date"),
                    "location": event.get("location"),
                    "notes_captured": len(notes),
                    "hot_interactions": hot,
                    "warm_interactions": warm,
                    "follow_ups_identified": follow_up_total,
                    "follow_ups_completed": follow_up_completed,
                    "follow_up_completion_pct": completion_pct,
                    "routed_to_pods": routed,
                    "recommendations_created": recs_from_event,
                    "attention_note": attention,
                })
        elif athlete_ids is None:  # Upcoming events only for director view
            upcoming_events.append({
                "id": event["id"],
                "name": event["name"],
                "days_away": event["daysAway"],
                "prep_status": event.get("prepStatus", "not_started"),
                "athletes_attending": event.get("athleteCount", 0),
            })

    return {"past_events": past_events, "upcoming_events": upcoming_events[:3]}


def compute_advocacy_outcomes(athlete_ids=None):
    """Section 4: Is advocacy producing results?"""
    recs = _filter_recommendations(athlete_ids)
    now = datetime.now(timezone.utc)

    pipeline = {"total": 0, "draft": 0, "sent": 0, "awaiting_reply": 0, "warm_response": 0, "follow_up_needed": 0, "closed": 0}
    aging = []

    for r in recs:
        pipeline["total"] += 1
        status = r.get("status", "draft")
        if status in pipeline:
            pipeline[status] += 1

        if status in ("awaiting_reply", "follow_up_needed", "sent") and r.get("sent_at"):
            sent_dt = datetime.fromisoformat(r["sent_at"])
            days = (now - sent_dt).days
            if days >= 3:
                aging.append({
                    "id": r["id"],
                    "athlete_name": r["athlete_name"],
                    "school_name": r["school_name"],
                    "days_since_sent": days,
                    "follow_up_count": r.get("follow_up_count", 0),
                    "status": status,
                })

    sent_total = pipeline["sent"] + pipeline["awaiting_reply"] + pipeline["warm_response"] + pipeline["follow_up_needed"]
    warm_total = pipeline["warm_response"]
    positive_closed = sum(1 for r in recs if r.get("closed_reason") == "positive_outcome")
    response_rate = round((warm_total + positive_closed) / sent_total, 2) if sent_total > 0 else 0

    school_activity = []
    if athlete_ids is None:
        # Director view: full school activity
        relationships = get_all_relationships()
        for rel in relationships[:6]:
            school_recs = [r for r in RECOMMENDATIONS if r["school_id"] == rel["school"]["id"] and r["status"] != "draft"]
            warm_resp = sum(1 for r in school_recs if r.get("response_status") == "warm" or r.get("closed_reason") == "positive_outcome")
            sr = round(warm_resp / len(school_recs), 2) if school_recs else 0
            school_activity.append({
                "school_name": rel["school"]["name"],
                "school_id": rel["school"]["id"],
                "warmth": rel["summary"]["warmth"],
                "recs_sent": len(school_recs),
                "warm_responses": warm_resp,
                "response_rate": sr,
            })

    return {
        "pipeline": pipeline,
        "response_rate": response_rate,
        "aging_recommendations": aging,
        "school_activity": school_activity,
    }


def compute_support_load(coach_id=None, athlete_ids=None):
    """Section 5: Who is overloaded? Where are ownership gaps?"""
    interventions = _filter_interventions(athlete_ids)
    owner_stats = {}

    for i in interventions:
        owner = i.get("owner", "Unassigned")
        if owner not in owner_stats:
            owner_stats[owner] = {"owner": owner, "open_actions": 0, "overdue": 0, "athletes": set(), "is_overloaded": False}
        owner_stats[owner]["open_actions"] += 1
        owner_stats[owner]["athletes"].add(i.get("athlete_id"))

        if i.get("urgency", 0) >= 8:
            owner_stats[owner]["overdue"] += 1

    by_owner = []
    for owner, stats in owner_stats.items():
        by_owner.append({
            "owner": owner,
            "open_actions": stats["open_actions"],
            "overdue": stats["overdue"],
            "athletes_assigned": len(stats["athletes"]),
            "is_overloaded": False,
        })

    by_owner.sort(key=lambda x: x["open_actions"], reverse=True)

    # Imbalance detection (director view only)
    imbalance_detected = False
    imbalance_note = None

    if coach_id is None:
        named_owners = [s for s in by_owner if s["owner"] not in ("Unassigned", "Parent/Guardian", "Needs assignment")]

        if len(named_owners) >= 2:
            top = named_owners[0]
            bottom = named_owners[-1]
            if bottom["open_actions"] > 0 and top["open_actions"] >= bottom["open_actions"] * 2:
                top["is_overloaded"] = True
                imbalance_detected = True
                ratio = round(top["open_actions"] / max(bottom["open_actions"], 1))
                imbalance_note = f"{top['owner']} has {ratio}x the open actions of {bottom['owner']}. Consider redistributing."
        elif len(named_owners) == 1 and named_owners[0]["open_actions"] > 15:
            named_owners[0]["is_overloaded"] = True
            imbalance_detected = True
            imbalance_note = f"{named_owners[0]['owner']} is the sole owner with {named_owners[0]['open_actions']} actions."
    else:
        # Coach view: only show their own bar
        by_owner = [o for o in by_owner if o["owner"] == coach_id]

    return {
        "by_owner": by_owner,
        "unassigned_actions": sum(s["open_actions"] for s in by_owner if s["owner"] in ("Unassigned", "Needs assignment")),
        "imbalance_detected": imbalance_detected,
        "imbalance_note": imbalance_note,
    }


def get_coaches():
    """Return list of named coaches from intervention ownership data."""
    coaches = {}
    for i in get_interventions():
        owner = i.get("owner", "")
        if owner and owner not in ("Needs assignment", "Parent + Coach", "Coach + Athlete", "Unassigned", "Parent/Guardian"):
            coaches.setdefault(owner, set()).add(i.get("athlete_id"))

    return [
        {"id": name, "name": name, "athlete_count": len(aids)}
        for name, aids in sorted(coaches.items(), key=lambda x: -len(x[1]))
    ]


def compute_all(coach_id=None):
    """Compute all 5 sections. Optionally filtered by coach_id."""
    athlete_ids = None
    view_mode = "director"

    if coach_id:
        # Determine which athletes this coach owns (from interventions)
        athlete_ids = set()
        for i in get_interventions():
            if i.get("owner") == coach_id:
                athlete_ids.add(i["athlete_id"])
        view_mode = "club_coach"

    athletes = _filter_athletes(athlete_ids)

    return {
        "program_health": compute_program_health(athlete_ids),
        "readiness": compute_readiness(athlete_ids),
        "event_effectiveness": compute_event_effectiveness(athlete_ids),
        "advocacy_outcomes": compute_advocacy_outcomes(athlete_ids),
        "support_load": compute_support_load(coach_id=coach_id, athlete_ids=athlete_ids),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "athlete_count": len(athletes),
        "event_count": len(UPCOMING_EVENTS),
        "recommendation_count": len(_filter_recommendations(athlete_ids)),
        "view_mode": view_mode,
        "coach_id": coach_id,
    }

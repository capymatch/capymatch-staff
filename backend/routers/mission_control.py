"""Mission Control — role-specific command surface endpoints."""

from datetime import datetime, timedelta, timezone
from fastapi import APIRouter
from auth_middleware import get_current_user_dep
from services.ownership import (
    filter_by_athlete_id,
    filter_events_by_ownership,
    get_visible_athlete_ids,
    get_unassigned_athlete_ids,
    get_coach_athlete_map,
)
from services.athlete_store import (
    get_all as get_athletes,
    get_alerts,
    get_signals,
    get_needing_attention,
    get_snapshot,
    get_interventions,
)
from mock_data import (
    UPCOMING_EVENTS,
    get_program_snapshot,
)
from support_pod import (
    get_athlete as sp_get_athlete,
    get_athlete_interventions,
    explain_pod_health,
)
from db_client import db


# Health states that count as "alerts" on the dashboard
_ALERT_HEALTH_STATES = {"at_risk", "cooling_off", "needs_attention", "needs_follow_up"}

router = APIRouter()


def enrich_with_health(interventions_list):
    enriched = []
    for item in interventions_list:
        item_copy = {**item}
        athlete = sp_get_athlete(item["athlete_id"])
        if athlete:
            athlete_interventions = get_athlete_interventions(item["athlete_id"])
            item_copy["pod_health"] = explain_pod_health(athlete, athlete_interventions)
        enriched.append(item_copy)
    return enriched


def _build_athlete_roster_item(athlete: dict) -> dict:
    """Build a compact athlete object for coach roster view."""
    interventions = get_athlete_interventions(athlete["id"])
    health = explain_pod_health(athlete, interventions)

    # Find any active intervention for this athlete
    category = None
    badge_color = None
    why = None
    for item in get_interventions():
        if item["athlete_id"] == athlete["id"]:
            category = item.get("category")
            badge_color = item.get("badge_color")
            why = item.get("why_this_surfaced")
            break

    # Compute human-friendly next step based on category
    next_step = _compute_next_step(category, athlete)

    return {
        "id": athlete["id"],
        "name": athlete.get("full_name", athlete.get("name", "Unknown")),
        "photo_url": athlete.get("photo_url", ""),
        "grad_year": athlete.get("grad_year"),
        "position": athlete.get("position"),
        "team": athlete.get("team"),
        "momentum_score": athlete.get("momentum_score", 0),
        "momentum_trend": athlete.get("momentum_trend", "stable"),
        "recruiting_stage": athlete.get("recruiting_stage", "exploring"),
        "days_since_activity": athlete.get("days_since_activity", 0),
        "school_targets": athlete.get("school_targets", 0),
        "active_interest": athlete.get("active_interest", 0),
        "podHealth": health,
        "category": category,
        "badgeColor": badge_color,
        "why": why,
        "next_step": next_step,
    }


def _compute_next_step(category: str | None, athlete: dict) -> str:
    """Return a human-friendly next step based on athlete's issue category."""
    days = athlete.get("days_since_activity", 0)
    name_first = (athlete.get("full_name") or athlete.get("name", "")).split(" ")[0]

    step_map = {
        "momentum_drop": f"Check in with {name_first}" if days > 14 else f"Review {name_first}'s recent activity",
        "blocker": f"Remove blocker for {name_first}",
        "deadline_proximity": f"Review upcoming deadline with {name_first}",
        "engagement_drop": f"Re-engage {name_first} with a check-in",
        "ownership_gap": f"Assign a primary coach for {name_first}",
        "readiness_issue": f"Review {name_first}'s readiness gaps",
    }
    if category and category in step_map:
        return step_map[category]
    return f"Keep supporting {name_first}'s progress"


@router.get("/mission-control")
async def get_mission_control_data(current_user: dict = get_current_user_dep()):
    """Role-specific Mission Control data."""

    role = current_user["role"]
    alerts = filter_by_athlete_id(get_alerts(), current_user)
    signals = filter_by_athlete_id(get_signals(), current_user, athlete_id_key="athleteId")
    events = filter_events_by_ownership(UPCOMING_EVENTS, current_user)
    attention = filter_by_athlete_id(get_needing_attention(), current_user)

    if role == "director":
        return await _build_director_response(alerts, attention, signals, events)
    else:
        response = _build_coach_response(current_user, alerts, attention, signals, events)
        # Enrich roster with school-level alerts from DB (async)
        await _enrich_roster_with_school_alerts(response.get("myRoster", []))
        # Recount needing_action after enrichment (school alerts may promote athletes)
        needing_action = [a for a in response["myRoster"] if a.get("category")]
        response["todays_summary"]["needingAction"] = len(needing_action)
        return response


async def _build_director_response(alerts, attention, signals, events):
    """Director: program oversight surface."""
    unassigned_ids = get_unassigned_athlete_ids()
    coach_map = get_coach_athlete_map()

    # Program status KPIs
    program_status = {
        "totalAthletes": len(get_athletes()),
        "activeCoaches": len(coach_map),
        "unassignedCount": len(unassigned_ids),
        "upcomingEvents": len([e for e in events if 0 <= e.get("daysAway", 99) <= 14]),
        "needingAttention": len(attention),
    }

    # Compute trend data from historical snapshots
    trend_data = await _compute_trends(program_status)

    # Needs attention — use ATHLETES_NEEDING_ATTENTION (matches KPI count), top 8
    needs_attention = enrich_with_health(attention[:8])

    # Upcoming events — next 5, only future
    upcoming = sorted(
        [e for e in events if e.get("daysAway", 99) >= 0],
        key=lambda e: e.get("daysAway", 99),
    )[:5]

    # Program activity — latest 6 signals
    activity = sorted(signals, key=lambda s: s.get("hoursAgo", 0))[:6]

    # Coach health — from DB
    coach_health = await _get_coach_health(coach_map)

    # Recruiting signals — from event notes and advocacy data
    recruiting_signals = await _get_recruiting_signals()

    return {
        "role": "director",
        "programStatus": program_status,
        "trendData": trend_data,
        "needsAttention": needs_attention,
        "upcomingEvents": upcoming,
        "programActivity": activity,
        "coachHealth": coach_health,
        "recruitingSignals": recruiting_signals,
        "programSnapshot": {**get_snapshot(), "unassigned_count": len(unassigned_ids)},
    }


async def _compute_trends(current_status):
    """Compute trend deltas from historical snapshots for KPIs and momentum."""
    try:
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        cursor = db.program_snapshots.find(
            {"captured_at": {"$lt": today_start.isoformat()}},
            {"_id": 0}
        ).sort("captured_at", -1).limit(1)
        prev_list = await cursor.to_list(1)
        prev = prev_list[0] if prev_list else None

        current_needing = current_status.get("needingAttention", 0)

        if prev:
            prev_needing = prev.get("pod_health", {}).get("needs_attention", 0) + prev.get("pod_health", {}).get("at_risk", 0)
            attention_delta = current_needing - prev_needing
            prev_issues = prev.get("open_issues", {}).get("total", 0)
            current_issues = len(get_interventions())
            issues_delta = current_issues - prev_issues
            prev_healthy = prev.get("pod_health", {}).get("healthy", 0)
            current_healthy = get_snapshot().get("positiveMomentum", 0)
            health_delta = current_healthy - prev_healthy
        else:
            attention_delta = 0
            issues_delta = 0
            health_delta = 0

        # Compute overall momentum
        positive_signals = 0
        negative_signals = 0
        if health_delta > 0:
            positive_signals += 1
        elif health_delta < 0:
            negative_signals += 1
        if attention_delta < 0:
            positive_signals += 1
        elif attention_delta > 0:
            negative_signals += 1
        if issues_delta < 0:
            positive_signals += 1
        elif issues_delta > 0:
            negative_signals += 1

        if positive_signals > negative_signals:
            momentum_state = "improving"
        elif negative_signals > positive_signals:
            momentum_state = "declining"
        else:
            momentum_state = "stable"

        momentum_pct = 0
        if current_healthy > 0 and prev:
            momentum_pct = round((health_delta / max(prev_healthy, 1)) * 100)

        return {
            "needAttentionDelta": attention_delta,
            "momentum": {
                "state": momentum_state,
                "engagementDelta": momentum_pct,
            },
        }
    except Exception:
        return {
            "needAttentionDelta": 0,
            "momentum": {"state": "stable", "engagementDelta": 0},
        }


async def _get_coach_health(coach_map):
    """Build coach health summary for Director MC."""
    coaches = await db.users.find(
        {"role": "club_coach"},
        {"_id": 0, "id": 1, "name": 1, "last_active": 1, "onboarding": 1, "profile": 1},
    ).to_list(50)

    results = []
    for coach in coaches:
        cid = coach["id"]
        last_active = coach.get("last_active")
        onboarding = coach.get("onboarding") or {}
        completed = len(onboarding.get("completed_steps", []))
        total = 5
        athlete_count = len(coach_map.get(cid, []))

        # Only show coaches that have athletes assigned
        if athlete_count == 0:
            continue

        # Skip obvious test accounts
        name_lower = (coach.get("name") or "").lower()
        if "test" in name_lower or "e2e" in name_lower:
            continue

        # Derive status
        days_inactive = None
        if last_active:
            try:
                from datetime import datetime, timezone
                last_dt = datetime.fromisoformat(last_active)
                days_inactive = (datetime.now(timezone.utc) - last_dt).days
            except Exception:
                pass

        if days_inactive is not None and days_inactive < 3 and completed >= total:
            status = "active"
        elif days_inactive is not None and days_inactive > 7:
            status = "inactive"
        elif days_inactive is not None and 3 <= days_inactive <= 7:
            status = "needs_support"
        elif completed < total:
            status = "activating"
        elif days_inactive is None:
            status = "activating"
        else:
            status = "active"

        # Workload signal
        if athlete_count >= 12:
            workload = "high"
        elif athlete_count >= 6:
            workload = "moderate"
        else:
            workload = "light"

        results.append({
            "id": cid,
            "name": coach.get("name", "Unknown"),
            "status": status,
            "athleteCount": athlete_count,
            "daysInactive": days_inactive,
            "workload": workload,
            "onboardingProgress": f"{completed}/{total}",
            "onboardingComplete": completed >= total,
            "profileCompleteness": (coach.get("profile") or {}).get("completeness", 0),
        })

    return results


async def _get_recruiting_signals():
    """Build recruiting signals summary for Director MC."""
    from datetime import datetime, timezone
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()

    # Count event notes with school interest this week
    interest_notes = await db.event_notes.find(
        {"captured_at": {"$gte": week_ago}, "interest_level": {"$in": ["hot", "warm"]}},
        {"_id": 0, "interest_level": 1},
    ).to_list(200)

    hot_count = len([n for n in interest_notes if n.get("interest_level") == "hot"])
    warm_count = len([n for n in interest_notes if n.get("interest_level") == "warm"])

    # Count recent advocacy recommendations
    recent_recs = await db.recommendations.find(
        {"created_at": {"$gte": week_ago}},
        {"_id": 0},
    ).to_list(200)

    # Count recent athlete notes (coach engagement)
    recent_notes = await db.athlete_notes.find(
        {"created_at": {"$gte": week_ago}},
        {"_id": 0},
    ).to_list(200)

    return {
        "schoolInterests": hot_count + warm_count,
        "hotInterests": hot_count,
        "warmInterests": warm_count,
        "newRecommendations": len(recent_recs),
        "coachNotes": len(recent_notes),
    }


def _build_coach_response(user, alerts, attention, signals, events):
    """Coach: personal work dashboard — intervention-focused."""
    visible_ids = get_visible_athlete_ids(user)
    my_athletes = [a for a in get_athletes() if a["id"] in visible_ids]

    # Build roster items with health info
    roster = [_build_athlete_roster_item(a) for a in my_athletes]
    roster.sort(key=lambda a: a.get("momentum_score", 0))  # lowest momentum first

    # Count how many need action
    needing_action = [a for a in roster if a.get("category")]

    # Build priorities queue — structured by urgency
    priorities = _build_priorities_queue(needing_action, events, alerts)

    # Upcoming events — next 5
    upcoming = sorted(events, key=lambda e: e.get("daysAway", 99))[:5]

    # Recent activity — latest 8
    activity = sorted(signals, key=lambda s: s.get("hoursAgo", 0))[:8]

    # Count events needing prep (within 7 days)
    events_this_week = [e for e in events if 0 <= e.get("daysAway", 99) <= 7]

    # Today's summary for the hero
    todays_summary = {
        "athleteCount": len(roster),
        "needingAction": len(needing_action),
        "upcomingEvents": len(events_this_week),
        "directorRequests": 0,  # Will be enriched by frontend via DirectorActionsCard
    }

    # Compact summary sentences
    summary_lines = []
    momentum_drops = [a for a in needing_action if a.get("category") == "momentum_drop"]
    blockers = [a for a in needing_action if a.get("category") == "blocker"]
    engagement_drops = [a for a in needing_action if a.get("category") == "engagement_drop"]
    other_issues = [a for a in needing_action if a.get("category") not in ("momentum_drop", "blocker", "engagement_drop")]

    if momentum_drops:
        summary_lines.append(f"{len(momentum_drops)} athlete{'s' if len(momentum_drops) > 1 else ''} {'have' if len(momentum_drops) > 1 else 'has'} momentum drop")
    if blockers:
        summary_lines.append(f"{len(blockers)} athlete{'s' if len(blockers) > 1 else ''} {'have' if len(blockers) > 1 else 'has'} a blocker")
    if engagement_drops:
        summary_lines.append(f"{len(engagement_drops)} athlete{'s' if len(engagement_drops) > 1 else ''} {'have' if len(engagement_drops) > 1 else 'has'} engagement drop")
    if other_issues:
        summary_lines.append(f"{len(other_issues)} athlete{'s' if len(other_issues) > 1 else ''} need{'s' if len(other_issues) == 1 else ''} attention")
    events_prep = [e for e in events_this_week if e.get("daysAway", 99) <= 3]
    if events_prep:
        summary_lines.append(f"{len(events_prep)} event{'s' if len(events_prep) > 1 else ''} require{'s' if len(events_prep) == 1 else ''} prep")
    if not summary_lines:
        summary_lines.append("All athletes are on track today")

    return {
        "role": "club_coach",
        "todays_summary": todays_summary,
        "summary_lines": summary_lines,
        "priorities": priorities,
        "myRoster": roster,
        "upcomingEvents": upcoming,
        "recentActivity": activity,
    }


async def _enrich_roster_with_school_alerts(roster: list):
    """Add school-level alert counts to each athlete in the roster.

    Queries target_programs, program_metrics, and pod_action_events
    to compute how many schools are in at-risk/needs-attention states.
    Uses the same classify_school_health logic as the school pod endpoints.
    """
    from routers.school_pod import classify_school_health

    if not roster:
        return

    athlete_ids = [a["id"] for a in roster]
    now = datetime.now(timezone.utc)

    # Batch: get all target programs for all athletes
    all_programs = await db.programs.find(
        {"athlete_id": {"$in": athlete_ids}},
        {"_id": 0, "athlete_id": 1, "program_id": 1, "university_name": 1,
         "recruiting_status": 1, "reply_status": 1}
    ).to_list(500)

    # Group programs by athlete
    athlete_programs = {}
    all_program_ids = []
    for p in all_programs:
        aid = p["athlete_id"]
        athlete_programs.setdefault(aid, []).append(p)
        all_program_ids.append(p["program_id"])

    # Batch: get all metrics
    metrics_docs = await db.program_metrics.find(
        {"program_id": {"$in": all_program_ids}},
        {"_id": 0, "program_id": 1, "pipeline_health_state": 1,
         "overdue_followups": 1, "engagement_freshness_label": 1,
         "days_since_last_engagement": 1}
    ).to_list(500)
    metrics_map = {m["program_id"]: m for m in metrics_docs}

    # Batch: get most recent timeline event per program
    last_event_pipeline = [
        {"$match": {"athlete_id": {"$in": athlete_ids},
                     "program_id": {"$in": all_program_ids}}},
        {"$sort": {"created_at": -1}},
        {"$group": {"_id": {"athlete_id": "$athlete_id", "program_id": "$program_id"},
                     "last_at": {"$first": "$created_at"}}},
    ]
    last_events = {}
    async for doc in db.pod_action_events.aggregate(last_event_pipeline):
        key = (doc["_id"]["athlete_id"], doc["_id"]["program_id"])
        last_events[key] = doc["last_at"]

    # For each athlete, count school-level alerts
    for athlete in roster:
        aid = athlete["id"]
        programs = athlete_programs.get(aid, [])
        alert_count = 0
        alert_schools = []

        for p in programs:
            pid = p["program_id"]
            m = metrics_map.get(pid, {})

            # Compute actual days since contact
            last_evt = last_events.get((aid, pid))
            actual_days = None
            if last_evt:
                try:
                    if isinstance(last_evt, str):
                        lc_date = datetime.fromisoformat(last_evt.replace("Z", "+00:00"))
                    else:
                        lc_date = last_evt if last_evt.tzinfo else last_evt.replace(tzinfo=timezone.utc)
                    actual_days = (now - lc_date).days
                except Exception:
                    pass

            health = classify_school_health(p, m, actual_days_since_contact=actual_days)
            if health in _ALERT_HEALTH_STATES:
                alert_count += 1
                alert_schools.append({
                    "university_name": p.get("university_name", ""),
                    "health": health,
                })

        athlete["school_alerts"] = alert_count
        athlete["school_alert_details"] = alert_schools[:3]  # Top 3 for display

        # If athlete has school alerts but no existing category, promote them
        if alert_count > 0 and not athlete.get("category"):
            worst = alert_schools[0]
            athlete["category"] = "school_alert"
            athlete["badgeColor"] = "amber" if worst["health"] != "at_risk" else "red"
            athlete["why"] = f"{alert_count} school{'s' if alert_count > 1 else ''} need{'s' if alert_count == 1 else ''} attention — {worst['university_name']} is {worst['health'].replace('_', ' ')}"
            athlete["next_step"] = f"Review school alerts for {athlete['name'].split(' ')[0]}"


def _build_priorities_queue(needing_action, events, alerts):
    """Build a structured priority queue for the coach's work surface."""
    priorities = []

    # Critical: momentum drops, blockers
    for a in needing_action:
        cat = a.get("category", "")
        if cat in ("momentum_drop", "blocker"):
            priorities.append({
                "urgency": "critical",
                "athlete_id": a["id"],
                "athlete_name": a["name"],
                "action": _category_to_action(cat),
                "reason": a.get("why") or _category_to_reason(cat, a),
                "cta_label": "Open Pod",
                "cta_path": f"/support-pods/{a['id']}",
            })

    # Follow-up needed: engagement drop, deadline, readiness, school alerts
    for a in needing_action:
        cat = a.get("category", "")
        if cat in ("engagement_drop", "deadline_proximity", "readiness_issue", "school_alert"):
            priorities.append({
                "urgency": "follow_up",
                "athlete_id": a["id"],
                "athlete_name": a["name"],
                "action": _category_to_action(cat),
                "reason": a.get("why") or _category_to_reason(cat, a),
                "cta_label": "Open Pod",
                "cta_path": f"/support-pods/{a['id']}",
            })

    # Event prep: events in next 3 days
    for e in events:
        if e.get("daysAway", 99) <= 3 and e.get("daysAway", 99) >= 0:
            days_away = e.get("daysAway", 0)
            athlete_count = e.get("athleteCount", 0) or len(e.get("athlete_ids", []))
            if days_away == 0:
                time_label = "Today"
            elif days_away == 1:
                time_label = "In 1 day"
            else:
                time_label = f"In {days_away} days"
            priorities.append({
                "urgency": "event_prep",
                "event_id": e.get("id"),
                "event_name": e.get("name"),
                "action": f"Prepare for {e.get('name', 'event')}",
                "reason": f"{time_label} — {athlete_count} athletes attending",
                "cta_label": "Prep Event",
                "cta_path": f"/events/{e.get('id')}/prep",
            })

    return priorities


def _category_to_action(category):
    """Convert issue category to human-friendly coach action language."""
    return {
        "momentum_drop": "Check in with athlete",
        "blocker": "Remove blocker",
        "deadline_proximity": "Review upcoming deadline",
        "engagement_drop": "Re-engage athlete",
        "ownership_gap": "Assign coach ownership",
        "readiness_issue": "Review readiness gaps",
        "school_alert": "Review school alerts",
    }.get(category, "Review athlete status")


def _category_to_reason(category, athlete):
    """Generate a short reason string from category and athlete data."""
    days = athlete.get("days_since_activity", 0)
    name = athlete.get("name", "Athlete")
    return {
        "momentum_drop": f"No activity in {days} days",
        "blocker": f"{name} has an active blocker",
        "deadline_proximity": f"Deadline approaching for {name}",
        "engagement_drop": f"Engagement declining for {name}",
        "ownership_gap": f"{name} has no assigned primary coach",
        "readiness_issue": f"{name} has readiness gaps to address",
        "school_alert": f"{name} has schools needing attention",
    }.get(category, f"{name} needs attention")


# ── Sub-endpoints (kept for backward compatibility) ──

@router.get("/mission-control/alerts")
async def get_priority_alerts_endpoint(current_user: dict = get_current_user_dep()):
    return filter_by_athlete_id(get_alerts(), current_user)


@router.get("/mission-control/signals")
async def get_momentum_signals(current_user: dict = get_current_user_dep()):
    return filter_by_athlete_id(get_signals(), current_user)


@router.get("/mission-control/athletes")
async def get_athletes_attention(current_user: dict = get_current_user_dep()):
    return filter_by_athlete_id(get_needing_attention(), current_user)


@router.get("/mission-control/events")
async def get_upcoming_events(current_user: dict = get_current_user_dep()):
    return filter_events_by_ownership(UPCOMING_EVENTS, current_user)


@router.get("/mission-control/snapshot")
async def get_program_snapshot_endpoint(current_user: dict = get_current_user_dep()):
    if current_user["role"] == "director":
        return get_snapshot()
    visible = get_visible_athlete_ids(current_user)
    my_athletes = [a for a in get_athletes() if a["id"] in visible]
    return get_program_snapshot(my_athletes)

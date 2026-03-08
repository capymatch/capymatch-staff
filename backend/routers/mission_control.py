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
from mock_data import (
    PRIORITY_ALERTS,
    MOMENTUM_SIGNALS,
    UPCOMING_EVENTS,
    ATHLETES_NEEDING_ATTENTION,
    PROGRAM_SNAPSHOT,
    ALL_INTERVENTIONS,
    ATHLETES,
    get_program_snapshot,
)
from support_pod import (
    get_athlete as sp_get_athlete,
    get_athlete_interventions,
    explain_pod_health,
)
from db_client import db

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
    for item in ALL_INTERVENTIONS:
        if item["athlete_id"] == athlete["id"]:
            category = item.get("category")
            badge_color = item.get("badge_color")
            why = item.get("why_this_surfaced")
            break

    return {
        "id": athlete["id"],
        "name": athlete.get("fullName", athlete.get("name", "Unknown")),
        "gradYear": athlete.get("gradYear"),
        "position": athlete.get("position"),
        "team": athlete.get("team"),
        "momentumScore": athlete.get("momentumScore", 0),
        "momentumTrend": athlete.get("momentumTrend", "stable"),
        "recruitingStage": athlete.get("recruitingStage", "exploring"),
        "daysSinceActivity": athlete.get("daysSinceActivity", 0),
        "schoolTargets": athlete.get("schoolTargets", 0),
        "activeInterest": athlete.get("activeInterest", 0),
        "podHealth": health,
        "category": category,
        "badgeColor": badge_color,
        "why": why,
    }


@router.get("/mission-control")
async def get_mission_control_data(current_user: dict = get_current_user_dep()):
    """Role-specific Mission Control data."""

    role = current_user["role"]
    alerts = filter_by_athlete_id(PRIORITY_ALERTS, current_user)
    signals = filter_by_athlete_id(MOMENTUM_SIGNALS, current_user, athlete_id_key="athleteId")
    events = filter_events_by_ownership(UPCOMING_EVENTS, current_user)
    attention = filter_by_athlete_id(ATHLETES_NEEDING_ATTENTION, current_user)

    if role == "director":
        return await _build_director_response(alerts, attention, signals, events)
    else:
        return _build_coach_response(current_user, alerts, attention, signals, events)


async def _build_director_response(alerts, attention, signals, events):
    """Director: program oversight surface."""
    unassigned_ids = get_unassigned_athlete_ids()
    coach_map = get_coach_athlete_map()

    # Program status KPIs
    program_status = {
        "totalAthletes": len(ATHLETES),
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
        "programSnapshot": {**PROGRAM_SNAPSHOT, "unassigned_count": len(unassigned_ids)},
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
            current_issues = len(ALL_INTERVENTIONS)
            issues_delta = current_issues - prev_issues
            prev_healthy = prev.get("pod_health", {}).get("healthy", 0)
            current_healthy = PROGRAM_SNAPSHOT.get("positiveMomentum", 0)
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
        {"role": "coach"},
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
    from datetime import datetime, timezone, timedelta
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
    """Coach: personal work dashboard."""
    visible_ids = get_visible_athlete_ids(user)
    my_athletes = [a for a in ATHLETES if a["id"] in visible_ids]

    # Build roster items with health info
    roster = [_build_athlete_roster_item(a) for a in my_athletes]
    roster.sort(key=lambda a: a.get("momentumScore", 0))  # lowest momentum first

    # Count how many need action
    needing_action = len([a for a in roster if a.get("category")])

    # Today's summary for the hero
    todays_summary = {
        "athleteCount": len(roster),
        "needingAction": needing_action,
        "upcomingEvents": len([e for e in events if e.get("daysAway", 99) <= 7]),
        "alertCount": len(alerts),
    }

    # Upcoming events — next 5
    upcoming = sorted(events, key=lambda e: e.get("daysAway", 99))[:5]

    # Recent activity — latest 8
    activity = sorted(signals, key=lambda s: s.get("hoursAgo", 0))[:8]

    return {
        "role": "coach",
        "todays_summary": todays_summary,
        "myRoster": roster,
        "upcomingEvents": upcoming,
        "recentActivity": activity,
    }


# ── Sub-endpoints (kept for backward compatibility) ──

@router.get("/mission-control/alerts")
async def get_priority_alerts_endpoint(current_user: dict = get_current_user_dep()):
    return filter_by_athlete_id(PRIORITY_ALERTS, current_user)


@router.get("/mission-control/signals")
async def get_momentum_signals(current_user: dict = get_current_user_dep()):
    return filter_by_athlete_id(MOMENTUM_SIGNALS, current_user)


@router.get("/mission-control/athletes")
async def get_athletes_attention(current_user: dict = get_current_user_dep()):
    return filter_by_athlete_id(ATHLETES_NEEDING_ATTENTION, current_user)


@router.get("/mission-control/events")
async def get_upcoming_events(current_user: dict = get_current_user_dep()):
    return filter_events_by_ownership(UPCOMING_EVENTS, current_user)


@router.get("/mission-control/snapshot")
async def get_program_snapshot_endpoint(current_user: dict = get_current_user_dep()):
    if current_user["role"] == "director":
        return PROGRAM_SNAPSHOT
    visible = get_visible_athlete_ids(current_user)
    my_athletes = [a for a in ATHLETES if a["id"] in visible]
    return get_program_snapshot(my_athletes)

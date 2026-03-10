"""Program Intelligence — strategic overview + historical trending + coach views."""

from fastapi import APIRouter, Query
from db_client import db
from program_engine import compute_all as compute_program_intelligence, get_coaches
from auth_middleware import get_current_user_dep
from services.snapshots import (
    extract_snapshot_metrics,
    capture_snapshot_if_needed,
    get_previous_snapshot,
    compute_trends,
)

router = APIRouter()


@router.get("/program/coaches")
async def list_coaches(current_user: dict = get_current_user_dep()):
    """Return available coaches for the persona switcher (directors only)."""
    return get_coaches()


@router.get("/program/intelligence")
async def program_intelligence(
    coach_id: str = None,
    current_user: dict = get_current_user_dep(),
):
    """Return all 5 sections of Program Intelligence + trends.
    Directors see full program or can pick a coach_id.
    Coaches automatically see their own filtered view.
    """
    # If the user is a coach, force the view to their own data
    effective_coach_id = coach_id
    if current_user["role"] == "club_coach":
        effective_coach_id = current_user["name"]

    data = compute_program_intelligence(coach_id=effective_coach_id)

    # Trending: program-wide snapshots for director, current-only stats for coach
    if effective_coach_id:
        current_metrics = extract_snapshot_metrics(data)
        data["trends"] = _coach_trends(current_metrics, data["athlete_count"])
    else:
        current_metrics = extract_snapshot_metrics(data)
        await capture_snapshot_if_needed(db, current_metrics)
        previous = await get_previous_snapshot(db)
        data["trends"] = compute_trends(current_metrics, previous)

    return data


def _coach_trends(metrics, athlete_count):
    """Generate coach-level 'My Stats' — current values without historical delta."""
    ph = metrics["pod_health"]
    oi = metrics["open_issues"]
    ap = metrics["advocacy_pipeline"]
    fu = metrics["event_follow_up"]

    return [
        {
            "key": "pod_health", "label": "My Athletes' Health",
            "current": ph["healthy"], "suffix": f"of {athlete_count} healthy",
            "delta": 0, "direction": "current",
            "interpretation": f"{ph['at_risk']} at-risk, {ph['needs_attention']} need attention" if ph["at_risk"] > 0 else f"All {ph['healthy']} athletes healthy" if ph["needs_attention"] == 0 else f"{ph['needs_attention']} need attention",
        },
        {
            "key": "open_issues", "label": "My Open Issues",
            "current": oi["total"], "suffix": "issues",
            "delta": 0, "direction": "current",
            "interpretation": f"{oi['blockers']} blockers, {oi['momentum_drops']} momentum drops" if oi["total"] > 0 else "No active issues",
        },
        {
            "key": "overdue_actions", "label": "My Overdue",
            "current": metrics["overdue_actions"], "suffix": "overdue",
            "delta": 0, "direction": "current",
            "interpretation": "All caught up" if metrics["overdue_actions"] == 0 else f"{metrics['overdue_actions']} actions past due — review priority",
        },
        {
            "key": "advocacy_outcomes", "label": "My Advocacy",
            "current": ap["warm"], "suffix": f"of {ap['total']} warm",
            "delta": 0, "direction": "current",
            "interpretation": f"{ap['draft']} drafts, {ap['sent']} sent, {ap['warm']} warm responses" if ap["total"] > 0 else "No active recommendations",
        },
        {
            "key": "follow_up_completion", "label": "My Follow-ups",
            "current": fu["completion_pct"], "suffix": "% complete",
            "delta": 0, "direction": "current",
            "interpretation": f"{fu['completed']} of {fu['total_needing']} follow-ups completed" if fu["total_needing"] > 0 else "No follow-ups needed",
        },
    ]

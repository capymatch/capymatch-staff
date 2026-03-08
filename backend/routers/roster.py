"""Roster — athlete assignment, reassignment, and roster views (director-only)."""

import logging
import os
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
import uuid

from db_client import db
from auth_middleware import get_current_user_dep
from routers.profile import compute_completeness
from models import ReassignRequest, UnassignRequest
from services.ownership import (
    refresh_ownership_cache,
    get_coach_athlete_map,
    get_unassigned_athlete_ids,
)
from mock_data import ATHLETES, ATHLETES_NEEDING_ATTENTION

log = logging.getLogger(__name__)
router = APIRouter()


def _require_director(user: dict):
    if user["role"] != "director":
        raise HTTPException(status_code=403, detail="Only directors can manage roster assignments")


def _athlete_by_id(athlete_id: str) -> dict | None:
    return next((a for a in ATHLETES if a["id"] == athlete_id), None)


async def _get_open_actions_warning(athlete_id: str, from_coach_id: str) -> list:
    """Check for open work items still owned by the previous coach."""
    warnings = []

    # Open recommendations created by the previous coach for this athlete
    open_recs = await db.recommendations.find(
        {"athlete_id": athlete_id, "created_by": from_coach_id, "status": {"$nin": ["closed"]}},
        {"_id": 0, "id": 1, "school_name": 1, "status": 1},
    ).to_list(50)
    for r in open_recs:
        warnings.append({
            "type": "recommendation",
            "id": r["id"],
            "description": f"Open recommendation to {r.get('school_name', 'unknown')} (status: {r.get('status', 'draft')})",
        })

    # Open support pod actions for this athlete owned by previous coach
    open_actions = await db.actions.find(
        {"athlete_id": athlete_id, "owner": from_coach_id, "status": {"$nin": ["completed", "dismissed"]}},
        {"_id": 0, "id": 1, "title": 1, "status": 1},
    ).to_list(50)
    for a in open_actions:
        warnings.append({
            "type": "action",
            "id": a["id"],
            "description": f"Open action: {a.get('title', 'untitled')} (status: {a.get('status', 'open')})",
        })

    return warnings


@router.get("/roster")
async def get_roster(current_user: dict = get_current_user_dep()):
    """Director view: all athletes with recruiting insights, grouped data."""
    _require_director(current_user)

    coaches = await db.users.find(
        {"role": "coach"}, {"_id": 0, "id": 1, "name": 1, "email": 1, "team": 1, "profile": 1}
    ).to_list(100)

    athlete_map = get_coach_athlete_map()
    unassigned_ids = get_unassigned_athlete_ids()

    # Build coach lookup
    coach_by_id = {c["id"]: c for c in coaches}

    # Build reverse map: athlete -> coach
    athlete_to_coach = {}
    for cid, aids in athlete_map.items():
        for aid in aids:
            athlete_to_coach[aid] = cid

    # Build enriched athlete list
    enriched_athletes = []
    for a in ATHLETES:
        cid = athlete_to_coach.get(a["id"])
        coach = coach_by_id.get(cid) if cid else None
        enriched_athletes.append({
            "id": a["id"],
            "name": a.get("fullName", a.get("name", "Unknown")),
            "grad_year": a.get("gradYear"),
            "position": a.get("position"),
            "team": a.get("team"),
            "recruiting_stage": a.get("recruitingStage"),
            "momentum_score": a.get("momentumScore"),
            "momentum_trend": a.get("momentumTrend"),
            "last_activity": a.get("lastActivity"),
            "days_since_activity": a.get("daysSinceActivity"),
            "coach_id": cid,
            "coach_name": coach["name"] if coach else None,
            "unassigned": a["id"] in unassigned_ids,
            "unassigned_reason": a.get("unassigned_reason") if a["id"] in unassigned_ids else None,
        })

    # Needs attention athletes (from decision engine)
    attention_ids = {item["athlete_id"] for item in ATHLETES_NEEDING_ATTENTION}
    attention_lookup = {}
    for item in ATHLETES_NEEDING_ATTENTION:
        aid = item["athlete_id"]
        if aid not in attention_lookup:
            attention_lookup[aid] = {
                "category": item.get("category"),
                "why": item.get("why_this_surfaced"),
                "badge_color": item.get("badge_color"),
            }

    # Coach groups (for Coach View)
    groups = []
    if unassigned_ids:
        unassigned_athletes = [a for a in enriched_athletes if a["unassigned"]]
        groups.append({
            "coach_id": None, "coach_name": "Unassigned", "coach_email": None,
            "coach_team": None, "athletes": unassigned_athletes, "count": len(unassigned_athletes),
        })
    for coach in coaches:
        cid = coach["id"]
        coach_athletes = [a for a in enriched_athletes if a["coach_id"] == cid]
        groups.append({
            "coach_id": cid, "coach_name": coach["name"], "coach_email": coach["email"],
            "coach_team": coach.get("team"),
            "coach_contact_method": (coach.get("profile") or {}).get("contact_method"),
            "coach_availability": (coach.get("profile") or {}).get("availability"),
            "athletes": coach_athletes, "count": len(coach_athletes),
        })

    # Team groups (for Team View)
    team_map = {}
    for a in enriched_athletes:
        team = a.get("team") or "No Team"
        if team not in team_map:
            team_map[team] = []
        team_map[team].append(a)
    team_groups = [{"team": t, "athletes": ats, "count": len(ats)} for t, ats in sorted(team_map.items())]

    # Age groups (for Age Group View)
    age_map = {}
    for a in enriched_athletes:
        gy = a.get("grad_year") or "Unknown"
        label = f"Class of {gy}"
        if label not in age_map:
            age_map[label] = []
        age_map[label].append(a)
    age_groups = [{"label": l, "athletes": ats, "count": len(ats)} for l, ats in sorted(age_map.items())]

    total = len(ATHLETES)
    return {
        "athletes": enriched_athletes,
        "groups": groups,
        "teamGroups": team_groups,
        "ageGroups": age_groups,
        "needsAttention": [
            {**attention_lookup[a["id"]], "athlete_id": a["id"], "athlete_name": a["name"]}
            for a in enriched_athletes if a["id"] in attention_ids
        ],
        "summary": {
            "total_athletes": total,
            "assigned": total - len(unassigned_ids),
            "unassigned": len(unassigned_ids),
            "coach_count": len(coaches),
            "teams": len(team_map),
        },
    }


@router.get("/roster/coaches")
async def list_coaches(current_user: dict = get_current_user_dep()):
    """List all coaches (for reassignment dropdowns)."""
    _require_director(current_user)
    coaches = await db.users.find(
        {"role": "coach"}, {"_id": 0, "id": 1, "name": 1, "email": 1, "team": 1}
    ).to_list(100)
    return coaches


@router.post("/athletes/{athlete_id}/reassign")
async def reassign_athlete(
    athlete_id: str,
    body: ReassignRequest,
    current_user: dict = get_current_user_dep(),
):
    """Reassign an athlete from one coach to another. Director-only."""
    _require_director(current_user)

    # Validate athlete exists
    athlete = _athlete_by_id(athlete_id)
    if not athlete:
        raise HTTPException(status_code=404, detail="Athlete not found")

    # Validate target coach exists and is a coach
    new_coach = await db.users.find_one(
        {"id": body.new_coach_id, "role": "coach"}, {"_id": 0, "id": 1, "name": 1}
    )
    if not new_coach:
        raise HTTPException(status_code=404, detail="Target coach not found")

    # Get current coach info
    from_coach_id = athlete.get("primary_coach_id")
    from_coach_name = None
    if from_coach_id:
        from_coach = await db.users.find_one({"id": from_coach_id}, {"_id": 0, "name": 1})
        from_coach_name = from_coach["name"] if from_coach else from_coach_id

    if from_coach_id == body.new_coach_id:
        raise HTTPException(status_code=400, detail="Athlete is already assigned to this coach")

    # Check for open work items
    open_warnings = []
    if from_coach_id:
        open_warnings = await _get_open_actions_warning(athlete_id, from_coach_id)

    # Perform reassignment in DB
    await db.athletes.update_one(
        {"id": athlete_id},
        {"$set": {"primary_coach_id": body.new_coach_id, "unassigned_reason": None}}
    )

    # Update in-memory ATHLETES list
    for a in ATHLETES:
        if a["id"] == athlete_id:
            a["primary_coach_id"] = body.new_coach_id
            a.pop("unassigned_reason", None)
            break

    # Write reassignment log (structured for timeline display)
    log_entry = {
        "id": str(uuid.uuid4()),
        "athlete_id": athlete_id,
        "athlete_name": athlete.get("fullName", athlete.get("name", "Unknown")),
        "type": "reassign",
        "from_coach_id": from_coach_id,
        "from_coach_name": from_coach_name,
        "to_coach_id": body.new_coach_id,
        "to_coach_name": new_coach["name"],
        "reassigned_by": current_user["id"],
        "reassigned_by_name": current_user["name"],
        "reason": body.reason,
        "open_actions_at_time": len(open_warnings),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.reassignment_log.insert_one(log_entry)
    log_entry.pop("_id", None)

    # Refresh cache
    await refresh_ownership_cache()

    return {
        "status": "reassigned",
        "athlete_id": athlete_id,
        "athlete_name": athlete.get("fullName", athlete.get("name")),
        "from_coach": from_coach_name,
        "to_coach": new_coach["name"],
        "open_actions_warning": open_warnings,
        "log_entry": log_entry,
    }


@router.post("/athletes/{athlete_id}/unassign")
async def unassign_athlete(
    athlete_id: str,
    body: UnassignRequest,
    current_user: dict = get_current_user_dep(),
):
    """Remove coach assignment from an athlete. Director-only."""
    _require_director(current_user)

    athlete = _athlete_by_id(athlete_id)
    if not athlete:
        raise HTTPException(status_code=404, detail="Athlete not found")

    from_coach_id = athlete.get("primary_coach_id")
    if not from_coach_id:
        raise HTTPException(status_code=400, detail="Athlete is already unassigned")

    from_coach = await db.users.find_one({"id": from_coach_id}, {"_id": 0, "name": 1})
    from_coach_name = from_coach["name"] if from_coach else from_coach_id

    # Check for open work
    open_warnings = await _get_open_actions_warning(athlete_id, from_coach_id)

    # Perform unassignment
    await db.athletes.update_one(
        {"id": athlete_id},
        {"$set": {"primary_coach_id": None, "unassigned_reason": body.reason or "manually_unassigned"}}
    )

    for a in ATHLETES:
        if a["id"] == athlete_id:
            a["primary_coach_id"] = None
            a["unassigned_reason"] = body.reason or "manually_unassigned"
            break

    # Write log
    log_entry = {
        "id": str(uuid.uuid4()),
        "athlete_id": athlete_id,
        "athlete_name": athlete.get("fullName", athlete.get("name", "Unknown")),
        "type": "unassign",
        "from_coach_id": from_coach_id,
        "from_coach_name": from_coach_name,
        "to_coach_id": None,
        "to_coach_name": None,
        "reassigned_by": current_user["id"],
        "reassigned_by_name": current_user["name"],
        "reason": body.reason or "manually_unassigned",
        "open_actions_at_time": len(open_warnings),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.reassignment_log.insert_one(log_entry)
    log_entry.pop("_id", None)

    await refresh_ownership_cache()

    return {
        "status": "unassigned",
        "athlete_id": athlete_id,
        "athlete_name": athlete.get("fullName", athlete.get("name")),
        "from_coach": from_coach_name,
        "open_actions_warning": open_warnings,
        "log_entry": log_entry,
    }


@router.get("/athletes/{athlete_id}/reassignment-history")
async def get_reassignment_history(
    athlete_id: str,
    current_user: dict = get_current_user_dep(),
):
    """Get reassignment history for an athlete (for timeline display)."""
    _require_director(current_user)

    entries = await db.reassignment_log.find(
        {"athlete_id": athlete_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)

    return entries


# ── Coach Activation / Engagement ──────────────────────────────────────────


def _derive_status(coach_data: dict) -> str:
    """Derive a concise activation status label for a coach."""
    invite_status = coach_data.get("invite_status")
    if invite_status == "pending":
        return "pending"

    onboarding = coach_data.get("onboarding_progress", 0)
    total_steps = coach_data.get("onboarding_total", 5)
    has_activity = coach_data.get("has_first_activity", False)
    last_active = coach_data.get("last_active")

    # Needs support: accepted 3+ days ago but zero onboarding or no activity in 14 days
    accepted_at = coach_data.get("accepted_at")
    if accepted_at:
        try:
            accepted_dt = datetime.fromisoformat(accepted_at)
            days_since_accept = (datetime.now(timezone.utc) - accepted_dt).days
        except Exception:
            days_since_accept = 0
    else:
        days_since_accept = 0

    if last_active:
        try:
            last_dt = datetime.fromisoformat(last_active)
            days_inactive = (datetime.now(timezone.utc) - last_dt).days
        except Exception:
            days_inactive = 999
    else:
        days_inactive = 999

    if days_since_accept >= 3 and onboarding == 0:
        return "needs_support"
    if days_inactive >= 14 and invite_status == "accepted":
        return "needs_support"

    # Active: onboarding complete or has recent activity
    if onboarding >= total_steps or (has_activity and days_inactive < 7):
        return "active"

    # Activating: accepted but still working through onboarding
    if invite_status == "accepted":
        return "activating"

    # Seed coaches without invite — check activity
    if has_activity:
        return "active"
    return "activating"


@router.get("/roster/activation")
async def get_coach_activation(current_user: dict = get_current_user_dep()):
    """Director: overview of coach activation and engagement signals."""
    _require_director(current_user)

    # Get all coaches
    coaches = await db.users.find(
        {"role": "coach"},
        {"_id": 0, "id": 1, "name": 1, "email": 1, "team": 1,
         "created_at": 1, "onboarding": 1, "last_active": 1, "profile": 1},
    ).to_list(100)

    # Get all invites for cross-referencing
    invites = await db.invites.find(
        {}, {"_id": 0, "email": 1, "status": 1, "accepted_at": 1,
             "accepted_user_id": 1, "team": 1}
    ).to_list(200)

    # Get latest nudge per coach
    nudge_pipeline = [
        {"$sort": {"sent_at": -1}},
        {"$group": {"_id": "$coach_id", "sent_at": {"$first": "$sent_at"},
                     "delivery_status": {"$first": "$delivery_status"}}},
    ]
    nudge_docs = await db.nudges.aggregate(nudge_pipeline).to_list(200)
    nudge_map = {n["_id"]: n for n in nudge_docs}
    invite_by_email = {}
    for inv in invites:
        # Keep the most relevant invite per email (accepted > pending > others)
        existing = invite_by_email.get(inv["email"])
        if not existing or inv["status"] == "accepted" or (
            inv["status"] == "pending" and existing.get("status") not in ("accepted",)
        ):
            invite_by_email[inv["email"]] = inv

    # Athlete counts per coach
    athlete_map = get_coach_athlete_map()

    # Check for first activity per coach (notes, actions, event_notes)
    result = []
    for coach in coaches:
        cid = coach["id"]
        onboarding = coach.get("onboarding") or {}
        completed_steps = onboarding.get("completed_steps", [])

        # Cross-ref invite
        invite = invite_by_email.get(coach["email"])
        invite_status = invite["status"] if invite else None
        accepted_at = invite.get("accepted_at") if invite else None

        # First activity detection
        first_note = await db.athlete_notes.find_one(
            {"created_by": cid}, {"_id": 0, "created_at": 1}
        )
        first_action = await db.actions.find_one(
            {"$or": [{"created_by": cid}, {"completed_by": cid}]},
            {"_id": 0, "created_at": 1},
        )
        first_event_note = await db.event_notes.find_one(
            {"created_by": cid}, {"_id": 0, "created_at": 1}
        )

        # Earliest activity timestamp
        activity_dates = []
        for item in [first_note, first_action, first_event_note]:
            if item and item.get("created_at"):
                activity_dates.append(item["created_at"])
        first_activity_at = min(activity_dates) if activity_dates else None
        has_first_activity = len(activity_dates) > 0

        # Last active = latest of last_active field, onboarding update, or activity
        last_active = coach.get("last_active")
        if not last_active and activity_dates:
            last_active = max(activity_dates)

        athlete_count = len(athlete_map.get(cid, set()))

        coach_data = {
            "id": cid,
            "name": coach["name"],
            "email": coach["email"],
            "team": coach.get("team"),
            "invite_status": invite_status,
            "accepted_at": accepted_at,
            "created_at": coach.get("created_at"),
            "onboarding_progress": len(completed_steps),
            "onboarding_total": 5,
            "onboarding_dismissed": onboarding.get("dismissed", False),
            "onboarding_completed_at": onboarding.get("completed_at"),
            "athlete_count": athlete_count,
            "has_first_activity": has_first_activity,
            "first_activity_at": first_activity_at,
            "last_active": last_active,
            "last_nudge_at": None,
            "last_nudge_status": None,
            "profile_completeness": compute_completeness(coach),
        }

        # Add nudge info
        nudge_info = nudge_map.get(cid)
        if nudge_info:
            coach_data["last_nudge_at"] = nudge_info.get("sent_at")
            coach_data["last_nudge_status"] = nudge_info.get("delivery_status")

        coach_data["status"] = _derive_status(coach_data)
        result.append(coach_data)

    # Sort: needs_support first, then pending, then activating, then active
    status_order = {"needs_support": 0, "pending": 1, "activating": 2, "active": 3}
    result.sort(key=lambda c: status_order.get(c["status"], 99))

    # Summary counts
    counts = {"pending": 0, "activating": 0, "active": 0, "needs_support": 0}
    for c in result:
        counts[c["status"]] = counts.get(c["status"], 0) + 1

    return {"coaches": result, "summary": counts, "total": len(result)}


# ── Nudge Coach ────────────────────────────────────────────────────────────

NUDGE_COOLDOWN_HOURS = 24

REASON_PRESETS = {
    "onboarding_incomplete": "Onboarding incomplete",
    "no_recent_activity": "No recent activity",
    "needs_help": "Needs help getting started",
    "custom": "Custom",
}


def _build_nudge_html(coach_name: str, director_name: str, message: str) -> str:
    # Convert newlines to <br> for HTML
    html_message = message.replace("\n", "<br/>")
    return f"""
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:32px 0;">
      <div style="background:#0f172a;border-radius:12px 12px 0 0;padding:24px 28px;text-align:center;">
        <div style="width:36px;height:36px;background:rgba(255,255,255,0.1);border-radius:8px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
          <span style="color:#fff;font-weight:700;font-size:13px;">CM</span>
        </div>
        <h1 style="margin:0;color:#fff;font-size:18px;font-weight:600;">CapyMatch</h1>
      </div>
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:28px;">
        <p style="margin:0 0 16px;font-size:14px;color:#111827;line-height:1.6;">{html_message}</p>
        <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;text-align:center;">
          Sent via CapyMatch by {director_name}
        </p>
      </div>
    </div>
    """


@router.post("/roster/nudge")
async def nudge_coach(body: dict, current_user: dict = get_current_user_dep()):
    """Director: send a supportive check-in email to a coach."""
    _require_director(current_user)

    coach_id = body.get("coach_id")
    subject = body.get("subject", "").strip()
    message = body.get("message", "").strip()
    reason = body.get("reason", "custom")

    if not coach_id or not subject or not message:
        raise HTTPException(status_code=400, detail="coach_id, subject, and message are required")

    if reason not in REASON_PRESETS:
        reason = "custom"

    # Validate coach exists
    coach = await db.users.find_one(
        {"id": coach_id, "role": "coach"},
        {"_id": 0, "id": 1, "name": 1, "email": 1},
    )
    if not coach:
        raise HTTPException(status_code=404, detail="Coach not found")

    # Check cooldown
    last_nudge = await db.nudges.find_one(
        {"coach_id": coach_id},
        {"_id": 0, "sent_at": 1},
        sort=[("sent_at", -1)],
    )
    if last_nudge and last_nudge.get("sent_at"):
        try:
            last_dt = datetime.fromisoformat(last_nudge["sent_at"])
            hours_since = (datetime.now(timezone.utc) - last_dt).total_seconds() / 3600
            if hours_since < NUDGE_COOLDOWN_HOURS:
                raise HTTPException(
                    status_code=429,
                    detail=f"Cooldown active — last nudge sent {int(hours_since)}h ago. Try again in {int(NUDGE_COOLDOWN_HOURS - hours_since)}h.",
                )
        except HTTPException:
            raise
        except Exception:
            pass

    # Send email via Resend
    import resend
    import asyncio

    from_email = os.environ.get("RESEND_FROM_EMAIL", "onboarding@resend.dev")
    html = _build_nudge_html(coach["name"], current_user["name"], message)

    now = datetime.now(timezone.utc).isoformat()
    nudge_doc = {
        "id": str(uuid.uuid4()),
        "coach_id": coach_id,
        "coach_email": coach["email"],
        "coach_name": coach["name"],
        "sent_by": current_user["id"],
        "sent_by_name": current_user["name"],
        "reason": reason,
        "reason_label": REASON_PRESETS.get(reason, reason),
        "subject": subject,
        "message": message,
        "delivery_status": "pending",
        "last_error": None,
        "sent_at": now,
    }

    try:
        result = await asyncio.to_thread(resend.Emails.send, {
            "from": from_email,
            "to": [coach["email"]],
            "subject": subject,
            "html": html,
        })
        email_id = result.get("id") if isinstance(result, dict) else getattr(result, "id", None)
        nudge_doc["delivery_status"] = "sent"
        nudge_doc["email_id"] = email_id
        log.info(f"Nudge sent to {coach['email']}, id={email_id}")
    except Exception as e:
        nudge_doc["delivery_status"] = "failed"
        nudge_doc["last_error"] = str(e)
        log.error(f"Failed to send nudge to {coach['email']}: {e}")

    await db.nudges.insert_one(nudge_doc)
    nudge_doc.pop("_id", None)

    return {
        "status": nudge_doc["delivery_status"],
        "nudge_id": nudge_doc["id"],
        "coach_name": coach["name"],
        "sent_at": now,
        "last_error": nudge_doc["last_error"],
    }


@router.get("/roster/nudge-history/{coach_id}")
async def get_nudge_history(coach_id: str, current_user: dict = get_current_user_dep()):
    """Director: get nudge history for a specific coach."""
    _require_director(current_user)

    nudges = await db.nudges.find(
        {"coach_id": coach_id}, {"_id": 0}
    ).sort("sent_at", -1).to_list(20)

    return nudges

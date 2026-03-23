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
from services.athlete_store import (
    get_all as get_athletes,
    get_by_id as get_athlete_by_id,
    get_needing_attention,
    recompute_derived_data,
)

log = logging.getLogger(__name__)
router = APIRouter()


def _require_director(user: dict):
    if user["role"] != "director":
        raise HTTPException(status_code=403, detail="Only directors can manage roster assignments")


async def _athlete_by_id(athlete_id: str) -> dict | None:
    return await get_athlete_by_id(athlete_id)


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
        {"role": "club_coach"}, {"_id": 0, "id": 1, "name": 1, "email": 1, "team": 1, "profile": 1}
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
    for a in await get_athletes():
        cid = athlete_to_coach.get(a["id"])
        coach = coach_by_id.get(cid) if cid else None

        # Momentum label: Strong / Stable / Declining
        mscore = a.get("momentum_score", 0) or 0
        mtrend = a.get("momentum_trend", "stable")
        days_inactive = a.get("days_since_activity")
        if mtrend == "rising" and mscore >= 5:
            momentum_label = "strong"
        elif mscore <= 0 or (mtrend == "declining" and (days_inactive or 0) > 10):
            momentum_label = "declining"
        else:
            momentum_label = "stable"

        # Detailed recruiting stage pipeline (7-stage)
        raw_stage = a.get("recruiting_stage", "exploring")
        active_interest = a.get("active_interest", 0) or 0
        school_targets = a.get("school_targets", 0) or 0
        if raw_stage == "committed":
            detailed_stage = "committed"
        elif raw_stage == "narrowing" and active_interest >= 3:
            detailed_stage = "offer"
        elif raw_stage == "narrowing":
            detailed_stage = "visit"
        elif raw_stage == "actively_recruiting" and active_interest >= 2:
            detailed_stage = "talking"
        elif raw_stage == "actively_recruiting" and active_interest >= 1:
            detailed_stage = "responded"
        elif raw_stage == "actively_recruiting":
            detailed_stage = "contacted"
        elif school_targets > 0:
            detailed_stage = "contacted"
        else:
            detailed_stage = "prospect"

        enriched_athletes.append({
            "id": a["id"],
            "name": a.get("full_name", a.get("name", "Unknown")),
            "grad_year": a.get("grad_year"),
            "position": a.get("position"),
            "team": a.get("team"),
            "photo_url": a.get("photo_url", ""),
            "recruiting_stage": detailed_stage,
            "momentum_score": mscore,
            "momentum_trend": mtrend,
            "momentum_label": momentum_label,
            "last_activity": a.get("last_activity"),
            "days_since_activity": days_inactive,
            "coach_id": cid,
            "coach_name": coach["name"] if coach else None,
            "unassigned": a["id"] in unassigned_ids,
            "unassigned_reason": a.get("unassigned_reason") if a["id"] in unassigned_ids else None,
        })

    # Needs attention — build per-athlete risk alerts
    needing_attn = await get_needing_attention()
    attention_ids = {item["athlete_id"] for item in needing_attn}
    attention_lookup = {}
    for item in needing_attn:
        aid = item["athlete_id"]
        if aid not in attention_lookup:
            attention_lookup[aid] = []
        attention_lookup[aid].append({
            "category": item.get("category"),
            "why": item.get("why_this_surfaced"),
            "badge_color": item.get("badge_color"),
        })

    # Attach risk alerts inline to each athlete
    for ea in enriched_athletes:
        alerts = attention_lookup.get(ea["id"])
        if alerts:
            ea["risk_alerts"] = alerts
            ea["risk_level"] = "critical" if any(a["badge_color"] == "red" for a in alerts) else "warning"
        else:
            ea["risk_alerts"] = []
            ea["risk_level"] = None

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

    # Include empty teams from club_teams collection
    club_teams_docs = await db.club_teams.find({}, {"_id": 0, "name": 1}).to_list(100)
    for ct in club_teams_docs:
        if ct["name"] not in team_map:
            team_map[ct["name"]] = []

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

    total = len(await get_athletes())
    return {
        "athletes": enriched_athletes,
        "groups": groups,
        "teamGroups": team_groups,
        "ageGroups": age_groups,
        "needsAttention": [
            {"athlete_id": ea["id"], "athlete_name": ea["name"], "alerts": ea["risk_alerts"], "risk_level": ea["risk_level"]}
            for ea in enriched_athletes if ea["risk_level"]
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
        {"role": "club_coach"}, {"_id": 0, "id": 1, "name": 1, "email": 1, "team": 1}
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
    athlete = await _athlete_by_id(athlete_id)
    if not athlete:
        raise HTTPException(status_code=404, detail="Athlete not found")

    # Validate target coach exists and is a coach
    new_coach = await db.users.find_one(
        {"id": body.new_coach_id, "role": "club_coach"}, {"_id": 0, "id": 1, "name": 1}
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

    # Write reassignment log (structured for timeline display)
    log_entry = {
        "id": str(uuid.uuid4()),
        "athlete_id": athlete_id,
        "athlete_name": athlete.get("full_name", athlete.get("name", "Unknown")),
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

    # Refresh caches from DB
    await recompute_derived_data()
    await refresh_ownership_cache()

    return {
        "status": "reassigned",
        "athlete_id": athlete_id,
        "athlete_name": athlete.get("full_name", athlete.get("name")),
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

    athlete = await _athlete_by_id(athlete_id)
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

    # Write log
    log_entry = {
        "id": str(uuid.uuid4()),
        "athlete_id": athlete_id,
        "athlete_name": athlete.get("full_name", athlete.get("name", "Unknown")),
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

    await recompute_derived_data()
    await refresh_ownership_cache()

    return {
        "status": "unassigned",
        "athlete_id": athlete_id,
        "athlete_name": athlete.get("full_name", athlete.get("name")),
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
        except Exception as e:  # noqa: E722
            log.debug("Non-critical error (handled): %s", e)
            days_since_accept = 0
    else:
        days_since_accept = 0

    if last_active:
        try:
            last_dt = datetime.fromisoformat(last_active)
            days_inactive = (datetime.now(timezone.utc) - last_dt).days
        except Exception as e:  # noqa: E722
            log.debug("Non-critical error (handled): %s", e)
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
        {"role": "club_coach"},
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
        {"id": coach_id, "role": "club_coach"},
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
        except Exception as e:  # noqa: E722
            log.debug("Non-critical error (silenced): %s", e)
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


# ── Bulk Operations ──

@router.post("/roster/bulk-assign")
async def bulk_assign(body: dict, current_user: dict = get_current_user_dep()):
    """Bulk reassign multiple athletes to a coach. Director-only."""
    _require_director(current_user)

    athlete_ids = body.get("athlete_ids", [])
    coach_id = body.get("coach_id")
    if not athlete_ids or not coach_id:
        raise HTTPException(status_code=400, detail="athlete_ids and coach_id required")

    coach = await db.users.find_one({"id": coach_id, "role": "club_coach"}, {"_id": 0, "id": 1, "name": 1})
    if not coach:
        raise HTTPException(status_code=404, detail="Coach not found")

    updated = 0
    for aid in athlete_ids:
        athlete = await _athlete_by_id(aid)
        if not athlete:
            continue
        if athlete.get("primary_coach_id") == coach_id:
            continue
        await db.athletes.update_one(
            {"id": aid},
            {"$set": {"primary_coach_id": coach_id, "unassigned_reason": None}},
        )
        updated += 1

    await recompute_derived_data()
    await refresh_ownership_cache()
    return {"updated": updated, "coach_name": coach["name"]}


@router.post("/roster/bulk-remind")
async def bulk_remind(body: dict, current_user: dict = get_current_user_dep()):
    """Bulk send reminders for multiple athletes. Director-only."""
    _require_director(current_user)

    athlete_ids = body.get("athlete_ids", [])
    message = body.get("message", "Please follow up on this athlete.")
    if not athlete_ids:
        raise HTTPException(status_code=400, detail="athlete_ids required")

    from datetime import datetime, timezone
    reminders = []
    for aid in athlete_ids:
        athlete = await _athlete_by_id(aid)
        if not athlete:
            continue
        reminders.append({
            "athlete_id": aid,
            "athlete_name": athlete.get("full_name", athlete.get("name", "Unknown")),
            "message": message,
            "created_by": current_user["id"],
            "created_by_name": current_user.get("name", "Director"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "type": "reminder",
        })

    if reminders:
        await db.coach_notes.insert_many(reminders)

    return {"sent": len(reminders)}


@router.post("/roster/bulk-note")
async def bulk_note(body: dict, current_user: dict = get_current_user_dep()):
    """Bulk add a note to multiple athletes. Director-only."""
    _require_director(current_user)

    athlete_ids = body.get("athlete_ids", [])
    note_text = body.get("note", "")
    if not athlete_ids or not note_text:
        raise HTTPException(status_code=400, detail="athlete_ids and note required")

    from datetime import datetime, timezone
    notes = []
    for aid in athlete_ids:
        athlete = await _athlete_by_id(aid)
        if not athlete:
            continue
        notes.append({
            "athlete_id": aid,
            "athlete_name": athlete.get("full_name", athlete.get("name", "Unknown")),
            "text": note_text,
            "created_by": current_user["id"],
            "created_by_name": current_user.get("name", "Director"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "type": "director_note",
        })

    if notes:
        await db.coach_notes.insert_many(notes)

    return {"added": len(notes)}



# ══════════════════════════════════════════════════════════════
# Team & Athlete Management (Director)
# ══════════════════════════════════════════════════════════════

@router.post("/roster/teams")
async def create_team(request_body: dict, current_user: dict = get_current_user_dep()):
    """Create a new team. Director-only."""
    from fastapi import Request
    _require_director(current_user)

    name = (request_body.get("name") or "").strip()
    age_group = (request_body.get("age_group") or "").strip()
    coach_id = request_body.get("coach_id")

    if not name:
        raise HTTPException(400, "Team name is required")

    # Check for duplicate team name
    existing = await db.athletes.find_one({"team": name})
    existing_club = await db.club_teams.find_one({"name": name})
    if existing or existing_club:
        raise HTTPException(400, f"Team '{name}' already exists")

    team_doc = {
        "id": str(uuid.uuid4()),
        "name": name,
        "age_group": age_group,
        "coach_id": coach_id or None,
        "org_id": current_user.get("org_id"),
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.club_teams.insert_one(team_doc)
    team_doc.pop("_id", None)

    # If coach assigned, update coach's team field
    if coach_id:
        coach = await db.users.find_one({"id": coach_id, "role": "club_coach"}, {"_id": 0, "name": 1})
        if coach:
            team_doc["coach_name"] = coach["name"]

    return {"ok": True, "team": team_doc}


@router.get("/roster/athletes/search")
async def search_athletes(q: str = "", current_user: dict = get_current_user_dep()):
    """Search athletes by name for autocomplete. Director-only."""
    _require_director(current_user)

    if not q or len(q) < 2:
        return []

    results = await db.athletes.find(
        {"full_name": {"$regex": q, "$options": "i"}},
        {"_id": 0, "id": 1, "full_name": 1, "position": 1, "team": 1, "photo_url": 1, "grad_year": 1}
    ).limit(10).to_list(10)

    return [
        {
            "id": r["id"],
            "name": r.get("full_name", "Unknown"),
            "position": r.get("position", ""),
            "team": r.get("team", ""),
            "photo_url": r.get("photo_url", ""),
            "grad_year": r.get("grad_year"),
        }
        for r in results
    ]


@router.post("/roster/teams/{team_name}/add-athlete")
async def add_athlete_to_team(team_name: str, request_body: dict, current_user: dict = get_current_user_dep()):
    """Move an existing athlete to this team. Director-only."""
    _require_director(current_user)

    athlete_id = request_body.get("athlete_id")
    if not athlete_id:
        raise HTTPException(400, "athlete_id is required")

    athlete = await db.athletes.find_one({"id": athlete_id}, {"_id": 0, "id": 1, "full_name": 1, "team": 1})
    if not athlete:
        raise HTTPException(404, "Athlete not found")

    await db.athletes.update_one(
        {"id": athlete_id},
        {"$set": {"team": team_name, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    await recompute_derived_data()

    return {"ok": True, "athlete_id": athlete_id, "team": team_name, "name": athlete.get("full_name")}


@router.post("/roster/teams/{team_name}/invite")
async def invite_athlete_to_team(team_name: str, request_body: dict, current_user: dict = get_current_user_dep()):
    """Invite a new athlete by email to join a team. Director-only."""
    import bcrypt
    _require_director(current_user)

    email = (request_body.get("email") or "").strip().lower()
    name = (request_body.get("name") or "").strip()

    if not email:
        raise HTTPException(400, "Email is required")
    if not name:
        raise HTTPException(400, "Name is required")

    # Check if user already exists
    existing = await db.users.find_one({"email": email})
    if existing:
        # Check if they have an athlete profile
        existing_athlete = await db.athletes.find_one({"email": email}, {"_id": 0, "id": 1, "full_name": 1})
        if existing_athlete:
            # Just move them to the team
            await db.athletes.update_one(
                {"id": existing_athlete["id"]},
                {"$set": {"team": team_name, "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            await recompute_derived_data()
            return {"ok": True, "action": "moved", "athlete_name": existing_athlete.get("full_name"), "team": team_name}
        raise HTTPException(400, f"A user with this email exists but has no athlete profile")

    # Create user account
    org_id = current_user.get("org_id", "org-capymatch-default")
    temp_password = f"welcome-{uuid.uuid4().hex[:8]}"
    hashed = bcrypt.hashpw(temp_password.encode(), bcrypt.gensalt()).decode()
    user_id = str(uuid.uuid4())
    tenant_id = f"tenant-{user_id}"

    parts = name.split(" ", 1)
    first_name = parts[0]
    last_name = parts[1] if len(parts) > 1 else ""

    user_doc = {
        "id": user_id,
        "email": email,
        "name": name,
        "password": hashed,
        "role": "athlete",
        "org_id": org_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)

    athlete_doc = {
        "id": f"athlete_{uuid.uuid4().hex[:8]}",
        "user_id": user_id,
        "tenant_id": tenant_id,
        "org_id": org_id,
        "email": email,
        "first_name": first_name,
        "last_name": last_name,
        "full_name": name,
        "team": team_name,
        "position": "",
        "grad_year": None,
        "photo_url": "",
        "recruiting_stage": "exploring",
        "momentum_score": 0,
        "momentum_trend": "stable",
        "school_targets": 0,
        "active_interest": 0,
        "days_since_activity": 0,
        "last_activity": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "onboarding_completed": False,
    }
    await db.athletes.insert_one(athlete_doc)
    athlete_doc.pop("_id", None)

    # Create basic subscription
    await db.subscriptions.insert_one({"tenant_id": tenant_id, "tier": "basic"})

    await recompute_derived_data()

    return {
        "ok": True,
        "action": "invited",
        "athlete_name": name,
        "email": email,
        "team": team_name,
        "temp_password": temp_password,
    }


@router.get("/roster/teams")
async def list_teams(current_user: dict = get_current_user_dep()):
    """List all teams (from athlete data + club_teams collection). Director-only."""
    _require_director(current_user)

    # Teams from athlete data
    athlete_teams = await db.athletes.distinct("team")
    athlete_teams = [t for t in athlete_teams if t]

    # Teams from club_teams collection (may be empty)
    club_teams = await db.club_teams.find({}, {"_id": 0}).to_list(100)
    club_team_names = {ct["name"] for ct in club_teams}

    all_team_names = sorted(set(athlete_teams) | club_team_names)

    teams = []
    for name in all_team_names:
        ct = next((c for c in club_teams if c["name"] == name), None)
        count = await db.athletes.count_documents({"team": name})
        teams.append({
            "name": name,
            "age_group": ct.get("age_group", "") if ct else "",
            "coach_id": ct.get("coach_id") if ct else None,
            "athlete_count": count,
        })

    return teams

import logging
"""Support Pods — treatment and coordination environment."""

log = logging.getLogger(__name__)
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone, timedelta
import uuid
from db_client import db
from auth_middleware import get_current_user_dep
from services.ownership import can_access_athlete
from models import ActionCreate, ActionUpdate, ResolveIssue
from support_pod import (
    get_athlete as sp_get_athlete,
    get_athlete_interventions,
    generate_pod_members,
    generate_suggested_actions,
    calculate_pod_health,
    get_relevant_events,
    enrich_members_with_tasks,
    generate_recruiting_timeline,
    generate_recruiting_signals,
    get_intervention_playbook,
)
from pod_issues import evaluate_issues, get_current_issue, get_all_active_issues, resolve_issue as resolve_pod_issue
from migrations.schema_v2_signals import compute_profile_completeness_detail

router = APIRouter()


async def _compute_status_intelligence(athlete_id: str, athlete: dict, interventions: list) -> dict:
    """Compute the full unified Status Intelligence for the Support Pod detail view.

    Returns journey_state, attention (primary + secondary), and human-readable explanations.
    """
    from routers.school_pod import classify_school_health
    from services.unified_status import (
        compute_journey_state,
        normalize_decision_engine_signal,
        normalize_pod_issue_signal,
        normalize_school_alert_signal,
        derive_attention_status,
        JOURNEY_STATE_MAP,
        JOURNEY_STATE_DEFAULT,
    )

    now = datetime.now(timezone.utc)
    all_signals = []

    # Source 1: Decision engine interventions
    for item in interventions:
        all_signals.append(normalize_decision_engine_signal(item))

    # Source 2: School-level health
    programs = await db.programs.find(
        {"athlete_id": athlete_id},
        {"_id": 0, "program_id": 1, "university_name": 1,
         "recruiting_status": 1, "reply_status": 1}
    ).to_list(50)

    program_ids = [p["program_id"] for p in programs]
    metrics_docs = await db.program_metrics.find(
        {"program_id": {"$in": program_ids}},
        {"_id": 0, "program_id": 1, "pipeline_health_state": 1,
         "overdue_followups": 1, "engagement_freshness_label": 1,
         "days_since_last_engagement": 1}
    ).to_list(50)
    metrics_map = {m["program_id"]: m for m in metrics_docs}

    last_events = {}
    if program_ids:
        agg = [
            {"$match": {"athlete_id": athlete_id, "program_id": {"$in": program_ids}}},
            {"$sort": {"created_at": -1}},
            {"$group": {"_id": "$program_id", "last_at": {"$first": "$created_at"}}},
        ]
        async for doc in db.pod_action_events.aggregate(agg):
            last_events[doc["_id"]] = doc["last_at"]

    for p in programs:
        pid = p["program_id"]
        m = metrics_map.get(pid, {})
        last_evt = last_events.get(pid)
        actual_days = None
        if last_evt:
            try:
                if isinstance(last_evt, str):
                    lc_date = datetime.fromisoformat(last_evt.replace("Z", "+00:00"))
                else:
                    lc_date = last_evt if last_evt.tzinfo else last_evt.replace(tzinfo=timezone.utc)
                actual_days = (now - lc_date).days
            except Exception as e:  # noqa: E722
                log.warning("Handled exception (silenced): %s", e)
                pass
        health = classify_school_health(p, m, actual_days_since_contact=actual_days)
        if health in ("at_risk", "cooling_off", "needs_attention", "needs_follow_up"):
            all_signals.append(normalize_school_alert_signal({
                "university_name": p.get("university_name", ""),
                "health": health,
                "recruiting_status": p.get("recruiting_status", ""),
            }))

    # Source 3: Active pod issues
    active_issues = await db.pod_issues.find(
        {"athlete_id": athlete_id, "status": "active"},
        {"_id": 0, "id": 1, "type": 1, "severity": 1, "title": 1}
    ).to_list(20)
    for issue in active_issues:
        all_signals.append(normalize_pod_issue_signal(issue))

    # Source 4: Missing documents / incomplete profile
    missing_docs = athlete.get("missing_documents", [])
    profile_complete = athlete.get("profile_complete", True)
    if missing_docs or not profile_complete:
        all_signals.append({
            "type": "missing_requirement",
            "severity": "medium",
            "label": "Missing requirement" if missing_docs else "Profile incomplete",
            "source": "profile",
            "reason": f"Missing: {', '.join(missing_docs)}" if missing_docs else "Athlete profile is incomplete",
            "nature": "blocker",
        })

    # Journey State
    journey_state = compute_journey_state(athlete)
    best_stage = athlete.get("pipeline_best_stage", "")
    school_count = len(programs)
    journey_explanation = _explain_journey(journey_state["label"], best_stage, school_count)

    # Attention Status
    attention = derive_attention_status(all_signals)
    attention_explanation = _explain_attention(attention)

    return {
        "journey_state": {
            **journey_state,
            "explanation": journey_explanation,
            "best_stage": best_stage,
            "school_count": school_count,
        },
        "attention": attention,
        "attention_explanation": attention_explanation,
        "signal_count": len(all_signals),
    }


def _explain_journey(label: str, best_stage: str, school_count: int) -> str:
    """Human-readable explanation of why this journey state was assigned."""
    if label == "Committed":
        return f"This athlete has committed to a school. Pipeline includes {school_count} school{'s' if school_count != 1 else ''}."
    elif label == "Offer Received":
        return f"At least one school has extended an offer. This is a strong position in the recruiting process."
    elif label == "Visiting Schools":
        return f"The furthest stage reached is {best_stage}. Campus visits signal serious mutual interest."
    elif label == "Building Interest":
        return f"Active conversations with schools at the {best_stage} stage. Interest is developing on both sides."
    elif label == "Reaching Out":
        return f"Initial contact has been made with schools. Waiting for responses and building connections."
    elif label == "Getting Started":
        return f"Schools have been added to the pipeline but outreach hasn't begun yet. {school_count} school{'s' if school_count != 1 else ''} in the list."
    return f"Currently at the {best_stage} stage across {school_count} schools."


def _explain_attention(attention: dict) -> str:
    """Human-readable explanation of why this attention status was assigned."""
    primary = attention.get("primary")
    if not primary:
        return "No issues detected across any source. All school relationships and actions are in good shape."

    total = attention.get("total_issues", 0)
    secondary = attention.get("secondary", [])

    explanation = f"The most urgent issue is: {primary['reason']}."
    if secondary:
        sources = set()
        for s in secondary:
            sources.add(s.get("nature", ""))
        source_labels = {"blocker": "blockers", "urgent_followup": "follow-ups", "at_risk": "at-risk schools", "needs_review": "items to review"}
        other_types = [source_labels.get(src, src) for src in sources if src]
        if other_types:
            explanation += f" There {'are' if total > 2 else 'is'} also {', '.join(other_types)} that need attention."

    return explanation



@router.get("/support-pods/{athlete_id}")
async def get_support_pod(athlete_id: str, context: str = None, current_user: dict = get_current_user_dep()):
    """Get full Support Pod data for an athlete"""
    if not can_access_athlete(current_user, athlete_id):
        raise HTTPException(status_code=403, detail="You don't have access to this athlete")
    athlete = await sp_get_athlete(athlete_id)
    if not athlete:
        return {"error": "Athlete not found"}

    # Merge live DB fields into the static athlete data
    db_athlete = await db.athletes.find_one({"id": athlete_id}, {"_id": 0})
    if db_athlete:
        athlete["profile_complete"] = db_athlete.get("profile_complete", athlete.get("profile_complete", False))
        athlete["profile_completeness"] = db_athlete.get("profile_completeness", athlete.get("profile_completeness", 0))
        athlete["missing_documents"] = db_athlete.get("missing_documents", athlete.get("missing_documents", []))

    interventions = await get_athlete_interventions(athlete_id)
    members = generate_pod_members(athlete)

    # Merge saved actions (DB) with suggested actions (from interventions)
    saved_actions = await db.pod_actions.find({"athlete_id": athlete_id}, {"_id": 0}).to_list(100)
    suggested = generate_suggested_actions(athlete_id, interventions)
    saved_ids = {a["id"] for a in saved_actions}
    all_actions = saved_actions + [s for s in suggested if s["id"] not in saved_ids]

    members = enrich_members_with_tasks(members, all_actions)

    # Get timeline data
    notes = await db.athlete_notes.find({"athlete_id": athlete_id}, {"_id": 0}).to_list(100)
    assignments = await db.assignments.find({"athlete_id": athlete_id}, {"_id": 0}).to_list(100)
    messages = await db.messages.find({"athlete_id": athlete_id}, {"_id": 0}).to_list(100)
    resolutions = await db.pod_resolutions.find({"athlete_id": athlete_id}, {"_id": 0}).to_list(100)
    action_events = await db.pod_action_events.find({"athlete_id": athlete_id}, {"_id": 0}).to_list(100)

    # Determine active intervention for banner
    active_intervention = None
    if context:
        active_intervention = next((i for i in interventions if i["category"] == context), None)
    if not active_intervention and interventions:
        active_intervention = interventions[0]

    pod_health = calculate_pod_health(athlete, members, all_actions)
    events = await get_relevant_events(athlete)

    unassigned = [a for a in all_actions if a.get("owner") in ("Unassigned", None, "") and a.get("status") != "completed"]

    # New V2 fields
    recruiting_timeline = generate_recruiting_timeline(athlete)
    recruiting_signals = generate_recruiting_signals(athlete, interventions, events)
    playbook = None
    if active_intervention:
        playbook = get_intervention_playbook(active_intervention.get("category"), athlete, interventions, events)

    # Pod Top Action — reuses same decision pattern as Top Action Engine
    # REPLACED: now using issue lifecycle system
    await evaluate_issues(athlete_id, athlete, interventions, all_actions)
    current_issue = await get_current_issue(athlete_id)
    all_active_issues = await get_all_active_issues(athlete_id)

    # Profile completeness from real DB athlete data
    db_athlete = await db.athletes.find_one({"id": athlete_id}, {"_id": 0})
    profile_completeness = compute_profile_completeness_detail(db_athlete) if db_athlete else None

    # ── Unified Status Intelligence ──
    status_intelligence = await _compute_status_intelligence(athlete_id, athlete, interventions)

    # ── Escalation context for directors ──
    escalations = await db.director_actions.find(
        {"athlete_id": athlete_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(20)

    return {
        "athlete": {k: v for k, v in athlete.items() if k != "archetype"},
        "active_intervention": active_intervention,
        "all_interventions": interventions,
        "pod_members": members,
        "actions": all_actions,
        "unassigned_count": len(unassigned),
        "current_issue": current_issue,
        "all_active_issues": all_active_issues,
        "timeline": {
            "notes": notes,
            "assignments": assignments,
            "messages": messages,
            "resolutions": resolutions,
            "action_events": action_events,
        },
        "pod_health": pod_health,
        "upcoming_events": events,
        "recruiting_timeline": recruiting_timeline,
        "recruiting_signals": recruiting_signals,
        "intervention_playbook": playbook,
        "profile_completeness": profile_completeness,
        "status_intelligence": status_intelligence,
        "escalations": escalations,
    }


@router.post("/support-pods/{athlete_id}/actions")
async def create_pod_action(athlete_id: str, action: ActionCreate, current_user: dict = get_current_user_dep()):
    if not can_access_athlete(current_user, athlete_id):
        raise HTTPException(status_code=403, detail="You don't have access to this athlete")
    """Create a new action item in the pod"""
    now = datetime.now(timezone.utc).isoformat()
    athlete = await sp_get_athlete(athlete_id) or {}
    athlete_name = athlete.get("full_name", "Unknown Athlete")
    doc = {
        "id": str(uuid.uuid4()),
        "athlete_id": athlete_id,
        "title": action.title,
        "owner": action.owner,
        "owner_role": action.owner_role,
        "status": "ready",
        "due_date": action.due_date or (datetime.now(timezone.utc) + timedelta(days=3)).isoformat(),
        "source": "manual",
        "source_category": action.source_category,
        "notes": action.notes,
        "created_by": current_user["name"],
        "created_at": now,
        "is_suggested": False,
        "completed_at": None,
    }
    await db.pod_actions.insert_one(doc)
    doc.pop("_id", None)

    event = {
        "id": str(uuid.uuid4()),
        "athlete_id": athlete_id,
        "type": "action_created",
        "description": f"Created action: {action.title}",
        "actor": current_user["name"],
        "created_at": now,
    }
    await db.pod_action_events.insert_one(event)

    # In-app notification for the assigned person
    notif = {
        "id": str(uuid.uuid4()),
        "type": "action_assigned",
        "recipient_name": action.owner,
        "recipient_role": action.owner_role,
        "athlete_id": athlete_id,
        "athlete_name": athlete_name,
        "action_title": action.title,
        "due_date": doc["due_date"],
        "assigned_by": current_user["name"],
        "read": False,
        "created_at": now,
    }
    await db.notifications.insert_one(notif)

    # Fire email notification (non-blocking)
    try:
        from services.email import send_action_notification_email
        import asyncio
        asyncio.create_task(send_action_notification_email(
            assignee_name=action.owner,
            athlete_name=athlete_name,
            action_title=action.title,
            due_date=doc["due_date"],
            assigned_by=current_user["name"],
        ))
    except Exception as e:  # noqa: E722
        log.warning("Handled exception (handled): %s", e)
        pass  # Email is best-effort

    return doc


@router.post("/support-pods/{athlete_id}/quick-resolve")
async def quick_resolve(athlete_id: str, body: dict, current_user: dict = get_current_user_dep()):
    """Quick-resolve simple mechanical issues from the Pod Hero Card.
    Only supports low-risk, obvious actions like assigning unowned tasks."""
    if not can_access_athlete(current_user, athlete_id):
        raise HTTPException(status_code=403, detail="You don't have access to this athlete")

    action = body.get("action")
    target_ids = body.get("target_ids", [])
    coach_name = current_user.get("name", "Coach")
    now = datetime.now(timezone.utc).isoformat()

    if action == "assign_owner":
        if not target_ids:
            raise HTTPException(400, "No target action IDs provided")

        updated = 0
        for action_id in target_ids:
            # Try DB-persisted actions first
            existing = await db.pod_actions.find_one({"id": action_id, "athlete_id": athlete_id})
            if existing:
                await db.pod_actions.update_one(
                    {"id": action_id},
                    {"$set": {"owner": coach_name}},
                )
            else:
                # Suggested action — materialize it
                suggested = generate_suggested_actions(athlete_id, await get_athlete_interventions(athlete_id))
                original = next((s for s in suggested if s["id"] == action_id), {})
                doc = {
                    **original,
                    "id": action_id,
                    "athlete_id": athlete_id,
                    "owner": coach_name,
                    "is_suggested": False,
                }
                await db.pod_actions.insert_one(doc)
            updated += 1

            # Log the assignment event
            await db.pod_action_events.insert_one({
                "id": str(uuid.uuid4()),
                "athlete_id": athlete_id,
                "type": "action_updated",
                "description": f"Quick-assigned to {coach_name}",
                "actor": coach_name,
                "action_id": action_id,
                "created_at": now,
            })

        return {
            "resolved": True,
            "action": action,
            "updated_count": updated,
            "assigned_to": coach_name,
        }

    raise HTTPException(400, f"Unknown quick-resolve action: {action}")


@router.patch("/support-pods/{athlete_id}/actions/{action_id}")
async def update_pod_action(athlete_id: str, action_id: str, update: ActionUpdate, current_user: dict = get_current_user_dep()):
    if not can_access_athlete(current_user, athlete_id):
        raise HTTPException(status_code=403, detail="You don't have access to this athlete")
    """Update an action (complete, reassign, escalate, cancel)"""
    update_dict = {}
    event_desc = ""
    now = datetime.now(timezone.utc).isoformat()

    if update.status:
        update_dict["status"] = update.status
        if update.status == "completed":
            update_dict["completed_at"] = now
            update_dict["completed_by"] = current_user.get("name", "Unknown")
        elif update.status == "cancelled":
            update_dict["cancelled_at"] = now
            update_dict["cancelled_by"] = current_user.get("name", "Unknown")

    if update.owner:
        update_dict["owner"] = update.owner

    existing = await db.pod_actions.find_one({"id": action_id, "athlete_id": athlete_id})
    action_title = ""

    if existing:
        action_title = existing.get("title", "")
        await db.pod_actions.update_one({"id": action_id}, {"$set": update_dict})
    else:
        from support_pod import get_athlete_interventions, generate_suggested_actions
        suggested = generate_suggested_actions(athlete_id, await get_athlete_interventions(athlete_id))
        original = next((s for s in suggested if s["id"] == action_id), {})
        action_title = original.get("title", "")
        doc = {
            **original,
            "id": action_id,
            "athlete_id": athlete_id,
            **update_dict,
            "is_suggested": False,
        }
        await db.pod_actions.insert_one(doc)

    # Build descriptive event log
    if update.status == "completed":
        event_desc = f'{current_user.get("name", "Coach")} completed task "{action_title}"'
    elif update.status == "cancelled":
        event_desc = f'{current_user.get("name", "Coach")} cancelled task "{action_title}"'
    elif update.owner:
        event_desc = f'Reassigned "{action_title}" to {update.owner}'
    elif update.status:
        event_desc = f'Status of "{action_title}" changed to {update.status}'

    if event_desc:
        event = {
            "id": str(uuid.uuid4()),
            "athlete_id": athlete_id,
            "type": "action_completed" if update.status == "completed" else "action_updated",
            "description": event_desc,
            "actor": current_user["name"],
            "action_id": action_id,
            "created_at": now,
        }
        await db.pod_action_events.insert_one(event)

    result = await db.pod_actions.find_one({"id": action_id}, {"_id": 0})

    # Refresh cache when actions are completed/cancelled
    if update.status in ("completed", "cancelled"):
        from services.athlete_store import recompute_derived_data
        await recompute_derived_data()

    return result or {"id": action_id, **update_dict}


@router.post("/support-pods/{athlete_id}/actions/{action_id}/escalate")
async def escalate_task(athlete_id: str, action_id: str, body: dict, current_user: dict = get_current_user_dep()):
    """Escalate a pod task to a director action."""
    if not can_access_athlete(current_user, athlete_id):
        raise HTTPException(status_code=403, detail="You don't have access to this athlete")

    now = datetime.now(timezone.utc).isoformat()
    reason = body.get("reason", "").strip()
    if not reason:
        raise HTTPException(400, "Escalation reason is required")

    # Get the task
    task = await db.pod_actions.find_one({"id": action_id, "athlete_id": athlete_id}, {"_id": 0})
    if not task:
        # Check suggested actions
        from support_pod import get_athlete_interventions, generate_suggested_actions
        suggested = generate_suggested_actions(athlete_id, await get_athlete_interventions(athlete_id))
        task = next((s for s in suggested if s["id"] == action_id), None)

    task_title = task.get("title", "Unknown task") if task else "Unknown task"
    athlete = await sp_get_athlete(athlete_id) or {}
    athlete_name = athlete.get("full_name", "Unknown")

    # Mark the task as escalated
    await db.pod_actions.update_one(
        {"id": action_id, "athlete_id": athlete_id},
        {"$set": {
            "status": "escalated",
            "escalated_at": now,
            "escalated_by": current_user.get("name"),
            "escalation_reason": reason,
        }},
        upsert=False,
    )
    # If task was suggested (not in DB), materialize it
    if not await db.pod_actions.find_one({"id": action_id}):
        doc = {**(task or {}), "id": action_id, "athlete_id": athlete_id,
               "status": "escalated", "escalated_at": now,
               "escalated_by": current_user.get("name"), "escalation_reason": reason,
               "is_suggested": False}
        await db.pod_actions.insert_one(doc)

    # Create a Director Action
    da_id = f"da_{uuid.uuid4().hex[:12]}"
    director_action = {
        "action_id": da_id,
        "type": "coach_escalation",
        "status": "open",
        "coach_id": current_user.get("id"),
        "coach_name": current_user.get("name", "Coach"),
        "athlete_id": athlete_id,
        "athlete_name": athlete_name,
        "org_id": current_user.get("org_id"),
        "reason": "task_escalation",
        "reason_label": f"Escalated: {task_title}",
        "note": reason,
        "urgency": "medium",
        "source": "coach_escalation",
        "source_task_id": action_id,
        "created_at": now,
        "acknowledged_at": None,
        "resolved_at": None,
    }
    await db.director_actions.insert_one(director_action)

    # Log activity
    await db.pod_action_events.insert_one({
        "id": str(uuid.uuid4()),
        "athlete_id": athlete_id,
        "type": "action_escalated",
        "description": f'{current_user.get("name")} escalated task "{task_title}" to director — {reason}',
        "actor": current_user.get("name"),
        "action_id": action_id,
        "created_at": now,
    })

    director_action.pop("_id", None)
    return {"ok": True, "director_action_id": da_id, "task_status": "escalated"}


@router.post("/support-pods/{athlete_id}/resolve")
async def resolve_issue_endpoint(athlete_id: str, body: ResolveIssue, current_user: dict = get_current_user_dep()):
    if not can_access_athlete(current_user, athlete_id):
        raise HTTPException(status_code=403, detail="You don't have access to this athlete")
    """Resolve an active issue (legacy or new issue lifecycle)"""
    # If an issue_id is provided, resolve via the new pod_issues system
    issue_id = body.resolution_note  # overloaded field; check body for issue_id
    if hasattr(body, 'issue_id') and body.issue_id:
        issue_id = body.issue_id

    # Legacy: still create a resolution record
    doc = {
        "id": str(uuid.uuid4()),
        "athlete_id": athlete_id,
        "category": body.category,
        "resolution_note": body.resolution_note or f"Resolved {body.category} issue",
        "resolved_by": current_user["name"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.pod_resolutions.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.post("/support-pods/{athlete_id}/issues/{issue_id}/resolve")
async def resolve_pod_issue_endpoint(athlete_id: str, issue_id: str, body: dict, current_user: dict = get_current_user_dep()):
    """Manually resolve a pod issue."""
    if not can_access_athlete(current_user, athlete_id):
        raise HTTPException(status_code=403, detail="You don't have access to this athlete")

    resolved = await resolve_pod_issue(
        issue_id=issue_id,
        resolved_by=current_user.get("name", "Coach"),
        resolution_source="manual",
    )
    if not resolved:
        raise HTTPException(404, "Issue not found or already resolved")

    return resolved



@router.post("/support-pods/{athlete_id}/escalate")
async def escalate_to_director(athlete_id: str, body: dict, current_user: dict = get_current_user_dep()):
    """Coach escalation — creates a director action item."""
    if not can_access_athlete(current_user, athlete_id):
        raise HTTPException(status_code=403, detail="You don't have access to this athlete")

    now = datetime.now(timezone.utc).isoformat()
    action_id = f"da_{uuid.uuid4().hex[:12]}"
    athlete = await sp_get_athlete(athlete_id) or {}
    athlete_name = body.get("athlete_name") or athlete.get("full_name", "Unknown")

    doc = {
        "action_id": action_id,
        "type": "coach_escalation",
        "status": "open",
        "coach_id": current_user.get("id"),
        "coach_name": current_user.get("name", "Coach"),
        "athlete_id": athlete_id,
        "athlete_name": athlete_name,
        "org_id": current_user.get("org_id"),
        "reason": body.get("reason", "other"),
        "reason_label": body.get("title", "Coach escalation"),
        "note": (body.get("description", "") or "")[:500],
        "urgency": body.get("urgency", "medium"),
        "source": "coach_escalation",
        "created_at": now,
        "acknowledged_at": None,
        "resolved_at": None,
    }
    await db.director_actions.insert_one(doc)
    doc.pop("_id", None)
    return doc



# ── Director Guidance Note ────────────────────────────
@router.post("/support-pods/{athlete_id}/director-notes")
async def add_director_note(athlete_id: str, body: dict, current_user: dict = get_current_user_dep()):
    """Director adds a guidance note to the pod. Visible in timeline."""
    if current_user["role"] not in ("director", "platform_admin"):
        raise HTTPException(403, "Only directors can add guidance notes.")
    if not can_access_athlete(current_user, athlete_id):
        raise HTTPException(403, "Access denied")

    content = (body.get("content") or "").strip()
    if not content:
        raise HTTPException(400, "Note content is required.")

    escalation_id = body.get("escalation_id")
    now = datetime.now(timezone.utc).isoformat()
    note_id = str(uuid.uuid4())

    doc = {
        "id": note_id,
        "athlete_id": athlete_id,
        "author_id": current_user["id"],
        "author_name": current_user.get("name", "Director"),
        "author_role": "director",
        "content": content[:1000],
        "type": "director_guidance",
        "escalation_id": escalation_id,
        "created_at": now,
    }
    await db.athlete_notes.insert_one(doc)
    doc.pop("_id", None)

    # Add to pod timeline
    await db.pod_action_events.insert_one({
        "id": str(uuid.uuid4()),
        "athlete_id": athlete_id,
        "type": "director_guidance",
        "description": f"Director guidance: {content[:100]}",
        "actor": current_user.get("name", "Director"),
        "escalation_id": escalation_id,
        "created_at": now,
    })

    return {"ok": True, "note": doc}


# ── Director Intervention Task ───────────────────────
@router.post("/support-pods/{athlete_id}/director-tasks")
async def create_director_task(athlete_id: str, body: dict, current_user: dict = get_current_user_dep()):
    """Director creates an intervention/guidance task (only in escalated context)."""
    if current_user["role"] not in ("director", "platform_admin"):
        raise HTTPException(403, "Only directors can create intervention tasks.")
    if not can_access_athlete(current_user, athlete_id):
        raise HTTPException(403, "Access denied")

    title = (body.get("title") or "").strip()
    if not title:
        raise HTTPException(400, "Task title is required.")

    escalation_id = body.get("escalation_id")
    assignee = body.get("assignee", "Coach")  # Coach | Athlete | Director
    now = datetime.now(timezone.utc).isoformat()
    task_id = str(uuid.uuid4())
    due_days = int(body.get("due_days", 7))
    due_date = (datetime.now(timezone.utc) + timedelta(days=due_days)).isoformat()

    doc = {
        "id": task_id,
        "athlete_id": athlete_id,
        "title": title[:300],
        "owner": assignee,
        "owner_role": assignee.lower(),
        "status": "ready",
        "due_date": due_date,
        "source": "director_intervention",
        "source_category": "director_intervention",
        "escalation_id": escalation_id,
        "is_suggested": False,
        "created_by": current_user.get("name", "Director"),
        "created_by_role": "director",
        "created_at": now,
        "completed_at": None,
    }
    await db.pod_actions.insert_one(doc)
    doc.pop("_id", None)

    # Timeline entry
    await db.pod_action_events.insert_one({
        "id": str(uuid.uuid4()),
        "athlete_id": athlete_id,
        "type": "director_task_created",
        "description": f"Director task: {title[:80]} (assigned to {assignee})",
        "actor": current_user.get("name", "Director"),
        "escalation_id": escalation_id,
        "created_at": now,
    })

    return {"ok": True, "task": doc}


@router.post("/support-pods/{athlete_id}/nudge")
async def nudge_athlete(athlete_id: str, body: dict, current_user: dict = get_current_user_dep()):
    """Send a nudge notification to an athlete (e.g., complete profile)."""
    nudge_type = body.get("type", "general")
    now = datetime.now(timezone.utc).isoformat()

    athlete = await db.athletes.find_one({"id": athlete_id}, {"_id": 0, "full_name": 1, "tenant_id": 1, "user_id": 1})
    if not athlete:
        raise HTTPException(404, "Athlete not found")

    # Find the athlete's user account
    user = await db.users.find_one({"id": athlete.get("user_id")}, {"_id": 0, "id": 1})
    if not user:
        raise HTTPException(404, "Athlete user account not found")

    message_map = {
        "complete_profile": "Your coach has requested you complete your athlete profile. A complete profile helps coaches find and evaluate you.",
        "general": "Your coach has sent you a reminder.",
    }

    title_map = {
        "complete_profile": "Complete Your Profile",
        "general": "Coach Reminder",
    }

    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "type": "coach_nudge",
        "title": title_map.get(nudge_type, "Coach Reminder"),
        "message": message_map.get(nudge_type, message_map["general"]),
        "action_url": "/athlete-profile" if nudge_type == "complete_profile" else "/board",
        "read": False,
        "created_at": now,
    })

    return {"ok": True, "message": "Nudge sent"}

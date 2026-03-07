"""Weekly Digest — director command brief summarising coach and athlete signals."""

import logging
import os
import uuid
import asyncio
from datetime import datetime, timezone, timedelta

import resend
from fastapi import APIRouter, HTTPException

from db_client import db
from auth_middleware import get_current_user_dep
from services.ownership import (
    get_coach_athlete_map,
    get_unassigned_athlete_ids,
)
from mock_data import ATHLETES, ATHLETES_NEEDING_ATTENTION, UPCOMING_EVENTS

router = APIRouter()
log = logging.getLogger(__name__)
resend.api_key = os.environ.get("RESEND_API_KEY", "")
_FROM = os.environ.get("RESEND_FROM_EMAIL", "onboarding@resend.dev")


# ── Helpers ────────────────────────────────────────────────────────────────

async def _gather_digest_data(period_days: int = 7) -> dict:
    """Assemble all digest signals for the last N days."""
    now = datetime.now(timezone.utc)
    since = (now - timedelta(days=period_days)).isoformat()

    # 1. Coach activation summary
    coaches = await db.users.find(
        {"role": "coach"},
        {"_id": 0, "id": 1, "name": 1, "email": 1, "onboarding": 1, "last_active": 1, "created_at": 1},
    ).to_list(200)

    status_counts = {"active": 0, "activating": 0, "needs_support": 0, "pending": 0}
    coaches_needing_support = []
    new_coaches = []

    for c in coaches:
        onb = c.get("onboarding") or {}
        steps = len(onb.get("completed_steps", []))
        last_active = c.get("last_active")

        # Simple status derivation
        if onb.get("completed_at") or steps >= 5:
            status = "active"
        elif steps > 0:
            status = "activating"
        else:
            # Check days since creation
            created = c.get("created_at")
            if created:
                try:
                    days = (now - datetime.fromisoformat(created)).days
                except Exception:
                    days = 0
                if days >= 3:
                    status = "needs_support"
                else:
                    status = "activating"
            else:
                status = "activating"

        status_counts[status] = status_counts.get(status, 0) + 1

        if status == "needs_support":
            coaches_needing_support.append({
                "name": c["name"],
                "email": c["email"],
                "onboarding_progress": f"{steps}/5",
                "last_active": last_active,
            })

        # New coaches this period
        if c.get("created_at") and c["created_at"] >= since:
            new_coaches.append(c["name"])

    # 2. Notes logged this period
    recent_notes = await db.athlete_notes.find(
        {"created_at": {"$gte": since}},
        {"_id": 0, "created_by_name": 1, "category": 1, "athlete_id": 1},
    ).to_list(500)

    notes_by_coach = {}
    for n in recent_notes:
        author = n.get("created_by_name", "Unknown")
        notes_by_coach[author] = notes_by_coach.get(author, 0) + 1

    category_counts = {}
    for n in recent_notes:
        cat = n.get("category", "other")
        category_counts[cat] = category_counts.get(cat, 0) + 1

    # 3. Athletes needing attention (snapshot top 8)
    athletes_attention = []
    for a in ATHLETES_NEEDING_ATTENTION[:8]:
        athletes_attention.append({
            "name": a.get("athlete_name", ""),
            "category": a.get("category", ""),
            "urgency": a.get("urgency_score", 0),
            "owner": a.get("owner", ""),
        })

    # 4. Unassigned athletes
    unassigned_ids = get_unassigned_athlete_ids()
    unassigned_athletes = []
    for a in ATHLETES:
        if a["id"] in unassigned_ids:
            unassigned_athletes.append({"name": a["fullName"], "team": a["team"]})

    # 5. Upcoming events (next 7 days)
    upcoming = []
    for e in UPCOMING_EVENTS:
        if e.get("status") == "upcoming":
            upcoming.append({
                "name": e.get("name", ""),
                "date": e.get("date", ""),
                "prep_status": e.get("prepStatus", "unknown"),
                "expected_schools": e.get("expectedSchools", 0),
            })

    # 6. Recent nudges
    recent_nudges = await db.nudges.count_documents({"sent_at": {"$gte": since}})

    return {
        "period_start": since,
        "period_end": now.isoformat(),
        "coach_summary": {
            "total": len(coaches),
            "status_counts": status_counts,
            "coaches_needing_support": coaches_needing_support,
            "new_coaches": new_coaches,
        },
        "notes": {
            "total": len(recent_notes),
            "by_coach": notes_by_coach,
            "by_category": category_counts,
        },
        "athletes_needing_attention": athletes_attention,
        "unassigned_athletes": unassigned_athletes,
        "upcoming_events": upcoming,
        "nudges_sent": recent_nudges,
    }


def _build_what_changed(data: dict) -> str:
    """2-3 line opening summary."""
    parts = []
    cs = data["coach_summary"]
    if cs["new_coaches"]:
        parts.append(f"{len(cs['new_coaches'])} new coach{'es' if len(cs['new_coaches']) != 1 else ''} joined")
    if cs["coaches_needing_support"]:
        parts.append(f"{len(cs['coaches_needing_support'])} coach{'es' if len(cs['coaches_needing_support']) != 1 else ''} may need your support")
    notes_total = data["notes"]["total"]
    if notes_total > 0:
        parts.append(f"{notes_total} note{'s' if notes_total != 1 else ''} logged across your team")
    unassigned_ct = len(data["unassigned_athletes"])
    if unassigned_ct > 0:
        parts.append(f"{unassigned_ct} athlete{'s' if unassigned_ct != 1 else ''} still unassigned")
    if not parts:
        parts.append("No major changes this week — your team is steady")
    return ". ".join(parts) + "."


def _build_digest_html(director_name: str, data: dict) -> str:
    """Build a clean, scannable HTML command brief."""
    what_changed = _build_what_changed(data)
    cs = data["coach_summary"]

    # Sections
    sections = []

    # 1. What changed
    sections.append(f"""
    <div style="background:#f8fafc;border-radius:8px;padding:16px 20px;margin-bottom:20px;border-left:3px solid #0f172a;">
      <p style="margin:0;font-size:13px;color:#334155;line-height:1.6;font-weight:500;">{what_changed}</p>
    </div>
    """)

    # 2. Coach Activation
    sc = cs["status_counts"]
    coach_line = f"{sc.get('active',0)} active · {sc.get('activating',0)} activating · {sc.get('needs_support',0)} needs support"
    sections.append(_section("Coach Activation", f"""
    <p style="margin:0 0 8px;font-size:13px;color:#475569;">{cs['total']} coaches — {coach_line}</p>
    """))

    if cs["coaches_needing_support"]:
        rows = ""
        for c in cs["coaches_needing_support"][:5]:
            la = c.get("last_active")
            la_str = _format_ago(la) if la else "Never active"
            rows += f'<tr><td style="padding:4px 8px;font-size:12px;color:#334155;">{c["name"]}</td><td style="padding:4px 8px;font-size:12px;color:#94a3b8;">Onboarding {c["onboarding_progress"]}</td><td style="padding:4px 8px;font-size:12px;color:#94a3b8;">{la_str}</td></tr>'
        sections.append(f"""
        <table style="width:100%;border-collapse:collapse;margin:-8px 0 12px;">
          <tr><td style="padding:4px 8px;font-size:10px;color:#94a3b8;text-transform:uppercase;font-weight:700;">Coach</td><td style="padding:4px 8px;font-size:10px;color:#94a3b8;text-transform:uppercase;font-weight:700;">Progress</td><td style="padding:4px 8px;font-size:10px;color:#94a3b8;text-transform:uppercase;font-weight:700;">Last Active</td></tr>
          {rows}
        </table>
        """)

    # 3. Notes activity
    notes = data["notes"]
    if notes["total"] > 0:
        coach_notes = ", ".join(f"{name} ({ct})" for name, ct in sorted(notes["by_coach"].items(), key=lambda x: -x[1])[:4])
        sections.append(_section("Notes This Week", f"""
        <p style="margin:0;font-size:13px;color:#475569;">{notes['total']} notes logged — {coach_notes}</p>
        """))
    else:
        sections.append(_section("Notes This Week", '<p style="margin:0;font-size:13px;color:#94a3b8;">No notes logged this week.</p>'))

    # 4. Athletes needing attention
    attn = data["athletes_needing_attention"]
    if attn:
        items = ""
        for a in attn[:5]:
            items += f'<li style="font-size:12px;color:#475569;margin-bottom:4px;line-height:1.5;"><strong>{a["name"]}</strong> — {a["category"]} (score {a["urgency"]})</li>'
        sections.append(_section("Athletes Needing Attention", f'<ul style="margin:0;padding:0 0 0 16px;">{items}</ul>'))

    # 5. Unassigned athletes
    unassigned = data["unassigned_athletes"]
    if unassigned:
        names = ", ".join(a["name"] for a in unassigned[:6])
        extra = f" and {len(unassigned) - 6} more" if len(unassigned) > 6 else ""
        sections.append(_section("Unassigned Athletes", f'<p style="margin:0;font-size:13px;color:#dc2626;">{len(unassigned)} unassigned — {names}{extra}</p>'))

    # 6. Upcoming events
    events = data["upcoming_events"]
    if events:
        items = ""
        for ev in events[:4]:
            prep_color = "#16a34a" if ev["prep_status"] == "ready" else "#f59e0b" if ev["prep_status"] == "in_progress" else "#ef4444"
            items += f'<li style="font-size:12px;color:#475569;margin-bottom:4px;"><strong>{ev["name"]}</strong> — {ev["date"]} · <span style="color:{prep_color}">{ev["prep_status"].replace("_"," ").title()}</span></li>'
        sections.append(_section("Upcoming Events", f'<ul style="margin:0;padding:0 0 0 16px;">{items}</ul>'))

    body = "".join(sections)

    return f"""
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;padding:32px 0;">
      <div style="background:#0f172a;border-radius:12px 12px 0 0;padding:20px 24px;">
        <table style="width:100%;"><tr>
          <td><span style="color:#fff;font-weight:700;font-size:15px;">CapyMatch</span></td>
          <td style="text-align:right;"><span style="color:rgba(255,255,255,0.4);font-size:11px;">Weekly Digest</span></td>
        </tr></table>
      </div>
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:24px;">
        <p style="margin:0 0 16px;font-size:14px;color:#111827;">Hi {director_name},</p>
        <p style="margin:0 0 20px;font-size:13px;color:#64748b;">Here's your weekly program brief.</p>
        {body}
        <div style="border-top:1px solid #f1f5f9;margin-top:20px;padding-top:12px;">
          <p style="margin:0;font-size:10px;color:#94a3b8;text-align:center;">Sent from CapyMatch · Generated on demand</p>
        </div>
      </div>
    </div>
    """


def _section(title: str, content: str) -> str:
    return f"""
    <div style="margin-bottom:16px;">
      <p style="margin:0 0 6px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">{title}</p>
      {content}
    </div>
    """


def _format_ago(iso: str) -> str:
    try:
        dt = datetime.fromisoformat(iso)
        days = (datetime.now(timezone.utc) - dt).days
        if days == 0:
            return "Today"
        if days == 1:
            return "Yesterday"
        if days < 7:
            return f"{days}d ago"
        return f"{days // 7}w ago"
    except Exception:
        return "Unknown"


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.post("/digest/generate")
async def generate_and_send_digest(current_user: dict = get_current_user_dep()):
    """Director: generate a weekly digest and send it via email."""
    if current_user["role"] != "director":
        raise HTTPException(status_code=403, detail="Director only")

    # Gather data
    data = await _gather_digest_data(period_days=7)
    html = _build_digest_html(current_user["name"], data)

    now = datetime.now(timezone.utc).isoformat()
    digest_doc = {
        "id": str(uuid.uuid4()),
        "sent_by": current_user["id"],
        "sent_by_name": current_user["name"],
        "recipients": [current_user["email"]],
        "period_start": data["period_start"],
        "period_end": data["period_end"],
        "summary_data": data,
        "delivery_status": "pending",
        "last_error": None,
        "sent_at": now,
    }

    # Send email
    try:
        result = await asyncio.to_thread(resend.Emails.send, {
            "from": _FROM,
            "to": [current_user["email"]],
            "subject": f"CapyMatch Weekly Digest — {datetime.now(timezone.utc).strftime('%b %d')}",
            "html": html,
        })
        email_id = result.get("id") if isinstance(result, dict) else getattr(result, "id", None)
        digest_doc["delivery_status"] = "sent"
        digest_doc["email_id"] = email_id
        log.info(f"Digest sent to {current_user['email']}")
    except Exception as e:
        digest_doc["delivery_status"] = "failed"
        digest_doc["last_error"] = str(e)
        log.error(f"Failed to send digest: {e}")

    await db.digests.insert_one(digest_doc)
    digest_doc.pop("_id", None)

    return {
        "status": digest_doc["delivery_status"],
        "digest_id": digest_doc["id"],
        "sent_at": now,
        "last_error": digest_doc["last_error"],
        "summary": {
            "what_changed": _build_what_changed(data),
            "coach_count": data["coach_summary"]["total"],
            "needs_support": len(data["coach_summary"]["coaches_needing_support"]),
            "notes_this_week": data["notes"]["total"],
            "athletes_attention": len(data["athletes_needing_attention"]),
            "unassigned": len(data["unassigned_athletes"]),
        },
    }


@router.get("/digest/history")
async def get_digest_history(current_user: dict = get_current_user_dep()):
    """Director: list past digests."""
    if current_user["role"] != "director":
        raise HTTPException(status_code=403, detail="Director only")

    digests = await db.digests.find(
        {}, {"_id": 0, "id": 1, "sent_by_name": 1, "recipients": 1,
             "period_start": 1, "period_end": 1, "delivery_status": 1,
             "sent_at": 1, "summary_data.coach_summary.status_counts": 1,
             "summary_data.notes.total": 1,
             "summary_data.athletes_needing_attention": 1,
             "summary_data.unassigned_athletes": 1}
    ).sort("sent_at", -1).to_list(20)

    return digests


@router.get("/digest/{digest_id}")
async def get_digest_detail(digest_id: str, current_user: dict = get_current_user_dep()):
    """Director: view a specific past digest with full snapshot."""
    if current_user["role"] != "director":
        raise HTTPException(status_code=403, detail="Director only")

    doc = await db.digests.find_one({"id": digest_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Digest not found")
    return doc

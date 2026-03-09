"""Gmail Intelligence Service — AI-powered email analysis for recruiting insights.

Scans Gmail threads, matches to schools/coaches, and uses LLM to analyze
coach communication for signals, urgency, and recommended actions.
"""

import asyncio
import base64
import json
import logging
import re
import time
import uuid
from datetime import datetime, timezone, timedelta
from email.utils import parseaddr

from services.ai import _build_chat, _send_with_retry
from services.domain_mapper import map_email_to_school, extract_registrable_domain, BLOCKED_DOMAINS
from emergentintegrations.llm.chat import UserMessage

logger = logging.getLogger("gmail_intelligence")

SCAN_COOLDOWN_HOURS = 12
MAX_THREADS_PER_SCAN = 30
MAX_BODY_CHARS = 2000

# Internal signal types → user-facing labels
SIGNAL_LABELS = {
    "interest_shown": "Coach Interest",
    "info_request": "Info Requested",
    "camp_invite": "Camp Invite",
    "visit_invite": "Visit Invite",
    "scholarship_mention": "Scholarship Talk",
    "offer_extended": "Offer",
    "follow_up_needed": "Reply Needed",
    "going_cold": "Going Cold",
    "rejection": "Not a Fit",
    "general_recruiting": "Info Only",
}

URGENCY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3}

LLM_SYSTEM_PROMPT = """You are a recruiting intelligence analyst for college volleyball athletes.
You analyze email threads between athletes and college coaches to detect recruiting signals.

For each thread, output a JSON object with these exact fields:
{
  "signal_type": one of ["interest_shown","info_request","camp_invite","visit_invite","scholarship_mention","offer_extended","follow_up_needed","going_cold","rejection","general_recruiting"],
  "signal_strength": one of ["weak","moderate","strong"],
  "urgency": one of ["low","medium","high","critical"],
  "confidence": one of ["low","medium","high"],
  "suggested_stage": one of ["added","outreach","in_conversation","campus_visit","offer",null],
  "suggested_action_type": one of ["reply","add_to_board","update_stage","log_interaction","no_action"],
  "suggested_action_label": short action label (max 40 chars),
  "suggested_action_detail": one sentence explaining what to do next,
  "coach_name": extracted coach name or null,
  "explanation_saw": one sentence about what we saw in the email,
  "explanation_means": one sentence about what it means,
  "explanation_do": one sentence about what to do next
}

Rules:
- Be specific about what you observed in the email content
- Keep explanations short and human-readable
- If the email is informational with no action needed, use signal_type "general_recruiting" and action_type "no_action"
- Only suggest "offer_extended" if there is explicit mention of an offer
- Only suggest "critical" urgency for time-sensitive requests or offers
- For "going_cold", look for signs the coach hasn't responded or interest is waning
- Output ONLY valid JSON, no markdown, no explanation outside the JSON"""


def _clean_email_body(html_body, text_body):
    """Extract clean text from email body, preferring text over HTML."""
    body = text_body or ""
    if not body and html_body:
        body = re.sub(r'<style[^>]*>.*?</style>', '', html_body, flags=re.DOTALL)
        body = re.sub(r'<[^>]+>', ' ', body)
        body = re.sub(r'&nbsp;', ' ', body)
        body = re.sub(r'&amp;', '&', body)
        body = re.sub(r'&lt;', '<', body)
        body = re.sub(r'&gt;', '>', body)
    body = re.sub(r'\s+', ' ', body).strip()
    return body[:MAX_BODY_CHARS]


def _extract_body_from_payload(payload):
    """Extract body text from Gmail message payload."""
    body_html = ""
    body_text = ""
    mime = payload.get("mimeType", "")
    if mime == "text/html":
        data = payload.get("body", {}).get("data", "")
        if data:
            body_html = base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")
    elif mime == "text/plain":
        data = payload.get("body", {}).get("data", "")
        if data:
            body_text = base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")
    elif mime.startswith("multipart"):
        for part in payload.get("parts", []):
            h, t = _extract_body_from_payload(part)
            if h and not body_html:
                body_html = h
            if t and not body_text:
                body_text = t
    return body_html, body_text


async def should_scan(db, user_id: str) -> bool:
    """Check if enough time has passed since last scan."""
    state = await db.gmail_scan_state.find_one(
        {"user_id": user_id}, {"_id": 0, "last_scan_at": 1, "status": 1}
    )
    if not state:
        return True
    if state.get("status") == "scanning":
        return False
    last = state.get("last_scan_at", "")
    if not last:
        return True
    try:
        last_dt = datetime.fromisoformat(last)
        if last_dt.tzinfo is None:
            last_dt = last_dt.replace(tzinfo=timezone.utc)
        return (datetime.now(timezone.utc) - last_dt) > timedelta(hours=SCAN_COOLDOWN_HOURS)
    except (ValueError, TypeError):
        return True


async def run_intelligence_scan(user_id: str, tenant_id: str, db, get_creds_fn, get_service_fn):
    """Main scan: fetch threads, match schools, analyze with AI, store insights."""
    scan_id = f"iscan_{uuid.uuid4().hex[:10]}"
    now_iso = datetime.now(timezone.utc).isoformat()

    # Mark scanning
    await db.gmail_scan_state.update_one(
        {"user_id": user_id},
        {"$set": {"status": "scanning", "scan_id": scan_id, "started_at": now_iso}},
        upsert=True,
    )

    try:
        creds = await get_creds_fn(user_id)
        if not creds:
            await _finish_scan(db, user_id, "failed", error="Gmail not connected")
            return

        service = get_service_fn(creds)

        # Determine scan window
        state = await db.gmail_scan_state.find_one({"user_id": user_id}, {"_id": 0})
        last_success = state.get("last_success_at") if state else None
        if last_success:
            scan_after = last_success
        else:
            scan_after = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()

        # Fetch threads
        threads = await _fetch_recent_threads(service, db, tenant_id, scan_after)
        if not threads:
            await _finish_scan(db, user_id, "completed", threads_analyzed=0, insights_found=0)
            return

        # Get existing insight thread_ids to avoid re-analysis
        existing = await db.gmail_insights.find(
            {"user_id": user_id, "thread_id": {"$in": [t["thread_id"] for t in threads]}},
            {"_id": 0, "thread_id": 1},
        ).to_list(500)
        existing_tids = {e["thread_id"] for e in existing}
        threads = [t for t in threads if t["thread_id"] not in existing_tids][:MAX_THREADS_PER_SCAN]

        if not threads:
            await _finish_scan(db, user_id, "completed", threads_analyzed=0, insights_found=0)
            return

        # Analyze each thread with AI
        insights_created = 0
        for t in threads:
            try:
                insight = await _analyze_thread(t, user_id, tenant_id, db)
                if insight:
                    await db.gmail_insights.insert_one(insight)
                    # Remove _id added by insert_one
                    insights_created += 1
            except Exception as e:
                logger.warning(f"Failed to analyze thread {t['thread_id']}: {e}")
                continue

        await _finish_scan(db, user_id, "completed",
                          threads_analyzed=len(threads), insights_found=insights_created)
        logger.info(f"Intelligence scan {scan_id}: {len(threads)} threads, {insights_created} insights")

    except Exception as e:
        logger.error(f"Intelligence scan failed: {e}", exc_info=True)
        await _finish_scan(db, user_id, "failed", error=str(e))


async def _finish_scan(db, user_id, status, threads_analyzed=0, insights_found=0, error=None):
    now_iso = datetime.now(timezone.utc).isoformat()
    update = {
        "status": status,
        "last_scan_at": now_iso,
        "threads_analyzed": threads_analyzed,
        "insights_found": insights_found,
    }
    if status == "completed":
        update["last_success_at"] = now_iso
    if error:
        update["error"] = error
    await db.gmail_scan_state.update_one({"user_id": user_id}, {"$set": update})


async def _fetch_recent_threads(service, db, tenant_id, scan_after):
    """Fetch recent email threads from Gmail, matched to known schools/coaches."""
    # Build query: emails from/to known coach domains + .edu + recruiting domains
    queries = [
        'newer_than:7d (from:*.edu OR to:*.edu)',
        'newer_than:7d (coach OR volleyball OR recruit OR roster OR visit OR camp OR scholarship)',
    ]

    all_thread_ids = set()
    for q in queries:
        try:
            tids = await asyncio.get_event_loop().run_in_executor(
                None, _list_threads_sync, service, q
            )
            all_thread_ids.update(tids)
        except Exception as e:
            logger.warning(f"Thread query failed: {e}")

    if not all_thread_ids:
        return []

    # Fetch thread details
    results = []
    for tid in list(all_thread_ids)[:MAX_THREADS_PER_SCAN * 2]:
        try:
            thread_data = await asyncio.get_event_loop().run_in_executor(
                None, _fetch_thread_sync, service, tid
            )
            if not thread_data:
                continue

            # Match to school
            school_match = await _match_thread_to_school(thread_data, db, tenant_id)
            if school_match:
                thread_data["school_match"] = school_match
                results.append(thread_data)
        except Exception as e:
            logger.warning(f"Failed to fetch thread {tid}: {e}")

    return results


def _list_threads_sync(service, query):
    """List thread IDs from Gmail."""
    thread_ids = []
    try:
        result = service.users().threads().list(userId="me", q=query, maxResults=50).execute()
        for t in result.get("threads", []):
            thread_ids.append(t["id"])
    except Exception as e:
        logger.warning(f"Gmail list threads error: {e}")
    return thread_ids


def _fetch_thread_sync(service, thread_id):
    """Fetch full thread with message bodies."""
    try:
        thread = service.users().threads().get(
            userId="me", id=thread_id, format="full"
        ).execute()
        messages = thread.get("messages", [])
        if not messages:
            return None

        parsed_messages = []
        for msg in messages[-5:]:  # Last 5 messages max
            headers = {}
            for h in msg.get("payload", {}).get("headers", []):
                headers[h["name"]] = h["value"]

            html_body, text_body = _extract_body_from_payload(msg.get("payload", {}))
            clean_body = _clean_email_body(html_body, text_body)
            label_ids = msg.get("labelIds", [])

            parsed_messages.append({
                "id": msg["id"],
                "from": headers.get("From", ""),
                "to": headers.get("To", ""),
                "subject": headers.get("Subject", ""),
                "date": headers.get("Date", ""),
                "body": clean_body,
                "is_sent": "SENT" in label_ids,
            })

        return {
            "thread_id": thread_id,
            "messages": parsed_messages,
            "subject": parsed_messages[0]["subject"] if parsed_messages else "",
        }
    except Exception as e:
        logger.warning(f"Gmail fetch thread error: {e}")
        return None


async def _match_thread_to_school(thread_data, db, tenant_id):
    """Match thread to a school using domain mapper + coach email lookup."""
    all_emails = set()
    for msg in thread_data.get("messages", []):
        for field in ("from", "to"):
            val = msg.get(field, "")
            for part in val.split(","):
                _, addr = parseaddr(part.strip())
                if addr and "@" in addr:
                    addr = addr.lower().strip()
                    domain = extract_registrable_domain(addr)
                    if domain and domain not in BLOCKED_DOMAINS:
                        all_emails.add(addr)

    if not all_emails:
        return None

    # Try matching via domain mapper
    for email in all_emails:
        mapping = await map_email_to_school(db, email)
        if mapping.get("school_id"):
            # Check if on pipeline
            program = await db.programs.find_one(
                {"tenant_id": tenant_id, "university_name": mapping["school_id"]},
                {"_id": 0, "program_id": 1, "university_name": 1, "journey_stage": 1},
            )
            return {
                "university_name": mapping["school_id"],
                "domain": mapping["normalized_domain"],
                "program_id": program["program_id"] if program else None,
                "on_board": program is not None,
                "current_stage": program.get("journey_stage") if program else None,
                "coach_email": email,
            }

    # Try matching via coach emails in DB
    for email in all_emails:
        coach = await db.college_coaches.find_one(
            {"tenant_id": tenant_id, "email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}},
            {"_id": 0, "program_id": 1, "university_name": 1, "coach_name": 1},
        )
        if coach:
            program = await db.programs.find_one(
                {"tenant_id": tenant_id, "program_id": coach["program_id"]},
                {"_id": 0, "program_id": 1, "journey_stage": 1},
            )
            return {
                "university_name": coach.get("university_name", ""),
                "domain": None,
                "program_id": coach["program_id"],
                "on_board": True,
                "current_stage": program.get("journey_stage") if program else None,
                "coach_email": email,
                "coach_name": coach.get("coach_name"),
            }

    return None


async def _analyze_thread(thread_data, user_id, tenant_id, db):
    """Analyze a thread with AI and return an insight document."""
    messages = thread_data.get("messages", [])
    if not messages:
        return None

    school_match = thread_data.get("school_match", {})
    university_name = school_match.get("university_name", "Unknown School")

    # Build conversation text for AI
    convo_lines = []
    latest_date = ""
    snippet = ""
    for msg in messages:
        direction = "ATHLETE SENT" if msg["is_sent"] else "COACH/SCHOOL SENT"
        body = msg["body"][:800]
        convo_lines.append(f"[{direction}] Subject: {msg['subject']}\n{body}")
        if msg["date"]:
            latest_date = msg["date"]
        if not msg["is_sent"] and not snippet:
            snippet = body[:120]

    convo_text = "\n---\n".join(convo_lines)

    prompt = f"""Analyze this email thread between an athlete and {university_name}.

School: {university_name}
Currently on athlete's board: {"Yes" if school_match.get("on_board") else "No"}
Current journey stage: {school_match.get("current_stage") or "not on board"}

Email thread:
{convo_text}

Output a single JSON object with your analysis."""

    try:
        chat = _build_chat(LLM_SYSTEM_PROMPT)
        raw = await _send_with_retry(chat, UserMessage(text=prompt))

        # Parse JSON from response
        raw = raw.strip()
        if raw.startswith("```"):
            raw = re.sub(r'^```(?:json)?\s*', '', raw)
            raw = re.sub(r'\s*```$', '', raw)

        analysis = json.loads(raw)
    except (json.JSONDecodeError, RuntimeError) as e:
        logger.warning(f"AI analysis failed for thread {thread_data['thread_id']}: {e}")
        return None

    # Build explanation from 3-part structure
    saw = analysis.get("explanation_saw", "")
    means = analysis.get("explanation_means", "")
    do_next = analysis.get("explanation_do", "")
    explanation = f"{saw} {means} {do_next}".strip()

    now_iso = datetime.now(timezone.utc).isoformat()
    return {
        "insight_id": f"ins_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "tenant_id": tenant_id,
        "thread_id": thread_data["thread_id"],
        "program_id": school_match.get("program_id"),
        "university_name": university_name,
        "coach_name": analysis.get("coach_name") or school_match.get("coach_name"),
        "coach_email": school_match.get("coach_email"),
        "signal_type": analysis.get("signal_type", "general_recruiting"),
        "signal_strength": analysis.get("signal_strength", "moderate"),
        "urgency": analysis.get("urgency", "low"),
        "confidence": analysis.get("confidence", "medium"),
        "suggested_stage": analysis.get("suggested_stage"),
        "suggested_action": {
            "type": analysis.get("suggested_action_type", "no_action"),
            "label": analysis.get("suggested_action_label", "No action needed"),
            "detail": analysis.get("suggested_action_detail", ""),
        },
        "explanation": explanation,
        "status": "pending",
        "email_date": latest_date,
        "analyzed_at": now_iso,
        "snippet": snippet or messages[-1]["body"][:120],
        "confirmed_at": None,
        "dismissed_at": None,
    }

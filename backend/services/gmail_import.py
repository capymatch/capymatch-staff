"""Gmail History Import Service.
Scans Gmail headers for the last 180 days, aggregates per-school suggestions,
and assigns deterministic stages + follow-up dates.
"""
import asyncio
import logging
import time
import uuid
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from email.utils import parseaddr

from services.domain_mapper import map_email_to_school, extract_registrable_domain, BLOCKED_DOMAINS

logger = logging.getLogger("gmail_import")

MAX_MESSAGES = 2000
BATCH_SIZE = 50
BATCH_DELAY = 0.1

NEGATIVE_KEYWORDS = {"admissions", "apply", "financial aid", "newsletter", "unsubscribe", "donate", "alumni"}
RECRUITING_SIGNALS = {"coach", "volleyball", "recruit", "roster", "visit", "camp"}


def _has_negative_keyword(subject: str) -> bool:
    s = subject.lower()
    return any(kw in s for kw in NEGATIVE_KEYWORDS)


def _has_recruiting_signal(subject: str) -> bool:
    s = subject.lower()
    return any(kw in s for kw in RECRUITING_SIGNALS)


def _extract_edu_addresses(header_value: str) -> list:
    addresses = []
    for part in header_value.split(","):
        _, addr = parseaddr(part.strip())
        addr = addr.lower().strip()
        if addr and "@" in addr:
            domain = extract_registrable_domain(addr)
            if domain and domain.endswith(".edu") and domain not in BLOCKED_DOMAINS:
                addresses.append(addr)
    return addresses


def assign_stage_and_group(suggestion: dict) -> dict:
    out = suggestion.get("outbound_count", 0)
    inb = suggestion.get("inbound_count", 0)
    last_dir = suggestion.get("last_message_direction", "")
    last_at_str = suggestion.get("last_message_at", "")
    now = datetime.now(timezone.utc)

    last_at = None
    if last_at_str:
        try:
            last_at = datetime.fromisoformat(last_at_str)
            if last_at.tzinfo is None:
                last_at = last_at.replace(tzinfo=timezone.utc)
        except (ValueError, TypeError):
            pass

    subjects = suggestion.get("sample_subjects", [])
    has_signal = any(_has_recruiting_signal(s) for s in subjects)
    all_negative = all(_has_negative_keyword(s) for s in subjects) if subjects else True

    if out == 0:
        if has_signal and not all_negative:
            stage = "added"
            group = "needs_outreach"
        else:
            stage = None
            group = None
    elif out >= 1 and inb == 0:
        stage = "outreach"
        group = "waiting_on_reply"
    elif out >= 1 and inb >= 1:
        stage = "in_conversation"
        group = "in_conversation"
    else:
        stage = "added"
        group = "needs_outreach"

    followup_due_at = None
    if stage and last_at:
        if stage == "in_conversation" and last_at < (now - timedelta(days=14)):
            followup_due_at = (now + timedelta(days=7)).isoformat()[:10]
        elif last_dir == "outbound":
            followup_due_at = (last_at + timedelta(days=5)).isoformat()[:10]
        elif last_dir == "inbound":
            followup_due_at = (last_at + timedelta(days=3)).isoformat()[:10]

    suggestion["proposed_stage"] = stage
    suggestion["proposed_group"] = group
    suggestion["followup_due_at"] = followup_due_at
    suggestion["attention_required"] = last_dir == "inbound" and stage is not None
    suggestion["ignored"] = stage is None
    return suggestion


async def run_gmail_import(run_id, user_id, db, get_creds_fn, get_service_fn):
    scan_start = time.monotonic()
    try:
        await db.import_runs.update_one(
            {"run_id": run_id},
            {"$set": {"status": "scanning", "started_at": datetime.now(timezone.utc).isoformat()}}
        )
        creds = await get_creds_fn(user_id)
        if not creds:
            await _fail_run(db, run_id, "Gmail not connected")
            return
        service = get_service_fn(creds)

        message_ids = await _query_messages(service, db, run_id)
        if not message_ids:
            await db.import_runs.update_one(
                {"run_id": run_id},
                {"$set": {"status": "ready", "completed_at": datetime.now(timezone.utc).isoformat(),
                          "messages_scanned": 0, "schools_found": 0, "suggestions": []}}
            )
            return

        await db.import_runs.update_one({"run_id": run_id}, {"$set": {"status": "scanning"}})
        classified = await _fetch_and_classify(service, db, run_id, message_ids)

        await db.import_runs.update_one({"run_id": run_id}, {"$set": {"status": "aggregating"}})
        suggestions = _aggregate(classified)

        final_suggestions = []
        for s in suggestions:
            out = s["outbound_count"]
            inb = s["inbound_count"]
            has_signal = any(_has_recruiting_signal(sub) for sub in s["sample_subjects"])
            if out >= 1 or inb >= 2 or (has_signal and inb >= 1):
                assign_stage_and_group(s)
                final_suggestions.append(s)

        # Enrich with KB coach verification
        for s in final_suggestions:
            if s.get("school_id"):
                kb = await db.university_knowledge_base.find_one(
                    {"university_name": s["school_id"]},
                    {"_id": 0, "coach_email": 1, "coordinator_email": 1}
                )
                kb_emails = set()
                if kb:
                    for field in ("coach_email", "coordinator_email"):
                        e = (kb.get(field) or "").strip().lower()
                        if e and "@" in e:
                            kb_emails.add(e)
                discovered = set(e.lower() for e in s.get("discovered_emails", []))
                s["verified_coach_count"] = len(discovered & kb_emails)
            else:
                s["verified_coach_count"] = 0

        schools_found = len(final_suggestions)
        high_confidence = sum(1 for s in final_suggestions if s.get("confidence", 0) >= 80 and s.get("school_id"))
        scan_duration_s = round(time.monotonic() - scan_start, 2)

        await db.import_runs.update_one(
            {"run_id": run_id},
            {"$set": {
                "status": "ready",
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "messages_scanned": len(message_ids),
                "schools_found": schools_found,
                "schools_high_confidence": high_confidence,
                "suggestions": final_suggestions,
                "scan_analytics": {"scan_duration_s": scan_duration_s, "messages_scanned": len(message_ids)},
            }}
        )
        logger.info(f"Import run {run_id} complete: {len(message_ids)} messages, {schools_found} schools")
    except Exception as e:
        logger.error(f"Import run {run_id} failed: {e}", exc_info=True)
        await _fail_run(db, run_id, str(e))


async def _fail_run(db, run_id, error_msg):
    await db.import_runs.update_one(
        {"run_id": run_id},
        {"$set": {"status": "failed", "completed_at": datetime.now(timezone.utc).isoformat(),
                  "error": {"code": "IMPORT_FAILED", "message": error_msg}}}
    )


async def _query_messages(service, db, run_id):
    queries = [
        'newer_than:180d (from:*.edu OR to:*.edu)',
        'newer_than:180d (coach OR volleyball OR recruit OR roster) (from:*.edu OR to:*.edu)',
    ]
    all_ids = set()
    for q in queries:
        ids = await _run_list_query(service, q)
        all_ids.update(ids)
    if len(all_ids) < 5:
        for q in ['newer_than:180d from:.edu', 'newer_than:180d to:.edu']:
            ids = await _run_list_query(service, q)
            all_ids.update(ids)
            if len(all_ids) >= MAX_MESSAGES:
                break
    result = list(all_ids)[:MAX_MESSAGES]
    logger.info(f"Import run {run_id}: {len(result)} unique messages to process")
    return result


def _run_list_query_sync(service, query):
    ids = []
    page_token = None
    retries = 0
    while True:
        try:
            params = {"userId": "me", "q": query, "maxResults": 500}
            if page_token:
                params["pageToken"] = page_token
            result = service.users().messages().list(**params).execute()
            ids.extend(m["id"] for m in result.get("messages", []))
            page_token = result.get("nextPageToken")
            if not page_token or len(ids) >= MAX_MESSAGES:
                break
            retries = 0
        except Exception as e:
            retries += 1
            if retries > 5:
                break
            time.sleep(min(30, 2 ** retries))
    return ids


async def _run_list_query(service, query):
    return await asyncio.get_event_loop().run_in_executor(None, _run_list_query_sync, service, query)


async def _fetch_and_classify(service, db, run_id, message_ids):
    classified = []
    total = len(message_ids)
    for i in range(0, total, BATCH_SIZE):
        batch = message_ids[i:i + BATCH_SIZE]
        batch_results = await asyncio.get_event_loop().run_in_executor(
            None, _fetch_batch_sync, service, batch
        )
        for msg in batch_results:
            result = await _classify_message(db, msg)
            if result:
                classified.append(result)
        scanned = min(i + BATCH_SIZE, total)
        await db.import_runs.update_one({"run_id": run_id}, {"$set": {"messages_scanned": scanned}})
        if i + BATCH_SIZE < total:
            await asyncio.sleep(BATCH_DELAY)
    return classified


def _fetch_batch_sync(service, message_ids):
    results = []
    for mid in message_ids:
        retries = 0
        while True:
            try:
                msg = service.users().messages().get(
                    userId="me", id=mid, format="metadata",
                    metadataHeaders=["From", "To", "Subject", "Date"]
                ).execute()
                results.append(msg)
                break
            except Exception as e:
                if "429" in str(e) or "rateLimitExceeded" in str(e):
                    retries += 1
                    if retries > 5:
                        break
                    time.sleep(min(30, 2 ** retries))
                else:
                    break
    return results


async def _classify_message(db, msg):
    headers = {}
    for h in msg.get("payload", {}).get("headers", []):
        headers[h["name"]] = h["value"]
    subject = headers.get("Subject", "")
    from_header = headers.get("From", "")
    to_header = headers.get("To", "")
    date_str = headers.get("Date", "")
    label_ids = msg.get("labelIds", [])
    thread_id = msg.get("threadId", "")
    message_id = msg.get("id", "")

    is_outbound = "SENT" in label_ids
    if _has_negative_keyword(subject):
        return None

    from_addrs = _extract_edu_addresses(from_header)
    to_addrs = _extract_edu_addresses(to_header)
    if not from_addrs and not to_addrs:
        return None

    primary_email = None
    mapping = None
    for addr in from_addrs:
        m = await map_email_to_school(db, addr)
        if m["school_id"]:
            primary_email = addr
            mapping = m
            break
    if not mapping or not mapping["school_id"]:
        for addr in to_addrs:
            m = await map_email_to_school(db, addr)
            if m["school_id"]:
                primary_email = addr
                mapping = m
                break
    if not mapping or not mapping["school_id"]:
        primary_email = from_addrs[0] if from_addrs else (to_addrs[0] if to_addrs else None)
        if primary_email:
            mapping = await map_email_to_school(db, primary_email)
        else:
            return None

    parsed_date = None
    if date_str:
        try:
            from email.utils import parsedate_to_datetime
            parsed_date = parsedate_to_datetime(date_str)
            if parsed_date.tzinfo is None:
                parsed_date = parsed_date.replace(tzinfo=timezone.utc)
        except Exception:
            pass

    all_edu_emails = list(set(from_addrs + to_addrs))
    return {
        "message_id": message_id, "thread_id": thread_id,
        "school_id": mapping["school_id"], "normalized_domain": mapping["normalized_domain"],
        "match_type": mapping["match_type"], "confidence": mapping["confidence"],
        "match_reason": mapping["match_reason"], "is_outbound": is_outbound,
        "subject": subject, "date": parsed_date.isoformat() if parsed_date else "",
        "has_recruiting_signal": _has_recruiting_signal(subject),
        "edu_emails": all_edu_emails,
    }


def _aggregate(classified):
    groups = defaultdict(lambda: {
        "messages": [], "threads": set(), "outbound_count": 0, "inbound_count": 0,
        "subjects": [], "last_message_at": "", "last_message_direction": "", "edu_emails": set(),
    })
    for msg in classified:
        key = msg["school_id"] or msg["normalized_domain"]
        if not key:
            continue
        g = groups[key]
        g["messages"].append(msg)
        g["threads"].add(msg["thread_id"])
        if msg["is_outbound"]:
            g["outbound_count"] += 1
        else:
            g["inbound_count"] += 1
        if len(g["subjects"]) < 3 and msg["subject"] and msg["subject"] not in g["subjects"]:
            g["subjects"].append(msg["subject"])
        if msg["date"] > g["last_message_at"]:
            g["last_message_at"] = msg["date"]
            g["last_message_direction"] = "outbound" if msg["is_outbound"] else "inbound"
        for e in msg.get("edu_emails", []):
            g["edu_emails"].add(e)

    suggestions = []
    for key, g in groups.items():
        first_msg = g["messages"][0]
        suggestions.append({
            "school_id": first_msg["school_id"],
            "normalized_domain": first_msg["normalized_domain"],
            "match_type": first_msg["match_type"], "confidence": first_msg["confidence"],
            "match_reason": first_msg["match_reason"],
            "outbound_count": g["outbound_count"], "inbound_count": g["inbound_count"],
            "thread_count": len(g["threads"]),
            "last_message_at": g["last_message_at"],
            "last_message_direction": g["last_message_direction"],
            "sample_subjects": g["subjects"],
            "discovered_emails": sorted(g["edu_emails"]),
            "proposed_stage": None, "proposed_group": None,
            "followup_due_at": None, "attention_required": False, "ignored": False,
        })
    return suggestions

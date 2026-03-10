"""Athlete Gmail integration: OAuth, send/read emails, history import."""

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest
from googleapiclient.discovery import build
from typing import Optional
from datetime import datetime, timezone, timedelta
from collections import defaultdict
import os
import uuid
import base64
import logging
import email.mime.text
import email.mime.multipart
import asyncio

from auth_middleware import get_current_user_dep
from db_client import db
from encryption import encrypt_value, decrypt_value

logger = logging.getLogger(__name__)
router = APIRouter()

GMAIL_SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
]

_cached_gmail_creds = {"data": None, "fetched_at": 0}


async def _gmail_config_with_db(redirect_uri_override=None):
    import time
    now = time.time()
    if _cached_gmail_creds["data"] is None or (now - _cached_gmail_creds["fetched_at"]) > 300:
        doc = await db.app_config.find_one({"key": "gmail_oauth"}, {"_id": 0})
        _cached_gmail_creds["data"] = doc
        _cached_gmail_creds["fetched_at"] = now
    doc = _cached_gmail_creds["data"]
    if doc and doc.get("client_id") and doc.get("client_secret"):
        client_id = doc["client_id"]
        client_secret = doc["client_secret"]
        redirect_uri = redirect_uri_override or doc.get("redirect_uri") or os.environ.get("GMAIL_REDIRECT_URI", "")
    else:
        client_id = os.environ.get("GMAIL_CLIENT_ID", "")
        client_secret = os.environ.get("GMAIL_CLIENT_SECRET", "")
        redirect_uri = redirect_uri_override or os.environ.get("GMAIL_REDIRECT_URI", "")
    config = {
        "web": {
            "client_id": client_id, "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    }
    return client_id, client_secret, redirect_uri, config


def _get_redirect_uri(request: Request) -> str:
    origin = request.headers.get("origin") or request.headers.get("referer") or ""
    if "preview.emergentagent.com" in origin:
        from urllib.parse import urlparse
        parsed = urlparse(origin)
        return f"{parsed.scheme}://{parsed.netloc}/api/gmail/callback"
    return os.environ.get("GMAIL_REDIRECT_URI", "")


async def get_gmail_credentials(user_id: str):
    token_doc = await db.gmail_tokens.find_one({"user_id": user_id}, {"_id": 0})
    if not token_doc:
        return None
    client_id, client_secret, _, _ = await _gmail_config_with_db()
    access_token = token_doc["access_token"]
    refresh_token = token_doc.get("refresh_token")
    if token_doc.get("encrypted"):
        access_token = decrypt_value(access_token)
        refresh_token = decrypt_value(refresh_token) if refresh_token else None
    creds = Credentials(
        token=access_token, refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=client_id, client_secret=client_secret,
    )
    expires_at = token_doc.get("expires_at")
    if expires_at:
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) >= expires_at:
            try:
                creds.refresh(GoogleRequest())
                await db.gmail_tokens.update_one(
                    {"user_id": user_id},
                    {"$set": {"access_token": encrypt_value(creds.token),
                              "expires_at": creds.expiry.isoformat() if creds.expiry else None,
                              "encrypted": True}}
                )
            except Exception as e:
                logger.error(f"Token refresh failed for {user_id}: {e}")
                await db.gmail_tokens.delete_one({"user_id": user_id})
                return None
    return creds


def get_gmail_service(creds):
    return build("gmail", "v1", credentials=creds)


# ── Helper: resolve athlete tenant_id ──

async def _get_athlete_tenant(current_user: dict) -> str:
    if current_user["role"] not in ("athlete", "parent"):
        raise HTTPException(403, "Only athletes/parents can access this")
    athlete = await db.athletes.find_one({"user_id": current_user["id"]}, {"_id": 0, "tenant_id": 1})
    if not athlete or not athlete.get("tenant_id"):
        raise HTTPException(404, "No claimed athlete profile found")
    return athlete["tenant_id"]


# ─── OAuth Routes ───

@router.get("/athlete/gmail/connect")
async def gmail_connect(request: Request, return_to: str = "/athlete-settings", current_user: dict = get_current_user_dep()):
    _, _, redirect_uri, client_config = await _gmail_config_with_db(_get_redirect_uri(request))
    if not client_config["web"]["client_id"]:
        raise HTTPException(500, "Gmail OAuth not configured")
    flow = Flow.from_client_config(client_config, scopes=GMAIL_SCOPES, redirect_uri=redirect_uri)
    auth_url, state = flow.authorization_url(access_type="offline", prompt="consent", include_granted_scopes="true")
    safe_return = return_to if return_to.startswith("/") else "/athlete-settings"
    await db.gmail_oauth_states.insert_one({
        "state": state, "user_id": current_user["id"], "return_to": safe_return,
        "redirect_uri": redirect_uri, "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"auth_url": auth_url}


@router.get("/gmail/callback")
async def gmail_callback(request: Request, code: str = "", state: str = "", error: str = ""):
    state_doc = await db.gmail_oauth_states.find_one({"state": state}) if state else None
    return_to = (state_doc or {}).get("return_to", "/athlete-settings")
    stored_redirect_uri = (state_doc or {}).get("redirect_uri") or str(request.url).split("?")[0] or os.environ.get("GMAIL_REDIRECT_URI", "")
    frontend_url = stored_redirect_uri.replace("/api/gmail/callback", "") if stored_redirect_uri else ""

    if error:
        return RedirectResponse(f"{frontend_url}{return_to}?gmail=error&reason={error}")
    if not code or not state or not state_doc:
        return RedirectResponse(f"{frontend_url}{return_to}?gmail=error&reason=missing_params")

    user_id = state_doc["user_id"]
    await db.gmail_oauth_states.delete_one({"state": state})

    try:
        os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"
        _, _, _, client_config = await _gmail_config_with_db(stored_redirect_uri)
        flow = Flow.from_client_config(client_config, scopes=GMAIL_SCOPES, redirect_uri=stored_redirect_uri)
        flow.fetch_token(code=code)
        creds = flow.credentials

        service = build("gmail", "v1", credentials=creds)
        profile = service.users().getProfile(userId="me").execute()
        gmail_email = profile.get("emailAddress", "")

        token_doc = {
            "user_id": user_id,
            "access_token": encrypt_value(creds.token),
            "refresh_token": encrypt_value(creds.refresh_token) if creds.refresh_token else None,
            "expires_at": creds.expiry.isoformat() if creds.expiry else None,
            "gmail_email": gmail_email,
            "connected_at": datetime.now(timezone.utc).isoformat(),
            "encrypted": True,
        }
        await db.gmail_tokens.update_one({"user_id": user_id}, {"$set": token_doc}, upsert=True)
        logger.info(f"Gmail connected for user {user_id} ({gmail_email})")
        return RedirectResponse(f"{frontend_url}{return_to}?gmail=connected")
    except Exception as e:
        logger.error(f"Gmail callback error: {e}")
        import urllib.parse
        reason = urllib.parse.quote(f"token_exchange_failed: {str(e)[:200]}")
        return RedirectResponse(f"{frontend_url}{return_to}?gmail=error&reason={reason}")


@router.get("/athlete/gmail/status")
async def gmail_status(current_user: dict = get_current_user_dep()):
    token_doc = await db.gmail_tokens.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not token_doc:
        return {"connected": False}
    return {"connected": True, "gmail_email": token_doc.get("gmail_email", ""), "connected_at": token_doc.get("connected_at", "")}


@router.post("/athlete/gmail/disconnect")
async def gmail_disconnect(current_user: dict = get_current_user_dep()):
    creds = await get_gmail_credentials(current_user["id"])
    if creds and creds.token:
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                await client.post("https://oauth2.googleapis.com/revoke", params={"token": creds.token})
        except Exception as e:
            logger.warning(f"Google token revoke failed: {e}")
    await db.gmail_tokens.delete_one({"user_id": current_user["id"]})
    return {"ok": True}


# ─── Email Send (simplified — logs to timeline when Gmail not connected) ───

@router.post("/athlete/gmail/send")
async def send_email_via_gmail(request: Request, current_user: dict = get_current_user_dep()):
    body = await request.json()
    to = body.get("to", "")
    subject = body.get("subject", "")
    body_text = body.get("body", "")
    program_id = body.get("program_id", "")
    university_name = body.get("university_name", "")

    tenant_id = await _get_athlete_tenant(current_user)
    creds = await get_gmail_credentials(current_user["id"])

    if creds:
        try:
            service = get_gmail_service(creds)
            profile = service.users().getProfile(userId="me").execute()
            sender = profile.get("emailAddress", "")
            message = email.mime.multipart.MIMEMultipart()
            message["to"] = to
            message["from"] = sender
            message["subject"] = subject
            msg_body = email.mime.text.MIMEText(body_text, "html")
            message.attach(msg_body)
            raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
            sent = service.users().messages().send(userId="me", body={"raw": raw}).execute()

            # Log interaction
            now = datetime.now(timezone.utc)
            await db.interactions.insert_one({
                "interaction_id": str(uuid.uuid4()), "tenant_id": tenant_id,
                "program_id": program_id, "university_name": university_name,
                "type": "Email Sent", "notes": f"Subject: {subject}\n\n{body_text}",
                "outcome": "No Response", "date_time": now.isoformat(),
                "created_at": now.isoformat(),
            })
            # AUTOMATION: Email sent → status updates + 14-day follow-up
            follow_up = (now + timedelta(days=14)).strftime("%Y-%m-%d")
            program_updates = {
                "next_action_due": follow_up,
                "updated_at": now.isoformat(),
            }
            prog = await db.programs.find_one(
                {"program_id": program_id, "tenant_id": tenant_id}, {"_id": 0}
            )
            if prog:
                if prog.get("recruiting_status") == "Not Contacted":
                    program_updates["recruiting_status"] = "Contacted"
                    program_updates["initial_contact_sent"] = now.strftime("%Y-%m-%d")
                if prog.get("reply_status") in (None, "", "No Reply"):
                    program_updates["reply_status"] = "Awaiting Reply"
            await db.programs.update_one(
                {"program_id": program_id, "tenant_id": tenant_id},
                {"$set": program_updates}
            )
            return {"status": "sent", "id": sent["id"], "gmail_sent": True}
        except Exception as e:
            logger.error(f"Gmail send failed: {e}")
            raise HTTPException(500, "Failed to send via Gmail")
    else:
        # Fallback: log as interaction
        now = datetime.now(timezone.utc)
        await db.interactions.insert_one({
            "interaction_id": str(uuid.uuid4()), "tenant_id": tenant_id,
            "program_id": program_id, "university_name": university_name,
            "type": "Email Sent", "notes": f"Subject: {subject}\n\n{body_text}",
            "outcome": "No Response", "date_time": now.isoformat(),
            "created_at": now.isoformat(),
        })
        # AUTOMATION: Email sent → status updates
        program_updates = {"updated_at": now.isoformat(), "next_action_due": (now + timedelta(days=14)).strftime("%Y-%m-%d")}
        prog = await db.programs.find_one({"program_id": program_id, "tenant_id": tenant_id}, {"_id": 0})
        if prog:
            if prog.get("recruiting_status") == "Not Contacted":
                program_updates["recruiting_status"] = "Contacted"
                program_updates["initial_contact_sent"] = now.strftime("%Y-%m-%d")
            if prog.get("reply_status") in (None, "", "No Reply"):
                program_updates["reply_status"] = "Awaiting Reply"
        await db.programs.update_one({"program_id": program_id, "tenant_id": tenant_id}, {"$set": program_updates})
        return {"status": "logged", "gmail_sent": False}


# ─── Gmail History Import ───

@router.post("/athlete/gmail/import-history")
async def start_import(current_user: dict = get_current_user_dep()):
    user_id = current_user["id"]
    tenant_id = await _get_athlete_tenant(current_user)

    # Check for resumable run
    expiry_cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    resumable = await db.import_runs.find_one(
        {"user_id": user_id, "status": "ready", "completed_at": {"$gte": expiry_cutoff}},
        {"_id": 0, "run_id": 1, "suggestions": 1, "confirmed_school_ids": 1}
    )
    if resumable:
        suggestions = resumable.get("suggestions", [])
        confirmed = set(resumable.get("confirmed_school_ids", []))
        existing = await db.programs.find({"tenant_id": tenant_id}, {"_id": 0, "university_name": 1}).to_list(1000)
        existing_names = {p["university_name"] for p in existing}
        remaining = [s for s in suggestions if s.get("school_id") and s["school_id"] not in confirmed and s["school_id"] not in existing_names and not s.get("ignored")]
        if remaining:
            return {"run_id": resumable["run_id"], "resumed": True}

    creds = await get_gmail_credentials(user_id)
    if not creds:
        raise HTTPException(403, "Gmail not connected")

    active = await db.import_runs.find_one(
        {"user_id": user_id, "status": {"$in": ["scanning", "aggregating"]}},
        {"_id": 0, "run_id": 1}
    )
    if active:
        raise HTTPException(409, detail="Import already in progress", headers={"X-Run-Id": active["run_id"]})

    run_id = f"import_{uuid.uuid4().hex[:12]}"
    await db.import_runs.insert_one({
        "run_id": run_id, "user_id": user_id, "tenant_id": tenant_id,
        "status": "scanning", "started_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None, "messages_scanned": 0, "schools_found": 0,
        "suggestions": [], "confirmed_school_ids": [], "error": None,
    })

    from services.gmail_import import run_gmail_import
    asyncio.create_task(run_gmail_import(run_id, user_id, db, get_gmail_credentials, get_gmail_service))
    return {"run_id": run_id}


@router.get("/athlete/gmail/import-history/{run_id}/status")
async def import_status(run_id: str, current_user: dict = get_current_user_dep()):
    run = await db.import_runs.find_one({"run_id": run_id, "user_id": current_user["id"]}, {"_id": 0})
    if not run:
        raise HTTPException(404, "Import run not found")
    result = {
        "phase": run["status"], "messages_scanned": run.get("messages_scanned", 0),
        "schools_found": run.get("schools_found", 0),
    }
    if run["status"] == "ready":
        tenant_id = await _get_athlete_tenant(current_user)
        suggestions = run.get("suggestions", [])
        existing = await db.programs.find({"tenant_id": tenant_id}, {"_id": 0, "university_name": 1}).to_list(1000)
        existing_names = {p["university_name"] for p in existing}
        for s in suggestions:
            s["already_on_board"] = (s.get("school_id") or "") in existing_names
        result["suggestions"] = suggestions
        result["plan_info"] = {
            "tier": "pro", "label": "Pro", "max_schools": -1,
            "current_count": len(existing), "remaining_slots": -1,
        }
    if run["status"] == "failed":
        result["error"] = run.get("error")
    return result


@router.post("/athlete/gmail/import-history/{run_id}/confirm")
async def confirm_import(run_id: str, request: Request, current_user: dict = get_current_user_dep()):
    user_id = current_user["id"]
    tenant_id = await _get_athlete_tenant(current_user)

    run = await db.import_runs.find_one({"run_id": run_id, "user_id": user_id}, {"_id": 0})
    if not run:
        raise HTTPException(404, "Import run not found")
    if run["status"] != "ready":
        raise HTTPException(400, f"Run is not ready (status: {run['status']})")

    body = await request.json()
    selected = body.get("selected", [])
    if not selected:
        raise HTTPException(400, "No schools selected")

    suggestion_map = {}
    for s in run.get("suggestions", []):
        key = s.get("school_id") or s.get("normalized_domain")
        if key:
            suggestion_map[key] = s

    created_count = 0
    skipped_count = 0
    created_ids = []

    for item in selected:
        school_id = item.get("school_id")
        domain_hint = item.get("domain")
        if not school_id and domain_hint:
            kb_match = await db.university_knowledge_base.find_one({"domain": domain_hint}, {"_id": 0, "university_name": 1})
            if kb_match:
                school_id = kb_match["university_name"]
        if not school_id:
            skipped_count += 1
            continue

        suggestion = suggestion_map.get(school_id) or suggestion_map.get(domain_hint or "")
        if not suggestion:
            skipped_count += 1
            continue

        existing = await db.programs.find_one({"tenant_id": tenant_id, "university_name": school_id}, {"_id": 0, "program_id": 1})
        if existing:
            skipped_count += 1
            continue

        kb = await db.university_knowledge_base.find_one(
            {"university_name": school_id},
            {"_id": 0, "division": 1, "conference": 1, "website": 1, "coach_email": 1,
             "primary_coach": 1, "state": 1, "region": 1, "domain": 1}
        )
        if not kb:
            skipped_count += 1
            continue

        program_id = f"prog_{uuid.uuid4().hex[:12]}"
        stage = suggestion.get("proposed_stage", "added")
        doc = {
            "program_id": program_id, "tenant_id": tenant_id,
            "university_name": school_id, "domain": kb.get("domain", ""),
            "division": kb.get("division", ""), "conference": kb.get("conference", ""),
            "website": kb.get("website", ""), "journey_stage": stage,
            "recruiting_status": "active", "priority": "Medium", "is_active": True,
            "next_action_due": suggestion.get("followup_due_at", ""),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "imported_at": datetime.now(timezone.utc).isoformat(),
            "import_run_id": run_id,
            "athlete_interest": 5, "school_interest": 0, "notes": "",
        }
        await db.programs.insert_one(doc)
        doc.pop("_id", None)
        created_count += 1
        created_ids.append(school_id)

        # Auto-create coaches from KB + discovered emails
        now = datetime.now(timezone.utc).isoformat()
        created_emails = set()
        kb_email = (kb.get("coach_email") or "").strip().lower()
        if kb_email and "@" in kb_email:
            await db.college_coaches.insert_one({
                "coach_id": f"coach_{uuid.uuid4().hex[:12]}", "program_id": program_id,
                "tenant_id": tenant_id, "university_name": school_id,
                "coach_name": kb.get("primary_coach") or "Head Coach", "role": "Head Coach",
                "email": kb_email, "phone": "", "notes": "Auto-added from school database",
                "created_at": now,
            })
            created_emails.add(kb_email)

        for email_addr in suggestion.get("discovered_emails", []):
            email_addr = email_addr.strip().lower()
            if email_addr in created_emails or not email_addr or "@" not in email_addr:
                continue
            local_part = email_addr.split("@")[0]
            display_name = local_part.replace(".", " ").replace("_", " ").title()
            await db.college_coaches.insert_one({
                "coach_id": f"coach_{uuid.uuid4().hex[:12]}", "program_id": program_id,
                "tenant_id": tenant_id, "university_name": school_id,
                "coach_name": display_name, "role": "Coach",
                "email": email_addr, "phone": "", "notes": "Discovered from Gmail history",
                "created_at": now,
            })
            created_emails.add(email_addr)

    await db.import_runs.update_one(
        {"run_id": run_id},
        {"$set": {"confirmed_at": datetime.now(timezone.utc).isoformat(), "confirmed_school_ids": created_ids}}
    )
    return {"created_count": created_count, "skipped_count": skipped_count}


import re as _re
import email.mime.base
import email.encoders


def _extract_body(payload):
    body_html = ""
    body_text = ""
    if payload.get("mimeType") == "text/html":
        data = payload.get("body", {}).get("data", "")
        if data:
            body_html = base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")
    elif payload.get("mimeType") == "text/plain":
        data = payload.get("body", {}).get("data", "")
        if data:
            body_text = base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")
    elif payload.get("mimeType", "").startswith("multipart"):
        for part in payload.get("parts", []):
            h, t = _extract_body(part)
            if h and not body_html:
                body_html = h
            if t and not body_text:
                body_text = t
    return body_html, body_text


def _extract_attachments(payload):
    attachments = []
    if payload.get("filename"):
        attachments.append({
            "filename": payload["filename"],
            "mime_type": payload.get("mimeType", ""),
            "size": payload.get("body", {}).get("size", 0),
            "attachment_id": payload.get("body", {}).get("attachmentId", ""),
        })
    for part in payload.get("parts", []):
        attachments.extend(_extract_attachments(part))
    return attachments


def _strip_quoted_reply(text):
    if not text:
        return text
    lines = text.split("\n")
    result = []
    for i, line in enumerate(lines):
        stripped = line.strip()
        if _re.match(r'^On .+ wrote:\s*$', stripped):
            break
        if "forwarded message" in stripped.lower() and "---" in stripped:
            break
        if _re.match(r'^From:\s+.+[@<]', stripped) and len(result) > 2:
            next_lines = "\n".join(lines[i:i+4])
            if _re.search(r'Date:|To:|Subject:', next_lines):
                break
        if stripped.startswith(">") and len(result) > 0 and (not result[-1].strip() or result[-1].strip().startswith(">")):
            break
        line = _re.sub(r'\[cid:[a-f0-9\-]+\]', '', line)
        result.append(line)
    while result and not result[-1].strip():
        result.pop()
    return "\n".join(result)


# ─── Inbox: List Emails ───

@router.get("/athlete/gmail/emails")
async def list_emails(
    current_user: dict = get_current_user_dep(),
    page_token: Optional[str] = None,
    q: Optional[str] = None,
    max_results: int = 20,
):
    creds = await get_gmail_credentials(current_user["id"])
    if not creds:
        raise HTTPException(403, "Gmail not connected")

    tenant_id = await _get_athlete_tenant(current_user)
    coaches = await db.college_coaches.find({"tenant_id": tenant_id, "email": {"$ne": ""}}, {"_id": 0, "email": 1}).to_list(500)
    coach_emails = [c["email"].strip().lower() for c in coaches if c.get("email", "").strip()]

    try:
        service = get_gmail_service(creds)
        params = {"userId": "me", "maxResults": max_results}
        if page_token:
            params["pageToken"] = page_token

        filter_parts = ["from:*.edu OR to:*.edu"]
        for em in coach_emails[:10]:
            filter_parts.append(em)
        recruit_query = "(" + " OR ".join(filter_parts) + ")"
        params["q"] = f"{recruit_query} {q}" if q else recruit_query

        results = service.users().messages().list(**params).execute()
        messages = results.get("messages", [])
        next_page_token = results.get("nextPageToken")

        coach_set = set(coach_emails)
        email_list = []
        for msg_ref in messages:
            msg = service.users().messages().get(
                userId="me", id=msg_ref["id"], format="metadata",
                metadataHeaders=["From", "To", "Subject", "Date", "Cc"],
            ).execute()
            headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
            from_addr = headers.get("From", "").lower()
            to_addr = headers.get("To", "").lower()
            is_known = any(ce in from_addr or ce in to_addr for ce in coach_set) if coach_set else False
            email_list.append({
                "id": msg["id"],
                "thread_id": msg["threadId"],
                "snippet": msg.get("snippet", ""),
                "subject": headers.get("Subject", "(no subject)"),
                "from": headers.get("From", ""),
                "to": headers.get("To", ""),
                "cc": headers.get("Cc", ""),
                "date": headers.get("Date", ""),
                "internal_date": msg.get("internalDate", ""),
                "label_ids": msg.get("labelIds", []),
                "is_unread": "UNREAD" in msg.get("labelIds", []),
                "is_known_coach": is_known,
            })

        return {
            "emails": email_list,
            "next_page_token": next_page_token,
            "result_size_estimate": results.get("resultSizeEstimate", 0),
        }
    except Exception as e:
        logger.error(f"Error listing emails: {e}")
        if "invalid_grant" in str(e).lower() or "token" in str(e).lower():
            await db.gmail_tokens.delete_one({"user_id": current_user["id"]})
            raise HTTPException(403, "Gmail token expired. Please reconnect.")
        raise HTTPException(500, "Failed to fetch emails")


# ─── Inbox: Get Single Email ───

@router.get("/athlete/gmail/emails/{message_id}")
async def get_email(message_id: str, current_user: dict = get_current_user_dep()):
    creds = await get_gmail_credentials(current_user["id"])
    if not creds:
        raise HTTPException(403, "Gmail not connected")

    try:
        service = get_gmail_service(creds)
        msg = service.users().messages().get(userId="me", id=message_id, format="full").execute()
        headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
        body_html, body_text = _extract_body(msg.get("payload", {}))
        attachments = _extract_attachments(msg.get("payload", {}))

        return {
            "id": msg["id"],
            "thread_id": msg["threadId"],
            "subject": headers.get("Subject", "(no subject)"),
            "from": headers.get("From", ""),
            "to": headers.get("To", ""),
            "cc": headers.get("Cc", ""),
            "date": headers.get("Date", ""),
            "internal_date": msg.get("internalDate", ""),
            "label_ids": msg.get("labelIds", []),
            "body_html": body_html,
            "body_text": _strip_quoted_reply(body_text),
            "body_text_full": body_text,
            "attachments": attachments,
            "is_unread": False,
        }
    except Exception as e:
        logger.error(f"Error getting email {message_id}: {e}")
        raise HTTPException(500, "Failed to fetch email")


# ─── Inbox: Get Thread ───

@router.get("/athlete/gmail/threads/{thread_id}")
async def get_thread(thread_id: str, current_user: dict = get_current_user_dep()):
    creds = await get_gmail_credentials(current_user["id"])
    if not creds:
        raise HTTPException(403, "Gmail not connected")

    try:
        service = get_gmail_service(creds)
        thread = service.users().threads().get(userId="me", id=thread_id, format="full").execute()
        messages = []
        for msg in thread.get("messages", []):
            headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
            body_html, body_text = _extract_body(msg.get("payload", {}))
            attachments = _extract_attachments(msg.get("payload", {}))
            messages.append({
                "id": msg["id"],
                "thread_id": msg["threadId"],
                "subject": headers.get("Subject", "(no subject)"),
                "from": headers.get("From", ""),
                "to": headers.get("To", ""),
                "cc": headers.get("Cc", ""),
                "date": headers.get("Date", ""),
                "internal_date": msg.get("internalDate", ""),
                "label_ids": msg.get("labelIds", []),
                "body_html": body_html,
                "body_text": body_text,
                "attachments": attachments,
                "is_unread": "UNREAD" in msg.get("labelIds", []),
            })
        return {"thread_id": thread_id, "messages": messages, "subject": messages[0]["subject"] if messages else ""}
    except Exception as e:
        logger.error(f"Error getting thread {thread_id}: {e}")
        raise HTTPException(500, "Failed to fetch thread")


# ─── Inbox: Reply ───

@router.post("/athlete/gmail/reply")
async def reply_email(request: Request, current_user: dict = get_current_user_dep()):
    creds = await get_gmail_credentials(current_user["id"])
    if not creds:
        raise HTTPException(403, "Gmail not connected")

    body = await request.json()
    message_id = body.get("message_id")
    thread_id = body.get("thread_id")
    reply_body = body.get("body", "")
    reply_all = body.get("reply_all", False)

    if not message_id or not thread_id or not reply_body:
        raise HTTPException(400, "message_id, thread_id, and body are required")

    try:
        service = get_gmail_service(creds)
        original = service.users().messages().get(
            userId="me", id=message_id, format="metadata",
            metadataHeaders=["From", "To", "Subject", "Message-ID", "Cc"],
        ).execute()
        orig_headers = {h["name"]: h["value"] for h in original.get("payload", {}).get("headers", [])}

        profile = service.users().getProfile(userId="me").execute()
        sender_email = profile.get("emailAddress", "")

        message = email.mime.multipart.MIMEMultipart()
        reply_to = orig_headers.get("From", "")
        message["to"] = reply_to
        if reply_all:
            all_to = set()
            for addr in (orig_headers.get("To", "") + "," + orig_headers.get("Cc", "")).split(","):
                addr = addr.strip()
                if addr and sender_email.lower() not in addr.lower():
                    all_to.add(addr)
            all_to.discard(reply_to)
            if all_to:
                message["cc"] = ", ".join(all_to)

        message["from"] = sender_email
        subject = orig_headers.get("Subject", "")
        if not subject.lower().startswith("re:"):
            subject = f"Re: {subject}"
        message["subject"] = subject

        msg_id = orig_headers.get("Message-ID", "")
        if msg_id:
            message["In-Reply-To"] = msg_id
            message["References"] = msg_id

        msg_body = email.mime.text.MIMEText(reply_body, "html")
        message.attach(msg_body)

        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
        sent = service.users().messages().send(userId="me", body={"raw": raw, "threadId": thread_id}).execute()

        # Auto-update program status when replying to a coach
        tenant_id = await _get_athlete_tenant(current_user)
        recipient_email = reply_to.strip().lower()
        if "<" in recipient_email and ">" in recipient_email:
            recipient_email = recipient_email.split("<")[1].split(">")[0].strip()

        coach = await db.college_coaches.find_one(
            {"tenant_id": tenant_id, "email": {"$regex": f"^{_re.escape(recipient_email)}$", "$options": "i"}},
            {"_id": 0, "program_id": 1}
        )
        if coach:
            program = await db.programs.find_one(
                {"program_id": coach["program_id"], "tenant_id": tenant_id},
                {"_id": 0, "recruiting_status": 1, "reply_status": 1}
            )
            if program:
                updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
                if program.get("recruiting_status") in ["Not Contacted", "Researching", "", None]:
                    updates["recruiting_status"] = "Contacted"
                if program.get("reply_status") in ["No Reply", "", None]:
                    updates["reply_status"] = "Awaiting Reply"
                if len(updates) > 1:
                    await db.programs.update_one({"program_id": coach["program_id"], "tenant_id": tenant_id}, {"$set": updates})

        return {"id": sent["id"], "thread_id": sent.get("threadId", ""), "status": "sent"}
    except Exception as e:
        logger.error(f"Error replying to email: {e}")
        raise HTTPException(500, "Failed to send reply")


# ─── Check Coach Replies ───

@router.post("/athlete/gmail/check-replies")
async def check_replies(current_user: dict = get_current_user_dep()):
    creds = await get_gmail_credentials(current_user["id"])
    if not creds:
        raise HTTPException(403, "Gmail not connected")

    tenant_id = await _get_athlete_tenant(current_user)
    coaches = await db.college_coaches.find({"tenant_id": tenant_id, "email": {"$ne": ""}}, {"_id": 0, "email": 1, "program_id": 1}).to_list(500)
    if not coaches:
        return {"updated_count": 0}

    coach_map = {}
    for c in coaches:
        em = c.get("email", "").strip().lower()
        if em:
            coach_map[em] = c["program_id"]

    no_reply_progs = await db.programs.find(
        {"tenant_id": tenant_id, "reply_status": {"$in": ["No Reply", "Awaiting Reply", "", None]}},
        {"_id": 0, "program_id": 1, "university_name": 1}
    ).to_list(500)
    no_reply_ids = {p["program_id"]: p.get("university_name", "") for p in no_reply_progs}
    if not no_reply_ids:
        return {"updated_count": 0}

    try:
        service = get_gmail_service(creds)
        from_queries = [f"from:{em}" for em in list(coach_map.keys())[:20]]
        query = f"({' OR '.join(from_queries)})"
        results = service.users().messages().list(userId="me", q=query, maxResults=100).execute()
        messages = results.get("messages", [])

        updated = []
        for msg_ref in messages:
            msg = service.users().messages().get(userId="me", id=msg_ref["id"], format="metadata", metadataHeaders=["From"]).execute()
            headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
            from_addr = headers.get("From", "").lower()
            for coach_email, program_id in coach_map.items():
                if coach_email in from_addr and program_id in no_reply_ids:
                    await db.programs.update_one(
                        {"program_id": program_id, "tenant_id": tenant_id},
                        {"$set": {"reply_status": "Reply Received", "priority": "Very High", "updated_at": datetime.now(timezone.utc).isoformat()}}
                    )
                    updated.append({"program_id": program_id, "university_name": no_reply_ids[program_id]})
                    del no_reply_ids[program_id]
                    break

        return {"updated_count": len(updated), "updated_programs": updated}
    except Exception as e:
        logger.error(f"Error checking replies: {e}")
        raise HTTPException(500, "Failed to check replies")

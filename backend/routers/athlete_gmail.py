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
            await db.interactions.insert_one({
                "interaction_id": str(uuid.uuid4()), "tenant_id": tenant_id,
                "program_id": program_id, "university_name": university_name,
                "type": "Email Sent", "notes": f"Subject: {subject}\n\n{body_text}",
                "outcome": "No Response", "date_time": datetime.now(timezone.utc).isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            # Auto-set 14-day follow-up
            follow_up = (datetime.now(timezone.utc) + timedelta(days=14)).strftime("%Y-%m-%d")
            await db.programs.update_one(
                {"program_id": program_id, "tenant_id": tenant_id},
                {"$set": {"next_action_due": follow_up, "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            return {"status": "sent", "id": sent["id"], "gmail_sent": True}
        except Exception as e:
            logger.error(f"Gmail send failed: {e}")
            raise HTTPException(500, "Failed to send via Gmail")
    else:
        # Fallback: log as interaction
        await db.interactions.insert_one({
            "interaction_id": str(uuid.uuid4()), "tenant_id": tenant_id,
            "program_id": program_id, "university_name": university_name,
            "type": "Email Sent", "notes": f"Subject: {subject}\n\n{body_text}",
            "outcome": "No Response", "date_time": datetime.now(timezone.utc).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
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

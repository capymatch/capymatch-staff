"""Athlete Settings routes: profile, password, privacy, data export."""

from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone
import uuid

from auth_middleware import get_current_user_dep
from db_client import db

router = APIRouter()


async def _get_athlete_tenant(current_user: dict) -> str:
    if current_user["role"] not in ("athlete", "parent"):
        raise HTTPException(403, "Only athletes/parents can access this")
    athlete = await db.athletes.find_one({"user_id": current_user["id"]}, {"_id": 0, "tenant_id": 1})
    if not athlete or not athlete.get("tenant_id"):
        raise HTTPException(404, "No claimed athlete profile found")
    return athlete["tenant_id"]


@router.get("/athlete/settings")
async def get_settings(current_user: dict = get_current_user_dep()):
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    if not user:
        raise HTTPException(404, "User not found")
    athlete = await db.athletes.find_one({"user_id": current_user["id"]}, {"_id": 0})
    preferences = (athlete or {}).get("preferences", {})
    return {
        "name": user.get("name", ""),
        "email": user.get("email", ""),
        "created_at": user.get("created_at", ""),
        "preferences": {
            "email_notifications": preferences.get("email_notifications", True),
            "followup_reminders": preferences.get("followup_reminders", True),
            "inbound_scan": preferences.get("inbound_scan", False),
            "theme": preferences.get("theme", "dark"),
        },
    }


@router.put("/athlete/settings")
async def update_settings(request: Request, current_user: dict = get_current_user_dep()):
    body = await request.json()
    allowed_prefs = {"email_notifications", "followup_reminders", "inbound_scan", "theme"}
    prefs_update = {}
    for key in allowed_prefs:
        if key in body:
            prefs_update[f"preferences.{key}"] = body[key]

    if "name" in body:
        await db.users.update_one({"id": current_user["id"]}, {"$set": {"name": body["name"]}})
    if "email" in body and body["email"] != current_user["email"]:
        existing = await db.users.find_one({"email": body["email"]}, {"_id": 0, "id": 1})
        if existing and existing["id"] != current_user["id"]:
            raise HTTPException(400, "Email already in use")
        await db.users.update_one({"id": current_user["id"]}, {"$set": {"email": body["email"]}})
    if prefs_update:
        await db.athletes.update_one({"user_id": current_user["id"]}, {"$set": prefs_update})
    return {"ok": True}


@router.post("/athlete/settings/change-password")
async def change_password(request: Request, current_user: dict = get_current_user_dep()):
    body = await request.json()
    current_pwd = body.get("current_password", "")
    new_pwd = body.get("new_password", "")
    if not current_pwd or not new_pwd:
        raise HTTPException(400, "Both current and new password required")
    if len(new_pwd) < 6:
        raise HTTPException(400, "New password must be at least 6 characters")

    import bcrypt
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    if not user:
        raise HTTPException(404, "User not found")
    hashed = user.get("password_hash", "")
    if not hashed:
        raise HTTPException(400, "Password login not available for this account")
    if not bcrypt.checkpw(current_pwd.encode(), hashed.encode()):
        raise HTTPException(400, "Current password is incorrect")

    new_hash = bcrypt.hashpw(new_pwd.encode(), bcrypt.gensalt()).decode()
    await db.users.update_one({"id": current_user["id"]}, {"$set": {"password_hash": new_hash}})
    return {"ok": True}


@router.get("/athlete/settings/export-data")
async def export_data(current_user: dict = get_current_user_dep()):
    tenant_id = await _get_athlete_tenant(current_user)
    athlete = await db.athletes.find_one({"user_id": current_user["id"]}, {"_id": 0})
    programs = await db.programs.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(500)
    coaches = await db.college_coaches.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(500)
    interactions = await db.interactions.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(2000)
    events = await db.athlete_events.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(500)
    return {
        "athlete": athlete,
        "programs": programs,
        "college_coaches": coaches,
        "interactions": interactions,
        "events": events,
        "exported_at": datetime.now(timezone.utc).isoformat(),
    }


@router.delete("/athlete/settings/delete-account")
async def delete_account(request: Request, current_user: dict = get_current_user_dep()):
    body = await request.json()
    confirmation = body.get("confirmation", "")
    if confirmation != "DELETE":
        raise HTTPException(400, "Please type DELETE to confirm")

    tenant_id = await _get_athlete_tenant(current_user)
    await db.programs.delete_many({"tenant_id": tenant_id})
    await db.college_coaches.delete_many({"tenant_id": tenant_id})
    await db.interactions.delete_many({"tenant_id": tenant_id})
    await db.athlete_events.delete_many({"tenant_id": tenant_id})
    await db.gmail_tokens.delete_one({"user_id": current_user["id"]})
    await db.import_runs.delete_many({"user_id": current_user["id"]})
    await db.athletes.delete_one({"user_id": current_user["id"]})
    await db.users.delete_one({"id": current_user["id"]})
    return {"ok": True, "message": "All your data has been permanently deleted."}

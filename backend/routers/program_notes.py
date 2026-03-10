"""Program Notes — private notes CRUD for athlete programs."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional
import uuid

from auth_middleware import get_current_user_dep
from db_client import db


router = APIRouter()


class NoteCreate(BaseModel):
    content: str


class NoteUpdate(BaseModel):
    content: Optional[str] = None
    is_pinned: Optional[bool] = None


async def _get_tenant(current_user: dict) -> str:
    from routers.athlete_dashboard import get_athlete_tenant
    return await get_athlete_tenant(current_user)


@router.get("/athlete/programs/{program_id}/notes")
async def list_notes(program_id: str, current_user: dict = get_current_user_dep()):
    tenant_id = await _get_tenant(current_user)
    notes = await db.notes.find(
        {"tenant_id": tenant_id, "program_id": program_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    pinned = [n for n in notes if n.get("is_pinned")]
    unpinned = [n for n in notes if not n.get("is_pinned")]
    return {"pinned": pinned, "recent": unpinned}


@router.post("/athlete/programs/{program_id}/notes")
async def create_note(program_id: str, data: NoteCreate, current_user: dict = get_current_user_dep()):
    tenant_id = await _get_tenant(current_user)
    prog = await db.programs.find_one(
        {"program_id": program_id, "tenant_id": tenant_id}, {"_id": 0}
    )
    if not prog:
        raise HTTPException(404, "Program not found")
    if not data.content.strip():
        raise HTTPException(400, "Note content is required")
    note_id = f"note_{uuid.uuid4().hex[:12]}"
    doc = {
        "note_id": note_id,
        "tenant_id": tenant_id,
        "program_id": program_id,
        "content": data.content.strip(),
        "is_pinned": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.notes.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/athlete/notes/{note_id}")
async def update_note(note_id: str, data: NoteUpdate, current_user: dict = get_current_user_dep()):
    tenant_id = await _get_tenant(current_user)
    existing = await db.notes.find_one(
        {"note_id": note_id, "tenant_id": tenant_id}, {"_id": 0}
    )
    if not existing:
        raise HTTPException(404, "Note not found")
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if not updates:
        return existing
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.notes.update_one(
        {"note_id": note_id, "tenant_id": tenant_id}, {"$set": updates}
    )
    updated = await db.notes.find_one(
        {"note_id": note_id, "tenant_id": tenant_id}, {"_id": 0}
    )
    return updated


@router.delete("/athlete/notes/{note_id}")
async def delete_note(note_id: str, current_user: dict = get_current_user_dep()):
    tenant_id = await _get_tenant(current_user)
    result = await db.notes.delete_one(
        {"note_id": note_id, "tenant_id": tenant_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(404, "Note not found")
    return {"ok": True}

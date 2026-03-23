"""
File upload/download endpoints for message attachments.
"""
import uuid
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import Response
from db_client import db
from auth_middleware import get_current_user_dep
from services.storage import upload_file, get_object

log = logging.getLogger(__name__)
router = APIRouter(tags=["files"])

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_TYPES = {
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain", "text/csv",
}


@router.post("/files/upload")
async def upload(file: UploadFile = File(...), current_user: dict = get_current_user_dep()):
    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"File type not allowed: {content_type}")

    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(400, "File too large (max 10 MB)")

    result = upload_file(data, file.filename, content_type, current_user["id"])

    doc = {
        "id": result["file_id"],
        "storage_path": result["storage_path"],
        "original_filename": result["original_filename"],
        "content_type": result["content_type"],
        "size": result["size"],
        "uploaded_by": current_user["id"],
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.files.insert_one(doc)
    doc.pop("_id", None)

    return {
        "file_id": result["file_id"],
        "filename": result["original_filename"],
        "content_type": result["content_type"],
        "size": result["size"],
    }


@router.get("/files/{file_id}/download")
async def download(file_id: str, current_user: dict = get_current_user_dep()):
    record = await db.files.find_one({"id": file_id, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(404, "File not found")

    data, ct = get_object(record["storage_path"])
    return Response(
        content=data,
        media_type=record.get("content_type", ct),
        headers={"Content-Disposition": f'inline; filename="{record["original_filename"]}"'},
    )

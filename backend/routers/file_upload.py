"""
File upload/download endpoints for message attachments.
"""
import magic
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import Response
from db_client import db
from auth_middleware import get_current_user_dep
from services.storage import upload_file, get_object

log = logging.getLogger(__name__)
router = APIRouter(tags=["files"])

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

# Allowed MIME types — checked against both header AND actual file content
ALLOWED_TYPES = {
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain", "text/csv",
}

# Fallback extension whitelist for when magic detection is unreliable (e.g., xlsx/docx)
ALLOWED_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".gif", ".webp",
    ".pdf", ".doc", ".docx", ".xls", ".xlsx",
    ".txt", ".csv",
}


@router.post("/files/upload")
async def upload(file: UploadFile = File(...), current_user: dict = get_current_user_dep()):
    # Check extension first
    filename = file.filename or ""
    ext = ("." + filename.rsplit(".", 1)[-1].lower()) if "." in filename else ""
    if ext and ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"File type not allowed: {ext}")

    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(400, "File too large (max 10 MB)")

    # Validate actual file content via magic bytes
    detected_type = magic.from_buffer(data, mime=True)
    declared_type = file.content_type or "application/octet-stream"

    # Explicit magic byte validation for critical file types
    MAGIC_HEADERS = {
        ".pdf": b"%PDF",
        ".png": b"\x89PNG",
        ".jpg": b"\xff\xd8\xff",
        ".jpeg": b"\xff\xd8\xff",
        ".gif": b"GIF8",
    }
    expected_header = MAGIC_HEADERS.get(ext)
    if expected_header and not data[:len(expected_header)].startswith(expected_header):
        log.warning(f"Upload blocked: magic bytes mismatch for {ext}, user={current_user['id']}")
        raise HTTPException(400, "File content does not match its declared type")

    # For Office XML formats (docx/xlsx), magic often returns application/zip — allow if extension matches
    is_office_xml = ext in {".docx", ".xlsx"} and detected_type in {"application/zip", "application/x-zip-compressed"}
    actual_type = detected_type if detected_type != "application/octet-stream" else declared_type

    if not is_office_xml and actual_type not in ALLOWED_TYPES:
        log.warning(f"Upload blocked: declared={declared_type}, detected={detected_type}, ext={ext}, user={current_user['id']}")
        raise HTTPException(400, f"File content type not allowed: {detected_type}")

    result = upload_file(data, filename, actual_type, current_user["id"])

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

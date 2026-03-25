"""
File upload/download endpoints for message attachments.

Security layers (in order):
  1. Filename sanitization (path traversal, null bytes, control chars, length)
  2. Extension whitelist + dangerous extension deny-list
  3. Size limits (zero-byte and max 10MB)
  4. Magic byte header validation for critical types
  5. python-magic content type detection
  6. Safe storage path (UUID-based, no user-supplied path components)
  7. Safe Content-Disposition header (RFC 5987 encoding)
"""

import re
try:
    import magic
    _HAS_MAGIC = True
except (ImportError, OSError):
    _HAS_MAGIC = False
import logging
import unicodedata
from datetime import datetime, timezone
from urllib.parse import quote
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import Response
from db_client import db
from auth_middleware import get_current_user_dep
from services.storage import upload_file, get_object

log = logging.getLogger(__name__)
router = APIRouter(tags=["files"])

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
MAX_FILENAME_LENGTH = 255

# ── Allow-list: only these MIME types are accepted ──

ALLOWED_TYPES = {
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain", "text/csv",
}

ALLOWED_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".gif", ".webp",
    ".pdf", ".doc", ".docx", ".xls", ".xlsx",
    ".txt", ".csv",
}

# ── Deny-list: always reject these regardless of other checks ──

DANGEROUS_EXTENSIONS = {
    ".exe", ".bat", ".cmd", ".com", ".msi", ".scr", ".pif",
    ".sh", ".bash", ".csh", ".ksh", ".zsh",
    ".py", ".pyc", ".pyw", ".rb", ".pl", ".php", ".jsp", ".asp", ".aspx",
    ".js", ".vbs", ".wsf", ".ps1", ".psm1",
    ".jar", ".class", ".war",
    ".dll", ".so", ".dylib",
    ".svg",  # can contain embedded scripts
    ".html", ".htm", ".xhtml", ".shtml",
    ".swf", ".action", ".cgi",
}

# ── Magic byte signatures for critical file types ──

MAGIC_HEADERS = {
    ".pdf":  b"%PDF",
    ".png":  b"\x89PNG",
    ".jpg":  b"\xff\xd8\xff",
    ".jpeg": b"\xff\xd8\xff",
    ".gif":  b"GIF8",
}


# ── Filename sanitization ──

def sanitize_filename(raw: str) -> str:
    """Sanitize an uploaded filename for safe storage and display.

    - Strips path components (no directory traversal)
    - Removes null bytes and control characters
    - Normalizes unicode
    - Limits length
    - Falls back to 'unnamed' if nothing remains
    """
    # Normalize unicode
    name = unicodedata.normalize("NFKC", raw)

    # Strip path separators — only keep the basename
    name = name.replace("\\", "/")
    name = name.rsplit("/", 1)[-1]

    # Remove null bytes and control characters (U+0000–U+001F, U+007F)
    name = re.sub(r"[\x00-\x1f\x7f]", "", name)

    # Remove characters dangerous in filenames
    name = re.sub(r'[<>:"|?*]', "_", name)

    # Collapse multiple dots/spaces
    name = re.sub(r"\.{2,}", ".", name)
    name = name.strip(". ")

    # Enforce length limit (preserve extension)
    if len(name) > MAX_FILENAME_LENGTH:
        base, dot, ext = name.rpartition(".")
        if dot:
            name = base[: MAX_FILENAME_LENGTH - len(ext) - 1] + "." + ext
        else:
            name = name[:MAX_FILENAME_LENGTH]

    return name or "unnamed"


def safe_content_disposition(filename: str) -> str:
    """Build a safe Content-Disposition header value (RFC 5987).

    Uses filename* with UTF-8 percent-encoding to handle special characters.
    """
    # ASCII-safe fallback
    ascii_name = filename.encode("ascii", "replace").decode("ascii").replace("?", "_")
    # UTF-8 encoded version
    utf8_name = quote(filename, safe="")
    return f"attachment; filename=\"{ascii_name}\"; filename*=UTF-8''{utf8_name}"


# ── Upload endpoint ──

@router.post("/files/upload")
async def upload(file: UploadFile = File(...), current_user: dict = get_current_user_dep()):
    raw_filename = file.filename or "unnamed"
    filename = sanitize_filename(raw_filename)
    ext = ("." + filename.rsplit(".", 1)[-1].lower()) if "." in filename else ""

    # 1. Deny-list check (always first — no bypass possible)
    if ext in DANGEROUS_EXTENSIONS:
        log.warning("Upload blocked (dangerous ext): ext=%s user=%s", ext, current_user["id"])
        raise HTTPException(400, f"File type not allowed: {ext}")

    # 2. Allow-list check
    if ext and ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"File type not allowed: {ext}")

    # 3. Read and check size
    data = await file.read()
    if len(data) == 0:
        raise HTTPException(400, "Empty file")
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(400, "File too large (max 10 MB)")

    # 4. Magic byte header validation for critical types
    expected_header = MAGIC_HEADERS.get(ext)
    if expected_header and not data[: len(expected_header)].startswith(expected_header):
        log.warning("Upload blocked (magic mismatch): ext=%s user=%s", ext, current_user["id"])
        raise HTTPException(400, "File content does not match its declared type")

    # 5. python-magic content type detection (graceful fallback if libmagic unavailable)
    if _HAS_MAGIC:
        detected_type = magic.from_buffer(data, mime=True)
    else:
        detected_type = file.content_type or "application/octet-stream"
    declared_type = file.content_type or "application/octet-stream"

    # Office XML formats (docx/xlsx) detect as application/zip — allow if extension matches
    is_office_xml = ext in {".docx", ".xlsx"} and detected_type in {
        "application/zip",
        "application/x-zip-compressed",
    }
    actual_type = detected_type if detected_type != "application/octet-stream" else declared_type

    if not is_office_xml and actual_type not in ALLOWED_TYPES:
        log.warning(
            "Upload blocked (type mismatch): declared=%s detected=%s ext=%s user=%s",
            declared_type, detected_type, ext, current_user["id"],
        )
        raise HTTPException(400, f"File content type not allowed: {detected_type}")

    # 6. Store with sanitized filename (UUID path — no user input in storage path)
    result = upload_file(data, filename, actual_type, current_user["id"])

    doc = {
        "id": result["file_id"],
        "storage_path": result["storage_path"],
        "original_filename": filename,
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
        "filename": filename,
        "content_type": result["content_type"],
        "size": result["size"],
    }


# ── Download endpoint ──

@router.get("/files/{file_id}/download")
async def download(file_id: str, current_user: dict = get_current_user_dep()):
    record = await db.files.find_one({"id": file_id, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(404, "File not found")

    data, ct = get_object(record["storage_path"])
    return Response(
        content=data,
        media_type=record.get("content_type", ct),
        headers={"Content-Disposition": safe_content_disposition(record["original_filename"])},
    )

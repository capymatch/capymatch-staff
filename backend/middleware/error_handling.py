"""Error handling: request tracing, structured responses, global exception handlers.

Every request gets a unique X-Request-ID.
Every error response follows a consistent JSON envelope.
Stack traces are logged server-side, never exposed to clients.
"""

import uuid
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi import HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

log = logging.getLogger(__name__)


# ── Error code mapping ────────────────────────────────────────

_STATUS_TO_CODE = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED",
    409: "CONFLICT",
    422: "VALIDATION_ERROR",
    429: "RATE_LIMITED",
}


def _error_code(status: int) -> str:
    return _STATUS_TO_CODE.get(status, "HTTP_ERROR")


def _build_error_body(code: str, message: str, request_id: str) -> dict:
    return {
        "error": {
            "code": code,
            "message": message,
            "request_id": request_id,
        }
    }


# ── Request ID Middleware ─────────────────────────────────────

class RequestIDMiddleware(BaseHTTPMiddleware):
    """Attaches a unique request ID to every request and response."""

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("x-request-id") or uuid.uuid4().hex[:16]
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


# ── Exception Handlers (registered on the FastAPI app) ────────

def get_request_id(request: Request) -> str:
    return getattr(getattr(request, "state", None), "request_id", "unknown")


async def http_exception_handler(request: Request, exc: HTTPException):
    """Structured JSON for all HTTPExceptions (400, 401, 403, 404, etc.)."""
    rid = get_request_id(request)
    body = _build_error_body(
        code=_error_code(exc.status_code),
        message=str(exc.detail),
        request_id=rid,
    )
    return JSONResponse(status_code=exc.status_code, content=body)


async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all for unhandled exceptions — log full traceback, return safe JSON."""
    rid = get_request_id(request)
    log.exception(
        "Unhandled exception [request_id=%s] [path=%s]",
        rid,
        request.url.path,
    )
    body = _build_error_body(
        code="INTERNAL_ERROR",
        message="Something went wrong. Please try again.",
        request_id=rid,
    )
    return JSONResponse(status_code=500, content=body)


async def starlette_http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handles Starlette-level HTTP exceptions (e.g. 404 from router not found)."""
    rid = get_request_id(request)
    body = _build_error_body(
        code=_error_code(exc.status_code),
        message=str(exc.detail),
        request_id=rid,
    )
    return JSONResponse(status_code=exc.status_code, content=body)


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handles Pydantic / FastAPI validation errors with structured format."""
    rid = get_request_id(request)
    errors = exc.errors()
    # Build human-readable message from first error
    if errors:
        first = errors[0]
        loc = " -> ".join(str(l) for l in first.get("loc", []))
        msg = f"{loc}: {first.get('msg', 'invalid')}"
    else:
        msg = "Validation error"
    body = _build_error_body(
        code="VALIDATION_ERROR",
        message=msg,
        request_id=rid,
    )
    # Include field-level details for dev consumption
    body["error"]["details"] = [
        {"field": " -> ".join(str(l) for l in e.get("loc", [])), "message": e.get("msg", "")}
        for e in errors
    ]
    return JSONResponse(status_code=422, content=body)

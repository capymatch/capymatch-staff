"""Security middleware: rate limiting, input sanitization."""

import time
import logging
import bleach
from collections import defaultdict
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

log = logging.getLogger(__name__)

# ── Rate Limiter ──────────────────────────────────────────────

# Config: endpoint -> (max_requests, window_seconds)
RATE_LIMITS = {
    "/api/auth/login": (10, 60),           # 10 per minute
    "/api/auth/register": (5, 60),         # 5 per minute
    "/api/auth/forgot-password": (3, 60),  # 3 per minute
    "/api/files/upload": (20, 60),         # 20 per minute
}

# In-memory store: {(ip, path): [(timestamp, ...)]}
_rate_store: dict[tuple, list] = defaultdict(list)


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        limit_config = RATE_LIMITS.get(path)

        if limit_config and request.method == "POST":
            max_req, window = limit_config
            # Use X-Forwarded-For if behind proxy, fallback to client.host
            forwarded = request.headers.get("x-forwarded-for")
            ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")
            key = (ip, path)
            now = time.time()

            # Clean old entries
            _rate_store[key] = [t for t in _rate_store[key] if now - t < window]

            if len(_rate_store[key]) >= max_req:
                retry_after = int(window - (now - _rate_store[key][0]))
                log.warning(f"Rate limit hit: {ip} on {path} ({len(_rate_store[key])}/{max_req})")
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many requests. Please try again later."},
                    headers={"Retry-After": str(max(retry_after, 1))},
                )

            _rate_store[key].append(now)

        return await call_next(request)


# ── Input Sanitizer ───────────────────────────────────────────

ALLOWED_TAGS = []  # Strip ALL HTML tags
ALLOWED_ATTRS = {}


def sanitize_text(value: str) -> str:
    """Strip all HTML tags and dangerous content from user input."""
    if not isinstance(value, str):
        return value
    return bleach.clean(value, tags=ALLOWED_TAGS, attributes=ALLOWED_ATTRS, strip=True)


def sanitize_dict(data: dict) -> dict:
    """Recursively sanitize all string values in a dict."""
    cleaned = {}
    for k, v in data.items():
        if isinstance(v, str):
            cleaned[k] = sanitize_text(v)
        elif isinstance(v, dict):
            cleaned[k] = sanitize_dict(v)
        elif isinstance(v, list):
            cleaned[k] = [sanitize_text(i) if isinstance(i, str) else sanitize_dict(i) if isinstance(i, dict) else i for i in v]
        else:
            cleaned[k] = v
    return cleaned

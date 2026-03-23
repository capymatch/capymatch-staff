"""Security middleware: rate limiting, input sanitization, security headers, HTTPS redirect."""

import time
import logging
import bleach
from collections import defaultdict
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, RedirectResponse

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


# ── Security Headers ──────────────────────────────────────────

SECURITY_HEADERS = {
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy": (
        "default-src 'self'; "
        "img-src 'self' data: https:; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline'; "
        "font-src 'self' https:; "
        "connect-src 'self' https:;"
    ),
}


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Adds production security headers to every response."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        for header, value in SECURITY_HEADERS.items():
            response.headers.setdefault(header, value)
        return response


# ── HTTPS Redirect ────────────────────────────────────────────

class HTTPSRedirectMiddleware(BaseHTTPMiddleware):
    """Redirects HTTP → HTTPS in production.

    Respects X-Forwarded-Proto from reverse proxies to avoid redirect loops.
    """

    async def dispatch(self, request: Request, call_next):
        proto = request.headers.get("x-forwarded-proto", request.url.scheme)
        if proto == "http":
            url = request.url.replace(scheme="https")
            return RedirectResponse(url=str(url), status_code=301)
        return await call_next(request)

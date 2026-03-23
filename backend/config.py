"""Centralized application configuration.

Single source of truth for all environment-based settings.
Fails fast in production if required variables are missing.
"""

import os
import logging
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

log = logging.getLogger(__name__)

# ── Core Environment ──────────────────────────────────────────

APP_ENV = os.getenv("APP_ENV", "development")
IS_PRODUCTION = APP_ENV == "production"

# ── Frontend URL ──────────────────────────────────────────────

FRONTEND_URL = (os.getenv("FRONTEND_URL") or "").rstrip("/")

if IS_PRODUCTION and not FRONTEND_URL:
    raise RuntimeError("FRONTEND_URL must be set in production")


def get_frontend_hostname() -> str:
    """Extract hostname from FRONTEND_URL (e.g. 'data-sync-production.preview.emergentagent.com')."""
    if not FRONTEND_URL:
        return ""
    parsed = urlparse(FRONTEND_URL)
    return parsed.hostname or ""


FRONTEND_HOSTNAME = get_frontend_hostname()


# ── CORS / Allowed Origins ────────────────────────────────────

def _parse_origins(raw: str) -> list[str]:
    """Parse a comma-separated origin string, normalizing each entry."""
    seen: set[str] = set()
    result: list[str] = []
    for o in raw.split(","):
        cleaned = o.strip().rstrip("/")
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            result.append(cleaned)
    return result


_extra_origins = _parse_origins(os.getenv("ALLOWED_ORIGINS", ""))


def get_allowed_origins() -> list[str]:
    """Build the list of allowed CORS origins.

    Production: FRONTEND_URL + ALLOWED_ORIGINS (no wildcard).
    Development: adds common localhost variants.
    """
    origins: set[str] = set()

    if FRONTEND_URL:
        origins.add(FRONTEND_URL)

    origins.update(_extra_origins)

    if not IS_PRODUCTION:
        origins.update([
            "http://localhost:3000",
            "http://localhost:8001",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:8001",
        ])

    final = [o for o in origins if o]

    if IS_PRODUCTION and not final:
        log.warning("CORS: no allowed origins configured in production!")

    return final


ALLOWED_ORIGINS = get_allowed_origins()


# ── Security Toggles ──────────────────────────────────────────

ENABLE_HTTPS_REDIRECT = os.getenv("ENABLE_HTTPS_REDIRECT", "false").lower() == "true"
ENABLE_SECURITY_HEADERS = os.getenv("ENABLE_SECURITY_HEADERS", "true").lower() == "true"


# ── Startup Logging ───────────────────────────────────────────

def log_config():
    """Log resolved configuration at startup (safe: no secrets)."""
    log.info(f"config: APP_ENV={APP_ENV}")
    log.info(f"config: FRONTEND_URL={FRONTEND_URL or '(not set)'}")
    log.info(f"config: FRONTEND_HOSTNAME={FRONTEND_HOSTNAME or '(not set)'}")
    log.info(f"config: ALLOWED_ORIGINS={ALLOWED_ORIGINS}")
    log.info(f"config: ENABLE_HTTPS_REDIRECT={ENABLE_HTTPS_REDIRECT}")
    log.info(f"config: ENABLE_SECURITY_HEADERS={ENABLE_SECURITY_HEADERS}")

    if IS_PRODUCTION:
        if not FRONTEND_URL:
            log.error("INSECURE: FRONTEND_URL is not set in production!")
        if not ALLOWED_ORIGINS:
            log.error("INSECURE: No CORS origins configured in production!")

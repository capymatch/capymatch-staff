"""Redis-backed shared cache with graceful DB fallback.

If Redis is unavailable, all operations silently no-op and callers
fall through to their DB read path. The app never crashes due to cache.

Cache keys use the prefix ``cm:`` (CapyMatch) and include tenant_id
where applicable to prevent cross-tenant leakage.
"""

import json
import time
import logging
from typing import Any

import redis.asyncio as aioredis

from config import REDIS_URL, CACHE_ENABLED, CACHE_TTL_SECONDS

log = logging.getLogger(__name__)

# ── Key prefix ────────────────────────────────────────────────

PREFIX = "cm"


def _key(*parts: str) -> str:
    """Build a namespaced cache key.  e.g. _key('athletes', 'all') → 'cm:athletes:all'"""
    return f"{PREFIX}:{':'.join(parts)}"


# ── Stats (per-process, for observability) ────────────────────

_stats = {"hits": 0, "misses": 0, "errors": 0}


def get_stats() -> dict:
    total = _stats["hits"] + _stats["misses"]
    rate = (_stats["hits"] / total * 100) if total else 0.0
    return {**_stats, "total": total, "hit_rate_pct": round(rate, 1)}


# ── Singleton client ──────────────────────────────────────────

_redis: aioredis.Redis | None = None
_available: bool = False


async def connect():
    """Attempt to connect to Redis. Fails gracefully."""
    global _redis, _available

    if not CACHE_ENABLED:
        log.info("cache: DISABLED by config")
        return

    if not REDIS_URL:
        log.warning("cache: REDIS_URL not set, falling back to DB-only")
        return

    try:
        _redis = aioredis.from_url(
            REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=3,
            socket_timeout=2,
            retry_on_timeout=True,
        )
        await _redis.ping()
        _available = True
        log.info("cache: Redis connected at %s", REDIS_URL)
    except Exception as e:
        _redis = None
        _available = False
        log.warning("cache: Redis unavailable (%s), falling back to DB-only", e)


async def close():
    global _redis, _available
    if _redis:
        await _redis.aclose()
        _redis = None
        _available = False


def is_available() -> bool:
    return _available


# ── Core operations ───────────────────────────────────────────

async def get(key: str) -> Any | None:
    """Get a value from cache.  Returns None on miss or if cache is down."""
    if not _available:
        return None
    try:
        raw = await _redis.get(key)
        if raw is not None:
            _stats["hits"] += 1
            return json.loads(raw)
        _stats["misses"] += 1
        return None
    except Exception as e:
        _stats["errors"] += 1
        log.warning("cache: GET failed key=%s err=%s", key, e)
        return None


async def set(key: str, value: Any, ttl: int | None = None):
    """Store a value in cache with TTL (seconds)."""
    if not _available:
        return
    ttl = ttl or CACHE_TTL_SECONDS
    try:
        await _redis.setex(key, ttl, json.dumps(value, default=str))
    except Exception as e:
        _stats["errors"] += 1
        log.warning("cache: SET failed key=%s err=%s", key, e)


async def invalidate(*keys: str):
    """Delete one or more cache keys.  Cross-worker: all instances see the delete."""
    if not _available or not keys:
        return
    try:
        await _redis.delete(*keys)
        log.debug("cache: invalidated %s", keys)
    except Exception as e:
        _stats["errors"] += 1
        log.warning("cache: INVALIDATE failed keys=%s err=%s", keys, e)


async def invalidate_pattern(pattern: str):
    """Delete all keys matching a glob pattern (e.g. 'cm:athlete:*')."""
    if not _available:
        return
    try:
        cursor = None
        deleted = 0
        while cursor != 0:
            cursor, keys = await _redis.scan(cursor=cursor or 0, match=pattern, count=100)
            if keys:
                await _redis.delete(*keys)
                deleted += len(keys)
        if deleted:
            log.debug("cache: invalidated %d keys matching %s", deleted, pattern)
    except Exception as e:
        _stats["errors"] += 1
        log.warning("cache: INVALIDATE_PATTERN failed pattern=%s err=%s", pattern, e)


# ── Pre-built key constructors ────────────────────────────────

class Keys:
    """Structured cache key builders.  Tenant-aware where applicable."""

    @staticmethod
    def athletes_all() -> str:
        return _key("athletes", "all")

    @staticmethod
    def athlete(athlete_id: str) -> str:
        return _key("athlete", athlete_id)

    @staticmethod
    def derived(name: str) -> str:
        return _key("derived", name)

    @staticmethod
    def derived_all() -> str:
        """Pattern to invalidate ALL derived keys."""
        return _key("derived", "*")

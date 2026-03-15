"""
YouTube feed route for Social Spotlight page.
Fetches recent videos from pipeline schools' YouTube channels.

Two modes:
  1. YOUTUBE_API_KEY set → uses official YouTube Data API v3 (richer data, view counts).
  2. No key → falls back to free YouTube RSS feeds (no API key needed).

Results are cached in MongoDB for 6 hours to minimise API quota / HTTP calls.
"""
import os
import re
import logging
import asyncio
import aiohttp
import feedparser
from datetime import datetime, timezone, timedelta
from urllib.parse import urlparse
from xml.etree import ElementTree

from fastapi import APIRouter, HTTPException

from db_client import db
from auth_middleware import get_current_user_dep

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/social-spotlight", tags=["social-spotlight"])

YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY")
CACHE_TTL_HOURS = 6


# ── Helper: extract channel identifier from URL ──

def parse_youtube_url(url: str):
    """Return (kind, value) where kind is 'id' | 'handle' | 'username'."""
    if not url:
        return None, None
    parsed = urlparse(url)
    path = parsed.path.rstrip("/")

    if "/@" in path:
        handle = path.split("/@")[1].split("/")[0]
        return "handle", handle
    if "/channel/" in path:
        channel_id = path.split("/channel/")[1].split("/")[0]
        return "id", channel_id
    if "/user/" in path:
        username = path.split("/user/")[1].split("/")[0]
        return "username", username
    if "/c/" in path:
        custom = path.split("/c/")[1].split("/")[0]
        return "username", custom
    return None, None


async def _get_tenant_id(user_id: str):
    athlete = await db.athletes.find_one({"user_id": user_id}, {"_id": 0, "tenant_id": 1})
    if athlete and athlete.get("tenant_id"):
        return athlete["tenant_id"]
    return f"tenant-{user_id}"


# ══════════════════════════════════════════════════════════════════════════════
#   RSS FALLBACK (no API key required)
# ══════════════════════════════════════════════════════════════════════════════

async def _resolve_channel_id(session: aiohttp.ClientSession, youtube_url: str) -> str | None:
    """Resolve a YouTube channel URL to a channel_id by scraping the page meta tags."""
    kind, value = parse_youtube_url(youtube_url)
    if not kind:
        return None
    if kind == "id":
        return value

    # For handles / usernames, fetch the page and extract channel ID
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept-Language": "en-US,en;q=0.9",
        }
        cookies = {"CONSENT": "YES+cb.20210720-07-p0.en+FX+999"}
        async with session.get(youtube_url, timeout=aiohttp.ClientTimeout(total=12),
                               headers=headers, cookies=cookies) as resp:
            if resp.status != 200:
                logger.warning(f"Channel page returned {resp.status} for {youtube_url}")
                return None
            html = await resp.text()

            # Try multiple patterns in order of reliability
            for pattern in [
                r'<meta\s+itemprop="channelId"\s+content="([^"]+)"',
                r'<link\s+rel="canonical"\s+href="https://www\.youtube\.com/channel/(UC[^"]+)"',
                r'"browseId"\s*:\s*"(UC[a-zA-Z0-9_-]+)"',
                r'"channelId"\s*:\s*"(UC[a-zA-Z0-9_-]+)"',
                r'"externalId"\s*:\s*"(UC[a-zA-Z0-9_-]+)"',
            ]:
                match = re.search(pattern, html)
                if match:
                    channel_id = match.group(1)
                    logger.info(f"Resolved {youtube_url} → {channel_id}")
                    return channel_id

            logger.warning(f"Could not find channel ID in page for {youtube_url}")
    except Exception as e:
        logger.warning(f"Failed to resolve channel ID for {youtube_url}: {e}")
    return None


async def _fetch_rss_videos(session: aiohttp.ClientSession, channel_id: str, max_results: int = 8) -> list:
    """Fetch recent videos from a YouTube channel's RSS feed."""
    rss_url = f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"
    try:
        async with session.get(rss_url, timeout=aiohttp.ClientTimeout(total=10),
                               headers={"User-Agent": "Mozilla/5.0"}) as resp:
            if resp.status != 200:
                logger.warning(f"RSS feed returned {resp.status} for {channel_id}")
                return []
            xml_text = await resp.text()
    except Exception as e:
        logger.warning(f"RSS fetch failed for {channel_id}: {e}")
        return []

    feed = feedparser.parse(xml_text)
    videos = []
    channel_title = feed.feed.get("title", "")

    for entry in feed.entries[:max_results]:
        video_id = entry.get("yt_videoid", "")
        if not video_id:
            # Try to extract from link
            link = entry.get("link", "")
            if "watch?v=" in link:
                video_id = link.split("watch?v=")[1].split("&")[0]
        if not video_id:
            continue

        title = entry.get("title", "")
        published = entry.get("published", "")
        # Get thumbnail
        thumbnail_url = f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"

        # Get view count from media:statistics if available
        view_count = 0
        media_stats = entry.get("media_statistics", {})
        if media_stats:
            view_count = int(media_stats.get("views", 0))

        videos.append({
            "video_id": video_id,
            "title": title,
            "description": entry.get("summary", "")[:200] if entry.get("summary") else "",
            "thumbnail_url": thumbnail_url,
            "published_at": published,
            "url": f"https://www.youtube.com/watch?v={video_id}",
            "channel_id": channel_id,
            "channel_title": channel_title,
            "channel_thumbnail": "",
            "view_count": view_count,
        })

    return videos


async def fetch_videos_via_rss(youtube_url: str, max_results: int = 8, session: aiohttp.ClientSession = None) -> list:
    """Fetch videos using free RSS feed — no API key needed."""
    own_session = session is None
    if own_session:
        session = aiohttp.ClientSession()
    try:
        channel_id = await _resolve_channel_id(session, youtube_url)
        if not channel_id:
            logger.warning(f"Could not resolve channel ID for {youtube_url}")
            return []
        videos = await _fetch_rss_videos(session, channel_id, max_results)
        logger.info(f"RSS: {youtube_url} → {channel_id} → {len(videos)} videos")
        return videos
    finally:
        if own_session:
            await session.close()


# ══════════════════════════════════════════════════════════════════════════════
#   YOUTUBE DATA API (requires YOUTUBE_API_KEY)
# ══════════════════════════════════════════════════════════════════════════════

def _get_youtube_client():
    if not YOUTUBE_API_KEY:
        return None
    from googleapiclient.discovery import build
    return build("youtube", "v3", developerKey=YOUTUBE_API_KEY, cache_discovery=False)


def fetch_channel_videos_api(yt, youtube_url: str, max_results: int = 5):
    """Fetch videos via YouTube Data API v3 (richer data)."""
    from googleapiclient.errors import HttpError

    kind, value = parse_youtube_url(youtube_url)
    if not kind or not value:
        return []

    try:
        if kind == "id":
            resp = yt.channels().list(part="id,snippet", id=value).execute()
        elif kind == "handle":
            resp = yt.channels().list(part="id,snippet", forHandle=value).execute()
        else:
            resp = yt.channels().list(part="id,snippet", forUsername=value).execute()

        items = resp.get("items", [])
        if not items:
            return []

        channel = items[0]
        channel_id = channel["id"]
        channel_title = channel["snippet"]["title"]
        channel_thumb = channel["snippet"]["thumbnails"].get("default", {}).get("url", "")

        now_dt = datetime.utcnow()
        jan_1 = datetime(now_dt.year, 1, 1).strftime("%Y-%m-%dT00:00:00Z")
        six_months_ago = (now_dt - timedelta(days=180)).strftime("%Y-%m-%dT00:00:00Z")

        def _search(published_after, q_str):
            return yt.search().list(
                part="snippet", channelId=channel_id, q=q_str,
                type="video", order="date", publishedAfter=published_after,
                maxResults=max_results,
            ).execute()

        current_year = now_dt.year
        search_resp = _search(jan_1, f"women's volleyball {current_year} -beach")
        raw_items = search_resp.get("items", [])

        if len(raw_items) < 2:
            search_resp = _search(six_months_ago, "women's volleyball -beach")
            raw_items = search_resp.get("items", [])

        EXCLUDE = re.compile(r"\bbeach\b|\bmen\'?s\s+volley|\bm\.\s*volley\b|\bMVB\b", re.I)
        REQUIRE = re.compile(r"volley", re.I)

        videos = []
        for item in raw_items:
            if item.get("id", {}).get("kind") != "youtube#video":
                continue
            video_id = item["id"]["videoId"]
            snip = item["snippet"]
            title = snip.get("title", "")
            desc = snip.get("description", "")
            if not REQUIRE.search(title) and not REQUIRE.search(desc):
                continue
            if EXCLUDE.search(title):
                continue
            thumb = (
                snip["thumbnails"].get("maxres")
                or snip["thumbnails"].get("high")
                or snip["thumbnails"].get("medium")
                or snip["thumbnails"].get("default")
                or {}
            )
            videos.append({
                "video_id": video_id,
                "title": title,
                "description": desc[:200],
                "thumbnail_url": thumb.get("url", ""),
                "published_at": snip.get("publishedAt", ""),
                "url": f"https://www.youtube.com/watch?v={video_id}",
                "channel_id": channel_id,
                "channel_title": channel_title,
                "channel_thumbnail": channel_thumb,
            })

        return videos

    except HttpError as e:
        logger.warning(f"YouTube API error for {youtube_url}: {e}")
        return []
    except Exception as e:
        logger.warning(f"Unexpected error for {youtube_url}: {e}")
        return []


def enrich_view_counts(yt, videos: list):
    """Batch-fetch view counts (only when using API)."""
    if not yt or not videos:
        return
    ids = [v["video_id"] for v in videos if v.get("video_id")]
    if not ids:
        return
    try:
        for i in range(0, len(ids), 50):
            batch = ids[i:i + 50]
            resp = yt.videos().list(part="statistics", id=",".join(batch)).execute()
            stats_map = {}
            for item in resp.get("items", []):
                vid = item["id"]
                view_count = int(item.get("statistics", {}).get("viewCount", 0))
                stats_map[vid] = view_count
            for v in videos:
                if v["video_id"] in stats_map:
                    v["view_count"] = stats_map[v["video_id"]]
    except Exception as e:
        logger.warning(f"Failed to fetch view counts: {e}")


# ══════════════════════════════════════════════════════════════════════════════
#   ROUTES
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/feed")
async def get_social_feed(current_user: dict = get_current_user_dep()):
    """
    Returns YouTube videos for the authenticated user's pipeline schools.
    Uses YouTube API if YOUTUBE_API_KEY is set, otherwise falls back to RSS feeds.
    Results are cached per (tenant_id, school_id) for 6 hours.
    """
    tenant_id = await _get_tenant_id(current_user["id"])
    use_api = bool(YOUTUBE_API_KEY)
    yt = _get_youtube_client() if use_api else None

    programs = await db.programs.find(
        {"tenant_id": tenant_id, "board_group": {"$ne": "archived"}},
        {"_id": 0, "program_id": 1, "university_name": 1,
         "logo_url": 1, "domain": 1, "division": 1, "board_group": 1,
         "recruiting_status": 1},
    ).to_list(200)

    if not programs:
        return {"videos": [], "school_count": 0, "total_videos": 0}

    names = [p["university_name"] for p in programs]
    kb_docs = await db.university_knowledge_base.find(
        {"university_name": {"$in": names}},
        {"_id": 0, "university_name": 1, "social_links": 1},
    ).to_list(300)
    kb_map = {d["university_name"]: d.get("social_links", {}) for d in kb_docs}

    yt_schools = []
    for p in programs:
        sl = kb_map.get(p["university_name"], {}) or {}
        yt_url = sl.get("youtube")
        if yt_url:
            yt_schools.append({**p, "youtube_url": yt_url})

    if not yt_schools:
        return {"videos": [], "cached": False, "school_count": 0}

    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(hours=CACHE_TTL_HOURS)
    feed_items = []

    # Share a single aiohttp session for all RSS fetches
    http_session = aiohttp.ClientSession() if not use_api else None
    try:
        for school in yt_schools:
            pid = school["program_id"]
            yt_url = school["youtube_url"]

            # Check cache first
            cached = await db.youtube_feed_cache.find_one(
                {"program_id": pid, "tenant_id": tenant_id, "fetched_at": {"$gte": cutoff}},
                {"_id": 0},
            )

            if cached:
                videos = cached.get("videos", [])
            else:
                # Fetch fresh
                try:
                    if use_api:
                        videos = fetch_channel_videos_api(yt, yt_url, max_results=8)
                    else:
                        videos = await fetch_videos_via_rss(yt_url, max_results=8, session=http_session)
                except Exception as e:
                    logger.warning(f"Failed to fetch videos for {yt_url}: {e}")
                    videos = []

                # Cache results (even empty — avoids re-fetching broken channels)
                await db.youtube_feed_cache.update_one(
                    {"program_id": pid, "tenant_id": tenant_id},
                    {"$set": {
                        "program_id": pid,
                        "tenant_id": tenant_id,
                        "youtube_url": yt_url,
                        "videos": videos,
                        "fetched_at": now,
                    }},
                    upsert=True,
                )

            for v in videos:
                feed_items.append({
                    **v,
                    "program_id": pid,
                    "university_name": school["university_name"],
                    "logo_url": school.get("logo_url"),
                    "domain": school.get("domain"),
                    "division": school.get("division"),
                    "board_group": school.get("board_group"),
                    "recruiting_status": school.get("recruiting_status"),
                })
    finally:
        if http_session:
            await http_session.close()

    # Enrich view counts only when using API
    if use_api and yt:
        enrich_view_counts(yt, feed_items)

    # Sort by published_at descending
    feed_items.sort(key=lambda x: x.get("published_at", ""), reverse=True)

    # Build trending: top 3 by view count (minimum 100 views to qualify)
    trending = sorted(
        [v for v in feed_items if v.get("view_count", 0) >= 100],
        key=lambda x: x.get("view_count", 0),
        reverse=True,
    )[:3]

    return {
        "videos": feed_items[:30],
        "trending": trending,
        "school_count": len(yt_schools),
        "total_videos": len(feed_items),
    }


@router.post("/feed/refresh")
async def refresh_feed(current_user: dict = get_current_user_dep()):
    """Force-clear the cache so the next /feed call re-fetches."""
    tenant_id = await _get_tenant_id(current_user["id"])
    result = await db.youtube_feed_cache.delete_many({"tenant_id": tenant_id})
    return {"cleared": result.deleted_count}


@router.get("/social-links")
async def get_social_links(current_user: dict = get_current_user_dep()):
    """Return Twitter/social links for pipeline schools."""
    tenant_id = await _get_tenant_id(current_user["id"])

    programs = await db.programs.find(
        {"tenant_id": tenant_id, "board_group": {"$ne": "archived"}},
        {"_id": 0, "program_id": 1, "university_name": 1,
         "logo_url": 1, "domain": 1},
    ).to_list(200)

    if not programs:
        return {"schools": []}

    names = [p["university_name"] for p in programs]
    kb_docs = await db.university_knowledge_base.find(
        {"university_name": {"$in": names}},
        {"_id": 0, "university_name": 1, "social_links": 1},
    ).to_list(300)
    kb_map = {d["university_name"]: d.get("social_links", {}) for d in kb_docs}

    schools = []
    for p in programs:
        sl = kb_map.get(p["university_name"], {}) or {}
        twitter = sl.get("twitter")
        if twitter:
            schools.append({
                "program_id": p["program_id"],
                "university_name": p["university_name"],
                "logo_url": p.get("logo_url"),
                "domain": p.get("domain"),
                "twitter": twitter,
            })

    return {"schools": schools}

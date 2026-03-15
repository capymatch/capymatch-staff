"""
YouTube feed route for Social Spotlight page.
Fetches recent videos from pipeline schools' YouTube channels.
Results are cached in MongoDB for 6 hours to minimise API quota usage.
"""
import os
import re
import logging
from datetime import datetime, timezone, timedelta
from urllib.parse import urlparse

from fastapi import APIRouter, HTTPException
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

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


def get_youtube():
    if not YOUTUBE_API_KEY:
        raise HTTPException(status_code=503, detail="YouTube API key not configured")
    return build("youtube", "v3", developerKey=YOUTUBE_API_KEY, cache_discovery=False)


async def _get_tenant_id(user_id: str):
    athlete = await db.athletes.find_one({"user_id": user_id}, {"_id": 0, "tenant_id": 1})
    if athlete and athlete.get("tenant_id"):
        return athlete["tenant_id"]
    return f"tenant-{user_id}"


# ── Fetch channel's recent videos ──

def fetch_channel_videos(yt, youtube_url: str, max_results: int = 5):
    """Fetch up to max_results recent volleyball-relevant videos for a channel."""
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
                part="snippet",
                channelId=channel_id,
                q=q_str,
                type="video",
                order="date",
                publishedAfter=published_after,
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
                "description": snip.get("description", "")[:200],
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
    """Batch-fetch view counts for a list of videos (max 50 per call)."""
    if not videos:
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


# ── Routes ──

@router.get("/feed")
async def get_social_feed(current_user: dict = get_current_user_dep()):
    """
    Returns YouTube videos for the authenticated user's pipeline schools.
    Results are cached per (tenant_id, school_id) for 6 hours.
    """
    tenant_id = await _get_tenant_id(current_user["id"])

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

    yt = get_youtube()
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(hours=CACHE_TTL_HOURS)
    feed_items = []

    for school in yt_schools:
        pid = school["program_id"]
        yt_url = school["youtube_url"]

        cached = await db.youtube_feed_cache.find_one(
            {"program_id": pid, "tenant_id": tenant_id, "fetched_at": {"$gte": cutoff}},
            {"_id": 0},
        )

        if cached:
            videos = cached.get("videos", [])
        else:
            videos = fetch_channel_videos(yt, yt_url, max_results=8)
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

    enrich_view_counts(yt, feed_items)

    feed_items.sort(key=lambda x: x.get("published_at", ""), reverse=True)

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
    """Force-clear the cache so the next /feed call re-fetches from YouTube."""
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

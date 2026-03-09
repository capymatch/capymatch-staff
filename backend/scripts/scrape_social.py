"""
Improved Playwright scraper - prioritizes volleyball-specific social links.
Collects ALL social links on the page, then ranks them by volleyball relevance.
"""
import asyncio
import json
import os
import re
import time
from datetime import datetime, timezone
from urllib.parse import urlparse

import pymongo
from dotenv import load_dotenv
from playwright.async_api import async_playwright

load_dotenv("/app/backend/.env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

SOCIAL_PATTERNS = {
    "twitter": re.compile(r'https?://(www\.)?(twitter\.com|x\.com)/([A-Za-z0-9_]+)', re.IGNORECASE),
    "instagram": re.compile(r'https?://(www\.)?instagram\.com/([A-Za-z0-9_.]+)', re.IGNORECASE),
    "facebook": re.compile(r'https?://(www\.)?facebook\.com/([A-Za-z0-9._-]+)', re.IGNORECASE),
    "tiktok": re.compile(r'https?://(www\.)?tiktok\.com/@([A-Za-z0-9_.]+)', re.IGNORECASE),
    "youtube": re.compile(r'https?://(www\.)?(youtube\.com/(c/|channel/|user/|@)([A-Za-z0-9_-]+))', re.IGNORECASE),
}

BLACKLIST_PATHS = {
    "intent", "share", "home", "sharer", "dialog", "watch", "embed",
    "hashtag", "p", "reel", "stories", "login", "signup", "about",
    "help", "settings", "explore", "search",
}

VB_KEYWORDS = ["volleyball", "vball", "vb", "wvb", "mvb", "wvolleyball", "mvolleyball"]

PROGRESS_FILE = "/app/backend/scrape_social_progress_v2.json"


def get_handle(url, platform):
    """Extract the handle/path from a social URL."""
    m = SOCIAL_PATTERNS[platform].search(url)
    if not m:
        return None
    # Get the last capturing group (the handle)
    groups = m.groups()
    return groups[-1] if groups else None


def is_blacklisted(url):
    parsed = urlparse(url)
    parts = parsed.path.strip("/").split("/")
    if len(parts) >= 1 and parts[0].lower() in BLACKLIST_PATHS:
        return True
    if len(parts) >= 2 and parts[1].lower() in BLACKLIST_PATHS:
        return True
    return False


def score_handle(handle, platform):
    """Score a social handle by volleyball relevance. Higher = better."""
    if not handle:
        return -1
    h = handle.lower()
    # Direct volleyball match = best
    for kw in VB_KEYWORDS:
        if kw in h:
            return 100
    # General athletics = decent
    if any(x in h for x in ["athletics", "sports", "athl"]):
        return 50
    # Looks like a general school/program account
    return 10


async def scrape_school(page, school, timeout=15000):
    """Scrape a school's athletics page for volleyball-specific social links."""
    name = school["university_name"]
    website = school.get("website", "")
    if not website:
        return {"university_name": name, "social_links": {}, "error": "no website"}

    # Collect ALL social links from the page
    all_links = {}  # platform -> [(score, url), ...]

    urls_to_try = [website]
    base = f"{urlparse(website).scheme}://{urlparse(website).netloc}"
    if base != website:
        urls_to_try.append(base)

    for url in urls_to_try:
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=timeout)
            await page.wait_for_timeout(2000)

            links = await page.evaluate("""() => {
                const anchors = document.querySelectorAll('a[href]');
                return Array.from(anchors).map(a => a.href);
            }""")

            for link in links:
                if is_blacklisted(link):
                    continue
                for platform, pattern in SOCIAL_PATTERNS.items():
                    m = pattern.search(link)
                    if m:
                        clean_url = m.group(0).rstrip("/")
                        handle = get_handle(link, platform)
                        s = score_handle(handle, platform)
                        if platform not in all_links:
                            all_links[platform] = []
                        all_links[platform].append((s, clean_url))

        except Exception as e:
            if url == urls_to_try[-1]:
                return {"university_name": name, "social_links": {}, "error": str(e)[:100]}

    # Pick best link per platform (highest volleyball relevance score)
    best = {}
    for platform, candidates in all_links.items():
        if candidates:
            candidates.sort(key=lambda x: -x[0])
            best[platform] = candidates[0][1]

    return {"university_name": name, "social_links": best, "error": None}


async def main():
    client = pymongo.MongoClient(MONGO_URL)
    db = client[DB_NAME]

    schools = list(db.university_knowledge_base.find(
        {"division": "D1"},
        {"_id": 0, "university_name": 1, "website": 1, "domain": 1}
    ))

    total = len(schools)
    print(f"Starting improved social scrape for {total} D1 schools...")

    # Load progress
    completed = {}
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE) as f:
            progress = json.load(f)
            completed = {r["university_name"]: r for r in progress.get("results", [])}
        print(f"Resuming from {len(completed)} completed")

    results = list(completed.values())
    stats = {"total": total, "completed": len(completed), "found": 0, "errors": 0, "vb_specific": 0}

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True, args=["--no-sandbox"])
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            viewport={"width": 1280, "height": 720},
        )
        page = await context.new_page()

        for i, school in enumerate(schools):
            name = school["university_name"]
            if name in completed:
                continue

            result = await scrape_school(page, school)
            results.append(result)

            if result["social_links"]:
                stats["found"] += 1
                # Check if any are VB-specific
                has_vb = False
                for url in result["social_links"].values():
                    h = url.lower()
                    if any(kw in h for kw in VB_KEYWORDS):
                        has_vb = True
                        break
                if has_vb:
                    stats["vb_specific"] += 1

                db.university_knowledge_base.update_one(
                    {"university_name": name},
                    {"$set": {
                        "social_links": result["social_links"],
                        "social_links_scraped_at": datetime.now(timezone.utc).isoformat(),
                    }}
                )
                platforms = ", ".join(result["social_links"].keys())
                vb_tag = " [VB]" if has_vb else ""
                print(f"[{i+1}/{total}] {name}: {platforms}{vb_tag}")
            elif result["error"]:
                stats["errors"] += 1
                print(f"[{i+1}/{total}] {name}: ERROR - {result['error']}")
            else:
                print(f"[{i+1}/{total}] {name}: no social links found")

            stats["completed"] = len(results)

            if len(results) % 10 == 0:
                with open(PROGRESS_FILE, "w") as f:
                    json.dump({"stats": stats, "results": results}, f)

        await browser.close()

    with open(PROGRESS_FILE, "w") as f:
        json.dump({"stats": stats, "results": results}, f)

    print(f"\nDone! Found: {stats['found']}/{total}, VB-specific: {stats['vb_specific']}, Errors: {stats['errors']}")


if __name__ == "__main__":
    asyncio.run(main())

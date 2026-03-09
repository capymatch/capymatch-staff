"""
Targeted Campus Diversity scraper for pipeline schools.
Scrapes diversity data from ProductiveRecruit and stores in university_knowledge_base.

Run: cd /app/backend && python3 scripts/scrape_diversity.py
"""
import asyncio
import re
import os
import logging
from dotenv import load_dotenv
load_dotenv()
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from playwright.async_api import async_playwright

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger(__name__)

BASE = "https://productiverecruit.com/athletic-scholarships/womens-volleyball"

# Manual slug overrides for schools missing from the auto-matcher
SLUG_OVERRIDES = {
    "Emory University": ("georgia", "emory-university"),
    "Georgia Tech": ("georgia", "georgia-institute-of-technology"),
    "Johns Hopkins University": ("maryland", "johns-hopkins-university"),
    "Penn State": ("pennsylvania", "pennsylvania-state-university"),
    "Stanford University": ("california", "stanford-university"),
    "UCLA": ("california", "university-of-california-los-angeles"),
    "University of Florida": ("florida", "university-of-florida"),
    "University of Texas": ("texas", "the-university-of-texas-at-austin"),
    "Alabama A&M University": ("alabama", "alabama-a-m-university"),
}


def parse_diversity(html):
    """Parse Campus Diversity section from HTML."""
    categories = [
        "American Indian/Alaska Native",
        "Asian",
        "Black",
        "Hispanic/Latino",
        "Native Hawaiian/Pacific Islander",
        "Non Resident",
        "Two or more",
        "Unknown",
        "White",
    ]
    # Strip HTML comments that interfere with parsing
    clean = re.sub(r'<!--.*?-->', '', html, flags=re.DOTALL)
    diversity = {}
    for cat in categories:
        pattern = (
            re.escape(cat)
            + r'.*?Students:\s*([\d.]+)%\s*/\s*Faculty:\s*([\d.]+)%'
        )
        m = re.search(pattern, clean, re.DOTALL)
        if m:
            diversity[cat] = {
                "students": float(m.group(1)),
                "faculty": float(m.group(2)),
            }
    return diversity if diversity else None


async def main():
    client = AsyncIOMotorClient(os.environ.get("MONGO_URL"))
    db = client[os.environ.get("DB_NAME")]

    # Get ALL schools that have pr_slug or are in overrides
    schools = await db.university_knowledge_base.find(
        {},
        {"_id": 1, "university_name": 1, "pr_slug": 1, "pr_state": 1}
    ).to_list(2000)

    log.info(f"Total schools in KB: {len(schools)}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox"],
        )
        ctx = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            viewport={"width": 1920, "height": 1080},
        )
        page = await ctx.new_page()

        # Warmup
        try:
            await page.goto(f"{BASE}/texas/abilene-christian-university", wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(8)
            ok = "Campus Diversity" in await page.content()
            log.info(f"Warmup ok={ok}")
        except Exception as e:
            log.warning(f"Warmup failed: {e}")

        stats = {"done": 0, "updated": 0, "skipped": 0, "fail": 0}

        for school in schools:
            name = school["university_name"]
            sid = school["_id"]

            # Determine slug + state
            if name in SLUG_OVERRIDES:
                state, slug = SLUG_OVERRIDES[name]
            elif school.get("pr_slug") and school["pr_slug"] != "---":
                slug = school["pr_slug"]
                state = school.get("pr_state", "")
                if len(state) <= 2 or state == "---":
                    stats["skipped"] += 1
                    stats["done"] += 1
                    continue
            else:
                stats["skipped"] += 1
                stats["done"] += 1
                continue

            url = f"{BASE}/{state}/{slug}"
            try:
                resp = await page.goto(url, wait_until="domcontentloaded", timeout=12000)
                await asyncio.sleep(1.5)
                if resp and resp.status == 200:
                    html = await page.content()
                    diversity = parse_diversity(html)
                    if diversity:
                        now = datetime.now(timezone.utc).isoformat()
                        update = {
                            "campus_diversity": diversity,
                            "campus_diversity_source": "productiverecruit.com",
                            "campus_diversity_scraped_at": now,
                        }
                        # Also fix pr_slug/pr_state if from overrides
                        if name in SLUG_OVERRIDES:
                            update["pr_state"] = state
                            update["pr_slug"] = slug

                        await db.university_knowledge_base.update_one(
                            {"_id": sid}, {"$set": update}
                        )
                        stats["updated"] += 1
                    else:
                        stats["fail"] += 1
                else:
                    stats["fail"] += 1
            except Exception as e:
                stats["fail"] += 1
                if stats["fail"] <= 5:
                    log.warning(f"Failed {name}: {e}")

            stats["done"] += 1
            if stats["done"] % 50 == 0:
                log.info(f"Progress: {stats['done']}/{len(schools)} | Updated: {stats['updated']} | Skipped: {stats['skipped']} | Fail: {stats['fail']}")

        await browser.close()

    log.info(f"DONE: {stats}")
    has_div = await db.university_knowledge_base.count_documents({"campus_diversity": {"$exists": True, "$ne": None}})
    total = await db.university_knowledge_base.count_documents({})
    log.info(f"Diversity coverage: {has_div}/{total} ({round(has_div/total*100,1)}%)")


if __name__ == "__main__":
    asyncio.run(main())

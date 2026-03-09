"""
Comprehensive school data scraper for ProductiveRecruit.
Scrapes ALL academic data + school logos for every university in our KB.

Fields scraped: SAT, ACT, GPA, acceptance_rate, graduation_rate, retention_rate,
student_faculty_ratio, avg_annual_cost, median_earnings, student_size, school_type, logo_url

Run: cd /app/backend && python3 scripts/scrape_school_data.py
"""
import asyncio
import re
import os
import logging
import json
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from playwright.async_api import async_playwright

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger(__name__)

BASE = "https://productiverecruit.com/athletic-scholarships/womens-volleyball"
STATES = [
    "alabama","alaska","arizona","arkansas","california","colorado","connecticut",
    "delaware","district-of-columbia","florida","georgia","hawaii","idaho","illinois",
    "indiana","iowa","kansas","kentucky","louisiana","maine","maryland","massachusetts",
    "michigan","minnesota","mississippi","missouri","montana","nebraska","nevada",
    "new-hampshire","new-jersey","new-mexico","new-york","north-carolina","north-dakota",
    "ohio","oklahoma","oregon","pennsylvania","rhode-island","south-carolina","south-dakota",
    "tennessee","texas","utah","vermont","virginia","washington","west-virginia","wisconsin","wyoming",
]


def normalize(name):
    n = name.lower().strip()
    n = re.sub(r'\([^)]*\)', '', n)
    n = re.sub(r'–.*', '', n)
    n = n.replace(" tech", " institute of technology")
    n = n.replace("st. ", "saint ")
    for w in ["the ", "university of ", "university", "college of ", "college", "- ", "&", "at ", "in "]:
        n = n.replace(w, " ")
    return re.sub(r"[^a-z0-9]", "", n)


def parse_all_fields(html):
    """Parse all academic data fields from a ProductiveRecruit school page."""
    data = {}

    # Logo URL
    m = re.search(r'src="(https://assets\.productiverecruit\.com/colleges/logos/[^"]+)"', html)
    if m:
        data["logo_url"] = m.group(1)

    # GPA: "3.62</p>...<p>Average GPA"
    m = re.search(r'(\d\.\d{1,2})\s*</(?:p|div|span|h\d)>\s*(?:<[^>]*>)*\s*Average GPA', html, re.DOTALL)
    if m:
        v = float(m.group(1))
        if 2.0 <= v <= 5.0:
            data["avg_gpa"] = v

    # SAT: "1160</p>...<p>SAT"
    m = re.search(r'(\d{3,4})\s*</(?:p|div|span|h\d)>\s*(?:<[^>]*>)*\s*SAT', html, re.DOTALL)
    if m:
        v = int(m.group(1))
        if 400 <= v <= 1600:
            data["sat_avg"] = v

    # ACT: "25</p>...<p>ACT"
    m = re.search(r'(\d{1,2})\s*</(?:p|div|span|h\d)>\s*(?:<[^>]*>)*\s*ACT', html, re.DOTALL)
    if m:
        v = int(m.group(1))
        if 10 <= v <= 36:
            data["act_avg"] = v

    # Acceptance Rate: "63.9%</p>...<p>Acceptance Rate"
    m = re.search(r'([\d.]+)%\s*</(?:p|div|span|h\d)>\s*(?:<[^>]*>)*\s*Acceptance Rate', html, re.DOTALL)
    if m:
        v = float(m.group(1))
        if 0 < v <= 100:
            data["acceptance_rate"] = round(v / 100, 4)

    # Graduation Rate
    m = re.search(r'([\d.]+)%\s*</(?:p|div|span|h\d)>\s*(?:<[^>]*>)*\s*Graduation Rate', html, re.DOTALL)
    if m:
        data["graduation_rate"] = round(float(m.group(1)) / 100, 4)

    # Retention Rate
    m = re.search(r'([\d.]+)%\s*</(?:p|div|span|h\d)>\s*(?:<[^>]*>)*\s*Retention Rate', html, re.DOTALL)
    if m:
        data["retention_rate"] = round(float(m.group(1)) / 100, 4)

    # Student-Faculty Ratio: "13:1"
    m = re.search(r'(\d{1,3}):1\s*</(?:p|div|span|h\d)>\s*(?:<[^>]*>)*\s*Student-Faculty Ratio', html, re.DOTALL)
    if m:
        data["student_faculty_ratio"] = int(m.group(1))

    # Avg Annual Cost: "$27,401"
    m = re.search(r'\$([\d,]+)\s*</(?:p|div|span|h\d)>\s*(?:<[^>]*>)*\s*Avg\.\s*Annual Cost', html, re.DOTALL)
    if m:
        data["avg_annual_cost"] = int(m.group(1).replace(",", ""))

    # Median Earnings: "$55,736"
    m = re.search(r'\$([\d,]+)\s*</(?:p|div|span|h\d)>\s*(?:<[^>]*>)*\s*Median Earnings', html, re.DOTALL)
    if m:
        data["median_earnings"] = int(m.group(1).replace(",", ""))

    # Student size: "3,129 students"
    m = re.search(r'([\d,]+)\s*students', html)
    if m:
        data["student_size"] = int(m.group(1).replace(",", ""))

    # School type: "Private nonprofit" or "Public"
    if "Private nonprofit" in html:
        data["school_type"] = "Private nonprofit"
    elif "Private for-profit" in html:
        data["school_type"] = "Private for-profit"
    elif "Public" in html:
        data["school_type"] = "Public"

    return data


async def pass1_collect_slugs(page):
    """Scrape all state index pages to collect {name -> (state, slug)} mapping."""
    slug_map = {}

    for state in STATES:
        url = f"{BASE}/{state}"
        try:
            resp = await page.goto(url, wait_until="domcontentloaded", timeout=15000)
            await asyncio.sleep(5)
            if not resp or resp.status != 200:
                continue
            content = await page.content()
            links = re.findall(
                r'href="[^"]*/womens-volleyball/'
                + re.escape(state) + r'/([^"]+)"[^>]*>\s*\n?\s*([^<]+)',
                content
            )
            for school_slug, school_name in links:
                clean_name = school_name.strip()
                norm = normalize(clean_name)
                slug_map[norm] = (state, school_slug, clean_name)
        except Exception as e:
            log.warning(f"State {state} failed: {e}")

        if len(slug_map) % 100 == 0 and slug_map:
            log.info(f"Pass 1: {len(slug_map)} slugs collected so far")

    log.info(f"Pass 1 complete: {len(slug_map)} school slugs from {len(STATES)} states")
    return slug_map


def find_slug_match(norm, slug_map):
    """Multi-strategy fuzzy matching for school slugs."""
    match = slug_map.get(norm)
    if match:
        return match

    best_key = None
    best_score = 0
    for key in slug_map:
        score = 0
        if key.startswith(norm) and len(norm) >= 6:
            score = len(norm) / len(key) + 0.5
        elif norm.startswith(key) and len(key) >= 6:
            score = len(key) / len(norm) + 0.5
        elif norm in key and len(norm) >= 8:
            score = len(norm) / len(key) + 0.3
        elif key in norm and len(key) >= 8:
            score = len(key) / len(norm) + 0.3
        if score > best_score:
            best_score = score
            best_key = key

    if best_key and best_score > 0.6:
        return slug_map[best_key]
    return None


async def pass2_scrape_all_data(page, slug_map, db):
    """Scrape comprehensive data from each school page and update KB."""
    schools = await db.university_knowledge_base.find(
        {}, {"_id": 1, "university_name": 1}
    ).to_list(2000)

    log.info(f"Pass 2: Processing {len(schools)} schools for comprehensive data scrape")
    now = datetime.now(timezone.utc).isoformat()
    stats = {"done": 0, "updated": 0, "no_match": 0, "fail": 0, "total": len(schools)}
    fields_found = {}

    for school in schools:
        name = school.get("university_name", "")
        norm = normalize(name)
        match = find_slug_match(norm, slug_map)

        if not match:
            stats["no_match"] += 1
            stats["done"] += 1
            continue

        state, school_slug, _ = match
        url = f"{BASE}/{state}/{school_slug}"

        try:
            resp = await page.goto(url, wait_until="domcontentloaded", timeout=12000)
            await asyncio.sleep(1.5)
            if resp and resp.status == 200:
                html = await page.content()
                data = parse_all_fields(html)

                if data:
                    # Build the update dict — put academic data inside scorecard
                    update = {"scorecard.data_scraped_at": now, "scorecard.data_source": "productiverecruit.com"}

                    # Logo goes at top level
                    if "logo_url" in data:
                        update["logo_url"] = data["logo_url"]

                    # Slug info for future re-scrapes
                    update["pr_state"] = state
                    update["pr_slug"] = school_slug

                    # Academic fields into scorecard
                    field_mapping = {
                        "avg_gpa": "scorecard.avg_gpa",
                        "sat_avg": "scorecard.sat_avg",
                        "act_avg": "scorecard.act_midpoint",
                        "acceptance_rate": "scorecard.acceptance_rate",
                        "graduation_rate": "scorecard.graduation_rate",
                        "retention_rate": "scorecard.retention_rate",
                        "student_faculty_ratio": "scorecard.student_faculty_ratio",
                        "avg_annual_cost": "scorecard.avg_annual_cost",
                        "median_earnings": "scorecard.median_earnings",
                        "student_size": "scorecard.student_size",
                        "school_type": "scorecard.school_type",
                    }

                    for src_key, dest_key in field_mapping.items():
                        if src_key in data:
                            update[dest_key] = data[src_key]
                            fields_found[src_key] = fields_found.get(src_key, 0) + 1

                    # Mark GPA as non-estimated if we got a real one
                    if "avg_gpa" in data:
                        update["scorecard.gpa_is_estimated"] = False
                        update["scorecard.gpa_source"] = "productiverecruit.com"
                        update["scorecard.gpa_scraped_at"] = now

                    if "logo_url" in data:
                        fields_found["logo_url"] = fields_found.get("logo_url", 0) + 1

                    await db.university_knowledge_base.update_one(
                        {"_id": school["_id"]},
                        {"$set": update}
                    )
                    stats["updated"] += 1
                else:
                    stats["fail"] += 1
            else:
                stats["fail"] += 1
        except Exception as e:
            stats["fail"] += 1
            if stats["fail"] <= 5:
                log.warning(f"Failed scraping {name}: {e}")

        stats["done"] += 1
        if stats["done"] % 25 == 0:
            log.info(f"Pass 2: {stats['done']}/{stats['total']} | Updated: {stats['updated']} | No match: {stats['no_match']} | Fail: {stats['fail']}")

    log.info(f"Pass 2 complete: {stats}")
    log.info(f"Fields coverage: {json.dumps(fields_found, indent=2)}")


async def main():
    client = AsyncIOMotorClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
    db = client[os.environ.get("DB_NAME", "test_database")]

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=['--disable-blink-features=AutomationControlled', '--no-sandbox']
        )
        ctx = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080}
        )
        page = await ctx.new_page()

        # Cloudflare warmup
        try:
            await page.goto(f"{BASE}/florida/florida-gulf-coast-university", wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(8)
            warmup_ok = "Average GPA" in await page.content()
            log.info(f"Cloudflare warmup done (ok={warmup_ok})")
        except Exception:
            log.warning("Warmup failed, continuing anyway")

        # Pass 1: Collect slugs
        slug_map = await pass1_collect_slugs(page)

        with open("/tmp/slug_map_full.json", "w") as f:
            json.dump({k: list(v) for k, v in slug_map.items()}, f, indent=2)

        # Pass 2: Scrape all data
        await pass2_scrape_all_data(page, slug_map, db)

        await browser.close()

    # Final stats
    total = await db.university_knowledge_base.count_documents({})
    has_sat = await db.university_knowledge_base.count_documents({"scorecard.sat_avg": {"$exists": True, "$ne": None}})
    has_act = await db.university_knowledge_base.count_documents({"scorecard.act_midpoint": {"$exists": True, "$ne": None}})
    has_logo = await db.university_knowledge_base.count_documents({"logo_url": {"$exists": True, "$ne": None}})
    has_gpa = await db.university_knowledge_base.count_documents({"scorecard.avg_gpa": {"$exists": True, "$ne": None}, "scorecard.gpa_is_estimated": False})
    has_accept = await db.university_knowledge_base.count_documents({"scorecard.acceptance_rate": {"$exists": True, "$ne": None}})

    log.info(f"FINAL COVERAGE (out of {total}):")
    log.info(f"  Logo: {has_logo} ({round(has_logo/total*100,1)}%)")
    log.info(f"  GPA:  {has_gpa} ({round(has_gpa/total*100,1)}%)")
    log.info(f"  SAT:  {has_sat} ({round(has_sat/total*100,1)}%)")
    log.info(f"  ACT:  {has_act} ({round(has_act/total*100,1)}%)")
    log.info(f"  Acceptance: {has_accept} ({round(has_accept/total*100,1)}%)")

if __name__ == "__main__":
    asyncio.run(main())

"""Admin endpoints for managing Knowledge Base scraper jobs.

Allows directors/admins to trigger and monitor background scraping tasks.
All jobs run asynchronously to avoid blocking the API.
"""

from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone
import asyncio
import logging
import os

from auth_middleware import get_current_user_dep
from db_client import db

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Job State Tracking ──
_jobs = {}

def _job_state(name):
    return _jobs.get(name, {
        "running": False, "processed": 0, "total": 0,
        "success": 0, "failed": 0, "last_run": None, "message": "",
    })


# ── List available jobs & their status ──
@router.get("/admin/kb-jobs")
async def list_kb_jobs(current_user: dict = get_current_user_dep()):
    if current_user["role"] not in ("director", "admin", "platform_admin"):
        raise HTTPException(403, "Admin only")

    total_schools = await db.university_knowledge_base.count_documents({})
    with_scorecard = await db.university_knowledge_base.count_documents({"scorecard": {"$exists": True}})
    with_logo = await db.university_knowledge_base.count_documents({"logo_url": {"$exists": True, "$ne": None, "$ne": ""}})
    with_social = await db.university_knowledge_base.count_documents({"social_links": {"$exists": True}})
    with_diversity = await db.university_knowledge_base.count_documents({"campus_diversity": {"$exists": True}})
    with_questionnaire = await db.university_knowledge_base.count_documents({"questionnaire_url": {"$exists": True, "$ne": None, "$ne": ""}})
    with_pr_coaches = await db.university_knowledge_base.count_documents({"coaching_staff_pr": {"$exists": True, "$ne": []}})

    return {
        "stats": {
            "total_schools": total_schools,
            "with_scorecard": with_scorecard,
            "with_logo": with_logo,
            "with_social": with_social,
            "with_diversity": with_diversity,
            "with_questionnaire": with_questionnaire,
            "with_pr_coaches": with_pr_coaches,
        },
        "jobs": {
            "scrape_school_data": {
                "description": "Scrape academic data & logos from ProductiveRecruit",
                "status": _job_state("scrape_school_data"),
            },
            "enrich_scorecard": {
                "description": "Enrich schools with College Scorecard API data",
                "status": _job_state("enrich_scorecard"),
            },
            "scrape_social": {
                "description": "Scrape social media links (Twitter, Instagram, Facebook)",
                "status": _job_state("scrape_social"),
            },
            "scrape_diversity": {
                "description": "Scrape campus diversity statistics",
                "status": _job_state("scrape_diversity"),
            },
            "scrape_pr_coaches": {
                "description": "Scrape coaching staff from ProductiveRecruit",
                "status": _job_state("scrape_pr_coaches"),
            },
        },
    }


# ── Trigger a scraper job ──
@router.post("/admin/kb-jobs/{job_name}/run")
async def trigger_kb_job(job_name: str, current_user: dict = get_current_user_dep()):
    if current_user["role"] not in ("director", "admin", "platform_admin"):
        raise HTTPException(403, "Admin only")

    state = _job_state(job_name)
    if state.get("running"):
        return {"status": "already_running", **state}

    runners = {
        "scrape_school_data": _run_school_data_scraper,
        "enrich_scorecard": _run_scorecard_enrichment,
        "scrape_social": _run_social_scraper,
        "scrape_diversity": _run_diversity_scraper,
        "scrape_pr_coaches": _run_pr_coaches_scraper,
    }

    runner = runners.get(job_name)
    if not runner:
        raise HTTPException(400, f"Unknown job: {job_name}")

    asyncio.create_task(runner())
    return {"status": "started", "job": job_name, "message": f"{job_name} started in background"}


# ── Scorecard Enrichment (no external deps, uses HTTP API) ──
async def _run_scorecard_enrichment():
    import httpx
    job = "enrich_scorecard"
    _jobs[job] = {"running": True, "processed": 0, "total": 0, "success": 0, "failed": 0, "last_run": None, "message": "Starting..."}

    SCORECARD_BASE = "https://api.data.gov/ed/collegescorecard/v1/schools"
    FIELDS = ",".join([
        "id", "school.name", "school.city", "school.state", "school.school_url",
        "latest.student.size",
        "latest.admissions.admission_rate.overall",
        "latest.admissions.sat_scores.average.overall",
        "latest.admissions.act_scores.midpoint.cumulative",
        "latest.completion.completion_rate_4yr_100nt",
        "latest.student.retention_rate.four_year.full_time",
        "latest.student.demographics.student_faculty_ratio",
        "latest.cost.tuition.in_state",
        "latest.cost.tuition.out_of_state",
        "latest.cost.avg_net_price.overall",
        "latest.aid.median_debt.completers.overall",
        "latest.earnings.10_yrs_after_entry.median",
    ])
    api_key = os.environ.get("COLLEGE_SCORECARD_API_KEY", "")

    schools = await db.university_knowledge_base.find(
        {"$or": [{"scorecard.synced_at": {"$exists": False}}, {"scorecard": None}]},
        {"_id": 1, "domain": 1, "university_name": 1}
    ).to_list(5000)
    _jobs[job]["total"] = len(schools)

    for school in schools:
        try:
            domain = school.get("domain", "")
            if not domain or not api_key:
                _jobs[job]["failed"] += 1
                continue

            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(SCORECARD_BASE, params={
                    "api_key": api_key, "school.school_url": domain,
                    "fields": FIELDS, "per_page": 3,
                })
                if resp.status_code == 200:
                    results = resp.json().get("results", [])
                    if results:
                        r = results[0]
                        scorecard = {
                            "scorecard_id": r.get("id"),
                            "city": r.get("school.city"),
                            "state": r.get("school.state"),
                            "student_size": r.get("latest.student.size"),
                            "admission_rate": r.get("latest.admissions.admission_rate.overall"),
                            "sat_avg": r.get("latest.admissions.sat_scores.average.overall"),
                            "act_midpoint": r.get("latest.admissions.act_scores.midpoint.cumulative"),
                            "graduation_rate": r.get("latest.completion.completion_rate_4yr_100nt"),
                            "retention_rate": r.get("latest.student.retention_rate.four_year.full_time"),
                            "student_faculty_ratio": r.get("latest.student.demographics.student_faculty_ratio"),
                            "tuition_in_state": r.get("latest.cost.tuition.in_state"),
                            "tuition_out_of_state": r.get("latest.cost.tuition.out_of_state"),
                            "avg_net_price": r.get("latest.cost.avg_net_price.overall"),
                            "median_debt": r.get("latest.aid.median_debt.completers.overall"),
                            "median_earnings": r.get("latest.earnings.10_yrs_after_entry.median"),
                            "synced_at": datetime.now(timezone.utc).isoformat(),
                        }
                        await db.university_knowledge_base.update_one(
                            {"_id": school["_id"]}, {"$set": {"scorecard": scorecard}}
                        )
                        _jobs[job]["success"] += 1
                    else:
                        _jobs[job]["failed"] += 1
                else:
                    _jobs[job]["failed"] += 1
        except Exception as e:
            _jobs[job]["failed"] += 1
            logger.warning(f"Scorecard enrich failed for {school.get('university_name')}: {e}")

        _jobs[job]["processed"] += 1
        await asyncio.sleep(3)

    _jobs[job]["running"] = False
    _jobs[job]["last_run"] = datetime.now(timezone.utc).isoformat()
    _jobs[job]["message"] = f"Done. {_jobs[job]['success']} enriched, {_jobs[job]['failed']} failed."
    logger.info(f"Scorecard enrichment complete: {_jobs[job]}")


# ── School Data Scraper (ProductiveRecruit) ──
async def _run_school_data_scraper():
    job = "scrape_school_data"
    _jobs[job] = {"running": True, "processed": 0, "total": 0, "success": 0, "failed": 0, "last_run": None, "message": "Starting..."}

    try:
        import httpx
        import re
        from bs4 import BeautifulSoup

        schools = await db.university_knowledge_base.find(
            {"$or": [{"logo_url": {"$exists": False}}, {"logo_url": None}, {"logo_url": ""}]},
            {"_id": 1, "university_name": 1, "domain": 1}
        ).to_list(5000)
        _jobs[job]["total"] = len(schools)

        def normalize_name(name):
            n = name.lower().strip()
            n = re.sub(r'\([^)]*\)', '', n)
            n = re.sub(r'–.*', '', n)
            for w in ["the ", "university of ", "university", "college of ", "college", "- ", "&", "at ", "in "]:
                n = n.replace(w, " ")
            return re.sub(r"[^a-z0-9]", "", n)

        BASE = "https://productiverecruit.com/athletic-scholarships/womens-volleyball"

        async with httpx.AsyncClient(timeout=30) as client:
            for school in schools:
                try:
                    name = school.get("university_name", "")
                    domain = school.get("domain", "")
                    slug = name.lower().replace(" ", "-").replace("'", "").replace(".", "")
                    url = f"{BASE}/{slug}"

                    resp = await client.get(url, follow_redirects=True)
                    if resp.status_code != 200:
                        _jobs[job]["failed"] += 1
                        _jobs[job]["processed"] += 1
                        await asyncio.sleep(2)
                        continue

                    html = resp.text
                    data = {}

                    # Logo
                    m = re.search(r'src="(https://assets\.productiverecruit\.com/colleges/logos/[^"]+)"', html)
                    if m:
                        data["logo_url"] = m.group(1)

                    # GPA
                    m = re.search(r'(\d\.\d{1,2})\s*</(?:p|div|span|h\d)>\s*(?:<[^>]*>)*\s*Average GPA', html, re.DOTALL)
                    if m:
                        v = float(m.group(1))
                        if 2.0 <= v <= 5.0:
                            data["scorecard.avg_gpa"] = v

                    if data:
                        await db.university_knowledge_base.update_one(
                            {"_id": school["_id"]}, {"$set": data}
                        )
                        _jobs[job]["success"] += 1
                    else:
                        _jobs[job]["failed"] += 1

                except Exception as e:
                    _jobs[job]["failed"] += 1
                    logger.warning(f"Scraper failed for {school.get('university_name')}: {e}")

                _jobs[job]["processed"] += 1
                await asyncio.sleep(2)

    except Exception as e:
        _jobs[job]["message"] = f"Fatal error: {e}"
        logger.error(f"School data scraper failed: {e}")

    _jobs[job]["running"] = False
    _jobs[job]["last_run"] = datetime.now(timezone.utc).isoformat()
    _jobs[job]["message"] = f"Done. {_jobs[job]['success']} updated, {_jobs[job]['failed']} failed."
    logger.info(f"School data scraper complete: {_jobs[job]}")


# ── Social Media Scraper ──
async def _run_social_scraper():
    job = "scrape_social"
    _jobs[job] = {"running": True, "processed": 0, "total": 0, "success": 0, "failed": 0, "last_run": None, "message": "Starting..."}

    try:
        import httpx
        from bs4 import BeautifulSoup

        schools = await db.university_knowledge_base.find(
            {"$or": [{"social_links": {"$exists": False}}, {"social_links": None}]},
            {"_id": 1, "university_name": 1, "website": 1}
        ).to_list(5000)
        _jobs[job]["total"] = len(schools)

        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            for school in schools:
                try:
                    website = school.get("website", "")
                    if not website:
                        _jobs[job]["failed"] += 1
                        _jobs[job]["processed"] += 1
                        continue

                    url = website if website.startswith("http") else f"https://{website}"
                    resp = await client.get(url)
                    if resp.status_code != 200:
                        _jobs[job]["failed"] += 1
                        _jobs[job]["processed"] += 1
                        await asyncio.sleep(3)
                        continue

                    soup = BeautifulSoup(resp.text, "html.parser")
                    links = {}
                    for a in soup.find_all("a", href=True):
                        href = a["href"].lower()
                        if "twitter.com" in href or "x.com" in href:
                            links["twitter"] = a["href"]
                        elif "instagram.com" in href:
                            links["instagram"] = a["href"]
                        elif "facebook.com" in href:
                            links["facebook"] = a["href"]

                    if links:
                        await db.university_knowledge_base.update_one(
                            {"_id": school["_id"]},
                            {"$set": {"social_links": links, "social_links_scraped_at": datetime.now(timezone.utc).isoformat()}}
                        )
                        _jobs[job]["success"] += 1
                    else:
                        _jobs[job]["failed"] += 1

                except Exception:
                    _jobs[job]["failed"] += 1

                _jobs[job]["processed"] += 1
                await asyncio.sleep(3)

    except Exception as e:
        _jobs[job]["message"] = f"Fatal error: {e}"
        logger.error(f"Social scraper failed: {e}")

    _jobs[job]["running"] = False
    _jobs[job]["last_run"] = datetime.now(timezone.utc).isoformat()
    _jobs[job]["message"] = f"Done. {_jobs[job]['success']} updated, {_jobs[job]['failed']} failed."
    logger.info(f"Social scraper complete: {_jobs[job]}")


# ── Campus Diversity Scraper ──
async def _run_diversity_scraper():
    job = "scrape_diversity"
    _jobs[job] = {"running": True, "processed": 0, "total": 0, "success": 0, "failed": 0, "last_run": None, "message": "Starting..."}

    try:
        import httpx
        import re
        from bs4 import BeautifulSoup

        schools = await db.university_knowledge_base.find(
            {"$or": [{"campus_diversity": {"$exists": False}}, {"campus_diversity": None}]},
            {"_id": 1, "university_name": 1, "domain": 1}
        ).to_list(5000)
        _jobs[job]["total"] = len(schools)

        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            for school in schools:
                try:
                    name = school.get("university_name", "")
                    slug = name.lower().replace(" ", "-").replace("'", "").replace(".", "")
                    url = f"https://www.collegefactual.com/colleges/{slug}/student-life/diversity/"

                    resp = await client.get(url)
                    if resp.status_code == 200:
                        soup = BeautifulSoup(resp.text, "html.parser")
                        diversity_data = {}
                        # Parse diversity tables if available
                        for table in soup.find_all("table"):
                            rows = table.find_all("tr")
                            for row in rows:
                                cols = row.find_all(["td", "th"])
                                if len(cols) >= 3:
                                    category = cols[0].get_text(strip=True)
                                    try:
                                        students_pct = float(cols[1].get_text(strip=True).replace("%", ""))
                                        faculty_pct = float(cols[2].get_text(strip=True).replace("%", ""))
                                        diversity_data[category] = {"students": students_pct, "faculty": faculty_pct}
                                    except (ValueError, IndexError):
                                        pass

                        if diversity_data:
                            await db.university_knowledge_base.update_one(
                                {"_id": school["_id"]},
                                {"$set": {"campus_diversity": diversity_data, "diversity_scraped_at": datetime.now(timezone.utc).isoformat()}}
                            )
                            _jobs[job]["success"] += 1
                        else:
                            _jobs[job]["failed"] += 1
                    else:
                        _jobs[job]["failed"] += 1

                except Exception:
                    _jobs[job]["failed"] += 1

                _jobs[job]["processed"] += 1
                await asyncio.sleep(3)

    except Exception as e:
        _jobs[job]["message"] = f"Fatal error: {e}"
        logger.error(f"Diversity scraper failed: {e}")

    _jobs[job]["running"] = False
    _jobs[job]["last_run"] = datetime.now(timezone.utc).isoformat()
    _jobs[job]["message"] = f"Done. {_jobs[job]['success']} updated, {_jobs[job]['failed']} failed."
    logger.info(f"Diversity scraper complete: {_jobs[job]}")



# ── ProductiveRecruit Coaching Staff Scraper ──
async def _run_pr_coaches_scraper():
    """Scrape coaching staff names/roles from ProductiveRecruit pages."""
    import httpx
    import re

    job = "scrape_pr_coaches"
    _jobs[job] = {"running": True, "processed": 0, "total": 0, "success": 0, "failed": 0, "last_run": None, "message": "Starting..."}

    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
    BASE = "https://productiverecruit.com/athletic-scholarships/womens-volleyball"

    def parse_coaches_from_pr(html):
        clean = re.sub(r'<!--.*?-->', '', html, flags=re.DOTALL)
        coaches = []
        coach_section = re.search(r'Coaching Staff(.*?)(?:School Profile|Subscribe|Similar Programs|$)', clean, re.DOTALL)
        if not coach_section:
            return coaches
        text = coach_section.group(1)
        roles = [
            'Associate Head Coach', 'Director of Volleyball Operations',
            'Director of Operations', 'Volunteer Assistant Coach',
            'Volunteer Assistant', 'Graduate Assistant Coach',
            'Graduate Assistant', 'Assistant Coach', 'Head Coach',
        ]
        for role in roles:
            pattern = re.escape(role) + r'\s*(?:<[^>]*>\s*)*(?:<[^>]*>\s*)*([A-Z][a-zA-Z\'\-\.\s]+?)(?:\s*<)'
            for name in re.findall(pattern, text):
                name = name.strip()
                if 2 < len(name) < 60 and not any(c['name'] == name for c in coaches):
                    coaches.append({"role": role, "name": name})
        return coaches

    try:
        schools = await db.university_knowledge_base.find(
            {
                "pr_slug": {"$exists": True, "$nin": ["", "---", None]},
                "$or": [
                    {"coaching_staff_pr": {"$exists": False}},
                    {"coaching_staff_pr": []},
                ]
            },
            {"_id": 1, "university_name": 1, "pr_slug": 1, "pr_state": 1}
        ).to_list(2000)

        _jobs[job]["total"] = len(schools)
        if not schools:
            _jobs[job]["message"] = "No schools to scrape."
            _jobs[job]["running"] = False
            _jobs[job]["last_run"] = datetime.now(timezone.utc).isoformat()
            return

        async with httpx.AsyncClient(timeout=20, headers=HEADERS) as client:
            for school in schools:
                name = school.get("university_name", "")
                slug = school.get("pr_slug", "")
                state = school.get("pr_state", "")

                if not slug or slug == "---" or not state:
                    _jobs[job]["failed"] += 1
                    _jobs[job]["processed"] += 1
                    continue

                url = f"{BASE}/{state}/{slug}"
                try:
                    resp = await client.get(url, follow_redirects=True)
                    if resp.status_code != 200:
                        _jobs[job]["failed"] += 1
                        _jobs[job]["processed"] += 1
                        await asyncio.sleep(1.5)
                        continue

                    coaches = parse_coaches_from_pr(resp.text)
                    if coaches:
                        await db.university_knowledge_base.update_one(
                            {"_id": school["_id"]},
                            {"$set": {
                                "coaching_staff_pr": coaches,
                                "pr_coaches_scraped_at": datetime.now(timezone.utc).isoformat(),
                            }}
                        )
                        _jobs[job]["success"] += 1
                    else:
                        _jobs[job]["failed"] += 1

                except Exception as e:
                    _jobs[job]["failed"] += 1
                    logger.warning(f"PR coach scrape failed for {name}: {e}")

                _jobs[job]["processed"] += 1
                _jobs[job]["message"] = f"Processing... {_jobs[job]['processed']}/{_jobs[job]['total']}"
                await asyncio.sleep(1.5)

    except Exception as e:
        _jobs[job]["message"] = f"Fatal error: {e}"
        logger.error(f"PR coaches scraper failed: {e}")

    _jobs[job]["running"] = False
    _jobs[job]["last_run"] = datetime.now(timezone.utc).isoformat()
    _jobs[job]["message"] = f"Done. {_jobs[job]['success']} updated, {_jobs[job]['failed']} failed."
    logger.info(f"PR coaches scraper complete: {_jobs[job]}")

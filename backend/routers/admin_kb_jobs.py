"""Admin endpoints for managing Knowledge Base enrichment jobs.

Allows directors/admins to trigger and monitor background enrichment tasks.
All jobs run asynchronously to avoid blocking the API.
"""

from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone
import asyncio
import logging
log = logging.getLogger(__name__)
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

    return {
        "stats": {
            "total_schools": total_schools,
            "with_scorecard": with_scorecard,
            "with_logo": with_logo,
            "with_social": with_social,
            "with_diversity": with_diversity,
            "with_questionnaire": with_questionnaire,
        },
        "jobs": {
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
        },
    }


# ── Trigger a job ──
@router.post("/admin/kb-jobs/{job_name}/run")
async def trigger_kb_job(job_name: str, current_user: dict = get_current_user_dep()):
    if current_user["role"] not in ("director", "admin", "platform_admin"):
        raise HTTPException(403, "Admin only")

    state = _job_state(job_name)
    if state.get("running"):
        return {"status": "already_running", **state}

    runners = {
        "enrich_scorecard": _run_scorecard_enrichment,
        "scrape_social": _run_social_scraper,
        "scrape_diversity": _run_diversity_scraper,
    }

    runner = runners.get(job_name)
    if not runner:
        raise HTTPException(400, f"Unknown job: {job_name}")

    asyncio.create_task(runner())
    return {"status": "started", "job": job_name, "message": f"{job_name} started in background"}


# ── Scorecard Enrichment (uses College Scorecard HTTP API) ──
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

                except Exception as e:  # noqa: E722
                    log.warning("Handled exception (handled): %s", e)
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

                except Exception as e:  # noqa: E722
                    log.warning("Handled exception (handled): %s", e)
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

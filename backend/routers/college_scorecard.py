"""College Scorecard integration — sync federal academic data into the KB.

Sophisticated matching: domain exact -> root domain -> name similarity.
Supports: bulk sync, single-school sync, search, API key management.
"""

from fastapi import APIRouter, HTTPException, Request, Depends
from db_client import db
from admin_guard import require_admin
from datetime import datetime, timezone
import httpx
import os
import logging
log = logging.getLogger(__name__)
import asyncio
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/integrations/scorecard", dependencies=[Depends(require_admin)])

SCORECARD_BASE = "https://api.data.gov/ed/collegescorecard/v1/schools"
SCORECARD_FIELDS = ",".join([
    "id", "school.name", "school.city", "school.state", "school.school_url",
    "school.student_size", "latest.student.size",
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

sync_status = {"running": False, "synced": 0, "failed": 0, "total": 0, "done": True}


def get_api_key():
    return os.environ.get("COLLEGE_SCORECARD_API_KEY", "")


def parse_scorecard_result(r):
    return {
        "scorecard_id": r.get("id"),
        "name": r.get("school.name"),
        "city": r.get("school.city"),
        "state": r.get("school.state"),
        "website": r.get("school.school_url"),
        "student_size": r.get("school.student_size") or r.get("latest.student.size"),
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
    }


def _name_similarity(query, candidate):
    q = query.lower().strip()
    c = candidate.lower().strip()
    if q == c:
        return 100
    c_n = c.replace("-", " ").replace("\u2013", " ")
    q_n = q.replace("-", " ").replace("\u2013", " ")
    if q_n in c_n:
        return 90
    if c_n in q_n:
        return 85
    q_words = set(q_n.split())
    c_words = set(c_n.split())
    common = q_words & c_words
    filler = {"university", "of", "the", "at", "and", "&", "college"}
    meaningful_common = common - filler
    meaningful_q = q_words - filler
    if not meaningful_q:
        return len(common) * 10
    return int((len(meaningful_common) / len(meaningful_q)) * 70)


def _best_match(name, results):
    if not results:
        return None
    best_sim, best_size, best = 0, 0, None
    for r in results:
        sc_name = r.get("school.name", "")
        sim = _name_similarity(name, sc_name)
        if sim < 40:
            continue
        size = r.get("latest.student.size") or r.get("school.student_size") or 0
        if sim > best_sim or (sim == best_sim and size > best_size):
            best_sim, best_size, best = sim, size, r
    return best


def _extract_domain(url):
    if not url:
        return ""
    try:
        parsed = urlparse(url if url.startswith("http") else f"https://{url}")
        host = parsed.netloc or parsed.path.split("/")[0]
        host = host.lower().strip(".")
        if host.startswith("www."):
            host = host[4:]
        return host
    except Exception as e:  # noqa: E722
        log.debug("Non-critical error (fallback): %s", e)
        return ""


def _root_domain(host):
    parts = host.split(".")
    if len(parts) >= 2:
        return ".".join(parts[-2:])
    return host


@router.get("/search")
async def search_school(name: str):
    api_key = get_api_key()
    if not api_key:
        raise HTTPException(status_code=400, detail="College Scorecard API key not configured")
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(SCORECARD_BASE, params={
            "api_key": api_key, "school.name": name, "fields": SCORECARD_FIELDS, "per_page": 10,
        })
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="College Scorecard API error")
    data = resp.json()
    results = [parse_scorecard_result(r) for r in data.get("results", [])]
    return {"results": results, "total": data.get("metadata", {}).get("total", 0)}


@router.get("/sync-status")
async def get_sync_status():
    return sync_status


async def _download_all_scorecard(api_key):
    all_schools = []
    page = 0
    async with httpx.AsyncClient(timeout=20) as client:
        while True:
            for attempt in range(3):
                try:
                    resp = await client.get(f"{SCORECARD_BASE}.json", params={
                        "api_key": api_key, "fields": SCORECARD_FIELDS, "per_page": 100, "page": page,
                    })
                    if resp.status_code == 429:
                        await asyncio.sleep(2 ** (attempt + 1))
                        continue
                    if resp.status_code != 200:
                        logger.error(f"Scorecard API error on page {page}: {resp.status_code}")
                        return all_schools
                    data = resp.json()
                    results = data.get("results", [])
                    all_schools.extend(results)
                    total = data.get("metadata", {}).get("total", 0)
                    logger.info(f"Scorecard download: page {page}, got {len(results)}, total so far {len(all_schools)}/{total}")
                    break
                except Exception as e:
                    logger.warning(f"Scorecard download page {page} attempt {attempt+1}: {e}")
                    await asyncio.sleep(1)
            if not results or len(all_schools) >= total:
                break
            page += 1
            await asyncio.sleep(0.2)
    return all_schools


def _build_domain_lookup(scorecard_schools):
    exact, root = {}, {}
    for s in scorecard_schools:
        url = s.get("school.school_url", "") or ""
        domain = _extract_domain(url)
        if domain:
            exact.setdefault(domain, []).append(s)
            rd = _root_domain(domain)
            if rd != domain:
                root.setdefault(rd, []).append(s)
    for lookup in [exact, root]:
        for d in lookup:
            lookup[d].sort(key=lambda x: x.get("latest.student.size") or x.get("school.student_size") or 0, reverse=True)
    return exact, root


async def _run_sync():
    global sync_status
    api_key = get_api_key()
    if not api_key:
        sync_status = {"running": False, "synced": 0, "failed": 0, "total": 0, "done": True, "error": "No API key"}
        return
    try:
        sync_status["phase"] = "downloading"
        all_scorecard = await _download_all_scorecard(api_key)
        if not all_scorecard:
            sync_status = {"running": False, "synced": 0, "failed": 0, "total": 0, "done": True, "error": "Download failed"}
            return
        exact_lookup, root_lookup = _build_domain_lookup(all_scorecard)
        logger.info(f"Domain lookups: {len(exact_lookup)} exact, {len(root_lookup)} root domains")

        sync_status["phase"] = "matching"
        universities = await db.university_knowledge_base.find({}, {"_id": 0, "university_name": 1, "domain": 1}).to_list(2000)
        sync_status["total"] = len(universities)

        for uni in universities:
            name = uni.get("university_name", "")
            domain = uni.get("domain", "")
            match, method = None, "none"

            if domain and domain in exact_lookup:
                match, method = exact_lookup[domain][0], "domain_exact"
            if not match and domain:
                rd = _root_domain(domain)
                if rd in root_lookup:
                    match, method = root_lookup[rd][0], "domain_root"
                elif rd in exact_lookup:
                    match, method = exact_lookup[rd][0], "domain_root"
            if not match:
                match = _best_match(name, all_scorecard)
                if match:
                    method = "name"

            if match:
                scorecard = parse_scorecard_result(match)
                scorecard["synced_at"] = datetime.now(timezone.utc).isoformat()
                scorecard["match_method"] = method
                await db.university_knowledge_base.update_one({"university_name": name}, {"$set": {"scorecard": scorecard}})
                sync_status["synced"] += 1
            else:
                sync_status["failed"] += 1
    except Exception as e:
        logger.error(f"Scorecard sync error: {e}")
    finally:
        sync_status["running"] = False
        sync_status["done"] = True
        sync_status["phase"] = "complete"


@router.post("/sync")
async def sync_schools(request: Request):
    global sync_status
    if sync_status["running"]:
        return {"status": "already_running", **sync_status}
    body = {}
    try:
        body = await request.json()
    except Exception as e:  # noqa: E722
        log.debug("Non-critical error (silenced): %s", e)
        pass
    force = body.get("force", False)
    if force:
        await db.university_knowledge_base.update_many({}, {"$unset": {"scorecard": ""}})
    total = await db.university_knowledge_base.count_documents({})
    already_synced = 0 if force else await db.university_knowledge_base.count_documents({"scorecard": {"$exists": True}})
    sync_status = {"running": True, "synced": 0, "failed": 0, "total": total, "done": False, "phase": "starting"}
    asyncio.create_task(_run_sync())
    return {"status": "started", "already_synced": already_synced, "total": total, "mode": "force_rebuild" if force else "incremental"}


@router.post("/sync-one")
async def sync_one_school(request: Request):
    body = await request.json()
    name = body.get("university_name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="university_name required")
    api_key = get_api_key()
    if not api_key:
        raise HTTPException(status_code=400, detail="College Scorecard API key not configured")
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(SCORECARD_BASE, params={
            "api_key": api_key, "school.name": name, "fields": SCORECARD_FIELDS, "per_page": 20,
        })
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="College Scorecard API error")
    results = resp.json().get("results", [])
    match = _best_match(name, results)
    if not match:
        raise HTTPException(status_code=404, detail=f"No scorecard data found for {name}")
    scorecard = parse_scorecard_result(match)
    scorecard["synced_at"] = datetime.now(timezone.utc).isoformat()
    await db.university_knowledge_base.update_one({"university_name": name}, {"$set": {"scorecard": scorecard}})
    return {"scorecard": scorecard}


@router.put("/key")
async def update_scorecard_key(request: Request):
    body = await request.json()
    new_key = body.get("api_key", "").strip()
    if not new_key:
        raise HTTPException(status_code=400, detail="API key is required")
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(SCORECARD_BASE, params={"api_key": new_key, "school.name": "Harvard", "fields": "school.name", "per_page": 1})
    if resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Invalid API key")
    os.environ["COLLEGE_SCORECARD_API_KEY"] = new_key
    return {"status": "ok"}

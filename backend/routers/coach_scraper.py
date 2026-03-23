"""Coach Scraper — scrape volleyball coaching staff from school websites.

Handles Sidearm Sports CMS, generic staff cards, email extraction.
Supports batch scraping + single-school scraping + volleyball URL discovery.
"""

from fastapi import APIRouter, Request, Depends
from db_client import db
from admin_guard import require_admin
from datetime import datetime, timezone
from bs4 import BeautifulSoup
import httpx
import re
import asyncio
import logging
log = logging.getLogger(__name__)
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/coach-scraper", dependencies=[Depends(require_admin)])

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate",
}

scrape_status = {"running": False, "scraped": 0, "failed": 0, "total": 0, "done": True}

PLACEHOLDER_NAMES = {"name", "title", "first last", "staff", "coaching staff", "coaches", "coach", ""}

SPORT_PATHS = [
    "/sports/womens-volleyball/coaches",
    "/sports/womens-volleyball/coaching-staff",
    "/sports/womens-volleyball/staff",
    "/sports/volleyball/coaches",
    "/sports/volleyball/coaching-staff",
    "/sports/wvball/coaches",
    "/sports/w-volley/coaches",
    "/sports/wvb/coaches",
    "/sports/womens-volleyball",
    "/sports/volleyball",
]


def get_url_candidates(domain, website=""):
    candidates = []
    if website:
        w = website.rstrip("/")
        if not w.startswith("http"):
            w = f"https://{w}"
        if "/sports/" in w or "/volleyball" in w:
            base_sport = re.sub(r'/roster.*|/schedule.*', '', w)
            candidates.append(f"{base_sport}/coaches")
            candidates.append(base_sport)
        parsed = urlparse(w)
        ath_base = f"{parsed.scheme}://{parsed.netloc}"
        for sp in SPORT_PATHS:
            candidates.append(f"{ath_base}{sp}")

    base = domain.rstrip("/")
    if base:
        prefixes = [f"https://{base}", f"https://athletics.{base}"]
        short = base.replace(".edu", "").replace(".com", "")
        for suffix in ["athletics", "bears", "tigers", "eagles", "lions", "hawks", "wolves",
                        "wildcats", "bulldogs", "warriors", "knights", "panthers", "cougars",
                        "mustangs", "rams", "falcons", "cardinals", "aggies", "gators", "owls"]:
            prefixes.append(f"https://{short}{suffix}.com")
        for prefix in prefixes:
            for sp in SPORT_PATHS:
                candidates.append(f"{prefix}{sp}")

    seen = set()
    unique = []
    for c in candidates:
        if c not in seen:
            seen.add(c)
            unique.append(c)
    return unique


def name_from_email(email):
    local = email.split("@")[0]
    local = re.sub(r'\d+$', '', local)
    parts = re.split(r'[._\-]', local)
    parts = [p.capitalize() for p in parts if len(p) > 1]
    return " ".join(parts[:3]) if parts else ""


def is_valid_name(name):
    if not name:
        return False
    n = name.strip().lower()
    if n in PLACEHOLDER_NAMES or len(n) < 3:
        return False
    bad_words = ["volleyball", "sport", "staff", "directory", "contact", "email", "team",
                 "roster", "schedule", "ticket", "news", "media", "men's", "women's", "athletic"]
    if any(w in n for w in bad_words):
        return False
    if re.search(r'20\d{2}', n):
        return False
    return True


def is_valid_title(title):
    if not title:
        return False
    t = title.strip().lower()
    if t in PLACEHOLDER_NAMES:
        return False
    coach_words = ["coach", "coordinator", "director", "analyst", "manager", "trainer"]
    return any(w in t for w in coach_words)


def extract_emails_from_html(html_text):
    emails = set(re.findall(r'[\w.+-]+@[\w.-]+\.(?:edu|com|org|net)', html_text.lower()))
    skip_prefixes = {"info@", "admissions@", "webmaster@", "privacy@", "help@", "support@", "news@",
                     "marketing@", "compliance@", "noreply@", "tickets@", "camps@", "recruiting@",
                     "athletics@", "ticket@", "sidearm@", "volleyball@", "vball@", "sportsinfo@",
                     "media@", "development@", "giving@", "alumni@"}
    result = []
    for e in emails:
        if any(e.startswith(s) for s in skip_prefixes):
            continue
        local = e.split("@")[0]
        if any(s in local for s in ["volleyball", "vball", "ticket", "camp", "recruit", "sport"]):
            continue
        result.append(e)
    return result


def assign_titles(coaches):
    for i, c in enumerate(coaches):
        if not is_valid_title(c.get("title", "")):
            c["title"] = "Head Coach" if i == 0 else "Assistant Coach"
    return coaches


def _is_generic_email(email):
    local = email.split("@")[0].lower()
    generic_words = ["volleyball", "vball", "ticket", "camp", "recruit", "sport", "athletics",
                     "info", "admissions", "webmaster", "privacy", "help", "support", "news",
                     "marketing", "compliance", "noreply", "media"]
    if any(w in local for w in generic_words):
        return True
    if '.' not in local and '_' not in local and '-' not in local and len(local) > 10:
        return True
    return False


def _clean_coaches(coaches):
    cleaned = []
    seen_emails = set()
    for c in coaches:
        email = c.get("email", "").strip().lower()
        if email and email in seen_emails:
            continue
        if email:
            seen_emails.add(email)
        if email and _is_generic_email(email):
            continue
        if not is_valid_name(c.get("name", "")) and email:
            c["name"] = name_from_email(email)
        if not is_valid_title(c.get("title", "")):
            c["title"] = ""
        if c.get("name") or c.get("email"):
            cleaned.append(c)
    return assign_titles(cleaned)


def extract_coaches_structured(soup):
    coaches = []
    # Pattern 1: Sidearm Sports
    for card in soup.select('.sidearm-coaches-coach'):
        name_el = card.select_one('.sidearm-coaches-coach-name a, .sidearm-coaches-coach-name')
        title_el = card.select_one('.sidearm-coaches-coach-title')
        email_el = card.select_one('a[href^="mailto:"]')
        name = name_el.get_text(strip=True) if name_el else ""
        title = title_el.get_text(strip=True) if title_el else ""
        email = email_el['href'].replace('mailto:', '').split('?')[0].strip() if email_el else ""
        if email or is_valid_name(name):
            coaches.append({"name": name, "title": title, "email": email})
    if coaches:
        return _clean_coaches(coaches)

    # Pattern 2: Generic staff cards with mailto links
    for mailto in soup.select('a[href^="mailto:"]'):
        email = mailto['href'].replace('mailto:', '').split('?')[0].strip()
        parent = mailto.find_parent(['div', 'li', 'article', 'section'])
        if parent:
            name_el = parent.select_one('h2, h3, h4, h5, .name, [class*="name"]')
            title_el = parent.select_one('.title, [class*="title"], [class*="position"], .subtitle')
            name = name_el.get_text(strip=True) if name_el else ""
            title = title_el.get_text(strip=True) if title_el else ""
            if email:
                coaches.append({"name": name, "title": title, "email": email})
    if coaches:
        return _clean_coaches(coaches)

    # Pattern 3: Staff/person/coach cards
    for card in soup.select('[class*="staff"], [class*="person"], [class*="coach"]'):
        name_el = card.select_one('h2, h3, h4, h5, [class*="name"]')
        title_el = card.select_one('[class*="title"], [class*="position"], [class*="role"]')
        email_el = card.select_one('a[href^="mailto:"]')
        name = name_el.get_text(strip=True) if name_el else ""
        title = title_el.get_text(strip=True) if title_el else ""
        email = email_el['href'].replace('mailto:', '').split('?')[0].strip() if email_el else ""
        if (email or is_valid_name(name)) and len(name) < 60:
            coaches.append({"name": name, "title": title, "email": email})
    return _clean_coaches(coaches)


async def discover_athletics_domain(http_client, domain):
    try:
        resp = await http_client.get(f"https://www.{domain}", headers=HEADERS, follow_redirects=True, timeout=8)
        if resp.status_code != 200:
            resp = await http_client.get(f"https://{domain}", headers=HEADERS, follow_redirects=True, timeout=8)
        if resp.status_code != 200:
            return []
        soup = BeautifulSoup(resp.text, "lxml")
        found = set()
        for a in soup.select('a[href]'):
            href = a.get('href', '').lower()
            text = a.get_text(strip=True).lower()
            if ('athletics' in href or 'athletics' in text or 'sports' in href) and href.startswith('http'):
                parsed = urlparse(href)
                if parsed.netloc and parsed.netloc != domain and f"www.{domain}" not in parsed.netloc:
                    found.add(f"{parsed.scheme}://{parsed.netloc}")
        return list(found)[:3]
    except Exception as e:  # noqa: E722
        log.debug("Non-critical error (fallback): %s", e)
        return []


async def scrape_coaching_page(http_client, domain, website=""):
    candidates = get_url_candidates(domain, website)
    result = await _try_candidates(http_client, candidates[:15])
    if result:
        return result
    ath_domains = await discover_athletics_domain(http_client, domain)
    if ath_domains:
        extra = []
        for ath_base in ath_domains:
            for sp in SPORT_PATHS:
                extra.append(f"{ath_base}{sp}")
        result = await _try_candidates(http_client, extra)
        if result:
            return result
    return None


async def _try_candidates(http_client, urls):
    for url in urls:
        try:
            resp = await http_client.get(url, headers=HEADERS, follow_redirects=True, timeout=12)
            if resp.status_code != 200:
                continue
            html = resp.text
            if "volleyball" not in html.lower() and "volley" not in html.lower():
                continue
            soup = BeautifulSoup(html, "lxml")
            coaches = extract_coaches_structured(soup)
            if not coaches:
                emails = extract_emails_from_html(html)
                if emails:
                    coaches = [{"name": name_from_email(e), "title": "", "email": e} for e in emails[:5]]
                    coaches = assign_titles(coaches)
            if coaches:
                return {"url": str(resp.url), "coaches": coaches}
        except Exception as e:  # noqa: E722
            log.debug("Non-critical error (skipped): %s", e)
            continue
    return None


def _build_update(result):
    coaches = result["coaches"]
    update = {"coaches_scraped": coaches, "coaches_source_url": result["url"]}
    head, assistant = None, None
    for c in coaches:
        if "head" in c.get("title", "").lower():
            head = c
        elif not assistant and c.get("email"):
            assistant = c
    if not head and coaches:
        head = coaches[0]
    if not assistant and len(coaches) > 1:
        assistant = coaches[1]
    if head:
        if head.get("name"):
            update["primary_coach"] = head["name"]
        if head.get("email"):
            update["coach_email"] = head["email"]
    if assistant:
        if assistant.get("name"):
            update["recruiting_coordinator"] = assistant["name"]
        if assistant.get("email"):
            update["coordinator_email"] = assistant["email"]
    return update


async def _run_scrape(force=False):
    global scrape_status
    try:
        query = {"domain": {"$ne": ""}} if force else {"$or": [{"coach_email": ""}, {"coach_email": {"$exists": False}}]}
        universities = await db.university_knowledge_base.find(
            query, {"_id": 0, "university_name": 1, "domain": 1, "website": 1}
        ).to_list(2000)
        scrape_status["total"] = len(universities)
        if not universities:
            scrape_status.update({"running": False, "done": True})
            return
        async with httpx.AsyncClient() as http_client:
            for uni in universities:
                domain = uni.get("domain", "")
                name = uni.get("university_name", "")
                if not domain:
                    scrape_status["failed"] += 1
                    continue
                try:
                    result = await scrape_coaching_page(http_client, domain, uni.get("website", ""))
                    if result and result["coaches"]:
                        update = _build_update(result)
                        await db.university_knowledge_base.update_one({"university_name": name}, {"$set": update})
                        scrape_status["scraped"] += 1
                    else:
                        scrape_status["failed"] += 1
                except Exception as e:
                    logger.warning(f"Coach scrape failed for {name}: {e}")
                    scrape_status["failed"] += 1
                await asyncio.sleep(0.5)
    except Exception as e:
        logger.error(f"Coach scrape task error: {e}")
    finally:
        scrape_status["running"] = False
        scrape_status["done"] = True


@router.post("/scrape")
async def start_scrape(request: Request):
    global scrape_status
    if scrape_status["running"]:
        return {"status": "already_running", **scrape_status}
    body = {}
    try:
        body = await request.json()
    except Exception as e:  # noqa: E722
        log.debug("Non-critical error (silenced): %s", e)
        pass
    force = body.get("force", False)
    if force:
        total = await db.university_knowledge_base.count_documents({"domain": {"$ne": ""}})
        scrape_status = {"running": True, "scraped": 0, "failed": 0, "total": total, "done": False}
        asyncio.create_task(_run_scrape(force=True))
        return {"status": "started", "already_have": 0, "missing": total, "mode": "force_all"}
    else:
        already_have = await db.university_knowledge_base.count_documents({"coach_email": {"$ne": ""}})
        missing = await db.university_knowledge_base.count_documents(
            {"$or": [{"coach_email": ""}, {"coach_email": {"$exists": False}}]}
        )
        scrape_status = {"running": True, "scraped": 0, "failed": 0, "total": missing, "done": False}
        asyncio.create_task(_run_scrape(force=False))
        return {"status": "started", "already_have": already_have, "missing": missing}


@router.get("/status")
async def get_scrape_status():
    return scrape_status


@router.post("/scrape-one")
async def scrape_one(request: Request):
    body = await request.json()
    name = body.get("university_name", "").strip()
    if not name:
        return {"error": "university_name required"}
    uni = await db.university_knowledge_base.find_one({"university_name": name}, {"_id": 0, "domain": 1, "website": 1})
    if not uni:
        return {"error": "University not found"}
    domain = uni.get("domain", "")
    if not domain:
        return {"error": "No domain for this university"}
    async with httpx.AsyncClient() as http_client:
        result = await scrape_coaching_page(http_client, domain, uni.get("website", ""))
    if not result or not result["coaches"]:
        return {"found": False, "message": f"Could not find coaching data for {name}"}
    update = _build_update(result)
    await db.university_knowledge_base.update_one({"university_name": name}, {"$set": update})
    return {"found": True, "url": result["url"], "coaches": result["coaches"]}


# ── Volleyball URL Discovery ──

VOLLEYBALL_PATHS = ["/sports/womens-volleyball", "/sports/volleyball", "/sports/wvball", "/sports/w-volley", "/sports/wvb"]
discover_status = {"running": False, "found": 0, "failed": 0, "total": 0, "done": True}


async def _discover_volleyball_url(http_client, domain, university_name=""):
    bases = [f"https://athletics.{domain}", f"https://{domain}"]
    for base in bases:
        for path in VOLLEYBALL_PATHS:
            url = f"{base}{path}"
            try:
                resp = await http_client.get(url, headers=HEADERS, follow_redirects=True, timeout=8)
                if resp.status_code == 200 and "volleyball" in resp.text.lower():
                    return str(resp.url).rstrip("/")
            except Exception as e:  # noqa: E722
                log.debug("Non-critical error (skipped): %s", e)
                continue
    ath_domains = await discover_athletics_domain(http_client, domain)
    for ath_base in ath_domains:
        for path in VOLLEYBALL_PATHS:
            url = f"{ath_base}{path}"
            try:
                resp = await http_client.get(url, headers=HEADERS, follow_redirects=True, timeout=8)
                if resp.status_code == 200 and "volleyball" in resp.text.lower():
                    return str(resp.url).rstrip("/")
            except Exception as e:  # noqa: E722
                log.debug("Non-critical error (skipped): %s", e)
                continue
    return None


async def _run_discover():
    global discover_status
    try:
        universities = await db.university_knowledge_base.find(
            {"$or": [{"website": ""}, {"website": {"$exists": False}}]},
            {"_id": 0, "university_name": 1, "domain": 1}
        ).to_list(2000)
        discover_status["total"] = len(universities)
        if not universities:
            discover_status.update({"running": False, "done": True})
            return
        async with httpx.AsyncClient() as http_client:
            for uni in universities:
                domain = uni.get("domain", "")
                name = uni.get("university_name", "")
                if not domain:
                    discover_status["failed"] += 1
                    continue
                try:
                    url = await _discover_volleyball_url(http_client, domain, name)
                    if url:
                        await db.university_knowledge_base.update_one({"university_name": name}, {"$set": {"website": url}})
                        discover_status["found"] += 1
                    else:
                        discover_status["failed"] += 1
                except Exception as e:
                    logger.warning(f"URL discovery failed for {name}: {e}")
                    discover_status["failed"] += 1
                await asyncio.sleep(1)
    except Exception as e:
        logger.error(f"URL discovery task error: {e}")
    finally:
        discover_status["running"] = False
        discover_status["done"] = True


@router.post("/discover-urls")
async def start_discover():
    global discover_status
    if discover_status["running"]:
        return {"status": "already_running", **discover_status}
    already_have = await db.university_knowledge_base.count_documents({"website": {"$ne": ""}})
    missing = await db.university_knowledge_base.count_documents(
        {"$or": [{"website": ""}, {"website": {"$exists": False}}]}
    )
    discover_status = {"running": True, "found": 0, "failed": 0, "total": missing, "done": False}
    asyncio.create_task(_run_discover())
    return {"status": "started", "already_have": already_have, "missing": missing}


@router.get("/discover-urls/status")
async def get_discover_status():
    return discover_status

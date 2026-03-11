"""Public Athlete Profile — slug-based public page + privacy settings.

Provides:
- GET /public/profile/{slug}  — unauthenticated, privacy-filtered
- GET /athlete/public-profile/settings — authenticated, returns settings + completeness
- PUT /athlete/public-profile/settings — authenticated, update visibility toggles
- POST /athlete/public-profile/generate-slug — authenticated, regenerate slug
"""

import re
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from auth_middleware import get_current_user_dep
from db_client import db

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Defaults ──────────────────────────────────────────────────────────

DEFAULT_SETTINGS = {
    "is_published": False,
    "show_contact_email": False,
    "show_contact_phone": False,
    "show_academics": True,
    "show_measurables": True,
    "show_club_coach": True,
    "show_events": True,
    "show_bio": True,
}

# Fields used for completeness check (key → label)
COMPLETENESS_FIELDS = {
    "full_name": "Full Name",
    "photo_url": "Profile Photo",
    "position": "Position",
    "grad_year": "Graduation Year",
    "height": "Height",
    "bio": "Bio / About",
    "video_link": "Highlight Video",
    "email": "Contact Email",
    "team": "Club Team",
    "city": "City",
    "state": "State",
    "gpa": "GPA",
}


# ── Slug generation ───────────────────────────────────────────────────

def _generate_slug(athlete: dict) -> str:
    """Create a URL-friendly slug from athlete data: emma-chen-2027-oh"""
    name = athlete.get("full_name") or ""
    grad = str(athlete.get("grad_year") or "")
    pos = athlete.get("position") or ""

    # Abbreviate position
    pos_abbr = {
        "outside hitter": "oh", "right side": "rs", "middle blocker": "mb",
        "setter": "s", "libero": "l", "defensive specialist": "ds",
        "opposite": "opp",
    }
    pos_short = pos_abbr.get(pos.lower(), pos[:3].lower()) if pos else ""

    parts = [p for p in [name, grad, pos_short] if p]
    raw = "-".join(parts)
    slug = re.sub(r"[^a-z0-9]+", "-", raw.lower()).strip("-")
    return slug or "athlete"


async def _ensure_unique_slug(slug: str, exclude_athlete_id: str = None) -> str:
    """Ensure slug is unique by appending a counter if needed."""
    base = slug
    counter = 0
    while True:
        query = {"public_profile_slug": slug}
        if exclude_athlete_id:
            query["id"] = {"$ne": exclude_athlete_id}
        existing = await db.athletes.find_one(query, {"_id": 0, "id": 1})
        if not existing:
            return slug
        counter += 1
        slug = f"{base}-{counter}"


# ── Completeness ──────────────────────────────────────────────────────

def _compute_completeness(athlete: dict) -> dict:
    """Return {score: 0-100, missing: [labels], filled: [labels]}"""
    filled = []
    missing = []
    for field, label in COMPLETENESS_FIELDS.items():
        val = athlete.get(field)
        if val and str(val).strip() and str(val).lower() != "none":
            filled.append(label)
        else:
            missing.append(label)
    total = len(COMPLETENESS_FIELDS)
    score = int((len(filled) / total) * 100) if total else 0
    return {"score": score, "filled": filled, "missing": missing}


# ── Coach Summary (deterministic) ────────────────────────────────────

def _build_coach_summary(athlete: dict) -> str:
    """Generate a one-liner coach-facing summary from profile data."""
    parts = []
    name = athlete.get("full_name") or "This athlete"
    pos = athlete.get("position") or ""
    grad = athlete.get("grad_year")
    height = athlete.get("height") or ""
    city = athlete.get("city") or ""
    state = athlete.get("state") or ""
    team = athlete.get("team") or ""
    gpa = athlete.get("gpa") or ""

    # Build: "Emma Chen is a 5'10 Outside Hitter, Class of 2027, from Miami, FL."
    intro = name
    if pos and height:
        intro += f" is a {height} {pos}"
    elif pos:
        intro += f" is a {pos}"

    if grad:
        intro += f", Class of {grad}"

    location = f"{city}, {state}" if city and state else city or state
    if location:
        intro += f", from {location}"

    intro += "."

    if team:
        parts.append(f"Currently competing with {team}.")
    if gpa:
        parts.append(f"Carries a {gpa} GPA.")

    return " ".join([intro] + parts)


# ── Profile → public response mapping ────────────────────────────────

_PROFILE_MAP = {
    "full_name": "athlete_name",
    "grad_year": "graduation_year",
    "position": "position",
    "team": "club_team",
    "height": "height",
    "email": "contact_email",
    "phone": "contact_phone",
    "high_school": "high_school",
    "gpa": "gpa",
    "hudl_url": "hudl_profile_url",
    "video_link": "video_link",
    "photo_url": "photo_url",
    "bio": "bio",
}

_EXTRA = {
    "weight", "jersey_number", "standing_reach", "approach_touch",
    "block_touch", "wingspan", "handed", "city", "state",
    "parent_name", "parent_email", "parent_phone",
}


def _athlete_to_public(athlete: dict, settings: dict) -> dict:
    """Map athlete doc to public-facing profile, respecting privacy settings."""
    out = {}

    # Always include basic identity
    for canon, pub in _PROFILE_MAP.items():
        val = athlete.get(canon, "")
        out[pub] = val if val and str(val).lower() != "none" else ""

    for f in _EXTRA:
        val = athlete.get(f, "")
        out[f] = val if val and str(val).lower() != "none" else ""

    # Apply privacy filters
    if not settings.get("show_contact_email", False):
        out["contact_email"] = ""
    if not settings.get("show_contact_phone", False):
        out["contact_phone"] = ""
    if not settings.get("show_academics", True):
        out["gpa"] = ""
        out.pop("sat_score", None)
        out.pop("act_score", None)
    if not settings.get("show_measurables", True):
        for f in ("standing_reach", "approach_touch", "block_touch", "wingspan"):
            out[f] = ""
    if not settings.get("show_club_coach", True):
        out["parent_name"] = ""
        out["parent_email"] = ""
        out["parent_phone"] = ""
    if not settings.get("show_bio", True):
        out["bio"] = ""

    return out


# ── Helper ────────────────────────────────────────────────────────────

async def _get_athlete_for_user(user: dict) -> dict:
    if user["role"] not in ("athlete", "parent"):
        raise HTTPException(403, "Only athletes/parents can access this")
    athlete = await db.athletes.find_one({"user_id": user["id"]}, {"_id": 0})
    if not athlete:
        raise HTTPException(404, "No athlete profile found")
    return athlete


# ══════════════════════════════════════════════════════════════════════
# PUBLIC ENDPOINT (no auth)
# ══════════════════════════════════════════════════════════════════════

@router.get("/public/profile/{slug}")
async def get_public_profile(slug: str):
    """Unauthenticated public profile page by slug."""
    athlete = await db.athletes.find_one(
        {"public_profile_slug": slug}, {"_id": 0}
    )
    if not athlete:
        raise HTTPException(404, "Profile not found")

    settings = athlete.get("public_profile_settings") or dict(DEFAULT_SETTINGS)

    if not settings.get("is_published", False):
        raise HTTPException(404, "Profile not found")

    profile = _athlete_to_public(athlete, settings)
    coach_summary = _build_coach_summary(athlete)

    # Events
    tenant_id = athlete.get("tenant_id", "")
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    upcoming = []
    past = []
    if settings.get("show_events", True) and tenant_id:
        upcoming = await db.athlete_events.find(
            {"tenant_id": tenant_id, "start_date": {"$gte": today}},
            {"_id": 0},
        ).sort("start_date", 1).to_list(50)

        past = await db.athlete_events.find(
            {"tenant_id": tenant_id, "start_date": {"$lt": today}},
            {"_id": 0},
        ).sort("start_date", -1).to_list(10)

    return {
        "profile": profile,
        "coach_summary": coach_summary,
        "upcoming_events": upcoming,
        "past_events": past,
        "visibility": {
            "show_contact_email": settings.get("show_contact_email", False),
            "show_contact_phone": settings.get("show_contact_phone", False),
            "show_academics": settings.get("show_academics", True),
            "show_measurables": settings.get("show_measurables", True),
            "show_club_coach": settings.get("show_club_coach", True),
            "show_events": settings.get("show_events", True),
            "show_bio": settings.get("show_bio", True),
        },
    }


# ══════════════════════════════════════════════════════════════════════
# AUTHENTICATED SETTINGS ENDPOINTS
# ══════════════════════════════════════════════════════════════════════

@router.get("/athlete/public-profile/settings")
async def get_public_profile_settings(current_user: dict = get_current_user_dep()):
    """Get public profile settings, completeness, slug, and share URL."""
    athlete = await _get_athlete_for_user(current_user)

    settings = athlete.get("public_profile_settings") or dict(DEFAULT_SETTINGS)
    slug = athlete.get("public_profile_slug", "")

    # Auto-generate slug if missing
    if not slug:
        slug = _generate_slug(athlete)
        slug = await _ensure_unique_slug(slug, exclude_athlete_id=athlete.get("id"))
        await db.athletes.update_one(
            {"id": athlete["id"]},
            {"$set": {"public_profile_slug": slug}},
        )

    completeness = _compute_completeness(athlete)

    return {
        "settings": settings,
        "slug": slug,
        "completeness": completeness,
        "share_url": f"/p/{slug}",
        "coach_summary_preview": _build_coach_summary(athlete),
    }


@router.put("/athlete/public-profile/settings")
async def update_public_profile_settings(
    body: dict,
    current_user: dict = get_current_user_dep(),
):
    """Update public profile visibility settings."""
    athlete = await _get_athlete_for_user(current_user)

    current = athlete.get("public_profile_settings") or dict(DEFAULT_SETTINGS)

    allowed_keys = set(DEFAULT_SETTINGS.keys())
    for key, value in body.items():
        if key in allowed_keys and isinstance(value, bool):
            current[key] = value

    await db.athletes.update_one(
        {"id": athlete["id"]},
        {"$set": {
            "public_profile_settings": current,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )

    return {"ok": True, "settings": current}


@router.post("/athlete/public-profile/generate-slug")
async def regenerate_slug(current_user: dict = get_current_user_dep()):
    """Regenerate the public profile slug from current profile data."""
    athlete = await _get_athlete_for_user(current_user)

    slug = _generate_slug(athlete)
    slug = await _ensure_unique_slug(slug, exclude_athlete_id=athlete.get("id"))

    await db.athletes.update_one(
        {"id": athlete["id"]},
        {"$set": {"public_profile_slug": slug}},
    )

    return {"ok": True, "slug": slug, "share_url": f"/p/{slug}"}

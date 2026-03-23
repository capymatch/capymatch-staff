"""Public & Internal Athlete Profile — slug-based public page, staff view, privacy settings.

Provides:
- GET /public/profile/{slug}  — unauthenticated, privacy-filtered
- GET /internal/athlete/{athlete_id}/profile — staff-only, full profile + recruiting context
- PUT /internal/athlete/{athlete_id}/profile/publish — staff toggle publish
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
from services.athlete_store import get_by_id as get_athlete_by_id

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Defaults ──────────────────────────────────────────────────────────

DEFAULT_SETTINGS = {
    "profile_visible": False,
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

STAFF_ROLES = {"director", "club_coach", "platform_admin"}


# ── Slug generation ───────────────────────────────────────────────────

def _generate_slug(athlete: dict) -> str:
    name = athlete.get("full_name") or ""
    grad = str(athlete.get("grad_year") or "")
    pos = athlete.get("position") or ""
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
    filled, missing = [], []
    for field, label in COMPLETENESS_FIELDS.items():
        val = athlete.get(field)
        if val and str(val).strip() and str(val).lower() != "none":
            filled.append(label)
        else:
            missing.append(label)
    total = len(COMPLETENESS_FIELDS)
    score = round((len(filled) / total) * 100) if total else 0
    return {"score": score, "filled": filled, "missing": missing}


# ── Coach Summary (deterministic) ────────────────────────────────────

def _build_coach_summary(athlete: dict) -> str:
    name = athlete.get("full_name") or "This athlete"
    pos = athlete.get("position") or ""
    grad = athlete.get("grad_year")
    height = athlete.get("height") or ""
    city = athlete.get("city") or ""
    state = athlete.get("state") or ""
    team = athlete.get("team") or ""
    gpa = athlete.get("gpa") or ""

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

    extras = []
    if team:
        extras.append(f"Currently competing with {team}.")
    if gpa:
        extras.append(f"Carries a {gpa} GPA.")

    return " ".join([intro] + extras)


# ── Recruiting Signals (deterministic, privacy-safe) ──────────────────

async def _build_recruiting_signals(athlete: dict, settings: dict) -> list:
    """Build tasteful, privacy-safe recruiting signals for the public profile."""
    signals = []
    tenant_id = athlete.get("tenant_id", "")

    # 1. Division interest — from pipeline programs
    if tenant_id:
        programs = await db.programs.find(
            {"tenant_id": tenant_id, "is_active": {"$ne": False}},
            {"_id": 0, "division": 1, "state": 1},
        ).to_list(200)

        if programs:
            # Division spread
            divs = set()
            for p in programs:
                d = (p.get("division") or "").strip()
                if d:
                    divs.add(d)
            if divs:
                div_list = sorted(divs)
                if len(div_list) == 1:
                    signals.append(f"Exploring {div_list[0]} opportunities")
                elif len(div_list) == 2:
                    signals.append(f"Actively exploring {div_list[0]} and {div_list[1]} opportunities")
                else:
                    signals.append(f"Actively exploring {', '.join(div_list[:-1])}, and {div_list[-1]} opportunities")

            # Region interest — show up to 3 states
            states = set()
            for p in programs:
                s = (p.get("state") or "").strip()
                if s and len(s) <= 3:
                    states.add(s.upper())
            if states:
                state_list = sorted(states)
                if len(state_list) <= 3:
                    signals.append(f"Interested in programs in {', '.join(state_list[:-1])} and {state_list[-1]}" if len(state_list) > 1 else f"Interested in programs in {state_list[0]}")
                else:
                    signals.append(f"Interested in programs across {len(state_list)} states")

    # 2. Highlight reel freshness
    video = athlete.get("video_link") or ""
    if video and str(video).lower() != "none":
        video_ts = athlete.get("video_updated_at") or ""
        if video_ts:
            try:
                vid_dt = datetime.fromisoformat(str(video_ts).replace("Z", "+00:00"))
                days_since = (datetime.now(timezone.utc) - vid_dt).days
                if days_since <= 30:
                    signals.append("New highlights added recently")
                elif days_since <= 180:
                    signals.append("Highlight reel updated this season")
                else:
                    signals.append("Highlight reel available")
            except (ValueError, TypeError):
                signals.append("Highlight reel available")
        else:
            signals.append("Highlight reel available")

    # 3. Academic info
    gpa = athlete.get("gpa")
    if settings.get("show_academics", True) and gpa and str(gpa).lower() != "none":
        signals.append("Academic information available")

    # 4. Club coach contact
    parent_name = athlete.get("parent_name") or ""
    if settings.get("show_club_coach", True) and parent_name and str(parent_name).lower() != "none":
        signals.append("Club coach contact available")

    # 5. Profile freshness
    updated = athlete.get("updated_at") or athlete.get("profile_updated_at") or ""
    if updated:
        try:
            updated_dt = datetime.fromisoformat(str(updated).replace("Z", "+00:00"))
            days_ago = (datetime.now(timezone.utc) - updated_dt).days
            if days_ago <= 90:
                signals.append("Profile updated this season")
        except (ValueError, TypeError):
            pass

    return signals


# ── Profile → response mapping ────────────────────────────────────

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


def _athlete_to_profile_dict(athlete: dict) -> dict:
    """Map athlete doc to profile field namespace (no filtering)."""
    out = {}
    for canon, pub in _PROFILE_MAP.items():
        val = athlete.get(canon, "")
        out[pub] = val if val and str(val).lower() != "none" else ""
    for f in _EXTRA:
        val = athlete.get(f, "")
        out[f] = val if val and str(val).lower() != "none" else ""
    return out


def _apply_privacy_filters(profile: dict, settings: dict) -> dict:
    """Apply privacy toggles to a profile dict."""
    out = dict(profile)
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


def _normalize_settings(raw: dict) -> dict:
    """Normalize settings, handling legacy is_published → profile_visible."""
    settings = dict(DEFAULT_SETTINGS)
    if raw:
        for k, v in raw.items():
            if k == "is_published":
                settings["profile_visible"] = bool(v)
            elif k in settings:
                settings[k] = v
    return settings


# ── Helpers ───────────────────────────────────────────────────────────

async def _get_athlete_for_user(user: dict) -> dict:
    if user["role"] not in ("athlete", "parent"):
        raise HTTPException(403, "Only athletes/parents can access this")
    athlete = await db.athletes.find_one({"user_id": user["id"]}, {"_id": 0})
    if not athlete:
        raise HTTPException(404, "No athlete profile found")
    return athlete


def _require_staff(user: dict):
    if user.get("role") not in STAFF_ROLES:
        raise HTTPException(403, "Staff access required")


async def _require_staff_access_to_athlete(user: dict, athlete: dict):
    """Directors see any athlete in org. Coaches see assigned athletes. Admin sees all."""
    if user["role"] == "platform_admin":
        return
    if user["role"] == "director":
        return
    if user["role"] == "club_coach":
        if athlete.get("primary_coach_id") == user.get("id"):
            return
    raise HTTPException(403, "You don't have access to this athlete")


async def _ensure_slug(athlete: dict) -> str:
    """Return existing slug or generate + persist a new one."""
    slug = athlete.get("public_profile_slug", "")
    if not slug:
        slug = _generate_slug(athlete)
        slug = await _ensure_unique_slug(slug, exclude_athlete_id=athlete.get("id"))
        await db.athletes.update_one(
            {"id": athlete["id"]},
            {"$set": {"public_profile_slug": slug}},
        )
    return slug


# ══════════════════════════════════════════════════════════════════════
# PUBLIC ENDPOINT (no auth)
# ══════════════════════════════════════════════════════════════════════

@router.get("/public/profile/{slug}")
async def get_public_profile(slug: str, staff_preview: bool = False):
    """Unauthenticated public profile page by slug."""
    athlete = await db.athletes.find_one(
        {"public_profile_slug": slug}, {"_id": 0}
    )
    if not athlete:
        raise HTTPException(404, "Profile not found")

    settings = _normalize_settings(athlete.get("public_profile_settings"))

    if not settings.get("profile_visible", False) and not staff_preview:
        raise HTTPException(404, "Profile not found")

    full_profile = _athlete_to_profile_dict(athlete)
    profile = _apply_privacy_filters(full_profile, settings)
    coach_summary = _build_coach_summary(athlete)
    recruiting_signals = await _build_recruiting_signals(athlete, settings)

    tenant_id = athlete.get("tenant_id", "")
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    upcoming, past = [], []
    if settings.get("show_events", True) and tenant_id:
        upcoming = await db.athlete_events.find(
            {"tenant_id": tenant_id, "start_date": {"$gte": today}}, {"_id": 0},
        ).sort("start_date", 1).to_list(50)
        past = await db.athlete_events.find(
            {"tenant_id": tenant_id, "start_date": {"$lt": today}}, {"_id": 0},
        ).sort("start_date", -1).to_list(10)

    return {
        "profile": profile,
        "coach_summary": coach_summary,
        "recruiting_signals": recruiting_signals,
        "upcoming_events": upcoming,
        "past_events": past,
        "visibility": {k: v for k, v in settings.items() if k != "profile_visible"},
    }


# ══════════════════════════════════════════════════════════════════════
# INTERNAL STAFF PROFILE (auth required, full view + recruiting context)
# ══════════════════════════════════════════════════════════════════════

@router.get("/internal/athlete/{athlete_id}/profile")
async def get_internal_athlete_profile(
    athlete_id: str,
    current_user: dict = get_current_user_dep(),
):
    """Staff-only full athlete profile + recruiting context."""
    _require_staff(current_user)

    # Look up athlete from DB
    athlete = await db.athletes.find_one({"id": athlete_id}, {"_id": 0})
    if not athlete:
        # Also try athlete_store (in-memory)
        mem = await get_athlete_by_id(athlete_id)
        if mem:
            athlete = mem
        else:
            raise HTTPException(404, "Athlete not found")

    await _require_staff_access_to_athlete(current_user, athlete)

    settings = _normalize_settings(athlete.get("public_profile_settings"))
    profile = _athlete_to_profile_dict(athlete)
    coach_summary = _build_coach_summary(athlete)
    completeness = _compute_completeness(athlete)
    slug = await _ensure_slug(athlete)

    tenant_id = athlete.get("tenant_id", "")
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Events (always show for staff, ignoring show_events toggle)
    upcoming, past = [], []
    if tenant_id:
        upcoming = await db.athlete_events.find(
            {"tenant_id": tenant_id, "start_date": {"$gte": today}}, {"_id": 0},
        ).sort("start_date", 1).to_list(50)
        past = await db.athlete_events.find(
            {"tenant_id": tenant_id, "start_date": {"$lt": today}}, {"_id": 0},
        ).sort("start_date", -1).to_list(10)

    # ── Recruiting context ──
    # Pipeline summary
    programs = []
    if tenant_id:
        programs = await db.programs.find(
            {"tenant_id": tenant_id, "is_active": {"$ne": False}}, {"_id": 0},
        ).to_list(200)

    pipeline_summary = {
        "total_schools": len(programs),
        "stages": {},
        "schools": [],
    }
    stage_counts = {}
    for p in programs:
        status = p.get("recruiting_status", "added")
        stage_counts[status] = stage_counts.get(status, 0) + 1
        pipeline_summary["schools"].append({
            "program_id": p.get("program_id", ""),
            "university_name": p.get("university_name", ""),
            "recruiting_status": status,
            "reply_status": p.get("reply_status", ""),
            "priority": p.get("priority", ""),
            "next_action_due": p.get("next_action_due", ""),
        })
    pipeline_summary["stages"] = stage_counts

    # Coach flags
    coach_flags = []
    if tenant_id:
        raw_flags = await db.coach_flags.find(
            {"athlete_id": athlete_id, "status": {"$in": ["active", "pending"]}},
            {"_id": 0},
        ).sort("created_at", -1).to_list(20)
        coach_flags = [
            {
                "flag_id": f.get("flag_id", ""),
                "reason": f.get("reason", ""),
                "note": f.get("note", ""),
                "due": f.get("due", ""),
                "coach_name": f.get("coach_name", ""),
                "created_at": f.get("created_at", ""),
                "university_name": f.get("university_name", ""),
            }
            for f in raw_flags
        ]

    # Director actions
    director_actions = []
    raw_actions = await db.director_actions.find(
        {"athlete_id": athlete_id, "status": {"$in": ["open", "acknowledged"]}},
        {"_id": 0},
    ).sort("created_at", -1).to_list(20)
    director_actions = [
        {
            "action_id": a.get("action_id", ""),
            "action_type": a.get("action_type", ""),
            "reason": a.get("reason", ""),
            "note": a.get("note", ""),
            "risk_level": a.get("risk_level", ""),
            "status": a.get("status", ""),
            "created_by_name": a.get("created_by_name", ""),
            "created_at": a.get("created_at", ""),
        }
        for a in raw_actions
    ]

    # Recent interactions
    recent_interactions = []
    if tenant_id:
        raw_ix = await db.interactions.find(
            {"tenant_id": tenant_id}, {"_id": 0},
        ).sort("created_at", -1).to_list(15)
        recent_interactions = [
            {
                "type": ix.get("type", ""),
                "university_name": ix.get("university_name", ""),
                "notes": (ix.get("notes", "") or "")[:150],
                "outcome": ix.get("outcome", ""),
                "date": ix.get("created_at", ix.get("date_time", "")),
                "is_meaningful": ix.get("is_meaningful", False),
            }
            for ix in raw_ix
        ]

    return {
        "profile": profile,
        "coach_summary": coach_summary,
        "completeness": completeness,
        "settings": settings,
        "slug": slug,
        "share_url": f"/p/{slug}",
        "athlete_id": athlete_id,
        "upcoming_events": upcoming,
        "past_events": past,
        "recruiting_context": {
            "pipeline": pipeline_summary,
            "coach_flags": coach_flags,
            "director_actions": director_actions,
            "recent_interactions": recent_interactions,
        },
    }


@router.put("/internal/athlete/{athlete_id}/profile/publish")
async def toggle_athlete_publish(
    athlete_id: str,
    body: dict,
    current_user: dict = get_current_user_dep(),
):
    """Staff can toggle an athlete's profile_visible flag."""
    _require_staff(current_user)

    athlete = await db.athletes.find_one({"id": athlete_id}, {"_id": 0})
    if not athlete:
        raise HTTPException(404, "Athlete not found")
    await _require_staff_access_to_athlete(current_user, athlete)

    profile_visible = body.get("profile_visible")
    if not isinstance(profile_visible, bool):
        raise HTTPException(400, "profile_visible must be a boolean")

    settings = _normalize_settings(athlete.get("public_profile_settings"))
    settings["profile_visible"] = profile_visible

    # Ensure slug exists when publishing
    slug = athlete.get("public_profile_slug", "")
    if profile_visible and not slug:
        slug = _generate_slug(athlete)
        slug = await _ensure_unique_slug(slug, exclude_athlete_id=athlete_id)

    update = {
        "public_profile_settings": settings,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if slug and not athlete.get("public_profile_slug"):
        update["public_profile_slug"] = slug

    await db.athletes.update_one({"id": athlete_id}, {"$set": update})

    return {
        "ok": True,
        "profile_visible": profile_visible,
        "slug": slug or athlete.get("public_profile_slug", ""),
        "share_url": f"/p/{slug or athlete.get('public_profile_slug', '')}",
    }


# ══════════════════════════════════════════════════════════════════════
# ATHLETE SETTINGS ENDPOINTS
# ══════════════════════════════════════════════════════════════════════

@router.get("/athlete/public-profile/settings")
async def get_public_profile_settings(current_user: dict = get_current_user_dep()):
    athlete = await _get_athlete_for_user(current_user)
    settings = _normalize_settings(athlete.get("public_profile_settings"))
    slug = await _ensure_slug(athlete)
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
    athlete = await _get_athlete_for_user(current_user)
    current = _normalize_settings(athlete.get("public_profile_settings"))

    allowed_keys = set(DEFAULT_SETTINGS.keys())
    for key, value in body.items():
        # Accept legacy is_published as profile_visible
        if key == "is_published" and isinstance(value, bool):
            current["profile_visible"] = value
        elif key in allowed_keys and isinstance(value, bool):
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
    athlete = await _get_athlete_for_user(current_user)
    slug = _generate_slug(athlete)
    slug = await _ensure_unique_slug(slug, exclude_athlete_id=athlete.get("id"))
    await db.athletes.update_one(
        {"id": athlete["id"]},
        {"$set": {"public_profile_slug": slug}},
    )
    return {"ok": True, "slug": slug, "share_url": f"/p/{slug}"}

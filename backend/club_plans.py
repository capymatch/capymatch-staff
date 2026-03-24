"""Club Plans — Plan definitions, entitlements, and feature gating for Director app.

Five tiers:
  Starter  ($199/mo, 25 athletes)  — Visibility
  Growth   ($329/mo, 50 athletes)  — Coordination
  Club Pro ($449/mo, 75 athletes)  — Operating System
  Elite    ($699/mo, 125 athletes) — Intelligence + Oversight
  Enterprise (custom)              — Control + Customization
"""

CLUB_PLANS = {
    "starter": {
        "id": "starter",
        "label": "Starter",
        "tagline": "See your program clearly",
        "price_monthly": 199,
        "price_annual": 1990,
        "max_athletes": 25,
        "max_coaches": 3,
        "stripe_price_monthly": None,
        "stripe_price_annual": None,
    },
    "growth": {
        "id": "growth",
        "label": "Growth",
        "tagline": "Stay on top of your pipeline",
        "price_monthly": 329,
        "price_annual": 3290,
        "max_athletes": 50,
        "max_coaches": 6,
        "stripe_price_monthly": None,
        "stripe_price_annual": None,
    },
    "club_pro": {
        "id": "club_pro",
        "label": "Club Pro",
        "tagline": "Run recruiting like a pro",
        "price_monthly": 449,
        "price_annual": 4490,
        "max_athletes": 75,
        "max_coaches": 10,
        "stripe_price_monthly": None,
        "stripe_price_annual": None,
    },
    "elite": {
        "id": "elite",
        "label": "Elite",
        "tagline": "Advanced intelligence and oversight",
        "price_monthly": 699,
        "price_annual": 6990,
        "max_athletes": 125,
        "max_coaches": 20,
        "stripe_price_monthly": None,
        "stripe_price_annual": None,
    },
    "enterprise": {
        "id": "enterprise",
        "label": "Enterprise",
        "tagline": "Your platform, your way",
        "price_monthly": None,
        "price_annual": None,
        "max_athletes": -1,
        "max_coaches": -1,
        "stripe_price_monthly": None,
        "stripe_price_annual": None,
    },
}

# ── Feature Entitlements ──────────────────────────────────────────────────
# Each key is a feature_id. Value maps plan → access level.
# Access levels:
#   True          = full access
#   False         = locked (show upgrade prompt)
#   int           = usage limit per month (0 = locked)
#   "view_only"   = can see but not act

PLAN_ORDER = ["starter", "growth", "club_pro", "elite", "enterprise"]

FEATURE_ENTITLEMENTS = {
    # ── Always available (never gated) ──
    "mission_control_kpis":     {"starter": True, "growth": True, "club_pro": True, "elite": True, "enterprise": True},
    "athlete_list":             {"starter": True, "growth": True, "club_pro": True, "elite": True, "enterprise": True},
    "support_pods":             {"starter": True, "growth": True, "club_pro": True, "elite": True, "enterprise": True},
    "school_pods_basic":        {"starter": True, "growth": True, "club_pro": True, "elite": True, "enterprise": True},
    "notifications":            {"starter": True, "growth": True, "club_pro": True, "elite": True, "enterprise": True},
    "messaging":                {"starter": True, "growth": True, "club_pro": True, "elite": True, "enterprise": True},
    "profile":                  {"starter": True, "growth": True, "club_pro": True, "elite": True, "enterprise": True},
    "roster_view":              {"starter": True, "growth": True, "club_pro": True, "elite": True, "enterprise": True},
    "roster_assign":            {"starter": True, "growth": True, "club_pro": True, "elite": True, "enterprise": True},
    "coach_invites":            {"starter": True, "growth": True, "club_pro": True, "elite": True, "enterprise": True},

    # ── Needs Attention (limited on Starter) ──
    "needs_attention_full":     {"starter": False, "growth": True, "club_pro": True, "elite": True, "enterprise": True},

    # ── Director Inbox ──
    "director_inbox":           {"starter": False, "growth": True, "club_pro": True, "elite": True, "enterprise": True},

    # ── Director Actions (Outbox) ──
    "review_requests":          {"starter": False, "growth": True, "club_pro": True, "elite": True, "enterprise": True},
    "pipeline_escalations":     {"starter": False, "growth": False, "club_pro": True, "elite": True, "enterprise": True},

    # ── Events ──
    "events_create":            {"starter": False, "growth": True, "club_pro": True, "elite": True, "enterprise": True},
    "events_prep":              {"starter": False, "growth": True, "club_pro": True, "elite": True, "enterprise": True},
    "events_live":              {"starter": False, "growth": False, "club_pro": True, "elite": True, "enterprise": True},
    "events_summary":           {"starter": False, "growth": True, "club_pro": True, "elite": True, "enterprise": True},

    # ── Advocacy ──
    "advocacy_recommendations": {"starter": False, "growth": 20, "club_pro": True, "elite": True, "enterprise": True},
    "advocacy_relationships":   {"starter": False, "growth": True, "club_pro": True, "elite": True, "enterprise": True},

    # ── Program Intelligence ──
    "program_intelligence":     {"starter": False, "growth": False, "club_pro": True, "elite": True, "enterprise": True},

    # ── AI Features ──
    "ai_email_draft":           {"starter": False, "growth": False, "club_pro": 50, "elite": True, "enterprise": True},
    "ai_next_step":             {"starter": False, "growth": False, "club_pro": 50, "elite": True, "enterprise": True},
    "ai_journey_summary":       {"starter": False, "growth": False, "club_pro": 50, "elite": True, "enterprise": True},
    "coach_watch_ai":           {"starter": False, "growth": False, "club_pro": True, "elite": True, "enterprise": True},
    "ai_program_brief":         {"starter": False, "growth": False, "club_pro": False, "elite": True, "enterprise": True},

    # ── Autopilot ──
    "autopilot":                {"starter": False, "growth": False, "club_pro": True, "elite": True, "enterprise": True},

    # ── Reporting & Insights ──
    "coach_health":             {"starter": False, "growth": False, "club_pro": True, "elite": True, "enterprise": True},
    "recruiting_signals":       {"starter": False, "growth": "view_only", "club_pro": True, "elite": True, "enterprise": True},
    "weekly_digest":            {"starter": False, "growth": False, "club_pro": False, "elite": True, "enterprise": True},
    "loop_insights":            {"starter": False, "growth": False, "club_pro": False, "elite": True, "enterprise": True},
    "trend_data":               {"starter": False, "growth": False, "club_pro": True, "elite": True, "enterprise": True},

    # ── Export & Integrations ──
    "csv_export":               {"starter": False, "growth": False, "club_pro": True, "elite": True, "enterprise": True},

    # ── Admin ──
    "admin_panel":              {"starter": False, "growth": False, "club_pro": False, "elite": False, "enterprise": True},
    "custom_integrations":      {"starter": False, "growth": False, "club_pro": False, "elite": False, "enterprise": True},
}


# ── Upgrade triggers: maps feature_id → minimum plan required ──
def get_minimum_plan(feature_id: str) -> str | None:
    """Return the cheapest plan that has access to this feature."""
    ent = FEATURE_ENTITLEMENTS.get(feature_id)
    if not ent:
        return None
    for plan in PLAN_ORDER:
        access = ent.get(plan)
        if access and access is not False:
            return plan
    return None


def check_club_feature(plan_id: str, feature_id: str) -> dict:
    """Check if a plan has access to a feature.

    Returns:
        {"allowed": bool, "access": True|False|int|"view_only",
         "min_plan": str, "min_plan_label": str}
    """
    ent = FEATURE_ENTITLEMENTS.get(feature_id)
    if not ent:
        return {"allowed": True, "access": True, "min_plan": None, "min_plan_label": None}

    access = ent.get(plan_id, False)
    allowed = access is not False and access != 0
    min_plan = get_minimum_plan(feature_id)
    min_plan_label = CLUB_PLANS[min_plan]["label"] if min_plan else None

    return {
        "allowed": allowed,
        "access": access,
        "min_plan": min_plan,
        "min_plan_label": min_plan_label,
    }


def get_plan_entitlements(plan_id: str) -> dict:
    """Return all feature entitlements for a given plan."""
    result = {}
    for feature_id, plans in FEATURE_ENTITLEMENTS.items():
        access = plans.get(plan_id, False)
        result[feature_id] = {
            "access": access,
            "allowed": access is not False and access != 0,
        }
    return result


def get_plan_limits(plan_id: str) -> dict:
    """Return numeric limits for a plan (athletes, coaches)."""
    plan = CLUB_PLANS.get(plan_id, CLUB_PLANS["starter"])
    return {
        "max_athletes": plan["max_athletes"],
        "max_coaches": plan["max_coaches"],
    }

"""Club Plans — Plan definitions, entitlements, and feature gating for Director app.

Entitlement types:
  access  → bool  (does the module exist?)
  depth   → str   ("basic" | "detailed" | "advanced")
  limit   → int   (-1 = unlimited)

Five tiers:
  Starter  ($199/mo, 25 athletes)  — Real Director OS, limited depth
  Growth   ($329/mo, 50 athletes)  — More depth, filters, export
  Club Pro ($449/mo, 75 athletes)  — Full operating system
  Elite    ($699/mo, 125 athletes) — Intelligence + automation
  Enterprise (custom)              — Control + customization
"""

from enum import Enum


# ── Plan enum ──────────────────────────────────────────────────────────────

class ClubPlan(str, Enum):
    STARTER = "starter"
    GROWTH = "growth"
    CLUB_PRO = "club_pro"
    ELITE = "elite"
    ENTERPRISE = "enterprise"


PLAN_ORDER = list(ClubPlan)


# ── Entitlement key enum ──────────────────────────────────────────────────

class E(str, Enum):
    """Every entitlement key in the system."""

    # ── Access keys (bool) ──
    MISSION_CONTROL = "mission_control_access"
    DIRECTOR_DASHBOARD = "director_dashboard_access"
    DIRECTOR_INBOX = "director_inbox_access"
    DIRECTOR_OUTBOX = "director_outbox_access"
    RECRUITING_SIGNALS = "recruiting_signals_access"
    COACH_HEALTH = "coach_health_access"
    ESCALATIONS = "escalations_access"
    WORKFLOW_VISIBILITY = "workflow_visibility_access"
    ATHLETE_TEAM_VISIBILITY = "athlete_team_visibility_access"
    ROSTER = "roster_access"
    COACH_INVITES = "coach_invites_access"
    SUPPORT_PODS = "support_pods_access"
    SCHOOL_PODS = "school_pods_access"
    NOTIFICATIONS = "notifications_access"
    MESSAGING = "messaging_access"
    PROFILE = "profile_access"
    EVENTS_CREATE = "events_create_access"
    EVENTS_LIVE = "events_live_access"
    ADVOCACY = "advocacy_access"
    PROGRAM_INTELLIGENCE = "program_intelligence_access"
    AUTOPILOT = "autopilot_access"
    BULK_ACTIONS = "bulk_actions_access"
    BULK_APPROVE = "bulk_approve_access"
    ADVANCED_FILTERS = "advanced_filters_access"
    SAVED_VIEWS = "saved_views_access"
    ADVANCED_SEARCH = "advanced_search_access"
    ADVANCED_REPORTING = "advanced_reporting_access"
    CROSS_TEAM_ANALYTICS = "cross_team_analytics_access"
    CSV_EXPORT = "csv_export_access"
    COACH_COMPARISON = "coach_comparison_access"
    AI_SUMMARY = "ai_summary_access"
    AI_RECOMMENDATIONS = "ai_recommendations_access"
    AI_BRIEF = "ai_brief_access"
    APPROVAL_FLOWS = "approval_flows_access"
    EVENT_MODE = "event_mode_access"
    NATIVE_INTEGRATIONS = "native_integrations_access"
    ADVANCED_PERMISSIONS = "advanced_permissions_access"
    AUDIT_LOG = "audit_log_access"
    CROSS_CLUB_ROLLUPS = "cross_club_rollups_access"
    CUSTOM_REPORTS = "custom_reports_access"
    AUTOMATION = "automation_access"
    WORKFLOW_RULES = "workflow_rules_access"
    CUSTOM_ESCALATION_RULES = "custom_escalation_rules_access"
    LIVE_EVENT_INTELLIGENCE = "live_event_intelligence_access"
    ADVOCACY_MODE = "advocacy_mode_access"
    API_WEBHOOKS = "api_webhooks_access"
    PREMIUM_SUPPORT = "premium_support_access"
    SSO = "sso_access"
    ENTERPRISE_ONBOARDING = "enterprise_onboarding_access"
    ADMIN_PANEL = "admin_panel_access"
    WEEKLY_DIGEST = "weekly_digest_access"
    LOOP_INSIGHTS = "loop_insights_access"

    # ── Depth keys (str: basic | detailed | advanced) ──
    SIGNAL_DETAIL = "signal_detail_level"
    COACH_HEALTH_DETAIL = "coach_health_detail_level"
    REPORTING_DETAIL = "reporting_detail_level"
    AI_DETAIL = "ai_detail_level"           # none | preview | full

    # ── Limit keys (int, -1 = unlimited) ──
    INBOX_LIMIT = "director_inbox_item_limit"
    OUTBOX_LIMIT = "director_outbox_item_limit"
    ESCALATION_HISTORY_DAYS = "escalation_history_limit_days"
    TREND_HISTORY_MONTHS = "trend_history_months"
    ATHLETE_LIMIT = "athlete_limit"
    COACH_LIMIT = "coach_limit"
    AI_ACTIONS_MONTHLY = "ai_actions_monthly_limit"
    ADVOCACY_MONTHLY = "advocacy_monthly_limit"


# ── Plan metadata (pricing, display) ──────────────────────────────────────

CLUB_PLANS = {
    ClubPlan.STARTER: {
        "id": "starter",
        "label": "Starter",
        "tagline": "Your real Director operating system",
        "price_monthly": 199,
        "price_annual": 1990,
    },
    ClubPlan.GROWTH: {
        "id": "growth",
        "label": "Growth",
        "tagline": "More depth, more control",
        "price_monthly": 329,
        "price_annual": 3290,
    },
    ClubPlan.CLUB_PRO: {
        "id": "club_pro",
        "label": "Club Pro",
        "tagline": "The full operating system",
        "price_monthly": 449,
        "price_annual": 4490,
    },
    ClubPlan.ELITE: {
        "id": "elite",
        "label": "Elite",
        "tagline": "Intelligence and automation",
        "price_monthly": 699,
        "price_annual": 6990,
    },
    ClubPlan.ENTERPRISE: {
        "id": "enterprise",
        "label": "Enterprise",
        "tagline": "Full control, your way",
        "price_monthly": None,
        "price_annual": None,
    },
}


# ── Default entitlements (Starter baseline — the Director OS floor) ───────

_ALL = True   # shorthand for "all plans"
_NO = False

DEFAULT_ENTITLEMENTS = {
    # ── Core Director OS — NEVER gated, always True ──
    E.MISSION_CONTROL:          True,
    E.DIRECTOR_DASHBOARD:       True,
    E.DIRECTOR_INBOX:           True,
    E.DIRECTOR_OUTBOX:          True,
    E.RECRUITING_SIGNALS:       True,
    E.COACH_HEALTH:             True,
    E.ESCALATIONS:              True,
    E.WORKFLOW_VISIBILITY:      True,
    E.ATHLETE_TEAM_VISIBILITY:  True,
    E.ROSTER:                   True,
    E.COACH_INVITES:            True,
    E.SUPPORT_PODS:             True,
    E.SCHOOL_PODS:              True,
    E.NOTIFICATIONS:            True,
    E.MESSAGING:                True,
    E.PROFILE:                  True,

    # ── Gated access (False on Starter) ──
    E.EVENTS_CREATE:            False,
    E.EVENTS_LIVE:              False,
    E.ADVOCACY:                 False,
    E.PROGRAM_INTELLIGENCE:     False,
    E.AUTOPILOT:                False,
    E.BULK_ACTIONS:             False,
    E.BULK_APPROVE:             False,
    E.ADVANCED_FILTERS:         False,
    E.SAVED_VIEWS:              False,
    E.ADVANCED_SEARCH:          False,
    E.ADVANCED_REPORTING:       False,
    E.CROSS_TEAM_ANALYTICS:     False,
    E.CSV_EXPORT:               False,
    E.COACH_COMPARISON:         False,
    E.AI_SUMMARY:               False,
    E.AI_RECOMMENDATIONS:       False,
    E.AI_BRIEF:                 False,
    E.APPROVAL_FLOWS:           False,
    E.EVENT_MODE:               False,
    E.NATIVE_INTEGRATIONS:      False,
    E.ADVANCED_PERMISSIONS:     False,
    E.AUDIT_LOG:                False,
    E.CROSS_CLUB_ROLLUPS:       False,
    E.CUSTOM_REPORTS:           False,
    E.AUTOMATION:               False,
    E.WORKFLOW_RULES:            False,
    E.CUSTOM_ESCALATION_RULES:  False,
    E.LIVE_EVENT_INTELLIGENCE:  False,
    E.ADVOCACY_MODE:            False,
    E.API_WEBHOOKS:             False,
    E.PREMIUM_SUPPORT:          False,
    E.SSO:                      False,
    E.ENTERPRISE_ONBOARDING:    False,
    E.ADMIN_PANEL:              False,
    E.WEEKLY_DIGEST:            False,
    E.LOOP_INSIGHTS:            False,

    # ── Depth keys — Starter baseline ──
    E.SIGNAL_DETAIL:            "basic",
    E.COACH_HEALTH_DETAIL:      "basic",
    E.REPORTING_DETAIL:         "basic",
    E.AI_DETAIL:                "preview",

    # ── Limit keys — Starter baseline ──
    E.INBOX_LIMIT:              15,
    E.OUTBOX_LIMIT:             15,
    E.ESCALATION_HISTORY_DAYS:  30,
    E.TREND_HISTORY_MONTHS:     1,
    E.ATHLETE_LIMIT:            25,
    E.COACH_LIMIT:              3,
    E.AI_ACTIONS_MONTHLY:       0,
    E.ADVOCACY_MONTHLY:         0,
}


# ── Per-plan overrides (only keys that differ from DEFAULT) ───────────────

PLAN_OVERRIDES = {
    ClubPlan.STARTER: {
        # Starter IS the default — no overrides needed
    },

    ClubPlan.GROWTH: {
        # Depth upgrades
        E.SIGNAL_DETAIL:            "detailed",
        E.REPORTING_DETAIL:         "detailed",
        # AI still preview
        E.AI_DETAIL:                "preview",
        # Limit upgrades
        E.INBOX_LIMIT:              100,
        E.OUTBOX_LIMIT:             100,
        E.ESCALATION_HISTORY_DAYS:  90,
        E.TREND_HISTORY_MONTHS:     3,
        E.ATHLETE_LIMIT:            50,
        E.COACH_LIMIT:              6,
        E.ADVOCACY_MONTHLY:         20,
        # Access upgrades
        E.EVENTS_CREATE:            True,
        E.ADVOCACY:                 True,
        E.ADVANCED_FILTERS:         True,
        E.SAVED_VIEWS:              True,
        E.ADVANCED_SEARCH:          True,
        E.ADVANCED_REPORTING:       True,
        E.CROSS_TEAM_ANALYTICS:     True,
        E.CSV_EXPORT:               True,
    },

    ClubPlan.CLUB_PRO: {
        # Depth upgrades
        E.SIGNAL_DETAIL:            "advanced",
        E.COACH_HEALTH_DETAIL:      "detailed",
        E.REPORTING_DETAIL:         "advanced",
        E.AI_DETAIL:                "preview",
        # Limits → unlimited
        E.INBOX_LIMIT:              -1,
        E.OUTBOX_LIMIT:             -1,
        E.ESCALATION_HISTORY_DAYS:  365,
        E.TREND_HISTORY_MONTHS:     12,
        E.ATHLETE_LIMIT:            75,
        E.COACH_LIMIT:              10,
        E.AI_ACTIONS_MONTHLY:       50,
        E.ADVOCACY_MONTHLY:         -1,
        # Access upgrades
        E.EVENTS_CREATE:            True,
        E.EVENTS_LIVE:              True,
        E.ADVOCACY:                 True,
        E.PROGRAM_INTELLIGENCE:     True,
        E.BULK_ACTIONS:             True,
        E.BULK_APPROVE:             True,
        E.ADVANCED_FILTERS:         True,
        E.SAVED_VIEWS:              True,
        E.ADVANCED_SEARCH:          True,
        E.ADVANCED_REPORTING:       True,
        E.CROSS_TEAM_ANALYTICS:     True,
        E.CSV_EXPORT:               True,
        E.COACH_COMPARISON:         True,
        E.AI_SUMMARY:               True,
        E.AI_RECOMMENDATIONS:       True,
        E.APPROVAL_FLOWS:           True,
        E.EVENT_MODE:               True,
        E.NATIVE_INTEGRATIONS:      True,
        E.ADVANCED_PERMISSIONS:     True,
        E.AUDIT_LOG:                True,
        E.AUTOPILOT:                True,
    },

    ClubPlan.ELITE: {
        # Depth → max
        E.SIGNAL_DETAIL:            "advanced",
        E.COACH_HEALTH_DETAIL:      "advanced",
        E.REPORTING_DETAIL:         "advanced",
        E.AI_DETAIL:                "full",
        # Limits → unlimited
        E.INBOX_LIMIT:              -1,
        E.OUTBOX_LIMIT:             -1,
        E.ESCALATION_HISTORY_DAYS:  -1,
        E.TREND_HISTORY_MONTHS:     -1,
        E.ATHLETE_LIMIT:            125,
        E.COACH_LIMIT:              20,
        E.AI_ACTIONS_MONTHLY:       -1,
        E.ADVOCACY_MONTHLY:         -1,
        # Access → everything in Club Pro plus:
        E.EVENTS_CREATE:            True,
        E.EVENTS_LIVE:              True,
        E.ADVOCACY:                 True,
        E.PROGRAM_INTELLIGENCE:     True,
        E.BULK_ACTIONS:             True,
        E.BULK_APPROVE:             True,
        E.ADVANCED_FILTERS:         True,
        E.SAVED_VIEWS:              True,
        E.ADVANCED_SEARCH:          True,
        E.ADVANCED_REPORTING:       True,
        E.CROSS_TEAM_ANALYTICS:     True,
        E.CSV_EXPORT:               True,
        E.COACH_COMPARISON:         True,
        E.AI_SUMMARY:               True,
        E.AI_RECOMMENDATIONS:       True,
        E.AI_BRIEF:                 True,
        E.APPROVAL_FLOWS:           True,
        E.EVENT_MODE:               True,
        E.NATIVE_INTEGRATIONS:      True,
        E.ADVANCED_PERMISSIONS:     True,
        E.AUDIT_LOG:                True,
        E.AUTOPILOT:                True,
        E.CROSS_CLUB_ROLLUPS:       True,
        E.CUSTOM_REPORTS:           True,
        E.AUTOMATION:               True,
        E.WORKFLOW_RULES:           True,
        E.CUSTOM_ESCALATION_RULES:  True,
        E.LIVE_EVENT_INTELLIGENCE:  True,
        E.ADVOCACY_MODE:            True,
        E.API_WEBHOOKS:             True,
        E.PREMIUM_SUPPORT:          True,
        E.WEEKLY_DIGEST:            True,
        E.LOOP_INSIGHTS:            True,
    },

    ClubPlan.ENTERPRISE: {
        # Depth → max
        E.SIGNAL_DETAIL:            "advanced",
        E.COACH_HEALTH_DETAIL:      "advanced",
        E.REPORTING_DETAIL:         "advanced",
        E.AI_DETAIL:                "full",
        # Limits → unlimited
        E.INBOX_LIMIT:              -1,
        E.OUTBOX_LIMIT:             -1,
        E.ESCALATION_HISTORY_DAYS:  -1,
        E.TREND_HISTORY_MONTHS:     -1,
        E.ATHLETE_LIMIT:            -1,
        E.COACH_LIMIT:              -1,
        E.AI_ACTIONS_MONTHLY:       -1,
        E.ADVOCACY_MONTHLY:         -1,
        # Access → everything
        **{key: True for key in E if key.value.endswith("_access")},
    },
}


# ── Helper functions ──────────────────────────────────────────────────────

def _resolve_plan(plan_id: str) -> ClubPlan:
    """Normalize a plan_id string to a ClubPlan enum."""
    try:
        return ClubPlan(plan_id)
    except ValueError:
        return ClubPlan.STARTER


def get_plan_entitlements(plan_id: str) -> dict:
    """Return the full resolved entitlement dict for a plan."""
    plan = _resolve_plan(plan_id)
    result = {**DEFAULT_ENTITLEMENTS}
    overrides = PLAN_OVERRIDES.get(plan, {})
    result.update(overrides)
    # Convert enum keys to string values for JSON serialization
    return {(k.value if isinstance(k, E) else k): v for k, v in result.items()}


def has_feature(plan_id: str, feature: str) -> bool:
    """Check boolean access for a feature. Returns True if value is truthy."""
    ent = get_plan_entitlements(plan_id)
    val = ent.get(feature)
    if val is None:
        return True  # Unknown features default to allowed
    if isinstance(val, bool):
        return val
    if isinstance(val, int):
        return val != 0
    if isinstance(val, str):
        return val not in ("none", "false", "")
    return bool(val)


def get_feature_value(plan_id: str, feature: str, default=None):
    """Get the raw entitlement value for a feature. Works for access, depth, and limits."""
    ent = get_plan_entitlements(plan_id)
    return ent.get(feature, default)


def get_plan_limits(plan_id: str) -> dict:
    """Return numeric limits for a plan."""
    ent = get_plan_entitlements(plan_id)
    return {
        "max_athletes": ent.get(E.ATHLETE_LIMIT.value, 25),
        "max_coaches": ent.get(E.COACH_LIMIT.value, 3),
    }


def get_plan_info(plan_id: str) -> dict:
    """Return plan metadata (pricing, label, tagline)."""
    plan = _resolve_plan(plan_id)
    return CLUB_PLANS.get(plan, CLUB_PLANS[ClubPlan.STARTER])


def get_minimum_plan_for(feature: str) -> str | None:
    """Return the cheapest plan that grants access to a feature."""
    for plan in PLAN_ORDER:
        ent = get_plan_entitlements(plan.value)
        val = ent.get(feature)
        if val is True or (isinstance(val, int) and val != 0) or (isinstance(val, str) and val not in ("none", "basic", "false", "")):
            return plan.value
    return None


def check_club_feature(plan_id: str, feature: str) -> dict:
    """Check feature access + minimum plan needed. Used by the API."""
    allowed = has_feature(plan_id, feature)
    value = get_feature_value(plan_id, feature)
    min_plan = get_minimum_plan_for(feature) if not allowed else None
    min_plan_label = get_plan_info(min_plan)["label"] if min_plan else None

    return {
        "allowed": allowed,
        "value": value,
        "min_plan": min_plan,
        "min_plan_label": min_plan_label,
    }

"""Test suite for Pipeline Health State in Program Metrics.

Tests the new pipeline_health_state field added to program_metrics response.
Values: strong_momentum, active, needs_follow_up, cooling_off, at_risk

Scoring approach (from _compute_pipeline_health):
- Meaningful engagement recency: +3 (<=7d), +1 (<=14d), -1 (<=30d), -3 (>30d), -2 (never)
- Engagement trend: +2 (accelerating), +1 (steady), -1 (decelerating), -2 (stalled/inactive)
- Meaningful interaction depth: +2 (>=5), +1 (>=2), -1 (0)
- Overdue followups: -2 if any
- Unanswered coach questions: -2 if any
- Stage velocity: +1 (<=14d), -1 (>=45d)

Thresholds: >=5 strong_momentum, >=2 active, >=0 needs_follow_up, >=-3 cooling_off, else at_risk

Test Programs:
- UF: 14 meaningful interactions, 0 days ago, accelerating → strong_momentum
- Stanford: 0 meaningful interactions, never → cooling_off
- UCLA: 1 meaningful, 12 days ago → active
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# ── Test credentials ──
ATHLETE_EMAIL = "emma.chen@athlete.capymatch.com"
ATHLETE_PASSWORD = "password123"

ADMIN_EMAIL = "douglas@capymatch.com"
ADMIN_PASSWORD = "1234"

# Program IDs for testing
PROGRAM_ID_UF = "15d08982-3c51-4761-9b83-67414484582e"
PROGRAM_ID_STANFORD = "a54a0014-0e83-4a16-b0c2-5e8f10401de2"
PROGRAM_ID_UCLA = "421ac5a8-af32-4c26-81b4-0de4cc749a54"

# Valid pipeline health states
VALID_HEALTH_STATES = ["strong_momentum", "active", "needs_follow_up", "cooling_off", "at_risk"]


# ── Fixtures ──

@pytest.fixture
def api_client():
    """Shared requests session."""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


def get_auth_token(client, email, password):
    """Helper to get auth token for a user."""
    resp = client.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password})
    if resp.status_code == 200:
        return resp.json().get("token")
    return None


@pytest.fixture
def athlete_token(api_client):
    """Get athlete auth token."""
    token = get_auth_token(api_client, ATHLETE_EMAIL, ATHLETE_PASSWORD)
    if not token:
        pytest.skip("Athlete authentication failed")
    return token


@pytest.fixture
def admin_token(api_client):
    """Get admin auth token."""
    token = get_auth_token(api_client, ADMIN_EMAIL, ADMIN_PASSWORD)
    if not token:
        pytest.skip("Admin authentication failed")
    return token


# ═══════════════════════════════════════════════════════════════════════════════
# Test: pipeline_health_state Field Present in Response
# ═══════════════════════════════════════════════════════════════════════════════

class TestPipelineHealthStateFieldPresent:
    """Test that pipeline_health_state field is present in API response."""

    def test_get_metrics_returns_pipeline_health_state(self, api_client, athlete_token):
        """GET /api/internal/programs/{program_id}/metrics returns pipeline_health_state field."""
        resp = api_client.get(
            f"{BASE_URL}/api/internal/programs/{PROGRAM_ID_UF}/metrics?force=true",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert "pipeline_health_state" in data, "Missing new field: pipeline_health_state"
        
        print(f"PASS: pipeline_health_state field present in response")
        print(f"  pipeline_health_state: {data['pipeline_health_state']}")

    def test_recompute_metrics_returns_pipeline_health_state(self, api_client, athlete_token):
        """POST /api/internal/programs/{program_id}/recompute-metrics returns pipeline_health_state."""
        resp = api_client.post(
            f"{BASE_URL}/api/internal/programs/{PROGRAM_ID_UF}/recompute-metrics",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert "pipeline_health_state" in data, "Missing pipeline_health_state in recompute response"
        
        print(f"PASS: POST recompute-metrics returns pipeline_health_state: {data['pipeline_health_state']}")


# ═══════════════════════════════════════════════════════════════════════════════
# Test: pipeline_health_state Enum Validation
# ═══════════════════════════════════════════════════════════════════════════════

class TestPipelineHealthStateEnumValidation:
    """Test pipeline_health_state is one of 5 valid enum values."""

    def test_health_state_is_valid_enum(self, api_client, athlete_token):
        """pipeline_health_state is one of: strong_momentum, active, needs_follow_up, cooling_off, at_risk."""
        resp = api_client.get(
            f"{BASE_URL}/api/internal/programs/{PROGRAM_ID_UF}/metrics?force=true",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        state = data.get("pipeline_health_state")
        assert state in VALID_HEALTH_STATES, \
            f"pipeline_health_state must be one of {VALID_HEALTH_STATES}, got: {state}"
        
        print(f"PASS: pipeline_health_state is valid enum value: {state}")

    def test_all_programs_have_valid_health_state(self, api_client, athlete_token):
        """All test programs should return valid pipeline_health_state values."""
        program_ids = [PROGRAM_ID_UF, PROGRAM_ID_STANFORD, PROGRAM_ID_UCLA]
        
        for pid in program_ids:
            resp = api_client.get(
                f"{BASE_URL}/api/internal/programs/{pid}/metrics?force=true",
                headers={"Authorization": f"Bearer {athlete_token}"}
            )
            assert resp.status_code == 200, f"Failed to get metrics for {pid}: {resp.status_code}"
            
            data = resp.json()
            state = data.get("pipeline_health_state")
            assert state in VALID_HEALTH_STATES, \
                f"Program {pid} has invalid health state: {state}"
            
            print(f"  Program {pid}: {state}")
        
        print("PASS: All programs have valid pipeline_health_state values")


# ═══════════════════════════════════════════════════════════════════════════════
# Test: UF Program - Expected strong_momentum
# ═══════════════════════════════════════════════════════════════════════════════

class TestUFProgramStrongMomentum:
    """UF program: 14 meaningful interactions, 0 days ago, accelerating → strong_momentum."""

    def test_uf_program_health_state_strong_momentum(self, api_client, athlete_token):
        """UF program should have pipeline_health_state = strong_momentum."""
        resp = api_client.get(
            f"{BASE_URL}/api/internal/programs/{PROGRAM_ID_UF}/metrics?force=true",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        state = data.get("pipeline_health_state")
        
        assert state == "strong_momentum", \
            f"UF program expected strong_momentum, got: {state}"
        
        # Validate supporting metrics
        meaningful_count = data.get("meaningful_interaction_count", 0)
        days_since = data.get("days_since_last_meaningful_engagement")
        trend = data.get("engagement_trend")
        
        print(f"PASS: UF program has pipeline_health_state = strong_momentum")
        print(f"  meaningful_interaction_count: {meaningful_count}")
        print(f"  days_since_last_meaningful_engagement: {days_since}")
        print(f"  engagement_trend: {trend}")

    def test_uf_metrics_support_strong_momentum(self, api_client, athlete_token):
        """Verify UF metrics values support the strong_momentum calculation."""
        resp = api_client.get(
            f"{BASE_URL}/api/internal/programs/{PROGRAM_ID_UF}/metrics?force=true",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        # UF should have: 14 meaningful interactions, 0 days ago (recent), accelerating trend
        meaningful_count = data.get("meaningful_interaction_count", 0)
        days_since = data.get("days_since_last_meaningful_engagement")
        trend = data.get("engagement_trend")
        
        # Count should be high (14 per request)
        assert meaningful_count >= 10, f"Expected meaningful_interaction_count >= 10, got {meaningful_count}"
        
        # Days should be recent (0-7 days)
        assert days_since is not None and days_since <= 7, \
            f"Expected days_since_last_meaningful_engagement <= 7, got {days_since}"
        
        # Trend should be accelerating
        assert trend == "accelerating", f"Expected engagement_trend = accelerating, got {trend}"
        
        print(f"PASS: UF metrics support strong_momentum calculation")


# ═══════════════════════════════════════════════════════════════════════════════
# Test: Stanford Program - Expected cooling_off
# ═══════════════════════════════════════════════════════════════════════════════

class TestStanfordProgramCoolingOff:
    """Stanford program: 0 meaningful interactions, never → cooling_off."""

    def test_stanford_program_health_state_cooling_off(self, api_client, athlete_token):
        """Stanford program should have pipeline_health_state = cooling_off."""
        resp = api_client.get(
            f"{BASE_URL}/api/internal/programs/{PROGRAM_ID_STANFORD}/metrics?force=true",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        state = data.get("pipeline_health_state")
        
        assert state == "cooling_off", \
            f"Stanford program expected cooling_off, got: {state}"
        
        # Validate supporting metrics
        meaningful_count = data.get("meaningful_interaction_count", 0)
        days_since = data.get("days_since_last_meaningful_engagement")
        
        print(f"PASS: Stanford program has pipeline_health_state = cooling_off")
        print(f"  meaningful_interaction_count: {meaningful_count}")
        print(f"  days_since_last_meaningful_engagement: {days_since}")

    def test_stanford_metrics_support_cooling_off(self, api_client, athlete_token):
        """Verify Stanford metrics values support the cooling_off calculation."""
        resp = api_client.get(
            f"{BASE_URL}/api/internal/programs/{PROGRAM_ID_STANFORD}/metrics?force=true",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        # Stanford should have: 0 meaningful interactions, never
        meaningful_count = data.get("meaningful_interaction_count", 0)
        days_since = data.get("days_since_last_meaningful_engagement")
        
        # Count should be 0
        assert meaningful_count == 0, f"Expected meaningful_interaction_count = 0, got {meaningful_count}"
        
        # Days should be None (never)
        assert days_since is None, f"Expected days_since_last_meaningful_engagement = None, got {days_since}"
        
        print(f"PASS: Stanford metrics support cooling_off calculation")


# ═══════════════════════════════════════════════════════════════════════════════
# Test: UCLA Program - Expected active
# ═══════════════════════════════════════════════════════════════════════════════

class TestUCLAProgramActive:
    """UCLA program: 1 meaningful, 12 days ago → active."""

    def test_ucla_program_health_state_active(self, api_client, athlete_token):
        """UCLA program should have pipeline_health_state = active."""
        resp = api_client.get(
            f"{BASE_URL}/api/internal/programs/{PROGRAM_ID_UCLA}/metrics?force=true",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        state = data.get("pipeline_health_state")
        
        assert state == "active", \
            f"UCLA program expected active, got: {state}"
        
        # Validate supporting metrics
        meaningful_count = data.get("meaningful_interaction_count", 0)
        days_since = data.get("days_since_last_meaningful_engagement")
        trend = data.get("engagement_trend")
        
        print(f"PASS: UCLA program has pipeline_health_state = active")
        print(f"  meaningful_interaction_count: {meaningful_count}")
        print(f"  days_since_last_meaningful_engagement: {days_since}")
        print(f"  engagement_trend: {trend}")


# ═══════════════════════════════════════════════════════════════════════════════
# Test: POST /recompute-all Returns pipeline_health_state
# ═══════════════════════════════════════════════════════════════════════════════

class TestRecomputeAllWithPipelineHealth:
    """Test POST /recompute-all completes with 0 errors (includes new field)."""

    def test_recompute_all_succeeds_with_zero_errors(self, api_client, admin_token):
        """POST recompute-all should complete with 0 errors."""
        resp = api_client.post(
            f"{BASE_URL}/api/internal/programs/recompute-all",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        
        # Validate response structure
        assert "computed" in data, "Missing 'computed' field"
        assert "errors" in data, "Missing 'errors' field"
        assert "total" in data, "Missing 'total' field"
        
        # Errors should be 0
        assert data["errors"] == 0, f"Expected 0 errors, got {data['errors']}"
        
        print(f"PASS: POST recompute-all succeeds with 0 errors")
        print(f"  computed: {data['computed']}, errors: {data['errors']}, total: {data['total']}")

    def test_recompute_all_metrics_include_health_state(self, api_client, admin_token, athlete_token):
        """After recompute-all, all programs should have pipeline_health_state."""
        # First run recompute-all
        resp = api_client.post(
            f"{BASE_URL}/api/internal/programs/recompute-all",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200
        
        # Now verify all test programs have pipeline_health_state
        for pid in [PROGRAM_ID_UF, PROGRAM_ID_STANFORD, PROGRAM_ID_UCLA]:
            resp = api_client.get(
                f"{BASE_URL}/api/internal/programs/{pid}/metrics",
                headers={"Authorization": f"Bearer {athlete_token}"}
            )
            assert resp.status_code == 200
            data = resp.json()
            
            assert "pipeline_health_state" in data, f"Program {pid} missing pipeline_health_state after recompute-all"
            assert data["pipeline_health_state"] in VALID_HEALTH_STATES
            
            print(f"  {pid}: pipeline_health_state = {data['pipeline_health_state']}")
        
        print("PASS: All programs have valid pipeline_health_state after recompute-all")


# ═══════════════════════════════════════════════════════════════════════════════
# Test: All Previous Fields Still Present and Unchanged
# ═══════════════════════════════════════════════════════════════════════════════

class TestExistingFieldsStillPresent:
    """Test that all existing fields from previous iterations are still present."""

    def test_all_previous_fields_present(self, api_client, athlete_token):
        """All 22+ fields from iterations 91 and 92 should still be present."""
        resp = api_client.get(
            f"{BASE_URL}/api/internal/programs/{PROGRAM_ID_UF}/metrics?force=true",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        # All fields from iterations 91 (base) + 92 (meaningful engagement) + 93 (pipeline health)
        all_expected_fields = [
            # From iteration 91 (base metrics)
            "program_id", "tenant_id", "athlete_id", "org_id", "university_name",
            "reply_rate", "median_response_time_hours", "meaningful_interaction_count",
            "days_since_last_engagement", "unanswered_coach_questions",
            "overdue_followups", "stage_velocity", "stage_stalled_days",
            "engagement_trend", "invite_count", "info_request_count",
            "coach_flag_count", "director_action_count", "data_confidence", "computed_at",
            # From iteration 92 (meaningful engagement)
            "last_meaningful_engagement_at", "last_meaningful_engagement_type",
            "days_since_last_meaningful_engagement", "engagement_freshness_label",
            # From iteration 93 (pipeline health state)
            "pipeline_health_state"
        ]
        
        missing_fields = []
        for field in all_expected_fields:
            if field not in data:
                missing_fields.append(field)
        
        assert len(missing_fields) == 0, f"Missing fields: {missing_fields}"
        
        print(f"PASS: All {len(all_expected_fields)} expected fields present in response")

    def test_field_types_unchanged(self, api_client, athlete_token):
        """Field types should remain consistent with previous iterations."""
        resp = api_client.get(
            f"{BASE_URL}/api/internal/programs/{PROGRAM_ID_UF}/metrics?force=true",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        # Validate types for key fields
        assert isinstance(data.get("meaningful_interaction_count"), int)
        assert isinstance(data.get("invite_count"), int)
        assert isinstance(data.get("unanswered_coach_questions"), int)
        assert isinstance(data.get("overdue_followups"), int)
        assert isinstance(data.get("pipeline_health_state"), str)
        assert isinstance(data.get("engagement_trend"), str)
        assert isinstance(data.get("data_confidence"), str)
        assert isinstance(data.get("engagement_freshness_label"), str)
        
        # Validate enums
        assert data["data_confidence"] in ["HIGH", "MEDIUM", "LOW"]
        assert data["engagement_trend"] in ["accelerating", "steady", "decelerating", "stalled", "inactive", "insufficient_data"]
        assert data["engagement_freshness_label"] in ["active_recently", "needs_follow_up", "momentum_slowing", "no_recent_engagement"]
        assert data["pipeline_health_state"] in VALID_HEALTH_STATES
        
        print("PASS: All field types and enums are valid")


# ═══════════════════════════════════════════════════════════════════════════════
# Test: Auth/RBAC Tests Still Pass
# ═══════════════════════════════════════════════════════════════════════════════

class TestAuthRBACStillWork:
    """Verify all auth/RBAC tests from previous iterations still pass."""

    def test_unauthenticated_get_metrics_401(self, api_client):
        """GET metrics without auth returns 401."""
        resp = api_client.get(f"{BASE_URL}/api/internal/programs/{PROGRAM_ID_UF}/metrics")
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        print("PASS: Unauthenticated GET metrics returns 401")

    def test_unauthenticated_recompute_all_401(self, api_client):
        """POST recompute-all without auth returns 401."""
        resp = api_client.post(f"{BASE_URL}/api/internal/programs/recompute-all")
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        print("PASS: Unauthenticated POST recompute-all returns 401")

    def test_admin_get_metrics_403(self, api_client, admin_token):
        """Admin user should get 403 on GET metrics (athlete-only endpoint)."""
        resp = api_client.get(
            f"{BASE_URL}/api/internal/programs/{PROGRAM_ID_UF}/metrics",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}"
        print("PASS: Admin GET metrics returns 403")

    def test_athlete_recompute_all_403(self, api_client, athlete_token):
        """Athlete should get 403 on POST recompute-all (admin-only endpoint)."""
        resp = api_client.post(
            f"{BASE_URL}/api/internal/programs/recompute-all",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}"
        print("PASS: Athlete POST recompute-all returns 403")


# ═══════════════════════════════════════════════════════════════════════════════
# Test: Engagement Freshness Label Still Correct
# ═══════════════════════════════════════════════════════════════════════════════

class TestEngagementFreshnessStillCorrect:
    """Verify engagement_freshness_label from iteration 92 still works."""

    def test_uf_freshness_active_recently(self, api_client, athlete_token):
        """UF program should have engagement_freshness_label = active_recently."""
        resp = api_client.get(
            f"{BASE_URL}/api/internal/programs/{PROGRAM_ID_UF}/metrics?force=true",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        assert data["engagement_freshness_label"] == "active_recently", \
            f"UF expected active_recently, got {data['engagement_freshness_label']}"
        print("PASS: UF engagement_freshness_label = active_recently")

    def test_stanford_freshness_no_recent(self, api_client, athlete_token):
        """Stanford program should have engagement_freshness_label = no_recent_engagement."""
        resp = api_client.get(
            f"{BASE_URL}/api/internal/programs/{PROGRAM_ID_STANFORD}/metrics?force=true",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        assert data["engagement_freshness_label"] == "no_recent_engagement", \
            f"Stanford expected no_recent_engagement, got {data['engagement_freshness_label']}"
        print("PASS: Stanford engagement_freshness_label = no_recent_engagement")

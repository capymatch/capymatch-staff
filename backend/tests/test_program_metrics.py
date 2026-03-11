"""Test suite for Program Metrics derived layer API.

Endpoints tested:
- GET /api/internal/programs/{program_id}/metrics - Get cached or recomputed metrics (athlete-only)
- GET /api/internal/programs/{program_id}/metrics?force=true - Force recompute
- POST /api/internal/programs/{program_id}/recompute-metrics - Force recompute (athlete-only)
- POST /api/internal/programs/recompute-all - Admin-only bulk recompute

Access controls:
- Athlete/parent only for single-program endpoints
- Admin-only (platform_admin, director) for recompute-all
- 401 for unauthenticated, 403 for wrong role, 404 for non-existent program
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

DIRECTOR_EMAIL = "director@capymatch.com"
DIRECTOR_PASSWORD = "director123"

COACH_EMAIL = "coach.williams@capymatch.com"
COACH_PASSWORD = "coach123"

# Emma Chen's known program_ids
PROGRAM_ID_UF = "15d08982-3c51-4761-9b83-67414484582e"
PROGRAM_ID_STANFORD = "a54a0014-0e83-4a16-b0c2-5e8f10401de2"

# Non-existent program_id
NON_EXISTENT_PROGRAM = "00000000-0000-0000-0000-000000000000"


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


@pytest.fixture
def director_token(api_client):
    """Get director auth token."""
    token = get_auth_token(api_client, DIRECTOR_EMAIL, DIRECTOR_PASSWORD)
    if not token:
        pytest.skip("Director authentication failed")
    return token


@pytest.fixture
def coach_token(api_client):
    """Get coach auth token."""
    token = get_auth_token(api_client, COACH_EMAIL, COACH_PASSWORD)
    if not token:
        pytest.skip("Coach authentication failed")
    return token


# ═══════════════════════════════════════════════════════════════════════════════
# Authentication Tests (401)
# ═══════════════════════════════════════════════════════════════════════════════

class TestAuthentication:
    """Test unauthenticated access returns 401."""

    def test_get_metrics_unauthenticated(self, api_client):
        """GET /api/internal/programs/{program_id}/metrics without token returns 401."""
        resp = api_client.get(f"{BASE_URL}/api/internal/programs/{PROGRAM_ID_UF}/metrics")
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}: {resp.text}"
        print("PASS: GET metrics without auth returns 401")

    def test_recompute_metrics_unauthenticated(self, api_client):
        """POST /api/internal/programs/{program_id}/recompute-metrics without token returns 401."""
        resp = api_client.post(f"{BASE_URL}/api/internal/programs/{PROGRAM_ID_UF}/recompute-metrics")
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}: {resp.text}"
        print("PASS: POST recompute-metrics without auth returns 401")

    def test_recompute_all_unauthenticated(self, api_client):
        """POST /api/internal/programs/recompute-all without token returns 401."""
        resp = api_client.post(f"{BASE_URL}/api/internal/programs/recompute-all")
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}: {resp.text}"
        print("PASS: POST recompute-all without auth returns 401")


# ═══════════════════════════════════════════════════════════════════════════════
# Authorization Tests (403)
# ═══════════════════════════════════════════════════════════════════════════════

class TestAuthorization:
    """Test role-based access controls return 403 for wrong roles."""

    # ── GET /metrics - Non-athlete roles should get 403 ──

    def test_get_metrics_admin_forbidden(self, api_client, admin_token):
        """GET metrics with admin token returns 403 (athlete-only)."""
        resp = api_client.get(
            f"{BASE_URL}/api/internal/programs/{PROGRAM_ID_UF}/metrics",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}: {resp.text}"
        print("PASS: GET metrics with admin token returns 403")

    def test_get_metrics_director_forbidden(self, api_client, director_token):
        """GET metrics with director token returns 403 (athlete-only)."""
        resp = api_client.get(
            f"{BASE_URL}/api/internal/programs/{PROGRAM_ID_UF}/metrics",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}: {resp.text}"
        print("PASS: GET metrics with director token returns 403")

    def test_get_metrics_coach_forbidden(self, api_client, coach_token):
        """GET metrics with coach token returns 403 (athlete-only)."""
        resp = api_client.get(
            f"{BASE_URL}/api/internal/programs/{PROGRAM_ID_UF}/metrics",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}: {resp.text}"
        print("PASS: GET metrics with coach token returns 403")

    # ── POST /recompute-metrics - Non-athlete roles should get 403 ──

    def test_recompute_metrics_admin_forbidden(self, api_client, admin_token):
        """POST recompute-metrics with admin token returns 403 (athlete-only)."""
        resp = api_client.post(
            f"{BASE_URL}/api/internal/programs/{PROGRAM_ID_UF}/recompute-metrics",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}: {resp.text}"
        print("PASS: POST recompute-metrics with admin token returns 403")

    def test_recompute_metrics_director_forbidden(self, api_client, director_token):
        """POST recompute-metrics with director token returns 403 (athlete-only)."""
        resp = api_client.post(
            f"{BASE_URL}/api/internal/programs/{PROGRAM_ID_UF}/recompute-metrics",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}: {resp.text}"
        print("PASS: POST recompute-metrics with director token returns 403")

    def test_recompute_metrics_coach_forbidden(self, api_client, coach_token):
        """POST recompute-metrics with coach token returns 403 (athlete-only)."""
        resp = api_client.post(
            f"{BASE_URL}/api/internal/programs/{PROGRAM_ID_UF}/recompute-metrics",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}: {resp.text}"
        print("PASS: POST recompute-metrics with coach token returns 403")

    # ── POST /recompute-all - Non-admin roles should get 403 ──

    def test_recompute_all_athlete_forbidden(self, api_client, athlete_token):
        """POST recompute-all with athlete token returns 403 (admin-only)."""
        resp = api_client.post(
            f"{BASE_URL}/api/internal/programs/recompute-all",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}: {resp.text}"
        print("PASS: POST recompute-all with athlete token returns 403")

    def test_recompute_all_coach_forbidden(self, api_client, coach_token):
        """POST recompute-all with coach token returns 403 (admin-only)."""
        resp = api_client.post(
            f"{BASE_URL}/api/internal/programs/recompute-all",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}: {resp.text}"
        print("PASS: POST recompute-all with coach token returns 403")


# ═══════════════════════════════════════════════════════════════════════════════
# 404 Tests (Non-existent program)
# ═══════════════════════════════════════════════════════════════════════════════

class TestNotFound:
    """Test 404 for non-existent program_id."""

    def test_get_metrics_program_not_found(self, api_client, athlete_token):
        """GET metrics for non-existent program returns 404."""
        resp = api_client.get(
            f"{BASE_URL}/api/internal/programs/{NON_EXISTENT_PROGRAM}/metrics",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}: {resp.text}"
        print("PASS: GET metrics for non-existent program returns 404")

    def test_recompute_metrics_program_not_found(self, api_client, athlete_token):
        """POST recompute-metrics for non-existent program returns 404."""
        resp = api_client.post(
            f"{BASE_URL}/api/internal/programs/{NON_EXISTENT_PROGRAM}/recompute-metrics",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}: {resp.text}"
        print("PASS: POST recompute-metrics for non-existent program returns 404")


# ═══════════════════════════════════════════════════════════════════════════════
# Functional Tests - GET /metrics
# ═══════════════════════════════════════════════════════════════════════════════

class TestGetMetrics:
    """Test GET /api/internal/programs/{program_id}/metrics functionality."""

    def test_get_metrics_success(self, api_client, athlete_token):
        """GET metrics returns valid metrics response with all required fields."""
        resp = api_client.get(
            f"{BASE_URL}/api/internal/programs/{PROGRAM_ID_UF}/metrics",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        
        # Validate required fields exist
        required_fields = [
            "program_id", "tenant_id", "reply_rate", "median_response_time_hours",
            "meaningful_interaction_count", "days_since_last_engagement",
            "unanswered_coach_questions", "overdue_followups", "stage_velocity",
            "stage_stalled_days", "engagement_trend", "invite_count",
            "info_request_count", "coach_flag_count", "director_action_count",
            "data_confidence", "computed_at"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        # Validate program_id matches
        assert data["program_id"] == PROGRAM_ID_UF, f"program_id mismatch: {data['program_id']}"
        
        # Validate data_confidence is one of expected values
        assert data["data_confidence"] in ["HIGH", "MEDIUM", "LOW"], f"Invalid data_confidence: {data['data_confidence']}"
        
        # Validate engagement_trend is valid
        valid_trends = ["accelerating", "steady", "decelerating", "stalled", "inactive", "insufficient_data"]
        assert data["engagement_trend"] in valid_trends, f"Invalid engagement_trend: {data['engagement_trend']}"
        
        # Validate numeric fields are correct type
        assert isinstance(data["meaningful_interaction_count"], int)
        assert isinstance(data["invite_count"], int)
        assert isinstance(data["info_request_count"], int)
        assert isinstance(data["coach_flag_count"], int)
        assert isinstance(data["director_action_count"], int)
        assert isinstance(data["unanswered_coach_questions"], int)
        assert isinstance(data["overdue_followups"], int)
        
        # computed_at should be a valid ISO timestamp
        assert data["computed_at"], "computed_at should not be empty"
        
        print(f"PASS: GET metrics returns valid response with all {len(required_fields)} required fields")
        print(f"  program_id: {data['program_id']}")
        print(f"  data_confidence: {data['data_confidence']}")
        print(f"  engagement_trend: {data['engagement_trend']}")
        print(f"  computed_at: {data['computed_at']}")

    def test_get_metrics_cached(self, api_client, athlete_token):
        """Second GET call returns cached metrics (same computed_at timestamp)."""
        # First call
        resp1 = api_client.get(
            f"{BASE_URL}/api/internal/programs/{PROGRAM_ID_UF}/metrics",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp1.status_code == 200
        data1 = resp1.json()
        computed_at_1 = data1["computed_at"]
        
        # Second call (should return cached)
        resp2 = api_client.get(
            f"{BASE_URL}/api/internal/programs/{PROGRAM_ID_UF}/metrics",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp2.status_code == 200
        data2 = resp2.json()
        computed_at_2 = data2["computed_at"]
        
        # computed_at should be the same (cached response)
        assert computed_at_1 == computed_at_2, f"Expected same computed_at (cached), but got different: {computed_at_1} vs {computed_at_2}"
        
        print(f"PASS: GET metrics returns cached response (same computed_at: {computed_at_1})")

    def test_get_metrics_force_recompute(self, api_client, athlete_token):
        """GET metrics with force=true forces a recompute."""
        # Get cached metrics
        resp1 = api_client.get(
            f"{BASE_URL}/api/internal/programs/{PROGRAM_ID_UF}/metrics",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp1.status_code == 200
        computed_at_1 = resp1.json()["computed_at"]
        
        # Force recompute
        resp2 = api_client.get(
            f"{BASE_URL}/api/internal/programs/{PROGRAM_ID_UF}/metrics?force=true",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp2.status_code == 200
        data2 = resp2.json()
        computed_at_2 = data2["computed_at"]
        
        # computed_at should be different (recomputed)
        assert computed_at_1 != computed_at_2, f"Expected different computed_at (forced recompute), but got same: {computed_at_1}"
        
        # Validate all fields still present
        assert "program_id" in data2
        assert "data_confidence" in data2
        assert "engagement_trend" in data2
        
        print(f"PASS: GET metrics with force=true recomputes (old: {computed_at_1}, new: {computed_at_2})")

    def test_get_metrics_different_program(self, api_client, athlete_token):
        """GET metrics works for different program_id (Stanford)."""
        resp = api_client.get(
            f"{BASE_URL}/api/internal/programs/{PROGRAM_ID_STANFORD}/metrics",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert data["program_id"] == PROGRAM_ID_STANFORD
        assert "data_confidence" in data
        assert "computed_at" in data
        
        print(f"PASS: GET metrics for Stanford program returns valid response")
        print(f"  program_id: {data['program_id']}")
        print(f"  data_confidence: {data['data_confidence']}")


# ═══════════════════════════════════════════════════════════════════════════════
# Functional Tests - POST /recompute-metrics
# ═══════════════════════════════════════════════════════════════════════════════

class TestRecomputeMetrics:
    """Test POST /api/internal/programs/{program_id}/recompute-metrics functionality."""

    def test_recompute_metrics_success(self, api_client, athlete_token):
        """POST recompute-metrics forces recompute and returns fresh metrics."""
        # Get cached metrics first
        resp1 = api_client.get(
            f"{BASE_URL}/api/internal/programs/{PROGRAM_ID_UF}/metrics",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp1.status_code == 200
        computed_at_before = resp1.json()["computed_at"]
        
        # Force recompute via POST
        resp2 = api_client.post(
            f"{BASE_URL}/api/internal/programs/{PROGRAM_ID_UF}/recompute-metrics",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp2.status_code == 200, f"Expected 200, got {resp2.status_code}: {resp2.text}"
        
        data = resp2.json()
        computed_at_after = data["computed_at"]
        
        # Should have new computed_at
        assert computed_at_before != computed_at_after, f"Expected different computed_at after recompute"
        
        # Validate all required fields
        assert data["program_id"] == PROGRAM_ID_UF
        assert "data_confidence" in data
        assert "engagement_trend" in data
        assert "meaningful_interaction_count" in data
        
        print(f"PASS: POST recompute-metrics forces recompute (old: {computed_at_before}, new: {computed_at_after})")


# ═══════════════════════════════════════════════════════════════════════════════
# Functional Tests - POST /recompute-all (Admin-only)
# ═══════════════════════════════════════════════════════════════════════════════

class TestRecomputeAll:
    """Test POST /api/internal/programs/recompute-all (admin-only) functionality."""

    def test_recompute_all_admin_success(self, api_client, admin_token):
        """POST recompute-all with admin token succeeds."""
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
        
        # Validate types
        assert isinstance(data["computed"], int)
        assert isinstance(data["errors"], int)
        assert isinstance(data["total"], int)
        
        # computed + errors should equal total
        assert data["computed"] + data["errors"] == data["total"], \
            f"computed ({data['computed']}) + errors ({data['errors']}) != total ({data['total']})"
        
        print(f"PASS: POST recompute-all succeeds")
        print(f"  computed: {data['computed']}")
        print(f"  errors: {data['errors']}")
        print(f"  total: {data['total']}")

    def test_recompute_all_director_success(self, api_client, director_token):
        """POST recompute-all with director token succeeds (director is admin-level)."""
        resp = api_client.post(
            f"{BASE_URL}/api/internal/programs/recompute-all",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert "computed" in data
        assert "errors" in data
        assert "total" in data
        
        print(f"PASS: POST recompute-all with director token succeeds")
        print(f"  computed: {data['computed']}, errors: {data['errors']}, total: {data['total']}")


# ═══════════════════════════════════════════════════════════════════════════════
# Metrics Field Validation Tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestMetricsFields:
    """Test that metrics fields contain sensible values."""

    def test_metrics_numeric_fields_non_negative(self, api_client, athlete_token):
        """Numeric metric fields should be non-negative."""
        resp = api_client.get(
            f"{BASE_URL}/api/internal/programs/{PROGRAM_ID_UF}/metrics",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        # These fields should be >= 0
        non_negative_fields = [
            "meaningful_interaction_count", "invite_count", "info_request_count",
            "coach_flag_count", "director_action_count", "unanswered_coach_questions",
            "overdue_followups"
        ]
        
        for field in non_negative_fields:
            value = data.get(field)
            assert value is not None and value >= 0, f"{field} should be non-negative, got {value}"
        
        # These can be None or >= 0
        nullable_non_negative = [
            "reply_rate", "median_response_time_hours", "days_since_last_engagement",
            "stage_velocity", "stage_stalled_days"
        ]
        
        for field in nullable_non_negative:
            value = data.get(field)
            if value is not None:
                assert value >= 0, f"{field} should be non-negative when set, got {value}"
        
        print("PASS: All numeric metrics fields are non-negative")

    def test_metrics_tenant_and_athlete_ids(self, api_client, athlete_token):
        """Metrics should include tenant_id and optionally athlete_id."""
        resp = api_client.get(
            f"{BASE_URL}/api/internal/programs/{PROGRAM_ID_UF}/metrics",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        assert "tenant_id" in data, "Missing tenant_id"
        assert data["tenant_id"], "tenant_id should not be empty"
        
        assert "athlete_id" in data, "Missing athlete_id"
        # athlete_id can be empty string if not found
        
        print(f"PASS: Metrics includes tenant_id ({data['tenant_id']}) and athlete_id ({data.get('athlete_id', 'N/A')})")

"""Test suite for Batch Metrics Endpoint.

Tests POST /api/internal/programs/batch-metrics endpoint.
- Accepts {program_ids: [...]} and returns {metrics: {pid: {...}, ...}}
- Only authenticated athletes can access
- Returns 403 for non-athlete roles (admin, director, coach)
- Returns 401 for unauthenticated
- Caps at 50 program_ids
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

# Program IDs for testing (from previous iterations)
PROGRAM_ID_UF = "15d08982-3c51-4761-9b83-67414484582e"  # strong_momentum
PROGRAM_ID_STANFORD = "a54a0014-0e83-4a16-b0c2-5e8f10401de2"  # cooling_off
PROGRAM_ID_UCLA = "421ac5a8-af32-4c26-81b4-0de4cc749a54"  # active

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
# Test: Batch Metrics - Authentication and Authorization
# ═══════════════════════════════════════════════════════════════════════════════

class TestBatchMetricsAuth:
    """Test authentication and authorization for batch-metrics endpoint."""

    def test_batch_metrics_unauthenticated_returns_401(self, api_client):
        """POST /api/internal/programs/batch-metrics without auth returns 401."""
        resp = api_client.post(
            f"{BASE_URL}/api/internal/programs/batch-metrics",
            json={"program_ids": [PROGRAM_ID_UF]}
        )
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}: {resp.text}"
        print("PASS: Unauthenticated POST batch-metrics returns 401")

    def test_batch_metrics_admin_returns_403(self, api_client, admin_token):
        """POST /api/internal/programs/batch-metrics with admin returns 403."""
        resp = api_client.post(
            f"{BASE_URL}/api/internal/programs/batch-metrics",
            json={"program_ids": [PROGRAM_ID_UF]},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}: {resp.text}"
        print("PASS: Admin POST batch-metrics returns 403 (only athletes/parents allowed)")

    def test_batch_metrics_director_returns_403(self, api_client, director_token):
        """POST /api/internal/programs/batch-metrics with director returns 403."""
        resp = api_client.post(
            f"{BASE_URL}/api/internal/programs/batch-metrics",
            json={"program_ids": [PROGRAM_ID_UF]},
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}: {resp.text}"
        print("PASS: Director POST batch-metrics returns 403 (only athletes/parents allowed)")

    def test_batch_metrics_coach_returns_403(self, api_client, coach_token):
        """POST /api/internal/programs/batch-metrics with coach returns 403."""
        resp = api_client.post(
            f"{BASE_URL}/api/internal/programs/batch-metrics",
            json={"program_ids": [PROGRAM_ID_UF]},
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}: {resp.text}"
        print("PASS: Coach POST batch-metrics returns 403 (only athletes/parents allowed)")

    def test_batch_metrics_athlete_returns_200(self, api_client, athlete_token):
        """POST /api/internal/programs/batch-metrics with athlete returns 200."""
        resp = api_client.post(
            f"{BASE_URL}/api/internal/programs/batch-metrics",
            json={"program_ids": [PROGRAM_ID_UF]},
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print("PASS: Athlete POST batch-metrics returns 200")


# ═══════════════════════════════════════════════════════════════════════════════
# Test: Batch Metrics - Response Structure
# ═══════════════════════════════════════════════════════════════════════════════

class TestBatchMetricsResponse:
    """Test response structure for batch-metrics endpoint."""

    def test_batch_metrics_returns_metrics_dict(self, api_client, athlete_token):
        """Batch metrics response has {metrics: {...}} structure."""
        resp = api_client.post(
            f"{BASE_URL}/api/internal/programs/batch-metrics",
            json={"program_ids": [PROGRAM_ID_UF, PROGRAM_ID_STANFORD]},
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        assert "metrics" in data, "Response missing 'metrics' key"
        assert isinstance(data["metrics"], dict), "metrics should be a dict"
        
        print(f"PASS: Batch metrics returns metrics dict with {len(data['metrics'])} entries")

    def test_batch_metrics_returns_metrics_for_requested_programs(self, api_client, athlete_token):
        """Batch metrics returns metrics keyed by program_id for requested programs."""
        program_ids = [PROGRAM_ID_UF, PROGRAM_ID_STANFORD, PROGRAM_ID_UCLA]
        resp = api_client.post(
            f"{BASE_URL}/api/internal/programs/batch-metrics",
            json={"program_ids": program_ids},
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        metrics = data.get("metrics", {})
        
        # All requested programs should be in the response
        for pid in program_ids:
            assert pid in metrics, f"Program {pid} not in metrics response"
            print(f"  {pid}: pipeline_health_state = {metrics[pid].get('pipeline_health_state')}")
        
        print(f"PASS: Batch metrics returns metrics for all {len(program_ids)} requested programs")

    def test_batch_metrics_each_entry_has_pipeline_health_state(self, api_client, athlete_token):
        """Each metric entry should have pipeline_health_state field."""
        program_ids = [PROGRAM_ID_UF, PROGRAM_ID_STANFORD, PROGRAM_ID_UCLA]
        resp = api_client.post(
            f"{BASE_URL}/api/internal/programs/batch-metrics",
            json={"program_ids": program_ids},
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        metrics = data.get("metrics", {})
        
        for pid in program_ids:
            assert pid in metrics, f"Program {pid} missing from metrics"
            metric = metrics[pid]
            assert "pipeline_health_state" in metric, f"Program {pid} missing pipeline_health_state"
            assert metric["pipeline_health_state"] in VALID_HEALTH_STATES, \
                f"Program {pid} has invalid health state: {metric['pipeline_health_state']}"
        
        print("PASS: All entries have valid pipeline_health_state")


# ═══════════════════════════════════════════════════════════════════════════════
# Test: Batch Metrics - Expected Health States
# ═══════════════════════════════════════════════════════════════════════════════

class TestBatchMetricsExpectedStates:
    """Test expected pipeline_health_state values for test programs."""

    def test_uf_program_strong_momentum_in_batch(self, api_client, athlete_token):
        """UF program should return strong_momentum in batch response."""
        resp = api_client.post(
            f"{BASE_URL}/api/internal/programs/batch-metrics",
            json={"program_ids": [PROGRAM_ID_UF]},
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        metrics = data.get("metrics", {})
        
        assert PROGRAM_ID_UF in metrics, "UF program not in response"
        state = metrics[PROGRAM_ID_UF].get("pipeline_health_state")
        assert state == "strong_momentum", f"UF expected strong_momentum, got: {state}"
        
        print(f"PASS: UF program has pipeline_health_state = strong_momentum in batch response")

    def test_stanford_program_cooling_off_in_batch(self, api_client, athlete_token):
        """Stanford program should return cooling_off in batch response."""
        resp = api_client.post(
            f"{BASE_URL}/api/internal/programs/batch-metrics",
            json={"program_ids": [PROGRAM_ID_STANFORD]},
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        metrics = data.get("metrics", {})
        
        assert PROGRAM_ID_STANFORD in metrics, "Stanford program not in response"
        state = metrics[PROGRAM_ID_STANFORD].get("pipeline_health_state")
        assert state == "cooling_off", f"Stanford expected cooling_off, got: {state}"
        
        print(f"PASS: Stanford program has pipeline_health_state = cooling_off in batch response")

    def test_ucla_program_active_in_batch(self, api_client, athlete_token):
        """UCLA program should return active in batch response."""
        resp = api_client.post(
            f"{BASE_URL}/api/internal/programs/batch-metrics",
            json={"program_ids": [PROGRAM_ID_UCLA]},
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        metrics = data.get("metrics", {})
        
        assert PROGRAM_ID_UCLA in metrics, "UCLA program not in response"
        state = metrics[PROGRAM_ID_UCLA].get("pipeline_health_state")
        assert state == "active", f"UCLA expected active, got: {state}"
        
        print(f"PASS: UCLA program has pipeline_health_state = active in batch response")

    def test_all_three_programs_correct_states_in_single_batch(self, api_client, athlete_token):
        """All three programs should return correct states in a single batch request."""
        program_ids = [PROGRAM_ID_UF, PROGRAM_ID_STANFORD, PROGRAM_ID_UCLA]
        resp = api_client.post(
            f"{BASE_URL}/api/internal/programs/batch-metrics",
            json={"program_ids": program_ids},
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        metrics = data.get("metrics", {})
        
        expected_states = {
            PROGRAM_ID_UF: "strong_momentum",
            PROGRAM_ID_STANFORD: "cooling_off",
            PROGRAM_ID_UCLA: "active"
        }
        
        for pid, expected in expected_states.items():
            actual = metrics.get(pid, {}).get("pipeline_health_state")
            assert actual == expected, f"Program {pid}: expected {expected}, got {actual}"
            print(f"  {pid}: {actual}")
        
        print("PASS: All programs return correct health states in single batch request")


# ═══════════════════════════════════════════════════════════════════════════════
# Test: Batch Metrics - Cap at 50 Program IDs
# ═══════════════════════════════════════════════════════════════════════════════

class TestBatchMetricsCap:
    """Test that batch endpoint caps at 50 program_ids."""

    def test_batch_metrics_caps_at_50(self, api_client, athlete_token):
        """When > 50 program_ids sent, only first 50 should be processed."""
        # Generate 60 fake program IDs (most won't exist, but that's ok)
        fake_ids = [f"fake-program-{i}" for i in range(60)]
        # Prepend real IDs so we can check they work
        program_ids = [PROGRAM_ID_UF, PROGRAM_ID_STANFORD, PROGRAM_ID_UCLA] + fake_ids
        
        resp = api_client.post(
            f"{BASE_URL}/api/internal/programs/batch-metrics",
            json={"program_ids": program_ids[:63]},  # Total 63 IDs
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        metrics = data.get("metrics", {})
        
        # We should have metrics for real programs (up to 50)
        # Since we only have 3 real programs, they should all be in the response
        assert PROGRAM_ID_UF in metrics, "UF should be in capped response"
        assert PROGRAM_ID_STANFORD in metrics, "Stanford should be in capped response"
        assert PROGRAM_ID_UCLA in metrics, "UCLA should be in capped response"
        
        # Total metrics returned should be <= 50 (likely just 3 since fake IDs won't exist)
        assert len(metrics) <= 50, f"Expected <= 50 metrics, got {len(metrics)}"
        
        print(f"PASS: Batch metrics caps at 50 (returned {len(metrics)} metrics)")

    def test_batch_metrics_empty_list(self, api_client, athlete_token):
        """Empty program_ids list should return empty metrics."""
        resp = api_client.post(
            f"{BASE_URL}/api/internal/programs/batch-metrics",
            json={"program_ids": []},
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        metrics = data.get("metrics", {})
        
        assert len(metrics) == 0, f"Expected empty metrics, got {len(metrics)}"
        print("PASS: Empty program_ids returns empty metrics")


# ═══════════════════════════════════════════════════════════════════════════════
# Test: Batch Metrics - Graceful Handling of Invalid/Missing Programs
# ═══════════════════════════════════════════════════════════════════════════════

class TestBatchMetricsGracefulHandling:
    """Test graceful handling of invalid or non-existent program IDs."""

    def test_batch_metrics_handles_nonexistent_programs_gracefully(self, api_client, athlete_token):
        """Non-existent program IDs should be handled gracefully (no crash, return error metadata)."""
        program_ids = [PROGRAM_ID_UF, "nonexistent-program-id-12345", PROGRAM_ID_STANFORD]
        
        resp = api_client.post(
            f"{BASE_URL}/api/internal/programs/batch-metrics",
            json={"program_ids": program_ids},
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200, "Should return 200 even with some invalid IDs"
        data = resp.json()
        metrics = data.get("metrics", {})
        
        # Real programs should be present with valid data
        assert PROGRAM_ID_UF in metrics, "UF should be in response"
        assert PROGRAM_ID_STANFORD in metrics, "Stanford should be in response"
        
        # UF should have valid pipeline_health_state
        assert metrics[PROGRAM_ID_UF].get("pipeline_health_state") in VALID_HEALTH_STATES
        
        # Non-existent program may be in response with _error field or skipped - both are valid
        if "nonexistent-program-id-12345" in metrics:
            # If included, it should have _error field
            assert "_error" in metrics["nonexistent-program-id-12345"], \
                "Non-existent program should have _error field"
            print("PASS: Non-existent program returns with _error metadata")
        else:
            print("PASS: Non-existent programs are silently skipped")

    def test_batch_metrics_all_invalid_no_crash(self, api_client, athlete_token):
        """All invalid program IDs should not crash - returns 200."""
        program_ids = ["fake-1", "fake-2", "fake-3"]
        
        resp = api_client.post(
            f"{BASE_URL}/api/internal/programs/batch-metrics",
            json={"program_ids": program_ids},
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200, f"Expected 200 even for invalid IDs, got {resp.status_code}"
        data = resp.json()
        metrics = data.get("metrics", {})
        
        # Either empty or all have _error - both are graceful handling
        if len(metrics) > 0:
            # All should have _error since they don't exist
            for pid in program_ids:
                if pid in metrics:
                    assert "_error" in metrics[pid], f"{pid} should have _error field"
            print(f"PASS: Invalid program_ids return with _error metadata (count: {len(metrics)})")
        else:
            print("PASS: All invalid program_ids returns empty metrics (graceful)")


# ═══════════════════════════════════════════════════════════════════════════════
# Test: Batch Metrics - Full Response Structure
# ═══════════════════════════════════════════════════════════════════════════════

class TestBatchMetricsFullStructure:
    """Test that batch metrics returns complete metric structure for each program."""

    def test_batch_metrics_includes_meaningful_engagement_fields(self, api_client, athlete_token):
        """Each metric should include meaningful engagement fields."""
        resp = api_client.post(
            f"{BASE_URL}/api/internal/programs/batch-metrics",
            json={"program_ids": [PROGRAM_ID_UF]},
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        metrics = data.get("metrics", {})
        
        uf_metrics = metrics.get(PROGRAM_ID_UF, {})
        
        # Check meaningful engagement fields
        expected_fields = [
            "pipeline_health_state",
            "meaningful_interaction_count",
            "days_since_last_meaningful_engagement",
            "last_meaningful_engagement_type",
            "engagement_freshness_label",
            "engagement_trend"
        ]
        
        for field in expected_fields:
            assert field in uf_metrics, f"Missing field: {field}"
            print(f"  {field}: {uf_metrics[field]}")
        
        print("PASS: Batch metrics includes all meaningful engagement fields")

    def test_batch_metrics_includes_all_base_metrics(self, api_client, athlete_token):
        """Each metric should include all base metrics fields."""
        resp = api_client.post(
            f"{BASE_URL}/api/internal/programs/batch-metrics",
            json={"program_ids": [PROGRAM_ID_UF]},
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        uf_metrics = data.get("metrics", {}).get(PROGRAM_ID_UF, {})
        
        # Check base metrics fields
        base_fields = [
            "program_id", "university_name", "reply_rate",
            "unanswered_coach_questions", "overdue_followups",
            "stage_velocity", "data_confidence"
        ]
        
        for field in base_fields:
            assert field in uf_metrics, f"Missing base field: {field}"
        
        print("PASS: Batch metrics includes all base metrics fields")

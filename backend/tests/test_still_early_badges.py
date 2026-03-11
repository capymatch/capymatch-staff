"""Test suite for Still Early Badge Feature & Explanation Lines.

Tests:
1. POST /api/internal/programs/batch-metrics returns program_age_days field
2. Programs with 0 meaningful interactions and age <= 14 days return 'still_early'
3. Stanford (0 meaningful, 2 days old) returns 'still_early' not 'cooling_off'
4. BYU (0 meaningful, 1 day old) returns 'still_early'
5. UF (14 meaningful, active) still returns 'strong_momentum' (unchanged)
6. UCLA (1 meaningful) still returns 'active' (unchanged)
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

# Program IDs (from test request)
PROGRAM_ID_UF = "15d08982-3c51-4761-9b83-67414484582e"      # strong_momentum - 14 meaningful
PROGRAM_ID_STANFORD = "a54a0014-0e83-4a16-b0c2-5e8f10401de2"  # still_early - 0 meaningful, 2 days old
PROGRAM_ID_UCLA = "421ac5a8-af32-4c26-81b4-0de4cc749a54"      # active - 1 meaningful
PROGRAM_ID_BYU = "06553aea-e820-40a9-97f2-b3fc0df66313"       # still_early - 0 meaningful, 1 day old

# Valid pipeline health states (including new 'still_early')
VALID_HEALTH_STATES = ["strong_momentum", "active", "needs_follow_up", "cooling_off", "at_risk", "still_early"]


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
# Test: Batch Metrics - program_age_days Field
# ═══════════════════════════════════════════════════════════════════════════════

class TestProgramAgeDaysField:
    """Test that program_age_days field is present in batch-metrics response."""

    def test_batch_metrics_includes_program_age_days(self, api_client, athlete_token):
        """Batch metrics should return program_age_days field for each program."""
        resp = api_client.post(
            f"{BASE_URL}/api/internal/programs/batch-metrics",
            json={"program_ids": [PROGRAM_ID_UF, PROGRAM_ID_STANFORD]},
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        metrics = data.get("metrics", {})
        
        for pid in [PROGRAM_ID_UF, PROGRAM_ID_STANFORD]:
            assert pid in metrics, f"Program {pid} not in response"
            assert "program_age_days" in metrics[pid], f"Program {pid} missing program_age_days field"
            age = metrics[pid]["program_age_days"]
            # Age can be None or an integer >= 0
            assert age is None or (isinstance(age, int) and age >= 0), \
                f"Program {pid} has invalid program_age_days: {age}"
            print(f"  {pid}: program_age_days = {age}")
        
        print("PASS: Batch metrics includes program_age_days for all programs")

    def test_stanford_program_has_age_under_14_days(self, api_client, athlete_token):
        """Stanford (new program ~2 days old) should have program_age_days <= 14."""
        resp = api_client.post(
            f"{BASE_URL}/api/internal/programs/batch-metrics",
            json={"program_ids": [PROGRAM_ID_STANFORD]},
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        stanford_metrics = data.get("metrics", {}).get(PROGRAM_ID_STANFORD, {})
        
        age = stanford_metrics.get("program_age_days")
        assert age is not None, "Stanford program should have program_age_days"
        assert age <= 14, f"Stanford expected age <= 14 days (new program), got: {age}"
        
        print(f"PASS: Stanford program_age_days = {age} (new program, <= 14 days)")

    def test_byu_program_has_age_under_14_days(self, api_client, athlete_token):
        """BYU (new program ~1 day old) should have program_age_days <= 14."""
        resp = api_client.post(
            f"{BASE_URL}/api/internal/programs/batch-metrics",
            json={"program_ids": [PROGRAM_ID_BYU]},
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        byu_metrics = data.get("metrics", {}).get(PROGRAM_ID_BYU, {})
        
        age = byu_metrics.get("program_age_days")
        assert age is not None, "BYU program should have program_age_days"
        assert age <= 14, f"BYU expected age <= 14 days (new program), got: {age}"
        
        print(f"PASS: BYU program_age_days = {age} (new program, <= 14 days)")


# ═══════════════════════════════════════════════════════════════════════════════
# Test: Still Early State - New Programs Override
# ═══════════════════════════════════════════════════════════════════════════════

class TestStillEarlyState:
    """Test that new programs (<= 14 days, 0 meaningful) show 'still_early' state."""

    def test_stanford_returns_still_early_not_cooling_off(self, api_client, athlete_token):
        """Stanford (0 meaningful, ~2 days old) should return 'still_early' not 'cooling_off'."""
        resp = api_client.post(
            f"{BASE_URL}/api/internal/programs/batch-metrics",
            json={"program_ids": [PROGRAM_ID_STANFORD]},
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        stanford_metrics = data.get("metrics", {}).get(PROGRAM_ID_STANFORD, {})
        
        state = stanford_metrics.get("pipeline_health_state")
        meaningful_count = stanford_metrics.get("meaningful_interaction_count", 0)
        age = stanford_metrics.get("program_age_days")
        
        print(f"  Stanford: state={state}, meaningful_count={meaningful_count}, age={age}")
        
        # Should be still_early (new program, no meaningful engagement)
        assert state == "still_early", \
            f"Stanford expected 'still_early', got: {state} (age={age}, meaningful={meaningful_count})"
        
        print("PASS: Stanford returns 'still_early' (not 'cooling_off')")

    def test_byu_returns_still_early(self, api_client, athlete_token):
        """BYU (0 meaningful, ~1 day old) should return 'still_early'."""
        resp = api_client.post(
            f"{BASE_URL}/api/internal/programs/batch-metrics",
            json={"program_ids": [PROGRAM_ID_BYU]},
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        byu_metrics = data.get("metrics", {}).get(PROGRAM_ID_BYU, {})
        
        state = byu_metrics.get("pipeline_health_state")
        meaningful_count = byu_metrics.get("meaningful_interaction_count", 0)
        age = byu_metrics.get("program_age_days")
        
        print(f"  BYU: state={state}, meaningful_count={meaningful_count}, age={age}")
        
        # Should be still_early (new program, no meaningful engagement)
        assert state == "still_early", \
            f"BYU expected 'still_early', got: {state} (age={age}, meaningful={meaningful_count})"
        
        print("PASS: BYU returns 'still_early'")


# ═══════════════════════════════════════════════════════════════════════════════
# Test: Existing States Unchanged
# ═══════════════════════════════════════════════════════════════════════════════

class TestExistingStatesUnchanged:
    """Test that programs with meaningful engagement keep their original states."""

    def test_uf_still_returns_strong_momentum(self, api_client, athlete_token):
        """UF (14 meaningful interactions, active) should still return 'strong_momentum'."""
        resp = api_client.post(
            f"{BASE_URL}/api/internal/programs/batch-metrics",
            json={"program_ids": [PROGRAM_ID_UF]},
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        uf_metrics = data.get("metrics", {}).get(PROGRAM_ID_UF, {})
        
        state = uf_metrics.get("pipeline_health_state")
        meaningful_count = uf_metrics.get("meaningful_interaction_count", 0)
        
        print(f"  UF: state={state}, meaningful_count={meaningful_count}")
        
        # UF has meaningful engagement, should remain strong_momentum
        assert state == "strong_momentum", \
            f"UF expected 'strong_momentum' (unchanged), got: {state}"
        
        print("PASS: UF still returns 'strong_momentum' (unchanged)")

    def test_ucla_still_returns_active(self, api_client, athlete_token):
        """UCLA (1 meaningful interaction) should still return 'active'."""
        resp = api_client.post(
            f"{BASE_URL}/api/internal/programs/batch-metrics",
            json={"program_ids": [PROGRAM_ID_UCLA]},
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        ucla_metrics = data.get("metrics", {}).get(PROGRAM_ID_UCLA, {})
        
        state = ucla_metrics.get("pipeline_health_state")
        meaningful_count = ucla_metrics.get("meaningful_interaction_count", 0)
        
        print(f"  UCLA: state={state}, meaningful_count={meaningful_count}")
        
        # UCLA has meaningful engagement, should remain active
        assert state == "active", \
            f"UCLA expected 'active' (unchanged), got: {state}"
        
        print("PASS: UCLA still returns 'active' (unchanged)")

    def test_all_four_programs_correct_states(self, api_client, athlete_token):
        """Verify all four programs return correct states in single batch request."""
        program_ids = [PROGRAM_ID_UF, PROGRAM_ID_STANFORD, PROGRAM_ID_UCLA, PROGRAM_ID_BYU]
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
            PROGRAM_ID_STANFORD: "still_early",
            PROGRAM_ID_UCLA: "active",
            PROGRAM_ID_BYU: "still_early"
        }
        
        for pid, expected in expected_states.items():
            actual = metrics.get(pid, {}).get("pipeline_health_state")
            meaningful = metrics.get(pid, {}).get("meaningful_interaction_count", "N/A")
            age = metrics.get(pid, {}).get("program_age_days", "N/A")
            print(f"  {pid}: expected={expected}, actual={actual}, meaningful={meaningful}, age={age}")
            assert actual == expected, f"Program {pid}: expected {expected}, got {actual}"
        
        print("PASS: All four programs return correct states")


# ═══════════════════════════════════════════════════════════════════════════════
# Test: Still Early Override Logic
# ═══════════════════════════════════════════════════════════════════════════════

class TestStillEarlyOverrideLogic:
    """Test the still_early override logic conditions."""

    def test_still_early_only_for_new_programs_without_meaningful(self, api_client, athlete_token):
        """Still early should only apply to new (<= 14d) programs with 0 meaningful."""
        program_ids = [PROGRAM_ID_UF, PROGRAM_ID_STANFORD, PROGRAM_ID_UCLA, PROGRAM_ID_BYU]
        resp = api_client.post(
            f"{BASE_URL}/api/internal/programs/batch-metrics",
            json={"program_ids": program_ids},
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        metrics = data.get("metrics", {})
        
        for pid in program_ids:
            m = metrics.get(pid, {})
            state = m.get("pipeline_health_state")
            meaningful_count = m.get("meaningful_interaction_count", 0)
            age = m.get("program_age_days")
            
            # still_early should only appear when: age <= 14 AND meaningful_count == 0
            if state == "still_early":
                assert meaningful_count == 0, \
                    f"Program {pid} has still_early but meaningful_count={meaningful_count}"
                assert age is not None and age <= 14, \
                    f"Program {pid} has still_early but age={age} (should be <= 14)"
                print(f"  {pid}: still_early correctly assigned (age={age}, meaningful=0)")
            elif meaningful_count == 0 and age is not None and age <= 14:
                # Should have been still_early
                assert state == "still_early", \
                    f"Program {pid} should be still_early (age={age}, meaningful=0) but got {state}"
        
        print("PASS: Still early override logic is correct")


# ═══════════════════════════════════════════════════════════════════════════════
# Test: Valid Pipeline Health States
# ═══════════════════════════════════════════════════════════════════════════════

class TestValidPipelineHealthStates:
    """Test that all returned states are valid including still_early."""

    def test_all_states_are_valid(self, api_client, athlete_token):
        """All pipeline_health_state values should be in the valid states list."""
        program_ids = [PROGRAM_ID_UF, PROGRAM_ID_STANFORD, PROGRAM_ID_UCLA, PROGRAM_ID_BYU]
        resp = api_client.post(
            f"{BASE_URL}/api/internal/programs/batch-metrics",
            json={"program_ids": program_ids},
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        metrics = data.get("metrics", {})
        
        for pid in program_ids:
            state = metrics.get(pid, {}).get("pipeline_health_state")
            assert state in VALID_HEALTH_STATES, \
                f"Program {pid} has invalid state: {state}. Valid: {VALID_HEALTH_STATES}"
            print(f"  {pid}: {state} (valid)")
        
        print("PASS: All states are valid")

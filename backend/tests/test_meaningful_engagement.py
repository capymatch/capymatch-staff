"""Test suite for Meaningful Engagement Tracking in Program Metrics.

Tests the 4 new fields added to program_metrics response:
- last_meaningful_engagement_at: Timestamp of last meaningful engagement
- last_meaningful_engagement_type: Type of that engagement  
- days_since_last_meaningful_engagement: Days since (separate from days_since_last_engagement)
- engagement_freshness_label: One of active_recently, needs_follow_up, momentum_slowing, no_recent_engagement

Freshness Label Thresholds:
- 0-7d: active_recently
- 8-14d: needs_follow_up
- 15-30d: momentum_slowing
- 31+d: no_recent_engagement

Meaningful Engagement Rules:
1. Type is coach_reply, phone_call, video_call, campus_visit, camp
2. Signal fields: coach_question_detected, request_type, invite_type, offer_signal, scholarship_signal
3. is_meaningful flag is True
4. Athlete outbound email that's a reply within 48h of meaningful coach interaction
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

# Emma Chen's known program_ids
# UF = has meaningful interactions, Stanford = no meaningful interactions (per the request)
PROGRAM_ID_UF = "15d08982-3c51-4761-9b83-67414484582e"
PROGRAM_ID_STANFORD = "a54a0014-0e83-4a16-b0c2-5e8f10401de2"

# Valid freshness labels
VALID_FRESHNESS_LABELS = ["active_recently", "needs_follow_up", "momentum_slowing", "no_recent_engagement"]


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
# Test: Meaningful Engagement Fields Present in Response
# ═══════════════════════════════════════════════════════════════════════════════

class TestMeaningfulEngagementFieldsPresent:
    """Test that all 4 new meaningful engagement fields are present in API response."""

    def test_get_metrics_returns_meaningful_engagement_fields(self, api_client, athlete_token):
        """GET /api/internal/programs/{program_id}/metrics returns 4 new meaningful engagement fields."""
        resp = api_client.get(
            f"{BASE_URL}/api/internal/programs/{PROGRAM_ID_UF}/metrics?force=true",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        
        # Verify all 4 new fields exist
        new_fields = [
            "last_meaningful_engagement_at",
            "last_meaningful_engagement_type",
            "days_since_last_meaningful_engagement",
            "engagement_freshness_label"
        ]
        
        for field in new_fields:
            assert field in data, f"Missing new field: {field}"
        
        print(f"PASS: All 4 new meaningful engagement fields present in response")
        print(f"  last_meaningful_engagement_at: {data['last_meaningful_engagement_at']}")
        print(f"  last_meaningful_engagement_type: {data['last_meaningful_engagement_type']}")
        print(f"  days_since_last_meaningful_engagement: {data['days_since_last_meaningful_engagement']}")
        print(f"  engagement_freshness_label: {data['engagement_freshness_label']}")

    def test_recompute_metrics_returns_meaningful_engagement_fields(self, api_client, athlete_token):
        """POST /api/internal/programs/{program_id}/recompute-metrics returns 4 new fields."""
        resp = api_client.post(
            f"{BASE_URL}/api/internal/programs/{PROGRAM_ID_UF}/recompute-metrics",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        
        # Verify all 4 new fields exist
        assert "last_meaningful_engagement_at" in data
        assert "last_meaningful_engagement_type" in data
        assert "days_since_last_meaningful_engagement" in data
        assert "engagement_freshness_label" in data
        
        print("PASS: POST recompute-metrics returns all 4 new meaningful engagement fields")


# ═══════════════════════════════════════════════════════════════════════════════
# Test: engagement_freshness_label Validation
# ═══════════════════════════════════════════════════════════════════════════════

class TestEngagementFreshnessLabel:
    """Test engagement_freshness_label field values and validation."""

    def test_freshness_label_is_valid_enum(self, api_client, athlete_token):
        """engagement_freshness_label is one of the 4 valid values."""
        resp = api_client.get(
            f"{BASE_URL}/api/internal/programs/{PROGRAM_ID_UF}/metrics?force=true",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        label = data.get("engagement_freshness_label")
        assert label in VALID_FRESHNESS_LABELS, \
            f"engagement_freshness_label must be one of {VALID_FRESHNESS_LABELS}, got: {label}"
        
        print(f"PASS: engagement_freshness_label is valid enum value: {label}")

    def test_freshness_label_for_program_with_meaningful_interactions_uf(self, api_client, athlete_token):
        """UF program (has meaningful interactions) should have active_recently label."""
        resp = api_client.get(
            f"{BASE_URL}/api/internal/programs/{PROGRAM_ID_UF}/metrics?force=true",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        label = data.get("engagement_freshness_label")
        last_at = data.get("last_meaningful_engagement_at")
        
        # UF program has meaningful interactions, so last_meaningful_engagement_at should not be null
        # and based on the interaction recency, label should be active_recently (per the request)
        assert last_at is not None, f"UF program should have last_meaningful_engagement_at, got None"
        assert label == "active_recently", \
            f"UF program expected active_recently, got: {label}"
        
        print(f"PASS: UF program has meaningful engagement (last_at: {last_at}, label: {label})")

    def test_freshness_label_for_program_without_meaningful_interactions_stanford(self, api_client, athlete_token):
        """Stanford program (no meaningful interactions) should have no_recent_engagement label."""
        resp = api_client.get(
            f"{BASE_URL}/api/internal/programs/{PROGRAM_ID_STANFORD}/metrics?force=true",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        label = data.get("engagement_freshness_label")
        last_at = data.get("last_meaningful_engagement_at")
        
        # Stanford program has NO meaningful interactions
        # So last_meaningful_engagement_at should be null and label should be no_recent_engagement
        assert last_at is None, f"Stanford program should have last_meaningful_engagement_at=null, got: {last_at}"
        assert label == "no_recent_engagement", \
            f"Stanford program expected no_recent_engagement, got: {label}"
        
        print(f"PASS: Stanford program has NO meaningful engagement (last_at: {last_at}, label: {label})")


# ═══════════════════════════════════════════════════════════════════════════════
# Test: days_since_last_meaningful_engagement vs days_since_last_engagement
# ═══════════════════════════════════════════════════════════════════════════════

class TestDaysSinceMeaningfulVsAll:
    """Test that days_since_last_meaningful_engagement is separate from days_since_last_engagement."""

    def test_meaningful_vs_all_are_separate_fields(self, api_client, athlete_token):
        """days_since_last_meaningful_engagement != days_since_last_engagement (potentially different)."""
        resp = api_client.get(
            f"{BASE_URL}/api/internal/programs/{PROGRAM_ID_UF}/metrics?force=true",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        days_meaningful = data.get("days_since_last_meaningful_engagement")
        days_all = data.get("days_since_last_engagement")
        
        # Both fields should exist
        assert "days_since_last_meaningful_engagement" in data
        assert "days_since_last_engagement" in data
        
        # They are separate computations
        # days_meaningful could be None if no meaningful engagement, or >= days_all since meaningful is stricter
        print(f"PASS: Both fields present - days_since_last_meaningful_engagement: {days_meaningful}, days_since_last_engagement: {days_all}")
        
        # If both are not None, meaningful should be >= all (or equal)
        # because meaningful is a subset of all interactions
        if days_meaningful is not None and days_all is not None:
            assert days_meaningful >= days_all or days_meaningful == days_all, \
                f"days_since_last_meaningful_engagement ({days_meaningful}) should be >= days_since_last_engagement ({days_all})"
            print(f"  Verified: days_meaningful ({days_meaningful}) >= days_all ({days_all})")

    def test_stanford_has_no_meaningful_but_may_have_all(self, api_client, athlete_token):
        """Stanford: no meaningful engagement but may have overall engagement."""
        resp = api_client.get(
            f"{BASE_URL}/api/internal/programs/{PROGRAM_ID_STANFORD}/metrics?force=true",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        days_meaningful = data.get("days_since_last_meaningful_engagement")
        days_all = data.get("days_since_last_engagement")
        
        # Stanford has no meaningful interactions, so days_meaningful should be None
        assert days_meaningful is None, f"Stanford should have days_since_last_meaningful_engagement=None, got: {days_meaningful}"
        
        print(f"PASS: Stanford - days_since_last_meaningful_engagement: {days_meaningful}, days_since_last_engagement: {days_all}")


# ═══════════════════════════════════════════════════════════════════════════════
# Test: meaningful_interaction_count Uses Refined Ruleset
# ═══════════════════════════════════════════════════════════════════════════════

class TestMeaningfulInteractionCount:
    """Test meaningful_interaction_count uses refined ruleset."""

    def test_meaningful_interaction_count_is_integer(self, api_client, athlete_token):
        """meaningful_interaction_count should be an integer >= 0."""
        resp = api_client.get(
            f"{BASE_URL}/api/internal/programs/{PROGRAM_ID_UF}/metrics?force=true",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        count = data.get("meaningful_interaction_count")
        assert isinstance(count, int), f"meaningful_interaction_count should be int, got {type(count)}"
        assert count >= 0, f"meaningful_interaction_count should be >= 0, got {count}"
        
        print(f"PASS: meaningful_interaction_count is valid integer: {count}")

    def test_uf_has_positive_meaningful_interaction_count(self, api_client, athlete_token):
        """UF program (has meaningful interactions) should have count > 0."""
        resp = api_client.get(
            f"{BASE_URL}/api/internal/programs/{PROGRAM_ID_UF}/metrics?force=true",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        count = data.get("meaningful_interaction_count")
        assert count > 0, f"UF program should have meaningful_interaction_count > 0, got {count}"
        
        print(f"PASS: UF program has meaningful_interaction_count: {count}")

    def test_stanford_has_zero_meaningful_interaction_count(self, api_client, athlete_token):
        """Stanford program (no meaningful interactions) should have count = 0."""
        resp = api_client.get(
            f"{BASE_URL}/api/internal/programs/{PROGRAM_ID_STANFORD}/metrics?force=true",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        count = data.get("meaningful_interaction_count")
        assert count == 0, f"Stanford program should have meaningful_interaction_count = 0, got {count}"
        
        print(f"PASS: Stanford program has meaningful_interaction_count: {count}")


# ═══════════════════════════════════════════════════════════════════════════════
# Test: last_meaningful_engagement_type Validation
# ═══════════════════════════════════════════════════════════════════════════════

class TestLastMeaningfulEngagementType:
    """Test last_meaningful_engagement_type field."""

    def test_uf_has_last_meaningful_engagement_type(self, api_client, athlete_token):
        """UF program should have a valid last_meaningful_engagement_type."""
        resp = api_client.get(
            f"{BASE_URL}/api/internal/programs/{PROGRAM_ID_UF}/metrics?force=true",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        last_type = data.get("last_meaningful_engagement_type")
        assert last_type is not None, f"UF program should have last_meaningful_engagement_type, got None"
        assert isinstance(last_type, str), f"last_meaningful_engagement_type should be string, got {type(last_type)}"
        
        print(f"PASS: UF program has last_meaningful_engagement_type: {last_type}")

    def test_stanford_has_null_last_meaningful_engagement_type(self, api_client, athlete_token):
        """Stanford program (no meaningful) should have null last_meaningful_engagement_type."""
        resp = api_client.get(
            f"{BASE_URL}/api/internal/programs/{PROGRAM_ID_STANFORD}/metrics?force=true",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        last_type = data.get("last_meaningful_engagement_type")
        assert last_type is None, f"Stanford program should have last_meaningful_engagement_type=null, got {last_type}"
        
        print(f"PASS: Stanford program has last_meaningful_engagement_type: {last_type}")


# ═══════════════════════════════════════════════════════════════════════════════
# Test: Existing Fields Unchanged
# ═══════════════════════════════════════════════════════════════════════════════

class TestExistingFieldsUnchanged:
    """Test that existing fields (reply_rate, stage_velocity, etc.) still present."""

    def test_existing_fields_still_present(self, api_client, athlete_token):
        """All original metrics fields should still be present and unchanged."""
        resp = api_client.get(
            f"{BASE_URL}/api/internal/programs/{PROGRAM_ID_UF}/metrics?force=true",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        # Original fields that should still exist
        original_fields = [
            "program_id", "tenant_id", "athlete_id", "university_name",
            "reply_rate", "median_response_time_hours", "meaningful_interaction_count",
            "days_since_last_engagement", "unanswered_coach_questions",
            "overdue_followups", "stage_velocity", "stage_stalled_days",
            "engagement_trend", "invite_count", "info_request_count",
            "coach_flag_count", "director_action_count", "data_confidence", "computed_at"
        ]
        
        for field in original_fields:
            assert field in data, f"Missing original field: {field}"
        
        # Validate data_confidence is still HIGH/MEDIUM/LOW
        assert data["data_confidence"] in ["HIGH", "MEDIUM", "LOW"]
        
        # Validate engagement_trend is still valid
        valid_trends = ["accelerating", "steady", "decelerating", "stalled", "inactive", "insufficient_data"]
        assert data["engagement_trend"] in valid_trends
        
        print(f"PASS: All {len(original_fields)} original fields still present")
        print(f"  reply_rate: {data.get('reply_rate')}")
        print(f"  stage_velocity: {data.get('stage_velocity')}")
        print(f"  engagement_trend: {data.get('engagement_trend')}")
        print(f"  data_confidence: {data.get('data_confidence')}")


# ═══════════════════════════════════════════════════════════════════════════════
# Test: POST /recompute-all Still Works
# ═══════════════════════════════════════════════════════════════════════════════

class TestRecomputeAllStillWorks:
    """Test POST /recompute-all still works after changes."""

    def test_recompute_all_admin_success(self, api_client, admin_token):
        """POST recompute-all with admin token still succeeds with 0 errors."""
        resp = api_client.post(
            f"{BASE_URL}/api/internal/programs/recompute-all",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        
        # Validate response structure
        assert "computed" in data
        assert "errors" in data
        assert "total" in data
        
        # Errors should be 0 (as per requirement)
        assert data["errors"] == 0, f"Expected 0 errors, got {data['errors']}"
        
        # computed + errors should equal total
        assert data["computed"] + data["errors"] == data["total"]
        
        print(f"PASS: POST recompute-all succeeds with 0 errors")
        print(f"  computed: {data['computed']}, errors: {data['errors']}, total: {data['total']}")


# ═══════════════════════════════════════════════════════════════════════════════
# Test: Combined Full Response Validation
# ═══════════════════════════════════════════════════════════════════════════════

class TestFullResponseValidation:
    """Combined test for complete response validation."""

    def test_full_response_structure_uf(self, api_client, athlete_token):
        """Validate complete response structure for UF program."""
        resp = api_client.get(
            f"{BASE_URL}/api/internal/programs/{PROGRAM_ID_UF}/metrics?force=true",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        # All required fields (original + new)
        all_fields = [
            # Original
            "program_id", "tenant_id", "athlete_id", "university_name",
            "reply_rate", "median_response_time_hours", "meaningful_interaction_count",
            "days_since_last_engagement", "unanswered_coach_questions",
            "overdue_followups", "stage_velocity", "stage_stalled_days",
            "engagement_trend", "invite_count", "info_request_count",
            "coach_flag_count", "director_action_count", "data_confidence", "computed_at",
            # New 4 fields
            "last_meaningful_engagement_at", "last_meaningful_engagement_type",
            "days_since_last_meaningful_engagement", "engagement_freshness_label"
        ]
        
        for field in all_fields:
            assert field in data, f"Missing field: {field}"
        
        # Validate UF-specific expectations
        assert data["program_id"] == PROGRAM_ID_UF
        assert data["last_meaningful_engagement_at"] is not None
        assert data["last_meaningful_engagement_type"] is not None
        assert data["engagement_freshness_label"] == "active_recently"
        assert data["meaningful_interaction_count"] > 0
        
        print(f"PASS: Full response validation for UF program")
        print(f"  Total fields: {len(all_fields)}")

    def test_full_response_structure_stanford(self, api_client, athlete_token):
        """Validate complete response structure for Stanford program (no meaningful)."""
        resp = api_client.get(
            f"{BASE_URL}/api/internal/programs/{PROGRAM_ID_STANFORD}/metrics?force=true",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        # Validate Stanford-specific expectations
        assert data["program_id"] == PROGRAM_ID_STANFORD
        assert data["last_meaningful_engagement_at"] is None
        assert data["last_meaningful_engagement_type"] is None
        assert data["days_since_last_meaningful_engagement"] is None
        assert data["engagement_freshness_label"] == "no_recent_engagement"
        assert data["meaningful_interaction_count"] == 0
        
        print(f"PASS: Full response validation for Stanford program (no meaningful)")

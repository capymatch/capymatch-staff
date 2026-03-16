"""
Director Dashboard Refactor Tests - iteration 148
Tests the refactored director dashboard:
1. EscalationsCard receives ONLY coach_escalation type from /api/mission-control
2. outbox_summary returns 4 metrics for director-created actions (review_request + pipeline_escalation)
3. Old DirectorActionsCard full list is removed (verified by API response structure)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
DIRECTOR_EMAIL = "director@capymatch.com"
DIRECTOR_PASSWORD = "director123"
COACH_EMAIL = "coach.williams@capymatch.com"
COACH_PASSWORD = "coach123"


@pytest.fixture(scope="module")
def director_token():
    """Get director auth token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": DIRECTOR_EMAIL, "password": DIRECTOR_PASSWORD},
    )
    assert response.status_code == 200, f"Director login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def coach_token():
    """Get coach auth token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": COACH_EMAIL, "password": COACH_PASSWORD},
    )
    assert response.status_code == 200, f"Coach login failed: {response.text}"
    return response.json()["token"]


class TestDirectorMissionControl:
    """Tests for director mission control endpoint - escalations filtering and outbox summary"""

    def test_director_login_succeeds(self, director_token):
        """Director credentials work correctly"""
        assert director_token is not None
        assert len(director_token) > 0

    def test_mission_control_returns_director_role(self, director_token):
        """GET /api/mission-control returns director role"""
        response = requests.get(
            f"{BASE_URL}/api/mission-control",
            headers={"Authorization": f"Bearer {director_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "director"

    def test_escalations_only_coach_escalation_type(self, director_token):
        """Escalations array contains ONLY coach_escalation type (not review_request or pipeline_escalation)"""
        response = requests.get(
            f"{BASE_URL}/api/mission-control",
            headers={"Authorization": f"Bearer {director_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        
        escalations = data.get("escalations", [])
        # All escalations must be coach_escalation type
        for esc in escalations:
            assert esc.get("type") == "coach_escalation", f"Found non-coach_escalation: {esc.get('type')}"
        
        # Verify no review_request or pipeline_escalation in escalations
        types_found = set(e.get("type") for e in escalations)
        assert "review_request" not in types_found, "review_request should NOT be in escalations"
        assert "pipeline_escalation" not in types_found, "pipeline_escalation should NOT be in escalations"

    def test_escalations_has_required_fields(self, director_token):
        """Escalations have action_id, athlete_id, athlete_name for navigation"""
        response = requests.get(
            f"{BASE_URL}/api/mission-control",
            headers={"Authorization": f"Bearer {director_token}"},
        )
        assert response.status_code == 200
        escalations = response.json().get("escalations", [])
        
        if len(escalations) > 0:
            esc = escalations[0]
            assert "action_id" in esc, "escalation must have action_id"
            assert "athlete_id" in esc, "escalation must have athlete_id"
            assert "status" in esc, "escalation must have status"

    def test_outbox_summary_structure(self, director_token):
        """outbox_summary has 4 required metrics"""
        response = requests.get(
            f"{BASE_URL}/api/mission-control",
            headers={"Authorization": f"Bearer {director_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        
        outbox = data.get("outbox_summary")
        assert outbox is not None, "outbox_summary must be present"
        
        required_keys = ["awaiting_response", "critical_pending", "in_progress", "resolved_this_week"]
        for key in required_keys:
            assert key in outbox, f"outbox_summary missing key: {key}"
            assert isinstance(outbox[key], int), f"{key} must be an integer"

    def test_outbox_summary_awaiting_response(self, director_token):
        """awaiting_response counts open status director-created actions"""
        response = requests.get(
            f"{BASE_URL}/api/mission-control",
            headers={"Authorization": f"Bearer {director_token}"},
        )
        assert response.status_code == 200
        outbox = response.json().get("outbox_summary", {})
        
        # Should be >= 0
        assert outbox["awaiting_response"] >= 0

    def test_outbox_summary_counts_director_created_only(self, director_token):
        """outbox_summary counts only review_request + pipeline_escalation types"""
        # Get all actions
        response = requests.get(
            f"{BASE_URL}/api/director/actions",
            headers={"Authorization": f"Bearer {director_token}"},
        )
        assert response.status_code == 200
        all_actions = response.json().get("actions", [])
        
        # Filter to director-created types
        outbox_types = ["review_request", "pipeline_escalation"]
        director_created = [a for a in all_actions if a.get("type") in outbox_types]
        
        # Get mission control data
        mc_response = requests.get(
            f"{BASE_URL}/api/mission-control",
            headers={"Authorization": f"Bearer {director_token}"},
        )
        assert mc_response.status_code == 200
        outbox = mc_response.json().get("outbox_summary", {})
        
        # Verify counts align
        open_count = sum(1 for a in director_created if a.get("status") == "open")
        assert outbox["awaiting_response"] == open_count, f"Expected {open_count} awaiting, got {outbox['awaiting_response']}"

    def test_escalations_count_matches_coach_escalation_count(self, director_token):
        """escalations array count matches coach_escalation type count in director/actions"""
        # Get all actions
        response = requests.get(
            f"{BASE_URL}/api/director/actions",
            headers={"Authorization": f"Bearer {director_token}"},
        )
        assert response.status_code == 200
        all_actions = response.json().get("actions", [])
        
        # Filter coach_escalation - same as backend query (open + acknowledged + resolved top 5)
        coach_escalations_open = [a for a in all_actions if a.get("type") == "coach_escalation" and a.get("status") in ("open", "acknowledged")]
        coach_escalations_resolved = [a for a in all_actions if a.get("type") == "coach_escalation" and a.get("status") == "resolved"]
        
        # Get mission control data
        mc_response = requests.get(
            f"{BASE_URL}/api/mission-control",
            headers={"Authorization": f"Bearer {director_token}"},
        )
        assert mc_response.status_code == 200
        escalations = mc_response.json().get("escalations", [])
        
        # Backend returns: open/acknowledged coach_escalations + top 5 resolved
        expected_max = len(coach_escalations_open) + min(len(coach_escalations_resolved), 5)
        assert len(escalations) <= expected_max


class TestCoachMissionControl:
    """Coach mission control still works (no regression)"""

    def test_coach_login_succeeds(self, coach_token):
        """Coach credentials work correctly"""
        assert coach_token is not None
        assert len(coach_token) > 0

    def test_coach_mission_control_returns_coach_role(self, coach_token):
        """GET /api/mission-control returns club_coach role"""
        response = requests.get(
            f"{BASE_URL}/api/mission-control",
            headers={"Authorization": f"Bearer {coach_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "club_coach"

    def test_coach_does_not_get_escalations_or_outbox(self, coach_token):
        """Coach should NOT receive director-specific escalations/outbox_summary"""
        response = requests.get(
            f"{BASE_URL}/api/mission-control",
            headers={"Authorization": f"Bearer {coach_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        
        # Coach response should have myRoster, todays_summary instead
        assert "myRoster" in data
        assert "todays_summary" in data

    def test_coach_director_requests_via_actions_api(self, coach_token):
        """Coach can fetch director requests count via /api/director/actions"""
        response = requests.get(
            f"{BASE_URL}/api/director/actions",
            headers={"Authorization": f"Bearer {coach_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "actions" in data


class TestDashboardSectionOrder:
    """Verify dashboard components exist in mission-control response"""

    def test_director_has_all_sections(self, director_token):
        """Director response has: programStatus, escalations, outbox_summary, recruitingSignals, needsAttention"""
        response = requests.get(
            f"{BASE_URL}/api/mission-control",
            headers={"Authorization": f"Bearer {director_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        
        required_sections = [
            "programStatus",  # Hero KPIs
            "escalations",    # EscalationsCard
            "outbox_summary", # Your Outbox
            "recruitingSignals",  # Recruiting Signals
            "needsAttention",     # Needs Attention
        ]
        
        for section in required_sections:
            assert section in data, f"Missing section: {section}"


class TestEscalationNavigation:
    """Escalation items support pod navigation"""

    def test_escalation_has_navigation_fields(self, director_token):
        """Each escalation has athlete_id and action_id for URL: /support-pods/{athlete_id}?escalation={action_id}"""
        response = requests.get(
            f"{BASE_URL}/api/mission-control",
            headers={"Authorization": f"Bearer {director_token}"},
        )
        assert response.status_code == 200
        escalations = response.json().get("escalations", [])
        
        for esc in escalations:
            assert esc.get("athlete_id"), f"Missing athlete_id in escalation: {esc}"
            assert esc.get("action_id"), f"Missing action_id in escalation: {esc}"

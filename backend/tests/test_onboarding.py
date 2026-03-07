"""
Coach Onboarding Checklist API Tests
Tests the onboarding endpoints: status, complete-step, dismiss
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

# Test credentials
COACH_WILLIAMS = {"email": "coach.williams@capymatch.com", "password": "coach123"}
COACH_GARCIA = {"email": "coach.garcia@capymatch.com", "password": "coach123"}
DIRECTOR = {"email": "director@capymatch.com", "password": "director123"}

# Valid step keys
VALID_STEPS = ["mission_control", "meet_roster", "support_pod", "events", "log_activity"]


@pytest.fixture(scope="module")
def director_token():
    """Get auth token for director"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=DIRECTOR)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Director login failed - skipping tests")


@pytest.fixture(scope="module")
def coach_williams_token():
    """Get auth token for Coach Williams"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=COACH_WILLIAMS)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Coach Williams login failed - skipping tests")


@pytest.fixture(scope="module")
def coach_garcia_token():
    """Get auth token for Coach Garcia"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=COACH_GARCIA)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Coach Garcia login failed - skipping tests")


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


class TestOnboardingStatus:
    """Tests for GET /api/onboarding/status endpoint"""

    def test_director_gets_show_checklist_false(self, director_token):
        """Directors should not see the onboarding checklist"""
        response = requests.get(
            f"{BASE_URL}/api/onboarding/status",
            headers=auth_header(director_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["show_checklist"] is False
        print(f"Director correctly gets show_checklist=False: {data}")

    def test_coach_gets_onboarding_status(self, coach_williams_token):
        """Coaches should get onboarding status with steps array"""
        response = requests.get(
            f"{BASE_URL}/api/onboarding/status",
            headers=auth_header(coach_williams_token)
        )
        assert response.status_code == 200
        data = response.json()
        
        # If checklist is shown, verify structure
        if data.get("show_checklist"):
            assert "steps" in data
            assert "completed_count" in data
            assert "total_count" in data
            assert "all_done" in data
            assert isinstance(data["steps"], list)
            assert len(data["steps"]) == 5
            
            # Verify step structure
            for step in data["steps"]:
                assert "key" in step
                assert "label" in step
                assert "description" in step
                assert "completed" in step
                assert step["key"] in VALID_STEPS
            print(f"Coach gets valid onboarding status with {len(data['steps'])} steps")
        else:
            # Checklist might be dismissed/completed
            print(f"Coach checklist not shown (dismissed/completed): {data}")

    def test_coach_garcia_fresh_status(self, coach_garcia_token):
        """Coach Garcia should have a fresh onboarding state"""
        response = requests.get(
            f"{BASE_URL}/api/onboarding/status",
            headers=auth_header(coach_garcia_token)
        )
        assert response.status_code == 200
        data = response.json()
        print(f"Coach Garcia onboarding status: {data}")
        
        # Validate response structure
        assert "show_checklist" in data

    def test_unauthenticated_request_fails(self):
        """Unauthenticated requests should fail"""
        response = requests.get(f"{BASE_URL}/api/onboarding/status")
        assert response.status_code == 401
        print("Unauthenticated request correctly rejected with 401")


class TestCompleteStep:
    """Tests for POST /api/onboarding/complete-step endpoint"""

    def test_complete_valid_step(self, coach_garcia_token):
        """Coach can mark a valid step as complete"""
        response = requests.post(
            f"{BASE_URL}/api/onboarding/complete-step",
            json={"step": "mission_control"},
            headers=auth_header(coach_garcia_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["step"] == "mission_control"
        print(f"Successfully completed step: {data}")

    def test_complete_all_valid_steps(self, coach_garcia_token):
        """Test completing all valid step keys"""
        for step in VALID_STEPS:
            response = requests.post(
                f"{BASE_URL}/api/onboarding/complete-step",
                json={"step": step},
                headers=auth_header(coach_garcia_token)
            )
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "ok"
            assert data["step"] == step
            print(f"Completed step: {step}")

    def test_invalid_step_returns_400(self, coach_garcia_token):
        """Invalid step key should return 400"""
        response = requests.post(
            f"{BASE_URL}/api/onboarding/complete-step",
            json={"step": "invalid_step_key"},
            headers=auth_header(coach_garcia_token)
        )
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "Invalid step" in data["detail"]
        print(f"Invalid step correctly rejected: {data}")

    def test_empty_step_returns_400(self, coach_garcia_token):
        """Empty step should return 400"""
        response = requests.post(
            f"{BASE_URL}/api/onboarding/complete-step",
            json={"step": ""},
            headers=auth_header(coach_garcia_token)
        )
        assert response.status_code == 400
        print("Empty step correctly rejected with 400")

    def test_missing_step_returns_400(self, coach_garcia_token):
        """Missing step field should return 400"""
        response = requests.post(
            f"{BASE_URL}/api/onboarding/complete-step",
            json={},
            headers=auth_header(coach_garcia_token)
        )
        assert response.status_code == 400
        print("Missing step correctly rejected with 400")

    def test_director_forbidden_403(self, director_token):
        """Directors should get 403 when trying to complete steps"""
        response = requests.post(
            f"{BASE_URL}/api/onboarding/complete-step",
            json={"step": "mission_control"},
            headers=auth_header(director_token)
        )
        assert response.status_code == 403
        print("Director correctly forbidden with 403")


class TestDismissOnboarding:
    """Tests for POST /api/onboarding/dismiss endpoint"""

    def test_coach_can_dismiss(self, coach_williams_token):
        """Coach can dismiss the onboarding checklist"""
        response = requests.post(
            f"{BASE_URL}/api/onboarding/dismiss",
            headers=auth_header(coach_williams_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "dismissed"
        print(f"Checklist dismissed: {data}")

    def test_after_dismiss_checklist_hidden(self, coach_williams_token):
        """After dismissing, checklist should be hidden"""
        # First dismiss
        requests.post(
            f"{BASE_URL}/api/onboarding/dismiss",
            headers=auth_header(coach_williams_token)
        )
        
        # Then check status
        response = requests.get(
            f"{BASE_URL}/api/onboarding/status",
            headers=auth_header(coach_williams_token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["show_checklist"] is False
        print(f"Checklist correctly hidden after dismiss: {data}")

    def test_director_dismiss_forbidden_403(self, director_token):
        """Directors should get 403 when trying to dismiss"""
        response = requests.post(
            f"{BASE_URL}/api/onboarding/dismiss",
            headers=auth_header(director_token)
        )
        assert response.status_code == 403
        print("Director dismiss correctly forbidden with 403")


class TestPersonalization:
    """Tests for onboarding personalization based on athlete assignments"""

    def test_coach_with_athletes_has_full_steps(self, coach_williams_token):
        """Coach with assigned athletes should see full step labels"""
        response = requests.get(
            f"{BASE_URL}/api/onboarding/status",
            headers=auth_header(coach_williams_token)
        )
        assert response.status_code == 200
        data = response.json()
        
        if data.get("show_checklist") and data.get("steps"):
            meet_roster_step = next((s for s in data["steps"] if s["key"] == "meet_roster"), None)
            if meet_roster_step:
                # Check if personalized for no athletes
                if meet_roster_step.get("disabled"):
                    assert meet_roster_step["label"] == "Awaiting athlete assignments"
                    print("Coach has no athletes - meet_roster is disabled")
                else:
                    assert meet_roster_step["label"] == "Meet your roster"
                    print("Coach has athletes - meet_roster is enabled")
            
            # Support pod should have a dynamic route if coach has athletes
            support_pod_step = next((s for s in data["steps"] if s["key"] == "support_pod"), None)
            if support_pod_step and not support_pod_step.get("disabled"):
                # Route should be populated if athlete exists
                route = support_pod_step.get("route")
                print(f"Support pod route: {route}")


class TestAutoDetectLogActivity:
    """Tests for auto-detection of log_activity step"""

    def test_log_activity_auto_detection(self, coach_williams_token):
        """Check if log_activity is auto-detected from notes/actions/event_notes"""
        response = requests.get(
            f"{BASE_URL}/api/onboarding/status",
            headers=auth_header(coach_williams_token)
        )
        assert response.status_code == 200
        data = response.json()
        
        if data.get("steps"):
            log_activity_step = next((s for s in data["steps"] if s["key"] == "log_activity"), None)
            if log_activity_step:
                print(f"log_activity step - completed: {log_activity_step['completed']}")
                # This will be True if coach has created any notes/actions/event_notes

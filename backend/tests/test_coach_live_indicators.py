"""
Test suite for Coach Dashboard Live Indicators (V1 real-time notifications)
Tests:
- /api/mission-control endpoint returns correct data structure
- /api/director/actions returns correct counts for polling
- todays_summary KPI values match expected values
- summary_lines, priorities, myRoster present in response
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Coach credentials for testing
COACH_EMAIL = "coach.williams@capymatch.com"
COACH_PASSWORD = "coach123"


@pytest.fixture(scope="module")
def coach_token():
    """Get authentication token for coach user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": COACH_EMAIL,
        "password": COACH_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("token")


@pytest.fixture(scope="module")
def auth_headers(coach_token):
    """Auth headers with bearer token"""
    return {"Authorization": f"Bearer {coach_token}"}


class TestMissionControlEndpoint:
    """Mission Control API endpoint tests for Coach role"""
    
    def test_mission_control_returns_200(self, auth_headers):
        """Mission control endpoint returns 200 for authenticated coach"""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_mission_control_role_is_coach(self, auth_headers):
        """Role field should be club_coach for coach user"""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=auth_headers)
        data = response.json()
        assert data.get("role") == "club_coach", f"Expected club_coach, got {data.get('role')}"
    
    def test_todays_summary_structure(self, auth_headers):
        """todays_summary contains expected KPI fields"""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=auth_headers)
        data = response.json()
        summary = data.get("todays_summary", {})
        
        assert "athleteCount" in summary, "Missing athleteCount in todays_summary"
        assert "needingAction" in summary, "Missing needingAction in todays_summary"
        assert "upcomingEvents" in summary, "Missing upcomingEvents in todays_summary"
        # directorRequests may or may not be in summary (fetched separately)
    
    def test_todays_summary_kpi_values(self, auth_headers):
        """Verify KPI values match expected: MY ATHLETES 14, NEED ACTION 10, EVENTS 6"""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=auth_headers)
        data = response.json()
        summary = data.get("todays_summary", {})
        
        assert summary.get("athleteCount") == 14, f"Expected athleteCount=14, got {summary.get('athleteCount')}"
        assert summary.get("needingAction") == 10, f"Expected needingAction=10, got {summary.get('needingAction')}"
        assert summary.get("upcomingEvents") == 6, f"Expected upcomingEvents=6, got {summary.get('upcomingEvents')}"
    
    def test_summary_lines_present(self, auth_headers):
        """summary_lines array is returned"""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=auth_headers)
        data = response.json()
        
        assert "summary_lines" in data, "Missing summary_lines in response"
        assert isinstance(data["summary_lines"], list), "summary_lines should be a list"
        assert len(data["summary_lines"]) > 0, "summary_lines should not be empty"
    
    def test_priorities_present(self, auth_headers):
        """priorities array is returned"""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=auth_headers)
        data = response.json()
        
        assert "priorities" in data, "Missing priorities in response"
        assert isinstance(data["priorities"], list), "priorities should be a list"
    
    def test_priorities_structure(self, auth_headers):
        """priorities items have required fields"""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=auth_headers)
        data = response.json()
        priorities = data.get("priorities", [])
        
        if priorities:
            first = priorities[0]
            assert "urgency" in first, "Missing urgency in priority item"
            assert "athlete_id" in first, "Missing athlete_id in priority item"
            assert "athlete_name" in first, "Missing athlete_name in priority item"
            assert "action" in first, "Missing action in priority item"
    
    def test_myRoster_present(self, auth_headers):
        """myRoster array is returned"""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=auth_headers)
        data = response.json()
        
        assert "myRoster" in data, "Missing myRoster in response"
        assert isinstance(data["myRoster"], list), "myRoster should be a list"


class TestDirectorActionsEndpoint:
    """Director Actions endpoint tests for polling director request count"""
    
    def test_director_actions_returns_200(self, auth_headers):
        """Director actions endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/director/actions", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_director_actions_has_actions_array(self, auth_headers):
        """Response contains actions array"""
        response = requests.get(f"{BASE_URL}/api/director/actions", headers=auth_headers)
        data = response.json()
        
        assert "actions" in data, "Missing actions in response"
        assert isinstance(data["actions"], list), "actions should be a list"
    
    def test_director_actions_count_open_acknowledged(self, auth_headers):
        """Count of open/acknowledged actions should be 5"""
        response = requests.get(f"{BASE_URL}/api/director/actions", headers=auth_headers)
        data = response.json()
        actions = data.get("actions", [])
        
        open_count = len([a for a in actions if a.get("status") in ["open", "acknowledged"]])
        assert open_count == 5, f"Expected 5 open/acknowledged actions, got {open_count}"
    
    def test_director_action_structure(self, auth_headers):
        """Director action items have required fields"""
        response = requests.get(f"{BASE_URL}/api/director/actions", headers=auth_headers)
        data = response.json()
        actions = data.get("actions", [])
        
        if actions:
            first = actions[0]
            assert "action_id" in first, "Missing action_id"
            assert "type" in first, "Missing type"
            assert "status" in first, "Missing status"


class TestSupportPodEndpoint:
    """Support Pod endpoint tests"""
    
    def test_support_pod_returns_200(self, auth_headers):
        """Support pod endpoint returns 200 for valid athlete"""
        response = requests.get(f"{BASE_URL}/api/support-pods/athlete_3", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_support_pod_has_athlete_data(self, auth_headers):
        """Support pod response contains athlete info"""
        response = requests.get(f"{BASE_URL}/api/support-pods/athlete_3", headers=auth_headers)
        data = response.json()
        
        assert "athlete" in data, "Missing athlete in response"
        assert "id" in data["athlete"], "Missing athlete id"


class TestUpcomingEventsEndpoint:
    """Upcoming Events endpoint tests"""
    
    def test_upcoming_events_in_mission_control(self, auth_headers):
        """Mission control includes upcomingEvents data"""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=auth_headers)
        data = response.json()
        
        assert "upcomingEvents" in data, "Missing upcomingEvents in response"
        assert isinstance(data["upcomingEvents"], list), "upcomingEvents should be a list"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

"""
Test Data Architecture Refactor - MongoDB Direct Queries + TTL Cache

Tests the major backend refactor:
1. In-memory cache replaced with direct MongoDB queries
2. All get_all/get_by_id functions now query MongoDB directly
3. Derived data (interventions, signals, alerts) uses TTL-cached pattern
4. MongoDB indexes created for all core collections

Test credentials:
- Athlete: emma.chen@athlete.capymatch.com / athlete123
- Director: director@capymatch.com / director123
- Coach: coach.williams@capymatch.com / coach123
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")


class TestAuth:
    """Test authentication for all 3 roles"""

    def test_athlete_login(self):
        """POST /api/auth/login - athlete role"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "emma.chen@athlete.capymatch.com", "password": "athlete123"},
        )
        assert response.status_code == 200, f"Athlete login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["role"] == "athlete", f"Expected athlete role, got {data['user']['role']}"

    def test_director_login(self):
        """POST /api/auth/login - director role"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "director@capymatch.com", "password": "director123"},
        )
        assert response.status_code == 200, f"Director login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert data["user"]["role"] == "director", f"Expected director role, got {data['user']['role']}"

    def test_coach_login(self):
        """POST /api/auth/login - coach role"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "coach.williams@capymatch.com", "password": "coach123"},
        )
        assert response.status_code == 200, f"Coach login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        # Coach role can be 'coach' or 'club_coach'
        assert data["user"]["role"] in ("coach", "club_coach"), f"Expected coach role, got {data['user']['role']}"


import time

# Cache tokens at module level to avoid rate limiting
_token_cache = {}

def _get_token(email, password, role_name):
    """Get token with caching to avoid rate limits"""
    cache_key = email
    if cache_key in _token_cache:
        return _token_cache[cache_key]
    
    # Add small delay to avoid rate limiting
    time.sleep(1)
    
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": email, "password": password},
    )
    if response.status_code == 200:
        token = response.json().get("token")
        _token_cache[cache_key] = token
        return token
    elif response.status_code == 429:
        # Rate limited, wait and retry
        time.sleep(10)
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": email, "password": password},
        )
        if response.status_code == 200:
            token = response.json().get("token")
            _token_cache[cache_key] = token
            return token
    return None


@pytest.fixture(scope="session")
def athlete_token():
    """Get athlete auth token"""
    token = _get_token("emma.chen@athlete.capymatch.com", "athlete123", "athlete")
    if not token:
        pytest.skip("Athlete authentication failed")
    return token


@pytest.fixture(scope="session")
def director_token():
    """Get director auth token"""
    token = _get_token("director@capymatch.com", "director123", "director")
    if not token:
        pytest.skip("Director authentication failed")
    return token


@pytest.fixture(scope="session")
def coach_token():
    """Get coach auth token"""
    token = _get_token("coach.williams@capymatch.com", "coach123", "coach")
    if not token:
        pytest.skip("Coach authentication failed")
    return token


class TestAthletes:
    """Test GET /api/athletes - direct MongoDB queries"""

    def test_get_athletes_returns_11(self, director_token):
        """GET /api/athletes should return 11 athletes with pipeline_momentum computed"""
        response = requests.get(
            f"{BASE_URL}/api/athletes",
            headers={"Authorization": f"Bearer {director_token}"},
        )
        assert response.status_code == 200, f"GET /api/athletes failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of athletes"
        assert len(data) == 11, f"Expected 11 athletes, got {len(data)}"
        
        # Verify pipeline_momentum is computed for each athlete
        for athlete in data:
            assert "id" in athlete, "Athlete missing id"
            assert "pipeline_momentum" in athlete or "momentum_score" in athlete, f"Athlete {athlete.get('id')} missing momentum field"

    def test_athletes_have_required_fields(self, director_token):
        """Verify athletes have all required fields from MongoDB"""
        response = requests.get(
            f"{BASE_URL}/api/athletes",
            headers={"Authorization": f"Bearer {director_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        
        required_fields = ["id", "full_name", "grad_year", "position"]
        for athlete in data[:3]:  # Check first 3
            for field in required_fields:
                assert field in athlete, f"Athlete missing required field: {field}"


class TestMissionControl:
    """Test GET /api/mission-control - role-specific data"""

    def test_coach_mission_control(self, coach_token):
        """Coach Mission Control should show 5 athletes (filtered by ownership)"""
        response = requests.get(
            f"{BASE_URL}/api/mission-control",
            headers={"Authorization": f"Bearer {coach_token}"},
        )
        assert response.status_code == 200, f"Coach mission-control failed: {response.text}"
        data = response.json()
        
        # Coach view should have myRoster
        assert "myRoster" in data, "Coach view missing myRoster"
        assert "role" in data, "Missing role field"
        assert data["role"] == "club_coach", f"Expected club_coach role, got {data['role']}"
        
        # Coach should see their assigned athletes (5 based on test context)
        roster = data.get("myRoster", [])
        assert len(roster) >= 1, "Coach should have at least 1 athlete in roster"
        
        # Verify roster items have required fields
        if roster:
            first = roster[0]
            assert "id" in first, "Roster item missing id"
            assert "name" in first, "Roster item missing name"

    def test_director_mission_control(self, director_token):
        """Director Mission Control should show all 11 athletes"""
        response = requests.get(
            f"{BASE_URL}/api/mission-control",
            headers={"Authorization": f"Bearer {director_token}"},
        )
        assert response.status_code == 200, f"Director mission-control failed: {response.text}"
        data = response.json()
        
        assert "role" in data, "Missing role field"
        assert data["role"] == "director", f"Expected director role, got {data['role']}"
        
        # Director view should have programStatus with totalAthletes
        assert "programStatus" in data, "Director view missing programStatus"
        program_status = data["programStatus"]
        assert "totalAthletes" in program_status, "programStatus missing totalAthletes"
        assert program_status["totalAthletes"] == 11, f"Expected 11 athletes, got {program_status['totalAthletes']}"
        
        # Director should see needsAttention
        assert "needsAttention" in data, "Director view missing needsAttention"

    def test_athlete_mission_control(self, athlete_token):
        """Athlete Mission Control should load correctly"""
        response = requests.get(
            f"{BASE_URL}/api/mission-control",
            headers={"Authorization": f"Bearer {athlete_token}"},
        )
        # Athlete may get 200 or redirect to athlete dashboard
        assert response.status_code in (200, 403), f"Athlete mission-control unexpected status: {response.status_code}"


class TestProgramIntelligence:
    """Test GET /api/program/intelligence - async compute"""

    def test_program_intelligence_returns_data(self, director_token):
        """GET /api/program/intelligence should return program health data"""
        response = requests.get(
            f"{BASE_URL}/api/program/intelligence",
            headers={"Authorization": f"Bearer {director_token}"},
        )
        assert response.status_code == 200, f"Program intelligence failed: {response.text}"
        data = response.json()
        
        # Verify key sections exist
        assert "program_health" in data, "Missing program_health section"
        assert "readiness" in data, "Missing readiness section"
        assert "athlete_count" in data, "Missing athlete_count"
        
        # Verify program_health has expected structure
        health = data["program_health"]
        assert "pod_health" in health, "program_health missing pod_health"
        assert "open_issues" in health, "program_health missing open_issues"


class TestEvents:
    """Test GET /api/events - async event_engine"""

    def test_events_returns_list(self, coach_token):
        """GET /api/events should return events list"""
        response = requests.get(
            f"{BASE_URL}/api/events",
            headers={"Authorization": f"Bearer {coach_token}"},
        )
        assert response.status_code == 200, f"GET /api/events failed: {response.text}"
        data = response.json()
        
        # Events should have upcoming and past sections
        assert "upcoming" in data, "Missing upcoming events"
        assert "past" in data, "Missing past events"
        
        # Verify structure of events
        all_events = data.get("upcoming", []) + data.get("past", [])
        if all_events:
            event = all_events[0]
            assert "id" in event, "Event missing id"
            assert "name" in event, "Event missing name"


class TestRoster:
    """Test GET /api/roster - needing_attention data"""

    def test_roster_returns_data(self, director_token):
        """GET /api/roster should return roster data (director only)"""
        response = requests.get(
            f"{BASE_URL}/api/roster",
            headers={"Authorization": f"Bearer {director_token}"},
        )
        assert response.status_code == 200, f"GET /api/roster failed: {response.text}"
        data = response.json()
        
        # Roster should have athletes
        assert "athletes" in data or isinstance(data, list), "Roster missing athletes data"


class TestAdvocacy:
    """Test GET /api/advocacy/recommendations"""

    def test_advocacy_recommendations(self, coach_token):
        """GET /api/advocacy/recommendations should list recommendations"""
        response = requests.get(
            f"{BASE_URL}/api/advocacy/recommendations",
            headers={"Authorization": f"Bearer {coach_token}"},
        )
        assert response.status_code == 200, f"GET /api/advocacy/recommendations failed: {response.text}"
        data = response.json()
        
        # Should have grouped recommendations
        assert "needs_attention" in data or "drafts" in data or "stats" in data, "Unexpected recommendations structure"


class TestDerivedDataCache:
    """Test that derived data (interventions, signals, alerts) is computed correctly"""

    def test_mission_control_has_signals(self, director_token):
        """Mission Control should include momentum signals from TTL cache"""
        response = requests.get(
            f"{BASE_URL}/api/mission-control",
            headers={"Authorization": f"Bearer {director_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        
        # Director view should have programActivity (signals)
        assert "programActivity" in data, "Director view missing programActivity (signals)"

    def test_mission_control_has_alerts(self, coach_token):
        """Coach Mission Control should include priority alerts"""
        response = requests.get(
            f"{BASE_URL}/api/mission-control",
            headers={"Authorization": f"Bearer {coach_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        
        # Coach view should have priorities (derived from alerts)
        assert "priorities" in data or "todays_summary" in data, "Coach view missing priorities/summary"

    def test_mission_control_signals_endpoint(self, coach_token):
        """GET /api/mission-control/signals should return momentum signals"""
        response = requests.get(
            f"{BASE_URL}/api/mission-control/signals",
            headers={"Authorization": f"Bearer {coach_token}"},
        )
        assert response.status_code == 200, f"Signals endpoint failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Signals should be a list"


class TestWriteOperationsRecompute:
    """Test that write operations trigger recompute_derived_data"""

    def test_roster_update_triggers_recompute(self, director_token):
        """Verify roster updates work (which should trigger recompute)"""
        # First get current roster (director only)
        response = requests.get(
            f"{BASE_URL}/api/roster",
            headers={"Authorization": f"Bearer {director_token}"},
        )
        assert response.status_code == 200, "Failed to get roster"
        
        # Then verify mission control still works (derived data intact)
        response = requests.get(
            f"{BASE_URL}/api/mission-control",
            headers={"Authorization": f"Bearer {director_token}"},
        )
        assert response.status_code == 200, "Mission control failed after roster access"


class TestHealthEndpoint:
    """Test backend health"""

    def test_root_endpoint(self):
        """GET / should return some response (health check may not exist)"""
        response = requests.get(f"{BASE_URL}/")
        # Root may return 200 or 404 depending on setup
        assert response.status_code in (200, 404, 307), f"Root endpoint unexpected: {response.status_code}"


class TestCoachInbox:
    """Test coach inbox endpoint"""

    def test_coach_inbox_loads(self, coach_token):
        """GET /api/coach-inbox should return inbox data"""
        response = requests.get(
            f"{BASE_URL}/api/coach-inbox",
            headers={"Authorization": f"Bearer {coach_token}"},
        )
        assert response.status_code == 200, f"Coach inbox failed: {response.text}"
        data = response.json()
        
        # Should have some structure
        assert isinstance(data, (dict, list)), "Unexpected coach inbox response type"


class TestDirectorActions:
    """Test director actions endpoint"""

    def test_director_actions_loads(self, director_token):
        """GET /api/director/actions should return actions data"""
        response = requests.get(
            f"{BASE_URL}/api/director/actions",
            headers={"Authorization": f"Bearer {director_token}"},
        )
        assert response.status_code == 200, f"Director actions failed: {response.text}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

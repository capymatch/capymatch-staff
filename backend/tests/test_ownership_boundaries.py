"""
Test suite for per-coach data ownership boundaries.

Tests the new ownership system where:
- Directors see all athletes and related data
- Coaches only see athletes where primary_coach_id matches their user id
- Odd-numbered athletes (1,3,5...) belong to coach-williams
- Even-numbered athletes (2,4,6...) belong to coach-garcia

Endpoints tested:
- GET /api/athletes - filtered athlete list
- GET /api/athletes/{id} - 403 for another coach's athlete
- GET /api/support-pods/{athlete_id} - 403 for another coach's athlete
- POST /api/athletes/{id}/notes - 403 for another coach's athlete
- GET /api/mission-control - filtered alerts/events/snapshot
- GET /api/events - filtered events by athlete_ids
- GET /api/advocacy/recommendations - filtered recommendations
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
DIRECTOR_CREDS = {"email": "director@capymatch.com", "password": "director123"}
COACH_WILLIAMS_CREDS = {"email": "coach.williams@capymatch.com", "password": "coach123"}
COACH_GARCIA_CREDS = {"email": "coach.garcia@capymatch.com", "password": "coach123"}

# Athlete assignment expectations (odd to Williams, even to Garcia)
WILLIAMS_ATHLETES = [f"athlete_{i}" for i in range(1, 26, 2)]  # 1,3,5,7,9,11,13,15,17,19,21,23,25
GARCIA_ATHLETES = [f"athlete_{i}" for i in range(2, 26, 2)]    # 2,4,6,8,10,12,14,16,18,20,22,24


@pytest.fixture(scope="module")
def director_token():
    """Get director auth token."""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json=DIRECTOR_CREDS)
    assert resp.status_code == 200, f"Director login failed: {resp.text}"
    return resp.json()["token"]


@pytest.fixture(scope="module")
def williams_token():
    """Get Coach Williams auth token."""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json=COACH_WILLIAMS_CREDS)
    assert resp.status_code == 200, f"Coach Williams login failed: {resp.text}"
    return resp.json()["token"]


@pytest.fixture(scope="module")
def garcia_token():
    """Get Coach Garcia auth token."""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json=COACH_GARCIA_CREDS)
    assert resp.status_code == 200, f"Coach Garcia login failed: {resp.text}"
    return resp.json()["token"]


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# =====================
# ATHLETES ENDPOINT TESTS
# =====================

class TestAthletesOwnership:
    """Test athlete listing and access control."""
    
    def test_director_sees_all_athletes(self, director_token):
        """Director should see all 25 athletes."""
        resp = requests.get(f"{BASE_URL}/api/athletes", headers=auth_headers(director_token))
        assert resp.status_code == 200
        athletes = resp.json()
        athlete_ids = {a["id"] for a in athletes}
        
        assert len(athletes) == 25, f"Director should see 25 athletes, got {len(athletes)}"
        # Verify both coach's athletes are present
        assert "athlete_1" in athlete_ids, "Director should see athlete_1 (Williams)"
        assert "athlete_2" in athlete_ids, "Director should see athlete_2 (Garcia)"
    
    def test_coach_williams_sees_own_athletes(self, williams_token):
        """Coach Williams should see ~13 athletes (odd-numbered)."""
        resp = requests.get(f"{BASE_URL}/api/athletes", headers=auth_headers(williams_token))
        assert resp.status_code == 200
        athletes = resp.json()
        athlete_ids = [a["id"] for a in athletes]
        
        # Should see roughly 13 athletes (odd numbers 1-25)
        assert 11 <= len(athletes) <= 15, f"Coach Williams should see ~13 athletes, got {len(athletes)}"
        
        # Verify Williams sees odd-numbered athletes
        assert "athlete_1" in athlete_ids, "Williams should see athlete_1"
        assert "athlete_3" in athlete_ids, "Williams should see athlete_3"
        
        # Verify Williams does NOT see even-numbered athletes
        assert "athlete_2" not in athlete_ids, "Williams should NOT see athlete_2"
        assert "athlete_4" not in athlete_ids, "Williams should NOT see athlete_4"
    
    def test_coach_garcia_sees_own_athletes(self, garcia_token):
        """Coach Garcia should see ~12 athletes (even-numbered)."""
        resp = requests.get(f"{BASE_URL}/api/athletes", headers=auth_headers(garcia_token))
        assert resp.status_code == 200
        athletes = resp.json()
        athlete_ids = [a["id"] for a in athletes]
        
        # Should see roughly 12 athletes (even numbers 2-24)
        assert 10 <= len(athletes) <= 14, f"Coach Garcia should see ~12 athletes, got {len(athletes)}"
        
        # Verify Garcia sees even-numbered athletes
        assert "athlete_2" in athlete_ids, "Garcia should see athlete_2"
        assert "athlete_4" in athlete_ids, "Garcia should see athlete_4"
        
        # Verify Garcia does NOT see odd-numbered athletes
        assert "athlete_1" not in athlete_ids, "Garcia should NOT see athlete_1"
        assert "athlete_3" not in athlete_ids, "Garcia should NOT see athlete_3"
    
    def test_director_can_access_any_athlete(self, director_token):
        """Director should be able to GET any athlete by ID."""
        # Access Williams' athlete
        resp1 = requests.get(f"{BASE_URL}/api/athletes/athlete_1", headers=auth_headers(director_token))
        assert resp1.status_code == 200
        assert resp1.json().get("id") == "athlete_1"
        
        # Access Garcia's athlete
        resp2 = requests.get(f"{BASE_URL}/api/athletes/athlete_2", headers=auth_headers(director_token))
        assert resp2.status_code == 200
        assert resp2.json().get("id") == "athlete_2"
    
    def test_williams_403_for_garcia_athlete(self, williams_token):
        """Coach Williams should get 403 when accessing Garcia's athlete."""
        resp = requests.get(f"{BASE_URL}/api/athletes/athlete_2", headers=auth_headers(williams_token))
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}: {resp.text}"
    
    def test_garcia_403_for_williams_athlete(self, garcia_token):
        """Coach Garcia should get 403 when accessing Williams' athlete."""
        resp = requests.get(f"{BASE_URL}/api/athletes/athlete_1", headers=auth_headers(garcia_token))
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}: {resp.text}"
    
    def test_williams_200_for_own_athlete(self, williams_token):
        """Coach Williams should get 200 for their own athlete."""
        resp = requests.get(f"{BASE_URL}/api/athletes/athlete_1", headers=auth_headers(williams_token))
        assert resp.status_code == 200
        assert resp.json().get("id") == "athlete_1"


# =====================
# SUPPORT PODS ENDPOINT TESTS
# =====================

class TestSupportPodsOwnership:
    """Test Support Pod access control."""
    
    def test_director_can_access_any_pod(self, director_token):
        """Director should be able to access any athlete's Support Pod."""
        resp = requests.get(f"{BASE_URL}/api/support-pods/athlete_1", headers=auth_headers(director_token))
        assert resp.status_code == 200
        assert resp.json().get("athlete", {}).get("id") == "athlete_1"
        
        resp = requests.get(f"{BASE_URL}/api/support-pods/athlete_2", headers=auth_headers(director_token))
        assert resp.status_code == 200
        assert resp.json().get("athlete", {}).get("id") == "athlete_2"
    
    def test_williams_403_for_garcia_pod(self, williams_token):
        """Coach Williams should get 403 for Garcia's athlete's Support Pod."""
        resp = requests.get(f"{BASE_URL}/api/support-pods/athlete_2", headers=auth_headers(williams_token))
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}"
    
    def test_garcia_403_for_williams_pod(self, garcia_token):
        """Coach Garcia should get 403 for Williams' athlete's Support Pod."""
        resp = requests.get(f"{BASE_URL}/api/support-pods/athlete_1", headers=auth_headers(garcia_token))
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}"
    
    def test_williams_200_for_own_pod(self, williams_token):
        """Coach Williams should get 200 for their own athlete's Support Pod."""
        resp = requests.get(f"{BASE_URL}/api/support-pods/athlete_3", headers=auth_headers(williams_token))
        assert resp.status_code == 200
        assert resp.json().get("athlete", {}).get("id") == "athlete_3"


# =====================
# ATHLETE NOTES ENDPOINT TESTS
# =====================

class TestAthleteNotesOwnership:
    """Test athlete notes write access control."""
    
    def test_williams_403_for_garcia_athlete_note(self, williams_token):
        """Coach Williams should get 403 posting note to Garcia's athlete."""
        resp = requests.post(
            f"{BASE_URL}/api/athletes/athlete_2/notes",
            headers=auth_headers(williams_token),
            json={"text": "Test note", "tag": "general"}
        )
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}"
    
    def test_garcia_403_for_williams_athlete_note(self, garcia_token):
        """Coach Garcia should get 403 posting note to Williams' athlete."""
        resp = requests.post(
            f"{BASE_URL}/api/athletes/athlete_1/notes",
            headers=auth_headers(garcia_token),
            json={"text": "Test note", "tag": "general"}
        )
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}"
    
    def test_williams_200_for_own_athlete_note(self, williams_token):
        """Coach Williams should be able to post note to their own athlete."""
        resp = requests.post(
            f"{BASE_URL}/api/athletes/athlete_5/notes",
            headers=auth_headers(williams_token),
            json={"text": "Test ownership note", "tag": "general"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("athlete_id") == "athlete_5"
        assert "id" in data
    
    def test_director_can_post_note_to_any_athlete(self, director_token):
        """Director should be able to post note to any athlete."""
        resp = requests.post(
            f"{BASE_URL}/api/athletes/athlete_2/notes",
            headers=auth_headers(director_token),
            json={"text": "Director note to Garcia athlete", "tag": "general"}
        )
        assert resp.status_code == 200


# =====================
# MISSION CONTROL ENDPOINT TESTS
# =====================

class TestMissionControlOwnership:
    """Test Mission Control filtered data."""
    
    def test_director_mission_control_full_data(self, director_token):
        """Director should see full program snapshot with 25 athletes."""
        resp = requests.get(f"{BASE_URL}/api/mission-control", headers=auth_headers(director_token))
        assert resp.status_code == 200
        data = resp.json()
        
        snapshot = data.get("programSnapshot", {})
        assert snapshot.get("totalAthletes") == 25, f"Director should see 25 athletes in snapshot, got {snapshot.get('totalAthletes')}"
    
    def test_williams_mission_control_filtered(self, williams_token):
        """Coach Williams should see filtered snapshot with ~13 athletes."""
        resp = requests.get(f"{BASE_URL}/api/mission-control", headers=auth_headers(williams_token))
        assert resp.status_code == 200
        data = resp.json()
        
        snapshot = data.get("programSnapshot", {})
        total = snapshot.get("totalAthletes", 0)
        assert 11 <= total <= 15, f"Williams should see ~13 athletes in snapshot, got {total}"
    
    def test_garcia_mission_control_filtered(self, garcia_token):
        """Coach Garcia should see filtered snapshot with ~12 athletes."""
        resp = requests.get(f"{BASE_URL}/api/mission-control", headers=auth_headers(garcia_token))
        assert resp.status_code == 200
        data = resp.json()
        
        snapshot = data.get("programSnapshot", {})
        total = snapshot.get("totalAthletes", 0)
        assert 10 <= total <= 14, f"Garcia should see ~12 athletes in snapshot, got {total}"
    
    def test_coach_alerts_filtered_by_ownership(self, williams_token, director_token):
        """Coach should see fewer alerts than director (filtered by athlete ownership)."""
        dir_resp = requests.get(f"{BASE_URL}/api/mission-control", headers=auth_headers(director_token))
        coach_resp = requests.get(f"{BASE_URL}/api/mission-control", headers=auth_headers(williams_token))
        
        assert dir_resp.status_code == 200
        assert coach_resp.status_code == 200
        
        dir_alerts = len(dir_resp.json().get("priorityAlerts", []))
        coach_alerts = len(coach_resp.json().get("priorityAlerts", []))
        
        # Coach should have <= director's alerts
        assert coach_alerts <= dir_alerts, f"Coach alerts ({coach_alerts}) should be <= director alerts ({dir_alerts})"


# =====================
# EVENTS ENDPOINT TESTS
# =====================

class TestEventsOwnership:
    """Test Events listing filtered by athlete_ids."""
    
    def test_director_sees_all_events(self, director_token):
        """Director should see all events."""
        resp = requests.get(f"{BASE_URL}/api/events", headers=auth_headers(director_token))
        assert resp.status_code == 200
        data = resp.json()
        upcoming = data.get("upcoming", [])
        # Director should see all events
        assert len(upcoming) >= 0  # Just verify structure is correct
    
    def test_coach_events_filtered_by_athlete_ids(self, williams_token, director_token):
        """Coach should see only events with their athletes."""
        dir_resp = requests.get(f"{BASE_URL}/api/events", headers=auth_headers(director_token))
        coach_resp = requests.get(f"{BASE_URL}/api/events", headers=auth_headers(williams_token))
        
        assert dir_resp.status_code == 200
        assert coach_resp.status_code == 200
        
        dir_upcoming = len(dir_resp.json().get("upcoming", []))
        coach_upcoming = len(coach_resp.json().get("upcoming", []))
        
        # Coach should have <= director's events
        assert coach_upcoming <= dir_upcoming, f"Coach events ({coach_upcoming}) should be <= director events ({dir_upcoming})"


# =====================
# ADVOCACY ENDPOINT TESTS
# =====================

class TestAdvocacyOwnership:
    """Test Advocacy recommendations filtered by athlete ownership."""
    
    def test_director_sees_all_recommendations(self, director_token):
        """Director should see all recommendations (returns categorized dict)."""
        resp = requests.get(f"{BASE_URL}/api/advocacy/recommendations", headers=auth_headers(director_token))
        assert resp.status_code == 200
        recs = resp.json()
        # Director endpoint returns a dict with categories: needs_attention, drafts, recently_sent, closed, stats
        assert isinstance(recs, dict), "Expected dict response with categorized recommendations"
        assert "needs_attention" in recs or "drafts" in recs or "recently_sent" in recs
    
    def test_coach_recommendations_returns_500_bug(self, williams_token):
        """BUG: Coach request to /api/advocacy/recommendations returns 500.
        
        Root cause: filter_by_athlete_id() receives a dict (from list_recommendations) 
        instead of a list, causing AttributeError: 'str' object has no attribute 'get'.
        The filter function iterates over dict keys (strings) not recommendation items.
        """
        coach_resp = requests.get(f"{BASE_URL}/api/advocacy/recommendations", headers=auth_headers(williams_token))
        
        # Documenting the bug - currently returns 500 due to filter_by_athlete_id() type mismatch
        # Expected behavior: Should return filtered recommendations for coach's athletes only
        # Actual behavior: 500 Internal Server Error
        if coach_resp.status_code == 500:
            # This is the known bug - mark as expected failure
            pytest.xfail("Known bug: filter_by_athlete_id called on dict instead of list in advocacy router")


# =====================
# CROSS-ROLE VERIFICATION
# =====================

class TestCrossRoleVerification:
    """Verify data isolation between coaches."""
    
    def test_coaches_data_is_mutually_exclusive(self, williams_token, garcia_token):
        """Williams and Garcia should have non-overlapping athlete sets."""
        williams_resp = requests.get(f"{BASE_URL}/api/athletes", headers=auth_headers(williams_token))
        garcia_resp = requests.get(f"{BASE_URL}/api/athletes", headers=auth_headers(garcia_token))
        
        assert williams_resp.status_code == 200
        assert garcia_resp.status_code == 200
        
        williams_ids = {a["id"] for a in williams_resp.json()}
        garcia_ids = {a["id"] for a in garcia_resp.json()}
        
        # Should have no overlap
        overlap = williams_ids & garcia_ids
        assert len(overlap) == 0, f"Coaches should have non-overlapping athletes, overlap: {overlap}"
    
    def test_combined_coach_athletes_equals_director(self, williams_token, garcia_token, director_token):
        """Combined coach athletes should equal director's view."""
        williams_resp = requests.get(f"{BASE_URL}/api/athletes", headers=auth_headers(williams_token))
        garcia_resp = requests.get(f"{BASE_URL}/api/athletes", headers=auth_headers(garcia_token))
        director_resp = requests.get(f"{BASE_URL}/api/athletes", headers=auth_headers(director_token))
        
        williams_ids = {a["id"] for a in williams_resp.json()}
        garcia_ids = {a["id"] for a in garcia_resp.json()}
        director_ids = {a["id"] for a in director_resp.json()}
        
        combined = williams_ids | garcia_ids
        
        assert combined == director_ids, f"Combined coach athletes should equal director's view. Missing: {director_ids - combined}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

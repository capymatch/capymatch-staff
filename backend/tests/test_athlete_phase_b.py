"""
Phase B: Athlete Profile Editor, Public Profile Page, and Calendar Tests
Tests profile CRUD, share link, public profile endpoints, and calendar events
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ATHLETE_EMAIL = "emma.chen@athlete.capymatch.com"
ATHLETE_PASSWORD = "password123"
DIRECTOR_EMAIL = "director@capymatch.com"
DIRECTOR_PASSWORD = "director123"
EMMA_TENANT_ID = "tenant-9ec4167f-0874-4502-803f-6647b8f4cc26"
EMMA_SHORT_ID = "9ec4167f-0874-4502-803f-6647b8f4cc26"


@pytest.fixture(scope="module")
def athlete_token():
    """Get authentication token for athlete"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ATHLETE_EMAIL,
        "password": ATHLETE_PASSWORD
    })
    assert response.status_code == 200, f"Athlete login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def director_token():
    """Get authentication token for director"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": DIRECTOR_EMAIL,
        "password": DIRECTOR_PASSWORD
    })
    assert response.status_code == 200, f"Director login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture
def athlete_client(athlete_token):
    """Session with athlete auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {athlete_token}"
    })
    return session


@pytest.fixture
def director_client(director_token):
    """Session with director auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {director_token}"
    })
    return session


class TestAthleteProfile:
    """Test 1-3: Profile CRUD endpoints"""
    
    def test_1_get_profile_mapped_fields(self, athlete_client):
        """GET /api/athlete/profile — returns profile with mapped fields"""
        response = athlete_client.get(f"{BASE_URL}/api/athlete/profile")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        # Check required mapped fields exist
        expected_fields = [
            "athlete_name", "graduation_year", "position", "club_team",
            "height", "weight", "city", "state", "bio", "contact_email", "tenant_id"
        ]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        # Verify Emma's data (from manual testing notes)
        assert data["tenant_id"] == EMMA_TENANT_ID, f"Wrong tenant_id: {data['tenant_id']}"
        print(f"Profile data: athlete_name={data['athlete_name']}, position={data['position']}, height={data['height']}")
    
    def test_2_update_profile_fields(self, athlete_client):
        """PUT /api/athlete/profile — update bio, weight, jersey_number → verify fields persist"""
        # First get current profile
        get_response = athlete_client.get(f"{BASE_URL}/api/athlete/profile")
        assert get_response.status_code == 200
        original = get_response.json()
        
        # Update fields
        update_payload = {
            "bio": "Test bio update for Phase B testing",
            "weight": "150",
            "jersey_number": "99"
        }
        put_response = athlete_client.put(f"{BASE_URL}/api/athlete/profile", json=update_payload)
        assert put_response.status_code == 200, f"Update failed: {put_response.text}"
        
        updated = put_response.json()
        assert updated["bio"] == update_payload["bio"], f"Bio not updated: {updated['bio']}"
        assert updated["weight"] == update_payload["weight"], f"Weight not updated: {updated['weight']}"
        assert updated["jersey_number"] == update_payload["jersey_number"], f"Jersey not updated: {updated['jersey_number']}"
        
        # Verify persistence with GET
        verify_response = athlete_client.get(f"{BASE_URL}/api/athlete/profile")
        assert verify_response.status_code == 200
        verified = verify_response.json()
        assert verified["bio"] == update_payload["bio"]
        assert verified["weight"] == update_payload["weight"]
        assert verified["jersey_number"] == update_payload["jersey_number"]
        
        # Restore original values
        restore_payload = {
            "bio": original.get("bio", "Love volleyball"),
            "weight": original.get("weight", "145"),
            "jersey_number": original.get("jersey_number", "")
        }
        athlete_client.put(f"{BASE_URL}/api/athlete/profile", json=restore_payload)
        print("Profile update and persistence verified")
    
    def test_3_get_share_link(self, athlete_client):
        """GET /api/athlete/share-link — returns tenant_id for share link"""
        response = athlete_client.get(f"{BASE_URL}/api/athlete/share-link")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "tenant_id" in data, "Missing tenant_id in response"
        assert data["tenant_id"] == EMMA_TENANT_ID, f"Wrong tenant_id: {data['tenant_id']}"
        print(f"Share link tenant_id: {data['tenant_id']}")


class TestPublicProfile:
    """Test 4-5: Public profile endpoints (no auth required)"""
    
    def test_4_public_profile_returns_data(self):
        """GET /api/public/athlete/{tenant_id} — returns public profile without auth, excludes sat_score/act_score"""
        # No auth required for public endpoint
        response = requests.get(f"{BASE_URL}/api/public/athlete/{EMMA_TENANT_ID}")
        assert response.status_code == 200, f"Public profile failed: {response.text}"
        
        data = response.json()
        assert "profile" in data, "Missing profile in response"
        assert "upcoming_events" in data, "Missing upcoming_events in response"
        assert "past_events" in data, "Missing past_events in response"
        
        profile = data["profile"]
        # Check private fields are excluded
        assert "sat_score" not in profile, "sat_score should be excluded from public profile"
        assert "act_score" not in profile, "act_score should be excluded from public profile"
        
        # Verify profile has expected fields
        assert profile.get("tenant_id") == EMMA_TENANT_ID
        print(f"Public profile: {profile.get('athlete_name')}, events: {len(data['upcoming_events'])} upcoming, {len(data['past_events'])} past")
    
    def test_5_public_profile_not_found(self):
        """GET /api/public/athlete/nonexistent-tenant — returns 404"""
        response = requests.get(f"{BASE_URL}/api/public/athlete/tenant-nonexistent-12345")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("404 returned for nonexistent tenant as expected")


class TestRolePermissions:
    """Test 6: Director cannot access athlete profile"""
    
    def test_6_director_403_on_athlete_profile(self, director_client):
        """403: Director calling /api/athlete/profile should get 403"""
        response = director_client.get(f"{BASE_URL}/api/athlete/profile")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("Director correctly gets 403 on /api/athlete/profile")


class TestCalendarEvents:
    """Tests for calendar events CRUD"""
    
    def test_7_list_events(self, athlete_client):
        """GET /api/athlete/events — returns list of events"""
        response = athlete_client.get(f"{BASE_URL}/api/athlete/events")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        events = response.json()
        assert isinstance(events, list), "Events should be a list"
        # Emma has 3 seeded events per previous tests
        assert len(events) >= 3, f"Expected at least 3 events, got {len(events)}"
        
        # Check event structure
        if events:
            event = events[0]
            assert "event_id" in event
            assert "title" in event
            assert "start_date" in event
            assert "event_type" in event
        print(f"Found {len(events)} events")
    
    def test_8_create_event(self, athlete_client):
        """POST /api/athlete/events — create new event"""
        # Create a test event for showcase
        event_payload = {
            "title": "Test Showcase Event",
            "event_type": "Showcase",
            "location": "Austin, TX",
            "start_date": "2026-04-15",
            "end_date": "2026-04-16",
            "start_time": "09:00",
            "end_time": "17:00",
            "description": "Test event for Phase B testing"
        }
        
        response = athlete_client.post(f"{BASE_URL}/api/athlete/events", json=event_payload)
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        created = response.json()
        assert created["title"] == event_payload["title"]
        assert created["event_type"] == event_payload["event_type"]
        assert created["start_date"] == event_payload["start_date"]
        assert "event_id" in created
        
        # Verify event appears in list
        list_response = athlete_client.get(f"{BASE_URL}/api/athlete/events")
        events = list_response.json()
        event_ids = [e["event_id"] for e in events]
        assert created["event_id"] in event_ids, "Created event not in list"
        
        # Clean up - delete the test event
        delete_response = athlete_client.delete(f"{BASE_URL}/api/athlete/events/{created['event_id']}")
        assert delete_response.status_code == 200
        print(f"Event created with ID: {created['event_id']} and cleaned up")


class TestRegressionDashboard:
    """Test 14: Regression - Dashboard still works"""
    
    def test_9_dashboard_loads(self, athlete_client):
        """GET /api/athlete/dashboard — regression test"""
        response = athlete_client.get(f"{BASE_URL}/api/athlete/dashboard")
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        
        data = response.json()
        assert "profile" in data
        assert "stats" in data
        assert "upcoming_events" in data
        print("Dashboard regression passed")


class TestRegressionDirector:
    """Test 15: Regression - Director mission-control still works"""
    
    def test_10_director_mission_control(self, director_client):
        """Director login → /api/mission-control still works"""
        # Check mission control dashboard
        response = director_client.get(f"{BASE_URL}/api/mission-control")
        assert response.status_code == 200, f"Mission control failed: {response.text}"
        print("Director mission-control regression passed")

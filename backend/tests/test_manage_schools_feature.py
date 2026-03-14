"""
Test Manage Schools Feature - Backend API Tests
Tests for GET /api/events/schools/available, POST/DELETE /api/events/{id}/schools
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# ─── Test Fixtures ───────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get authentication token for coach user"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "coach.williams@capymatch.com",
        "password": "coach123"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


# ─── Test: GET /api/events/schools/available ─────────────────────────────────

class TestAvailableSchools:
    """Tests for GET /api/events/schools/available endpoint"""
    
    def test_get_available_schools_returns_list(self, authenticated_client):
        """GET /api/events/schools/available returns list of schools"""
        response = authenticated_client.get(f"{BASE_URL}/api/events/schools/available")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Available schools count: {len(data)}")
    
    def test_available_schools_has_10_plus_schools(self, authenticated_client):
        """Available schools list contains 10+ schools"""
        response = authenticated_client.get(f"{BASE_URL}/api/events/schools/available")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 10, f"Expected 10+ schools, got {len(data)}"
        print(f"Schools: {[s['name'] for s in data[:5]]}...")
    
    def test_available_schools_have_required_fields(self, authenticated_client):
        """Each school has id, name, and division fields"""
        response = authenticated_client.get(f"{BASE_URL}/api/events/schools/available")
        assert response.status_code == 200
        data = response.json()
        for school in data[:5]:  # Check first 5
            assert "id" in school, f"School missing 'id' field"
            assert "name" in school, f"School missing 'name' field"
            assert "division" in school, f"School missing 'division' field"
        print(f"Sample school: {data[0]}")
    
    def test_available_schools_contains_known_schools(self, authenticated_client):
        """Available schools contains expected schools: ucla, stanford, duke, etc."""
        response = authenticated_client.get(f"{BASE_URL}/api/events/schools/available")
        assert response.status_code == 200
        data = response.json()
        school_ids = [s['id'] for s in data]
        expected = ['ucla', 'stanford', 'duke', 'unc', 'georgetown', 'usc']
        for expected_id in expected:
            assert expected_id in school_ids, f"Expected school '{expected_id}' not found"
        print(f"All expected schools found: {expected}")
    
    def test_available_schools_requires_auth(self, api_client):
        """GET /api/events/schools/available requires authentication"""
        # Create a fresh session without auth
        fresh_client = requests.Session()
        fresh_client.headers.update({"Content-Type": "application/json"})
        response = fresh_client.get(f"{BASE_URL}/api/events/schools/available")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("Correctly requires authentication")


# ─── Test: POST /api/events/{id}/schools (Known School) ──────────────────────

class TestAddKnownSchool:
    """Tests for adding known schools from the predefined list"""
    
    def test_add_known_school_to_event(self, authenticated_client):
        """POST /api/events/{id}/schools with school_id adds school"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/events/event_1/schools",
            json={"school_id": "pepperdine"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "school_ids" in data
        assert "pepperdine" in data["school_ids"]
        print(f"Added pepperdine. School IDs: {data['school_ids']}")
    
    def test_add_duplicate_school_no_duplicate(self, authenticated_client):
        """Adding same school twice doesn't create duplicates"""
        # Add ucla first time
        authenticated_client.post(
            f"{BASE_URL}/api/events/event_1/schools",
            json={"school_id": "ucla"}
        )
        # Add ucla second time
        response = authenticated_client.post(
            f"{BASE_URL}/api/events/event_1/schools",
            json={"school_id": "ucla"}
        )
        assert response.status_code == 200
        data = response.json()
        # Count occurrences - should be exactly 1
        ucla_count = data["school_ids"].count("ucla")
        assert ucla_count == 1, f"Expected 1 ucla, got {ucla_count}"
        print("No duplicate schools created")
    
    def test_add_school_persists_in_prep_data(self, authenticated_client):
        """Added school appears in GET /api/events/{id}/prep targetSchools"""
        # Add boston-college
        authenticated_client.post(
            f"{BASE_URL}/api/events/event_1/schools",
            json={"school_id": "boston-college"}
        )
        # Verify in prep data
        response = authenticated_client.get(f"{BASE_URL}/api/events/event_1/prep")
        assert response.status_code == 200
        data = response.json()
        school_ids = [s['id'] for s in data.get('targetSchools', [])]
        assert "boston-college" in school_ids, "boston-college not found in prep targetSchools"
        print(f"School persists in prep data. Target schools: {school_ids}")
    
    def test_add_school_to_nonexistent_event(self, authenticated_client):
        """Adding school to non-existent event returns 404"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/events/nonexistent_event_xyz/schools",
            json={"school_id": "ucla"}
        )
        assert response.status_code == 404
        print("Correctly returns 404 for non-existent event")


# ─── Test: POST /api/events/{id}/schools (Custom School) ─────────────────────

class TestAddCustomSchool:
    """Tests for adding custom schools not in the predefined list"""
    
    def test_add_custom_school_by_name(self, authenticated_client):
        """POST /api/events/{id}/schools with school_name adds custom school"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/events/event_1/schools",
            json={"school_name": "TEST Custom University"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "school_ids" in data
        # Custom school should create slug ID
        assert "test-custom-university" in data["school_ids"]
        print(f"Custom school added. School IDs: {data['school_ids']}")
    
    def test_custom_school_appears_in_available_schools(self, authenticated_client):
        """Custom school is added to available schools list"""
        # Add a new custom school
        custom_name = "TEST New Academy"
        authenticated_client.post(
            f"{BASE_URL}/api/events/event_1/schools",
            json={"school_name": custom_name}
        )
        # Check available schools
        response = authenticated_client.get(f"{BASE_URL}/api/events/schools/available")
        assert response.status_code == 200
        data = response.json()
        school_names = [s['name'] for s in data]
        assert custom_name in school_names, f"Custom school '{custom_name}' not in available schools"
        print(f"Custom school appears in available schools list")
    
    def test_custom_school_persists_in_prep_data(self, authenticated_client):
        """Custom school appears in prep targetSchools"""
        # Add custom school
        custom_name = "TEST Prep Academy"
        authenticated_client.post(
            f"{BASE_URL}/api/events/event_1/schools",
            json={"school_name": custom_name}
        )
        # Verify in prep data
        response = authenticated_client.get(f"{BASE_URL}/api/events/event_1/prep")
        assert response.status_code == 200
        data = response.json()
        school_names = [s['name'] for s in data.get('targetSchools', [])]
        assert custom_name in school_names, f"Custom school not in targetSchools"
        print(f"Custom school persists in prep data")
    
    def test_add_school_without_id_or_name_fails(self, authenticated_client):
        """POST without school_id or school_name returns 400"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/events/event_1/schools",
            json={}
        )
        assert response.status_code == 400
        print("Correctly returns 400 when neither school_id nor school_name provided")


# ─── Test: DELETE /api/events/{id}/schools/{school_id} ───────────────────────

class TestRemoveSchool:
    """Tests for removing schools from events"""
    
    def test_remove_school_from_event(self, authenticated_client):
        """DELETE /api/events/{id}/schools/{school_id} removes school"""
        # First ensure school is added
        authenticated_client.post(
            f"{BASE_URL}/api/events/event_1/schools",
            json={"school_id": "georgetown"}
        )
        # Now remove it
        response = authenticated_client.delete(
            f"{BASE_URL}/api/events/event_1/schools/georgetown"
        )
        assert response.status_code == 200
        data = response.json()
        assert "school_ids" in data
        assert "georgetown" not in data["school_ids"]
        print(f"School removed. Remaining: {data['school_ids']}")
    
    def test_removed_school_disappears_from_prep(self, authenticated_client):
        """Removed school no longer appears in prep data"""
        # Add then remove duke
        authenticated_client.post(
            f"{BASE_URL}/api/events/event_2/schools",
            json={"school_id": "duke"}
        )
        authenticated_client.delete(f"{BASE_URL}/api/events/event_2/schools/duke")
        
        # Check prep data
        response = authenticated_client.get(f"{BASE_URL}/api/events/event_2/prep")
        assert response.status_code == 200
        data = response.json()
        school_ids = [s['id'] for s in data.get('targetSchools', [])]
        assert "duke" not in school_ids, "Duke should be removed from prep data"
        print("Removed school correctly disappears from prep data")
    
    def test_remove_nonexistent_school_no_error(self, authenticated_client):
        """Removing non-existent school doesn't cause error"""
        response = authenticated_client.delete(
            f"{BASE_URL}/api/events/event_1/schools/nonexistent-school-xyz"
        )
        assert response.status_code == 200
        print("No error when removing non-existent school")
    
    def test_remove_school_from_nonexistent_event(self, authenticated_client):
        """Removing school from non-existent event returns 404"""
        response = authenticated_client.delete(
            f"{BASE_URL}/api/events/nonexistent_event_xyz/schools/ucla"
        )
        assert response.status_code == 404
        print("Correctly returns 404 for non-existent event")


# ─── Test: Empty State Event ─────────────────────────────────────────────────

class TestEmptyStateEvent:
    """Tests for events with no schools (empty state)"""
    
    def test_event_with_no_schools(self, authenticated_client):
        """Event with no schools returns empty targetSchools array"""
        # Create new event for testing empty state
        response = authenticated_client.post(
            f"{BASE_URL}/api/events",
            json={
                "name": "TEST Empty Schools Event",
                "type": "camp",
                "date": "2026-03-15T10:00:00Z",
                "location": "Test City",
                "expectedSchools": 5
            }
        )
        assert response.status_code == 200
        new_event_id = response.json()["id"]
        
        # Check prep data shows empty schools
        prep_response = authenticated_client.get(f"{BASE_URL}/api/events/{new_event_id}/prep")
        assert prep_response.status_code == 200
        data = prep_response.json()
        assert data.get("targetSchools", []) == [], "Expected empty targetSchools"
        print(f"Empty state works. Event {new_event_id} has no schools")


# ─── Test: Regression - Manage Athletes Still Works ──────────────────────────

class TestRegressionManageAthletes:
    """Regression tests to ensure athletes feature still works"""
    
    def test_add_athlete_still_works(self, authenticated_client):
        """POST /api/events/{id}/athletes still works (regression)"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/events/event_1/athletes",
            json={"athlete_id": "athlete_1"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "athlete_ids" in data
        print("Manage Athletes: Add athlete still works")
    
    def test_remove_athlete_still_works(self, authenticated_client):
        """DELETE /api/events/{id}/athletes/{athlete_id} still works (regression)"""
        response = authenticated_client.delete(
            f"{BASE_URL}/api/events/event_1/athletes/athlete_1"
        )
        assert response.status_code == 200
        print("Manage Athletes: Remove athlete still works")

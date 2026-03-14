"""
Manage Athletes Feature Tests - Event Prep Page
Tests for POST /api/events/{id}/athletes and DELETE /api/events/{id}/athletes/{athlete_id} endpoints
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestManageAthletesFeature:
    """Tests for the Manage Athletes feature on Event Prep page"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup auth token for all tests"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "coach.williams@capymatch.com", "password": "coach123"}
        )
        assert login_response.status_code == 200, "Failed to login"
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
    
    # --- Test POST /events/{id}/athletes endpoint ---
    
    def test_add_athlete_to_event_success(self):
        """POST /events/{id}/athletes - Successfully add an athlete"""
        # Create a test event first
        event_data = {
            "name": f"TEST_ManageAthletes_{uuid.uuid4().hex[:8]}",
            "type": "showcase",
            "date": "2026-04-15",
            "location": "Test Location",
            "expectedSchools": 5
        }
        create_resp = requests.post(f"{BASE_URL}/api/events", json=event_data, headers=self.headers)
        assert create_resp.status_code == 200, f"Failed to create event: {create_resp.text}"
        event_id = create_resp.json()["id"]
        
        # Add athlete to event
        add_resp = requests.post(
            f"{BASE_URL}/api/events/{event_id}/athletes",
            json={"athlete_id": "athlete_1"},
            headers=self.headers
        )
        assert add_resp.status_code == 200, f"Failed to add athlete: {add_resp.text}"
        
        # Validate response structure
        data = add_resp.json()
        assert "athlete_ids" in data
        assert "athleteCount" in data
        assert "athlete_1" in data["athlete_ids"]
        assert data["athleteCount"] == 1
    
    def test_add_multiple_athletes_to_event(self):
        """POST /events/{id}/athletes - Add multiple athletes sequentially"""
        # Create test event
        event_data = {
            "name": f"TEST_MultiAthletes_{uuid.uuid4().hex[:8]}",
            "type": "camp",
            "date": "2026-04-20",
            "location": "Test Camp Location",
            "expectedSchools": 3
        }
        create_resp = requests.post(f"{BASE_URL}/api/events", json=event_data, headers=self.headers)
        assert create_resp.status_code == 200
        event_id = create_resp.json()["id"]
        
        # Add athlete_1
        resp1 = requests.post(
            f"{BASE_URL}/api/events/{event_id}/athletes",
            json={"athlete_id": "athlete_1"},
            headers=self.headers
        )
        assert resp1.status_code == 200
        assert resp1.json()["athleteCount"] == 1
        
        # Add athlete_2
        resp2 = requests.post(
            f"{BASE_URL}/api/events/{event_id}/athletes",
            json={"athlete_id": "athlete_2"},
            headers=self.headers
        )
        assert resp2.status_code == 200
        assert resp2.json()["athleteCount"] == 2
        assert set(resp2.json()["athlete_ids"]) == {"athlete_1", "athlete_2"}
        
        # Add athlete_3
        resp3 = requests.post(
            f"{BASE_URL}/api/events/{event_id}/athletes",
            json={"athlete_id": "athlete_3"},
            headers=self.headers
        )
        assert resp3.status_code == 200
        assert resp3.json()["athleteCount"] == 3
    
    def test_add_duplicate_athlete_no_error(self):
        """POST /events/{id}/athletes - Adding same athlete twice doesn't duplicate"""
        # Create test event
        event_data = {
            "name": f"TEST_DuplicateAthlete_{uuid.uuid4().hex[:8]}",
            "type": "showcase",
            "date": "2026-04-22",
            "location": "Test Location",
            "expectedSchools": 2
        }
        create_resp = requests.post(f"{BASE_URL}/api/events", json=event_data, headers=self.headers)
        assert create_resp.status_code == 200
        event_id = create_resp.json()["id"]
        
        # Add athlete_1 twice
        resp1 = requests.post(
            f"{BASE_URL}/api/events/{event_id}/athletes",
            json={"athlete_id": "athlete_1"},
            headers=self.headers
        )
        assert resp1.status_code == 200
        
        resp2 = requests.post(
            f"{BASE_URL}/api/events/{event_id}/athletes",
            json={"athlete_id": "athlete_1"},
            headers=self.headers
        )
        assert resp2.status_code == 200
        # Should still be 1, not 2
        assert resp2.json()["athleteCount"] == 1
        assert resp2.json()["athlete_ids"].count("athlete_1") == 1
    
    def test_add_athlete_to_nonexistent_event(self):
        """POST /events/{nonexistent}/athletes - Returns error for invalid event"""
        resp = requests.post(
            f"{BASE_URL}/api/events/nonexistent_event_123/athletes",
            json={"athlete_id": "athlete_1"},
            headers=self.headers
        )
        # Should return 200 with error in body (based on current API design)
        assert resp.status_code == 200
        data = resp.json()
        assert "error" in data
        assert data["error"] == "Event not found"
    
    # --- Test DELETE /events/{id}/athletes/{athlete_id} endpoint ---
    
    def test_remove_athlete_from_event_success(self):
        """DELETE /events/{id}/athletes/{athlete_id} - Successfully remove athlete"""
        # Create event and add athlete
        event_data = {
            "name": f"TEST_RemoveAthlete_{uuid.uuid4().hex[:8]}",
            "type": "tournament",
            "date": "2026-04-25",
            "location": "Test Location",
            "expectedSchools": 4
        }
        create_resp = requests.post(f"{BASE_URL}/api/events", json=event_data, headers=self.headers)
        event_id = create_resp.json()["id"]
        
        # Add athlete
        requests.post(
            f"{BASE_URL}/api/events/{event_id}/athletes",
            json={"athlete_id": "athlete_2"},
            headers=self.headers
        )
        
        # Remove athlete
        remove_resp = requests.delete(
            f"{BASE_URL}/api/events/{event_id}/athletes/athlete_2",
            headers=self.headers
        )
        assert remove_resp.status_code == 200
        data = remove_resp.json()
        assert "athlete_ids" in data
        assert "athleteCount" in data
        assert "athlete_2" not in data["athlete_ids"]
        assert data["athleteCount"] == 0
    
    def test_remove_athlete_updates_count_correctly(self):
        """DELETE /events/{id}/athletes/{athlete_id} - Count updates correctly"""
        # Create event with multiple athletes
        event_data = {
            "name": f"TEST_CountUpdate_{uuid.uuid4().hex[:8]}",
            "type": "camp",
            "date": "2026-04-28",
            "location": "Test Location",
            "expectedSchools": 3
        }
        create_resp = requests.post(f"{BASE_URL}/api/events", json=event_data, headers=self.headers)
        event_id = create_resp.json()["id"]
        
        # Add 3 athletes
        for athlete_id in ["athlete_1", "athlete_2", "athlete_3"]:
            requests.post(
                f"{BASE_URL}/api/events/{event_id}/athletes",
                json={"athlete_id": athlete_id},
                headers=self.headers
            )
        
        # Remove one athlete
        remove_resp = requests.delete(
            f"{BASE_URL}/api/events/{event_id}/athletes/athlete_2",
            headers=self.headers
        )
        assert remove_resp.status_code == 200
        assert remove_resp.json()["athleteCount"] == 2
        assert set(remove_resp.json()["athlete_ids"]) == {"athlete_1", "athlete_3"}
    
    def test_remove_nonexistent_athlete_no_error(self):
        """DELETE /events/{id}/athletes/{nonexistent} - Doesn't error for non-added athlete"""
        # Create event
        event_data = {
            "name": f"TEST_RemoveNonexistent_{uuid.uuid4().hex[:8]}",
            "type": "showcase",
            "date": "2026-04-30",
            "location": "Test Location",
            "expectedSchools": 2
        }
        create_resp = requests.post(f"{BASE_URL}/api/events", json=event_data, headers=self.headers)
        event_id = create_resp.json()["id"]
        
        # Try to remove athlete that was never added
        remove_resp = requests.delete(
            f"{BASE_URL}/api/events/{event_id}/athletes/athlete_99",
            headers=self.headers
        )
        assert remove_resp.status_code == 200
        assert remove_resp.json()["athleteCount"] == 0
    
    # --- Test event prep page data reflects athlete changes ---
    
    def test_added_athletes_appear_in_prep_data(self):
        """GET /events/{id}/prep - Athletes added via POST appear in prep page data"""
        # Create event
        event_data = {
            "name": f"TEST_PrepData_{uuid.uuid4().hex[:8]}",
            "type": "showcase",
            "date": "2026-05-05",
            "location": "Prep Test Location",
            "expectedSchools": 6
        }
        create_resp = requests.post(f"{BASE_URL}/api/events", json=event_data, headers=self.headers)
        event_id = create_resp.json()["id"]
        
        # Verify prep initially has no athletes
        prep_resp_before = requests.get(f"{BASE_URL}/api/events/{event_id}/prep", headers=self.headers)
        assert prep_resp_before.status_code == 200
        assert len(prep_resp_before.json().get("athletes", [])) == 0
        
        # Add athletes
        requests.post(
            f"{BASE_URL}/api/events/{event_id}/athletes",
            json={"athlete_id": "athlete_1"},
            headers=self.headers
        )
        requests.post(
            f"{BASE_URL}/api/events/{event_id}/athletes",
            json={"athlete_id": "athlete_4"},
            headers=self.headers
        )
        
        # Verify prep now has athletes
        prep_resp_after = requests.get(f"{BASE_URL}/api/events/{event_id}/prep", headers=self.headers)
        assert prep_resp_after.status_code == 200
        athletes = prep_resp_after.json().get("athletes", [])
        assert len(athletes) == 2
        
        # Verify athlete data structure
        athlete_ids = [a["id"] for a in athletes]
        assert "athlete_1" in athlete_ids
        assert "athlete_4" in athlete_ids
        
        # Verify athlete has expected fields
        athlete_1_data = next(a for a in athletes if a["id"] == "athlete_1")
        assert "full_name" in athlete_1_data
        assert "prepStatus" in athlete_1_data
        assert "photo_url" in athlete_1_data or athlete_1_data.get("photo_url") is not None
    
    def test_removed_athletes_disappear_from_prep_data(self):
        """GET /events/{id}/prep - Athletes removed via DELETE disappear from prep"""
        # Create event with athletes
        event_data = {
            "name": f"TEST_PrepRemove_{uuid.uuid4().hex[:8]}",
            "type": "camp",
            "date": "2026-05-10",
            "location": "Removal Test",
            "expectedSchools": 4
        }
        create_resp = requests.post(f"{BASE_URL}/api/events", json=event_data, headers=self.headers)
        event_id = create_resp.json()["id"]
        
        # Add athletes
        for aid in ["athlete_1", "athlete_2", "athlete_3"]:
            requests.post(
                f"{BASE_URL}/api/events/{event_id}/athletes",
                json={"athlete_id": aid},
                headers=self.headers
            )
        
        # Verify 3 athletes in prep
        prep_resp = requests.get(f"{BASE_URL}/api/events/{event_id}/prep", headers=self.headers)
        assert len(prep_resp.json().get("athletes", [])) == 3
        
        # Remove athlete_2
        requests.delete(f"{BASE_URL}/api/events/{event_id}/athletes/athlete_2", headers=self.headers)
        
        # Verify only 2 athletes remain
        prep_resp_after = requests.get(f"{BASE_URL}/api/events/{event_id}/prep", headers=self.headers)
        athletes = prep_resp_after.json().get("athletes", [])
        assert len(athletes) == 2
        athlete_ids = [a["id"] for a in athletes]
        assert "athlete_2" not in athlete_ids
        assert "athlete_1" in athlete_ids
        assert "athlete_3" in athlete_ids
    
    # --- Test MongoDB persistence ---
    
    def test_athlete_addition_persists_to_mongodb(self):
        """Verify athlete additions are persisted (checked via GET after POST)"""
        # Create event
        event_data = {
            "name": f"TEST_Persistence_{uuid.uuid4().hex[:8]}",
            "type": "tournament",
            "date": "2026-05-15",
            "location": "Persistence Test",
            "expectedSchools": 3
        }
        create_resp = requests.post(f"{BASE_URL}/api/events", json=event_data, headers=self.headers)
        event_id = create_resp.json()["id"]
        
        # Add athlete
        requests.post(
            f"{BASE_URL}/api/events/{event_id}/athletes",
            json={"athlete_id": "athlete_5"},
            headers=self.headers
        )
        
        # GET event detail to verify persistence
        get_resp = requests.get(f"{BASE_URL}/api/events/{event_id}", headers=self.headers)
        assert get_resp.status_code == 200
        assert "athlete_5" in get_resp.json().get("athlete_ids", [])
        assert get_resp.json().get("athleteCount") == 1
    
    # --- Test auth requirement ---
    
    def test_add_athlete_requires_auth(self):
        """POST /events/{id}/athletes - Requires authentication"""
        resp = requests.post(
            f"{BASE_URL}/api/events/event_1/athletes",
            json={"athlete_id": "athlete_1"},
            headers={"Content-Type": "application/json"}  # No auth header
        )
        assert resp.status_code in [401, 403], f"Expected 401/403 but got {resp.status_code}"
    
    def test_remove_athlete_requires_auth(self):
        """DELETE /events/{id}/athletes/{athlete_id} - Requires authentication"""
        resp = requests.delete(
            f"{BASE_URL}/api/events/event_1/athletes/athlete_1"
            # No auth header
        )
        assert resp.status_code in [401, 403], f"Expected 401/403 but got {resp.status_code}"


class TestMissionControlRoster:
    """Tests for the roster data used by AddAthletesDialog"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup auth token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "coach.williams@capymatch.com", "password": "coach123"}
        )
        assert login_response.status_code == 200
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_mission_control_returns_roster(self):
        """GET /mission-control - Returns myRoster array"""
        resp = requests.get(f"{BASE_URL}/api/mission-control", headers=self.headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "myRoster" in data
        assert isinstance(data["myRoster"], list)
        assert len(data["myRoster"]) > 0
    
    def test_roster_has_required_fields(self):
        """Roster athletes have fields needed by AddAthletesDialog"""
        resp = requests.get(f"{BASE_URL}/api/mission-control", headers=self.headers)
        roster = resp.json()["myRoster"]
        
        for athlete in roster:
            assert "id" in athlete, f"Missing 'id' in athlete data"
            assert "name" in athlete, f"Missing 'name' in athlete data"
            # photo_url may be optional but should have the field
            assert "photo_url" in athlete or athlete.get("photo_url") is None, "photo_url field expected"
            assert "grad_year" in athlete, f"Missing 'grad_year' in athlete data"
            assert "position" in athlete, f"Missing 'position' in athlete data"
    
    def test_roster_has_all_5_athletes(self):
        """Roster contains athletes athlete_1 through athlete_5"""
        resp = requests.get(f"{BASE_URL}/api/mission-control", headers=self.headers)
        roster = resp.json()["myRoster"]
        roster_ids = {a["id"] for a in roster}
        
        # Should have at least athlete_1 to athlete_5
        expected = {"athlete_1", "athlete_2", "athlete_3", "athlete_4", "athlete_5"}
        assert expected.issubset(roster_ids), f"Missing athletes. Found: {roster_ids}"

"""
Live Event Phase 3 Enhancements Backend Tests
Tests for Smart School Filtering, Quick Templates, Stats Bar, and Note CRUD
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for coach"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "coach.williams@capymatch.com",
        "password": "coach123"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Return auth headers dict"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestLiveEventPrepData:
    """Test /api/events/:eventId/prep - Smart school filtering support"""
    
    def test_prep_returns_athletes_with_target_schools(self, auth_headers):
        """Athletes should have targetSchoolsAtEvent for smart school filtering"""
        response = requests.get(f"{BASE_URL}/api/events/event_1/prep", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "athletes" in data
        assert len(data["athletes"]) == 3, f"event_1 should have 3 athletes, got {len(data['athletes'])}"
        
        # Verify each athlete has targetSchoolsAtEvent
        for athlete in data["athletes"]:
            assert "targetSchoolsAtEvent" in athlete, f"Athlete {athlete['id']} missing targetSchoolsAtEvent"
            assert isinstance(athlete["targetSchoolsAtEvent"], list)
            print(f"  - {athlete['full_name']}: targets {athlete['targetSchoolsAtEvent']}")
        
        print(f"✅ All {len(data['athletes'])} athletes have targetSchoolsAtEvent arrays")
    
    def test_prep_returns_target_schools_list(self, auth_headers):
        """Prep endpoint should return targetSchools list"""
        response = requests.get(f"{BASE_URL}/api/events/event_1/prep", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "targetSchools" in data
        assert len(data["targetSchools"]) > 0, "event_1 should have schools"
        
        # Verify school structure
        for school in data["targetSchools"]:
            assert "id" in school
            assert "name" in school
            assert "athleteOverlap" in school
        
        school_names = [s["name"] for s in data["targetSchools"]]
        print(f"✅ targetSchools has {len(data['targetSchools'])} schools: {school_names}")
    
    def test_event_1_has_expected_athletes(self, auth_headers):
        """event_1 should have athlete_1 (Emma), athlete_2 (Olivia), athlete_4 (Sarah)"""
        response = requests.get(f"{BASE_URL}/api/events/event_1/prep", headers=auth_headers)
        data = response.json()
        
        athlete_ids = [a["id"] for a in data["athletes"]]
        expected_ids = ["athlete_1", "athlete_2", "athlete_4"]
        
        for expected in expected_ids:
            assert expected in athlete_ids, f"Missing athlete {expected} in event_1"
        
        print(f"✅ event_1 has expected athletes: {athlete_ids}")


class TestLiveEventNotes:
    """Test /api/events/:eventId/notes - Notes CRUD for Live Stats Bar"""
    
    def test_get_notes_returns_sorted_by_captured_at(self, auth_headers):
        """GET /api/events/:eventId/notes should return notes sorted by captured_at desc"""
        response = requests.get(f"{BASE_URL}/api/events/event_1/notes", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        
        # Verify sorting (most recent first)
        if len(data) > 1:
            for i in range(len(data) - 1):
                assert data[i]["captured_at"] >= data[i+1]["captured_at"], \
                    "Notes should be sorted by captured_at descending"
        
        print(f"✅ GET /api/events/event_1/notes returns {len(data)} notes, sorted by captured_at desc")
        return len(data)
    
    def test_create_note_returns_full_object(self, auth_headers):
        """POST /api/events/:eventId/notes should return note with all fields"""
        note_payload = {
            "athlete_id": "athlete_1",
            "school_id": "ucla",
            "school_name": "UCLA",
            "interest_level": "warm",
            "note_text": "TEST_PHASE3: Strong performance on court",
            "follow_ups": ["send_film", "schedule_call"]
        }
        
        response = requests.post(f"{BASE_URL}/api/events/event_1/notes", json=note_payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify all expected fields present
        required_fields = ["id", "event_id", "athlete_id", "athlete_name", "school_id", 
                          "school_name", "interest_level", "note_text", "follow_ups", 
                          "captured_at", "captured_by"]
        
        for field in required_fields:
            assert field in data, f"Note missing field: {field}"
        
        assert data["event_id"] == "event_1"
        assert data["athlete_name"] is not None
        assert data["interest_level"] == "warm"
        
        print(f"✅ Created note {data['id']} with all required fields")
        return data
    
    def test_create_note_without_school(self, auth_headers):
        """Should be able to create note without school selected"""
        note_payload = {
            "athlete_id": "athlete_2",
            "school_id": None,
            "school_name": "",
            "interest_level": "none",
            "note_text": "TEST_PHASE3: General observation note",
            "follow_ups": []
        }
        
        response = requests.post(f"{BASE_URL}/api/events/event_1/notes", json=note_payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data["school_id"] is None
        assert data["school_name"] == ""
        
        print(f"✅ Created note without school selection")
    
    def test_interest_level_values(self, auth_headers):
        """Interest level should accept hot/warm/cool/none"""
        valid_levels = ["hot", "warm", "cool", "none"]
        
        for level in valid_levels:
            note_payload = {
                "athlete_id": "athlete_4",
                "interest_level": level,
                "note_text": f"TEST_PHASE3: Interest {level}",
                "follow_ups": []
            }
            response = requests.post(f"{BASE_URL}/api/events/event_1/notes", json=note_payload, headers=auth_headers)
            assert response.status_code == 200
            assert response.json()["interest_level"] == level
        
        print(f"✅ All interest levels work: {valid_levels}")
    
    def test_notes_count_increments_after_create(self, auth_headers):
        """Notes count should increment after creating a note"""
        # Get initial count
        initial = requests.get(f"{BASE_URL}/api/events/event_1/notes", headers=auth_headers).json()
        initial_count = len(initial)
        
        # Create note
        note_payload = {
            "athlete_id": "athlete_1",
            "interest_level": "hot",
            "note_text": "TEST_PHASE3: Counter increment test",
            "follow_ups": []
        }
        requests.post(f"{BASE_URL}/api/events/event_1/notes", json=note_payload, headers=auth_headers)
        
        # Get new count
        new = requests.get(f"{BASE_URL}/api/events/event_1/notes", headers=auth_headers).json()
        new_count = len(new)
        
        assert new_count == initial_count + 1, f"Count should increment: {initial_count} -> {new_count}"
        print(f"✅ Notes count incremented: {initial_count} -> {new_count}")
    
    def test_athlete_name_populated_from_store(self, auth_headers):
        """Created notes should have athlete_name populated"""
        note_payload = {
            "athlete_id": "athlete_1",
            "interest_level": "warm",
            "note_text": "TEST_PHASE3: Name population test",
            "follow_ups": []
        }
        
        response = requests.post(f"{BASE_URL}/api/events/event_1/notes", json=note_payload, headers=auth_headers)
        data = response.json()
        
        assert data["athlete_name"] is not None
        assert len(data["athlete_name"]) > 0
        assert data["athlete_name"] != "Unknown"
        
        print(f"✅ athlete_name populated: {data['athlete_name']}")


class TestLiveStatsSupport:
    """Test data needed for Live Stats Bar calculations"""
    
    def test_notes_have_athlete_id_for_coverage_tracking(self, auth_headers):
        """Notes should have athlete_id for athletes covered calculation"""
        response = requests.get(f"{BASE_URL}/api/events/event_1/notes", headers=auth_headers)
        data = response.json()
        
        for note in data:
            assert "athlete_id" in note, f"Note {note.get('id')} missing athlete_id"
        
        # Calculate unique athletes covered
        athletes_covered = set(n["athlete_id"] for n in data)
        print(f"✅ {len(athletes_covered)} unique athletes covered from {len(data)} notes")
    
    def test_notes_have_captured_at_for_rate_calc(self, auth_headers):
        """Notes should have captured_at for rate calculation"""
        response = requests.get(f"{BASE_URL}/api/events/event_1/notes", headers=auth_headers)
        data = response.json()
        
        for note in data:
            assert "captured_at" in note, f"Note {note.get('id')} missing captured_at"
            # Verify ISO format
            assert "T" in note["captured_at"], "captured_at should be ISO format"
        
        print(f"✅ All notes have captured_at timestamps for rate calculation")


class TestQuickTemplateSupport:
    """Test that note text from templates can be saved correctly"""
    
    def test_template_text_saved_correctly(self, auth_headers):
        """Template text should be saved exactly as provided"""
        templates = [
            "Strong performance today — stood out on the court.",
            "Coach showed clear interest, asked for more info.",
            "Coach wants to see updated highlight reel before next step.",
            "Had a productive conversation with coaching staff.",
            "Coach invited athlete for an unofficial campus visit.",
            "Displayed standout skill that caught attention."
        ]
        
        for template in templates:
            note_payload = {
                "athlete_id": "athlete_1",
                "interest_level": "warm",
                "note_text": template,
                "follow_ups": []
            }
            response = requests.post(f"{BASE_URL}/api/events/event_1/notes", json=note_payload, headers=auth_headers)
            assert response.status_code == 200
            assert response.json()["note_text"] == template, f"Template text not saved correctly"
        
        print(f"✅ All {len(templates)} template texts saved correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

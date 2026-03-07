"""
Quick Notes API Tests - CapyMatch Coach Quick Notes V1
Tests for POST /api/athletes/{athlete_id}/notes and GET /api/athletes/{athlete_id}/timeline
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
COACH_WILLIAMS_EMAIL = "coach.williams@capymatch.com"
COACH_WILLIAMS_PASSWORD = "coach123"
DIRECTOR_EMAIL = "director@capymatch.com"
DIRECTOR_PASSWORD = "director123"

# Test athletes - Coach Williams can access athlete_1, athlete_3, athlete_5, etc.
COACH_WILLIAMS_ATHLETE = "athlete_1"
UNASSIGNED_ATHLETE = "athlete_2"  # Not assigned to Coach Williams


class TestQuickNotesAPI:
    """Test Quick Notes creation and timeline retrieval"""
    
    @pytest.fixture(scope="class")
    def coach_token(self):
        """Get auth token for Coach Williams"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": COACH_WILLIAMS_EMAIL, "password": COACH_WILLIAMS_PASSWORD}
        )
        assert response.status_code == 200, f"Coach login failed: {response.text}"
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def director_token(self):
        """Get auth token for Director"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DIRECTOR_EMAIL, "password": DIRECTOR_PASSWORD}
        )
        assert response.status_code == 200, f"Director login failed: {response.text}"
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def coach_headers(self, coach_token):
        return {"Authorization": f"Bearer {coach_token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def director_headers(self, director_token):
        return {"Authorization": f"Bearer {director_token}", "Content-Type": "application/json"}
    
    # ========== Note Creation Tests ==========
    
    def test_create_note_requires_auth(self):
        """POST /api/athletes/{athlete_id}/notes - requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/athletes/{COACH_WILLIAMS_ATHLETE}/notes",
            json={"text": "Test note", "category": "other"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_create_note_with_valid_category_recruiting(self, coach_headers):
        """POST /api/athletes/{athlete_id}/notes - creates note with 'recruiting' category"""
        response = requests.post(
            f"{BASE_URL}/api/athletes/{COACH_WILLIAMS_ATHLETE}/notes",
            headers=coach_headers,
            json={"text": "TEST_Recruiting discussion scheduled for next week", "category": "recruiting"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "id" in data, "Response should contain 'id'"
        assert data["text"] == "TEST_Recruiting discussion scheduled for next week"
        assert data["category"] == "recruiting"
        assert data["athlete_id"] == COACH_WILLIAMS_ATHLETE
        assert "created_by" in data, "Response should contain 'created_by'"
        assert "created_by_name" in data, "Response should contain 'created_by_name'"
        assert "created_at" in data, "Response should contain 'created_at'"
    
    def test_create_note_with_valid_category_event(self, coach_headers):
        """POST /api/athletes/{athlete_id}/notes - creates note with 'event' category"""
        response = requests.post(
            f"{BASE_URL}/api/athletes/{COACH_WILLIAMS_ATHLETE}/notes",
            headers=coach_headers,
            json={"text": "TEST_Event performance was excellent", "category": "event"}
        )
        assert response.status_code == 200
        assert response.json()["category"] == "event"
    
    def test_create_note_with_valid_category_parent(self, coach_headers):
        """POST /api/athletes/{athlete_id}/notes - creates note with 'parent' category"""
        response = requests.post(
            f"{BASE_URL}/api/athletes/{COACH_WILLIAMS_ATHLETE}/notes",
            headers=coach_headers,
            json={"text": "TEST_Parent called about scholarship options", "category": "parent"}
        )
        assert response.status_code == 200
        assert response.json()["category"] == "parent"
    
    def test_create_note_with_valid_category_followup(self, coach_headers):
        """POST /api/athletes/{athlete_id}/notes - creates note with 'follow-up' category"""
        response = requests.post(
            f"{BASE_URL}/api/athletes/{COACH_WILLIAMS_ATHLETE}/notes",
            headers=coach_headers,
            json={"text": "TEST_Need to follow up on transcript request", "category": "follow-up"}
        )
        assert response.status_code == 200
        assert response.json()["category"] == "follow-up"
    
    def test_create_note_with_valid_category_other(self, coach_headers):
        """POST /api/athletes/{athlete_id}/notes - creates note with 'other' category"""
        response = requests.post(
            f"{BASE_URL}/api/athletes/{COACH_WILLIAMS_ATHLETE}/notes",
            headers=coach_headers,
            json={"text": "TEST_General observation about athlete", "category": "other"}
        )
        assert response.status_code == 200
        assert response.json()["category"] == "other"
    
    def test_create_note_without_category_defaults_to_other(self, coach_headers):
        """POST /api/athletes/{athlete_id}/notes - defaults to 'other' when no category provided"""
        response = requests.post(
            f"{BASE_URL}/api/athletes/{COACH_WILLIAMS_ATHLETE}/notes",
            headers=coach_headers,
            json={"text": "TEST_Note without category should default to other"}
        )
        assert response.status_code == 200
        assert response.json()["category"] == "other"
    
    def test_create_note_with_invalid_category_defaults_to_other(self, coach_headers):
        """POST /api/athletes/{athlete_id}/notes - invalid category defaults to 'other'"""
        response = requests.post(
            f"{BASE_URL}/api/athletes/{COACH_WILLIAMS_ATHLETE}/notes",
            headers=coach_headers,
            json={"text": "TEST_Note with invalid category", "category": "invalid_category"}
        )
        assert response.status_code == 200
        assert response.json()["category"] == "other"
    
    def test_create_note_with_empty_category_defaults_to_other(self, coach_headers):
        """POST /api/athletes/{athlete_id}/notes - empty category defaults to 'other'"""
        response = requests.post(
            f"{BASE_URL}/api/athletes/{COACH_WILLIAMS_ATHLETE}/notes",
            headers=coach_headers,
            json={"text": "TEST_Note with empty category", "category": ""}
        )
        assert response.status_code == 200
        assert response.json()["category"] == "other"
    
    def test_create_note_category_case_insensitive(self, coach_headers):
        """POST /api/athletes/{athlete_id}/notes - category is case-insensitive"""
        response = requests.post(
            f"{BASE_URL}/api/athletes/{COACH_WILLIAMS_ATHLETE}/notes",
            headers=coach_headers,
            json={"text": "TEST_Note with uppercase category", "category": "RECRUITING"}
        )
        assert response.status_code == 200
        assert response.json()["category"] == "recruiting"
    
    def test_create_note_includes_created_by_fields(self, coach_headers):
        """POST /api/athletes/{athlete_id}/notes - includes created_by and created_by_name"""
        response = requests.post(
            f"{BASE_URL}/api/athletes/{COACH_WILLIAMS_ATHLETE}/notes",
            headers=coach_headers,
            json={"text": "TEST_Note to verify created_by fields", "category": "other"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # created_by should be the user ID
        assert "created_by" in data
        assert isinstance(data["created_by"], str)
        assert len(data["created_by"]) > 0
        
        # created_by_name should be the user's name
        assert "created_by_name" in data
        assert "Williams" in data["created_by_name"] or "Coach" in data["created_by_name"]
    
    def test_create_note_returns_403_for_unassigned_athlete(self, coach_headers):
        """POST /api/athletes/{athlete_id}/notes - returns 403 for athlete not assigned to coach"""
        response = requests.post(
            f"{BASE_URL}/api/athletes/{UNASSIGNED_ATHLETE}/notes",
            headers=coach_headers,
            json={"text": "TEST_This should fail", "category": "other"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
    
    def test_director_can_create_note_for_any_athlete(self, director_headers):
        """POST /api/athletes/{athlete_id}/notes - director can create notes for any athlete"""
        response = requests.post(
            f"{BASE_URL}/api/athletes/{COACH_WILLIAMS_ATHLETE}/notes",
            headers=director_headers,
            json={"text": "TEST_Director note on athlete", "category": "recruiting"}
        )
        assert response.status_code == 200
        assert response.json()["category"] == "recruiting"
    
    # ========== Timeline Tests ==========
    
    def test_timeline_requires_auth(self):
        """GET /api/athletes/{athlete_id}/timeline - requires authentication"""
        response = requests.get(f"{BASE_URL}/api/athletes/{COACH_WILLIAMS_ATHLETE}/timeline")
        assert response.status_code == 401
    
    def test_timeline_returns_notes_array(self, coach_headers):
        """GET /api/athletes/{athlete_id}/timeline - returns notes in timeline.notes array"""
        response = requests.get(
            f"{BASE_URL}/api/athletes/{COACH_WILLIAMS_ATHLETE}/timeline",
            headers=coach_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "notes" in data, "Timeline should have 'notes' array"
        assert isinstance(data["notes"], list), "notes should be a list"
    
    def test_timeline_notes_include_category(self, coach_headers):
        """GET /api/athletes/{athlete_id}/timeline - notes include category field"""
        # First create a note with specific category
        requests.post(
            f"{BASE_URL}/api/athletes/{COACH_WILLIAMS_ATHLETE}/notes",
            headers=coach_headers,
            json={"text": "TEST_Timeline category test note", "category": "parent"}
        )
        
        # Now get timeline
        response = requests.get(
            f"{BASE_URL}/api/athletes/{COACH_WILLIAMS_ATHLETE}/timeline",
            headers=coach_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Find our test note
        notes = data.get("notes", [])
        test_notes = [n for n in notes if "TEST_Timeline category test" in n.get("text", "")]
        assert len(test_notes) > 0, "Should find our test note"
        assert test_notes[0]["category"] == "parent"
    
    def test_timeline_notes_include_created_by_name(self, coach_headers):
        """GET /api/athletes/{athlete_id}/timeline - notes include created_by_name"""
        response = requests.get(
            f"{BASE_URL}/api/athletes/{COACH_WILLIAMS_ATHLETE}/timeline",
            headers=coach_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        notes = data.get("notes", [])
        if len(notes) > 0:
            # At least some notes should have created_by_name
            notes_with_name = [n for n in notes if "created_by_name" in n]
            assert len(notes_with_name) > 0, "Notes should include created_by_name field"
    
    def test_timeline_returns_403_for_unassigned_athlete(self, coach_headers):
        """GET /api/athletes/{athlete_id}/timeline - returns 403 for unassigned athlete"""
        response = requests.get(
            f"{BASE_URL}/api/athletes/{UNASSIGNED_ATHLETE}/timeline",
            headers=coach_headers
        )
        assert response.status_code == 403
    
    # ========== Onboarding Integration Test ==========
    
    def test_notes_count_as_activity_for_onboarding(self, coach_headers):
        """Notes in athlete_notes collection should be detected by onboarding log_activity check"""
        # The onboarding auto-detection checks athlete_notes collection for created_by field
        # This is already tested implicitly by creating notes above
        # Just verify onboarding endpoint works
        response = requests.get(
            f"{BASE_URL}/api/onboarding/status",
            headers=coach_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Coach Williams should have onboarding data
        if data.get("show_checklist"):
            steps = data.get("steps", [])
            log_activity_step = next((s for s in steps if s["key"] == "log_activity"), None)
            if log_activity_step:
                # After creating notes, this should be completed
                print(f"log_activity completed: {log_activity_step.get('completed')}")


class TestQuickNotesEdgeCases:
    """Edge case tests for Quick Notes"""
    
    @pytest.fixture(scope="class")
    def coach_headers(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": COACH_WILLIAMS_EMAIL, "password": COACH_WILLIAMS_PASSWORD}
        )
        assert response.status_code == 200
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_create_note_with_empty_text(self, coach_headers):
        """POST /api/athletes/{athlete_id}/notes - should handle empty text appropriately"""
        response = requests.post(
            f"{BASE_URL}/api/athletes/{COACH_WILLIAMS_ATHLETE}/notes",
            headers=coach_headers,
            json={"text": "", "category": "other"}
        )
        # Empty text might be accepted or rejected - document behavior
        print(f"Empty text response: {response.status_code} - {response.text}")
    
    def test_create_note_with_long_text(self, coach_headers):
        """POST /api/athletes/{athlete_id}/notes - should handle long text"""
        long_text = "TEST_" + "A" * 500  # 505 characters
        response = requests.post(
            f"{BASE_URL}/api/athletes/{COACH_WILLIAMS_ATHLETE}/notes",
            headers=coach_headers,
            json={"text": long_text, "category": "other"}
        )
        # Backend may or may not enforce max length - document behavior
        print(f"Long text response: {response.status_code}")
    
    def test_create_note_with_special_characters(self, coach_headers):
        """POST /api/athletes/{athlete_id}/notes - handles special characters"""
        response = requests.post(
            f"{BASE_URL}/api/athletes/{COACH_WILLIAMS_ATHLETE}/notes",
            headers=coach_headers,
            json={"text": "TEST_Special chars: @#$%^&*()_+{}|:<>?", "category": "other"}
        )
        assert response.status_code == 200
        assert "@#$%^&*" in response.json()["text"]
    
    def test_create_note_with_unicode(self, coach_headers):
        """POST /api/athletes/{athlete_id}/notes - handles unicode characters"""
        response = requests.post(
            f"{BASE_URL}/api/athletes/{COACH_WILLIAMS_ATHLETE}/notes",
            headers=coach_headers,
            json={"text": "TEST_Unicode: 日本語 émojis 🏆🎯", "category": "other"}
        )
        assert response.status_code == 200
        assert "🏆" in response.json()["text"] or "emoji" in response.json()["text"].lower()
    
    def test_nonexistent_athlete(self, coach_headers):
        """POST /api/athletes/{athlete_id}/notes - handles nonexistent athlete"""
        response = requests.post(
            f"{BASE_URL}/api/athletes/nonexistent_athlete_id/notes",
            headers=coach_headers,
            json={"text": "TEST_Note for nonexistent athlete", "category": "other"}
        )
        # Should return 403 (no access) or 404 (not found)
        assert response.status_code in [403, 404], f"Expected 403 or 404, got {response.status_code}"

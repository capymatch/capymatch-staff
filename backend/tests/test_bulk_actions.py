"""
Test Roster Bulk Actions Endpoints
Tests for bulk-assign, bulk-remind, and bulk-note endpoints (Director-only)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestBulkActions:
    """Test bulk action endpoints for roster management"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication for director"""
        # Login as director
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "director@capymatch.com", "password": "director123"}
        )
        assert login_response.status_code == 200, f"Director login failed: {login_response.text}"
        self.director_token = login_response.json()["token"]
        self.director_headers = {
            "Authorization": f"Bearer {self.director_token}",
            "Content-Type": "application/json"
        }
        
        # Login as coach (for permission test)
        coach_login = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "coach@capymatch.com", "password": "coach123"}
        )
        if coach_login.status_code == 200:
            self.coach_token = coach_login.json()["token"]
            self.coach_headers = {
                "Authorization": f"Bearer {self.coach_token}",
                "Content-Type": "application/json"
            }
        else:
            self.coach_token = None
            self.coach_headers = None
    
    # ── GET Roster & Coaches ──
    
    def test_get_roster(self):
        """Test GET /api/roster returns athlete list with required fields"""
        response = requests.get(
            f"{BASE_URL}/api/roster",
            headers=self.director_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "athletes" in data
        assert "groups" in data
        assert "teamGroups" in data
        assert "ageGroups" in data
        assert "summary" in data
        
        # Verify athletes have required fields
        if len(data["athletes"]) > 0:
            athlete = data["athletes"][0]
            assert "id" in athlete
            assert "name" in athlete
            assert "coach_id" in athlete
            assert "momentum_label" in athlete
            assert "recruiting_stage" in athlete
    
    def test_get_coaches(self):
        """Test GET /api/roster/coaches returns coach list"""
        response = requests.get(
            f"{BASE_URL}/api/roster/coaches",
            headers=self.director_headers
        )
        assert response.status_code == 200
        coaches = response.json()
        
        assert isinstance(coaches, list)
        if len(coaches) > 0:
            coach = coaches[0]
            assert "id" in coach
            assert "name" in coach
    
    # ── Bulk Assign Tests ──
    
    def test_bulk_assign_success(self):
        """Test POST /api/roster/bulk-assign with valid data"""
        # Get coaches list
        coaches_response = requests.get(
            f"{BASE_URL}/api/roster/coaches",
            headers=self.director_headers
        )
        coaches = coaches_response.json()
        assert len(coaches) > 0, "No coaches available"
        
        # Get athletes
        roster_response = requests.get(
            f"{BASE_URL}/api/roster",
            headers=self.director_headers
        )
        athletes = roster_response.json()["athletes"]
        assert len(athletes) >= 2, "Not enough athletes to test"
        
        # Select 2 athletes
        athlete_ids = [athletes[0]["id"], athletes[1]["id"]]
        coach_id = coaches[0]["id"]
        
        # Test bulk assign
        response = requests.post(
            f"{BASE_URL}/api/roster/bulk-assign",
            headers=self.director_headers,
            json={"athlete_ids": athlete_ids, "coach_id": coach_id}
        )
        assert response.status_code == 200
        data = response.json()
        assert "updated" in data
        assert "coach_name" in data
        assert isinstance(data["updated"], int)
    
    def test_bulk_assign_missing_athlete_ids(self):
        """Test bulk-assign fails without athlete_ids"""
        response = requests.post(
            f"{BASE_URL}/api/roster/bulk-assign",
            headers=self.director_headers,
            json={"coach_id": "coach-williams"}
        )
        assert response.status_code == 400
        assert "athlete_ids" in response.json().get("detail", "").lower() or "required" in response.json().get("detail", "").lower()
    
    def test_bulk_assign_missing_coach_id(self):
        """Test bulk-assign fails without coach_id"""
        response = requests.post(
            f"{BASE_URL}/api/roster/bulk-assign",
            headers=self.director_headers,
            json={"athlete_ids": ["athlete_1"]}
        )
        assert response.status_code == 400
    
    def test_bulk_assign_invalid_coach(self):
        """Test bulk-assign fails with non-existent coach"""
        response = requests.post(
            f"{BASE_URL}/api/roster/bulk-assign",
            headers=self.director_headers,
            json={"athlete_ids": ["athlete_1"], "coach_id": "invalid-coach-id"}
        )
        assert response.status_code == 404
    
    # ── Bulk Remind Tests ──
    
    def test_bulk_remind_success(self):
        """Test POST /api/roster/bulk-remind with valid data"""
        response = requests.post(
            f"{BASE_URL}/api/roster/bulk-remind",
            headers=self.director_headers,
            json={
                "athlete_ids": ["athlete_1", "athlete_2"],
                "message": "TEST_Please follow up with these athletes."
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "sent" in data
        assert data["sent"] == 2
    
    def test_bulk_remind_missing_athlete_ids(self):
        """Test bulk-remind fails without athlete_ids"""
        response = requests.post(
            f"{BASE_URL}/api/roster/bulk-remind",
            headers=self.director_headers,
            json={"message": "Test message"}
        )
        assert response.status_code == 400
    
    def test_bulk_remind_empty_athlete_ids(self):
        """Test bulk-remind with empty athlete_ids array"""
        response = requests.post(
            f"{BASE_URL}/api/roster/bulk-remind",
            headers=self.director_headers,
            json={"athlete_ids": [], "message": "Test message"}
        )
        assert response.status_code == 400
    
    def test_bulk_remind_default_message(self):
        """Test bulk-remind works with default message"""
        response = requests.post(
            f"{BASE_URL}/api/roster/bulk-remind",
            headers=self.director_headers,
            json={"athlete_ids": ["athlete_1"]}
        )
        assert response.status_code == 200
        assert response.json()["sent"] == 1
    
    # ── Bulk Note Tests ──
    
    def test_bulk_note_success(self):
        """Test POST /api/roster/bulk-note with valid data"""
        response = requests.post(
            f"{BASE_URL}/api/roster/bulk-note",
            headers=self.director_headers,
            json={
                "athlete_ids": ["athlete_1", "athlete_2"],
                "note": "TEST_Director note for bulk action test."
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "added" in data
        assert data["added"] == 2
    
    def test_bulk_note_missing_athlete_ids(self):
        """Test bulk-note fails without athlete_ids"""
        response = requests.post(
            f"{BASE_URL}/api/roster/bulk-note",
            headers=self.director_headers,
            json={"note": "Test note"}
        )
        assert response.status_code == 400
    
    def test_bulk_note_missing_note(self):
        """Test bulk-note fails without note text"""
        response = requests.post(
            f"{BASE_URL}/api/roster/bulk-note",
            headers=self.director_headers,
            json={"athlete_ids": ["athlete_1"]}
        )
        assert response.status_code == 400
    
    def test_bulk_note_empty_note(self):
        """Test bulk-note fails with empty note"""
        response = requests.post(
            f"{BASE_URL}/api/roster/bulk-note",
            headers=self.director_headers,
            json={"athlete_ids": ["athlete_1"], "note": ""}
        )
        assert response.status_code == 400
    
    # ── Permission Tests ──
    
    def test_bulk_assign_coach_forbidden(self):
        """Test coach cannot access bulk-assign (director-only)"""
        if not self.coach_headers:
            pytest.skip("Coach login not available")
        
        response = requests.post(
            f"{BASE_URL}/api/roster/bulk-assign",
            headers=self.coach_headers,
            json={"athlete_ids": ["athlete_1"], "coach_id": "coach-williams"}
        )
        assert response.status_code == 403
    
    def test_bulk_remind_coach_forbidden(self):
        """Test coach cannot access bulk-remind (director-only)"""
        if not self.coach_headers:
            pytest.skip("Coach login not available")
        
        response = requests.post(
            f"{BASE_URL}/api/roster/bulk-remind",
            headers=self.coach_headers,
            json={"athlete_ids": ["athlete_1"], "message": "Test"}
        )
        assert response.status_code == 403
    
    def test_bulk_note_coach_forbidden(self):
        """Test coach cannot access bulk-note (director-only)"""
        if not self.coach_headers:
            pytest.skip("Coach login not available")
        
        response = requests.post(
            f"{BASE_URL}/api/roster/bulk-note",
            headers=self.coach_headers,
            json={"athlete_ids": ["athlete_1"], "note": "Test"}
        )
        assert response.status_code == 403
    
    def test_bulk_actions_unauthenticated(self):
        """Test bulk actions require authentication"""
        endpoints = [
            ("/api/roster/bulk-assign", {"athlete_ids": ["a"], "coach_id": "c"}),
            ("/api/roster/bulk-remind", {"athlete_ids": ["a"], "message": "m"}),
            ("/api/roster/bulk-note", {"athlete_ids": ["a"], "note": "n"}),
        ]
        
        for endpoint, payload in endpoints:
            response = requests.post(f"{BASE_URL}{endpoint}", json=payload)
            assert response.status_code == 401 or response.status_code == 403, \
                f"Endpoint {endpoint} should require auth, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

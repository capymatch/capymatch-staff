"""
Test: Unified Athletes Requiring Attention Section
- Tests that GET /api/mission-control returns myRoster with category, why, next_step fields
- Verifies correct count of athletes needing attention vs on track
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestMissionControlRosterSection:
    """Tests for the unified roster section in Mission Control"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as coach and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "coach.williams@capymatch.com",
            "password": "coach123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_mission_control_returns_my_roster(self):
        """GET /api/mission-control should return myRoster array"""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "myRoster" in data, "myRoster field missing from response"
        assert isinstance(data["myRoster"], list), "myRoster should be a list"

    def test_my_roster_has_required_fields(self):
        """Each athlete in myRoster should have category, why, next_step fields"""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=self.headers)
        data = response.json()
        
        for athlete in data["myRoster"]:
            assert "id" in athlete, f"Athlete missing 'id': {athlete}"
            assert "name" in athlete, f"Athlete missing 'name': {athlete}"
            assert "category" in athlete, f"Athlete missing 'category': {athlete}"
            assert "why" in athlete, f"Athlete missing 'why': {athlete}"
            assert "next_step" in athlete, f"Athlete missing 'next_step': {athlete}"

    def test_athletes_needing_attention_have_category(self):
        """Athletes needing attention should have a non-null category"""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=self.headers)
        data = response.json()
        
        needs_attention = [a for a in data["myRoster"] if a.get("category")]
        on_track = [a for a in data["myRoster"] if not a.get("category")]
        
        print(f"Athletes needing attention: {len(needs_attention)}")
        print(f"On track athletes: {len(on_track)}")
        
        # Per requirements: 5 need attention, 1 on track
        assert len(needs_attention) == 5, f"Expected 5 athletes needing attention, got {len(needs_attention)}"
        assert len(on_track) == 1, f"Expected 1 on track athlete, got {len(on_track)}"

    def test_correct_athletes_in_attention_list(self):
        """Verify correct athletes are in attention list"""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=self.headers)
        data = response.json()
        
        attention_names = [a["name"] for a in data["myRoster"] if a.get("category")]
        expected_names = ["Emma Chen", "Sarah Martinez", "Olivia Anderson", "Ava Davis", "Isabella Wilson"]
        
        for name in expected_names:
            assert name in attention_names, f"{name} should be in attention list"

    def test_sophia_garcia_is_on_track(self):
        """Verify Sophia Garcia is the only on-track athlete"""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=self.headers)
        data = response.json()
        
        on_track = [a for a in data["myRoster"] if not a.get("category")]
        assert len(on_track) == 1, "Should have exactly 1 on track athlete"
        assert on_track[0]["name"] == "Sophia Garcia", f"On track athlete should be Sophia Garcia, got {on_track[0]['name']}"

    def test_issue_badges_are_correct(self):
        """Verify athletes have correct issue category badges"""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=self.headers)
        data = response.json()
        
        valid_categories = ["momentum_drop", "blocker", "engagement_drop", "deadline_proximity", "ownership_gap", "readiness_issue"]
        
        for athlete in data["myRoster"]:
            if athlete.get("category"):
                assert athlete["category"] in valid_categories, f"Invalid category: {athlete['category']}"

    def test_next_step_not_empty_for_attention_athletes(self):
        """Athletes needing attention should have a non-empty next_step"""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=self.headers)
        data = response.json()
        
        for athlete in data["myRoster"]:
            if athlete.get("category"):
                assert athlete.get("next_step"), f"Athlete {athlete['name']} missing next_step"
                assert len(athlete["next_step"]) > 0, f"Athlete {athlete['name']} has empty next_step"

    def test_why_not_empty_for_attention_athletes(self):
        """Athletes needing attention should have a non-empty why reason"""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=self.headers)
        data = response.json()
        
        for athlete in data["myRoster"]:
            if athlete.get("category"):
                assert athlete.get("why"), f"Athlete {athlete['name']} missing why"
                assert len(athlete["why"]) > 0, f"Athlete {athlete['name']} has empty why"

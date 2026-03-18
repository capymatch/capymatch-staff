"""
Tests for Pipeline Hero 2-Tier System
Tests the /api/internal/programs/top-actions endpoint and verifies category classification
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ATHLETE_EMAIL = "emma.chen@athlete.capymatch.com"
ATHLETE_PASSWORD = "athlete123"


class TestPipelineHeroBackend:
    """Tests for 2-tier hero system backend APIs"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for authenticated requests"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ATHLETE_EMAIL, "password": ATHLETE_PASSWORD}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json()["token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

    def test_top_actions_endpoint_returns_200(self):
        """GET /api/internal/programs/top-actions should return 200"""
        response = requests.get(
            f"{BASE_URL}/api/internal/programs/top-actions",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "actions" in data

    def test_top_actions_returns_all_active_programs(self):
        """Top actions should return actions for all active programs"""
        response = requests.get(
            f"{BASE_URL}/api/internal/programs/top-actions",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should have at least some actions
        assert len(data["actions"]) > 0
        
        # Each action should have required fields
        for action in data["actions"]:
            assert "program_id" in action
            assert "university_name" in action
            assert "action_key" in action
            assert "category" in action
            assert "priority" in action
            assert "label" in action
            assert "owner" in action
            assert "explanation" in action
            assert "cta_label" in action

    def test_top_actions_category_classification(self):
        """Actions should be categorized into urgent, momentum, or on_track"""
        response = requests.get(
            f"{BASE_URL}/api/internal/programs/top-actions",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Define valid categories
        urgent_categories = {"coach_flag", "director_action", "past_due", "reply_needed", "due_today"}
        momentum_categories = {"cooling_off", "first_outreach"}
        on_track_category = {"on_track"}
        all_valid_categories = urgent_categories | momentum_categories | on_track_category
        
        # Verify all actions have valid categories
        for action in data["actions"]:
            assert action["category"] in all_valid_categories, \
                f"Invalid category '{action['category']}' for {action['university_name']}"

    def test_urgent_category_has_higher_priority_than_momentum(self):
        """Urgent items should have higher priority (lower number) than momentum items"""
        response = requests.get(
            f"{BASE_URL}/api/internal/programs/top-actions",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        urgent_categories = {"coach_flag", "director_action", "past_due", "reply_needed", "due_today"}
        momentum_categories = {"cooling_off", "first_outreach"}
        
        urgent_priorities = [a["priority"] for a in data["actions"] if a["category"] in urgent_categories]
        momentum_priorities = [a["priority"] for a in data["actions"] if a["category"] in momentum_categories]
        
        if urgent_priorities and momentum_priorities:
            max_urgent = max(urgent_priorities)
            min_momentum = min(momentum_priorities)
            assert max_urgent < min_momentum, \
                f"Urgent priority ({max_urgent}) should be less than momentum priority ({min_momentum})"

    def test_on_track_has_lowest_priority(self):
        """On track items should have the lowest priority (highest number)"""
        response = requests.get(
            f"{BASE_URL}/api/internal/programs/top-actions",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        on_track_priorities = [a["priority"] for a in data["actions"] if a["category"] == "on_track"]
        other_priorities = [a["priority"] for a in data["actions"] if a["category"] != "on_track"]
        
        if on_track_priorities and other_priorities:
            min_on_track = min(on_track_priorities)
            max_other = max(other_priorities)
            assert min_on_track >= max_other, \
                f"On-track priority ({min_on_track}) should be >= other priority ({max_other})"

    def test_owner_field_values(self):
        """Owner field should have valid values (athlete, coach, shared, parent)"""
        response = requests.get(
            f"{BASE_URL}/api/internal/programs/top-actions",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        valid_owners = {"athlete", "coach", "shared", "parent"}
        for action in data["actions"]:
            assert action["owner"] in valid_owners, \
                f"Invalid owner '{action['owner']}' for {action['university_name']}"

    def test_athlete_programs_endpoint(self):
        """GET /api/athlete/programs should return athlete's programs"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/programs",
            headers=self.headers
        )
        assert response.status_code == 200
        programs = response.json()
        assert isinstance(programs, list)
        assert len(programs) > 0
        
        # Verify program structure
        for program in programs:
            assert "program_id" in program
            assert "university_name" in program

    def test_match_scores_endpoint(self):
        """GET /api/match-scores should return match scores"""
        response = requests.get(
            f"{BASE_URL}/api/match-scores",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "scores" in data
        
        # If there are scores, verify structure
        if data["scores"]:
            for score in data["scores"]:
                assert "program_id" in score
                assert "match_score" in score

    def test_batch_metrics_endpoint(self):
        """POST /api/internal/programs/batch-metrics should return metrics"""
        # First get program IDs
        programs_response = requests.get(
            f"{BASE_URL}/api/athlete/programs",
            headers=self.headers
        )
        programs = programs_response.json()
        program_ids = [p["program_id"] for p in programs[:3]]  # Test with first 3
        
        response = requests.post(
            f"{BASE_URL}/api/internal/programs/batch-metrics",
            headers=self.headers,
            json={"program_ids": program_ids}
        )
        assert response.status_code == 200
        data = response.json()
        assert "metrics" in data

    def test_top_actions_sorted_by_priority(self):
        """Actions should be sorted by priority (ascending)"""
        response = requests.get(
            f"{BASE_URL}/api/internal/programs/top-actions",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        priorities = [a["priority"] for a in data["actions"]]
        assert priorities == sorted(priorities), "Actions should be sorted by priority"


class TestPipelineHeroCategories:
    """Test that specific action types map to correct categories"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for authenticated requests"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ATHLETE_EMAIL, "password": ATHLETE_PASSWORD}
        )
        assert login_response.status_code == 200
        self.token = login_response.json()["token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

    def test_coach_flag_is_urgent(self):
        """Coach flags should be in urgent category (Tier 1)"""
        response = requests.get(
            f"{BASE_URL}/api/internal/programs/top-actions",
            headers=self.headers
        )
        data = response.json()
        
        coach_flag_actions = [a for a in data["actions"] if a["category"] == "coach_flag"]
        for action in coach_flag_actions:
            assert action["action_key"] in ["coach_flag_reply_needed", "coach_flag_update_requested", 
                                           "coach_flag_general", "coach_assigned_action"]
            # Coach flags have priority 1-2
            assert action["priority"] <= 3

    def test_cooling_off_is_momentum(self):
        """Cooling off should be in momentum category (Tier 2)"""
        response = requests.get(
            f"{BASE_URL}/api/internal/programs/top-actions",
            headers=self.headers
        )
        data = response.json()
        
        cooling_off_actions = [a for a in data["actions"] if a["category"] == "cooling_off"]
        for action in cooling_off_actions:
            assert action["action_key"] in ["follow_up_this_week", "reengage_relationship"]
            # Momentum has priority 7
            assert action["priority"] == 7

    def test_no_action_needed_is_on_track(self):
        """No action needed should be in on_track category"""
        response = requests.get(
            f"{BASE_URL}/api/internal/programs/top-actions",
            headers=self.headers
        )
        data = response.json()
        
        on_track_actions = [a for a in data["actions"] if a["category"] == "on_track"]
        for action in on_track_actions:
            assert action["action_key"] == "no_action_needed"
            # On track has priority 8
            assert action["priority"] == 8


class TestPipelineHeroAuth:
    """Test authentication requirements for hero endpoints"""

    def test_top_actions_requires_auth(self):
        """Top actions endpoint should require authentication"""
        response = requests.get(f"{BASE_URL}/api/internal/programs/top-actions")
        assert response.status_code in [401, 403]

    def test_athlete_programs_requires_auth(self):
        """Athlete programs endpoint should require authentication"""
        response = requests.get(f"{BASE_URL}/api/athlete/programs")
        assert response.status_code in [401, 403]

    def test_match_scores_requires_auth(self):
        """Match scores endpoint should require authentication"""
        response = requests.get(f"{BASE_URL}/api/match-scores")
        assert response.status_code in [401, 403]

"""
Backend tests for Coach Pod Page Redesign
Tests the /api/support-pods/{athlete_id} endpoint returns correct data
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPodRedesignAPI:
    """Tests for support pod API - verifies data for redesigned UI"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "coach.williams@capymatch.com",
            "password": "coach123"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_support_pod_endpoint_returns_200(self):
        """Test GET /api/support-pods/athlete_3 returns 200"""
        response = requests.get(f"{BASE_URL}/api/support-pods/athlete_3", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_pod_top_action_structure(self):
        """Test pod_top_action has required fields for Hero Card"""
        response = requests.get(f"{BASE_URL}/api/support-pods/athlete_3", headers=self.headers)
        data = response.json()
        
        assert "pod_top_action" in data, "Missing pod_top_action field"
        top_action = data["pod_top_action"]
        
        # Required fields for Hero Card
        required_fields = ["urgency", "top_action", "explanation", "owner", "cta_label", "issue_type"]
        for field in required_fields:
            assert field in top_action, f"Missing {field} in pod_top_action"
        
        # Verify urgency is one of expected values
        assert top_action["urgency"] in ["critical", "follow_up", "on_track"], f"Invalid urgency: {top_action['urgency']}"
    
    def test_actions_for_next_actions_section(self):
        """Test actions array for Next Actions section"""
        response = requests.get(f"{BASE_URL}/api/support-pods/athlete_3", headers=self.headers)
        data = response.json()
        
        assert "actions" in data, "Missing actions field"
        actions = data["actions"]
        assert isinstance(actions, list), "actions should be a list"
        
        # Each action should have title, status, and optionally due_date, owner
        if len(actions) > 0:
            action = actions[0]
            assert "id" in action, "Action missing id"
            assert "title" in action, "Action missing title"
            assert "status" in action, "Action missing status"
    
    def test_athlete_for_quick_summary(self):
        """Test athlete data for Quick Summary section"""
        response = requests.get(f"{BASE_URL}/api/support-pods/athlete_3", headers=self.headers)
        data = response.json()
        
        assert "athlete" in data, "Missing athlete field"
        athlete = data["athlete"]
        
        # Required for Quick Summary cells
        required_fields = ["days_since_activity", "active_interest", "school_targets", "recruiting_stage"]
        for field in required_fields:
            assert field in athlete, f"Missing {field} in athlete"
    
    def test_pod_members_structure(self):
        """Test pod_members for Pod Members section"""
        response = requests.get(f"{BASE_URL}/api/support-pods/athlete_3", headers=self.headers)
        data = response.json()
        
        assert "pod_members" in data, "Missing pod_members field"
        members = data["pod_members"]
        assert isinstance(members, list), "pod_members should be a list"
        assert len(members) > 0, "Should have at least one pod member"
        
        # Check member structure
        member = members[0]
        required_fields = ["id", "name", "role", "role_label", "last_active"]
        for field in required_fields:
            assert field in member, f"Missing {field} in pod member"
    
    def test_recruiting_signals_for_key_signals(self):
        """Test recruiting_signals for Key Signals section"""
        response = requests.get(f"{BASE_URL}/api/support-pods/athlete_3", headers=self.headers)
        data = response.json()
        
        assert "recruiting_signals" in data, "Missing recruiting_signals field"
        signals = data["recruiting_signals"]
        assert isinstance(signals, list), "recruiting_signals should be a list"
        
        if len(signals) > 0:
            signal = signals[0]
            assert "id" in signal, "Signal missing id"
            assert "title" in signal, "Signal missing title"
            assert "type" in signal, "Signal missing type"
    
    def test_intervention_playbook_for_action_plan(self):
        """Test intervention_playbook for Action Plan section"""
        response = requests.get(f"{BASE_URL}/api/support-pods/athlete_3", headers=self.headers)
        data = response.json()
        
        assert "intervention_playbook" in data, "Missing intervention_playbook field"
        playbook = data["intervention_playbook"]
        
        if playbook is not None:
            assert "title" in playbook, "Playbook missing title"
            assert "steps" in playbook, "Playbook missing steps"
            assert isinstance(playbook["steps"], list), "steps should be a list"
    
    def test_recruiting_timeline_structure(self):
        """Test recruiting_timeline for Recruiting Timeline section"""
        response = requests.get(f"{BASE_URL}/api/support-pods/athlete_3", headers=self.headers)
        data = response.json()
        
        assert "recruiting_timeline" in data, "Missing recruiting_timeline field"
        timeline = data["recruiting_timeline"]
        assert isinstance(timeline, list), "recruiting_timeline should be a list"
        
        if len(timeline) > 0:
            milestone = timeline[0]
            assert "title" in milestone or "label" in milestone, "Milestone missing title/label"
    
    def test_timeline_for_activity_history(self):
        """Test timeline for Activity History section"""
        response = requests.get(f"{BASE_URL}/api/support-pods/athlete_3", headers=self.headers)
        data = response.json()
        
        assert "timeline" in data, "Missing timeline field"
        timeline = data["timeline"]
        
        # Timeline should have different event types
        expected_keys = ["notes", "assignments", "messages"]
        for key in expected_keys:
            assert key in timeline, f"Missing {key} in timeline"
    
    def test_upcoming_events_for_next_event_cell(self):
        """Test upcoming_events for Quick Summary next event cell"""
        response = requests.get(f"{BASE_URL}/api/support-pods/athlete_3", headers=self.headers)
        data = response.json()
        
        assert "upcoming_events" in data, "Missing upcoming_events field"
        events = data["upcoming_events"]
        assert isinstance(events, list), "upcoming_events should be a list"

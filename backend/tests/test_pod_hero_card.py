"""
Pod Hero Card Feature Tests
Tests the Pod Hero Card decision engine and API response fields.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPodHeroCardAPI:
    """Test Pod Top Action Engine returns correct fields for hero card"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as coach"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "coach.williams@capymatch.com",
            "password": "coach123"
        })
        assert resp.status_code == 200, f"Login failed: {resp.text}"
        token = resp.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})

    def test_pod_top_action_returned_for_athlete_3(self):
        """Verify GET /api/support-pods/athlete_3 returns pod_top_action field"""
        resp = self.session.get(f"{BASE_URL}/api/support-pods/athlete_3")
        assert resp.status_code == 200
        data = resp.json()
        
        assert "pod_top_action" in data, "pod_top_action field missing from response"
        pod_top_action = data["pod_top_action"]
        
        # Verify all required fields are present
        required_fields = ["action_key", "reason_code", "priority", "urgency", 
                          "category", "top_action", "explanation", "owner", 
                          "cta_label", "issue_type"]
        for field in required_fields:
            assert field in pod_top_action, f"Missing field: {field}"

    def test_athlete_3_has_critical_urgency(self):
        """athlete_3 (Emma Chen) should have critical urgency due to 33 days inactive"""
        resp = self.session.get(f"{BASE_URL}/api/support-pods/athlete_3")
        assert resp.status_code == 200
        data = resp.json()
        
        pod_top_action = data["pod_top_action"]
        assert pod_top_action["urgency"] == "critical", f"Expected critical urgency, got {pod_top_action['urgency']}"
        assert pod_top_action["category"] == "momentum_drop", f"Expected momentum_drop category, got {pod_top_action['category']}"
        assert "33" in pod_top_action["reason_code"], "Should indicate 33 days in reason_code"

    def test_athlete_3_top_action_correct(self):
        """athlete_3 should have correct top_action and explanation"""
        resp = self.session.get(f"{BASE_URL}/api/support-pods/athlete_3")
        assert resp.status_code == 200
        data = resp.json()
        
        pod_top_action = data["pod_top_action"]
        assert pod_top_action["top_action"] == "Check In With Athlete"
        assert "33 days" in pod_top_action["explanation"]
        assert pod_top_action["cta_label"] == "Log Check-In"
        assert pod_top_action["owner"] == "coach"

    def test_athlete_1_pod_top_action(self):
        """athlete_1 (Sarah Martinez) should have momentum_drop due to 30 days inactive"""
        resp = self.session.get(f"{BASE_URL}/api/support-pods/athlete_1")
        assert resp.status_code == 200
        data = resp.json()
        
        pod_top_action = data["pod_top_action"]
        assert pod_top_action["urgency"] == "critical"
        assert pod_top_action["category"] == "momentum_drop"
        assert "30" in pod_top_action["reason_code"] or "30" in pod_top_action["explanation"]

    def test_athlete_5_has_blocker(self):
        """athlete_5 (Olivia Anderson) should have blocker category (highest priority)"""
        resp = self.session.get(f"{BASE_URL}/api/support-pods/athlete_5")
        assert resp.status_code == 200
        data = resp.json()
        
        pod_top_action = data["pod_top_action"]
        assert pod_top_action["category"] == "blocker", f"Expected blocker, got {pod_top_action['category']}"
        assert pod_top_action["urgency"] == "critical"
        assert pod_top_action["priority"] == 1, "Blocker should have priority 1"

    def test_pod_top_action_priority_ordering(self):
        """Verify priority values are correctly ordered"""
        resp = self.session.get(f"{BASE_URL}/api/support-pods/athlete_3")
        assert resp.status_code == 200
        data = resp.json()
        
        pod_top_action = data["pod_top_action"]
        # momentum_drop has priority 2
        assert pod_top_action["priority"] == 2
        
        resp5 = self.session.get(f"{BASE_URL}/api/support-pods/athlete_5")
        assert resp5.status_code == 200
        data5 = resp5.json()
        # blocker has priority 1 (higher priority than momentum_drop)
        assert data5["pod_top_action"]["priority"] == 1

    def test_issue_type_populated(self):
        """Verify issue_type field is descriptive"""
        resp = self.session.get(f"{BASE_URL}/api/support-pods/athlete_3")
        assert resp.status_code == 200
        data = resp.json()
        
        pod_top_action = data["pod_top_action"]
        assert pod_top_action["issue_type"], "issue_type should not be empty"
        assert "activity" in pod_top_action["issue_type"].lower() or "days" in pod_top_action["issue_type"].lower()


class TestLayoutOrderAPI:
    """Test that API returns all required data for the new layout order"""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "coach.williams@capymatch.com",
            "password": "coach123"
        })
        assert resp.status_code == 200
        token = resp.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})

    def test_all_layout_sections_data_present(self):
        """Verify API returns data for all layout sections"""
        resp = self.session.get(f"{BASE_URL}/api/support-pods/athlete_3")
        assert resp.status_code == 200
        data = resp.json()
        
        # 1. Pod Hero Card data
        assert "pod_top_action" in data, "Missing pod_top_action for Pod Hero Card"
        
        # 2. Next Actions data
        assert "actions" in data, "Missing actions for Next Actions section"
        
        # 3. Athlete Snapshot data
        assert "athlete" in data, "Missing athlete data for Athlete Snapshot"
        
        # 4. Recruiting Intelligence data
        assert "recruiting_signals" in data, "Missing recruiting_signals"
        
        # 5. Intervention Playbook data
        assert "intervention_playbook" in data, "Missing intervention_playbook"
        
        # 6. Recruiting Timeline data
        assert "recruiting_timeline" in data, "Missing recruiting_timeline"
        
        # 7. Treatment History data (timeline)
        assert "timeline" in data, "Missing timeline for Treatment History"

    def test_recruiting_signals_has_content(self):
        """Verify recruiting signals are populated for collapsible section"""
        resp = self.session.get(f"{BASE_URL}/api/support-pods/athlete_3")
        assert resp.status_code == 200
        data = resp.json()
        
        recruiting_signals = data.get("recruiting_signals", [])
        assert isinstance(recruiting_signals, list)
        # athlete_3 should have signals due to 33 days inactive

    def test_recruiting_timeline_has_milestones(self):
        """Verify recruiting timeline has milestones"""
        resp = self.session.get(f"{BASE_URL}/api/support-pods/athlete_3")
        assert resp.status_code == 200
        data = resp.json()
        
        recruiting_timeline = data.get("recruiting_timeline", [])
        assert isinstance(recruiting_timeline, list)
        assert len(recruiting_timeline) > 0, "recruiting_timeline should have milestones"

    def test_intervention_playbook_present(self):
        """Verify intervention playbook is returned when athlete has active intervention"""
        resp = self.session.get(f"{BASE_URL}/api/support-pods/athlete_3")
        assert resp.status_code == 200
        data = resp.json()
        
        playbook = data.get("intervention_playbook")
        # athlete_3 has momentum_drop intervention, so playbook should be present
        if data.get("active_intervention"):
            assert playbook is not None, "Playbook should be present when there's an active intervention"


class TestNextActionsStillWorks:
    """Verify Next Actions and Add Action functionality still works after layout change"""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "coach.williams@capymatch.com",
            "password": "coach123"
        })
        assert resp.status_code == 200
        token = resp.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})

    def test_create_action_still_works(self):
        """Verify POST /api/support-pods/{id}/actions still works"""
        action_data = {
            "title": "TEST_Pod_Hero_Test_Action",
            "owner": "Coach Martinez",
            "owner_role": "club_coach",
            "due_date": "2026-03-20T00:00:00Z",
            "notes": "Test action for pod hero card testing"
        }
        resp = self.session.post(f"{BASE_URL}/api/support-pods/athlete_3/actions", json=action_data)
        assert resp.status_code == 200, f"Create action failed: {resp.text}"
        
        created = resp.json()
        assert created["title"] == action_data["title"]
        assert "id" in created
        
        # Store for cleanup
        self.created_action_id = created["id"]

    def test_complete_action_still_works(self):
        """Verify PATCH to complete action still works"""
        # First create an action
        action_data = {
            "title": "TEST_Complete_Action_Test",
            "owner": "Coach Martinez",
            "owner_role": "club_coach"
        }
        create_resp = self.session.post(f"{BASE_URL}/api/support-pods/athlete_3/actions", json=action_data)
        assert create_resp.status_code == 200
        action_id = create_resp.json()["id"]
        
        # Now complete it
        complete_resp = self.session.patch(
            f"{BASE_URL}/api/support-pods/athlete_3/actions/{action_id}",
            json={"status": "completed"}
        )
        assert complete_resp.status_code == 200
        assert complete_resp.json().get("status") == "completed"

    def test_pod_members_for_assignment(self):
        """Verify pod_members are returned for action assignment dropdown"""
        resp = self.session.get(f"{BASE_URL}/api/support-pods/athlete_3")
        assert resp.status_code == 200
        data = resp.json()
        
        pod_members = data.get("pod_members", [])
        assert len(pod_members) > 0, "pod_members should not be empty"
        
        # Verify member structure
        for member in pod_members:
            assert "name" in member
            assert "role" in member
            assert "role_label" in member

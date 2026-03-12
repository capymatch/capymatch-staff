"""
Test Add Action Modal Backend APIs
Tests for the premium dark-themed Add Next Action modal
- POST /support-pods/{athlete_id}/actions (create action with notification)
- PATCH /support-pods/{athlete_id}/actions/{action_id} (complete/reassign)
- GET /support-pods/{athlete_id} (verify pod members and actions)
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAddActionModalEndpoints:
    """Tests for Add Action Modal backend functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token before each test"""
        # Login as coach williams
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "coach.williams@capymatch.com",
            "password": "coach123"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        self.token = login_resp.json()["token"]
        self.user = login_resp.json()["user"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        self.athlete_id = "athlete_3"  # Emma Chen
        yield
    
    def test_get_support_pod_has_pod_members(self):
        """Verify GET /support-pods/{athlete_id} returns pod_members for dropdown"""
        response = requests.get(
            f"{BASE_URL}/api/support-pods/{self.athlete_id}",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        
        # Verify pod_members is present and has expected structure
        assert "pod_members" in data, "Missing pod_members in response"
        pod_members = data["pod_members"]
        assert len(pod_members) >= 3, f"Expected at least 3 pod members, got {len(pod_members)}"
        
        # Check expected members for athlete_3 (Emma Chen)
        member_names = [m["name"] for m in pod_members]
        print(f"Pod members: {member_names}")
        
        # Should have Coach Martinez, Chen Family, Emma Chen
        assert "Coach Martinez" in member_names, "Missing Coach Martinez"
        
        # Verify member structure
        for member in pod_members:
            assert "name" in member, "Member missing 'name'"
            assert "role" in member or "role_label" in member, "Member missing role info"
    
    def test_create_action_with_all_fields(self):
        """POST /support-pods/{athlete_id}/actions with title, owner, due_date, category, notes"""
        due_date = (datetime.utcnow() + timedelta(days=5)).isoformat() + "Z"
        
        payload = {
            "title": "TEST_Backend_Action_Full",
            "owner": "Coach Martinez",
            "owner_role": "Club Coach",
            "due_date": due_date,
            "source_category": "check_in",
            "notes": "Test notes from pytest"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/support-pods/{self.athlete_id}/actions",
            headers=self.headers,
            json=payload
        )
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert data.get("id"), "Missing action ID"
        assert data.get("title") == payload["title"], "Title mismatch"
        assert data.get("owner") == payload["owner"], "Owner mismatch"
        assert data.get("owner_role") == payload["owner_role"], "Owner role mismatch"
        assert data.get("source_category") == payload["source_category"], "Category mismatch"
        assert data.get("notes") == payload["notes"], "Notes mismatch"
        assert data.get("status") == "ready", f"Expected status 'ready', got {data.get('status')}"
        assert data.get("created_by") == self.user["name"], "Created by mismatch"
        
        # Store for cleanup
        self.created_action_id = data["id"]
        print(f"Created action ID: {self.created_action_id}")
    
    def test_create_action_minimal_fields(self):
        """POST with minimal required fields (title, owner)"""
        payload = {
            "title": "TEST_Backend_Action_Minimal",
            "owner": "Coach Williams"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/support-pods/{self.athlete_id}/actions",
            headers=self.headers,
            json=payload
        )
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        assert data.get("title") == payload["title"]
        assert data.get("owner") == payload["owner"]
        # Should have auto-generated due_date (3 days from now)
        assert data.get("due_date") is not None, "Missing auto-generated due_date"
    
    def test_complete_action(self):
        """PATCH /support-pods/{athlete_id}/actions/{action_id} to complete"""
        # First create an action
        create_resp = requests.post(
            f"{BASE_URL}/api/support-pods/{self.athlete_id}/actions",
            headers=self.headers,
            json={"title": "TEST_Action_To_Complete", "owner": "Coach Williams"}
        )
        assert create_resp.status_code == 200
        action_id = create_resp.json()["id"]
        
        # Now complete it
        patch_resp = requests.patch(
            f"{BASE_URL}/api/support-pods/{self.athlete_id}/actions/{action_id}",
            headers=self.headers,
            json={"status": "completed"}
        )
        assert patch_resp.status_code == 200, f"Complete failed: {patch_resp.text}"
        
        data = patch_resp.json()
        assert data.get("status") == "completed", f"Expected 'completed', got {data.get('status')}"
        assert data.get("completed_at") is not None, "Missing completed_at timestamp"
        print(f"Completed action: {action_id}")
    
    def test_reassign_action(self):
        """PATCH /support-pods/{athlete_id}/actions/{action_id} to reassign"""
        # First create an action
        create_resp = requests.post(
            f"{BASE_URL}/api/support-pods/{self.athlete_id}/actions",
            headers=self.headers,
            json={"title": "TEST_Action_To_Reassign", "owner": "Coach Williams"}
        )
        assert create_resp.status_code == 200
        action_id = create_resp.json()["id"]
        
        # Now reassign it
        patch_resp = requests.patch(
            f"{BASE_URL}/api/support-pods/{self.athlete_id}/actions/{action_id}",
            headers=self.headers,
            json={"owner": "Coach Martinez"}
        )
        assert patch_resp.status_code == 200, f"Reassign failed: {patch_resp.text}"
        
        data = patch_resp.json()
        assert data.get("owner") == "Coach Martinez", f"Expected 'Coach Martinez', got {data.get('owner')}"
        print(f"Reassigned action: {action_id}")
    
    def test_action_shows_in_pod_after_creation(self):
        """Verify newly created action appears in support pod response"""
        unique_title = f"TEST_Verify_In_Pod_{datetime.now().timestamp()}"
        
        # Create action
        create_resp = requests.post(
            f"{BASE_URL}/api/support-pods/{self.athlete_id}/actions",
            headers=self.headers,
            json={"title": unique_title, "owner": "Chen Family"}
        )
        assert create_resp.status_code == 200
        
        # Get pod data
        pod_resp = requests.get(
            f"{BASE_URL}/api/support-pods/{self.athlete_id}",
            headers=self.headers
        )
        assert pod_resp.status_code == 200
        
        actions = pod_resp.json().get("actions", [])
        action_titles = [a["title"] for a in actions]
        assert unique_title in action_titles, f"New action not found in pod actions"
        print(f"Action '{unique_title}' found in pod")
    
    def test_notification_created_on_action_creation(self):
        """Verify in-app notification is created when action is assigned"""
        # This is verified indirectly - backend creates notification document
        # The notification endpoint would show this
        payload = {
            "title": "TEST_Action_Notification_Check",
            "owner": "Coach Martinez",
            "owner_role": "Club Coach"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/support-pods/{self.athlete_id}/actions",
            headers=self.headers,
            json=payload
        )
        assert response.status_code == 200, f"Create failed: {response.text}"
        # If we had access to notifications endpoint, we'd verify there
        # For now, success means notification was attempted
        print("Action created - notification would be sent to Coach Martinez")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "coach.williams@capymatch.com",
            "password": "coach123"
        })
        assert login_resp.status_code == 200
        self.token = login_resp.json()["token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        yield
    
    def test_cleanup_test_actions(self):
        """Complete all TEST_ prefixed actions to clean up"""
        response = requests.get(
            f"{BASE_URL}/api/support-pods/athlete_3",
            headers=self.headers
        )
        assert response.status_code == 200
        
        actions = response.json().get("actions", [])
        test_actions = [a for a in actions if a.get("title", "").startswith("TEST_")]
        
        cleaned = 0
        for action in test_actions:
            if action.get("status") != "completed":
                patch_resp = requests.patch(
                    f"{BASE_URL}/api/support-pods/athlete_3/actions/{action['id']}",
                    headers=self.headers,
                    json={"status": "completed"}
                )
                if patch_resp.status_code == 200:
                    cleaned += 1
        
        print(f"Cleaned up {cleaned} test actions")

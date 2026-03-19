"""
Tests for Autopilot feature - POST /api/autopilot/execute endpoint.

Tests autopilot suggested actions (check_in, follow_up, request_doc, assign_coach)
which allow directors to approve pre-templated messages with one click.
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestAutopilotExecute:
    """Test POST /api/autopilot/execute endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as director and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as director
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "director@capymatch.com",
            "password": "director123"
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            token = data.get("access_token") or data.get("token")
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
                self.token = token
            else:
                pytest.skip("No token in login response")
        else:
            pytest.skip(f"Login failed: {login_response.status_code}")
    
    def test_check_in_action_success(self):
        """Test check_in action creates a message and returns success"""
        payload = {
            "action_type": "check_in",
            "athlete_id": "athlete_1",
            "athlete_name": "Marcus Johnson",
            "school_name": "UCLA",
            "message_body": None  # Use default template
        }
        
        response = self.session.post(f"{BASE_URL}/api/autopilot/execute", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert data.get("status") == "completed", f"Expected status 'completed', got {data.get('status')}"
        assert data.get("action_type") == "check_in", f"Expected action_type 'check_in', got {data.get('action_type')}"
        assert "message" in data, "Response should contain 'message' field"
        assert "detail" in data, "Response should contain 'detail' field"
        
        # Verify the detail contains the athlete name
        assert "Marcus Johnson" in data.get("detail", ""), f"Detail should mention athlete name: {data.get('detail')}"
        print(f"✓ check_in action completed: {data.get('detail')}")
    
    def test_follow_up_action_success(self):
        """Test follow_up action creates a message and returns success"""
        payload = {
            "action_type": "follow_up",
            "athlete_id": "athlete_2",
            "athlete_name": "Olivia Anderson",
            "school_name": "Stanford",
            "message_body": "Hi Olivia, just following up on our last conversation. Let us know how things are progressing."
        }
        
        response = self.session.post(f"{BASE_URL}/api/autopilot/execute", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "completed"
        assert data.get("action_type") == "follow_up"
        assert data.get("message") == "Message sent"
        assert "Olivia Anderson" in data.get("detail", "")
        print(f"✓ follow_up action completed: {data.get('detail')}")
    
    def test_request_doc_action_success(self):
        """Test request_doc action creates a message and returns success"""
        payload = {
            "action_type": "request_doc",
            "athlete_id": "athlete_3",
            "athlete_name": "Sophia Chen",
            "school_name": None,
            "message_body": None  # Use default template
        }
        
        response = self.session.post(f"{BASE_URL}/api/autopilot/execute", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "completed"
        assert data.get("action_type") == "request_doc"
        assert data.get("message") == "Message sent"
        print(f"✓ request_doc action completed: {data.get('detail')}")
    
    def test_assign_coach_action_returns_redirect(self):
        """Test assign_coach action returns redirect (does not auto-execute)"""
        payload = {
            "action_type": "assign_coach",
            "athlete_id": "athlete_4",
            "athlete_name": "Emily Williams",
            "school_name": None
        }
        
        response = self.session.post(f"{BASE_URL}/api/autopilot/execute", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "completed"
        assert data.get("action_type") == "assign_coach"
        # For assign_coach, it redirects to roster instead of sending a message
        assert data.get("message") == "Redirecting to roster"
        assert data.get("redirect") == "/roster"
        print(f"✓ assign_coach action returns redirect to roster")
    
    def test_invalid_action_type_returns_400(self):
        """Test unknown action_type returns 400 error"""
        payload = {
            "action_type": "unknown_action",
            "athlete_id": "athlete_1",
            "athlete_name": "Test Athlete"
        }
        
        response = self.session.post(f"{BASE_URL}/api/autopilot/execute", json=payload)
        
        assert response.status_code == 400, f"Expected 400 for invalid action_type, got {response.status_code}"
        print(f"✓ Invalid action_type correctly returns 400")
    
    def test_autopilot_without_auth_returns_401(self):
        """Test autopilot execute without auth returns 401"""
        # Use fresh session without auth
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        payload = {
            "action_type": "check_in",
            "athlete_id": "athlete_1",
            "athlete_name": "Test Athlete"
        }
        
        response = session.post(f"{BASE_URL}/api/autopilot/execute", json=payload)
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print(f"✓ Unauthenticated request correctly returns 401")


class TestDirectorInboxWithAutopilot:
    """Test Director Inbox API still works properly"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as director and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as director
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "director@capymatch.com",
            "password": "director123"
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            token = data.get("access_token") or data.get("token")
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip(f"Login failed: {login_response.status_code}")
    
    def test_director_inbox_returns_items(self):
        """Test /api/director-inbox returns inbox items"""
        response = self.session.get(f"{BASE_URL}/api/director-inbox")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "items" in data, "Response should contain 'items'"
        assert "count" in data, "Response should contain 'count'"
        
        items = data.get("items", [])
        count = data.get("count", 0)
        
        print(f"✓ Director inbox returned {len(items)} items (count: {count})")
        
        # Verify items have expected fields for autopilot
        if items:
            item = items[0]
            assert "athleteName" in item, "Item should have athleteName"
            assert "issues" in item, "Item should have issues array"
            assert "cta" in item, "Item should have cta object"
            print(f"✓ Sample item: {item.get('athleteName')} - {item.get('issues')}")
    
    def test_inbox_items_have_nudge_related_issues(self):
        """Test inbox items have issues that map to autopilot nudges"""
        response = self.session.get(f"{BASE_URL}/api/director-inbox")
        
        assert response.status_code == 200
        
        data = response.json()
        items = data.get("items", [])
        
        # Known issues that should map to autopilot nudges
        nudge_issues = {"Awaiting reply", "No activity", "Missing requirement", "No coach assigned", "Needs follow-up", "Needs attention"}
        
        found_issues = set()
        for item in items:
            for issue in item.get("issues", []):
                if issue in nudge_issues:
                    found_issues.add(issue)
        
        print(f"✓ Found autopilot-compatible issues: {found_issues}")
        
        # At least some items should have issues that can be auto-actioned
        assert len(found_issues) > 0, "Expected at least one issue type that maps to autopilot nudges"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

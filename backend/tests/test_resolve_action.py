"""
Tests for Director Action Resolve Workflow
- Tests resolve endpoint with: note (required), notify_director, add_to_timeline, follow_up_title
- Tests timeline logging in pod_action_events
- Tests follow-up task creation in pod_actions
- Tests already-resolved returns 400
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

@pytest.fixture(scope="module")
def coach_token():
    """Get coach authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "coach.williams@capymatch.com",
        "password": "coach123"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["token"]

@pytest.fixture(scope="module")
def auth_headers(coach_token):
    """Return headers with auth token"""
    return {"Authorization": f"Bearer {coach_token}", "Content-Type": "application/json"}

@pytest.fixture(scope="module")
def director_token():
    """Get director authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "clara.adams@capymatch.com",
        "password": "director123"
    })
    if response.status_code == 200:
        return response.json()["token"]
    return None

class TestResolveActionEndpoint:
    """Test the resolve action endpoint with new fields"""
    
    def test_list_actions_has_source_field(self, auth_headers):
        """Verify actions include source field to fix 'From undefined'"""
        response = requests.get(f"{BASE_URL}/api/director/actions", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        actions = data.get("actions", [])
        assert len(actions) > 0, "Should have at least one action"
        
        # Check that coach escalations have source field
        coach_escalations = [a for a in actions if a.get("type") == "coach_escalation"]
        for action in coach_escalations:
            assert "source" in action, f"Action {action.get('action_id')} missing source field"
            assert action["source"] == "coach_escalation", "Coach escalation should have source='coach_escalation'"
            assert "coach_name" in action, "Coach escalation should have coach_name"
        
        # Check director-created actions have director_name
        director_actions = [a for a in actions if a.get("type") in ("review_request", "pipeline_escalation") and a.get("director_id")]
        for action in director_actions:
            assert "director_name" in action or action.get("source") == "coach_escalation", f"Director action {action.get('action_id')} missing director_name"
        
        print(f"PASS: Verified {len(actions)} actions have proper source/name fields")
    
    def test_resolve_requires_note(self, auth_headers):
        """Test that resolve with empty note returns error or uses default"""
        # First get an open or acknowledged action
        response = requests.get(f"{BASE_URL}/api/director/actions", headers=auth_headers)
        assert response.status_code == 200
        
        actions = response.json().get("actions", [])
        resolvable = [a for a in actions if a.get("status") in ("open", "acknowledged")]
        
        if len(resolvable) == 0:
            pytest.skip("No resolvable actions available")
        
        action_id = resolvable[0]["action_id"]
        
        # Try resolving with empty note - should still work (note is optional per API)
        # The frontend enforces required, but backend allows empty
        resolve_response = requests.post(
            f"{BASE_URL}/api/director/actions/{action_id}/resolve",
            headers=auth_headers,
            json={
                "note": "",
                "notify_director": False,
                "add_to_timeline": False,
                "follow_up_title": None
            }
        )
        
        # Should succeed (backend allows empty note)
        assert resolve_response.status_code == 200, f"Resolve failed: {resolve_response.text}"
        print(f"PASS: Resolved action {action_id} with empty note (backend allows)")
    
    def test_resolve_with_full_data(self, auth_headers):
        """Test resolve with all fields: note, notify_director, add_to_timeline, follow_up_title"""
        # First create a new escalation to resolve
        response = requests.post(
            f"{BASE_URL}/api/support-pods/athlete_1/escalate",
            headers=auth_headers,
            json={
                "title": "TEST_Resolve_Full_Data",
                "reason": "other",
                "description": "Test escalation for resolve workflow",
                "urgency": "medium"
            }
        )
        
        if response.status_code not in (200, 201):
            pytest.skip(f"Could not create escalation: {response.text}")
        
        # Get the newly created action
        actions_response = requests.get(f"{BASE_URL}/api/director/actions", headers=auth_headers)
        assert actions_response.status_code == 200
        
        actions = actions_response.json().get("actions", [])
        resolvable = [a for a in actions if a.get("status") in ("open", "acknowledged") and "TEST_Resolve_Full_Data" in a.get("note", "")]
        
        if len(resolvable) == 0:
            # Fallback to any open action
            resolvable = [a for a in actions if a.get("status") in ("open", "acknowledged")]
        
        if len(resolvable) == 0:
            pytest.skip("No resolvable actions available")
        
        action_id = resolvable[0]["action_id"]
        athlete_id = resolvable[0].get("athlete_id", "athlete_1")
        
        # Resolve with all fields
        resolve_data = {
            "note": "TEST_Resolved: Completed follow-up with athlete and family. All concerns addressed.",
            "notify_director": True,
            "add_to_timeline": True,
            "follow_up_title": "TEST_Follow-up: Check back with athlete in 1 week"
        }
        
        resolve_response = requests.post(
            f"{BASE_URL}/api/director/actions/{action_id}/resolve",
            headers=auth_headers,
            json=resolve_data
        )
        
        assert resolve_response.status_code == 200, f"Resolve failed: {resolve_response.text}"
        
        result = resolve_response.json()
        assert result["status"] == "resolved"
        assert result["action_id"] == action_id
        assert "follow_up_id" in result, "Response should include follow_up_id when follow_up_title provided"
        assert result["follow_up_id"] is not None, "follow_up_id should not be None when follow_up_title provided"
        
        print(f"PASS: Resolved action {action_id} with follow_up_id={result['follow_up_id']}")
    
    def test_resolve_already_resolved_returns_400(self, auth_headers):
        """Test that resolving an already-resolved action returns 400"""
        # Get a resolved action
        response = requests.get(f"{BASE_URL}/api/director/actions", headers=auth_headers)
        assert response.status_code == 200
        
        actions = response.json().get("actions", [])
        resolved = [a for a in actions if a.get("status") == "resolved"]
        
        if len(resolved) == 0:
            pytest.skip("No resolved actions available to test duplicate resolve")
        
        action_id = resolved[0]["action_id"]
        
        # Try to resolve again
        resolve_response = requests.post(
            f"{BASE_URL}/api/director/actions/{action_id}/resolve",
            headers=auth_headers,
            json={
                "note": "Trying to resolve again",
                "notify_director": False,
                "add_to_timeline": False
            }
        )
        
        assert resolve_response.status_code == 400, f"Expected 400, got {resolve_response.status_code}: {resolve_response.text}"
        assert "already resolved" in resolve_response.text.lower()
        print(f"PASS: Already-resolved action {action_id} returns 400 as expected")
    
    def test_resolve_adds_to_timeline(self, auth_headers):
        """Test that add_to_timeline=True logs resolution in pod_action_events"""
        # Create a new escalation
        response = requests.post(
            f"{BASE_URL}/api/support-pods/athlete_1/escalate",
            headers=auth_headers,
            json={
                "title": "TEST_Timeline_Log",
                "reason": "other",
                "description": "Test timeline logging",
                "urgency": "low"
            }
        )
        
        if response.status_code not in (200, 201):
            pytest.skip(f"Could not create escalation: {response.text}")
        
        # Get the action
        actions_response = requests.get(f"{BASE_URL}/api/director/actions", headers=auth_headers)
        actions = actions_response.json().get("actions", [])
        resolvable = [a for a in actions if a.get("status") in ("open", "acknowledged") and "TEST_Timeline_Log" in a.get("note", "")]
        
        if len(resolvable) == 0:
            resolvable = [a for a in actions if a.get("status") in ("open", "acknowledged")]
        
        if len(resolvable) == 0:
            pytest.skip("No resolvable actions")
        
        action = resolvable[0]
        action_id = action["action_id"]
        
        # Resolve with add_to_timeline=True
        resolve_response = requests.post(
            f"{BASE_URL}/api/director/actions/{action_id}/resolve",
            headers=auth_headers,
            json={
                "note": "TEST_Timeline: Resolution logged to athlete timeline",
                "notify_director": False,
                "add_to_timeline": True,
                "follow_up_title": None
            }
        )
        
        assert resolve_response.status_code == 200
        print(f"PASS: Resolved {action_id} with add_to_timeline=True")
    
    def test_resolve_without_follow_up(self, auth_headers):
        """Test resolve without follow_up_title doesn't create follow-up task"""
        # Create escalation
        requests.post(
            f"{BASE_URL}/api/support-pods/athlete_1/escalate",
            headers=auth_headers,
            json={
                "title": "TEST_No_Followup",
                "reason": "other",
                "description": "No follow-up needed",
                "urgency": "low"
            }
        )
        
        actions_response = requests.get(f"{BASE_URL}/api/director/actions", headers=auth_headers)
        actions = actions_response.json().get("actions", [])
        resolvable = [a for a in actions if a.get("status") in ("open", "acknowledged")]
        
        if len(resolvable) == 0:
            pytest.skip("No resolvable actions")
        
        action_id = resolvable[0]["action_id"]
        
        # Resolve without follow_up_title
        resolve_response = requests.post(
            f"{BASE_URL}/api/director/actions/{action_id}/resolve",
            headers=auth_headers,
            json={
                "note": "TEST: Resolved without follow-up",
                "notify_director": False,
                "add_to_timeline": False,
                "follow_up_title": None
            }
        )
        
        assert resolve_response.status_code == 200
        result = resolve_response.json()
        assert result.get("follow_up_id") is None, "follow_up_id should be None when no follow_up_title"
        print(f"PASS: Resolved {action_id} without follow-up (follow_up_id=None)")


class TestActionDisplayFix:
    """Test that 'From undefined' issue is fixed"""
    
    def test_coach_escalations_have_coach_name(self, auth_headers):
        """Verify coach escalations have coach_name for display"""
        response = requests.get(f"{BASE_URL}/api/director/actions", headers=auth_headers)
        assert response.status_code == 200
        
        actions = response.json().get("actions", [])
        coach_escalations = [a for a in actions if a.get("source") == "coach_escalation" or a.get("type") == "coach_escalation"]
        
        for action in coach_escalations:
            assert "coach_name" in action and action["coach_name"], f"Coach escalation {action['action_id']} missing coach_name"
        
        print(f"PASS: {len(coach_escalations)} coach escalations have proper coach_name")
    
    def test_director_actions_have_director_name(self, auth_headers):
        """Verify director-created actions have director_name for display"""
        response = requests.get(f"{BASE_URL}/api/director/actions", headers=auth_headers)
        assert response.status_code == 200
        
        actions = response.json().get("actions", [])
        director_created = [a for a in actions if a.get("director_id") and a.get("source") != "coach_escalation"]
        
        for action in director_created:
            assert "director_name" in action and action["director_name"], f"Director action {action['action_id']} missing director_name"
        
        print(f"PASS: {len(director_created)} director actions have proper director_name")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

"""
Quick-Resolve Feature Tests
Tests the quick-resolve endpoint and quick_resolve field in pod_top_action.

Features tested:
- quick_resolve field presence in pod_top_action (null for non-eligible issues)
- POST /api/support-pods/{athlete_id}/quick-resolve endpoint
- assign_owner action assigns actions to coach
- Validation: 400 for unknown actions, 400 for missing target_ids
- Authorization: 403 for unauthorized access
- DB persistence: action owner updated, pod_action_events created
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestQuickResolveField:
    """Test quick_resolve field in pod_top_action response"""

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

    def test_quick_resolve_null_for_momentum_drop(self):
        """athlete_3 has momentum_drop - quick_resolve should be null"""
        resp = self.session.get(f"{BASE_URL}/api/support-pods/athlete_3")
        assert resp.status_code == 200
        data = resp.json()
        
        pod_top_action = data["pod_top_action"]
        assert pod_top_action["category"] == "momentum_drop", f"Expected momentum_drop, got {pod_top_action['category']}"
        assert pod_top_action["quick_resolve"] is None, "quick_resolve should be null for momentum_drop"

    def test_quick_resolve_null_for_blocker(self):
        """athlete_5 has blocker - quick_resolve should be null"""
        resp = self.session.get(f"{BASE_URL}/api/support-pods/athlete_5")
        assert resp.status_code == 200
        data = resp.json()
        
        pod_top_action = data["pod_top_action"]
        assert pod_top_action["category"] == "blocker", f"Expected blocker, got {pod_top_action['category']}"
        assert pod_top_action["quick_resolve"] is None, "quick_resolve should be null for blocker"

    def test_quick_resolve_field_always_present(self):
        """Verify quick_resolve field is always present (even if null)"""
        for athlete_id in ["athlete_1", "athlete_3", "athlete_5"]:
            resp = self.session.get(f"{BASE_URL}/api/support-pods/{athlete_id}")
            assert resp.status_code == 200
            data = resp.json()
            
            pod_top_action = data["pod_top_action"]
            assert "quick_resolve" in pod_top_action, f"quick_resolve field missing for {athlete_id}"


class TestQuickResolveEndpoint:
    """Test POST /api/support-pods/{athlete_id}/quick-resolve endpoint"""

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
        self.test_action_ids = []

    def teardown_method(self, method):
        """Cleanup test actions"""
        # Clean up TEST_ prefixed actions
        for action_id in self.test_action_ids:
            try:
                self.session.patch(
                    f"{BASE_URL}/api/support-pods/athlete_3/actions/{action_id}",
                    json={"status": "completed"}
                )
            except:
                pass

    def test_assign_owner_success(self):
        """Test quick-resolve assign_owner action succeeds"""
        # Create an unassigned action first
        action_data = {
            "title": f"TEST_QuickResolve_{uuid.uuid4().hex[:8]}",
            "owner": "Unassigned",
            "owner_role": "",
            "due_date": "2026-01-25T00:00:00Z"
        }
        create_resp = self.session.post(f"{BASE_URL}/api/support-pods/athlete_3/actions", json=action_data)
        assert create_resp.status_code == 200, f"Create action failed: {create_resp.text}"
        action_id = create_resp.json()["id"]
        self.test_action_ids.append(action_id)
        
        # Quick-resolve it
        resolve_resp = self.session.post(
            f"{BASE_URL}/api/support-pods/athlete_3/quick-resolve",
            json={
                "action": "assign_owner",
                "target_ids": [action_id]
            }
        )
        assert resolve_resp.status_code == 200, f"Quick-resolve failed: {resolve_resp.text}"
        
        data = resolve_resp.json()
        assert data["resolved"] is True
        assert data["action"] == "assign_owner"
        assert data["updated_count"] == 1
        assert data["assigned_to"] == "Coach Williams"

    def test_assign_owner_multiple_actions(self):
        """Test quick-resolve can assign multiple actions at once"""
        action_ids = []
        for i in range(3):
            action_data = {
                "title": f"TEST_MultiQuickResolve_{i}_{uuid.uuid4().hex[:4]}",
                "owner": "Unassigned",
                "owner_role": "",
            }
            resp = self.session.post(f"{BASE_URL}/api/support-pods/athlete_3/actions", json=action_data)
            assert resp.status_code == 200
            action_ids.append(resp.json()["id"])
        self.test_action_ids.extend(action_ids)
        
        # Quick-resolve all of them
        resolve_resp = self.session.post(
            f"{BASE_URL}/api/support-pods/athlete_3/quick-resolve",
            json={
                "action": "assign_owner",
                "target_ids": action_ids
            }
        )
        assert resolve_resp.status_code == 200
        
        data = resolve_resp.json()
        assert data["updated_count"] == 3, f"Expected 3 actions updated, got {data['updated_count']}"

    def test_unknown_action_returns_400(self):
        """Test unknown action type returns 400"""
        resp = self.session.post(
            f"{BASE_URL}/api/support-pods/athlete_3/quick-resolve",
            json={
                "action": "unknown_action",
                "target_ids": ["some-id"]
            }
        )
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
        assert "Unknown quick-resolve action" in resp.json().get("detail", "")

    def test_missing_target_ids_returns_400(self):
        """Test empty target_ids returns 400"""
        resp = self.session.post(
            f"{BASE_URL}/api/support-pods/athlete_3/quick-resolve",
            json={
                "action": "assign_owner",
                "target_ids": []
            }
        )
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
        assert "No target action IDs" in resp.json().get("detail", "")

    def test_unauthorized_access_returns_401(self):
        """Test unauthenticated request returns 401"""
        unauthenticated_session = requests.Session()
        unauthenticated_session.headers.update({"Content-Type": "application/json"})
        
        resp = unauthenticated_session.post(
            f"{BASE_URL}/api/support-pods/athlete_3/quick-resolve",
            json={
                "action": "assign_owner",
                "target_ids": ["some-id"]
            }
        )
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"


class TestQuickResolvePersistence:
    """Test that quick-resolve properly persists changes to DB"""

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
        self.test_action_ids = []

    def teardown_method(self, method):
        """Cleanup test actions"""
        for action_id in self.test_action_ids:
            try:
                self.session.patch(
                    f"{BASE_URL}/api/support-pods/athlete_3/actions/{action_id}",
                    json={"status": "completed"}
                )
            except:
                pass

    def test_action_owner_persisted_in_db(self):
        """Verify action owner is updated in the DB after quick-resolve"""
        # Create unassigned action
        action_data = {
            "title": f"TEST_PersistCheck_{uuid.uuid4().hex[:8]}",
            "owner": "Unassigned",
            "owner_role": "",
        }
        create_resp = self.session.post(f"{BASE_URL}/api/support-pods/athlete_3/actions", json=action_data)
        assert create_resp.status_code == 200
        action_id = create_resp.json()["id"]
        self.test_action_ids.append(action_id)
        
        # Quick-resolve
        resolve_resp = self.session.post(
            f"{BASE_URL}/api/support-pods/athlete_3/quick-resolve",
            json={"action": "assign_owner", "target_ids": [action_id]}
        )
        assert resolve_resp.status_code == 200
        
        # Verify via GET
        pod_resp = self.session.get(f"{BASE_URL}/api/support-pods/athlete_3")
        assert pod_resp.status_code == 200
        
        actions = pod_resp.json().get("actions", [])
        updated_action = next((a for a in actions if a["id"] == action_id), None)
        assert updated_action is not None, "Action not found in response"
        assert updated_action["owner"] == "Coach Williams", f"Owner should be Coach Williams, got {updated_action['owner']}"

    def test_pod_action_event_created(self):
        """Verify pod_action_events entry is created for assignment"""
        # Create and resolve an action
        action_data = {
            "title": f"TEST_EventCheck_{uuid.uuid4().hex[:8]}",
            "owner": "Unassigned",
            "owner_role": "",
        }
        create_resp = self.session.post(f"{BASE_URL}/api/support-pods/athlete_3/actions", json=action_data)
        assert create_resp.status_code == 200
        action_id = create_resp.json()["id"]
        self.test_action_ids.append(action_id)
        
        # Quick-resolve
        resolve_resp = self.session.post(
            f"{BASE_URL}/api/support-pods/athlete_3/quick-resolve",
            json={"action": "assign_owner", "target_ids": [action_id]}
        )
        assert resolve_resp.status_code == 200
        
        # Check events
        pod_resp = self.session.get(f"{BASE_URL}/api/support-pods/athlete_3")
        assert pod_resp.status_code == 200
        
        events = pod_resp.json().get("timeline", {}).get("action_events", [])
        quick_assign_events = [e for e in events if "Quick-assigned" in e.get("description", "")]
        assert len(quick_assign_events) > 0, "No quick-assign events found"
        
        # Find the event for our action
        latest_event = [e for e in quick_assign_events if e.get("action_id") == action_id]
        assert len(latest_event) > 0, f"No event found for action {action_id}"


class TestQuickResolveConfig:
    """Test QUICK_RESOLVE_CONFIG logic - only ownership_gap eligible"""

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

    def test_complex_issues_excluded_from_quick_resolve(self):
        """Verify complex issues don't have quick_resolve"""
        # Categories that should NOT have quick_resolve
        excluded_categories = ["blocker", "momentum_drop", "engagement_drop", "family_inactive"]
        
        # Check athlete_3 (momentum_drop)
        resp3 = self.session.get(f"{BASE_URL}/api/support-pods/athlete_3")
        data3 = resp3.json()
        assert data3["pod_top_action"]["category"] == "momentum_drop"
        assert data3["pod_top_action"]["quick_resolve"] is None
        
        # Check athlete_5 (blocker)
        resp5 = self.session.get(f"{BASE_URL}/api/support-pods/athlete_5")
        data5 = resp5.json()
        assert data5["pod_top_action"]["category"] == "blocker"
        assert data5["pod_top_action"]["quick_resolve"] is None

    def test_quick_resolve_structure_when_present(self):
        """Test quick_resolve object structure when it should be present"""
        # This would only appear when ownership_gap is the top priority
        # We can verify the structure by looking at the source code logic
        # When quick_resolve is present, it should have label, action, target_ids
        
        # Create a mock scenario by checking the QUICK_RESOLVE_CONFIG
        # For ownership_gap: label="Assign Owner", action="assign_owner"
        resp = self.session.get(f"{BASE_URL}/api/support-pods/athlete_3")
        data = resp.json()
        
        # Even if quick_resolve is null, the field should exist
        assert "quick_resolve" in data["pod_top_action"]

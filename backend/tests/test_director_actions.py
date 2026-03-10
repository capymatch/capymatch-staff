"""
Director Actions API Tests - Review Requests and Pipeline Escalations
Tests: POST/GET director actions, acknowledge, resolve endpoints
Credentials:
  - director@capymatch.com / director123 (role: director)
  - coach.williams@capymatch.com / coach123 (role: club_coach, id: coach-williams)
  - coach.garcia@capymatch.com / coach123 (role: club_coach, id: coach-garcia)
  - emma.chen@athlete.capymatch.com / password123 (athlete - should be blocked)
Test athletes: athlete_4 (Marcus Johnson), athlete_2 (Jake Williams)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test data - will be populated during tests
created_action_ids = []

@pytest.fixture(scope="module")
def director_token():
    """Get director token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "director@capymatch.com",
        "password": "director123"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Director login failed: {response.status_code} - {response.text}")

@pytest.fixture(scope="module")
def coach_williams_token():
    """Get Coach Williams token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "coach.williams@capymatch.com",
        "password": "coach123"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Coach Williams login failed: {response.status_code} - {response.text}")

@pytest.fixture(scope="module")
def coach_garcia_token():
    """Get Coach Garcia token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "coach.garcia@capymatch.com",
        "password": "coach123"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Coach Garcia login failed: {response.status_code} - {response.text}")

@pytest.fixture(scope="module")
def athlete_token():
    """Get athlete token (should be blocked from director actions)"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "emma.chen@athlete.capymatch.com",
        "password": "password123"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Athlete login failed: {response.status_code} - {response.text}")

# ── 1. CREATE ACTION TESTS ──

class TestCreateDirectorAction:
    """POST /api/director/actions - Create review_request and pipeline_escalation"""
    
    def test_create_review_request_as_director(self, director_token):
        """Director can create a review_request"""
        response = requests.post(
            f"{BASE_URL}/api/director/actions",
            json={
                "type": "review_request",
                "athlete_id": "athlete_4",
                "coach_id": "coach-williams",
                "reason": "pipeline_stalling",
                "note": "TEST: Please review this athlete's pipeline"
            },
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "action_id" in data
        assert data["type"] == "review_request"
        assert data["status"] == "open"
        created_action_ids.append(data["action_id"])
        print(f"PASS: Created review_request action_id={data['action_id']}")

    def test_create_escalation_with_risk_level(self, director_token):
        """Director can create a pipeline_escalation with risk_level"""
        response = requests.post(
            f"{BASE_URL}/api/director/actions",
            json={
                "type": "pipeline_escalation",
                "athlete_id": "athlete_2",
                "coach_id": "coach-garcia",
                "reason": "overdue_followups",
                "note": "TEST: Critical escalation for testing",
                "risk_level": "critical"
            },
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "action_id" in data
        assert data["type"] == "pipeline_escalation"
        assert data["status"] == "open"
        created_action_ids.append(data["action_id"])
        print(f"PASS: Created pipeline_escalation action_id={data['action_id']}")

    def test_coach_cannot_create_action(self, coach_williams_token):
        """Coach should get 403 when trying to create action"""
        response = requests.post(
            f"{BASE_URL}/api/director/actions",
            json={
                "type": "review_request",
                "athlete_id": "athlete_4",
                "coach_id": "coach-williams",
                "reason": "pipeline_stalling",
                "note": "Should fail"
            },
            headers={"Authorization": f"Bearer {coach_williams_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("PASS: Coach correctly blocked from creating action (403)")

    def test_athlete_cannot_create_action(self, athlete_token):
        """Athlete should get 403 when trying to create action"""
        response = requests.post(
            f"{BASE_URL}/api/director/actions",
            json={
                "type": "review_request",
                "athlete_id": "athlete_4",
                "coach_id": "coach-williams",
                "reason": "pipeline_stalling",
                "note": "Should fail"
            },
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("PASS: Athlete correctly blocked from creating action (403)")

    def test_invalid_type_rejected(self, director_token):
        """Invalid type should return 400"""
        response = requests.post(
            f"{BASE_URL}/api/director/actions",
            json={
                "type": "invalid_type",
                "athlete_id": "athlete_4",
                "coach_id": "coach-williams",
                "reason": "pipeline_stalling"
            },
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("PASS: Invalid type correctly rejected (400)")

    def test_invalid_reason_rejected(self, director_token):
        """Invalid reason should return 400"""
        response = requests.post(
            f"{BASE_URL}/api/director/actions",
            json={
                "type": "review_request",
                "athlete_id": "athlete_4",
                "coach_id": "coach-williams",
                "reason": "invalid_reason"
            },
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("PASS: Invalid reason correctly rejected (400)")

    def test_escalation_requires_risk_level(self, director_token):
        """pipeline_escalation without risk_level should return 400"""
        response = requests.post(
            f"{BASE_URL}/api/director/actions",
            json={
                "type": "pipeline_escalation",
                "athlete_id": "athlete_4",
                "coach_id": "coach-williams",
                "reason": "overdue_followups"
                # Missing risk_level
            },
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("PASS: Escalation without risk_level correctly rejected (400)")

    def test_invalid_risk_level_rejected(self, director_token):
        """Invalid risk_level should return 400"""
        response = requests.post(
            f"{BASE_URL}/api/director/actions",
            json={
                "type": "pipeline_escalation",
                "athlete_id": "athlete_4",
                "coach_id": "coach-williams",
                "reason": "overdue_followups",
                "risk_level": "invalid_level"
            },
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("PASS: Invalid risk_level correctly rejected (400)")


# ── 2. LIST ACTIONS TESTS ──

class TestListDirectorActions:
    """GET /api/director/actions - List and filter actions"""
    
    def test_director_gets_all_org_actions(self, director_token):
        """Director can list all actions with summary"""
        response = requests.get(
            f"{BASE_URL}/api/director/actions",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "actions" in data
        assert "summary" in data
        assert "total" in data
        # Verify summary fields
        summary = data["summary"]
        assert "total_open" in summary
        assert "open_critical" in summary
        assert "open_warning" in summary
        assert "acknowledged" in summary
        assert "resolved_recently" in summary
        print(f"PASS: Director list returns {data['total']} actions with summary")

    def test_coach_only_sees_assigned_actions(self, coach_williams_token, director_token):
        """Coach only sees actions assigned to them"""
        # Get coach Williams' actions
        response = requests.get(
            f"{BASE_URL}/api/director/actions",
            headers={"Authorization": f"Bearer {coach_williams_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # All actions should be assigned to coach-williams
        for action in data["actions"]:
            assert action["coach_id"] == "coach-williams", f"Coach sees action not assigned to them: {action['coach_id']}"
        print(f"PASS: Coach Williams only sees {data['total']} assigned actions")

    def test_filter_by_status(self, director_token):
        """Can filter actions by status"""
        response = requests.get(
            f"{BASE_URL}/api/director/actions?status=open",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        for action in data["actions"]:
            assert action["status"] == "open", f"Filter returned non-open action: {action['status']}"
        print(f"PASS: Status filter returns {data['total']} open actions")

    def test_athlete_cannot_list_actions(self, athlete_token):
        """Athlete should get 403 when trying to list actions"""
        response = requests.get(
            f"{BASE_URL}/api/director/actions",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("PASS: Athlete correctly blocked from listing actions (403)")


# ── 3. ATHLETE-SPECIFIC ACTIONS ──

class TestAthleteActions:
    """GET /api/director/actions/athlete/{athlete_id}"""
    
    def test_get_actions_for_athlete(self, director_token):
        """Can get actions for a specific athlete"""
        response = requests.get(
            f"{BASE_URL}/api/director/actions/athlete/athlete_4",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "actions" in data
        assert "total" in data
        # All actions should be for athlete_4
        for action in data["actions"]:
            assert action["athlete_id"] == "athlete_4"
        print(f"PASS: Got {data['total']} actions for athlete_4")

    def test_coach_sees_only_assigned_for_athlete(self, coach_garcia_token):
        """Coach only sees actions for athlete that are assigned to them"""
        response = requests.get(
            f"{BASE_URL}/api/director/actions/athlete/athlete_2",
            headers={"Authorization": f"Bearer {coach_garcia_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # All actions should be assigned to coach-garcia
        for action in data["actions"]:
            assert action["coach_id"] == "coach-garcia"
        print(f"PASS: Coach Garcia sees {data['total']} assigned actions for athlete_2")


# ── 4. ACKNOWLEDGE TESTS ──

class TestAcknowledgeAction:
    """POST /api/director/actions/{id}/acknowledge"""
    
    def test_acknowledge_open_action(self, coach_williams_token, director_token):
        """Coach can acknowledge an open action assigned to them"""
        # First create a fresh action to acknowledge
        create_resp = requests.post(
            f"{BASE_URL}/api/director/actions",
            json={
                "type": "review_request",
                "athlete_id": "athlete_4",
                "coach_id": "coach-williams",
                "reason": "high_value_recruit",
                "note": "TEST: Action for acknowledge test"
            },
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert create_resp.status_code == 200
        action_id = create_resp.json()["action_id"]
        created_action_ids.append(action_id)
        
        # Acknowledge the action
        response = requests.post(
            f"{BASE_URL}/api/director/actions/{action_id}/acknowledge",
            headers={"Authorization": f"Bearer {coach_williams_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["status"] == "acknowledged"
        print(f"PASS: Successfully acknowledged action {action_id}")

    def test_cannot_acknowledge_already_acknowledged(self, coach_williams_token, director_token):
        """Cannot acknowledge an action that is already acknowledged"""
        # Create and acknowledge an action
        create_resp = requests.post(
            f"{BASE_URL}/api/director/actions",
            json={
                "type": "review_request",
                "athlete_id": "athlete_4",
                "coach_id": "coach-williams",
                "reason": "needs_guidance",
                "note": "TEST: Action for double-acknowledge test"
            },
            headers={"Authorization": f"Bearer {director_token}"}
        )
        action_id = create_resp.json()["action_id"]
        created_action_ids.append(action_id)
        
        # First acknowledge
        requests.post(
            f"{BASE_URL}/api/director/actions/{action_id}/acknowledge",
            headers={"Authorization": f"Bearer {coach_williams_token}"}
        )
        
        # Try to acknowledge again - should fail
        response = requests.post(
            f"{BASE_URL}/api/director/actions/{action_id}/acknowledge",
            headers={"Authorization": f"Bearer {coach_williams_token}"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("PASS: Cannot acknowledge already acknowledged action (400)")

    def test_coach_cannot_acknowledge_other_coach_action(self, coach_garcia_token, director_token):
        """Coach cannot acknowledge action assigned to another coach"""
        # Create action for coach-williams
        create_resp = requests.post(
            f"{BASE_URL}/api/director/actions",
            json={
                "type": "review_request",
                "athlete_id": "athlete_4",
                "coach_id": "coach-williams",
                "reason": "scholarship_deadline",
                "note": "TEST: Action for wrong-coach test"
            },
            headers={"Authorization": f"Bearer {director_token}"}
        )
        action_id = create_resp.json()["action_id"]
        created_action_ids.append(action_id)
        
        # Try to acknowledge as coach-garcia - should fail
        response = requests.post(
            f"{BASE_URL}/api/director/actions/{action_id}/acknowledge",
            headers={"Authorization": f"Bearer {coach_garcia_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("PASS: Coach cannot acknowledge other coach's action (403)")


# ── 5. RESOLVE TESTS ──

class TestResolveAction:
    """POST /api/director/actions/{id}/resolve"""
    
    def test_resolve_acknowledged_action(self, coach_williams_token, director_token):
        """Coach can resolve an acknowledged action with a note"""
        # Create and acknowledge an action
        create_resp = requests.post(
            f"{BASE_URL}/api/director/actions",
            json={
                "type": "review_request",
                "athlete_id": "athlete_4",
                "coach_id": "coach-williams",
                "reason": "pipeline_stalling",
                "note": "TEST: Action for resolve test"
            },
            headers={"Authorization": f"Bearer {director_token}"}
        )
        action_id = create_resp.json()["action_id"]
        created_action_ids.append(action_id)
        
        # Acknowledge first
        requests.post(
            f"{BASE_URL}/api/director/actions/{action_id}/acknowledge",
            headers={"Authorization": f"Bearer {coach_williams_token}"}
        )
        
        # Resolve with note
        response = requests.post(
            f"{BASE_URL}/api/director/actions/{action_id}/resolve",
            json={"note": "TEST: Resolved - contacted athlete and updated pipeline"},
            headers={"Authorization": f"Bearer {coach_williams_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["status"] == "resolved"
        print(f"PASS: Successfully resolved action {action_id}")

    def test_resolve_open_action_directly(self, coach_williams_token, director_token):
        """Coach can resolve an open action directly (skip acknowledge)"""
        create_resp = requests.post(
            f"{BASE_URL}/api/director/actions",
            json={
                "type": "review_request",
                "athlete_id": "athlete_4",
                "coach_id": "coach-williams",
                "reason": "other",
                "note": "TEST: Action for direct resolve test"
            },
            headers={"Authorization": f"Bearer {director_token}"}
        )
        action_id = create_resp.json()["action_id"]
        created_action_ids.append(action_id)
        
        # Resolve directly from open
        response = requests.post(
            f"{BASE_URL}/api/director/actions/{action_id}/resolve",
            json={"note": "Quickly resolved"},
            headers={"Authorization": f"Bearer {coach_williams_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["status"] == "resolved"
        print("PASS: Can resolve open action directly")

    def test_cannot_resolve_already_resolved(self, coach_williams_token, director_token):
        """Cannot resolve an action that is already resolved"""
        create_resp = requests.post(
            f"{BASE_URL}/api/director/actions",
            json={
                "type": "review_request",
                "athlete_id": "athlete_4",
                "coach_id": "coach-williams",
                "reason": "pipeline_stalling",
                "note": "TEST: Action for double-resolve test"
            },
            headers={"Authorization": f"Bearer {director_token}"}
        )
        action_id = create_resp.json()["action_id"]
        created_action_ids.append(action_id)
        
        # Resolve once
        requests.post(
            f"{BASE_URL}/api/director/actions/{action_id}/resolve",
            json={"note": "Resolved first time"},
            headers={"Authorization": f"Bearer {coach_williams_token}"}
        )
        
        # Try to resolve again - should fail
        response = requests.post(
            f"{BASE_URL}/api/director/actions/{action_id}/resolve",
            json={"note": "Should fail"},
            headers={"Authorization": f"Bearer {coach_williams_token}"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("PASS: Cannot resolve already resolved action (400)")

    def test_coach_cannot_resolve_other_coach_action(self, coach_garcia_token, director_token):
        """Coach cannot resolve action assigned to another coach"""
        create_resp = requests.post(
            f"{BASE_URL}/api/director/actions",
            json={
                "type": "pipeline_escalation",
                "athlete_id": "athlete_4",
                "coach_id": "coach-williams",
                "reason": "deadline_risk",
                "risk_level": "warning",
                "note": "TEST: Action for wrong-coach resolve test"
            },
            headers={"Authorization": f"Bearer {director_token}"}
        )
        action_id = create_resp.json()["action_id"]
        created_action_ids.append(action_id)
        
        # Try to resolve as coach-garcia - should fail
        response = requests.post(
            f"{BASE_URL}/api/director/actions/{action_id}/resolve",
            json={"note": "Should fail"},
            headers={"Authorization": f"Bearer {coach_garcia_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("PASS: Coach cannot resolve other coach's action (403)")


# ── 6. DATA VERIFICATION ──

class TestDataPersistence:
    """Verify action data is correctly stored and retrieved"""
    
    def test_action_has_all_fields(self, director_token):
        """Created action has all required fields"""
        # Create an escalation with all fields
        create_resp = requests.post(
            f"{BASE_URL}/api/director/actions",
            json={
                "type": "pipeline_escalation",
                "athlete_id": "athlete_4",
                "coach_id": "coach-williams",
                "reason": "momentum_drop",
                "note": "TEST: Verify all fields",
                "risk_level": "critical"
            },
            headers={"Authorization": f"Bearer {director_token}"}
        )
        action_id = create_resp.json()["action_id"]
        created_action_ids.append(action_id)
        
        # Get the action via list
        list_resp = requests.get(
            f"{BASE_URL}/api/director/actions/athlete/athlete_4",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        actions = list_resp.json()["actions"]
        action = next((a for a in actions if a["action_id"] == action_id), None)
        
        assert action is not None, "Created action not found in list"
        assert action["type"] == "pipeline_escalation"
        assert action["status"] == "open"
        assert action["reason"] == "momentum_drop"
        assert action["reason_label"] == "Momentum drop"
        assert action["risk_level"] == "critical"
        assert action["athlete_id"] == "athlete_4"
        assert action["coach_id"] == "coach-williams"
        assert "director_name" in action
        assert "coach_name" in action
        assert "athlete_name" in action
        assert "created_at" in action
        print("PASS: Action has all required fields")

    def test_resolve_note_persisted(self, coach_williams_token, director_token):
        """Resolved note is saved with the action"""
        create_resp = requests.post(
            f"{BASE_URL}/api/director/actions",
            json={
                "type": "review_request",
                "athlete_id": "athlete_4",
                "coach_id": "coach-williams",
                "reason": "needs_guidance"
            },
            headers={"Authorization": f"Bearer {director_token}"}
        )
        action_id = create_resp.json()["action_id"]
        created_action_ids.append(action_id)
        
        # Resolve with note
        resolve_note = "TEST: Resolution note with details about what was done"
        requests.post(
            f"{BASE_URL}/api/director/actions/{action_id}/resolve",
            json={"note": resolve_note},
            headers={"Authorization": f"Bearer {coach_williams_token}"}
        )
        
        # Verify via list
        list_resp = requests.get(
            f"{BASE_URL}/api/director/actions?status=resolved",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        actions = list_resp.json()["actions"]
        action = next((a for a in actions if a["action_id"] == action_id), None)
        
        assert action is not None, "Resolved action not found"
        assert action["resolved_note"] == resolve_note
        assert action["resolved_at"] is not None
        print("PASS: Resolve note is persisted")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

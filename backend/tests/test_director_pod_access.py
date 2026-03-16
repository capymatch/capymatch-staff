"""
Director Pod Access Feature Tests - Escalation Flow
Tests the escalation-specific features for directors accessing athlete pods.

Test features:
1. Support pod returns escalations for athletes
2. Director can acknowledge escalations via /api/director/actions/{id}/acknowledge
3. Director can add guidance notes via /api/support-pods/{athlete_id}/director-notes
4. Director can create intervention tasks via /api/support-pods/{athlete_id}/director-tasks
5. Director can resolve escalations via /api/director/actions/{id}/resolve
6. Mission control returns escalations for director view

Credentials:
  - director@capymatch.com / director123 (role: director)
  - coach.williams@capymatch.com / coach123 (role: club_coach)

Existing test data:
  - athlete_2 (Olivia Anderson) has escalation da_4eee6ca096f6
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test athlete with known escalation
TEST_ATHLETE_ID = "athlete_2"
EXISTING_ESCALATION_ID = "da_4eee6ca096f6"


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
def coach_token():
    """Get coach token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "coach.williams@capymatch.com",
        "password": "coach123"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Coach login failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def director_user_info(director_token):
    """Get director user info"""
    response = requests.get(f"{BASE_URL}/api/me", headers={
        "Authorization": f"Bearer {director_token}"
    })
    if response.status_code == 200:
        return response.json()
    return {"role": "director", "name": "Director"}


# ── 1. SUPPORT POD ESCALATION DATA ──

class TestSupportPodEscalations:
    """Test that support pod returns escalation data correctly"""

    def test_support_pod_returns_escalations_array(self, director_token):
        """Support pod for athlete_2 should return escalations array"""
        response = requests.get(
            f"{BASE_URL}/api/support-pods/{TEST_ATHLETE_ID}",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify escalations field exists
        assert "escalations" in data, "Support pod should include escalations field"
        escalations = data["escalations"]
        assert isinstance(escalations, list), "Escalations should be a list"
        print(f"PASS: Support pod returns {len(escalations)} escalations")

    def test_escalation_has_correct_fields(self, director_token):
        """Each escalation should have required fields including action_id"""
        response = requests.get(
            f"{BASE_URL}/api/support-pods/{TEST_ATHLETE_ID}",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        data = response.json()
        escalations = data.get("escalations", [])
        
        if not escalations:
            pytest.skip("No escalations found for athlete")
        
        esc = escalations[0]
        required_fields = [
            "action_id", "type", "status", "coach_id", "athlete_id",
            "reason", "created_at"
        ]
        for field in required_fields:
            assert field in esc, f"Escalation missing required field: {field}"
        
        # Critical check: action_id should be the identifier (not 'id')
        assert "action_id" in esc, "Escalation MUST have action_id field (not 'id')"
        print(f"PASS: Escalation has all required fields, action_id={esc['action_id']}")

    def test_athlete_data_returned_correctly(self, director_token):
        """Support pod returns athlete data with required fields"""
        response = requests.get(
            f"{BASE_URL}/api/support-pods/{TEST_ATHLETE_ID}",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        data = response.json()
        
        assert "athlete" in data, "Response should include athlete data"
        athlete = data["athlete"]
        assert "full_name" in athlete or "id" in athlete, "Athlete data should have identifying info"
        print(f"PASS: Athlete data returned - {athlete.get('full_name', 'Unknown')}")


# ── 2. DIRECTOR GUIDANCE NOTES ──

class TestDirectorNotes:
    """POST /api/support-pods/{athlete_id}/director-notes"""

    def test_director_can_add_guidance_note(self, director_token):
        """Director can add a guidance note to an athlete's pod"""
        note_content = f"TEST_NOTE_{uuid.uuid4().hex[:8]}: Director guidance for testing"
        response = requests.post(
            f"{BASE_URL}/api/support-pods/{TEST_ATHLETE_ID}/director-notes",
            json={
                "content": note_content,
                "escalation_id": EXISTING_ESCALATION_ID
            },
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == True, "Response should indicate success"
        assert "note" in data, "Response should include created note"
        assert data["note"]["content"] == note_content
        print(f"PASS: Director guidance note added - {data['note']['id']}")

    def test_coach_cannot_add_director_note(self, coach_token):
        """Coach should not be able to add director guidance notes"""
        response = requests.post(
            f"{BASE_URL}/api/support-pods/{TEST_ATHLETE_ID}/director-notes",
            json={
                "content": "This should fail",
                "escalation_id": EXISTING_ESCALATION_ID
            },
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("PASS: Coach correctly blocked from adding director notes (403)")

    def test_empty_note_rejected(self, director_token):
        """Empty note content should be rejected"""
        response = requests.post(
            f"{BASE_URL}/api/support-pods/{TEST_ATHLETE_ID}/director-notes",
            json={
                "content": "",
                "escalation_id": EXISTING_ESCALATION_ID
            },
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("PASS: Empty note correctly rejected (400)")


# ── 3. DIRECTOR INTERVENTION TASKS ──

class TestDirectorTasks:
    """POST /api/support-pods/{athlete_id}/director-tasks"""

    def test_director_can_create_intervention_task(self, director_token):
        """Director can create an intervention task for an athlete"""
        task_title = f"TEST_TASK_{uuid.uuid4().hex[:8]}: Follow up on athlete progress"
        response = requests.post(
            f"{BASE_URL}/api/support-pods/{TEST_ATHLETE_ID}/director-tasks",
            json={
                "title": task_title,
                "assignee": "Coach",
                "due_days": 7,
                "escalation_id": EXISTING_ESCALATION_ID
            },
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == True, "Response should indicate success"
        assert "task" in data, "Response should include created task"
        task = data["task"]
        assert task["title"] == task_title
        assert task["owner"] == "Coach"
        assert task["status"] == "ready"
        print(f"PASS: Director intervention task created - {task['id']}")

    def test_task_with_athlete_assignee(self, director_token):
        """Director can assign task to athlete"""
        task_title = f"TEST_TASK_{uuid.uuid4().hex[:8]}: Athlete action item"
        response = requests.post(
            f"{BASE_URL}/api/support-pods/{TEST_ATHLETE_ID}/director-tasks",
            json={
                "title": task_title,
                "assignee": "Athlete",
                "due_days": 3
            },
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["task"]["owner"] == "Athlete"
        print("PASS: Task assigned to Athlete successfully")

    def test_coach_cannot_create_director_task(self, coach_token):
        """Coach should not be able to create director intervention tasks"""
        response = requests.post(
            f"{BASE_URL}/api/support-pods/{TEST_ATHLETE_ID}/director-tasks",
            json={
                "title": "This should fail",
                "assignee": "Coach",
                "due_days": 7
            },
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("PASS: Coach correctly blocked from creating director tasks (403)")

    def test_empty_title_rejected(self, director_token):
        """Empty task title should be rejected"""
        response = requests.post(
            f"{BASE_URL}/api/support-pods/{TEST_ATHLETE_ID}/director-tasks",
            json={
                "title": "",
                "assignee": "Coach",
                "due_days": 7
            },
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("PASS: Empty task title correctly rejected (400)")


# ── 4. MISSION CONTROL ESCALATIONS ──

class TestMissionControlEscalations:
    """Mission Control should return escalations for directors"""

    def test_mission_control_returns_escalations(self, director_token):
        """Director Mission Control should include escalations data"""
        response = requests.get(
            f"{BASE_URL}/api/mission-control",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Mission control should have escalations for director view
        assert "escalations" in data, "Mission control should include escalations"
        escalations = data["escalations"]
        assert isinstance(escalations, list), "Escalations should be a list"
        print(f"PASS: Mission control returns {len(escalations)} escalations")

    def test_mission_control_escalation_structure(self, director_token):
        """Escalations in mission control have correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/mission-control",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        data = response.json()
        escalations = data.get("escalations", [])
        
        if not escalations:
            pytest.skip("No escalations in mission control")
        
        esc = escalations[0]
        # Critical: must have action_id
        assert "action_id" in esc, "Escalation must have action_id"
        assert "athlete_id" in esc, "Escalation must have athlete_id"
        assert "athlete_name" in esc, "Escalation must have athlete_name"
        assert "status" in esc, "Escalation must have status"
        print(f"PASS: Escalation structure correct - {esc['action_id']}")

    def test_director_role_returned(self, director_token):
        """Mission control should return director role"""
        response = requests.get(
            f"{BASE_URL}/api/mission-control",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        data = response.json()
        assert data.get("role") == "director", f"Expected role=director, got {data.get('role')}"
        print("PASS: Director role correctly returned")


# ── 5. ESCALATION ACKNOWLEDGE/RESOLVE ──

class TestEscalationWorkflow:
    """Test acknowledge and resolve for coach escalations"""

    def test_director_can_acknowledge_escalation(self, director_token, coach_token):
        """Director can acknowledge a coach escalation"""
        # First create a new escalation via coach
        escalate_resp = requests.post(
            f"{BASE_URL}/api/support-pods/{TEST_ATHLETE_ID}/escalate",
            json={
                "title": f"TEST_ESCALATION_{uuid.uuid4().hex[:8]}",
                "reason": "other",
                "description": "Testing director acknowledge flow",
                "urgency": "high"
            },
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert escalate_resp.status_code == 200, f"Failed to create escalation: {escalate_resp.text}"
        action_id = escalate_resp.json().get("action_id")
        assert action_id, "Escalation should return action_id"
        
        # Now director acknowledges
        ack_resp = requests.post(
            f"{BASE_URL}/api/director/actions/{action_id}/acknowledge",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert ack_resp.status_code == 200, f"Expected 200, got {ack_resp.status_code}: {ack_resp.text}"
        assert ack_resp.json().get("status") == "acknowledged"
        print(f"PASS: Director acknowledged escalation {action_id}")

    def test_director_can_resolve_escalation(self, director_token, coach_token):
        """Director can resolve an escalation with a note"""
        # Create and acknowledge escalation
        escalate_resp = requests.post(
            f"{BASE_URL}/api/support-pods/{TEST_ATHLETE_ID}/escalate",
            json={
                "title": f"TEST_ESCALATION_{uuid.uuid4().hex[:8]}",
                "reason": "other",
                "description": "Testing director resolve flow",
                "urgency": "medium"
            },
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        action_id = escalate_resp.json().get("action_id")
        
        # Director resolves
        resolve_resp = requests.post(
            f"{BASE_URL}/api/director/actions/{action_id}/resolve",
            json={"note": "Resolved by director during testing"},
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert resolve_resp.status_code == 200, f"Expected 200, got {resolve_resp.status_code}: {resolve_resp.text}"
        assert resolve_resp.json().get("status") == "resolved"
        print(f"PASS: Director resolved escalation {action_id}")


# ── 6. COACH VIEW VS DIRECTOR VIEW ──

class TestRoleBasedViews:
    """Test that coach and director see appropriate views"""

    def test_coach_mission_control_not_director_view(self, coach_token):
        """Coach should see coach view, not director view"""
        response = requests.get(
            f"{BASE_URL}/api/mission-control",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # Coach role should NOT be director
        assert data.get("role") != "director", "Coach should not have director role"
        print(f"PASS: Coach has role={data.get('role')}, not director")

    def test_coach_cannot_access_director_notes_endpoint(self, coach_token):
        """Coach cannot use director-notes endpoint"""
        response = requests.post(
            f"{BASE_URL}/api/support-pods/{TEST_ATHLETE_ID}/director-notes",
            json={"content": "Test", "escalation_id": "test"},
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert response.status_code == 403
        print("PASS: Coach blocked from director-notes endpoint")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

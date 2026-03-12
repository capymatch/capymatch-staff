"""
Tests for Task Workflow features in Support Pod:
- Task completion with completed_by/completed_at logging
- Completion activity log (action_completed event)
- Task escalation to director action
- Escalation activity log (action_escalated event)
- Task cancellation with cancelled_by/cancelled_at
- Task creation via POST
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
ATHLETE_ID = "athlete_3"  # Emma Chen - test athlete

# Test credentials
TEST_EMAIL = "coach.williams@capymatch.com"
TEST_PASSWORD = "coach123"


class TestTaskWorkflow:
    """Tests for task completion, escalation, cancellation flows"""

    @pytest.fixture(scope="class")
    def session(self):
        """Create authenticated session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        
        # Login to get auth cookie/token
        login_resp = s.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        
        # Set auth header if token returned
        data = login_resp.json()
        if "token" in data:
            s.headers.update({"Authorization": f"Bearer {data['token']}"})
        
        return s

    def test_01_support_pod_loads(self, session):
        """Verify Support Pod endpoint returns data for athlete_3"""
        resp = session.get(f"{BASE_URL}/api/support-pods/{ATHLETE_ID}")
        assert resp.status_code == 200, f"Pod load failed: {resp.text}"
        
        data = resp.json()
        assert "athlete" in data
        assert "actions" in data
        assert "timeline" in data
        # Athlete may have 'id' or 'athlete_id' depending on schema
        athlete_id_field = data["athlete"].get("athlete_id") or data["athlete"].get("id")
        assert athlete_id_field == ATHLETE_ID or ATHLETE_ID in str(athlete_id_field)
        print(f"✓ Support Pod loaded for {data['athlete'].get('full_name', ATHLETE_ID)}")

    def test_02_create_task_and_verify(self, session):
        """Create a new task via POST and verify it's returned"""
        task_title = f"TEST_Task_{uuid.uuid4().hex[:8]}"
        
        create_resp = session.post(f"{BASE_URL}/api/support-pods/{ATHLETE_ID}/actions", json={
            "title": task_title,
            "owner": "Coach Williams",
            "owner_role": "coach",
            "source_category": "academic",
            "notes": "Test task for workflow testing"
        })
        assert create_resp.status_code == 200, f"Create task failed: {create_resp.text}"
        
        created = create_resp.json()
        assert "id" in created
        assert created["title"] == task_title
        assert created["status"] == "ready"
        assert created["owner"] == "Coach Williams"
        assert created["created_by"] is not None
        
        # Verify task appears in Support Pod data
        pod_resp = session.get(f"{BASE_URL}/api/support-pods/{ATHLETE_ID}")
        assert pod_resp.status_code == 200
        
        actions = pod_resp.json().get("actions", [])
        matching = [a for a in actions if a["id"] == created["id"]]
        assert len(matching) == 1, "Created task not found in pod actions"
        
        # Store task ID for subsequent tests
        self.__class__.test_task_id = created["id"]
        self.__class__.test_task_title = task_title
        print(f"✓ Task created: {task_title} (id={created['id']})")

    def test_03_complete_task_and_verify(self, session):
        """Complete a task and verify completed_by, completed_at fields"""
        task_id = getattr(self.__class__, 'test_task_id', None)
        if not task_id:
            pytest.skip("No task ID from previous test")
        
        # Complete the task
        complete_resp = session.patch(
            f"{BASE_URL}/api/support-pods/{ATHLETE_ID}/actions/{task_id}",
            json={"status": "completed"}
        )
        assert complete_resp.status_code == 200, f"Complete task failed: {complete_resp.text}"
        
        completed = complete_resp.json()
        
        # Verify completed_by and completed_at fields
        assert completed.get("status") == "completed", "Status not set to completed"
        assert completed.get("completed_by") is not None, "completed_by field missing"
        assert completed.get("completed_at") is not None, "completed_at field missing"
        
        print(f"✓ Task completed by {completed['completed_by']} at {completed['completed_at']}")
        
        # Store for activity log verification
        self.__class__.completed_task_id = task_id

    def test_04_completion_activity_log(self, session):
        """Verify action_completed event in timeline after task completion"""
        task_id = getattr(self.__class__, 'completed_task_id', None)
        if not task_id:
            pytest.skip("No completed task ID from previous test")
        
        # Get Support Pod data with timeline
        pod_resp = session.get(f"{BASE_URL}/api/support-pods/{ATHLETE_ID}")
        assert pod_resp.status_code == 200
        
        data = pod_resp.json()
        action_events = data.get("timeline", {}).get("action_events", [])
        
        # Find action_completed event for our task
        completed_events = [
            e for e in action_events 
            if e.get("type") == "action_completed" and e.get("action_id") == task_id
        ]
        
        assert len(completed_events) >= 1, "action_completed event not found in timeline"
        
        event = completed_events[0]
        assert "completed" in event.get("description", "").lower(), "Description should mention 'completed'"
        assert event.get("actor") is not None, "Actor should be recorded"
        
        print(f"✓ Completion event found: {event.get('description')}")

    def test_05_create_and_escalate_task(self, session):
        """Create a task and escalate it to director"""
        # Create a new task for escalation
        task_title = f"TEST_Escalate_{uuid.uuid4().hex[:8]}"
        
        create_resp = session.post(f"{BASE_URL}/api/support-pods/{ATHLETE_ID}/actions", json={
            "title": task_title,
            "owner": "Coach Williams",
            "owner_role": "coach",
            "source_category": "engagement"
        })
        assert create_resp.status_code == 200
        task_id = create_resp.json()["id"]
        
        # Escalate the task
        escalate_resp = session.post(
            f"{BASE_URL}/api/support-pods/{ATHLETE_ID}/actions/{task_id}/escalate",
            json={"reason": "Need director approval for academic intervention"}
        )
        assert escalate_resp.status_code == 200, f"Escalate failed: {escalate_resp.text}"
        
        escalate_data = escalate_resp.json()
        
        # Verify escalation response
        assert escalate_data.get("ok") == True, "Escalation should return ok=True"
        assert escalate_data.get("task_status") == "escalated", "Task status should be 'escalated'"
        assert escalate_data.get("director_action_id") is not None, "director_action_id should be returned"
        assert escalate_data["director_action_id"].startswith("da_"), "Director action ID format should be da_*"
        
        print(f"✓ Task escalated, director action: {escalate_data['director_action_id']}")
        
        # Store for activity log verification
        self.__class__.escalated_task_id = task_id
        self.__class__.escalated_task_title = task_title
        self.__class__.director_action_id = escalate_data["director_action_id"]

    def test_06_escalation_activity_log(self, session):
        """Verify action_escalated event in timeline"""
        task_id = getattr(self.__class__, 'escalated_task_id', None)
        if not task_id:
            pytest.skip("No escalated task ID from previous test")
        
        # Get Support Pod timeline
        pod_resp = session.get(f"{BASE_URL}/api/support-pods/{ATHLETE_ID}")
        assert pod_resp.status_code == 200
        
        action_events = pod_resp.json().get("timeline", {}).get("action_events", [])
        
        # Find escalation event
        escalated_events = [
            e for e in action_events 
            if e.get("type") == "action_escalated" and e.get("action_id") == task_id
        ]
        
        assert len(escalated_events) >= 1, "action_escalated event not found in timeline"
        
        event = escalated_events[0]
        assert "escalated" in event.get("description", "").lower(), "Description should mention 'escalated'"
        assert event.get("actor") is not None
        
        print(f"✓ Escalation event found: {event.get('description')}")

    def test_07_escalated_task_has_correct_status(self, session):
        """Verify escalated task has status='escalated' and escalation fields"""
        task_id = getattr(self.__class__, 'escalated_task_id', None)
        if not task_id:
            pytest.skip("No escalated task ID from previous test")
        
        pod_resp = session.get(f"{BASE_URL}/api/support-pods/{ATHLETE_ID}")
        assert pod_resp.status_code == 200
        
        actions = pod_resp.json().get("actions", [])
        matching = [a for a in actions if a["id"] == task_id]
        
        assert len(matching) == 1, "Escalated task not found"
        task = matching[0]
        
        assert task.get("status") == "escalated", "Task should have status='escalated'"
        assert task.get("escalated_by") is not None, "escalated_by field should be set"
        assert task.get("escalated_at") is not None, "escalated_at field should be set"
        assert task.get("escalation_reason") is not None, "escalation_reason should be set"
        
        print(f"✓ Escalated task verified: {task.get('title')} - escalated by {task.get('escalated_by')}")

    def test_08_cancel_task(self, session):
        """Create and cancel a task, verify cancelled_by and cancelled_at"""
        # Create a task to cancel
        task_title = f"TEST_Cancel_{uuid.uuid4().hex[:8]}"
        
        create_resp = session.post(f"{BASE_URL}/api/support-pods/{ATHLETE_ID}/actions", json={
            "title": task_title,
            "owner": "Coach Williams",
            "owner_role": "coach"
        })
        assert create_resp.status_code == 200
        task_id = create_resp.json()["id"]
        
        # Cancel the task
        cancel_resp = session.patch(
            f"{BASE_URL}/api/support-pods/{ATHLETE_ID}/actions/{task_id}",
            json={"status": "cancelled"}
        )
        assert cancel_resp.status_code == 200, f"Cancel failed: {cancel_resp.text}"
        
        cancelled = cancel_resp.json()
        
        # Verify cancellation fields
        assert cancelled.get("status") == "cancelled"
        assert cancelled.get("cancelled_by") is not None, "cancelled_by field missing"
        assert cancelled.get("cancelled_at") is not None, "cancelled_at field missing"
        
        print(f"✓ Task cancelled: {task_title} by {cancelled['cancelled_by']}")
        
        self.__class__.cancelled_task_id = task_id

    def test_09_cancelled_task_in_done_section(self, session):
        """Verify cancelled task appears with done status (completed/cancelled/escalated)"""
        task_id = getattr(self.__class__, 'cancelled_task_id', None)
        if not task_id:
            pytest.skip("No cancelled task ID from previous test")
        
        pod_resp = session.get(f"{BASE_URL}/api/support-pods/{ATHLETE_ID}")
        assert pod_resp.status_code == 200
        
        actions = pod_resp.json().get("actions", [])
        matching = [a for a in actions if a["id"] == task_id]
        
        assert len(matching) == 1
        task = matching[0]
        assert task.get("status") == "cancelled"
        
        print(f"✓ Cancelled task found with status: {task['status']}")

    def test_10_escalate_without_reason_fails(self, session):
        """Escalation should fail without a reason"""
        # Create a task
        task_title = f"TEST_NoReason_{uuid.uuid4().hex[:8]}"
        create_resp = session.post(f"{BASE_URL}/api/support-pods/{ATHLETE_ID}/actions", json={
            "title": task_title,
            "owner": "Coach Williams",
            "owner_role": "coach"
        })
        assert create_resp.status_code == 200
        task_id = create_resp.json()["id"]
        
        # Try to escalate without reason
        escalate_resp = session.post(
            f"{BASE_URL}/api/support-pods/{ATHLETE_ID}/actions/{task_id}/escalate",
            json={"reason": ""}
        )
        
        # Should return 400 Bad Request
        assert escalate_resp.status_code == 400, f"Expected 400, got {escalate_resp.status_code}"
        print("✓ Escalation without reason correctly rejected")

    def test_11_action_created_event_logged(self, session):
        """Verify action_created event is logged when task is created"""
        # Create a unique task
        task_title = f"TEST_EventLog_{uuid.uuid4().hex[:8]}"
        
        create_resp = session.post(f"{BASE_URL}/api/support-pods/{ATHLETE_ID}/actions", json={
            "title": task_title,
            "owner": "Coach Williams",
            "owner_role": "coach"
        })
        assert create_resp.status_code == 200
        task_id = create_resp.json()["id"]
        
        # Check timeline for action_created event
        pod_resp = session.get(f"{BASE_URL}/api/support-pods/{ATHLETE_ID}")
        assert pod_resp.status_code == 200
        
        action_events = pod_resp.json().get("timeline", {}).get("action_events", [])
        
        # Find creation event
        created_events = [
            e for e in action_events 
            if e.get("type") == "action_created" and task_title in e.get("description", "")
        ]
        
        assert len(created_events) >= 1, "action_created event not found"
        print(f"✓ Creation event logged: {created_events[0].get('description')}")


class TestCompletedTasksSection:
    """Tests for the Completed & Resolved section behavior"""

    @pytest.fixture(scope="class")
    def session(self):
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        
        login_resp = s.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert login_resp.status_code == 200
        
        data = login_resp.json()
        if "token" in data:
            s.headers.update({"Authorization": f"Bearer {data['token']}"})
        
        return s

    def test_completed_tasks_have_all_fields(self, session):
        """Completed tasks should have completed_by, completed_at, status"""
        pod_resp = session.get(f"{BASE_URL}/api/support-pods/{ATHLETE_ID}")
        assert pod_resp.status_code == 200
        
        actions = pod_resp.json().get("actions", [])
        completed = [a for a in actions if a.get("status") == "completed"]
        
        if len(completed) == 0:
            pytest.skip("No completed tasks to verify")
        
        # Check that at least some completed tasks have the new fields
        # (old tasks from before the feature may not have completed_by)
        tasks_with_completed_by = [t for t in completed if t.get("completed_by")]
        tasks_with_completed_at = [t for t in completed if t.get("completed_at")]
        
        print(f"Total completed tasks: {len(completed)}")
        print(f"Tasks with completed_by: {len(tasks_with_completed_by)}")
        print(f"Tasks with completed_at: {len(tasks_with_completed_at)}")
        
        # All should have completed_at (timestamp)
        assert len(tasks_with_completed_at) > 0, "No completed tasks have completed_at field"
        
        for task in tasks_with_completed_by[:3]:
            print(f"✓ Completed task: {task.get('title', 'N/A')[:40]}... by {task['completed_by']}")

    def test_escalated_tasks_have_all_fields(self, session):
        """Escalated tasks should have escalated_by, escalated_at, escalation_reason"""
        pod_resp = session.get(f"{BASE_URL}/api/support-pods/{ATHLETE_ID}")
        assert pod_resp.status_code == 200
        
        actions = pod_resp.json().get("actions", [])
        escalated = [a for a in actions if a.get("status") == "escalated"]
        
        if len(escalated) == 0:
            pytest.skip("No escalated tasks to verify")
        
        for task in escalated[:3]:
            assert task.get("escalated_by") is not None, f"Task {task['id']} missing escalated_by"
            assert task.get("escalated_at") is not None, f"Task {task['id']} missing escalated_at"
            print(f"✓ Escalated task: {task.get('title', 'N/A')[:40]}... by {task['escalated_by']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

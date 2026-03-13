"""
Event Routing Fix Backend Tests
Tests for:
1. Event summary loads with auth headers
2. Route single note creates actions with correct program_id
3. Routed actions appear in correct School Pod
4. Route note returns program_id in response
5. Bulk route creates school-scoped actions
6. Regression: School Pod playbooks still render
7. Regression: Playbook step persistence still works
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
COACH_EMAIL = "coach.williams@capymatch.com"
COACH_PASSWORD = "coach123"
TEST_ATHLETE_ID = "athlete_3"
TEST_EVENT_ID = "event_0"
STANFORD_PROGRAM_ID = "a54a0014-0e83-4a16-b0c2-5e8f10401de2"
EMORY_PROGRAM_ID = "ae7647cc-affc-44ef-8977-244309ac3a30"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for coach"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": COACH_EMAIL, "password": COACH_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Create auth headers dict"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestEventSummaryWithAuth:
    """Test that event summary loads correctly with auth headers"""
    
    def test_01_event_summary_loads_with_auth(self, auth_headers):
        """GET /api/events/event_0/summary with auth returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/events/{TEST_EVENT_ID}/summary",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Summary failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "event" in data
        assert "stats" in data
        assert "hottestInterest" in data
        assert "followUpActions" in data
        assert "allNotes" in data
        print(f"Event summary loaded: {data['event']['name']}, {data['stats']['totalNotes']} notes")
    
    def test_02_event_summary_has_correct_stats(self, auth_headers):
        """Event stats should have correct field structure"""
        response = requests.get(
            f"{BASE_URL}/api/events/{TEST_EVENT_ID}/summary",
            headers=auth_headers
        )
        data = response.json()
        stats = data["stats"]
        
        assert "totalNotes" in stats
        assert "schoolsInteracted" in stats
        assert "athletesSeen" in stats
        assert "followUpsNeeded" in stats
        assert stats["totalNotes"] >= 5, f"Expected at least 5 notes, got {stats['totalNotes']}"
        print(f"Stats: {stats['totalNotes']} notes, {stats['schoolsInteracted']} schools, {stats['athletesSeen']} athletes")
    
    def test_03_notes_have_interest_badges(self, auth_headers):
        """Notes should have valid interest_level values"""
        response = requests.get(
            f"{BASE_URL}/api/events/{TEST_EVENT_ID}/summary",
            headers=auth_headers
        )
        data = response.json()
        
        valid_levels = {"hot", "warm", "cool", "none"}
        for note in data["hottestInterest"]:
            assert note.get("interest_level") in valid_levels, f"Invalid interest level: {note.get('interest_level')}"
        print(f"All {len(data['hottestInterest'])} hottest notes have valid interest levels")


class TestRouteSingleNote:
    """Test route single note creates actions with correct program_id"""
    
    def test_01_create_test_note_for_emma_stanford(self, auth_headers):
        """Create a fresh note for Emma x Stanford to test routing"""
        note_payload = {
            "athlete_id": TEST_ATHLETE_ID,
            "school_id": "stanford",
            "school_name": "Stanford",
            "interest_level": "hot",
            "note_text": f"TEST_ROUTING_{uuid.uuid4().hex[:8]} - Stanford coach showed strong interest",
            "follow_ups": ["schedule_call", "send_film"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/events/{TEST_EVENT_ID}/notes",
            json=note_payload,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Create note failed: {response.text}"
        data = response.json()
        
        assert "id" in data
        assert data["athlete_id"] == TEST_ATHLETE_ID
        assert data["school_name"] == "Stanford"
        assert data.get("routed_to_pod") is not True  # Should not be routed yet
        
        # Store note_id for next test
        pytest.test_note_id = data["id"]
        print(f"Created test note: {data['id']}")
    
    def test_02_route_note_returns_program_id(self, auth_headers):
        """POST /api/events/{eventId}/notes/{noteId}/route returns program_id"""
        note_id = getattr(pytest, 'test_note_id', None)
        if not note_id:
            pytest.skip("No test note created")
        
        response = requests.post(
            f"{BASE_URL}/api/events/{TEST_EVENT_ID}/notes/{note_id}/route",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Route failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get("routed") == True
        assert "note" in data
        assert "actions_created" in data
        assert "program_id" in data, "Response should include program_id"
        
        # Verify program_id matches Stanford
        assert data["program_id"] == STANFORD_PROGRAM_ID, f"Expected Stanford program_id, got {data['program_id']}"
        assert data["actions_created"] >= 1, f"Should create at least 1 action"
        
        print(f"Route returned program_id: {data['program_id']}, actions: {data['actions_created']}")
    
    def test_03_routed_actions_appear_in_school_pod(self, auth_headers):
        """Actions from routing should appear in Stanford School Pod"""
        response = requests.get(
            f"{BASE_URL}/api/support-pods/{TEST_ATHLETE_ID}/school/{STANFORD_PROGRAM_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"School pod failed: {response.text}"
        data = response.json()
        
        # Verify actions exist with event source
        event_actions = [a for a in data["actions"] if a.get("source") == "event"]
        assert len(event_actions) >= 1, "School Pod should have event-sourced actions"
        
        # Verify actions have correct program_id
        for action in event_actions:
            assert action.get("program_id") == STANFORD_PROGRAM_ID, f"Action missing correct program_id"
            assert action.get("athlete_id") == TEST_ATHLETE_ID
        
        print(f"Stanford School Pod has {len(event_actions)} event-sourced actions")
    
    def test_04_timeline_note_created_with_program_id(self, auth_headers):
        """Routing should create timeline note with program_id"""
        response = requests.get(
            f"{BASE_URL}/api/support-pods/{TEST_ATHLETE_ID}/school/{STANFORD_PROGRAM_ID}",
            headers=auth_headers
        )
        data = response.json()
        
        # Check notes for event_routed tag
        event_notes = [n for n in data["notes"] if n.get("tag") == "event_routed"]
        assert len(event_notes) >= 1, "Should have event_routed notes"
        
        for note in event_notes:
            assert note.get("program_id") == STANFORD_PROGRAM_ID, "Note should have program_id"
        
        print(f"Found {len(event_notes)} event_routed timeline notes")


class TestBulkRoute:
    """Test bulk route creates school-scoped actions"""
    
    def test_01_bulk_route_endpoint_works(self, auth_headers):
        """POST /api/events/{eventId}/route-to-pods returns success structure"""
        response = requests.post(
            f"{BASE_URL}/api/events/{TEST_EVENT_ID}/route-to-pods",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Bulk route failed: {response.text}"
        data = response.json()
        
        assert "routed_notes" in data
        assert "actions_created" in data
        assert "athletes_affected" in data
        
        print(f"Bulk route: {data['routed_notes']} notes, {data['actions_created']} actions")


class TestRegressionSchoolPodPlaybooks:
    """Regression: School Pod playbooks should still render correctly"""
    
    def test_01_emory_school_pod_has_playbook(self, auth_headers):
        """Emory School Pod should have playbook"""
        response = requests.get(
            f"{BASE_URL}/api/support-pods/{TEST_ATHLETE_ID}/school/{EMORY_PROGRAM_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "playbook" in data
        # Playbook may be null if no signals, but field should exist
        if data["playbook"]:
            assert "title" in data["playbook"]
            assert "steps" in data["playbook"]
            print(f"Emory playbook: {data['playbook']['title']}")
        else:
            print("Emory has no active playbook (no signals)")
    
    def test_02_stanford_school_pod_has_playbook(self, auth_headers):
        """Stanford School Pod should have playbook"""
        response = requests.get(
            f"{BASE_URL}/api/support-pods/{TEST_ATHLETE_ID}/school/{STANFORD_PROGRAM_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "playbook" in data
        if data["playbook"]:
            assert "title" in data["playbook"]
            assert "steps" in data["playbook"]
            assert "success_criteria" in data["playbook"]
            print(f"Stanford playbook: {data['playbook']['title']} with {len(data['playbook']['steps'])} steps")
        else:
            print("Stanford has no active playbook")


class TestRegressionPlaybookPersistence:
    """Regression: Playbook step persistence should still work"""
    
    def test_01_get_playbook_progress_endpoint(self, auth_headers):
        """GET playbook progress endpoint should exist"""
        response = requests.get(
            f"{BASE_URL}/api/support-pods/{TEST_ATHLETE_ID}/school/{EMORY_PROGRAM_ID}/playbook-progress",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "checked_steps" in data
        print(f"Playbook progress: {data['checked_steps']}")
    
    def test_02_patch_playbook_progress_saves(self, auth_headers):
        """PATCH playbook progress should save steps"""
        test_steps = [1, 2]
        response = requests.patch(
            f"{BASE_URL}/api/support-pods/{TEST_ATHLETE_ID}/school/{STANFORD_PROGRAM_ID}/playbook-progress",
            json={"checked_steps": test_steps},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("saved") == True
        assert data.get("checked_steps") == test_steps
        print(f"Saved playbook progress: {test_steps}")
    
    def test_03_school_pod_includes_playbook_checked_steps(self, auth_headers):
        """School pod response should include playbook_checked_steps"""
        response = requests.get(
            f"{BASE_URL}/api/support-pods/{TEST_ATHLETE_ID}/school/{STANFORD_PROGRAM_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "playbook_checked_steps" in data
        print(f"School pod playbook_checked_steps: {data['playbook_checked_steps']}")


class TestEventSummaryNotesRouteStatus:
    """Test that notes in event summary show correct routed status"""
    
    def test_01_notes_show_routed_status(self, auth_headers):
        """All notes should have routed_to_pod field"""
        response = requests.get(
            f"{BASE_URL}/api/events/{TEST_EVENT_ID}/summary",
            headers=auth_headers
        )
        data = response.json()
        
        for note in data["allNotes"]:
            assert "routed_to_pod" in note, f"Note {note.get('id')} missing routed_to_pod"
        
        routed_count = sum(1 for n in data["allNotes"] if n.get("routed_to_pod"))
        print(f"Notes routed status: {routed_count}/{len(data['allNotes'])} routed")


class TestFollowUpActionsStructure:
    """Test follow-up actions have correct structure"""
    
    def test_01_follow_up_actions_have_required_fields(self, auth_headers):
        """Follow-up actions should have title, owner, routed, athlete_name"""
        response = requests.get(
            f"{BASE_URL}/api/events/{TEST_EVENT_ID}/summary",
            headers=auth_headers
        )
        data = response.json()
        
        for action in data["followUpActions"]:
            assert "title" in action, f"Action missing title"
            assert "owner" in action, f"Action missing owner"
            assert "routed" in action, f"Action missing routed"
            assert "athlete_name" in action, f"Action missing athlete_name"
        
        print(f"All {len(data['followUpActions'])} follow-up actions have required fields")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

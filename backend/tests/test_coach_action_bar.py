"""
Test Coach Action Bar Feature APIs:
- POST /athletes/{id}/notes (for Email, Log Interaction, Follow-up timeline logs)
- GET /athletes/{id}/notes (for Notes sidebar)
- DELETE /athletes/{id}/notes/{note_id}
- PATCH /athletes/{id}/notes/{note_id}
- POST /support-pods/{id}/actions (for Follow-up action creation)
- POST /support-pods/{id}/escalate (for Escalate to Director)
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthSetup:
    """Get auth token for coach user"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "coach.williams@capymatch.com",
            "password": "coach123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }


class TestNotesEndpoint(TestAuthSetup):
    """Tests for GET/POST/DELETE/PATCH /athletes/{id}/notes endpoints"""
    
    athlete_id = "athlete_1"
    created_note_id = None
    
    def test_create_note_email_tag(self, auth_headers):
        """Test creating a note with 'Email' tag (Email composer feature)"""
        response = requests.post(
            f"{BASE_URL}/api/athletes/{self.athlete_id}/notes",
            headers=auth_headers,
            json={
                "text": "Email to Sarah Chen (Athlete)\nSubject: Recruiting Update\n\nHi Sarah, just wanted to check in about your recruiting progress.",
                "tag": "Email"
            }
        )
        assert response.status_code == 200, f"Create email note failed: {response.text}"
        data = response.json()
        assert data.get("text"), "Response should contain text"
        assert data.get("tag") == "Email", "Tag should be Email"
        assert data.get("id"), "Response should contain note id"
        TestNotesEndpoint.created_note_id = data["id"]
        print(f"Created email note: {data['id']}")
    
    def test_create_note_interaction_tag(self, auth_headers):
        """Test creating a note with interaction type tag (Log Interaction feature)"""
        response = requests.post(
            f"{BASE_URL}/api/athletes/{self.athlete_id}/notes",
            headers=auth_headers,
            json={
                "text": "[Athlete Check-in] Discussed recruiting timeline. Athlete feeling confident.\nOutcome: Positive",
                "tag": "Athlete Check-in"
            }
        )
        assert response.status_code == 200, f"Create interaction note failed: {response.text}"
        data = response.json()
        assert data.get("tag") == "Athlete Check-in"
        print(f"Created interaction note: {data['id']}")
    
    def test_create_note_followup_tag(self, auth_headers):
        """Test creating a note with 'Follow-up' tag (Follow-up scheduler feature)"""
        response = requests.post(
            f"{BASE_URL}/api/athletes/{self.athlete_id}/notes",
            headers=auth_headers,
            json={
                "text": "Follow-up scheduled for Jan 20: Athlete check-in call — Discuss recruiting plan changes",
                "tag": "Follow-up"
            }
        )
        assert response.status_code == 200, f"Create follow-up note failed: {response.text}"
        data = response.json()
        assert data.get("tag") == "Follow-up"
        print(f"Created follow-up note: {data['id']}")
    
    def test_create_note_coach_note_tag(self, auth_headers):
        """Test creating a note with 'Coach Note' tag (Notes sidebar feature)"""
        response = requests.post(
            f"{BASE_URL}/api/athletes/{self.athlete_id}/notes",
            headers=auth_headers,
            json={
                "text": "TEST_CoachNote: Athlete showing great progress in recruiting activities.",
                "tag": "Coach Note"
            }
        )
        assert response.status_code == 200, f"Create coach note failed: {response.text}"
        data = response.json()
        assert data.get("tag") == "Coach Note"
        TestNotesEndpoint.created_note_id = data["id"]  # Save for later tests
        print(f"Created coach note: {data['id']}")
    
    def test_create_note_escalation_tag(self, auth_headers):
        """Test creating a note with 'Escalation' tag (Escalate feature)"""
        response = requests.post(
            f"{BASE_URL}/api/athletes/{self.athlete_id}/notes",
            headers=auth_headers,
            json={
                "text": "Escalated to Director: Needs director intervention\nFamily concern requires immediate attention.",
                "tag": "Escalation"
            }
        )
        assert response.status_code == 200, f"Create escalation note failed: {response.text}"
        data = response.json()
        assert data.get("tag") == "Escalation"
        print(f"Created escalation note: {data['id']}")
    
    def test_get_notes(self, auth_headers):
        """Test GET /athletes/{id}/notes returns notes array"""
        response = requests.get(
            f"{BASE_URL}/api/athletes/{self.athlete_id}/notes",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Get notes failed: {response.text}"
        data = response.json()
        assert "notes" in data, "Response should have 'notes' key"
        assert isinstance(data["notes"], list), "notes should be a list"
        print(f"Retrieved {len(data['notes'])} notes")
    
    def test_patch_note(self, auth_headers):
        """Test PATCH /athletes/{id}/notes/{note_id} to update note text"""
        if not TestNotesEndpoint.created_note_id:
            pytest.skip("No note created to update")
        
        new_text = "TEST_CoachNote: Updated - Athlete showing excellent progress!"
        response = requests.patch(
            f"{BASE_URL}/api/athletes/{self.athlete_id}/notes/{TestNotesEndpoint.created_note_id}",
            headers=auth_headers,
            json={"text": new_text}
        )
        assert response.status_code == 200, f"Update note failed: {response.text}"
        data = response.json()
        assert data.get("updated") == True, "Response should confirm update"
        print(f"Updated note: {TestNotesEndpoint.created_note_id}")
    
    def test_delete_note(self, auth_headers):
        """Test DELETE /athletes/{id}/notes/{note_id}"""
        if not TestNotesEndpoint.created_note_id:
            pytest.skip("No note created to delete")
        
        response = requests.delete(
            f"{BASE_URL}/api/athletes/{self.athlete_id}/notes/{TestNotesEndpoint.created_note_id}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Delete note failed: {response.text}"
        data = response.json()
        assert data.get("deleted") == True, "Response should confirm deletion"
        print(f"Deleted note: {TestNotesEndpoint.created_note_id}")


class TestPodActionsEndpoint(TestAuthSetup):
    """Tests for POST /support-pods/{id}/actions (Follow-up creates action items)"""
    
    athlete_id = "athlete_1"
    
    def test_create_action_for_followup(self, auth_headers):
        """Test creating an action item (Follow-up feature creates action + note)"""
        response = requests.post(
            f"{BASE_URL}/api/support-pods/{self.athlete_id}/actions",
            headers=auth_headers,
            json={
                "title": "TEST_Followup: Athlete check-in call",
                "owner": "Coach Martinez",
                "due_date": "2026-01-25T10:00:00Z"
            }
        )
        assert response.status_code == 200, f"Create action failed: {response.text}"
        data = response.json()
        assert data.get("title"), "Response should have title"
        assert data.get("owner") == "Coach Martinez", "Owner should match"
        assert data.get("due_date"), "Response should have due_date"
        assert data.get("id"), "Response should have action id"
        print(f"Created follow-up action: {data['id']}")


class TestEscalateEndpoint(TestAuthSetup):
    """Tests for POST /support-pods/{id}/escalate (Escalate to Director feature)"""
    
    athlete_id = "athlete_1"
    
    def test_escalate_to_director(self, auth_headers):
        """Test escalation creates director_actions document"""
        response = requests.post(
            f"{BASE_URL}/api/support-pods/{self.athlete_id}/escalate",
            headers=auth_headers,
            json={
                "athlete_name": "Sarah Chen",
                "type": "escalation",
                "title": "Escalation: Needs director intervention",
                "reason": "needs_intervention",
                "description": "TEST_Escalation: Family concern requires immediate director review.",
                "urgency": "high",
                "source": "coach_escalation"
            }
        )
        assert response.status_code == 200, f"Escalation failed: {response.text}"
        data = response.json()
        assert data.get("action_id"), "Response should have action_id"
        assert data.get("type") == "coach_escalation", "Type should be coach_escalation"
        assert data.get("urgency") == "high", "Urgency should be high"
        assert data.get("status") == "open", "Status should be open"
        assert data.get("athlete_id") == self.athlete_id, "athlete_id should match"
        print(f"Created escalation: {data['action_id']}")
    
    def test_escalate_with_medium_urgency(self, auth_headers):
        """Test escalation with medium urgency"""
        response = requests.post(
            f"{BASE_URL}/api/support-pods/{self.athlete_id}/escalate",
            headers=auth_headers,
            json={
                "athlete_name": "Sarah Chen",
                "title": "Escalation: Resource request",
                "reason": "resource_request",
                "description": "TEST_Escalation: Need additional coaching resources for recruiting.",
                "urgency": "medium"
            }
        )
        assert response.status_code == 200, f"Escalation failed: {response.text}"
        data = response.json()
        assert data.get("urgency") == "medium"
        print(f"Created medium urgency escalation: {data['action_id']}")
    
    def test_escalate_with_low_urgency(self, auth_headers):
        """Test escalation with low urgency"""
        response = requests.post(
            f"{BASE_URL}/api/support-pods/{self.athlete_id}/escalate",
            headers=auth_headers,
            json={
                "athlete_name": "Sarah Chen",
                "title": "Escalation: Strategy review needed",
                "reason": "strategy_review",
                "description": "TEST_Escalation: Need to discuss long-term recruiting strategy.",
                "urgency": "low"
            }
        )
        assert response.status_code == 200, f"Escalation failed: {response.text}"
        data = response.json()
        assert data.get("urgency") == "low"
        print(f"Created low urgency escalation: {data['action_id']}")


class TestSupportPodResponse(TestAuthSetup):
    """Verify Support Pod response structure"""
    
    athlete_id = "athlete_1"
    
    def test_support_pod_returns_complete_data(self, auth_headers):
        """Verify Support Pod endpoint returns all required data for action bar"""
        response = requests.get(
            f"{BASE_URL}/api/support-pods/{self.athlete_id}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Get support pod failed: {response.text}"
        data = response.json()
        
        # Verify athlete data exists
        assert "athlete" in data, "Response should have athlete"
        assert data["athlete"].get("full_name"), "Athlete should have full_name"
        
        # Verify pod_members for Email recipient dropdown
        assert "pod_members" in data, "Response should have pod_members"
        assert isinstance(data["pod_members"], list), "pod_members should be a list"
        
        # Verify actions exist for Follow-up
        assert "actions" in data, "Response should have actions"
        
        # Verify timeline exists
        assert "timeline" in data, "Response should have timeline"
        
        print(f"Support Pod data verified: athlete={data['athlete'].get('full_name')}, pod_members={len(data['pod_members'])}")


# Cleanup test data created during tests
class TestCleanup(TestAuthSetup):
    """Cleanup TEST_ prefixed data"""
    
    athlete_id = "athlete_1"
    
    def test_cleanup_test_notes(self, auth_headers):
        """Delete any remaining TEST_ prefixed notes"""
        # Get all notes
        response = requests.get(
            f"{BASE_URL}/api/athletes/{self.athlete_id}/notes",
            headers=auth_headers
        )
        if response.status_code == 200:
            notes = response.json().get("notes", [])
            for note in notes:
                if note.get("text", "").startswith("TEST_"):
                    note_id = note.get("id")
                    if note_id:
                        requests.delete(
                            f"{BASE_URL}/api/athletes/{self.athlete_id}/notes/{note_id}",
                            headers=auth_headers
                        )
                        print(f"Cleaned up test note: {note_id}")
        print("Cleanup completed")

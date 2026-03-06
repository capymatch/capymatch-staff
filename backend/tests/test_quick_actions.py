"""
Backend API tests for Quick Actions feature
Tests the 3 quick action endpoints: notes, assign, messages, and timeline
These actions persist to MongoDB from the peek panel footer
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Use a unique test athlete ID to avoid collisions
TEST_ATHLETE_ID = f"TEST_athlete_{uuid.uuid4().hex[:8]}"


class TestNoteEndpoint:
    """Tests for POST /api/athletes/{athlete_id}/notes"""
    
    def test_create_note_with_text_only(self):
        """Create note with just text, no tag"""
        payload = {"text": "Quick check-in note for testing"}
        response = requests.post(f"{BASE_URL}/api/athletes/{TEST_ATHLETE_ID}/notes", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "id" in data, "Response should contain note id"
        assert data["athlete_id"] == TEST_ATHLETE_ID
        assert data["text"] == payload["text"]
        assert data["tag"] is None
        assert "created_at" in data
        assert "author" in data
    
    def test_create_note_with_tag(self):
        """Create note with text and tag"""
        payload = {"text": "Follow up with parent", "tag": "Follow-up"}
        response = requests.post(f"{BASE_URL}/api/athletes/{TEST_ATHLETE_ID}/notes", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["text"] == payload["text"]
        assert data["tag"] == "Follow-up"
    
    def test_create_note_validates_text_required(self):
        """Note creation requires text field"""
        payload = {"tag": "Check-in"}  # Missing text
        response = requests.post(f"{BASE_URL}/api/athletes/{TEST_ATHLETE_ID}/notes", json=payload)
        
        # Pydantic validation should reject
        assert response.status_code == 422
    
    def test_create_note_persists_in_timeline(self):
        """Verify note is persisted and retrievable from timeline"""
        unique_text = f"Unique note {uuid.uuid4().hex[:8]}"
        payload = {"text": unique_text, "tag": "Update"}
        
        # Create note
        create_response = requests.post(f"{BASE_URL}/api/athletes/{TEST_ATHLETE_ID}/notes", json=payload)
        assert create_response.status_code == 200
        created_note = create_response.json()
        
        # Fetch timeline to verify persistence
        timeline_response = requests.get(f"{BASE_URL}/api/athletes/{TEST_ATHLETE_ID}/timeline")
        assert timeline_response.status_code == 200
        timeline = timeline_response.json()
        
        # Note should be in timeline
        notes = timeline.get("notes", [])
        found = any(n["id"] == created_note["id"] for n in notes)
        assert found, "Created note should be in timeline"


class TestAssignEndpoint:
    """Tests for POST /api/athletes/{athlete_id}/assign"""
    
    def test_create_assignment_basic(self):
        """Create basic assignment with new_owner only"""
        payload = {"new_owner": "Assistant Coach Davis"}
        response = requests.post(f"{BASE_URL}/api/athletes/{TEST_ATHLETE_ID}/assign", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["athlete_id"] == TEST_ATHLETE_ID
        assert data["new_owner"] == "Assistant Coach Davis"
        assert "previous_owner" in data
        assert "created_at" in data
    
    def test_create_assignment_with_reason(self):
        """Create assignment with optional reason"""
        payload = {"new_owner": "Parent/Guardian", "reason": "Parent requested to be point of contact"}
        response = requests.post(f"{BASE_URL}/api/athletes/{TEST_ATHLETE_ID}/assign", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["new_owner"] == "Parent/Guardian"
        assert data["reason"] == payload["reason"]
    
    def test_create_assignment_with_category(self):
        """Create assignment with intervention_category"""
        payload = {
            "new_owner": "Academic Advisor",
            "reason": "Academic focus needed",
            "intervention_category": "blocker"
        }
        response = requests.post(f"{BASE_URL}/api/athletes/{TEST_ATHLETE_ID}/assign", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["intervention_category"] == "blocker"
    
    def test_create_assignment_requires_new_owner(self):
        """Assignment requires new_owner field"""
        payload = {"reason": "Some reason"}  # Missing new_owner
        response = requests.post(f"{BASE_URL}/api/athletes/{TEST_ATHLETE_ID}/assign", json=payload)
        
        assert response.status_code == 422
    
    def test_create_assignment_persists_in_timeline(self):
        """Verify assignment is persisted and retrievable from timeline"""
        payload = {"new_owner": "Athlete", "reason": f"Test reason {uuid.uuid4().hex[:8]}"}
        
        # Create assignment
        create_response = requests.post(f"{BASE_URL}/api/athletes/{TEST_ATHLETE_ID}/assign", json=payload)
        assert create_response.status_code == 200
        created = create_response.json()
        
        # Fetch timeline
        timeline_response = requests.get(f"{BASE_URL}/api/athletes/{TEST_ATHLETE_ID}/timeline")
        assert timeline_response.status_code == 200
        timeline = timeline_response.json()
        
        # Assignment should be in timeline
        assignments = timeline.get("assignments", [])
        found = any(a["id"] == created["id"] for a in assignments)
        assert found, "Created assignment should be in timeline"


class TestMessageEndpoint:
    """Tests for POST /api/athletes/{athlete_id}/messages"""
    
    def test_create_message_basic(self):
        """Create basic message"""
        payload = {"recipient": "Parent/Guardian", "text": "Quick update on progress"}
        response = requests.post(f"{BASE_URL}/api/athletes/{TEST_ATHLETE_ID}/messages", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["athlete_id"] == TEST_ATHLETE_ID
        assert data["recipient"] == "Parent/Guardian"
        assert data["text"] == payload["text"]
        assert "sender" in data
        assert "created_at" in data
    
    def test_create_message_to_athlete(self):
        """Create message to athlete"""
        payload = {"recipient": "Athlete", "text": "Great practice today!"}
        response = requests.post(f"{BASE_URL}/api/athletes/{TEST_ATHLETE_ID}/messages", json=payload)
        
        assert response.status_code == 200
        assert response.json()["recipient"] == "Athlete"
    
    def test_create_message_requires_recipient(self):
        """Message requires recipient field"""
        payload = {"text": "Some message"}  # Missing recipient
        response = requests.post(f"{BASE_URL}/api/athletes/{TEST_ATHLETE_ID}/messages", json=payload)
        
        assert response.status_code == 422
    
    def test_create_message_requires_text(self):
        """Message requires text field"""
        payload = {"recipient": "Athlete"}  # Missing text
        response = requests.post(f"{BASE_URL}/api/athletes/{TEST_ATHLETE_ID}/messages", json=payload)
        
        assert response.status_code == 422
    
    def test_create_message_persists_in_timeline(self):
        """Verify message is persisted and retrievable from timeline"""
        unique_text = f"Unique message {uuid.uuid4().hex[:8]}"
        payload = {"recipient": "Assistant Coach Davis", "text": unique_text}
        
        # Create message
        create_response = requests.post(f"{BASE_URL}/api/athletes/{TEST_ATHLETE_ID}/messages", json=payload)
        assert create_response.status_code == 200
        created = create_response.json()
        
        # Fetch timeline
        timeline_response = requests.get(f"{BASE_URL}/api/athletes/{TEST_ATHLETE_ID}/timeline")
        assert timeline_response.status_code == 200
        timeline = timeline_response.json()
        
        # Message should be in timeline
        messages = timeline.get("messages", [])
        found = any(m["id"] == created["id"] for m in messages)
        assert found, "Created message should be in timeline"


class TestTimelineEndpoint:
    """Tests for GET /api/athletes/{athlete_id}/timeline"""
    
    def test_timeline_returns_all_collections(self):
        """Timeline returns notes, assignments, and messages"""
        response = requests.get(f"{BASE_URL}/api/athletes/{TEST_ATHLETE_ID}/timeline")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "notes" in data, "Timeline should have notes array"
        assert "assignments" in data, "Timeline should have assignments array"
        assert "messages" in data, "Timeline should have messages array"
        assert isinstance(data["notes"], list)
        assert isinstance(data["assignments"], list)
        assert isinstance(data["messages"], list)
    
    def test_timeline_returns_empty_for_new_athlete(self):
        """Timeline returns empty arrays for athlete with no actions"""
        new_id = f"new_athlete_{uuid.uuid4().hex[:8]}"
        response = requests.get(f"{BASE_URL}/api/athletes/{new_id}/timeline")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["notes"] == []
        assert data["assignments"] == []
        assert data["messages"] == []
    
    def test_timeline_filters_by_athlete_id(self):
        """Timeline only returns items for the specified athlete"""
        # Create data for two different athletes
        athlete_a = f"athlete_a_{uuid.uuid4().hex[:8]}"
        athlete_b = f"athlete_b_{uuid.uuid4().hex[:8]}"
        
        # Create note for athlete A
        note_a = {"text": "Note for athlete A"}
        requests.post(f"{BASE_URL}/api/athletes/{athlete_a}/notes", json=note_a)
        
        # Create note for athlete B
        note_b = {"text": "Note for athlete B"}
        requests.post(f"{BASE_URL}/api/athletes/{athlete_b}/notes", json=note_b)
        
        # Verify athlete A's timeline only has their note
        timeline_a = requests.get(f"{BASE_URL}/api/athletes/{athlete_a}/timeline").json()
        assert len(timeline_a["notes"]) == 1
        assert timeline_a["notes"][0]["text"] == "Note for athlete A"
        
        # Verify athlete B's timeline only has their note
        timeline_b = requests.get(f"{BASE_URL}/api/athletes/{athlete_b}/timeline").json()
        assert len(timeline_b["notes"]) == 1
        assert timeline_b["notes"][0]["text"] == "Note for athlete B"


class TestQuickActionsIntegration:
    """Integration tests for full quick action flow"""
    
    def test_full_note_flow(self):
        """Test complete note creation and retrieval flow"""
        athlete_id = f"full_flow_{uuid.uuid4().hex[:8]}"
        
        # Create multiple notes with different tags
        notes_to_create = [
            {"text": "Initial contact", "tag": "Check-in"},
            {"text": "Discussed schedule", "tag": "Follow-up"},
            {"text": "Positive progress seen", "tag": "Positive"},
        ]
        
        created_ids = []
        for note in notes_to_create:
            resp = requests.post(f"{BASE_URL}/api/athletes/{athlete_id}/notes", json=note)
            assert resp.status_code == 200
            created_ids.append(resp.json()["id"])
        
        # Verify all notes in timeline
        timeline = requests.get(f"{BASE_URL}/api/athletes/{athlete_id}/timeline").json()
        assert len(timeline["notes"]) == 3
        
        timeline_ids = [n["id"] for n in timeline["notes"]]
        for cid in created_ids:
            assert cid in timeline_ids
    
    def test_multiple_action_types_same_athlete(self):
        """Test creating notes, assignments, and messages for same athlete"""
        athlete_id = f"multi_action_{uuid.uuid4().hex[:8]}"
        
        # Create one of each
        note_resp = requests.post(f"{BASE_URL}/api/athletes/{athlete_id}/notes", 
                                  json={"text": "Test note", "tag": "Update"})
        assert note_resp.status_code == 200
        
        assign_resp = requests.post(f"{BASE_URL}/api/athletes/{athlete_id}/assign",
                                    json={"new_owner": "Academic Advisor", "reason": "Academic support"})
        assert assign_resp.status_code == 200
        
        msg_resp = requests.post(f"{BASE_URL}/api/athletes/{athlete_id}/messages",
                                 json={"recipient": "Athlete", "text": "Keep up the good work!"})
        assert msg_resp.status_code == 200
        
        # Verify all in timeline
        timeline = requests.get(f"{BASE_URL}/api/athletes/{athlete_id}/timeline").json()
        assert len(timeline["notes"]) == 1
        assert len(timeline["assignments"]) == 1
        assert len(timeline["messages"]) == 1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

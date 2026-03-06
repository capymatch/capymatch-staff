"""
Persistence Phase 1 Tests - Event Notes and Recommendations MongoDB Persistence

Tests cover:
1. MongoDB seed-if-empty: event_notes collection seeded with mock notes from Winter Showcase (event_0)
2. MongoDB seed-if-empty: recommendations collection seeded with mock recommendations
3. POST /api/events/{event_id}/notes: Creates event note in DB, verify via GET
4. PATCH /api/events/{event_id}/notes/{note_id}: Updates note in DB
5. GET /api/events/{event_id}/notes: Returns notes from MongoDB (sorted by captured_at descending)
6. POST /api/events/{event_id}/notes/{note_id}/route: Sets routed_to_pod=True in MongoDB
7. POST /api/advocacy/recommendations: Creates recommendation in DB, verify via GET
8. GET /api/advocacy/recommendations/{rec_id}: Returns recommendation from MongoDB
9. PATCH /api/advocacy/recommendations/{rec_id}: Updates recommendation fields in DB
10. POST /api/advocacy/recommendations/{rec_id}/send: Transitions draft->sent, persists to DB
11. POST /api/advocacy/recommendations/{rec_id}/respond: Logs response, persists to DB
12. POST /api/advocacy/recommendations/{rec_id}/follow-up: Marks follow-up, persists to DB
13. POST /api/advocacy/recommendations/{rec_id}/close: Closes recommendation, persists to DB
14. GET /api/mission-control: Returns data with persisted event notes
15. GET /api/program/intelligence: Returns advocacy_outcomes from persisted recommendations
16. GET /api/advocacy/recommendations: Lists all recommendations with grouping/stats
17. GET /api/advocacy/relationships: Computes relationships from persisted data
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestSeedDataPersistence:
    """Test seed-if-empty behavior for event_notes and recommendations"""

    def test_event_notes_seeded_for_event_0(self, api_client):
        """GET /api/events/event_0/notes returns seeded notes from Winter Showcase"""
        response = api_client.get(f"{BASE_URL}/api/events/event_0/notes")
        assert response.status_code == 200, f"Failed to get event notes: {response.text}"
        
        notes = response.json()
        assert isinstance(notes, list), "Response should be a list"
        assert len(notes) >= 5, f"Expected at least 5 seeded notes for event_0 (Winter Showcase), got {len(notes)}"
        
        # Verify seeded note structure
        first_note = notes[0]
        assert "id" in first_note
        assert "event_id" in first_note
        assert first_note["event_id"] == "event_0"
        assert "athlete_id" in first_note
        assert "athlete_name" in first_note
        assert "interest_level" in first_note
        assert "note_text" in first_note
        assert "captured_at" in first_note
        print(f"✓ Found {len(notes)} seeded event notes for event_0")

    def test_event_notes_sorted_by_captured_at_descending(self, api_client):
        """Notes should be sorted by captured_at in descending order (most recent first)"""
        response = api_client.get(f"{BASE_URL}/api/events/event_0/notes")
        assert response.status_code == 200
        
        notes = response.json()
        if len(notes) > 1:
            dates = [note.get("captured_at", "") for note in notes]
            for i in range(len(dates) - 1):
                assert dates[i] >= dates[i + 1], f"Notes not sorted descending by captured_at"
        print("✓ Event notes correctly sorted by captured_at descending")

    def test_recommendations_seeded(self, api_client):
        """GET /api/advocacy/recommendations returns seeded recommendations"""
        response = api_client.get(f"{BASE_URL}/api/advocacy/recommendations")
        assert response.status_code == 200, f"Failed to get recommendations: {response.text}"
        
        data = response.json()
        assert "stats" in data, "Response should have stats"
        assert data["stats"]["total"] >= 5, f"Expected at least 5 seeded recommendations, got {data['stats']['total']}"
        
        # Verify categories present
        assert "needs_attention" in data
        assert "drafts" in data
        assert "recently_sent" in data
        assert "closed" in data
        print(f"✓ Found {data['stats']['total']} seeded recommendations")

    def test_seeded_recommendation_structure(self, api_client):
        """Verify seeded recommendation rec_1 has all required fields"""
        response = api_client.get(f"{BASE_URL}/api/advocacy/recommendations/rec_1")
        assert response.status_code == 200, f"Failed to get rec_1: {response.text}"
        
        rec = response.json()
        assert rec["id"] == "rec_1"
        assert rec["athlete_name"] == "Marcus Johnson"
        assert rec["school_name"] == "Michigan"
        assert rec["status"] == "warm_response"
        assert "fit_reasons" in rec
        assert "response_history" in rec
        assert len(rec["response_history"]) >= 2  # sent + response
        print("✓ Seeded recommendation rec_1 has correct structure")


class TestEventNoteCRUD:
    """Test event note create, read, update operations with MongoDB persistence"""

    @pytest.fixture
    def test_note_id(self, api_client):
        """Create a test note and return its ID, cleanup after test"""
        # Create note for event_1 (SoCal Showcase)
        payload = {
            "athlete_id": "athlete_1",
            "school_id": "stanford",
            "school_name": "Stanford",
            "interest_level": "warm",
            "note_text": f"TEST_PERSISTENCE_NOTE_{uuid.uuid4().hex[:8]}",
            "follow_ups": ["send_film"]
        }
        response = api_client.post(f"{BASE_URL}/api/events/event_1/notes", json=payload)
        assert response.status_code == 200, f"Failed to create test note: {response.text}"
        
        note = response.json()
        note_id = note["id"]
        yield note_id
        # Note: No cleanup needed - test notes are fine to accumulate

    def test_create_event_note(self, api_client):
        """POST /api/events/{event_id}/notes creates note in MongoDB"""
        unique_text = f"TEST_CREATE_NOTE_{uuid.uuid4().hex[:8]}"
        payload = {
            "athlete_id": "athlete_2",
            "school_id": "ucla",
            "school_name": "UCLA",
            "interest_level": "hot",
            "note_text": unique_text,
            "follow_ups": ["schedule_call", "send_film"]
        }
        
        response = api_client.post(f"{BASE_URL}/api/events/event_1/notes", json=payload)
        assert response.status_code == 200, f"Failed to create note: {response.text}"
        
        created_note = response.json()
        assert "id" in created_note
        assert created_note["event_id"] == "event_1"
        assert created_note["athlete_id"] == "athlete_2"
        assert created_note["school_name"] == "UCLA"
        assert created_note["interest_level"] == "hot"
        assert created_note["note_text"] == unique_text
        assert created_note["routed_to_pod"] == False
        assert created_note["advocacy_candidate"] == True  # hot = advocacy candidate
        
        # Verify GET retrieves it from DB
        get_response = api_client.get(f"{BASE_URL}/api/events/event_1/notes")
        assert get_response.status_code == 200
        notes = get_response.json()
        found = [n for n in notes if n["id"] == created_note["id"]]
        assert len(found) == 1, "Created note not found via GET"
        print(f"✓ Created event note {created_note['id']} and verified in DB")

    def test_update_event_note_interest_level(self, api_client, test_note_id):
        """PATCH /api/events/{event_id}/notes/{note_id} updates interest_level in MongoDB"""
        payload = {"interest_level": "hot"}
        
        response = api_client.patch(f"{BASE_URL}/api/events/event_1/notes/{test_note_id}", json=payload)
        assert response.status_code == 200, f"Failed to update note: {response.text}"
        
        updated_note = response.json()
        assert updated_note["interest_level"] == "hot"
        assert updated_note["advocacy_candidate"] == True  # hot = advocacy candidate
        
        # Verify persistence via GET
        get_response = api_client.get(f"{BASE_URL}/api/events/event_1/notes")
        notes = get_response.json()
        found = [n for n in notes if n["id"] == test_note_id]
        assert len(found) == 1
        assert found[0]["interest_level"] == "hot"
        print(f"✓ Updated note {test_note_id} interest_level and verified persistence")

    def test_update_event_note_text(self, api_client, test_note_id):
        """PATCH /api/events/{event_id}/notes/{note_id} updates note_text in MongoDB"""
        new_text = f"UPDATED_TEXT_{uuid.uuid4().hex[:8]}"
        payload = {"note_text": new_text}
        
        response = api_client.patch(f"{BASE_URL}/api/events/event_1/notes/{test_note_id}", json=payload)
        assert response.status_code == 200, f"Failed to update note text: {response.text}"
        
        updated_note = response.json()
        assert updated_note["note_text"] == new_text
        
        # Verify persistence
        get_response = api_client.get(f"{BASE_URL}/api/events/event_1/notes")
        notes = get_response.json()
        found = [n for n in notes if n["id"] == test_note_id]
        assert found[0]["note_text"] == new_text
        print(f"✓ Updated note {test_note_id} note_text and verified persistence")


class TestEventNoteRouting:
    """Test routing event notes to Support Pod with MongoDB persistence"""

    @pytest.fixture
    def routable_note(self, api_client):
        """Create a hot/warm note with follow-ups that can be routed"""
        payload = {
            "athlete_id": "athlete_3",
            "school_id": "michigan",
            "school_name": "Michigan",
            "interest_level": "warm",
            "note_text": f"TEST_ROUTABLE_NOTE_{uuid.uuid4().hex[:8]}",
            "follow_ups": ["send_film", "schedule_call"]
        }
        response = api_client.post(f"{BASE_URL}/api/events/event_1/notes", json=payload)
        assert response.status_code == 200
        return response.json()

    def test_route_single_note(self, api_client, routable_note):
        """POST /api/events/{event_id}/notes/{note_id}/route sets routed_to_pod=True in MongoDB"""
        note_id = routable_note["id"]
        
        response = api_client.post(f"{BASE_URL}/api/events/event_1/notes/{note_id}/route")
        assert response.status_code == 200, f"Failed to route note: {response.text}"
        
        result = response.json()
        assert result["routed"] == True
        assert result["note"]["routed_to_pod"] == True
        assert result["actions_created"] >= 1  # Should create pod actions from follow_ups
        
        # Verify persistence via GET
        get_response = api_client.get(f"{BASE_URL}/api/events/event_1/notes")
        notes = get_response.json()
        found = [n for n in notes if n["id"] == note_id]
        assert len(found) == 1
        assert found[0]["routed_to_pod"] == True
        print(f"✓ Routed note {note_id} and verified routed_to_pod=True in DB")


class TestRecommendationCRUD:
    """Test recommendation create, read, update operations with MongoDB persistence"""

    @pytest.fixture
    def draft_recommendation_id(self, api_client):
        """Create a draft recommendation for testing"""
        unique_id = uuid.uuid4().hex[:8]
        payload = {
            "athlete_id": "athlete_6",
            "school_id": "georgetown",
            "school_name": "Georgetown",
            "college_coach_name": f"Test Coach {unique_id}",
            "fit_reasons": ["athletic_ability", "coachability"],
            "fit_note": f"TEST_REC_NOTE_{unique_id}",
            "intro_message": "Test intro message",
            "desired_next_step": "review_film"
        }
        response = api_client.post(f"{BASE_URL}/api/advocacy/recommendations", json=payload)
        assert response.status_code == 200, f"Failed to create recommendation: {response.text}"
        
        rec = response.json()
        yield rec["id"]

    def test_create_recommendation(self, api_client):
        """POST /api/advocacy/recommendations creates recommendation in MongoDB"""
        unique_id = uuid.uuid4().hex[:8]
        payload = {
            "athlete_id": "athlete_7",
            "school_id": "virginia",
            "school_name": "Virginia",
            "college_coach_name": f"Coach Create Test {unique_id}",
            "fit_reasons": ["tactical_awareness", "academic_fit"],
            "fit_note": f"TEST_CREATE_REC_{unique_id}",
            "intro_message": "Test intro for creation",
            "desired_next_step": "schedule_call"
        }
        
        response = api_client.post(f"{BASE_URL}/api/advocacy/recommendations", json=payload)
        assert response.status_code == 200, f"Failed to create rec: {response.text}"
        
        created_rec = response.json()
        assert "id" in created_rec
        assert created_rec["status"] == "draft"
        assert created_rec["athlete_id"] == "athlete_7"
        assert created_rec["school_name"] == "Virginia"
        assert created_rec["fit_reasons"] == ["tactical_awareness", "academic_fit"]
        
        # Verify via GET
        get_response = api_client.get(f"{BASE_URL}/api/advocacy/recommendations/{created_rec['id']}")
        assert get_response.status_code == 200
        fetched_rec = get_response.json()
        assert fetched_rec["id"] == created_rec["id"]
        assert fetched_rec["status"] == "draft"
        print(f"✓ Created recommendation {created_rec['id']} and verified in DB")

    def test_get_recommendation_by_id(self, api_client, draft_recommendation_id):
        """GET /api/advocacy/recommendations/{rec_id} returns from MongoDB"""
        response = api_client.get(f"{BASE_URL}/api/advocacy/recommendations/{draft_recommendation_id}")
        assert response.status_code == 200, f"Failed to get rec: {response.text}"
        
        rec = response.json()
        assert rec["id"] == draft_recommendation_id
        assert rec["status"] == "draft"
        print(f"✓ Retrieved recommendation {draft_recommendation_id} from DB")

    def test_update_recommendation(self, api_client, draft_recommendation_id):
        """PATCH /api/advocacy/recommendations/{rec_id} updates fields in MongoDB"""
        new_coach = f"Updated Coach {uuid.uuid4().hex[:8]}"
        payload = {
            "college_coach_name": new_coach,
            "fit_note": "Updated fit note for persistence test"
        }
        
        response = api_client.patch(f"{BASE_URL}/api/advocacy/recommendations/{draft_recommendation_id}", json=payload)
        assert response.status_code == 200, f"Failed to update rec: {response.text}"
        
        updated_rec = response.json()
        assert updated_rec["college_coach_name"] == new_coach
        assert updated_rec["fit_note"] == "Updated fit note for persistence test"
        
        # Verify persistence via GET
        get_response = api_client.get(f"{BASE_URL}/api/advocacy/recommendations/{draft_recommendation_id}")
        fetched_rec = get_response.json()
        assert fetched_rec["college_coach_name"] == new_coach
        print(f"✓ Updated recommendation {draft_recommendation_id} and verified persistence")


class TestRecommendationWorkflow:
    """Test recommendation lifecycle: send, respond, follow-up, close"""

    @pytest.fixture
    def sendable_recommendation(self, api_client):
        """Create a draft recommendation that can be sent"""
        payload = {
            "athlete_id": "athlete_8",
            "school_id": "pepperdine",
            "school_name": "Pepperdine",
            "college_coach_name": f"Coach Workflow {uuid.uuid4().hex[:8]}",
            "fit_reasons": ["character_leadership"],
            "fit_note": "Workflow test recommendation",
            "intro_message": "Workflow test intro",
            "desired_next_step": "evaluate_at_event"
        }
        response = api_client.post(f"{BASE_URL}/api/advocacy/recommendations", json=payload)
        assert response.status_code == 200
        return response.json()

    def test_send_recommendation(self, api_client, sendable_recommendation):
        """POST /api/advocacy/recommendations/{rec_id}/send transitions draft->sent"""
        rec_id = sendable_recommendation["id"]
        
        response = api_client.post(f"{BASE_URL}/api/advocacy/recommendations/{rec_id}/send")
        assert response.status_code == 200, f"Failed to send rec: {response.text}"
        
        sent_rec = response.json()
        assert sent_rec["status"] == "sent"
        assert sent_rec["sent_at"] is not None
        assert len(sent_rec["response_history"]) >= 1
        assert sent_rec["response_history"][-1]["type"] == "sent"
        
        # Verify persistence
        get_response = api_client.get(f"{BASE_URL}/api/advocacy/recommendations/{rec_id}")
        fetched_rec = get_response.json()
        assert fetched_rec["status"] == "sent"
        assert fetched_rec["sent_at"] is not None
        print(f"✓ Sent recommendation {rec_id} and verified status=sent in DB")

    def test_respond_to_recommendation(self, api_client, sendable_recommendation):
        """POST /api/advocacy/recommendations/{rec_id}/respond logs response in DB"""
        rec_id = sendable_recommendation["id"]
        
        # First send it
        api_client.post(f"{BASE_URL}/api/advocacy/recommendations/{rec_id}/send")
        
        # Then respond
        payload = {
            "response_note": "Coach very interested, wants to see highlight reel",
            "response_type": "warm"
        }
        response = api_client.post(f"{BASE_URL}/api/advocacy/recommendations/{rec_id}/respond", json=payload)
        assert response.status_code == 200, f"Failed to respond: {response.text}"
        
        responded_rec = response.json()
        assert responded_rec["status"] == "warm_response"
        assert responded_rec["response_note"] == payload["response_note"]
        assert responded_rec["response_status"] == "warm"
        assert responded_rec["response_at"] is not None
        
        # Verify persistence
        get_response = api_client.get(f"{BASE_URL}/api/advocacy/recommendations/{rec_id}")
        fetched_rec = get_response.json()
        assert fetched_rec["status"] == "warm_response"
        assert fetched_rec["response_note"] == payload["response_note"]
        print(f"✓ Logged response for {rec_id} and verified in DB")

    def test_follow_up_recommendation(self, api_client):
        """POST /api/advocacy/recommendations/{rec_id}/follow-up marks follow-up in DB"""
        # Create and send a new recommendation
        payload = {
            "athlete_id": "athlete_9",
            "school_id": "duke",
            "school_name": "Duke",
            "fit_reasons": ["program_need_match"],
            "intro_message": "Follow-up test"
        }
        create_response = api_client.post(f"{BASE_URL}/api/advocacy/recommendations", json=payload)
        rec_id = create_response.json()["id"]
        
        # Send it
        api_client.post(f"{BASE_URL}/api/advocacy/recommendations/{rec_id}/send")
        
        # Mark follow-up
        response = api_client.post(f"{BASE_URL}/api/advocacy/recommendations/{rec_id}/follow-up")
        assert response.status_code == 200, f"Failed to follow up: {response.text}"
        
        rec = response.json()
        assert rec["status"] == "follow_up_needed"
        assert rec["follow_up_count"] == 1
        assert rec["last_follow_up_at"] is not None
        
        # Verify persistence
        get_response = api_client.get(f"{BASE_URL}/api/advocacy/recommendations/{rec_id}")
        fetched_rec = get_response.json()
        assert fetched_rec["status"] == "follow_up_needed"
        assert fetched_rec["follow_up_count"] == 1
        print(f"✓ Marked follow-up for {rec_id} and verified in DB")

    def test_close_recommendation(self, api_client):
        """POST /api/advocacy/recommendations/{rec_id}/close closes rec in DB"""
        # Create and send a recommendation
        payload = {
            "athlete_id": "athlete_10",
            "school_id": "unc",
            "school_name": "UNC",
            "fit_reasons": ["athletic_ability"],
            "intro_message": "Close test"
        }
        create_response = api_client.post(f"{BASE_URL}/api/advocacy/recommendations", json=payload)
        rec_id = create_response.json()["id"]
        
        # Send it
        api_client.post(f"{BASE_URL}/api/advocacy/recommendations/{rec_id}/send")
        
        # Close it
        close_payload = {"reason": "no_response"}
        response = api_client.post(f"{BASE_URL}/api/advocacy/recommendations/{rec_id}/close", json=close_payload)
        assert response.status_code == 200, f"Failed to close: {response.text}"
        
        rec = response.json()
        assert rec["status"] == "closed"
        assert rec["closed_at"] is not None
        assert rec["closed_reason"] == "no_response"
        
        # Verify persistence
        get_response = api_client.get(f"{BASE_URL}/api/advocacy/recommendations/{rec_id}")
        fetched_rec = get_response.json()
        assert fetched_rec["status"] == "closed"
        print(f"✓ Closed recommendation {rec_id} and verified in DB")


class TestIntegrationEndpoints:
    """Test that integrated endpoints correctly use persisted data"""

    def test_mission_control_returns_data(self, api_client):
        """GET /api/mission-control works with persisted event notes"""
        response = api_client.get(f"{BASE_URL}/api/mission-control")
        assert response.status_code == 200, f"Mission control failed: {response.text}"
        
        data = response.json()
        assert "priorityAlerts" in data
        assert "upcomingEvents" in data
        assert "programSnapshot" in data
        print("✓ Mission Control returns data correctly")

    def test_program_intelligence_returns_advocacy_outcomes(self, api_client):
        """GET /api/program/intelligence includes advocacy_outcomes from persisted recommendations"""
        response = api_client.get(f"{BASE_URL}/api/program/intelligence")
        assert response.status_code == 200, f"Program intelligence failed: {response.text}"
        
        data = response.json()
        assert "advocacy_outcomes" in data
        assert "pipeline" in data["advocacy_outcomes"]
        assert data["advocacy_outcomes"]["pipeline"]["total"] >= 5  # Seeded + test recs
        print(f"✓ Program Intelligence shows {data['advocacy_outcomes']['pipeline']['total']} recommendations")

    def test_advocacy_recommendations_list(self, api_client):
        """GET /api/advocacy/recommendations returns grouped recommendations with stats"""
        response = api_client.get(f"{BASE_URL}/api/advocacy/recommendations")
        assert response.status_code == 200, f"Failed to list recommendations: {response.text}"
        
        data = response.json()
        assert "needs_attention" in data
        assert "drafts" in data
        assert "recently_sent" in data
        assert "closed" in data
        assert "stats" in data
        assert data["stats"]["total"] >= 5
        print(f"✓ Recommendations list returns {data['stats']['total']} total with correct grouping")

    def test_advocacy_relationships(self, api_client):
        """GET /api/advocacy/relationships computes from persisted data"""
        response = api_client.get(f"{BASE_URL}/api/advocacy/relationships")
        assert response.status_code == 200, f"Failed to get relationships: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        # Should have relationships with schools that have recommendations/event notes
        if len(data) > 0:
            rel = data[0]
            assert "school" in rel
            assert "summary" in rel
            assert "warmth" in rel["summary"]
        print(f"✓ Relationships endpoint returns {len(data)} school relationships")

    def test_events_list_returns_data(self, api_client):
        """GET /api/events returns events with captured notes count"""
        response = api_client.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200, f"Failed to list events: {response.text}"
        
        data = response.json()
        assert "upcoming" in data
        assert "past" in data
        
        # event_0 (Winter Showcase) should have captured notes count
        all_events = data["upcoming"] + data["past"]
        event_0 = next((e for e in all_events if e["id"] == "event_0"), None)
        if event_0:
            assert event_0["capturedNotesCount"] >= 5  # Seeded notes
            print(f"✓ Event event_0 shows {event_0['capturedNotesCount']} captured notes")


class TestDataConsistency:
    """Test that data remains consistent after operations"""

    def test_create_and_verify_note_persistence(self, api_client):
        """Create note, verify it persists across multiple GET calls"""
        unique_text = f"CONSISTENCY_TEST_{uuid.uuid4().hex[:8]}"
        payload = {
            "athlete_id": "athlete_11",
            "school_id": "clemson",
            "school_name": "Clemson",
            "interest_level": "warm",
            "note_text": unique_text,
            "follow_ups": []
        }
        
        # Create
        create_response = api_client.post(f"{BASE_URL}/api/events/event_1/notes", json=payload)
        assert create_response.status_code == 200
        note_id = create_response.json()["id"]
        
        # First GET
        get1 = api_client.get(f"{BASE_URL}/api/events/event_1/notes")
        notes1 = [n for n in get1.json() if n["id"] == note_id]
        assert len(notes1) == 1
        
        # Second GET
        get2 = api_client.get(f"{BASE_URL}/api/events/event_1/notes")
        notes2 = [n for n in get2.json() if n["id"] == note_id]
        assert len(notes2) == 1
        
        assert notes1[0]["note_text"] == notes2[0]["note_text"]
        print("✓ Note data consistent across multiple reads")

    def test_create_and_verify_recommendation_persistence(self, api_client):
        """Create recommendation, verify it persists across multiple GET calls"""
        unique_id = uuid.uuid4().hex[:8]
        payload = {
            "athlete_id": "athlete_12",
            "school_id": "wake_forest",
            "school_name": "Wake Forest",
            "fit_reasons": ["coachability"],
            "fit_note": f"CONSISTENCY_TEST_{unique_id}"
        }
        
        # Create
        create_response = api_client.post(f"{BASE_URL}/api/advocacy/recommendations", json=payload)
        assert create_response.status_code == 200
        rec_id = create_response.json()["id"]
        
        # First GET
        get1 = api_client.get(f"{BASE_URL}/api/advocacy/recommendations/{rec_id}")
        assert get1.status_code == 200
        rec1 = get1.json()
        
        # Second GET
        get2 = api_client.get(f"{BASE_URL}/api/advocacy/recommendations/{rec_id}")
        assert get2.status_code == 200
        rec2 = get2.json()
        
        assert rec1["fit_note"] == rec2["fit_note"]
        assert rec1["status"] == rec2["status"]
        print("✓ Recommendation data consistent across multiple reads")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

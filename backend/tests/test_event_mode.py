"""
Event Mode Backend API Tests
Tests for Event Home, Event Prep, Live Event, and Event Summary endpoints
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestEventHomeAPIs:
    """Test /api/events endpoint - Event Home (list view)"""
    
    def test_get_events_returns_200(self):
        """GET /api/events should return 200 with upcoming/past grouping"""
        response = requests.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "upcoming" in data, "Response should have 'upcoming' list"
        assert "past" in data, "Response should have 'past' list"
        assert isinstance(data["upcoming"], list)
        assert isinstance(data["past"], list)
        print(f"✅ GET /api/events returns 200 with {len(data['upcoming'])} upcoming, {len(data['past'])} past events")
    
    def test_events_have_urgency_colors(self):
        """Events should have urgency colors (red/yellow/green/gray)"""
        response = requests.get(f"{BASE_URL}/api/events")
        data = response.json()
        
        valid_urgencies = {"red", "yellow", "green", "gray"}
        all_events = data["upcoming"] + data["past"]
        
        for event in all_events:
            assert "urgency" in event, f"Event {event.get('id')} missing urgency"
            assert event["urgency"] in valid_urgencies, f"Invalid urgency: {event['urgency']}"
        
        print(f"✅ All {len(all_events)} events have valid urgency colors")
    
    def test_events_have_required_fields(self):
        """Events should have all required fields for Event Home display"""
        response = requests.get(f"{BASE_URL}/api/events")
        data = response.json()
        
        required_fields = ["id", "name", "type", "daysAway", "location", 
                          "athleteCount", "expectedSchools", "prepStatus", "urgency"]
        
        all_events = data["upcoming"] + data["past"]
        for event in all_events:
            for field in required_fields:
                assert field in event, f"Event {event.get('id')} missing '{field}'"
        
        print(f"✅ All events have required fields: {required_fields}")
    
    def test_type_filter_works(self):
        """Type filter should filter events by type"""
        response = requests.get(f"{BASE_URL}/api/events?type=showcase")
        assert response.status_code == 200
        data = response.json()
        
        # All returned events should be of type showcase
        for event in data["upcoming"] + data["past"]:
            assert event["type"] == "showcase", f"Event {event['id']} has wrong type: {event['type']}"
        
        print(f"✅ Type filter 'showcase' works correctly")
    
    def test_past_events_have_summary_status(self):
        """Past events should have summaryStatus and capturedNotesCount"""
        response = requests.get(f"{BASE_URL}/api/events")
        data = response.json()
        
        for event in data["past"]:
            assert "capturedNotesCount" in event, f"Past event {event['id']} missing capturedNotesCount"
            # summaryStatus can be null for events without notes
        
        print(f"✅ Past events ({len(data['past'])}) have capturedNotesCount field")


class TestEventPrepAPIs:
    """Test /api/events/:eventId/prep endpoint - Event Prep page"""
    
    def test_get_prep_data_returns_200(self):
        """GET /api/events/event_1/prep should return prep data"""
        response = requests.get(f"{BASE_URL}/api/events/event_1/prep")
        assert response.status_code == 200
        data = response.json()
        
        assert "event" in data, "Response should have 'event'"
        assert "athletes" in data, "Response should have 'athletes'"
        assert "targetSchools" in data, "Response should have 'targetSchools'"
        assert "checklist" in data, "Response should have 'checklist'"
        assert "blockers" in data, "Response should have 'blockers'"
        
        print(f"✅ GET /api/events/event_1/prep returns full prep data")
    
    def test_athletes_have_prep_status(self):
        """Athletes should have prepStatus (ready/needs_attention/blocker)"""
        response = requests.get(f"{BASE_URL}/api/events/event_1/prep")
        data = response.json()
        
        valid_statuses = {"ready", "needs_attention", "blocker"}
        for athlete in data["athletes"]:
            assert "prepStatus" in athlete, f"Athlete {athlete['id']} missing prepStatus"
            assert athlete["prepStatus"] in valid_statuses, f"Invalid prepStatus: {athlete['prepStatus']}"
            assert "targetSchoolsAtEvent" in athlete, "Athlete missing targetSchoolsAtEvent"
        
        print(f"✅ All {len(data['athletes'])} athletes have valid prepStatus and targetSchoolsAtEvent")
    
    def test_target_schools_have_overlap_counts(self):
        """Target schools should have athleteOverlap count"""
        response = requests.get(f"{BASE_URL}/api/events/event_1/prep")
        data = response.json()
        
        for school in data["targetSchools"]:
            assert "athleteOverlap" in school, f"School {school.get('id')} missing athleteOverlap"
            assert isinstance(school["athleteOverlap"], int)
        
        print(f"✅ All {len(data['targetSchools'])} target schools have athleteOverlap counts")
    
    def test_checklist_items_have_required_fields(self):
        """Checklist items should have id, label, completed"""
        response = requests.get(f"{BASE_URL}/api/events/event_1/prep")
        data = response.json()
        
        for item in data["checklist"]:
            assert "id" in item, "Checklist item missing id"
            assert "label" in item, "Checklist item missing label"
            assert "completed" in item, "Checklist item missing completed"
            assert isinstance(item["completed"], bool)
        
        print(f"✅ All {len(data['checklist'])} checklist items have required fields")
    
    def test_toggle_checklist_item(self):
        """PATCH /api/events/:eventId/checklist/:itemId should toggle item"""
        # First get current state
        response = requests.get(f"{BASE_URL}/api/events/event_1/prep")
        initial_data = response.json()
        first_item = initial_data["checklist"][0]
        initial_completed = first_item["completed"]
        
        # Toggle the item
        toggle_response = requests.patch(f"{BASE_URL}/api/events/event_1/checklist/{first_item['id']}")
        assert toggle_response.status_code == 200
        toggle_data = toggle_response.json()
        
        assert "item" in toggle_data, "Toggle response should have 'item'"
        assert "prepStatus" in toggle_data, "Toggle response should have 'prepStatus'"
        assert toggle_data["item"]["completed"] != initial_completed, "Item completion should toggle"
        
        # Toggle back to restore state
        requests.patch(f"{BASE_URL}/api/events/event_1/checklist/{first_item['id']}")
        
        print(f"✅ Toggle checklist item works - toggled {first_item['id']}")
    
    def test_blockers_populated_for_athletes_with_issues(self):
        """Blockers list should contain athletes with blocker interventions"""
        response = requests.get(f"{BASE_URL}/api/events/event_1/prep")
        data = response.json()
        
        # Check if any athlete has blocker status
        blocker_athletes = [a for a in data["athletes"] if a["prepStatus"] == "blocker"]
        
        if blocker_athletes:
            assert len(data["blockers"]) > 0, "Blockers list should have items for athletes with blockers"
            for blocker in data["blockers"]:
                assert "athleteName" in blocker, "Blocker missing athleteName"
                assert "impact" in blocker, "Blocker missing impact"
        
        print(f"✅ Blockers list has {len(data['blockers'])} items ({len(blocker_athletes)} athletes with blockers)")


class TestLiveEventAPIs:
    """Test Live Event Mode endpoints - note capture and retrieval"""
    
    def test_get_event_notes(self):
        """GET /api/events/:eventId/notes should return notes list"""
        response = requests.get(f"{BASE_URL}/api/events/event_1/notes")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list), "Notes should be a list"
        print(f"✅ GET /api/events/event_1/notes returns {len(data)} notes")
    
    def test_capture_note_creates_note(self):
        """POST /api/events/:eventId/notes should create a note"""
        note_payload = {
            "athlete_id": "athlete_1",
            "school_id": "ucla",
            "school_name": "UCLA",
            "interest_level": "warm",
            "note_text": "TEST: Coach showed interest in player movement",
            "follow_ups": ["send_film"]
        }
        
        response = requests.post(f"{BASE_URL}/api/events/event_1/notes", json=note_payload)
        assert response.status_code == 200
        data = response.json()
        
        # Verify response has all expected fields
        assert "id" in data, "Note response should have id"
        assert data["athlete_id"] == note_payload["athlete_id"]
        assert data["school_name"] == note_payload["school_name"]
        assert data["interest_level"] == note_payload["interest_level"]
        assert data["note_text"] == note_payload["note_text"]
        assert data["follow_ups"] == note_payload["follow_ups"]
        assert "captured_at" in data, "Note should have captured_at timestamp"
        
        print(f"✅ POST /api/events/event_1/notes creates note with id: {data['id']}")
        return data["id"]
    
    def test_note_counter_increments(self):
        """After capturing a note, the note count should increment"""
        # Get initial count
        initial_response = requests.get(f"{BASE_URL}/api/events/event_1/notes")
        initial_count = len(initial_response.json())
        
        # Create a note
        note_payload = {
            "athlete_id": "athlete_3",
            "school_id": "stanford",
            "school_name": "Stanford",
            "interest_level": "hot",
            "note_text": "TEST: Counter test note",
            "follow_ups": []
        }
        requests.post(f"{BASE_URL}/api/events/event_1/notes", json=note_payload)
        
        # Get new count
        new_response = requests.get(f"{BASE_URL}/api/events/event_1/notes")
        new_count = len(new_response.json())
        
        assert new_count == initial_count + 1, f"Note count should increment from {initial_count} to {new_count}"
        print(f"✅ Note counter incremented from {initial_count} to {new_count}")
    
    def test_interest_level_values(self):
        """Interest level should accept hot/warm/cool/none"""
        valid_levels = ["hot", "warm", "cool", "none"]
        
        for level in valid_levels:
            note_payload = {
                "athlete_id": "athlete_1",
                "interest_level": level,
                "note_text": f"TEST: Interest level {level}",
                "follow_ups": []
            }
            response = requests.post(f"{BASE_URL}/api/events/event_1/notes", json=note_payload)
            assert response.status_code == 200
            assert response.json()["interest_level"] == level
        
        print(f"✅ All interest levels accepted: {valid_levels}")
    
    def test_follow_up_options(self):
        """Follow-ups should accept send_film, schedule_call, add_to_targets, route_to_pod"""
        follow_ups = ["send_film", "schedule_call", "add_to_targets", "route_to_pod"]
        
        note_payload = {
            "athlete_id": "athlete_1",
            "interest_level": "warm",
            "note_text": "TEST: All follow-ups",
            "follow_ups": follow_ups
        }
        
        response = requests.post(f"{BASE_URL}/api/events/event_1/notes", json=note_payload)
        assert response.status_code == 200
        assert response.json()["follow_ups"] == follow_ups
        
        print(f"✅ All follow-up options accepted: {follow_ups}")


class TestEventSummaryAPIs:
    """Test Event Summary endpoints - post-event debrief"""
    
    def test_get_summary_for_past_event(self):
        """GET /api/events/event_0/summary should return summary data"""
        response = requests.get(f"{BASE_URL}/api/events/event_0/summary")
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "event" in data, "Summary should have 'event'"
        assert "stats" in data, "Summary should have 'stats'"
        assert "hottestInterest" in data, "Summary should have 'hottestInterest'"
        assert "followUpActions" in data, "Summary should have 'followUpActions'"
        assert "schoolsSeen" in data, "Summary should have 'schoolsSeen'"
        assert "allNotes" in data, "Summary should have 'allNotes'"
        
        print(f"✅ GET /api/events/event_0/summary returns complete summary structure")
    
    def test_summary_stats_are_correct(self):
        """Summary stats should have totalNotes, schoolsInteracted, athletesSeen, followUpsNeeded"""
        response = requests.get(f"{BASE_URL}/api/events/event_0/summary")
        data = response.json()
        
        stats = data["stats"]
        assert "totalNotes" in stats, "Stats missing totalNotes"
        assert "schoolsInteracted" in stats, "Stats missing schoolsInteracted"
        assert "athletesSeen" in stats, "Stats missing athletesSeen"
        assert "followUpsNeeded" in stats, "Stats missing followUpsNeeded"
        
        # Verify event_0 has pre-populated notes (as per context)
        assert stats["totalNotes"] >= 5, f"event_0 should have at least 5 notes, got {stats['totalNotes']}"
        
        print(f"✅ Summary stats: {stats['totalNotes']} notes, {stats['schoolsInteracted']} schools, {stats['athletesSeen']} athletes")
    
    def test_hottest_interest_sorted_by_level(self):
        """Hottest interest should be sorted by interest level (hot first, then warm)"""
        response = requests.get(f"{BASE_URL}/api/events/event_0/summary")
        data = response.json()
        
        hottest = data["hottestInterest"]
        assert len(hottest) > 0, "event_0 should have hot/warm interest notes"
        
        # All items should be hot or warm only
        for item in hottest:
            assert item["interest_level"] in ("hot", "warm"), f"Hottest should only have hot/warm, got {item['interest_level']}"
        
        # Check sorting - hot should come before warm
        interest_order = {"hot": 0, "warm": 1}
        for i in range(len(hottest) - 1):
            current_order = interest_order[hottest[i]["interest_level"]]
            next_order = interest_order[hottest[i+1]["interest_level"]]
            assert current_order <= next_order, "Hottest interest should be sorted hot before warm"
        
        print(f"✅ Hottest interest has {len(hottest)} items, sorted correctly")
    
    def test_follow_up_actions_structure(self):
        """Follow-up actions should have title, owner, routed status"""
        response = requests.get(f"{BASE_URL}/api/events/event_0/summary")
        data = response.json()
        
        for action in data["followUpActions"]:
            assert "title" in action, "Follow-up action missing title"
            assert "owner" in action, "Follow-up action missing owner"
            assert "routed" in action, "Follow-up action missing routed status"
            assert "athlete_name" in action, "Follow-up action missing athlete_name"
        
        print(f"✅ All {len(data['followUpActions'])} follow-up actions have required fields")
    
    def test_schools_seen_with_interaction_counts(self):
        """Schools seen should have name and interaction counts"""
        response = requests.get(f"{BASE_URL}/api/events/event_0/summary")
        data = response.json()
        
        for school in data["schoolsSeen"]:
            assert "name" in school, "School missing name"
            assert "interactions" in school, "School missing interactions count"
            assert isinstance(school["interactions"], int)
        
        print(f"✅ Schools seen: {len(data['schoolsSeen'])} schools with interaction counts")


class TestRoutingAPIs:
    """Test routing functionality - Route to Pod endpoints"""
    
    def test_route_single_note(self):
        """POST /api/events/:eventId/notes/:noteId/route should route a note"""
        # First get a note to route from event_0 summary
        summary = requests.get(f"{BASE_URL}/api/events/event_0/summary").json()
        
        # Find an unrouted note with follow-ups
        unrouted_note = None
        for note in summary["hottestInterest"]:
            if not note.get("routed_to_pod") and note.get("follow_ups"):
                unrouted_note = note
                break
        
        if not unrouted_note:
            pytest.skip("No unrouted notes with follow-ups available for testing")
        
        # Route the note
        response = requests.post(f"{BASE_URL}/api/events/event_0/notes/{unrouted_note['id']}/route")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("routed") == True, "Response should indicate routed=True"
        assert "note" in data, "Response should have note"
        assert "actions_created" in data, "Response should have actions_created count"
        
        print(f"✅ Route single note works - created {data.get('actions_created', 0)} actions")
    
    def test_bulk_route_to_pods(self):
        """POST /api/events/:eventId/route-to-pods should bulk route eligible notes"""
        response = requests.post(f"{BASE_URL}/api/events/event_0/route-to-pods")
        assert response.status_code == 200
        data = response.json()
        
        assert "routed_notes" in data, "Response should have routed_notes count"
        assert "actions_created" in data, "Response should have actions_created count"
        assert "athletes_affected" in data, "Response should have athletes_affected count"
        
        print(f"✅ Bulk route: {data['routed_notes']} notes, {data['actions_created']} actions, {data['athletes_affected']} athletes")


class TestNavigationAPIs:
    """Test navigation-related API calls"""
    
    def test_get_single_event(self):
        """GET /api/events/:eventId should return single event"""
        response = requests.get(f"{BASE_URL}/api/events/event_1")
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == "event_1"
        assert "name" in data
        assert "location" in data
        
        print(f"✅ GET /api/events/event_1 returns single event: {data['name']}")
    
    def test_nonexistent_event_returns_error(self):
        """GET /api/events/nonexistent should return error"""
        response = requests.get(f"{BASE_URL}/api/events/nonexistent_event")
        assert response.status_code == 200  # API returns 200 with error field
        data = response.json()
        
        assert "error" in data, "Nonexistent event should return error"
        print(f"✅ Nonexistent event returns error correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

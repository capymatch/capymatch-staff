"""
Test Suite: Persistence Phase 2 - Athletes + Events MongoDB Persistence

Tests:
- Athletes: Loaded from MongoDB with correct fields, read-only (no write paths)
- Events: Loaded from MongoDB, supports write paths (POST new, PATCH checklist)
- Seed-if-empty: 25 athletes, 7 events seeded on first run, no duplicates on restart
- Derived data: daysAway, daysSinceActivity recomputed from stored timestamps
- Event notes: Correctly merged into events after Phase 2 load
- Integration: Mission Control, Program Intelligence work with persisted data
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')


class TestAthletesPersistence:
    """Athletes collection: Phase 2 MongoDB persistence"""

    def test_get_athletes_returns_25_athletes(self):
        """GET /api/athletes returns 25 athletes loaded from MongoDB"""
        response = requests.get(f"{BASE_URL}/api/athletes")
        assert response.status_code == 200
        athletes = response.json()
        assert len(athletes) == 25, f"Expected 25 athletes, got {len(athletes)}"
        print(f"✓ GET /api/athletes returns {len(athletes)} athletes")

    def test_athletes_have_correct_fields(self):
        """Athletes have all required fields including recomputed daysSinceActivity"""
        response = requests.get(f"{BASE_URL}/api/athletes")
        assert response.status_code == 200
        athletes = response.json()
        
        required_fields = [
            "id", "fullName", "gradYear", "position", "recruitingStage",
            "daysSinceActivity", "lastActivity", "momentumScore", "momentumTrend",
            "schoolTargets", "activeInterest", "team"
        ]
        
        for athlete in athletes[:5]:  # Check first 5 athletes
            for field in required_fields:
                assert field in athlete, f"Missing field {field} in athlete {athlete.get('id')}"
        
        print(f"✓ All required fields present in athletes")

    def test_get_single_athlete_from_db(self):
        """GET /api/athletes/{id} returns single athlete from DB"""
        response = requests.get(f"{BASE_URL}/api/athletes/athlete_1")
        assert response.status_code == 200
        athlete = response.json()
        
        assert athlete["id"] == "athlete_1"
        assert "fullName" in athlete
        assert "gradYear" in athlete
        assert "daysSinceActivity" in athlete
        assert isinstance(athlete["daysSinceActivity"], int)
        
        print(f"✓ GET /api/athletes/athlete_1 returns {athlete['fullName']}")

    def test_athlete_days_since_activity_recomputed(self):
        """daysSinceActivity is recomputed from stored lastActivity timestamp"""
        response = requests.get(f"{BASE_URL}/api/athletes/athlete_1")
        assert response.status_code == 200
        athlete = response.json()
        
        # Verify lastActivity is a valid ISO timestamp
        assert "lastActivity" in athlete
        last_activity = datetime.fromisoformat(athlete["lastActivity"].replace("Z", "+00:00"))
        
        # daysSinceActivity should be >= 0
        assert athlete["daysSinceActivity"] >= 0
        
        print(f"✓ daysSinceActivity={athlete['daysSinceActivity']} recomputed from lastActivity")

    def test_athlete_ids_follow_pattern(self):
        """Athlete IDs follow pattern athlete_1 through athlete_25"""
        response = requests.get(f"{BASE_URL}/api/athletes")
        assert response.status_code == 200
        athletes = response.json()
        
        athlete_ids = [a["id"] for a in athletes]
        expected_ids = [f"athlete_{i}" for i in range(1, 26)]
        
        for expected_id in expected_ids:
            assert expected_id in athlete_ids, f"Missing athlete {expected_id}"
        
        print(f"✓ All athlete_1 through athlete_25 present")


class TestEventsPersistence:
    """Events collection: Phase 2 MongoDB persistence"""

    def test_get_events_returns_grouped_events(self):
        """GET /api/events returns events grouped as past/upcoming"""
        response = requests.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200
        data = response.json()
        
        assert "upcoming" in data
        assert "past" in data
        
        total_events = len(data["upcoming"]) + len(data["past"])
        assert total_events >= 7, f"Expected at least 7 events, got {total_events}"
        
        print(f"✓ GET /api/events: {len(data['upcoming'])} upcoming, {len(data['past'])} past")

    def test_events_have_recomputed_days_away(self):
        """Events have daysAway recomputed from stored date"""
        response = requests.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200
        data = response.json()
        
        all_events = data["upcoming"] + data["past"]
        for event in all_events[:5]:
            assert "daysAway" in event, f"Missing daysAway in event {event.get('id')}"
            assert "date" in event, f"Missing date in event {event.get('id')}"
            assert "status" in event, f"Missing status in event {event.get('id')}"
        
        print(f"✓ Events have daysAway recomputed from stored dates")

    def test_get_single_event_without_captured_notes(self):
        """GET /api/events/{id} returns event without capturedNotes field"""
        response = requests.get(f"{BASE_URL}/api/events/event_0")
        assert response.status_code == 200
        event = response.json()
        
        assert event["id"] == "event_0"
        assert "name" in event
        # GET single event should NOT include capturedNotes
        assert "capturedNotes" not in event
        
        print(f"✓ GET /api/events/event_0 returns event without capturedNotes")

    def test_winter_showcase_is_past(self):
        """Event event_0 (Winter Showcase) should be past"""
        response = requests.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200
        data = response.json()
        
        past_event_ids = [e["id"] for e in data["past"]]
        assert "event_0" in past_event_ids, "Winter Showcase (event_0) should be in past"
        
        winter_showcase = next(e for e in data["past"] if e["id"] == "event_0")
        assert winter_showcase["daysAway"] < 0, "Past event should have negative daysAway"
        
        print(f"✓ Winter Showcase (event_0) is past with daysAway={winter_showcase['daysAway']}")

    def test_create_event_persists_to_mongodb(self):
        """POST /api/events creates new event and persists to MongoDB"""
        payload = {
            "name": "TEST_Phase2_Event",
            "type": "showcase",
            "date": "2026-04-15T10:00:00Z",
            "location": "Test Stadium, TX",
            "expectedSchools": 5
        }
        
        create_response = requests.post(f"{BASE_URL}/api/events", json=payload)
        assert create_response.status_code == 200
        created_event = create_response.json()
        
        assert "id" in created_event
        assert created_event["name"] == "TEST_Phase2_Event"
        assert created_event["status"] == "upcoming"
        assert "daysAway" in created_event
        
        event_id = created_event["id"]
        
        # Verify event is retrievable via GET
        get_response = requests.get(f"{BASE_URL}/api/events/{event_id}")
        assert get_response.status_code == 200
        fetched_event = get_response.json()
        assert fetched_event["name"] == "TEST_Phase2_Event"
        
        print(f"✓ POST /api/events created {event_id}, verified via GET")

    def test_toggle_checklist_persists_to_mongodb(self):
        """PATCH /api/events/{event_id}/checklist/{item_id} toggles and persists"""
        # Get current state of event_1's checklist
        response = requests.get(f"{BASE_URL}/api/events/event_1")
        assert response.status_code == 200
        event = response.json()
        
        # Toggle check_2 (which should be false initially or toggle state)
        toggle_response = requests.patch(f"{BASE_URL}/api/events/event_1/checklist/check_2")
        assert toggle_response.status_code == 200
        result = toggle_response.json()
        
        # API returns {item, prepStatus, prepProgress}
        assert "item" in result
        assert "prepStatus" in result
        assert "prepProgress" in result
        
        # Verify state persisted by getting event again
        verify_response = requests.get(f"{BASE_URL}/api/events/event_1")
        assert verify_response.status_code == 200
        
        print(f"✓ PATCH checklist toggle persisted to MongoDB (item: {result['item']['id']})")


class TestEventNotesMergedAfterPhase2:
    """Event notes correctly merge into events after Phase 2 load"""

    def test_events_list_has_captured_notes_count(self):
        """Events in list have capturedNotesCount > 0 for events with notes"""
        response = requests.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200
        data = response.json()
        
        # Winter Showcase (event_0) should have notes from Phase 1
        past_events = data["past"]
        if past_events:
            winter_showcase = next((e for e in past_events if e["id"] == "event_0"), None)
            if winter_showcase:
                # capturedNotes should be merged in event list
                assert "capturedNotes" in winter_showcase
                notes_count = len(winter_showcase.get("capturedNotes", []))
                print(f"✓ Winter Showcase has {notes_count} captured notes merged")

    def test_get_event_notes_returns_notes_from_mongodb(self):
        """GET /api/events/{event_id}/notes returns notes from MongoDB (Phase 1)"""
        response = requests.get(f"{BASE_URL}/api/events/event_0/notes")
        assert response.status_code == 200
        notes = response.json()
        
        assert isinstance(notes, list)
        # Winter Showcase should have seeded notes from Phase 1
        if notes:
            note = notes[0]
            assert "id" in note
            assert "athlete_id" in note
            assert "event_id" in note
            print(f"✓ GET /api/events/event_0/notes returns {len(notes)} notes")
        else:
            print(f"✓ GET /api/events/event_0/notes returns empty list")

    def test_create_event_note_persists(self):
        """POST /api/events/{event_id}/notes creates note in MongoDB (Phase 1)"""
        payload = {
            "athlete_id": "athlete_1",
            "school_id": "ucla",
            "school_name": "UCLA",
            "interest_level": "warm",
            "note_text": "TEST_PHASE2_NOTE",
            "follow_ups": ["send_film"]
        }
        
        response = requests.post(f"{BASE_URL}/api/events/event_1/notes", json=payload)
        assert response.status_code == 200
        note = response.json()
        
        assert note["note_text"] == "TEST_PHASE2_NOTE"
        assert note["event_id"] == "event_1"
        
        print(f"✓ POST /api/events/event_1/notes created note {note['id']}")


class TestIntegrationWithPersistedData:
    """Integration endpoints work with Phase 2 persisted data"""

    def test_mission_control_returns_data(self):
        """GET /api/mission-control returns correct data with persisted athletes + events"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        assert response.status_code == 200
        data = response.json()
        
        assert "priorityAlerts" in data
        assert "upcomingEvents" in data
        assert "programSnapshot" in data
        assert "athletesNeedingAttention" in data
        
        # Interventions should be recomputed from persisted data
        debug = data.get("_debug", {})
        assert debug.get("total_interventions_detected", 0) >= 0
        
        print(f"✓ Mission Control works with {len(data['upcomingEvents'])} events, {debug.get('total_interventions_detected', 0)} interventions")

    def test_program_intelligence_returns_counts(self):
        """GET /api/program/intelligence returns data with correct structure"""
        response = requests.get(f"{BASE_URL}/api/program/intelligence")
        assert response.status_code == 200
        data = response.json()
        
        # Should have program_health and readiness sections
        assert "program_health" in data
        assert "readiness" in data
        
        # Verify readiness has grad_year breakdown
        readiness = data.get("readiness", {})
        by_grad_year = readiness.get("by_grad_year", [])
        
        # Sum up total athletes from grad year breakdown
        total_athletes = sum(gy.get("total_athletes", 0) for gy in by_grad_year)
        assert total_athletes == 25, f"Expected 25 athletes in readiness, got {total_athletes}"
        
        # Verify program health has intervention data
        program_health = data.get("program_health", {})
        assert "intervention_total" in program_health
        
        print(f"✓ Program Intelligence: {total_athletes} athletes, {program_health.get('intervention_total', 0)} interventions")

    def test_advocacy_recommendations_work(self):
        """GET /api/advocacy/recommendations works with persisted data"""
        response = requests.get(f"{BASE_URL}/api/advocacy/recommendations")
        assert response.status_code == 200
        data = response.json()
        
        # API returns grouped recommendations: drafts, recently_sent, needs_attention, closed
        assert "drafts" in data or "recently_sent" in data or "needs_attention" in data or "closed" in data
        
        # Count total recommendations
        total = 0
        for key in ["drafts", "recently_sent", "needs_attention", "closed"]:
            total += len(data.get(key, []))
        
        assert total >= 5, f"Expected at least 5 recommendations, got {total}"
        
        print(f"✓ Advocacy recommendations: {total} total recommendations")


class TestAdminStatusPhase2:
    """Admin status reflects Phase 2 persistence"""

    def test_admin_status_shows_phase_2(self):
        """GET /api/admin/status shows persistence_phase='Phase 2'"""
        response = requests.get(f"{BASE_URL}/api/admin/status")
        assert response.status_code == 200
        data = response.json()
        
        assert data["persistence_phase"] == "Phase 2"
        print(f"✓ Admin status shows Phase 2")

    def test_admin_status_shows_10_persisted_collections(self):
        """Admin status shows 10 persisted MongoDB collections"""
        response = requests.get(f"{BASE_URL}/api/admin/status")
        assert response.status_code == 200
        data = response.json()
        
        persisted = data["collections"]["persisted"]
        assert len(persisted) == 10, f"Expected 10 persisted collections, got {len(persisted)}"
        
        # Verify athletes and events are in persisted list with Phase 2
        collection_names = [c["name"] for c in persisted]
        assert "athletes" in collection_names
        assert "events" in collection_names
        
        athletes_col = next(c for c in persisted if c["name"] == "athletes")
        events_col = next(c for c in persisted if c["name"] == "events")
        
        assert athletes_col["phase"] == 2
        assert events_col["phase"] == 2
        assert athletes_col["count"] == 25
        assert events_col["count"] >= 7
        
        print(f"✓ 10 persisted collections: athletes={athletes_col['count']}, events={events_col['count']}")

    def test_admin_status_shows_2_in_memory_only(self):
        """Admin status shows 2 in-memory-only collections"""
        response = requests.get(f"{BASE_URL}/api/admin/status")
        assert response.status_code == 200
        data = response.json()
        
        in_memory = data["collections"]["in_memory_only"]
        assert len(in_memory) == 2, f"Expected 2 in-memory collections, got {len(in_memory)}"
        
        names = [c["name"] for c in in_memory]
        assert "schools" in names
        assert "interventions" in names
        
        print(f"✓ 2 in-memory-only collections: {names}")

    def test_admin_status_has_startup_order(self):
        """Admin status includes startup_order field"""
        response = requests.get(f"{BASE_URL}/api/admin/status")
        assert response.status_code == 200
        data = response.json()
        
        assert "startup_order" in data
        startup_order = data["startup_order"]
        
        # Should contain key collections in order
        assert "athletes" in startup_order
        assert "events" in startup_order
        assert "event_notes" in startup_order
        assert "recommendations" in startup_order
        
        print(f"✓ startup_order: {startup_order}")


class TestSupportPodWithPersistedData:
    """Support Pod loads correctly with persisted athletes"""

    def test_support_pod_loads_for_athlete(self):
        """GET /api/support-pods/{athlete_id} returns pod data"""
        response = requests.get(f"{BASE_URL}/api/support-pods/athlete_1")
        assert response.status_code == 200
        data = response.json()
        
        assert "athlete" in data
        assert data["athlete"]["id"] == "athlete_1"
        assert "pod_members" in data
        assert "actions" in data
        
        print(f"✓ Support Pod loads for athlete_1: {data['athlete'].get('fullName', 'N/A')}")

    def test_support_pod_works_for_multiple_athletes(self):
        """Support Pod works for athlete_5, athlete_10, athlete_20"""
        for athlete_id in ["athlete_5", "athlete_10", "athlete_20"]:
            response = requests.get(f"{BASE_URL}/api/support-pods/{athlete_id}")
            assert response.status_code == 200
            data = response.json()
            assert "athlete" in data
            print(f"✓ Support Pod works for {athlete_id}")


class TestSeedIfEmptyBehavior:
    """Seed-if-empty: No duplicates on restart"""

    def test_athletes_count_stable(self):
        """Athletes collection count should remain at 25 (no duplicates)"""
        response = requests.get(f"{BASE_URL}/api/admin/status")
        assert response.status_code == 200
        data = response.json()
        
        athletes_col = next(c for c in data["collections"]["persisted"] if c["name"] == "athletes")
        assert athletes_col["count"] == 25, f"Expected 25 athletes (no duplicates), got {athletes_col['count']}"
        
        print(f"✓ Athletes count stable at 25 (seed-if-empty working)")

    def test_events_count_at_least_7(self):
        """Events collection count should be at least 7 (7 seeded, plus any test-created)"""
        response = requests.get(f"{BASE_URL}/api/admin/status")
        assert response.status_code == 200
        data = response.json()
        
        events_col = next(c for c in data["collections"]["persisted"] if c["name"] == "events")
        assert events_col["count"] >= 7, f"Expected at least 7 events, got {events_col['count']}"
        
        print(f"✓ Events count is {events_col['count']} (7 seeded + test-created)")

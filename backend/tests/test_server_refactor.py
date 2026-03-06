"""Test server refactoring - all routes must work identically after split.

Tests all 8 routers:
1. Root/Status (in server.py)
2. Mission Control (mission_control.py)
3. Athletes (athletes.py)
4. Support Pods (support_pods.py)
5. Events (events.py)
6. Advocacy (advocacy.py)
7. Program Intelligence (program.py)
8. Admin (admin.py)
9. Debug (debug.py)
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestRootEndpoints:
    """Test root-level endpoints in server.py"""
    
    def test_root_api(self):
        """GET /api/ — root endpoint returns welcome message"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "CapyMatch" in data["message"]
        print(f"✓ Root endpoint: {data['message']}")


class TestMissionControlRouter:
    """Test mission_control.py router - 6 endpoints"""
    
    def test_mission_control_main(self):
        """GET /api/mission-control — returns all Mission Control data"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        assert response.status_code == 200
        data = response.json()
        assert "priorityAlerts" in data
        assert "athletesNeedingAttention" in data
        assert "upcomingEvents" in data
        assert "programSnapshot" in data
        assert "_debug" in data
        print(f"✓ Mission Control: {len(data['priorityAlerts'])} alerts, {len(data['athletesNeedingAttention'])} athletes needing attention")

    def test_mission_control_alerts(self):
        """GET /api/mission-control/alerts — returns alerts list"""
        response = requests.get(f"{BASE_URL}/api/mission-control/alerts")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Alerts endpoint: {len(data)} alerts")

    def test_mission_control_signals(self):
        """GET /api/mission-control/signals — returns momentum signals"""
        response = requests.get(f"{BASE_URL}/api/mission-control/signals")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Signals endpoint: {len(data)} signals")

    def test_mission_control_athletes(self):
        """GET /api/mission-control/athletes — returns athletes needing attention"""
        response = requests.get(f"{BASE_URL}/api/mission-control/athletes")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Athletes attention endpoint: {len(data)} athletes")

    def test_mission_control_events(self):
        """GET /api/mission-control/events — returns upcoming events"""
        response = requests.get(f"{BASE_URL}/api/mission-control/events")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Events endpoint: {len(data)} events")

    def test_mission_control_snapshot(self):
        """GET /api/mission-control/snapshot — returns program snapshot"""
        response = requests.get(f"{BASE_URL}/api/mission-control/snapshot")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        print(f"✓ Snapshot endpoint: {data}")


class TestAthletesRouter:
    """Test athletes.py router - 6 endpoints"""
    
    def test_get_all_athletes(self):
        """GET /api/athletes — returns 25 athletes"""
        response = requests.get(f"{BASE_URL}/api/athletes")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 25
        print(f"✓ Athletes list: {len(data)} athletes")

    def test_get_single_athlete(self):
        """GET /api/athletes/{id} — returns single athlete"""
        response = requests.get(f"{BASE_URL}/api/athletes/athlete_1")
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["id"] == "athlete_1"
        assert "fullName" in data
        print(f"✓ Single athlete: {data['fullName']}")

    def test_get_invalid_athlete(self):
        """GET /api/athletes/{id} — returns error for invalid ID"""
        response = requests.get(f"{BASE_URL}/api/athletes/invalid_athlete_999")
        assert response.status_code == 200  # Returns 200 with error body
        data = response.json()
        assert "error" in data
        print(f"✓ Invalid athlete returns error: {data['error']}")

    def test_create_note(self):
        """POST /api/athletes/{id}/notes — creates timeline note"""
        response = requests.post(
            f"{BASE_URL}/api/athletes/athlete_1/notes",
            json={"text": "TEST_REFACTOR note", "tag": "test"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["athlete_id"] == "athlete_1"
        assert data["text"] == "TEST_REFACTOR note"
        print(f"✓ Created note: {data['id']}")

    def test_get_athlete_timeline(self):
        """GET /api/athletes/{id}/timeline — returns notes, assignments, messages"""
        response = requests.get(f"{BASE_URL}/api/athletes/athlete_1/timeline")
        assert response.status_code == 200
        data = response.json()
        assert "notes" in data
        assert "assignments" in data
        assert "messages" in data
        print(f"✓ Timeline: {len(data['notes'])} notes, {len(data['assignments'])} assignments, {len(data['messages'])} messages")


class TestSupportPodsRouter:
    """Test support_pods.py router - 4 endpoints"""
    
    def test_get_support_pod(self):
        """GET /api/support-pods/{athlete_id} — returns full pod data"""
        response = requests.get(f"{BASE_URL}/api/support-pods/athlete_1")
        assert response.status_code == 200
        data = response.json()
        assert "athlete" in data
        assert "pod_members" in data
        assert "actions" in data
        assert "timeline" in data
        assert "pod_health" in data
        print(f"✓ Support Pod: {len(data['pod_members'])} members, {len(data['actions'])} actions")

    def test_create_pod_action(self):
        """POST /api/support-pods/{athlete_id}/actions — creates pod action"""
        response = requests.post(
            f"{BASE_URL}/api/support-pods/athlete_1/actions",
            json={
                "title": "TEST_REFACTOR action",
                "owner": "Coach Martinez"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["title"] == "TEST_REFACTOR action"
        action_id = data["id"]
        print(f"✓ Created action: {action_id}")
        return action_id

    def test_update_pod_action(self):
        """PATCH /api/support-pods/{athlete_id}/actions/{id} — updates action status"""
        # First create an action
        create_response = requests.post(
            f"{BASE_URL}/api/support-pods/athlete_1/actions",
            json={
                "title": "TEST_REFACTOR_UPDATE action",
                "owner": "Coach Martinez"
            }
        )
        action_id = create_response.json()["id"]
        
        # Now update it
        response = requests.patch(
            f"{BASE_URL}/api/support-pods/athlete_1/actions/{action_id}",
            json={"status": "completed"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        print(f"✓ Updated action to completed: {action_id}")

    def test_resolve_issue(self):
        """POST /api/support-pods/{athlete_id}/resolve — resolves issue"""
        response = requests.post(
            f"{BASE_URL}/api/support-pods/athlete_1/resolve",
            json={
                "category": "test_category",
                "resolution_note": "TEST_REFACTOR resolution"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["category"] == "test_category"
        print(f"✓ Resolved issue: {data['id']}")


class TestEventsRouter:
    """Test events.py router - 13 endpoints + schools"""
    
    def test_list_events(self):
        """GET /api/events — returns past/upcoming grouped events"""
        response = requests.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200
        data = response.json()
        assert "upcoming" in data
        assert "past" in data
        print(f"✓ Events: {len(data['upcoming'])} upcoming, {len(data['past'])} past")

    def test_get_event_detail(self):
        """GET /api/events/{id} — returns event detail"""
        response = requests.get(f"{BASE_URL}/api/events/event_1")
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["id"] == "event_1"
        print(f"✓ Event detail: {data.get('name', 'N/A')}")

    def test_create_event(self):
        """POST /api/events — creates new event, persists to MongoDB"""
        response = requests.post(
            f"{BASE_URL}/api/events",
            json={
                "name": "TEST_REFACTOR Event",
                "type": "showcase",
                "date": "2026-03-01T10:00:00Z",
                "location": "Test Location",
                "expectedSchools": 5
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["name"] == "TEST_REFACTOR Event"
        print(f"✓ Created event: {data['id']}")
        return data["id"]

    def test_get_event_prep(self):
        """GET /api/events/{id}/prep — returns prep data with checklist"""
        response = requests.get(f"{BASE_URL}/api/events/event_1/prep")
        assert response.status_code == 200
        data = response.json()
        assert "checklist" in data or "event" in data
        print(f"✓ Event prep data retrieved")

    def test_toggle_checklist(self):
        """PATCH /api/events/{id}/checklist/{item_id} — toggles checklist"""
        # First get the event to find a checklist item
        event_response = requests.get(f"{BASE_URL}/api/events/event_1/prep")
        if event_response.status_code == 200:
            event_data = event_response.json()
            checklist = event_data.get("checklist", [])
            if checklist:
                item_id = checklist[0].get("id", "check_1")
            else:
                item_id = "check_1"
        else:
            item_id = "check_1"
        
        response = requests.patch(f"{BASE_URL}/api/events/event_1/checklist/{item_id}")
        # May return error if item not found, but endpoint should work
        assert response.status_code == 200
        print(f"✓ Checklist toggle endpoint working")

    def test_get_event_notes(self):
        """GET /api/events/{id}/notes — returns notes from MongoDB"""
        response = requests.get(f"{BASE_URL}/api/events/event_0/notes")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Event notes: {len(data)} notes")

    def test_create_event_note(self):
        """POST /api/events/{id}/notes — creates note, persists to MongoDB"""
        response = requests.post(
            f"{BASE_URL}/api/events/event_1/notes",
            json={
                "athlete_id": "athlete_1",
                "school_name": "Test University",
                "interest_level": "high",
                "note_text": "TEST_REFACTOR event note"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        print(f"✓ Created event note: {data['id']}")

    def test_get_event_summary(self):
        """GET /api/events/{id}/summary — returns event summary with stats"""
        response = requests.get(f"{BASE_URL}/api/events/event_0/summary")
        assert response.status_code == 200
        data = response.json()
        # Should have summary data
        print(f"✓ Event summary retrieved")

    def test_list_schools(self):
        """GET /api/schools — returns 10 schools"""
        response = requests.get(f"{BASE_URL}/api/schools")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 10
        print(f"✓ Schools: {len(data)} schools")


class TestAdvocacyRouter:
    """Test advocacy.py router - 12 endpoints"""
    
    def test_list_recommendations(self):
        """GET /api/advocacy/recommendations — returns grouped recommendations"""
        response = requests.get(f"{BASE_URL}/api/advocacy/recommendations")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict) or isinstance(data, list)
        print(f"✓ Recommendations endpoint working")

    def test_create_recommendation(self):
        """POST /api/advocacy/recommendations — creates recommendation, persists"""
        response = requests.post(
            f"{BASE_URL}/api/advocacy/recommendations",
            json={
                "athlete_id": "athlete_1",
                "school_name": "Test University",
                "fit_reasons": ["Great fit"],
                "intro_message": "TEST_REFACTOR recommendation"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        rec_id = data["id"]
        print(f"✓ Created recommendation: {rec_id}")
        return rec_id

    def test_get_recommendation_detail(self):
        """GET /api/advocacy/recommendations/{id} — returns rec from MongoDB"""
        # First create a recommendation
        create_response = requests.post(
            f"{BASE_URL}/api/advocacy/recommendations",
            json={
                "athlete_id": "athlete_2",
                "school_name": "Another University",
                "fit_reasons": ["Test fit"],
                "intro_message": "TEST_REFACTOR_DETAIL rec"
            }
        )
        rec_id = create_response.json()["id"]
        
        response = requests.get(f"{BASE_URL}/api/advocacy/recommendations/{rec_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == rec_id
        print(f"✓ Retrieved recommendation detail: {rec_id}")

    def test_send_recommendation(self):
        """POST /api/advocacy/recommendations/{id}/send — transitions draft to sent"""
        # Create a recommendation first
        create_response = requests.post(
            f"{BASE_URL}/api/advocacy/recommendations",
            json={
                "athlete_id": "athlete_3",
                "school_name": "Send Test University",
                "fit_reasons": ["Sending test"],
                "intro_message": "TEST_REFACTOR_SEND rec"
            }
        )
        rec_id = create_response.json()["id"]
        
        response = requests.post(f"{BASE_URL}/api/advocacy/recommendations/{rec_id}/send")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "sent"
        print(f"✓ Sent recommendation: {rec_id}")

    def test_respond_to_recommendation(self):
        """POST /api/advocacy/recommendations/{id}/respond — logs response"""
        # Create and send a recommendation first
        create_response = requests.post(
            f"{BASE_URL}/api/advocacy/recommendations",
            json={
                "athlete_id": "athlete_4",
                "school_name": "Response Test University",
                "fit_reasons": ["Response test"],
                "intro_message": "TEST_REFACTOR_RESPOND rec"
            }
        )
        rec_id = create_response.json()["id"]
        requests.post(f"{BASE_URL}/api/advocacy/recommendations/{rec_id}/send")
        
        response = requests.post(
            f"{BASE_URL}/api/advocacy/recommendations/{rec_id}/respond",
            json={"response_note": "Positive response", "response_type": "warm"}
        )
        assert response.status_code == 200
        print(f"✓ Logged response: {rec_id}")

    def test_follow_up_recommendation(self):
        """POST /api/advocacy/recommendations/{id}/follow-up — marks follow-up"""
        # Create and send a recommendation first
        create_response = requests.post(
            f"{BASE_URL}/api/advocacy/recommendations",
            json={
                "athlete_id": "athlete_5",
                "school_name": "Follow-up Test University",
                "fit_reasons": ["Follow-up test"],
                "intro_message": "TEST_REFACTOR_FOLLOWUP rec"
            }
        )
        rec_id = create_response.json()["id"]
        requests.post(f"{BASE_URL}/api/advocacy/recommendations/{rec_id}/send")
        
        response = requests.post(f"{BASE_URL}/api/advocacy/recommendations/{rec_id}/follow-up")
        assert response.status_code == 200
        print(f"✓ Marked follow-up: {rec_id}")

    def test_close_recommendation(self):
        """POST /api/advocacy/recommendations/{id}/close — closes rec"""
        # Create and send a recommendation first
        create_response = requests.post(
            f"{BASE_URL}/api/advocacy/recommendations",
            json={
                "athlete_id": "athlete_6",
                "school_name": "Close Test University",
                "fit_reasons": ["Close test"],
                "intro_message": "TEST_REFACTOR_CLOSE rec"
            }
        )
        rec_id = create_response.json()["id"]
        requests.post(f"{BASE_URL}/api/advocacy/recommendations/{rec_id}/send")
        
        response = requests.post(
            f"{BASE_URL}/api/advocacy/recommendations/{rec_id}/close",
            json={"reason": "no_response"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "closed"
        print(f"✓ Closed recommendation: {rec_id}")

    def test_list_relationships(self):
        """GET /api/advocacy/relationships — returns school relationships list"""
        response = requests.get(f"{BASE_URL}/api/advocacy/relationships")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Relationships: {len(data)} schools")

    def test_get_relationship_detail(self):
        """GET /api/advocacy/relationships/{school_id} — returns relationship detail"""
        response = requests.get(f"{BASE_URL}/api/advocacy/relationships/school_1")
        assert response.status_code == 200
        print(f"✓ Relationship detail endpoint working")

    def test_get_advocacy_context(self):
        """GET /api/advocacy/context/{athlete_id} — returns event context"""
        response = requests.get(f"{BASE_URL}/api/advocacy/context/athlete_1")
        assert response.status_code == 200
        print(f"✓ Advocacy context endpoint working")


class TestProgramRouter:
    """Test program.py router - 1 endpoint"""
    
    def test_program_intelligence(self):
        """GET /api/program/intelligence — returns 5 sections"""
        response = requests.get(f"{BASE_URL}/api/program/intelligence")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        # Should have program intelligence sections
        print(f"✓ Program Intelligence: {len(data.keys())} sections")


class TestAdminRouter:
    """Test admin.py router - 1 endpoint"""
    
    def test_admin_status(self):
        """GET /api/admin/status — returns Phase 2 status"""
        response = requests.get(f"{BASE_URL}/api/admin/status")
        assert response.status_code == 200
        data = response.json()
        assert data["persistence_phase"] == "Phase 2"
        assert "collections" in data
        persisted = data["collections"]["persisted"]
        in_memory = data["collections"]["in_memory_only"]
        assert len(persisted) == 10
        assert len(in_memory) == 2
        print(f"✓ Admin Status: Phase 2, {len(persisted)} persisted, {len(in_memory)} in-memory")


class TestDebugRouter:
    """Test debug.py router - 3 endpoints"""
    
    def test_get_all_interventions(self):
        """GET /api/debug/interventions — returns intervention breakdown"""
        response = requests.get(f"{BASE_URL}/api/debug/interventions")
        assert response.status_code == 200
        data = response.json()
        assert "total_interventions" in data
        assert "by_category" in data
        assert "by_tier" in data
        assert "interventions" in data
        print(f"✓ Debug interventions: {data['total_interventions']} total")

    def test_get_athlete_interventions(self):
        """GET /api/debug/interventions/{athlete_id} — returns athlete interventions"""
        response = requests.get(f"{BASE_URL}/api/debug/interventions/athlete_1")
        assert response.status_code == 200
        data = response.json()
        assert "athlete_id" in data
        print(f"✓ Athlete interventions for athlete_1")

    def test_get_intervention_scoring(self):
        """GET /api/debug/scoring/{intervention_id} — returns scoring breakdown"""
        # First get interventions to find a valid ID
        interventions_response = requests.get(f"{BASE_URL}/api/debug/interventions")
        interventions = interventions_response.json().get("interventions", [])
        
        if interventions:
            # Create pseudo_id from first intervention
            first = interventions[0]
            pseudo_id = f"{first['athlete_id']}_{first['category']}"
            response = requests.get(f"{BASE_URL}/api/debug/scoring/{pseudo_id}")
            assert response.status_code == 200
            print(f"✓ Scoring endpoint working for {pseudo_id}")
        else:
            # Test with a fake ID - should return error
            response = requests.get(f"{BASE_URL}/api/debug/scoring/fake_id")
            assert response.status_code == 200
            print(f"✓ Scoring endpoint returns error for invalid ID")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

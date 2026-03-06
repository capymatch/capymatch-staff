"""
Test admin status endpoint and trust cue features
Tests Phase 1 persistence: P0 admin view + toast message validations
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')


class TestAdminStatus:
    """Test GET /api/admin/status endpoint returns correct structure"""

    def test_admin_status_returns_persistence_phase(self):
        """Verify admin status returns persistence_phase field"""
        response = requests.get(f"{BASE_URL}/api/admin/status")
        assert response.status_code == 200
        data = response.json()
        assert "persistence_phase" in data
        assert data["persistence_phase"] == "Phase 1"
        print("PASS: Admin status returns persistence_phase='Phase 1'")

    def test_admin_status_returns_collections_persisted(self):
        """Verify admin status returns persisted collections with counts"""
        response = requests.get(f"{BASE_URL}/api/admin/status")
        assert response.status_code == 200
        data = response.json()
        
        assert "collections" in data
        assert "persisted" in data["collections"]
        persisted = data["collections"]["persisted"]
        assert isinstance(persisted, list)
        assert len(persisted) > 0
        
        # Check each persisted collection has required fields
        expected_names = ["event_notes", "recommendations", "pod_actions", "athlete_notes", 
                         "assignments", "messages", "pod_resolutions", "pod_action_events"]
        actual_names = [c["name"] for c in persisted]
        
        for name in expected_names:
            assert name in actual_names, f"Missing persisted collection: {name}"
        
        for coll in persisted:
            assert "name" in coll
            assert "count" in coll
            assert isinstance(coll["count"], int)
            assert coll["count"] >= 0
            assert "source" in coll
            assert coll["source"] == "MongoDB"
            assert "phase" in coll
            assert "description" in coll
        
        print(f"PASS: Admin status returns {len(persisted)} persisted collections with counts")

    def test_admin_status_returns_collections_in_memory(self):
        """Verify admin status returns in-memory-only collections with counts"""
        response = requests.get(f"{BASE_URL}/api/admin/status")
        assert response.status_code == 200
        data = response.json()
        
        assert "collections" in data
        assert "in_memory_only" in data["collections"]
        in_memory = data["collections"]["in_memory_only"]
        assert isinstance(in_memory, list)
        assert len(in_memory) > 0
        
        # Check each in-memory collection has required fields
        expected_names = ["athletes", "events", "schools", "interventions"]
        actual_names = [c["name"] for c in in_memory]
        
        for name in expected_names:
            assert name in actual_names, f"Missing in-memory collection: {name}"
        
        for coll in in_memory:
            assert "name" in coll
            assert "count" in coll
            assert isinstance(coll["count"], int)
            assert coll["count"] >= 0
            assert "source" in coll
            assert "description" in coll
        
        print(f"PASS: Admin status returns {len(in_memory)} in-memory collections with counts")

    def test_admin_status_returns_seed_strategy(self):
        """Verify admin status returns seed_strategy description"""
        response = requests.get(f"{BASE_URL}/api/admin/status")
        assert response.status_code == 200
        data = response.json()
        
        assert "seed_strategy" in data
        assert isinstance(data["seed_strategy"], str)
        assert len(data["seed_strategy"]) > 0
        assert "seed-if-empty" in data["seed_strategy"].lower()
        print(f"PASS: Admin status returns seed_strategy: {data['seed_strategy'][:50]}...")

    def test_admin_status_returns_limitations(self):
        """Verify admin status returns limitations list"""
        response = requests.get(f"{BASE_URL}/api/admin/status")
        assert response.status_code == 200
        data = response.json()
        
        assert "limitations" in data
        assert isinstance(data["limitations"], list)
        assert len(data["limitations"]) >= 3  # At least 3 limitations mentioned
        
        for limitation in data["limitations"]:
            assert isinstance(limitation, str)
            assert len(limitation) > 0
        
        print(f"PASS: Admin status returns {len(data['limitations'])} limitations")

    def test_admin_status_returns_architecture(self):
        """Verify admin status returns architecture description"""
        response = requests.get(f"{BASE_URL}/api/admin/status")
        assert response.status_code == 200
        data = response.json()
        
        assert "architecture" in data
        assert isinstance(data["architecture"], str)
        assert len(data["architecture"]) > 0
        assert "dual-write" in data["architecture"].lower() or "mongodb" in data["architecture"].lower()
        print(f"PASS: Admin status returns architecture description")


class TestTrustCueEndpoints:
    """Test endpoints that trigger trust cue toasts - verify responses"""

    def test_event_note_capture_returns_note_data(self):
        """POST /api/events/{event_id}/notes - returns note with id for 'Saved' toast"""
        payload = {
            "athlete_id": "athlete_0",
            "school_id": "school_0",
            "school_name": "Michigan",
            "interest_level": "warm",
            "note_text": "TEST_trust_cue note",
            "follow_ups": []
        }
        response = requests.post(f"{BASE_URL}/api/events/event_0/notes", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert "athlete_name" in data
        assert data["athlete_id"] == "athlete_0"
        print(f"PASS: Event note capture returns note with id={data['id'][:8]}... for Saved toast")

    def test_recommendation_send_returns_school_name(self):
        """POST /api/advocacy/recommendations/{id}/send - returns school_name for toast"""
        # First create a draft
        create_payload = {
            "athlete_id": "athlete_1",
            "school_id": "school_1",
            "school_name": "Stanford",
            "fit_reasons": ["athletic_ability"],
            "intro_message": "TEST_trust_cue recommendation"
        }
        create_res = requests.post(f"{BASE_URL}/api/advocacy/recommendations", json=create_payload)
        assert create_res.status_code == 200
        rec_id = create_res.json()["id"]
        
        # Send it
        send_res = requests.post(f"{BASE_URL}/api/advocacy/recommendations/{rec_id}/send")
        assert send_res.status_code == 200
        data = send_res.json()
        
        assert "school_name" in data
        assert data["school_name"] == "Stanford"
        assert data["status"] == "sent"
        print(f"PASS: Send recommendation returns school_name='{data['school_name']}' for toast")

    def test_recommendation_respond_returns_data(self):
        """POST /api/advocacy/recommendations/{id}/respond - returns data for toast"""
        # Create and send a draft first
        create_payload = {
            "athlete_id": "athlete_2",
            "school_id": "school_2",
            "school_name": "UCLA",
            "intro_message": "TEST_trust_cue_respond"
        }
        create_res = requests.post(f"{BASE_URL}/api/advocacy/recommendations", json=create_payload)
        rec_id = create_res.json()["id"]
        requests.post(f"{BASE_URL}/api/advocacy/recommendations/{rec_id}/send")
        
        # Log response
        respond_payload = {"response_note": "Coach interested", "response_type": "warm"}
        respond_res = requests.post(f"{BASE_URL}/api/advocacy/recommendations/{rec_id}/respond", json=respond_payload)
        assert respond_res.status_code == 200
        data = respond_res.json()
        
        assert "id" in data
        assert data["status"] in ["warm_response", "closed"]
        print(f"PASS: Respond endpoint returns status={data['status']} for 'Response saved' toast")

    def test_recommendation_followup_returns_data(self):
        """POST /api/advocacy/recommendations/{id}/follow-up - returns data for toast"""
        # Create and send a draft first
        create_payload = {
            "athlete_id": "athlete_3",
            "school_id": "school_3",
            "school_name": "Virginia",
            "intro_message": "TEST_trust_cue_followup"
        }
        create_res = requests.post(f"{BASE_URL}/api/advocacy/recommendations", json=create_payload)
        rec_id = create_res.json()["id"]
        requests.post(f"{BASE_URL}/api/advocacy/recommendations/{rec_id}/send")
        
        # Mark follow-up
        followup_res = requests.post(f"{BASE_URL}/api/advocacy/recommendations/{rec_id}/follow-up")
        assert followup_res.status_code == 200
        data = followup_res.json()
        
        assert "id" in data
        assert data["status"] == "follow_up_needed"
        print(f"PASS: Follow-up endpoint returns status={data['status']} for 'Follow-up saved' toast")

    def test_recommendation_close_returns_data(self):
        """POST /api/advocacy/recommendations/{id}/close - returns data for toast"""
        # Create and send a draft first
        create_payload = {
            "athlete_id": "athlete_4",
            "school_id": "school_4",
            "school_name": "Ohio State",
            "intro_message": "TEST_trust_cue_close"
        }
        create_res = requests.post(f"{BASE_URL}/api/advocacy/recommendations", json=create_payload)
        rec_id = create_res.json()["id"]
        requests.post(f"{BASE_URL}/api/advocacy/recommendations/{rec_id}/send")
        
        # Close it
        close_res = requests.post(f"{BASE_URL}/api/advocacy/recommendations/{rec_id}/close", json={"reason": "no_response"})
        assert close_res.status_code == 200
        data = close_res.json()
        
        assert "id" in data
        assert data["status"] == "closed"
        print(f"PASS: Close endpoint returns status={data['status']} for 'Closed — saved' toast")

    def test_route_note_to_pod_returns_data(self):
        """POST /api/events/{event_id}/notes/{note_id}/route - returns routed:true for toast"""
        # Create a note first
        create_payload = {
            "athlete_id": "athlete_0",
            "school_id": "school_0",
            "school_name": "Michigan",
            "interest_level": "hot",
            "note_text": "TEST_route_note",
            "follow_ups": ["send_film"]
        }
        create_res = requests.post(f"{BASE_URL}/api/events/event_0/notes", json=create_payload)
        note_id = create_res.json()["id"]
        
        # Route it
        route_res = requests.post(f"{BASE_URL}/api/events/event_0/notes/{note_id}/route")
        assert route_res.status_code == 200
        data = route_res.json()
        
        assert data["routed"] == True
        print(f"PASS: Route note returns routed=True for 'Routed to Support Pod — synced' toast")

    def test_bulk_route_returns_counts(self):
        """POST /api/events/{event_id}/route-to-pods - returns counts for toast"""
        # First create some notes with follow-ups
        for i in range(2):
            payload = {
                "athlete_id": f"athlete_{i}",
                "school_id": f"school_{i}",
                "school_name": f"TEST School {i}",
                "interest_level": "warm",
                "note_text": f"TEST_bulk_route_{i}",
                "follow_ups": ["schedule_call"]
            }
            requests.post(f"{BASE_URL}/api/events/event_1/notes", json=payload)
        
        # Bulk route
        route_res = requests.post(f"{BASE_URL}/api/events/event_1/route-to-pods")
        assert route_res.status_code == 200
        data = route_res.json()
        
        assert "routed_notes" in data
        assert "athletes_affected" in data
        assert isinstance(data["routed_notes"], int)
        assert isinstance(data["athletes_affected"], int)
        print(f"PASS: Bulk route returns routed_notes={data['routed_notes']}, athletes_affected={data['athletes_affected']} for 'Routed X notes — synced to Y Support Pods' toast")


class TestCoreModesStillWorking:
    """Verify core modes (Mission Control, Events, Advocacy) still load correctly"""

    def test_mission_control_loads(self):
        """GET /api/mission-control returns data"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        assert response.status_code == 200
        data = response.json()
        assert "priorityAlerts" in data
        assert "upcomingEvents" in data
        print(f"PASS: Mission Control API returns {len(data.get('priorityAlerts', []))} priority alerts")

    def test_events_mode_loads(self):
        """GET /api/events returns event list"""
        response = requests.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200
        data = response.json()
        assert "upcoming" in data
        assert "past" in data
        print(f"PASS: Events API returns {len(data.get('upcoming', []))} upcoming, {len(data.get('past', []))} past events")

    def test_advocacy_mode_loads(self):
        """GET /api/advocacy/recommendations returns recommendations"""
        response = requests.get(f"{BASE_URL}/api/advocacy/recommendations")
        assert response.status_code == 200
        data = response.json()
        # Response structure has grouped categories at root level
        assert any(key in data for key in ["drafts", "needs_attention", "recently_sent", "closed"])
        print(f"PASS: Advocacy API returns recommendations")

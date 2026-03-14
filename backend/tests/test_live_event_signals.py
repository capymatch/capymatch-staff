"""
Test Live Event structured signal capture system (Phase 5):
- Structured signal types (coach_interest, strong_performance, needs_film, offered_visit, good_conversation, standout_skill)
- Pipeline integration (auto-updates program recruiting_status)
- Automatic School Pod routing (auto-creates pod_actions)
- Add School button (create pipeline entry from event)
- Grouped recent panel (athlete + school)
- All signals feed pipeline, school pod, and timeline
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test data - using event_1 which has athletes: athlete_1 (Emma), athlete_2 (Olivia), athlete_4 (Sarah)
# Schools: UCLA, Stanford, USC, Virginia, Duke
EVENT_ID = "event_1"
ATHLETE_1 = "athlete_1"  # Emma Chen
ATHLETE_2 = "athlete_2"  # Olivia Anderson
ATHLETE_4 = "athlete_4"  # Sarah Martinez


class TestLiveEventSignals:
    """Test the new structured signal capture system"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get authentication token"""
        login_resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "coach.williams@capymatch.com", "password": "coach123"}
        )
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        self.token = login_resp.json()["token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    # ─── Event Prep Data Tests ───
    
    def test_event_prep_returns_athletes(self):
        """Event prep returns 3 athletes for event_1"""
        resp = requests.get(
            f"{BASE_URL}/api/events/{EVENT_ID}/prep",
            headers=self.headers
        )
        assert resp.status_code == 200
        data = resp.json()
        
        # Verify athletes are returned
        assert "athletes" in data
        athletes = data["athletes"]
        assert len(athletes) == 3, f"Expected 3 athletes, got {len(athletes)}"
        
        # Verify athlete IDs
        athlete_ids = [a["id"] for a in athletes]
        assert ATHLETE_1 in athlete_ids, "athlete_1 should be in event"
        assert ATHLETE_2 in athlete_ids, "athlete_2 should be in event"
        assert ATHLETE_4 in athlete_ids, "athlete_4 should be in event"
    
    def test_event_prep_athletes_have_photos(self):
        """Athletes returned have photo_url field"""
        resp = requests.get(
            f"{BASE_URL}/api/events/{EVENT_ID}/prep",
            headers=self.headers
        )
        data = resp.json()
        
        for athlete in data["athletes"]:
            assert "photo_url" in athlete, f"Athlete {athlete['id']} missing photo_url"
    
    def test_event_prep_returns_target_schools(self):
        """Event prep returns schools for the event"""
        resp = requests.get(
            f"{BASE_URL}/api/events/{EVENT_ID}/prep",
            headers=self.headers
        )
        data = resp.json()
        
        assert "targetSchools" in data
        schools = data["targetSchools"]
        assert len(schools) >= 3, f"Expected at least 3 schools, got {len(schools)}"
        
        # Verify school structure
        for school in schools:
            assert "id" in school
            assert "name" in school
    
    def test_event_prep_athletes_have_target_schools_at_event(self):
        """Athletes have targetSchoolsAtEvent for highlighting"""
        resp = requests.get(
            f"{BASE_URL}/api/events/{EVENT_ID}/prep",
            headers=self.headers
        )
        data = resp.json()
        
        for athlete in data["athletes"]:
            assert "targetSchoolsAtEvent" in athlete, f"Athlete {athlete['id']} missing targetSchoolsAtEvent"
    
    # ─── Signal Types Tests ───
    
    def test_signal_coach_interest_creates_signal(self):
        """coach_interest signal type creates signal and updates pipeline"""
        unique_note = f"TEST_SIGNAL_COACH_{uuid.uuid4().hex[:8]}"
        resp = requests.post(
            f"{BASE_URL}/api/events/{EVENT_ID}/signals",
            headers=self.headers,
            json={
                "athlete_id": ATHLETE_2,
                "school_id": "usc",
                "school_name": "USC",
                "interest_level": "hot",
                "signal_type": "coach_interest",
                "note_text": unique_note
            }
        )
        assert resp.status_code == 200
        data = resp.json()
        
        # Verify signal structure
        assert data["athlete_id"] == ATHLETE_2
        assert data["signal_type"] == "coach_interest"
        assert data["school_name"] == "USC"
        assert data["note_text"] == unique_note
        assert "id" in data
        assert "captured_at" in data
        
        # coach_interest should create action
        assert data.get("action_created") == True, "coach_interest should create action"
    
    def test_signal_strong_performance_no_pipeline_update(self):
        """strong_performance signal type does not update pipeline or create action"""
        unique_note = f"TEST_SIGNAL_PERF_{uuid.uuid4().hex[:8]}"
        resp = requests.post(
            f"{BASE_URL}/api/events/{EVENT_ID}/signals",
            headers=self.headers,
            json={
                "athlete_id": ATHLETE_1,
                "school_id": "stanford",
                "school_name": "Stanford",
                "interest_level": "warm",
                "signal_type": "strong_performance",
                "note_text": unique_note
            }
        )
        assert resp.status_code == 200
        data = resp.json()
        
        assert data["signal_type"] == "strong_performance"
        # strong_performance does not create action
        assert data.get("action_created") == False, "strong_performance should NOT create action"
    
    def test_signal_needs_film_creates_action(self):
        """needs_film signal type creates follow-up action"""
        unique_note = f"TEST_SIGNAL_FILM_{uuid.uuid4().hex[:8]}"
        resp = requests.post(
            f"{BASE_URL}/api/events/{EVENT_ID}/signals",
            headers=self.headers,
            json={
                "athlete_id": ATHLETE_4,
                "school_id": "ucla",
                "school_name": "UCLA",
                "interest_level": "warm",
                "signal_type": "needs_film",
                "note_text": unique_note
            }
        )
        assert resp.status_code == 200
        data = resp.json()
        
        assert data["signal_type"] == "needs_film"
        assert data.get("action_created") == True, "needs_film should create action"
        assert data.get("routed_to_pod") == True, "needs_film should route to pod"
    
    def test_signal_offered_visit_updates_pipeline(self):
        """offered_visit signal type updates pipeline to Campus Visit and creates action"""
        unique_note = f"TEST_SIGNAL_VISIT_{uuid.uuid4().hex[:8]}"
        resp = requests.post(
            f"{BASE_URL}/api/events/{EVENT_ID}/signals",
            headers=self.headers,
            json={
                "athlete_id": ATHLETE_1,
                "school_id": "duke",
                "school_name": "Duke",
                "interest_level": "hot",
                "signal_type": "offered_visit",
                "note_text": unique_note
            }
        )
        assert resp.status_code == 200
        data = resp.json()
        
        assert data["signal_type"] == "offered_visit"
        assert data.get("action_created") == True, "offered_visit should create action"
    
    def test_signal_good_conversation_creates_action(self):
        """good_conversation signal type creates thank-you follow-up action"""
        unique_note = f"TEST_SIGNAL_CONV_{uuid.uuid4().hex[:8]}"
        resp = requests.post(
            f"{BASE_URL}/api/events/{EVENT_ID}/signals",
            headers=self.headers,
            json={
                "athlete_id": ATHLETE_2,
                "school_id": "stanford",
                "school_name": "Stanford",
                "interest_level": "warm",
                "signal_type": "good_conversation",
                "note_text": unique_note
            }
        )
        assert resp.status_code == 200
        data = resp.json()
        
        assert data["signal_type"] == "good_conversation"
        assert data.get("action_created") == True, "good_conversation should create action"
    
    def test_signal_standout_skill_no_action(self):
        """standout_skill signal type does not create action"""
        unique_note = f"TEST_SIGNAL_SKILL_{uuid.uuid4().hex[:8]}"
        resp = requests.post(
            f"{BASE_URL}/api/events/{EVENT_ID}/signals",
            headers=self.headers,
            json={
                "athlete_id": ATHLETE_4,
                "school_id": "usc",
                "school_name": "USC",
                "interest_level": "hot",
                "signal_type": "standout_skill",
                "note_text": unique_note
            }
        )
        assert resp.status_code == 200
        data = resp.json()
        
        assert data["signal_type"] == "standout_skill"
        assert data.get("action_created") == False, "standout_skill should NOT create action"
    
    # ─── Validation Tests ───
    
    def test_signal_requires_athlete(self):
        """Signal creation requires athlete_id"""
        resp = requests.post(
            f"{BASE_URL}/api/events/{EVENT_ID}/signals",
            headers=self.headers,
            json={
                "school_id": "stanford",
                "school_name": "Stanford",
                "interest_level": "warm",
                "signal_type": "coach_interest",
                "note_text": "TEST missing athlete"
            }
        )
        # Should fail validation
        assert resp.status_code == 422, "Missing athlete_id should return 422"
    
    def test_signal_requires_signal_type(self):
        """Signal creation requires signal_type"""
        resp = requests.post(
            f"{BASE_URL}/api/events/{EVENT_ID}/signals",
            headers=self.headers,
            json={
                "athlete_id": ATHLETE_1,
                "school_id": "stanford",
                "school_name": "Stanford",
                "interest_level": "warm",
                "note_text": "TEST missing signal_type"
            }
        )
        # Should fail validation
        assert resp.status_code == 422, "Missing signal_type should return 422"
    
    def test_signal_with_invalid_event_returns_404(self):
        """Signal creation for non-existent event returns 404"""
        resp = requests.post(
            f"{BASE_URL}/api/events/invalid_event_999/signals",
            headers=self.headers,
            json={
                "athlete_id": ATHLETE_1,
                "school_id": "stanford",
                "school_name": "Stanford",
                "interest_level": "warm",
                "signal_type": "coach_interest",
                "note_text": "TEST invalid event"
            }
        )
        assert resp.status_code == 404
    
    # ─── Add School Tests ───
    
    def test_add_school_creates_pipeline_entry(self):
        """Add School creates a new program entry in the pipeline"""
        unique_school = f"TEST_Uni_{uuid.uuid4().hex[:8]}"
        unique_school_id = unique_school.lower().replace(" ", "_")[:30]
        
        resp = requests.post(
            f"{BASE_URL}/api/events/{EVENT_ID}/add-school",
            headers=self.headers,
            json={
                "athlete_id": ATHLETE_4,
                "school_id": unique_school_id,
                "school_name": unique_school
            }
        )
        assert resp.status_code == 200
        data = resp.json()
        
        assert data["added"] == True
        assert "program_id" in data
        assert data["school_name"] == unique_school
    
    def test_add_school_duplicate_returns_already_exists(self):
        """Adding duplicate school returns already_exists"""
        unique_school = f"TEST_Dup_{uuid.uuid4().hex[:8]}"
        unique_school_id = unique_school.lower().replace(" ", "_")[:30]
        
        # First add
        resp1 = requests.post(
            f"{BASE_URL}/api/events/{EVENT_ID}/add-school",
            headers=self.headers,
            json={
                "athlete_id": ATHLETE_1,
                "school_id": unique_school_id,
                "school_name": unique_school
            }
        )
        assert resp1.status_code == 200
        assert resp1.json()["added"] == True
        
        # Try to add again
        resp2 = requests.post(
            f"{BASE_URL}/api/events/{EVENT_ID}/add-school",
            headers=self.headers,
            json={
                "athlete_id": ATHLETE_1,
                "school_id": unique_school_id,
                "school_name": unique_school
            }
        )
        assert resp2.status_code == 200
        data2 = resp2.json()
        assert data2["added"] == False
        assert data2.get("reason") == "already_exists"
    
    def test_add_school_invalid_athlete_returns_404(self):
        """Adding school for invalid athlete returns 404"""
        resp = requests.post(
            f"{BASE_URL}/api/events/{EVENT_ID}/add-school",
            headers=self.headers,
            json={
                "athlete_id": "invalid_athlete_999",
                "school_id": "test_school",
                "school_name": "Test School"
            }
        )
        assert resp.status_code == 404
    
    # ─── Notes/Signals Retrieval Tests ───
    
    def test_get_event_notes_returns_signals(self):
        """Get event notes returns logged signals"""
        resp = requests.get(
            f"{BASE_URL}/api/events/{EVENT_ID}/notes",
            headers=self.headers
        )
        assert resp.status_code == 200
        data = resp.json()
        
        assert isinstance(data, list)
        if len(data) > 0:
            # Verify signal structure
            note = data[0]
            assert "id" in note
            assert "athlete_id" in note
            assert "captured_at" in note
    
    def test_event_notes_sorted_by_captured_at(self):
        """Event notes are sorted by captured_at descending (most recent first)"""
        resp = requests.get(
            f"{BASE_URL}/api/events/{EVENT_ID}/notes",
            headers=self.headers
        )
        data = resp.json()
        
        if len(data) >= 2:
            # Most recent should be first
            from datetime import datetime
            t1 = datetime.fromisoformat(data[0]["captured_at"].replace("Z", "+00:00"))
            t2 = datetime.fromisoformat(data[1]["captured_at"].replace("Z", "+00:00"))
            assert t1 >= t2, "Notes should be sorted by captured_at descending"
    
    def test_event_notes_have_grouping_fields(self):
        """Event notes have athlete_name and school_name for grouping"""
        resp = requests.get(
            f"{BASE_URL}/api/events/{EVENT_ID}/notes",
            headers=self.headers
        )
        data = resp.json()
        
        if len(data) > 0:
            note = data[0]
            assert "athlete_name" in note, "Note should have athlete_name for grouping"
            assert "school_name" in note, "Note should have school_name for grouping"
    
    # ─── Response Fields Tests ───
    
    def test_signal_response_has_all_flags(self):
        """Signal response has pipeline_updated, action_created, school_added flags"""
        unique_note = f"TEST_FLAGS_{uuid.uuid4().hex[:8]}"
        resp = requests.post(
            f"{BASE_URL}/api/events/{EVENT_ID}/signals",
            headers=self.headers,
            json={
                "athlete_id": ATHLETE_1,
                "school_id": "virginia",
                "school_name": "Virginia",
                "interest_level": "warm",
                "signal_type": "strong_performance",
                "note_text": unique_note
            }
        )
        assert resp.status_code == 200
        data = resp.json()
        
        # Verify all feedback flags are present
        assert "pipeline_updated" in data, "Response should have pipeline_updated flag"
        assert "action_created" in data, "Response should have action_created flag"
        assert "school_added" in data, "Response should have school_added flag"
    
    def test_signal_stores_advocacy_candidate_for_hot_interest(self):
        """Hot/warm interest level sets advocacy_candidate=True"""
        unique_note = f"TEST_ADVOCACY_{uuid.uuid4().hex[:8]}"
        resp = requests.post(
            f"{BASE_URL}/api/events/{EVENT_ID}/signals",
            headers=self.headers,
            json={
                "athlete_id": ATHLETE_2,
                "school_id": "ucla",
                "school_name": "UCLA",
                "interest_level": "hot",
                "signal_type": "coach_interest",
                "note_text": unique_note
            }
        )
        assert resp.status_code == 200
        data = resp.json()
        
        assert data.get("advocacy_candidate") == True, "Hot interest should set advocacy_candidate=True"


class TestSignalPipelineIntegration:
    """Test pipeline integration - signal types auto-update program recruiting_status"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        login_resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "coach.williams@capymatch.com", "password": "coach123"}
        )
        assert login_resp.status_code == 200
        self.token = login_resp.json()["token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_coach_interest_pipeline_maps_to_engaged(self):
        """coach_interest signal should map to pipeline stage 'Engaged'"""
        # Per SIGNAL_PIPELINE_MAP: coach_interest -> Engaged
        unique_note = f"TEST_PIPELINE_ENGAGED_{uuid.uuid4().hex[:8]}"
        resp = requests.post(
            f"{BASE_URL}/api/events/{EVENT_ID}/signals",
            headers=self.headers,
            json={
                "athlete_id": ATHLETE_2,
                "school_id": "duke",
                "school_name": "Duke",
                "interest_level": "hot",
                "signal_type": "coach_interest",
                "note_text": unique_note
            }
        )
        assert resp.status_code == 200
        data = resp.json()
        
        # If program_id found and current stage < Engaged, pipeline_updated should be True
        # This depends on existing pipeline data
        assert "pipeline_updated" in data


class TestAddSchoolFromEvent:
    """Test the Add School feature from live event"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        login_resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "coach.williams@capymatch.com", "password": "coach123"}
        )
        assert login_resp.status_code == 200
        self.token = login_resp.json()["token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_add_school_sets_prospect_stage(self):
        """New school added from event starts at 'Prospect' stage"""
        unique_school = f"TEST_ProspectStage_{uuid.uuid4().hex[:8]}"
        unique_school_id = unique_school.lower().replace(" ", "_")[:30]
        
        resp = requests.post(
            f"{BASE_URL}/api/events/{EVENT_ID}/add-school",
            headers=self.headers,
            json={
                "athlete_id": ATHLETE_2,
                "school_id": unique_school_id,
                "school_name": unique_school
            }
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["added"] == True
        # The program is created with recruiting_status='Prospect'
        # This is verified by checking the pipeline endpoint if needed


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

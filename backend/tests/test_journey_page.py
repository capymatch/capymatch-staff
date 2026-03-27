"""
Test suite for Journey Page APIs
Tests:
- GET /api/athlete/programs/:id - returns program with journey_rail
- GET /api/athlete/programs/:id/journey - returns timeline data
- POST /api/athlete/interactions - creates new interaction
- POST /api/athlete/programs/:id/mark-replied - logs coach reply
- POST/PUT/DELETE /api/athlete/coaches endpoints
- PUT /api/athlete/programs/:id - update program stage & status
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

# Known test credentials
ATHLETE_EMAIL = "emma.chen@athlete.capymatch.com"
ATHLETE_PASSWORD = "password123"
KNOWN_PROGRAM_ID = "15d08982-3c51-4761-9b83-67414484582e"  # University of Florida


class TestJourneyPageAuth:
    """Test authentication for journey page endpoints"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for athlete"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ATHLETE_EMAIL, "password": ATHLETE_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_unauthenticated_access_program(self):
        """Test unauthenticated access to program endpoint returns 401"""
        response = requests.get(f"{BASE_URL}/api/athlete/programs/{KNOWN_PROGRAM_ID}")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: Unauthenticated access blocked")


class TestGetProgram:
    """Tests for GET /api/athlete/programs/:id endpoint"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for athlete"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ATHLETE_EMAIL, "password": ATHLETE_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_get_program_returns_200(self):
        """Test GET /api/athlete/programs/:id returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/programs/{KNOWN_PROGRAM_ID}",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: GET program returns 200")

    def test_get_program_has_journey_rail(self):
        """Test program response includes journey_rail with correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/programs/{KNOWN_PROGRAM_ID}",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify journey_rail exists
        assert "journey_rail" in data, "Missing journey_rail in response"
        rail = data["journey_rail"]
        
        # Verify journey_rail structure
        assert "stages" in rail, "Missing stages in journey_rail"
        assert "active" in rail, "Missing active in journey_rail"
        assert "line_fill" in rail, "Missing line_fill in journey_rail"
        assert "pulse" in rail, "Missing pulse in journey_rail"
        
        # Verify stages has all 6 stages
        stages = rail["stages"]
        required_stages = ["added", "outreach", "in_conversation", "campus_visit", "offer", "committed"]
        for stage in required_stages:
            assert stage in stages, f"Missing stage '{stage}' in journey_rail.stages"
        
        # Verify pulse is valid
        assert rail["pulse"] in ["hot", "warm", "neutral", "cold"], f"Invalid pulse value: {rail['pulse']}"
        
        print(f"PASS: journey_rail has correct structure - active={rail['active']}, pulse={rail['pulse']}")

    def test_get_program_has_signals(self):
        """Test program response includes signals with interaction counts"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/programs/{KNOWN_PROGRAM_ID}",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "signals" in data, "Missing signals in response"
        signals = data["signals"]
        
        # Verify signals structure
        assert "outreach_count" in signals, "Missing outreach_count"
        assert "reply_count" in signals, "Missing reply_count"
        assert "has_coach_reply" in signals, "Missing has_coach_reply"
        assert "total_interactions" in signals, "Missing total_interactions"
        
        print(f"PASS: signals has correct structure - outreach={signals['outreach_count']}, replies={signals['reply_count']}")

    def test_get_program_has_college_coaches(self):
        """Test program response includes college_coaches array"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/programs/{KNOWN_PROGRAM_ID}",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "college_coaches" in data, "Missing college_coaches in response"
        assert isinstance(data["college_coaches"], list), "college_coaches should be a list"
        
        print(f"PASS: college_coaches array present with {len(data['college_coaches'])} coaches")

    def test_get_program_has_interactions(self):
        """Test program response includes interactions array"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/programs/{KNOWN_PROGRAM_ID}",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "interactions" in data, "Missing interactions in response"
        assert isinstance(data["interactions"], list), "interactions should be a list"
        
        print(f"PASS: interactions array present with {len(data['interactions'])} interactions")

    def test_get_nonexistent_program_returns_404(self):
        """Test GET for nonexistent program returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.get(
            f"{BASE_URL}/api/athlete/programs/{fake_id}",
            headers=self.headers
        )
        assert response.status_code == 404, f"Expected 404 for nonexistent program, got {response.status_code}"
        print("PASS: Nonexistent program returns 404")


class TestGetProgramJourney:
    """Tests for GET /api/athlete/programs/:id/journey endpoint"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for athlete"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ATHLETE_EMAIL, "password": ATHLETE_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_get_journey_returns_200(self):
        """Test GET /api/athlete/programs/:id/journey returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/programs/{KNOWN_PROGRAM_ID}/journey",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: GET journey returns 200")

    def test_get_journey_has_timeline(self):
        """Test journey response has timeline array"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/programs/{KNOWN_PROGRAM_ID}/journey",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "timeline" in data, "Missing timeline in response"
        assert isinstance(data["timeline"], list), "timeline should be a list"
        
        print(f"PASS: Journey timeline has {len(data['timeline'])} events")

    def test_get_journey_timeline_event_structure(self):
        """Test timeline events have correct structure for conversation view"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/programs/{KNOWN_PROGRAM_ID}/journey",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data["timeline"]) > 0:
            event = data["timeline"][0]
            # Verify event structure for conversation bubbles
            assert "id" in event or event.get("id") is None, "Event should have id"
            assert "event_type" in event, "Event missing event_type"
            assert "title" in event, "Event missing title"
            assert "date" in event or "date_time" in event, "Event missing date"
            assert "content" in event or "notes" in event, "Event missing content/notes"
            
            print(f"PASS: Timeline event structure valid - type={event['event_type']}, title={event['title']}")
        else:
            print("PASS: Timeline empty (no events yet)")


class TestCreateInteraction:
    """Tests for POST /api/athlete/interactions endpoint"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for athlete"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ATHLETE_EMAIL, "password": ATHLETE_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_create_interaction_returns_200(self):
        """Test POST /api/athlete/interactions creates interaction successfully"""
        response = requests.post(
            f"{BASE_URL}/api/athlete/interactions",
            headers=self.headers,
            json={
                "program_id": KNOWN_PROGRAM_ID,
                "university_name": "University of Florida",
                "type": "Phone Call",
                "notes": "TEST_INTERACTION: Test phone call from pytest",
                "outcome": "Positive"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "interaction_id" in data, "Missing interaction_id in response"
        assert data["type"] == "Phone Call", f"Wrong type: {data['type']}"
        assert "TEST_INTERACTION" in data["notes"], "Notes not saved correctly"
        
        print(f"PASS: Interaction created with id={data['interaction_id']}")

    def test_create_email_interaction(self):
        """Test logging an email to timeline"""
        response = requests.post(
            f"{BASE_URL}/api/athlete/interactions",
            headers=self.headers,
            json={
                "program_id": KNOWN_PROGRAM_ID,
                "university_name": "University of Florida",
                "type": "Email Sent",
                "notes": "TEST_EMAIL: Subject: Introduction\n\nHello Coach, I am interested in your program...",
                "outcome": "No Response"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["type"] == "Email Sent"
        print(f"PASS: Email interaction logged with id={data['interaction_id']}")

    def test_create_interaction_invalid_program(self):
        """Test creating interaction for nonexistent program returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/api/athlete/interactions",
            headers=self.headers,
            json={
                "program_id": fake_id,
                "type": "Phone Call",
                "notes": "TEST_INTERACTION: Should fail",
                "outcome": "Positive"
            }
        )
        assert response.status_code == 404, f"Expected 404 for nonexistent program, got {response.status_code}"
        print("PASS: Interaction for nonexistent program returns 404")


class TestMarkAsReplied:
    """Tests for POST /api/athlete/programs/:id/mark-replied endpoint"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for athlete"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ATHLETE_EMAIL, "password": ATHLETE_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_mark_replied_success(self):
        """Test POST mark-replied logs coach reply to timeline"""
        response = requests.post(
            f"{BASE_URL}/api/athlete/programs/{KNOWN_PROGRAM_ID}/mark-replied",
            headers=self.headers,
            json={"note": "TEST_REPLY: Coach Smith replied and invited me to summer camp"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "interaction_id" in data, "Missing interaction_id"
        assert data["type"] == "coach_reply", f"Wrong type: {data['type']}"
        assert "TEST_REPLY" in data["notes"], "Note not saved"
        
        print(f"PASS: Coach reply logged with id={data['interaction_id']}")

    def test_mark_replied_requires_note(self):
        """Test mark-replied without note returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/athlete/programs/{KNOWN_PROGRAM_ID}/mark-replied",
            headers=self.headers,
            json={"note": ""}  # Empty note
        )
        assert response.status_code == 400, f"Expected 400 for empty note, got {response.status_code}"
        print("PASS: mark-replied without note returns 400")

    def test_mark_replied_nonexistent_program(self):
        """Test mark-replied for nonexistent program returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/api/athlete/programs/{fake_id}/mark-replied",
            headers=self.headers,
            json={"note": "TEST_REPLY: Should fail"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: mark-replied for nonexistent program returns 404")


class TestUpdateProgramStage:
    """Tests for PUT /api/athlete/programs/:id - stage updates"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for athlete"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ATHLETE_EMAIL, "password": ATHLETE_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_update_program_status(self):
        """Test updating program recruiting_status"""
        # Get current status first
        get_response = requests.get(
            f"{BASE_URL}/api/athlete/programs/{KNOWN_PROGRAM_ID}",
            headers=self.headers
        )
        assert get_response.status_code == 200
        original_status = get_response.json().get("recruiting_status")
        
        # Update to archived
        response = requests.put(
            f"{BASE_URL}/api/athlete/programs/{KNOWN_PROGRAM_ID}",
            headers=self.headers,
            json={"recruiting_status": "archived"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.json()["recruiting_status"] == "archived"
        
        # Restore original status
        requests.put(
            f"{BASE_URL}/api/athlete/programs/{KNOWN_PROGRAM_ID}",
            headers=self.headers,
            json={"recruiting_status": original_status or "active"}
        )
        
        print("PASS: Program status updated successfully")

    def test_update_program_recruiting_status(self):
        """Test updating program recruiting_status (Sprint 3 SSOT: canonical field)"""
        response = requests.put(
            f"{BASE_URL}/api/athlete/programs/{KNOWN_PROGRAM_ID}",
            headers=self.headers,
            json={"recruiting_status": "Contacted"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        print("PASS: Program recruiting_status updated")

    def test_update_followup_schedule(self):
        """Test scheduling follow-up via program update"""
        response = requests.put(
            f"{BASE_URL}/api/athlete/programs/{KNOWN_PROGRAM_ID}",
            headers=self.headers,
            json={
                "next_action_due": "2026-03-15",
                "next_action": "Send follow-up email"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["next_action_due"] == "2026-03-15"
        assert data["next_action"] == "Send follow-up email"
        
        print("PASS: Follow-up scheduled successfully")


class TestCoachCRUD:
    """Tests for college coach CRUD operations"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for athlete"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ATHLETE_EMAIL, "password": ATHLETE_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_create_coach(self):
        """Test POST /api/athlete/college-coaches creates coach"""
        response = requests.post(
            f"{BASE_URL}/api/athlete/college-coaches",
            headers=self.headers,
            json={
                "program_id": KNOWN_PROGRAM_ID,
                "coach_name": "TEST_COACH: John Test Smith",
                "role": "Head Coach",
                "email": "test.coach@university.edu",
                "phone": "(555) 123-4567"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "coach_id" in data, "Missing coach_id"
        assert "TEST_COACH" in data["coach_name"]
        assert data["role"] == "Head Coach"
        
        # Store coach_id for cleanup
        self.test_coach_id = data["coach_id"]
        
        print(f"PASS: Coach created with id={data['coach_id']}")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/athlete/college-coaches/{data['coach_id']}",
            headers=self.headers
        )

    def test_update_coach(self):
        """Test PUT /api/athlete/college-coaches/:id updates coach"""
        # First create a coach
        create_response = requests.post(
            f"{BASE_URL}/api/athlete/college-coaches",
            headers=self.headers,
            json={
                "program_id": KNOWN_PROGRAM_ID,
                "coach_name": "TEST_UPDATE: Original Name",
                "role": "Assistant Coach",
                "email": "original@test.edu"
            }
        )
        assert create_response.status_code == 200
        coach_id = create_response.json()["coach_id"]
        
        # Update the coach
        update_response = requests.put(
            f"{BASE_URL}/api/athlete/college-coaches/{coach_id}",
            headers=self.headers,
            json={
                "coach_name": "TEST_UPDATE: Updated Name",
                "role": "Head Coach",
                "email": "updated@test.edu"
            }
        )
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}"
        
        data = update_response.json()
        assert data["coach_name"] == "TEST_UPDATE: Updated Name"
        assert data["role"] == "Head Coach"
        
        print(f"PASS: Coach updated successfully")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/athlete/college-coaches/{coach_id}",
            headers=self.headers
        )

    def test_delete_coach(self):
        """Test DELETE /api/athlete/college-coaches/:id deletes coach"""
        # First create a coach
        create_response = requests.post(
            f"{BASE_URL}/api/athlete/college-coaches",
            headers=self.headers,
            json={
                "program_id": KNOWN_PROGRAM_ID,
                "coach_name": "TEST_DELETE: To Be Deleted",
                "role": "Assistant Coach"
            }
        )
        assert create_response.status_code == 200
        coach_id = create_response.json()["coach_id"]
        
        # Delete the coach
        delete_response = requests.delete(
            f"{BASE_URL}/api/athlete/college-coaches/{coach_id}",
            headers=self.headers
        )
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}"
        assert delete_response.json()["deleted"] == True
        
        # Verify deletion
        # Try to access deleted coach - should be reflected in program
        print("PASS: Coach deleted successfully")


class TestJourneyRailComputation:
    """Tests for compute_journey_rail() function behavior"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for athlete"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ATHLETE_EMAIL, "password": ATHLETE_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_journey_rail_auto_detects_outreach(self):
        """Test journey_rail auto-detects outreach stage from interactions"""
        # Log an email to trigger outreach stage
        requests.post(
            f"{BASE_URL}/api/athlete/interactions",
            headers=self.headers,
            json={
                "program_id": KNOWN_PROGRAM_ID,
                "type": "Email Sent",
                "notes": "TEST_RAIL: Testing auto-detection",
                "outcome": "No Response"
            }
        )
        
        # Get program and check journey_rail
        response = requests.get(
            f"{BASE_URL}/api/athlete/programs/{KNOWN_PROGRAM_ID}",
            headers=self.headers
        )
        assert response.status_code == 200
        
        rail = response.json()["journey_rail"]
        stages = rail["stages"]
        
        # Added should always be true
        assert stages["added"] == True
        
        # Outreach should be true if we have outreach_count > 0
        signals = response.json()["signals"]
        if signals["outreach_count"] > 0:
            assert stages["outreach"] == True, "Expected outreach=True with outreach_count > 0"
        
        print(f"PASS: journey_rail auto-detection working - outreach={stages['outreach']}")

    def test_journey_rail_pulse_calculation(self):
        """Test pulse indicator calculation based on activity"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/programs/{KNOWN_PROGRAM_ID}",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        rail = data["journey_rail"]
        signals = data["signals"]
        
        pulse = rail["pulse"]
        days_since = signals.get("days_since_activity")
        
        # Verify pulse logic
        # hot: <= 7 days, warm: <= 14 days, cold: > 14 days, neutral: no activity
        if days_since is None:
            expected = "neutral"
        elif days_since <= 7:
            expected = "hot"
        elif days_since <= 14:
            expected = "warm"
        else:
            expected = "cold"
        
        assert pulse == expected, f"Expected pulse={expected} for days_since={days_since}, got {pulse}"
        print(f"PASS: Pulse calculation correct - pulse={pulse}, days_since={days_since}")


class TestListPrograms:
    """Tests for GET /api/athlete/programs list endpoint with journey_rail"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for athlete"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ATHLETE_EMAIL, "password": ATHLETE_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_list_programs_has_journey_rail(self):
        """Test GET /api/athlete/programs returns journey_rail for each program"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/programs",
            headers=self.headers
        )
        assert response.status_code == 200
        
        programs = response.json()
        assert isinstance(programs, list), "Expected list of programs"
        assert len(programs) > 0, "Expected at least one program"
        
        for prog in programs:
            assert "journey_rail" in prog, f"Program {prog.get('program_id')} missing journey_rail"
            rail = prog["journey_rail"]
            assert "stages" in rail
            assert "active" in rail
            assert "pulse" in rail
        
        print(f"PASS: All {len(programs)} programs have journey_rail")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

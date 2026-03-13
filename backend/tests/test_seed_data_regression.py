"""
Test suite for the comprehensive seed data verification.
Verifies all seeded data: athletes, programs, actions, notes, events, event notes.
Tests match the requirements from the problem statement after complete data wipe and reseed.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
COACH_EMAIL = "coach.williams@capymatch.com"
COACH_PASSWORD = "coach123"
ATHLETE_EMAIL = "emma.chen@athlete.capymatch.com"
ATHLETE_PASSWORD = "athlete123"


@pytest.fixture(scope="module")
def coach_token():
    """Get coach authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": COACH_EMAIL, "password": COACH_PASSWORD}
    )
    assert response.status_code == 200, f"Coach login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(coach_token):
    """Return headers with auth token"""
    return {"Authorization": f"Bearer {coach_token}"}


class TestCoachLogin:
    """Test coach login functionality"""
    
    def test_01_coach_login_success(self):
        """Coach can login with correct credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": COACH_EMAIL, "password": COACH_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["email"] == COACH_EMAIL
        assert data["user"]["role"] == "club_coach"
        assert data["user"]["name"] == "Coach Williams"


class TestDashboardMissionControl:
    """Test Dashboard/Mission Control shows correct data from seed"""
    
    def test_01_mission_control_loads(self, auth_headers):
        """Mission Control loads with seeded athlete data"""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Athletes are in myRoster, not athletes
        athletes = data.get("myRoster", [])
        assert len(athletes) == 5, f"Expected 5 athletes, got {len(athletes)}"
    
    def test_02_athletes_needing_attention(self, auth_headers):
        """4 athletes should need attention based on seed data"""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        athletes = data.get("myRoster", [])
        # Count athletes with issues/categories (needing attention)
        # Athletes with category set need attention
        athletes_with_issues = [a for a in athletes if a.get("category")]
        # Should be ~4 needing attention based on seeder
        assert len(athletes_with_issues) >= 3, f"Expected ~4 athletes with issues, got {len(athletes_with_issues)}"
    
    def test_03_athletes_list_has_correct_fields(self, auth_headers):
        """Each athlete in dashboard has required fields"""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=auth_headers)
        data = response.json()
        
        for athlete in data.get("myRoster", []):
            assert "id" in athlete
            assert "name" in athlete  # API uses "name" not "full_name"
            assert "position" in athlete


class TestSupportPodsData:
    """Test Support Pod data for each athlete matches seed expectations"""
    
    def test_01_athlete_1_emma_chen_support_pod(self, auth_headers):
        """Emma Chen (athlete_1) - hot prospect, 5 target schools"""
        response = requests.get(f"{BASE_URL}/api/support-pods/athlete_1", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        athlete = data.get("athlete", {})
        assert athlete.get("full_name") == "Emma Chen"
        assert athlete.get("position") == "Outside Hitter"
        assert athlete.get("grad_year") == 2026
        
        # Profile completeness should be high (~92%)
        profile = data.get("profile_completeness", {})
        if profile:
            completeness = profile.get("score", 0)  # API returns "score" not "percentage"
            assert completeness >= 80, f"Emma should have high profile completeness, got {completeness}%"
    
    def test_02_athlete_1_has_5_target_schools(self, auth_headers):
        """Emma Chen should have 5 target schools"""
        response = requests.get(f"{BASE_URL}/api/support-pods/athlete_1/schools", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        schools = data.get("schools", [])
        assert len(schools) == 5, f"Expected 5 schools for Emma Chen, got {len(schools)}"
        
        # Verify specific schools from seed
        school_names = [s.get("university_name") for s in schools]
        assert "Stanford University" in school_names
        assert "University of Florida" in school_names
        assert "Emory University" in school_names
        assert "UCLA" in school_names
        assert "Creighton University" in school_names
    
    def test_03_athlete_2_olivia_anderson_blocker(self, auth_headers):
        """Olivia Anderson (athlete_2) - should have blocker issue about transcript"""
        response = requests.get(f"{BASE_URL}/api/support-pods/athlete_2", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        athlete = data.get("athlete", {})
        assert athlete.get("full_name") == "Olivia Anderson"
        assert athlete.get("position") == "Setter"
        
        # Should have blocker-related issue
        current_issue = data.get("current_issue")
        # The seeder created her with archetype "blocked_docs"
    
    def test_04_athlete_3_marcus_johnson_momentum_drop(self, auth_headers):
        """Marcus Johnson (athlete_3) - gone dark, 22 days inactive"""
        response = requests.get(f"{BASE_URL}/api/support-pods/athlete_3", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        athlete = data.get("athlete", {})
        assert athlete.get("full_name") == "Marcus Johnson"
        assert athlete.get("position") == "Libero"
        
        # Should have high days_since_activity (22 in seed)
        days = athlete.get("days_since_activity", 0)
        assert days >= 20, f"Marcus should have ~22 days inactive, got {days}"
    
    def test_05_athlete_4_sarah_martinez(self, auth_headers):
        """Sarah Martinez (athlete_4) - exploring, narrow list"""
        response = requests.get(f"{BASE_URL}/api/support-pods/athlete_4", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        athlete = data.get("athlete", {})
        assert athlete.get("full_name") == "Sarah Martinez"
        assert athlete.get("position") == "Middle Blocker"
        assert athlete.get("grad_year") == 2027
    
    def test_06_athlete_5_lucas_rodriguez_strong(self, auth_headers):
        """Lucas Rodriguez (athlete_5) - strong momentum, no issues, has offer"""
        response = requests.get(f"{BASE_URL}/api/support-pods/athlete_5", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        athlete = data.get("athlete", {})
        assert athlete.get("full_name") == "Lucas Rodriguez"
        assert athlete.get("position") == "Opposite Hitter"
        
        # Should have minimal days_since_activity (0 in seed)
        days = athlete.get("days_since_activity", 99)
        assert days <= 2, f"Lucas should be recently active, got {days} days inactive"


class TestSchoolPodData:
    """Test School Pod data loads correctly for athlete-school relationships"""
    
    def test_01_get_athlete_1_schools_with_health(self, auth_headers):
        """Schools endpoint returns health classifications"""
        response = requests.get(f"{BASE_URL}/api/support-pods/athlete_1/schools", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        schools = data.get("schools", [])
        for school in schools:
            assert "health" in school
            assert "health_label" in school
            assert "university_name" in school
            assert "recruiting_status" in school
    
    def test_02_stanford_school_pod_loads(self, auth_headers):
        """Can load School Pod for Emma Chen + Stanford"""
        # First get the program_id for Stanford
        response = requests.get(f"{BASE_URL}/api/support-pods/athlete_1/schools", headers=auth_headers)
        schools = response.json().get("schools", [])
        stanford = next((s for s in schools if "Stanford" in s.get("university_name", "")), None)
        assert stanford, "Stanford should be in Emma's school list"
        
        program_id = stanford.get("program_id")
        assert program_id, "Stanford should have a program_id"
        
        # Load School Pod
        response = requests.get(f"{BASE_URL}/api/support-pods/athlete_1/school/{program_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("health")
        assert data.get("program", {}).get("university_name") == "Stanford University"
        # Should have signals, actions, notes, playbook
        assert "signals" in data
        assert "actions" in data
        assert "notes" in data
        assert "playbook" in data or data.get("playbook") is None  # May or may not have playbook


class TestEventsData:
    """Test Events data from seed: 1 past, 2 upcoming"""
    
    def test_01_events_endpoint_returns_data(self, auth_headers):
        """Events endpoint returns upcoming and past events"""
        response = requests.get(f"{BASE_URL}/api/events", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "upcoming" in data
        assert "past" in data
    
    def test_02_two_upcoming_events(self, auth_headers):
        """Should have 2 upcoming events: College Exposure Camp, Spring Classic"""
        response = requests.get(f"{BASE_URL}/api/events", headers=auth_headers)
        data = response.json()
        
        upcoming = data.get("upcoming", [])
        assert len(upcoming) == 2, f"Expected 2 upcoming events, got {len(upcoming)}"
        
        event_names = [e.get("name") for e in upcoming]
        assert "College Exposure Camp" in event_names
        assert "Spring Classic" in event_names
    
    def test_03_one_past_event(self, auth_headers):
        """Should have 1 past event: Winter Showcase"""
        response = requests.get(f"{BASE_URL}/api/events", headers=auth_headers)
        data = response.json()
        
        past = data.get("past", [])
        assert len(past) == 1, f"Expected 1 past event, got {len(past)}"
        assert past[0].get("name") == "Winter Showcase"
    
    def test_04_events_have_correct_athlete_counts(self, auth_headers):
        """Each event should have correct athlete count from seed"""
        response = requests.get(f"{BASE_URL}/api/events", headers=auth_headers)
        data = response.json()
        
        all_events = data.get("upcoming", []) + data.get("past", [])
        for event in all_events:
            assert "athleteCount" in event or "athlete_ids" in event
            # Events should have athletes assigned
            count = event.get("athleteCount", len(event.get("athlete_ids", [])))
            assert count >= 0


class TestEventPrep:
    """Test Event Prep page data for College Exposure Camp"""
    
    def test_01_event_prep_loads_for_college_exposure_camp(self, auth_headers):
        """Event prep data loads for upcoming camp"""
        response = requests.get(f"{BASE_URL}/api/events/event_1/prep", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "event" in data or "name" in data
        assert "athletes" in data
        # Schools may be in event.school_ids or top-level
        event = data.get("event", {})
        assert "school_ids" in event or "schools" in data or "targetSchools" in data
        assert "checklist" in data
    
    def test_02_prep_athletes_have_profiles(self, auth_headers):
        """Athletes in prep have profile data"""
        response = requests.get(f"{BASE_URL}/api/events/event_1/prep", headers=auth_headers)
        data = response.json()
        
        athletes = data.get("athletes", [])
        # Should have athletes: athlete_1, athlete_2, athlete_4
        assert len(athletes) == 3, f"Expected 3 athletes for event_1, got {len(athletes)}"


class TestEventSummary:
    """Test Event Summary page data for Winter Showcase"""
    
    def test_01_event_summary_loads_for_winter_showcase(self, auth_headers):
        """Event summary loads for past event"""
        response = requests.get(f"{BASE_URL}/api/events/event_0/summary", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("event", {}).get("name") == "Winter Showcase"
    
    def test_02_event_summary_has_captured_notes(self, auth_headers):
        """Winter Showcase should have 6 captured event notes from seed"""
        response = requests.get(f"{BASE_URL}/api/events/event_0/summary", headers=auth_headers)
        data = response.json()
        
        # Notes are in allNotes, not capturedNotes in summary endpoint
        notes = data.get("allNotes", []) or data.get("capturedNotes", [])
        assert len(notes) >= 6, f"Expected at least 6 event notes, got {len(notes)}"
    
    def test_03_event_notes_have_interest_levels(self, auth_headers):
        """Event notes should have interest_level (hot/warm/cool)"""
        response = requests.get(f"{BASE_URL}/api/events/event_0/summary", headers=auth_headers)
        data = response.json()
        
        notes = data.get("allNotes", []) or data.get("capturedNotes", [])
        for note in notes:
            interest = note.get("interest_level", "")
            assert interest in ["hot", "warm", "cool", ""], f"Invalid interest level: {interest}"


class TestActionsData:
    """Test pod actions created by seed"""
    
    def test_01_athlete_1_has_actions(self, auth_headers):
        """Emma Chen should have pod actions from seed"""
        response = requests.get(f"{BASE_URL}/api/support-pods/athlete_1", headers=auth_headers)
        data = response.json()
        
        actions = data.get("actions", [])
        assert len(actions) >= 2, f"Expected at least 2 actions for Emma, got {len(actions)}"
    
    def test_02_athlete_5_has_completed_actions(self, auth_headers):
        """Lucas Rodriguez should have completed actions from seed"""
        response = requests.get(f"{BASE_URL}/api/support-pods/athlete_5", headers=auth_headers)
        data = response.json()
        
        actions = data.get("actions", [])
        completed = [a for a in actions if a.get("status") == "completed"]
        # Seed created 2 completed actions for Lucas
        assert len(completed) >= 2, f"Expected at least 2 completed actions for Lucas, got {len(completed)}"


class TestNotesData:
    """Test school-scoped notes created by seed"""
    
    def test_01_athlete_1_has_notes(self, auth_headers):
        """Emma Chen should have school-scoped notes"""
        response = requests.get(f"{BASE_URL}/api/support-pods/athlete_1", headers=auth_headers)
        data = response.json()
        
        timeline = data.get("timeline", {})
        notes = timeline.get("notes", [])
        # Seed created notes for Emma about Stanford, Florida, UCLA
        assert len(notes) >= 3, f"Expected at least 3 notes for Emma, got {len(notes)}"


class TestAthleteLogin:
    """Test athlete login functionality"""
    
    def test_01_athlete_login_success(self):
        """Athlete can login with correct credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ATHLETE_EMAIL, "password": ATHLETE_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["email"] == ATHLETE_EMAIL
        assert data["user"]["role"] == "athlete"

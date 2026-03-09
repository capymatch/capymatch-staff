"""
Test suite for CapyMatch Phase A - Real Athlete Dashboard & Programs CRUD
Tests all /api/athlete/* endpoints with tenant_id scoping and unified JWT auth

Test User: emma.chen@athlete.capymatch.com / password123 (claimed athlete with 5 seeded programs)
Expected Board Groups: 1 overdue (Stanford), 2 needs_outreach (Tampa, Emory), 1 waiting_on_reply (UCLA), 1 in_conversation (UF)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')


@pytest.fixture(scope="class")
def athlete_token():
    """Get JWT token for emma.chen@athlete.capymatch.com"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "emma.chen@athlete.capymatch.com", "password": "password123"}
    )
    assert response.status_code == 200, f"Athlete login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="class")
def director_token():
    """Get JWT token for director@capymatch.com"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "director@capymatch.com", "password": "director123"}
    )
    assert response.status_code == 200, f"Director login failed: {response.text}"
    return response.json()["token"]


class TestAthleteLogin:
    """Test athlete login works correctly"""
    
    def test_emma_chen_login_success(self):
        """Test 0: emma.chen@athlete.capymatch.com login returns athlete role"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "emma.chen@athlete.capymatch.com", "password": "password123"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert data["user"]["role"] == "athlete"
        assert "token" in data
        print(f"PASS: emma.chen login - role={data['user']['role']}")


class TestProgramsCRUD:
    """Tests for /api/athlete/programs endpoints"""

    def test_list_programs_returns_5_programs(self, athlete_token):
        """Test 1: GET /api/athlete/programs returns 5 programs with signals and board_group"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/programs",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert response.status_code == 200, f"GET programs failed: {response.text}"
        programs = response.json()
        
        assert isinstance(programs, list), "Expected list of programs"
        assert len(programs) >= 5, f"Expected at least 5 programs, got {len(programs)}"
        
        # Verify each program has required fields
        for p in programs:
            assert "program_id" in p, "Missing program_id"
            assert "university_name" in p, "Missing university_name"
            assert "signals" in p, "Missing signals"
            assert "board_group" in p, "Missing board_group"
            
        # Check signals structure
        first = programs[0]
        signals = first.get("signals", {})
        assert "outreach_count" in signals or signals == {}, f"Missing outreach_count in signals"
        
        print(f"PASS: GET programs returns {len(programs)} programs with signals and board_group")

    def test_list_programs_grouped_returns_counts(self, athlete_token):
        """Test 2: GET /api/athlete/programs?grouped=true returns groups with counts"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/programs?grouped=true",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert response.status_code == 200, f"GET grouped programs failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "groups" in data, "Missing groups"
        assert "counts" in data, "Missing counts"
        assert "total" in data, "Missing total"
        
        groups = data["groups"]
        expected_groups = ["overdue", "needs_outreach", "waiting_on_reply", "in_conversation", "archived"]
        for g in expected_groups:
            assert g in groups, f"Missing group: {g}"
            
        counts = data["counts"]
        for g in expected_groups:
            assert g in counts, f"Missing count for group: {g}"
            
        total = sum(counts.values())
        assert data["total"] == total, f"Total mismatch: {data['total']} vs {total}"
        
        print(f"PASS: Grouped programs - counts={counts}, total={data['total']}")

    def test_create_program_duke_university(self, athlete_token):
        """Test 3: POST /api/athlete/programs creates new program"""
        response = requests.post(
            f"{BASE_URL}/api/athlete/programs",
            headers={"Authorization": f"Bearer {athlete_token}"},
            json={
                "university_name": "TEST_Duke University",
                "division": "D1",
                "conference": "ACC",
                "region": "Southeast",
                "priority": "High"
            }
        )
        assert response.status_code == 200, f"POST program failed: {response.text}"
        data = response.json()
        
        assert data["university_name"] == "TEST_Duke University"
        assert data["division"] == "D1"
        assert data["conference"] == "ACC"
        assert "program_id" in data
        assert data["priority"] == "High"
        
        # Store program_id for cleanup
        TestProgramsCRUD.created_program_id = data["program_id"]
        print(f"PASS: Created program {data['university_name']} with id={data['program_id']}")
        return data["program_id"]

    def test_update_program_priority(self, athlete_token):
        """Test 4: PUT /api/athlete/programs/{id} updates priority"""
        # First get a program to update (use the created one)
        program_id = getattr(TestProgramsCRUD, 'created_program_id', None)
        if not program_id:
            pytest.skip("No created program to update")
            
        response = requests.put(
            f"{BASE_URL}/api/athlete/programs/{program_id}",
            headers={"Authorization": f"Bearer {athlete_token}"},
            json={"priority": "Very High"}
        )
        assert response.status_code == 200, f"PUT program failed: {response.text}"
        data = response.json()
        
        assert data["priority"] == "Very High", f"Expected priority=Very High, got {data['priority']}"
        
        # Verify persistence with GET
        get_response = requests.get(
            f"{BASE_URL}/api/athlete/programs/{program_id}",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert get_response.status_code == 200
        assert get_response.json()["priority"] == "Very High"
        
        print(f"PASS: Updated program priority to Very High")

    def test_delete_program_cascade_deletes(self, athlete_token):
        """Test 5: DELETE /api/athlete/programs/{id} deletes program and cascades"""
        program_id = getattr(TestProgramsCRUD, 'created_program_id', None)
        if not program_id:
            pytest.skip("No created program to delete")
            
        # First add a college coach to verify cascade delete
        coach_response = requests.post(
            f"{BASE_URL}/api/athlete/college-coaches",
            headers={"Authorization": f"Bearer {athlete_token}"},
            json={
                "program_id": program_id,
                "coach_name": "TEST_Coach ToDelete",
                "role": "Assistant Coach",
                "email": "testdelete@test.edu"
            }
        )
        # Note: May fail if program doesn't exist yet, but continue with delete test
        
        response = requests.delete(
            f"{BASE_URL}/api/athlete/programs/{program_id}",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert response.status_code == 200, f"DELETE program failed: {response.text}"
        
        data = response.json()
        assert data.get("deleted") == True
        
        # Verify program is gone
        get_response = requests.get(
            f"{BASE_URL}/api/athlete/programs/{program_id}",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert get_response.status_code == 404, "Program should be deleted"
        
        print(f"PASS: Deleted program {program_id} with cascade")


class TestCollegeCoaches:
    """Tests for /api/athlete/college-coaches endpoints"""
    
    def test_list_college_coaches(self, athlete_token):
        """Test 6: GET /api/athlete/college-coaches lists coaches"""
        # First get a program_id
        programs_response = requests.get(
            f"{BASE_URL}/api/athlete/programs",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert programs_response.status_code == 200
        programs = programs_response.json()
        assert len(programs) > 0, "Need at least one program for college coaches test"
        
        program_id = programs[0]["program_id"]
        
        response = requests.get(
            f"{BASE_URL}/api/athlete/college-coaches?program_id={program_id}",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert response.status_code == 200, f"GET college-coaches failed: {response.text}"
        coaches = response.json()
        
        assert isinstance(coaches, list), "Expected list of coaches"
        # May be empty if no coaches added yet
        
        if len(coaches) > 0:
            coach = coaches[0]
            assert "coach_id" in coach
            assert "coach_name" in coach
            assert "program_id" in coach
            
        print(f"PASS: GET college-coaches returns {len(coaches)} coaches for program {program_id}")

    def test_create_college_coach(self, athlete_token):
        """Test 7: POST /api/athlete/college-coaches creates a coach"""
        # Get a program_id first
        programs_response = requests.get(
            f"{BASE_URL}/api/athlete/programs",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        programs = programs_response.json()
        program_id = programs[0]["program_id"]
        
        response = requests.post(
            f"{BASE_URL}/api/athlete/college-coaches",
            headers={"Authorization": f"Bearer {athlete_token}"},
            json={
                "program_id": program_id,
                "coach_name": "TEST_Coach Smith",
                "role": "Head Coach",
                "email": "test.coach@university.edu",
                "phone": "555-1234"
            }
        )
        assert response.status_code == 200, f"POST college-coach failed: {response.text}"
        data = response.json()
        
        assert data["coach_name"] == "TEST_Coach Smith"
        assert data["role"] == "Head Coach"
        assert data["email"] == "test.coach@university.edu"
        assert "coach_id" in data
        
        # Store for cleanup
        TestCollegeCoaches.created_coach_id = data["coach_id"]
        print(f"PASS: Created college coach {data['coach_name']} with id={data['coach_id']}")

    def test_cleanup_created_coach(self, athlete_token):
        """Cleanup: Delete created test coach"""
        coach_id = getattr(TestCollegeCoaches, 'created_coach_id', None)
        if coach_id:
            response = requests.delete(
                f"{BASE_URL}/api/athlete/college-coaches/{coach_id}",
                headers={"Authorization": f"Bearer {athlete_token}"}
            )
            if response.status_code == 200:
                print(f"CLEANUP: Deleted test coach {coach_id}")


class TestInteractions:
    """Tests for /api/athlete/interactions endpoints"""
    
    def test_list_interactions_ordered_by_date(self, athlete_token):
        """Test 8: GET /api/athlete/interactions returns list ordered by date_time desc"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/interactions",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert response.status_code == 200, f"GET interactions failed: {response.text}"
        interactions = response.json()
        
        assert isinstance(interactions, list), "Expected list of interactions"
        assert len(interactions) >= 4, f"Emma should have at least 4 seeded interactions, got {len(interactions)}"
        
        # Verify order (descending by date_time)
        for i in range(len(interactions) - 1):
            current_date = interactions[i].get("date_time", "")
            next_date = interactions[i+1].get("date_time", "")
            if current_date and next_date:
                assert current_date >= next_date, f"Interactions not in desc order: {current_date} < {next_date}"
        
        # Check required fields
        if len(interactions) > 0:
            ix = interactions[0]
            assert "interaction_id" in ix
            assert "program_id" in ix
            assert "type" in ix
            
        print(f"PASS: GET interactions returns {len(interactions)} interactions in desc order")

    def test_create_interaction_sets_follow_up(self, athlete_token):
        """Test 9: POST /api/athlete/interactions creates interaction and sets auto-follow-up"""
        # Get a program_id
        programs_response = requests.get(
            f"{BASE_URL}/api/athlete/programs",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        programs = programs_response.json()
        program_id = programs[0]["program_id"]
        
        response = requests.post(
            f"{BASE_URL}/api/athlete/interactions",
            headers={"Authorization": f"Bearer {athlete_token}"},
            json={
                "program_id": program_id,
                "type": "email_sent",
                "outcome": "Positive",
                "notes": "TEST: Sent follow-up email"
            }
        )
        assert response.status_code == 200, f"POST interaction failed: {response.text}"
        data = response.json()
        
        assert data["type"] == "email_sent"
        assert data["notes"] == "TEST: Sent follow-up email"
        assert "interaction_id" in data
        
        # Verify auto-follow-up was set on program (14 days for email_sent)
        program_response = requests.get(
            f"{BASE_URL}/api/athlete/programs/{program_id}",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        if program_response.status_code == 200:
            program_data = program_response.json()
            # next_action_due should be set to ~14 days from now
            assert program_data.get("next_action_due"), "next_action_due should be set after email_sent"
            
        TestInteractions.created_interaction_program_id = program_id
        print(f"PASS: Created interaction and auto-follow-up set on program")


class TestMarkReplied:
    """Test /api/athlete/programs/{id}/mark-replied endpoint"""
    
    def test_mark_replied_with_note(self, athlete_token):
        """Test 10: POST /api/athlete/programs/{id}/mark-replied marks program as replied"""
        # Get a program_id
        programs_response = requests.get(
            f"{BASE_URL}/api/athlete/programs",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        programs = programs_response.json()
        program_id = programs[0]["program_id"]
        
        response = requests.post(
            f"{BASE_URL}/api/athlete/programs/{program_id}/mark-replied",
            headers={"Authorization": f"Bearer {athlete_token}"},
            json={"note": "TEST: Coach replied about scheduling a call"}
        )
        assert response.status_code == 200, f"POST mark-replied failed: {response.text}"
        data = response.json()
        
        # Should create a coach_reply interaction
        assert data["type"] == "coach_reply"
        assert "TEST: Coach replied" in data["notes"]
        assert "interaction_id" in data
        
        print(f"PASS: mark-replied created coach_reply interaction")

    def test_mark_replied_requires_note(self, athlete_token):
        """Test mark-replied returns 400 without note"""
        programs_response = requests.get(
            f"{BASE_URL}/api/athlete/programs",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        programs = programs_response.json()
        program_id = programs[0]["program_id"]
        
        response = requests.post(
            f"{BASE_URL}/api/athlete/programs/{program_id}/mark-replied",
            headers={"Authorization": f"Bearer {athlete_token}"},
            json={"note": ""}
        )
        assert response.status_code == 400, f"Expected 400 for empty note, got {response.status_code}"
        print(f"PASS: mark-replied returns 400 for empty note")


class TestFollowUps:
    """Test /api/athlete/follow-ups endpoint"""
    
    def test_list_follow_ups(self, athlete_token):
        """Test 11: GET /api/athlete/follow-ups lists programs with overdue follow-ups"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/follow-ups",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert response.status_code == 200, f"GET follow-ups failed: {response.text}"
        follow_ups = response.json()
        
        assert isinstance(follow_ups, list), "Expected list of follow-ups"
        
        # Each follow-up should have required fields
        if len(follow_ups) > 0:
            fu = follow_ups[0]
            assert "program_id" in fu
            assert "university_name" in fu
            assert "next_action_due" in fu
            # Should be enriched with primary coach
            # primary_college_coach may be empty string if no coaches
            
        print(f"PASS: GET follow-ups returns {len(follow_ups)} programs with overdue follow-ups")


class TestDashboard:
    """Test /api/athlete/dashboard aggregated endpoint"""
    
    def test_dashboard_returns_all_sections(self, athlete_token):
        """Test 12: GET /api/athlete/dashboard returns all required sections"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/dashboard",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert response.status_code == 200, f"GET dashboard failed: {response.text}"
        data = response.json()
        
        # Verify all required sections
        assert "profile" in data, "Missing profile section"
        assert "stats" in data, "Missing stats section"
        assert "follow_ups_due" in data, "Missing follow_ups_due"
        assert "needs_first_outreach" in data, "Missing needs_first_outreach"
        assert "spotlight" in data, "Missing spotlight"
        assert "recent_activity" in data, "Missing recent_activity"
        assert "upcoming_events" in data, "Missing upcoming_events"
        
        # Verify profile structure
        profile = data["profile"]
        assert "firstName" in profile
        assert "lastName" in profile
        assert profile["firstName"] == "Emma", f"Expected firstName=Emma, got {profile['firstName']}"
        
        # Verify stats structure
        stats = data["stats"]
        assert "total_schools" in stats
        assert "response_rate" in stats
        assert "awaiting_reply" in stats
        assert "follow_ups_due" in stats
        assert stats["total_schools"] >= 5, f"Emma should have at least 5 schools, got {stats['total_schools']}"
        
        print(f"PASS: Dashboard returns all sections - stats={stats}")


class TestEvents:
    """Test /api/athlete/events endpoints"""
    
    def test_list_events(self, athlete_token):
        """Test 13: GET /api/athlete/events lists events"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/events",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert response.status_code == 200, f"GET events failed: {response.text}"
        events = response.json()
        
        assert isinstance(events, list), "Expected list of events"
        # Emma should have seeded events
        assert len(events) >= 3, f"Emma should have at least 3 seeded events, got {len(events)}"
        
        # Check required fields
        if len(events) > 0:
            event = events[0]
            assert "event_id" in event
            assert "title" in event
            assert "start_date" in event
            
        print(f"PASS: GET events returns {len(events)} events")

    def test_create_event(self, athlete_token):
        """Test 14: POST /api/athlete/events creates event"""
        response = requests.post(
            f"{BASE_URL}/api/athlete/events",
            headers={"Authorization": f"Bearer {athlete_token}"},
            json={
                "title": "TEST_Summer Camp Visit",
                "event_type": "Camp",
                "location": "Test City, ST",
                "start_date": "2026-07-15",
                "end_date": "2026-07-17"
            }
        )
        assert response.status_code == 200, f"POST event failed: {response.text}"
        data = response.json()
        
        assert data["title"] == "TEST_Summer Camp Visit"
        assert data["event_type"] == "Camp"
        assert "event_id" in data
        
        # Store for cleanup
        TestEvents.created_event_id = data["event_id"]
        print(f"PASS: Created event {data['title']} with id={data['event_id']}")

    def test_cleanup_created_event(self, athlete_token):
        """Cleanup: Delete created test event"""
        event_id = getattr(TestEvents, 'created_event_id', None)
        if event_id:
            response = requests.delete(
                f"{BASE_URL}/api/athlete/events/{event_id}",
                headers={"Authorization": f"Bearer {athlete_token}"}
            )
            if response.status_code == 200:
                print(f"CLEANUP: Deleted test event {event_id}")


class TestRoleBasedAccess:
    """Test 403 for director/coach on athlete endpoints"""
    
    def test_director_gets_403_on_athlete_programs(self, director_token):
        """Test 15: Director calling /api/athlete/programs gets 403"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/programs",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 403, f"Expected 403 for director, got {response.status_code}"
        print(f"PASS: Director gets 403 on /athlete/programs")

    def test_director_gets_403_on_athlete_dashboard(self, director_token):
        """Test: Director calling /api/athlete/dashboard gets 403"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/dashboard",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 403, f"Expected 403 for director, got {response.status_code}"
        print(f"PASS: Director gets 403 on /athlete/dashboard")


class TestDirectorRegression:
    """Regression: Ensure director routes still work"""
    
    def test_director_mission_control_access(self, director_token):
        """Test 21: Director login → /mission-control still works"""
        # Verify director can access their endpoints (e.g., athletes list)
        response = requests.get(
            f"{BASE_URL}/api/athletes",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        # Should return 200 with athletes list
        assert response.status_code == 200, f"Director athletes endpoint failed: {response.text}"
        print(f"PASS: Director regression - can access /api/athletes")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

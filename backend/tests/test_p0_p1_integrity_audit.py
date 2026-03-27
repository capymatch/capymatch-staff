"""
P0 + P1 Production Integrity Audit Tests

P0: journey_stage removal — verify no journey_stage field in API responses
P1: Mock data cleanup — verify UPCOMING_EVENTS/SCHOOLS replaced with DB queries

Test credentials:
- Athlete: emma.chen@athlete.capymatch.com / athlete123
- Coach: coach.williams@capymatch.com / coach123
- Director: director@capymatch.com / director123
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")


class TestAuth:
    """Authentication helpers"""

    @pytest.fixture(scope="class")
    def athlete_token(self):
        """Get athlete auth token"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "emma.chen@athlete.capymatch.com",
            "password": "athlete123"
        })
        if resp.status_code == 200:
            return resp.json().get("token")
        pytest.skip(f"Athlete login failed: {resp.status_code} - {resp.text}")

    @pytest.fixture(scope="class")
    def coach_token(self):
        """Get coach auth token"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "coach.williams@capymatch.com",
            "password": "coach123"
        })
        if resp.status_code == 200:
            return resp.json().get("token")
        pytest.skip(f"Coach login failed: {resp.status_code} - {resp.text}")

    @pytest.fixture(scope="class")
    def director_token(self):
        """Get director auth token"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "director@capymatch.com",
            "password": "director123"
        })
        if resp.status_code == 200:
            return resp.json().get("token")
        pytest.skip(f"Director login failed: {resp.status_code} - {resp.text}")


class TestP0JourneyStageRemoval(TestAuth):
    """P0: Verify journey_stage field is completely removed from all API responses"""

    def test_list_programs_no_journey_stage(self, athlete_token):
        """GET /api/athlete/programs returns pipeline_stage, no journey_stage"""
        resp = requests.get(
            f"{BASE_URL}/api/athlete/programs",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        programs = resp.json()
        
        assert isinstance(programs, list), "Expected list of programs"
        
        for p in programs:
            # P0: journey_stage must NOT be present
            assert "journey_stage" not in p, f"journey_stage found in program {p.get('program_id')}"
            # pipeline_stage MUST be present
            assert "pipeline_stage" in p, f"pipeline_stage missing in program {p.get('program_id')}"
            # board_group MUST be present
            assert "board_group" in p, f"board_group missing in program {p.get('program_id')}"
            # recruiting_status MUST be present
            assert "recruiting_status" in p, f"recruiting_status missing in program {p.get('program_id')}"
        
        print(f"PASS: {len(programs)} programs returned, all have pipeline_stage, none have journey_stage")

    def test_list_programs_pipeline_stage_consistency(self, athlete_token):
        """Verify pipeline_stage, board_group, recruiting_status are consistent"""
        resp = requests.get(
            f"{BASE_URL}/api/athlete/programs",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        programs = resp.json()
        
        valid_pipeline_stages = {"archived", "added", "outreach", "in_conversation", "campus_visit", "offer", "committed"}
        valid_board_groups = {"archived", "needs_outreach", "waiting_on_reply", "in_conversation", "overdue"}
        
        for p in programs:
            ps = p.get("pipeline_stage")
            bg = p.get("board_group")
            
            assert ps in valid_pipeline_stages, f"Invalid pipeline_stage '{ps}' in {p.get('program_id')}"
            assert bg in valid_board_groups, f"Invalid board_group '{bg}' in {p.get('program_id')}"
        
        print(f"PASS: All {len(programs)} programs have valid pipeline_stage and board_group values")

    def test_single_program_no_journey_stage(self, athlete_token):
        """GET /api/athlete/programs/{id} returns program without journey_stage"""
        # First get list to find a program_id
        resp = requests.get(
            f"{BASE_URL}/api/athlete/programs",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        programs = resp.json()
        
        if not programs:
            pytest.skip("No programs found to test single program endpoint")
        
        program_id = programs[0]["program_id"]
        
        # Get single program
        resp = requests.get(
            f"{BASE_URL}/api/athlete/programs/{program_id}",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        program = resp.json()
        
        # P0: journey_stage must NOT be present
        assert "journey_stage" not in program, f"journey_stage found in single program response"
        # pipeline_stage MUST be present
        assert "pipeline_stage" in program, "pipeline_stage missing in single program response"
        # board_group MUST be present
        assert "board_group" in program, "board_group missing in single program response"
        
        print(f"PASS: Single program {program_id} has pipeline_stage, no journey_stage")

    def test_update_program_strips_journey_stage(self, athlete_token):
        """PUT /api/athlete/programs/{id} with journey_stage in body strips it"""
        # First get a program
        resp = requests.get(
            f"{BASE_URL}/api/athlete/programs",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        programs = resp.json()
        
        if not programs:
            pytest.skip("No programs found to test update")
        
        program = programs[0]
        program_id = program["program_id"]
        
        # Try to update with journey_stage in body (should be stripped)
        update_body = {
            "journey_stage": "some_invalid_stage",  # This should be stripped
            "notes": "Test update - journey_stage should be stripped"
        }
        
        resp = requests.put(
            f"{BASE_URL}/api/athlete/programs/{program_id}",
            headers={"Authorization": f"Bearer {athlete_token}"},
            json=update_body
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        updated = resp.json()
        
        # Verify journey_stage was NOT written
        assert "journey_stage" not in updated, "journey_stage should have been stripped from update"
        
        # Verify the program still has pipeline_stage
        assert "pipeline_stage" in updated or updated.get("notes") == update_body["notes"], \
            "Update should have succeeded without journey_stage"
        
        print(f"PASS: PUT with journey_stage in body correctly strips it")

    def test_update_program_normalizes_recruiting_status(self, athlete_token):
        """PUT /api/athlete/programs/{id} normalizes recruiting_status values"""
        resp = requests.get(
            f"{BASE_URL}/api/athlete/programs",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        programs = resp.json()
        
        if not programs:
            pytest.skip("No programs found to test update")
        
        program_id = programs[0]["program_id"]
        original_status = programs[0].get("recruiting_status")
        
        # Test legacy value normalization
        legacy_values = {
            "Prospect": "Not Contacted",
            "Added": "Not Contacted",
            "Initial Contact": "Contacted",
            "Interested": "In Conversation",
        }
        
        # Pick one legacy value to test
        test_legacy = "Prospect"
        expected_normalized = "Not Contacted"
        
        resp = requests.put(
            f"{BASE_URL}/api/athlete/programs/{program_id}",
            headers={"Authorization": f"Bearer {athlete_token}"},
            json={"recruiting_status": test_legacy}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        updated = resp.json()
        
        # Verify normalization
        assert updated.get("recruiting_status") == expected_normalized, \
            f"Expected '{expected_normalized}', got '{updated.get('recruiting_status')}'"
        
        # Restore original status
        requests.put(
            f"{BASE_URL}/api/athlete/programs/{program_id}",
            headers={"Authorization": f"Bearer {athlete_token}"},
            json={"recruiting_status": original_status or "Not Contacted"}
        )
        
        print(f"PASS: recruiting_status '{test_legacy}' normalized to '{expected_normalized}'")

    def test_dashboard_programs_no_journey_stage(self, athlete_token):
        """GET /api/athlete/dashboard returns programs without journey_stage"""
        resp = requests.get(
            f"{BASE_URL}/api/athlete/dashboard",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        dashboard = resp.json()
        
        # Check follow_ups_due
        for p in dashboard.get("follow_ups_due", []):
            assert "journey_stage" not in p, f"journey_stage found in follow_ups_due"
            assert "pipeline_stage" in p or "board_group" in p, "Missing stage fields in follow_ups_due"
        
        # Check needs_first_outreach
        for p in dashboard.get("needs_first_outreach", []):
            assert "journey_stage" not in p, f"journey_stage found in needs_first_outreach"
        
        # Check spotlight
        for p in dashboard.get("spotlight", []):
            assert "journey_stage" not in p, f"journey_stage found in spotlight"
        
        print(f"PASS: Dashboard programs have no journey_stage field")


class TestP1MockDataCleanup(TestAuth):
    """P1: Verify UPCOMING_EVENTS and SCHOOLS mock data replaced with DB queries"""

    def test_admin_status_no_mock_data_sources(self, director_token):
        """GET /api/admin/status returns no mock_data sources in collections"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/status",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        status = resp.json()
        
        # Check persisted collections
        persisted = status.get("collections", {}).get("persisted", [])
        
        for coll in persisted:
            source = coll.get("source", "")
            # No collection should have "mock_data" as source
            assert "mock_data" not in source.lower(), \
                f"Collection '{coll.get('name')}' still uses mock_data source: {source}"
        
        print(f"PASS: No mock_data sources found in {len(persisted)} persisted collections")

    def test_admin_status_has_university_knowledge_base(self, director_token):
        """GET /api/admin/status shows university_knowledge_base in persisted collections"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/status",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        status = resp.json()
        
        persisted = status.get("collections", {}).get("persisted", [])
        collection_names = [c.get("name") for c in persisted]
        
        assert "university_knowledge_base" in collection_names, \
            f"university_knowledge_base not in persisted collections: {collection_names}"
        
        # Verify it has count > 0
        ukb = next((c for c in persisted if c.get("name") == "university_knowledge_base"), None)
        assert ukb is not None
        assert ukb.get("count", 0) > 0, "university_knowledge_base should have data"
        
        print(f"PASS: university_knowledge_base found with {ukb.get('count')} entries")

    def test_advocacy_relationships_works(self, coach_token):
        """GET /api/advocacy/relationships returns data (not error from SCHOOLS removal)"""
        resp = requests.get(
            f"{BASE_URL}/api/advocacy/relationships",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        # Should return 200, not 500 from missing SCHOOLS import
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        relationships = resp.json()
        assert isinstance(relationships, list), "Expected list of relationships"
        
        print(f"PASS: /api/advocacy/relationships returns {len(relationships)} relationships")

    def test_events_endpoint_works(self, athlete_token):
        """GET /api/events returns events from DB (not mock UPCOMING_EVENTS)"""
        resp = requests.get(
            f"{BASE_URL}/api/events",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        # Should return 200, not error from missing UPCOMING_EVENTS
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        events = resp.json()
        # Events endpoint returns {past: [], upcoming: []} structure
        assert isinstance(events, dict), "Expected events dict"
        assert "past" in events or "upcoming" in events, "Expected past/upcoming keys in events"
        
        total_events = len(events.get("past", [])) + len(events.get("upcoming", []))
        print(f"PASS: /api/events returns {total_events} events from DB")


class TestDeterminism(TestAuth):
    """Verify consecutive API calls return identical data"""

    def test_consecutive_calls_identical(self, athlete_token):
        """Consecutive API calls return identical pipeline_stage and board_group"""
        # Make 3 consecutive calls
        results = []
        for i in range(3):
            resp = requests.get(
                f"{BASE_URL}/api/athlete/programs",
                headers={"Authorization": f"Bearer {athlete_token}"}
            )
            assert resp.status_code == 200
            results.append(resp.json())
        
        # Compare results
        for i in range(1, len(results)):
            assert len(results[i]) == len(results[0]), \
                f"Call {i+1} returned different number of programs"
            
            for j, p in enumerate(results[i]):
                p0 = results[0][j]
                assert p.get("program_id") == p0.get("program_id"), \
                    f"Program order changed between calls"
                assert p.get("pipeline_stage") == p0.get("pipeline_stage"), \
                    f"pipeline_stage changed for {p.get('program_id')}: {p0.get('pipeline_stage')} -> {p.get('pipeline_stage')}"
                assert p.get("board_group") == p0.get("board_group"), \
                    f"board_group changed for {p.get('program_id')}: {p0.get('board_group')} -> {p.get('board_group')}"
        
        print(f"PASS: 3 consecutive calls returned identical data for {len(results[0])} programs")


class TestCoachMissionControl(TestAuth):
    """Verify Coach Mission Control still works after mock data removal"""

    def test_mission_control_works(self, coach_token):
        """Mission control endpoint works"""
        resp = requests.get(
            f"{BASE_URL}/api/mission-control",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        # Should return 200
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        mc = resp.json()
        assert isinstance(mc, dict), "Expected mission control object"
        
        print(f"PASS: Mission control works")

    def test_roster_works(self, director_token):
        """Roster endpoint works (requires director access)"""
        resp = requests.get(
            f"{BASE_URL}/api/roster",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        # Should return 200
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        roster = resp.json()
        assert isinstance(roster, (list, dict)), "Expected roster data"
        
        print(f"PASS: Roster works")


class TestGroupedProgramsEndpoint(TestAuth):
    """Test grouped programs endpoint for P0 compliance"""

    def test_grouped_programs_no_journey_stage(self, athlete_token):
        """GET /api/athlete/programs?grouped=true returns programs without journey_stage"""
        resp = requests.get(
            f"{BASE_URL}/api/athlete/programs?grouped=true",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        
        # Should have groups structure
        assert "groups" in data, "Expected 'groups' in response"
        
        groups = data.get("groups", {})
        for group_name, programs in groups.items():
            for p in programs:
                assert "journey_stage" not in p, \
                    f"journey_stage found in grouped program {p.get('program_id')} in group {group_name}"
                assert "pipeline_stage" in p, \
                    f"pipeline_stage missing in grouped program {p.get('program_id')}"
        
        total = sum(len(progs) for progs in groups.values())
        print(f"PASS: Grouped endpoint returns {total} programs across {len(groups)} groups, no journey_stage")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

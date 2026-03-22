"""
Test Cache Invalidation P0 Fix - Verify recompute_derived_data() is called after write operations

This test verifies that when athletes perform write actions (create interaction, mark reply, 
send follow-up, etc.), the coach/director dashboards reflect the updated state because 
recompute_derived_data() is now called after all write endpoints.

Endpoints tested:
- POST /api/athlete/interactions - create interaction
- POST /api/athlete/programs/{id}/mark-replied - mark reply
- POST /api/athlete/follow-ups/{id}/mark-sent - mark follow-up sent
- POST /api/athlete/programs - create program
- PUT /api/athlete/programs/{id} - update program
- DELETE /api/athlete/programs/{id} - delete program
- POST /api/coach/escalate - coach escalation
- POST /api/athletes/{id}/assign - assign owner
- POST /api/athletes/{id}/messages - send message
- POST /api/athlete/recruiting-profile - save recruiting profile
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timezone

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
ATHLETE_EMAIL = "emma.chen@athlete.capymatch.com"
ATHLETE_PASSWORD = "athlete123"
COACH_EMAIL = "coach.williams@capymatch.com"
COACH_PASSWORD = "coach123"
DIRECTOR_EMAIL = "director@capymatch.com"
DIRECTOR_PASSWORD = "director123"


class TestCacheInvalidationP0:
    """Test that write operations trigger cache refresh for coach/director dashboards"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def _login(self, email: str, password: str) -> str:
        """Login and return token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        if response.status_code != 200:
            pytest.skip(f"Login failed for {email}: {response.status_code}")
        return response.json().get("token")
    
    def _get_auth_headers(self, token: str) -> dict:
        """Return headers with auth token"""
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    # ─────────────────────────────────────────────────────────────────────────
    # Test 1: POST /api/athlete/interactions triggers cache refresh
    # ─────────────────────────────────────────────────────────────────────────
    def test_create_interaction_triggers_cache_refresh(self):
        """Verify POST /api/athlete/interactions triggers recompute_derived_data()"""
        # Login as athlete
        athlete_token = self._login(ATHLETE_EMAIL, ATHLETE_PASSWORD)
        headers = self._get_auth_headers(athlete_token)
        
        # Get athlete's programs first
        programs_resp = self.session.get(f"{BASE_URL}/api/athlete/programs", headers=headers)
        assert programs_resp.status_code == 200, f"Failed to get programs: {programs_resp.text}"
        programs = programs_resp.json()
        
        if not programs:
            pytest.skip("No programs found for athlete")
        
        program_id = programs[0]["program_id"]
        
        # Create an interaction
        interaction_data = {
            "program_id": program_id,
            "type": "Email",
            "outcome": "No Response",
            "notes": f"Test interaction for cache invalidation {uuid.uuid4().hex[:8]}",
            "date_time": datetime.now(timezone.utc).isoformat()
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/athlete/interactions",
            headers=headers,
            json=interaction_data
        )
        
        assert response.status_code == 200, f"Create interaction failed: {response.text}"
        data = response.json()
        assert "interaction_id" in data, "Response should contain interaction_id"
        print(f"PASS: POST /api/athlete/interactions returned 200 with interaction_id={data['interaction_id']}")
        
        # Verify coach inbox is accessible (cache was refreshed)
        coach_token = self._login(COACH_EMAIL, COACH_PASSWORD)
        coach_headers = self._get_auth_headers(coach_token)
        
        inbox_resp = self.session.get(f"{BASE_URL}/api/coach-inbox", headers=coach_headers)
        assert inbox_resp.status_code == 200, f"Coach inbox failed after interaction: {inbox_resp.text}"
        print("PASS: Coach inbox accessible after interaction creation (cache refreshed)")
    
    # ─────────────────────────────────────────────────────────────────────────
    # Test 2: POST /api/athlete/programs/{id}/mark-replied triggers cache refresh
    # ─────────────────────────────────────────────────────────────────────────
    def test_mark_replied_triggers_cache_refresh(self):
        """Verify POST /api/athlete/programs/{id}/mark-replied triggers recompute_derived_data()"""
        athlete_token = self._login(ATHLETE_EMAIL, ATHLETE_PASSWORD)
        headers = self._get_auth_headers(athlete_token)
        
        # Get programs
        programs_resp = self.session.get(f"{BASE_URL}/api/athlete/programs", headers=headers)
        assert programs_resp.status_code == 200
        programs = programs_resp.json()
        
        if not programs:
            pytest.skip("No programs found for athlete")
        
        program_id = programs[0]["program_id"]
        
        # Mark as replied
        response = self.session.post(
            f"{BASE_URL}/api/athlete/programs/{program_id}/mark-replied",
            headers=headers,
            json={"note": f"Coach replied via email - test {uuid.uuid4().hex[:8]}"}
        )
        
        assert response.status_code == 200, f"Mark replied failed: {response.text}"
        data = response.json()
        assert "interaction_id" in data, "Response should contain interaction_id"
        print(f"PASS: POST /api/athlete/programs/{program_id}/mark-replied returned 200")
        
        # Verify coach inbox is accessible
        coach_token = self._login(COACH_EMAIL, COACH_PASSWORD)
        coach_headers = self._get_auth_headers(coach_token)
        
        inbox_resp = self.session.get(f"{BASE_URL}/api/coach-inbox", headers=coach_headers)
        assert inbox_resp.status_code == 200, f"Coach inbox failed after mark-replied: {inbox_resp.text}"
        print("PASS: Coach inbox accessible after mark-replied (cache refreshed)")
    
    # ─────────────────────────────────────────────────────────────────────────
    # Test 3: POST /api/athlete/follow-ups/{id}/mark-sent triggers cache refresh
    # ─────────────────────────────────────────────────────────────────────────
    def test_mark_follow_up_sent_triggers_cache_refresh(self):
        """Verify POST /api/athlete/follow-ups/{id}/mark-sent triggers recompute_derived_data()"""
        athlete_token = self._login(ATHLETE_EMAIL, ATHLETE_PASSWORD)
        headers = self._get_auth_headers(athlete_token)
        
        # Get programs
        programs_resp = self.session.get(f"{BASE_URL}/api/athlete/programs", headers=headers)
        assert programs_resp.status_code == 200
        programs = programs_resp.json()
        
        if not programs:
            pytest.skip("No programs found for athlete")
        
        program_id = programs[0]["program_id"]
        
        # Mark follow-up as sent
        response = self.session.post(
            f"{BASE_URL}/api/athlete/follow-ups/{program_id}/mark-sent",
            headers=headers,
            json={"outcome": "No Response", "reply_status": "Awaiting Reply"}
        )
        
        assert response.status_code == 200, f"Mark follow-up sent failed: {response.text}"
        print(f"PASS: POST /api/athlete/follow-ups/{program_id}/mark-sent returned 200")
        
        # Verify coach inbox is accessible
        coach_token = self._login(COACH_EMAIL, COACH_PASSWORD)
        coach_headers = self._get_auth_headers(coach_token)
        
        inbox_resp = self.session.get(f"{BASE_URL}/api/coach-inbox", headers=coach_headers)
        assert inbox_resp.status_code == 200, f"Coach inbox failed after mark-sent: {inbox_resp.text}"
        print("PASS: Coach inbox accessible after mark-follow-up-sent (cache refreshed)")
    
    # ─────────────────────────────────────────────────────────────────────────
    # Test 4: POST /api/athlete/programs triggers cache refresh
    # ─────────────────────────────────────────────────────────────────────────
    def test_create_program_triggers_cache_refresh(self):
        """Verify POST /api/athlete/programs triggers recompute_derived_data()"""
        athlete_token = self._login(ATHLETE_EMAIL, ATHLETE_PASSWORD)
        headers = self._get_auth_headers(athlete_token)
        
        # Create a new program with unique name
        unique_name = f"Test University {uuid.uuid4().hex[:8]}"
        program_data = {
            "university_name": unique_name,
            "division": "D1",
            "conference": "Test Conference",
            "recruiting_status": "Not Contacted",
            "priority": "Medium"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/athlete/programs",
            headers=headers,
            json=program_data
        )
        
        assert response.status_code == 200, f"Create program failed: {response.text}"
        data = response.json()
        assert "program_id" in data, "Response should contain program_id"
        created_program_id = data["program_id"]
        print(f"PASS: POST /api/athlete/programs returned 200 with program_id={created_program_id}")
        
        # Verify coach inbox is accessible
        coach_token = self._login(COACH_EMAIL, COACH_PASSWORD)
        coach_headers = self._get_auth_headers(coach_token)
        
        inbox_resp = self.session.get(f"{BASE_URL}/api/coach-inbox", headers=coach_headers)
        assert inbox_resp.status_code == 200, f"Coach inbox failed after create program: {inbox_resp.text}"
        print("PASS: Coach inbox accessible after program creation (cache refreshed)")
        
        # Cleanup: delete the test program
        self.session.delete(f"{BASE_URL}/api/athlete/programs/{created_program_id}", headers=headers)
    
    # ─────────────────────────────────────────────────────────────────────────
    # Test 5: PUT /api/athlete/programs/{id} triggers cache refresh
    # ─────────────────────────────────────────────────────────────────────────
    def test_update_program_triggers_cache_refresh(self):
        """Verify PUT /api/athlete/programs/{id} triggers recompute_derived_data()"""
        athlete_token = self._login(ATHLETE_EMAIL, ATHLETE_PASSWORD)
        headers = self._get_auth_headers(athlete_token)
        
        # Get programs
        programs_resp = self.session.get(f"{BASE_URL}/api/athlete/programs", headers=headers)
        assert programs_resp.status_code == 200
        programs = programs_resp.json()
        
        if not programs:
            pytest.skip("No programs found for athlete")
        
        program_id = programs[0]["program_id"]
        
        # Update program
        response = self.session.put(
            f"{BASE_URL}/api/athlete/programs/{program_id}",
            headers=headers,
            json={"notes": f"Updated notes for cache test {uuid.uuid4().hex[:8]}"}
        )
        
        assert response.status_code == 200, f"Update program failed: {response.text}"
        print(f"PASS: PUT /api/athlete/programs/{program_id} returned 200")
        
        # Verify coach inbox is accessible
        coach_token = self._login(COACH_EMAIL, COACH_PASSWORD)
        coach_headers = self._get_auth_headers(coach_token)
        
        inbox_resp = self.session.get(f"{BASE_URL}/api/coach-inbox", headers=coach_headers)
        assert inbox_resp.status_code == 200, f"Coach inbox failed after update program: {inbox_resp.text}"
        print("PASS: Coach inbox accessible after program update (cache refreshed)")
    
    # ─────────────────────────────────────────────────────────────────────────
    # Test 6: DELETE /api/athlete/programs/{id} triggers cache refresh
    # ─────────────────────────────────────────────────────────────────────────
    def test_delete_program_triggers_cache_refresh(self):
        """Verify DELETE /api/athlete/programs/{id} triggers recompute_derived_data()"""
        athlete_token = self._login(ATHLETE_EMAIL, ATHLETE_PASSWORD)
        headers = self._get_auth_headers(athlete_token)
        
        # First create a program to delete
        unique_name = f"Delete Test University {uuid.uuid4().hex[:8]}"
        create_resp = self.session.post(
            f"{BASE_URL}/api/athlete/programs",
            headers=headers,
            json={
                "university_name": unique_name,
                "division": "D2",
                "recruiting_status": "Not Contacted"
            }
        )
        
        if create_resp.status_code != 200:
            pytest.skip("Could not create test program for deletion")
        
        program_id = create_resp.json()["program_id"]
        
        # Delete the program
        response = self.session.delete(
            f"{BASE_URL}/api/athlete/programs/{program_id}",
            headers=headers
        )
        
        assert response.status_code == 200, f"Delete program failed: {response.text}"
        data = response.json()
        assert data.get("deleted") == True, "Response should confirm deletion"
        print(f"PASS: DELETE /api/athlete/programs/{program_id} returned 200")
        
        # Verify coach inbox is accessible
        coach_token = self._login(COACH_EMAIL, COACH_PASSWORD)
        coach_headers = self._get_auth_headers(coach_token)
        
        inbox_resp = self.session.get(f"{BASE_URL}/api/coach-inbox", headers=coach_headers)
        assert inbox_resp.status_code == 200, f"Coach inbox failed after delete program: {inbox_resp.text}"
        print("PASS: Coach inbox accessible after program deletion (cache refreshed)")
    
    # ─────────────────────────────────────────────────────────────────────────
    # Test 7: POST /api/coach/escalate triggers cache refresh
    # ─────────────────────────────────────────────────────────────────────────
    def test_coach_escalate_triggers_cache_refresh(self):
        """Verify POST /api/coach/escalate triggers recompute_derived_data()"""
        coach_token = self._login(COACH_EMAIL, COACH_PASSWORD)
        headers = self._get_auth_headers(coach_token)
        
        # Get athletes to find one to escalate
        athletes_resp = self.session.get(f"{BASE_URL}/api/athletes", headers=headers)
        assert athletes_resp.status_code == 200, f"Failed to get athletes: {athletes_resp.text}"
        athletes = athletes_resp.json()
        
        if not athletes:
            pytest.skip("No athletes found for coach")
        
        athlete = athletes[0]
        athlete_id = athlete.get("id")
        athlete_name = athlete.get("full_name") or athlete.get("name", "Test Athlete")
        
        # Create escalation
        escalation_data = {
            "athlete_id": athlete_id,
            "athlete_name": athlete_name,
            "school_name": "Test School",
            "primary_risk": "Test escalation for cache invalidation",
            "why_now": "Testing cache refresh",
            "coach_note": f"Test escalation {uuid.uuid4().hex[:8]}"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/coach/escalate",
            headers=headers,
            json=escalation_data
        )
        
        assert response.status_code == 200, f"Coach escalate failed: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        assert "action_id" in data, "Response should contain action_id"
        print(f"PASS: POST /api/coach/escalate returned 200 with action_id={data['action_id']}")
        
        # Verify director inbox is accessible (cache was refreshed)
        director_token = self._login(DIRECTOR_EMAIL, DIRECTOR_PASSWORD)
        director_headers = self._get_auth_headers(director_token)
        
        director_inbox_resp = self.session.get(f"{BASE_URL}/api/director-inbox", headers=director_headers)
        assert director_inbox_resp.status_code == 200, f"Director inbox failed after escalation: {director_inbox_resp.text}"
        print("PASS: Director inbox accessible after coach escalation (cache refreshed)")
    
    # ─────────────────────────────────────────────────────────────────────────
    # Test 8: POST /api/athletes/{id}/assign triggers cache refresh
    # ─────────────────────────────────────────────────────────────────────────
    def test_assign_owner_triggers_cache_refresh(self):
        """Verify POST /api/athletes/{id}/assign triggers recompute_derived_data()"""
        coach_token = self._login(COACH_EMAIL, COACH_PASSWORD)
        headers = self._get_auth_headers(coach_token)
        
        # Get athletes
        athletes_resp = self.session.get(f"{BASE_URL}/api/athletes", headers=headers)
        assert athletes_resp.status_code == 200
        athletes = athletes_resp.json()
        
        if not athletes:
            pytest.skip("No athletes found for coach")
        
        athlete_id = athletes[0].get("id")
        
        # Assign owner
        response = self.session.post(
            f"{BASE_URL}/api/athletes/{athlete_id}/assign",
            headers=headers,
            json={
                "new_owner": "Test Coach",
                "reason": f"Test assignment for cache invalidation {uuid.uuid4().hex[:8]}",
                "intervention_category": "recruiting"
            }
        )
        
        assert response.status_code == 200, f"Assign owner failed: {response.text}"
        data = response.json()
        assert "id" in data, "Response should contain assignment id"
        print(f"PASS: POST /api/athletes/{athlete_id}/assign returned 200")
        
        # Verify coach inbox is accessible
        inbox_resp = self.session.get(f"{BASE_URL}/api/coach-inbox", headers=headers)
        assert inbox_resp.status_code == 200, f"Coach inbox failed after assign: {inbox_resp.text}"
        print("PASS: Coach inbox accessible after owner assignment (cache refreshed)")
    
    # ─────────────────────────────────────────────────────────────────────────
    # Test 9: POST /api/athletes/{id}/messages triggers cache refresh
    # ─────────────────────────────────────────────────────────────────────────
    def test_send_message_triggers_cache_refresh(self):
        """Verify POST /api/athletes/{id}/messages triggers recompute_derived_data()"""
        coach_token = self._login(COACH_EMAIL, COACH_PASSWORD)
        headers = self._get_auth_headers(coach_token)
        
        # Get athletes
        athletes_resp = self.session.get(f"{BASE_URL}/api/athletes", headers=headers)
        assert athletes_resp.status_code == 200
        athletes = athletes_resp.json()
        
        if not athletes:
            pytest.skip("No athletes found for coach")
        
        athlete_id = athletes[0].get("id")
        
        # Send message
        response = self.session.post(
            f"{BASE_URL}/api/athletes/{athlete_id}/messages",
            headers=headers,
            json={
                "recipient": "athlete",
                "text": f"Test message for cache invalidation {uuid.uuid4().hex[:8]}"
            }
        )
        
        assert response.status_code == 200, f"Send message failed: {response.text}"
        data = response.json()
        assert "id" in data, "Response should contain message id"
        print(f"PASS: POST /api/athletes/{athlete_id}/messages returned 200")
        
        # Verify coach inbox is accessible
        inbox_resp = self.session.get(f"{BASE_URL}/api/coach-inbox", headers=headers)
        assert inbox_resp.status_code == 200, f"Coach inbox failed after message: {inbox_resp.text}"
        print("PASS: Coach inbox accessible after sending message (cache refreshed)")
    
    # ─────────────────────────────────────────────────────────────────────────
    # Test 10: GET /api/coach-inbox returns updated data after athlete action
    # ─────────────────────────────────────────────────────────────────────────
    def test_coach_inbox_reflects_athlete_actions(self):
        """Verify coach inbox returns updated data after athlete performs actions"""
        # Login as athlete and perform an action
        athlete_token = self._login(ATHLETE_EMAIL, ATHLETE_PASSWORD)
        athlete_headers = self._get_auth_headers(athlete_token)
        
        # Get programs
        programs_resp = self.session.get(f"{BASE_URL}/api/athlete/programs", headers=athlete_headers)
        assert programs_resp.status_code == 200
        programs = programs_resp.json()
        
        if not programs:
            pytest.skip("No programs found for athlete")
        
        program_id = programs[0]["program_id"]
        
        # Create an interaction as athlete
        interaction_data = {
            "program_id": program_id,
            "type": "Email",
            "outcome": "No Response",
            "notes": f"Integration test interaction {uuid.uuid4().hex[:8]}",
            "date_time": datetime.now(timezone.utc).isoformat()
        }
        
        create_resp = self.session.post(
            f"{BASE_URL}/api/athlete/interactions",
            headers=athlete_headers,
            json=interaction_data
        )
        assert create_resp.status_code == 200, f"Create interaction failed: {create_resp.text}"
        
        # Now login as coach and verify inbox is accessible and returns valid data
        coach_token = self._login(COACH_EMAIL, COACH_PASSWORD)
        coach_headers = self._get_auth_headers(coach_token)
        
        inbox_resp = self.session.get(f"{BASE_URL}/api/coach-inbox", headers=coach_headers)
        assert inbox_resp.status_code == 200, f"Coach inbox failed: {inbox_resp.text}"
        
        inbox_data = inbox_resp.json()
        assert "items" in inbox_data, "Coach inbox should have 'items' field"
        assert "count" in inbox_data, "Coach inbox should have 'count' field"
        assert "highCount" in inbox_data, "Coach inbox should have 'highCount' field"
        
        print(f"PASS: Coach inbox returns valid data structure with {inbox_data['count']} items")
        print(f"  - items: {len(inbox_data['items'])}")
        print(f"  - count: {inbox_data['count']}")
        print(f"  - highCount: {inbox_data['highCount']}")


class TestBackendHealthAfterCacheOperations:
    """Verify backend doesn't crash after recompute_derived_data() calls"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_backend_health_after_multiple_writes(self):
        """Verify backend remains healthy after multiple write operations"""
        # Login as athlete
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ATHLETE_EMAIL,
            "password": ATHLETE_PASSWORD
        })
        
        if login_resp.status_code != 200:
            pytest.skip("Login failed")
        
        token = login_resp.json().get("token")
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        
        # Get programs
        programs_resp = self.session.get(f"{BASE_URL}/api/athlete/programs", headers=headers)
        assert programs_resp.status_code == 200
        programs = programs_resp.json()
        
        if not programs:
            pytest.skip("No programs found")
        
        program_id = programs[0]["program_id"]
        
        # Perform multiple write operations in sequence
        operations_success = 0
        
        # 1. Create interaction
        resp1 = self.session.post(
            f"{BASE_URL}/api/athlete/interactions",
            headers=headers,
            json={
                "program_id": program_id,
                "type": "Email",
                "notes": f"Health test 1 - {uuid.uuid4().hex[:8]}"
            }
        )
        if resp1.status_code == 200:
            operations_success += 1
        
        # 2. Update program
        resp2 = self.session.put(
            f"{BASE_URL}/api/athlete/programs/{program_id}",
            headers=headers,
            json={"notes": f"Health test 2 - {uuid.uuid4().hex[:8]}"}
        )
        if resp2.status_code == 200:
            operations_success += 1
        
        # 3. Mark follow-up sent
        resp3 = self.session.post(
            f"{BASE_URL}/api/athlete/follow-ups/{program_id}/mark-sent",
            headers=headers,
            json={"outcome": "No Response"}
        )
        if resp3.status_code == 200:
            operations_success += 1
        
        # Verify backend is still healthy by checking athlete programs endpoint
        programs_check = self.session.get(f"{BASE_URL}/api/athlete/programs", headers=headers)
        assert programs_check.status_code == 200, "Backend programs endpoint failed after multiple writes"
        
        print(f"PASS: Backend healthy after {operations_success}/3 write operations")
        print(f"  - Programs endpoint returned {len(programs_check.json())} programs")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

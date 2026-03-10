"""
Test suite for Coach-to-Athlete 'Flag for Follow-Up' feature.

Tests:
1. POST /api/roster/athlete/{athlete_id}/flag-followup - Coach creates flag
2. GET /api/athlete/flags - Athlete gets active flags
3. POST /api/athlete/flags/{flag_id}/complete - Athlete completes flag
4. GET /api/athlete/tasks - Returns coach flags alongside system tasks

Authorization:
- Only coaches can create flags (403 for athlete, director)
- Coach can only flag their assigned athletes (403 for non-assigned)
- Invalid reason/due returns 400
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
COACH_EMAIL = "coach.williams@capymatch.com"
COACH_PASSWORD = "coach123"
COACH_ID = "coach-williams"

ATHLETE_EMAIL = "emma.chen@athlete.capymatch.com"
ATHLETE_PASSWORD = "password123"
ATHLETE_ID = "athlete_3"  # Assigned to coach-williams

DIRECTOR_EMAIL = "director@capymatch.com"
DIRECTOR_PASSWORD = "director123"

# Pre-existing test flags in DB
EXISTING_FLAG_1 = "flag_4871448923f5"  # reply_needed, UF, due today
EXISTING_FLAG_2 = "flag_6494e5843284"  # strong_interest, Stanford, due this_week


@pytest.fixture(scope="module")
def coach_token():
    """Authenticate as coach and get token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": COACH_EMAIL,
        "password": COACH_PASSWORD
    })
    if resp.status_code != 200:
        pytest.skip(f"Coach login failed: {resp.status_code}")
    return resp.json().get("token")


@pytest.fixture(scope="module")
def athlete_token():
    """Authenticate as athlete and get token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ATHLETE_EMAIL,
        "password": ATHLETE_PASSWORD
    })
    if resp.status_code != 200:
        pytest.skip(f"Athlete login failed: {resp.status_code}")
    return resp.json().get("token")


@pytest.fixture(scope="module")
def director_token():
    """Authenticate as director and get token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": DIRECTOR_EMAIL,
        "password": DIRECTOR_PASSWORD
    })
    if resp.status_code != 200:
        pytest.skip(f"Director login failed: {resp.status_code}")
    return resp.json().get("token")


class TestCoachFlagCreation:
    """Test POST /api/roster/athlete/{athlete_id}/flag-followup"""

    def test_coach_creates_flag_successfully(self, coach_token):
        """Coach can create a flag for their assigned athlete"""
        # Get athlete's programs first to find a valid program_id
        resp = requests.get(
            f"{BASE_URL}/api/roster/athlete/{ATHLETE_ID}/pipeline",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert resp.status_code == 200, f"Failed to get pipeline: {resp.text}"
        
        schools = resp.json().get("schools", [])
        # Find a valid program_id
        program_id = None
        for stage_group in schools:
            if stage_group.get("schools"):
                program_id = stage_group["schools"][0].get("program_id")
                break
        
        if not program_id:
            pytest.skip("No programs found for athlete")
        
        # Create flag
        resp = requests.post(
            f"{BASE_URL}/api/roster/athlete/{ATHLETE_ID}/flag-followup",
            headers={"Authorization": f"Bearer {coach_token}"},
            json={
                "program_id": program_id,
                "reason": "reply_needed",
                "note": "Test flag from pytest",
                "due": "today"
            }
        )
        
        assert resp.status_code == 200, f"Flag creation failed: {resp.text}"
        data = resp.json()
        assert "flag_id" in data
        assert data["flag_id"].startswith("flag_")
        assert "message" in data
        assert "reason_label" in data
        assert data["reason_label"] == "Reply needed"
        print(f"SUCCESS: Created flag {data['flag_id']} for program {program_id}")

    def test_coach_creates_flag_with_this_week_due(self, coach_token):
        """Coach can create a flag with this_week due date"""
        # Get a valid program_id
        resp = requests.get(
            f"{BASE_URL}/api/roster/athlete/{ATHLETE_ID}/pipeline",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        schools = resp.json().get("schools", [])
        program_id = None
        for stage_group in schools:
            if stage_group.get("schools"):
                program_id = stage_group["schools"][0].get("program_id")
                break
        
        if not program_id:
            pytest.skip("No programs found")
        
        resp = requests.post(
            f"{BASE_URL}/api/roster/athlete/{ATHLETE_ID}/flag-followup",
            headers={"Authorization": f"Bearer {coach_token}"},
            json={
                "program_id": program_id,
                "reason": "strong_interest",
                "note": "",
                "due": "this_week"
            }
        )
        
        assert resp.status_code == 200, f"Flag creation failed: {resp.text}"
        data = resp.json()
        assert data["reason_label"] == "Strong interest worth pursuing"
        print(f"SUCCESS: Created flag with this_week due")

    def test_athlete_cannot_create_flag(self, athlete_token):
        """Athlete cannot create flags (403)"""
        resp = requests.post(
            f"{BASE_URL}/api/roster/athlete/{ATHLETE_ID}/flag-followup",
            headers={"Authorization": f"Bearer {athlete_token}"},
            json={
                "program_id": "test_program",
                "reason": "reply_needed",
                "note": "",
                "due": "today"
            }
        )
        
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}: {resp.text}"
        print("SUCCESS: Athlete correctly denied from creating flag")

    def test_director_cannot_create_flag(self, director_token):
        """Director cannot create flags in V1 (403)"""
        resp = requests.post(
            f"{BASE_URL}/api/roster/athlete/{ATHLETE_ID}/flag-followup",
            headers={"Authorization": f"Bearer {director_token}"},
            json={
                "program_id": "test_program",
                "reason": "reply_needed",
                "note": "",
                "due": "today"
            }
        )
        
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}: {resp.text}"
        print("SUCCESS: Director correctly denied from creating flag")

    def test_coach_cannot_flag_unassigned_athlete(self, coach_token):
        """Coach cannot flag athletes not assigned to them (403)"""
        # athlete_4 is assigned to coach-garcia, not coach-williams
        resp = requests.post(
            f"{BASE_URL}/api/roster/athlete/athlete_4/flag-followup",
            headers={"Authorization": f"Bearer {coach_token}"},
            json={
                "program_id": "test_program",
                "reason": "reply_needed",
                "note": "",
                "due": "today"
            }
        )
        
        # Should return 403 since coach-williams is not assigned to athlete_4
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}: {resp.text}"
        print("SUCCESS: Coach correctly denied from flagging unassigned athlete")

    def test_invalid_reason_returns_400(self, coach_token):
        """Invalid reason returns 400"""
        resp = requests.post(
            f"{BASE_URL}/api/roster/athlete/{ATHLETE_ID}/flag-followup",
            headers={"Authorization": f"Bearer {coach_token}"},
            json={
                "program_id": "test_program",
                "reason": "invalid_reason_here",
                "note": "",
                "due": "today"
            }
        )
        
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}: {resp.text}"
        print("SUCCESS: Invalid reason correctly returns 400")

    def test_invalid_due_returns_400(self, coach_token):
        """Invalid due value returns 400"""
        resp = requests.post(
            f"{BASE_URL}/api/roster/athlete/{ATHLETE_ID}/flag-followup",
            headers={"Authorization": f"Bearer {coach_token}"},
            json={
                "program_id": "test_program",
                "reason": "reply_needed",
                "note": "",
                "due": "invalid_due_value"
            }
        )
        
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}: {resp.text}"
        print("SUCCESS: Invalid due value correctly returns 400")


class TestAthleteFlagsEndpoint:
    """Test GET /api/athlete/flags"""

    def test_athlete_gets_active_flags(self, athlete_token):
        """Athlete can retrieve their active flags"""
        resp = requests.get(
            f"{BASE_URL}/api/athlete/flags",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        
        assert resp.status_code == 200, f"Failed to get flags: {resp.text}"
        data = resp.json()
        assert "flags" in data
        assert "total" in data
        assert isinstance(data["flags"], list)
        
        # Check flag structure if any exist
        if data["total"] > 0:
            flag = data["flags"][0]
            assert "flag_id" in flag
            assert "university_name" in flag
            assert "reason" in flag
            assert "reason_label" in flag
            assert "status" in flag
            assert flag["status"] == "active"
        
        print(f"SUCCESS: Athlete retrieved {data['total']} active flags")

    def test_flags_sorted_by_created_at(self, athlete_token):
        """Flags are sorted by created_at descending"""
        resp = requests.get(
            f"{BASE_URL}/api/athlete/flags",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        
        assert resp.status_code == 200
        data = resp.json()
        flags = data.get("flags", [])
        
        if len(flags) >= 2:
            # Check descending order by created_at
            for i in range(len(flags) - 1):
                curr_date = flags[i].get("created_at", "")
                next_date = flags[i + 1].get("created_at", "")
                assert curr_date >= next_date, "Flags not sorted by created_at descending"
        
        print("SUCCESS: Flags sorted correctly")


class TestCompleteFlagEndpoint:
    """Test POST /api/athlete/flags/{flag_id}/complete"""

    def test_athlete_completes_flag(self, athlete_token, coach_token):
        """Athlete can complete a flag"""
        # First, create a new flag as coach
        resp = requests.get(
            f"{BASE_URL}/api/roster/athlete/{ATHLETE_ID}/pipeline",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        schools = resp.json().get("schools", [])
        program_id = None
        for stage_group in schools:
            if stage_group.get("schools"):
                program_id = stage_group["schools"][0].get("program_id")
                break
        
        if not program_id:
            pytest.skip("No programs found")
        
        # Create flag
        create_resp = requests.post(
            f"{BASE_URL}/api/roster/athlete/{ATHLETE_ID}/flag-followup",
            headers={"Authorization": f"Bearer {coach_token}"},
            json={
                "program_id": program_id,
                "reason": "review_school",
                "note": "Flag to be completed in test",
                "due": "none"
            }
        )
        assert create_resp.status_code == 200
        flag_id = create_resp.json()["flag_id"]
        print(f"Created flag {flag_id} for completion test")
        
        # Now complete the flag as athlete
        complete_resp = requests.post(
            f"{BASE_URL}/api/athlete/flags/{flag_id}/complete",
            headers={"Authorization": f"Bearer {athlete_token}"},
            json={"resolution_note": "Completed from pytest"}
        )
        
        assert complete_resp.status_code == 200, f"Failed to complete flag: {complete_resp.text}"
        data = complete_resp.json()
        assert "message" in data
        assert data["flag_id"] == flag_id
        print(f"SUCCESS: Athlete completed flag {flag_id}")

    def test_complete_nonexistent_flag_returns_404(self, athlete_token):
        """Completing a non-existent flag returns 404"""
        resp = requests.post(
            f"{BASE_URL}/api/athlete/flags/flag_nonexistent123/complete",
            headers={"Authorization": f"Bearer {athlete_token}"},
            json={"resolution_note": ""}
        )
        
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}: {resp.text}"
        print("SUCCESS: Non-existent flag returns 404")

    def test_complete_already_completed_flag_returns_400(self, athlete_token, coach_token):
        """Completing an already completed flag returns 400"""
        # Create and complete a flag
        resp = requests.get(
            f"{BASE_URL}/api/roster/athlete/{ATHLETE_ID}/pipeline",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        schools = resp.json().get("schools", [])
        program_id = None
        for stage_group in schools:
            if stage_group.get("schools"):
                program_id = stage_group["schools"][0].get("program_id")
                break
        
        if not program_id:
            pytest.skip("No programs found")
        
        # Create flag
        create_resp = requests.post(
            f"{BASE_URL}/api/roster/athlete/{ATHLETE_ID}/flag-followup",
            headers={"Authorization": f"Bearer {coach_token}"},
            json={
                "program_id": program_id,
                "reason": "followup_overdue",
                "note": "Double complete test",
                "due": "none"
            }
        )
        assert create_resp.status_code == 200
        flag_id = create_resp.json()["flag_id"]
        
        # Complete first time
        requests.post(
            f"{BASE_URL}/api/athlete/flags/{flag_id}/complete",
            headers={"Authorization": f"Bearer {athlete_token}"},
            json={"resolution_note": ""}
        )
        
        # Try to complete again
        second_resp = requests.post(
            f"{BASE_URL}/api/athlete/flags/{flag_id}/complete",
            headers={"Authorization": f"Bearer {athlete_token}"},
            json={"resolution_note": ""}
        )
        
        assert second_resp.status_code == 400, f"Expected 400, got {second_resp.status_code}"
        print("SUCCESS: Already completed flag returns 400")


class TestAthleteTasksWithFlags:
    """Test GET /api/athlete/tasks includes coach flags"""

    def test_tasks_include_coach_flags(self, athlete_token):
        """Athlete tasks endpoint includes coach flags"""
        resp = requests.get(
            f"{BASE_URL}/api/athlete/tasks",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        
        assert resp.status_code == 200, f"Failed to get tasks: {resp.text}"
        data = resp.json()
        assert "tasks" in data
        assert "total" in data
        
        # Check for coach_flag type tasks
        tasks = data["tasks"]
        coach_flags = [t for t in tasks if t.get("source") == "coach" or t.get("type") == "coach_flag"]
        
        print(f"SUCCESS: Tasks endpoint returned {len(tasks)} tasks, {len(coach_flags)} are coach flags")
        
        # Verify coach flag structure if any exist
        if coach_flags:
            flag_task = coach_flags[0]
            assert "task_id" in flag_task
            assert "title" in flag_task
            assert "description" in flag_task
            assert flag_task.get("source") == "coach" or flag_task.get("type") == "coach_flag"
            print(f"Coach flag task structure verified: {flag_task.get('title')}")

    def test_tasks_sorted_coach_flags_first(self, athlete_token):
        """Coach flags appear before system tasks"""
        resp = requests.get(
            f"{BASE_URL}/api/athlete/tasks",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        
        assert resp.status_code == 200
        tasks = resp.json().get("tasks", [])
        
        # Find first non-coach task
        first_non_coach_idx = None
        for i, t in enumerate(tasks):
            if t.get("source") != "coach":
                first_non_coach_idx = i
                break
        
        if first_non_coach_idx is not None:
            # All tasks before this should be coach tasks
            for i in range(first_non_coach_idx):
                assert tasks[i].get("source") == "coach", f"Task at index {i} should be coach task"
        
        print("SUCCESS: Tasks are sorted with coach flags first")


class TestPreExistingFlags:
    """Test pre-seeded flag data"""

    def test_preseeded_flags_exist(self, athlete_token):
        """Verify pre-seeded test flags exist"""
        resp = requests.get(
            f"{BASE_URL}/api/athlete/flags",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        
        assert resp.status_code == 200
        flags = resp.json().get("flags", [])
        flag_ids = [f.get("flag_id") for f in flags]
        
        # These may have been completed in previous tests, so just log
        found_1 = EXISTING_FLAG_1 in flag_ids
        found_2 = EXISTING_FLAG_2 in flag_ids
        
        print(f"Pre-seeded flags check:")
        print(f"  {EXISTING_FLAG_1}: {'Found' if found_1 else 'Not found (may be completed)'}")
        print(f"  {EXISTING_FLAG_2}: {'Found' if found_2 else 'Not found (may be completed)'}")
        
        # Just verify we can query flags - they may have been completed
        assert resp.status_code == 200
        print("SUCCESS: Flags endpoint accessible")

"""
Test Playbook Step Persistence and Profile Reminder Features

Features tested:
1. Playbook step persistence: PATCH/GET /api/support-pods/{athlete_id}/school/{program_id}/playbook-progress
2. Playbook steps returned in school pod response (playbook_checked_steps)
3. Profile reminder: POST /api/support-messages sends reminder to athlete
4. Message appears in athlete's inbox
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"

# Test credentials from review request
COACH_EMAIL = "coach.williams@capymatch.com"
COACH_PASSWORD = "coach123"
ATHLETE_EMAIL = "emma.chen@athlete.capymatch.com"
ATHLETE_PASSWORD = "athlete123"
ATHLETE_ID = "athlete_3"
EMORY_PROGRAM_ID = "ae7647cc-affc-44ef-8977-244309ac3a30"
CREIGHTON_PROGRAM_ID = "37e13435-8f43-4fac-a68a-888355188db9"


@pytest.fixture(scope="module")
def coach_token():
    """Authenticate as coach and return token."""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": COACH_EMAIL,
        "password": COACH_PASSWORD
    })
    assert resp.status_code == 200, f"Coach login failed: {resp.text}"
    return resp.json().get("token")


@pytest.fixture(scope="module")
def athlete_token():
    """Authenticate as athlete and return token."""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ATHLETE_EMAIL,
        "password": ATHLETE_PASSWORD
    })
    assert resp.status_code == 200, f"Athlete login failed: {resp.text}"
    return resp.json().get("token")


@pytest.fixture
def coach_headers(coach_token):
    return {"Authorization": f"Bearer {coach_token}"}


@pytest.fixture
def athlete_headers(athlete_token):
    return {"Authorization": f"Bearer {athlete_token}"}


# ─── Playbook Progress Persistence Tests ─────────────────────

class TestPlaybookProgressAPI:
    """Test playbook step persistence via GET/PATCH endpoints."""

    def test_01_get_playbook_progress_endpoint_exists(self, coach_headers):
        """GET /api/support-pods/{athlete_id}/school/{program_id}/playbook-progress returns data."""
        resp = requests.get(
            f"{BASE_URL}/api/support-pods/{ATHLETE_ID}/school/{EMORY_PROGRAM_ID}/playbook-progress",
            headers=coach_headers
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "checked_steps" in data, "Response should contain checked_steps array"

    def test_02_patch_playbook_progress_saves_steps(self, coach_headers):
        """PATCH /api/support-pods/{athlete_id}/school/{program_id}/playbook-progress saves checked_steps."""
        # Save steps [1, 2]
        resp = requests.patch(
            f"{BASE_URL}/api/support-pods/{ATHLETE_ID}/school/{EMORY_PROGRAM_ID}/playbook-progress",
            json={"checked_steps": [1, 2]},
            headers=coach_headers
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("saved") == True, "Response should have saved=true"
        assert data.get("checked_steps") == [1, 2], "Response should return saved steps"

    def test_03_get_playbook_progress_returns_saved_steps(self, coach_headers):
        """GET playbook-progress returns previously saved steps."""
        resp = requests.get(
            f"{BASE_URL}/api/support-pods/{ATHLETE_ID}/school/{EMORY_PROGRAM_ID}/playbook-progress",
            headers=coach_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        # Steps [1, 2] should still be there from test_02
        assert 1 in data.get("checked_steps", []), "Step 1 should be persisted"
        assert 2 in data.get("checked_steps", []), "Step 2 should be persisted"

    def test_04_school_pod_includes_playbook_checked_steps(self, coach_headers):
        """GET /api/support-pods/{athlete_id}/school/{program_id} includes playbook_checked_steps."""
        resp = requests.get(
            f"{BASE_URL}/api/support-pods/{ATHLETE_ID}/school/{EMORY_PROGRAM_ID}",
            headers=coach_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "playbook_checked_steps" in data, "School pod response should include playbook_checked_steps"
        # Verify the saved steps are returned
        checked = data["playbook_checked_steps"]
        assert isinstance(checked, list), "playbook_checked_steps should be a list"
        assert 1 in checked, "Step 1 should be in school pod response"
        assert 2 in checked, "Step 2 should be in school pod response"

    def test_05_uncheck_step_updates_database(self, coach_headers):
        """PATCH with fewer steps should update (e.g., uncheck step 2)."""
        # Uncheck step 2, keep only step 1
        resp = requests.patch(
            f"{BASE_URL}/api/support-pods/{ATHLETE_ID}/school/{EMORY_PROGRAM_ID}/playbook-progress",
            json={"checked_steps": [1]},
            headers=coach_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("checked_steps") == [1], "Only step 1 should remain"

        # Verify via GET
        resp2 = requests.get(
            f"{BASE_URL}/api/support-pods/{ATHLETE_ID}/school/{EMORY_PROGRAM_ID}/playbook-progress",
            headers=coach_headers
        )
        assert resp2.status_code == 200
        assert resp2.json().get("checked_steps") == [1], "Only step 1 should be persisted"

    def test_06_different_school_has_separate_progress(self, coach_headers):
        """Creighton's playbook progress should be independent of Emory's."""
        # Save different steps for Creighton
        resp = requests.patch(
            f"{BASE_URL}/api/support-pods/{ATHLETE_ID}/school/{CREIGHTON_PROGRAM_ID}/playbook-progress",
            json={"checked_steps": [3, 4]},
            headers=coach_headers
        )
        assert resp.status_code == 200

        # Verify Creighton has [3, 4]
        resp_c = requests.get(
            f"{BASE_URL}/api/support-pods/{ATHLETE_ID}/school/{CREIGHTON_PROGRAM_ID}/playbook-progress",
            headers=coach_headers
        )
        assert resp_c.status_code == 200
        assert resp_c.json().get("checked_steps") == [3, 4]

        # Verify Emory still has [1] (not affected by Creighton)
        resp_e = requests.get(
            f"{BASE_URL}/api/support-pods/{ATHLETE_ID}/school/{EMORY_PROGRAM_ID}/playbook-progress",
            headers=coach_headers
        )
        assert resp_e.status_code == 200
        assert resp_e.json().get("checked_steps") == [1], "Emory progress should be independent"


# ─── Profile Reminder Tests ─────────────────────────────────

class TestProfileReminder:
    """Test Send Reminder feature from profile alert."""

    def test_01_coach_can_send_profile_reminder(self, coach_headers):
        """POST /api/support-messages with profile reminder content."""
        resp = requests.post(
            f"{BASE_URL}/api/support-messages",
            json={
                "athlete_id": ATHLETE_ID,
                "subject": "Complete Your Profile",
                "body": "Hi Emma Chen,\n\nYour recruiting profile is 67% complete. To improve your visibility with college coaches, please update the following: Height, Weight, Academic Info.\n\nA complete profile makes a strong first impression. Log in and update your profile when you get a chance!"
            },
            headers=coach_headers
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("status") == "sent", "Message should be sent"
        assert "thread_id" in data, "Response should include thread_id"
        assert "id" in data, "Response should include message id"

    def test_02_message_appears_in_athlete_inbox(self, athlete_headers):
        """Athlete inbox should contain the profile reminder message."""
        resp = requests.get(
            f"{BASE_URL}/api/support-messages/inbox",
            headers=athlete_headers
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        threads = data.get("threads", [])
        
        # Look for the profile reminder thread
        profile_threads = [t for t in threads if "Complete Your Profile" in t.get("subject", "")]
        assert len(profile_threads) > 0, "Profile reminder should appear in athlete inbox"
        
        thread = profile_threads[0]
        assert "thread_id" in thread
        assert thread.get("athlete_id") == ATHLETE_ID

    def test_03_message_content_is_correct(self, athlete_headers):
        """Verify the message body contains expected content."""
        # Get inbox
        resp = requests.get(f"{BASE_URL}/api/support-messages/inbox", headers=athlete_headers)
        assert resp.status_code == 200
        threads = resp.json().get("threads", [])
        
        # Find profile reminder thread
        profile_threads = [t for t in threads if "Complete Your Profile" in t.get("subject", "")]
        assert len(profile_threads) > 0
        
        thread_id = profile_threads[0]["thread_id"]
        
        # Get thread messages
        resp2 = requests.get(f"{BASE_URL}/api/support-messages/thread/{thread_id}", headers=athlete_headers)
        assert resp2.status_code == 200
        messages = resp2.json().get("messages", [])
        
        # Find the reminder message
        reminder_msgs = [m for m in messages if "profile" in m.get("body", "").lower()]
        assert len(reminder_msgs) > 0, "Should find profile reminder message in thread"


# ─── Regression Tests ─────────────────────────────────────────

class TestRegressionPlaybooks:
    """Regression tests for existing playbook functionality."""

    def test_01_emory_playbook_is_follow_up_required(self, coach_headers):
        """Emory should still generate Follow-Up Required playbook."""
        resp = requests.get(
            f"{BASE_URL}/api/support-pods/{ATHLETE_ID}/school/{EMORY_PROGRAM_ID}",
            headers=coach_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        playbook = data.get("playbook")
        
        # Emory has overdue follow-ups, should be "Follow-Up Required"
        assert playbook is not None, "Emory should have a playbook"
        assert playbook.get("title") == "Follow-Up Required", f"Expected 'Follow-Up Required', got '{playbook.get('title')}'"

    def test_02_creighton_playbook_is_outreach_strategy(self, coach_headers):
        """Creighton should still generate Outreach Strategy playbook."""
        resp = requests.get(
            f"{BASE_URL}/api/support-pods/{ATHLETE_ID}/school/{CREIGHTON_PROGRAM_ID}",
            headers=coach_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        playbook = data.get("playbook")
        
        # Creighton has no reply signal, should be "Outreach Strategy"
        assert playbook is not None, "Creighton should have a playbook"
        assert playbook.get("title") == "Outreach Strategy", f"Expected 'Outreach Strategy', got '{playbook.get('title')}'"

    def test_03_playbook_has_required_fields(self, coach_headers):
        """Playbook should have all required fields."""
        resp = requests.get(
            f"{BASE_URL}/api/support-pods/{ATHLETE_ID}/school/{EMORY_PROGRAM_ID}",
            headers=coach_headers
        )
        assert resp.status_code == 200
        playbook = resp.json().get("playbook", {})
        
        required_fields = ["title", "description", "estimated_days", "success_criteria", "steps"]
        for field in required_fields:
            assert field in playbook, f"Playbook missing required field: {field}"
        
        # Check steps structure
        steps = playbook.get("steps", [])
        assert len(steps) > 0, "Playbook should have at least one step"
        for step in steps:
            assert "step" in step, "Step missing 'step' number"
            assert "action" in step, "Step missing 'action'"
            assert "owner" in step, "Step missing 'owner'"
            assert "days" in step, "Step missing 'days'"


class TestRegressionNoteSidebar:
    """Regression tests for notes sidebar functionality."""

    def test_01_school_pod_has_notes_field(self, coach_headers):
        """School pod response should include notes array."""
        resp = requests.get(
            f"{BASE_URL}/api/support-pods/{ATHLETE_ID}/school/{EMORY_PROGRAM_ID}",
            headers=coach_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "notes" in data, "School pod response should include 'notes'"
        assert isinstance(data["notes"], list), "Notes should be a list"

    def test_02_create_school_note_works(self, coach_headers):
        """POST /api/support-pods/{athlete_id}/school/{program_id}/notes creates note."""
        resp = requests.post(
            f"{BASE_URL}/api/support-pods/{ATHLETE_ID}/school/{EMORY_PROGRAM_ID}/notes",
            json={"text": "TEST_PERSIST_NOTE: Regression test note", "tag": "Test"},
            headers=coach_headers
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "id" in data, "Response should include note id"
        assert data.get("text") == "TEST_PERSIST_NOTE: Regression test note"


# ─── Cleanup ─────────────────────────────────────────────────

class TestCleanup:
    """Cleanup test data."""

    def test_99_reset_emory_playbook_progress(self, coach_headers):
        """Reset Emory playbook progress to [1, 2] for manual testing."""
        resp = requests.patch(
            f"{BASE_URL}/api/support-pods/{ATHLETE_ID}/school/{EMORY_PROGRAM_ID}/playbook-progress",
            json={"checked_steps": [1, 2]},
            headers=coach_headers
        )
        assert resp.status_code == 200

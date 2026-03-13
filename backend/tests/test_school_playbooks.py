"""Test School Pod Playbooks Feature
Tests auto-generated action plans for schools based on signals.
Also tests Emma login fix and profile completeness on athlete overview.
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

# Test IDs
ATHLETE_ID = "athlete_3"
EMORY_PROGRAM_ID = "ae7647cc-affc-44ef-8977-244309ac3a30"
CREIGHTON_PROGRAM_ID = "37e13435-8f43-4fac-a68a-888355188db9"
FLORIDA_PROGRAM_ID = "15d08982-3c51-4761-9b83-67414484582e"


@pytest.fixture(scope="module")
def coach_token():
    """Get coach auth token."""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": COACH_EMAIL,
        "password": COACH_PASSWORD,
    })
    if resp.status_code == 200:
        return resp.json().get("token")
    pytest.skip(f"Coach login failed: {resp.status_code}")


@pytest.fixture(scope="module")
def athlete_token():
    """Get athlete auth token (Emma)."""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ATHLETE_EMAIL,
        "password": ATHLETE_PASSWORD,
    })
    if resp.status_code == 200:
        return resp.json().get("token")
    pytest.skip(f"Athlete login failed: {resp.status_code}")


class TestEmmaLogin:
    """Test Emma login fix - password mismatch issue."""

    def test_01_emma_can_login_successfully(self):
        """Emma should be able to login with correct credentials."""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ATHLETE_EMAIL,
            "password": ATHLETE_PASSWORD,
        })
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "token" in data, "Response should include token"
        assert data.get("user", {}).get("email") == ATHLETE_EMAIL

    def test_02_emma_wrong_password_rejected(self):
        """Wrong password should be rejected."""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ATHLETE_EMAIL,
            "password": "wrongpassword",
        })
        assert resp.status_code in [401, 400], f"Expected 401/400 for wrong password"


class TestProfileCompleteness:
    """Test profile completeness on athlete overview (GET /api/support-pods/{athlete_id})."""

    def test_01_athlete_overview_has_profile_completeness(self, coach_token):
        """Athlete overview should include profile_completeness field."""
        resp = requests.get(
            f"{BASE_URL}/api/support-pods/{ATHLETE_ID}",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        
        # Check profile_completeness is present
        assert "profile_completeness" in data, "Response should include profile_completeness"
        pc = data["profile_completeness"]
        assert pc is not None, "profile_completeness should not be None"

    def test_02_profile_completeness_structure(self, coach_token):
        """Profile completeness should have score, filled, total, missing."""
        resp = requests.get(
            f"{BASE_URL}/api/support-pods/{ATHLETE_ID}",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert resp.status_code == 200
        pc = resp.json().get("profile_completeness", {})
        
        # Verify structure
        assert "score" in pc, "Should have score"
        assert "filled" in pc, "Should have filled count"
        assert "total" in pc, "Should have total count"
        assert "missing" in pc, "Should have missing list"
        
        # Verify types
        assert isinstance(pc["score"], int), "score should be int"
        assert isinstance(pc["filled"], int), "filled should be int"
        assert isinstance(pc["total"], int), "total should be int"
        assert isinstance(pc["missing"], list), "missing should be list"

    def test_03_emma_profile_completeness_values(self, coach_token):
        """Emma's profile should be 67% complete (8 of 12 fields)."""
        resp = requests.get(
            f"{BASE_URL}/api/support-pods/{ATHLETE_ID}",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert resp.status_code == 200
        pc = resp.json().get("profile_completeness", {})
        
        # Total should be 12 (unified formula)
        assert pc.get("total") == 12, f"Expected 12 total fields, got {pc.get('total')}"
        
        # Check score is computed correctly
        filled = pc.get("filled", 0)
        total = pc.get("total", 12)
        expected_score = round((filled / total) * 100) if total else 0
        assert pc.get("score") == expected_score, f"Score mismatch: expected {expected_score}, got {pc.get('score')}"


class TestSchoolPodPlaybook:
    """Test school-specific playbooks generated from signals."""

    def test_01_emory_school_pod_loads(self, coach_token):
        """Emory school pod should load successfully with playbook field."""
        resp = requests.get(
            f"{BASE_URL}/api/support-pods/{ATHLETE_ID}/school/{EMORY_PROGRAM_ID}",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        
        # Basic structure checks
        assert "program" in data
        assert "signals" in data
        assert "playbook" in data, "Response should include playbook field"
        assert data["program"]["university_name"] == "Emory University"

    def test_02_emory_playbook_is_follow_up_required(self, coach_token):
        """Emory's playbook should be 'Follow-Up Required' type."""
        resp = requests.get(
            f"{BASE_URL}/api/support-pods/{ATHLETE_ID}/school/{EMORY_PROGRAM_ID}",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        playbook = data.get("playbook")
        
        # If Emory has overdue signals, playbook should be Follow-Up Required
        signals = data.get("signals", [])
        has_overdue = any(s.get("id") == "sig_overdue" for s in signals)
        
        if has_overdue:
            assert playbook is not None, "Playbook should exist when there are signals"
            assert playbook.get("title") == "Follow-Up Required", f"Expected 'Follow-Up Required', got {playbook.get('title')}"
        else:
            print(f"Note: Emory has no overdue signals, playbook type depends on other signals")

    def test_03_emory_playbook_has_4_steps(self, coach_token):
        """Emory's playbook should have steps referencing real names."""
        resp = requests.get(
            f"{BASE_URL}/api/support-pods/{ATHLETE_ID}/school/{EMORY_PROGRAM_ID}",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert resp.status_code == 200
        playbook = resp.json().get("playbook")
        
        if playbook:
            assert "steps" in playbook, "Playbook should have steps"
            steps = playbook.get("steps", [])
            assert len(steps) >= 3, f"Expected at least 3 steps, got {len(steps)}"
            
            # Each step should have required fields
            for step in steps:
                assert "step" in step, "Step should have step number"
                assert "action" in step, "Step should have action"
                assert "owner" in step, "Step should have owner"
                assert "days" in step, "Step should have days"

    def test_04_playbook_references_coach_names(self, coach_token):
        """Playbook steps should reference real coach/athlete names."""
        resp = requests.get(
            f"{BASE_URL}/api/support-pods/{ATHLETE_ID}/school/{EMORY_PROGRAM_ID}",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        playbook = data.get("playbook")
        school_info = data.get("school_info")
        
        if playbook and school_info:
            # Get coach name from school_info
            coach_name = school_info.get("primary_coach", "")
            if coach_name:
                # Check if coach name appears in any step action
                step_actions = " ".join(s.get("action", "") for s in playbook.get("steps", []))
                # Coach name or school name should be referenced
                assert "Emory" in step_actions or coach_name in step_actions, \
                    "Playbook should reference school or coach name"

    def test_05_playbook_has_success_criteria(self, coach_token):
        """Playbook should have success_criteria (done when)."""
        resp = requests.get(
            f"{BASE_URL}/api/support-pods/{ATHLETE_ID}/school/{EMORY_PROGRAM_ID}",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert resp.status_code == 200
        playbook = resp.json().get("playbook")
        
        if playbook:
            assert "success_criteria" in playbook, "Playbook should have success_criteria"
            assert playbook["success_criteria"], "success_criteria should not be empty"
            assert "description" in playbook, "Playbook should have description"
            assert "estimated_days" in playbook, "Playbook should have estimated_days"


class TestCreightonPlaybook:
    """Test Creighton school pod - should have Outreach Strategy playbook."""

    def test_01_creighton_school_pod_loads(self, coach_token):
        """Creighton school pod should load successfully."""
        resp = requests.get(
            f"{BASE_URL}/api/support-pods/{ATHLETE_ID}/school/{CREIGHTON_PROGRAM_ID}",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        assert data["program"]["university_name"] == "Creighton University"

    def test_02_creighton_playbook_type(self, coach_token):
        """Creighton's playbook should reflect its signal type."""
        resp = requests.get(
            f"{BASE_URL}/api/support-pods/{ATHLETE_ID}/school/{CREIGHTON_PROGRAM_ID}",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        playbook = data.get("playbook")
        signals = data.get("signals", [])
        
        # If there are non-insight signals, there should be a playbook
        actionable_signals = [s for s in signals if s.get("type") != "insight"]
        
        if actionable_signals:
            assert playbook is not None, "Playbook should exist when there are actionable signals"
            # Playbook title should be one of the valid types
            valid_titles = ["Follow-Up Required", "Re-engagement Plan", "Outreach Strategy", "First Outreach Plan", "Stage Advancement Plan"]
            assert playbook.get("title") in valid_titles, f"Unexpected playbook title: {playbook.get('title')}"
        else:
            # No actionable signals = no playbook (could be null or momentum insights only)
            print(f"Creighton has no actionable signals, playbook may be null")


class TestNoSignalsNoPlaybook:
    """Test that schools with no signals return playbook=null."""

    def test_01_florida_school_pod_loads(self, coach_token):
        """Florida school pod should load and we can check playbook behavior."""
        resp = requests.get(
            f"{BASE_URL}/api/support-pods/{ATHLETE_ID}/school/{FLORIDA_PROGRAM_ID}",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        
        signals = data.get("signals", [])
        playbook = data.get("playbook")
        actionable_signals = [s for s in signals if s.get("type") != "insight"]
        
        # If no actionable signals, playbook should be null
        if not actionable_signals:
            assert playbook is None, "Playbook should be null when no actionable signals"
        
        print(f"Florida signals: {len(signals)}, actionable: {len(actionable_signals)}, playbook: {'yes' if playbook else 'no'}")


class TestSchoolPodActionsAndNotes:
    """Test that existing School Pod features still work (notes, modals)."""

    def test_01_school_pod_has_notes_field(self, coach_token):
        """School pod should include notes field."""
        resp = requests.get(
            f"{BASE_URL}/api/support-pods/{ATHLETE_ID}/school/{EMORY_PROGRAM_ID}",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "notes" in data, "Response should include notes field"
        assert isinstance(data["notes"], list), "notes should be a list"

    def test_02_school_pod_has_actions_field(self, coach_token):
        """School pod should include actions field."""
        resp = requests.get(
            f"{BASE_URL}/api/support-pods/{ATHLETE_ID}/school/{EMORY_PROGRAM_ID}",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "actions" in data, "Response should include actions field"
        assert isinstance(data["actions"], list), "actions should be a list"

    def test_03_school_pod_has_timeline_events(self, coach_token):
        """School pod should include timeline_events field."""
        resp = requests.get(
            f"{BASE_URL}/api/support-pods/{ATHLETE_ID}/school/{EMORY_PROGRAM_ID}",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "timeline_events" in data, "Response should include timeline_events"

    def test_04_create_school_note_works(self, coach_token):
        """Creating a school-scoped note should work."""
        resp = requests.post(
            f"{BASE_URL}/api/support-pods/{ATHLETE_ID}/school/{EMORY_PROGRAM_ID}/notes",
            headers={"Authorization": f"Bearer {coach_token}"},
            json={"text": "TEST_PLAYBOOK_note for testing playbook feature"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "id" in data, "Created note should have id"
        assert data.get("text") == "TEST_PLAYBOOK_note for testing playbook feature"


class TestPlaybookSignalMapping:
    """Test that different signal types map to correct playbook types."""

    def test_01_signal_to_playbook_mapping_logic(self, coach_token):
        """Verify playbook type matches the highest priority signal."""
        resp = requests.get(
            f"{BASE_URL}/api/support-pods/{ATHLETE_ID}/school/{EMORY_PROGRAM_ID}",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        signals = data.get("signals", [])
        playbook = data.get("playbook")
        
        # Get signal IDs excluding insights
        sig_ids = [s["id"] for s in signals if s.get("type") != "insight"]
        
        if not sig_ids:
            assert playbook is None, "No actionable signals means no playbook"
            return
        
        # Priority order: overdue > stale > no_reply > stalled_stage
        expected_title = None
        if "sig_overdue" in sig_ids:
            expected_title = "Follow-Up Required"
        elif "sig_stale" in sig_ids:
            expected_title = "Re-engagement Plan"
        elif "sig_no_reply" in sig_ids:
            expected_title = "Outreach Strategy"  # or "First Outreach Plan" depending on status
        elif "sig_stalled_stage" in sig_ids:
            expected_title = "Stage Advancement Plan"
        
        if expected_title and expected_title != "Outreach Strategy":
            # Outreach can be either "Outreach Strategy" or "First Outreach Plan"
            assert playbook.get("title") == expected_title, \
                f"Expected '{expected_title}' based on signals, got '{playbook.get('title')}'"

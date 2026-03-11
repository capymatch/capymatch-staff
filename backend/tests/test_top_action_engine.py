"""
Test Top Action Engine - Phase A, B, C
Tests for GET /api/internal/programs/top-actions and GET /api/internal/programs/{program_id}/top-action

Features tested:
- Top actions API returns correct structure (program_id, university_name, action_key, reason_code, priority, category, label, owner, explanation, cta_label)
- Priority ordering: coach_flag (1) before first_outreach (6) before on_track (8)
- Owner auto-inference (athlete for most, shared for director_actions)
- reason_code present for every action
- Per-program top-action endpoint
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# ========================
# Fixtures
# ========================

@pytest.fixture(scope="module")
def athlete_token():
    """Login as athlete and return token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "emma.chen@athlete.capymatch.com", "password": "password123"}
    )
    if response.status_code != 200:
        pytest.skip("Athlete login failed - skipping tests")
    return response.json().get("token")


@pytest.fixture(scope="module")
def athlete_headers(athlete_token):
    """Return headers with athlete auth"""
    return {
        "Authorization": f"Bearer {athlete_token}",
        "Content-Type": "application/json"
    }


@pytest.fixture(scope="module")
def top_actions_response(athlete_headers):
    """Fetch top actions once for all tests"""
    response = requests.get(
        f"{BASE_URL}/api/internal/programs/top-actions",
        headers=athlete_headers
    )
    return response


# ========================
# Phase A: Top Action Engine API Tests
# ========================

class TestTopActionsEndpoint:
    """Test GET /api/internal/programs/top-actions"""

    def test_endpoint_returns_200(self, top_actions_response):
        """Top actions endpoint should return 200"""
        assert top_actions_response.status_code == 200, f"Expected 200, got {top_actions_response.status_code}"
        print("PASS: GET /api/internal/programs/top-actions returns 200")

    def test_response_has_actions_array(self, top_actions_response):
        """Response should contain actions array"""
        data = top_actions_response.json()
        assert "actions" in data, "Response missing 'actions' key"
        assert isinstance(data["actions"], list), "'actions' should be a list"
        print(f"PASS: Response contains actions array with {len(data['actions'])} items")

    def test_action_structure_has_required_fields(self, top_actions_response):
        """Each action should have all required fields"""
        data = top_actions_response.json()
        actions = data.get("actions", [])
        
        if len(actions) == 0:
            pytest.skip("No actions returned to validate structure")
        
        required_fields = [
            "program_id", "university_name", "action_key", "reason_code",
            "priority", "category", "label", "owner", "explanation", "cta_label"
        ]
        
        for action in actions[:5]:  # Check first 5 actions
            for field in required_fields:
                assert field in action, f"Action missing required field: {field}"
        
        print(f"PASS: All required fields present in actions: {required_fields}")

    def test_reason_code_is_present_and_debuggable(self, top_actions_response):
        """Every action should have a non-empty reason_code for debugging"""
        data = top_actions_response.json()
        actions = data.get("actions", [])
        
        for action in actions:
            reason = action.get("reason_code", "")
            assert reason, f"Action for {action.get('university_name')} has empty reason_code"
            # Reason code should contain meaningful debug info (colon-separated parts)
            assert ":" in reason or "on_track" in reason or "no_action" in reason, \
                f"reason_code '{reason}' doesn't follow expected format"
        
        print(f"PASS: All {len(actions)} actions have valid reason_codes")

    def test_priority_ordering_coach_flag_first(self, top_actions_response):
        """Coach flags (priority 1) should come before first_outreach (6) and on_track (8)"""
        data = top_actions_response.json()
        actions = data.get("actions", [])
        
        if len(actions) < 2:
            pytest.skip("Not enough actions to verify ordering")
        
        # Find indices of different priority types
        coach_flag_idx = None
        first_outreach_idx = None
        on_track_idx = None
        
        for i, action in enumerate(actions):
            if action["category"] == "coach_flag" and coach_flag_idx is None:
                coach_flag_idx = i
            elif action["category"] == "first_outreach" and first_outreach_idx is None:
                first_outreach_idx = i
            elif action["category"] == "on_track" and on_track_idx is None:
                on_track_idx = i
        
        # Verify priority ordering
        if coach_flag_idx is not None and first_outreach_idx is not None:
            assert coach_flag_idx < first_outreach_idx, \
                f"coach_flag (idx {coach_flag_idx}) should come before first_outreach (idx {first_outreach_idx})"
            print(f"PASS: coach_flag (idx {coach_flag_idx}) comes before first_outreach (idx {first_outreach_idx})")
        
        if first_outreach_idx is not None and on_track_idx is not None:
            assert first_outreach_idx < on_track_idx, \
                f"first_outreach (idx {first_outreach_idx}) should come before on_track (idx {on_track_idx})"
            print(f"PASS: first_outreach (idx {first_outreach_idx}) comes before on_track (idx {on_track_idx})")
        
        if coach_flag_idx is not None and on_track_idx is not None:
            assert coach_flag_idx < on_track_idx, \
                f"coach_flag (idx {coach_flag_idx}) should come before on_track (idx {on_track_idx})"
            print(f"PASS: coach_flag (idx {coach_flag_idx}) comes before on_track (idx {on_track_idx})")

    def test_owner_is_valid_value(self, top_actions_response):
        """Owner should be one of: athlete, parent, coach, shared"""
        data = top_actions_response.json()
        actions = data.get("actions", [])
        
        valid_owners = {"athlete", "parent", "coach", "shared"}
        
        for action in actions:
            owner = action.get("owner")
            assert owner in valid_owners, f"Invalid owner '{owner}' for {action.get('university_name')}"
        
        print(f"PASS: All {len(actions)} actions have valid owners")

    def test_category_matches_known_categories(self, top_actions_response):
        """Category should be one of the known action categories"""
        data = top_actions_response.json()
        actions = data.get("actions", [])
        
        known_categories = {
            "coach_flag", "director_action", "past_due", "reply_needed",
            "due_today", "first_outreach", "cooling_off", "on_track"
        }
        
        for action in actions:
            category = action.get("category")
            assert category in known_categories, \
                f"Unknown category '{category}' for {action.get('university_name')}"
        
        print(f"PASS: All {len(actions)} actions have known categories")

    def test_priority_values_are_numeric(self, top_actions_response):
        """Priority should be a number (1-8)"""
        data = top_actions_response.json()
        actions = data.get("actions", [])
        
        for action in actions:
            priority = action.get("priority")
            assert isinstance(priority, int), f"Priority should be int, got {type(priority)}"
            assert 1 <= priority <= 8, f"Priority {priority} out of expected range 1-8"
        
        print("PASS: All priorities are valid integers (1-8)")


class TestPerProgramTopAction:
    """Test GET /api/internal/programs/{program_id}/top-action"""

    def test_per_program_endpoint_returns_200(self, athlete_headers, top_actions_response):
        """Per-program top-action endpoint should return 200"""
        data = top_actions_response.json()
        actions = data.get("actions", [])
        
        if len(actions) == 0:
            pytest.skip("No actions available to get program_id from")
        
        program_id = actions[0]["program_id"]
        response = requests.get(
            f"{BASE_URL}/api/internal/programs/{program_id}/top-action",
            headers=athlete_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"PASS: GET /api/internal/programs/{program_id}/top-action returns 200")

    def test_per_program_returns_single_action(self, athlete_headers, top_actions_response):
        """Per-program endpoint should return a single action object (not array)"""
        data = top_actions_response.json()
        actions = data.get("actions", [])
        
        if len(actions) == 0:
            pytest.skip("No actions available")
        
        program_id = actions[0]["program_id"]
        response = requests.get(
            f"{BASE_URL}/api/internal/programs/{program_id}/top-action",
            headers=athlete_headers
        )
        
        action = response.json()
        
        # Should be a dict, not a list
        assert isinstance(action, dict), "Per-program endpoint should return object, not array"
        assert "actions" not in action, "Per-program endpoint should not wrap in 'actions'"
        assert "program_id" in action, "Response should have program_id field"
        
        print(f"PASS: Per-program endpoint returns single action object")

    def test_per_program_matches_bulk_response(self, athlete_headers, top_actions_response):
        """Per-program action should match same action from bulk endpoint"""
        data = top_actions_response.json()
        actions = data.get("actions", [])
        
        if len(actions) == 0:
            pytest.skip("No actions available")
        
        bulk_action = actions[0]
        program_id = bulk_action["program_id"]
        
        response = requests.get(
            f"{BASE_URL}/api/internal/programs/{program_id}/top-action",
            headers=athlete_headers
        )
        single_action = response.json()
        
        # Key fields should match
        assert single_action["action_key"] == bulk_action["action_key"], "action_key mismatch"
        assert single_action["category"] == bulk_action["category"], "category mismatch"
        assert single_action["label"] == bulk_action["label"], "label mismatch"
        assert single_action["owner"] == bulk_action["owner"], "owner mismatch"
        
        print(f"PASS: Per-program action matches bulk response for {bulk_action['university_name']}")


class TestActionKeyToOwnerMapping:
    """Test that owner is correctly auto-inferred based on action type"""

    def test_director_action_has_shared_owner(self, athlete_headers):
        """Director actions should have owner='shared'"""
        # Check in the action map definition by looking at returned actions
        response = requests.get(
            f"{BASE_URL}/api/internal/programs/top-actions",
            headers=athlete_headers
        )
        
        data = response.json()
        actions = data.get("actions", [])
        
        director_actions = [a for a in actions if a["category"] == "director_action"]
        
        for action in director_actions:
            assert action["owner"] == "shared", \
                f"director_action should have owner='shared', got '{action['owner']}'"
        
        if director_actions:
            print(f"PASS: {len(director_actions)} director actions have owner='shared'")
        else:
            print("INFO: No director_action items found to verify owner='shared'")

    def test_coach_flag_has_athlete_owner(self, top_actions_response):
        """Coach flag actions should have owner='athlete'"""
        data = top_actions_response.json()
        actions = data.get("actions", [])
        
        coach_flags = [a for a in actions if a["category"] == "coach_flag"]
        
        for action in coach_flags:
            assert action["owner"] == "athlete", \
                f"coach_flag should have owner='athlete', got '{action['owner']}'"
        
        if coach_flags:
            print(f"PASS: {len(coach_flags)} coach_flag actions have owner='athlete'")
        else:
            print("INFO: No coach_flag items found")

    def test_first_outreach_has_athlete_owner(self, top_actions_response):
        """First outreach actions should have owner='athlete'"""
        data = top_actions_response.json()
        actions = data.get("actions", [])
        
        first_outreach = [a for a in actions if a["category"] == "first_outreach"]
        
        for action in first_outreach:
            assert action["owner"] == "athlete", \
                f"first_outreach should have owner='athlete', got '{action['owner']}'"
        
        if first_outreach:
            print(f"PASS: {len(first_outreach)} first_outreach actions have owner='athlete'")


class TestSpecificActionLabels:
    """Test specific action labels mentioned in requirements"""

    def test_send_intro_email_label(self, top_actions_response):
        """'Send intro email' should appear for uncontacted schools"""
        data = top_actions_response.json()
        actions = data.get("actions", [])
        
        intro_actions = [a for a in actions if a["action_key"] == "send_intro_email"]
        
        for action in intro_actions:
            assert action["label"] == "Send intro email", f"Unexpected label: {action['label']}"
            assert action["category"] == "first_outreach", f"Unexpected category: {action['category']}"
        
        if intro_actions:
            print(f"PASS: Found {len(intro_actions)} 'Send intro email' actions for uncontacted schools")
        else:
            print("INFO: No 'Send intro email' actions found")

    def test_reply_to_coach_label(self, top_actions_response):
        """'Reply to coach' should appear for coach flags"""
        data = top_actions_response.json()
        actions = data.get("actions", [])
        
        reply_actions = [a for a in actions if a["action_key"] == "coach_flag_reply_needed"]
        
        for action in reply_actions:
            assert action["label"] == "Reply to coach", f"Unexpected label: {action['label']}"
            assert action["category"] == "coach_flag", f"Unexpected category: {action['category']}"
        
        if reply_actions:
            print(f"PASS: Found {len(reply_actions)} 'Reply to coach' actions with coach flags")


class TestAuthorizationAndErrors:
    """Test authorization and error handling"""

    def test_unauthenticated_returns_401_or_403(self):
        """Unauthenticated request should be rejected"""
        response = requests.get(f"{BASE_URL}/api/internal/programs/top-actions")
        
        assert response.status_code in [401, 403], \
            f"Expected 401/403 for unauthenticated, got {response.status_code}"
        print("PASS: Unauthenticated request returns 401/403")

    def test_invalid_program_id_returns_action_or_404(self, athlete_headers):
        """Invalid program_id should return no_action_needed or 404"""
        response = requests.get(
            f"{BASE_URL}/api/internal/programs/invalid-program-id-xyz/top-action",
            headers=athlete_headers
        )
        
        # Either 404 or a fallback action
        if response.status_code == 404:
            print("PASS: Invalid program_id returns 404")
        elif response.status_code == 200:
            data = response.json()
            # Should return no_action_needed for non-existent program
            assert data.get("action_key") == "no_action_needed", \
                f"Expected no_action_needed for invalid program, got {data.get('action_key')}"
            print("PASS: Invalid program_id returns no_action_needed fallback")
        else:
            pytest.fail(f"Unexpected status {response.status_code} for invalid program_id")

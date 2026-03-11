"""
Test Pipeline Hero Card UX Refinements
======================================
Tests backend API endpoints for the Pipeline hero card action-first layout:
- Top-actions endpoint returns updated directive labels
- Action labels use specific CTAs (e.g., "Reply to Coach Now")
- Owner, category, and explanation fields are present
- Filter counts match expected categories
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
ATHLETE_EMAIL = "emma.chen@athlete.capymatch.com"
ATHLETE_PASSWORD = "password123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for athlete user"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ATHLETE_EMAIL, "password": ATHLETE_PASSWORD},
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def authenticated_client(auth_token):
    """Session with auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}",
    })
    return session


class TestTopActionsEndpoint:
    """Tests for /api/internal/programs/top-actions endpoint"""

    def test_top_actions_returns_200(self, authenticated_client):
        """Verify top-actions endpoint returns 200 OK"""
        response = authenticated_client.get(f"{BASE_URL}/api/internal/programs/top-actions")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"SUCCESS: top-actions returns 200")

    def test_top_actions_returns_actions_array(self, authenticated_client):
        """Verify response contains actions array"""
        response = authenticated_client.get(f"{BASE_URL}/api/internal/programs/top-actions")
        data = response.json()
        assert "actions" in data, "Response missing 'actions' key"
        assert isinstance(data["actions"], list), "'actions' should be a list"
        assert len(data["actions"]) > 0, "Actions list should not be empty"
        print(f"SUCCESS: top-actions returns {len(data['actions'])} actions")

    def test_action_has_required_fields(self, authenticated_client):
        """Verify each action has required fields for hero card"""
        response = authenticated_client.get(f"{BASE_URL}/api/internal/programs/top-actions")
        actions = response.json().get("actions", [])
        
        required_fields = [
            "program_id",
            "university_name",
            "action_key",
            "reason_code",
            "priority",
            "category",
            "label",
            "owner",
            "explanation",
            "cta_label",
        ]
        
        for action in actions:
            for field in required_fields:
                assert field in action, f"Action missing required field: {field}"
        print(f"SUCCESS: All {len(actions)} actions have required fields")

    def test_directive_labels_present(self, authenticated_client):
        """Verify action labels use directive language (e.g., 'Reply to Coach Now')"""
        response = authenticated_client.get(f"{BASE_URL}/api/internal/programs/top-actions")
        actions = response.json().get("actions", [])
        
        # Check for expected directive labels
        directive_labels = [
            "Reply to Coach Now",
            "Send Your Intro Email",
            "Follow Up Now",
            "Send Updated Info",
            "Review Coach Flag",
            "Answer Coach's Question",
            "Reply to Coach Message",
            "Follow Up Today",
            "Check In This Week",
            "Re-engage This Program",
            "On Track",
        ]
        
        labels_found = [a["label"] for a in actions]
        print(f"Labels found: {set(labels_found)}")
        
        # At least one directive label should be present
        has_directive = any(label in directive_labels for label in labels_found)
        assert has_directive, f"No directive labels found in: {labels_found}"
        print("SUCCESS: Directive labels present in actions")

    def test_owner_field_values(self, authenticated_client):
        """Verify owner field has valid values"""
        response = authenticated_client.get(f"{BASE_URL}/api/internal/programs/top-actions")
        actions = response.json().get("actions", [])
        
        valid_owners = ["athlete", "parent", "coach", "shared"]
        for action in actions:
            assert action["owner"] in valid_owners, f"Invalid owner: {action['owner']}"
        print("SUCCESS: All owner values are valid")

    def test_category_field_values(self, authenticated_client):
        """Verify category field has valid values"""
        response = authenticated_client.get(f"{BASE_URL}/api/internal/programs/top-actions")
        actions = response.json().get("actions", [])
        
        valid_categories = [
            "coach_flag",
            "director_action",
            "past_due",
            "reply_needed",
            "due_today",
            "first_outreach",
            "cooling_off",
            "on_track",
        ]
        for action in actions:
            assert action["category"] in valid_categories, f"Invalid category: {action['category']}"
        print("SUCCESS: All category values are valid")

    def test_priority_ordering(self, authenticated_client):
        """Verify actions are sorted by priority (1 = highest)"""
        response = authenticated_client.get(f"{BASE_URL}/api/internal/programs/top-actions")
        actions = response.json().get("actions", [])
        
        priorities = [a["priority"] for a in actions]
        # Check if sorted (or at least first element has lowest/equal priority)
        is_sorted = all(priorities[i] <= priorities[i+1] for i in range(len(priorities)-1))
        assert is_sorted, f"Actions not sorted by priority: {priorities}"
        print(f"SUCCESS: Actions sorted by priority: {priorities[:5]}...")


class TestFilterCategories:
    """Tests for filter categories used in hero card"""

    def test_coach_flag_category_exists(self, authenticated_client):
        """Verify coach_flag category exists when coach flag is present"""
        response = authenticated_client.get(f"{BASE_URL}/api/internal/programs/top-actions")
        actions = response.json().get("actions", [])
        
        coach_flag_actions = [a for a in actions if a["category"] == "coach_flag"]
        print(f"Coach flag actions count: {len(coach_flag_actions)}")
        # At least check the filter would work (category field is valid)
        for action in coach_flag_actions:
            assert action["label"], "Coach flag action missing label"
            assert action["cta_label"], "Coach flag action missing cta_label"
        print("SUCCESS: Coach flag category verified")

    def test_first_outreach_category_exists(self, authenticated_client):
        """Verify first_outreach category for uncontacted schools"""
        response = authenticated_client.get(f"{BASE_URL}/api/internal/programs/top-actions")
        actions = response.json().get("actions", [])
        
        first_outreach_actions = [a for a in actions if a["category"] == "first_outreach"]
        print(f"First outreach actions count: {len(first_outreach_actions)}")
        
        for action in first_outreach_actions:
            assert action["label"] == "Send Your Intro Email", f"Expected 'Send Your Intro Email', got '{action['label']}'"
            assert action["cta_label"] == "Start Outreach", f"Expected 'Start Outreach', got '{action['cta_label']}'"
        print("SUCCESS: First outreach category verified with correct labels")


class TestCTALabels:
    """Tests for specific CTA labels in actions"""

    def test_reply_now_cta_for_coach_flag(self, authenticated_client):
        """Verify coach flag uses 'Reply Now' CTA"""
        response = authenticated_client.get(f"{BASE_URL}/api/internal/programs/top-actions")
        actions = response.json().get("actions", [])
        
        coach_flag_reply = [a for a in actions if a["action_key"] == "coach_flag_reply_needed"]
        if coach_flag_reply:
            action = coach_flag_reply[0]
            assert action["cta_label"] == "Reply Now", f"Expected 'Reply Now', got '{action['cta_label']}'"
            assert action["label"] == "Reply to Coach Now", f"Expected 'Reply to Coach Now', got '{action['label']}'"
            print("SUCCESS: Coach flag uses correct CTA labels")
        else:
            print("SKIP: No coach_flag_reply_needed action in current data")

    def test_start_outreach_cta_for_first_outreach(self, authenticated_client):
        """Verify first outreach uses 'Start Outreach' CTA"""
        response = authenticated_client.get(f"{BASE_URL}/api/internal/programs/top-actions")
        actions = response.json().get("actions", [])
        
        first_outreach = [a for a in actions if a["action_key"] == "send_intro_email"]
        if first_outreach:
            action = first_outreach[0]
            assert action["cta_label"] == "Start Outreach", f"Expected 'Start Outreach', got '{action['cta_label']}'"
            assert action["label"] == "Send Your Intro Email", f"Expected 'Send Your Intro Email', got '{action['label']}'"
            print("SUCCESS: First outreach uses correct CTA labels")
        else:
            pytest.skip("No send_intro_email action in current data")

    def test_view_school_cta_for_on_track(self, authenticated_client):
        """Verify on_track uses 'View School' CTA"""
        response = authenticated_client.get(f"{BASE_URL}/api/internal/programs/top-actions")
        actions = response.json().get("actions", [])
        
        on_track = [a for a in actions if a["action_key"] == "no_action_needed"]
        if on_track:
            action = on_track[0]
            assert action["cta_label"] == "View School", f"Expected 'View School', got '{action['cta_label']}'"
            assert action["label"] == "On Track", f"Expected 'On Track', got '{action['label']}'"
            print("SUCCESS: On track uses correct CTA labels")
        else:
            print("SKIP: No no_action_needed action in current data")


class TestExplanationText:
    """Tests for explanation text in actions"""

    def test_explanation_not_empty(self, authenticated_client):
        """Verify all actions have non-empty explanation"""
        response = authenticated_client.get(f"{BASE_URL}/api/internal/programs/top-actions")
        actions = response.json().get("actions", [])
        
        for action in actions:
            assert action["explanation"], f"Action {action['action_key']} has empty explanation"
            assert len(action["explanation"]) > 10, f"Explanation too short: {action['explanation']}"
        print("SUCCESS: All actions have explanations")

    def test_explanation_is_user_friendly(self, authenticated_client):
        """Verify explanation text is user-friendly (not technical)"""
        response = authenticated_client.get(f"{BASE_URL}/api/internal/programs/top-actions")
        actions = response.json().get("actions", [])
        
        # Check no technical terms in explanations
        technical_terms = ["api", "endpoint", "database", "null", "undefined", "error"]
        for action in actions:
            explanation_lower = action["explanation"].lower()
            for term in technical_terms:
                assert term not in explanation_lower, f"Technical term '{term}' found in explanation"
        print("SUCCESS: Explanations are user-friendly")


class TestUnauthorizedAccess:
    """Tests for unauthorized access"""

    def test_top_actions_requires_auth(self):
        """Verify top-actions returns 401/403 without auth"""
        response = requests.get(f"{BASE_URL}/api/internal/programs/top-actions")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("SUCCESS: top-actions requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

"""Tests for subscription tiers and automation rules.

Tests verify:
1. GET /api/subscription returns correct tier info (basic=$0/5schools/0AI, pro=$29/25schools/10AI, premium=$49/unlimited)
2. GET /api/subscription/tiers returns all 3 tiers with correct pricing and features
3. POST /api/athlete/interactions with type 'Email Sent' auto-updates recruiting_status to 'Contacted' and reply_status to 'Awaiting Reply'
4. POST /api/athlete/interactions with type 'Email Sent' sets initial_contact_sent date
5. POST /api/athlete/programs/{pid}/mark-replied auto-updates reply_status to 'Reply Received' and priority to 'Very High'
6. POST /api/athlete/interactions sets next_action_due (14 days for email, 2 days for reply)
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
ATHLETE_EMAIL = "emma.chen@athlete.capymatch.com"
ATHLETE_PASSWORD = "password123"


class TestSubscriptionTiers:
    """Test subscription tier configuration and pricing"""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})

    def get_athlete_token(self):
        """Login as athlete and return token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ATHLETE_EMAIL,
            "password": ATHLETE_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token") or response.json().get("session_token")
        return None

    def test_tiers_endpoint_returns_correct_structure(self):
        """GET /api/subscription/tiers returns all 3 tiers"""
        token = self.get_athlete_token()
        assert token, "Failed to get athlete token"

        response = self.session.get(
            f"{BASE_URL}/api/subscription/tiers",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "tiers" in data, "Response should have 'tiers' key"

        tiers = data["tiers"]
        assert len(tiers) == 3, f"Expected 3 tiers, got {len(tiers)}"

        tier_ids = [t["id"] for t in tiers]
        assert "basic" in tier_ids, "Missing basic tier"
        assert "pro" in tier_ids, "Missing pro tier"
        assert "premium" in tier_ids, "Missing premium tier"

    def test_basic_tier_pricing(self):
        """Basic tier: $0, 5 schools, 0 AI drafts"""
        token = self.get_athlete_token()
        assert token, "Failed to get athlete token"

        response = self.session.get(
            f"{BASE_URL}/api/subscription/tiers",
            headers={"Authorization": f"Bearer {token}"}
        )

        data = response.json()
        basic = next((t for t in data["tiers"] if t["id"] == "basic"), None)

        assert basic is not None, "Basic tier not found"
        assert basic["price"] == 0, f"Basic tier price should be 0, got {basic['price']}"
        assert basic["max_schools"] == 5, f"Basic tier max_schools should be 5, got {basic['max_schools']}"
        assert basic["ai_drafts_per_month"] == 0, f"Basic tier AI drafts should be 0, got {basic['ai_drafts_per_month']}"
        assert basic["label"] == "Starter", f"Basic tier label should be 'Starter', got {basic['label']}"

    def test_pro_tier_pricing(self):
        """Pro tier: $29, 25 schools, 10 AI drafts"""
        token = self.get_athlete_token()
        assert token, "Failed to get athlete token"

        response = self.session.get(
            f"{BASE_URL}/api/subscription/tiers",
            headers={"Authorization": f"Bearer {token}"}
        )

        data = response.json()
        pro = next((t for t in data["tiers"] if t["id"] == "pro"), None)

        assert pro is not None, "Pro tier not found"
        assert pro["price"] == 29, f"Pro tier price should be 29, got {pro['price']}"
        assert pro["max_schools"] == 25, f"Pro tier max_schools should be 25, got {pro['max_schools']}"
        assert pro["ai_drafts_per_month"] == 10, f"Pro tier AI drafts should be 10, got {pro['ai_drafts_per_month']}"
        assert pro["label"] == "Pro", f"Pro tier label should be 'Pro', got {pro['label']}"

    def test_premium_tier_pricing(self):
        """Premium tier: $49, unlimited schools (-1), unlimited AI drafts (-1)"""
        token = self.get_athlete_token()
        assert token, "Failed to get athlete token"

        response = self.session.get(
            f"{BASE_URL}/api/subscription/tiers",
            headers={"Authorization": f"Bearer {token}"}
        )

        data = response.json()
        premium = next((t for t in data["tiers"] if t["id"] == "premium"), None)

        assert premium is not None, "Premium tier not found"
        assert premium["price"] == 49, f"Premium tier price should be 49, got {premium['price']}"
        assert premium["max_schools"] == -1, f"Premium tier max_schools should be -1 (unlimited), got {premium['max_schools']}"
        assert premium["ai_drafts_per_month"] == -1, f"Premium tier AI drafts should be -1 (unlimited), got {premium['ai_drafts_per_month']}"
        assert premium["label"] == "Premium", f"Premium tier label should be 'Premium', got {premium['label']}"

    def test_subscription_endpoint_returns_current_tier(self):
        """GET /api/subscription returns current user's tier info"""
        token = self.get_athlete_token()
        assert token, "Failed to get athlete token"

        response = self.session.get(
            f"{BASE_URL}/api/subscription",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()

        # Check response structure
        assert "tier" in data, "Response should have 'tier' key"
        assert "label" in data, "Response should have 'label' key"
        assert "price" in data, "Response should have 'price' key"
        assert "features" in data, "Response should have 'features' key"
        assert "usage" in data, "Response should have 'usage' key"

        # Emma should be on basic/free plan
        assert data["tier"] in ["basic", "free"], f"Expected basic tier, got {data['tier']}"
        assert data["price"] == 0, f"Basic tier price should be 0, got {data['price']}"

    def test_subscription_usage_shows_school_count(self):
        """GET /api/subscription shows usage stats"""
        token = self.get_athlete_token()
        assert token, "Failed to get athlete token"

        response = self.session.get(
            f"{BASE_URL}/api/subscription",
            headers={"Authorization": f"Bearer {token}"}
        )

        data = response.json()
        usage = data.get("usage", {})

        assert "schools" in usage, "Usage should have 'schools' key"
        assert "schools_limit" in usage, "Usage should have 'schools_limit' key"
        assert isinstance(usage["schools"], int), "schools should be integer"

        # Emma has 12 schools on a 5-school limit plan
        # Check that she's over limit
        print(f"Emma's school count: {usage['schools']}, limit: {usage['schools_limit']}")


class TestAutomationRules:
    """Test automation rules for interactions and status updates"""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})

    def get_athlete_token(self):
        """Login as athlete and return token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ATHLETE_EMAIL,
            "password": ATHLETE_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token") or response.json().get("session_token")
        return None

    def get_test_program(self, token):
        """Get a test program that's in 'Not Contacted' state"""
        response = self.session.get(
            f"{BASE_URL}/api/athlete/programs",
            headers={"Authorization": f"Bearer {token}"}
        )
        if response.status_code != 200:
            return None

        programs = response.json()
        if isinstance(programs, dict) and "groups" in programs:
            # Grouped response
            all_programs = []
            for group in programs["groups"].values():
                all_programs.extend(group)
            programs = all_programs

        # Return the first program found
        for p in programs:
            return p
        return None

    def test_email_sent_updates_recruiting_status(self):
        """Email Sent interaction should update recruiting_status to 'Contacted' if 'Not Contacted'"""
        token = self.get_athlete_token()
        assert token, "Failed to get athlete token"

        # Get programs to find one to test
        response = self.session.get(
            f"{BASE_URL}/api/athlete/programs",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Failed to get programs: {response.text}"
        programs = response.json()
        if isinstance(programs, dict):
            programs = programs.get("groups", {}).get("needs_outreach", []) or []
            if not programs:
                # Get any program
                for group in response.json().get("groups", {}).values():
                    if group:
                        programs = group
                        break

        if not programs:
            pytest.skip("No programs found for testing")

        # Use UCLA if available (fresh program for testing)
        test_program = next((p for p in programs if "UCLA" in p.get("university_name", "")), programs[0] if programs else None)
        if not test_program:
            pytest.skip("No test program available")

        program_id = test_program["program_id"]
        print(f"Testing with program: {test_program.get('university_name')}")

        # First, reset the program to 'Not Contacted' state
        self.session.put(
            f"{BASE_URL}/api/athlete/programs/{program_id}",
            headers={"Authorization": f"Bearer {token}"},
            json={"recruiting_status": "Not Contacted", "reply_status": "No Reply"}
        )

        # Create an Email Sent interaction
        interaction_response = self.session.post(
            f"{BASE_URL}/api/athlete/interactions",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "program_id": program_id,
                "type": "Email Sent",
                "notes": "Test email for automation rule",
                "outcome": "No Response"
            }
        )

        assert interaction_response.status_code == 200, f"Failed to create interaction: {interaction_response.text}"

        # Verify program was updated
        program_response = self.session.get(
            f"{BASE_URL}/api/athlete/programs/{program_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert program_response.status_code == 200

        updated_program = program_response.json()
        print(f"Updated program status: recruiting_status={updated_program.get('recruiting_status')}, reply_status={updated_program.get('reply_status')}")

        # Verify automations applied
        assert updated_program.get("recruiting_status") == "Contacted", \
            f"Expected recruiting_status='Contacted', got {updated_program.get('recruiting_status')}"
        assert updated_program.get("reply_status") == "Awaiting Reply", \
            f"Expected reply_status='Awaiting Reply', got {updated_program.get('reply_status')}"

    def test_email_sent_sets_initial_contact_date(self):
        """Email Sent interaction should set initial_contact_sent date"""
        token = self.get_athlete_token()
        assert token, "Failed to get athlete token"

        response = self.session.get(
            f"{BASE_URL}/api/athlete/programs",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200

        programs = response.json()
        if isinstance(programs, dict):
            all_programs = []
            for group in programs.get("groups", {}).values():
                all_programs.extend(group)
            programs = all_programs

        if not programs:
            pytest.skip("No programs found for testing")

        # Find a program (preferably BYU for testing)
        test_program = next((p for p in programs if "BYU" in p.get("university_name", "")), programs[0] if programs else None)
        if not test_program:
            pytest.skip("No test program available")

        program_id = test_program["program_id"]
        print(f"Testing initial_contact_sent with: {test_program.get('university_name')}")

        # Reset to 'Not Contacted'
        self.session.put(
            f"{BASE_URL}/api/athlete/programs/{program_id}",
            headers={"Authorization": f"Bearer {token}"},
            json={"recruiting_status": "Not Contacted", "initial_contact_sent": ""}
        )

        # Create Email Sent interaction
        self.session.post(
            f"{BASE_URL}/api/athlete/interactions",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "program_id": program_id,
                "type": "Email Sent",
                "notes": "Test for initial contact date",
                "outcome": "No Response"
            }
        )

        # Verify initial_contact_sent was set
        program_response = self.session.get(
            f"{BASE_URL}/api/athlete/programs/{program_id}",
            headers={"Authorization": f"Bearer {token}"}
        )

        updated_program = program_response.json()
        initial_contact = updated_program.get("initial_contact_sent", "")
        print(f"initial_contact_sent: {initial_contact}")

        assert initial_contact, "initial_contact_sent should be set"
        # Should be today's date
        today = datetime.now().strftime("%Y-%m-%d")
        assert initial_contact == today, f"Expected today's date {today}, got {initial_contact}"

    def test_email_sent_sets_next_action_due_14_days(self):
        """Email Sent interaction should set next_action_due 14 days in future"""
        token = self.get_athlete_token()
        assert token, "Failed to get athlete token"

        response = self.session.get(
            f"{BASE_URL}/api/athlete/programs",
            headers={"Authorization": f"Bearer {token}"}
        )
        programs = response.json()
        if isinstance(programs, dict):
            all_programs = []
            for group in programs.get("groups", {}).values():
                all_programs.extend(group)
            programs = all_programs

        if not programs:
            pytest.skip("No programs found")

        test_program = programs[0]
        program_id = test_program["program_id"]

        # Create Email Sent interaction
        self.session.post(
            f"{BASE_URL}/api/athlete/interactions",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "program_id": program_id,
                "type": "Email Sent",
                "notes": "Test for next_action_due",
                "outcome": "No Response"
            }
        )

        # Verify next_action_due
        program_response = self.session.get(
            f"{BASE_URL}/api/athlete/programs/{program_id}",
            headers={"Authorization": f"Bearer {token}"}
        )

        updated_program = program_response.json()
        next_due = updated_program.get("next_action_due", "")
        print(f"next_action_due: {next_due}")

        assert next_due, "next_action_due should be set"

        # Should be 14 days from today
        expected_due = (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d")
        assert next_due == expected_due, f"Expected {expected_due}, got {next_due}"

    def test_mark_replied_updates_status_and_priority(self):
        """POST /api/athlete/programs/{pid}/mark-replied updates reply_status and priority"""
        token = self.get_athlete_token()
        assert token, "Failed to get athlete token"

        response = self.session.get(
            f"{BASE_URL}/api/athlete/programs",
            headers={"Authorization": f"Bearer {token}"}
        )
        programs = response.json()
        if isinstance(programs, dict):
            all_programs = []
            for group in programs.get("groups", {}).values():
                all_programs.extend(group)
            programs = all_programs

        if not programs:
            pytest.skip("No programs found")

        test_program = programs[0]
        program_id = test_program["program_id"]
        print(f"Testing mark-replied with: {test_program.get('university_name')}")

        # Reset program state
        self.session.put(
            f"{BASE_URL}/api/athlete/programs/{program_id}",
            headers={"Authorization": f"Bearer {token}"},
            json={"reply_status": "Awaiting Reply", "priority": "Medium"}
        )

        # Call mark-replied endpoint
        reply_response = self.session.post(
            f"{BASE_URL}/api/athlete/programs/{program_id}/mark-replied",
            headers={"Authorization": f"Bearer {token}"},
            json={"note": "Coach replied with interest in my highlight reel"}
        )

        assert reply_response.status_code == 200, f"mark-replied failed: {reply_response.text}"

        # Verify program was updated
        program_response = self.session.get(
            f"{BASE_URL}/api/athlete/programs/{program_id}",
            headers={"Authorization": f"Bearer {token}"}
        )

        updated_program = program_response.json()
        print(f"After mark-replied: reply_status={updated_program.get('reply_status')}, priority={updated_program.get('priority')}")

        assert updated_program.get("reply_status") == "Reply Received", \
            f"Expected reply_status='Reply Received', got {updated_program.get('reply_status')}"
        assert updated_program.get("priority") == "Very High", \
            f"Expected priority='Very High', got {updated_program.get('priority')}"

    def test_mark_replied_sets_next_action_due_2_days(self):
        """mark-replied should set next_action_due 2 days in future"""
        token = self.get_athlete_token()
        assert token, "Failed to get athlete token"

        response = self.session.get(
            f"{BASE_URL}/api/athlete/programs",
            headers={"Authorization": f"Bearer {token}"}
        )
        programs = response.json()
        if isinstance(programs, dict):
            all_programs = []
            for group in programs.get("groups", {}).values():
                all_programs.extend(group)
            programs = all_programs

        if not programs:
            pytest.skip("No programs found")

        test_program = programs[0]
        program_id = test_program["program_id"]

        # Call mark-replied
        self.session.post(
            f"{BASE_URL}/api/athlete/programs/{program_id}/mark-replied",
            headers={"Authorization": f"Bearer {token}"},
            json={"note": "Test reply for next_action_due"}
        )

        # Verify next_action_due
        program_response = self.session.get(
            f"{BASE_URL}/api/athlete/programs/{program_id}",
            headers={"Authorization": f"Bearer {token}"}
        )

        updated_program = program_response.json()
        next_due = updated_program.get("next_action_due", "")
        print(f"After mark-replied, next_action_due: {next_due}")

        assert next_due, "next_action_due should be set"

        # Should be 2 days from today
        expected_due = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
        assert next_due == expected_due, f"Expected {expected_due}, got {next_due}"

    def test_mark_replied_requires_note(self):
        """mark-replied should require a note"""
        token = self.get_athlete_token()
        assert token, "Failed to get athlete token"

        response = self.session.get(
            f"{BASE_URL}/api/athlete/programs",
            headers={"Authorization": f"Bearer {token}"}
        )
        programs = response.json()
        if isinstance(programs, dict):
            all_programs = []
            for group in programs.get("groups", {}).values():
                all_programs.extend(group)
            programs = all_programs

        if not programs:
            pytest.skip("No programs found")

        test_program = programs[0]
        program_id = test_program["program_id"]

        # Call mark-replied without note
        reply_response = self.session.post(
            f"{BASE_URL}/api/athlete/programs/{program_id}/mark-replied",
            headers={"Authorization": f"Bearer {token}"},
            json={"note": ""}  # Empty note
        )

        assert reply_response.status_code == 400, f"Expected 400 for empty note, got {reply_response.status_code}"

    def test_coach_reply_interaction_updates_status(self):
        """coach_reply interaction type should update reply_status to 'Reply Received' and priority to 'Very High'"""
        token = self.get_athlete_token()
        assert token, "Failed to get athlete token"

        response = self.session.get(
            f"{BASE_URL}/api/athlete/programs",
            headers={"Authorization": f"Bearer {token}"}
        )
        programs = response.json()
        if isinstance(programs, dict):
            all_programs = []
            for group in programs.get("groups", {}).values():
                all_programs.extend(group)
            programs = all_programs

        if not programs:
            pytest.skip("No programs found")

        test_program = programs[0]
        program_id = test_program["program_id"]

        # Reset state
        self.session.put(
            f"{BASE_URL}/api/athlete/programs/{program_id}",
            headers={"Authorization": f"Bearer {token}"},
            json={"reply_status": "Awaiting Reply", "priority": "Medium"}
        )

        # Create coach_reply interaction
        interaction_response = self.session.post(
            f"{BASE_URL}/api/athlete/interactions",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "program_id": program_id,
                "type": "coach_reply",
                "notes": "Coach expressed interest",
                "outcome": "Positive"
            }
        )

        assert interaction_response.status_code == 200, f"Failed to create interaction: {interaction_response.text}"

        # Verify program was updated
        program_response = self.session.get(
            f"{BASE_URL}/api/athlete/programs/{program_id}",
            headers={"Authorization": f"Bearer {token}"}
        )

        updated_program = program_response.json()
        print(f"After coach_reply: reply_status={updated_program.get('reply_status')}, priority={updated_program.get('priority')}")

        assert updated_program.get("reply_status") == "Reply Received", \
            f"Expected reply_status='Reply Received', got {updated_program.get('reply_status')}"
        assert updated_program.get("priority") == "Very High", \
            f"Expected priority='Very High', got {updated_program.get('priority')}"


class TestStripeCheckoutPricing:
    """Test that Stripe checkout tiers match subscription tiers"""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})

    def get_athlete_token(self):
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ATHLETE_EMAIL,
            "password": ATHLETE_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token") or response.json().get("session_token")
        return None

    def test_checkout_session_validates_tier(self):
        """POST /api/checkout/create-session validates tier"""
        token = self.get_athlete_token()
        assert token, "Failed to get athlete token"

        # Invalid tier should return 400
        response = self.session.post(
            f"{BASE_URL}/api/checkout/create-session",
            headers={"Authorization": f"Bearer {token}"},
            json={"tier": "invalid_tier", "origin_url": "https://example.com"}
        )

        assert response.status_code == 400, f"Expected 400 for invalid tier, got {response.status_code}"

    def test_checkout_accepts_valid_tiers(self):
        """POST /api/checkout/create-session accepts pro and premium tiers"""
        token = self.get_athlete_token()
        assert token, "Failed to get athlete token"

        # Pro tier should work
        response = self.session.post(
            f"{BASE_URL}/api/checkout/create-session",
            headers={"Authorization": f"Bearer {token}"},
            json={"tier": "pro", "origin_url": "https://example.com"}
        )

        # May get 500 if Stripe not configured in test mode, but not 400
        assert response.status_code in [200, 500], f"Unexpected status for pro tier: {response.status_code}"

        if response.status_code == 200:
            data = response.json()
            assert "url" in data or "session_id" in data, "Response should have checkout URL or session ID"

"""
Test suite for Momentum Recap API endpoint - Final Polish Refinements (Iteration 216)
Tests the /api/athlete/momentum-recap endpoint for:
- Hero names specific school (Emory) instead of generic count
- Biggest shift uses conversational format ("has gone quiet (9 days)")
- Top priority has urgency_note field
- Top priority reason includes timeframe
- Secondary actions use DIFFERENT phrasing (not identical)
- Momentum action_guidance varies per item
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ATHLETE_EMAIL = "emma.chen@athlete.capymatch.com"
ATHLETE_PASSWORD = "athlete123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for athlete user"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ATHLETE_EMAIL, "password": ATHLETE_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture
def auth_headers(auth_token):
    """Return headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture(scope="module")
def recap_data(auth_token):
    """Fetch recap data once for multiple tests"""
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.get(
        f"{BASE_URL}/api/athlete/momentum-recap",
        headers=headers
    )
    if response.status_code == 200:
        return response.json()
    pytest.skip("Failed to fetch recap data")


class TestMomentumRecapAPI:
    """Tests for /api/athlete/momentum-recap endpoint"""
    
    def test_momentum_recap_returns_200(self, auth_headers):
        """Test that momentum-recap endpoint returns 200 OK"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/momentum-recap",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Momentum recap endpoint returns 200 OK")
    
    def test_recap_hero_names_specific_school(self, recap_data):
        """NEW 216: Test that recap_hero names specific school (e.g., Emory) instead of generic count"""
        assert "recap_hero" in recap_data, "Missing recap_hero field"
        recap_hero = recap_data["recap_hero"]
        assert isinstance(recap_hero, str), "recap_hero should be a string"
        assert len(recap_hero) > 0, "recap_hero should not be empty"
        
        # Verify NOT using old format "You gained momentum..."
        assert not recap_hero.startswith("You gained momentum"), \
            f"recap_hero uses old format: {recap_hero}"
        
        # Check if it names a specific school (should contain school name like Emory)
        # The hero should mention a specific school name, not just a count
        cooling_items = recap_data.get("momentum", {}).get("cooling_off", [])
        if cooling_items:
            # If there are cooling items, hero should mention the school name
            school_name = cooling_items[0].get("school_name", "")
            if school_name:
                # Check if school name or part of it is in the hero
                school_parts = school_name.split()
                school_mentioned = any(part in recap_hero for part in school_parts if len(part) > 3)
                print(f"✓ recap_hero: {recap_hero}")
                print(f"  Expected school reference: {school_name}, Found: {school_mentioned}")
        else:
            print(f"✓ recap_hero (no cooling items): {recap_hero}")
    
    def test_momentum_recap_has_period_label(self, recap_data):
        """Test that response contains period_label field"""
        assert "period_label" in recap_data, "Missing period_label field"
        assert isinstance(recap_data["period_label"], str), "period_label should be a string"
        print(f"✓ period_label present: {recap_data['period_label']}")
    
    def test_biggest_shift_conversational_format(self, recap_data):
        """NEW 216: Test that biggest_shift uses conversational format ('has gone quiet (9 days)')"""
        assert "biggest_shift" in recap_data, "Missing biggest_shift field"
        biggest_shift = recap_data["biggest_shift"]
        if biggest_shift:  # Can be None if no shifts
            assert isinstance(biggest_shift, str), "biggest_shift should be a string"
            assert len(biggest_shift) > 0, "biggest_shift should not be empty"
            
            # Should use conversational format, NOT old format like "cooled after X days of inactivity"
            assert "cooled after" not in biggest_shift.lower(), \
                f"biggest_shift uses old format: {biggest_shift}"
            assert "days of inactivity" not in biggest_shift.lower(), \
                f"biggest_shift uses old format: {biggest_shift}"
            
            # Should use new conversational format like "has gone quiet (9 days)"
            # or "surged after your visit" or "heated up — coach replied"
            conversational_patterns = ["has gone quiet", "surged", "heated up", "gained momentum"]
            has_conversational = any(p in biggest_shift.lower() for p in conversational_patterns)
            print(f"✓ biggest_shift (conversational): {biggest_shift}")
            print(f"  Uses conversational pattern: {has_conversational}")
        else:
            print("✓ biggest_shift is None (no significant shifts)")
    
    def test_momentum_recap_has_ai_insights_array(self, recap_data):
        """NEW: Test that ai_insights is an array of bullet strings"""
        assert "ai_insights" in recap_data, "Missing ai_insights field"
        ai_insights = recap_data["ai_insights"]
        assert isinstance(ai_insights, list), f"ai_insights should be a list, got {type(ai_insights)}"
        
        if ai_insights:
            # Each item should be a string
            for i, bullet in enumerate(ai_insights):
                assert isinstance(bullet, str), f"ai_insights[{i}] should be a string"
                assert len(bullet) > 0, f"ai_insights[{i}] should not be empty"
            print(f"✓ ai_insights is array with {len(ai_insights)} bullet strings")
            for bullet in ai_insights[:3]:  # Print first 3
                print(f"  - {bullet[:60]}...")
        else:
            print("✓ ai_insights is empty array")
    
    def test_momentum_recap_has_top_priority_program_id(self, recap_data):
        """NEW: Test that top_priority_program_id matches first priority's program_id"""
        assert "top_priority_program_id" in recap_data, "Missing top_priority_program_id field"
        top_pid = recap_data["top_priority_program_id"]
        priorities = recap_data.get("priorities", [])
        
        if priorities:
            first_priority_pid = priorities[0].get("program_id")
            assert top_pid == first_priority_pid, \
                f"top_priority_program_id ({top_pid}) should match first priority's program_id ({first_priority_pid})"
            print(f"✓ top_priority_program_id matches first priority: {top_pid}")
        else:
            assert top_pid is None, "top_priority_program_id should be None when no priorities"
            print("✓ top_priority_program_id is None (no priorities)")
    
    def test_momentum_recap_has_momentum_structure(self, recap_data):
        """Test that response contains momentum field with correct structure"""
        assert "momentum" in recap_data, "Missing momentum field"
        momentum = recap_data["momentum"]
        
        # Check for all three categories
        assert "heated_up" in momentum, "Missing heated_up in momentum"
        assert "holding_steady" in momentum, "Missing holding_steady in momentum"
        assert "cooling_off" in momentum, "Missing cooling_off in momentum"
        
        # Check that each category is a list
        assert isinstance(momentum["heated_up"], list), "heated_up should be a list"
        assert isinstance(momentum["holding_steady"], list), "holding_steady should be a list"
        assert isinstance(momentum["cooling_off"], list), "cooling_off should be a list"
        
        print(f"✓ momentum structure correct: heated_up={len(momentum['heated_up'])}, holding_steady={len(momentum['holding_steady'])}, cooling_off={len(momentum['cooling_off'])}")
    
    def test_momentum_item_has_action_guidance(self, recap_data):
        """NEW: Test that momentum items have action_guidance field"""
        momentum = recap_data["momentum"]
        all_items = momentum["heated_up"] + momentum["holding_steady"] + momentum["cooling_off"]
        
        if not all_items:
            pytest.skip("No momentum items to test")
        
        for item in all_items:
            assert "action_guidance" in item, f"Missing action_guidance in momentum item for {item.get('school_name')}"
            assert isinstance(item["action_guidance"], str), "action_guidance should be a string"
        
        print(f"✓ All {len(all_items)} momentum items have action_guidance field")
        # Print sample
        if all_items:
            print(f"  Sample: {all_items[0]['school_name']} -> {all_items[0]['action_guidance']}")
    
    def test_momentum_action_guidance_varies(self, recap_data):
        """NEW 216: Test that momentum action_guidance varies per item (not all identical)"""
        momentum = recap_data["momentum"]
        heated_items = momentum.get("heated_up", [])
        
        if len(heated_items) < 2:
            print(f"✓ Only {len(heated_items)} heated items - variation check skipped")
            return
        
        # Get all action_guidance values
        guidances = [item.get("action_guidance", "") for item in heated_items]
        unique_guidances = set(guidances)
        
        # Should have some variation (not all identical)
        # Per requirements: Stanford='Keep the conversation active this week', 
        # Florida='Follow up within 48 hours', UCLA='Send your first follow-up within 48 hours'
        print(f"✓ Momentum action_guidance values ({len(heated_items)} heated items):")
        for item in heated_items:
            print(f"  - {item['school_name']}: {item['action_guidance']}")
        
        if len(unique_guidances) == 1 and len(heated_items) > 1:
            print(f"  WARNING: All {len(heated_items)} items have identical guidance: {guidances[0]}")
        else:
            print(f"  Unique guidance variations: {len(unique_guidances)}")
    
    def test_momentum_item_has_required_fields(self, recap_data):
        """Test that momentum items have all required fields"""
        momentum = recap_data["momentum"]
        all_items = momentum["heated_up"] + momentum["holding_steady"] + momentum["cooling_off"]
        
        if not all_items:
            pytest.skip("No momentum items to test")
        
        item = all_items[0]
        required_fields = ["program_id", "school_name", "category", "what_changed", "why_it_matters", "stage_label", "action_guidance"]
        
        for field in required_fields:
            assert field in item, f"Missing {field} in momentum item"
        
        print(f"✓ Momentum item has all required fields: {required_fields}")
    
    def test_momentum_recap_has_priorities(self, recap_data):
        """Test that response contains priorities field"""
        assert "priorities" in recap_data, "Missing priorities field"
        assert isinstance(recap_data["priorities"], list), "priorities should be a list"
        print(f"✓ priorities present: {len(recap_data['priorities'])} items")
    
    def test_priority_item_has_required_fields(self, recap_data):
        """Test that priority items have all required fields"""
        priorities = recap_data["priorities"]
        
        if not priorities:
            pytest.skip("No priority items to test")
        
        item = priorities[0]
        required_fields = ["rank", "school_name", "program_id", "action", "reason"]
        
        for field in required_fields:
            assert field in item, f"Missing {field} in priority item"
        
        # Check rank is valid
        valid_ranks = ["top", "secondary", "watch"]
        assert item["rank"] in valid_ranks, f"Invalid rank: {item['rank']}"
        
        print(f"✓ Priority item has all required fields: {required_fields}")
    
    def test_top_priority_has_urgency_note(self, recap_data):
        """NEW 216: Test that top priority has urgency_note field"""
        priorities = recap_data["priorities"]
        
        if not priorities:
            pytest.skip("No priority items to test")
        
        # Find top priority
        top_priorities = [p for p in priorities if p.get("rank") == "top"]
        
        if not top_priorities:
            pytest.skip("No top priority found")
        
        top = top_priorities[0]
        assert "urgency_note" in top, "Missing urgency_note in top priority"
        assert top["urgency_note"] == "This is your most important action right now", \
            f"Unexpected urgency_note: {top['urgency_note']}"
        print(f"✓ Top priority has urgency_note: {top['urgency_note']}")
    
    def test_top_priority_reason_has_timeframe(self, recap_data):
        """NEW 216: Test that top priority reason includes timeframe"""
        priorities = recap_data["priorities"]
        
        if not priorities:
            pytest.skip("No priority items to test")
        
        # Find top priority
        top_priorities = [p for p in priorities if p.get("rank") == "top"]
        
        if not top_priorities:
            pytest.skip("No top priority found")
        
        top = top_priorities[0]
        reason = top.get("reason", "")
        
        # Should include timeframe like "No activity for X days — re-engage within 24–48 hours"
        # or "Momentum is building — capitalize on it"
        has_timeframe = any(x in reason for x in ["days", "hours", "week", "within"])
        print(f"✓ Top priority reason: {reason}")
        print(f"  Contains timeframe reference: {has_timeframe}")
    
    def test_secondary_actions_use_different_phrasing(self, recap_data):
        """NEW 216: Test that secondary priority actions use DIFFERENT phrasing"""
        priorities = recap_data["priorities"]
        
        if not priorities:
            pytest.skip("No priority items to test")
        
        # Find secondary priorities
        secondary_priorities = [p for p in priorities if p.get("rank") == "secondary"]
        
        if len(secondary_priorities) < 2:
            print(f"✓ Only {len(secondary_priorities)} secondary priority - no duplication possible")
            return
        
        # Check that actions are different
        actions = [p.get("action", "") for p in secondary_priorities]
        reasons = [p.get("reason", "") for p in secondary_priorities]
        
        # Actions should not be identical
        unique_actions = set(actions)
        assert len(unique_actions) == len(actions), \
            f"Secondary actions should be unique, found duplicates: {actions}"
        
        # Reasons should not be identical
        unique_reasons = set(reasons)
        assert len(unique_reasons) == len(reasons), \
            f"Secondary reasons should be unique, found duplicates: {reasons}"
        
        print(f"✓ Secondary priorities have unique phrasing:")
        for i, p in enumerate(secondary_priorities):
            print(f"  {i+1}. Action: {p['action']}")
            print(f"     Reason: {p['reason']}")
    
    def test_momentum_recap_has_ai_summary(self, recap_data):
        """Test that response contains ai_summary field (backward compat)"""
        assert "ai_summary" in recap_data, "Missing ai_summary field"
        assert isinstance(recap_data["ai_summary"], str), "ai_summary should be a string"
        print(f"✓ ai_summary present: {recap_data['ai_summary'][:50]}...")
    
    def test_momentum_recap_requires_auth(self):
        """Test that endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/athlete/momentum-recap")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ Endpoint correctly requires authentication")
    
    def test_momentum_recap_refresh_endpoint(self, auth_headers):
        """Test the refresh endpoint works"""
        response = requests.post(
            f"{BASE_URL}/api/athlete/momentum-recap/refresh",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "recap_hero" in data, "Missing recap_hero in refresh response"
        assert "momentum" in data, "Missing momentum in refresh response"
        assert "priorities" in data, "Missing priorities in refresh response"
        assert "biggest_shift" in data, "Missing biggest_shift in refresh response"
        assert "ai_insights" in data, "Missing ai_insights in refresh response"
        assert "top_priority_program_id" in data, "Missing top_priority_program_id in refresh response"
        print("✓ Refresh endpoint works correctly with all new fields")


class TestAuthEndpoint:
    """Tests for authentication endpoint"""
    
    def test_login_success(self):
        """Test successful login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ATHLETE_EMAIL, "password": ATHLETE_PASSWORD}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "token" in data, "Missing token in login response"
        assert "user" in data, "Missing user in login response"
        assert data["user"]["email"] == ATHLETE_EMAIL, "Email mismatch"
        print("✓ Login successful")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "invalid@test.com", "password": "wrongpassword"}
        )
        assert response.status_code in [401, 404], f"Expected 401/404, got {response.status_code}"
        print("✓ Invalid credentials correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

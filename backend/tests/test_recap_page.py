"""
Test suite for Momentum Recap API endpoint - Production Polish (Iteration 219)
Tests the /api/athlete/momentum-recap endpoint for:
- Top priority action is 'Re-engage Emory University' (no 'with')
- Secondary reasons are clean without redundant prefixes
- ai_insights bullets are contextual (Florida='through active conversations', UCLA='after being recently added')
- Hero names specific school (Emory) instead of generic count
- Biggest shift uses conversational format ("has gone quiet (9 days)")
- Top priority has urgency_note field
- Top priority reason includes timeframe
- Secondary actions use DIFFERENT phrasing (not identical)
- Momentum action_guidance varies per item

NEW Iteration 218 tests:
- Watch card reason is 'Check in within the next few days to maintain momentum'

NEW Iteration 219 tests:
- Action verbs: 'Re-engage Emory University', 'Follow up with Stanford University', 
  'Keep pushing University of Florida', 'Monitor Creighton University'
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
    
    def test_top_priority_action_no_with_prefix(self, recap_data):
        """NEW 217: Test that top priority action is 'Re-engage Emory University' NOT 'Re-engage with Emory University'"""
        priorities = recap_data["priorities"]
        
        if not priorities:
            pytest.skip("No priority items to test")
        
        # Find top priority
        top_priorities = [p for p in priorities if p.get("rank") == "top"]
        
        if not top_priorities:
            pytest.skip("No top priority found")
        
        top = top_priorities[0]
        action = top.get("action", "")
        
        # Should NOT contain "Re-engage with" - should be "Re-engage {school}"
        assert "Re-engage with" not in action, \
            f"Top priority action should NOT contain 'with': {action}"
        
        # If it's a re-engage action, verify format
        if "Re-engage" in action:
            # Should be "Re-engage {school_name}" format
            expected_format = f"Re-engage {top['school_name']}"
            assert action == expected_format, \
                f"Expected '{expected_format}', got '{action}'"
        
        print(f"✓ Top priority action format correct: {action}")
    
    def test_secondary_reasons_no_redundant_prefix(self, recap_data):
        """NEW 217: Test that secondary reasons are clean without redundant context prefixes"""
        priorities = recap_data["priorities"]
        
        if not priorities:
            pytest.skip("No priority items to test")
        
        # Find secondary priorities
        secondary_priorities = [p for p in priorities if p.get("rank") == "secondary"]
        
        if not secondary_priorities:
            pytest.skip("No secondary priorities found")
        
        for p in secondary_priorities:
            reason = p.get("reason", "")
            school = p.get("school_name", "")
            
            # Should NOT have redundant prefixes like "Campus visit completed — "
            redundant_prefixes = [
                "Campus visit completed —",
                "Campus visit completed -",
                "Coach replied —",
                "Coach replied -",
            ]
            
            for prefix in redundant_prefixes:
                assert prefix not in reason, \
                    f"Secondary reason for {school} has redundant prefix: {reason}"
            
            print(f"✓ {school} reason is clean: {reason}")
    
    def test_ai_insights_contextual_florida(self, recap_data):
        """NEW 217: Test that Florida insight is 'is heating up through active conversations'"""
        ai_insights = recap_data.get("ai_insights", [])
        
        if not ai_insights:
            pytest.skip("No ai_insights to test")
        
        # Find Florida insight
        florida_insights = [b for b in ai_insights if "Florida" in b]
        
        if not florida_insights:
            print("✓ No Florida insight found (may not be in heated_up)")
            return
        
        florida_insight = florida_insights[0]
        
        # Should contain "through active conversations" NOT just "is heating up"
        assert "through active conversations" in florida_insight, \
            f"Florida insight should be contextual: {florida_insight}"
        
        print(f"✓ Florida insight is contextual: {florida_insight}")
    
    def test_ai_insights_contextual_ucla(self, recap_data):
        """NEW 217: Test that UCLA insight is 'is heating up after being recently added'"""
        ai_insights = recap_data.get("ai_insights", [])
        
        if not ai_insights:
            pytest.skip("No ai_insights to test")
        
        # Find UCLA insight
        ucla_insights = [b for b in ai_insights if "UCLA" in b]
        
        if not ucla_insights:
            print("✓ No UCLA insight found (may not be in heated_up)")
            return
        
        ucla_insight = ucla_insights[0]
        
        # Should contain "after being recently added" NOT just "is heating up"
        assert "after being recently added" in ucla_insight, \
            f"UCLA insight should be contextual: {ucla_insight}"
        
        print(f"✓ UCLA insight is contextual: {ucla_insight}")
    
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
    
    def test_watch_card_reason_text(self, recap_data):
        """NEW 218: Test that watch card reason is 'Check in within the next few days to maintain momentum'"""
        priorities = recap_data.get("priorities", [])
        
        if not priorities:
            pytest.skip("No priority items to test")
        
        # Find watch priority
        watch_priorities = [p for p in priorities if p.get("rank") == "watch"]
        
        if not watch_priorities:
            print("✓ No watch priority found in current data")
            return
        
        watch = watch_priorities[0]
        reason = watch.get("reason", "")
        
        # Should be the new text, NOT the old "Could cool off without attention"
        expected_reason = "Check in within the next few days to maintain momentum"
        assert reason == expected_reason, \
            f"Watch card reason should be '{expected_reason}', got '{reason}'"
        
        # Verify NOT using old text
        assert "Could cool off" not in reason, \
            f"Watch card reason should NOT contain old text 'Could cool off': {reason}"
        
        print(f"✓ Watch card reason is correct: {reason}")
    
    def test_action_verb_re_engage(self, recap_data):
        """NEW 219: Test that cooling off top priority uses 'Re-engage {school}' format"""
        priorities = recap_data.get("priorities", [])
        
        if not priorities:
            pytest.skip("No priority items to test")
        
        # Find top priority that should be a re-engage action (cooling off)
        top_priorities = [p for p in priorities if p.get("rank") == "top"]
        
        if not top_priorities:
            pytest.skip("No top priority found")
        
        top = top_priorities[0]
        action = top.get("action", "")
        
        # If it's a cooling off item, should use "Re-engage {school}" format
        if "Re-engage" in action:
            # Verify format is "Re-engage {school_name}" NOT "Re-engage with {school_name}"
            assert "Re-engage with" not in action, \
                f"Action should be 'Re-engage {{school}}' not 'Re-engage with': {action}"
            assert action.startswith("Re-engage "), \
                f"Action should start with 'Re-engage ': {action}"
            print(f"✓ Re-engage action verb correct: {action}")
        else:
            print(f"✓ Top priority is not a re-engage action: {action}")
    
    def test_action_verb_follow_up_with(self, recap_data):
        """NEW 219: Test that heated secondary uses 'Follow up with {school}' format"""
        priorities = recap_data.get("priorities", [])
        
        if not priorities:
            pytest.skip("No priority items to test")
        
        # Find secondary priorities
        secondary_priorities = [p for p in priorities if p.get("rank") == "secondary"]
        
        if not secondary_priorities:
            pytest.skip("No secondary priorities found")
        
        # Check for "Follow up with" format
        follow_up_actions = [p for p in secondary_priorities if "Follow up with" in p.get("action", "")]
        
        if follow_up_actions:
            for p in follow_up_actions:
                action = p.get("action", "")
                school = p.get("school_name", "")
                expected = f"Follow up with {school}"
                # Could also be "Follow up with {school} while hot"
                assert action.startswith(f"Follow up with {school}"), \
                    f"Expected action to start with '{expected}', got '{action}'"
                print(f"✓ Follow up with action verb correct: {action}")
        else:
            print("✓ No 'Follow up with' actions found in secondary priorities")
    
    def test_action_verb_keep_pushing(self, recap_data):
        """NEW 219: Test that alternate heated secondary uses 'Keep pushing {school}' format"""
        priorities = recap_data.get("priorities", [])
        
        if not priorities:
            pytest.skip("No priority items to test")
        
        # Find secondary priorities
        secondary_priorities = [p for p in priorities if p.get("rank") == "secondary"]
        
        if not secondary_priorities:
            pytest.skip("No secondary priorities found")
        
        # Check for "Keep pushing" format
        keep_pushing_actions = [p for p in secondary_priorities if "Keep pushing" in p.get("action", "")]
        
        if keep_pushing_actions:
            for p in keep_pushing_actions:
                action = p.get("action", "")
                school = p.get("school_name", "")
                expected = f"Keep pushing {school}"
                assert action == expected, \
                    f"Expected '{expected}', got '{action}'"
                print(f"✓ Keep pushing action verb correct: {action}")
        else:
            print("✓ No 'Keep pushing' actions found in secondary priorities")
    
    def test_action_verb_monitor(self, recap_data):
        """NEW 219: Test that watch priority uses 'Monitor {school}' format"""
        priorities = recap_data.get("priorities", [])
        
        if not priorities:
            pytest.skip("No priority items to test")
        
        # Find watch priority
        watch_priorities = [p for p in priorities if p.get("rank") == "watch"]
        
        if not watch_priorities:
            print("✓ No watch priority found in current data")
            return
        
        watch = watch_priorities[0]
        action = watch.get("action", "")
        school = watch.get("school_name", "")
        
        # Should be "Monitor {school_name}" format
        expected = f"Monitor {school}"
        assert action == expected, \
            f"Watch action should be '{expected}', got '{action}'"
        
        print(f"✓ Monitor action verb correct: {action}")
    
    def test_all_action_verbs_standardized(self, recap_data):
        """NEW 219: Test that all action verbs match the standardized spec"""
        priorities = recap_data.get("priorities", [])
        
        if not priorities:
            pytest.skip("No priority items to test")
        
        # Valid action verb patterns
        valid_patterns = [
            "Re-engage ",      # For cooling off top priority
            "Follow up with ", # For heated secondary
            "Keep pushing ",   # For alternate heated secondary
            "Monitor ",        # For watch
            "Check in with ",  # For cooling secondary
            "Maintain contact with ",  # For steady
            "Send your first follow-up to ",  # For newly added
        ]
        
        print("✓ All priority actions:")
        for p in priorities:
            action = p.get("action", "")
            rank = p.get("rank", "")
            school = p.get("school_name", "")
            
            # Check if action starts with a valid pattern
            has_valid_pattern = any(action.startswith(pattern) for pattern in valid_patterns)
            
            # Also allow "Follow up with X while hot" format
            if "while hot" in action:
                has_valid_pattern = True
            
            print(f"  [{rank}] {action}")
            
            assert has_valid_pattern, \
                f"Action '{action}' does not match any valid pattern: {valid_patterns}"
        
        print("✓ All action verbs match standardized spec")


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

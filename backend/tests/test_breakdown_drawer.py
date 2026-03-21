"""
Test suite for BreakdownDrawer feature - Momentum Recap API
Tests the /api/athlete/momentum-recap endpoint for coaching insights and narrative data
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestMomentumRecapAPI:
    """Tests for /api/athlete/momentum-recap endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "emma.chen@athlete.capymatch.com", "password": "athlete123"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_momentum_recap_returns_200(self):
        """Test that momentum-recap endpoint returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/momentum-recap",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_momentum_recap_has_required_fields(self):
        """Test that response contains all required fields for BreakdownDrawer"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/momentum-recap",
            headers=self.headers
        )
        data = response.json()
        
        # Required fields for narrative section
        assert "recap_hero" in data, "Missing recap_hero field"
        assert "biggest_shift" in data, "Missing biggest_shift field"
        assert "period_label" in data, "Missing period_label field"
        
        # Required fields for momentum section
        assert "momentum" in data, "Missing momentum field"
        assert "heated_up" in data["momentum"], "Missing heated_up in momentum"
        assert "cooling_off" in data["momentum"], "Missing cooling_off in momentum"
        assert "holding_steady" in data["momentum"], "Missing holding_steady in momentum"
        
        # Required fields for insights section
        assert "ai_insights" in data, "Missing ai_insights field"
        
        # Required fields for freshness
        assert "created_at" in data, "Missing created_at field"
    
    def test_ai_insights_max_three(self):
        """Test that ai_insights returns max 3 coaching tips"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/momentum-recap",
            headers=self.headers
        )
        data = response.json()
        
        ai_insights = data.get("ai_insights", [])
        assert len(ai_insights) <= 3, f"Expected max 3 insights, got {len(ai_insights)}"
    
    def test_ai_insights_are_coaching_focused(self):
        """Test that ai_insights contain coaching-oriented language, not status descriptions"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/momentum-recap",
            headers=self.headers
        )
        data = response.json()
        
        ai_insights = data.get("ai_insights", [])
        insights_text = " ".join(ai_insights).lower()
        
        # Should contain coaching phrases
        coaching_indicators = [
            "outreach is working",
            "try a different approach",
            "focus on quality",
            "keep the cadence",
            "respond within",
            "trending positive",
            "re-engage",
            "follow up"
        ]
        has_coaching = any(phrase in insights_text for phrase in coaching_indicators)
        
        # Should NOT contain system terminology
        forbidden_terms = ["score", "priority factor", "tier"]
        has_forbidden = any(term in insights_text for term in forbidden_terms)
        
        assert has_coaching or len(ai_insights) == 0, "Insights should contain coaching-oriented language"
        assert not has_forbidden, f"Insights should not contain system terminology: {forbidden_terms}"
    
    def test_momentum_groups_have_school_data(self):
        """Test that momentum groups contain proper school data"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/momentum-recap",
            headers=self.headers
        )
        data = response.json()
        
        momentum = data.get("momentum", {})
        
        # Check each group has proper structure
        for group_name in ["heated_up", "cooling_off", "holding_steady"]:
            group = momentum.get(group_name, [])
            for item in group:
                assert "program_id" in item, f"Missing program_id in {group_name}"
                assert "school_name" in item, f"Missing school_name in {group_name}"
                assert "category" in item, f"Missing category in {group_name}"
    
    def test_no_system_terminology_in_response(self):
        """Test that response doesn't contain forbidden system terminology"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/momentum-recap",
            headers=self.headers
        )
        data = response.json()
        
        # Convert entire response to string for checking
        response_str = str(data).lower()
        
        # These terms should NOT appear in user-facing content
        # Note: 'tier' might appear in internal data but not in user-facing text
        forbidden_in_text = ["priority factor"]
        
        for term in forbidden_in_text:
            assert term not in response_str, f"Found forbidden term '{term}' in response"
    
    def test_recap_hero_is_personalized(self):
        """Test that recap_hero contains school-specific content"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/momentum-recap",
            headers=self.headers
        )
        data = response.json()
        
        recap_hero = data.get("recap_hero", "")
        
        # Should mention specific schools or be a meaningful summary
        assert len(recap_hero) > 20, "recap_hero should be a meaningful sentence"
        
        # Should not be generic placeholder
        assert recap_hero != "No data available", "recap_hero should not be placeholder"
    
    def test_freshness_timestamp_format(self):
        """Test that created_at is a valid ISO timestamp"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/momentum-recap",
            headers=self.headers
        )
        data = response.json()
        
        created_at = data.get("created_at", "")
        
        # Should be ISO format
        assert "T" in created_at, "created_at should be ISO format"
        assert len(created_at) > 10, "created_at should be full timestamp"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

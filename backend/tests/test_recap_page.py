"""
Test suite for Momentum Recap API endpoint
Tests the /api/athlete/momentum-recap endpoint for the redesigned Recap page
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
    
    def test_momentum_recap_has_recap_hero(self, auth_headers):
        """Test that response contains recap_hero field"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/momentum-recap",
            headers=auth_headers
        )
        data = response.json()
        assert "recap_hero" in data, "Missing recap_hero field"
        assert isinstance(data["recap_hero"], str), "recap_hero should be a string"
        assert len(data["recap_hero"]) > 0, "recap_hero should not be empty"
        print(f"✓ recap_hero present: {data['recap_hero'][:50]}...")
    
    def test_momentum_recap_has_period_label(self, auth_headers):
        """Test that response contains period_label field"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/momentum-recap",
            headers=auth_headers
        )
        data = response.json()
        assert "period_label" in data, "Missing period_label field"
        assert isinstance(data["period_label"], str), "period_label should be a string"
        print(f"✓ period_label present: {data['period_label']}")
    
    def test_momentum_recap_has_momentum_structure(self, auth_headers):
        """Test that response contains momentum field with correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/momentum-recap",
            headers=auth_headers
        )
        data = response.json()
        assert "momentum" in data, "Missing momentum field"
        momentum = data["momentum"]
        
        # Check for all three categories
        assert "heated_up" in momentum, "Missing heated_up in momentum"
        assert "holding_steady" in momentum, "Missing holding_steady in momentum"
        assert "cooling_off" in momentum, "Missing cooling_off in momentum"
        
        # Check that each category is a list
        assert isinstance(momentum["heated_up"], list), "heated_up should be a list"
        assert isinstance(momentum["holding_steady"], list), "holding_steady should be a list"
        assert isinstance(momentum["cooling_off"], list), "cooling_off should be a list"
        
        print(f"✓ momentum structure correct: heated_up={len(momentum['heated_up'])}, holding_steady={len(momentum['holding_steady'])}, cooling_off={len(momentum['cooling_off'])}")
    
    def test_momentum_item_has_required_fields(self, auth_headers):
        """Test that momentum items have all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/momentum-recap",
            headers=auth_headers
        )
        data = response.json()
        momentum = data["momentum"]
        
        # Get first item from any non-empty category
        all_items = momentum["heated_up"] + momentum["holding_steady"] + momentum["cooling_off"]
        if not all_items:
            pytest.skip("No momentum items to test")
        
        item = all_items[0]
        required_fields = ["program_id", "school_name", "category", "what_changed", "why_it_matters", "stage_label"]
        
        for field in required_fields:
            assert field in item, f"Missing {field} in momentum item"
        
        print(f"✓ Momentum item has all required fields: {required_fields}")
    
    def test_momentum_recap_has_priorities(self, auth_headers):
        """Test that response contains priorities field"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/momentum-recap",
            headers=auth_headers
        )
        data = response.json()
        assert "priorities" in data, "Missing priorities field"
        assert isinstance(data["priorities"], list), "priorities should be a list"
        print(f"✓ priorities present: {len(data['priorities'])} items")
    
    def test_priority_item_has_required_fields(self, auth_headers):
        """Test that priority items have all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/momentum-recap",
            headers=auth_headers
        )
        data = response.json()
        priorities = data["priorities"]
        
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
    
    def test_momentum_recap_has_ai_summary(self, auth_headers):
        """Test that response contains ai_summary field"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/momentum-recap",
            headers=auth_headers
        )
        data = response.json()
        assert "ai_summary" in data, "Missing ai_summary field"
        assert isinstance(data["ai_summary"], str), "ai_summary should be a string"
        print(f"✓ ai_summary present: {data['ai_summary'][:50]}...")
    
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
        print("✓ Refresh endpoint works correctly")


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

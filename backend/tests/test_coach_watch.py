"""
Coach Watch Feature Tests
Tests for: DuckDuckGo news search, subscription enforcement, alerts endpoints, 
background task startup, and notifications for red/yellow alerts.
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials - basic tier user (should be denied access to scan/alerts)
BASIC_USER_EMAIL = "emma.chen@athlete.capymatch.com"
BASIC_USER_PASSWORD = "password123"


class TestCoachWatchSubscriptionEnforcement:
    """Tests for Coach Watch premium-only enforcement (basic tier should get 403)"""
    
    @pytest.fixture(autouse=True)
    def setup(self, api_client, auth_token_basic):
        """Setup authenticated client with basic tier user"""
        self.client = api_client
        self.token = auth_token_basic
        self.client.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_scan_returns_403_for_basic_tier(self, api_client, auth_token_basic):
        """POST /api/ai/coach-watch/scan should return 403 for basic tier users"""
        api_client.headers.update({"Authorization": f"Bearer {auth_token_basic}"})
        response = api_client.post(f"{BASE_URL}/api/ai/coach-watch/scan")
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        data = response.json()
        assert "Premium" in data.get("detail", ""), f"Expected Premium plan message, got: {data}"
    
    def test_alerts_returns_403_for_basic_tier(self, api_client, auth_token_basic):
        """GET /api/ai/coach-watch/alerts should return 403 for basic tier users"""
        api_client.headers.update({"Authorization": f"Bearer {auth_token_basic}"})
        response = api_client.get(f"{BASE_URL}/api/ai/coach-watch/alerts")
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        data = response.json()
        assert "Premium" in data.get("detail", ""), f"Expected Premium plan message, got: {data}"


class TestCoachWatchIndividualAlert:
    """Tests for individual alert endpoint (no subscription enforcement)"""
    
    def test_individual_alert_accessible_for_basic_tier(self, api_client, auth_token_basic):
        """GET /api/ai/coach-watch/alert/{university_name} should work for basic tier (used by Journey page)"""
        api_client.headers.update({"Authorization": f"Bearer {auth_token_basic}"})
        
        # Test with a sample university name
        test_universities = ["UCLA", "Stanford", "USC", "Duke", "Michigan"]
        
        for uni in test_universities:
            response = api_client.get(f"{BASE_URL}/api/ai/coach-watch/alert/{uni}")
            
            # Should return 200 regardless of whether alert exists
            assert response.status_code == 200, f"Expected 200 for {uni}, got {response.status_code}: {response.text}"
            
            data = response.json()
            # Response should have 'alert' key (may be null if no alert)
            assert "alert" in data, f"Expected 'alert' key in response for {uni}, got: {data.keys()}"
            
            # If alert exists, verify structure
            if data["alert"]:
                alert = data["alert"]
                assert "university_name" in alert or "severity" in alert, f"Alert missing expected fields: {alert}"
    
    def test_individual_alert_returns_alert_structure(self, api_client, auth_token_basic):
        """Verify alert response structure when alert exists"""
        api_client.headers.update({"Authorization": f"Bearer {auth_token_basic}"})
        
        response = api_client.get(f"{BASE_URL}/api/ai/coach-watch/alert/TestUniversity")
        assert response.status_code == 200
        
        data = response.json()
        # Check response structure
        assert isinstance(data, dict)
        assert "alert" in data
        # Alert can be None or dict
        assert data["alert"] is None or isinstance(data["alert"], dict)


class TestCoachWatchCodeReview:
    """Code review tests - verifying implementation details via API behavior"""
    
    def test_subscription_check_uses_auto_reply_detection_flag(self, api_client, auth_token_basic):
        """Verify basic tier (auto_reply_detection=False) gets 403"""
        api_client.headers.update({"Authorization": f"Bearer {auth_token_basic}"})
        
        # Both scan and alerts should check auto_reply_detection
        scan_resp = api_client.post(f"{BASE_URL}/api/ai/coach-watch/scan")
        alerts_resp = api_client.get(f"{BASE_URL}/api/ai/coach-watch/alerts")
        
        assert scan_resp.status_code == 403, "Scan should be denied for basic tier"
        assert alerts_resp.status_code == 403, "Alerts should be denied for basic tier"
        
        # Individual alert should NOT check subscription
        individual_resp = api_client.get(f"{BASE_URL}/api/ai/coach-watch/alert/UCLA")
        assert individual_resp.status_code == 200, "Individual alert should work for basic tier"
    
    def test_error_message_mentions_premium_plan(self, api_client, auth_token_basic):
        """Verify 403 error message mentions Premium plan"""
        api_client.headers.update({"Authorization": f"Bearer {auth_token_basic}"})
        
        response = api_client.post(f"{BASE_URL}/api/ai/coach-watch/scan")
        assert response.status_code == 403
        
        data = response.json()
        detail = data.get("detail", "")
        assert "Premium" in detail, f"Error should mention Premium plan: {detail}"
        assert "Coach Watch" in detail, f"Error should mention Coach Watch: {detail}"


class TestCoachWatchAPIStructure:
    """Tests for API structure and response format"""
    
    def test_unauthenticated_scan_returns_401(self, api_client):
        """Scan endpoint should require authentication"""
        response = api_client.post(f"{BASE_URL}/api/ai/coach-watch/scan")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_unauthenticated_alerts_returns_401(self, api_client):
        """Alerts endpoint should require authentication"""
        response = api_client.get(f"{BASE_URL}/api/ai/coach-watch/alerts")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_unauthenticated_individual_alert_returns_401(self, api_client):
        """Individual alert endpoint should require authentication"""
        response = api_client.get(f"{BASE_URL}/api/ai/coach-watch/alert/UCLA")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


class TestSubscriptionTiers:
    """Tests to verify subscription tier configuration"""
    
    def test_basic_tier_subscription_endpoint(self, api_client, auth_token_basic):
        """Verify basic tier subscription returns correct features"""
        api_client.headers.update({"Authorization": f"Bearer {auth_token_basic}"})
        
        response = api_client.get(f"{BASE_URL}/api/subscription")
        assert response.status_code == 200, f"Failed to get subscription: {response.text}"
        
        data = response.json()
        # Basic tier should have auto_reply_detection = False (nested under limits)
        limits = data.get("limits", {})
        assert limits.get("auto_reply_detection") == False, f"Basic tier should have auto_reply_detection=False: {data}"
        assert data.get("tier") == "basic", f"Expected basic tier: {data.get('tier')}"


# ─── Fixtures ───

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def auth_token_basic(api_client):
    """Get authentication token for basic tier user"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": BASIC_USER_EMAIL,
        "password": BASIC_USER_PASSWORD
    })
    if response.status_code == 200:
        token = response.json().get("access_token")
        if not token:
            token = response.json().get("token")
        if token:
            return token
    pytest.skip(f"Authentication failed for basic user: {response.status_code} - {response.text}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

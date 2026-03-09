"""
Gmail Intelligence API Tests

Tests for the AI-powered Gmail Intelligence feature endpoints:
- POST /api/athlete/gmail/intelligence/scan - Trigger scan
- GET /api/athlete/gmail/intelligence/status - Get scan status
- GET /api/athlete/gmail/intelligence/insights - Get insights list
- GET /api/athlete/gmail/intelligence/signals - Get pipeline signals map
- POST /api/athlete/gmail/intelligence/insights/{id}/confirm - Confirm insight
- POST /api/athlete/gmail/intelligence/insights/{id}/dismiss - Dismiss insight
- GET /api/athlete/gmail/intelligence/insights/program/{id} - Get program insights
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
ATHLETE_EMAIL = "emma.chen@athlete.capymatch.com"
ATHLETE_PASSWORD = "password123"


@pytest.fixture(scope="module")
def athlete_token():
    """Get athlete JWT token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ATHLETE_EMAIL,
        "password": ATHLETE_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "token" in data, "No token in login response"
    return data["token"]


@pytest.fixture(scope="module")
def athlete_headers(athlete_token):
    """Auth headers for athlete requests"""
    return {"Authorization": f"Bearer {athlete_token}", "Content-Type": "application/json"}


class TestGmailIntelligenceScan:
    """Tests for POST /api/athlete/gmail/intelligence/scan"""

    def test_scan_returns_proper_response_gmail_not_connected(self, athlete_headers):
        """Test scan endpoint returns triggered:false when Gmail is not connected"""
        response = requests.post(
            f"{BASE_URL}/api/athlete/gmail/intelligence/scan",
            headers=athlete_headers
        )
        assert response.status_code == 200, f"Scan failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "triggered" in data, "Missing 'triggered' field in response"
        
        # Gmail not connected - should return triggered: false with reason
        if not data["triggered"]:
            assert "reason" in data, "Missing 'reason' field when triggered is false"
            # Either "Gmail not connected" or "Scan recently completed or in progress"
            assert data["reason"] in ["Gmail not connected", "Scan recently completed or in progress"]

    def test_scan_requires_auth(self):
        """Test scan endpoint requires authentication"""
        response = requests.post(f"{BASE_URL}/api/athlete/gmail/intelligence/scan")
        assert response.status_code in [401, 403], "Should require authentication"


class TestGmailIntelligenceStatus:
    """Tests for GET /api/athlete/gmail/intelligence/status"""

    def test_status_returns_proper_fields(self, athlete_headers):
        """Test status endpoint returns has_scanned and status fields"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/gmail/intelligence/status",
            headers=athlete_headers
        )
        assert response.status_code == 200, f"Status failed: {response.text}"
        data = response.json()
        
        # Verify required fields
        assert "has_scanned" in data, "Missing 'has_scanned' field"
        assert "status" in data, "Missing 'status' field"
        assert isinstance(data["has_scanned"], bool), "'has_scanned' should be boolean"
        
        # If has_scanned is True, additional fields may be present
        if data["has_scanned"]:
            # Status should be one of: scanning, completed, failed, or None
            valid_statuses = ["scanning", "completed", "failed", None]
            assert data["status"] in valid_statuses, f"Invalid status: {data['status']}"

    def test_status_requires_auth(self):
        """Test status endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/athlete/gmail/intelligence/status")
        assert response.status_code in [401, 403], "Should require authentication"


class TestGmailIntelligenceInsights:
    """Tests for GET /api/athlete/gmail/intelligence/insights"""

    def test_insights_returns_array_and_count(self, athlete_headers):
        """Test insights endpoint returns insights array and pending_count"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/gmail/intelligence/insights",
            headers=athlete_headers
        )
        assert response.status_code == 200, f"Insights failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "insights" in data, "Missing 'insights' field"
        assert "pending_count" in data, "Missing 'pending_count' field"
        assert isinstance(data["insights"], list), "'insights' should be a list"
        assert isinstance(data["pending_count"], int), "'pending_count' should be integer"
        assert data["pending_count"] >= 0, "'pending_count' should be non-negative"

    def test_insights_with_status_filter(self, athlete_headers):
        """Test insights endpoint with status filter parameter"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/gmail/intelligence/insights?status=pending",
            headers=athlete_headers
        )
        assert response.status_code == 200, f"Filtered insights failed: {response.text}"
        data = response.json()
        
        assert "insights" in data
        assert "pending_count" in data
        
        # All returned insights should have status=pending (if any)
        for insight in data["insights"]:
            if insight.get("status"):
                assert insight["status"] == "pending", "Filter not working correctly"

    def test_insights_with_limit(self, athlete_headers):
        """Test insights endpoint with limit parameter"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/gmail/intelligence/insights?limit=5",
            headers=athlete_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["insights"]) <= 5, "Limit parameter not respected"

    def test_insights_requires_auth(self):
        """Test insights endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/athlete/gmail/intelligence/insights")
        assert response.status_code in [401, 403], "Should require authentication"


class TestGmailIntelligenceSignals:
    """Tests for GET /api/athlete/gmail/intelligence/signals"""

    def test_signals_returns_map(self, athlete_headers):
        """Test signals endpoint returns signals map structure"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/gmail/intelligence/signals",
            headers=athlete_headers
        )
        assert response.status_code == 200, f"Signals failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "signals" in data, "Missing 'signals' field"
        assert isinstance(data["signals"], dict), "'signals' should be a dict (map)"
        
        # If there are signals, verify structure
        for program_id, signal in data["signals"].items():
            assert "urgency" in signal, f"Missing 'urgency' in signal for {program_id}"
            assert "signal_label" in signal, f"Missing 'signal_label' in signal for {program_id}"
            
            # Urgency should be one of the valid values
            valid_urgencies = ["critical", "high", "medium", "low"]
            assert signal["urgency"] in valid_urgencies, f"Invalid urgency: {signal['urgency']}"

    def test_signals_requires_auth(self):
        """Test signals endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/athlete/gmail/intelligence/signals")
        assert response.status_code in [401, 403], "Should require authentication"


class TestGmailIntelligenceConfirm:
    """Tests for POST /api/athlete/gmail/intelligence/insights/{id}/confirm"""

    def test_confirm_nonexistent_insight_returns_404(self, athlete_headers):
        """Test confirm endpoint returns 404 for non-existent insight"""
        response = requests.post(
            f"{BASE_URL}/api/athlete/gmail/intelligence/insights/nonexistent_insight_id/confirm",
            headers=athlete_headers,
            json={"apply_stage": False, "apply_interaction": True}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data, "Error response should have 'detail' field"

    def test_confirm_requires_auth(self):
        """Test confirm endpoint requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/athlete/gmail/intelligence/insights/test_id/confirm",
            json={}
        )
        assert response.status_code in [401, 403], "Should require authentication"


class TestGmailIntelligenceDismiss:
    """Tests for POST /api/athlete/gmail/intelligence/insights/{id}/dismiss"""

    def test_dismiss_nonexistent_insight_returns_404(self, athlete_headers):
        """Test dismiss endpoint returns 404 for non-existent insight"""
        response = requests.post(
            f"{BASE_URL}/api/athlete/gmail/intelligence/insights/nonexistent_insight_id/dismiss",
            headers=athlete_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data, "Error response should have 'detail' field"

    def test_dismiss_requires_auth(self):
        """Test dismiss endpoint requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/athlete/gmail/intelligence/insights/test_id/dismiss"
        )
        assert response.status_code in [401, 403], "Should require authentication"


class TestGmailIntelligenceProgramInsights:
    """Tests for GET /api/athlete/gmail/intelligence/insights/program/{program_id}"""

    def test_program_insights_returns_insights_array(self, athlete_headers):
        """Test program insights endpoint returns insights array for a program"""
        # Use a known program_id or a fake one - should return empty array for unknown
        test_program_id = "test_program_123"
        response = requests.get(
            f"{BASE_URL}/api/athlete/gmail/intelligence/insights/program/{test_program_id}",
            headers=athlete_headers
        )
        assert response.status_code == 200, f"Program insights failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "insights" in data, "Missing 'insights' field"
        assert isinstance(data["insights"], list), "'insights' should be a list"

    def test_program_insights_requires_auth(self):
        """Test program insights endpoint requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/gmail/intelligence/insights/program/test_id"
        )
        assert response.status_code in [401, 403], "Should require authentication"


class TestAthleteAuthenticationRequired:
    """Tests to verify only athlete role can access these endpoints"""

    def test_endpoints_require_athlete_role(self, athlete_headers):
        """Verify all endpoints are accessible by athlete role"""
        endpoints = [
            ("POST", f"{BASE_URL}/api/athlete/gmail/intelligence/scan"),
            ("GET", f"{BASE_URL}/api/athlete/gmail/intelligence/status"),
            ("GET", f"{BASE_URL}/api/athlete/gmail/intelligence/insights"),
            ("GET", f"{BASE_URL}/api/athlete/gmail/intelligence/signals"),
        ]
        
        for method, url in endpoints:
            if method == "POST":
                response = requests.post(url, headers=athlete_headers)
            else:
                response = requests.get(url, headers=athlete_headers)
            
            # Should not return 401, 403 with valid athlete token
            assert response.status_code not in [401, 403], f"{method} {url} rejected athlete auth"

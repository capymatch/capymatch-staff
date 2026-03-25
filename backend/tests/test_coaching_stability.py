"""
Test Coaching Stability API endpoints
- GET /api/coaching-stability/{program_id} - returns stability data with fields: severity, headline, summary, change_type, recommendation
- POST /api/coaching-stability/{program_id}/refresh - forces a re-scan and returns updated data
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
ATHLETE_EMAIL = "emma.chen@athlete.capymatch.com"
ATHLETE_PASSWORD = "athlete123"

# Test program IDs
STANFORD_PROGRAM_ID = "cd5c0908-c3ea-49d1-8a5f-d57d18f32116"
FLORIDA_PROGRAM_ID = "05342cf4-7086-46c5-9367-a4be1412d82a"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for athlete user"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ATHLETE_EMAIL, "password": ATHLETE_PASSWORD}
    )
    if response.status_code != 200:
        pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")
    data = response.json()
    return data.get("token") or data.get("access_token")


@pytest.fixture
def api_client(auth_token):
    """Authenticated requests session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestCoachingStabilityGet:
    """Tests for GET /api/coaching-stability/{program_id}"""

    def test_get_coaching_stability_returns_200(self, api_client):
        """Test that GET coaching stability returns 200 status"""
        response = api_client.get(f"{BASE_URL}/api/coaching-stability/{STANFORD_PROGRAM_ID}", timeout=60)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"GET coaching stability returned 200 OK")

    def test_get_coaching_stability_has_stability_field(self, api_client):
        """Test that response contains stability field"""
        response = api_client.get(f"{BASE_URL}/api/coaching-stability/{STANFORD_PROGRAM_ID}", timeout=60)
        assert response.status_code == 200
        data = response.json()
        assert "stability" in data, f"Response missing 'stability' field: {data}"
        print(f"Response contains 'stability' field")

    def test_get_coaching_stability_has_source_field(self, api_client):
        """Test that response contains source field (cached or scanned)"""
        response = api_client.get(f"{BASE_URL}/api/coaching-stability/{STANFORD_PROGRAM_ID}", timeout=60)
        assert response.status_code == 200
        data = response.json()
        assert "source" in data, f"Response missing 'source' field: {data}"
        assert data["source"] in ["cached", "scanned"], f"Invalid source: {data['source']}"
        print(f"Response source: {data['source']}")

    def test_stability_has_severity_field(self, api_client):
        """Test that stability object contains severity field"""
        response = api_client.get(f"{BASE_URL}/api/coaching-stability/{STANFORD_PROGRAM_ID}", timeout=60)
        assert response.status_code == 200
        data = response.json()
        stability = data.get("stability", {})
        assert "severity" in stability, f"Stability missing 'severity' field: {stability}"
        assert stability["severity"] in ["red", "yellow", "green"], f"Invalid severity: {stability['severity']}"
        print(f"Severity: {stability['severity']}")

    def test_stability_has_headline_field(self, api_client):
        """Test that stability object contains headline field"""
        response = api_client.get(f"{BASE_URL}/api/coaching-stability/{STANFORD_PROGRAM_ID}", timeout=60)
        assert response.status_code == 200
        data = response.json()
        stability = data.get("stability", {})
        assert "headline" in stability, f"Stability missing 'headline' field: {stability}"
        assert isinstance(stability["headline"], str), f"Headline should be string: {type(stability['headline'])}"
        print(f"Headline: {stability['headline']}")

    def test_stability_has_summary_field(self, api_client):
        """Test that stability object contains summary field"""
        response = api_client.get(f"{BASE_URL}/api/coaching-stability/{STANFORD_PROGRAM_ID}", timeout=60)
        assert response.status_code == 200
        data = response.json()
        stability = data.get("stability", {})
        assert "summary" in stability, f"Stability missing 'summary' field: {stability}"
        assert isinstance(stability["summary"], str), f"Summary should be string: {type(stability['summary'])}"
        print(f"Summary: {stability['summary'][:100]}...")

    def test_stability_has_change_type_field(self, api_client):
        """Test that stability object contains change_type field"""
        response = api_client.get(f"{BASE_URL}/api/coaching-stability/{STANFORD_PROGRAM_ID}", timeout=60)
        assert response.status_code == 200
        data = response.json()
        stability = data.get("stability", {})
        assert "change_type" in stability, f"Stability missing 'change_type' field: {stability}"
        valid_types = ["departure", "new_hire", "extension", "contract_update", "staff_change", "stable"]
        assert stability["change_type"] in valid_types, f"Invalid change_type: {stability['change_type']}"
        print(f"Change type: {stability['change_type']}")

    def test_stability_has_recommendation_field(self, api_client):
        """Test that stability object contains recommendation field"""
        response = api_client.get(f"{BASE_URL}/api/coaching-stability/{STANFORD_PROGRAM_ID}", timeout=60)
        assert response.status_code == 200
        data = response.json()
        stability = data.get("stability", {})
        assert "recommendation" in stability, f"Stability missing 'recommendation' field: {stability}"
        assert isinstance(stability["recommendation"], str), f"Recommendation should be string"
        print(f"Recommendation: {stability['recommendation'][:100]}...")

    def test_get_coaching_stability_invalid_program_returns_404(self, api_client):
        """Test that invalid program ID returns 404"""
        response = api_client.get(f"{BASE_URL}/api/coaching-stability/invalid-program-id-12345", timeout=30)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Invalid program ID correctly returns 404")

    def test_get_coaching_stability_without_auth_returns_401(self):
        """Test that unauthenticated request returns 401"""
        response = requests.get(f"{BASE_URL}/api/coaching-stability/{STANFORD_PROGRAM_ID}", timeout=30)
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Unauthenticated request correctly returns 401")


class TestCoachingStabilityRefresh:
    """Tests for POST /api/coaching-stability/{program_id}/refresh"""

    def test_refresh_coaching_stability_returns_200(self, api_client):
        """Test that POST refresh returns 200 status"""
        response = api_client.post(f"{BASE_URL}/api/coaching-stability/{STANFORD_PROGRAM_ID}/refresh", timeout=60)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("POST refresh returned 200 OK")

    def test_refresh_returns_stability_data(self, api_client):
        """Test that refresh returns stability data"""
        response = api_client.post(f"{BASE_URL}/api/coaching-stability/{STANFORD_PROGRAM_ID}/refresh", timeout=60)
        assert response.status_code == 200
        data = response.json()
        assert "stability" in data, f"Response missing 'stability' field: {data}"
        print("Refresh response contains stability data")

    def test_refresh_source_is_refreshed(self, api_client):
        """Test that refresh source is 'refreshed'"""
        response = api_client.post(f"{BASE_URL}/api/coaching-stability/{STANFORD_PROGRAM_ID}/refresh", timeout=60)
        assert response.status_code == 200
        data = response.json()
        assert data.get("source") == "refreshed", f"Expected source 'refreshed', got: {data.get('source')}"
        print("Refresh source correctly set to 'refreshed'")

    def test_refresh_invalid_program_returns_404(self, api_client):
        """Test that refresh with invalid program ID returns 404"""
        response = api_client.post(f"{BASE_URL}/api/coaching-stability/invalid-program-id-12345/refresh", timeout=30)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Refresh with invalid program ID correctly returns 404")

    def test_refresh_without_auth_returns_401(self):
        """Test that unauthenticated refresh returns 401"""
        response = requests.post(f"{BASE_URL}/api/coaching-stability/{STANFORD_PROGRAM_ID}/refresh", timeout=30)
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Unauthenticated refresh correctly returns 401")


class TestCoachingStabilityCaching:
    """Tests for caching behavior"""

    def test_second_call_returns_cached(self, api_client):
        """Test that second call returns cached data"""
        # First call - may be scanned or cached
        response1 = api_client.get(f"{BASE_URL}/api/coaching-stability/{STANFORD_PROGRAM_ID}", timeout=60)
        assert response1.status_code == 200
        
        # Second call - should be cached
        response2 = api_client.get(f"{BASE_URL}/api/coaching-stability/{STANFORD_PROGRAM_ID}", timeout=30)
        assert response2.status_code == 200
        data2 = response2.json()
        assert data2.get("source") == "cached", f"Expected cached source on second call, got: {data2.get('source')}"
        print("Second call correctly returns cached data")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

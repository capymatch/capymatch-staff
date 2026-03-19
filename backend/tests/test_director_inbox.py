"""
Director Inbox API Tests
Tests the new /api/director-inbox endpoint that aggregates critical signals
from escalations, advocacy, roster, and momentum sources.
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Director credentials
DIRECTOR_EMAIL = "director@capymatch.com"
DIRECTOR_PASSWORD = "director123"


@pytest.fixture(scope="module")
def director_token():
    """Get director authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": DIRECTOR_EMAIL, "password": DIRECTOR_PASSWORD}
    )
    assert response.status_code == 200, f"Director login failed: {response.text}"
    data = response.json()
    assert "token" in data, "No token in login response"
    return data["token"]


@pytest.fixture
def director_client(director_token):
    """Authenticated session for director"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {director_token}"
    })
    return session


class TestDirectorInboxEndpoint:
    """Tests for GET /api/director-inbox"""

    def test_endpoint_returns_200(self, director_client):
        """Verify endpoint is accessible and returns 200"""
        response = director_client.get(f"{BASE_URL}/api/director-inbox")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

    def test_response_structure(self, director_client):
        """Verify response has items array and count"""
        response = director_client.get(f"{BASE_URL}/api/director-inbox")
        data = response.json()
        
        assert "items" in data, "Response missing 'items' field"
        assert "count" in data, "Response missing 'count' field"
        assert isinstance(data["items"], list), "items should be a list"
        assert isinstance(data["count"], int), "count should be an integer"
        assert data["count"] == len(data["items"]), "count should match items length"

    def test_item_has_required_fields(self, director_client):
        """Verify each item has all required fields"""
        response = director_client.get(f"{BASE_URL}/api/director-inbox")
        data = response.json()
        
        required_fields = ["id", "athleteName", "issueType", "priority", "timestamp", "timeAgo", "source", "cta"]
        
        for item in data["items"]:
            for field in required_fields:
                assert field in item, f"Item missing required field: {field}"
            
            # Verify cta structure
            assert "label" in item["cta"], "CTA missing label"
            assert "url" in item["cta"], "CTA missing url"

    def test_priority_values_valid(self, director_client):
        """Verify priority is either 'high' or 'medium'"""
        response = director_client.get(f"{BASE_URL}/api/director-inbox")
        data = response.json()
        
        valid_priorities = ["high", "medium"]
        for item in data["items"]:
            assert item["priority"] in valid_priorities, f"Invalid priority: {item['priority']}"

    def test_source_values_valid(self, director_client):
        """Verify source is one of the 4 expected values"""
        response = director_client.get(f"{BASE_URL}/api/director-inbox")
        data = response.json()
        
        valid_sources = ["escalation", "advocacy", "roster", "momentum"]
        for item in data["items"]:
            assert item["source"] in valid_sources, f"Invalid source: {item['source']}"

    def test_sorting_high_priority_first(self, director_client):
        """Verify high priority items come before medium priority items"""
        response = director_client.get(f"{BASE_URL}/api/director-inbox")
        data = response.json()
        
        items = data["items"]
        if len(items) < 2:
            pytest.skip("Not enough items to test sorting")
        
        # Find first medium priority item index
        first_medium_idx = None
        for i, item in enumerate(items):
            if item["priority"] == "medium":
                first_medium_idx = i
                break
        
        # All items before first_medium_idx should be high priority
        if first_medium_idx is not None:
            for i in range(first_medium_idx):
                assert items[i]["priority"] == "high", f"Item at index {i} should be high priority"
            # All items from first_medium_idx should be medium priority
            for i in range(first_medium_idx, len(items)):
                assert items[i]["priority"] == "medium", f"Item at index {i} should be medium priority"

    def test_aggregates_from_multiple_sources(self, director_client):
        """Verify items come from multiple data sources"""
        response = director_client.get(f"{BASE_URL}/api/director-inbox")
        data = response.json()
        
        sources_found = set()
        for item in data["items"]:
            sources_found.add(item["source"])
        
        # Should have at least 2 different sources in test data
        assert len(sources_found) >= 2, f"Expected items from multiple sources, found: {sources_found}"

    def test_escalation_items_have_correct_format(self, director_client):
        """Verify escalation items have correct issueType and CTA"""
        response = director_client.get(f"{BASE_URL}/api/director-inbox")
        data = response.json()
        
        escalation_items = [i for i in data["items"] if i["source"] == "escalation"]
        for item in escalation_items:
            assert item["issueType"] == "Escalation", f"Escalation item has wrong issueType: {item['issueType']}"
            assert item["cta"]["label"] == "Open Pod", f"Escalation CTA label wrong: {item['cta']['label']}"
            assert "/support-pods/" in item["cta"]["url"], f"Escalation CTA URL wrong: {item['cta']['url']}"

    def test_roster_items_have_correct_format(self, director_client):
        """Verify roster items have correct format"""
        response = director_client.get(f"{BASE_URL}/api/director-inbox")
        data = response.json()
        
        roster_items = [i for i in data["items"] if i["source"] == "roster"]
        for item in roster_items:
            assert item["issueType"] in ["No coach assigned", "Missing documents"], f"Roster item has unexpected issueType: {item['issueType']}"

    def test_momentum_items_have_correct_format(self, director_client):
        """Verify momentum items have correct format"""
        response = director_client.get(f"{BASE_URL}/api/director-inbox")
        data = response.json()
        
        momentum_items = [i for i in data["items"] if i["source"] == "momentum"]
        for item in momentum_items:
            assert item["issueType"] == "No activity", f"Momentum item has wrong issueType: {item['issueType']}"
            assert "inactive" in item["timeAgo"], f"Momentum timeAgo should contain 'inactive': {item['timeAgo']}"

    def test_advocacy_items_have_correct_format(self, director_client):
        """Verify advocacy items have correct format"""
        response = director_client.get(f"{BASE_URL}/api/director-inbox")
        data = response.json()
        
        advocacy_items = [i for i in data["items"] if i["source"] == "advocacy"]
        for item in advocacy_items:
            assert item["issueType"] in ["Awaiting reply", "Needs follow-up"], f"Advocacy item has unexpected issueType: {item['issueType']}"
            assert item["cta"]["url"] == "/advocacy", f"Advocacy CTA URL wrong: {item['cta']['url']}"


class TestDirectorInboxAuth:
    """Authentication tests for director inbox endpoint"""

    def test_requires_authentication(self):
        """Verify endpoint requires auth token"""
        response = requests.get(f"{BASE_URL}/api/director-inbox")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"

    def test_invalid_token_rejected(self):
        """Verify invalid token is rejected"""
        response = requests.get(
            f"{BASE_URL}/api/director-inbox",
            headers={"Authorization": "Bearer invalid_token"}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"

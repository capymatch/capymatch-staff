"""
Momentum Recap API Tests
Tests the /api/athlete/momentum-recap endpoint for the post-event recap feature.
Verifies recap_hero, momentum shifts, priorities, and AI summary generation.
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
TEST_EMAIL = "emma.chen@athlete.capymatch.com"
TEST_PASSWORD = "athlete123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for Emma Chen (athlete)"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
    )
    if response.status_code != 200:
        pytest.skip(f"Authentication failed: {response.status_code}")
    return response.json().get("token")


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Create authenticated API client"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}",
    })
    return session


class TestMomentumRecapEndpoint:
    """Tests for GET /api/athlete/momentum-recap"""

    def test_endpoint_returns_200(self, api_client):
        """Test that the endpoint returns 200 OK"""
        response = api_client.get(f"{BASE_URL}/api/athlete/momentum-recap", timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"

    def test_response_has_required_fields(self, api_client):
        """Test that response contains all required top-level fields"""
        response = api_client.get(f"{BASE_URL}/api/athlete/momentum-recap", timeout=30)
        assert response.status_code == 200
        data = response.json()

        required_fields = ["recap_hero", "momentum", "priorities", "ai_summary", "period_label"]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"

    def test_recap_hero_is_string(self, api_client):
        """Test that recap_hero is a non-empty string summary sentence"""
        response = api_client.get(f"{BASE_URL}/api/athlete/momentum-recap", timeout=30)
        data = response.json()

        assert isinstance(data["recap_hero"], str)
        assert len(data["recap_hero"]) > 10, "recap_hero should be a meaningful sentence"

    def test_momentum_has_three_categories(self, api_client):
        """Test that momentum object has heated_up, holding_steady, cooling_off"""
        response = api_client.get(f"{BASE_URL}/api/athlete/momentum-recap", timeout=30)
        data = response.json()

        assert "momentum" in data
        momentum = data["momentum"]

        assert "heated_up" in momentum
        assert "holding_steady" in momentum
        assert "cooling_off" in momentum

        # Each should be a list
        assert isinstance(momentum["heated_up"], list)
        assert isinstance(momentum["holding_steady"], list)
        assert isinstance(momentum["cooling_off"], list)

    def test_momentum_items_have_required_fields(self, api_client):
        """Test that each momentum item has required fields"""
        response = api_client.get(f"{BASE_URL}/api/athlete/momentum-recap", timeout=30)
        data = response.json()

        required_item_fields = [
            "program_id", "school_name", "category", "what_changed",
            "why_it_matters", "current_stage", "stage_label"
        ]

        all_items = (
            data["momentum"]["heated_up"] +
            data["momentum"]["holding_steady"] +
            data["momentum"]["cooling_off"]
        )

        assert len(all_items) > 0, "Should have at least one momentum item"

        for item in all_items:
            for field in required_item_fields:
                assert field in item, f"Momentum item missing field: {field}"

    def test_priorities_structure(self, api_client):
        """Test that priorities list has correct structure"""
        response = api_client.get(f"{BASE_URL}/api/athlete/momentum-recap", timeout=30)
        data = response.json()

        assert "priorities" in data
        priorities = data["priorities"]
        assert isinstance(priorities, list)

        # Should have at least one priority if there are any programs
        if len(priorities) > 0:
            required_priority_fields = ["rank", "school_name", "program_id", "action", "reason"]
            for priority in priorities:
                for field in required_priority_fields:
                    assert field in priority, f"Priority missing field: {field}"

    def test_priorities_have_valid_ranks(self, api_client):
        """Test that priorities have valid rank values"""
        response = api_client.get(f"{BASE_URL}/api/athlete/momentum-recap", timeout=30)
        data = response.json()

        valid_ranks = ["top", "secondary", "watch"]
        for priority in data["priorities"]:
            assert priority["rank"] in valid_ranks, f"Invalid rank: {priority['rank']}"

    def test_priorities_count_structure(self, api_client):
        """Test priority count: 1 top, up to 2 secondary, 1 watch"""
        response = api_client.get(f"{BASE_URL}/api/athlete/momentum-recap", timeout=30)
        data = response.json()

        priorities = data["priorities"]
        top_count = sum(1 for p in priorities if p["rank"] == "top")
        secondary_count = sum(1 for p in priorities if p["rank"] == "secondary")
        watch_count = sum(1 for p in priorities if p["rank"] == "watch")

        assert top_count <= 1, "Should have at most 1 top priority"
        assert secondary_count <= 2, "Should have at most 2 secondary priorities"
        assert watch_count <= 1, "Should have at most 1 watch priority"

    def test_ai_summary_is_narrative(self, api_client):
        """Test that AI summary is narrative prose (not bullet points)"""
        response = api_client.get(f"{BASE_URL}/api/athlete/momentum-recap", timeout=30)
        data = response.json()

        ai_summary = data["ai_summary"]
        assert isinstance(ai_summary, str)

        # Should not contain bullet points
        if len(ai_summary) > 20:  # Only check if there's substantial content
            assert "• " not in ai_summary, "AI summary should not have bullet points"
            # Markdown bullets check
            lines = ai_summary.split("\n")
            for line in lines:
                stripped = line.strip()
                if stripped:
                    assert not stripped.startswith("- "), "AI summary should not have markdown bullets"

    def test_period_label_present(self, api_client):
        """Test that period_label describes the time window"""
        response = api_client.get(f"{BASE_URL}/api/athlete/momentum-recap", timeout=30)
        data = response.json()

        assert "period_label" in data
        period_label = data["period_label"]
        assert isinstance(period_label, str)
        assert len(period_label) > 0

        # Should reference an event or time period
        assert "Since" in period_label or "Last" in period_label or "days" in period_label

    def test_momentum_categories_match_items(self, api_client):
        """Test that items are in the correct category"""
        response = api_client.get(f"{BASE_URL}/api/athlete/momentum-recap", timeout=30)
        data = response.json()

        for category in ["heated_up", "holding_steady", "cooling_off"]:
            for item in data["momentum"][category]:
                assert item["category"] == category, f"Item in {category} has wrong category: {item['category']}"


class TestMomentumRecapAuthentication:
    """Tests for authentication on momentum recap endpoint"""

    def test_unauthenticated_request_fails(self):
        """Test that unauthenticated requests are rejected"""
        response = requests.get(f"{BASE_URL}/api/athlete/momentum-recap")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"

    def test_invalid_token_fails(self):
        """Test that invalid tokens are rejected"""
        headers = {"Authorization": "Bearer invalid_token_here"}
        response = requests.get(f"{BASE_URL}/api/athlete/momentum-recap", headers=headers)
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestMomentumRecapSeedData:
    """Tests verifying seed data expectations for Emma Chen"""

    def test_emma_has_five_programs(self, api_client):
        """Test that Emma Chen has 5 programs in the recap"""
        response = api_client.get(f"{BASE_URL}/api/athlete/momentum-recap", timeout=30)
        data = response.json()

        total_items = (
            len(data["momentum"]["heated_up"]) +
            len(data["momentum"]["holding_steady"]) +
            len(data["momentum"]["cooling_off"])
        )

        assert total_items == 5, f"Expected 5 programs, got {total_items}"

    def test_heated_up_has_expected_count(self, api_client):
        """Test that heated_up has 3 schools (Stanford, UF, UCLA)"""
        response = api_client.get(f"{BASE_URL}/api/athlete/momentum-recap", timeout=30)
        data = response.json()

        heated_count = len(data["momentum"]["heated_up"])
        assert heated_count == 3, f"Expected 3 heated_up schools, got {heated_count}"

    def test_holding_steady_has_expected_count(self, api_client):
        """Test that holding_steady has 1 school (Creighton)"""
        response = api_client.get(f"{BASE_URL}/api/athlete/momentum-recap", timeout=30)
        data = response.json()

        steady_count = len(data["momentum"]["holding_steady"])
        assert steady_count == 1, f"Expected 1 holding_steady school, got {steady_count}"

    def test_cooling_off_has_expected_count(self, api_client):
        """Test that cooling_off has 1 school (Emory)"""
        response = api_client.get(f"{BASE_URL}/api/athlete/momentum-recap", timeout=30)
        data = response.json()

        cooling_count = len(data["momentum"]["cooling_off"])
        assert cooling_count == 1, f"Expected 1 cooling_off school, got {cooling_count}"

    def test_period_references_winter_showcase(self, api_client):
        """Test that period label references Winter Showcase event"""
        response = api_client.get(f"{BASE_URL}/api/athlete/momentum-recap", timeout=30)
        data = response.json()

        assert "Winter Showcase" in data["period_label"], "Period should reference Winter Showcase"

    def test_emory_is_top_priority(self, api_client):
        """Test that Emory (cooling off) is the top priority for re-engagement"""
        response = api_client.get(f"{BASE_URL}/api/athlete/momentum-recap", timeout=30)
        data = response.json()

        top_priorities = [p for p in data["priorities"] if p["rank"] == "top"]
        assert len(top_priorities) == 1, "Should have exactly 1 top priority"

        top = top_priorities[0]
        assert "Emory" in top["school_name"], f"Top priority should be Emory, got {top['school_name']}"

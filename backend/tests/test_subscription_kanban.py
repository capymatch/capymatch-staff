"""
Test suite for Subscription Tiers and Kanban DnD features.
Tests: 
- Subscription API endpoints (GET /subscription, GET /subscription/tiers)
- School limit enforcement (403 when over limit)
- Journey stage updates via PUT /api/athlete/programs/{id}
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://premium-dark-ui-6.preview.emergentagent.com").rstrip("/")

# Test credentials
ATHLETE_EMAIL = "emma.chen@athlete.capymatch.com"
ATHLETE_PASSWORD = "password123"


class TestSubscriptionTiers:
    """Test subscription tier endpoints"""

    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for athlete"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ATHLETE_EMAIL,
            "password": ATHLETE_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        return data["token"]

    def test_get_subscription_tiers_returns_all_3_tiers(self):
        """GET /api/subscription/tiers returns all 3 tiers with correct pricing"""
        response = requests.get(f"{BASE_URL}/api/subscription/tiers")
        assert response.status_code == 200

        data = response.json()
        assert "tiers" in data
        tiers = data["tiers"]
        assert len(tiers) == 3

        # Verify tier IDs
        tier_ids = [t["id"] for t in tiers]
        assert "basic" in tier_ids
        assert "pro" in tier_ids
        assert "premium" in tier_ids

        # Verify pricing
        basic = next(t for t in tiers if t["id"] == "basic")
        assert basic["label"] == "Starter"
        assert basic["price"] == 0
        assert basic["max_schools"] == 5
        assert isinstance(basic["features"], list)
        assert len(basic["features"]) > 0

        pro = next(t for t in tiers if t["id"] == "pro")
        assert pro["label"] == "Pro"
        assert pro["price"] == 12
        assert pro["max_schools"] == 25

        premium = next(t for t in tiers if t["id"] == "premium")
        assert premium["label"] == "Premium"
        assert premium["price"] == 29
        assert premium["max_schools"] == -1  # unlimited

    def test_get_my_subscription_returns_tier_and_usage(self, auth_token):
        """GET /api/subscription returns tier, label, price, features, limits, and usage"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/subscription", headers=headers)
        assert response.status_code == 200

        data = response.json()
        
        # Verify required fields
        assert "tier" in data
        assert "label" in data
        assert "price" in data
        assert "features" in data
        assert "limits" in data
        assert "usage" in data

        # Verify usage structure
        usage = data["usage"]
        assert "schools" in usage
        assert "schools_limit" in usage
        assert "schools_remaining" in usage
        assert "ai_drafts_used" in usage
        assert "ai_drafts_limit" in usage

        # Verify limits structure
        limits = data["limits"]
        assert "max_schools" in limits
        assert "ai_drafts_per_month" in limits
        assert "gmail_integration" in limits

        # Emma is on basic tier
        assert data["tier"] == "basic"
        assert data["label"] == "Starter"
        assert data["price"] == 0


class TestSchoolLimitEnforcement:
    """Test school limit enforcement when adding to board"""

    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for athlete"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ATHLETE_EMAIL,
            "password": ATHLETE_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]

    def test_add_school_returns_403_when_over_limit(self, auth_token):
        """POST /api/knowledge-base/add-to-board returns 403 with subscription_limit when over limit"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        
        # Emma has 12 schools on basic tier (limit 5), should fail
        response = requests.post(
            f"{BASE_URL}/api/knowledge-base/add-to-board",
            headers=headers,
            json={"university_name": "Duke University"}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data
        detail = data["detail"]
        
        # Verify subscription_limit error structure
        assert detail.get("type") == "subscription_limit"
        assert "message" in detail
        assert "You've reached your limit" in detail["message"]
        assert "current" in detail
        assert "limit" in detail
        assert "upgrade_to" in detail
        assert detail["upgrade_to"] == "pro"

    def test_legacy_add_to_pipeline_returns_403_when_over_limit(self, auth_token):
        """POST /api/athlete/knowledge/{domain}/add-to-pipeline returns 403 when over limit"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Use a school domain that's not already on the board
        response = requests.post(
            f"{BASE_URL}/api/athlete/knowledge/duke.edu/add-to-pipeline",
            headers=headers
        )
        
        # Should be 403 (limit) or 404 (school not found in KB)
        assert response.status_code in [403, 404], f"Expected 403 or 404, got {response.status_code}"


class TestKanbanDragDrop:
    """Test Kanban board journey stage updates"""

    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for athlete"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ATHLETE_EMAIL,
            "password": ATHLETE_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]

    @pytest.fixture(scope="class")
    def program_id(self, auth_token):
        """Get first program ID from athlete's board"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/athlete/programs", headers=headers)
        assert response.status_code == 200
        programs = response.json()
        assert len(programs) > 0, "Athlete should have at least one program"
        return programs[0]["program_id"]

    def test_get_athlete_programs_returns_programs(self, auth_token):
        """GET /api/athlete/programs returns list of programs with journey_stage"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/athlete/programs", headers=headers)
        assert response.status_code == 200
        
        programs = response.json()
        assert isinstance(programs, list)
        assert len(programs) > 0
        
        # Verify program structure
        program = programs[0]
        assert "program_id" in program
        assert "university_name" in program
        assert "division" in program
        assert "board_group" in program
        # journey_stage may or may not be present

    def test_update_journey_stage_via_put(self, auth_token, program_id):
        """PUT /api/athlete/programs/{id} updates journey_stage and recruiting_status"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        
        # Update to "outreach" stage
        response = requests.put(
            f"{BASE_URL}/api/athlete/programs/{program_id}",
            headers=headers,
            json={"journey_stage": "outreach", "recruiting_status": "Contacted"}
        )
        
        assert response.status_code == 200, f"PUT failed: {response.text}"
        
        data = response.json()
        assert data["journey_stage"] == "outreach"
        assert data["recruiting_status"] == "Contacted"
        
        # Verify GET returns updated data
        get_response = requests.get(f"{BASE_URL}/api/athlete/programs", headers=headers)
        assert get_response.status_code == 200
        programs = get_response.json()
        updated_program = next((p for p in programs if p["program_id"] == program_id), None)
        assert updated_program is not None
        assert updated_program.get("journey_stage") == "outreach"

    def test_update_to_each_kanban_column_stage(self, auth_token, program_id):
        """Test updating to various kanban column stages"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        
        # Test stage mappings from COL_TO_STAGE
        stage_mappings = [
            {"journey_stage": "added", "recruiting_status": "Not Contacted"},
            {"journey_stage": "outreach", "recruiting_status": "Contacted"},
            {"journey_stage": "in_conversation", "recruiting_status": "In Conversation"},
            {"journey_stage": "campus_visit", "recruiting_status": "Campus Visit"},
            {"journey_stage": "offer", "recruiting_status": "Offer"},
            {"journey_stage": "committed", "recruiting_status": "Committed"},
        ]
        
        for mapping in stage_mappings:
            response = requests.put(
                f"{BASE_URL}/api/athlete/programs/{program_id}",
                headers=headers,
                json=mapping
            )
            assert response.status_code == 200, f"Failed to update to {mapping}: {response.text}"
            data = response.json()
            assert data.get("journey_stage") == mapping["journey_stage"]
        
        # Reset to added for cleanup
        requests.put(
            f"{BASE_URL}/api/athlete/programs/{program_id}",
            headers=headers,
            json={"journey_stage": "added", "recruiting_status": "Not Contacted"}
        )


class TestSubscriptionUsage:
    """Test subscription usage calculations"""

    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ATHLETE_EMAIL,
            "password": ATHLETE_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]

    def test_usage_shows_correct_school_count(self, auth_token):
        """Verify usage.schools matches actual program count"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Get subscription
        sub_response = requests.get(f"{BASE_URL}/api/subscription", headers=headers)
        assert sub_response.status_code == 200
        subscription = sub_response.json()
        
        # Get programs
        programs_response = requests.get(f"{BASE_URL}/api/athlete/programs", headers=headers)
        assert programs_response.status_code == 200
        programs = programs_response.json()
        
        # Compare counts
        assert subscription["usage"]["schools"] == len(programs), \
            f"Usage shows {subscription['usage']['schools']} schools but athlete has {len(programs)}"

    def test_schools_remaining_calculation(self, auth_token):
        """Verify schools_remaining is correctly calculated"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(f"{BASE_URL}/api/subscription", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        usage = data["usage"]
        expected_remaining = usage["schools_limit"] - usage["schools"]
        assert usage["schools_remaining"] == expected_remaining


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

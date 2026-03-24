"""
Club Plans API Tests - Testing plan definitions, feature entitlements, and gating APIs.

Tests cover:
1. GET /api/club-plans - List all 5 plans with entitlements
2. GET /api/club-plans/current - Get current org plan + usage
3. GET /api/club-plans/entitlements - Get entitlements for current plan
4. GET /api/club-plans/check/{feature_id} - Check feature access
5. POST /api/club-plans/set - Switch plan (director only)
6. Feature gating logic for different plans
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
DIRECTOR_EMAIL = "director@capymatch.com"
DIRECTOR_PASSWORD = "director123"
COACH_EMAIL = "coach.williams@capymatch.com"
COACH_PASSWORD = "coach123"


class TestClubPlansAuth:
    """Authentication helpers for club plans tests"""
    
    @pytest.fixture(scope="class")
    def director_token(self):
        """Get director auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DIRECTOR_EMAIL,
            "password": DIRECTOR_PASSWORD
        })
        assert response.status_code == 200, f"Director login failed: {response.text}"
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def coach_token(self):
        """Get coach auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": COACH_EMAIL,
            "password": COACH_PASSWORD
        })
        assert response.status_code == 200, f"Coach login failed: {response.text}"
        return response.json().get("token")
    
    @pytest.fixture
    def director_headers(self, director_token):
        """Headers with director auth"""
        return {"Authorization": f"Bearer {director_token}", "Content-Type": "application/json"}
    
    @pytest.fixture
    def coach_headers(self, coach_token):
        """Headers with coach auth"""
        return {"Authorization": f"Bearer {coach_token}", "Content-Type": "application/json"}


class TestListPlans(TestClubPlansAuth):
    """Test GET /api/club-plans - List all plans"""
    
    def test_list_all_plans_returns_5_plans(self, director_headers):
        """GET /api/club-plans returns all 5 plans"""
        response = requests.get(f"{BASE_URL}/api/club-plans", headers=director_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "plans" in data
        plans = data["plans"]
        assert len(plans) == 5, f"Expected 5 plans, got {len(plans)}"
        
        # Verify all plan IDs are present
        plan_ids = [p["id"] for p in plans]
        expected_ids = ["starter", "growth", "club_pro", "elite", "enterprise"]
        for pid in expected_ids:
            assert pid in plan_ids, f"Missing plan: {pid}"
    
    def test_plans_have_required_fields(self, director_headers):
        """Each plan has required fields: id, label, price_monthly, max_athletes, entitlements"""
        response = requests.get(f"{BASE_URL}/api/club-plans", headers=director_headers)
        assert response.status_code == 200
        
        plans = response.json()["plans"]
        for plan in plans:
            assert "id" in plan
            assert "label" in plan
            assert "price_monthly" in plan
            assert "max_athletes" in plan
            assert "max_coaches" in plan
            assert "entitlements" in plan
            assert "limits" in plan
            assert "features" in plan
    
    def test_starter_plan_pricing(self, director_headers):
        """Starter plan has correct pricing: $199/mo, 25 athletes"""
        response = requests.get(f"{BASE_URL}/api/club-plans", headers=director_headers)
        plans = response.json()["plans"]
        starter = next(p for p in plans if p["id"] == "starter")
        
        assert starter["price_monthly"] == 199
        assert starter["max_athletes"] == 25
        assert starter["max_coaches"] == 3
        assert starter["label"] == "Starter"
    
    def test_growth_plan_pricing(self, director_headers):
        """Growth plan has correct pricing: $329/mo, 50 athletes"""
        response = requests.get(f"{BASE_URL}/api/club-plans", headers=director_headers)
        plans = response.json()["plans"]
        growth = next(p for p in plans if p["id"] == "growth")
        
        assert growth["price_monthly"] == 329
        assert growth["max_athletes"] == 50
        assert growth["max_coaches"] == 6
    
    def test_club_pro_plan_pricing(self, director_headers):
        """Club Pro plan has correct pricing: $449/mo, 75 athletes"""
        response = requests.get(f"{BASE_URL}/api/club-plans", headers=director_headers)
        plans = response.json()["plans"]
        club_pro = next(p for p in plans if p["id"] == "club_pro")
        
        assert club_pro["price_monthly"] == 449
        assert club_pro["max_athletes"] == 75
        assert club_pro["max_coaches"] == 10
    
    def test_elite_plan_pricing(self, director_headers):
        """Elite plan has correct pricing: $699/mo, 125 athletes"""
        response = requests.get(f"{BASE_URL}/api/club-plans", headers=director_headers)
        plans = response.json()["plans"]
        elite = next(p for p in plans if p["id"] == "elite")
        
        assert elite["price_monthly"] == 699
        assert elite["max_athletes"] == 125
        assert elite["max_coaches"] == 20
    
    def test_enterprise_plan_custom_pricing(self, director_headers):
        """Enterprise plan has custom pricing (None) and unlimited athletes"""
        response = requests.get(f"{BASE_URL}/api/club-plans", headers=director_headers)
        plans = response.json()["plans"]
        enterprise = next(p for p in plans if p["id"] == "enterprise")
        
        assert enterprise["price_monthly"] is None
        assert enterprise["max_athletes"] == -1  # unlimited
        assert enterprise["max_coaches"] == -1


class TestCurrentPlan(TestClubPlansAuth):
    """Test GET /api/club-plans/current - Get current org plan + usage"""
    
    def test_get_current_plan_returns_plan_info(self, director_headers):
        """GET /api/club-plans/current returns plan, subscription, usage, entitlements"""
        response = requests.get(f"{BASE_URL}/api/club-plans/current", headers=director_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "plan" in data
        assert "subscription" in data
        assert "usage" in data
        assert "entitlements" in data
    
    def test_current_plan_has_usage_counts(self, director_headers):
        """Current plan response includes athlete and coach usage counts"""
        response = requests.get(f"{BASE_URL}/api/club-plans/current", headers=director_headers)
        data = response.json()
        
        usage = data["usage"]
        assert "athletes" in usage
        assert "coaches" in usage
        assert "max_athletes" in usage
        assert "max_coaches" in usage
        assert "athletes_pct" in usage
        assert "coaches_pct" in usage
        
        # Usage values should be non-negative integers
        assert isinstance(usage["athletes"], int)
        assert isinstance(usage["coaches"], int)
        assert usage["athletes"] >= 0
        assert usage["coaches"] >= 0
    
    def test_coach_can_get_current_plan(self, coach_headers):
        """Coach can also access current plan endpoint"""
        response = requests.get(f"{BASE_URL}/api/club-plans/current", headers=coach_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "plan" in data
        assert "usage" in data


class TestEntitlements(TestClubPlansAuth):
    """Test GET /api/club-plans/entitlements - Get entitlements for current plan"""
    
    def test_get_entitlements_returns_plan_info(self, director_headers):
        """GET /api/club-plans/entitlements returns plan_id, plan_label, limits, entitlements"""
        response = requests.get(f"{BASE_URL}/api/club-plans/entitlements", headers=director_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "plan_id" in data
        assert "plan_label" in data
        assert "limits" in data
        assert "entitlements" in data
    
    def test_entitlements_have_allowed_and_access_fields(self, director_headers):
        """Each entitlement has 'allowed' and 'access' fields"""
        response = requests.get(f"{BASE_URL}/api/club-plans/entitlements", headers=director_headers)
        data = response.json()
        
        entitlements = data["entitlements"]
        assert len(entitlements) > 0
        
        # Check a few known features
        for feature_id in ["director_inbox", "ai_email_draft", "mission_control_kpis"]:
            if feature_id in entitlements:
                assert "allowed" in entitlements[feature_id]
                assert "access" in entitlements[feature_id]


class TestCheckFeature(TestClubPlansAuth):
    """Test GET /api/club-plans/check/{feature_id} - Check feature access"""
    
    def test_check_director_inbox_returns_access_info(self, director_headers):
        """GET /api/club-plans/check/director_inbox returns allowed, access, min_plan"""
        response = requests.get(f"{BASE_URL}/api/club-plans/check/director_inbox", headers=director_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "allowed" in data
        assert "access" in data
        assert "min_plan" in data
        assert "min_plan_label" in data
        assert "current_plan" in data
    
    def test_check_unknown_feature_returns_allowed(self, director_headers):
        """Unknown feature returns allowed=True (no gating)"""
        response = requests.get(f"{BASE_URL}/api/club-plans/check/unknown_feature_xyz", headers=director_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["allowed"] is True
    
    def test_check_mission_control_kpis_always_allowed(self, director_headers):
        """mission_control_kpis is always allowed (all plans)"""
        response = requests.get(f"{BASE_URL}/api/club-plans/check/mission_control_kpis", headers=director_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["allowed"] is True


class TestSetPlan(TestClubPlansAuth):
    """Test POST /api/club-plans/set - Switch plan"""
    
    def test_director_can_set_plan_to_starter(self, director_headers):
        """Director can switch plan to starter"""
        response = requests.post(
            f"{BASE_URL}/api/club-plans/set",
            json={"plan_id": "starter"},
            headers=director_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["plan_id"] == "starter"
        assert data["label"] == "Starter"
        assert "message" in data
    
    def test_director_can_set_plan_to_growth(self, director_headers):
        """Director can switch plan to growth"""
        response = requests.post(
            f"{BASE_URL}/api/club-plans/set",
            json={"plan_id": "growth"},
            headers=director_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["plan_id"] == "growth"
        assert data["label"] == "Growth"
    
    def test_director_can_set_plan_to_club_pro(self, director_headers):
        """Director can switch plan to club_pro"""
        response = requests.post(
            f"{BASE_URL}/api/club-plans/set",
            json={"plan_id": "club_pro"},
            headers=director_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["plan_id"] == "club_pro"
        assert data["label"] == "Club Pro"
    
    def test_coach_cannot_set_plan(self, coach_headers):
        """Coach cannot change the club plan (403)"""
        response = requests.post(
            f"{BASE_URL}/api/club-plans/set",
            json={"plan_id": "elite"},
            headers=coach_headers
        )
        assert response.status_code == 403
    
    def test_invalid_plan_id_returns_400(self, director_headers):
        """Invalid plan_id returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/club-plans/set",
            json={"plan_id": "invalid_plan_xyz"},
            headers=director_headers
        )
        assert response.status_code == 400


class TestFeatureGating(TestClubPlansAuth):
    """Test feature gating logic for different plans"""
    
    def test_starter_blocks_director_inbox(self, director_headers):
        """On Starter plan, director_inbox is blocked"""
        # First set to starter
        requests.post(
            f"{BASE_URL}/api/club-plans/set",
            json={"plan_id": "starter"},
            headers=director_headers
        )
        
        # Check director_inbox
        response = requests.get(f"{BASE_URL}/api/club-plans/check/director_inbox", headers=director_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["allowed"] is False
        assert data["current_plan"] == "starter"
        assert data["min_plan"] == "growth"
    
    def test_growth_allows_director_inbox(self, director_headers):
        """On Growth plan, director_inbox is allowed"""
        # Set to growth
        requests.post(
            f"{BASE_URL}/api/club-plans/set",
            json={"plan_id": "growth"},
            headers=director_headers
        )
        
        # Check director_inbox
        response = requests.get(f"{BASE_URL}/api/club-plans/check/director_inbox", headers=director_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["allowed"] is True
        assert data["current_plan"] == "growth"
    
    def test_starter_blocks_ai_email_draft(self, director_headers):
        """On Starter plan, ai_email_draft is blocked"""
        # Set to starter
        requests.post(
            f"{BASE_URL}/api/club-plans/set",
            json={"plan_id": "starter"},
            headers=director_headers
        )
        
        # Check ai_email_draft
        response = requests.get(f"{BASE_URL}/api/club-plans/check/ai_email_draft", headers=director_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["allowed"] is False
        assert data["min_plan"] == "club_pro"
    
    def test_club_pro_gives_50_limit_ai_email_draft(self, director_headers):
        """On Club Pro plan, ai_email_draft has 50 limit"""
        # Set to club_pro
        requests.post(
            f"{BASE_URL}/api/club-plans/set",
            json={"plan_id": "club_pro"},
            headers=director_headers
        )
        
        # Check ai_email_draft
        response = requests.get(f"{BASE_URL}/api/club-plans/check/ai_email_draft", headers=director_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["allowed"] is True
        assert data["access"] == 50  # 50 limit per month
        assert data["current_plan"] == "club_pro"
    
    def test_elite_gives_unlimited_ai_email_draft(self, director_headers):
        """On Elite plan, ai_email_draft is unlimited (True)"""
        # Set to elite
        requests.post(
            f"{BASE_URL}/api/club-plans/set",
            json={"plan_id": "elite"},
            headers=director_headers
        )
        
        # Check ai_email_draft
        response = requests.get(f"{BASE_URL}/api/club-plans/check/ai_email_draft", headers=director_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["allowed"] is True
        assert data["access"] is True  # unlimited
        assert data["current_plan"] == "elite"
    
    def test_plan_change_reflects_in_entitlements(self, director_headers):
        """After plan change, entitlements endpoint reflects new plan"""
        # Set to starter
        requests.post(
            f"{BASE_URL}/api/club-plans/set",
            json={"plan_id": "starter"},
            headers=director_headers
        )
        
        # Get entitlements
        response = requests.get(f"{BASE_URL}/api/club-plans/entitlements", headers=director_headers)
        data = response.json()
        
        assert data["plan_id"] == "starter"
        assert data["plan_label"] == "Starter"
        assert data["entitlements"]["director_inbox"]["allowed"] is False
        
        # Set to club_pro
        requests.post(
            f"{BASE_URL}/api/club-plans/set",
            json={"plan_id": "club_pro"},
            headers=director_headers
        )
        
        # Get entitlements again
        response = requests.get(f"{BASE_URL}/api/club-plans/entitlements", headers=director_headers)
        data = response.json()
        
        assert data["plan_id"] == "club_pro"
        assert data["plan_label"] == "Club Pro"
        assert data["entitlements"]["director_inbox"]["allowed"] is True


class TestCleanup(TestClubPlansAuth):
    """Cleanup: Reset plan to club_pro after tests"""
    
    def test_reset_plan_to_club_pro(self, director_headers):
        """Reset plan to club_pro for other tests"""
        response = requests.post(
            f"{BASE_URL}/api/club-plans/set",
            json={"plan_id": "club_pro"},
            headers=director_headers
        )
        assert response.status_code == 200
        assert response.json()["plan_id"] == "club_pro"

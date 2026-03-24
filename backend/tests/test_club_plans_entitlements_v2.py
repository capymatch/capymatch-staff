"""
Club Plans Entitlements V2 Tests - Testing the new 3-type entitlement system.

The new system has:
- access (bool): Does the module exist?
- depth (str): "basic" | "detailed" | "advanced" | "full"
- limit (int): -1 = unlimited

Core Director OS (inbox, outbox, signals, coach health, escalations) must be visible on ALL plans.
Lower tiers get limited depth/items, not hidden modules.

Tests cover:
1. Starter entitlements: Core OS access=True, basic depth, limited items
2. Growth entitlements: More depth, more items, advanced filters
3. Club Pro entitlements: Unlimited items, advanced signals, detailed coach health
4. Elite entitlements: Full AI, automation, weekly digest
5. Enterprise entitlements: SSO, admin panel, unlimited everything
6. POST /api/club-plans/set authorization
7. GET /api/club-plans returns all 5 plans with correct pricing
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


class TestClubPlansAuthV2:
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


class TestStarterEntitlements(TestClubPlansAuthV2):
    """Test Starter plan entitlements - Core OS visible with basic depth"""
    
    def test_set_plan_to_starter(self, director_headers):
        """Set plan to starter for testing"""
        response = requests.post(
            f"{BASE_URL}/api/club-plans/set",
            json={"plan_id": "starter"},
            headers=director_headers
        )
        assert response.status_code == 200
        assert response.json()["plan_id"] == "starter"
    
    def test_starter_core_os_access_true(self, director_headers):
        """Starter: Core Director OS modules have access=True"""
        # Set to starter first
        requests.post(f"{BASE_URL}/api/club-plans/set", json={"plan_id": "starter"}, headers=director_headers)
        
        response = requests.get(f"{BASE_URL}/api/club-plans/entitlements", headers=director_headers)
        assert response.status_code == 200
        
        ent = response.json()["entitlements"]
        
        # Core Director OS - MUST be True on all plans
        assert ent.get("director_inbox_access") is True, "director_inbox_access should be True on Starter"
        assert ent.get("director_outbox_access") is True, "director_outbox_access should be True on Starter"
        assert ent.get("recruiting_signals_access") is True, "recruiting_signals_access should be True on Starter"
        assert ent.get("coach_health_access") is True, "coach_health_access should be True on Starter"
        assert ent.get("escalations_access") is True, "escalations_access should be True on Starter"
        assert ent.get("workflow_visibility_access") is True, "workflow_visibility_access should be True on Starter"
    
    def test_starter_inbox_limit_15(self, director_headers):
        """Starter: director_inbox_item_limit = 15"""
        requests.post(f"{BASE_URL}/api/club-plans/set", json={"plan_id": "starter"}, headers=director_headers)
        
        response = requests.get(f"{BASE_URL}/api/club-plans/entitlements", headers=director_headers)
        ent = response.json()["entitlements"]
        
        assert ent.get("director_inbox_item_limit") == 15, f"Expected 15, got {ent.get('director_inbox_item_limit')}"
    
    def test_starter_signal_detail_basic(self, director_headers):
        """Starter: signal_detail_level = 'basic'"""
        requests.post(f"{BASE_URL}/api/club-plans/set", json={"plan_id": "starter"}, headers=director_headers)
        
        response = requests.get(f"{BASE_URL}/api/club-plans/entitlements", headers=director_headers)
        ent = response.json()["entitlements"]
        
        assert ent.get("signal_detail_level") == "basic", f"Expected 'basic', got {ent.get('signal_detail_level')}"
    
    def test_starter_coach_health_detail_basic(self, director_headers):
        """Starter: coach_health_detail_level = 'basic'"""
        requests.post(f"{BASE_URL}/api/club-plans/set", json={"plan_id": "starter"}, headers=director_headers)
        
        response = requests.get(f"{BASE_URL}/api/club-plans/entitlements", headers=director_headers)
        ent = response.json()["entitlements"]
        
        assert ent.get("coach_health_detail_level") == "basic", f"Expected 'basic', got {ent.get('coach_health_detail_level')}"
    
    def test_starter_ai_detail_preview(self, director_headers):
        """Starter: ai_detail_level = 'preview'"""
        requests.post(f"{BASE_URL}/api/club-plans/set", json={"plan_id": "starter"}, headers=director_headers)
        
        response = requests.get(f"{BASE_URL}/api/club-plans/entitlements", headers=director_headers)
        ent = response.json()["entitlements"]
        
        assert ent.get("ai_detail_level") == "preview", f"Expected 'preview', got {ent.get('ai_detail_level')}"


class TestGrowthEntitlements(TestClubPlansAuthV2):
    """Test Growth plan entitlements - More depth, filters, export"""
    
    def test_growth_inbox_limit_100(self, director_headers):
        """Growth: director_inbox_item_limit = 100"""
        requests.post(f"{BASE_URL}/api/club-plans/set", json={"plan_id": "growth"}, headers=director_headers)
        
        response = requests.get(f"{BASE_URL}/api/club-plans/entitlements", headers=director_headers)
        ent = response.json()["entitlements"]
        
        assert ent.get("director_inbox_item_limit") == 100, f"Expected 100, got {ent.get('director_inbox_item_limit')}"
    
    def test_growth_signal_detail_detailed(self, director_headers):
        """Growth: signal_detail_level = 'detailed'"""
        requests.post(f"{BASE_URL}/api/club-plans/set", json={"plan_id": "growth"}, headers=director_headers)
        
        response = requests.get(f"{BASE_URL}/api/club-plans/entitlements", headers=director_headers)
        ent = response.json()["entitlements"]
        
        assert ent.get("signal_detail_level") == "detailed", f"Expected 'detailed', got {ent.get('signal_detail_level')}"
    
    def test_growth_advanced_filters_access(self, director_headers):
        """Growth: advanced_filters_access = True"""
        requests.post(f"{BASE_URL}/api/club-plans/set", json={"plan_id": "growth"}, headers=director_headers)
        
        response = requests.get(f"{BASE_URL}/api/club-plans/entitlements", headers=director_headers)
        ent = response.json()["entitlements"]
        
        assert ent.get("advanced_filters_access") is True, "advanced_filters_access should be True on Growth"
    
    def test_growth_csv_export_access(self, director_headers):
        """Growth: csv_export_access = True"""
        requests.post(f"{BASE_URL}/api/club-plans/set", json={"plan_id": "growth"}, headers=director_headers)
        
        response = requests.get(f"{BASE_URL}/api/club-plans/entitlements", headers=director_headers)
        ent = response.json()["entitlements"]
        
        assert ent.get("csv_export_access") is True, "csv_export_access should be True on Growth"


class TestClubProEntitlements(TestClubPlansAuthV2):
    """Test Club Pro plan entitlements - Full operating system"""
    
    def test_club_pro_inbox_limit_unlimited(self, director_headers):
        """Club Pro: director_inbox_item_limit = -1 (unlimited)"""
        requests.post(f"{BASE_URL}/api/club-plans/set", json={"plan_id": "club_pro"}, headers=director_headers)
        
        response = requests.get(f"{BASE_URL}/api/club-plans/entitlements", headers=director_headers)
        ent = response.json()["entitlements"]
        
        assert ent.get("director_inbox_item_limit") == -1, f"Expected -1 (unlimited), got {ent.get('director_inbox_item_limit')}"
    
    def test_club_pro_signal_detail_advanced(self, director_headers):
        """Club Pro: signal_detail_level = 'advanced'"""
        requests.post(f"{BASE_URL}/api/club-plans/set", json={"plan_id": "club_pro"}, headers=director_headers)
        
        response = requests.get(f"{BASE_URL}/api/club-plans/entitlements", headers=director_headers)
        ent = response.json()["entitlements"]
        
        assert ent.get("signal_detail_level") == "advanced", f"Expected 'advanced', got {ent.get('signal_detail_level')}"
    
    def test_club_pro_coach_health_detail_detailed(self, director_headers):
        """Club Pro: coach_health_detail_level = 'detailed'"""
        requests.post(f"{BASE_URL}/api/club-plans/set", json={"plan_id": "club_pro"}, headers=director_headers)
        
        response = requests.get(f"{BASE_URL}/api/club-plans/entitlements", headers=director_headers)
        ent = response.json()["entitlements"]
        
        assert ent.get("coach_health_detail_level") == "detailed", f"Expected 'detailed', got {ent.get('coach_health_detail_level')}"
    
    def test_club_pro_bulk_actions_access(self, director_headers):
        """Club Pro: bulk_actions_access = True"""
        requests.post(f"{BASE_URL}/api/club-plans/set", json={"plan_id": "club_pro"}, headers=director_headers)
        
        response = requests.get(f"{BASE_URL}/api/club-plans/entitlements", headers=director_headers)
        ent = response.json()["entitlements"]
        
        assert ent.get("bulk_actions_access") is True, "bulk_actions_access should be True on Club Pro"
    
    def test_club_pro_autopilot_access(self, director_headers):
        """Club Pro: autopilot_access = True"""
        requests.post(f"{BASE_URL}/api/club-plans/set", json={"plan_id": "club_pro"}, headers=director_headers)
        
        response = requests.get(f"{BASE_URL}/api/club-plans/entitlements", headers=director_headers)
        ent = response.json()["entitlements"]
        
        assert ent.get("autopilot_access") is True, "autopilot_access should be True on Club Pro"


class TestEliteEntitlements(TestClubPlansAuthV2):
    """Test Elite plan entitlements - Intelligence + automation"""
    
    def test_elite_ai_brief_access(self, director_headers):
        """Elite: ai_brief_access = True"""
        requests.post(f"{BASE_URL}/api/club-plans/set", json={"plan_id": "elite"}, headers=director_headers)
        
        response = requests.get(f"{BASE_URL}/api/club-plans/entitlements", headers=director_headers)
        ent = response.json()["entitlements"]
        
        assert ent.get("ai_brief_access") is True, "ai_brief_access should be True on Elite"
    
    def test_elite_ai_detail_full(self, director_headers):
        """Elite: ai_detail_level = 'full'"""
        requests.post(f"{BASE_URL}/api/club-plans/set", json={"plan_id": "elite"}, headers=director_headers)
        
        response = requests.get(f"{BASE_URL}/api/club-plans/entitlements", headers=director_headers)
        ent = response.json()["entitlements"]
        
        assert ent.get("ai_detail_level") == "full", f"Expected 'full', got {ent.get('ai_detail_level')}"
    
    def test_elite_automation_access(self, director_headers):
        """Elite: automation_access = True"""
        requests.post(f"{BASE_URL}/api/club-plans/set", json={"plan_id": "elite"}, headers=director_headers)
        
        response = requests.get(f"{BASE_URL}/api/club-plans/entitlements", headers=director_headers)
        ent = response.json()["entitlements"]
        
        assert ent.get("automation_access") is True, "automation_access should be True on Elite"
    
    def test_elite_weekly_digest_access(self, director_headers):
        """Elite: weekly_digest_access = True"""
        requests.post(f"{BASE_URL}/api/club-plans/set", json={"plan_id": "elite"}, headers=director_headers)
        
        response = requests.get(f"{BASE_URL}/api/club-plans/entitlements", headers=director_headers)
        ent = response.json()["entitlements"]
        
        assert ent.get("weekly_digest_access") is True, "weekly_digest_access should be True on Elite"
    
    def test_elite_loop_insights_access(self, director_headers):
        """Elite: loop_insights_access = True"""
        requests.post(f"{BASE_URL}/api/club-plans/set", json={"plan_id": "elite"}, headers=director_headers)
        
        response = requests.get(f"{BASE_URL}/api/club-plans/entitlements", headers=director_headers)
        ent = response.json()["entitlements"]
        
        assert ent.get("loop_insights_access") is True, "loop_insights_access should be True on Elite"


class TestEnterpriseEntitlements(TestClubPlansAuthV2):
    """Test Enterprise plan entitlements - Full control"""
    
    def test_enterprise_sso_access(self, director_headers):
        """Enterprise: sso_access = True"""
        requests.post(f"{BASE_URL}/api/club-plans/set", json={"plan_id": "enterprise"}, headers=director_headers)
        
        response = requests.get(f"{BASE_URL}/api/club-plans/entitlements", headers=director_headers)
        ent = response.json()["entitlements"]
        
        assert ent.get("sso_access") is True, "sso_access should be True on Enterprise"
    
    def test_enterprise_admin_panel_access(self, director_headers):
        """Enterprise: admin_panel_access = True"""
        requests.post(f"{BASE_URL}/api/club-plans/set", json={"plan_id": "enterprise"}, headers=director_headers)
        
        response = requests.get(f"{BASE_URL}/api/club-plans/entitlements", headers=director_headers)
        ent = response.json()["entitlements"]
        
        assert ent.get("admin_panel_access") is True, "admin_panel_access should be True on Enterprise"
    
    def test_enterprise_athlete_limit_unlimited(self, director_headers):
        """Enterprise: athlete_limit = -1 (unlimited)"""
        requests.post(f"{BASE_URL}/api/club-plans/set", json={"plan_id": "enterprise"}, headers=director_headers)
        
        response = requests.get(f"{BASE_URL}/api/club-plans/entitlements", headers=director_headers)
        ent = response.json()["entitlements"]
        
        assert ent.get("athlete_limit") == -1, f"Expected -1 (unlimited), got {ent.get('athlete_limit')}"


class TestSetPlanAuthorization(TestClubPlansAuthV2):
    """Test POST /api/club-plans/set authorization"""
    
    def test_director_can_set_plan(self, director_headers):
        """Director can set plan"""
        response = requests.post(
            f"{BASE_URL}/api/club-plans/set",
            json={"plan_id": "starter"},
            headers=director_headers
        )
        assert response.status_code == 200
        assert response.json()["plan_id"] == "starter"
    
    def test_coach_cannot_set_plan(self, coach_headers):
        """Coach cannot set plan (403)"""
        response = requests.post(
            f"{BASE_URL}/api/club-plans/set",
            json={"plan_id": "elite"},
            headers=coach_headers
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"


class TestListPlansV2(TestClubPlansAuthV2):
    """Test GET /api/club-plans returns all 5 plans with correct pricing"""
    
    def test_list_all_plans_returns_5_plans(self, director_headers):
        """GET /api/club-plans returns all 5 plans"""
        response = requests.get(f"{BASE_URL}/api/club-plans", headers=director_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "plans" in data
        plans = data["plans"]
        assert len(plans) == 5, f"Expected 5 plans, got {len(plans)}"
        
        plan_ids = [p["id"] for p in plans]
        expected_ids = ["starter", "growth", "club_pro", "elite", "enterprise"]
        for pid in expected_ids:
            assert pid in plan_ids, f"Missing plan: {pid}"
    
    def test_starter_pricing_199(self, director_headers):
        """Starter: $199/mo"""
        response = requests.get(f"{BASE_URL}/api/club-plans", headers=director_headers)
        plans = response.json()["plans"]
        starter = next(p for p in plans if p["id"] == "starter")
        
        assert starter["price_monthly"] == 199
    
    def test_growth_pricing_329(self, director_headers):
        """Growth: $329/mo"""
        response = requests.get(f"{BASE_URL}/api/club-plans", headers=director_headers)
        plans = response.json()["plans"]
        growth = next(p for p in plans if p["id"] == "growth")
        
        assert growth["price_monthly"] == 329
    
    def test_club_pro_pricing_449(self, director_headers):
        """Club Pro: $449/mo"""
        response = requests.get(f"{BASE_URL}/api/club-plans", headers=director_headers)
        plans = response.json()["plans"]
        club_pro = next(p for p in plans if p["id"] == "club_pro")
        
        assert club_pro["price_monthly"] == 449
    
    def test_elite_pricing_699(self, director_headers):
        """Elite: $699/mo"""
        response = requests.get(f"{BASE_URL}/api/club-plans", headers=director_headers)
        plans = response.json()["plans"]
        elite = next(p for p in plans if p["id"] == "elite")
        
        assert elite["price_monthly"] == 699
    
    def test_enterprise_custom_pricing(self, director_headers):
        """Enterprise: custom pricing (None)"""
        response = requests.get(f"{BASE_URL}/api/club-plans", headers=director_headers)
        plans = response.json()["plans"]
        enterprise = next(p for p in plans if p["id"] == "enterprise")
        
        assert enterprise["price_monthly"] is None


class TestCleanupV2(TestClubPlansAuthV2):
    """Cleanup: Reset plan to starter after tests"""
    
    def test_reset_plan_to_starter(self, director_headers):
        """Reset plan to starter for frontend testing"""
        response = requests.post(
            f"{BASE_URL}/api/club-plans/set",
            json={"plan_id": "starter"},
            headers=director_headers
        )
        assert response.status_code == 200
        assert response.json()["plan_id"] == "starter"

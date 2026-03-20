"""
Test Loop Insights Admin Endpoint
Tests for /api/analytics/admin/loop-metrics endpoint
- Admin/Director access only
- 7/14/30 day filtering
- Aggregates data across ALL users
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')

# Test credentials
DIRECTOR_EMAIL = "director@capymatch.com"
DIRECTOR_PASSWORD = "director123"
ATHLETE_EMAIL = "emma.chen@athlete.capymatch.com"
ATHLETE_PASSWORD = "athlete123"


class TestLoopInsightsAdmin:
    """Tests for /api/analytics/admin/loop-metrics endpoint"""

    @pytest.fixture(scope="class")
    def director_token(self):
        """Get director authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DIRECTOR_EMAIL, "password": DIRECTOR_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip(f"Director login failed: {response.status_code} - {response.text}")
        data = response.json()
        return data.get("token")

    @pytest.fixture(scope="class")
    def athlete_token(self):
        """Get athlete authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ATHLETE_EMAIL, "password": ATHLETE_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip(f"Athlete login failed: {response.status_code} - {response.text}")
        data = response.json()
        return data.get("token")

    # ──────────────────────────────────────────────────────────
    # Test: Admin endpoint access control
    # ──────────────────────────────────────────────────────────

    def test_admin_loop_metrics_requires_auth(self):
        """Test that admin endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/analytics/admin/loop-metrics")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Admin endpoint returns 401/403 without auth")

    def test_admin_loop_metrics_403_for_athlete(self, athlete_token):
        """Test that athlete cannot access admin endpoint - returns 403"""
        headers = {"Authorization": f"Bearer {athlete_token}"}
        response = requests.get(
            f"{BASE_URL}/api/analytics/admin/loop-metrics",
            headers=headers
        )
        assert response.status_code == 403, f"Expected 403 for athlete, got {response.status_code}"
        print("✓ Admin endpoint returns 403 for athlete role")

    def test_admin_loop_metrics_success_for_director(self, director_token):
        """Test that director can access admin endpoint"""
        headers = {"Authorization": f"Bearer {director_token}"}
        response = requests.get(
            f"{BASE_URL}/api/analytics/admin/loop-metrics",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200 for director, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "total_events" in data, "Missing total_events in response"
        assert "period_days" in data, "Missing period_days in response"
        print(f"✓ Director can access admin endpoint - total_events: {data.get('total_events')}")

    # ──────────────────────────────────────────────────────────
    # Test: Days filter functionality
    # ──────────────────────────────────────────────────────────

    def test_admin_loop_metrics_7_days_filter(self, director_token):
        """Test 7-day filter returns correct period_days"""
        headers = {"Authorization": f"Bearer {director_token}"}
        response = requests.get(
            f"{BASE_URL}/api/analytics/admin/loop-metrics",
            params={"days": 7},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("period_days") == 7, f"Expected period_days=7, got {data.get('period_days')}"
        print(f"✓ 7-day filter works - period_days: {data.get('period_days')}")

    def test_admin_loop_metrics_14_days_filter(self, director_token):
        """Test 14-day filter returns correct period_days"""
        headers = {"Authorization": f"Bearer {director_token}"}
        response = requests.get(
            f"{BASE_URL}/api/analytics/admin/loop-metrics",
            params={"days": 14},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("period_days") == 14, f"Expected period_days=14, got {data.get('period_days')}"
        print(f"✓ 14-day filter works - period_days: {data.get('period_days')}")

    def test_admin_loop_metrics_30_days_filter(self, director_token):
        """Test 30-day filter returns correct period_days (default)"""
        headers = {"Authorization": f"Bearer {director_token}"}
        response = requests.get(
            f"{BASE_URL}/api/analytics/admin/loop-metrics",
            params={"days": 30},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("period_days") == 30, f"Expected period_days=30, got {data.get('period_days')}"
        print(f"✓ 30-day filter works - period_days: {data.get('period_days')}")

    # ──────────────────────────────────────────────────────────
    # Test: Response structure validation
    # ──────────────────────────────────────────────────────────

    def test_admin_loop_metrics_full_response_structure(self, director_token):
        """Test that response contains all required sections"""
        headers = {"Authorization": f"Bearer {director_token}"}
        response = requests.get(
            f"{BASE_URL}/api/analytics/admin/loop-metrics",
            params={"days": 30},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Top-level fields
        assert "total_events" in data
        assert "period_days" in data
        assert "event_counts" in data
        assert "funnel" in data
        assert "sources" in data
        assert "trust" in data
        assert "reinforcement" in data
        assert "recap" in data
        assert "unique_users" in data
        assert "daily_trend" in data
        
        # Funnel structure
        funnel = data.get("funnel", {})
        assert "hero_views" in funnel
        assert "hero_clicks" in funnel
        assert "reinforcements" in funnel
        assert "hero_click_rate" in funnel
        assert "reinforcement_rate" in funnel
        
        # Sources structure
        sources = data.get("sources", {})
        assert "views" in sources
        assert "completions" in sources
        
        # Trust structure
        trust = data.get("trust", {})
        assert "why_expands" in trust
        assert "why_expand_rate" in trust
        assert "actions_after_why" in trust
        assert "action_after_why_rate" in trust
        
        # Reinforcement structure
        reinforcement = data.get("reinforcement", {})
        assert "total_shown" in reinforcement
        assert "avg_time_to_action" in reinforcement
        assert "completions_by_source" in reinforcement
        
        # Recap structure
        recap = data.get("recap", {})
        assert "teaser_views" in recap
        assert "opens" in recap
        assert "open_rate" in recap
        
        # Daily trend structure
        daily_trend = data.get("daily_trend", [])
        assert isinstance(daily_trend, list)
        if daily_trend:
            assert "date" in daily_trend[0]
            assert "count" in daily_trend[0]
        
        print("✓ Full response structure validated")
        print(f"  - total_events: {data.get('total_events')}")
        print(f"  - unique_users: {data.get('unique_users')}")
        print(f"  - daily_trend entries: {len(daily_trend)}")
        print(f"  - funnel.hero_views: {funnel.get('hero_views')}")
        print(f"  - funnel.hero_click_rate: {funnel.get('hero_click_rate')}%")

    def test_admin_loop_metrics_default_days_is_30(self, director_token):
        """Test that default period is 30 days when no days param provided"""
        headers = {"Authorization": f"Bearer {director_token}"}
        response = requests.get(
            f"{BASE_URL}/api/analytics/admin/loop-metrics",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("period_days") == 30, f"Expected default period_days=30, got {data.get('period_days')}"
        print("✓ Default period is 30 days")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

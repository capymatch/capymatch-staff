"""
Test Suite for Director UX Refinements (Final Pass)
Tests: KPIs, trendData (needAttentionDelta, momentum), Recruiting Signals, Coach Health, Activity Feed
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDirectorLogin:
    """Test director authentication"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get director auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "director@capymatch.com",
            "password": "director123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["token"]
    
    def test_director_login(self, auth_token):
        """Verify director can login"""
        assert auth_token is not None
        assert len(auth_token) > 0
        print(f"PASS: Director login successful")


class TestMissionControlAPI:
    """Test /api/mission-control endpoint for director"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "director@capymatch.com",
            "password": "director123"
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def mission_control_data(self, auth_token):
        """Get mission control data"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=headers)
        assert response.status_code == 200, f"Failed to get mission control: {response.text}"
        return response.json()
    
    def test_kpis_correct(self, mission_control_data):
        """Verify KPIs: 25 Athletes, 5 Coaches, 12 Need Attention, 5 Events Ahead, 0 Unassigned"""
        ps = mission_control_data.get("programStatus", {})
        
        assert ps.get("totalAthletes") == 25, f"Expected 25 athletes, got {ps.get('totalAthletes')}"
        assert ps.get("activeCoaches") == 5, f"Expected 5 coaches, got {ps.get('activeCoaches')}"
        assert ps.get("needingAttention") == 12, f"Expected 12 needing attention, got {ps.get('needingAttention')}"
        assert ps.get("upcomingEvents") == 5, f"Expected 5 upcoming events, got {ps.get('upcomingEvents')}"
        assert ps.get("unassignedCount") == 0, f"Expected 0 unassigned, got {ps.get('unassignedCount')}"
        print(f"PASS: All KPIs verified - 25 Athletes, 5 Coaches, 12 Need Attention, 5 Events, 0 Unassigned")
    
    def test_trend_data_exists(self, mission_control_data):
        """Verify trendData field exists in response"""
        assert "trendData" in mission_control_data, "trendData field missing from response"
        trend = mission_control_data["trendData"]
        assert "needAttentionDelta" in trend, "needAttentionDelta missing from trendData"
        assert "momentum" in trend, "momentum missing from trendData"
        print(f"PASS: trendData field exists with needAttentionDelta and momentum")
    
    def test_need_attention_delta(self, mission_control_data):
        """Verify needAttentionDelta shows correct delta (expected ~5)"""
        trend = mission_control_data.get("trendData", {})
        delta = trend.get("needAttentionDelta")
        
        assert delta is not None, "needAttentionDelta is None"
        # Based on test data: current 12, yesterday snapshot had 7, so delta should be 5
        assert delta == 5, f"Expected needAttentionDelta of 5, got {delta}"
        print(f"PASS: needAttentionDelta is {delta} (comparing 12 current vs 7 yesterday)")
    
    def test_momentum_state(self, mission_control_data):
        """Verify momentum state is declining with engagement delta"""
        trend = mission_control_data.get("trendData", {})
        momentum = trend.get("momentum", {})
        
        state = momentum.get("state")
        engagement_delta = momentum.get("engagementDelta")
        
        assert state in ["improving", "stable", "declining"], f"Invalid momentum state: {state}"
        assert state == "declining", f"Expected 'declining' state, got '{state}'"
        assert engagement_delta is not None, "engagementDelta is None"
        assert engagement_delta == -28, f"Expected engagementDelta of -28, got {engagement_delta}"
        print(f"PASS: Momentum state is '{state}' with engagementDelta {engagement_delta}%")
    
    def test_recruiting_signals(self, mission_control_data):
        """Verify recruitingSignals has correct structure and values"""
        signals = mission_control_data.get("recruitingSignals", {})
        
        assert "schoolInterests" in signals, "schoolInterests missing"
        assert "newRecommendations" in signals, "newRecommendations missing"
        assert "coachNotes" in signals, "coachNotes missing"
        
        # Verify expected values from test data
        assert signals.get("schoolInterests") == 18, f"Expected 18 schoolInterests, got {signals.get('schoolInterests')}"
        assert signals.get("newRecommendations") == 26, f"Expected 26 recommendations, got {signals.get('newRecommendations')}"
        assert signals.get("coachNotes") == 116, f"Expected 116 coach notes, got {signals.get('coachNotes')}"
        print(f"PASS: Recruiting Signals - 18 interests, 26 recommendations, 116 notes")
    
    def test_needs_attention_items(self, mission_control_data):
        """Verify needsAttention has items with correct structure"""
        items = mission_control_data.get("needsAttention", [])
        
        assert len(items) > 0, "needsAttention is empty"
        assert len(items) <= 8, f"needsAttention should be max 8 items, got {len(items)}"
        
        # Check structure of first item
        item = items[0]
        assert "athlete_id" in item, "athlete_id missing from attention item"
        assert "athlete_name" in item, "athlete_name missing from attention item"
        assert "category" in item, "category missing from attention item"
        assert "badge_color" in item, "badge_color missing from attention item"
        print(f"PASS: needsAttention has {len(items)} items with correct structure")
    
    def test_coach_health(self, mission_control_data):
        """Verify coachHealth has correct structure"""
        coaches = mission_control_data.get("coachHealth", [])
        
        assert len(coaches) > 0, "coachHealth is empty"
        
        # Check structure of first coach
        coach = coaches[0]
        assert "id" in coach, "id missing from coach"
        assert "name" in coach, "name missing from coach"
        assert "status" in coach, "status missing from coach"
        assert "athleteCount" in coach, "athleteCount missing from coach"
        assert "daysInactive" in coach or coach.get("daysInactive") is None, "daysInactive field issue"
        assert "workload" in coach, "workload missing from coach"
        
        # Verify status is valid
        valid_statuses = ["active", "activating", "needs_support", "inactive"]
        assert coach.get("status") in valid_statuses, f"Invalid status: {coach.get('status')}"
        
        # Verify workload is valid
        valid_workloads = ["high", "moderate", "light"]
        assert coach.get("workload") in valid_workloads, f"Invalid workload: {coach.get('workload')}"
        
        print(f"PASS: coachHealth has {len(coaches)} coaches with activity signals and status badges")
    
    def test_program_activity(self, mission_control_data):
        """Verify programActivity has max 6 items"""
        activity = mission_control_data.get("programActivity", [])
        
        assert len(activity) <= 6, f"programActivity should be max 6 items, got {len(activity)}"
        
        if len(activity) > 0:
            item = activity[0]
            assert "athleteName" in item, "athleteName missing from activity item"
            assert "description" in item, "description missing from activity item"
            assert "hoursAgo" in item, "hoursAgo missing from activity item"
        
        print(f"PASS: programActivity has {len(activity)} items (max 6)")
    
    def test_upcoming_events(self, mission_control_data):
        """Verify upcomingEvents has future events only"""
        events = mission_control_data.get("upcomingEvents", [])
        
        assert len(events) <= 5, f"upcomingEvents should be max 5, got {len(events)}"
        
        for event in events:
            days_away = event.get("daysAway", -1)
            assert days_away >= 0, f"Found past event in upcomingEvents: {event.get('name')} ({days_away} days)"
        
        print(f"PASS: upcomingEvents has {len(events)} future events")


class TestAIBriefEndpoint:
    """Test AI Brief endpoint (structure only, skip actual generation)"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "director@capymatch.com",
            "password": "director123"
        })
        return response.json()["token"]
    
    def test_ai_brief_endpoint_exists(self, auth_token):
        """Verify /api/ai/briefing endpoint is accessible"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        # Just check the endpoint exists, don't wait for full generation
        response = requests.post(f"{BASE_URL}/api/ai/briefing", headers=headers, timeout=5)
        # 200 or 504 (timeout) are acceptable - means endpoint exists
        assert response.status_code in [200, 504], f"AI brief endpoint issue: {response.status_code}"
        print(f"PASS: AI brief endpoint accessible")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

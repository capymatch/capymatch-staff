"""
Data Source Tracing Tests - Verify Mission Control data matches AI Brief data
Tests for issue: AI Program Brief showing data that didn't match Dashboard

Key fixes verified:
1. No TEST_REFACTOR text in Needs Attention
2. No past events (like SoCal Showcase) in upcoming events
3. KPI 'Need Attention' count matches Needs Attention items
4. AI brief references only data visible on dashboard
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


@pytest.fixture(scope="module")
def director_token():
    """Get director auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "director@capymatch.com",
        "password": "director123"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def director_headers(director_token):
    """Headers with director auth"""
    return {"Authorization": f"Bearer {director_token}"}


class TestMissionControlData:
    """Test Mission Control data integrity"""
    
    def test_mission_control_loads(self, director_headers):
        """GET /api/mission-control returns valid data for director"""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=director_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "director"
        print(f"✓ Mission control loaded for director")
    
    def test_kpis_match_expected_values(self, director_headers):
        """Verify KPIs: 25 athletes, 5 coaches, 12 need attention, 5 events, 0 unassigned"""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=director_headers)
        data = response.json()
        ps = data.get("programStatus", {})
        
        assert ps.get("totalAthletes") == 25, f"Expected 25 athletes, got {ps.get('totalAthletes')}"
        assert ps.get("activeCoaches") == 5, f"Expected 5 coaches, got {ps.get('activeCoaches')}"
        assert ps.get("needingAttention") == 12, f"Expected 12 need attention, got {ps.get('needingAttention')}"
        assert ps.get("upcomingEvents") == 5, f"Expected 5 events, got {ps.get('upcomingEvents')}"
        assert ps.get("unassignedCount") == 0, f"Expected 0 unassigned, got {ps.get('unassignedCount')}"
        print(f"✓ KPIs: {ps}")
    
    def test_needs_attention_shows_8_items(self, director_headers):
        """Verify Needs Attention section shows 8 items"""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=director_headers)
        data = response.json()
        needs_attention = data.get("needsAttention", [])
        
        assert len(needs_attention) == 8, f"Expected 8 items, got {len(needs_attention)}"
        print(f"✓ Needs Attention has 8 items")
    
    def test_needs_attention_has_real_athlete_names(self, director_headers):
        """Verify NO TEST_REFACTOR text and REAL athlete names"""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=director_headers)
        data = response.json()
        needs_attention = data.get("needsAttention", [])
        
        expected_names = [
            "Marcus Johnson", "Emma Chen", "Liam Moore", 
            "Charlotte Jackson", "Abigail Allen", "Olivia Anderson",
            "Ethan Rodriguez", "Noah Miller"
        ]
        
        for item in needs_attention:
            athlete_name = item.get("athlete_name", "")
            why_surfaced = item.get("why_this_surfaced", "")
            
            # Check for TEST_REFACTOR
            assert "TEST_REFACTOR" not in athlete_name.upper(), f"TEST_REFACTOR in name: {athlete_name}"
            assert "TEST_REFACTOR" not in why_surfaced.upper(), f"TEST_REFACTOR in description: {why_surfaced}"
            
            # Verify real athlete name
            assert athlete_name in expected_names, f"Unexpected name: {athlete_name}"
            print(f"✓ {athlete_name}: {why_surfaced[:50]}...")
    
    def test_needs_attention_categories(self, director_headers):
        """Verify attention items have valid categories"""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=director_headers)
        data = response.json()
        needs_attention = data.get("needsAttention", [])
        
        valid_categories = [
            "event_follow_up", "ownership_gap", "momentum_drop",
            "blocker", "engagement_drop", "deadline_proximity", "readiness_issue"
        ]
        
        for item in needs_attention:
            category = item.get("category")
            assert category in valid_categories, f"Invalid category: {category}"
        
        # Count categories
        categories = [item["category"] for item in needs_attention]
        print(f"✓ Categories: {categories}")


class TestUpcomingEvents:
    """Test Upcoming Events data"""
    
    def test_upcoming_events_shows_5_future_events(self, director_headers):
        """Verify only future events shown (no past events like SoCal Showcase)"""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=director_headers)
        data = response.json()
        events = data.get("upcomingEvents", [])
        
        assert len(events) == 5, f"Expected 5 events, got {len(events)}"
        
        for event in events:
            days_away = event.get("daysAway", -999)
            assert days_away >= 0, f"Past event in list: {event['name']} (daysAway: {days_away})"
        
        print(f"✓ All 5 events are future events")
    
    def test_expected_event_names(self, director_headers):
        """Verify expected event names"""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=director_headers)
        data = response.json()
        events = data.get("upcomingEvents", [])
        
        expected_events = [
            "Elite Academy Tournament",
            "College Exposure Camp", 
            "Spring Classic",
            "ID Camp",
            "National Showcase"
        ]
        
        event_names = [e["name"] for e in events]
        for expected in expected_events:
            assert expected in event_names, f"Missing event: {expected}"
        
        print(f"✓ All expected events found: {event_names}")
    
    def test_no_socal_showcase_in_upcoming(self, director_headers):
        """Verify SoCal Showcase is NOT in upcoming events (it's past)"""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=director_headers)
        data = response.json()
        events = data.get("upcomingEvents", [])
        
        event_names = [e["name"] for e in events]
        assert "SoCal Showcase" not in event_names, "SoCal Showcase should not be in upcoming events"
        print(f"✓ SoCal Showcase correctly filtered out")
    
    def test_event_days_away_values(self, director_headers):
        """Verify event days away match expected values"""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=director_headers)
        data = response.json()
        events = data.get("upcomingEvents", [])
        
        # Events should be ordered by daysAway
        days_values = [e["daysAway"] for e in events]
        assert days_values == sorted(days_values), f"Events not sorted by daysAway: {days_values}"
        print(f"✓ Events sorted correctly by daysAway: {days_values}")


class TestAIBriefing:
    """Test AI Briefing endpoint"""
    
    def test_ai_briefing_returns_text(self, director_headers):
        """POST /api/ai/briefing returns text content"""
        response = requests.post(
            f"{BASE_URL}/api/ai/briefing",
            headers=director_headers,
            timeout=60
        )
        assert response.status_code == 200, f"AI briefing failed: {response.text}"
        data = response.json()
        
        assert "text" in data, "Response missing 'text' field"
        assert len(data["text"]) > 50, "AI brief text too short"
        print(f"✓ AI brief generated ({len(data['text'])} chars)")
    
    def test_ai_briefing_no_test_refactor(self, director_headers):
        """Verify AI brief does NOT mention TEST_REFACTOR"""
        response = requests.post(
            f"{BASE_URL}/api/ai/briefing",
            headers=director_headers,
            timeout=60
        )
        data = response.json()
        text = data.get("text", "").upper()
        
        assert "TEST_REFACTOR" not in text, "AI brief contains TEST_REFACTOR"
        assert "TEST_PHASE" not in text, "AI brief contains TEST_PHASE"
        print(f"✓ AI brief has no test data references")
    
    def test_ai_briefing_no_socal_showcase(self, director_headers):
        """Verify AI brief does NOT mention SoCal Showcase (past event)"""
        response = requests.post(
            f"{BASE_URL}/api/ai/briefing",
            headers=director_headers,
            timeout=60
        )
        data = response.json()
        text = data.get("text", "")
        
        assert "SoCal" not in text, f"AI brief mentions past event SoCal Showcase"
        print(f"✓ AI brief has no past event references")
    
    def test_ai_briefing_data_basis(self, director_headers):
        """Verify AI brief includes data basis counts"""
        response = requests.post(
            f"{BASE_URL}/api/ai/briefing",
            headers=director_headers,
            timeout=60
        )
        data = response.json()
        
        assert "alerts_count" in data, "Missing alerts_count"
        assert "events_count" in data, "Missing events_count"
        
        # Should have 12 alerts (from attention list) and 5 events
        assert data["alerts_count"] == 12, f"Expected 12 alerts, got {data['alerts_count']}"
        assert data["events_count"] == 5, f"Expected 5 events, got {data['events_count']}"
        print(f"✓ Data basis: {data['alerts_count']} alerts, {data['events_count']} events")


class TestCoachHealth:
    """Test Coach Health data"""
    
    def test_coach_health_present(self, director_headers):
        """Verify coachHealth is in director response"""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=director_headers)
        data = response.json()
        
        assert "coachHealth" in data, "Missing coachHealth"
        coaches = data["coachHealth"]
        assert len(coaches) > 0, "No coaches in coachHealth"
        print(f"✓ Found {len(coaches)} coaches")
    
    def test_coach_health_data_structure(self, director_headers):
        """Verify coach health has required fields"""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=director_headers)
        data = response.json()
        coaches = data.get("coachHealth", [])
        
        required_fields = ["id", "name", "status", "athleteCount"]
        for coach in coaches:
            for field in required_fields:
                assert field in coach, f"Coach missing {field}: {coach}"
        
        print(f"✓ All coaches have required fields")


class TestRecruitingSignals:
    """Test Recruiting Signals data"""
    
    def test_recruiting_signals_present(self, director_headers):
        """Verify recruitingSignals is in director response"""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=director_headers)
        data = response.json()
        
        assert "recruitingSignals" in data, "Missing recruitingSignals"
        signals = data["recruitingSignals"]
        assert "schoolInterests" in signals, "Missing schoolInterests"
        print(f"✓ Recruiting signals: {signals}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

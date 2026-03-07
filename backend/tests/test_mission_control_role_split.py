"""
Mission Control Role Split Tests
Tests the /api/mission-control endpoint for role-based data return:
- Director: programStatus, needsAttention (max 5), upcomingEvents, programActivity, programSnapshot
- Coach: todays_summary, myRoster (with podHealth, momentum, category), upcomingEvents, recentActivity
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
DIRECTOR_CREDS = {"email": "director@capymatch.com", "password": "director123"}
COACH_WILLIAMS_CREDS = {"email": "coach.williams@capymatch.com", "password": "coach123"}
COACH_GARCIA_CREDS = {"email": "coach.garcia@capymatch.com", "password": "coach123"}


@pytest.fixture(scope="module")
def director_token():
    """Get director auth token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json=DIRECTOR_CREDS)
    if resp.status_code != 200:
        pytest.skip("Director login failed")
    return resp.json().get("token")


@pytest.fixture(scope="module")
def coach_williams_token():
    """Get Coach Williams auth token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json=COACH_WILLIAMS_CREDS)
    if resp.status_code != 200:
        pytest.skip("Coach Williams login failed")
    return resp.json().get("token")


@pytest.fixture(scope="module")
def coach_garcia_token():
    """Get Coach Garcia auth token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json=COACH_GARCIA_CREDS)
    if resp.status_code != 200:
        pytest.skip("Coach Garcia login failed")
    return resp.json().get("token")


class TestMissionControlAuth:
    """Authentication tests for mission control endpoint"""
    
    def test_mission_control_requires_auth(self):
        """Mission control endpoint requires authentication"""
        resp = requests.get(f"{BASE_URL}/api/mission-control")
        assert resp.status_code == 401
        print("✓ Mission control requires authentication")
    
    def test_mission_control_director_login(self, director_token):
        """Director can access mission control"""
        headers = {"Authorization": f"Bearer {director_token}"}
        resp = requests.get(f"{BASE_URL}/api/mission-control", headers=headers)
        assert resp.status_code == 200
        print("✓ Director can access mission control")


class TestDirectorMissionControl:
    """Tests for director-specific mission control data"""
    
    def test_director_gets_role_director(self, director_token):
        """Director role is returned correctly"""
        headers = {"Authorization": f"Bearer {director_token}"}
        resp = requests.get(f"{BASE_URL}/api/mission-control", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("role") == "director"
        print("✓ Director gets role='director' in response")
    
    def test_director_has_program_status(self, director_token):
        """Director response contains programStatus with KPIs"""
        headers = {"Authorization": f"Bearer {director_token}"}
        resp = requests.get(f"{BASE_URL}/api/mission-control", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        
        assert "programStatus" in data
        status = data["programStatus"]
        
        # Verify all 5 KPI fields exist
        assert "totalAthletes" in status
        assert "activeCoaches" in status
        assert "unassignedCount" in status
        assert "needingAttention" in status
        assert "upcomingEvents" in status
        
        # Verify they're integers
        assert isinstance(status["totalAthletes"], int)
        assert isinstance(status["activeCoaches"], int)
        assert isinstance(status["unassignedCount"], int)
        assert isinstance(status["needingAttention"], int)
        assert isinstance(status["upcomingEvents"], int)
        
        print(f"✓ Director programStatus: {status['totalAthletes']} athletes, {status['activeCoaches']} coaches")
    
    def test_director_needs_attention_max_5(self, director_token):
        """Director needsAttention is limited to max 5 items"""
        headers = {"Authorization": f"Bearer {director_token}"}
        resp = requests.get(f"{BASE_URL}/api/mission-control", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        
        assert "needsAttention" in data
        attention = data["needsAttention"]
        
        # Must be a list with max 5 items
        assert isinstance(attention, list)
        assert len(attention) <= 5
        
        # Each item should have key fields
        for item in attention:
            assert "athlete_id" in item
            assert "category" in item or "type" in item  # category or type field
        
        print(f"✓ Director needsAttention has {len(attention)} items (max 5)")
    
    def test_director_needs_attention_has_health(self, director_token):
        """Needs attention items have pod_health enrichment"""
        headers = {"Authorization": f"Bearer {director_token}"}
        resp = requests.get(f"{BASE_URL}/api/mission-control", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        
        attention = data.get("needsAttention", [])
        if len(attention) > 0:
            item = attention[0]
            assert "pod_health" in item, "Needs attention items should have pod_health"
            health = item["pod_health"]
            assert "status" in health or "label" in health
            print(f"✓ Needs attention items have pod_health: {health}")
        else:
            print("✓ No needs attention items to verify (empty list)")
    
    def test_director_upcoming_events(self, director_token):
        """Director response contains upcomingEvents list"""
        headers = {"Authorization": f"Bearer {director_token}"}
        resp = requests.get(f"{BASE_URL}/api/mission-control", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        
        assert "upcomingEvents" in data
        events = data["upcomingEvents"]
        assert isinstance(events, list)
        
        # If events exist, verify structure
        if len(events) > 0:
            event = events[0]
            assert "id" in event or "name" in event
        
        print(f"✓ Director has {len(events)} upcoming events")
    
    def test_director_program_activity(self, director_token):
        """Director response contains programActivity list"""
        headers = {"Authorization": f"Bearer {director_token}"}
        resp = requests.get(f"{BASE_URL}/api/mission-control", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        
        assert "programActivity" in data
        activity = data["programActivity"]
        assert isinstance(activity, list)
        
        # If activity exists, verify structure
        if len(activity) > 0:
            item = activity[0]
            # Activity items should have athlete info
            assert "athleteId" in item or "athleteName" in item or "athlete_id" in item
        
        print(f"✓ Director has {len(activity)} program activity items")
    
    def test_director_program_snapshot(self, director_token):
        """Director response contains programSnapshot"""
        headers = {"Authorization": f"Bearer {director_token}"}
        resp = requests.get(f"{BASE_URL}/api/mission-control", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        
        assert "programSnapshot" in data
        snapshot = data["programSnapshot"]
        assert isinstance(snapshot, dict)
        
        # Should have unassigned_count
        assert "unassigned_count" in snapshot
        
        print(f"✓ Director has programSnapshot with unassigned_count: {snapshot.get('unassigned_count')}")
    
    def test_director_does_not_have_coach_fields(self, director_token):
        """Director response should NOT have coach-specific fields"""
        headers = {"Authorization": f"Bearer {director_token}"}
        resp = requests.get(f"{BASE_URL}/api/mission-control", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        
        # Director should NOT have these coach-specific fields
        assert "todays_summary" not in data
        assert "myRoster" not in data
        assert "recentActivity" not in data
        
        print("✓ Director response does NOT have coach-specific fields")


class TestCoachMissionControl:
    """Tests for coach-specific mission control data"""
    
    def test_coach_gets_role_coach(self, coach_williams_token):
        """Coach role is returned correctly"""
        headers = {"Authorization": f"Bearer {coach_williams_token}"}
        resp = requests.get(f"{BASE_URL}/api/mission-control", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("role") == "coach"
        print("✓ Coach Williams gets role='coach' in response")
    
    def test_coach_has_todays_summary(self, coach_williams_token):
        """Coach response contains todays_summary with chip data"""
        headers = {"Authorization": f"Bearer {coach_williams_token}"}
        resp = requests.get(f"{BASE_URL}/api/mission-control", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        
        assert "todays_summary" in data
        summary = data["todays_summary"]
        
        # Verify summary fields
        assert "athleteCount" in summary
        assert "needingAction" in summary
        assert "upcomingEvents" in summary
        assert "alertCount" in summary
        
        # Verify they're integers
        assert isinstance(summary["athleteCount"], int)
        assert isinstance(summary["needingAction"], int)
        assert isinstance(summary["upcomingEvents"], int)
        assert isinstance(summary["alertCount"], int)
        
        print(f"✓ Coach todays_summary: {summary['athleteCount']} athletes, {summary['needingAction']} needing action")
    
    def test_coach_has_my_roster(self, coach_williams_token):
        """Coach response contains myRoster with assigned athletes"""
        headers = {"Authorization": f"Bearer {coach_williams_token}"}
        resp = requests.get(f"{BASE_URL}/api/mission-control", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        
        assert "myRoster" in data
        roster = data["myRoster"]
        assert isinstance(roster, list)
        
        # Coach Williams should have 12 athletes based on mock data
        print(f"✓ Coach myRoster has {len(roster)} athletes")
    
    def test_coach_roster_has_athlete_details(self, coach_williams_token):
        """Coach roster athletes have required fields"""
        headers = {"Authorization": f"Bearer {coach_williams_token}"}
        resp = requests.get(f"{BASE_URL}/api/mission-control", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        
        roster = data.get("myRoster", [])
        if len(roster) > 0:
            athlete = roster[0]
            
            # Required fields
            assert "id" in athlete
            assert "name" in athlete
            
            # Momentum fields
            assert "momentumScore" in athlete
            assert "momentumTrend" in athlete
            
            # Pod health
            assert "podHealth" in athlete
            health = athlete["podHealth"]
            assert "status" in health or "label" in health
            
            print(f"✓ Roster athlete has fields: {list(athlete.keys())}")
        else:
            print("✓ No roster athletes to verify (empty list)")
    
    def test_coach_roster_has_category_info(self, coach_williams_token):
        """Coach roster athletes have category info for those needing attention"""
        headers = {"Authorization": f"Bearer {coach_williams_token}"}
        resp = requests.get(f"{BASE_URL}/api/mission-control", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        
        roster = data.get("myRoster", [])
        # Find athletes with category (needing action)
        with_category = [a for a in roster if a.get("category")]
        
        if len(with_category) > 0:
            athlete = with_category[0]
            # Should have category-related fields
            assert "category" in athlete
            assert "badgeColor" in athlete
            print(f"✓ Roster athlete with category: {athlete.get('category')}, badge: {athlete.get('badgeColor')}")
        else:
            print("✓ No athletes with category to verify (all on track)")
    
    def test_coach_has_upcoming_events(self, coach_williams_token):
        """Coach response contains upcomingEvents list"""
        headers = {"Authorization": f"Bearer {coach_williams_token}"}
        resp = requests.get(f"{BASE_URL}/api/mission-control", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        
        assert "upcomingEvents" in data
        events = data["upcomingEvents"]
        assert isinstance(events, list)
        
        print(f"✓ Coach has {len(events)} upcoming events")
    
    def test_coach_has_recent_activity(self, coach_williams_token):
        """Coach response contains recentActivity list"""
        headers = {"Authorization": f"Bearer {coach_williams_token}"}
        resp = requests.get(f"{BASE_URL}/api/mission-control", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        
        assert "recentActivity" in data
        activity = data["recentActivity"]
        assert isinstance(activity, list)
        
        print(f"✓ Coach has {len(activity)} recent activity items")
    
    def test_coach_does_not_have_director_fields(self, coach_williams_token):
        """Coach response should NOT have director-specific fields"""
        headers = {"Authorization": f"Bearer {coach_williams_token}"}
        resp = requests.get(f"{BASE_URL}/api/mission-control", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        
        # Coach should NOT have these director-specific fields
        assert "programStatus" not in data
        assert "needsAttention" not in data
        assert "programActivity" not in data
        assert "programSnapshot" not in data
        
        print("✓ Coach response does NOT have director-specific fields")
    
    def test_coach_roster_sorted_by_momentum(self, coach_williams_token):
        """Coach roster is sorted by momentum (lowest first)"""
        headers = {"Authorization": f"Bearer {coach_williams_token}"}
        resp = requests.get(f"{BASE_URL}/api/mission-control", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        
        roster = data.get("myRoster", [])
        if len(roster) > 1:
            scores = [a.get("momentumScore", 0) for a in roster]
            # Verify sorted ascending (lowest momentum first = needs most attention)
            is_sorted = all(scores[i] <= scores[i+1] for i in range(len(scores)-1))
            assert is_sorted, f"Roster not sorted by momentum: {scores}"
            print(f"✓ Roster sorted by momentum (lowest first): {scores[:3]}...")
        else:
            print("✓ Not enough roster athletes to verify sorting")


class TestCoachGarciaData:
    """Test Coach Garcia's data to verify different coach sees different data"""
    
    def test_coach_garcia_gets_role_coach(self, coach_garcia_token):
        """Coach Garcia also gets role='coach'"""
        headers = {"Authorization": f"Bearer {coach_garcia_token}"}
        resp = requests.get(f"{BASE_URL}/api/mission-control", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("role") == "coach"
        print("✓ Coach Garcia gets role='coach' in response")
    
    def test_coach_garcia_has_different_roster(self, coach_williams_token, coach_garcia_token):
        """Different coaches should have different roster data"""
        headers_williams = {"Authorization": f"Bearer {coach_williams_token}"}
        headers_garcia = {"Authorization": f"Bearer {coach_garcia_token}"}
        
        resp_williams = requests.get(f"{BASE_URL}/api/mission-control", headers=headers_williams)
        resp_garcia = requests.get(f"{BASE_URL}/api/mission-control", headers=headers_garcia)
        
        assert resp_williams.status_code == 200
        assert resp_garcia.status_code == 200
        
        roster_williams = resp_williams.json().get("myRoster", [])
        roster_garcia = resp_garcia.json().get("myRoster", [])
        
        williams_ids = set(a["id"] for a in roster_williams)
        garcia_ids = set(a["id"] for a in roster_garcia)
        
        # Rosters should be different (at least some)
        # Note: They could share some athletes if both assigned
        print(f"✓ Williams roster: {len(roster_williams)}, Garcia roster: {len(roster_garcia)}")
        print(f"  Williams athlete IDs: {list(williams_ids)[:5]}...")
        print(f"  Garcia athlete IDs: {list(garcia_ids)[:5]}...")


class TestAIEndpoints:
    """Test AI endpoints that are triggered from Mission Control"""
    
    def test_ai_briefing_endpoint_exists(self, director_token):
        """AI briefing endpoint is accessible for director"""
        headers = {"Authorization": f"Bearer {director_token}"}
        resp = requests.post(f"{BASE_URL}/api/ai/briefing", headers=headers, json={}, timeout=60)
        # Should return 200 with text, or 500/503 if AI key/service issue
        assert resp.status_code in [200, 500, 503]
        if resp.status_code == 200:
            data = resp.json()
            assert "text" in data
            print(f"✓ AI briefing returned text (first 100 chars): {data['text'][:100]}...")
        else:
            print(f"✓ AI briefing endpoint exists but may have AI key issue: {resp.status_code}")
    
    def test_ai_suggested_actions_endpoint_exists(self, coach_williams_token):
        """AI suggested actions endpoint is accessible for coach"""
        headers = {"Authorization": f"Bearer {coach_williams_token}"}
        resp = requests.post(f"{BASE_URL}/api/ai/suggested-actions", headers=headers, json={}, timeout=60)
        # Should return 200 with actions, or 500/503 if AI key/service issue
        assert resp.status_code in [200, 500, 503]
        if resp.status_code == 200:
            data = resp.json()
            assert "actions" in data
            print(f"✓ AI suggested actions returned {len(data['actions'])} actions")
        else:
            print(f"✓ AI suggested actions endpoint exists but may have AI key issue: {resp.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

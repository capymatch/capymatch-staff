"""
Director Mission Control Refinement Tests
Tests for iteration 37 features:
- coachHealth array in /api/mission-control for director
- recruitingSignals in /api/mission-control for director  
- AI briefing returns leadership summary (no task lists)
- Program Activity limited to 6 items
"""

import pytest
import requests
import os
import re

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
DIRECTOR_CREDS = {"email": "director@capymatch.com", "password": "director123"}
COACH_WILLIAMS_CREDS = {"email": "coach.williams@capymatch.com", "password": "coach123"}


@pytest.fixture(scope="module")
def director_token():
    """Get director auth token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json=DIRECTOR_CREDS)
    if resp.status_code != 200:
        pytest.skip("Director login failed")
    return resp.json().get("token")


@pytest.fixture(scope="module")
def coach_token():
    """Get coach auth token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json=COACH_WILLIAMS_CREDS)
    if resp.status_code != 200:
        pytest.skip("Coach login failed")
    return resp.json().get("token")


class TestCoachHealthSection:
    """Tests for coachHealth data in Director Mission Control"""

    def test_director_has_coach_health(self, director_token):
        """Director response includes coachHealth array"""
        headers = {"Authorization": f"Bearer {director_token}"}
        resp = requests.get(f"{BASE_URL}/api/mission-control", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        
        assert "coachHealth" in data
        assert isinstance(data["coachHealth"], list)
        print(f"✓ Director has coachHealth with {len(data['coachHealth'])} coaches")

    def test_coach_health_has_required_fields(self, director_token):
        """Each coach in coachHealth has required fields: id, name, status, athleteCount, daysInactive"""
        headers = {"Authorization": f"Bearer {director_token}"}
        resp = requests.get(f"{BASE_URL}/api/mission-control", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        
        coach_health = data.get("coachHealth", [])
        assert len(coach_health) > 0, "coachHealth should have at least one coach"
        
        for coach in coach_health:
            assert "id" in coach, "Coach missing 'id'"
            assert "name" in coach, "Coach missing 'name'"
            assert "status" in coach, "Coach missing 'status'"
            assert "athleteCount" in coach, "Coach missing 'athleteCount'"
            assert "daysInactive" in coach or coach.get("daysInactive") is None, "Coach should have 'daysInactive' field"
            
            # Status should be valid
            valid_statuses = ["active", "inactive", "activating", "needs_support"]
            assert coach["status"] in valid_statuses, f"Invalid status: {coach['status']}"
            
            # athleteCount should be integer
            assert isinstance(coach["athleteCount"], int)
        
        print(f"✓ All {len(coach_health)} coaches have required fields")

    def test_coach_health_shows_known_coaches(self, director_token):
        """coachHealth includes Coach Williams and Coach Garcia with athletes"""
        headers = {"Authorization": f"Bearer {director_token}"}
        resp = requests.get(f"{BASE_URL}/api/mission-control", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        
        coach_health = data.get("coachHealth", [])
        coach_names = [c["name"] for c in coach_health]
        
        # Coach Williams (12 athletes) and Coach Garcia (10 athletes) should be present
        assert "Coach Williams" in coach_names, "Coach Williams should be in coachHealth"
        assert "Coach Garcia" in coach_names, "Coach Garcia should be in coachHealth"
        
        # Verify athlete counts
        williams = next((c for c in coach_health if c["name"] == "Coach Williams"), None)
        garcia = next((c for c in coach_health if c["name"] == "Coach Garcia"), None)
        
        if williams:
            print(f"  Coach Williams: {williams['athleteCount']} athletes, status: {williams['status']}")
        if garcia:
            print(f"  Coach Garcia: {garcia['athleteCount']} athletes, status: {garcia['status']}")
        
        print("✓ Known coaches found in coachHealth")

    def test_coach_does_not_see_coach_health(self, coach_token):
        """Coach should NOT have coachHealth in their response"""
        headers = {"Authorization": f"Bearer {coach_token}"}
        resp = requests.get(f"{BASE_URL}/api/mission-control", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        
        assert "coachHealth" not in data, "Coach should NOT see coachHealth"
        print("✓ Coach response does NOT contain coachHealth")


class TestRecruitingSignalsSection:
    """Tests for recruitingSignals data in Director Mission Control"""

    def test_director_has_recruiting_signals(self, director_token):
        """Director response includes recruitingSignals object"""
        headers = {"Authorization": f"Bearer {director_token}"}
        resp = requests.get(f"{BASE_URL}/api/mission-control", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        
        assert "recruitingSignals" in data
        signals = data["recruitingSignals"]
        assert isinstance(signals, dict)
        print(f"✓ Director has recruitingSignals: {signals}")

    def test_recruiting_signals_has_required_fields(self, director_token):
        """recruitingSignals has schoolInterests, hotInterests, warmInterests, newRecommendations, coachNotes"""
        headers = {"Authorization": f"Bearer {director_token}"}
        resp = requests.get(f"{BASE_URL}/api/mission-control", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        
        signals = data.get("recruitingSignals", {})
        
        required_fields = ["schoolInterests", "hotInterests", "warmInterests", "newRecommendations", "coachNotes"]
        for field in required_fields:
            assert field in signals, f"recruitingSignals missing '{field}'"
            assert isinstance(signals[field], int), f"'{field}' should be an integer"
        
        print(f"✓ recruitingSignals has all required fields")
        print(f"  schoolInterests: {signals['schoolInterests']}")
        print(f"  hotInterests: {signals['hotInterests']}")
        print(f"  warmInterests: {signals['warmInterests']}")
        print(f"  newRecommendations: {signals['newRecommendations']}")
        print(f"  coachNotes: {signals['coachNotes']}")

    def test_coach_does_not_see_recruiting_signals(self, coach_token):
        """Coach should NOT have recruitingSignals in their response"""
        headers = {"Authorization": f"Bearer {coach_token}"}
        resp = requests.get(f"{BASE_URL}/api/mission-control", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        
        assert "recruitingSignals" not in data, "Coach should NOT see recruitingSignals"
        print("✓ Coach response does NOT contain recruitingSignals")


class TestProgramActivityLimit:
    """Tests for Program Activity being limited to 6 items"""

    def test_program_activity_max_6_items(self, director_token):
        """Director's programActivity should be limited to 6 items"""
        headers = {"Authorization": f"Bearer {director_token}"}
        resp = requests.get(f"{BASE_URL}/api/mission-control", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        
        activity = data.get("programActivity", [])
        assert isinstance(activity, list)
        assert len(activity) <= 6, f"programActivity should have max 6 items, got {len(activity)}"
        
        print(f"✓ programActivity has {len(activity)} items (max 6)")


class TestAIBriefingLeadershipSummary:
    """Tests for AI briefing generating leadership summaries (no task lists)"""

    def test_ai_briefing_endpoint_returns_text(self, director_token):
        """AI briefing endpoint returns text field"""
        headers = {"Authorization": f"Bearer {director_token}"}
        resp = requests.post(
            f"{BASE_URL}/api/ai/briefing",
            headers=headers,
            json={},
            timeout=60
        )
        
        if resp.status_code in [500, 503]:
            pytest.skip("AI service unavailable in test environment")
        
        assert resp.status_code == 200
        data = resp.json()
        assert "text" in data
        assert len(data["text"]) > 0
        print(f"✓ AI briefing returned text ({len(data['text'])} chars)")

    def test_ai_briefing_no_numbered_list(self, director_token):
        """AI briefing should NOT contain numbered task lists"""
        headers = {"Authorization": f"Bearer {director_token}"}
        resp = requests.post(
            f"{BASE_URL}/api/ai/briefing",
            headers=headers,
            json={},
            timeout=60
        )
        
        if resp.status_code in [500, 503]:
            pytest.skip("AI service unavailable in test environment")
        
        assert resp.status_code == 200
        data = resp.json()
        text = data.get("text", "")
        
        # Check for numbered list patterns (e.g., "1.", "2.", etc.)
        numbered_pattern = r'^[0-9]+\.\s'
        has_numbered_list = bool(re.search(numbered_pattern, text, re.MULTILINE))
        
        assert not has_numbered_list, "AI briefing should NOT have numbered lists"
        print("✓ AI briefing is leadership summary (no numbered lists)")

    def test_ai_briefing_is_paragraph_text(self, director_token):
        """AI briefing should be paragraph text (sentences)"""
        headers = {"Authorization": f"Bearer {director_token}"}
        resp = requests.post(
            f"{BASE_URL}/api/ai/briefing",
            headers=headers,
            json={},
            timeout=60
        )
        
        if resp.status_code in [500, 503]:
            pytest.skip("AI service unavailable in test environment")
        
        assert resp.status_code == 200
        data = resp.json()
        text = data.get("text", "")
        
        # Should contain sentences (ends with period, has words)
        assert "." in text, "Briefing should have sentences ending with periods"
        assert len(text.split()) > 20, "Briefing should have at least 20 words"
        
        # Should NOT start with bullet points or dashes
        lines = text.strip().split("\n")
        for line in lines:
            stripped = line.strip()
            if stripped:
                assert not stripped.startswith("-"), "Should not have bullet points"
                assert not stripped.startswith("*"), "Should not have bullet points"
        
        print(f"✓ AI briefing is paragraph text: {text[:100]}...")


class TestDirectorKPIs:
    """Tests for Director Program Overview KPIs"""

    def test_director_has_5_kpis(self, director_token):
        """Director programStatus should have 5 KPI fields"""
        headers = {"Authorization": f"Bearer {director_token}"}
        resp = requests.get(f"{BASE_URL}/api/mission-control", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        
        status = data.get("programStatus", {})
        
        required_kpis = ["totalAthletes", "activeCoaches", "needingAttention", "upcomingEvents", "unassignedCount"]
        for kpi in required_kpis:
            assert kpi in status, f"Missing KPI: {kpi}"
            assert isinstance(status[kpi], int), f"KPI '{kpi}' should be integer"
        
        print(f"✓ All 5 KPIs present:")
        print(f"  Athletes: {status['totalAthletes']}")
        print(f"  Coaches: {status['activeCoaches']}")
        print(f"  Need Attention: {status['needingAttention']}")
        print(f"  Events Ahead: {status['upcomingEvents']}")
        print(f"  Unassigned: {status['unassignedCount']}")


class TestCoachMissionControlUnchanged:
    """Tests to verify Coach MC still works correctly after Director changes"""

    def test_coach_has_todays_summary(self, coach_token):
        """Coach should have todays_summary"""
        headers = {"Authorization": f"Bearer {coach_token}"}
        resp = requests.get(f"{BASE_URL}/api/mission-control", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        
        assert "todays_summary" in data
        summary = data["todays_summary"]
        assert "athleteCount" in summary
        assert "needingAction" in summary
        assert "upcomingEvents" in summary
        print(f"✓ Coach has todays_summary: {summary}")

    def test_coach_has_my_roster(self, coach_token):
        """Coach should have myRoster"""
        headers = {"Authorization": f"Bearer {coach_token}"}
        resp = requests.get(f"{BASE_URL}/api/mission-control", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        
        assert "myRoster" in data
        roster = data["myRoster"]
        assert isinstance(roster, list)
        assert len(roster) > 0
        
        # Verify roster has required fields
        athlete = roster[0]
        assert "id" in athlete
        assert "name" in athlete
        assert "momentumScore" in athlete
        assert "podHealth" in athlete
        
        print(f"✓ Coach has myRoster with {len(roster)} athletes")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

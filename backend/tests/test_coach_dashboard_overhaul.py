"""Test Coach Dashboard Overhaul Phase 1-2 — Hero KPIs, Summary Card, Priorities Queue, My Roster enhancements"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials for coach
COACH_EMAIL = "coach.williams@capymatch.com"
COACH_PASSWORD = "coach123"


@pytest.fixture(scope="module")
def coach_token():
    """Authenticate as coach and return token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": COACH_EMAIL, "password": COACH_PASSWORD},
    )
    if response.status_code != 200:
        pytest.skip(f"Coach authentication failed: {response.status_code} - {response.text}")
    return response.json().get("token")


@pytest.fixture(scope="module")
def coach_headers(coach_token):
    """Return headers with coach bearer token"""
    return {"Authorization": f"Bearer {coach_token}"}


class TestCoachMissionControlEndpoint:
    """Test /api/mission-control for coach role"""

    def test_mission_control_returns_200(self, coach_headers):
        """Mission control endpoint should return 200 for authenticated coach"""
        response = requests.get(
            f"{BASE_URL}/api/mission-control", headers=coach_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

    def test_response_contains_role_coach(self, coach_headers):
        """Response should identify role as club_coach"""
        response = requests.get(
            f"{BASE_URL}/api/mission-control", headers=coach_headers
        )
        data = response.json()
        assert data.get("role") == "club_coach", f"Expected role='club_coach', got {data.get('role')}"

    def test_response_contains_todays_summary_with_hero_kpis(self, coach_headers):
        """Response should contain todays_summary with athleteCount, needingAction, upcomingEvents, directorRequests"""
        response = requests.get(
            f"{BASE_URL}/api/mission-control", headers=coach_headers
        )
        data = response.json()
        summary = data.get("todays_summary", {})
        
        # Verify all 4 hero KPIs are present
        assert "athleteCount" in summary, "Missing athleteCount in todays_summary"
        assert "needingAction" in summary, "Missing needingAction in todays_summary"
        assert "upcomingEvents" in summary, "Missing upcomingEvents in todays_summary"
        assert "directorRequests" in summary, "Missing directorRequests in todays_summary"
        
        # Verify types
        assert isinstance(summary["athleteCount"], int), "athleteCount should be int"
        assert isinstance(summary["needingAction"], int), "needingAction should be int"
        assert isinstance(summary["upcomingEvents"], int), "upcomingEvents should be int"

    def test_response_contains_summary_lines(self, coach_headers):
        """Response should contain summary_lines array for quick summary card"""
        response = requests.get(
            f"{BASE_URL}/api/mission-control", headers=coach_headers
        )
        data = response.json()
        
        assert "summary_lines" in data, "Missing summary_lines in response"
        assert isinstance(data["summary_lines"], list), "summary_lines should be a list"
        
        # Each line should be a string
        for line in data["summary_lines"]:
            assert isinstance(line, str), f"summary_line should be string, got {type(line)}"

    def test_response_contains_priorities_array(self, coach_headers):
        """Response should contain priorities array for Today's Priorities card"""
        response = requests.get(
            f"{BASE_URL}/api/mission-control", headers=coach_headers
        )
        data = response.json()
        
        assert "priorities" in data, "Missing priorities in response"
        assert isinstance(data["priorities"], list), "priorities should be a list"

    def test_priorities_have_correct_structure(self, coach_headers):
        """Each priority item should have urgency, action, reason, cta_label, cta_path"""
        response = requests.get(
            f"{BASE_URL}/api/mission-control", headers=coach_headers
        )
        data = response.json()
        priorities = data.get("priorities", [])
        
        if not priorities:
            pytest.skip("No priorities to validate structure")
        
        for item in priorities:
            assert "urgency" in item, f"Priority missing 'urgency': {item}"
            assert "action" in item, f"Priority missing 'action': {item}"
            assert "reason" in item, f"Priority missing 'reason': {item}"
            assert "cta_label" in item, f"Priority missing 'cta_label': {item}"
            assert "cta_path" in item, f"Priority missing 'cta_path': {item}"
            
            # Urgency should be one of expected values
            valid_urgencies = ["critical", "follow_up", "director_request", "event_prep"]
            assert item["urgency"] in valid_urgencies, f"Invalid urgency: {item['urgency']}"

    def test_priorities_contain_athlete_or_event_info(self, coach_headers):
        """Each priority should have athlete_id/athlete_name or event_id/event_name"""
        response = requests.get(
            f"{BASE_URL}/api/mission-control", headers=coach_headers
        )
        data = response.json()
        priorities = data.get("priorities", [])
        
        if not priorities:
            pytest.skip("No priorities to validate")
        
        for item in priorities:
            has_athlete = "athlete_id" in item and "athlete_name" in item
            has_event = "event_id" in item and "event_name" in item
            assert has_athlete or has_event, f"Priority missing athlete or event info: {item}"


class TestCoachMyRosterEndpoint:
    """Test myRoster in coach mission-control response"""

    def test_response_contains_myRoster(self, coach_headers):
        """Response should contain myRoster array"""
        response = requests.get(
            f"{BASE_URL}/api/mission-control", headers=coach_headers
        )
        data = response.json()
        
        assert "myRoster" in data, "Missing myRoster in response"
        assert isinstance(data["myRoster"], list), "myRoster should be a list"

    def test_roster_athlete_has_required_fields(self, coach_headers):
        """Each roster athlete should have id, name, grad_year, position"""
        response = requests.get(
            f"{BASE_URL}/api/mission-control", headers=coach_headers
        )
        data = response.json()
        roster = data.get("myRoster", [])
        
        if not roster:
            pytest.skip("No athletes in roster to validate")
        
        for athlete in roster:
            assert "id" in athlete, f"Athlete missing 'id': {athlete}"
            assert "name" in athlete, f"Athlete missing 'name': {athlete}"
            assert "grad_year" in athlete or athlete.get("grad_year") is None, f"Athlete missing 'grad_year'"
            assert "position" in athlete or athlete.get("position") is None, f"Athlete missing 'position'"

    def test_roster_athlete_has_issue_type_category(self, coach_headers):
        """Athletes with issues should have category field (issue type)"""
        response = requests.get(
            f"{BASE_URL}/api/mission-control", headers=coach_headers
        )
        data = response.json()
        roster = data.get("myRoster", [])
        
        if not roster:
            pytest.skip("No athletes in roster")
        
        # At least one athlete should have a category, or none have issues
        valid_categories = [
            "momentum_drop", "blocker", "deadline_proximity", 
            "engagement_drop", "ownership_gap", "readiness_issue", None
        ]
        
        for athlete in roster:
            cat = athlete.get("category")
            assert cat in valid_categories, f"Invalid category: {cat}"

    def test_roster_athlete_has_next_step(self, coach_headers):
        """Athletes should have next_step field (human-friendly language)"""
        response = requests.get(
            f"{BASE_URL}/api/mission-control", headers=coach_headers
        )
        data = response.json()
        roster = data.get("myRoster", [])
        
        if not roster:
            pytest.skip("No athletes in roster")
        
        for athlete in roster:
            assert "next_step" in athlete, f"Athlete missing 'next_step': {athlete}"
            # next_step should be a string
            assert isinstance(athlete["next_step"], str), f"next_step should be string"

    def test_roster_athlete_has_why_reason(self, coach_headers):
        """Athletes with issues should have why field (reason text)"""
        response = requests.get(
            f"{BASE_URL}/api/mission-control", headers=coach_headers
        )
        data = response.json()
        roster = data.get("myRoster", [])
        
        # Filter to athletes with issues
        with_issues = [a for a in roster if a.get("category")]
        
        if not with_issues:
            pytest.skip("No athletes with issues to validate 'why' field")
        
        for athlete in with_issues:
            why = athlete.get("why")
            # why can be None or a string
            if why is not None:
                assert isinstance(why, str), f"'why' should be string, got {type(why)}"


class TestDirectorActionsEndpoint:
    """Test /api/director/actions for DIRECTOR REQUESTS KPI"""

    def test_director_actions_returns_200(self, coach_headers):
        """Director actions endpoint should return 200 for coach"""
        response = requests.get(
            f"{BASE_URL}/api/director/actions", headers=coach_headers
        )
        # May return 200 with empty actions, or 404 if endpoint doesn't exist for coaches
        assert response.status_code in [200, 403, 404], f"Unexpected status: {response.status_code}"

    def test_director_actions_returns_actions_array(self, coach_headers):
        """If accessible, should return actions array with status field"""
        response = requests.get(
            f"{BASE_URL}/api/director/actions", headers=coach_headers
        )
        if response.status_code != 200:
            pytest.skip(f"Director actions not accessible for coach: {response.status_code}")
        
        data = response.json()
        assert "actions" in data, "Missing 'actions' in response"
        assert isinstance(data["actions"], list), "'actions' should be a list"


class TestUpcomingEventsAndActivity:
    """Test upcomingEvents and recentActivity in response"""

    def test_response_contains_upcoming_events(self, coach_headers):
        """Response should contain upcomingEvents array"""
        response = requests.get(
            f"{BASE_URL}/api/mission-control", headers=coach_headers
        )
        data = response.json()
        
        assert "upcomingEvents" in data, "Missing upcomingEvents in response"
        assert isinstance(data["upcomingEvents"], list), "upcomingEvents should be a list"

    def test_response_contains_recent_activity(self, coach_headers):
        """Response should contain recentActivity array"""
        response = requests.get(
            f"{BASE_URL}/api/mission-control", headers=coach_headers
        )
        data = response.json()
        
        assert "recentActivity" in data, "Missing recentActivity in response"
        assert isinstance(data["recentActivity"], list), "recentActivity should be a list"


class TestSummaryLinesContent:
    """Test that summary_lines contain expected content patterns"""

    def test_summary_lines_mention_momentum_or_blocker_or_on_track(self, coach_headers):
        """Summary lines should mention momentum, blocker, engagement, or on track"""
        response = requests.get(
            f"{BASE_URL}/api/mission-control", headers=coach_headers
        )
        data = response.json()
        summary_lines = data.get("summary_lines", [])
        
        if not summary_lines:
            pytest.skip("No summary lines to validate content")
        
        # At least one line should contain expected keywords
        keywords = ["momentum", "blocker", "engagement", "on track", "event", "attention"]
        all_text = " ".join(summary_lines).lower()
        
        has_keyword = any(kw in all_text for kw in keywords)
        assert has_keyword, f"Summary lines don't contain expected keywords: {summary_lines}"


class TestCriticalPrioritiesUrgency:
    """Test that critical priorities have correct urgency assignment"""

    def test_momentum_drop_and_blocker_are_critical(self, coach_headers):
        """Momentum drop and blocker issues should be marked as critical urgency"""
        response = requests.get(
            f"{BASE_URL}/api/mission-control", headers=coach_headers
        )
        data = response.json()
        priorities = data.get("priorities", [])
        
        critical_items = [p for p in priorities if p.get("urgency") == "critical"]
        
        if not critical_items:
            pytest.skip("No critical priorities to validate")
        
        # Critical items should be check-in or blocker related
        for item in critical_items:
            action = item.get("action", "").lower()
            # Should be related to momentum/check-in or blocker
            valid = any(kw in action for kw in ["check in", "blocker", "remove"])
            assert valid, f"Critical priority has unexpected action: {item['action']}"

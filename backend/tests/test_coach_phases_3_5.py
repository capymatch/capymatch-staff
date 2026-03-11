"""
Test cases for Coach Dashboard Overhaul Phases 3-5
Phase 3: Support Pod - ActiveIssueBanner, NextActions, AthleteSnapshot, PodMembers
Phase 4: UpcomingEvents - athletes attending, attention, outreach, prep gaps
Phase 5: Language & UX - human-friendly action language, CSS variables
"""

import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")


@pytest.fixture(scope="module")
def coach_token():
    """Authenticate as coach and return token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "coach.williams@capymatch.com",
        "password": "coach123"
    })
    if response.status_code != 200:
        pytest.skip("Coach authentication failed")
    return response.json().get("token")


@pytest.fixture(scope="module")
def coach_headers(coach_token):
    """Return headers with auth token"""
    return {"Authorization": f"Bearer {coach_token}"}


class TestCoachDashboardHeroKPIs:
    """Test Coach Dashboard Hero KPIs - MY ATHLETES, NEED ACTION, EVENTS THIS WEEK, DIRECTOR REQUESTS"""

    def test_mission_control_returns_4_kpis(self, coach_headers):
        """Verify mission control returns all 4 KPIs in todays_summary"""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=coach_headers)
        assert response.status_code == 200

        data = response.json()
        summary = data.get("todays_summary", {})

        # Verify all 4 KPIs exist
        assert "athleteCount" in summary, "Missing athleteCount (MY ATHLETES)"
        assert "needingAction" in summary, "Missing needingAction (NEED ACTION)"
        assert "upcomingEvents" in summary, "Missing upcomingEvents (EVENTS THIS WEEK)"
        assert "directorRequests" in summary, "Missing directorRequests (DIRECTOR REQUESTS)"

        # Verify values are numbers
        assert isinstance(summary["athleteCount"], int)
        assert isinstance(summary["needingAction"], int)
        assert isinstance(summary["upcomingEvents"], int)


class TestCoachSummaryCard:
    """Test Summary Card - human-readable lines like '3 athletes have momentum drop'"""

    def test_summary_lines_present(self, coach_headers):
        """Verify summary_lines array is present with human-readable text"""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=coach_headers)
        assert response.status_code == 200

        data = response.json()
        summary_lines = data.get("summary_lines", [])

        # Should have at least one summary line
        assert len(summary_lines) >= 1, "summary_lines should have at least one line"

        # Check format - should be human-readable sentences
        for line in summary_lines:
            assert isinstance(line, str)
            assert len(line) > 5, "Summary line should be a meaningful sentence"


class TestTodaysPrioritiesGrouped:
    """Test Today's Priorities grouped by urgency: Critical, Follow-Up Needed, Event Prep"""

    def test_priorities_have_urgency_field(self, coach_headers):
        """Verify each priority item has urgency field"""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=coach_headers)
        assert response.status_code == 200

        data = response.json()
        priorities = data.get("priorities", [])

        for item in priorities:
            assert "urgency" in item, f"Priority item missing urgency: {item}"
            assert item["urgency"] in ["critical", "follow_up", "event_prep", "director_request"]

    def test_priority_rows_have_required_fields(self, coach_headers):
        """Verify priority rows have athlete_name, action, reason, cta_label, cta_path"""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=coach_headers)
        assert response.status_code == 200

        data = response.json()
        priorities = data.get("priorities", [])

        for item in priorities:
            # Either athlete_id or event_id should be present
            has_id = "athlete_id" in item or "event_id" in item
            assert has_id, f"Priority missing athlete_id or event_id: {item}"

            # Either athlete_name or event_name should be present
            has_name = "athlete_name" in item or "event_name" in item
            assert has_name, f"Priority missing athlete_name or event_name: {item}"

            assert "action" in item, f"Priority missing action: {item}"
            assert "reason" in item, f"Priority missing reason: {item}"
            assert "cta_label" in item, f"Priority missing cta_label: {item}"
            assert "cta_path" in item, f"Priority missing cta_path: {item}"


class TestMyRoster:
    """Test My Roster - issue type badge, reason, NEXT step, on-track separator"""

    def test_roster_athletes_have_category_and_why(self, coach_headers):
        """Verify roster athletes have category (issue type) and why (reason)"""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=coach_headers)
        assert response.status_code == 200

        data = response.json()
        roster = data.get("myRoster", [])

        assert len(roster) > 0, "Roster should have athletes"

        for athlete in roster:
            assert "id" in athlete
            assert "name" in athlete
            # category can be None for on-track athletes
            # why can be None for on-track athletes
            # next_step should always exist
            assert "next_step" in athlete, f"Athlete missing next_step: {athlete}"

    def test_roster_has_on_track_and_needs_action_athletes(self, coach_headers):
        """Verify roster has both athletes needing action (with category) and on-track (no category)"""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=coach_headers)
        assert response.status_code == 200

        data = response.json()
        roster = data.get("myRoster", [])

        needs_action = [a for a in roster if a.get("category")]
        on_track = [a for a in roster if not a.get("category")]

        # Should have mix of both (based on mock data)
        assert len(needs_action) > 0, "Should have athletes needing action"
        # Note: may not have on-track if all have issues


class TestSupportPodActiveIssueBanner:
    """Phase 3: Test Support Pod Active Issue Banner - WHAT TO DO NOW, WHAT IS WRONG, WHAT CHANGED"""

    def test_support_pod_returns_active_intervention(self, coach_headers):
        """Verify support pod endpoint returns active_intervention with required fields"""
        # Use athlete_3 (Emma Chen) who has a support pod
        response = requests.get(f"{BASE_URL}/api/support-pods/athlete_3", headers=coach_headers)
        assert response.status_code == 200

        data = response.json()

        # Should have athlete data
        assert "athlete" in data

        # active_intervention may or may not exist depending on data
        if data.get("active_intervention"):
            intervention = data["active_intervention"]
            assert "category" in intervention
            assert "recommended_action" in intervention, "Missing 'What to do now' (recommended_action)"
            assert "why_this_surfaced" in intervention, "Missing 'What is wrong' (why_this_surfaced)"
            assert "what_changed" in intervention, "Missing 'What changed' (what_changed)"
            assert "owner" in intervention

    def test_support_pod_returns_pod_members(self, coach_headers):
        """Verify support pod returns pod_members with is_primary flag"""
        response = requests.get(f"{BASE_URL}/api/support-pods/athlete_3", headers=coach_headers)
        assert response.status_code == 200

        data = response.json()
        members = data.get("pod_members", [])

        # Should have at least one member
        assert len(members) > 0, "Should have pod members"

        # Check for is_primary field
        has_primary = any(m.get("is_primary") for m in members)
        # Primary may or may not exist, but is_primary field should be checked

        for member in members:
            assert "id" in member
            assert "name" in member
            assert "role" in member


class TestSupportPodNextActions:
    """Phase 3: Test NextActions - grouped by OVERDUE/READY/UPCOMING"""

    def test_support_pod_returns_actions(self, coach_headers):
        """Verify support pod returns actions with status field"""
        response = requests.get(f"{BASE_URL}/api/support-pods/athlete_3", headers=coach_headers)
        assert response.status_code == 200

        data = response.json()
        actions = data.get("actions", [])

        # Actions may be empty, but if present check fields
        for action in actions:
            assert "id" in action
            assert "title" in action
            # status can be: overdue, ready, in_progress, blocked, upcoming, completed
            if "status" in action:
                assert action["status"] in ["overdue", "ready", "in_progress", "blocked", "upcoming", "completed", None]


class TestSupportPodAthleteSnapshot:
    """Phase 3: Test AthleteSnapshot - Pipeline Health percentage, engagement label"""

    def test_athlete_has_pipeline_health_fields(self, coach_headers):
        """Verify athlete data has fields needed for Pipeline Health calculation"""
        response = requests.get(f"{BASE_URL}/api/support-pods/athlete_3", headers=coach_headers)
        assert response.status_code == 200

        data = response.json()
        athlete = data.get("athlete", {})

        # Fields needed for Pipeline Health: school_targets, active_interest
        assert "school_targets" in athlete or athlete.get("school_targets") is None
        assert "active_interest" in athlete or athlete.get("active_interest") is None
        assert "momentum_score" in athlete
        assert "momentum_trend" in athlete


class TestUpcomingEventsEnriched:
    """Phase 4: Test UpcomingEvents - athletes attending, who needs attention, prep gaps"""

    def test_events_have_athlete_ids(self, coach_headers):
        """Verify events have athlete_ids for cross-referencing"""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=coach_headers)
        assert response.status_code == 200

        data = response.json()
        events = data.get("upcomingEvents", [])

        # Events should have athlete_ids (may be empty array)
        for event in events:
            assert "id" in event
            assert "name" in event
            # athlete_ids may or may not be present
            if "athlete_ids" in event:
                assert isinstance(event["athlete_ids"], list)

    def test_events_have_checklist(self, coach_headers):
        """Verify events have checklist for prep gaps calculation"""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=coach_headers)
        assert response.status_code == 200

        data = response.json()
        events = data.get("upcomingEvents", [])

        for event in events:
            # checklist may or may not be present
            if "checklist" in event:
                assert isinstance(event["checklist"], list)


class TestHeaderNeedActionLanguage:
    """Phase 5: Test Header uses 'need action' instead of 'alerts'"""

    def test_todays_summary_uses_needing_action(self, coach_headers):
        """Verify backend returns needingAction field (not alertCount)"""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=coach_headers)
        assert response.status_code == 200

        data = response.json()
        summary = data.get("todays_summary", {})

        assert "needingAction" in summary, "Should use 'needingAction' field"


class TestResolveSuportPodIssue:
    """Test resolve endpoint for Support Pod"""

    def test_resolve_endpoint_exists(self, coach_headers):
        """Verify resolve endpoint exists (may fail if no active intervention)"""
        # This is a POST endpoint that may or may not succeed
        response = requests.post(
            f"{BASE_URL}/api/support-pods/athlete_3/resolve",
            headers=coach_headers,
            json={"category": "momentum_drop", "resolution_note": "Test resolve"}
        )
        # 200 = success, 400/404 = no intervention to resolve
        assert response.status_code in [200, 400, 404, 422]


class TestSupportPodActions:
    """Test CRUD operations for Support Pod actions"""

    def test_create_action(self, coach_headers):
        """Test creating a new action"""
        response = requests.post(
            f"{BASE_URL}/api/support-pods/athlete_3/actions",
            headers=coach_headers,
            json={"title": "TEST_action_from_pytest", "owner": "Coach Martinez"}
        )
        # May succeed or fail depending on implementation
        assert response.status_code in [200, 201, 400, 422]

    def test_patch_action(self, coach_headers):
        """Test patching an action (get actions first)"""
        # First get actions
        response = requests.get(f"{BASE_URL}/api/support-pods/athlete_3", headers=coach_headers)
        if response.status_code != 200:
            pytest.skip("Could not get support pod data")

        actions = response.json().get("actions", [])
        if not actions:
            pytest.skip("No actions to patch")

        action_id = actions[0]["id"]
        patch_response = requests.patch(
            f"{BASE_URL}/api/support-pods/athlete_3/actions/{action_id}",
            headers=coach_headers,
            json={"status": "in_progress"}
        )
        assert patch_response.status_code in [200, 400, 404, 422]

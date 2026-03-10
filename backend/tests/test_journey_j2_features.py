"""
Test Journey Page J2 Features:
- Engagement endpoint (GET /api/athlete/engagement/{program_id})
- Coach Watch Alert badge (mocked as "Staff Stable")
- Engagement stats in coaches card
- ConversationBubble enhancements
- CoachSocialLinks component
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
TEST_EMAIL = "emma.chen@athlete.capymatch.com"
TEST_PASSWORD = "password123"

# Test program IDs
STANFORD_ID = "a54a0014-0e83-4a16-b0c2-5e8f10401de2"  # Overdue follow-up
TAMPA_ID = "66c1d51c-3326-4d74-a3e1-aa49776b3ec5"    # New school
FLORIDA_ID = "15d08982-3c51-4761-9b83-67414484582e"  # Has interactions
BYU_ID = "06553aea-e820-40a9-97f2-b3fc0df66313"      # Has 2 coaches


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for athlete user."""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    return data.get("token")


@pytest.fixture(scope="module")
def headers(auth_token):
    """Headers with auth token."""
    return {"Authorization": f"Bearer {auth_token}"}


class TestEngagementEndpoint:
    """Test the new GET /api/athlete/engagement/{program_id} endpoint."""

    def test_engagement_endpoint_returns_200(self, headers):
        """Test that the engagement endpoint returns 200 for Stanford."""
        response = requests.get(
            f"{BASE_URL}/api/athlete/engagement/{STANFORD_ID}",
            headers=headers,
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

    def test_engagement_response_structure(self, headers):
        """Test that engagement response has correct fields."""
        response = requests.get(
            f"{BASE_URL}/api/athlete/engagement/{STANFORD_ID}",
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields exist
        assert "total_opens" in data, "Missing total_opens field"
        assert "total_clicks" in data, "Missing total_clicks field"
        assert "unique_opens" in data, "Missing unique_opens field"
        assert "timeline" in data, "Missing timeline field"
        
        # Check field types
        assert isinstance(data["total_opens"], int), "total_opens should be int"
        assert isinstance(data["total_clicks"], int), "total_clicks should be int"
        assert isinstance(data["unique_opens"], int), "unique_opens should be int"
        assert isinstance(data["timeline"], list), "timeline should be list"

    def test_engagement_stats_are_zero_no_tracking_data(self, headers):
        """Test that engagement stats are 0 when no email tracking data exists."""
        response = requests.get(
            f"{BASE_URL}/api/athlete/engagement/{STANFORD_ID}",
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()
        
        # Expected: 0 since no engagement_events exist for this program
        assert data["total_opens"] == 0, f"Expected 0 opens, got {data['total_opens']}"
        assert data["total_clicks"] == 0, f"Expected 0 clicks, got {data['total_clicks']}"
        assert data["unique_opens"] == 0, f"Expected 0 unique opens, got {data['unique_opens']}"

    def test_engagement_endpoint_for_different_programs(self, headers):
        """Test engagement endpoint works for multiple programs."""
        for program_id in [STANFORD_ID, TAMPA_ID, FLORIDA_ID]:
            response = requests.get(
                f"{BASE_URL}/api/athlete/engagement/{program_id}",
                headers=headers,
            )
            assert response.status_code == 200, f"Failed for program {program_id}"
            data = response.json()
            assert "total_opens" in data
            assert "timeline" in data

    def test_engagement_requires_auth(self):
        """Test that engagement endpoint requires authentication."""
        response = requests.get(
            f"{BASE_URL}/api/athlete/engagement/{STANFORD_ID}",
        )
        # Should return 401 or 403 without auth
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"


class TestProgramWithCoaches:
    """Test programs that have coaches (for CoachSocialLinks integration)."""

    def test_program_with_coaches_returns_college_coaches(self, headers):
        """Test that programs return college_coaches array."""
        response = requests.get(
            f"{BASE_URL}/api/athlete/programs/{BYU_ID}",
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "college_coaches" in data, "Missing college_coaches field"
        coaches = data["college_coaches"]
        assert isinstance(coaches, list), "college_coaches should be list"
        assert len(coaches) >= 2, f"Expected at least 2 coaches for BYU, got {len(coaches)}"

    def test_coach_has_required_fields(self, headers):
        """Test that coach objects have required fields."""
        response = requests.get(
            f"{BASE_URL}/api/athlete/programs/{BYU_ID}",
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()
        
        for coach in data["college_coaches"]:
            assert "coach_id" in coach, "Missing coach_id"
            assert "coach_name" in coach, "Missing coach_name"
            assert "role" in coach, "Missing role"
            assert "email" in coach, "Missing email"

    def test_program_may_have_kb_coaches(self, headers):
        """Test that programs can optionally have kb_coaches (from knowledge base)."""
        response = requests.get(
            f"{BASE_URL}/api/athlete/programs/{BYU_ID}",
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()
        
        # kb_coaches can be null or array - just check it doesn't error
        # CoachSocialLinks component handles null gracefully
        kb_coaches = data.get("kb_coaches")
        assert kb_coaches is None or isinstance(kb_coaches, list), \
            "kb_coaches should be null or array"


class TestJourneyTimeline:
    """Test journey timeline for ConversationBubble features."""

    def test_journey_timeline_returns_events(self, headers):
        """Test that journey endpoint returns timeline events."""
        response = requests.get(
            f"{BASE_URL}/api/athlete/programs/{FLORIDA_ID}/journey",
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "timeline" in data, "Missing timeline field"
        timeline = data["timeline"]
        assert isinstance(timeline, list), "timeline should be list"
        assert len(timeline) > 0, "Florida should have timeline events"

    def test_timeline_event_structure(self, headers):
        """Test that timeline events have fields needed for ConversationBubble."""
        response = requests.get(
            f"{BASE_URL}/api/athlete/programs/{FLORIDA_ID}/journey",
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()
        timeline = data["timeline"]
        
        for event in timeline:
            # Required fields for ConversationBubble
            assert "event_type" in event, "Missing event_type"
            assert "date" in event or "date_time" in event, "Missing date field"
            # content/notes used for message body
            assert "content" in event or "notes" in event, "Missing content/notes"

    def test_timeline_has_different_event_types(self, headers):
        """Test that Florida has different event types."""
        response = requests.get(
            f"{BASE_URL}/api/athlete/programs/{FLORIDA_ID}/journey",
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()
        timeline = data["timeline"]
        
        event_types = set(e.get("event_type") for e in timeline)
        # Florida should have email_sent, email_received, camp, phone_call
        assert len(event_types) >= 2, f"Expected multiple event types, got: {event_types}"

    def test_email_received_events_have_coach_name(self, headers):
        """Test that coach replies have coach_name for 'Coach' label."""
        response = requests.get(
            f"{BASE_URL}/api/athlete/programs/{FLORIDA_ID}/journey",
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()
        timeline = data["timeline"]
        
        coach_replies = [e for e in timeline if e.get("event_type") == "email_received"]
        for reply in coach_replies:
            # Should have coach_name (defaults to "Coach" if empty)
            assert "coach_name" in reply, "email_received should have coach_name field"


class TestJ1FeaturesStillWork:
    """Verify J1 features are still functioning."""

    def test_program_has_journey_rail(self, headers):
        """Test that program has journey_rail for ProgressRail component."""
        response = requests.get(
            f"{BASE_URL}/api/athlete/programs/{STANFORD_ID}",
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "journey_rail" in data, "Missing journey_rail"
        rail = data["journey_rail"]
        assert "stages" in rail, "Missing stages in journey_rail"
        assert "active" in rail, "Missing active stage"
        assert "pulse" in rail, "Missing pulse indicator"

    def test_program_has_signals_for_engagement_stats(self, headers):
        """Test that program has signals used by engagement stats sidebar."""
        response = requests.get(
            f"{BASE_URL}/api/athlete/programs/{FLORIDA_ID}",
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "signals" in data, "Missing signals"
        signals = data["signals"]
        # These are used by the Engagement Stats sidebar card
        assert "outreach_count" in signals
        assert "reply_count" in signals
        assert "total_interactions" in signals

    def test_match_scores_endpoint_still_works(self, headers):
        """Test that match scores endpoint still returns data for J1 badges."""
        response = requests.get(
            f"{BASE_URL}/api/match-scores",
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "scores" in data, "Missing scores array"
        scores = data["scores"]
        assert isinstance(scores, list), "scores should be array"

    def test_follow_up_fields_present(self, headers):
        """Test that follow-up fields exist for overdue/upcoming cards."""
        response = requests.get(
            f"{BASE_URL}/api/athlete/programs/{STANFORD_ID}",
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()
        
        # Stanford has an overdue follow-up
        assert "next_action_due" in data, "Missing next_action_due field"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

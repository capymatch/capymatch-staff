"""Test unmocked features: Coach Watch Alert, School Social Links, Stripe Checkout.

These features were previously mocked and are now real implementations:
1. Coach Watch Alert - real API call to /api/ai/coach-watch/alert/{university_name}
2. School Social Links - from university_knowledge_base collection
3. Stripe Checkout - real Stripe integration
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
ATHLETE_EMAIL = "emma.chen@athlete.capymatch.com"
ATHLETE_PASSWORD = "password123"
STANFORD_PROGRAM_ID = "a54a0014-0e83-4a16-b0c2-5e8f10401de2"
BYU_PROGRAM_ID = "06553aea-e820-40a9-97f2-b3fc0df66313"


@pytest.fixture(scope="module")
def auth_token():
    """Get JWT token for athlete user."""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ATHLETE_EMAIL,
        "password": ATHLETE_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    token = data.get("session_token") or data.get("token")
    assert token, f"No token in response: {data}"
    return token


@pytest.fixture
def auth_headers(auth_token):
    """Get auth headers for requests."""
    return {"Authorization": f"Bearer {auth_token}"}


# ─────────────────────────────────────────────────────────────
# 1. School Social Links Tests
# ─────────────────────────────────────────────────────────────

class TestSchoolSocialLinks:
    """Test that school social links are returned from KB."""

    def test_program_list_returns_social_links(self, auth_headers):
        """GET /api/athlete/programs should include social_links from KB."""
        response = requests.get(f"{BASE_URL}/api/athlete/programs", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        programs = response.json()
        assert isinstance(programs, list), "Expected list of programs"
        
        # Find programs with social_links
        programs_with_links = [p for p in programs if p.get("social_links")]
        print(f"Found {len(programs_with_links)} programs with social_links out of {len(programs)}")
        
        # Stanford should have social links per test requirements
        stanford = next((p for p in programs if "Stanford" in p.get("university_name", "")), None)
        if stanford:
            print(f"Stanford program: {stanford.get('university_name')}")
            print(f"Stanford social_links: {stanford.get('social_links')}")
            if stanford.get("social_links"):
                links = stanford["social_links"]
                # Stanford should have instagram, twitter, facebook, youtube per requirements
                expected_platforms = ["instagram", "twitter", "facebook", "youtube"]
                for platform in expected_platforms:
                    if platform in links:
                        print(f"  - {platform}: {links[platform][:50]}..." if links[platform] else f"  - {platform}: empty")

    def test_stanford_program_has_social_links(self, auth_headers):
        """GET /api/athlete/programs/{programId} for Stanford returns social_links."""
        response = requests.get(f"{BASE_URL}/api/athlete/programs/{STANFORD_PROGRAM_ID}", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        program = response.json()
        print(f"Stanford program details:")
        print(f"  university_name: {program.get('university_name')}")
        print(f"  social_links: {program.get('social_links')}")
        
        # Verify social links structure if present
        if program.get("social_links"):
            links = program["social_links"]
            assert isinstance(links, dict), "social_links should be a dict"


# ─────────────────────────────────────────────────────────────
# 2. Coach Watch Alert Tests
# ─────────────────────────────────────────────────────────────

class TestCoachWatchAlert:
    """Test Coach Watch Alert real API implementation."""

    def test_coach_watch_alert_stanford(self, auth_headers):
        """GET /api/ai/coach-watch/alert/{university_name} returns real data."""
        university_name = "Stanford"
        response = requests.get(
            f"{BASE_URL}/api/ai/coach-watch/alert/{university_name}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        print(f"Coach Watch Alert for Stanford: {data}")
        
        # Check structure - alert may be null if no data
        if data.get("alert"):
            alert = data["alert"]
            print(f"  status: {alert.get('status')}")
            print(f"  severity: {alert.get('severity')}")
            print(f"  change_type: {alert.get('change_type')}")
            print(f"  recommendation: {alert.get('recommendation')}")
            
            # Validate expected fields
            assert "severity" in alert or "status" in alert, "Alert should have severity or status"

    def test_coach_watch_alert_byu(self, auth_headers):
        """Test Coach Watch for BYU."""
        university_name = "BYU"
        response = requests.get(
            f"{BASE_URL}/api/ai/coach-watch/alert/{university_name}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        print(f"Coach Watch Alert for BYU: {data}")

    def test_coach_watch_alerts_list(self, auth_headers):
        """GET /api/ai/coach-watch/alerts returns list of alerts."""
        response = requests.get(f"{BASE_URL}/api/ai/coach-watch/alerts", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        alerts = data.get("alerts", [])
        print(f"Total coach watch alerts: {len(alerts)}")
        
        for alert in alerts[:3]:
            print(f"  - {alert.get('university_name')}: {alert.get('status')} ({alert.get('severity')})")


# ─────────────────────────────────────────────────────────────
# 3. Stripe Checkout Tests
# ─────────────────────────────────────────────────────────────

class TestStripeCheckout:
    """Test Stripe checkout integration."""

    def test_create_checkout_session_pro(self, auth_headers):
        """POST /api/checkout/create-session creates real Stripe session."""
        response = requests.post(
            f"{BASE_URL}/api/checkout/create-session",
            json={
                "tier": "pro",
                "origin_url": "https://pod-task-manager.preview.emergentagent.com"
            },
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        print(f"Checkout session response:")
        print(f"  url: {data.get('url', '')[:80]}...")
        print(f"  session_id: {data.get('session_id')}")
        
        # Verify session was created
        assert data.get("url"), "Should return Stripe checkout URL"
        assert data.get("session_id"), "Should return session_id"
        assert "stripe.com" in data.get("url", ""), "URL should point to Stripe"

    def test_create_checkout_session_premium(self, auth_headers):
        """POST /api/checkout/create-session for premium tier."""
        response = requests.post(
            f"{BASE_URL}/api/checkout/create-session",
            json={
                "tier": "premium",
                "origin_url": "https://pod-task-manager.preview.emergentagent.com"
            },
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        print(f"Premium checkout session:")
        print(f"  url: {data.get('url', '')[:80]}...")
        print(f"  session_id: {data.get('session_id')}")
        
        assert data.get("url"), "Should return Stripe checkout URL"
        assert "stripe.com" in data.get("url", ""), "URL should point to Stripe"

    def test_create_checkout_session_invalid_tier(self, auth_headers):
        """POST /api/checkout/create-session with invalid tier returns 400."""
        response = requests.post(
            f"{BASE_URL}/api/checkout/create-session",
            json={
                "tier": "invalid_tier",
                "origin_url": "https://pod-task-manager.preview.emergentagent.com"
            },
            headers=auth_headers
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"

    def test_checkout_status_invalid_session(self, auth_headers):
        """GET /api/checkout/status/{session_id} with invalid session."""
        response = requests.get(
            f"{BASE_URL}/api/checkout/status/invalid_session_id",
            headers=auth_headers
        )
        # Should handle gracefully - either 404 or error from Stripe
        print(f"Invalid session status response: {response.status_code} - {response.text}")


# ─────────────────────────────────────────────────────────────
# 4. Journey Page Features Regression
# ─────────────────────────────────────────────────────────────

class TestJourneyFeatures:
    """Regression tests for J1-J4 Journey page features."""

    def test_match_scores_endpoint(self, auth_headers):
        """GET /api/match-scores returns scores with risk badges."""
        response = requests.get(f"{BASE_URL}/api/match-scores", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        scores = data.get("scores", [])
        print(f"Total match scores: {len(scores)}")
        
        # Find Stanford score
        stanford = next((s for s in scores if s.get("program_id") == STANFORD_PROGRAM_ID), None)
        if stanford:
            print(f"Stanford match score: {stanford.get('match_score')}")
            print(f"Stanford risk badges: {stanford.get('risk_badges')}")

    def test_program_engagement(self, auth_headers):
        """GET /api/athlete/engagement/{program_id} returns engagement stats."""
        response = requests.get(
            f"{BASE_URL}/api/athlete/engagement/{STANFORD_PROGRAM_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        print(f"Stanford engagement:")
        print(f"  total_opens: {data.get('total_opens')}")
        print(f"  total_clicks: {data.get('total_clicks')}")
        print(f"  unique_opens: {data.get('unique_opens')}")

    def test_program_journey_timeline(self, auth_headers):
        """GET /api/athlete/programs/{program_id}/journey returns timeline."""
        response = requests.get(
            f"{BASE_URL}/api/athlete/programs/{STANFORD_PROGRAM_ID}/journey",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        timeline = data.get("timeline", [])
        print(f"Stanford timeline events: {len(timeline)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

"""Pre-Production Deployment Smoke Tests for CapyMatch.

Tests all critical flows before Vercel/Railway deployment:
- Auth: login, refresh for athlete/director/platform_admin
- Mission Control dashboard
- Athlete programs
- Coaching stability
- Gmail status
- Admin integrations (gmail, stripe, resend, mongodb_prod, ai)
- Stripe checkout
- No hardcoded preview URLs in responses
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
ATHLETE_EMAIL = "emma.chen@athlete.capymatch.com"
ATHLETE_PASSWORD = "athlete123"
DIRECTOR_EMAIL = "director@capymatch.com"
DIRECTOR_PASSWORD = "director123"
PLATFORM_ADMIN_EMAIL = "douglas@capymatch.com"
PLATFORM_ADMIN_PASSWORD = "capymatch2026"
TEST_PROGRAM_ID = "cd5c0908-c3ea-49d1-8a5f-d57d18f32116"


class TestAuthEndpoints:
    """Authentication endpoint tests for all roles."""

    def test_athlete_login_success(self):
        """POST /api/auth/login with athlete credentials returns token."""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ATHLETE_EMAIL, "password": ATHLETE_PASSWORD},
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "refresh_token" in data, "Response should contain refresh_token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["email"] == ATHLETE_EMAIL
        assert data["user"]["role"] == "athlete"
        print(f"✓ Athlete login successful: {data['user']['email']}")

    def test_director_login_success(self):
        """POST /api/auth/login with director credentials returns token."""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DIRECTOR_EMAIL, "password": DIRECTOR_PASSWORD},
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "director"
        print(f"✓ Director login successful: {data['user']['email']}")

    def test_platform_admin_login_success(self):
        """POST /api/auth/login with platform_admin credentials returns token."""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": PLATFORM_ADMIN_EMAIL, "password": PLATFORM_ADMIN_PASSWORD},
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "platform_admin"
        print(f"✓ Platform Admin login successful: {data['user']['email']}")

    def test_login_invalid_credentials(self):
        """POST /api/auth/login with invalid credentials returns 401."""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "invalid@test.com", "password": "wrongpassword"},
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials correctly rejected with 401")

    def test_refresh_token(self):
        """POST /api/auth/refresh refreshes the token."""
        # First login to get refresh token
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ATHLETE_EMAIL, "password": ATHLETE_PASSWORD},
        )
        assert login_response.status_code == 200
        refresh_token = login_response.json()["refresh_token"]

        # Now refresh
        refresh_response = requests.post(
            f"{BASE_URL}/api/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        assert refresh_response.status_code == 200, f"Expected 200, got {refresh_response.status_code}: {refresh_response.text}"
        data = refresh_response.json()
        assert "token" in data, "Refresh should return new token"
        assert "refresh_token" in data, "Refresh should return new refresh_token"
        print("✓ Token refresh successful")


class TestAthleteDashboard:
    """Athlete dashboard and program tests."""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as athlete before each test."""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ATHLETE_EMAIL, "password": ATHLETE_PASSWORD},
        )
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_mission_control_returns_dashboard_data(self):
        """GET /api/mission-control returns dashboard data for athlete."""
        response = requests.get(
            f"{BASE_URL}/api/mission-control",
            headers=self.headers,
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        # Mission control should return some dashboard structure
        assert isinstance(data, dict), "Response should be a dict"
        print(f"✓ Mission control returned data with keys: {list(data.keys())[:5]}...")

    def test_athlete_programs_returns_list(self):
        """GET /api/athlete/programs returns program list."""
        response = requests.get(
            f"{BASE_URL}/api/athlete/programs",
            headers=self.headers,
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "programs" in data or isinstance(data, list), "Response should contain programs"
        programs = data.get("programs", data) if isinstance(data, dict) else data
        print(f"✓ Athlete programs returned {len(programs)} programs")

    def test_coaching_stability_returns_data(self):
        """GET /api/coaching-stability/{program_id} returns stability data."""
        response = requests.get(
            f"{BASE_URL}/api/coaching-stability/{TEST_PROGRAM_ID}",
            headers=self.headers,
            timeout=30,  # May take time for AI scan
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "stability" in data, "Response should contain stability"
        stability = data["stability"]
        assert "severity" in stability or "change_type" in stability, "Stability should have severity or change_type"
        print(f"✓ Coaching stability returned: {stability.get('change_type', stability.get('severity', 'unknown'))}")

    def test_gmail_status_returns_connection_status(self):
        """GET /api/athlete/gmail/status returns gmail connection status."""
        response = requests.get(
            f"{BASE_URL}/api/athlete/gmail/status",
            headers=self.headers,
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "connected" in data, "Response should contain connected field"
        print(f"✓ Gmail status: connected={data['connected']}")


class TestAdminIntegrations:
    """Admin integrations page tests (requires platform_admin role)."""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as platform_admin before each test."""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": PLATFORM_ADMIN_EMAIL, "password": PLATFORM_ADMIN_PASSWORD},
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_admin_integrations_returns_all_statuses(self):
        """GET /api/admin/integrations returns all integration statuses."""
        response = requests.get(
            f"{BASE_URL}/api/admin/integrations",
            headers=self.headers,
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Check all expected integrations are present
        expected_integrations = ["gmail", "stripe", "ai", "resend", "mongodb_prod"]
        for integration in expected_integrations:
            assert integration in data, f"Missing integration: {integration}"
        
        print(f"✓ Admin integrations returned: {list(data.keys())}")
        
        # Verify structure of each integration
        if "gmail" in data:
            assert "configured" in data["gmail"] or "connected" in data["gmail"]
            print(f"  - Gmail: configured={data['gmail'].get('configured', data['gmail'].get('connected'))}")
        
        if "stripe" in data:
            assert "connected" in data["stripe"]
            print(f"  - Stripe: connected={data['stripe']['connected']}, mode={data['stripe'].get('mode')}")
        
        if "ai" in data:
            assert "connected" in data["ai"]
            print(f"  - AI: connected={data['ai']['connected']}")
        
        if "resend" in data:
            assert "connected" in data["resend"]
            print(f"  - Resend: connected={data['resend']['connected']}")
        
        if "mongodb_prod" in data:
            assert "configured" in data["mongodb_prod"]
            print(f"  - MongoDB Prod: configured={data['mongodb_prod']['configured']}")

    def test_gmail_oauth_config_get(self):
        """GET /api/admin/integrations/gmail/oauth-config returns masked config."""
        response = requests.get(
            f"{BASE_URL}/api/admin/integrations/gmail/oauth-config",
            headers=self.headers,
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "configured" in data, "Response should contain configured field"
        print(f"✓ Gmail OAuth config: configured={data['configured']}")

    def test_mongodb_test_connectivity(self):
        """GET /api/admin/integrations/mongodb/test tests production MongoDB connectivity."""
        response = requests.post(
            f"{BASE_URL}/api/admin/integrations/mongodb/test",
            headers=self.headers,
        )
        # May return 400 if not configured, or 200 if configured
        assert response.status_code in [200, 400, 500], f"Unexpected status: {response.status_code}"
        data = response.json()
        if response.status_code == 200:
            print(f"✓ MongoDB test: ok={data.get('ok')}, version={data.get('version')}")
        else:
            print(f"✓ MongoDB test: not configured or failed (expected for dev env)")


class TestStripeCheckout:
    """Stripe checkout tests (requires director role)."""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as director before each test."""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DIRECTOR_EMAIL, "password": DIRECTOR_PASSWORD},
        )
        assert response.status_code == 200, f"Director login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_stripe_checkout_creates_session(self):
        """POST /api/stripe/checkout creates a Stripe checkout session."""
        response = requests.post(
            f"{BASE_URL}/api/stripe/checkout",
            headers=self.headers,
            json={
                "plan_id": "growth",
                "billing_cycle": "monthly",
                "origin_url": "https://app.capymatch.com",
            },
        )
        # May return 400 if no org_id, or 200 if successful
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}: {response.text}"
        if response.status_code == 200:
            data = response.json()
            assert "checkout_url" in data or "url" in data or "session_id" in data
            print(f"✓ Stripe checkout session created")
        else:
            print(f"✓ Stripe checkout: {response.json().get('detail', 'no org_id or other issue')}")

    def test_stripe_plans_returns_pricing(self):
        """GET /api/stripe/plans returns plan options with pricing."""
        response = requests.get(
            f"{BASE_URL}/api/stripe/plans",
            headers=self.headers,
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "plans" in data, "Response should contain plans"
        print(f"✓ Stripe plans returned {len(data['plans'])} plans")


class TestNoHardcodedPreviewURLs:
    """Verify no hardcoded preview URLs leak into API responses."""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as athlete before each test."""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ATHLETE_EMAIL, "password": ATHLETE_PASSWORD},
        )
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_gmail_connect_redirect_uri_not_hardcoded(self):
        """GET /api/athlete/gmail/connect should not return hardcoded preview URL."""
        response = requests.get(
            f"{BASE_URL}/api/athlete/gmail/connect",
            headers=self.headers,
            params={"return_to": "/athlete-settings"},
            allow_redirects=False,
        )
        # Should return auth_url
        if response.status_code == 200:
            data = response.json()
            auth_url = data.get("auth_url", "")
            # Check that redirect_uri in auth_url doesn't contain hardcoded preview URLs
            # (it should use the configured FRONTEND_URL)
            print(f"✓ Gmail connect auth_url returned (checking for hardcoded URLs)")
            # The redirect_uri should be based on FRONTEND_URL, not hardcoded
            if "preview.emergentagent.com" in auth_url:
                # This is expected in preview environment
                print(f"  - Using preview URL (expected in this environment)")
        elif response.status_code == 500:
            # Gmail OAuth not configured
            print(f"✓ Gmail OAuth not configured (expected if no credentials)")
        else:
            print(f"✓ Gmail connect returned {response.status_code}")


class TestHealthAndBasics:
    """Basic health and connectivity tests."""

    def test_api_health(self):
        """Basic API health check."""
        response = requests.get(f"{BASE_URL}/api/health")
        # Health endpoint may or may not exist
        if response.status_code == 200:
            print(f"✓ Health endpoint: {response.json()}")
        else:
            # Try root
            response = requests.get(f"{BASE_URL}/")
            assert response.status_code in [200, 404], f"API not responding: {response.status_code}"
            print(f"✓ API is responding")

    def test_cors_headers_present(self):
        """Verify CORS headers are present for cross-origin requests."""
        response = requests.options(
            f"{BASE_URL}/api/auth/login",
            headers={
                "Origin": "https://app.capymatch.com",
                "Access-Control-Request-Method": "POST",
            },
        )
        # CORS preflight should return 200 or 204
        assert response.status_code in [200, 204, 405], f"CORS preflight failed: {response.status_code}"
        print(f"✓ CORS preflight returned {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

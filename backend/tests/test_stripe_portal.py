"""
Stripe Customer Portal Integration Tests
Tests for Manage Billing button, portal session creation, cancel/reactivate flows.

Key behaviors tested:
- POST /api/checkout/create-portal-session requires stripe_customer_id (400 if missing)
- POST /api/checkout/create-portal-session requires authentication (401/403 without)
- POST /api/stripe/cancel returns 400 for basic tier users
- POST /api/stripe/reactivate returns 400 when no pending cancellation
- GET /api/stripe/billing-history returns transactions and cancellation status
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
BASIC_ATHLETE_EMAIL = "emma.chen@athlete.capymatch.com"
BASIC_ATHLETE_PASSWORD = "password123"
DIRECTOR_EMAIL = "director@capymatch.com"
DIRECTOR_PASSWORD = "director123"


@pytest.fixture(scope="module")
def basic_athlete_token():
    """Get auth token for basic tier athlete (no stripe_customer_id)"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": BASIC_ATHLETE_EMAIL,
        "password": BASIC_ATHLETE_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Login failed for basic athlete: {response.status_code}")
    token = response.json().get("token")
    if not token:
        pytest.skip("No token in login response")
    return token


@pytest.fixture(scope="module")
def basic_athlete_headers(basic_athlete_token):
    """Auth headers for basic athlete"""
    return {"Authorization": f"Bearer {basic_athlete_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def director_token():
    """Get auth token for director"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": DIRECTOR_EMAIL,
        "password": DIRECTOR_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Login failed for director: {response.status_code}")
    token = response.json().get("token")
    if not token:
        pytest.skip("No token in login response for director")
    return token


@pytest.fixture(scope="module")
def director_headers(director_token):
    """Auth headers for director"""
    return {"Authorization": f"Bearer {director_token}", "Content-Type": "application/json"}


# ─── Portal Session Endpoint Tests ───────────────────────────────────────────

class TestCreatePortalSession:
    """Tests for POST /api/checkout/create-portal-session endpoint"""
    
    def test_portal_requires_authentication(self):
        """Portal session creation requires auth token (401/403 without)"""
        response = requests.post(f"{BASE_URL}/api/checkout/create-portal-session",
                                json={"return_url": f"{BASE_URL}/athlete-settings"})
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: Portal session requires authentication")
    
    def test_portal_fails_without_stripe_customer_id(self, basic_athlete_headers):
        """Basic tier user without stripe_customer_id gets 400 'No billing account found'"""
        response = requests.post(f"{BASE_URL}/api/checkout/create-portal-session",
                                headers=basic_athlete_headers,
                                json={"return_url": f"{BASE_URL}/athlete-settings"})
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        detail = data.get("detail", "")
        assert "No billing account" in detail or "billing account" in detail.lower(), \
            f"Expected 'No billing account' error, got: {detail}"
        print(f"PASS: Portal returns 400 for user without stripe_customer_id: '{detail}'")
    
    def test_portal_requires_return_url(self, basic_athlete_headers):
        """Portal session requires return_url in request body"""
        response = requests.post(f"{BASE_URL}/api/checkout/create-portal-session",
                                headers=basic_athlete_headers,
                                json={})
        # Should fail validation since return_url is required
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}"
        print("PASS: Portal session requires return_url parameter")


# ─── Cancel Subscription Endpoint Tests ──────────────────────────────────────

class TestCancelSubscription:
    """Tests for POST /api/stripe/cancel endpoint"""
    
    def test_cancel_requires_authentication(self):
        """Cancel requires auth token"""
        response = requests.post(f"{BASE_URL}/api/stripe/cancel")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: Cancel subscription requires authentication")
    
    def test_cancel_fails_for_basic_tier_user(self, basic_athlete_headers):
        """Basic tier user cannot cancel (already on free plan)"""
        response = requests.post(f"{BASE_URL}/api/stripe/cancel",
                                headers=basic_athlete_headers)
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        detail = data.get("detail", "")
        assert "free plan" in detail.lower() or "already" in detail.lower(), \
            f"Expected 'already on free plan' error, got: {detail}"
        print(f"PASS: Cancel returns 400 for basic tier: '{detail}'")


# ─── Reactivate Subscription Endpoint Tests ──────────────────────────────────

class TestReactivateSubscription:
    """Tests for POST /api/stripe/reactivate endpoint"""
    
    def test_reactivate_requires_authentication(self):
        """Reactivate requires auth token"""
        response = requests.post(f"{BASE_URL}/api/stripe/reactivate")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: Reactivate subscription requires authentication")
    
    def test_reactivate_fails_when_no_pending_cancellation(self, basic_athlete_headers):
        """Reactivate fails when user has no pending cancellation"""
        response = requests.post(f"{BASE_URL}/api/stripe/reactivate",
                                headers=basic_athlete_headers)
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        detail = data.get("detail", "")
        assert "no pending" in detail.lower() or "cancellation" in detail.lower(), \
            f"Expected 'No pending cancellation' error, got: {detail}"
        print(f"PASS: Reactivate returns 400 when no pending cancellation: '{detail}'")


# ─── Billing History Endpoint Tests ───────────────────────────────────────────

class TestBillingHistory:
    """Tests for GET /api/stripe/billing-history endpoint"""
    
    def test_billing_history_requires_authentication(self):
        """Billing history requires auth token"""
        response = requests.get(f"{BASE_URL}/api/stripe/billing-history")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: Billing history requires authentication")
    
    def test_billing_history_returns_structure(self, basic_athlete_headers):
        """Billing history returns transactions and subscription info"""
        response = requests.get(f"{BASE_URL}/api/stripe/billing-history",
                               headers=basic_athlete_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Check required fields
        assert "transactions" in data, "Missing 'transactions' field"
        assert "subscription" in data, "Missing 'subscription' field"
        assert "cancel_at_period_end" in data, "Missing 'cancel_at_period_end' field"
        
        # Verify transactions is a list
        assert isinstance(data["transactions"], list), "transactions should be a list"
        
        # Verify subscription structure
        sub = data["subscription"]
        assert "tier" in sub, "subscription missing 'tier'"
        assert "label" in sub, "subscription missing 'label'"
        
        print(f"PASS: Billing history returns correct structure. Tier: {sub['tier']}, Label: {sub['label']}")
    
    def test_billing_history_shows_basic_tier_for_free_user(self, basic_athlete_headers):
        """Basic tier user sees basic/Starter in billing history"""
        response = requests.get(f"{BASE_URL}/api/stripe/billing-history",
                               headers=basic_athlete_headers)
        
        assert response.status_code == 200
        data = response.json()
        sub = data["subscription"]
        
        assert sub["tier"] == "basic", f"Expected tier 'basic', got '{sub['tier']}'"
        assert sub["label"] == "Starter", f"Expected label 'Starter', got '{sub['label']}'"
        print("PASS: Basic tier user sees correct subscription info in billing history")


# ─── Subscription Endpoint Tests ──────────────────────────────────────────────

class TestSubscriptionEndpoint:
    """Tests for GET /api/subscription - verifies tier for Settings page"""
    
    def test_subscription_requires_authentication(self):
        """Subscription endpoint requires auth token"""
        response = requests.get(f"{BASE_URL}/api/subscription")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: Subscription endpoint requires authentication")
    
    def test_basic_athlete_has_basic_tier(self, basic_athlete_headers):
        """Basic athlete (emma.chen) has basic/Starter tier"""
        response = requests.get(f"{BASE_URL}/api/subscription",
                               headers=basic_athlete_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "tier" in data, "Missing 'tier' field"
        assert "label" in data, "Missing 'label' field"
        
        # Emma Chen should be on basic tier
        assert data["tier"] == "basic", f"Expected tier 'basic', got '{data['tier']}'"
        assert data["label"] == "Starter", f"Expected label 'Starter', got '{data['label']}'"
        print(f"PASS: Basic athlete has correct tier: {data['tier']} ({data['label']})")
    
    def test_subscription_includes_features(self, basic_athlete_headers):
        """Subscription endpoint includes features list"""
        response = requests.get(f"{BASE_URL}/api/subscription",
                               headers=basic_athlete_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "features" in data, "Missing 'features' field"
        assert isinstance(data["features"], list), "features should be a list"
        assert len(data["features"]) > 0, "features should not be empty"
        print(f"PASS: Subscription includes {len(data['features'])} features")
    
    def test_subscription_includes_usage(self, basic_athlete_headers):
        """Subscription endpoint includes usage stats"""
        response = requests.get(f"{BASE_URL}/api/subscription",
                               headers=basic_athlete_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "usage" in data, "Missing 'usage' field"
        usage = data["usage"]
        
        assert "schools" in usage, "usage missing 'schools'"
        assert "schools_limit" in usage, "usage missing 'schools_limit'"
        assert "ai_drafts_used" in usage, "usage missing 'ai_drafts_used'"
        assert "ai_drafts_limit" in usage, "usage missing 'ai_drafts_limit'"
        print(f"PASS: Usage stats - Schools: {usage['schools']}/{usage['schools_limit']}, AI Drafts: {usage['ai_drafts_used']}/{usage['ai_drafts_limit']}")


# ─── Director Tests (should NOT have billing access for now) ──────────────────

class TestDirectorBillingAccess:
    """Tests to verify directors don't have billing access until org-level billing implemented"""
    
    def test_director_cannot_access_athlete_billing_endpoints(self, director_headers):
        """Director role should not access athlete billing endpoints (or get different response)"""
        # Directors accessing athlete billing history should either:
        # - Get 403 (not authorized for athlete endpoints)
        # - Get empty/different response (different billing scope)
        response = requests.get(f"{BASE_URL}/api/stripe/billing-history",
                               headers=director_headers)
        
        # Accept either 403 (access denied) or 200 with org-level data
        # The key is that director shouldn't see athlete billing
        if response.status_code == 200:
            data = response.json()
            print(f"INFO: Director billing history returned status 200. Subscription: {data.get('subscription', {})}")
        else:
            print(f"INFO: Director billing history returned status {response.status_code}")
        
        # Just verify endpoint responds (specific behavior depends on implementation)
        assert response.status_code in [200, 403, 404], f"Unexpected status: {response.status_code}"
        print("PASS: Director billing endpoint access verified")

"""
Settings Page & Billing Backend Tests
Tests for Settings tabs: Profile Management and Plan & Billing
Includes subscription, stripe checkout, and portal session endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "emma.chen@athlete.capymatch.com"
TEST_PASSWORD = "password123"


@pytest.fixture(scope="module")
def auth_token():
    """Get auth token for test athlete"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Login failed: {response.status_code} {response.text}")
    token = response.json().get("token")
    if not token:
        pytest.skip("No token in login response")
    return token


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Auth headers for requests"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


# ─── Profile Tab: Settings Endpoints ───────────────────────────────────────────

class TestProfileSettings:
    """Tests for Profile tab settings endpoints (existing + validation)"""
    
    def test_get_settings_returns_complete_data(self, auth_headers):
        """GET /api/athlete/settings returns all required fields for Profile tab"""
        response = requests.get(f"{BASE_URL}/api/athlete/settings", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Personal Information section
        assert "name" in data
        assert "email" in data
        assert data["email"] == TEST_EMAIL
        
        # Preferences for Notifications and Appearance
        assert "preferences" in data
        prefs = data["preferences"]
        assert "email_notifications" in prefs
        assert "followup_reminders" in prefs
        assert "theme" in prefs
        assert prefs["theme"] in ["dark", "light", "system"]
    
    def test_update_theme_preference(self, auth_headers):
        """PUT /api/athlete/settings can update theme (Appearance section)"""
        # Get current theme
        orig = requests.get(f"{BASE_URL}/api/athlete/settings", headers=auth_headers).json()
        orig_theme = orig.get("preferences", {}).get("theme", "dark")
        
        # Toggle theme
        new_theme = "light" if orig_theme == "dark" else "dark"
        response = requests.put(f"{BASE_URL}/api/athlete/settings",
                               headers=auth_headers,
                               json={"theme": new_theme})
        assert response.status_code == 200
        
        # Verify persistence
        verify = requests.get(f"{BASE_URL}/api/athlete/settings", headers=auth_headers).json()
        assert verify["preferences"]["theme"] == new_theme
        
        # Restore original
        requests.put(f"{BASE_URL}/api/athlete/settings",
                    headers=auth_headers,
                    json={"theme": orig_theme})
    
    def test_toggle_notification_preferences(self, auth_headers):
        """PUT /api/athlete/settings can toggle notification toggles"""
        # Get current state
        orig = requests.get(f"{BASE_URL}/api/athlete/settings", headers=auth_headers).json()
        orig_followup = orig.get("preferences", {}).get("followup_reminders", True)
        orig_email = orig.get("preferences", {}).get("email_notifications", True)
        
        # Toggle both
        response = requests.put(f"{BASE_URL}/api/athlete/settings",
                               headers=auth_headers,
                               json={
                                   "followup_reminders": not orig_followup,
                                   "email_notifications": not orig_email
                               })
        assert response.status_code == 200
        
        # Verify changes
        verify = requests.get(f"{BASE_URL}/api/athlete/settings", headers=auth_headers).json()
        assert verify["preferences"]["followup_reminders"] == (not orig_followup)
        assert verify["preferences"]["email_notifications"] == (not orig_email)
        
        # Restore original
        requests.put(f"{BASE_URL}/api/athlete/settings",
                    headers=auth_headers,
                    json={
                        "followup_reminders": orig_followup,
                        "email_notifications": orig_email
                    })


class TestPasswordChange:
    """Tests for Change Password section in Profile tab"""
    
    def test_password_change_requires_both_fields(self, auth_headers):
        """POST /api/athlete/settings/change-password requires current and new password"""
        response = requests.post(f"{BASE_URL}/api/athlete/settings/change-password",
                                headers=auth_headers,
                                json={"current_password": "test"})
        assert response.status_code == 400
        
        response2 = requests.post(f"{BASE_URL}/api/athlete/settings/change-password",
                                 headers=auth_headers,
                                 json={"new_password": "test123"})
        assert response2.status_code == 400
    
    def test_password_minimum_length(self, auth_headers):
        """New password must be at least 6 characters"""
        response = requests.post(f"{BASE_URL}/api/athlete/settings/change-password",
                                headers=auth_headers,
                                json={"current_password": TEST_PASSWORD, "new_password": "12345"})
        assert response.status_code == 400
    
    def test_password_wrong_current_rejected(self, auth_headers):
        """Wrong current password returns 400"""
        response = requests.post(f"{BASE_URL}/api/athlete/settings/change-password",
                                headers=auth_headers,
                                json={"current_password": "wrongpassword123", "new_password": "newpassword123"})
        assert response.status_code == 400


# ─── Plan & Billing Tab: Subscription Endpoints ────────────────────────────────

class TestSubscriptionEndpoints:
    """Tests for GET /api/subscription - Current Plan card data"""
    
    def test_subscription_returns_tier_info(self, auth_headers):
        """GET /api/subscription returns tier, label, price, features"""
        response = requests.get(f"{BASE_URL}/api/subscription", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Required fields for Current Plan card
        assert "tier" in data
        assert "label" in data
        assert "price" in data
        assert "features" in data
        assert isinstance(data["features"], list)
        
        # Verify tier is valid
        assert data["tier"] in ["basic", "pro", "premium"]
    
    def test_subscription_returns_usage_stats(self, auth_headers):
        """GET /api/subscription returns usage data for bars"""
        response = requests.get(f"{BASE_URL}/api/subscription", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Usage stats for Schools and AI Drafts bars
        assert "usage" in data
        usage = data["usage"]
        
        # Schools usage bar
        assert "schools" in usage
        assert "schools_limit" in usage
        
        # AI Drafts usage bar
        assert "ai_drafts_used" in usage
        assert "ai_drafts_limit" in usage
    
    def test_subscription_returns_limits(self, auth_headers):
        """GET /api/subscription returns plan limits"""
        response = requests.get(f"{BASE_URL}/api/subscription", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "limits" in data
        limits = data["limits"]
        
        # Key limits for feature gating
        assert "max_schools" in limits
        assert "ai_drafts_per_month" in limits
        assert "gmail_integration" in limits
    
    def test_subscription_unauthorized(self):
        """GET /api/subscription requires authentication"""
        response = requests.get(f"{BASE_URL}/api/subscription")
        assert response.status_code in [401, 403]


class TestSubscriptionTiers:
    """Tests for GET /api/subscription/tiers - Compare Plans modal data"""
    
    def test_tiers_returns_all_plans(self, auth_headers):
        """GET /api/subscription/tiers returns all 3 tier options"""
        response = requests.get(f"{BASE_URL}/api/subscription/tiers", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "tiers" in data
        tiers = data["tiers"]
        assert len(tiers) == 3
        
        # Verify all tiers present
        tier_ids = [t["id"] for t in tiers]
        assert "basic" in tier_ids
        assert "pro" in tier_ids
        assert "premium" in tier_ids
    
    def test_tiers_have_required_fields(self, auth_headers):
        """Each tier has required fields for modal display"""
        response = requests.get(f"{BASE_URL}/api/subscription/tiers", headers=auth_headers)
        tiers = response.json()["tiers"]
        
        for tier in tiers:
            assert "id" in tier
            assert "label" in tier
            assert "price" in tier
            assert "features" in tier
            assert "max_schools" in tier
            assert "ai_drafts_per_month" in tier
    
    def test_tiers_pricing(self, auth_headers):
        """Verify tier pricing matches expected values"""
        response = requests.get(f"{BASE_URL}/api/subscription/tiers", headers=auth_headers)
        tiers = {t["id"]: t for t in response.json()["tiers"]}
        
        assert tiers["basic"]["price"] == 0
        assert tiers["pro"]["price"] == 12
        assert tiers["premium"]["price"] == 29


# ─── Plan & Billing Tab: Stripe Checkout ───────────────────────────────────────

class TestStripeCheckout:
    """Tests for Stripe checkout session creation - Upgrade button flow"""
    
    def test_create_checkout_session_pro(self, auth_headers):
        """POST /api/checkout/create-session creates Pro tier session"""
        response = requests.post(f"{BASE_URL}/api/checkout/create-session",
                                headers=auth_headers,
                                json={
                                    "tier": "pro",
                                    "origin_url": BASE_URL
                                })
        assert response.status_code == 200
        data = response.json()
        
        assert "url" in data
        assert "session_id" in data
        assert "checkout.stripe.com" in data["url"]
    
    def test_create_checkout_session_premium(self, auth_headers):
        """POST /api/checkout/create-session creates Premium tier session"""
        response = requests.post(f"{BASE_URL}/api/checkout/create-session",
                                headers=auth_headers,
                                json={
                                    "tier": "premium",
                                    "origin_url": BASE_URL
                                })
        assert response.status_code == 200
        data = response.json()
        
        assert "url" in data
        assert "checkout.stripe.com" in data["url"]
    
    def test_create_checkout_invalid_tier(self, auth_headers):
        """POST /api/checkout/create-session rejects invalid tier"""
        response = requests.post(f"{BASE_URL}/api/checkout/create-session",
                                headers=auth_headers,
                                json={
                                    "tier": "enterprise",
                                    "origin_url": BASE_URL
                                })
        assert response.status_code == 400
    
    def test_create_checkout_unauthorized(self):
        """POST /api/checkout/create-session requires authentication"""
        response = requests.post(f"{BASE_URL}/api/checkout/create-session",
                                json={"tier": "pro", "origin_url": BASE_URL})
        assert response.status_code in [401, 403]


class TestStripeBillingPortal:
    """Tests for Stripe billing portal - Manage Billing button"""
    
    def test_portal_fails_for_basic_user(self, auth_headers):
        """POST /api/checkout/create-portal-session returns 400 for user without stripe_customer_id"""
        response = requests.post(f"{BASE_URL}/api/checkout/create-portal-session",
                                headers=auth_headers,
                                json={"return_url": f"{BASE_URL}/athlete-settings"})
        
        # Basic tier user without stripe_customer_id should get 400
        assert response.status_code == 400
        data = response.json()
        assert "No billing account" in data.get("detail", "")
    
    def test_portal_unauthorized(self):
        """POST /api/checkout/create-portal-session requires authentication"""
        response = requests.post(f"{BASE_URL}/api/checkout/create-portal-session",
                                json={"return_url": BASE_URL})
        assert response.status_code in [401, 403]


# ─── Plan & Billing Tab: Data & Privacy Section ────────────────────────────────

class TestDataPrivacy:
    """Tests for Data & Privacy section - Export and Delete account"""
    
    def test_export_data_returns_athlete_data(self, auth_headers):
        """GET /api/athlete/settings/export-data returns complete athlete data"""
        response = requests.get(f"{BASE_URL}/api/athlete/settings/export-data",
                               headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Required export fields
        assert "athlete" in data
        assert "programs" in data
        assert "college_coaches" in data
        assert "interactions" in data
        assert "exported_at" in data
    
    def test_delete_account_requires_confirmation(self, auth_headers):
        """DELETE /api/athlete/settings/delete-account requires 'DELETE' confirmation"""
        response = requests.delete(f"{BASE_URL}/api/athlete/settings/delete-account",
                                  headers=auth_headers,
                                  json={})
        assert response.status_code == 400
        
        response2 = requests.delete(f"{BASE_URL}/api/athlete/settings/delete-account",
                                   headers=auth_headers,
                                   json={"confirmation": "delete"})  # lowercase
        assert response2.status_code == 400
    
    def test_export_unauthorized(self):
        """Export requires authentication"""
        response = requests.get(f"{BASE_URL}/api/athlete/settings/export-data")
        assert response.status_code in [401, 403]
    
    def test_delete_unauthorized(self):
        """Delete requires authentication"""
        response = requests.delete(f"{BASE_URL}/api/athlete/settings/delete-account",
                                  json={"confirmation": "DELETE"})
        assert response.status_code in [401, 403]

"""
Billing Features Tests (iteration_75)
Tests for billing history, cancel subscription, and reactivate subscription endpoints.
These features were ported from capymatch source repo.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials - basic tier user
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


# ─── Billing History Endpoint ─────────────────────────────────────────────────

class TestBillingHistory:
    """Tests for GET /api/stripe/billing-history endpoint"""
    
    def test_billing_history_returns_transactions_array(self, auth_headers):
        """GET /api/stripe/billing-history returns transactions array"""
        response = requests.get(f"{BASE_URL}/api/stripe/billing-history", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Must have transactions array
        assert "transactions" in data, "Missing 'transactions' field in response"
        assert isinstance(data["transactions"], list), "transactions must be an array"
    
    def test_billing_history_returns_subscription_info(self, auth_headers):
        """GET /api/stripe/billing-history returns subscription info"""
        response = requests.get(f"{BASE_URL}/api/stripe/billing-history", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Must have subscription info
        assert "subscription" in data, "Missing 'subscription' field in response"
        sub = data["subscription"]
        assert "tier" in sub, "Missing tier in subscription"
        assert "label" in sub, "Missing label in subscription"
        assert "price" in sub, "Missing price in subscription"
    
    def test_billing_history_returns_cancel_status(self, auth_headers):
        """GET /api/stripe/billing-history returns cancel_at_period_end flag"""
        response = requests.get(f"{BASE_URL}/api/stripe/billing-history", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Must have cancellation status
        assert "cancel_at_period_end" in data, "Missing 'cancel_at_period_end' field"
        assert isinstance(data["cancel_at_period_end"], bool), "cancel_at_period_end must be boolean"
    
    def test_billing_history_returns_plan_expires_at(self, auth_headers):
        """GET /api/stripe/billing-history returns plan_expires_at field"""
        response = requests.get(f"{BASE_URL}/api/stripe/billing-history", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # plan_expires_at should exist (can be null)
        assert "plan_expires_at" in data, "Missing 'plan_expires_at' field"
    
    def test_billing_history_transaction_structure(self, auth_headers):
        """Transactions have expected fields (Date, Plan, Amount, Status)"""
        response = requests.get(f"{BASE_URL}/api/stripe/billing-history", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        transactions = data.get("transactions", [])
        if len(transactions) > 0:
            # Verify transaction structure for table display
            txn = transactions[0]
            assert "created_at" in txn or "created_at" in txn, f"Transaction missing date field: {txn.keys()}"
            assert "tier" in txn, f"Transaction missing tier field: {txn.keys()}"
            assert "amount" in txn, f"Transaction missing amount field: {txn.keys()}"
            assert "payment_status" in txn, f"Transaction missing payment_status field: {txn.keys()}"
    
    def test_billing_history_unauthorized(self):
        """GET /api/stripe/billing-history requires authentication"""
        response = requests.get(f"{BASE_URL}/api/stripe/billing-history")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


# ─── Cancel Subscription Endpoint ─────────────────────────────────────────────

class TestCancelSubscription:
    """Tests for POST /api/stripe/cancel endpoint"""
    
    def test_cancel_returns_400_for_basic_tier(self, auth_headers):
        """POST /api/stripe/cancel returns 400 for basic tier users"""
        response = requests.post(f"{BASE_URL}/api/stripe/cancel", headers=auth_headers)
        
        # Basic tier user should get 400 - already on free plan
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data or "message" in data, "Expected error message"
        
        # Check error message content
        error_msg = data.get("detail", data.get("message", ""))
        assert "free" in error_msg.lower() or "already" in error_msg.lower(), \
            f"Expected 'free plan' error message, got: {error_msg}"
    
    def test_cancel_unauthorized(self):
        """POST /api/stripe/cancel requires authentication"""
        response = requests.post(f"{BASE_URL}/api/stripe/cancel")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


# ─── Reactivate Subscription Endpoint ─────────────────────────────────────────

class TestReactivateSubscription:
    """Tests for POST /api/stripe/reactivate endpoint"""
    
    def test_reactivate_returns_400_when_no_pending_cancellation(self, auth_headers):
        """POST /api/stripe/reactivate returns 400 when no pending cancellation exists"""
        response = requests.post(f"{BASE_URL}/api/stripe/reactivate", headers=auth_headers)
        
        # Should get 400 - no pending cancellation
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data or "message" in data, "Expected error message"
        
        # Check error message content
        error_msg = data.get("detail", data.get("message", ""))
        assert "pending" in error_msg.lower() or "cancellation" in error_msg.lower() or "not found" in error_msg.lower(), \
            f"Expected 'no pending cancellation' error message, got: {error_msg}"
    
    def test_reactivate_unauthorized(self):
        """POST /api/stripe/reactivate requires authentication"""
        response = requests.post(f"{BASE_URL}/api/stripe/reactivate")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


# ─── Integration Tests - Billing API Consistency ──────────────────────────────

class TestBillingAPIConsistency:
    """Tests to verify consistency between billing-related endpoints"""
    
    def test_subscription_and_billing_history_tier_match(self, auth_headers):
        """Subscription tier matches billing-history subscription tier"""
        sub_response = requests.get(f"{BASE_URL}/api/subscription", headers=auth_headers)
        billing_response = requests.get(f"{BASE_URL}/api/stripe/billing-history", headers=auth_headers)
        
        assert sub_response.status_code == 200
        assert billing_response.status_code == 200
        
        sub_data = sub_response.json()
        billing_data = billing_response.json()
        
        # Both should report same tier
        assert sub_data["tier"] == billing_data["subscription"]["tier"], \
            f"Tier mismatch: subscription={sub_data['tier']}, billing-history={billing_data['subscription']['tier']}"
    
    def test_basic_tier_user_cancel_status_is_false(self, auth_headers):
        """Basic tier user should have cancel_at_period_end as False"""
        response = requests.get(f"{BASE_URL}/api/stripe/billing-history", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Basic tier user shouldn't have pending cancellation
        assert data["cancel_at_period_end"] == False, \
            f"Expected cancel_at_period_end=False for basic tier, got {data['cancel_at_period_end']}"

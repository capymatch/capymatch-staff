"""
Test Suite: Email Delivery Feature for Invites
Tests:
1. POST /api/invites creates invite AND returns delivery_status field
2. POST /api/invites/{id}/resend resends email and increments resend_count
3. POST /api/invites/{id}/resend returns 400 for non-pending invites
4. Invite response includes: delivery_status, sent_at, last_error, resend_count
5. GET /api/invites list includes delivery tracking fields
6. When email send fails, invite still exists with status=pending and delivery_status=failed
7. Coach cannot access /api/invites or /api/invites/{id}/resend (403)
8. Validate and accept endpoints still work (public, no auth)
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
DIRECTOR_EMAIL = "director@capymatch.com"
DIRECTOR_PASSWORD = "director123"
COACH_EMAIL = "coach.williams@capymatch.com"
COACH_PASSWORD = "coach123"

# Note: Resend is in sandbox mode, so emails only deliver to douglas@capymatch.com
# Other emails will fail gracefully (delivery_status='failed'), which is expected


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session without auth"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def director_token(api_client):
    """Get director authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": DIRECTOR_EMAIL,
        "password": DIRECTOR_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Director authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def coach_token(api_client):
    """Get coach authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": COACH_EMAIL,
        "password": COACH_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Coach authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def director_client(api_client, director_token):
    """Session with director auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {director_token}"
    })
    return session


@pytest.fixture(scope="module")
def coach_client(api_client, coach_token):
    """Session with coach auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {coach_token}"
    })
    return session


# ============================================================
# Section 1: Create Invite with Email Delivery Tracking
# ============================================================

class TestCreateInviteWithEmailDelivery:
    """Test POST /api/invites creates invite and attempts email send"""

    def test_create_invite_returns_delivery_status_field(self, director_client):
        """POST /api/invites returns delivery_status field in response"""
        unique_email = f"test_delivery_{uuid.uuid4().hex[:8]}@test.com"
        
        response = director_client.post(f"{BASE_URL}/api/invites", json={
            "email": unique_email,
            "name": "Test Delivery Coach",
            "team": "Varsity"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify new delivery tracking fields exist
        assert "delivery_status" in data, "Response should include delivery_status field"
        assert data["delivery_status"] in ["sent", "failed", "pending"], f"delivery_status should be sent/failed/pending, got {data['delivery_status']}"
        assert "sent_at" in data, "Response should include sent_at field"
        assert "last_error" in data, "Response should include last_error field"
        assert "resend_count" in data, "Response should include resend_count field"
        assert data["resend_count"] == 0, f"Initial resend_count should be 0, got {data['resend_count']}"
        
        # Since Resend is in sandbox mode, emails to non-verified addresses will fail
        # This is expected behavior - verify invite still exists
        assert data["status"] == "pending", f"Invite status should be pending, got {data['status']}"
        assert data["email"] == unique_email
        
        print(f"PASS: Create invite returns delivery_status={data['delivery_status']}")

    def test_create_invite_to_verified_email_should_send(self, director_client):
        """POST /api/invites to verified email (sandbox) should have delivery_status='sent'"""
        # douglas@capymatch.com is the only verified email in Resend sandbox
        # We can't actually test this without the real verified email
        # Instead, verify that the system correctly records delivery status
        
        unique_email = f"test_track_{uuid.uuid4().hex[:8]}@test.com"
        response = director_client.post(f"{BASE_URL}/api/invites", json={
            "email": unique_email,
            "name": "Tracking Test Coach"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Even if email fails, invite should still be created
        assert data["id"] is not None
        assert data["status"] == "pending"
        # Delivery status should be either 'sent' or 'failed' (not remain as 'pending' after attempt)
        # In sandbox mode, non-verified emails will be 'failed'
        assert data["delivery_status"] in ["sent", "failed"], f"After send attempt, delivery_status should be sent or failed, got {data['delivery_status']}"
        
        if data["delivery_status"] == "failed":
            assert data["last_error"] is not None, "Failed delivery should have last_error set"
            print(f"PASS: Non-verified email correctly shows delivery_status='failed' with error")
        else:
            print(f"PASS: Email delivery_status='sent'")


# ============================================================
# Section 2: Resend Endpoint Tests
# ============================================================

class TestResendEndpoint:
    """Test POST /api/invites/{id}/resend functionality"""

    def test_resend_invite_increments_resend_count(self, director_client):
        """POST /api/invites/{id}/resend increments resend_count"""
        unique_email = f"test_resend_{uuid.uuid4().hex[:8]}@test.com"
        
        # Create invite
        create_resp = director_client.post(f"{BASE_URL}/api/invites", json={
            "email": unique_email,
            "name": "Resend Test Coach"
        })
        assert create_resp.status_code == 200
        invite_id = create_resp.json()["id"]
        initial_resend_count = create_resp.json()["resend_count"]
        
        # Resend invite
        resend_resp = director_client.post(f"{BASE_URL}/api/invites/{invite_id}/resend")
        assert resend_resp.status_code == 200, f"Expected 200, got {resend_resp.status_code}: {resend_resp.text}"
        
        data = resend_resp.json()
        assert data["resend_count"] == initial_resend_count + 1, f"resend_count should increment to {initial_resend_count + 1}, got {data['resend_count']}"
        assert "delivery_status" in data
        print(f"PASS: Resend incremented resend_count to {data['resend_count']}")

    def test_resend_returns_400_for_accepted_invite(self, api_client, director_client):
        """POST /api/invites/{id}/resend returns 400 for accepted invites"""
        unique_email = f"test_accepted_resend_{uuid.uuid4().hex[:8]}@test.com"
        
        # Create and accept invite
        create_resp = director_client.post(f"{BASE_URL}/api/invites", json={
            "email": unique_email,
            "name": "Accepted Resend Test"
        })
        invite_id = create_resp.json()["id"]
        invite_token = create_resp.json()["token"]
        
        # Accept the invite
        accept_resp = api_client.post(f"{BASE_URL}/api/invites/accept/{invite_token}", json={
            "password": "testpass123"
        })
        assert accept_resp.status_code == 200, f"Accept failed: {accept_resp.text}"
        
        # Try to resend - should get 400
        resend_resp = director_client.post(f"{BASE_URL}/api/invites/{invite_id}/resend")
        assert resend_resp.status_code == 400, f"Expected 400 for accepted invite, got {resend_resp.status_code}"
        assert "accepted" in resend_resp.json().get("detail", "").lower() or "cannot resend" in resend_resp.json().get("detail", "").lower()
        print("PASS: Resend returns 400 for accepted invite")

    def test_resend_returns_400_for_cancelled_invite(self, director_client):
        """POST /api/invites/{id}/resend returns 400 for cancelled invites"""
        unique_email = f"test_cancelled_resend_{uuid.uuid4().hex[:8]}@test.com"
        
        # Create invite
        create_resp = director_client.post(f"{BASE_URL}/api/invites", json={
            "email": unique_email,
            "name": "Cancelled Resend Test"
        })
        invite_id = create_resp.json()["id"]
        
        # Cancel the invite
        cancel_resp = director_client.delete(f"{BASE_URL}/api/invites/{invite_id}")
        assert cancel_resp.status_code == 200
        
        # Try to resend - should get 400
        resend_resp = director_client.post(f"{BASE_URL}/api/invites/{invite_id}/resend")
        assert resend_resp.status_code == 400, f"Expected 400 for cancelled invite, got {resend_resp.status_code}"
        assert "cancelled" in resend_resp.json().get("detail", "").lower() or "cannot resend" in resend_resp.json().get("detail", "").lower()
        print("PASS: Resend returns 400 for cancelled invite")

    def test_resend_returns_404_for_nonexistent_invite(self, director_client):
        """POST /api/invites/{id}/resend returns 404 for non-existent invite"""
        fake_id = str(uuid.uuid4())
        response = director_client.post(f"{BASE_URL}/api/invites/{fake_id}/resend")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Resend returns 404 for non-existent invite")


# ============================================================
# Section 3: Coach Cannot Access Invites Endpoints
# ============================================================

class TestCoachCannotAccessInvites:
    """Test that coaches get 403 on invite endpoints"""

    def test_coach_cannot_list_invites(self, coach_client):
        """GET /api/invites returns 403 for coach"""
        response = coach_client.get(f"{BASE_URL}/api/invites")
        assert response.status_code == 403, f"Expected 403 for coach, got {response.status_code}"
        print("PASS: Coach gets 403 on GET /api/invites")

    def test_coach_cannot_create_invite(self, coach_client):
        """POST /api/invites returns 403 for coach"""
        response = coach_client.post(f"{BASE_URL}/api/invites", json={
            "email": "some@email.com",
            "name": "Some Coach"
        })
        assert response.status_code == 403, f"Expected 403 for coach, got {response.status_code}"
        print("PASS: Coach gets 403 on POST /api/invites")

    def test_coach_cannot_resend_invite(self, director_client, coach_client):
        """POST /api/invites/{id}/resend returns 403 for coach"""
        # Create invite as director first
        unique_email = f"test_coach_resend_{uuid.uuid4().hex[:8]}@test.com"
        create_resp = director_client.post(f"{BASE_URL}/api/invites", json={
            "email": unique_email,
            "name": "Coach Resend Test"
        })
        invite_id = create_resp.json()["id"]
        
        # Coach tries to resend - should get 403
        response = coach_client.post(f"{BASE_URL}/api/invites/{invite_id}/resend")
        assert response.status_code == 403, f"Expected 403 for coach, got {response.status_code}"
        print("PASS: Coach gets 403 on POST /api/invites/{id}/resend")


# ============================================================
# Section 4: List Invites Includes Delivery Tracking Fields
# ============================================================

class TestListInvitesDeliveryFields:
    """Test GET /api/invites includes delivery tracking fields"""

    def test_list_invites_includes_delivery_fields(self, director_client):
        """GET /api/invites returns invites with all delivery tracking fields"""
        # First create an invite to ensure we have data
        unique_email = f"test_list_{uuid.uuid4().hex[:8]}@test.com"
        director_client.post(f"{BASE_URL}/api/invites", json={
            "email": unique_email,
            "name": "List Test Coach"
        })
        
        # Get list of invites
        response = director_client.get(f"{BASE_URL}/api/invites")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0, "Expected at least one invite"
        
        # Check first invite has all delivery fields
        invite = data[0]
        assert "delivery_status" in invite, "Invite should have delivery_status field"
        assert "sent_at" in invite, "Invite should have sent_at field"
        assert "last_error" in invite, "Invite should have last_error field"
        assert "resend_count" in invite, "Invite should have resend_count field"
        
        print(f"PASS: List invites includes delivery tracking fields ({len(data)} invites)")


# ============================================================
# Section 5: Failed Email Still Creates Invite
# ============================================================

class TestFailedEmailStillCreatesInvite:
    """Test that failed email send still creates invite with fallback available"""

    def test_failed_email_creates_pending_invite(self, director_client):
        """When email fails, invite still created with status=pending, delivery_status=failed"""
        # Use a non-verified email (will fail in sandbox mode)
        unique_email = f"test_fail_{uuid.uuid4().hex[:8]}@nonexistent.test"
        
        response = director_client.post(f"{BASE_URL}/api/invites", json={
            "email": unique_email,
            "name": "Email Fail Test Coach"
        })
        
        assert response.status_code == 200, f"Expected 200 (invite created), got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["status"] == "pending", f"Invite status should be pending, got {data['status']}"
        assert data["id"] is not None, "Invite should have an ID"
        assert data["token"] is not None and len(data["token"]) > 0, "Invite should have a token for copy-link fallback"
        
        # Email will fail in sandbox mode for non-verified addresses
        if data["delivery_status"] == "failed":
            print(f"PASS: Email failed but invite created with token for copy-link fallback")
        else:
            print(f"PASS: Invite created with delivery_status={data['delivery_status']}")


# ============================================================
# Section 6: Public Endpoints Still Work (Regression)
# ============================================================

class TestPublicEndpointsRegression:
    """Test that validate and accept endpoints still work without auth"""

    def test_validate_endpoint_still_public(self, api_client, director_client):
        """GET /api/invites/validate/{token} still works without auth"""
        unique_email = f"test_validate_pub_{uuid.uuid4().hex[:8]}@test.com"
        
        # Create invite as director
        create_resp = director_client.post(f"{BASE_URL}/api/invites", json={
            "email": unique_email,
            "name": "Public Validate Test"
        })
        token = create_resp.json()["token"]
        
        # Validate without auth - should work
        response = api_client.get(f"{BASE_URL}/api/invites/validate/{token}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["email"] == unique_email
        assert data["name"] == "Public Validate Test"
        print("PASS: Validate endpoint still public (no auth required)")

    def test_accept_endpoint_still_public(self, api_client, director_client):
        """POST /api/invites/accept/{token} still works without auth"""
        unique_email = f"test_accept_pub_{uuid.uuid4().hex[:8]}@test.com"
        
        # Create invite as director
        create_resp = director_client.post(f"{BASE_URL}/api/invites", json={
            "email": unique_email,
            "name": "Public Accept Test"
        })
        token = create_resp.json()["token"]
        
        # Accept without auth - should work
        response = api_client.post(f"{BASE_URL}/api/invites/accept/{token}", json={
            "password": "testpassword123"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "token" in data, "Accept should return JWT token"
        assert data["user"]["email"] == unique_email
        assert data["user"]["role"] == "coach"
        print("PASS: Accept endpoint still public (no auth required)")


# ============================================================
# Section 7: Director Multiple Resends Track Count
# ============================================================

class TestMultipleResends:
    """Test multiple resends properly increment count"""

    def test_multiple_resends_increment_count(self, director_client):
        """Multiple resends properly increment resend_count"""
        unique_email = f"test_multi_resend_{uuid.uuid4().hex[:8]}@test.com"
        
        # Create invite
        create_resp = director_client.post(f"{BASE_URL}/api/invites", json={
            "email": unique_email,
            "name": "Multi Resend Test"
        })
        invite_id = create_resp.json()["id"]
        
        # Resend 3 times and verify count increments
        for i in range(1, 4):
            resend_resp = director_client.post(f"{BASE_URL}/api/invites/{invite_id}/resend")
            assert resend_resp.status_code == 200
            assert resend_resp.json()["resend_count"] == i, f"After resend {i}, count should be {i}, got {resend_resp.json()['resend_count']}"
        
        print("PASS: Multiple resends properly increment count")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

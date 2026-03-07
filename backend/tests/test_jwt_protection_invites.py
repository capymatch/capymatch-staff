"""
Test Suite: JWT Protection on All Routes + Invite System
Tests:
1. All API routes now require JWT auth (401 without token)
2. Role-based access (director-only routes return 403 for coach)
3. Invite system (create, list, cancel, validate, accept)
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
DIRECTOR_EMAIL = "director@capymatch.com"
DIRECTOR_PASSWORD = "director123"
COACH_EMAIL = "coach.williams@capymatch.com"
COACH_PASSWORD = "coach123"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
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
# Section 1: Routes require JWT auth (401 without token)
# ============================================================

class TestJWTProtection:
    """Test that all API routes return 401 without auth token"""

    def test_mission_control_requires_auth(self, api_client):
        """GET /api/mission-control returns 401 without auth"""
        response = api_client.get(f"{BASE_URL}/api/mission-control")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("PASS: /api/mission-control returns 401 without auth")

    def test_events_requires_auth(self, api_client):
        """GET /api/events returns 401 without auth"""
        response = api_client.get(f"{BASE_URL}/api/events")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("PASS: /api/events returns 401 without auth")

    def test_advocacy_recommendations_requires_auth(self, api_client):
        """GET /api/advocacy/recommendations returns 401 without auth"""
        response = api_client.get(f"{BASE_URL}/api/advocacy/recommendations")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("PASS: /api/advocacy/recommendations returns 401 without auth")

    def test_athletes_requires_auth(self, api_client):
        """GET /api/athletes returns 401 without auth"""
        response = api_client.get(f"{BASE_URL}/api/athletes")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("PASS: /api/athletes returns 401 without auth")

    def test_support_pods_requires_auth(self, api_client):
        """GET /api/support-pods/{id} returns 401 without auth"""
        response = api_client.get(f"{BASE_URL}/api/support-pods/athlete-1")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("PASS: /api/support-pods/{id} returns 401 without auth")

    def test_admin_status_requires_auth(self, api_client):
        """GET /api/admin/status returns 401 without auth"""
        response = api_client.get(f"{BASE_URL}/api/admin/status")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("PASS: /api/admin/status returns 401 without auth")

    def test_debug_interventions_requires_auth(self, api_client):
        """GET /api/debug/interventions returns 401 without auth"""
        response = api_client.get(f"{BASE_URL}/api/debug/interventions")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("PASS: /api/debug/interventions returns 401 without auth")


# ============================================================
# Section 2: Routes work with valid auth token
# ============================================================

class TestAuthenticatedAccess:
    """Test routes return 200 with valid auth token"""

    def test_mission_control_with_auth(self, director_client):
        """GET /api/mission-control returns 200 with auth"""
        response = director_client.get(f"{BASE_URL}/api/mission-control")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "priorityAlerts" in data
        print("PASS: /api/mission-control returns 200 with auth")

    def test_events_with_auth(self, director_client):
        """GET /api/events returns 200 with auth"""
        response = director_client.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: /api/events returns 200 with auth")

    def test_advocacy_recommendations_with_auth(self, director_client):
        """GET /api/advocacy/recommendations returns 200 with auth"""
        response = director_client.get(f"{BASE_URL}/api/advocacy/recommendations")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: /api/advocacy/recommendations returns 200 with auth")

    def test_athletes_with_auth(self, director_client):
        """GET /api/athletes returns 200 with auth"""
        response = director_client.get(f"{BASE_URL}/api/athletes")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print("PASS: /api/athletes returns 200 with auth")

    def test_coach_can_access_mission_control(self, coach_client):
        """Coach can access mission control"""
        response = coach_client.get(f"{BASE_URL}/api/mission-control")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: Coach can access /api/mission-control")


# ============================================================
# Section 3: Role-based access (director-only routes)
# ============================================================

class TestRoleBasedAccess:
    """Test director-only routes return 403 for coach"""

    def test_admin_status_director_only(self, director_client, coach_client):
        """GET /api/admin/status - director allowed, coach gets 403"""
        # Director should succeed
        response = director_client.get(f"{BASE_URL}/api/admin/status")
        assert response.status_code == 200, f"Director expected 200, got {response.status_code}"
        print("PASS: Director can access /api/admin/status")
        
        # Coach should get 403
        response = coach_client.get(f"{BASE_URL}/api/admin/status")
        assert response.status_code == 403, f"Coach expected 403, got {response.status_code}"
        print("PASS: Coach gets 403 on /api/admin/status")

    def test_debug_interventions_director_only(self, director_client, coach_client):
        """GET /api/debug/interventions - director allowed, coach gets 403"""
        # Director should succeed
        response = director_client.get(f"{BASE_URL}/api/debug/interventions")
        assert response.status_code == 200, f"Director expected 200, got {response.status_code}"
        print("PASS: Director can access /api/debug/interventions")
        
        # Coach should get 403
        response = coach_client.get(f"{BASE_URL}/api/debug/interventions")
        assert response.status_code == 403, f"Coach expected 403, got {response.status_code}"
        print("PASS: Coach gets 403 on /api/debug/interventions")


# ============================================================
# Section 4: Invite System - Director Only
# ============================================================

class TestInviteSystem:
    """Test the invite system functionality"""

    def test_create_invite_director_only(self, director_client, coach_client):
        """POST /api/invites - director can create, coach gets 403"""
        unique_email = f"testcoach_{uuid.uuid4().hex[:8]}@test.com"
        
        # Director can create invite
        response = director_client.post(f"{BASE_URL}/api/invites", json={
            "email": unique_email,
            "name": "Test Coach",
            "team": "Varsity"
        })
        assert response.status_code == 200, f"Director expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["email"] == unique_email
        assert data["status"] == "pending"
        assert "token" in data
        print(f"PASS: Director created invite for {unique_email}")
        
        # Coach cannot create invite
        response = coach_client.post(f"{BASE_URL}/api/invites", json={
            "email": f"another_{uuid.uuid4().hex[:8]}@test.com",
            "name": "Another Coach"
        })
        assert response.status_code == 403, f"Coach expected 403, got {response.status_code}"
        print("PASS: Coach gets 403 when creating invite")

    def test_list_invites_director_only(self, director_client, coach_client):
        """GET /api/invites - director can list, coach gets 403"""
        # Director can list
        response = director_client.get(f"{BASE_URL}/api/invites")
        assert response.status_code == 200, f"Director expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Director can list invites (found {len(data)} invites)")
        
        # Coach cannot list
        response = coach_client.get(f"{BASE_URL}/api/invites")
        assert response.status_code == 403, f"Coach expected 403, got {response.status_code}"
        print("PASS: Coach gets 403 when listing invites")

    def test_duplicate_email_invite_returns_400(self, director_client):
        """POST /api/invites with existing pending email returns 400"""
        unique_email = f"duptest_{uuid.uuid4().hex[:8]}@test.com"
        
        # First invite should succeed
        response = director_client.post(f"{BASE_URL}/api/invites", json={
            "email": unique_email,
            "name": "Dup Test Coach"
        })
        assert response.status_code == 200, f"First invite expected 200, got {response.status_code}"
        
        # Second invite with same email should fail with 400
        response = director_client.post(f"{BASE_URL}/api/invites", json={
            "email": unique_email,
            "name": "Dup Test Coach 2"
        })
        assert response.status_code == 400, f"Duplicate expected 400, got {response.status_code}"
        assert "pending invite already exists" in response.json().get("detail", "").lower() or "already exists" in response.json().get("detail", "").lower()
        print("PASS: Duplicate email invite returns 400")

    def test_cancel_invite_director_only(self, director_client, coach_client):
        """DELETE /api/invites/{id} - director can cancel, coach gets 403"""
        unique_email = f"canceltest_{uuid.uuid4().hex[:8]}@test.com"
        
        # Create an invite to cancel
        create_resp = director_client.post(f"{BASE_URL}/api/invites", json={
            "email": unique_email,
            "name": "Cancel Test Coach"
        })
        assert create_resp.status_code == 200
        invite_id = create_resp.json()["id"]
        
        # Coach cannot cancel
        response = coach_client.delete(f"{BASE_URL}/api/invites/{invite_id}")
        assert response.status_code == 403, f"Coach expected 403, got {response.status_code}"
        print("PASS: Coach gets 403 when cancelling invite")
        
        # Director can cancel
        response = director_client.delete(f"{BASE_URL}/api/invites/{invite_id}")
        assert response.status_code == 200, f"Director expected 200, got {response.status_code}"
        assert response.json()["status"] == "cancelled"
        print("PASS: Director can cancel invite")


# ============================================================
# Section 5: Invite Validation & Accept (Public Routes)
# ============================================================

class TestInvitePublicRoutes:
    """Test public invite routes (validate and accept)"""

    def test_validate_invite_is_public(self, api_client, director_client):
        """GET /api/invites/validate/{token} - works without auth"""
        unique_email = f"validatetest_{uuid.uuid4().hex[:8]}@test.com"
        
        # Create invite as director
        create_resp = director_client.post(f"{BASE_URL}/api/invites", json={
            "email": unique_email,
            "name": "Validate Test"
        })
        assert create_resp.status_code == 200
        invite_token = create_resp.json()["token"]
        
        # Validate without auth (public route)
        response = api_client.get(f"{BASE_URL}/api/invites/validate/{invite_token}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["email"] == unique_email
        assert data["name"] == "Validate Test"
        print("PASS: /api/invites/validate/{token} is public and works")

    def test_invalid_invite_token_returns_404(self, api_client):
        """GET /api/invites/validate/{invalid_token} returns 404"""
        response = api_client.get(f"{BASE_URL}/api/invites/validate/invalid_token_xyz123")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Invalid invite token returns 404")

    def test_accept_invite_creates_account(self, api_client, director_client):
        """POST /api/invites/accept/{token} - creates account and returns token"""
        unique_email = f"accepttest_{uuid.uuid4().hex[:8]}@test.com"
        
        # Create invite as director
        create_resp = director_client.post(f"{BASE_URL}/api/invites", json={
            "email": unique_email,
            "name": "Accept Test Coach"
        })
        assert create_resp.status_code == 200
        invite_token = create_resp.json()["token"]
        
        # Accept invite without auth (public route)
        response = api_client.post(f"{BASE_URL}/api/invites/accept/{invite_token}", json={
            "password": "testpassword123",
            "name": "Accepted Coach Name"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == unique_email
        assert data["user"]["role"] == "coach"
        print(f"PASS: Accept invite created account for {unique_email}")
        
        # Verify the new user can authenticate
        verify_session = requests.Session()
        verify_session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {data['token']}"
        })
        me_resp = verify_session.get(f"{BASE_URL}/api/auth/me")
        assert me_resp.status_code == 200, f"New user /me expected 200, got {me_resp.status_code}"
        assert me_resp.json()["email"] == unique_email
        print("PASS: New user token works for /api/auth/me")

    def test_accept_already_accepted_invite_returns_400(self, api_client, director_client):
        """POST /api/invites/accept/{token} on already accepted invite returns 400"""
        unique_email = f"doublaccept_{uuid.uuid4().hex[:8]}@test.com"
        
        # Create and accept invite
        create_resp = director_client.post(f"{BASE_URL}/api/invites", json={
            "email": unique_email,
            "name": "Double Accept Test"
        })
        invite_token = create_resp.json()["token"]
        
        # First accept
        api_client.post(f"{BASE_URL}/api/invites/accept/{invite_token}", json={
            "password": "testpass123"
        })
        
        # Second accept should fail
        response = api_client.post(f"{BASE_URL}/api/invites/accept/{invite_token}", json={
            "password": "testpass456"
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("PASS: Double-accept returns 400")


# ============================================================
# Section 6: Schools endpoint (protected)
# ============================================================

class TestSchoolsEndpoint:
    """Test schools endpoint protection"""

    def test_schools_requires_auth(self, api_client):
        """GET /api/schools returns 401 without auth"""
        response = api_client.get(f"{BASE_URL}/api/schools")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: /api/schools returns 401 without auth")

    def test_schools_with_auth(self, director_client):
        """GET /api/schools returns 200 with auth"""
        response = director_client.get(f"{BASE_URL}/api/schools")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: /api/schools returns 200 with auth")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

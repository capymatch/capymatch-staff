"""
Test Suite for JWT Authentication feature.
Tests cover login, register, /me endpoint, protected routes, and role-based access.
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# ─── Helper Functions ───────────────────────────────────────────────────────────

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

# ─── Auth Login Tests ───────────────────────────────────────────────────────────

class TestAuthLogin:
    """Tests for POST /api/auth/login endpoint"""
    
    def test_director_login_success(self, api_client):
        """Director account login returns token and user with role=director"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "director@capymatch.com",
            "password": "director123"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["email"] == "director@capymatch.com"
        assert data["user"]["name"] == "Director Adams"
        assert data["user"]["role"] == "director"
        assert isinstance(data["token"], str) and len(data["token"]) > 0
    
    def test_coach_williams_login_success(self, api_client):
        """Coach Williams account login returns token and user with role=coach"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "coach.williams@capymatch.com",
            "password": "coach123"
        })
        
        assert response.status_code == 200
        
        data = response.json()
        assert data["user"]["email"] == "coach.williams@capymatch.com"
        assert data["user"]["name"] == "Coach Williams"
        assert data["user"]["role"] == "coach"
        assert "token" in data
    
    def test_coach_garcia_login_success(self, api_client):
        """Coach Garcia account login returns token and user with role=coach"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "coach.garcia@capymatch.com",
            "password": "coach123"
        })
        
        assert response.status_code == 200
        
        data = response.json()
        assert data["user"]["email"] == "coach.garcia@capymatch.com"
        assert data["user"]["name"] == "Coach Garcia"
        assert data["user"]["role"] == "coach"
    
    def test_login_invalid_credentials_wrong_password(self, api_client):
        """Login with wrong password returns 401"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "director@capymatch.com",
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert "Invalid credentials" in data["detail"]
    
    def test_login_invalid_credentials_nonexistent_user(self, api_client):
        """Login with nonexistent email returns 401"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@capymatch.com",
            "password": "anypassword"
        })
        
        assert response.status_code == 401

# ─── Auth Register Tests ────────────────────────────────────────────────────────

class TestAuthRegister:
    """Tests for POST /api/auth/register endpoint"""
    
    def test_register_new_coach_success(self, api_client):
        """Registration creates new user and returns token"""
        unique_email = f"test_coach_{uuid.uuid4().hex[:8]}@capymatch.com"
        
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Test Coach",
            "role": "coach"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == unique_email
        assert data["user"]["name"] == "Test Coach"
        assert data["user"]["role"] == "coach"
        assert "id" in data["user"]
    
    def test_register_new_director_success(self, api_client):
        """Registration with director role creates director user"""
        unique_email = f"test_director_{uuid.uuid4().hex[:8]}@capymatch.com"
        
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Test Director",
            "role": "director"
        })
        
        assert response.status_code == 200
        
        data = response.json()
        assert data["user"]["role"] == "director"
    
    def test_register_duplicate_email_fails(self, api_client):
        """Registration with existing email returns 400"""
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": "director@capymatch.com",
            "password": "testpass123",
            "name": "Another Director",
            "role": "director"
        })
        
        assert response.status_code == 400
        data = response.json()
        assert "Email already registered" in data.get("detail", "")

# ─── Auth Me (Current User) Tests ───────────────────────────────────────────────

class TestAuthMe:
    """Tests for GET /api/auth/me endpoint"""
    
    def test_get_current_user_with_valid_token(self, api_client):
        """GET /api/auth/me with valid token returns current user"""
        # First login to get token
        login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "director@capymatch.com",
            "password": "director123"
        })
        token = login_response.json()["token"]
        
        # Call /me with token
        response = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        
        data = response.json()
        assert data["email"] == "director@capymatch.com"
        assert data["name"] == "Director Adams"
        assert data["role"] == "director"
    
    def test_get_current_user_without_token_fails(self, api_client):
        """GET /api/auth/me without token returns 401"""
        response = api_client.get(f"{BASE_URL}/api/auth/me")
        
        assert response.status_code == 401
        data = response.json()
        assert "Not authenticated" in data.get("detail", "")
    
    def test_get_current_user_with_invalid_token_fails(self, api_client):
        """GET /api/auth/me with invalid token returns 401"""
        response = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": "Bearer invalid_token_here"}
        )
        
        assert response.status_code == 401

# ─── Protected Route Tests ──────────────────────────────────────────────────────

class TestProtectedRoutes:
    """Tests for route protection and auth middleware"""
    
    def test_program_intelligence_requires_auth(self, api_client):
        """GET /api/program/intelligence without token returns 401"""
        response = api_client.get(f"{BASE_URL}/api/program/intelligence")
        
        assert response.status_code == 401
        data = response.json()
        assert "Not authenticated" in data.get("detail", "")
    
    def test_program_intelligence_with_valid_token(self, api_client):
        """GET /api/program/intelligence with valid token returns data"""
        # Login first
        login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "director@capymatch.com",
            "password": "director123"
        })
        token = login_response.json()["token"]
        
        # Call protected endpoint
        response = api_client.get(
            f"{BASE_URL}/api/program/intelligence",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "program_health" in data
        assert "view_mode" in data
    
    def test_program_coaches_requires_auth(self, api_client):
        """GET /api/program/coaches without token returns 401"""
        response = api_client.get(f"{BASE_URL}/api/program/coaches")
        
        assert response.status_code == 401
    
    def test_mission_control_does_not_require_auth(self, api_client):
        """GET /api/mission-control is not protected (returns 200 without auth)"""
        response = api_client.get(f"{BASE_URL}/api/mission-control")
        
        assert response.status_code == 200
        data = response.json()
        assert "priorityAlerts" in data

# ─── Role-Based Access Tests ────────────────────────────────────────────────────

class TestRoleBasedAccess:
    """Tests for role-based data filtering"""
    
    def test_director_sees_full_program_view(self, api_client):
        """Director gets view_mode=director with full data"""
        # Login as director
        login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "director@capymatch.com",
            "password": "director123"
        })
        token = login_response.json()["token"]
        
        # Get program intelligence
        response = api_client.get(
            f"{BASE_URL}/api/program/intelligence",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["view_mode"] == "director"
        assert data["athlete_count"] == 25  # Full program
    
    def test_coach_sees_filtered_view(self, api_client):
        """Coach gets view_mode=coach with filtered data"""
        # Login as coach
        login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "coach.williams@capymatch.com",
            "password": "coach123"
        })
        token = login_response.json()["token"]
        
        # Get program intelligence
        response = api_client.get(
            f"{BASE_URL}/api/program/intelligence",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["view_mode"] == "coach"
        assert data["coach_id"] == "Coach Williams"
        # Coach Williams has 0 assigned athletes in the current data
        # since athletes are assigned to Coach Martinez and Coach Rivera
    
    def test_director_can_view_coach_data(self, api_client):
        """Director can pass coach_id parameter to see coach's view"""
        # Login as director
        login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "director@capymatch.com",
            "password": "director123"
        })
        token = login_response.json()["token"]
        
        # Get program intelligence with coach filter
        response = api_client.get(
            f"{BASE_URL}/api/program/intelligence?coach_id=Coach%20Martinez",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["view_mode"] == "coach"
        assert data["coach_id"] == "Coach Martinez"

# ─── Token Validation Tests ─────────────────────────────────────────────────────

class TestTokenValidation:
    """Tests for JWT token behavior"""
    
    def test_new_registration_immediately_usable(self, api_client):
        """Token from registration can be used immediately"""
        unique_email = f"test_reg_{uuid.uuid4().hex[:8]}@capymatch.com"
        
        # Register
        reg_response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Test User",
            "role": "coach"
        })
        token = reg_response.json()["token"]
        
        # Use token immediately to access /me
        me_response = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert me_response.status_code == 200
        assert me_response.json()["email"] == unique_email

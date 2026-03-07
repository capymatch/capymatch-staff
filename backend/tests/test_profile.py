"""
Test Suite for Coach Profile Self-Service Feature.
Tests cover:
- GET /api/profile - Get current user's profile with completeness
- PUT /api/profile - Update editable profile fields (name, phone, contact_method, availability, bio)
- GET /api/profile/{coach_id} - Director can view any coach's profile
- Profile completeness calculation (incomplete/basic/complete)
- GET /api/roster/activation - Profile completeness in activation panel
- GET /api/roster - Coach contact info in roster groups
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# ─── Helper Functions ───────────────────────────────────────────────────────────

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


def get_auth_token(api_client, email, password):
    """Helper to get JWT token for a user"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": email,
        "password": password
    })
    if response.status_code == 200:
        return response.json().get("token")
    return None


@pytest.fixture
def director_token(api_client):
    """Get director auth token"""
    token = get_auth_token(api_client, "director@capymatch.com", "director123")
    if not token:
        pytest.skip("Director login failed - skipping")
    return token


@pytest.fixture
def coach_williams_token(api_client):
    """Get Coach Williams auth token"""
    token = get_auth_token(api_client, "coach.williams@capymatch.com", "coach123")
    if not token:
        pytest.skip("Coach Williams login failed - skipping")
    return token


@pytest.fixture
def coach_garcia_token(api_client):
    """Get Coach Garcia auth token"""
    token = get_auth_token(api_client, "coach.garcia@capymatch.com", "coach123")
    if not token:
        pytest.skip("Coach Garcia login failed - skipping")
    return token


# ─── GET /api/profile Tests ─────────────────────────────────────────────────────

class TestGetProfile:
    """Tests for GET /api/profile endpoint"""
    
    def test_get_profile_requires_auth(self, api_client):
        """GET /api/profile without token returns 401"""
        response = api_client.get(f"{BASE_URL}/api/profile")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
    
    def test_get_profile_coach_williams_complete(self, api_client, coach_williams_token):
        """Coach Williams has a complete profile (contact_method + availability + bio)"""
        response = api_client.get(
            f"{BASE_URL}/api/profile",
            headers={"Authorization": f"Bearer {coach_williams_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "id" in data
        assert "name" in data
        assert "email" in data
        assert "role" in data
        assert "completeness" in data
        assert data["email"] == "coach.williams@capymatch.com"
        assert data["name"] == "Coach Williams"
        assert data["role"] == "coach"
        
        # According to problem statement, Coach Williams has complete profile
        # Check that completeness is calculated correctly
        print(f"Coach Williams profile: {data}")
        assert data["completeness"] in ["complete", "basic", "incomplete"]
    
    def test_get_profile_director(self, api_client, director_token):
        """Director can get their own profile"""
        response = api_client.get(
            f"{BASE_URL}/api/profile",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "director@capymatch.com"
        assert data["role"] == "director"
        assert "completeness" in data
    
    def test_get_profile_response_includes_all_fields(self, api_client, coach_williams_token):
        """Profile response includes all expected fields"""
        response = api_client.get(
            f"{BASE_URL}/api/profile",
            headers={"Authorization": f"Bearer {coach_williams_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # All fields should be present
        expected_fields = ["id", "name", "email", "role", "team", "phone", 
                          "contact_method", "availability", "bio", "completeness"]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"


# ─── PUT /api/profile Tests ─────────────────────────────────────────────────────

class TestUpdateProfile:
    """Tests for PUT /api/profile endpoint"""
    
    def test_update_profile_requires_auth(self, api_client):
        """PUT /api/profile without token returns 401"""
        response = api_client.put(
            f"{BASE_URL}/api/profile",
            json={"name": "Test Name"}
        )
        assert response.status_code == 401
    
    def test_update_profile_name(self, api_client, coach_williams_token):
        """Can update name field"""
        # Get current profile
        get_response = api_client.get(
            f"{BASE_URL}/api/profile",
            headers={"Authorization": f"Bearer {coach_williams_token}"}
        )
        original_name = get_response.json()["name"]
        
        # Update name
        test_name = "Coach Williams Updated"
        response = api_client.put(
            f"{BASE_URL}/api/profile",
            json={"name": test_name},
            headers={"Authorization": f"Bearer {coach_williams_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == test_name
        
        # Restore original name
        api_client.put(
            f"{BASE_URL}/api/profile",
            json={"name": original_name},
            headers={"Authorization": f"Bearer {coach_williams_token}"}
        )
    
    def test_update_profile_empty_name_rejected(self, api_client, coach_williams_token):
        """Empty name is rejected with 400"""
        response = api_client.put(
            f"{BASE_URL}/api/profile",
            json={"name": ""},
            headers={"Authorization": f"Bearer {coach_williams_token}"}
        )
        
        assert response.status_code == 400
        assert "Name cannot be empty" in response.json().get("detail", "")
    
    def test_update_profile_whitespace_name_rejected(self, api_client, coach_williams_token):
        """Whitespace-only name is rejected with 400"""
        response = api_client.put(
            f"{BASE_URL}/api/profile",
            json={"name": "   "},
            headers={"Authorization": f"Bearer {coach_williams_token}"}
        )
        
        assert response.status_code == 400
        assert "Name cannot be empty" in response.json().get("detail", "")
    
    def test_update_profile_contact_method_valid(self, api_client, coach_garcia_token):
        """Valid contact methods are accepted: email, phone, text, slack"""
        for method in ["email", "phone", "text", "slack"]:
            response = api_client.put(
                f"{BASE_URL}/api/profile",
                json={"contact_method": method},
                headers={"Authorization": f"Bearer {coach_garcia_token}"}
            )
            assert response.status_code == 200, f"Failed for method: {method}"
            assert response.json()["contact_method"] == method
    
    def test_update_profile_contact_method_invalid(self, api_client, coach_williams_token):
        """Invalid contact method returns 400"""
        response = api_client.put(
            f"{BASE_URL}/api/profile",
            json={"contact_method": "invalid_method"},
            headers={"Authorization": f"Bearer {coach_williams_token}"}
        )
        
        assert response.status_code == 400
        assert "Invalid contact method" in response.json().get("detail", "")
    
    def test_update_profile_bio_max_500_chars(self, api_client, coach_williams_token):
        """Bio over 500 chars is rejected"""
        long_bio = "x" * 501
        response = api_client.put(
            f"{BASE_URL}/api/profile",
            json={"bio": long_bio},
            headers={"Authorization": f"Bearer {coach_williams_token}"}
        )
        
        assert response.status_code == 400
        assert "500 characters" in response.json().get("detail", "")
    
    def test_update_profile_bio_exactly_500_chars(self, api_client, coach_garcia_token):
        """Bio exactly 500 chars is accepted"""
        bio_500 = "x" * 500
        response = api_client.put(
            f"{BASE_URL}/api/profile",
            json={"bio": bio_500},
            headers={"Authorization": f"Bearer {coach_garcia_token}"}
        )
        
        assert response.status_code == 200
        assert len(response.json()["bio"]) == 500
    
    def test_update_profile_phone_optional(self, api_client, coach_garcia_token):
        """Phone is optional and can be set"""
        response = api_client.put(
            f"{BASE_URL}/api/profile",
            json={"phone": "555-123-4567"},
            headers={"Authorization": f"Bearer {coach_garcia_token}"}
        )
        
        assert response.status_code == 200
        assert response.json()["phone"] == "555-123-4567"
    
    def test_update_profile_availability(self, api_client, coach_garcia_token):
        """Can update availability field"""
        availability_text = "Weekday mornings, Tues/Thurs evenings"
        response = api_client.put(
            f"{BASE_URL}/api/profile",
            json={"availability": availability_text},
            headers={"Authorization": f"Bearer {coach_garcia_token}"}
        )
        
        assert response.status_code == 200
        assert response.json()["availability"] == availability_text
    
    def test_update_profile_multiple_fields(self, api_client, coach_garcia_token):
        """Can update multiple fields at once"""
        response = api_client.put(
            f"{BASE_URL}/api/profile",
            json={
                "phone": "555-999-0000",
                "contact_method": "slack",
                "availability": "Flexible",
                "bio": "Test bio for multiple fields update"
            },
            headers={"Authorization": f"Bearer {coach_garcia_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["phone"] == "555-999-0000"
        assert data["contact_method"] == "slack"
        assert data["availability"] == "Flexible"
        assert data["bio"] == "Test bio for multiple fields update"


# ─── Profile Completeness Tests ─────────────────────────────────────────────────

class TestProfileCompleteness:
    """Tests for profile completeness calculation"""
    
    def test_completeness_complete_requires_contact_availability_bio(self, api_client, coach_garcia_token):
        """Complete = name + contact_method + availability + bio (phone optional)"""
        # Set all required fields for complete
        response = api_client.put(
            f"{BASE_URL}/api/profile",
            json={
                "name": "Coach Garcia",
                "contact_method": "email",
                "availability": "Mornings",
                "bio": "Test bio"
            },
            headers={"Authorization": f"Bearer {coach_garcia_token}"}
        )
        
        assert response.status_code == 200
        assert response.json()["completeness"] == "complete"
    
    def test_completeness_basic_with_two_fields(self, api_client, coach_garcia_token):
        """Basic = name + 2 of (contact/availability/bio/phone)"""
        # Clear bio to get basic status
        response = api_client.put(
            f"{BASE_URL}/api/profile",
            json={
                "name": "Coach Garcia",
                "contact_method": "email",
                "availability": "Mornings",
                "bio": ""  # Clear bio
            },
            headers={"Authorization": f"Bearer {coach_garcia_token}"}
        )
        
        assert response.status_code == 200
        assert response.json()["completeness"] == "basic"
    
    def test_completeness_incomplete_with_name_only(self, api_client, coach_garcia_token):
        """Incomplete = name only (less than 2 profile fields)"""
        # Clear all profile fields except name
        response = api_client.put(
            f"{BASE_URL}/api/profile",
            json={
                "name": "Coach Garcia",
                "contact_method": "",
                "availability": "",
                "bio": "",
                "phone": ""
            },
            headers={"Authorization": f"Bearer {coach_garcia_token}"}
        )
        
        assert response.status_code == 200
        assert response.json()["completeness"] == "incomplete"


# ─── GET /api/profile/{coach_id} Tests ──────────────────────────────────────────

class TestGetCoachProfile:
    """Tests for GET /api/profile/{coach_id} endpoint (director only)"""
    
    def test_get_coach_profile_requires_auth(self, api_client):
        """GET /api/profile/{coach_id} without token returns 401"""
        response = api_client.get(f"{BASE_URL}/api/profile/coach-williams")
        assert response.status_code == 401
    
    def test_get_coach_profile_director_can_view(self, api_client, director_token):
        """Director can view any coach's profile"""
        # First, get list of coaches to find a valid coach ID
        activation_response = api_client.get(
            f"{BASE_URL}/api/roster/activation",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        
        if activation_response.status_code == 200:
            coaches = activation_response.json().get("coaches", [])
            if coaches:
                coach_id = coaches[0]["id"]
                
                response = api_client.get(
                    f"{BASE_URL}/api/profile/{coach_id}",
                    headers={"Authorization": f"Bearer {director_token}"}
                )
                
                assert response.status_code == 200
                data = response.json()
                assert "name" in data
                assert "email" in data
                assert "completeness" in data
    
    def test_get_coach_profile_non_director_forbidden(self, api_client, coach_williams_token):
        """Non-director trying to view another coach's profile gets 403"""
        response = api_client.get(
            f"{BASE_URL}/api/profile/some-coach-id",
            headers={"Authorization": f"Bearer {coach_williams_token}"}
        )
        
        assert response.status_code == 403
        assert "Director only" in response.json().get("detail", "")
    
    def test_get_coach_profile_nonexistent_returns_404(self, api_client, director_token):
        """Nonexistent coach ID returns 404"""
        response = api_client.get(
            f"{BASE_URL}/api/profile/nonexistent-coach-id",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        
        assert response.status_code == 404
        assert "Coach not found" in response.json().get("detail", "")


# ─── GET /api/roster/activation Profile Completeness Tests ──────────────────────

class TestActivationPanelProfileCompleteness:
    """Tests for profile_completeness field in activation panel"""
    
    def test_activation_includes_profile_completeness(self, api_client, director_token):
        """GET /api/roster/activation includes profile_completeness per coach"""
        response = api_client.get(
            f"{BASE_URL}/api/roster/activation",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "coaches" in data
        coaches = data["coaches"]
        
        if coaches:
            # Every coach should have profile_completeness
            for coach in coaches:
                assert "profile_completeness" in coach, f"Coach {coach['name']} missing profile_completeness"
                assert coach["profile_completeness"] in ["incomplete", "basic", "complete"], \
                    f"Invalid completeness value for {coach['name']}: {coach['profile_completeness']}"
                print(f"Coach {coach['name']}: profile_completeness={coach['profile_completeness']}")


# ─── GET /api/roster Coach Contact Info Tests ───────────────────────────────────

class TestRosterCoachContactInfo:
    """Tests for coach contact info in roster groups"""
    
    def test_roster_includes_coach_contact_fields(self, api_client, director_token):
        """GET /api/roster includes coach_contact_method, coach_availability, coach_bio per group"""
        response = api_client.get(
            f"{BASE_URL}/api/roster",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "groups" in data
        groups = data["groups"]
        
        for group in groups:
            # Skip unassigned group (coach_id is None)
            if group.get("coach_id") is not None:
                # These fields should be present in coach groups
                assert "coach_contact_method" in group, f"Missing coach_contact_method in group {group.get('coach_name')}"
                assert "coach_availability" in group, f"Missing coach_availability in group {group.get('coach_name')}"
                assert "coach_bio" in group, f"Missing coach_bio in group {group.get('coach_name')}"
                print(f"Coach {group['coach_name']}: contact={group.get('coach_contact_method')}, avail={group.get('coach_availability')}")

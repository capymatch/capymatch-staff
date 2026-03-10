"""
Test snake_case normalization for athlete fields.

This test suite verifies that all athlete-related API endpoints return
snake_case field names (not camelCase) after the database normalization.

Normalized fields (11 total):
- firstName → first_name
- lastName → last_name
- fullName → full_name
- gradYear → grad_year
- lastActivity → last_activity
- daysSinceActivity → days_since_activity
- momentumScore → momentum_score
- momentumTrend → momentum_trend
- recruitingStage → recruiting_stage
- schoolTargets → school_targets
- activeInterest → active_interest
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Credentials
ATHLETE_EMAIL = "emma.chen@athlete.capymatch.com"
ATHLETE_PASSWORD = "password123"
DIRECTOR_EMAIL = "director@capymatch.com"
DIRECTOR_PASSWORD = "director123"

# Fields that were normalized from camelCase to snake_case
NORMALIZED_FIELDS = [
    "first_name",
    "last_name", 
    "full_name",
    "grad_year",
    "last_activity",
    "days_since_activity",
    "momentum_score",
    "momentum_trend",
    "recruiting_stage",
    "school_targets",
    "active_interest",
]

# The camelCase versions that should NOT appear
CAMEL_CASE_FIELDS = [
    "firstName",
    "lastName",
    "fullName",
    "gradYear",
    "lastActivity",
    "daysSinceActivity",
    "momentumScore",
    "momentumTrend",
    "recruitingStage",
    "schoolTargets",
    "activeInterest",
]


@pytest.fixture(scope="module")
def athlete_token():
    """Get athlete authentication token."""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ATHLETE_EMAIL, "password": ATHLETE_PASSWORD},
        timeout=10
    )
    if response.status_code != 200:
        pytest.skip(f"Athlete login failed: {response.status_code}")
    return response.json().get("token")


@pytest.fixture(scope="module")
def director_token():
    """Get director authentication token."""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": DIRECTOR_EMAIL, "password": DIRECTOR_PASSWORD},
        timeout=10
    )
    if response.status_code != 200:
        pytest.skip(f"Director login failed: {response.status_code}")
    return response.json().get("token")


def check_no_camelcase_fields(data: dict, context: str = ""):
    """Assert that no camelCase fields exist in the response."""
    if isinstance(data, dict):
        for key in data.keys():
            assert key not in CAMEL_CASE_FIELDS, \
                f"Found camelCase field '{key}' in {context}. Should be snake_case."
            # Recursively check nested dicts
            if isinstance(data[key], dict):
                check_no_camelcase_fields(data[key], f"{context}.{key}")
            elif isinstance(data[key], list):
                for i, item in enumerate(data[key]):
                    if isinstance(item, dict):
                        check_no_camelcase_fields(item, f"{context}.{key}[{i}]")
    elif isinstance(data, list):
        for i, item in enumerate(data):
            if isinstance(item, dict):
                check_no_camelcase_fields(item, f"{context}[{i}]")


class TestAthleteEndpoints:
    """Test athlete-facing endpoints for snake_case fields."""

    def test_athlete_me_returns_snake_case(self, athlete_token):
        """GET /api/athlete/me returns snake_case fields."""
        response = requests.get(
            f"{BASE_URL}/api/athlete/me",
            headers={"Authorization": f"Bearer {athlete_token}"},
            timeout=10
        )
        assert response.status_code == 200, f"Got {response.status_code}: {response.text}"
        data = response.json()
        
        # Check response structure
        assert "athlete" in data, "Response should contain 'athlete' key"
        athlete = data["athlete"]
        
        # Verify snake_case fields exist
        assert "first_name" in athlete, "Should have first_name field"
        assert "last_name" in athlete, "Should have last_name field"
        assert "full_name" in athlete, "Should have full_name field"
        assert "grad_year" in athlete, "Should have grad_year field"
        assert "momentum_score" in athlete, "Should have momentum_score field"
        assert "momentum_trend" in athlete, "Should have momentum_trend field"
        assert "recruiting_stage" in athlete, "Should have recruiting_stage field"
        assert "school_targets" in athlete, "Should have school_targets field"
        assert "active_interest" in athlete, "Should have active_interest field"
        assert "last_activity" in athlete, "Should have last_activity field"
        
        # Ensure NO camelCase fields
        check_no_camelcase_fields(data, "/api/athlete/me")
        
    def test_athlete_dashboard_returns_snake_case(self, athlete_token):
        """GET /api/athlete/dashboard returns snake_case profile fields."""
        response = requests.get(
            f"{BASE_URL}/api/athlete/dashboard",
            headers={"Authorization": f"Bearer {athlete_token}"},
            timeout=10
        )
        assert response.status_code == 200, f"Got {response.status_code}: {response.text}"
        data = response.json()
        
        # Check profile fields
        assert "profile" in data, "Response should contain 'profile' key"
        profile = data["profile"]
        
        assert "first_name" in profile, "Profile should have first_name"
        assert "last_name" in profile, "Profile should have last_name"
        assert "full_name" in profile, "Profile should have full_name"
        assert "grad_year" in profile, "Profile should have grad_year"
        
        # Ensure NO camelCase in profile
        check_no_camelcase_fields(profile, "/api/athlete/dashboard.profile")

    def test_athlete_profile_returns_snake_case(self, athlete_token):
        """GET /api/athlete/profile returns snake_case fields."""
        response = requests.get(
            f"{BASE_URL}/api/athlete/profile",
            headers={"Authorization": f"Bearer {athlete_token}"},
            timeout=10
        )
        assert response.status_code == 200, f"Got {response.status_code}: {response.text}"
        data = response.json()
        
        # Ensure NO camelCase fields
        check_no_camelcase_fields(data, "/api/athlete/profile")


class TestMissionControlEndpoints:
    """Test mission control endpoints for snake_case athlete fields."""

    def test_mission_control_director_snake_case(self, director_token):
        """GET /api/mission-control returns snake_case athlete fields for director."""
        response = requests.get(
            f"{BASE_URL}/api/mission-control",
            headers={"Authorization": f"Bearer {director_token}"},
            timeout=10
        )
        assert response.status_code == 200, f"Got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("role") == "director", "Should return director role"
        
        # Check needsAttention items for snake_case
        if "needsAttention" in data and data["needsAttention"]:
            item = data["needsAttention"][0]
            # These fields come from athlete data
            assert "grad_year" in item, "Should have grad_year"
            assert "momentum_score" in item, "Should have momentum_score"
            assert "momentum_trend" in item, "Should have momentum_trend"
            assert "recruiting_stage" in item, "Should have recruiting_stage"
            assert "school_targets" in item, "Should have school_targets"
            
            # Ensure no camelCase
            check_no_camelcase_fields(item, "/api/mission-control.needsAttention[0]")


class TestDataIntegrity:
    """Test data values are properly populated after normalization."""

    def test_athlete_me_values_populated(self, athlete_token):
        """Verify athlete values are correctly populated (not empty/null)."""
        response = requests.get(
            f"{BASE_URL}/api/athlete/me",
            headers={"Authorization": f"Bearer {athlete_token}"},
            timeout=10
        )
        assert response.status_code == 200
        athlete = response.json().get("athlete", {})
        
        # Check Emma Chen's data is correct
        assert athlete.get("first_name") == "Emma", f"first_name should be Emma, got {athlete.get('first_name')}"
        assert athlete.get("last_name") == "Chen", f"last_name should be Chen, got {athlete.get('last_name')}"
        assert athlete.get("full_name") == "Emma Chen", f"full_name should be Emma Chen, got {athlete.get('full_name')}"
        assert athlete.get("grad_year") == 2026, f"grad_year should be 2026, got {athlete.get('grad_year')}"
        
        # momentum_score should be a number
        assert isinstance(athlete.get("momentum_score"), (int, float)), "momentum_score should be numeric"
        
        # momentum_trend should be one of the valid values
        valid_trends = ["rising", "stable", "declining"]
        assert athlete.get("momentum_trend") in valid_trends, \
            f"momentum_trend should be one of {valid_trends}, got {athlete.get('momentum_trend')}"
        
        # recruiting_stage should be valid
        valid_stages = ["exploring", "actively_recruiting", "narrowing", "committed"]
        assert athlete.get("recruiting_stage") in valid_stages, \
            f"recruiting_stage should be one of {valid_stages}, got {athlete.get('recruiting_stage')}"
        
        # school_targets should be a non-negative integer
        assert isinstance(athlete.get("school_targets"), int) and athlete.get("school_targets") >= 0, \
            "school_targets should be non-negative integer"
        
        # active_interest should be a non-negative integer
        assert isinstance(athlete.get("active_interest"), int) and athlete.get("active_interest") >= 0, \
            "active_interest should be non-negative integer"
        
        # last_activity should be a valid ISO timestamp
        last_activity = athlete.get("last_activity")
        assert last_activity and "T" in str(last_activity), \
            f"last_activity should be ISO timestamp, got {last_activity}"

    def test_dashboard_profile_values_populated(self, athlete_token):
        """Verify dashboard profile values are correctly populated."""
        response = requests.get(
            f"{BASE_URL}/api/athlete/dashboard",
            headers={"Authorization": f"Bearer {athlete_token}"},
            timeout=10
        )
        assert response.status_code == 200
        profile = response.json().get("profile", {})
        
        # Check profile has correct values
        assert profile.get("first_name") == "Emma", f"Expected Emma, got {profile.get('first_name')}"
        assert profile.get("last_name") == "Chen", f"Expected Chen, got {profile.get('last_name')}"
        assert profile.get("full_name") == "Emma Chen", f"Expected Emma Chen, got {profile.get('full_name')}"
        assert profile.get("grad_year") == 2026, f"Expected 2026, got {profile.get('grad_year')}"


class TestAuthenticationFlows:
    """Test authentication still works after migration."""

    def test_athlete_login(self):
        """Verify athlete can login."""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ATHLETE_EMAIL, "password": ATHLETE_PASSWORD},
            timeout=10
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Should return token"
        assert data.get("user", {}).get("role") == "athlete", "Should be athlete role"

    def test_director_login(self):
        """Verify director can login."""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DIRECTOR_EMAIL, "password": DIRECTOR_PASSWORD},
            timeout=10
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Should return token"
        assert data.get("user", {}).get("role") == "director", "Should be director role"

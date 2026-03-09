"""Tests for athlete onboarding quiz API endpoints.

Tests:
- GET /api/athlete/onboarding-status - Check onboarding completion
- POST /api/athlete/recruiting-profile - Save recruiting profile from quiz
- GET /api/athlete/suggested-schools - Get school matches based on profile
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SARAH_EMAIL = "sarah.martinez@athlete.capymatch.com"  # Athlete without recruiting_profile
SARAH_PASSWORD = "password123"

EMMA_EMAIL = "emma.chen@athlete.capymatch.com"  # Athlete with pipeline (may have profile)
EMMA_PASSWORD = "password123"

DIRECTOR_EMAIL = "director@capymatch.com"  # Director - should get 403
DIRECTOR_PASSWORD = "director123"


@pytest.fixture(scope="module")
def sarah_token():
    """Get token for Sarah Martinez (athlete without recruiting profile)."""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": SARAH_EMAIL,
        "password": SARAH_PASSWORD
    })
    assert response.status_code == 200, f"Sarah login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def emma_token():
    """Get token for Emma Chen (athlete with existing pipeline)."""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": EMMA_EMAIL,
        "password": EMMA_PASSWORD
    })
    assert response.status_code == 200, f"Emma login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def director_token():
    """Get token for director."""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": DIRECTOR_EMAIL,
        "password": DIRECTOR_PASSWORD
    })
    assert response.status_code == 200, f"Director login failed: {response.text}"
    return response.json()["token"]


class TestOnboardingStatus:
    """Tests for GET /api/athlete/onboarding-status"""
    
    def test_onboarding_status_returns_false_for_sarah(self, sarah_token):
        """Sarah (new athlete) should have completed=false, profile=null."""
        response = requests.get(
            f"{BASE_URL}/api/athlete/onboarding-status",
            headers={"Authorization": f"Bearer {sarah_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "completed" in data
        assert "profile" in data
        assert data["completed"] == False
        assert data["profile"] is None
    
    def test_onboarding_status_requires_auth(self):
        """Endpoint should reject unauthenticated requests."""
        response = requests.get(f"{BASE_URL}/api/athlete/onboarding-status")
        assert response.status_code in [401, 403, 422]
    
    def test_onboarding_status_forbidden_for_director(self, director_token):
        """Director role should not access athlete endpoints."""
        response = requests.get(
            f"{BASE_URL}/api/athlete/onboarding-status",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 403


class TestSaveRecruitingProfile:
    """Tests for POST /api/athlete/recruiting-profile"""
    
    def test_save_recruiting_profile_success(self, sarah_token):
        """Save full recruiting profile with all fields."""
        payload = {
            "position": ["Setter", "Libero"],
            "division": ["D1", "D2"],
            "priorities": ["Strong Academics", "Scholarship Availability", "Top Athletics Program"],
            "regions": ["Northeast", "Southeast", "Midwest"],
            "gpa": 3.8,
            "act_score": 30,
            "sat_score": 1350,
            "academic_interests": "Business / Finance"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/athlete/recruiting-profile",
            headers={"Authorization": f"Bearer {sarah_token}"},
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert data.get("ok") == True
        assert "recruiting_profile" in data
        
        profile = data["recruiting_profile"]
        assert profile["position"] == payload["position"]
        assert profile["division"] == payload["division"]
        assert profile["priorities"] == payload["priorities"]
        assert profile["regions"] == payload["regions"]
        assert profile["gpa"] == payload["gpa"]
        assert profile["act_score"] == payload["act_score"]
        assert profile["sat_score"] == payload["sat_score"]
        assert profile["academic_interests"] == payload["academic_interests"]
        assert "completed_at" in profile
    
    def test_onboarding_status_returns_true_after_save(self, sarah_token):
        """After saving profile, onboarding-status should return completed=true."""
        response = requests.get(
            f"{BASE_URL}/api/athlete/onboarding-status",
            headers={"Authorization": f"Bearer {sarah_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["completed"] == True
        assert data["profile"] is not None
        assert "position" in data["profile"]
        assert "division" in data["profile"]
    
    def test_save_recruiting_profile_requires_auth(self):
        """Endpoint should reject unauthenticated requests."""
        response = requests.post(
            f"{BASE_URL}/api/athlete/recruiting-profile",
            json={"position": ["Setter"]}
        )
        assert response.status_code in [401, 403, 422]
    
    def test_save_recruiting_profile_forbidden_for_director(self, director_token):
        """Director role should not access athlete endpoints."""
        response = requests.post(
            f"{BASE_URL}/api/athlete/recruiting-profile",
            headers={"Authorization": f"Bearer {director_token}"},
            json={"position": ["Setter"]}
        )
        assert response.status_code == 403


class TestSuggestedSchools:
    """Tests for GET /api/athlete/suggested-schools"""
    
    def test_suggested_schools_returns_matches(self, sarah_token):
        """After saving profile, suggested-schools should return matched schools."""
        response = requests.get(
            f"{BASE_URL}/api/athlete/suggested-schools?limit=5",
            headers={"Authorization": f"Bearer {sarah_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "suggestions" in data
        suggestions = data["suggestions"]
        
        # Should have some matches (Sarah has D1/D2 preference, Northeast/Southeast/Midwest regions)
        assert len(suggestions) > 0
        
        # Verify suggestion structure
        for school in suggestions:
            assert "domain" in school
            assert "university_name" in school
            assert "division" in school
            assert "match_score" in school
            assert "match_reasons" in school
            assert isinstance(school["match_score"], (int, float))
            assert 0 <= school["match_score"] <= 100
    
    def test_suggested_schools_respects_limit(self, sarah_token):
        """Limit parameter should cap number of results."""
        response = requests.get(
            f"{BASE_URL}/api/athlete/suggested-schools?limit=2",
            headers={"Authorization": f"Bearer {sarah_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["suggestions"]) <= 2
    
    def test_suggested_schools_ordered_by_score(self, sarah_token):
        """Results should be ordered by match_score descending."""
        response = requests.get(
            f"{BASE_URL}/api/athlete/suggested-schools?limit=5",
            headers={"Authorization": f"Bearer {sarah_token}"}
        )
        assert response.status_code == 200
        suggestions = response.json()["suggestions"]
        
        # Verify scores are in descending order
        for i in range(len(suggestions) - 1):
            assert suggestions[i]["match_score"] >= suggestions[i + 1]["match_score"]
    
    def test_suggested_schools_requires_auth(self):
        """Endpoint should reject unauthenticated requests."""
        response = requests.get(f"{BASE_URL}/api/athlete/suggested-schools")
        assert response.status_code in [401, 403, 422]
    
    def test_suggested_schools_forbidden_for_director(self, director_token):
        """Director role should not access athlete endpoints."""
        response = requests.get(
            f"{BASE_URL}/api/athlete/suggested-schools",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 403


class TestCleanup:
    """Cleanup Sarah's recruiting profile for future test runs."""
    
    def test_reset_sarah_recruiting_profile(self, sarah_token):
        """Reset Sarah's profile by unsetting recruiting_profile in DB.
        
        This is a placeholder - actual cleanup would need direct DB access.
        For now, we document that Sarah's profile was modified by tests.
        """
        # Note: Sarah's recruiting_profile was set by test_save_recruiting_profile_success
        # Future test runs should clear this via DB seed script
        pass

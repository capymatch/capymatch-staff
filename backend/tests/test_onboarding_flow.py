"""Tests for athlete onboarding flow including registration, quiz, and EmptyBoardState.

Tests cover:
- New athlete registration creates athlete record with onboarding_completed=false
- GET /api/athlete/onboarding-status returns completed=false for new athletes without recruiting profile
- GET /api/athlete/onboarding-status returns completed=true for athletes with recruiting profile
- POST /api/athlete/recruiting-profile saves quiz answers and sets onboarding_completed=true
- GET /api/athlete/suggested-schools returns matched schools based on recruiting profile
- GET /api/athlete/profile returns profile data for the athlete
- GET /api/athlete/gmail/status returns gmail connection status
- GET /api/athlete/programs returns programs for athlete (empty for fresh users)
"""

import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
EMMA_EMAIL = "emma.chen@athlete.capymatch.com"  # Athlete with programs (completed onboarding)
EMMA_PASSWORD = "password123"

DIRECTOR_EMAIL = "director@capymatch.com"
DIRECTOR_PASSWORD = "director123"


@pytest.fixture(scope="module")
def emma_token():
    """Get token for Emma Chen (existing athlete with programs)."""
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


@pytest.fixture(scope="function")
def fresh_athlete():
    """Create a fresh athlete via registration for testing new user flow."""
    timestamp = int(time.time() * 1000)
    email = f"test-onboard-{timestamp}@capymatch.com"
    response = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": email,
        "password": "test1234",
        "name": f"Test Athlete {timestamp}",
        "role": "athlete"
    })
    assert response.status_code == 200, f"Registration failed: {response.text}"
    data = response.json()
    return {
        "email": email,
        "token": data["token"],
        "user_id": data["user"]["id"],
        "claimed_athlete_id": data.get("claimed_athlete_id")
    }


class TestNewAthleteRegistration:
    """Test new athlete registration creates correct records."""

    def test_registration_creates_athlete_record(self, fresh_athlete):
        """New registration should create an athlete doc with claimed_athlete_id."""
        assert fresh_athlete["claimed_athlete_id"] is not None
        assert fresh_athlete["token"] is not None

    def test_fresh_athlete_onboarding_incomplete(self, fresh_athlete):
        """Fresh athlete should have onboarding_completed=false."""
        response = requests.get(
            f"{BASE_URL}/api/athlete/onboarding-status",
            headers={"Authorization": f"Bearer {fresh_athlete['token']}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["completed"] == False
        assert data["profile"] is None

    def test_fresh_athlete_has_empty_programs(self, fresh_athlete):
        """Fresh athlete should have no programs."""
        response = requests.get(
            f"{BASE_URL}/api/athlete/programs",
            headers={"Authorization": f"Bearer {fresh_athlete['token']}"}
        )
        assert response.status_code == 200
        programs = response.json()
        assert isinstance(programs, list)
        assert len(programs) == 0

    def test_fresh_athlete_gmail_not_connected(self, fresh_athlete):
        """Fresh athlete should have Gmail disconnected."""
        response = requests.get(
            f"{BASE_URL}/api/athlete/gmail/status",
            headers={"Authorization": f"Bearer {fresh_athlete['token']}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["connected"] == False


class TestOnboardingQuiz:
    """Test onboarding quiz save and suggested schools."""

    def test_save_recruiting_profile_success(self, fresh_athlete):
        """Save quiz answers successfully."""
        payload = {
            "position": ["Setter", "Outside Hitter"],
            "division": ["D1", "D2"],
            "priorities": ["Strong Academics", "Scholarship Availability", "Top Athletics Program"],
            "regions": ["Northeast", "Southeast", "Midwest"],
            "gpa": 3.7,
            "act_score": 28,
            "sat_score": 1300,
            "academic_interests": "Engineering / Tech"
        }

        response = requests.post(
            f"{BASE_URL}/api/athlete/recruiting-profile",
            headers={"Authorization": f"Bearer {fresh_athlete['token']}"},
            json=payload
        )
        assert response.status_code == 200
        data = response.json()

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

    def test_onboarding_complete_after_quiz(self, fresh_athlete):
        """After saving quiz, onboarding should be complete."""
        # First save the quiz
        requests.post(
            f"{BASE_URL}/api/athlete/recruiting-profile",
            headers={"Authorization": f"Bearer {fresh_athlete['token']}"},
            json={
                "position": ["Setter"],
                "division": ["D1"],
                "priorities": ["Strong Academics"],
                "regions": ["Midwest"],
                "gpa": 3.5
            }
        )

        # Then check status
        response = requests.get(
            f"{BASE_URL}/api/athlete/onboarding-status",
            headers={"Authorization": f"Bearer {fresh_athlete['token']}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["completed"] == True
        assert data["profile"] is not None
        assert "position" in data["profile"]

    def test_suggested_schools_returns_matches(self, fresh_athlete):
        """After quiz, suggested schools should return matches."""
        # First ensure quiz is saved
        requests.post(
            f"{BASE_URL}/api/athlete/recruiting-profile",
            headers={"Authorization": f"Bearer {fresh_athlete['token']}"},
            json={
                "position": ["Outside Hitter"],
                "division": ["D1", "D2"],
                "priorities": ["Strong Academics", "Scholarship Availability"],
                "regions": ["West Coast", "Midwest"],
                "gpa": 3.5
            }
        )

        response = requests.get(
            f"{BASE_URL}/api/athlete/suggested-schools?limit=5",
            headers={"Authorization": f"Bearer {fresh_athlete['token']}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "suggestions" in data
        suggestions = data["suggestions"]
        assert len(suggestions) > 0

        # Verify structure
        for school in suggestions:
            assert "domain" in school
            assert "university_name" in school
            assert "division" in school
            assert "match_score" in school
            assert "match_reasons" in school
            assert isinstance(school["match_score"], (int, float))
            assert 0 <= school["match_score"] <= 100

    def test_suggested_schools_ordered_by_score(self, fresh_athlete):
        """Suggested schools should be ordered by match_score descending."""
        # Ensure quiz is saved
        requests.post(
            f"{BASE_URL}/api/athlete/recruiting-profile",
            headers={"Authorization": f"Bearer {fresh_athlete['token']}"},
            json={
                "position": ["Setter"],
                "division": ["D1"],
                "priorities": ["Strong Academics"],
                "regions": ["Midwest"],
                "gpa": 3.5
            }
        )

        response = requests.get(
            f"{BASE_URL}/api/athlete/suggested-schools?limit=5",
            headers={"Authorization": f"Bearer {fresh_athlete['token']}"}
        )
        suggestions = response.json()["suggestions"]
        for i in range(len(suggestions) - 1):
            assert suggestions[i]["match_score"] >= suggestions[i + 1]["match_score"]


class TestAthleteProfile:
    """Test athlete profile API."""

    def test_get_profile_success(self, fresh_athlete):
        """Get profile should return athlete data."""
        response = requests.get(
            f"{BASE_URL}/api/athlete/profile",
            headers={"Authorization": f"Bearer {fresh_athlete['token']}"}
        )
        assert response.status_code == 200
        data = response.json()

        # Should have key profile fields
        assert "athlete_name" in data
        assert "position" in data
        assert "graduation_year" in data
        assert "height" in data
        assert "gpa" in data
        assert "tenant_id" in data


class TestExistingAthleteWithPrograms:
    """Test existing athlete with programs (Emma Chen)."""

    def test_emma_has_completed_onboarding(self, emma_token):
        """Emma should have onboarding completed."""
        response = requests.get(
            f"{BASE_URL}/api/athlete/onboarding-status",
            headers={"Authorization": f"Bearer {emma_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["completed"] == True
        assert data["profile"] is not None

    def test_emma_has_programs(self, emma_token):
        """Emma should have programs in her pipeline."""
        response = requests.get(
            f"{BASE_URL}/api/athlete/programs",
            headers={"Authorization": f"Bearer {emma_token}"}
        )
        assert response.status_code == 200
        programs = response.json()
        assert isinstance(programs, list)
        assert len(programs) > 0


class TestDirectorAccess:
    """Test director access to athlete endpoints."""

    def test_director_onboarding_status_returns_true(self, director_token):
        """Director should get completed=true (prevents onboarding redirect)."""
        response = requests.get(
            f"{BASE_URL}/api/athlete/onboarding-status",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # Non-athletes get completed=true to skip onboarding redirect
        assert data["completed"] == True

    def test_director_blocked_from_recruiting_profile(self, director_token):
        """Director should be blocked from saving recruiting profile."""
        response = requests.post(
            f"{BASE_URL}/api/athlete/recruiting-profile",
            headers={"Authorization": f"Bearer {director_token}"},
            json={"position": ["Setter"]}
        )
        assert response.status_code == 403

    def test_director_blocked_from_suggested_schools(self, director_token):
        """Director should be blocked from suggested schools."""
        response = requests.get(
            f"{BASE_URL}/api/athlete/suggested-schools",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 403


class TestAuthRequired:
    """Test authentication requirements."""

    def test_onboarding_status_requires_auth(self):
        """Onboarding status should require auth."""
        response = requests.get(f"{BASE_URL}/api/athlete/onboarding-status")
        assert response.status_code in [401, 403, 422]

    def test_recruiting_profile_requires_auth(self):
        """Recruiting profile save should require auth."""
        response = requests.post(
            f"{BASE_URL}/api/athlete/recruiting-profile",
            json={"position": ["Setter"]}
        )
        assert response.status_code in [401, 403, 422]

    def test_suggested_schools_requires_auth(self):
        """Suggested schools should require auth."""
        response = requests.get(f"{BASE_URL}/api/athlete/suggested-schools")
        assert response.status_code in [401, 403, 422]

    def test_profile_requires_auth(self):
        """Profile should require auth."""
        response = requests.get(f"{BASE_URL}/api/athlete/profile")
        assert response.status_code in [401, 403, 422]

    def test_gmail_status_requires_auth(self):
        """Gmail status should require auth."""
        response = requests.get(f"{BASE_URL}/api/athlete/gmail/status")
        assert response.status_code in [401, 403, 422]

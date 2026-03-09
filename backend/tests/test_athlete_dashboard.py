"""
Test suite for Phase 1 Step 1.6 - Athlete Placeholder Dashboard
Tests GET /api/athlete/me endpoint for different user types and claim states
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')


class TestAthleteDashboardBackend:
    """Backend tests for GET /api/athlete/me endpoint"""

    def test_health_check(self):
        """Basic health check to ensure API is running"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        print("PASS: Health check successful")

    def test_claimed_athlete_emma_chen_login(self):
        """Test login for claimed athlete emma.chen@athlete.capymatch.com"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "emma.chen@athlete.capymatch.com", "password": "password123"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "athlete"
        print(f"PASS: emma.chen login successful, role={data['user']['role']}")
        return data["token"]

    def test_claimed_athlete_get_me_returns_claimed_true(self):
        """Test GET /api/athlete/me for claimed athlete returns claimed=True with full data"""
        # Login first
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "emma.chen@athlete.capymatch.com", "password": "password123"}
        )
        assert login_response.status_code == 200
        token = login_response.json()["token"]

        # Call athlete/me endpoint
        response = requests.get(
            f"{BASE_URL}/api/athlete/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"athlete/me failed: {response.text}"
        
        data = response.json()
        # Verify claimed=True
        assert data["claimed"] == True, f"Expected claimed=True, got {data['claimed']}"
        
        # Verify athlete data is present
        athlete = data["athlete"]
        assert athlete is not None, "Expected athlete data to be present"
        assert "firstName" in athlete
        assert "lastName" in athlete
        assert "position" in athlete
        assert "team" in athlete
        assert "gradYear" in athlete
        assert "momentumScore" in athlete or athlete.get("momentumScore") is not None or athlete.get("momentumScore") == 0
        assert "recruitingStage" in athlete
        
        # Verify coach info
        coach = data.get("coach")
        if coach:
            assert "id" in coach
            assert "name" in coach
            assert "email" in coach
        
        print(f"PASS: Claimed athlete returns claimed=True, athlete={athlete.get('firstName')} {athlete.get('lastName')}, coach={coach}")

    def test_unclaimed_athlete_login_aria_brooks(self):
        """Test login for unclaimed athlete aria.brooks@example.com"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "aria.brooks@example.com", "password": "password123"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "athlete"
        print(f"PASS: aria.brooks login successful, role={data['user']['role']}")
        return data["token"]

    def test_unclaimed_athlete_get_me_returns_claimed_false(self):
        """Test GET /api/athlete/me for unclaimed athlete returns claimed=False"""
        # Login first
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "aria.brooks@example.com", "password": "password123"}
        )
        assert login_response.status_code == 200
        token = login_response.json()["token"]

        # Call athlete/me endpoint
        response = requests.get(
            f"{BASE_URL}/api/athlete/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"athlete/me failed: {response.text}"
        
        data = response.json()
        # Verify claimed=False
        assert data["claimed"] == False, f"Expected claimed=False, got {data['claimed']}"
        
        # Verify athlete is null
        assert data["athlete"] is None, f"Expected athlete=None, got {data['athlete']}"
        
        # Verify coach is null
        assert data["coach"] is None, f"Expected coach=None, got {data['coach']}"
        
        print(f"PASS: Unclaimed athlete returns claimed=False, athlete=None, coach=None")

    def test_director_gets_403_on_athlete_me(self):
        """Test GET /api/athlete/me for director returns 403"""
        # Login as director
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "director@capymatch.com", "password": "director123"}
        )
        assert login_response.status_code == 200, f"Director login failed: {login_response.text}"
        token = login_response.json()["token"]

        # Call athlete/me endpoint - should fail
        response = requests.get(
            f"{BASE_URL}/api/athlete/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 403, f"Expected 403 for director, got {response.status_code}"
        print(f"PASS: Director gets 403 on /athlete/me")

    def test_coach_gets_403_on_athlete_me(self):
        """Test GET /api/athlete/me for coach returns 403"""
        # Login as coach
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "coach.williams@capymatch.com", "password": "coach123"}
        )
        assert login_response.status_code == 200, f"Coach login failed: {login_response.text}"
        token = login_response.json()["token"]

        # Call athlete/me endpoint - should fail
        response = requests.get(
            f"{BASE_URL}/api/athlete/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 403, f"Expected 403 for coach, got {response.status_code}"
        print(f"PASS: Coach gets 403 on /athlete/me")

    def test_unauthenticated_gets_401_on_athlete_me(self):
        """Test GET /api/athlete/me without token returns 401"""
        response = requests.get(f"{BASE_URL}/api/athlete/me")
        assert response.status_code in [401, 403], f"Expected 401/403 for unauthenticated, got {response.status_code}"
        print(f"PASS: Unauthenticated gets {response.status_code} on /athlete/me")


class TestRoleBasedRoutingRegression:
    """Regression tests to ensure director and coach logins still work"""

    def test_director_login_still_works(self):
        """Regression: Director can still login and access auth/me"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "director@capymatch.com", "password": "director123"}
        )
        assert response.status_code == 200, f"Director login failed: {response.text}"
        data = response.json()
        assert data["user"]["role"] == "director"
        
        # Verify auth/me works
        token = data["token"]
        me_response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert me_response.status_code == 200
        print(f"PASS: Director login regression - role={data['user']['role']}")

    def test_coach_login_still_works(self):
        """Regression: Coach can still login and access auth/me"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "coach.williams@capymatch.com", "password": "coach123"}
        )
        assert response.status_code == 200, f"Coach login failed: {response.text}"
        data = response.json()
        assert data["user"]["role"] == "coach"
        
        # Verify auth/me works
        token = data["token"]
        me_response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert me_response.status_code == 200
        print(f"PASS: Coach login regression - role={data['user']['role']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

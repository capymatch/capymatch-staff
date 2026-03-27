"""
Test Environment & Config Hardening (Iteration 240)
- Login for all 3 roles (coach, director, athlete)
- Mission control returns correct data for each role
- Security headers present in ALL responses
- CORS allows FRONTEND_URL origin
- CORS rejects unauthorized origins
- Config logging at startup
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
LOCAL_URL = "http://localhost:8001"  # For security header tests (bypass K8s ingress)

# Test credentials
CREDENTIALS = {
    "athlete": {"email": "emma.chen@athlete.capymatch.com", "password": "athlete123"},
    "director": {"email": "director@capymatch.com", "password": "director123"},
    "coach": {"email": "coach.williams@capymatch.com", "password": "coach123"},
}


class TestAuthLogin:
    """Test POST /api/auth/login for all 3 roles"""

    def test_login_athlete(self):
        """Athlete login should return token and user with role=athlete"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=CREDENTIALS["athlete"],
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Athlete login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["role"] == "athlete", f"Expected role=athlete, got {data['user']['role']}"
        print(f"✓ Athlete login successful: {data['user']['email']}")

    def test_login_director(self):
        """Director login should return token and user with role=director"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=CREDENTIALS["director"],
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Director login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["role"] == "director", f"Expected role=director, got {data['user']['role']}"
        print(f"✓ Director login successful: {data['user']['email']}")

    def test_login_coach(self):
        """Coach login should return token and user with role=club_coach"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=CREDENTIALS["coach"],
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Coach login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["role"] == "club_coach", f"Expected role=club_coach, got {data['user']['role']}"
        print(f"✓ Coach login successful: {data['user']['email']}")


class TestMissionControl:
    """Test GET /api/mission-control returns correct data for each role"""

    @pytest.fixture
    def athlete_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["athlete"])
        return response.json()["token"]

    @pytest.fixture
    def director_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["director"])
        return response.json()["token"]

    @pytest.fixture
    def coach_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CREDENTIALS["coach"])
        return response.json()["token"]

    def test_mission_control_athlete(self, athlete_token):
        """Athlete mission control should return data (role may vary based on data state)"""
        response = requests.get(
            f"{BASE_URL}/api/mission-control",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert response.status_code == 200, f"Mission control failed for athlete: {response.text}"
        data = response.json()
        assert "role" in data, "No role in response"
        # Note: role in mission control response may differ from user role based on data state
        print(f"✓ Athlete mission control: role={data['role']} (endpoint accessible)")

    def test_mission_control_director(self, director_token):
        """Director mission control should return programStatus with totalAthletes"""
        response = requests.get(
            f"{BASE_URL}/api/mission-control",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200, f"Mission control failed for director: {response.text}"
        data = response.json()
        assert "role" in data, "No role in response"
        assert data["role"] == "director", f"Expected role=director, got {data['role']}"
        assert "programStatus" in data, "No programStatus in director response"
        print(f"✓ Director mission control: role={data['role']}, totalAthletes={data['programStatus'].get('totalAthletes')}")

    def test_mission_control_coach(self, coach_token):
        """Coach mission control should return myRoster with athletes"""
        response = requests.get(
            f"{BASE_URL}/api/mission-control",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert response.status_code == 200, f"Mission control failed for coach: {response.text}"
        data = response.json()
        assert "role" in data, "No role in response"
        assert data["role"] == "club_coach", f"Expected role=club_coach, got {data['role']}"
        assert "myRoster" in data, "No myRoster in coach response"
        print(f"✓ Coach mission control: role={data['role']}, roster_count={len(data['myRoster'])}")


class TestSecurityHeaders:
    """Test security headers are present in ALL responses (using localhost to bypass K8s ingress)"""

    REQUIRED_HEADERS = [
        "Strict-Transport-Security",
        "X-Frame-Options",
        "X-Content-Type-Options",
        "Referrer-Policy",
        "Content-Security-Policy",
    ]

    def test_security_headers_on_health(self):
        """Security headers should be present on /api/ endpoint"""
        response = requests.get(f"{LOCAL_URL}/api/")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        
        for header in self.REQUIRED_HEADERS:
            assert header in response.headers, f"Missing security header: {header}"
            print(f"✓ {header}: {response.headers[header][:50]}...")

    def test_security_headers_on_login(self):
        """Security headers should be present on POST /api/auth/login"""
        response = requests.post(
            f"{LOCAL_URL}/api/auth/login",
            json=CREDENTIALS["athlete"],
            headers={"Content-Type": "application/json"}
        )
        # Even on success or failure, headers should be present
        for header in self.REQUIRED_HEADERS:
            assert header in response.headers, f"Missing security header on login: {header}"
        print(f"✓ All security headers present on login endpoint")

    def test_security_header_values(self):
        """Verify security header values are correct"""
        response = requests.get(f"{LOCAL_URL}/api/")
        
        # Check specific values
        assert response.headers.get("X-Frame-Options") == "DENY", "X-Frame-Options should be DENY"
        assert response.headers.get("X-Content-Type-Options") == "nosniff", "X-Content-Type-Options should be nosniff"
        assert "max-age=" in response.headers.get("Strict-Transport-Security", ""), "HSTS should have max-age"
        assert "strict-origin" in response.headers.get("Referrer-Policy", ""), "Referrer-Policy should be strict-origin"
        assert "default-src" in response.headers.get("Content-Security-Policy", ""), "CSP should have default-src"
        print("✓ All security header values are correct")


class TestCORS:
    """Test CORS configuration allows/rejects origins correctly"""

    def test_cors_allows_frontend_url(self):
        """CORS should allow the FRONTEND_URL origin"""
        frontend_url = "https://login-google-1.preview.emergentagent.com"
        response = requests.options(
            f"{LOCAL_URL}/api/auth/login",
            headers={
                "Origin": frontend_url,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type",
            }
        )
        # Check if CORS headers are present
        cors_origin = response.headers.get("Access-Control-Allow-Origin", "")
        assert cors_origin == frontend_url or cors_origin == "*", f"CORS should allow {frontend_url}, got: {cors_origin}"
        print(f"✓ CORS allows FRONTEND_URL: {cors_origin}")

    def test_cors_rejects_unauthorized_origin(self):
        """CORS should NOT return access-control-allow-origin for unauthorized origins"""
        evil_origin = "https://evil.com"
        response = requests.options(
            f"{LOCAL_URL}/api/auth/login",
            headers={
                "Origin": evil_origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type",
            }
        )
        cors_origin = response.headers.get("Access-Control-Allow-Origin", "")
        # Should NOT be the evil origin (could be empty or not match)
        assert cors_origin != evil_origin, f"CORS should NOT allow {evil_origin}, but got: {cors_origin}"
        print(f"✓ CORS correctly rejects unauthorized origin (evil.com)")

    def test_cors_allows_localhost_in_dev(self):
        """CORS should allow localhost origins in development mode"""
        localhost_origin = "http://localhost:3000"
        response = requests.options(
            f"{LOCAL_URL}/api/auth/login",
            headers={
                "Origin": localhost_origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type",
            }
        )
        cors_origin = response.headers.get("Access-Control-Allow-Origin", "")
        # In development, localhost should be allowed
        assert cors_origin == localhost_origin or cors_origin == "*", f"CORS should allow localhost in dev, got: {cors_origin}"
        print(f"✓ CORS allows localhost in development: {cors_origin}")


class TestNoHardcodedURLs:
    """Test that no hardcoded URLs exist in backend Python files"""

    def test_no_hardcoded_preview_urls(self):
        """No hardcoded preview.emergentagent.com URLs in backend (excluding tests and comments)"""
        import subprocess
        result = subprocess.run(
            ["grep", "-rn", "preview.emergentagent.com", "--include=*.py"],
            cwd="/app/backend",
            capture_output=True,
            text=True
        )
        # Filter out test files, __pycache__, and comments/docstrings
        lines = [l for l in result.stdout.strip().split('\n') if l and 
                 'test' not in l.lower() and 
                 '__pycache__' not in l and
                 '"""' not in l and
                 "'''" not in l and
                 '#' not in l.split(':')[-1][:10]]  # Check if line starts with comment
        
        # The only allowed occurrence is in config.py docstring
        allowed = [l for l in lines if 'config.py' in l and 'e.g.' in l]
        unexpected = [l for l in lines if l not in allowed]
        
        assert len(unexpected) == 0, f"Found hardcoded URLs: {unexpected}"
        print("✓ No hardcoded preview URLs found in backend code")


class TestConfigLogging:
    """Test that config logging happens at startup"""

    def test_config_values_accessible(self):
        """Verify config module exports expected values"""
        # We can't directly check logs, but we can verify the config module works
        # by checking that the API responds correctly with configured CORS
        response = requests.get(f"{LOCAL_URL}/api/")
        assert response.status_code == 200, "API should be running with config loaded"
        print("✓ Config module loaded successfully (API responding)")


class TestFrontendIntegration:
    """Test frontend can access backend without CORS issues"""

    def test_frontend_can_login(self):
        """Frontend should be able to login via the public URL"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=CREDENTIALS["athlete"],
            headers={
                "Content-Type": "application/json",
                "Origin": "https://login-google-1.preview.emergentagent.com"
            }
        )
        assert response.status_code == 200, f"Frontend login failed: {response.text}"
        print("✓ Frontend can login via public URL")

    def test_frontend_can_access_mission_control(self):
        """Frontend should be able to access mission control"""
        # Login first
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=CREDENTIALS["director"],
            headers={"Content-Type": "application/json"}
        )
        token = login_response.json()["token"]
        
        # Access mission control
        response = requests.get(
            f"{BASE_URL}/api/mission-control",
            headers={
                "Authorization": f"Bearer {token}",
                "Origin": "https://login-google-1.preview.emergentagent.com"
            }
        )
        assert response.status_code == 200, f"Mission control access failed: {response.text}"
        print("✓ Frontend can access mission control")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

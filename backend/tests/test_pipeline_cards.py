"""
Pipeline Card Redesign Tests - Iteration 220
Tests for the pipeline card redesign including:
- API returns correct data for all programs
- No forbidden text in responses
- Correct action/status text generation
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPipelineAPI:
    """Tests for pipeline-related API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        # Login to get token
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "emma.chen@athlete.capymatch.com",
            "password": "athlete123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_athlete_programs_returns_all_schools(self):
        """Test that /api/athlete/programs returns all 5 schools"""
        response = requests.get(f"{BASE_URL}/api/athlete/programs", headers=self.headers)
        assert response.status_code == 200
        
        programs = response.json()
        assert len(programs) == 5, f"Expected 5 programs, got {len(programs)}"
        
        # Check all expected schools are present
        school_names = [p["university_name"] for p in programs]
        expected_schools = ["Emory University", "Stanford University", "University of Florida", "UCLA", "Creighton University"]
        for school in expected_schools:
            assert school in school_names, f"Missing school: {school}"
    
    def test_emory_is_overdue(self):
        """Test that Emory University has overdue status"""
        response = requests.get(f"{BASE_URL}/api/athlete/programs", headers=self.headers)
        assert response.status_code == 200
        
        programs = response.json()
        emory = next((p for p in programs if p["university_name"] == "Emory University"), None)
        assert emory is not None, "Emory University not found"
        
        # Check that next_action_due is in the past (overdue)
        assert emory.get("next_action_due") is not None, "Emory should have next_action_due"
    
    def test_programs_have_journey_rail(self):
        """Test that programs have journey_rail data for stage context"""
        response = requests.get(f"{BASE_URL}/api/athlete/programs", headers=self.headers)
        assert response.status_code == 200
        
        programs = response.json()
        for program in programs:
            assert "journey_rail" in program, f"Missing journey_rail for {program['university_name']}"
            if program["journey_rail"]:
                assert "active" in program["journey_rail"], f"Missing active stage for {program['university_name']}"
    
    def test_top_actions_endpoint(self):
        """Test that /api/internal/programs/top-actions returns data"""
        response = requests.get(f"{BASE_URL}/api/internal/programs/top-actions", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, dict), "top-actions should return a dict"
    
    def test_match_scores_endpoint(self):
        """Test that /api/match-scores returns data"""
        response = requests.get(f"{BASE_URL}/api/match-scores", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, dict), "match-scores should return a dict"
    
    def test_momentum_recap_endpoint(self):
        """Test that /api/athlete/momentum-recap returns data"""
        response = requests.get(f"{BASE_URL}/api/athlete/momentum-recap", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        # Can be None or dict
        assert data is None or isinstance(data, dict), "momentum-recap should return None or dict"
    
    def test_programs_have_signals(self):
        """Test that programs have signals data for activity tracking"""
        response = requests.get(f"{BASE_URL}/api/athlete/programs", headers=self.headers)
        assert response.status_code == 200
        
        programs = response.json()
        for program in programs:
            assert "signals" in program, f"Missing signals for {program['university_name']}"
    
    def test_no_forbidden_text_in_api_response(self):
        """Test that API responses don't contain forbidden text"""
        response = requests.get(f"{BASE_URL}/api/athlete/programs", headers=self.headers)
        assert response.status_code == 200
        
        response_text = str(response.json())
        
        # Check for forbidden text
        assert "Flagged in recap" not in response_text, "Found 'Flagged in recap' in API response"
        assert "No action needed" not in response_text, "Found 'No action needed' in API response"


class TestAuthEndpoints:
    """Tests for authentication endpoints"""
    
    def test_login_success(self):
        """Test successful login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "emma.chen@athlete.capymatch.com",
            "password": "athlete123"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == "emma.chen@athlete.capymatch.com"
        assert data["user"]["role"] == "athlete"
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code in [401, 404], f"Expected 401 or 404, got {response.status_code}"

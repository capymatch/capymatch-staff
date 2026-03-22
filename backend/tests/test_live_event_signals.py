"""
Test suite for LiveEvent Signal Capture API - Iteration 233
Tests the redesigned Live Event Capture screen endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestLiveEventSignals:
    """Tests for /api/events/:eventId/signals endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "director@capymatch.com", "password": "director123"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json()["token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_event_prep_endpoint(self):
        """Test GET /api/events/event_1/prep returns event data with athletes and schools"""
        response = requests.get(
            f"{BASE_URL}/api/events/event_1/prep",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify event data
        assert "event" in data
        assert data["event"]["id"] == "event_1"
        assert data["event"]["name"] == "College Exposure Camp"
        
        # Verify athletes
        assert "athletes" in data
        assert len(data["athletes"]) >= 3
        athlete_ids = [a["id"] for a in data["athletes"]]
        assert "athlete_1" in athlete_ids  # Emma Chen
        assert "athlete_2" in athlete_ids  # Olivia Anderson
        assert "athlete_7" in athlete_ids  # Noah Davis
        
        # Verify schools
        assert "targetSchools" in data
        school_ids = [s["id"] for s in data["targetSchools"]]
        assert "ucla" in school_ids
        assert "stanford" in school_ids
    
    def test_event_notes_endpoint(self):
        """Test GET /api/events/event_1/notes returns signals list"""
        response = requests.get(
            f"{BASE_URL}/api/events/event_1/notes",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_signal_coach_interest(self):
        """Test POST /api/events/event_1/signals with coach_interest signal"""
        payload = {
            "athlete_id": "athlete_1",
            "school_id": "usc",
            "school_name": "USC",
            "interest_level": "hot",
            "signal_type": "coach_interest",
            "note_text": "TEST_pytest_233 - Coach showed strong interest in Emma",
            "send_to_athlete": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/events/event_1/signals",
            headers=self.headers,
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "id" in data
        assert data["athlete_id"] == "athlete_1"
        assert data["school_id"] == "usc"
        assert data["interest_level"] == "hot"
        assert data["signal_type"] == "coach_interest"
        assert data["note_text"] == payload["note_text"]
        assert "captured_at" in data
        assert "captured_by" in data
    
    def test_create_signal_offered_visit(self):
        """Test POST /api/events/event_1/signals with offered_visit signal"""
        payload = {
            "athlete_id": "athlete_2",
            "school_id": "virginia",
            "school_name": "Virginia",
            "interest_level": "hot",
            "signal_type": "offered_visit",
            "note_text": "TEST_pytest_233 - Offered campus visit to Olivia",
            "send_to_athlete": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/events/event_1/signals",
            headers=self.headers,
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["signal_type"] == "offered_visit"
        assert data["action_created"] == True  # Should create action for offered_visit
    
    def test_create_signal_strong_performance(self):
        """Test POST /api/events/event_1/signals with strong_performance signal"""
        payload = {
            "athlete_id": "athlete_7",
            "school_id": "colorado",
            "school_name": "Colorado",
            "interest_level": "warm",
            "signal_type": "strong_performance",
            "note_text": "TEST_pytest_233 - Noah showed excellent skills in drills",
            "send_to_athlete": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/events/event_1/signals",
            headers=self.headers,
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["signal_type"] == "strong_performance"
        assert data["interest_level"] == "warm"
    
    def test_create_signal_needs_film(self):
        """Test POST /api/events/event_1/signals with needs_film signal"""
        payload = {
            "athlete_id": "athlete_1",
            "school_id": "utah",
            "school_name": "Utah",
            "interest_level": "cool",
            "signal_type": "needs_film",
            "note_text": "TEST_pytest_233 - Coach requested highlight reel",
            "send_to_athlete": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/events/event_1/signals",
            headers=self.headers,
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["signal_type"] == "needs_film"
    
    def test_create_signal_good_conversation(self):
        """Test POST /api/events/event_1/signals with good_conversation signal"""
        payload = {
            "athlete_id": "athlete_2",
            "school_id": "arizona_state",
            "school_name": "Arizona State",
            "interest_level": "none",
            "signal_type": "good_conversation",
            "note_text": "TEST_pytest_233 - Had a positive conversation with coach",
            "send_to_athlete": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/events/event_1/signals",
            headers=self.headers,
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["signal_type"] == "good_conversation"
        assert data["interest_level"] == "none"
    
    def test_add_school_endpoint(self):
        """Test POST /api/events/event_1/add-school"""
        payload = {
            "athlete_id": "athlete_1",
            "school_id": "test-university-233",
            "school_name": "Test University 233"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/events/event_1/add-school",
            headers=self.headers,
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        assert "added" in data
    
    def test_schools_search_endpoint(self):
        """Test GET /api/schools/search"""
        response = requests.get(
            f"{BASE_URL}/api/schools/search?q=stan&limit=5",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "schools" in data


class TestLiveEventAuth:
    """Tests for authentication on LiveEvent endpoints"""
    
    def test_prep_requires_auth(self):
        """Test that /api/events/event_1/prep requires authentication"""
        response = requests.get(f"{BASE_URL}/api/events/event_1/prep")
        assert response.status_code == 401
    
    def test_notes_requires_auth(self):
        """Test that /api/events/event_1/notes requires authentication"""
        response = requests.get(f"{BASE_URL}/api/events/event_1/notes")
        assert response.status_code == 401
    
    def test_signals_requires_auth(self):
        """Test that POST /api/events/event_1/signals requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/events/event_1/signals",
            json={"athlete_id": "athlete_1", "signal_type": "coach_interest", "note_text": "test"}
        )
        assert response.status_code == 401

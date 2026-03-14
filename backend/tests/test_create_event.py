"""
Test suite for Create Event feature (POST /api/events endpoint)
Tests the new Create Event functionality on the Events page
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCreateEventFeature:
    """Tests for the Create Event feature - POST /api/events endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Authenticate and set up headers"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "coach.williams@capymatch.com",
            "password": "coach123"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        self.token = login_resp.json()["token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_create_event_with_valid_data(self):
        """Test creating an event with all required fields"""
        # Create event with future date
        future_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        payload = {
            "name": "TEST Pytest Event Valid",
            "type": "showcase",
            "date": future_date,
            "location": "Test City, CA",
            "expectedSchools": 8
        }
        
        response = requests.post(f"{BASE_URL}/api/events", headers=self.headers, json=payload)
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert data["name"] == "TEST Pytest Event Valid", f"Name mismatch: {data.get('name')}"
        assert data["type"] == "showcase", f"Type mismatch: {data.get('type')}"
        assert data["location"] == "Test City, CA", f"Location mismatch: {data.get('location')}"
        assert data["expectedSchools"] == 8, f"Expected schools mismatch: {data.get('expectedSchools')}"
        assert "id" in data, "Event ID not returned"
        assert data["id"].startswith("event_"), f"Event ID format incorrect: {data.get('id')}"
        assert data["prepStatus"] == "not_started", f"Prep status should be not_started: {data.get('prepStatus')}"
        assert data["athleteCount"] == 0, f"Athlete count should be 0: {data.get('athleteCount')}"
        assert "checklist" in data and len(data["checklist"]) == 5, "Checklist should have 5 items"
    
    def test_create_event_appears_in_list(self):
        """Test that created event appears in GET /api/events list"""
        # Create a unique event
        unique_name = f"TEST Event List Check {datetime.now().timestamp()}"
        future_date = (datetime.now() + timedelta(days=45)).strftime("%Y-%m-%d")
        
        create_resp = requests.post(f"{BASE_URL}/api/events", headers=self.headers, json={
            "name": unique_name,
            "type": "tournament",
            "date": future_date,
            "location": "Phoenix, AZ",
            "expectedSchools": 10
        })
        assert create_resp.status_code == 200
        created_id = create_resp.json()["id"]
        
        # Verify it appears in events list
        list_resp = requests.get(f"{BASE_URL}/api/events", headers=self.headers)
        assert list_resp.status_code == 200
        
        data = list_resp.json()
        upcoming = data.get("upcoming", [])
        event_ids = [e["id"] for e in upcoming]
        
        assert created_id in event_ids, f"Created event {created_id} not found in upcoming events"
        
        # Verify the event data in list matches creation
        created_event = next((e for e in upcoming if e["id"] == created_id), None)
        assert created_event is not None
        assert created_event["name"] == unique_name
        assert created_event["type"] == "tournament"
        assert created_event["location"] == "Phoenix, AZ"
    
    def test_create_event_type_options(self):
        """Test creating events with different types (showcase, tournament, camp)"""
        future_date = (datetime.now() + timedelta(days=60)).strftime("%Y-%m-%d")
        
        for event_type in ["showcase", "tournament", "camp"]:
            payload = {
                "name": f"TEST {event_type.title()} Event",
                "type": event_type,
                "date": future_date,
                "location": "Miami, FL",
                "expectedSchools": 5
            }
            
            response = requests.post(f"{BASE_URL}/api/events", headers=self.headers, json=payload)
            assert response.status_code == 200, f"Failed for type '{event_type}': {response.text}"
            assert response.json()["type"] == event_type
    
    def test_create_event_past_date_becomes_past_status(self):
        """Test that events with past dates get status='past'"""
        past_date = (datetime.now() - timedelta(days=10)).strftime("%Y-%m-%d")
        
        response = requests.post(f"{BASE_URL}/api/events", headers=self.headers, json={
            "name": "TEST Past Date Event",
            "type": "showcase",
            "date": past_date,
            "location": "Denver, CO",
            "expectedSchools": 3
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "past", f"Expected status 'past' for past date, got: {data.get('status')}"
        assert data["daysAway"] < 0, f"Days away should be negative for past events: {data.get('daysAway')}"
    
    def test_create_event_future_date_becomes_upcoming_status(self):
        """Test that events with future dates get status='upcoming'"""
        future_date = (datetime.now() + timedelta(days=90)).strftime("%Y-%m-%d")
        
        response = requests.post(f"{BASE_URL}/api/events", headers=self.headers, json={
            "name": "TEST Future Date Event",
            "type": "camp",
            "date": future_date,
            "location": "Seattle, WA",
            "expectedSchools": 12
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "upcoming", f"Expected status 'upcoming' for future date, got: {data.get('status')}"
        assert data["daysAway"] > 0, f"Days away should be positive for upcoming events: {data.get('daysAway')}"
    
    def test_create_event_has_default_checklist(self):
        """Test that new events have the default 5-item prep checklist"""
        future_date = (datetime.now() + timedelta(days=20)).strftime("%Y-%m-%d")
        
        response = requests.post(f"{BASE_URL}/api/events", headers=self.headers, json={
            "name": "TEST Checklist Event",
            "type": "showcase",
            "date": future_date,
            "location": "Portland, OR",
            "expectedSchools": 6
        })
        
        assert response.status_code == 200
        data = response.json()
        
        checklist = data.get("checklist", [])
        assert len(checklist) == 5, f"Expected 5 checklist items, got {len(checklist)}"
        
        expected_labels = [
            "Confirm athlete attendance",
            "Identify target school coaches attending",
            "Review highlight reels",
            "Prepare talking points for athlete-school pairs",
            "Confirm travel/logistics"
        ]
        
        actual_labels = [item["label"] for item in checklist]
        for label in expected_labels:
            assert label in actual_labels, f"Missing checklist item: {label}"
        
        # All items should start uncompleted
        for item in checklist:
            assert item["completed"] == False, f"Checklist item should start uncompleted: {item}"
    
    def test_create_event_zero_expected_schools(self):
        """Test creating event with 0 expected schools"""
        future_date = (datetime.now() + timedelta(days=25)).strftime("%Y-%m-%d")
        
        response = requests.post(f"{BASE_URL}/api/events", headers=self.headers, json={
            "name": "TEST Zero Schools Event",
            "type": "tournament",
            "date": future_date,
            "location": "Atlanta, GA",
            "expectedSchools": 0
        })
        
        assert response.status_code == 200
        assert response.json()["expectedSchools"] == 0
    
    def test_get_single_event_after_create(self):
        """Test GET /api/events/{id} returns correct data after create"""
        future_date = (datetime.now() + timedelta(days=35)).strftime("%Y-%m-%d")
        unique_name = f"TEST Single Event {datetime.now().timestamp()}"
        
        # Create event
        create_resp = requests.post(f"{BASE_URL}/api/events", headers=self.headers, json={
            "name": unique_name,
            "type": "camp",
            "date": future_date,
            "location": "Boston, MA",
            "expectedSchools": 7
        })
        assert create_resp.status_code == 200
        event_id = create_resp.json()["id"]
        
        # GET single event
        get_resp = requests.get(f"{BASE_URL}/api/events/{event_id}", headers=self.headers)
        assert get_resp.status_code == 200
        
        data = get_resp.json()
        assert data["id"] == event_id
        assert data["name"] == unique_name
        assert data["type"] == "camp"
        assert data["location"] == "Boston, MA"
    
    def test_create_event_requires_auth(self):
        """Test that creating event without auth fails"""
        response = requests.post(f"{BASE_URL}/api/events", json={
            "name": "TEST Unauthorized Event",
            "type": "showcase",
            "date": "2026-05-01",
            "location": "Chicago, IL",
            "expectedSchools": 5
        })
        
        # Should fail without auth
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got: {response.status_code}"


class TestExistingEventsAfterFeature:
    """Test that existing events functionality still works after feature addition"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "coach.williams@capymatch.com",
            "password": "coach123"
        })
        assert login_resp.status_code == 200
        self.token = login_resp.json()["token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_get_events_list_returns_upcoming_and_past(self):
        """Test GET /api/events returns both upcoming and past arrays"""
        response = requests.get(f"{BASE_URL}/api/events", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "upcoming" in data, "Response should have 'upcoming' key"
        assert "past" in data, "Response should have 'past' key"
        assert isinstance(data["upcoming"], list)
        assert isinstance(data["past"], list)
    
    def test_existing_event_has_correct_structure(self):
        """Test existing events have all required fields"""
        response = requests.get(f"{BASE_URL}/api/events", headers=self.headers)
        assert response.status_code == 200
        
        upcoming = response.json().get("upcoming", [])
        if len(upcoming) > 0:
            event = upcoming[0]
            
            required_fields = ["id", "name", "type", "location", "daysAway", "prepStatus"]
            for field in required_fields:
                assert field in event, f"Missing required field: {field}"
    
    def test_event_prep_endpoint_works(self):
        """Test GET /api/events/{id}/prep returns prep data"""
        # Get an existing event
        list_resp = requests.get(f"{BASE_URL}/api/events", headers=self.headers)
        events = list_resp.json().get("upcoming", [])
        
        if len(events) > 0:
            event_id = events[0]["id"]
            prep_resp = requests.get(f"{BASE_URL}/api/events/{event_id}/prep", headers=self.headers)
            
            assert prep_resp.status_code == 200
            data = prep_resp.json()
            
            # Check prep data structure
            assert "athletes" in data or "checklist" in data or "event" in data

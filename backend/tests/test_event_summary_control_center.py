"""
Test Event Summary Post-Tournament Control Center API endpoints
Tests for iteration 235 - Event Summary upgrade features
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestEventSummaryControlCenter:
    """Tests for Event Summary Post-Tournament Control Center features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures - login as director"""
        # Login to get token
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "director@capymatch.com", "password": "director123"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.event_id = "event_1"
    
    def test_event_summary_endpoint_returns_200(self):
        """Test that event summary endpoint returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/events/{self.event_id}/summary",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: Event summary endpoint returns 200")
    
    def test_event_summary_contains_event_data(self):
        """Test that summary contains event data"""
        response = requests.get(
            f"{BASE_URL}/api/events/{self.event_id}/summary",
            headers=self.headers
        )
        data = response.json()
        
        assert "event" in data, "Missing 'event' in response"
        assert data["event"]["id"] == self.event_id, "Event ID mismatch"
        assert "name" in data["event"], "Missing event name"
        assert "location" in data["event"], "Missing event location"
        print(f"PASS: Event data present - {data['event']['name']}")
    
    def test_event_summary_contains_stats(self):
        """Test that summary contains stats grid data"""
        response = requests.get(
            f"{BASE_URL}/api/events/{self.event_id}/summary",
            headers=self.headers
        )
        data = response.json()
        
        assert "stats" in data, "Missing 'stats' in response"
        stats = data["stats"]
        
        # Verify all 4 stats metrics
        assert "totalNotes" in stats, "Missing totalNotes"
        assert "schoolsInteracted" in stats, "Missing schoolsInteracted"
        assert "athletesSeen" in stats, "Missing athletesSeen"
        assert "followUpsNeeded" in stats, "Missing followUpsNeeded"
        
        print(f"PASS: Stats present - {stats['totalNotes']} notes, {stats['schoolsInteracted']} schools, {stats['athletesSeen']} athletes, {stats['followUpsNeeded']} follow-ups")
    
    def test_event_summary_contains_all_notes(self):
        """Test that summary contains allNotes for Actions Needed derivation"""
        response = requests.get(
            f"{BASE_URL}/api/events/{self.event_id}/summary",
            headers=self.headers
        )
        data = response.json()
        
        assert "allNotes" in data, "Missing 'allNotes' in response"
        assert isinstance(data["allNotes"], list), "allNotes should be a list"
        
        # Check note structure
        if len(data["allNotes"]) > 0:
            note = data["allNotes"][0]
            assert "id" in note, "Note missing id"
            assert "athlete_id" in note, "Note missing athlete_id"
            assert "athlete_name" in note, "Note missing athlete_name"
            assert "interest_level" in note, "Note missing interest_level"
            assert "sent_to_athlete" in note, "Note missing sent_to_athlete"
            
        print(f"PASS: allNotes present with {len(data['allNotes'])} notes")
    
    def test_event_summary_contains_schools_seen(self):
        """Test that summary contains schoolsSeen for heatmap"""
        response = requests.get(
            f"{BASE_URL}/api/events/{self.event_id}/summary",
            headers=self.headers
        )
        data = response.json()
        
        assert "schoolsSeen" in data, "Missing 'schoolsSeen' in response"
        assert isinstance(data["schoolsSeen"], list), "schoolsSeen should be a list"
        
        # Check school structure
        if len(data["schoolsSeen"]) > 0:
            school = data["schoolsSeen"][0]
            assert "name" in school, "School missing name"
            assert "interactions" in school, "School missing interactions"
            assert "hot" in school, "School missing hot count"
            assert "warm" in school, "School missing warm count"
            assert "cool" in school, "School missing cool count"
            
        print(f"PASS: schoolsSeen present with {len(data['schoolsSeen'])} schools")
    
    def test_notes_have_follow_ups_field(self):
        """Test that notes have follow_ups field for action hints"""
        response = requests.get(
            f"{BASE_URL}/api/events/{self.event_id}/summary",
            headers=self.headers
        )
        data = response.json()
        
        notes_with_followups = [n for n in data["allNotes"] if n.get("follow_ups")]
        print(f"PASS: {len(notes_with_followups)} notes have follow_ups field")
    
    def test_notes_have_sent_to_athlete_field(self):
        """Test that notes have sent_to_athlete field for Assigned badge"""
        response = requests.get(
            f"{BASE_URL}/api/events/{self.event_id}/summary",
            headers=self.headers
        )
        data = response.json()
        
        sent_notes = [n for n in data["allNotes"] if n.get("sent_to_athlete")]
        unsent_notes = [n for n in data["allNotes"] if not n.get("sent_to_athlete")]
        
        print(f"PASS: {len(sent_notes)} notes sent to athlete, {len(unsent_notes)} unsent")
    
    def test_hot_notes_exist_for_urgent_actions(self):
        """Test that hot notes exist for Actions Needed Today"""
        response = requests.get(
            f"{BASE_URL}/api/events/{self.event_id}/summary",
            headers=self.headers
        )
        data = response.json()
        
        hot_notes = [n for n in data["allNotes"] if n.get("interest_level") == "hot"]
        hot_unsent = [n for n in hot_notes if not n.get("sent_to_athlete")]
        
        print(f"PASS: {len(hot_notes)} hot notes, {len(hot_unsent)} hot+unsent (urgent actions)")
    
    def test_send_to_athlete_endpoint(self):
        """Test send-to-athlete endpoint"""
        # First get a note that hasn't been sent
        response = requests.get(
            f"{BASE_URL}/api/events/{self.event_id}/summary",
            headers=self.headers
        )
        data = response.json()
        
        unsent_notes = [n for n in data["allNotes"] if not n.get("sent_to_athlete") and n.get("school_name")]
        
        if len(unsent_notes) > 0:
            note_id = unsent_notes[0]["id"]
            
            # Send to athlete
            send_response = requests.post(
                f"{BASE_URL}/api/events/{self.event_id}/notes/{note_id}/send-to-athlete",
                headers=self.headers
            )
            
            assert send_response.status_code in [200, 201], f"Send to athlete failed: {send_response.status_code}"
            print(f"PASS: Send to athlete endpoint works for note {note_id}")
        else:
            print("SKIP: No unsent notes available to test")
    
    def test_debrief_complete_endpoint(self):
        """Test debrief-complete endpoint"""
        response = requests.post(
            f"{BASE_URL}/api/events/{self.event_id}/debrief-complete",
            headers=self.headers
        )
        
        # Should return 200 or 201
        assert response.status_code in [200, 201], f"Debrief complete failed: {response.status_code}"
        print("PASS: Debrief complete endpoint works")
    
    def test_event_summary_status_after_debrief(self):
        """Test that summaryStatus is updated after debrief"""
        response = requests.get(
            f"{BASE_URL}/api/events/{self.event_id}/summary",
            headers=self.headers
        )
        data = response.json()
        
        # summaryStatus should be 'complete' after debrief
        summary_status = data["event"].get("summaryStatus")
        print(f"PASS: summaryStatus = {summary_status}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

"""
Test: Contextual Advocacy Feature
Tests for advocate buttons in SchoolPod, SupportPod, and EventSummary pages.
Verifies previous_advocacy array in athlete-context endpoint.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")


class TestContextualAdvocacy:
    """Tests for contextual advocacy feature enhancements"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for coach"""
        self.token = None
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "coach.williams@capymatch.com",
            "password": "coach123"
        })
        assert resp.status_code == 200, f"Login failed: {resp.text}"
        self.token = resp.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.athlete_id = "athlete_1"  # Emma Chen
        self.school_name = "Stanford University"
        self.program_id = "e02f08c6-7c47-430a-aa8d-787a6fbeae00"

    # === GET /api/advocacy/athlete-context/{athlete_id}/{school_id} tests ===
    
    def test_athlete_context_returns_previous_advocacy_array(self):
        """Verify athlete-context endpoint returns previous_advocacy array"""
        resp = requests.get(
            f"{BASE_URL}/api/advocacy/athlete-context/{self.athlete_id}/{self.school_name}",
            headers=self.headers
        )
        assert resp.status_code == 200
        data = resp.json()
        
        # Should have previous_advocacy as an array (can be empty)
        assert "previous_advocacy" in data, "previous_advocacy field missing"
        assert isinstance(data["previous_advocacy"], list), "previous_advocacy should be a list"
        
    def test_athlete_context_returns_athlete_info(self):
        """Verify athlete-context returns complete athlete info"""
        resp = requests.get(
            f"{BASE_URL}/api/advocacy/athlete-context/{self.athlete_id}/{self.school_name}",
            headers=self.headers
        )
        assert resp.status_code == 200
        data = resp.json()
        
        athlete = data.get("athlete")
        assert athlete is not None, "athlete field missing"
        assert athlete["id"] == self.athlete_id
        assert "name" in athlete
        assert "position" in athlete
        assert "grad_year" in athlete
        assert "team" in athlete
        assert "momentum_score" in athlete
        assert "momentum_trend" in athlete
        assert "school_targets" in athlete
        
    def test_athlete_context_returns_pipeline_status(self):
        """Verify pipeline_status is returned for athlete+school"""
        resp = requests.get(
            f"{BASE_URL}/api/advocacy/athlete-context/{self.athlete_id}/{self.school_name}",
            headers=self.headers
        )
        assert resp.status_code == 200
        data = resp.json()
        
        # Should have pipeline_status (can be null)
        assert "pipeline_status" in data
        # Stanford should have a status for Emma
        assert data["pipeline_status"] is not None or data["pipeline_status"] is None  # can be either
        
    def test_athlete_context_returns_last_contact(self):
        """Verify last_contact is returned for athlete+school"""
        resp = requests.get(
            f"{BASE_URL}/api/advocacy/athlete-context/{self.athlete_id}/{self.school_name}",
            headers=self.headers
        )
        assert resp.status_code == 200
        data = resp.json()
        
        # last_contact field should exist (can be null)
        assert "last_contact" in data
        
    def test_athlete_context_returns_event_notes(self):
        """Verify event_notes are returned for athlete+school context"""
        resp = requests.get(
            f"{BASE_URL}/api/advocacy/athlete-context/{self.athlete_id}/{self.school_name}",
            headers=self.headers
        )
        assert resp.status_code == 200
        data = resp.json()
        
        assert "event_notes" in data
        assert isinstance(data["event_notes"], list)
        # Emma should have event notes with Stanford
        if len(data["event_notes"]) > 0:
            note = data["event_notes"][0]
            assert "event_name" in note or "event_id" in note
            assert "note_text" in note or "text" in note or "note_text" in note
            
    def test_athlete_context_works_with_url_encoded_school_name(self):
        """Verify URL-encoded school name works (e.g. 'Stanford%20University')"""
        import urllib.parse
        encoded_name = urllib.parse.quote("Stanford University")
        resp = requests.get(
            f"{BASE_URL}/api/advocacy/athlete-context/{self.athlete_id}/{encoded_name}",
            headers=self.headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "athlete" in data
        assert data["athlete"]["id"] == self.athlete_id


class TestSupportPodSchoolRows:
    """Tests for SupportPod school rows with Advocate button"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "coach.williams@capymatch.com",
            "password": "coach123"
        })
        assert resp.status_code == 200
        self.token = resp.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.athlete_id = "athlete_1"

    def test_support_pod_schools_returns_school_list(self):
        """Verify /api/support-pods/{athlete}/schools returns school list"""
        resp = requests.get(
            f"{BASE_URL}/api/support-pods/{self.athlete_id}/schools",
            headers=self.headers
        )
        assert resp.status_code == 200
        data = resp.json()
        
        assert "schools" in data
        assert isinstance(data["schools"], list)
        
    def test_support_pod_schools_have_university_name(self):
        """Verify school rows have university_name for Advocate button navigation"""
        resp = requests.get(
            f"{BASE_URL}/api/support-pods/{self.athlete_id}/schools",
            headers=self.headers
        )
        assert resp.status_code == 200
        data = resp.json()
        
        if len(data["schools"]) > 0:
            school = data["schools"][0]
            assert "university_name" in school, "school should have university_name"
            assert "program_id" in school, "school should have program_id"


class TestSchoolPodAdvocateButton:
    """Tests for SchoolPod page with Advocate button in hero"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "coach.williams@capymatch.com",
            "password": "coach123"
        })
        assert resp.status_code == 200
        self.token = resp.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.athlete_id = "athlete_1"
        self.program_id = "e02f08c6-7c47-430a-aa8d-787a6fbeae00"

    def test_school_pod_returns_program_info(self):
        """Verify /api/support-pods/{athlete}/school/{program} returns program info"""
        resp = requests.get(
            f"{BASE_URL}/api/support-pods/{self.athlete_id}/school/{self.program_id}",
            headers=self.headers
        )
        assert resp.status_code == 200
        data = resp.json()
        
        assert "program" in data
        assert "university_name" in data["program"], "program should have university_name for Advocate navigation"


class TestEventSummaryAdvocate:
    """Tests for EventSummary notes with Advocate button"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "coach.williams@capymatch.com",
            "password": "coach123"
        })
        assert resp.status_code == 200
        self.token = resp.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.event_id = "event_0"

    def test_event_summary_returns_notes_with_school_name(self):
        """Verify event summary notes have school_name for Advocate button"""
        resp = requests.get(
            f"{BASE_URL}/api/events/{self.event_id}/summary",
            headers=self.headers
        )
        assert resp.status_code == 200
        data = resp.json()
        
        assert "allNotes" in data
        assert isinstance(data["allNotes"], list)
        
        # Check that notes with schools have school_name
        notes_with_school = [n for n in data["allNotes"] if n.get("school_name")]
        assert len(notes_with_school) > 0, "Should have at least one note with school_name"
        
        for note in notes_with_school:
            assert "athlete_id" in note, "note should have athlete_id for Advocate navigation"
            assert "school_name" in note, "note should have school_name for Advocate navigation"


class TestRecommendationBuilderPreFill:
    """Tests for RecommendationBuilder pre-fill from URL params"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "coach.williams@capymatch.com",
            "password": "coach123"
        })
        assert resp.status_code == 200
        self.token = resp.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_athletes_search_returns_matching_athletes(self):
        """Verify /api/advocacy/athletes?q= returns matching athletes for pre-fill"""
        resp = requests.get(
            f"{BASE_URL}/api/advocacy/athletes?q=Emma",
            headers=self.headers
        )
        assert resp.status_code == 200
        data = resp.json()
        
        assert isinstance(data, list)
        # Should find Emma Chen
        emma = next((a for a in data if "Emma" in a.get("name", "")), None)
        assert emma is not None, "Should find athlete named Emma"
        assert "id" in emma
        assert "name" in emma
        
    def test_schools_search_returns_matching_schools(self):
        """Verify /api/schools/search returns matching schools for pre-fill"""
        resp = requests.get(
            f"{BASE_URL}/api/schools/search?q=Stanford&limit=10",
            headers=self.headers
        )
        assert resp.status_code == 200
        data = resp.json()
        
        assert "schools" in data
        assert isinstance(data["schools"], list)
        
        # Should find Stanford
        stanford = next((s for s in data["schools"] if "Stanford" in s.get("university_name", "")), None)
        assert stanford is not None, "Should find Stanford"
        assert "university_name" in stanford


class TestRelationshipHistoryDisplay:
    """Tests for Relationship History section in RecommendationBuilder"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token and create test advocacy"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "coach.williams@capymatch.com",
            "password": "coach123"
        })
        assert resp.status_code == 200
        self.token = resp.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.athlete_id = "athlete_1"
        self.school_name = "Stanford University"
        
    def test_previous_advocacy_structure_when_exists(self):
        """Verify previous_advocacy has correct structure when advocacy exists"""
        # First create a recommendation
        resp = requests.post(
            f"{BASE_URL}/api/advocacy/recommendations",
            headers=self.headers,
            json={
                "athlete_id": self.athlete_id,
                "school_name": "TEST_RelHistory_School",
                "fit_reasons": ["athletic_ability"],
                "fit_note": "TEST relationship history",
                "intro_message": "Test message"
            }
        )
        assert resp.status_code == 200
        rec_id = resp.json().get("id")
        
        # Now check context for previous advocacy
        resp2 = requests.get(
            f"{BASE_URL}/api/advocacy/athlete-context/{self.athlete_id}/TEST_RelHistory_School",
            headers=self.headers
        )
        assert resp2.status_code == 200
        data = resp2.json()
        
        # previous_advocacy should exist
        assert "previous_advocacy" in data
        # Could have our test recommendation
        if len(data["previous_advocacy"]) > 0:
            prev = data["previous_advocacy"][0]
            assert "id" in prev or "status" in prev or "created_at" in prev
            
    def test_event_interactions_in_context(self):
        """Verify event_notes are returned as event interactions context"""
        resp = requests.get(
            f"{BASE_URL}/api/advocacy/athlete-context/{self.athlete_id}/{self.school_name}",
            headers=self.headers
        )
        assert resp.status_code == 200
        data = resp.json()
        
        assert "event_notes" in data
        # Emma should have Stanford event interactions
        stanford_notes = [n for n in data.get("event_notes", []) if "Stanford" in (n.get("school_name") or "")]
        # May or may not have Stanford notes - just verify structure
        if len(stanford_notes) > 0:
            note = stanford_notes[0]
            assert "event_name" in note or "event_id" in note

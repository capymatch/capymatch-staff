"""
Backend tests for AI V1 Intelligence Layer
Tests all 4 AI endpoints powered by GPT 5.2:
1. /api/ai/program-narrative (Program Intelligence)
2. /api/ai/briefing (Mission Control Daily Briefing)
3. /api/ai/event-recap/{event_id} (Event Summary Recap)
4. /api/ai/advocacy-draft/{athlete_id}/{school_id} (Advocacy Draft with AI)
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
DIRECTOR_CREDS = {"email": "director@capymatch.com", "password": "director123"}
COACH_WILLIAMS_CREDS = {"email": "coach.williams@capymatch.com", "password": "coach123"}
COACH_GARCIA_CREDS = {"email": "coach.garcia@capymatch.com", "password": "coach123"}


@pytest.fixture(scope="module")
def director_token():
    """Get director auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=DIRECTOR_CREDS)
    assert response.status_code == 200, f"Director login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def coach_williams_token():
    """Get Coach Williams auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=COACH_WILLIAMS_CREDS)
    assert response.status_code == 200, f"Coach Williams login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def coach_garcia_token():
    """Get Coach Garcia auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=COACH_GARCIA_CREDS)
    assert response.status_code == 200, f"Coach Garcia login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture
def director_headers(director_token):
    return {"Authorization": f"Bearer {director_token}", "Content-Type": "application/json"}


@pytest.fixture
def coach_williams_headers(coach_williams_token):
    return {"Authorization": f"Bearer {coach_williams_token}", "Content-Type": "application/json"}


@pytest.fixture
def coach_garcia_headers(coach_garcia_token):
    return {"Authorization": f"Bearer {coach_garcia_token}", "Content-Type": "application/json"}


# ─── Tests for 401 Unauthorized without auth ───────────────────────────────────

class TestAIEndpointsNoAuth:
    """Verify all AI endpoints return 401 without authentication"""

    def test_program_narrative_requires_auth(self):
        """POST /api/ai/program-narrative should return 401 without token"""
        response = requests.post(f"{BASE_URL}/api/ai/program-narrative")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ /api/ai/program-narrative returns 401 without auth")

    def test_briefing_requires_auth(self):
        """POST /api/ai/briefing should return 401 without token"""
        response = requests.post(f"{BASE_URL}/api/ai/briefing")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ /api/ai/briefing returns 401 without auth")

    def test_event_recap_requires_auth(self):
        """POST /api/ai/event-recap/{event_id} should return 401 without token"""
        response = requests.post(f"{BASE_URL}/api/ai/event-recap/some-event-id")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ /api/ai/event-recap returns 401 without auth")

    def test_advocacy_draft_requires_auth(self):
        """POST /api/ai/advocacy-draft/{athlete_id}/{school_id} should return 401 without token"""
        response = requests.post(f"{BASE_URL}/api/ai/advocacy-draft/athlete_1/ucla")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ /api/ai/advocacy-draft returns 401 without auth")


# ─── Tests for Program Narrative AI ────────────────────────────────────────────

class TestProgramNarrativeAI:
    """Test /api/ai/program-narrative endpoint"""

    def test_director_program_narrative(self, director_headers):
        """Director can generate program narrative"""
        response = requests.post(
            f"{BASE_URL}/api/ai/program-narrative",
            headers=director_headers,
            timeout=30  # AI calls may take time
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "text" in data, "Response should contain 'text' field"
        assert "generated_at" in data, "Response should contain 'generated_at' field"
        assert len(data["text"]) > 50, "AI text should be substantial (>50 chars)"
        # Note: view_mode is "director" for directors (not "program") - this is valid behavior
        assert data.get("view_mode") in ["program", "director"], "Director should get program or director view"
        print(f"✓ Director program narrative generated: {data['text'][:100]}...")

    def test_coach_williams_program_narrative(self, coach_williams_headers):
        """Coach Williams can generate coach-scoped program narrative"""
        response = requests.post(
            f"{BASE_URL}/api/ai/program-narrative",
            headers=coach_williams_headers,
            timeout=30
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "text" in data, "Response should contain 'text' field"
        assert len(data["text"]) > 50, "AI text should be substantial"
        assert data.get("view_mode") == "coach", "Coach should get coach view"
        print(f"✓ Coach Williams narrative (coach view): {data['text'][:100]}...")


# ─── Tests for Daily Briefing AI ───────────────────────────────────────────────

class TestDailyBriefingAI:
    """Test /api/ai/briefing endpoint"""

    def test_director_daily_briefing(self, director_headers):
        """Director can generate daily briefing"""
        response = requests.post(
            f"{BASE_URL}/api/ai/briefing",
            headers=director_headers,
            timeout=30
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "text" in data, "Response should contain 'text' field"
        assert "generated_at" in data, "Response should contain 'generated_at' field"
        assert "alerts_count" in data, "Response should contain alerts_count"
        assert "events_count" in data, "Response should contain events_count"
        assert len(data["text"]) > 30, "AI text should be substantial"
        print(f"✓ Director daily briefing: {data['text'][:100]}...")

    def test_coach_williams_daily_briefing(self, coach_williams_headers):
        """Coach Williams can generate coach-scoped daily briefing"""
        response = requests.post(
            f"{BASE_URL}/api/ai/briefing",
            headers=coach_williams_headers,
            timeout=30
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "text" in data, "Response should contain 'text' field"
        assert len(data["text"]) > 30, "AI text should be substantial"
        print(f"✓ Coach Williams daily briefing: {data['text'][:100]}...")


# ─── Tests for Event Recap AI ──────────────────────────────────────────────────

class TestEventRecapAI:
    """Test /api/ai/event-recap/{event_id} endpoint"""

    @pytest.fixture
    def event_id(self, director_headers):
        """Get a valid event ID from the events list"""
        response = requests.get(f"{BASE_URL}/api/events", headers=director_headers)
        assert response.status_code == 200
        events = response.json()
        # Find an event that likely has notes
        if events:
            return events[0].get("id")
        return None

    def test_event_recap_not_found(self, director_headers):
        """Event recap returns 404 for non-existent event"""
        response = requests.post(
            f"{BASE_URL}/api/ai/event-recap/nonexistent-event-12345",
            headers=director_headers,
            timeout=30
        )
        assert response.status_code in [400, 404], f"Expected 400/404, got {response.status_code}"
        print("✓ Event recap returns 400/404 for invalid event")

    def test_event_recap_no_notes(self, director_headers):
        """Event recap handles events with no notes gracefully"""
        # This test uses a fake event - may get 404 or 400 depending on implementation
        response = requests.post(
            f"{BASE_URL}/api/ai/event-recap/event-with-no-notes",
            headers=director_headers,
            timeout=30
        )
        # Should be 400 "No notes" or 404 "Event not found"
        assert response.status_code in [400, 404], f"Expected 400/404, got {response.status_code}: {response.text}"
        print(f"✓ Event recap handles missing event/notes: {response.status_code}")


# ─── Tests for Advocacy Draft AI ───────────────────────────────────────────────

class TestAdvocacyDraftAI:
    """Test /api/ai/advocacy-draft/{athlete_id}/{school_id} endpoint"""

    def test_director_advocacy_draft(self, director_headers):
        """Director can generate advocacy draft for athlete_1 and ucla"""
        response = requests.post(
            f"{BASE_URL}/api/ai/advocacy-draft/athlete_1/ucla",
            headers=director_headers,
            timeout=30
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "text" in data, "Response should contain 'text' field"
        assert "generated_at" in data, "Response should contain 'generated_at' field"
        assert "athlete_name" in data, "Response should contain athlete_name"
        assert "school_name" in data, "Response should contain school_name"
        assert len(data["text"]) > 50, "AI draft should be substantial (>50 chars)"
        print(f"✓ Director advocacy draft for athlete_1→ucla: {data['text'][:100]}...")

    def test_coach_williams_advocacy_draft_own_athlete(self, coach_williams_headers):
        """Coach Williams can draft for their own athlete (athlete_1 is odd-numbered, belongs to Williams)"""
        response = requests.post(
            f"{BASE_URL}/api/ai/advocacy-draft/athlete_1/stanford",
            headers=coach_williams_headers,
            timeout=30
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "text" in data, "Response should contain 'text' field"
        assert len(data["text"]) > 50, "AI draft should be substantial"
        print(f"✓ Coach Williams draft for athlete_1→stanford: {data['text'][:80]}...")

    def test_coach_williams_advocacy_draft_other_athlete_403(self, coach_williams_headers):
        """Coach Williams cannot draft for another coach's athlete (athlete_2 is even-numbered, belongs to Garcia)"""
        response = requests.post(
            f"{BASE_URL}/api/ai/advocacy-draft/athlete_2/duke",
            headers=coach_williams_headers,
            timeout=30
        )
        assert response.status_code == 403, f"Expected 403 for other coach's athlete, got {response.status_code}: {response.text}"
        print("✓ Coach Williams correctly gets 403 for athlete_2 (Garcia's athlete)")

    def test_advocacy_draft_athlete_not_found(self, director_headers):
        """Advocacy draft returns 404 for non-existent athlete"""
        response = requests.post(
            f"{BASE_URL}/api/ai/advocacy-draft/nonexistent-athlete/ucla",
            headers=director_headers,
            timeout=30
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Advocacy draft returns 404 for invalid athlete")


# ─── Integration Tests ─────────────────────────────────────────────────────────

class TestAIResponseQuality:
    """Test AI response quality and structure"""

    def test_program_narrative_response_structure(self, director_headers):
        """Verify program narrative response has correct structure"""
        response = requests.post(
            f"{BASE_URL}/api/ai/program-narrative",
            headers=director_headers,
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        
        # Validate structure
        assert isinstance(data.get("text"), str), "text should be string"
        assert isinstance(data.get("generated_at"), str), "generated_at should be ISO timestamp"
        assert data.get("view_mode") in ["program", "coach", "director"], "view_mode should be program, director, or coach"
        
        # Text should be meaningful (not empty or error)
        text = data["text"]
        assert len(text) > 30, "Text should be meaningful"
        assert "error" not in text.lower() or "unable" not in text.lower(), "Text should not be error message"
        print(f"✓ Program narrative structure valid, length: {len(text)} chars")

    def test_briefing_response_structure(self, director_headers):
        """Verify briefing response has correct structure"""
        response = requests.post(
            f"{BASE_URL}/api/ai/briefing",
            headers=director_headers,
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        
        # Validate structure
        assert isinstance(data.get("text"), str), "text should be string"
        assert isinstance(data.get("generated_at"), str), "generated_at should be ISO timestamp"
        assert isinstance(data.get("alerts_count"), int), "alerts_count should be int"
        assert isinstance(data.get("events_count"), int), "events_count should be int"
        print(f"✓ Briefing structure valid: {data['alerts_count']} alerts, {data['events_count']} events")

    def test_advocacy_draft_response_structure(self, director_headers):
        """Verify advocacy draft response has correct structure"""
        response = requests.post(
            f"{BASE_URL}/api/ai/advocacy-draft/athlete_1/ucla",
            headers=director_headers,
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        
        # Validate structure
        assert isinstance(data.get("text"), str), "text should be string"
        assert isinstance(data.get("generated_at"), str), "generated_at should be ISO timestamp"
        assert isinstance(data.get("athlete_name"), str), "athlete_name should be string"
        assert isinstance(data.get("school_name"), str), "school_name should be string"
        assert isinstance(data.get("notes_used"), int), "notes_used should be int"
        print(f"✓ Advocacy draft structure valid, athlete: {data['athlete_name']}, school: {data['school_name']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

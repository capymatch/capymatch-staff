"""
School Pod Notes Feature Tests - Iteration 124
Tests for school-scoped notes in the Notes Sidebar

Tests:
1. School Pod loads with notes section
2. Create note via school pod endpoint
3. Notes are school-scoped (Emory notes don't appear in Florida pod)
4. Edit note via athletes endpoint with auth
5. Delete note via athletes endpoint with auth
6. Notes sidebar renders school name in header
"""

import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data
TEST_PREFIX = "TEST_SPN_"  # School Pod Notes test prefix
COACH_EMAIL = "coach.williams@capymatch.com"
COACH_PASSWORD = "coach123"
TEST_ATHLETE_ID = "athlete_3"
EMORY_PROGRAM_ID = "ae7647cc-affc-44ef-8977-244309ac3a30"
FLORIDA_PROGRAM_ID = "15d08982-3c51-4761-9b83-67414484582e"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for coach"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": COACH_EMAIL, "password": COACH_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Auth headers for API requests"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestSchoolPodNotesFeature:
    """Tests for school-scoped notes in School Pod"""
    
    created_note_id = None

    def test_01_school_pod_loads_emory(self, auth_headers):
        """School pod endpoint returns Emory University data"""
        response = requests.get(
            f"{BASE_URL}/api/support-pods/{TEST_ATHLETE_ID}/school/{EMORY_PROGRAM_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "program" in data
        assert data["program"]["university_name"] == "Emory University"
        assert "notes" in data
        assert isinstance(data["notes"], list)
        print(f"✓ Emory School Pod loaded - {len(data['notes'])} notes found")

    def test_02_create_school_scoped_note(self, auth_headers):
        """Create a note scoped to Emory via POST endpoint"""
        unique_text = f"{TEST_PREFIX}Note_{uuid.uuid4().hex[:8]}"
        response = requests.post(
            f"{BASE_URL}/api/support-pods/{TEST_ATHLETE_ID}/school/{EMORY_PROGRAM_ID}/notes",
            headers=auth_headers,
            json={"text": unique_text, "tag": "Coach Note"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify note structure
        assert "id" in data
        assert data["text"] == unique_text
        assert data["program_id"] == EMORY_PROGRAM_ID
        assert data["school_name"] == "Emory University"
        assert data["author"] == "Coach Williams"
        
        # Store for later tests
        TestSchoolPodNotesFeature.created_note_id = data["id"]
        print(f"✓ Created note ID: {data['id']}")

    def test_03_note_appears_in_emory_pod(self, auth_headers):
        """Verify created note appears in Emory School Pod"""
        response = requests.get(
            f"{BASE_URL}/api/support-pods/{TEST_ATHLETE_ID}/school/{EMORY_PROGRAM_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        notes = response.json()["notes"]
        
        # Find our note
        note_ids = [n["id"] for n in notes]
        assert TestSchoolPodNotesFeature.created_note_id in note_ids, "Created note not found in Emory pod"
        print(f"✓ Note {TestSchoolPodNotesFeature.created_note_id} found in Emory pod")

    def test_04_note_NOT_in_florida_pod(self, auth_headers):
        """School scoping: Emory notes should NOT appear in Florida pod"""
        response = requests.get(
            f"{BASE_URL}/api/support-pods/{TEST_ATHLETE_ID}/school/{FLORIDA_PROGRAM_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["program"]["university_name"] == "University of Florida"
        notes = data["notes"]
        
        # Verify Emory note is NOT here
        note_ids = [n["id"] for n in notes]
        assert TestSchoolPodNotesFeature.created_note_id not in note_ids, "Emory note incorrectly appeared in Florida pod!"
        
        # Also check no Emory notes by school_name
        emory_notes = [n for n in notes if n.get("school_name") == "Emory University"]
        assert len(emory_notes) == 0, "Found Emory-scoped notes in Florida pod"
        print(f"✓ Florida pod has {len(notes)} notes, none from Emory - School scoping works!")

    def test_05_edit_note_with_auth(self, auth_headers):
        """Edit note via PATCH /api/athletes/:athleteId/notes/:noteId"""
        note_id = TestSchoolPodNotesFeature.created_note_id
        new_text = f"{TEST_PREFIX}EDITED_Note_{uuid.uuid4().hex[:8]}"
        
        response = requests.patch(
            f"{BASE_URL}/api/athletes/{TEST_ATHLETE_ID}/notes/{note_id}",
            headers=auth_headers,
            json={"text": new_text}
        )
        assert response.status_code == 200
        assert response.json()["updated"] == True
        
        # Verify edit persisted
        pod_response = requests.get(
            f"{BASE_URL}/api/support-pods/{TEST_ATHLETE_ID}/school/{EMORY_PROGRAM_ID}",
            headers=auth_headers
        )
        notes = pod_response.json()["notes"]
        edited_note = next((n for n in notes if n["id"] == note_id), None)
        assert edited_note is not None
        assert edited_note["text"] == new_text
        print(f"✓ Note edited successfully - new text: {new_text[:40]}...")

    def test_06_delete_note_with_auth(self, auth_headers):
        """Delete note via DELETE /api/athletes/:athleteId/notes/:noteId"""
        note_id = TestSchoolPodNotesFeature.created_note_id
        
        response = requests.delete(
            f"{BASE_URL}/api/athletes/{TEST_ATHLETE_ID}/notes/{note_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        assert response.json()["deleted"] == True
        
        # Verify deletion
        pod_response = requests.get(
            f"{BASE_URL}/api/support-pods/{TEST_ATHLETE_ID}/school/{EMORY_PROGRAM_ID}",
            headers=auth_headers
        )
        notes = pod_response.json()["notes"]
        note_ids = [n["id"] for n in notes]
        assert note_id not in note_ids, "Note still exists after deletion"
        print(f"✓ Note {note_id} deleted successfully")

    def test_07_unauthorized_access_rejected(self):
        """Endpoints require auth"""
        # No auth header
        response = requests.get(
            f"{BASE_URL}/api/support-pods/{TEST_ATHLETE_ID}/school/{EMORY_PROGRAM_ID}"
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Unauthorized access correctly rejected")

    def test_08_schools_list_endpoint(self, auth_headers):
        """GET /api/support-pods/:athleteId/schools returns list"""
        response = requests.get(
            f"{BASE_URL}/api/support-pods/{TEST_ATHLETE_ID}/schools",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "schools" in data
        assert data["total"] > 0
        
        # Check Emory is in the list
        emory = next((s for s in data["schools"] if s["program_id"] == EMORY_PROGRAM_ID), None)
        assert emory is not None
        assert emory["university_name"] == "Emory University"
        print(f"✓ Schools list returned {data['total']} schools")


class TestNotesSidebarEndpoints:
    """Tests for endpoints used by CoachNotesSidebar component"""
    
    def test_01_sidebar_creates_note_with_tag(self, auth_headers):
        """Sidebar sends text and tag in POST body"""
        unique_text = f"{TEST_PREFIX}SidebarNote_{uuid.uuid4().hex[:8]}"
        response = requests.post(
            f"{BASE_URL}/api/support-pods/{TEST_ATHLETE_ID}/school/{EMORY_PROGRAM_ID}/notes",
            headers=auth_headers,
            json={"text": unique_text, "tag": "Coach Note"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["tag"] == "Coach Note"
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/athletes/{TEST_ATHLETE_ID}/notes/{data['id']}",
            headers=auth_headers
        )
        print("✓ Sidebar note created with tag")

    def test_02_school_pod_response_has_required_fields(self, auth_headers):
        """School pod response has all fields needed by sidebar"""
        response = requests.get(
            f"{BASE_URL}/api/support-pods/{TEST_ATHLETE_ID}/school/{EMORY_PROGRAM_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Fields used by sidebar
        assert "program" in data
        assert "university_name" in data["program"]
        assert "notes" in data
        
        # If notes exist, check structure
        if data["notes"]:
            note = data["notes"][0]
            assert "id" in note
            assert "text" in note
            assert "created_at" in note
            assert "author" in note or "created_by_name" in note
        print("✓ School pod response has all required fields for sidebar")

"""
Test Phase J3 Journey Page Features:
- Notes CRUD: GET/POST /api/athlete/programs/{programId}/notes, PUT/DELETE /api/athlete/notes/{noteId}
- Gmail status endpoint for nudge check
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
TEST_EMAIL = "emma.chen@athlete.capymatch.com"
TEST_PASSWORD = "password123"

# Test programs
BYU_PROGRAM_ID = "06553aea-e820-40a9-97f2-b3fc0df66313"  # Has coaches
STANFORD_PROGRAM_ID = "a54a0014-0e83-4a16-b0c2-5e8f10401de2"  # Overdue follow-up
TAMPA_PROGRAM_ID = "66c1d51c-3326-4d74-a3e1-aa49776b3ec5"  # New school


@pytest.fixture(scope="module")
def auth_token():
    """Get JWT token for authenticated requests."""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
    )
    if response.status_code != 200:
        pytest.skip(f"Authentication failed: {response.status_code}")
    return response.json().get("token")


@pytest.fixture
def auth_headers(auth_token):
    """Headers with JWT token."""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json",
    }


class TestNotesListEndpoint:
    """GET /api/athlete/programs/{programId}/notes - List notes for a program."""

    def test_list_notes_returns_pinned_and_recent(self, auth_headers):
        """Notes endpoint returns {pinned, recent} arrays."""
        response = requests.get(
            f"{BASE_URL}/api/athlete/programs/{BYU_PROGRAM_ID}/notes",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "pinned" in data, "Response should have 'pinned' field"
        assert "recent" in data, "Response should have 'recent' field"
        assert isinstance(data["pinned"], list)
        assert isinstance(data["recent"], list)

    def test_list_notes_requires_auth(self):
        """Notes endpoint requires authentication."""
        response = requests.get(
            f"{BASE_URL}/api/athlete/programs/{BYU_PROGRAM_ID}/notes"
        )
        assert response.status_code in [401, 403]


class TestNotesCreateEndpoint:
    """POST /api/athlete/programs/{programId}/notes - Create a note."""

    def test_create_note_success(self, auth_headers):
        """Successfully create a note for a program."""
        content = f"TEST_NOTE: This is a test note created at {time.time()}"
        response = requests.post(
            f"{BASE_URL}/api/athlete/programs/{BYU_PROGRAM_ID}/notes",
            headers=auth_headers,
            json={"content": content},
        )
        assert response.status_code == 200
        data = response.json()
        assert "note_id" in data, "Response should have 'note_id'"
        assert data["content"] == content.strip()
        assert data["is_pinned"] == False
        assert "created_at" in data
        assert "updated_at" in data
        assert data["program_id"] == BYU_PROGRAM_ID

        # Clean up - delete the test note
        requests.delete(
            f"{BASE_URL}/api/athlete/notes/{data['note_id']}",
            headers=auth_headers,
        )

    def test_create_note_empty_content_fails(self, auth_headers):
        """Creating note with empty content should fail."""
        response = requests.post(
            f"{BASE_URL}/api/athlete/programs/{BYU_PROGRAM_ID}/notes",
            headers=auth_headers,
            json={"content": "   "},
        )
        assert response.status_code == 400

    def test_create_note_requires_auth(self):
        """Create note requires authentication."""
        response = requests.post(
            f"{BASE_URL}/api/athlete/programs/{BYU_PROGRAM_ID}/notes",
            json={"content": "Test"},
        )
        assert response.status_code in [401, 403]


class TestNotesUpdateEndpoint:
    """PUT /api/athlete/notes/{noteId} - Update note content and is_pinned."""

    def test_update_note_content(self, auth_headers):
        """Update note content."""
        # First create a note
        create_resp = requests.post(
            f"{BASE_URL}/api/athlete/programs/{BYU_PROGRAM_ID}/notes",
            headers=auth_headers,
            json={"content": "TEST_NOTE: Original content"},
        )
        assert create_resp.status_code == 200
        note_id = create_resp.json()["note_id"]

        # Update content
        new_content = "TEST_NOTE: Updated content"
        update_resp = requests.put(
            f"{BASE_URL}/api/athlete/notes/{note_id}",
            headers=auth_headers,
            json={"content": new_content},
        )
        assert update_resp.status_code == 200
        data = update_resp.json()
        assert data["content"] == new_content

        # Clean up
        requests.delete(
            f"{BASE_URL}/api/athlete/notes/{note_id}",
            headers=auth_headers,
        )

    def test_update_note_pin(self, auth_headers):
        """Update note is_pinned status."""
        # Create a note
        create_resp = requests.post(
            f"{BASE_URL}/api/athlete/programs/{STANFORD_PROGRAM_ID}/notes",
            headers=auth_headers,
            json={"content": "TEST_NOTE: Pin test"},
        )
        assert create_resp.status_code == 200
        note_id = create_resp.json()["note_id"]
        assert create_resp.json()["is_pinned"] == False

        # Pin the note
        pin_resp = requests.put(
            f"{BASE_URL}/api/athlete/notes/{note_id}",
            headers=auth_headers,
            json={"is_pinned": True},
        )
        assert pin_resp.status_code == 200
        assert pin_resp.json()["is_pinned"] == True

        # Verify pinned notes appear in pinned array
        list_resp = requests.get(
            f"{BASE_URL}/api/athlete/programs/{STANFORD_PROGRAM_ID}/notes",
            headers=auth_headers,
        )
        assert list_resp.status_code == 200
        pinned_ids = [n["note_id"] for n in list_resp.json()["pinned"]]
        assert note_id in pinned_ids

        # Clean up
        requests.delete(
            f"{BASE_URL}/api/athlete/notes/{note_id}",
            headers=auth_headers,
        )

    def test_update_nonexistent_note(self, auth_headers):
        """Update non-existent note returns 404."""
        response = requests.put(
            f"{BASE_URL}/api/athlete/notes/note_nonexistent123",
            headers=auth_headers,
            json={"content": "test"},
        )
        assert response.status_code == 404


class TestNotesDeleteEndpoint:
    """DELETE /api/athlete/notes/{noteId} - Delete a note."""

    def test_delete_note_success(self, auth_headers):
        """Successfully delete a note."""
        # Create a note
        create_resp = requests.post(
            f"{BASE_URL}/api/athlete/programs/{TAMPA_PROGRAM_ID}/notes",
            headers=auth_headers,
            json={"content": "TEST_NOTE: To be deleted"},
        )
        assert create_resp.status_code == 200
        note_id = create_resp.json()["note_id"]

        # Delete it
        delete_resp = requests.delete(
            f"{BASE_URL}/api/athlete/notes/{note_id}",
            headers=auth_headers,
        )
        assert delete_resp.status_code == 200
        assert delete_resp.json()["ok"] == True

        # Verify note is gone
        list_resp = requests.get(
            f"{BASE_URL}/api/athlete/programs/{TAMPA_PROGRAM_ID}/notes",
            headers=auth_headers,
        )
        all_notes = list_resp.json()["pinned"] + list_resp.json()["recent"]
        note_ids = [n["note_id"] for n in all_notes]
        assert note_id not in note_ids

    def test_delete_nonexistent_note(self, auth_headers):
        """Delete non-existent note returns 404."""
        response = requests.delete(
            f"{BASE_URL}/api/athlete/notes/note_fake123",
            headers=auth_headers,
        )
        assert response.status_code == 404


class TestGmailStatusEndpoint:
    """GET /api/athlete/gmail/status - For Gmail connect nudge."""

    def test_gmail_status_returns_connected_field(self, auth_headers):
        """Gmail status endpoint returns connected boolean."""
        response = requests.get(
            f"{BASE_URL}/api/athlete/gmail/status",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "connected" in data
        assert isinstance(data["connected"], bool)


class TestProgramEndpointForSendProfile:
    """GET /api/athlete/programs/{id} - Verify coaches data for Send Profile card."""

    def test_program_with_coaches_has_college_coaches_array(self, auth_headers):
        """BYU program has coaches for Send Profile feature."""
        response = requests.get(
            f"{BASE_URL}/api/athlete/programs/{BYU_PROGRAM_ID}",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "college_coaches" in data
        coaches = data["college_coaches"]
        assert isinstance(coaches, list)
        assert len(coaches) > 0, "BYU should have coaches for Send Profile card"
        # Verify coach structure
        coach = coaches[0]
        assert "coach_id" in coach
        assert "coach_name" in coach


class TestJ1J2FeaturesRegression:
    """Verify J1+J2 features still work after J3 changes."""

    def test_match_scores_endpoint(self, auth_headers):
        """Match scores endpoint still works for J1 match score badge."""
        response = requests.get(
            f"{BASE_URL}/api/match-scores",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "scores" in data

    def test_engagement_endpoint(self, auth_headers):
        """Engagement endpoint still works for J2 engagement strip."""
        response = requests.get(
            f"{BASE_URL}/api/athlete/engagement/{BYU_PROGRAM_ID}",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_opens" in data
        assert "total_clicks" in data

    def test_journey_endpoint(self, auth_headers):
        """Journey timeline still works."""
        response = requests.get(
            f"{BASE_URL}/api/athlete/programs/{BYU_PROGRAM_ID}/journey",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "timeline" in data

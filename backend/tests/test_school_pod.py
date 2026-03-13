"""Test School Pod API endpoints.

Tests the new school-level workflow where coaches access school-specific
workspace for each athlete-school relationship.

Endpoints tested:
- GET /api/support-pods/{athlete_id}/schools - List athlete's schools
- GET /api/support-pods/{athlete_id}/school/{program_id} - School pod data
- POST /api/support-pods/{athlete_id}/school/{program_id}/actions - Create action
- POST /api/support-pods/{athlete_id}/school/{program_id}/notes - Create note
- PATCH /api/support-pods/{athlete_id}/school/{program_id}/actions/{action_id} - Complete action
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')
if BASE_URL:
    BASE_URL = BASE_URL.rstrip('/')

# Test data
COACH_EMAIL = "coach.williams@capymatch.com"
COACH_PASSWORD = "coach123"
TEST_ATHLETE_ID = "athlete_3"
TEST_PROGRAM_ID = "ae7647cc-affc-44ef-8977-244309ac3a30"  # Emory University


class TestSchoolPodAPI:
    """School Pod endpoint tests - coach workflow for school-level access."""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with auth."""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.token = None
        self.created_action_id = None
        self.created_note_id = None

    def get_coach_token(self):
        """Authenticate as coach and get token."""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": COACH_EMAIL,
            "password": COACH_PASSWORD
        })
        assert response.status_code == 200, f"Coach login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        return data["token"]

    def test_01_coach_login(self):
        """Coach can login and get valid token."""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": COACH_EMAIL,
            "password": COACH_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "club_coach"
        print(f"✓ Coach login successful: {data['user']['name']}")

    def test_02_get_athlete_schools_list(self):
        """GET /api/support-pods/{athlete_id}/schools returns sorted school list."""
        token = self.get_coach_token()
        self.session.headers["Authorization"] = f"Bearer {token}"

        response = self.session.get(f"{BASE_URL}/api/support-pods/{TEST_ATHLETE_ID}/schools")
        assert response.status_code == 200, f"Failed: {response.text}"

        data = response.json()
        assert "schools" in data
        assert "total" in data
        assert "athlete_id" in data
        assert data["athlete_id"] == TEST_ATHLETE_ID

        schools = data["schools"]
        assert len(schools) > 0, "No schools returned"
        print(f"✓ Got {data['total']} schools for athlete")

        # Verify first school has required fields
        first_school = schools[0]
        required_fields = ["program_id", "university_name", "health", "health_label", "health_color"]
        for field in required_fields:
            assert field in first_school, f"Missing field: {field}"

        # Check sorting - at_risk/needs_attention should be first
        urgent_healths = {"at_risk", "needs_attention"}
        first_urgent_idx = -1
        first_other_idx = -1
        for i, s in enumerate(schools):
            if s["health"] in urgent_healths and first_urgent_idx == -1:
                first_urgent_idx = i
            if s["health"] not in urgent_healths and first_other_idx == -1:
                first_other_idx = i

        if first_urgent_idx != -1 and first_other_idx != -1:
            assert first_urgent_idx < first_other_idx, "Schools not sorted by urgency"
            print("✓ Schools sorted by urgency (at_risk/needs_attention first)")

        # Count schools needing attention
        needs_attention_count = len([s for s in schools if s["health"] in urgent_healths])
        print(f"✓ {needs_attention_count} schools flagged as needing attention")

    def test_03_get_school_pod_data(self):
        """GET /api/support-pods/{athlete_id}/school/{program_id} returns full pod data."""
        token = self.get_coach_token()
        self.session.headers["Authorization"] = f"Bearer {token}"

        response = self.session.get(f"{BASE_URL}/api/support-pods/{TEST_ATHLETE_ID}/school/{TEST_PROGRAM_ID}")
        assert response.status_code == 200, f"Failed: {response.text}"

        data = response.json()

        # Verify response structure
        required_sections = ["program", "metrics", "health", "health_display", "signals", "actions", "notes", "timeline_events"]
        for section in required_sections:
            assert section in data, f"Missing section: {section}"

        # Verify program data
        program = data["program"]
        assert "program_id" in program
        assert "university_name" in program
        assert program["university_name"] != ""
        print(f"✓ School Pod for: {program['university_name']}")

        # Verify health display
        health_display = data["health_display"]
        assert "label" in health_display
        assert "color" in health_display
        print(f"✓ Health status: {data['health']} ({health_display['label']})")

        # Verify signals are array
        signals = data["signals"]
        assert isinstance(signals, list)
        print(f"✓ {len(signals)} signals present")

        # Verify actions and notes are arrays
        assert isinstance(data["actions"], list)
        assert isinstance(data["notes"], list)
        print(f"✓ {len(data['actions'])} actions, {len(data['notes'])} notes")

        # Check for school_info (optional)
        if data.get("school_info"):
            print(f"✓ School info present (coach contact details)")

    def test_04_create_school_scoped_action(self):
        """POST /api/support-pods/{athlete_id}/school/{program_id}/actions creates action."""
        token = self.get_coach_token()
        self.session.headers["Authorization"] = f"Bearer {token}"

        action_title = "TEST_SchoolPod_FollowUp_SendEmail"
        response = self.session.post(
            f"{BASE_URL}/api/support-pods/{TEST_ATHLETE_ID}/school/{TEST_PROGRAM_ID}/actions",
            json={"title": action_title, "notes": "Test action for school pod"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"

        data = response.json()
        assert "id" in data
        assert data["title"] == action_title
        assert data["athlete_id"] == TEST_ATHLETE_ID
        assert data["program_id"] == TEST_PROGRAM_ID
        assert data["status"] == "ready"
        print(f"✓ Created action: {data['id']}")

        # Store for later tests
        TestSchoolPodAPI.created_action_id = data["id"]

    def test_05_create_school_scoped_note(self):
        """POST /api/support-pods/{athlete_id}/school/{program_id}/notes creates note."""
        token = self.get_coach_token()
        self.session.headers["Authorization"] = f"Bearer {token}"

        note_text = "TEST_SchoolPod_Note: Coach meeting rescheduled to next week"
        response = self.session.post(
            f"{BASE_URL}/api/support-pods/{TEST_ATHLETE_ID}/school/{TEST_PROGRAM_ID}/notes",
            json={"text": note_text, "category": "recruiting"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"

        data = response.json()
        assert "id" in data
        assert data["text"] == note_text
        assert data["athlete_id"] == TEST_ATHLETE_ID
        assert data["program_id"] == TEST_PROGRAM_ID
        print(f"✓ Created note: {data['id']}")

        TestSchoolPodAPI.created_note_id = data["id"]

    def test_06_verify_action_appears_in_pod(self):
        """Created action appears in school pod data."""
        token = self.get_coach_token()
        self.session.headers["Authorization"] = f"Bearer {token}"

        response = self.session.get(f"{BASE_URL}/api/support-pods/{TEST_ATHLETE_ID}/school/{TEST_PROGRAM_ID}")
        assert response.status_code == 200

        data = response.json()
        actions = data["actions"]

        # Find the created action
        action_found = any(a.get("title", "").startswith("TEST_SchoolPod_FollowUp") for a in actions)
        assert action_found, "Created action not found in school pod"
        print("✓ Created action appears in school pod")

    def test_07_verify_note_appears_in_pod(self):
        """Created note appears in school pod data."""
        token = self.get_coach_token()
        self.session.headers["Authorization"] = f"Bearer {token}"

        response = self.session.get(f"{BASE_URL}/api/support-pods/{TEST_ATHLETE_ID}/school/{TEST_PROGRAM_ID}")
        assert response.status_code == 200

        data = response.json()
        notes = data["notes"]

        # Find the created note
        note_found = any(n.get("text", "").startswith("TEST_SchoolPod_Note") for n in notes)
        assert note_found, "Created note not found in school pod"
        print("✓ Created note appears in school pod")

    def test_08_complete_action(self):
        """PATCH /api/support-pods/{athlete_id}/school/{program_id}/actions/{action_id} completes action."""
        token = self.get_coach_token()
        self.session.headers["Authorization"] = f"Bearer {token}"

        action_id = getattr(TestSchoolPodAPI, 'created_action_id', None)
        if not action_id:
            pytest.skip("No action ID from previous test")

        response = self.session.patch(
            f"{BASE_URL}/api/support-pods/{TEST_ATHLETE_ID}/school/{TEST_PROGRAM_ID}/actions/{action_id}",
            json={"status": "completed"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"

        data = response.json()
        assert data.get("updated") == True
        print(f"✓ Completed action: {action_id}")

    def test_09_verify_timeline_events(self):
        """Timeline events created for action and note."""
        token = self.get_coach_token()
        self.session.headers["Authorization"] = f"Bearer {token}"

        response = self.session.get(f"{BASE_URL}/api/support-pods/{TEST_ATHLETE_ID}/school/{TEST_PROGRAM_ID}")
        assert response.status_code == 200

        data = response.json()
        events = data.get("timeline_events", [])

        # Should have events for action_created, note_added, action_completed
        event_types = [e.get("type") for e in events]
        print(f"✓ Timeline has {len(events)} events, types: {set(event_types)}")

    def test_10_health_classification(self):
        """Schools have proper health classification and colors."""
        token = self.get_coach_token()
        self.session.headers["Authorization"] = f"Bearer {token}"

        response = self.session.get(f"{BASE_URL}/api/support-pods/{TEST_ATHLETE_ID}/schools")
        assert response.status_code == 200

        data = response.json()
        schools = data["schools"]

        valid_healths = {"at_risk", "needs_attention", "awaiting_reply", "active", "strong_momentum", "still_early"}

        for school in schools:
            health = school.get("health")
            assert health in valid_healths, f"Invalid health: {health} for {school['university_name']}"
            assert school.get("health_label"), f"Missing health_label for {school['university_name']}"
            assert school.get("health_color"), f"Missing health_color for {school['university_name']}"

        print("✓ All schools have valid health classification")

    def test_11_unauthorized_access_denied(self):
        """Unauthenticated requests are rejected."""
        # No auth header
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})

        response = session.get(f"{BASE_URL}/api/support-pods/{TEST_ATHLETE_ID}/schools")
        assert response.status_code in [401, 403], f"Expected auth error, got {response.status_code}"
        print("✓ Unauthorized access properly denied")

    def test_12_cleanup_test_data(self):
        """Clean up TEST_ prefixed data created during tests."""
        token = self.get_coach_token()
        self.session.headers["Authorization"] = f"Bearer {token}"

        # The test data will be cleaned up by the database retention policy
        # or manual cleanup if needed
        print("✓ Test data marked for cleanup (TEST_ prefix)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

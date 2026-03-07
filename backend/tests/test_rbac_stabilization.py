"""
Test RBAC Stabilization - Iteration 19
Tests for:
1. Director registration blocked (403)
2. Coach registration works normally  
3. All routes require JWT (401 without token)
4. Director-only routes (403 for coaches)
5. current_user['name'] used as author instead of hardcoded 'Coach Martinez'
6. Full invite flow still works
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
DIRECTOR_EMAIL = "director@capymatch.com"
DIRECTOR_PASSWORD = "director123"
COACH_WILLIAMS_EMAIL = "coach.williams@capymatch.com"
COACH_PASSWORD = "coach123"


class TestAuthRegistration:
    """Test self-registration RBAC - director blocked, coach allowed"""

    def test_register_director_returns_403(self):
        """POST /api/auth/register with role='director' should return 403"""
        unique_email = f"test_director_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "test123456",
            "name": "Test Director",
            "role": "director"
        })
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        data = response.json()
        assert "Director accounts cannot be self-registered" in data.get("detail", "")
        print("✓ Director registration blocked with 403")

    def test_register_coach_works(self):
        """POST /api/auth/register with role='coach' should work"""
        unique_email = f"test_coach_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "test123456",
            "name": "Test Coach",
            "role": "coach"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "coach"
        assert data["user"]["email"] == unique_email
        print(f"✓ Coach registration works - created {unique_email}")


class TestRouteProtection:
    """Test that all routes require JWT auth (401 without token)"""

    @pytest.fixture
    def director_token(self):
        """Get director token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DIRECTOR_EMAIL,
            "password": DIRECTOR_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]

    @pytest.fixture
    def coach_token(self):
        """Get coach token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": COACH_WILLIAMS_EMAIL,
            "password": COACH_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]

    def test_mission_control_requires_auth(self):
        """GET /api/mission-control without token returns 401"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ /api/mission-control returns 401 without auth")

    def test_events_requires_auth(self):
        """GET /api/events without token returns 401"""
        response = requests.get(f"{BASE_URL}/api/events")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ /api/events returns 401 without auth")

    def test_athletes_requires_auth(self):
        """GET /api/athletes without token returns 401"""
        response = requests.get(f"{BASE_URL}/api/athletes")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ /api/athletes returns 401 without auth")

    def test_mission_control_works_with_auth(self, director_token):
        """GET /api/mission-control with token returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/mission-control",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ /api/mission-control returns 200 with auth")

    def test_events_works_with_auth(self, coach_token):
        """GET /api/events with token returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/events",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ /api/events returns 200 with auth")

    def test_athletes_works_with_auth(self, coach_token):
        """GET /api/athletes with token returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/athletes",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ /api/athletes returns 200 with auth")


class TestDirectorOnlyRoutes:
    """Test director-only routes return 403 for coaches"""

    @pytest.fixture
    def director_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DIRECTOR_EMAIL,
            "password": DIRECTOR_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]

    @pytest.fixture
    def coach_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": COACH_WILLIAMS_EMAIL,
            "password": COACH_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]

    def test_admin_status_403_for_coach(self, coach_token):
        """GET /api/admin/status returns 403 for coach"""
        response = requests.get(
            f"{BASE_URL}/api/admin/status",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ /api/admin/status returns 403 for coach")

    def test_admin_status_200_for_director(self, director_token):
        """GET /api/admin/status returns 200 for director"""
        response = requests.get(
            f"{BASE_URL}/api/admin/status",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ /api/admin/status returns 200 for director")

    def test_debug_interventions_403_for_coach(self, coach_token):
        """GET /api/debug/interventions returns 403 for coach"""
        response = requests.get(
            f"{BASE_URL}/api/debug/interventions",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ /api/debug/interventions returns 403 for coach")

    def test_debug_interventions_200_for_director(self, director_token):
        """GET /api/debug/interventions returns 200 for director"""
        response = requests.get(
            f"{BASE_URL}/api/debug/interventions",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ /api/debug/interventions returns 200 for director")

    def test_invites_403_for_coach(self, coach_token):
        """GET /api/invites returns 403 for coach"""
        response = requests.get(
            f"{BASE_URL}/api/invites",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ /api/invites returns 403 for coach")

    def test_invites_200_for_director(self, director_token):
        """GET /api/invites returns 200 for director"""
        response = requests.get(
            f"{BASE_URL}/api/invites",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ /api/invites returns 200 for director")

    def test_create_invite_403_for_coach(self, coach_token):
        """POST /api/invites returns 403 for coach"""
        response = requests.post(
            f"{BASE_URL}/api/invites",
            headers={"Authorization": f"Bearer {coach_token}"},
            json={"email": "test@example.com", "name": "Test"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ POST /api/invites returns 403 for coach")


class TestCurrentUserNameInActions:
    """Test that current_user['name'] is used as author, not hardcoded 'Coach Martinez'"""

    @pytest.fixture
    def coach_williams_data(self):
        """Get Coach Williams token and user data"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": COACH_WILLIAMS_EMAIL,
            "password": COACH_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        return {"token": data["token"], "user": data["user"]}

    @pytest.fixture
    def coach_headers(self, coach_williams_data):
        return {"Authorization": f"Bearer {coach_williams_data['token']}"}

    def test_athlete_note_uses_current_user_name(self, coach_williams_data, coach_headers):
        """POST /api/athletes/{id}/notes should record current_user['name'] as author"""
        # Get an athlete
        athletes_resp = requests.get(
            f"{BASE_URL}/api/athletes",
            headers=coach_headers
        )
        athletes = athletes_resp.json()
        athlete_id = athletes[0]["id"]

        # Create a note
        note_text = f"Test note from Coach Williams {uuid.uuid4().hex[:6]}"
        response = requests.post(
            f"{BASE_URL}/api/athletes/{athlete_id}/notes",
            headers=coach_headers,
            json={"text": note_text, "tag": "test"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()

        # Verify author is current user's name, not hardcoded
        expected_name = coach_williams_data["user"]["name"]
        assert data["author"] == expected_name, f"Expected author '{expected_name}', got '{data.get('author')}'"
        assert data["author"] != "Coach Martinez", "Author should NOT be hardcoded 'Coach Martinez'"
        print(f"✓ Athlete note author is '{data['author']}' (current user)")

    def test_support_pod_action_uses_current_user_name(self, coach_williams_data, coach_headers):
        """POST /api/support-pods/{id}/actions should record current_user['name'] as created_by"""
        # Get an athlete
        athletes_resp = requests.get(
            f"{BASE_URL}/api/athletes",
            headers=coach_headers
        )
        athletes = athletes_resp.json()
        athlete_id = athletes[0]["id"]

        # Create an action
        action_title = f"Test action from Coach Williams {uuid.uuid4().hex[:6]}"
        response = requests.post(
            f"{BASE_URL}/api/support-pods/{athlete_id}/actions",
            headers=coach_headers,
            json={
                "title": action_title,
                "owner": coach_williams_data["user"]["name"],
                "source_category": "test"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()

        # Verify created_by is current user's name
        expected_name = coach_williams_data["user"]["name"]
        assert data["created_by"] == expected_name, f"Expected created_by '{expected_name}', got '{data.get('created_by')}'"
        assert data["created_by"] != "Coach Martinez", "created_by should NOT be hardcoded"
        print(f"✓ Support pod action created_by is '{data['created_by']}' (current user)")

    def test_event_note_uses_current_user_name(self, coach_williams_data, coach_headers):
        """POST /api/events/{id}/notes should record current_user['name'] as captured_by"""
        # Get an event
        events_resp = requests.get(
            f"{BASE_URL}/api/events",
            headers=coach_headers
        )
        events = events_resp.json()
        # Find an upcoming event
        event_id = None
        for e in events.get("upcoming", []):
            event_id = e["id"]
            break
        if not event_id and events.get("past"):
            event_id = events["past"][0]["id"]

        if not event_id:
            pytest.skip("No events found to test")

        # Get an athlete for the note
        athletes_resp = requests.get(
            f"{BASE_URL}/api/athletes",
            headers=coach_headers
        )
        athletes = athletes_resp.json()
        athlete_id = athletes[0]["id"]

        # Create an event note
        response = requests.post(
            f"{BASE_URL}/api/events/{event_id}/notes",
            headers=coach_headers,
            json={
                "athlete_id": athlete_id,
                "note_text": f"Test event note {uuid.uuid4().hex[:6]}",
                "interest_level": "warm"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()

        # Verify captured_by is current user's name
        expected_name = coach_williams_data["user"]["name"]
        assert data.get("captured_by") == expected_name, f"Expected captured_by '{expected_name}', got '{data.get('captured_by')}'"
        assert data.get("captured_by") != "Coach Martinez", "captured_by should NOT be hardcoded"
        print(f"✓ Event note captured_by is '{data.get('captured_by')}' (current user)")


class TestInviteFlowRegression:
    """Test full invite flow still works (create as director, accept as new coach)"""

    @pytest.fixture
    def director_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DIRECTOR_EMAIL,
            "password": DIRECTOR_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]

    def test_full_invite_flow(self, director_token):
        """Test complete invite flow: create → validate → accept"""
        unique_email = f"invited_coach_{uuid.uuid4().hex[:8]}@capymatch.com"
        invite_name = "Invited Test Coach"

        # Step 1: Director creates invite
        create_resp = requests.post(
            f"{BASE_URL}/api/invites",
            headers={"Authorization": f"Bearer {director_token}"},
            json={"email": unique_email, "name": invite_name, "team": "Basketball"}
        )
        assert create_resp.status_code == 200, f"Create invite failed: {create_resp.text}"
        invite_data = create_resp.json()
        invite_token = invite_data["token"]
        assert invite_data["status"] == "pending"
        assert invite_data["email"] == unique_email
        print(f"✓ Step 1: Invite created for {unique_email}")

        # Step 2: Validate invite token (public endpoint)
        validate_resp = requests.get(f"{BASE_URL}/api/invites/validate/{invite_token}")
        assert validate_resp.status_code == 200, f"Validate failed: {validate_resp.text}"
        validate_data = validate_resp.json()
        assert validate_data["email"] == unique_email
        assert validate_data["name"] == invite_name
        print(f"✓ Step 2: Invite validated")

        # Step 3: Accept invite (creates new coach account)
        accept_resp = requests.post(
            f"{BASE_URL}/api/invites/accept/{invite_token}",
            json={"password": "newcoach123", "name": invite_name}
        )
        assert accept_resp.status_code == 200, f"Accept invite failed: {accept_resp.text}"
        accept_data = accept_resp.json()
        assert "token" in accept_data
        assert accept_data["user"]["email"] == unique_email
        assert accept_data["user"]["role"] == "coach"  # Not director
        print(f"✓ Step 3: Invite accepted, coach account created")

        # Step 4: Verify the new coach can log in
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": unique_email,
            "password": "newcoach123"
        })
        assert login_resp.status_code == 200, f"Login failed for new coach: {login_resp.text}"
        login_data = login_resp.json()
        assert login_data["user"]["role"] == "coach"
        print(f"✓ Step 4: New coach can log in")

        # Step 5: Verify invite is now marked as accepted
        invites_resp = requests.get(
            f"{BASE_URL}/api/invites",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        invites = invites_resp.json()
        accepted_invite = next((i for i in invites if i["email"] == unique_email), None)
        assert accepted_invite is not None
        assert accepted_invite["status"] == "accepted"
        print(f"✓ Step 5: Invite status is 'accepted'")

        print("✓ Full invite flow completed successfully")


class TestLoginRegression:
    """Test that all 3 demo accounts can still log in"""

    def test_director_login(self):
        """Director can log in"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "director@capymatch.com",
            "password": "director123"
        })
        assert response.status_code == 200, f"Director login failed: {response.text}"
        data = response.json()
        assert data["user"]["role"] == "director"
        assert "Director" in data["user"]["name"]
        print("✓ Director login works")

    def test_coach_williams_login(self):
        """Coach Williams can log in"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "coach.williams@capymatch.com",
            "password": "coach123"
        })
        assert response.status_code == 200, f"Coach Williams login failed: {response.text}"
        data = response.json()
        assert data["user"]["role"] == "coach"
        assert "Williams" in data["user"]["name"]
        print("✓ Coach Williams login works")

    def test_coach_garcia_login(self):
        """Coach Garcia can log in"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "coach.garcia@capymatch.com",
            "password": "coach123"
        })
        assert response.status_code == 200, f"Coach Garcia login failed: {response.text}"
        data = response.json()
        assert data["user"]["role"] == "coach"
        assert "Garcia" in data["user"]["name"]
        print("✓ Coach Garcia login works")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

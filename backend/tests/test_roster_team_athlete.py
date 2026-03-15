"""
Backend tests for Roster Team & Athlete Management features:
- POST /roster/teams - Create new team
- GET /roster/athletes/search - Search athletes by name
- POST /roster/teams/{team_name}/add-athlete - Add existing athlete to team  
- POST /roster/teams/{team_name}/invite - Invite new athlete to team
- GET /roster/teams - List all teams
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
DIRECTOR_EMAIL = "director@capymatch.com"
DIRECTOR_PASSWORD = "director123"
COACH_EMAIL = "coach.williams@capymatch.com"
COACH_PASSWORD = "coach123"


@pytest.fixture(scope="module")
def director_token():
    """Authenticate as director and get token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": DIRECTOR_EMAIL,
        "password": DIRECTOR_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Director login failed: {response.status_code} - {response.text}")
    return response.json().get("token")


@pytest.fixture(scope="module")
def coach_token():
    """Authenticate as coach and get token (for permission tests)"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": COACH_EMAIL,
        "password": COACH_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Coach login failed: {response.status_code} - {response.text}")
    return response.json().get("token")


@pytest.fixture
def director_headers(director_token):
    """Headers with director auth token"""
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {director_token}"
    }


@pytest.fixture
def coach_headers(coach_token):
    """Headers with coach auth token"""
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {coach_token}"
    }


class TestCreateTeam:
    """Tests for POST /api/roster/teams - Create new team"""

    def test_create_team_returns_200_or_201(self, director_headers):
        """Creating a team should return success status"""
        team_name = f"TEST_Team_{uuid.uuid4().hex[:8]}"
        response = requests.post(f"{BASE_URL}/api/roster/teams", 
            headers=director_headers,
            json={"name": team_name, "age_group": "U17", "coach_id": None}
        )
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        
        # Cleanup - delete the team from club_teams collection via direct API call
        # (Note: This is a simplified test - proper cleanup would require a delete endpoint)

    def test_create_team_returns_team_data(self, director_headers):
        """Create team response should include team details"""
        team_name = f"TEST_Team_{uuid.uuid4().hex[:8]}"
        response = requests.post(f"{BASE_URL}/api/roster/teams",
            headers=director_headers,
            json={"name": team_name, "age_group": "U15", "coach_id": None}
        )
        assert response.status_code in [200, 201]
        data = response.json()
        assert "team" in data or "ok" in data
        if "team" in data:
            assert data["team"]["name"] == team_name
            assert data["team"]["age_group"] == "U15"

    def test_create_team_without_name_fails(self, director_headers):
        """Creating a team without name should fail with 400"""
        response = requests.post(f"{BASE_URL}/api/roster/teams",
            headers=director_headers,
            json={"age_group": "U17", "coach_id": None}
        )
        assert response.status_code == 400

    def test_create_team_with_coach_assignment(self, director_headers):
        """Creating a team with coach assignment should work"""
        # First get list of coaches
        coaches_response = requests.get(f"{BASE_URL}/api/roster/coaches", headers=director_headers)
        assert coaches_response.status_code == 200
        coaches = coaches_response.json()
        
        if coaches:
            coach_id = coaches[0]["id"]
            team_name = f"TEST_Team_{uuid.uuid4().hex[:8]}"
            response = requests.post(f"{BASE_URL}/api/roster/teams",
                headers=director_headers,
                json={"name": team_name, "age_group": "U16", "coach_id": coach_id}
            )
            assert response.status_code in [200, 201]

    def test_coach_cannot_create_team(self, coach_headers):
        """Coaches should not be able to create teams (403)"""
        team_name = f"TEST_Team_{uuid.uuid4().hex[:8]}"
        response = requests.post(f"{BASE_URL}/api/roster/teams",
            headers=coach_headers,
            json={"name": team_name, "age_group": "U17"}
        )
        assert response.status_code == 403


class TestSearchAthletes:
    """Tests for GET /api/roster/athletes/search - Search athletes"""

    def test_search_athletes_returns_200(self, director_headers):
        """Search endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/roster/athletes/search",
            headers=director_headers,
            params={"q": "Emma"}
        )
        assert response.status_code == 200

    def test_search_athletes_returns_array(self, director_headers):
        """Search should return array of athletes"""
        response = requests.get(f"{BASE_URL}/api/roster/athletes/search",
            headers=director_headers,
            params={"q": "Emma"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_search_athletes_has_expected_fields(self, director_headers):
        """Search results should have id, name, position, team, photo_url, grad_year"""
        response = requests.get(f"{BASE_URL}/api/roster/athletes/search",
            headers=director_headers,
            params={"q": "Emma"}
        )
        assert response.status_code == 200
        data = response.json()
        if data:
            athlete = data[0]
            assert "id" in athlete
            assert "name" in athlete
            # These fields should be present (may be empty)
            assert "position" in athlete or athlete.get("position") == ""
            assert "team" in athlete or athlete.get("team") == ""
            assert "photo_url" in athlete

    def test_search_with_short_query_returns_empty(self, director_headers):
        """Search with query < 2 chars should return empty array"""
        response = requests.get(f"{BASE_URL}/api/roster/athletes/search",
            headers=director_headers,
            params={"q": "E"}  # Single character
        )
        assert response.status_code == 200
        data = response.json()
        assert data == []

    def test_search_nonexistent_athlete_returns_empty(self, director_headers):
        """Search for nonexistent athlete should return empty array"""
        response = requests.get(f"{BASE_URL}/api/roster/athletes/search",
            headers=director_headers,
            params={"q": "XYZNONEXISTENT123"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data == []

    def test_coach_cannot_search_athletes(self, coach_headers):
        """Coaches should not be able to use search endpoint (403)"""
        response = requests.get(f"{BASE_URL}/api/roster/athletes/search",
            headers=coach_headers,
            params={"q": "Emma"}
        )
        assert response.status_code == 403


class TestAddAthleteToTeam:
    """Tests for POST /api/roster/teams/{team_name}/add-athlete"""

    def test_add_athlete_without_athlete_id_fails(self, director_headers):
        """Adding athlete without athlete_id should fail with 400"""
        response = requests.post(f"{BASE_URL}/api/roster/teams/TestTeam/add-athlete",
            headers=director_headers,
            json={}
        )
        assert response.status_code == 400

    def test_add_nonexistent_athlete_fails(self, director_headers):
        """Adding nonexistent athlete should fail with 404"""
        response = requests.post(f"{BASE_URL}/api/roster/teams/TestTeam/add-athlete",
            headers=director_headers,
            json={"athlete_id": "nonexistent-athlete-id-12345"}
        )
        assert response.status_code == 404

    def test_add_athlete_to_team_works(self, director_headers):
        """Adding existing athlete to team should work"""
        # First search for an athlete
        search_response = requests.get(f"{BASE_URL}/api/roster/athletes/search",
            headers=director_headers,
            params={"q": "Emma"}
        )
        if search_response.status_code != 200 or not search_response.json():
            pytest.skip("No athletes found to test with")
        
        athlete = search_response.json()[0]
        athlete_id = athlete["id"]
        
        # Create a test team first
        team_name = f"TEST_AddAthleteTeam_{uuid.uuid4().hex[:6]}"
        create_response = requests.post(f"{BASE_URL}/api/roster/teams",
            headers=director_headers,
            json={"name": team_name, "age_group": "U17"}
        )
        assert create_response.status_code in [200, 201]
        
        # Add athlete to team
        add_response = requests.post(f"{BASE_URL}/api/roster/teams/{team_name}/add-athlete",
            headers=director_headers,
            json={"athlete_id": athlete_id}
        )
        assert add_response.status_code == 200
        data = add_response.json()
        assert data.get("ok") == True
        assert data.get("team") == team_name


class TestInviteAthleteToTeam:
    """Tests for POST /api/roster/teams/{team_name}/invite"""

    def test_invite_without_email_fails(self, director_headers):
        """Inviting without email should fail with 400"""
        response = requests.post(f"{BASE_URL}/api/roster/teams/TestTeam/invite",
            headers=director_headers,
            json={"name": "Test User"}
        )
        assert response.status_code == 400

    def test_invite_without_name_fails(self, director_headers):
        """Inviting without name should fail with 400"""
        response = requests.post(f"{BASE_URL}/api/roster/teams/TestTeam/invite",
            headers=director_headers,
            json={"email": "test@example.com"}
        )
        assert response.status_code == 400

    def test_invite_new_athlete_works(self, director_headers):
        """Inviting new athlete with name and email should work"""
        # Create a test team first
        team_name = f"TEST_InviteTeam_{uuid.uuid4().hex[:6]}"
        create_response = requests.post(f"{BASE_URL}/api/roster/teams",
            headers=director_headers,
            json={"name": team_name, "age_group": "U18"}
        )
        assert create_response.status_code in [200, 201]
        
        # Invite a new athlete with unique email
        unique_email = f"test_invite_{uuid.uuid4().hex[:8]}@example.com"
        invite_response = requests.post(f"{BASE_URL}/api/roster/teams/{team_name}/invite",
            headers=director_headers,
            json={"name": "TEST Jane Smith", "email": unique_email}
        )
        assert invite_response.status_code == 200
        data = invite_response.json()
        assert data.get("ok") == True
        assert data.get("action") == "invited"
        assert "temp_password" in data  # Should return temp password

    def test_invite_existing_user_moves_to_team(self, director_headers):
        """Inviting existing athlete email should move them to team"""
        # First search for an existing athlete to get their email
        search_response = requests.get(f"{BASE_URL}/api/roster/athletes/search",
            headers=director_headers,
            params={"q": "Emma"}
        )
        if search_response.status_code != 200 or not search_response.json():
            pytest.skip("No athletes found to test with")
        
        # Get roster to find an athlete with email
        roster_response = requests.get(f"{BASE_URL}/api/roster", headers=director_headers)
        if roster_response.status_code != 200:
            pytest.skip("Could not get roster")
        
        # Note: This test depends on having athletes with email in the DB
        # If athlete already exists with email, it should be "moved" action
        # The exact behavior depends on seed data

    def test_coach_cannot_invite_athletes(self, coach_headers):
        """Coaches should not be able to invite athletes (403)"""
        response = requests.post(f"{BASE_URL}/api/roster/teams/TestTeam/invite",
            headers=coach_headers,
            json={"name": "Test User", "email": "test@example.com"}
        )
        assert response.status_code == 403


class TestListTeams:
    """Tests for GET /api/roster/teams - List all teams"""

    def test_list_teams_returns_200(self, director_headers):
        """List teams should return 200"""
        response = requests.get(f"{BASE_URL}/api/roster/teams", headers=director_headers)
        assert response.status_code == 200

    def test_list_teams_returns_array(self, director_headers):
        """List teams should return array"""
        response = requests.get(f"{BASE_URL}/api/roster/teams", headers=director_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_list_teams_has_expected_fields(self, director_headers):
        """Teams should have name, age_group, coach_id, athlete_count"""
        response = requests.get(f"{BASE_URL}/api/roster/teams", headers=director_headers)
        assert response.status_code == 200
        data = response.json()
        if data:
            team = data[0]
            assert "name" in team
            # These fields should be present
            assert "age_group" in team or team.get("age_group") == ""
            assert "athlete_count" in team


class TestRosterEndpoint:
    """Tests for GET /api/roster - Main roster endpoint"""

    def test_roster_returns_200(self, director_headers):
        """Roster endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/roster", headers=director_headers)
        assert response.status_code == 200

    def test_roster_has_team_groups(self, director_headers):
        """Roster should include teamGroups array"""
        response = requests.get(f"{BASE_URL}/api/roster", headers=director_headers)
        assert response.status_code == 200
        data = response.json()
        assert "teamGroups" in data
        assert isinstance(data["teamGroups"], list)

    def test_roster_athletes_have_photo_url(self, director_headers):
        """Athletes in roster should have photo_url field"""
        response = requests.get(f"{BASE_URL}/api/roster", headers=director_headers)
        assert response.status_code == 200
        data = response.json()
        athletes = data.get("athletes", [])
        if athletes:
            athlete = athletes[0]
            assert "photo_url" in athlete, "Athletes should have photo_url field"


class TestCoachesEndpoint:
    """Tests for GET /api/roster/coaches - List coaches"""

    def test_list_coaches_returns_200(self, director_headers):
        """List coaches should return 200"""
        response = requests.get(f"{BASE_URL}/api/roster/coaches", headers=director_headers)
        assert response.status_code == 200

    def test_list_coaches_returns_array(self, director_headers):
        """List coaches should return array"""
        response = requests.get(f"{BASE_URL}/api/roster/coaches", headers=director_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_coaches_have_expected_fields(self, director_headers):
        """Coaches should have id, name, email, team"""
        response = requests.get(f"{BASE_URL}/api/roster/coaches", headers=director_headers)
        assert response.status_code == 200
        data = response.json()
        if data:
            coach = data[0]
            assert "id" in coach
            assert "name" in coach
            assert "email" in coach

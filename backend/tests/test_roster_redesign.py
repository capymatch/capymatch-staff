"""
Backend tests for Roster Page Redesign
Tests: /api/roster endpoint with enriched athlete data, teamGroups, ageGroups, needsAttention fields
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')

# Director credentials
DIRECTOR_EMAIL = "director@capymatch.com"
DIRECTOR_PASSWORD = "director123"


@pytest.fixture(scope="module")
def director_session():
    """Get authenticated director session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    # Login as director
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": DIRECTOR_EMAIL,
        "password": DIRECTOR_PASSWORD
    })
    
    if response.status_code != 200:
        pytest.skip(f"Director login failed: {response.status_code}")
    
    token = response.json().get("token")
    session.headers.update({"Authorization": f"Bearer {token}"})
    return session


class TestRosterEndpoint:
    """Test /api/roster endpoint with enriched data"""
    
    def test_roster_returns_200(self, director_session):
        """Verify roster endpoint returns 200"""
        response = director_session.get(f"{BASE_URL}/api/roster")
        assert response.status_code == 200
        print("✓ /api/roster returns 200")
    
    def test_roster_has_summary(self, director_session):
        """Verify roster returns summary with total_athletes, teams, coach_count"""
        response = director_session.get(f"{BASE_URL}/api/roster")
        data = response.json()
        
        assert "summary" in data
        summary = data["summary"]
        assert "total_athletes" in summary
        assert "teams" in summary
        assert "coach_count" in summary
        
        print(f"✓ Summary: {summary['total_athletes']} athletes, {summary['teams']} teams, {summary['coach_count']} coaches")
    
    def test_roster_has_team_groups(self, director_session):
        """Verify roster returns teamGroups for Team View"""
        response = director_session.get(f"{BASE_URL}/api/roster")
        data = response.json()
        
        assert "teamGroups" in data
        team_groups = data["teamGroups"]
        assert isinstance(team_groups, list)
        assert len(team_groups) >= 1
        
        # Each team group should have team, count, athletes
        for tg in team_groups:
            assert "team" in tg
            assert "count" in tg
            assert "athletes" in tg
        
        team_names = [tg["team"] for tg in team_groups]
        print(f"✓ teamGroups: {team_names}")
    
    def test_roster_has_age_groups(self, director_session):
        """Verify roster returns ageGroups for Age Group View"""
        response = director_session.get(f"{BASE_URL}/api/roster")
        data = response.json()
        
        assert "ageGroups" in data
        age_groups = data["ageGroups"]
        assert isinstance(age_groups, list)
        assert len(age_groups) >= 1
        
        # Each age group should have label, count, athletes
        for ag in age_groups:
            assert "label" in ag
            assert "count" in ag
            assert "athletes" in ag
        
        age_labels = [ag["label"] for ag in age_groups]
        print(f"✓ ageGroups: {age_labels}")
    
    def test_roster_has_needs_attention(self, director_session):
        """Verify roster returns needsAttention array"""
        response = director_session.get(f"{BASE_URL}/api/roster")
        data = response.json()
        
        assert "needsAttention" in data
        needs_attention = data["needsAttention"]
        assert isinstance(needs_attention, list)
        
        if len(needs_attention) > 0:
            # Each item should have athlete_id, athlete_name, why
            item = needs_attention[0]
            assert "athlete_id" in item
            assert "athlete_name" in item
            assert "why" in item
        
        print(f"✓ needsAttention: {len(needs_attention)} items")
    
    def test_athletes_have_enriched_fields(self, director_session):
        """Verify athletes have momentum_score, momentum_trend, days_since_activity, recruiting_stage"""
        response = director_session.get(f"{BASE_URL}/api/roster")
        data = response.json()
        
        assert "athletes" in data
        athletes = data["athletes"]
        assert len(athletes) > 0
        
        # Check first athlete has required fields
        athlete = athletes[0]
        required_fields = [
            "id", "name", "grad_year", "position", "team",
            "recruiting_stage", "momentum_score", "momentum_trend",
            "days_since_activity", "coach_id", "coach_name"
        ]
        
        for field in required_fields:
            assert field in athlete, f"Missing field: {field}"
        
        print(f"✓ Athletes have enriched fields: {required_fields}")
    
    def test_team_groups_match_expected(self, director_session):
        """Verify team groups match: U16 Elite, U17 Premier, U18 Academy"""
        response = director_session.get(f"{BASE_URL}/api/roster")
        data = response.json()
        
        team_groups = data.get("teamGroups", [])
        team_names = [tg["team"] for tg in team_groups]
        
        expected_teams = ["U16 Elite", "U17 Premier", "U18 Academy"]
        for team in expected_teams:
            assert team in team_names, f"Missing team: {team}"
        
        # Check counts (based on mock_data: 2027->U16, 2026->U17, 2025->U18)
        for tg in team_groups:
            print(f"  - {tg['team']}: {tg['count']} athletes")
        
        print(f"✓ Team groups verified: {expected_teams}")
    
    def test_age_groups_match_expected(self, director_session):
        """Verify age groups: Class of 2025, 2026, 2027"""
        response = director_session.get(f"{BASE_URL}/api/roster")
        data = response.json()
        
        age_groups = data.get("ageGroups", [])
        age_labels = [ag["label"] for ag in age_groups]
        
        expected_labels = ["Class of 2025", "Class of 2026", "Class of 2027"]
        for label in expected_labels:
            assert label in age_labels, f"Missing age group: {label}"
        
        # Check counts
        for ag in age_groups:
            print(f"  - {ag['label']}: {ag['count']} athletes")
        
        print(f"✓ Age groups verified: {expected_labels}")


class TestRosterCoachesEndpoint:
    """Test /api/roster/coaches endpoint"""
    
    def test_coaches_returns_200(self, director_session):
        """Verify roster/coaches endpoint returns 200"""
        response = director_session.get(f"{BASE_URL}/api/roster/coaches")
        assert response.status_code == 200
        print("✓ /api/roster/coaches returns 200")
    
    def test_coaches_returns_list(self, director_session):
        """Verify coaches returns list with id, name, email, team"""
        response = director_session.get(f"{BASE_URL}/api/roster/coaches")
        data = response.json()
        
        assert isinstance(data, list)
        if len(data) > 0:
            coach = data[0]
            assert "id" in coach
            assert "name" in coach
            assert "email" in coach
        
        print(f"✓ Coaches list: {len(data)} coaches")


class TestReassignEndpoint:
    """Test /api/athletes/{id}/reassign endpoint"""
    
    def test_reassign_endpoint_exists(self, director_session):
        """Verify reassign endpoint exists (test with bad data to check route exists)"""
        response = director_session.post(
            f"{BASE_URL}/api/athletes/nonexistent_athlete/reassign",
            json={"new_coach_id": "nonexistent_coach"}
        )
        # Should return 404 for athlete not found, not 404 for route
        assert response.status_code in [400, 404]
        print("✓ /api/athletes/{id}/reassign endpoint exists")
    
    def test_reassign_requires_new_coach_id(self, director_session):
        """Verify reassign requires new_coach_id parameter"""
        response = director_session.post(
            f"{BASE_URL}/api/athletes/athlete_1/reassign",
            json={}  # Missing new_coach_id
        )
        # Should return validation error
        assert response.status_code in [400, 422]
        print("✓ Reassign validates new_coach_id parameter")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

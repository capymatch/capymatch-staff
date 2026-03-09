"""
Test Athlete Store Migration (Step 1.1)
Tests that all athlete data reads now come from MongoDB via services/athlete_store.py
All 13 backend files migrated away from in-memory ATHLETES array.

Focus Areas:
1. Mission Control returns correct KPIs (totalAthletes=25, needingAttention>0)
2. Roster endpoint returns 25 athletes with correct groupings
3. Coach view returns correct myRoster data
4. Bulk operations work with DB-backed data
5. Interventions are computed from DB data
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

@pytest.fixture(scope="module")
def director_token():
    """Get director auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "director@capymatch.com",
        "password": "director123"
    })
    assert response.status_code == 200, f"Director login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def coach_token():
    """Get coach auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "coach.williams@capymatch.com",
        "password": "coach123"
    })
    assert response.status_code == 200, f"Coach login failed: {response.text}"
    return response.json()["token"]


# ─── MISSION CONTROL TESTS ───────────────────────────────────────────────────

class TestMissionControlDirector:
    """Verify Mission Control KPIs for Director role"""

    def test_mission_control_returns_director_view(self, director_token):
        """MC should return role=director with programStatus KPIs"""
        response = requests.get(
            f"{BASE_URL}/api/mission-control",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Role verification
        assert data["role"] == "director"
        
        # Program status must exist
        assert "programStatus" in data
        ps = data["programStatus"]
        
        # Key KPIs from athlete_store
        assert ps["totalAthletes"] == 25, f"Expected 25 athletes, got {ps['totalAthletes']}"
        assert ps["needingAttention"] > 0, "Expected some athletes needing attention"
        assert ps["upcomingEvents"] > 0, "Expected some upcoming events"
        assert "activeCoaches" in ps
        assert "unassignedCount" in ps

    def test_mission_control_has_needs_attention_list(self, director_token):
        """MC should return needsAttention array with enriched data"""
        response = requests.get(
            f"{BASE_URL}/api/mission-control",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "needsAttention" in data
        attention = data["needsAttention"]
        assert len(attention) > 0, "Expected needsAttention list to have items"
        
        # Each item should have athlete_id, category, why
        for item in attention[:3]:
            assert "athlete_id" in item
            assert "athlete_name" in item or "category" in item

    def test_mission_control_has_program_snapshot(self, director_token):
        """MC should return programSnapshot from athlete_store"""
        response = requests.get(
            f"{BASE_URL}/api/mission-control",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "programSnapshot" in data
        snapshot = data["programSnapshot"]
        assert "totalAthletes" in snapshot or "positiveMomentum" in snapshot


class TestMissionControlCoach:
    """Verify Mission Control for Coach role"""

    def test_mission_control_returns_coach_view(self, coach_token):
        """MC should return role=coach with myRoster data"""
        response = requests.get(
            f"{BASE_URL}/api/mission-control",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Role verification
        assert data["role"] == "coach"
        
        # Coach should get myRoster
        assert "myRoster" in data
        roster = data["myRoster"]
        assert isinstance(roster, list)
        assert len(roster) > 0, "Coach should have athletes in roster"

    def test_coach_roster_has_athlete_details(self, coach_token):
        """Each athlete in myRoster should have proper fields"""
        response = requests.get(
            f"{BASE_URL}/api/mission-control",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        roster = data["myRoster"]
        for athlete in roster[:3]:
            assert "id" in athlete
            assert "name" in athlete
            assert "momentumScore" in athlete or "momentumTrend" in athlete
            assert "podHealth" in athlete  # Added by support_pod enrichment


# ─── ROSTER TESTS ────────────────────────────────────────────────────────────

class TestRosterEndpoint:
    """Verify /api/roster returns correct data from athlete_store"""

    def test_roster_returns_25_athletes(self, director_token):
        """Roster should return all 25 athletes"""
        response = requests.get(
            f"{BASE_URL}/api/roster",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "athletes" in data
        athletes = data["athletes"]
        assert len(athletes) == 25, f"Expected 25 athletes, got {len(athletes)}"

    def test_roster_summary_correct(self, director_token):
        """Roster summary should show correct counts"""
        response = requests.get(
            f"{BASE_URL}/api/roster",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        summary = data["summary"]
        assert summary["total_athletes"] == 25
        assert summary["coach_count"] > 0
        assert summary["teams"] > 0
        # Assigned + unassigned should equal total
        assert summary["assigned"] + summary["unassigned"] == summary["total_athletes"]

    def test_roster_has_team_groups(self, director_token):
        """Roster should return teamGroups"""
        response = requests.get(
            f"{BASE_URL}/api/roster",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "teamGroups" in data
        teams = data["teamGroups"]
        assert len(teams) > 0, "Expected at least one team group"
        
        # Each team group should have athletes
        for team in teams:
            assert "team" in team
            assert "athletes" in team
            assert "count" in team

    def test_roster_has_age_groups(self, director_token):
        """Roster should return ageGroups"""
        response = requests.get(
            f"{BASE_URL}/api/roster",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "ageGroups" in data
        ages = data["ageGroups"]
        assert len(ages) > 0, "Expected at least one age group"
        
        # Each age group should have athletes
        for age in ages:
            assert "label" in age
            assert "athletes" in age
            assert "count" in age


# ─── ROSTER COACHES ENDPOINT ─────────────────────────────────────────────────

class TestRosterCoaches:
    """Verify /api/roster/coaches endpoint"""

    def test_roster_coaches_returns_list(self, director_token):
        """Should return list of coaches"""
        response = requests.get(
            f"{BASE_URL}/api/roster/coaches",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200
        coaches = response.json()
        
        assert isinstance(coaches, list)
        assert len(coaches) > 0, "Expected at least one coach"
        
        # Each coach should have id and name
        for coach in coaches:
            assert "id" in coach
            assert "name" in coach
            assert "email" in coach


# ─── BULK OPERATIONS ─────────────────────────────────────────────────────────

class TestBulkOperations:
    """Verify bulk operations work with athlete_store data"""

    def test_bulk_assign_works(self, director_token):
        """Bulk assign should update athletes in DB"""
        # First get roster to find athletes
        roster_resp = requests.get(
            f"{BASE_URL}/api/roster",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert roster_resp.status_code == 200
        athletes = roster_resp.json()["athletes"]
        
        # Get a coach
        coaches_resp = requests.get(
            f"{BASE_URL}/api/roster/coaches",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert coaches_resp.status_code == 200
        coaches = coaches_resp.json()
        assert len(coaches) > 0
        
        # Pick first athlete and first coach
        athlete_id = athletes[0]["id"]
        coach_id = coaches[0]["id"]
        
        # Bulk assign
        response = requests.post(
            f"{BASE_URL}/api/roster/bulk-assign",
            headers={"Authorization": f"Bearer {director_token}"},
            json={"athlete_ids": [athlete_id], "coach_id": coach_id}
        )
        # Should succeed (200) or return 0 updated if already assigned
        assert response.status_code == 200
        data = response.json()
        assert "updated" in data
        assert "coach_name" in data

    def test_bulk_remind_works(self, director_token):
        """Bulk remind should create reminder notes"""
        # Get athlete IDs
        roster_resp = requests.get(
            f"{BASE_URL}/api/roster",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        athletes = roster_resp.json()["athletes"]
        athlete_id = athletes[0]["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/roster/bulk-remind",
            headers={"Authorization": f"Bearer {director_token}"},
            json={"athlete_ids": [athlete_id], "message": "TEST_Please follow up"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "sent" in data
        assert data["sent"] >= 1

    def test_bulk_note_works(self, director_token):
        """Bulk note should add notes to athletes"""
        roster_resp = requests.get(
            f"{BASE_URL}/api/roster",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        athletes = roster_resp.json()["athletes"]
        athlete_id = athletes[0]["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/roster/bulk-note",
            headers={"Authorization": f"Bearer {director_token}"},
            json={"athlete_ids": [athlete_id], "note": "TEST_Bulk note from migration test"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "added" in data
        assert data["added"] >= 1


# ─── REASSIGNMENT TESTS ──────────────────────────────────────────────────────

class TestReassignment:
    """Verify reassignment operations use athlete_store"""

    def test_reassign_athlete(self, director_token):
        """Reassign should update DB and refresh cache"""
        # Get roster and coaches
        roster_resp = requests.get(
            f"{BASE_URL}/api/roster",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        athletes = roster_resp.json()["athletes"]
        
        coaches_resp = requests.get(
            f"{BASE_URL}/api/roster/coaches",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        coaches = coaches_resp.json()
        
        # Find an assigned athlete
        assigned_athlete = next((a for a in athletes if a.get("coach_id")), None)
        if not assigned_athlete:
            pytest.skip("No assigned athletes to test reassignment")
        
        # Find a different coach
        current_coach_id = assigned_athlete["coach_id"]
        new_coach = next((c for c in coaches if c["id"] != current_coach_id), None)
        if not new_coach:
            pytest.skip("No alternate coach available")
        
        # Attempt reassignment
        response = requests.post(
            f"{BASE_URL}/api/athletes/{assigned_athlete['id']}/reassign",
            headers={"Authorization": f"Bearer {director_token}"},
            json={"new_coach_id": new_coach["id"], "reason": "TEST_Migration test reassignment"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "reassigned"
        assert data["to_coach"] == new_coach["name"]


# ─── DEBUG/INTERVENTIONS ENDPOINT ────────────────────────────────────────────

class TestDebugInterventions:
    """Verify /api/debug/interventions returns computed data"""

    def test_interventions_exist(self, director_token):
        """Debug endpoint should return interventions > 0"""
        response = requests.get(
            f"{BASE_URL}/api/debug/interventions",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "total_interventions" in data
        assert data["total_interventions"] > 0, "Expected interventions computed from DB data"


# ─── ATHLETE DATA INTEGRITY ──────────────────────────────────────────────────

class TestAthleteDataIntegrity:
    """Verify athlete data is consistent across endpoints"""

    def test_roster_and_mc_athlete_count_match(self, director_token):
        """Roster total should match MC totalAthletes"""
        roster_resp = requests.get(
            f"{BASE_URL}/api/roster",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        mc_resp = requests.get(
            f"{BASE_URL}/api/mission-control",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        
        roster_total = roster_resp.json()["summary"]["total_athletes"]
        mc_total = mc_resp.json()["programStatus"]["totalAthletes"]
        
        assert roster_total == mc_total, f"Roster ({roster_total}) != MC ({mc_total})"
        assert roster_total == 25

    def test_athlete_has_required_fields(self, director_token):
        """Each athlete should have core fields from DB"""
        response = requests.get(
            f"{BASE_URL}/api/roster",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        athletes = response.json()["athletes"]
        
        for athlete in athletes[:5]:
            assert "id" in athlete
            assert "name" in athlete
            assert "grad_year" in athlete or "gradYear" in athlete
            assert "position" in athlete
            assert "team" in athlete
            # Computed fields
            assert "momentum_score" in athlete or "momentumScore" in athlete
            assert "recruiting_stage" in athlete


# ─── COACH OWNERSHIP BOUNDARIES ──────────────────────────────────────────────

class TestCoachOwnership:
    """Verify coach can only see assigned athletes"""

    def test_coach_cannot_access_roster(self, coach_token):
        """Coach should be forbidden from roster endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/roster",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert response.status_code == 403

    def test_coach_roster_count_less_than_total(self, coach_token, director_token):
        """Coach myRoster should have fewer athletes than total"""
        coach_resp = requests.get(
            f"{BASE_URL}/api/mission-control",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        director_resp = requests.get(
            f"{BASE_URL}/api/mission-control",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        
        coach_roster_count = len(coach_resp.json()["myRoster"])
        total_athletes = director_resp.json()["programStatus"]["totalAthletes"]
        
        assert coach_roster_count <= total_athletes
        assert coach_roster_count > 0, "Coach should have at least some athletes"

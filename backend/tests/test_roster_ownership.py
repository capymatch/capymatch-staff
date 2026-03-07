"""
Test: Data Ownership Refinement - Roster, Reassignment, Unassign APIs
Features tested:
1. GET /api/roster - Director sees all athletes grouped by coach
2. GET /api/roster - Coach gets 403
3. GET /api/roster/coaches - Returns list of coaches
4. POST /api/athletes/{athlete_id}/reassign - Reassign between coaches
5. POST /api/athletes/{athlete_id}/unassign - Remove coach assignment
6. GET /api/athletes/{athlete_id}/reassignment-history - Audit log

Test credentials:
- Director: director@capymatch.com / director123
- Coach Williams: coach.williams@capymatch.com / coach123

Important: After testing reassign/unassign, athletes are restored to original coaches.
athlete_3 -> coach-williams (original)
athlete_4 -> coach-garcia (original)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")


class TestRosterOwnershipAPIs:
    """Test all roster and data ownership refinement endpoints"""

    @pytest.fixture(scope="class")
    def director_token(self):
        """Get director authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "director@capymatch.com", "password": "director123"}
        )
        assert response.status_code == 200, f"Director login failed: {response.text}"
        return response.json()["token"]

    @pytest.fixture(scope="class")
    def coach_token(self):
        """Get coach authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "coach.williams@capymatch.com", "password": "coach123"}
        )
        assert response.status_code == 200, f"Coach login failed: {response.text}"
        return response.json()["token"]

    @pytest.fixture(scope="class")
    def director_headers(self, director_token):
        return {"Authorization": f"Bearer {director_token}"}

    @pytest.fixture(scope="class")
    def coach_headers(self, coach_token):
        return {"Authorization": f"Bearer {coach_token}"}

    # ==================== GET /api/roster ====================
    def test_roster_director_access(self, director_headers):
        """Director can view full roster with athletes grouped by coach"""
        response = requests.get(f"{BASE_URL}/api/roster", headers=director_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        # Validate structure
        assert "groups" in data, "Response should have 'groups'"
        assert "summary" in data, "Response should have 'summary'"
        
        # Validate summary stats
        summary = data["summary"]
        assert "total_athletes" in summary
        assert "assigned" in summary
        assert "unassigned" in summary
        assert "coach_count" in summary
        assert summary["total_athletes"] >= 0
        assert summary["coach_count"] >= 0
        
        # Validate groups structure
        groups = data["groups"]
        assert isinstance(groups, list), "Groups should be a list"
        if len(groups) > 0:
            group = groups[0]
            assert "coach_id" in group
            assert "coach_name" in group
            assert "athletes" in group
            assert "count" in group
            assert isinstance(group["athletes"], list)

    def test_roster_coach_forbidden(self, coach_headers):
        """Coach should get 403 forbidden on roster endpoint"""
        response = requests.get(f"{BASE_URL}/api/roster", headers=coach_headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        assert "director" in response.json().get("detail", "").lower()

    def test_roster_no_auth(self):
        """Roster without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/roster")
        assert response.status_code == 401

    # ==================== GET /api/roster/coaches ====================
    def test_roster_coaches_list(self, director_headers):
        """Director can get list of all coaches"""
        response = requests.get(f"{BASE_URL}/api/roster/coaches", headers=director_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        coaches = response.json()
        assert isinstance(coaches, list), "Should return list of coaches"
        if len(coaches) > 0:
            coach = coaches[0]
            assert "id" in coach
            assert "name" in coach
            assert "email" in coach

    def test_roster_coaches_forbidden_for_coach(self, coach_headers):
        """Coach cannot access coaches list"""
        response = requests.get(f"{BASE_URL}/api/roster/coaches", headers=coach_headers)
        assert response.status_code == 403

    # ==================== POST /api/athletes/{id}/reassign ====================
    def test_reassign_athlete_success(self, director_headers):
        """Director can reassign athlete_3 from coach-williams to coach-garcia"""
        # Reassign athlete_3 to coach-garcia
        response = requests.post(
            f"{BASE_URL}/api/athletes/athlete_3/reassign",
            json={"new_coach_id": "coach-garcia", "reason": "testing_reassignment"},
            headers=director_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["status"] == "reassigned"
        assert data["athlete_id"] == "athlete_3"
        assert data["to_coach"] is not None
        assert "log_entry" in data
        assert data["log_entry"]["type"] == "reassign"
        assert data["log_entry"]["to_coach_id"] == "coach-garcia"

    def test_reassign_same_coach_error(self, director_headers):
        """Reassigning to same coach should return 400"""
        # athlete_3 is now with coach-garcia from previous test
        response = requests.post(
            f"{BASE_URL}/api/athletes/athlete_3/reassign",
            json={"new_coach_id": "coach-garcia"},
            headers=director_headers
        )
        assert response.status_code == 400
        assert "already assigned" in response.json().get("detail", "").lower()

    def test_reassign_invalid_athlete(self, director_headers):
        """Reassigning non-existent athlete returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/athletes/invalid_athlete_id/reassign",
            json={"new_coach_id": "coach-garcia"},
            headers=director_headers
        )
        assert response.status_code == 404

    def test_reassign_invalid_coach(self, director_headers):
        """Reassigning to non-existent coach returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/athletes/athlete_1/reassign",
            json={"new_coach_id": "invalid_coach_id"},
            headers=director_headers
        )
        assert response.status_code == 404

    def test_reassign_forbidden_for_coach(self, coach_headers):
        """Coach cannot reassign athletes"""
        response = requests.post(
            f"{BASE_URL}/api/athletes/athlete_1/reassign",
            json={"new_coach_id": "coach-garcia"},
            headers=coach_headers
        )
        assert response.status_code == 403

    # ==================== POST /api/athletes/{id}/unassign ====================
    def test_unassign_athlete_success(self, director_headers):
        """Director can unassign athlete_4"""
        response = requests.post(
            f"{BASE_URL}/api/athletes/athlete_4/unassign",
            json={"reason": "manually_unassigned"},
            headers=director_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["status"] == "unassigned"
        assert data["athlete_id"] == "athlete_4"
        assert "from_coach" in data
        assert "log_entry" in data
        assert data["log_entry"]["type"] == "unassign"
        assert data["log_entry"]["to_coach_id"] is None

    def test_roster_shows_unassigned_group(self, director_headers):
        """After unassign, roster should show Unassigned group with athlete_4"""
        response = requests.get(f"{BASE_URL}/api/roster", headers=director_headers)
        assert response.status_code == 200
        
        data = response.json()
        groups = data["groups"]
        
        # Find unassigned group (coach_id is None)
        unassigned_groups = [g for g in groups if g["coach_id"] is None]
        assert len(unassigned_groups) > 0, "Should have an Unassigned group"
        
        unassigned_group = unassigned_groups[0]
        assert unassigned_group["coach_name"] == "Unassigned"
        
        # Check athlete_4 is in unassigned group
        athlete_ids = [a["id"] for a in unassigned_group["athletes"]]
        assert "athlete_4" in athlete_ids, "athlete_4 should be in Unassigned group"
        
        # Check reason label
        athlete_4 = next((a for a in unassigned_group["athletes"] if a["id"] == "athlete_4"), None)
        assert athlete_4 is not None
        assert athlete_4.get("unassigned_reason") == "manually_unassigned"

    def test_unassign_already_unassigned_error(self, director_headers):
        """Unassigning already unassigned athlete returns 400"""
        # athlete_4 is already unassigned from previous test
        response = requests.post(
            f"{BASE_URL}/api/athletes/athlete_4/unassign",
            json={"reason": "test"},
            headers=director_headers
        )
        assert response.status_code == 400
        assert "already unassigned" in response.json().get("detail", "").lower()

    def test_unassign_forbidden_for_coach(self, coach_headers):
        """Coach cannot unassign athletes"""
        response = requests.post(
            f"{BASE_URL}/api/athletes/athlete_1/unassign",
            json={"reason": "test"},
            headers=coach_headers
        )
        assert response.status_code == 403

    # ==================== Reassign from Unassigned State ====================
    def test_reassign_from_unassigned(self, director_headers):
        """Director can reassign athlete_4 from unassigned state"""
        response = requests.post(
            f"{BASE_URL}/api/athletes/athlete_4/reassign",
            json={"new_coach_id": "coach-garcia", "reason": "reassign_from_unassigned"},
            headers=director_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["status"] == "reassigned"
        assert data["athlete_id"] == "athlete_4"
        assert data["from_coach"] is None  # Was unassigned
        assert data["to_coach"] is not None
        assert data["log_entry"]["from_coach_id"] is None

    # ==================== GET /api/athletes/{id}/reassignment-history ====================
    def test_reassignment_history_has_entries(self, director_headers):
        """Reassignment history for athlete_3 should have log entries"""
        response = requests.get(
            f"{BASE_URL}/api/athletes/athlete_3/reassignment-history",
            headers=director_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        history = response.json()
        assert isinstance(history, list)
        assert len(history) > 0, "Should have at least one history entry from reassignment tests"
        
        # Validate entry structure
        entry = history[0]
        assert "id" in entry
        assert "athlete_id" in entry
        assert "type" in entry  # 'reassign' or 'unassign'
        assert "from_coach_id" in entry
        assert "to_coach_id" in entry
        assert "reassigned_by" in entry
        assert "created_at" in entry

    def test_reassignment_history_for_athlete_4(self, director_headers):
        """Athlete_4 should have unassign and reassign entries"""
        response = requests.get(
            f"{BASE_URL}/api/athletes/athlete_4/reassignment-history",
            headers=director_headers
        )
        assert response.status_code == 200
        
        history = response.json()
        assert len(history) >= 2, "Should have unassign + reassign entries"
        
        # Check for both types
        types = [e["type"] for e in history]
        assert "unassign" in types, "Should have unassign entry"
        assert "reassign" in types, "Should have reassign entry"

    def test_reassignment_history_forbidden_for_coach(self, coach_headers):
        """Coach cannot access reassignment history"""
        response = requests.get(
            f"{BASE_URL}/api/athletes/athlete_1/reassignment-history",
            headers=coach_headers
        )
        assert response.status_code == 403

    # ==================== CLEANUP: Restore Original Assignments ====================
    def test_cleanup_restore_athlete_3_to_williams(self, director_headers):
        """Restore athlete_3 to coach-williams (original assignment)"""
        response = requests.post(
            f"{BASE_URL}/api/athletes/athlete_3/reassign",
            json={"new_coach_id": "coach-williams", "reason": "test_cleanup"},
            headers=director_headers
        )
        assert response.status_code == 200, f"Failed to restore athlete_3: {response.text}"

    def test_cleanup_verify_athlete_3_restored(self, director_headers):
        """Verify athlete_3 is back with coach-williams"""
        response = requests.get(f"{BASE_URL}/api/roster", headers=director_headers)
        assert response.status_code == 200
        
        data = response.json()
        groups = data["groups"]
        
        # Find coach-williams group
        williams_groups = [g for g in groups if g["coach_id"] == "coach-williams"]
        assert len(williams_groups) > 0, "Coach Williams should be in groups"
        
        williams_group = williams_groups[0]
        athlete_ids = [a["id"] for a in williams_group["athletes"]]
        assert "athlete_3" in athlete_ids, "athlete_3 should be back with coach-williams"

    def test_cleanup_verify_athlete_4_with_garcia(self, director_headers):
        """Verify athlete_4 is with coach-garcia (restored from unassigned)"""
        response = requests.get(f"{BASE_URL}/api/roster", headers=director_headers)
        assert response.status_code == 200
        
        data = response.json()
        groups = data["groups"]
        
        # Find coach-garcia group
        garcia_groups = [g for g in groups if g["coach_id"] == "coach-garcia"]
        assert len(garcia_groups) > 0, "Coach Garcia should be in groups"
        
        garcia_group = garcia_groups[0]
        athlete_ids = [a["id"] for a in garcia_group["athletes"]]
        assert "athlete_4" in athlete_ids, "athlete_4 should be with coach-garcia"

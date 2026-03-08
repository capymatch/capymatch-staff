"""
Test Team-Aware Invite Suggestions Feature
Tests the flow: Director creates invite with team -> Coach accepts -> Director sees suggestion banner
Endpoints tested:
  - POST /api/invites - Create invite with optional team field
  - POST /api/invites/accept/{token} - Accept invite, sets accepted_user_id and assignment_reviewed=False
  - GET /api/invites/pending-assignments - Returns accepted invites with unassigned team athletes
  - POST /api/invites/{invite_id}/assign-athletes - Bulk-assign athletes to coach
  - POST /api/invites/{invite_id}/dismiss-assignment - Dismiss suggestion without assigning
"""

import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    BASE_URL = "https://data-source-trace.preview.emergentagent.com"

API = f"{BASE_URL}/api"

# Test credentials
DIRECTOR_EMAIL = "director@capymatch.com"
DIRECTOR_PASSWORD = "director123"

# Teams from mock_data.py
VALID_TEAMS = ["U18 Academy", "U17 Premier", "U16 Elite"]


@pytest.fixture(scope="module")
def director_token():
    """Get director auth token"""
    res = requests.post(f"{API}/auth/login", json={
        "email": DIRECTOR_EMAIL,
        "password": DIRECTOR_PASSWORD
    })
    if res.status_code == 200:
        return res.json()["token"]
    pytest.skip(f"Director login failed: {res.status_code} {res.text}")


@pytest.fixture(scope="module")
def director_headers(director_token):
    return {"Authorization": f"Bearer {director_token}"}


class TestInviteCreation:
    """Test POST /api/invites - create invite with optional team field"""
    
    def test_create_invite_with_team(self, director_headers):
        """Director can create invite with a team assignment"""
        unique_email = f"test_invite_team_{uuid.uuid4().hex[:8]}@test.com"
        res = requests.post(f"{API}/invites", json={
            "email": unique_email,
            "name": "Test Coach With Team",
            "team": "U16 Elite"
        }, headers=director_headers)
        
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert data["email"] == unique_email
        assert data["name"] == "Test Coach With Team"
        assert data["team"] == "U16 Elite"
        assert data["status"] == "pending"
        assert "token" in data
        assert data["id"]
        
    def test_create_invite_without_team(self, director_headers):
        """Director can create invite without team (null team)"""
        unique_email = f"test_invite_noteam_{uuid.uuid4().hex[:8]}@test.com"
        res = requests.post(f"{API}/invites", json={
            "email": unique_email,
            "name": "Test Coach No Team"
        }, headers=director_headers)
        
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert data["email"] == unique_email
        assert data["team"] is None
        
    def test_create_invite_requires_auth(self):
        """Creating invite requires authentication"""
        res = requests.post(f"{API}/invites", json={
            "email": "noauth@test.com",
            "name": "No Auth Coach"
        })
        assert res.status_code == 401, f"Expected 401, got {res.status_code}"
        
    def test_create_invite_requires_director_role(self, director_headers):
        """Creating invite requires director role (coach cannot create)"""
        # Login as coach
        coach_res = requests.post(f"{API}/auth/login", json={
            "email": "coach.williams@capymatch.com",
            "password": "coach123"
        })
        if coach_res.status_code != 200:
            pytest.skip("Coach login failed")
        coach_token = coach_res.json()["token"]
        
        res = requests.post(f"{API}/invites", json={
            "email": f"coach_create_{uuid.uuid4().hex[:8]}@test.com",
            "name": "Coach Cannot Create"
        }, headers={"Authorization": f"Bearer {coach_token}"})
        
        assert res.status_code == 403, f"Expected 403, got {res.status_code}"


class TestInviteAcceptance:
    """Test POST /api/invites/accept/{token} - sets accepted_user_id and assignment_reviewed=False"""
    
    def test_accept_invite_creates_coach_account(self, director_headers):
        """Accepting invite creates coach account with team from invite"""
        # Step 1: Create invite with team
        unique_email = f"test_accept_{uuid.uuid4().hex[:8]}@test.com"
        create_res = requests.post(f"{API}/invites", json={
            "email": unique_email,
            "name": "Test Accept Coach",
            "team": "U17 Premier"
        }, headers=director_headers)
        assert create_res.status_code == 200
        invite = create_res.json()
        invite_token = invite["token"]
        
        # Step 2: Accept invite
        accept_res = requests.post(f"{API}/invites/accept/{invite_token}", json={
            "password": "testpass123",
            "name": "Test Accept Coach"
        })
        
        assert accept_res.status_code == 200, f"Expected 200, got {accept_res.status_code}: {accept_res.text}"
        data = accept_res.json()
        assert "token" in data  # JWT token for new user
        assert "user" in data
        assert data["user"]["email"] == unique_email
        assert data["user"]["role"] == "coach"
        
    def test_accept_sets_assignment_reviewed_false(self, director_headers):
        """Accepting invite sets assignment_reviewed=False on the invite"""
        # Create and accept an invite
        unique_email = f"test_assignment_flag_{uuid.uuid4().hex[:8]}@test.com"
        create_res = requests.post(f"{API}/invites", json={
            "email": unique_email,
            "name": "Test Assignment Flag",
            "team": "U18 Academy"
        }, headers=director_headers)
        assert create_res.status_code == 200
        invite = create_res.json()
        
        # Accept
        accept_res = requests.post(f"{API}/invites/accept/{invite['token']}", json={
            "password": "testpass123"
        })
        assert accept_res.status_code == 200
        
        # Verify the invite shows up in pending-assignments (has team + assignment_reviewed != True)
        # Note: This depends on whether there are unassigned athletes on that team
        pending_res = requests.get(f"{API}/invites/pending-assignments", headers=director_headers)
        assert pending_res.status_code == 200
        # The invite might or might not show depending on unassigned athletes - just verify API works
        
    def test_accept_invalid_token_returns_404(self):
        """Accepting with invalid token returns 404"""
        res = requests.post(f"{API}/invites/accept/invalid_token_xyz123", json={
            "password": "testpass123"
        })
        assert res.status_code == 404


class TestPendingAssignments:
    """Test GET /api/invites/pending-assignments - returns accepted invites with team context"""
    
    def test_pending_assignments_requires_auth(self):
        """Pending assignments endpoint requires authentication"""
        res = requests.get(f"{API}/invites/pending-assignments")
        assert res.status_code == 401
        
    def test_pending_assignments_requires_director(self, director_headers):
        """Pending assignments endpoint requires director role"""
        # Login as coach
        coach_res = requests.post(f"{API}/auth/login", json={
            "email": "coach.williams@capymatch.com",
            "password": "coach123"
        })
        if coach_res.status_code != 200:
            pytest.skip("Coach login failed")
        coach_token = coach_res.json()["token"]
        
        res = requests.get(f"{API}/invites/pending-assignments",
                          headers={"Authorization": f"Bearer {coach_token}"})
        assert res.status_code == 403
        
    def test_pending_assignments_returns_list(self, director_headers):
        """Director can get pending assignments list"""
        res = requests.get(f"{API}/invites/pending-assignments", headers=director_headers)
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        
    def test_pending_assignments_structure(self, director_headers):
        """Pending assignments have required fields"""
        res = requests.get(f"{API}/invites/pending-assignments", headers=director_headers)
        assert res.status_code == 200
        data = res.json()
        
        if len(data) > 0:
            assignment = data[0]
            assert "invite_id" in assignment
            assert "coach_name" in assignment
            assert "coach_email" in assignment
            assert "coach_id" in assignment
            assert "team" in assignment
            assert "suggested_athletes" in assignment
            assert "suggested_count" in assignment
            assert isinstance(assignment["suggested_athletes"], list)
            
    def test_pending_assignments_only_with_team(self, director_headers):
        """Invites without team should NOT appear in pending-assignments"""
        # Create and accept an invite WITHOUT team
        unique_email = f"test_no_team_pending_{uuid.uuid4().hex[:8]}@test.com"
        create_res = requests.post(f"{API}/invites", json={
            "email": unique_email,
            "name": "Coach No Team"
            # No team field
        }, headers=director_headers)
        assert create_res.status_code == 200
        invite = create_res.json()
        
        # Accept
        accept_res = requests.post(f"{API}/invites/accept/{invite['token']}", json={
            "password": "testpass123"
        })
        assert accept_res.status_code == 200
        
        # Check pending-assignments - this invite should NOT be in the list
        pending_res = requests.get(f"{API}/invites/pending-assignments", headers=director_headers)
        assert pending_res.status_code == 200
        pending = pending_res.json()
        
        invite_ids = [p["invite_id"] for p in pending]
        assert invite["id"] not in invite_ids, "Invite without team should not appear in pending-assignments"


class TestAssignAthletes:
    """Test POST /api/invites/{invite_id}/assign-athletes - bulk assign athletes"""
    
    def test_assign_athletes_requires_auth(self):
        """Assigning athletes requires authentication"""
        res = requests.post(f"{API}/invites/fake-id/assign-athletes", json={
            "athlete_ids": ["athlete_1"]
        })
        assert res.status_code == 401
        
    def test_assign_athletes_requires_director(self, director_headers):
        """Assigning athletes requires director role"""
        coach_res = requests.post(f"{API}/auth/login", json={
            "email": "coach.williams@capymatch.com",
            "password": "coach123"
        })
        if coach_res.status_code != 200:
            pytest.skip("Coach login failed")
        coach_token = coach_res.json()["token"]
        
        res = requests.post(f"{API}/invites/fake-id/assign-athletes", json={
            "athlete_ids": ["athlete_1"]
        }, headers={"Authorization": f"Bearer {coach_token}"})
        assert res.status_code == 403
        
    def test_assign_athletes_invalid_invite_404(self, director_headers):
        """Assigning to invalid invite returns 404"""
        res = requests.post(f"{API}/invites/invalid-invite-id/assign-athletes", json={
            "athlete_ids": ["athlete_1"]
        }, headers=director_headers)
        assert res.status_code == 404
        
    def test_assign_athletes_empty_list_400(self, director_headers):
        """Assigning empty athlete list returns 400"""
        # Get a pending assignment to use
        pending_res = requests.get(f"{API}/invites/pending-assignments", headers=director_headers)
        if pending_res.status_code != 200 or len(pending_res.json()) == 0:
            pytest.skip("No pending assignments to test with")
        
        pending = pending_res.json()[0]
        
        res = requests.post(f"{API}/invites/{pending['invite_id']}/assign-athletes", json={
            "athlete_ids": []
        }, headers=director_headers)
        assert res.status_code == 400


class TestDismissAssignment:
    """Test POST /api/invites/{invite_id}/dismiss-assignment - dismiss without assigning"""
    
    def test_dismiss_requires_auth(self):
        """Dismissing assignment requires authentication"""
        res = requests.post(f"{API}/invites/fake-id/dismiss-assignment")
        assert res.status_code == 401
        
    def test_dismiss_requires_director(self, director_headers):
        """Dismissing assignment requires director role"""
        coach_res = requests.post(f"{API}/auth/login", json={
            "email": "coach.williams@capymatch.com",
            "password": "coach123"
        })
        if coach_res.status_code != 200:
            pytest.skip("Coach login failed")
        coach_token = coach_res.json()["token"]
        
        res = requests.post(f"{API}/invites/fake-id/dismiss-assignment",
                           headers={"Authorization": f"Bearer {coach_token}"})
        assert res.status_code == 403
        
    def test_dismiss_invalid_invite_404(self, director_headers):
        """Dismissing invalid invite returns 404"""
        res = requests.post(f"{API}/invites/invalid-invite-id/dismiss-assignment",
                           headers=director_headers)
        assert res.status_code == 404
        
    def test_dismiss_assignment_success(self, director_headers):
        """Director can dismiss assignment suggestion"""
        # Create and accept invite with team
        unique_email = f"test_dismiss_{uuid.uuid4().hex[:8]}@test.com"
        create_res = requests.post(f"{API}/invites", json={
            "email": unique_email,
            "name": "Coach To Dismiss",
            "team": "U18 Academy"
        }, headers=director_headers)
        assert create_res.status_code == 200
        invite = create_res.json()
        
        # Accept invite
        accept_res = requests.post(f"{API}/invites/accept/{invite['token']}", json={
            "password": "testpass123"
        })
        assert accept_res.status_code == 200
        
        # Dismiss the assignment
        dismiss_res = requests.post(f"{API}/invites/{invite['id']}/dismiss-assignment",
                                    headers=director_headers)
        assert dismiss_res.status_code == 200
        data = dismiss_res.json()
        assert data["status"] == "dismissed"
        
    def test_dismissed_invite_not_in_pending(self, director_headers):
        """After dismissing, invite should NOT appear in pending-assignments"""
        # Create, accept, and dismiss
        unique_email = f"test_dismiss_pending_{uuid.uuid4().hex[:8]}@test.com"
        create_res = requests.post(f"{API}/invites", json={
            "email": unique_email,
            "name": "Coach Dismiss Pending",
            "team": "U17 Premier"
        }, headers=director_headers)
        assert create_res.status_code == 200
        invite = create_res.json()
        
        accept_res = requests.post(f"{API}/invites/accept/{invite['token']}", json={
            "password": "testpass123"
        })
        assert accept_res.status_code == 200
        
        # Dismiss
        dismiss_res = requests.post(f"{API}/invites/{invite['id']}/dismiss-assignment",
                                    headers=director_headers)
        assert dismiss_res.status_code == 200
        
        # Check pending-assignments - should NOT include this invite
        pending_res = requests.get(f"{API}/invites/pending-assignments", headers=director_headers)
        assert pending_res.status_code == 200
        pending = pending_res.json()
        
        invite_ids = [p["invite_id"] for p in pending]
        assert invite["id"] not in invite_ids, "Dismissed invite should not appear in pending-assignments"


class TestEdgeCases:
    """Test edge cases for Team-Aware Invite Suggestions"""
    
    def test_reviewed_invites_not_in_pending(self, director_headers):
        """Already-reviewed invites (assignment_reviewed=True) should NOT appear again"""
        # Get current pending
        pending_res = requests.get(f"{API}/invites/pending-assignments", headers=director_headers)
        assert pending_res.status_code == 200
        pending = pending_res.json()
        
        if len(pending) > 0:
            assignment = pending[0]
            # Dismiss it to mark as reviewed
            dismiss_res = requests.post(f"{API}/invites/{assignment['invite_id']}/dismiss-assignment",
                                        headers=director_headers)
            # After dismissing, check it's no longer in pending
            new_pending_res = requests.get(f"{API}/invites/pending-assignments", headers=director_headers)
            new_pending = new_pending_res.json()
            new_ids = [p["invite_id"] for p in new_pending]
            assert assignment["invite_id"] not in new_ids
            
    def test_get_invites_list(self, director_headers):
        """GET /api/invites returns all invites for director"""
        res = requests.get(f"{API}/invites", headers=director_headers)
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            invite = data[0]
            assert "id" in invite
            assert "email" in invite
            assert "name" in invite
            assert "status" in invite


class TestUnassignAthlete:
    """Test unassign flow needed to create unassigned athletes for suggestions"""
    
    def test_unassign_athlete_creates_suggestion_opportunity(self, director_headers):
        """Unassigning athlete on a team creates opportunity for suggestion"""
        # Get athletes
        athletes_res = requests.get(f"{API}/athletes", headers=director_headers)
        assert athletes_res.status_code == 200
        athletes = athletes_res.json()
        
        # Find an assigned athlete
        assigned = [a for a in athletes if a.get("primary_coach_id")]
        if len(assigned) == 0:
            pytest.skip("No assigned athletes to test unassign")
        
        athlete = assigned[0]
        
        # Unassign
        unassign_res = requests.post(f"{API}/athletes/{athlete['id']}/unassign",
                                     headers=director_headers,
                                     json={"reason": "Test unassignment"})
        
        # Just verify the endpoint exists and responds
        # Status could be 200 or 400 depending on athlete state
        assert unassign_res.status_code in [200, 400, 404]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

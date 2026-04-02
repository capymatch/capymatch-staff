"""
Test Coach Management CRUD endpoints for Director role.
Tests: GET /api/coaches, PUT /api/coaches/{id}, DELETE /api/coaches/{id}
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
TEST_EMAIL = "douglas@capymatch.com"
TEST_PASSWORD = "abc123"


@pytest.fixture(scope="module")
def director_session():
    """Create a session with director role authentication - shared across all tests."""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    # Login to get token
    login_response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    
    if login_response.status_code == 200:
        token = login_response.json().get("token")
        session.headers.update({
            "Authorization": f"Bearer {token}",
            "X-Effective-Role": "director"
        })
        return session
    else:
        pytest.skip(f"Authentication failed: {login_response.status_code} - {login_response.text}")


@pytest.fixture(scope="module")
def coach_session():
    """Create a session with coach role - for testing role restrictions."""
    time.sleep(1)  # Avoid rate limiting
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    login_response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    
    if login_response.status_code == 200:
        token = login_response.json().get("token")
        session.headers.update({
            "Authorization": f"Bearer {token}",
            "X-Effective-Role": "coach"
        })
        return session
    else:
        pytest.skip(f"Authentication failed: {login_response.status_code}")


class TestCoachManagementCRUD:
    """Test Coach Management CRUD endpoints for Director role."""
    
    # ─── GET /api/coaches ───────────────────────────────────────────────
    
    def test_list_coaches_returns_200(self, director_session):
        """GET /api/coaches should return 200 for director."""
        response = director_session.get(f"{BASE_URL}/api/coaches")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/coaches returned {len(data)} coaches")
    
    def test_list_coaches_returns_coach_data_structure(self, director_session):
        """GET /api/coaches should return coaches with expected fields."""
        response = director_session.get(f"{BASE_URL}/api/coaches")
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 0:
            coach = data[0]
            # Check required fields
            assert "id" in coach, "Coach should have 'id' field"
            assert "email" in coach, "Coach should have 'email' field"
            assert "name" in coach, "Coach should have 'name' field"
            assert "athlete_count" in coach, "Coach should have 'athlete_count' field"
            assert "status" in coach, "Coach should have 'status' field"
            print(f"✓ Coach data structure verified: {coach.get('name')} ({coach.get('email')})")
        else:
            print("⚠ No coaches found to verify structure")
    
    def test_list_coaches_requires_director_role(self, coach_session):
        """GET /api/coaches should return 403 for non-director role."""
        response = coach_session.get(f"{BASE_URL}/api/coaches")
        assert response.status_code == 403, f"Expected 403 for coach role, got {response.status_code}"
        print("✓ GET /api/coaches correctly returns 403 for non-director role")
    
    # ─── GET /api/coaches/{id} ──────────────────────────────────────────
    
    def test_get_single_coach_returns_200(self, director_session):
        """GET /api/coaches/{id} should return coach details."""
        list_response = director_session.get(f"{BASE_URL}/api/coaches")
        assert list_response.status_code == 200
        
        coaches = list_response.json()
        if len(coaches) > 0:
            coach_id = coaches[0]["id"]
            response = director_session.get(f"{BASE_URL}/api/coaches/{coach_id}")
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            
            data = response.json()
            assert data["id"] == coach_id
            assert "athletes" in data, "Single coach should include athletes list"
            print(f"✓ GET /api/coaches/{coach_id} returned coach with {len(data.get('athletes', []))} athletes")
        else:
            pytest.skip("No coaches available to test single coach endpoint")
    
    def test_get_nonexistent_coach_returns_404(self, director_session):
        """GET /api/coaches/{id} should return 404 for non-existent coach."""
        response = director_session.get(f"{BASE_URL}/api/coaches/nonexistent-coach-id-12345")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ GET /api/coaches/nonexistent returns 404")
    
    # ─── PUT /api/coaches/{id} ──────────────────────────────────────────
    
    def test_update_coach_name_returns_200(self, director_session):
        """PUT /api/coaches/{id} should update coach name."""
        list_response = director_session.get(f"{BASE_URL}/api/coaches")
        assert list_response.status_code == 200
        
        coaches = list_response.json()
        if len(coaches) > 0:
            coach = coaches[0]
            coach_id = coach["id"]
            original_name = coach["name"]
            
            # Update name
            new_name = f"TEST_{original_name}"
            response = director_session.put(f"{BASE_URL}/api/coaches/{coach_id}", json={
                "name": new_name
            })
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            
            data = response.json()
            assert data["name"] == new_name, f"Expected name '{new_name}', got '{data['name']}'"
            print(f"✓ PUT /api/coaches/{coach_id} updated name to '{new_name}'")
            
            # Revert name back
            revert_response = director_session.put(f"{BASE_URL}/api/coaches/{coach_id}", json={
                "name": original_name
            })
            assert revert_response.status_code == 200
            print(f"✓ Reverted name back to '{original_name}'")
        else:
            pytest.skip("No coaches available to test update endpoint")
    
    def test_update_coach_team_returns_200(self, director_session):
        """PUT /api/coaches/{id} should update coach team."""
        list_response = director_session.get(f"{BASE_URL}/api/coaches")
        assert list_response.status_code == 200
        
        coaches = list_response.json()
        if len(coaches) > 0:
            coach = coaches[0]
            coach_id = coach["id"]
            original_team = coach.get("team") or "Original Team"
            
            # Update team
            new_team = "TEST_Varsity"
            response = director_session.put(f"{BASE_URL}/api/coaches/{coach_id}", json={
                "team": new_team
            })
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            
            data = response.json()
            assert data["team"] == new_team, f"Expected team '{new_team}', got '{data['team']}'"
            print(f"✓ PUT /api/coaches/{coach_id} updated team to '{new_team}'")
            
            # Revert team back
            revert_response = director_session.put(f"{BASE_URL}/api/coaches/{coach_id}", json={
                "team": original_team
            })
            assert revert_response.status_code == 200
            print(f"✓ Reverted team back to '{original_team}'")
        else:
            pytest.skip("No coaches available to test update endpoint")
    
    def test_update_coach_status_returns_200(self, director_session):
        """PUT /api/coaches/{id} should update coach status (active/inactive)."""
        list_response = director_session.get(f"{BASE_URL}/api/coaches")
        assert list_response.status_code == 200
        
        coaches = list_response.json()
        if len(coaches) > 0:
            coach = coaches[0]
            coach_id = coach["id"]
            original_status = coach.get("status", "active")
            
            # Toggle status
            new_status = "inactive" if original_status == "active" else "active"
            response = director_session.put(f"{BASE_URL}/api/coaches/{coach_id}", json={
                "status": new_status
            })
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            
            data = response.json()
            assert data["status"] == new_status, f"Expected status '{new_status}', got '{data['status']}'"
            print(f"✓ PUT /api/coaches/{coach_id} updated status to '{new_status}'")
            
            # Revert status back
            revert_response = director_session.put(f"{BASE_URL}/api/coaches/{coach_id}", json={
                "status": original_status
            })
            assert revert_response.status_code == 200
            print(f"✓ Reverted status back to '{original_status}'")
        else:
            pytest.skip("No coaches available to test update endpoint")
    
    def test_update_coach_invalid_status_returns_400(self, director_session):
        """PUT /api/coaches/{id} should return 400 for invalid status."""
        list_response = director_session.get(f"{BASE_URL}/api/coaches")
        assert list_response.status_code == 200
        
        coaches = list_response.json()
        if len(coaches) > 0:
            coach_id = coaches[0]["id"]
            
            response = director_session.put(f"{BASE_URL}/api/coaches/{coach_id}", json={
                "status": "invalid_status"
            })
            assert response.status_code == 400, f"Expected 400, got {response.status_code}"
            print("✓ PUT /api/coaches with invalid status returns 400")
        else:
            pytest.skip("No coaches available to test")
    
    def test_update_coach_no_fields_returns_400(self, director_session):
        """PUT /api/coaches/{id} should return 400 when no fields provided."""
        list_response = director_session.get(f"{BASE_URL}/api/coaches")
        assert list_response.status_code == 200
        
        coaches = list_response.json()
        if len(coaches) > 0:
            coach_id = coaches[0]["id"]
            
            response = director_session.put(f"{BASE_URL}/api/coaches/{coach_id}", json={})
            assert response.status_code == 400, f"Expected 400, got {response.status_code}"
            print("✓ PUT /api/coaches with no fields returns 400")
        else:
            pytest.skip("No coaches available to test")
    
    def test_update_nonexistent_coach_returns_404(self, director_session):
        """PUT /api/coaches/{id} should return 404 for non-existent coach."""
        response = director_session.put(f"{BASE_URL}/api/coaches/nonexistent-coach-id-12345", json={
            "name": "Test Name"
        })
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ PUT /api/coaches/nonexistent returns 404")
    
    # ─── DELETE /api/coaches/{id} ───────────────────────────────────────
    
    def test_delete_nonexistent_coach_returns_404(self, director_session):
        """DELETE /api/coaches/{id} should return 404 for non-existent coach."""
        response = director_session.delete(f"{BASE_URL}/api/coaches/nonexistent-coach-id-12345")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ DELETE /api/coaches/nonexistent returns 404")


class TestInvitesEndpoints:
    """Test Invites endpoints for Director role."""
    
    def test_list_invites_returns_200(self, director_session):
        """GET /api/invites should return 200 for director."""
        response = director_session.get(f"{BASE_URL}/api/invites")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/invites returned {len(data)} invites")
        
        # Check for pending invites
        pending = [i for i in data if i.get("status") == "pending"]
        print(f"  - {len(pending)} pending invites")
    
    def test_list_invites_returns_invite_structure(self, director_session):
        """GET /api/invites should return invites with expected fields."""
        response = director_session.get(f"{BASE_URL}/api/invites")
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 0:
            invite = data[0]
            # Check required fields
            assert "id" in invite, "Invite should have 'id' field"
            assert "email" in invite, "Invite should have 'email' field"
            assert "name" in invite, "Invite should have 'name' field"
            assert "status" in invite, "Invite should have 'status' field"
            assert "created_at" in invite, "Invite should have 'created_at' field"
            print(f"✓ Invite data structure verified: {invite.get('name')} ({invite.get('email')}) - {invite.get('status')}")
        else:
            print("⚠ No invites found to verify structure")
    
    def test_pending_assignments_returns_200(self, director_session):
        """GET /api/invites/pending-assignments should return 200."""
        response = director_session.get(f"{BASE_URL}/api/invites/pending-assignments")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/invites/pending-assignments returned {len(data)} pending assignments")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

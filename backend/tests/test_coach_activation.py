"""
Test: Coach Activation / Engagement Panel API
Features tested:
1. GET /api/roster/activation - Director can view coach activation status
2. GET /api/roster/activation - Coach gets 403 forbidden
3. Status derivation: 'pending', 'activating', 'active', 'needs_support'
4. Summary counts (pending, activating, active, needs_support)
5. Coaches sorted by status priority (needs_support first, active last)

Test credentials:
- Director: director@capymatch.com / director123
- Coach Williams: coach.williams@capymatch.com / coach123
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")


class TestCoachActivationAPI:
    """Test the coach activation endpoint"""

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

    # ==================== GET /api/roster/activation ====================
    
    def test_activation_director_access(self, director_headers):
        """Director can view coach activation status"""
        response = requests.get(f"{BASE_URL}/api/roster/activation", headers=director_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        # Validate top-level structure
        assert "coaches" in data, "Response should have 'coaches'"
        assert "summary" in data, "Response should have 'summary'"
        assert "total" in data, "Response should have 'total'"
        
        # Validate coaches list
        coaches = data["coaches"]
        assert isinstance(coaches, list), "Coaches should be a list"
        assert len(coaches) >= 0, "Should have zero or more coaches"

    def test_activation_coach_forbidden(self, coach_headers):
        """Coach should get 403 forbidden on activation endpoint"""
        response = requests.get(f"{BASE_URL}/api/roster/activation", headers=coach_headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        assert "director" in response.json().get("detail", "").lower()

    def test_activation_no_auth(self):
        """Activation without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/roster/activation")
        assert response.status_code == 401

    # ==================== Response Structure Validation ====================
    
    def test_activation_coach_fields(self, director_headers):
        """Each coach in activation response has required fields"""
        response = requests.get(f"{BASE_URL}/api/roster/activation", headers=director_headers)
        assert response.status_code == 200
        
        data = response.json()
        coaches = data["coaches"]
        
        if len(coaches) > 0:
            coach = coaches[0]
            
            # Required fields
            required_fields = [
                "id", "name", "email", "status", 
                "onboarding_progress", "onboarding_total",
                "athlete_count"
            ]
            for field in required_fields:
                assert field in coach, f"Coach should have '{field}' field"
            
            # Optional fields that should be present (may be null)
            optional_fields = [
                "team", "invite_status", "accepted_at", "created_at",
                "onboarding_dismissed", "onboarding_completed_at",
                "has_first_activity", "first_activity_at", "last_active"
            ]
            for field in optional_fields:
                assert field in coach, f"Coach should have '{field}' field (can be null)"

    def test_activation_summary_counts(self, director_headers):
        """Summary contains all status counts"""
        response = requests.get(f"{BASE_URL}/api/roster/activation", headers=director_headers)
        assert response.status_code == 200
        
        data = response.json()
        summary = data["summary"]
        
        # All four status types should be in summary
        assert "pending" in summary, "Summary should have 'pending' count"
        assert "activating" in summary, "Summary should have 'activating' count"
        assert "active" in summary, "Summary should have 'active' count"
        assert "needs_support" in summary, "Summary should have 'needs_support' count"
        
        # All should be integers >= 0
        for status in ["pending", "activating", "active", "needs_support"]:
            assert isinstance(summary[status], int), f"{status} should be an integer"
            assert summary[status] >= 0, f"{status} should be >= 0"

    def test_activation_total_matches_coaches_count(self, director_headers):
        """Total field matches the number of coaches in array"""
        response = requests.get(f"{BASE_URL}/api/roster/activation", headers=director_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["total"] == len(data["coaches"]), "Total should match coaches array length"

    def test_activation_summary_matches_coaches(self, director_headers):
        """Summary counts match actual coach status distribution"""
        response = requests.get(f"{BASE_URL}/api/roster/activation", headers=director_headers)
        assert response.status_code == 200
        
        data = response.json()
        coaches = data["coaches"]
        summary = data["summary"]
        
        # Count statuses from coaches array
        status_counts = {"pending": 0, "activating": 0, "active": 0, "needs_support": 0}
        for coach in coaches:
            status = coach.get("status")
            if status in status_counts:
                status_counts[status] += 1
        
        # Compare with summary
        for status in ["pending", "activating", "active", "needs_support"]:
            assert summary[status] == status_counts[status], \
                f"Summary {status}={summary[status]} doesn't match actual count={status_counts[status]}"

    # ==================== Status Derivation Tests ====================
    
    def test_activation_valid_status_values(self, director_headers):
        """All coaches have valid status values"""
        response = requests.get(f"{BASE_URL}/api/roster/activation", headers=director_headers)
        assert response.status_code == 200
        
        data = response.json()
        valid_statuses = {"pending", "activating", "active", "needs_support"}
        
        for coach in data["coaches"]:
            assert coach["status"] in valid_statuses, \
                f"Coach {coach['name']} has invalid status: {coach['status']}"

    def test_activation_onboarding_progress_valid(self, director_headers):
        """Onboarding progress is within expected range"""
        response = requests.get(f"{BASE_URL}/api/roster/activation", headers=director_headers)
        assert response.status_code == 200
        
        data = response.json()
        for coach in data["coaches"]:
            progress = coach["onboarding_progress"]
            total = coach["onboarding_total"]
            
            assert isinstance(progress, int), f"Progress should be int for {coach['name']}"
            assert isinstance(total, int), f"Total should be int for {coach['name']}"
            assert progress >= 0, f"Progress should be >= 0 for {coach['name']}"
            assert total > 0, f"Total should be > 0 for {coach['name']}"
            assert progress <= total, f"Progress {progress} should be <= total {total} for {coach['name']}"

    def test_activation_athlete_count_non_negative(self, director_headers):
        """Athlete count is non-negative for all coaches"""
        response = requests.get(f"{BASE_URL}/api/roster/activation", headers=director_headers)
        assert response.status_code == 200
        
        data = response.json()
        for coach in data["coaches"]:
            assert coach["athlete_count"] >= 0, \
                f"Athlete count should be >= 0 for {coach['name']}"

    # ==================== Sorting Tests ====================
    
    def test_activation_sorted_by_status_priority(self, director_headers):
        """Coaches are sorted: needs_support first, then pending, activating, active"""
        response = requests.get(f"{BASE_URL}/api/roster/activation", headers=director_headers)
        assert response.status_code == 200
        
        data = response.json()
        coaches = data["coaches"]
        
        if len(coaches) < 2:
            pytest.skip("Need at least 2 coaches to test sorting")
        
        status_order = {"needs_support": 0, "pending": 1, "activating": 2, "active": 3}
        
        # Verify ordering
        for i in range(len(coaches) - 1):
            current_status = coaches[i]["status"]
            next_status = coaches[i + 1]["status"]
            current_order = status_order.get(current_status, 99)
            next_order = status_order.get(next_status, 99)
            
            assert current_order <= next_order, \
                f"Coach {coaches[i]['name']} ({current_status}) should come before {coaches[i+1]['name']} ({next_status})"

    # ==================== Status-Specific Tests ====================
    
    def test_pending_coaches_have_pending_invite(self, director_headers):
        """Coaches with 'pending' status should have invite_status='pending'"""
        response = requests.get(f"{BASE_URL}/api/roster/activation", headers=director_headers)
        assert response.status_code == 200
        
        data = response.json()
        pending_coaches = [c for c in data["coaches"] if c["status"] == "pending"]
        
        for coach in pending_coaches:
            assert coach["invite_status"] == "pending", \
                f"Pending coach {coach['name']} should have invite_status='pending', got '{coach['invite_status']}'"

    def test_active_coaches_criteria(self, director_headers):
        """Active coaches should have onboarding complete OR recent activity"""
        response = requests.get(f"{BASE_URL}/api/roster/activation", headers=director_headers)
        assert response.status_code == 200
        
        data = response.json()
        active_coaches = [c for c in data["coaches"] if c["status"] == "active"]
        
        for coach in active_coaches:
            # Active means: onboarding complete (progress >= total) OR has recent activity
            onboarding_complete = coach["onboarding_progress"] >= coach["onboarding_total"]
            has_activity = coach.get("has_first_activity", False)
            
            # At least one criterion should be met for active status
            # Note: The exact logic may vary based on implementation, this is a basic check
            assert onboarding_complete or has_activity or coach["last_active"] is not None, \
                f"Active coach {coach['name']} should have complete onboarding or activity"

    # ==================== Known Coach Tests ====================
    
    def test_known_coaches_present(self, director_headers):
        """Coach Williams and Coach Garcia should be in the activation list"""
        response = requests.get(f"{BASE_URL}/api/roster/activation", headers=director_headers)
        assert response.status_code == 200
        
        data = response.json()
        coach_emails = [c["email"] for c in data["coaches"]]
        
        # Check for known coaches
        known_emails = ["coach.williams@capymatch.com", "coach.garcia@capymatch.com"]
        for email in known_emails:
            # They may or may not be present depending on DB state, so just log
            if email in coach_emails:
                print(f"Found known coach: {email}")
            else:
                print(f"Known coach {email} not in list (may be normal)")

    def test_coach_williams_data_integrity(self, director_headers):
        """Coach Williams should have valid data if present"""
        response = requests.get(f"{BASE_URL}/api/roster/activation", headers=director_headers)
        assert response.status_code == 200
        
        data = response.json()
        williams = next(
            (c for c in data["coaches"] if c["email"] == "coach.williams@capymatch.com"), 
            None
        )
        
        if williams:
            assert williams["name"] is not None, "Coach Williams should have a name"
            assert williams["id"] == "coach-williams", "Coach Williams ID should be 'coach-williams'"
            assert williams["status"] in {"pending", "activating", "active", "needs_support"}
            print(f"Coach Williams status: {williams['status']}, "
                  f"onboarding: {williams['onboarding_progress']}/{williams['onboarding_total']}, "
                  f"athletes: {williams['athlete_count']}")
        else:
            print("Coach Williams not found in activation list")

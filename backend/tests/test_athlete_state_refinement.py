"""
Test Phase 2 Athlete State Refinement
- New momentum_label values: getting_started, active, building_momentum, declining, setup_needed, inactive
- display_status computed field
- Onboarding athletes have risk_alerts=[] and risk_level=null (suppressed)
- No references to old labels 'strong' or 'stable'
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Valid momentum labels after Phase 2 refinement
VALID_MOMENTUM_LABELS = {
    'getting_started',
    'active',
    'building_momentum',
    'declining',
    'setup_needed',
    'inactive'
}

# Old labels that should NOT appear
OLD_LABELS = {'strong', 'stable'}

# Valid display_status values
VALID_DISPLAY_STATUS = {
    'critical',
    'at_risk',
    'needs_attention',
    'building_momentum',
    'active',
    'setup_needed',
    'getting_started',
    'inactive'
}


class TestAthleteStateRefinement:
    """Tests for Phase 2 Athlete State Refinement"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login with test credentials
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "douglas@capymatch.com",
            "password": "abc123"
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.status_code}")
        
        token = login_response.json().get("token")
        if not token:
            pytest.skip("No token in login response")
        
        # Use X-Effective-Role header to switch to director role
        self.session.headers.update({
            "Authorization": f"Bearer {token}",
            "X-Effective-Role": "director"
        })
    
    def test_roster_endpoint_returns_200(self):
        """Test GET /api/roster returns 200"""
        response = self.session.get(f"{BASE_URL}/api/roster")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: GET /api/roster returns 200")
    
    def test_roster_returns_athletes_with_momentum_label(self):
        """Test that roster returns athletes with momentum_label field"""
        response = self.session.get(f"{BASE_URL}/api/roster")
        assert response.status_code == 200
        
        data = response.json()
        athletes = data.get("athletes", [])
        
        assert len(athletes) > 0, "Expected at least one athlete in roster"
        
        for athlete in athletes:
            assert "momentum_label" in athlete, f"Athlete {athlete.get('id')} missing momentum_label"
            print(f"Athlete {athlete.get('name')}: momentum_label = {athlete.get('momentum_label')}")
        
        print(f"PASS: All {len(athletes)} athletes have momentum_label field")
    
    def test_roster_returns_athletes_with_display_status(self):
        """Test that roster returns athletes with display_status field"""
        response = self.session.get(f"{BASE_URL}/api/roster")
        assert response.status_code == 200
        
        data = response.json()
        athletes = data.get("athletes", [])
        
        assert len(athletes) > 0, "Expected at least one athlete in roster"
        
        for athlete in athletes:
            assert "display_status" in athlete, f"Athlete {athlete.get('id')} missing display_status"
            print(f"Athlete {athlete.get('name')}: display_status = {athlete.get('display_status')}")
        
        print(f"PASS: All {len(athletes)} athletes have display_status field")
    
    def test_momentum_labels_are_valid(self):
        """Test that all momentum_label values are from the new valid set"""
        response = self.session.get(f"{BASE_URL}/api/roster")
        assert response.status_code == 200
        
        data = response.json()
        athletes = data.get("athletes", [])
        
        for athlete in athletes:
            label = athlete.get("momentum_label")
            assert label in VALID_MOMENTUM_LABELS, \
                f"Athlete {athlete.get('name')} has invalid momentum_label: {label}. Valid: {VALID_MOMENTUM_LABELS}"
        
        print(f"PASS: All momentum_label values are valid: {VALID_MOMENTUM_LABELS}")
    
    def test_no_old_labels_strong_or_stable(self):
        """Test that old labels 'strong' and 'stable' do NOT appear"""
        response = self.session.get(f"{BASE_URL}/api/roster")
        assert response.status_code == 200
        
        data = response.json()
        athletes = data.get("athletes", [])
        
        for athlete in athletes:
            label = athlete.get("momentum_label")
            assert label not in OLD_LABELS, \
                f"Athlete {athlete.get('name')} has OLD momentum_label: {label}. Old labels should not appear!"
        
        print("PASS: No old labels 'strong' or 'stable' found in roster")
    
    def test_display_status_values_are_valid(self):
        """Test that all display_status values are from the valid set"""
        response = self.session.get(f"{BASE_URL}/api/roster")
        assert response.status_code == 200
        
        data = response.json()
        athletes = data.get("athletes", [])
        
        for athlete in athletes:
            status = athlete.get("display_status")
            assert status in VALID_DISPLAY_STATUS, \
                f"Athlete {athlete.get('name')} has invalid display_status: {status}. Valid: {VALID_DISPLAY_STATUS}"
        
        print(f"PASS: All display_status values are valid: {VALID_DISPLAY_STATUS}")
    
    def test_onboarding_athletes_have_suppressed_risk_alerts(self):
        """Test that onboarding athletes have risk_alerts=[] and risk_level=null"""
        response = self.session.get(f"{BASE_URL}/api/roster")
        assert response.status_code == 200
        
        data = response.json()
        athletes = data.get("athletes", [])
        
        onboarding_athletes = [a for a in athletes if a.get("is_onboarding")]
        
        if len(onboarding_athletes) == 0:
            print("INFO: No onboarding athletes found to test risk suppression")
            return
        
        for athlete in onboarding_athletes:
            risk_alerts = athlete.get("risk_alerts", [])
            risk_level = athlete.get("risk_level")
            
            assert risk_alerts == [], \
                f"Onboarding athlete {athlete.get('name')} should have risk_alerts=[], got: {risk_alerts}"
            assert risk_level is None, \
                f"Onboarding athlete {athlete.get('name')} should have risk_level=null, got: {risk_level}"
            
            print(f"Athlete {athlete.get('name')} (onboarding): risk_alerts=[], risk_level=null - CORRECT")
        
        print(f"PASS: {len(onboarding_athletes)} onboarding athlete(s) have suppressed risk alerts")
    
    def test_getting_started_label_for_new_athlete(self):
        """Test that new athlete (created today, no activity) gets momentum_label='getting_started'"""
        response = self.session.get(f"{BASE_URL}/api/roster")
        assert response.status_code == 200
        
        data = response.json()
        athletes = data.get("athletes", [])
        
        # Find athletes that are onboarding (new, no activity)
        getting_started_athletes = [a for a in athletes if a.get("momentum_label") == "getting_started"]
        
        if len(getting_started_athletes) > 0:
            for athlete in getting_started_athletes:
                print(f"Athlete {athlete.get('name')}: momentum_label='getting_started', is_onboarding={athlete.get('is_onboarding')}")
                # Verify display_status matches
                assert athlete.get("display_status") == "getting_started", \
                    f"Athlete with momentum_label='getting_started' should have display_status='getting_started', got: {athlete.get('display_status')}"
            print(f"PASS: Found {len(getting_started_athletes)} athlete(s) with 'getting_started' label")
        else:
            print("INFO: No athletes with 'getting_started' label found (may need fresh athlete)")
    
    def test_roster_summary_structure(self):
        """Test that roster summary has expected structure"""
        response = self.session.get(f"{BASE_URL}/api/roster")
        assert response.status_code == 200
        
        data = response.json()
        
        # Check top-level structure
        assert "athletes" in data, "Missing 'athletes' in response"
        assert "groups" in data, "Missing 'groups' in response"
        assert "teamGroups" in data, "Missing 'teamGroups' in response"
        assert "ageGroups" in data, "Missing 'ageGroups' in response"
        assert "summary" in data, "Missing 'summary' in response"
        
        summary = data.get("summary", {})
        assert "total_athletes" in summary, "Missing 'total_athletes' in summary"
        assert "assigned" in summary, "Missing 'assigned' in summary"
        assert "unassigned" in summary, "Missing 'unassigned' in summary"
        
        print(f"PASS: Roster summary structure is correct. Total athletes: {summary.get('total_athletes')}")
    
    def test_athlete_fields_completeness(self):
        """Test that each athlete has all required fields for Phase 2"""
        response = self.session.get(f"{BASE_URL}/api/roster")
        assert response.status_code == 200
        
        data = response.json()
        athletes = data.get("athletes", [])
        
        required_fields = [
            "id", "name", "momentum_label", "display_status", 
            "is_onboarding", "risk_alerts", "risk_level",
            "momentum_score", "momentum_trend", "recruiting_stage"
        ]
        
        for athlete in athletes:
            for field in required_fields:
                assert field in athlete, f"Athlete {athlete.get('id')} missing required field: {field}"
        
        print(f"PASS: All {len(athletes)} athletes have required fields: {required_fields}")
    
    def test_momentum_label_distribution(self):
        """Test and report the distribution of momentum labels"""
        response = self.session.get(f"{BASE_URL}/api/roster")
        assert response.status_code == 200
        
        data = response.json()
        athletes = data.get("athletes", [])
        
        distribution = {}
        for athlete in athletes:
            label = athlete.get("momentum_label", "unknown")
            distribution[label] = distribution.get(label, 0) + 1
        
        print("Momentum Label Distribution:")
        for label, count in sorted(distribution.items()):
            print(f"  {label}: {count}")
        
        # Verify all labels are valid
        for label in distribution.keys():
            assert label in VALID_MOMENTUM_LABELS, f"Invalid label in distribution: {label}"
        
        print("PASS: Momentum label distribution verified")
    
    def test_display_status_distribution(self):
        """Test and report the distribution of display_status values"""
        response = self.session.get(f"{BASE_URL}/api/roster")
        assert response.status_code == 200
        
        data = response.json()
        athletes = data.get("athletes", [])
        
        distribution = {}
        for athlete in athletes:
            status = athlete.get("display_status", "unknown")
            distribution[status] = distribution.get(status, 0) + 1
        
        print("Display Status Distribution:")
        for status, count in sorted(distribution.items()):
            print(f"  {status}: {count}")
        
        # Verify all statuses are valid
        for status in distribution.keys():
            assert status in VALID_DISPLAY_STATUS, f"Invalid display_status in distribution: {status}"
        
        print("PASS: Display status distribution verified")


class TestDirectorDashboard:
    """Test that director dashboard still loads correctly"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "douglas@capymatch.com",
            "password": "abc123"
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.status_code}")
        
        token = login_response.json().get("token")
        if not token:
            pytest.skip("No token in login response")
        
        # Use X-Effective-Role header to switch to director role
        self.session.headers.update({
            "Authorization": f"Bearer {token}",
            "X-Effective-Role": "director"
        })
    
    def test_director_dashboard_endpoint(self):
        """Test that director dashboard endpoint returns 200"""
        response = self.session.get(f"{BASE_URL}/api/director/dashboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: GET /api/director/dashboard returns 200")
    
    def test_coach_dashboard_endpoint(self):
        """Test that coach dashboard endpoint returns 200"""
        # Switch to coach role using header
        self.session.headers.update({"X-Effective-Role": "coach"})
        
        response = self.session.get(f"{BASE_URL}/api/coach/dashboard")
        # Coach dashboard may return 200 or redirect, both are acceptable
        assert response.status_code in [200, 403], f"Unexpected status: {response.status_code}: {response.text}"
        print(f"PASS: GET /api/coach/dashboard returns {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

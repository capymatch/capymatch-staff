"""
Test Pipeline-Based Momentum Calculation

This module tests the redesigned momentum system where:
1. Momentum = pipeline PROGRESS based on recruiting stage weights
2. Activity signals = separate freshness tracking
3. Athletes at Campus Visit or higher should NOT show 'momentum_drop'
4. Stale momentum_drop pod_issues auto-resolve when pipeline_momentum >= 50

STAGE_WEIGHTS:
- Prospect=10, Initial Contact/Contacted=20, In Conversation/Engaged=35
- Interested=50, Campus Visit/Visit=70, Offer=90, Committed=100
- Breadth bonus: +3 per additional school at 20+ stage, max 10 bonus
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

class TestPipelineMomentum:
    """Test pipeline-based momentum calculations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "coach.williams@capymatch.com",
            "password": "coach123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_marcus_johnson_momentum_at_campus_visit(self):
        """
        Marcus Johnson (athlete_3) at Campus Visit stage should have:
        - pipeline_momentum ~73 (70 for Campus Visit + breadth bonus)
        - pipeline_best_stage = "Campus Visit"
        - NOT show momentum_drop category despite 24 days inactive
        """
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=self.headers)
        assert response.status_code == 200
        
        roster = response.json().get("myRoster", [])
        marcus = next((a for a in roster if a["id"] == "athlete_3"), None)
        
        assert marcus is not None, "Marcus Johnson (athlete_3) not found in roster"
        assert marcus["name"] == "Marcus Johnson"
        
        # Pipeline momentum should be ~73 (70 for Campus Visit + 3 for breadth)
        momentum = marcus.get("momentum_score", 0)
        assert momentum >= 70, f"Expected momentum >= 70 for Campus Visit, got {momentum}"
        assert momentum <= 80, f"Expected momentum <= 80, got {momentum}"
        
        # Best stage should be Campus Visit
        assert marcus.get("pipeline_best_stage") == "Campus Visit", \
            f"Expected pipeline_best_stage='Campus Visit', got {marcus.get('pipeline_best_stage')}"
        
        # Should NOT have momentum_drop category despite 24 days inactive
        assert marcus.get("category") != "momentum_drop", \
            f"Marcus should NOT have momentum_drop category, has: {marcus.get('category')}"
        
        # Verify days_since_activity is high but no momentum_drop
        days = marcus.get("days_since_activity", 0)
        assert days >= 14, f"Expected days_since_activity >= 14, got {days}"
    
    def test_lucas_rodriguez_momentum_at_offer(self):
        """
        Lucas Rodriguez (athlete_5) at Offer stage should have:
        - pipeline_momentum ~96 (90 for Offer + breadth bonus)
        - pipeline_best_stage = "Offer"
        - NOT show momentum_drop category
        """
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=self.headers)
        assert response.status_code == 200
        
        roster = response.json().get("myRoster", [])
        lucas = next((a for a in roster if a["id"] == "athlete_5"), None)
        
        assert lucas is not None, "Lucas Rodriguez (athlete_5) not found in roster"
        assert lucas["name"] == "Lucas Rodriguez"
        
        # Pipeline momentum should be ~96 (90 for Offer + 6 for breadth)
        momentum = lucas.get("momentum_score", 0)
        assert momentum >= 90, f"Expected momentum >= 90 for Offer, got {momentum}"
        assert momentum <= 100, f"Expected momentum <= 100, got {momentum}"
        
        # Best stage should be Offer
        assert lucas.get("pipeline_best_stage") == "Offer", \
            f"Expected pipeline_best_stage='Offer', got {lucas.get('pipeline_best_stage')}"
        
        # Should NOT have momentum_drop category
        assert lucas.get("category") != "momentum_drop", \
            f"Lucas should NOT have momentum_drop category, has: {lucas.get('category')}"
    
    def test_sarah_martinez_momentum_at_initial_contact(self):
        """
        Sarah Martinez (athlete_4) at Initial Contact stage should have:
        - pipeline_momentum ~20 (20 for Initial Contact)
        - pipeline_best_stage = "Initial Contact"
        """
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=self.headers)
        assert response.status_code == 200
        
        roster = response.json().get("myRoster", [])
        sarah = next((a for a in roster if a["id"] == "athlete_4"), None)
        
        assert sarah is not None, "Sarah Martinez (athlete_4) not found in roster"
        assert sarah["name"] == "Sarah Martinez"
        
        # Pipeline momentum should be ~20 (20 for Initial Contact)
        momentum = sarah.get("momentum_score", 0)
        assert momentum >= 15, f"Expected momentum >= 15, got {momentum}"
        assert momentum <= 35, f"Expected momentum <= 35 for Initial Contact, got {momentum}"
        
        # Best stage should be Initial Contact
        assert sarah.get("pipeline_best_stage") == "Initial Contact", \
            f"Expected pipeline_best_stage='Initial Contact', got {sarah.get('pipeline_best_stage')}"


class TestNoFalseMomentumDrop:
    """Test that athletes at Campus Visit or higher don't show momentum_drop"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "coach.williams@capymatch.com",
            "password": "coach123"
        })
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_marcus_support_pod_no_momentum_drop_issue(self):
        """
        Marcus (athlete_3) at Campus Visit should NOT have momentum_drop
        as current_issue even with 24 days of inactivity
        """
        response = requests.get(f"{BASE_URL}/api/support-pods/athlete_3", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        current_issue = data.get("current_issue")
        
        # If there's a current issue, it should NOT be momentum_drop
        if current_issue:
            assert current_issue.get("type") != "momentum_drop", \
                f"Marcus should NOT have momentum_drop issue, has: {current_issue.get('type')}"
        
        # Verify athlete has high pipeline momentum
        athlete = data.get("athlete", {})
        pipeline_momentum = athlete.get("pipeline_momentum", 0)
        assert pipeline_momentum >= 50, \
            f"Expected pipeline_momentum >= 50, got {pipeline_momentum}"
    
    def test_high_momentum_athletes_no_momentum_drop_category(self):
        """
        All athletes with pipeline_momentum >= 50 should NOT have
        momentum_drop category in roster
        """
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=self.headers)
        assert response.status_code == 200
        
        roster = response.json().get("myRoster", [])
        
        for athlete in roster:
            momentum = athlete.get("momentum_score", 0)
            category = athlete.get("category")
            
            if momentum >= 50:
                assert category != "momentum_drop", \
                    f"{athlete['name']} (momentum={momentum}) should NOT have momentum_drop, has: {category}"


class TestAutoResolve:
    """Test auto-resolution of stale momentum_drop issues"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "coach.williams@capymatch.com",
            "password": "coach123"
        })
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_current_issue_auto_resolves_for_high_momentum(self):
        """
        When get_current_issue is called for an athlete with pipeline_momentum >= 50,
        any active momentum_drop issues should be auto-resolved
        """
        # This test verifies the auto-resolve logic works when Support Pod is loaded
        # by checking that Marcus (high momentum) doesn't show momentum_drop
        response = requests.get(f"{BASE_URL}/api/support-pods/athlete_3", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        current_issue = data.get("current_issue")
        
        # Current issue should NOT be momentum_drop for high-momentum athlete
        if current_issue:
            issue_type = current_issue.get("type")
            assert issue_type != "momentum_drop", \
                f"Auto-resolve failed: momentum_drop should not be current issue for high-momentum athlete"


class TestRosterPipelineFields:
    """Test that roster returns pipeline_momentum and pipeline_best_stage"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "coach.williams@capymatch.com",
            "password": "coach123"
        })
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_roster_has_pipeline_fields(self):
        """Mission control roster should include pipeline_momentum and pipeline_best_stage"""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=self.headers)
        assert response.status_code == 200
        
        roster = response.json().get("myRoster", [])
        assert len(roster) > 0, "Roster should not be empty"
        
        for athlete in roster:
            # Check momentum_score is present (it uses pipeline_momentum)
            assert "momentum_score" in athlete, \
                f"momentum_score missing for {athlete.get('name')}"
            
            # Check pipeline_best_stage is present
            assert "pipeline_best_stage" in athlete, \
                f"pipeline_best_stage missing for {athlete.get('name')}"
            
            # Values should be reasonable
            momentum = athlete.get("momentum_score", 0)
            assert 0 <= momentum <= 100, \
                f"momentum_score {momentum} out of range for {athlete.get('name')}"


class TestEarlyStageSchools:
    """Test early stage schools behavior"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "coach.williams@capymatch.com",
            "password": "coach123"
        })
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_penn_state_prospect_no_overdue_followups(self):
        """
        Penn State (Prospect stage) should show:
        - overdue_followups = 0
        - health = "still_early"
        """
        response = requests.get(f"{BASE_URL}/api/support-pods/athlete_3/schools", headers=self.headers)
        assert response.status_code == 200
        
        schools = response.json().get("schools", [])
        penn_state = next((s for s in schools if "Penn" in s.get("university_name", "")), None)
        
        assert penn_state is not None, "Penn State not found in Marcus's schools"
        
        # Should be Prospect stage
        assert penn_state.get("recruiting_status") == "Prospect", \
            f"Expected recruiting_status='Prospect', got {penn_state.get('recruiting_status')}"
        
        # Should have 0 overdue followups
        assert penn_state.get("overdue_followups") == 0, \
            f"Expected overdue_followups=0 for Prospect, got {penn_state.get('overdue_followups')}"
        
        # Should have still_early health
        assert penn_state.get("health") == "still_early", \
            f"Expected health='still_early', got {penn_state.get('health')}"


class TestDecisionEngineThresholds:
    """Test decision engine momentum thresholds"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "coach.williams@capymatch.com",
            "password": "coach123"
        })
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_momentum_drop_threshold_at_50(self):
        """
        Athletes with pipeline_momentum >= 50 should NEVER have momentum_drop
        Athletes with pipeline_momentum < 30 AND days_since >= 14 SHOULD have it
        """
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=self.headers)
        assert response.status_code == 200
        
        roster = response.json().get("myRoster", [])
        
        for athlete in roster:
            momentum = athlete.get("momentum_score", 0)
            days = athlete.get("days_since_activity", 0)
            category = athlete.get("category")
            name = athlete.get("name")
            
            # High momentum (>= 50) should NEVER have momentum_drop
            if momentum >= 50:
                assert category != "momentum_drop", \
                    f"{name} (momentum={momentum}) has momentum_drop but shouldn't"
            
            # If athlete has momentum_drop, verify low momentum + high inactivity
            if category == "momentum_drop":
                assert momentum < 30, \
                    f"{name} has momentum_drop but momentum={momentum} (should be < 30)"
                assert days >= 14, \
                    f"{name} has momentum_drop but days={days} (should be >= 14)"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

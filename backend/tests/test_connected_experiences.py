"""
Tests for Connected Experiences - Athlete Pipeline Summary Endpoint

Verifies the /api/roster/athlete/{athlete_id}/pipeline endpoint which provides
directors/coaches a summary-first view into an individual athlete's recruiting pipeline.
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')


class TestAthletePipelineEndpoint:
    """Tests for GET /api/roster/athlete/{athlete_id}/pipeline"""
    
    @pytest.fixture(scope="class")
    def director_token(self):
        """Get director authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "director@capymatch.com",
            "password": "director123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Director authentication failed")
    
    @pytest.fixture(scope="class")
    def athlete_token(self):
        """Get athlete authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "emma.chen@athlete.capymatch.com",
            "password": "password123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Athlete authentication failed")
    
    def test_unauthenticated_access_denied(self):
        """Test that unauthenticated users cannot access pipeline"""
        response = requests.get(f"{BASE_URL}/api/roster/athlete/athlete_3/pipeline")
        assert response.status_code == 401 or response.status_code == 403
        assert "detail" in response.json()
    
    def test_athlete_role_cannot_access(self, athlete_token):
        """Test that athletes cannot access pipeline - only directors/coaches"""
        response = requests.get(
            f"{BASE_URL}/api/roster/athlete/athlete_3/pipeline",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert response.status_code == 403
        assert "don't have access" in response.json()["detail"].lower()
    
    def test_nonexistent_athlete_returns_404(self, director_token):
        """Test that nonexistent athlete returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/roster/athlete/athlete_nonexistent/pipeline",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
    
    def test_pipeline_returns_header_section(self, director_token):
        """Test that pipeline response includes athlete header with required fields"""
        response = requests.get(
            f"{BASE_URL}/api/roster/athlete/athlete_3/pipeline",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify header section exists
        assert "header" in data
        header = data["header"]
        
        # Verify required header fields
        assert header["id"] == "athlete_3"
        assert header["name"] == "Emma Chen"
        assert "grad_year" in header
        assert "position" in header
        assert "team" in header
        assert "momentum_score" in header
        assert "momentum_trend" in header
        assert "recruiting_stage" in header
        assert "days_since_activity" in header
    
    def test_pipeline_returns_summary_section(self, director_token):
        """Test that pipeline response includes summary with metrics"""
        response = requests.get(
            f"{BASE_URL}/api/roster/athlete/athlete_3/pipeline",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify summary section
        assert "summary" in data
        summary = data["summary"]
        
        # Verify summary fields
        assert "total_schools" in summary
        assert "response_rate" in summary
        assert "active_conversations" in summary
        assert "overdue_followups" in summary
        assert "waiting_on_reply" in summary
        
        # Emma Chen has 12 programs - verify count
        assert summary["total_schools"] == 12
    
    def test_pipeline_returns_stage_distribution(self, director_token):
        """Test that pipeline includes stage distribution for bar chart"""
        response = requests.get(
            f"{BASE_URL}/api/roster/athlete/athlete_3/pipeline",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify stage_distribution exists
        assert "stage_distribution" in data
        stages = data["stage_distribution"]
        
        # Should have all 6 stages
        assert len(stages) == 6
        
        # Verify each stage has required fields
        expected_stages = ["added", "outreach", "in_conversation", "campus_visit", "offer", "committed"]
        actual_stages = [s["stage"] for s in stages]
        assert set(expected_stages) == set(actual_stages)
        
        for stage in stages:
            assert "stage" in stage
            assert "label" in stage
            assert "count" in stage
            assert isinstance(stage["count"], int)
    
    def test_pipeline_returns_schools_grouped_by_stage(self, director_token):
        """Test that schools are grouped by stage with proper details"""
        response = requests.get(
            f"{BASE_URL}/api/roster/athlete/athlete_3/pipeline",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify schools section
        assert "schools" in data
        
        # Emma Chen has schools, so should have at least one group
        assert len(data["schools"]) > 0
        
        # Verify first group structure
        group = data["schools"][0]
        assert "stage" in group
        assert "label" in group
        assert "schools" in group
        assert isinstance(group["schools"], list)
        
        # Verify school entry structure
        if group["schools"]:
            school = group["schools"][0]
            assert "program_id" in school
            assert "university_name" in school
            assert "division" in school
            assert "reply_status" in school
            assert "risks" in school
            assert isinstance(school["risks"], list)
    
    def test_pipeline_returns_recent_activity(self, director_token):
        """Test that pipeline includes recent activity section"""
        response = requests.get(
            f"{BASE_URL}/api/roster/athlete/athlete_3/pipeline",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify recent_activity section exists
        assert "recent_activity" in data
        assert isinstance(data["recent_activity"], list)
        
        # If there's activity, verify structure
        if data["recent_activity"]:
            activity = data["recent_activity"][0]
            assert "type" in activity
            assert "university_name" in activity
            assert "date" in activity
    
    def test_pipeline_returns_momentum_assessment(self, director_token):
        """Test that pipeline includes momentum assessment (strong/steady/declining)"""
        response = requests.get(
            f"{BASE_URL}/api/roster/athlete/athlete_3/pipeline",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify momentum_assessment
        assert "momentum_assessment" in data
        assert data["momentum_assessment"] in ["strong", "steady", "declining"]
    
    def test_empty_pipeline_for_mock_athlete(self, director_token):
        """Test that mock athletes without tenant_id return empty pipeline gracefully"""
        response = requests.get(
            f"{BASE_URL}/api/roster/athlete/athlete_2/pipeline",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify header still exists
        assert "header" in data
        assert data["header"]["name"] == "Jake Williams"
        
        # Verify empty pipeline
        assert data["schools"] == []
        assert data["recent_activity"] == []
        
        # Summary should reflect school_targets from seeded data
        assert "summary" in data
        
        # Stage distribution should be all zeros
        assert "stage_distribution" in data
        for stage in data["stage_distribution"]:
            assert stage["count"] == 0


class TestMissionControlIntegration:
    """Test that Mission Control page works correctly for director"""
    
    @pytest.fixture
    def director_token(self):
        """Get director authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "director@capymatch.com",
            "password": "director123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Director authentication failed")
    
    def test_mission_control_endpoint_works(self, director_token):
        """Test GET /api/mission-control returns data for director"""
        response = requests.get(
            f"{BASE_URL}/api/mission-control",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify required sections exist
        assert "programStatus" in data
        assert "needsAttention" in data or "coachHealth" in data
    
    def test_mission_control_has_needs_attention_items(self, director_token):
        """Test that needsAttention includes athlete_id for pipeline button"""
        response = requests.get(
            f"{BASE_URL}/api/mission-control",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if "needsAttention" in data and data["needsAttention"]:
            item = data["needsAttention"][0]
            # Each item should have athlete_id for pipeline navigation
            assert "athlete_id" in item
            assert "athlete_name" in item

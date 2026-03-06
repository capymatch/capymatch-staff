"""
Backend API tests for PeekPanel feature
Validates that /api/mission-control returns all explainability fields required by the PeekPanel component
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestMissionControlExplainability:
    """Tests for PeekPanel explainability fields in mission-control API"""
    
    def test_priority_alerts_have_explainability_fields(self):
        """Verify priority alerts contain all fields needed by PeekPanel"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        assert response.status_code == 200
        
        data = response.json()
        alerts = data.get('priorityAlerts', [])
        assert len(alerts) > 0, "Should have at least one priority alert"
        
        # Required fields for PeekPanel display
        required_fields = [
            'athlete_name', 'grad_year', 'position', 'team', 'school_targets',
            'category', 'why_this_surfaced', 'what_changed', 
            'recommended_action', 'owner', 'details',
            'score', 'urgency', 'impact', 'badge_color'
        ]
        
        for alert in alerts:
            for field in required_fields:
                assert field in alert, f"Alert missing required field: {field}"
    
    def test_priority_alerts_have_suggested_steps(self):
        """Verify alerts have suggested_steps in details for Next Steps section"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        assert response.status_code == 200
        
        data = response.json()
        alerts = data.get('priorityAlerts', [])
        
        # At least one alert should have suggested_steps
        has_steps = any('suggested_steps' in alert.get('details', {}) for alert in alerts)
        assert has_steps, "At least one alert should have suggested_steps"
    
    def test_athletes_needing_attention_have_explainability_fields(self):
        """Verify athletes needing attention contain all fields needed by PeekPanel"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        assert response.status_code == 200
        
        data = response.json()
        athletes = data.get('athletesNeedingAttention', [])
        assert len(athletes) > 0, "Should have athletes needing attention"
        
        required_fields = [
            'athlete_name', 'grad_year', 'position', 'team', 'school_targets',
            'category', 'why_this_surfaced', 'what_changed',
            'recommended_action', 'owner', 'details'
        ]
        
        for athlete in athletes:
            for field in required_fields:
                assert field in athlete, f"Athlete missing required field: {field}"
    
    def test_category_values_are_valid(self):
        """Verify category values match expected enum for PeekPanel icons"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        assert response.status_code == 200
        
        data = response.json()
        valid_categories = {
            'momentum_drop', 'blocker', 'deadline_proximity',
            'engagement_drop', 'ownership_gap', 'readiness_issue'
        }
        
        all_items = data.get('priorityAlerts', []) + data.get('athletesNeedingAttention', [])
        for item in all_items:
            category = item.get('category')
            assert category in valid_categories, f"Invalid category: {category}"
    
    def test_badge_color_values_are_valid(self):
        """Verify badge_color values match expected values for styling"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        assert response.status_code == 200
        
        data = response.json()
        valid_colors = {'red', 'amber', 'blue', 'gray'}
        
        all_items = data.get('priorityAlerts', []) + data.get('athletesNeedingAttention', [])
        for item in all_items:
            color = item.get('badge_color')
            assert color in valid_colors, f"Invalid badge_color: {color}"
    
    def test_owner_field_is_not_empty(self):
        """Verify owner field is populated for all interventions"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        assert response.status_code == 200
        
        data = response.json()
        all_items = data.get('priorityAlerts', []) + data.get('athletesNeedingAttention', [])
        
        for item in all_items:
            owner = item.get('owner', '')
            assert owner and len(owner.strip()) > 0, "Owner field should not be empty"
    
    def test_context_fields_present_when_applicable(self):
        """Verify relevant context fields (events, schools, deadlines) are in details"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        assert response.status_code == 200
        
        data = response.json()
        
        # Check deadline_proximity items have event_name
        deadline_items = [
            item for item in data.get('priorityAlerts', []) 
            if item.get('category') == 'deadline_proximity'
        ]
        for item in deadline_items:
            details = item.get('details', {})
            assert 'event_name' in details or 'deadline_dates' in details, \
                "Deadline items should have event_name or deadline_dates"
        
        # Check blocker items have affected_schools or blocker_type
        blocker_items = [
            item for item in data.get('athletesNeedingAttention', []) 
            if item.get('category') == 'blocker'
        ]
        for item in blocker_items:
            details = item.get('details', {})
            assert 'affected_schools' in details or 'blocker_type' in details, \
                "Blocker items should have affected_schools or blocker_type"


class TestMissionControlIntegrity:
    """Tests for data integrity in mission-control API"""
    
    def test_api_returns_200(self):
        """Basic health check for mission-control endpoint"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        assert response.status_code == 200
    
    def test_response_has_required_sections(self):
        """Verify response has all sections needed by MissionControl page"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        assert response.status_code == 200
        
        data = response.json()
        required_sections = [
            'priorityAlerts', 'recentChanges', 'athletesNeedingAttention',
            'upcomingEvents', 'programSnapshot'
        ]
        
        for section in required_sections:
            assert section in data, f"Missing section: {section}"
    
    def test_priority_alerts_count_within_bounds(self):
        """Verify priority alerts are between 2-4 items"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        assert response.status_code == 200
        
        alerts = response.json().get('priorityAlerts', [])
        assert 2 <= len(alerts) <= 4, f"Priority alerts should be 2-4, got {len(alerts)}"
    
    def test_athletes_needing_attention_count_within_bounds(self):
        """Verify athletes needing attention is <= 12"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        assert response.status_code == 200
        
        athletes = response.json().get('athletesNeedingAttention', [])
        assert len(athletes) <= 12, f"Athletes needing attention should be <= 12, got {len(athletes)}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

"""
Test suite for UI Refinement - Mission Control
Tests that backend API returns all expected data for the refined UI

- Verifies priorityAlerts has pod_health
- Verifies recentChanges (for Live Feed)
- Verifies athletesNeedingAttention (for Monitoring section)
- Verifies upcomingEvents (for Events Ahead)
- Verifies programSnapshot (for Program section)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestMissionControlAPI:
    """Mission Control endpoint tests for UI refinement"""
    
    def test_mission_control_returns_200(self):
        """Verify endpoint returns successfully"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Mission Control API returns 200")
    
    def test_mission_control_has_all_sections(self):
        """Verify all expected sections are present"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        data = response.json()
        
        # Required sections for refined UI
        required_sections = [
            'priorityAlerts',
            'recentChanges',
            'athletesNeedingAttention',
            'upcomingEvents',
            'programSnapshot'
        ]
        
        for section in required_sections:
            assert section in data, f"Missing section: {section}"
            print(f"✓ Section '{section}' present")
    
    def test_priority_alerts_structure(self):
        """Verify priority alerts have required fields for refined UI"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        data = response.json()
        alerts = data.get('priorityAlerts', [])
        
        assert len(alerts) > 0, "No priority alerts found"
        print(f"✓ Found {len(alerts)} priority alerts")
        
        for i, alert in enumerate(alerts):
            # Check required fields for refined UI
            assert 'category' in alert, f"Alert {i} missing 'category'"
            assert 'athlete_name' in alert, f"Alert {i} missing 'athlete_name'"
            assert 'grad_year' in alert, f"Alert {i} missing 'grad_year'"
            assert 'why_this_surfaced' in alert, f"Alert {i} missing 'why_this_surfaced'"
            assert 'what_changed' in alert, f"Alert {i} missing 'what_changed'"
            assert 'badge_color' in alert, f"Alert {i} missing 'badge_color'"
            assert 'owner' in alert, f"Alert {i} missing 'owner'"
            assert 'pod_health' in alert, f"Alert {i} missing 'pod_health'"
            
            # Validate pod_health structure
            pod_health = alert['pod_health']
            assert 'status' in pod_health, f"Alert {i} pod_health missing 'status'"
            assert 'label' in pod_health, f"Alert {i} pod_health missing 'label'"
            assert pod_health['status'] in ['green', 'yellow', 'red'], f"Invalid pod_health status"
        
        print("✓ All priority alerts have correct structure")
    
    def test_recent_changes_for_live_feed(self):
        """Verify recentChanges (Live Feed) has required fields"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        data = response.json()
        changes = data.get('recentChanges', [])
        
        assert len(changes) > 0, "No recent changes found for Live Feed"
        print(f"✓ Found {len(changes)} recent changes for Live Feed")
        
        for i, change in enumerate(changes):
            assert 'id' in change, f"Change {i} missing 'id'"
            assert 'athleteName' in change, f"Change {i} missing 'athleteName'"
            assert 'description' in change, f"Change {i} missing 'description'"
            assert 'hoursAgo' in change, f"Change {i} missing 'hoursAgo'"
            assert 'sentiment' in change, f"Change {i} missing 'sentiment'"
        
        print("✓ All recent changes have correct structure for Live Feed")
    
    def test_athletes_needing_attention_structure(self):
        """Verify athletes have required fields for Monitoring section"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        data = response.json()
        athletes = data.get('athletesNeedingAttention', [])
        
        assert len(athletes) > 0, "No athletes needing attention found"
        print(f"✓ Found {len(athletes)} athletes in Monitoring section")
        
        for i, athlete in enumerate(athletes):
            # Required fields for scannable row layout
            assert 'athlete_id' in athlete, f"Athlete {i} missing 'athlete_id'"
            assert 'athlete_name' in athlete, f"Athlete {i} missing 'athlete_name'"
            assert 'grad_year' in athlete, f"Athlete {i} missing 'grad_year'"
            assert 'position' in athlete, f"Athlete {i} missing 'position'"
            assert 'category' in athlete, f"Athlete {i} missing 'category'"
            assert 'badge_color' in athlete, f"Athlete {i} missing 'badge_color'"
            assert 'why_this_surfaced' in athlete, f"Athlete {i} missing 'why_this_surfaced'"
            assert 'momentum_score' in athlete, f"Athlete {i} missing 'momentum_score'"
            assert 'momentum_trend' in athlete, f"Athlete {i} missing 'momentum_trend'"
            assert 'owner' in athlete, f"Athlete {i} missing 'owner'"
            assert 'pod_health' in athlete, f"Athlete {i} missing 'pod_health'"
        
        print("✓ All athletes have correct structure for Monitoring section")
    
    def test_upcoming_events_structure(self):
        """Verify events have required fields for Events Ahead section"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        data = response.json()
        events = data.get('upcomingEvents', [])
        
        assert len(events) > 0, "No upcoming events found"
        print(f"✓ Found {len(events)} upcoming events")
        
        for i, event in enumerate(events):
            # Required fields for compact event display with days-away
            assert 'id' in event, f"Event {i} missing 'id'"
            assert 'name' in event, f"Event {i} missing 'name'"
            assert 'type' in event, f"Event {i} missing 'type'"
            assert 'daysAway' in event, f"Event {i} missing 'daysAway'"
            assert 'location' in event, f"Event {i} missing 'location'"
            assert 'athleteCount' in event, f"Event {i} missing 'athleteCount'"
            assert 'expectedSchools' in event, f"Event {i} missing 'expectedSchools'"
            assert 'prepStatus' in event, f"Event {i} missing 'prepStatus'"
        
        print("✓ All events have correct structure for Events Ahead section")
    
    def test_program_snapshot_structure(self):
        """Verify program snapshot has required fields"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        data = response.json()
        snapshot = data.get('programSnapshot', {})
        
        # Required fields for compact program stats
        required_fields = ['totalAthletes', 'needingAttention', 'positiveMomentum', 'upcomingEvents', 'byGradYear']
        
        for field in required_fields:
            assert field in snapshot, f"Program snapshot missing '{field}'"
        
        # Verify byGradYear breakdown
        by_grad_year = snapshot.get('byGradYear', {})
        assert len(by_grad_year) > 0, "byGradYear breakdown is empty"
        
        print("✓ Program snapshot has correct structure")
        print(f"  - Total Athletes: {snapshot.get('totalAthletes')}")
        print(f"  - Needing Attention: {snapshot.get('needingAttention')}")
        print(f"  - Positive Momentum: {snapshot.get('positiveMomentum')}")
        print(f"  - Upcoming Events: {snapshot.get('upcomingEvents')}")
        print(f"  - By Grad Year: {by_grad_year}")
    
    def test_header_stats_data_available(self):
        """Verify data is available for header live status strip"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        data = response.json()
        
        # Header shows: X ALERTS | Y ATHLETES MONITORING | Z EVENTS AHEAD
        alert_count = len(data.get('priorityAlerts', []))
        athlete_count = len(data.get('athletesNeedingAttention', []))
        event_count = len(data.get('upcomingEvents', []))
        
        assert alert_count >= 0, "Alert count should be >= 0"
        assert athlete_count >= 0, "Athlete count should be >= 0"
        assert event_count >= 0, "Event count should be >= 0"
        
        print(f"✓ Header stats available:")
        print(f"  - Alerts: {alert_count}")
        print(f"  - Athletes Monitoring: {athlete_count}")
        print(f"  - Events Ahead: {event_count}")


class TestDataConsistency:
    """Test data consistency across API responses"""
    
    def test_priority_alert_badge_colors_valid(self):
        """Verify badge colors are valid"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        data = response.json()
        
        valid_colors = ['red', 'amber', 'blue', 'gray']
        
        for alert in data.get('priorityAlerts', []):
            color = alert.get('badge_color')
            assert color in valid_colors, f"Invalid badge_color: {color}"
        
        print("✓ All priority alert badge colors are valid")
    
    def test_event_prep_status_valid(self):
        """Verify event prep status values are valid"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        data = response.json()
        
        valid_statuses = ['ready', 'in_progress', 'not_started']
        
        for event in data.get('upcomingEvents', []):
            status = event.get('prepStatus')
            assert status in valid_statuses, f"Invalid prepStatus: {status}"
        
        print("✓ All event prep statuses are valid")
    
    def test_momentum_trends_valid(self):
        """Verify momentum trend values are valid"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        data = response.json()
        
        valid_trends = ['rising', 'declining', 'stable']
        
        for athlete in data.get('athletesNeedingAttention', []):
            trend = athlete.get('momentum_trend')
            assert trend in valid_trends, f"Invalid momentum_trend: {trend}"
        
        print("✓ All momentum trends are valid")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

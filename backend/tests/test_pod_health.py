"""
Test Pod Health Feature for Mission Control
Tests the pod_health indicators on priority alerts and athletes needing attention
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')


class TestPodHealthOnPriorityAlerts:
    """Tests for pod_health on GET /api/mission-control priorityAlerts"""
    
    def test_priority_alerts_have_pod_health_object(self):
        """Each priority alert should have a pod_health object"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        assert response.status_code == 200
        data = response.json()
        
        alerts = data.get('priorityAlerts', [])
        assert len(alerts) > 0, "Should have at least one priority alert"
        
        for alert in alerts:
            assert 'pod_health' in alert, f"Alert {alert['athlete_id']} missing pod_health"
            pod_health = alert['pod_health']
            assert isinstance(pod_health, dict), "pod_health should be a dict"
    
    def test_priority_alert_pod_health_has_required_fields(self):
        """pod_health should have status, label, and reason fields"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        data = response.json()
        
        for alert in data.get('priorityAlerts', []):
            pod_health = alert['pod_health']
            assert 'status' in pod_health, "pod_health missing status"
            assert 'label' in pod_health, "pod_health missing label"
            assert 'reason' in pod_health, "pod_health missing reason"
    
    def test_priority_alert_pod_health_status_values(self):
        """pod_health.status should be one of green/yellow/red"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        data = response.json()
        
        valid_statuses = ['green', 'yellow', 'red']
        for alert in data.get('priorityAlerts', []):
            status = alert['pod_health']['status']
            assert status in valid_statuses, f"Invalid status: {status}"
    
    def test_priority_alert_pod_health_label_matches_status(self):
        """pod_health.label should correspond to status"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        data = response.json()
        
        status_to_label = {
            'green': 'Healthy',
            'yellow': 'Needs Attention',
            'red': 'At Risk'
        }
        
        for alert in data.get('priorityAlerts', []):
            pod_health = alert['pod_health']
            expected_label = status_to_label[pod_health['status']]
            assert pod_health['label'] == expected_label, \
                f"Status {pod_health['status']} should have label {expected_label}, got {pod_health['label']}"
    
    def test_priority_alert_pod_health_reason_is_string(self):
        """pod_health.reason should be a human-readable string"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        data = response.json()
        
        for alert in data.get('priorityAlerts', []):
            reason = alert['pod_health']['reason']
            assert isinstance(reason, str), "reason should be a string"
            assert len(reason) > 0, "reason should not be empty"


class TestPodHealthOnAthletesNeedingAttention:
    """Tests for pod_health on GET /api/mission-control athletesNeedingAttention"""
    
    def test_athletes_needing_attention_have_pod_health_object(self):
        """Each athlete should have a pod_health object"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        assert response.status_code == 200
        data = response.json()
        
        athletes = data.get('athletesNeedingAttention', [])
        assert len(athletes) > 0, "Should have at least one athlete needing attention"
        
        for athlete in athletes:
            assert 'pod_health' in athlete, f"Athlete {athlete['athlete_id']} missing pod_health"
            pod_health = athlete['pod_health']
            assert isinstance(pod_health, dict), "pod_health should be a dict"
    
    def test_athletes_pod_health_has_required_fields(self):
        """pod_health should have status, label, and reason fields"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        data = response.json()
        
        for athlete in data.get('athletesNeedingAttention', []):
            pod_health = athlete['pod_health']
            assert 'status' in pod_health, "pod_health missing status"
            assert 'label' in pod_health, "pod_health missing label"
            assert 'reason' in pod_health, "pod_health missing reason"
    
    def test_athletes_pod_health_status_values(self):
        """pod_health.status should be one of green/yellow/red"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        data = response.json()
        
        valid_statuses = ['green', 'yellow', 'red']
        for athlete in data.get('athletesNeedingAttention', []):
            status = athlete['pod_health']['status']
            assert status in valid_statuses, f"Invalid status: {status}"


class TestPodHealthSignalLogic:
    """Tests for the 5-signal pod health calculation logic"""
    
    def test_athlete_with_21_plus_days_inactive_is_red(self):
        """Athletes with 21+ days inactive should be red/At Risk"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        data = response.json()
        
        all_items = data.get('priorityAlerts', []) + data.get('athletesNeedingAttention', [])
        
        # athlete_3 (Emma Chen) is 28 days inactive
        emma = [i for i in all_items if i['athlete_id'] == 'athlete_3']
        assert len(emma) > 0, "Emma Chen (athlete_3) not found"
        
        pod_health = emma[0]['pod_health']
        assert pod_health['status'] == 'red', f"Expected red, got {pod_health['status']}"
        assert pod_health['label'] == 'At Risk', f"Expected 'At Risk', got {pod_health['label']}"
        assert '28 days' in pod_health['reason'], f"Reason should mention 28 days: {pod_health['reason']}"
    
    def test_athlete_with_active_blocker_is_yellow(self):
        """Athletes with active blockers should be yellow/Needs Attention"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        data = response.json()
        
        all_items = data.get('priorityAlerts', []) + data.get('athletesNeedingAttention', [])
        
        # athlete_5 (Olivia Anderson) has an active blocker
        olivia = [i for i in all_items if i['athlete_id'] == 'athlete_5']
        assert len(olivia) > 0, "Olivia Anderson (athlete_5) not found"
        
        pod_health = olivia[0]['pod_health']
        assert pod_health['status'] == 'yellow', f"Expected yellow, got {pod_health['status']}"
        assert pod_health['label'] == 'Needs Attention', f"Expected 'Needs Attention', got {pod_health['label']}"
        assert 'blocker' in pod_health['reason'].lower(), f"Reason should mention blocker: {pod_health['reason']}"
    
    def test_athlete_with_ownership_gap_is_yellow(self):
        """Athletes with ownership gaps should be yellow/Needs Attention"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        data = response.json()
        
        all_items = data.get('priorityAlerts', []) + data.get('athletesNeedingAttention', [])
        
        # athlete_12 (Liam Moore) has an ownership gap
        liam = [i for i in all_items if i['athlete_id'] == 'athlete_12']
        assert len(liam) > 0, "Liam Moore (athlete_12) not found"
        
        pod_health = liam[0]['pod_health']
        assert pod_health['status'] == 'yellow', f"Expected yellow, got {pod_health['status']}"
        assert pod_health['label'] == 'Needs Attention', f"Expected 'Needs Attention', got {pod_health['label']}"
        assert 'ownership' in pod_health['reason'].lower(), f"Reason should mention ownership: {pod_health['reason']}"
    
    def test_healthy_athlete_is_green(self):
        """Athletes without issues should be green/Healthy"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        data = response.json()
        
        all_items = data.get('athletesNeedingAttention', [])
        
        # Look for any athlete with green status
        green_athletes = [i for i in all_items if i['pod_health']['status'] == 'green']
        if len(green_athletes) > 0:
            athlete = green_athletes[0]
            assert athlete['pod_health']['label'] == 'Healthy', f"Green should be labeled 'Healthy'"
            assert 'track' in athlete['pod_health']['reason'].lower() or 'issue' in athlete['pod_health']['reason'].lower(), \
                f"Reason should be 'On track' or mention issues: {athlete['pod_health']['reason']}"


class TestPodHealthDataIntegrity:
    """Tests for pod health data consistency and integration"""
    
    def test_pod_health_does_not_break_existing_fields(self):
        """pod_health addition should not remove any existing fields"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        data = response.json()
        
        # Required fields for priority alerts
        required_alert_fields = ['category', 'athlete_id', 'athlete_name', 'why_this_surfaced', 
                                  'what_changed', 'recommended_action', 'owner', 'score']
        
        for alert in data.get('priorityAlerts', []):
            for field in required_alert_fields:
                assert field in alert, f"Priority alert missing required field: {field}"
        
        # Required fields for athletes needing attention
        required_athlete_fields = ['category', 'athlete_id', 'athlete_name', 'why_this_surfaced', 
                                    'owner', 'grad_year', 'position', 'team']
        
        for athlete in data.get('athletesNeedingAttention', []):
            for field in required_athlete_fields:
                assert field in athlete, f"Athlete missing required field: {field}"
    
    def test_all_priority_alerts_have_consistent_pod_health(self):
        """All priority alerts for same athlete should have same pod_health"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        data = response.json()
        
        alerts_by_athlete = {}
        for alert in data.get('priorityAlerts', []):
            athlete_id = alert['athlete_id']
            if athlete_id not in alerts_by_athlete:
                alerts_by_athlete[athlete_id] = []
            alerts_by_athlete[athlete_id].append(alert['pod_health'])
        
        for athlete_id, health_list in alerts_by_athlete.items():
            if len(health_list) > 1:
                first = health_list[0]
                for health in health_list[1:]:
                    assert health['status'] == first['status'], \
                        f"Athlete {athlete_id} has inconsistent pod_health status"

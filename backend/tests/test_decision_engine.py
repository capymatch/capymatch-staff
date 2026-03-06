"""
Backend tests for CapyMatch Decision Engine and Mission Control API
Tests intervention distribution, explainability fields, and athlete data
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDebugInterventions:
    """Test /api/debug/interventions - Decision Engine intervention distribution"""

    def test_all_six_categories_represented(self):
        """Verify all 6 intervention categories have > 0 interventions"""
        response = requests.get(f"{BASE_URL}/api/debug/interventions")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        by_category = data.get("by_category", {})
        
        expected_categories = [
            "momentum_drop",
            "blocker",
            "deadline_proximity",
            "engagement_drop",
            "ownership_gap",
            "readiness_issue"
        ]
        
        for category in expected_categories:
            count = by_category.get(category, 0)
            assert count > 0, f"Category '{category}' has 0 interventions - expected > 0"
            print(f"✓ {category}: {count} interventions")

    def test_momentum_drop_not_dominant(self):
        """Verify momentum_drop is NOT the dominant category (< 25% of total)"""
        response = requests.get(f"{BASE_URL}/api/debug/interventions")
        assert response.status_code == 200
        
        data = response.json()
        total = data.get("total_interventions", 0)
        momentum_drop_count = data.get("by_category", {}).get("momentum_drop", 0)
        
        assert total > 0, "No interventions detected"
        
        percentage = (momentum_drop_count / total) * 100
        print(f"momentum_drop: {momentum_drop_count}/{total} = {percentage:.1f}%")
        
        assert percentage < 25, f"momentum_drop is {percentage:.1f}% - should be < 25%"

    def test_ownership_gap_has_interventions(self):
        """Verify ownership_gap has > 0 interventions (was 0% before fix)"""
        response = requests.get(f"{BASE_URL}/api/debug/interventions")
        assert response.status_code == 200
        
        data = response.json()
        ownership_gap_count = data.get("by_category", {}).get("ownership_gap", 0)
        
        assert ownership_gap_count > 0, "ownership_gap has 0 interventions"
        print(f"✓ ownership_gap has {ownership_gap_count} interventions")

    def test_interventions_have_explainability_fields(self):
        """Verify interventions have required explainability fields"""
        response = requests.get(f"{BASE_URL}/api/debug/interventions")
        assert response.status_code == 200
        
        data = response.json()
        interventions = data.get("interventions", [])
        
        assert len(interventions) > 0, "No interventions to check"
        
        required_fields = [
            "why_this_surfaced",
            "what_changed",
            "recommended_action",
            "owner",
            "score",
            "category",
            "athlete_name",
            "badge_color",
            "priority_tier"
        ]
        
        for intervention in interventions[:5]:  # Check first 5
            for field in required_fields:
                assert field in intervention, f"Missing field '{field}' in intervention"
                assert intervention[field] is not None, f"Field '{field}' is None"
            print(f"✓ Intervention for {intervention['athlete_name']} has all required fields")

    def test_intervention_distribution_balanced(self):
        """Verify no single category exceeds 35% of total"""
        response = requests.get(f"{BASE_URL}/api/debug/interventions")
        assert response.status_code == 200
        
        data = response.json()
        total = data.get("total_interventions", 0)
        by_category = data.get("by_category", {})
        
        for category, count in by_category.items():
            percentage = (count / total) * 100
            print(f"{category}: {count}/{total} = {percentage:.1f}%")
            assert percentage <= 35, f"{category} is {percentage:.1f}% - should be <= 35%"


class TestMissionControl:
    """Test /api/mission-control - Priority alerts and athletes needing attention"""

    def test_mission_control_returns_all_sections(self):
        """Verify mission control returns all expected data sections"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        assert response.status_code == 200
        
        data = response.json()
        
        required_sections = [
            "priorityAlerts",
            "recentChanges",
            "athletesNeedingAttention",
            "upcomingEvents",
            "programSnapshot"
        ]
        
        for section in required_sections:
            assert section in data, f"Missing section '{section}'"
            print(f"✓ {section} present")

    def test_priority_alerts_count(self):
        """Verify priorityAlerts has 2-4 entries"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        assert response.status_code == 200
        
        data = response.json()
        alerts = data.get("priorityAlerts", [])
        count = len(alerts)
        
        print(f"Priority alerts count: {count}")
        assert 2 <= count <= 4, f"Expected 2-4 priority alerts, got {count}"

    def test_priority_alerts_have_explainability_fields(self):
        """Verify priority alerts have Decision Engine explainability fields"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        assert response.status_code == 200
        
        data = response.json()
        alerts = data.get("priorityAlerts", [])
        
        assert len(alerts) > 0, "No priority alerts to check"
        
        required_fields = [
            "why_this_surfaced",
            "what_changed",
            "recommended_action",
            "owner",
            "athlete_name",
            "badge_color"
        ]
        
        for alert in alerts:
            for field in required_fields:
                assert field in alert, f"Priority alert missing field '{field}'"
                assert alert[field] is not None and alert[field] != "", f"Field '{field}' is empty"
            print(f"✓ Alert for {alert['athlete_name']} has all explainability fields")

    def test_athletes_needing_attention_count(self):
        """Verify athletesNeedingAttention has 12 or fewer entries"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        assert response.status_code == 200
        
        data = response.json()
        athletes = data.get("athletesNeedingAttention", [])
        count = len(athletes)
        
        print(f"Athletes needing attention: {count}")
        assert count <= 12, f"Expected <= 12 athletes needing attention, got {count}"

    def test_athletes_attention_have_diverse_categories(self):
        """Verify athletes needing attention have diverse intervention categories"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        assert response.status_code == 200
        
        data = response.json()
        athletes = data.get("athletesNeedingAttention", [])
        
        categories = set()
        for athlete in athletes:
            if "category" in athlete:
                categories.add(athlete["category"])
        
        print(f"Categories in athletes needing attention: {categories}")
        assert len(categories) >= 3, f"Expected at least 3 diverse categories, got {len(categories)}"

    def test_athletes_attention_have_required_fields(self):
        """Verify athletes needing attention have all required display fields"""
        response = requests.get(f"{BASE_URL}/api/mission-control")
        assert response.status_code == 200
        
        data = response.json()
        athletes = data.get("athletesNeedingAttention", [])
        
        assert len(athletes) > 0, "No athletes needing attention to check"
        
        required_fields = [
            "athlete_name",
            "grad_year",
            "position",
            "team",
            "momentum_trend",
            "momentum_score",
            "category",
            "badge_color",
            "why_this_surfaced",
            "recruiting_stage",
            "school_targets",
            "owner"
        ]
        
        for athlete in athletes[:5]:  # Check first 5
            for field in required_fields:
                assert field in athlete, f"Missing field '{field}' in athlete"
            print(f"✓ {athlete['athlete_name']} has all required fields")


class TestAthletes:
    """Test /api/athletes - Athlete data"""

    def test_athletes_returns_25(self):
        """Verify /api/athletes returns exactly 25 athletes"""
        response = requests.get(f"{BASE_URL}/api/athletes")
        assert response.status_code == 200
        
        athletes = response.json()
        count = len(athletes)
        
        print(f"Athletes count: {count}")
        assert count == 25, f"Expected 25 athletes, got {count}"

    def test_athletes_have_required_fields(self):
        """Verify athletes have all required fields"""
        response = requests.get(f"{BASE_URL}/api/athletes")
        assert response.status_code == 200
        
        athletes = response.json()
        
        required_fields = [
            "id",
            "firstName",
            "lastName",
            "fullName",
            "gradYear",
            "position",
            "team",
            "recruitingStage",
            "momentumScore",
            "momentumTrend",
            "lastActivity",
            "daysSinceActivity",
            "schoolTargets",
            "activeInterest",
            "archetype"
        ]
        
        for athlete in athletes[:5]:  # Check first 5
            for field in required_fields:
                assert field in athlete, f"Missing field '{field}' in athlete"
            print(f"✓ {athlete['fullName']} has all required fields")

    def test_athletes_have_valid_grad_years(self):
        """Verify athletes have valid grad years (2025, 2026, 2027)"""
        response = requests.get(f"{BASE_URL}/api/athletes")
        assert response.status_code == 200
        
        athletes = response.json()
        valid_years = {2025, 2026, 2027}
        
        for athlete in athletes:
            assert athlete["gradYear"] in valid_years, f"Invalid grad year: {athlete['gradYear']}"


class TestUpcomingEvents:
    """Test /api/mission-control/events - Upcoming events"""

    def test_upcoming_events_exist(self):
        """Verify upcoming events are returned"""
        response = requests.get(f"{BASE_URL}/api/mission-control/events")
        assert response.status_code == 200
        
        events = response.json()
        assert len(events) > 0, "No upcoming events found"
        print(f"Found {len(events)} upcoming events")

    def test_events_have_required_fields(self):
        """Verify events have required fields for display"""
        response = requests.get(f"{BASE_URL}/api/mission-control/events")
        assert response.status_code == 200
        
        events = response.json()
        
        required_fields = [
            "id",
            "name",
            "type",
            "daysAway",
            "location",
            "expectedSchools",
            "prepStatus"
        ]
        
        for event in events:
            for field in required_fields:
                assert field in event, f"Missing field '{field}' in event"
            print(f"✓ Event '{event['name']}' has all required fields")


class TestMomentumSignals:
    """Test /api/mission-control/signals - What Changed Today"""

    def test_momentum_signals_exist(self):
        """Verify momentum signals are returned"""
        response = requests.get(f"{BASE_URL}/api/mission-control/signals")
        assert response.status_code == 200
        
        signals = response.json()
        assert len(signals) > 0, "No momentum signals found"
        print(f"Found {len(signals)} momentum signals")

    def test_signals_have_required_fields(self):
        """Verify signals have required fields for display"""
        response = requests.get(f"{BASE_URL}/api/mission-control/signals")
        assert response.status_code == 200
        
        signals = response.json()
        
        required_fields = [
            "id",
            "athleteId",
            "athleteName",
            "type",
            "sentiment",
            "description",
            "timestamp"
        ]
        
        for signal in signals[:5]:
            for field in required_fields:
                assert field in signal, f"Missing field '{field}' in signal"
            print(f"✓ Signal for {signal['athleteName']} has all required fields")


class TestHealthEndpoints:
    """Test basic API health"""

    def test_api_root(self):
        """Verify API root endpoint works"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        print(f"✓ API root: {data['message']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

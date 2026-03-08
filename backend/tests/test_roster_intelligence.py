"""
Test Roster Intelligence Enhancements
- Momentum labels (strong/stable/declining)
- 7-stage recruiting pipeline (prospect/contacted/responded/talking/visit/offer/committed)
- Inline risk alerts per athlete
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
DIRECTOR_EMAIL = "director@capymatch.com"
DIRECTOR_PASSWORD = "director123"


@pytest.fixture(scope="module")
def director_token():
    """Get director authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": DIRECTOR_EMAIL, "password": DIRECTOR_PASSWORD}
    )
    assert response.status_code == 200, f"Failed to login as director: {response.text}"
    data = response.json()
    return data.get("access_token") or data.get("token")


@pytest.fixture(scope="module")
def roster_data(director_token):
    """Fetch roster data once for all tests"""
    response = requests.get(
        f"{BASE_URL}/api/roster",
        headers={"Authorization": f"Bearer {director_token}"}
    )
    assert response.status_code == 200, f"Failed to fetch roster: {response.text}"
    return response.json()


class TestMomentumLabels:
    """Test momentum_label field (strong/stable/declining) based on score, trend, activity"""

    def test_roster_returns_momentum_label_field(self, roster_data):
        """Verify each athlete has momentum_label field"""
        athletes = roster_data.get("athletes", [])
        assert len(athletes) > 0, "No athletes returned"
        
        for athlete in athletes:
            assert "momentum_label" in athlete, f"Athlete {athlete.get('name')} missing momentum_label"
            assert athlete["momentum_label"] in ["strong", "stable", "declining"], \
                f"Invalid momentum_label '{athlete['momentum_label']}' for {athlete.get('name')}"
        
        print(f"PASS: All {len(athletes)} athletes have valid momentum_label field")

    def test_momentum_distribution(self, roster_data):
        """Verify momentum distribution: ~13 strong, ~6 stable, ~6 declining"""
        athletes = roster_data.get("athletes", [])
        
        strong_count = sum(1 for a in athletes if a.get("momentum_label") == "strong")
        stable_count = sum(1 for a in athletes if a.get("momentum_label") == "stable")
        declining_count = sum(1 for a in athletes if a.get("momentum_label") == "declining")
        
        print(f"Momentum distribution: Strong={strong_count}, Stable={stable_count}, Declining={declining_count}")
        
        # Expected: 13 strong, 6 stable, 6 declining (with some tolerance)
        assert strong_count >= 10, f"Expected at least 10 strong athletes, got {strong_count}"
        assert stable_count >= 4, f"Expected at least 4 stable athletes, got {stable_count}"
        assert declining_count >= 4, f"Expected at least 4 declining athletes, got {declining_count}"
        
        # Total should be 25
        total = strong_count + stable_count + declining_count
        assert total == 25, f"Expected 25 athletes total, got {total}"
        
        print(f"PASS: Momentum distribution verified")

    def test_momentum_label_logic(self, roster_data):
        """Verify momentum_label aligns with momentum_score, trend, and activity"""
        athletes = roster_data.get("athletes", [])
        
        for athlete in athletes:
            label = athlete.get("momentum_label")
            score = athlete.get("momentum_score", 0)
            trend = athlete.get("momentum_trend", "stable")
            days = athlete.get("days_since_activity")
            
            # Verify strong: rising trend and score >= 5
            if label == "strong":
                # Should have rising trend and good score OR high score
                assert score >= 5 or trend == "rising", \
                    f"{athlete['name']}: strong label but score={score}, trend={trend}"
            
            # Verify declining: score <= 0 or (declining trend and inactive > 10 days)
            if label == "declining":
                valid = score <= 0 or (trend == "declining" and (days or 0) > 10)
                assert valid, f"{athlete['name']}: declining label but score={score}, trend={trend}, days={days}"
        
        print("PASS: Momentum label logic verified")


class TestRecruitingPipeline:
    """Test 7-stage recruiting pipeline (prospect/contacted/responded/talking/visit/offer/committed)"""

    def test_roster_returns_recruiting_stage(self, roster_data):
        """Verify each athlete has recruiting_stage field with valid pipeline stage"""
        athletes = roster_data.get("athletes", [])
        valid_stages = ["prospect", "contacted", "responded", "talking", "visit", "offer", "committed"]
        
        for athlete in athletes:
            assert "recruiting_stage" in athlete, f"Athlete {athlete.get('name')} missing recruiting_stage"
            stage = athlete.get("recruiting_stage")
            assert stage in valid_stages, \
                f"Invalid recruiting_stage '{stage}' for {athlete.get('name')}. Expected one of {valid_stages}"
        
        print(f"PASS: All athletes have valid 7-stage recruiting_stage field")

    def test_stage_distribution(self, roster_data):
        """Verify stage distribution across athletes"""
        athletes = roster_data.get("athletes", [])
        
        stage_counts = {}
        for athlete in athletes:
            stage = athlete.get("recruiting_stage")
            stage_counts[stage] = stage_counts.get(stage, 0) + 1
        
        print(f"Stage distribution: {stage_counts}")
        
        # Verify we have multiple stages represented
        assert len(stage_counts) >= 3, f"Expected at least 3 different stages, got {list(stage_counts.keys())}"
        
        # Based on agent_to_agent_context: talking=12, contacted=7, offer=6
        talking = stage_counts.get("talking", 0)
        contacted = stage_counts.get("contacted", 0)
        offer = stage_counts.get("offer", 0)
        
        print(f"Key stages - Talking: {talking}, Contacted: {contacted}, Offer: {offer}")
        assert talking >= 5, f"Expected at least 5 athletes in 'talking' stage, got {talking}"
        
        print("PASS: Stage distribution verified")


class TestRiskAlerts:
    """Test inline risk alerts from decision engine"""

    def test_roster_returns_risk_alerts_field(self, roster_data):
        """Verify each athlete has risk_alerts array and risk_level field"""
        athletes = roster_data.get("athletes", [])
        
        for athlete in athletes:
            assert "risk_alerts" in athlete, f"Athlete {athlete.get('name')} missing risk_alerts"
            assert isinstance(athlete["risk_alerts"], list), \
                f"risk_alerts should be a list for {athlete.get('name')}"
            assert "risk_level" in athlete, f"Athlete {athlete.get('name')} missing risk_level"
            # risk_level can be "critical", "warning", or None
            assert athlete["risk_level"] in ["critical", "warning", None], \
                f"Invalid risk_level '{athlete['risk_level']}' for {athlete.get('name')}"
        
        print("PASS: All athletes have risk_alerts array and risk_level field")

    def test_athletes_with_risk_alerts(self, roster_data):
        """Verify ~12 athletes have non-empty risk_alerts"""
        athletes = roster_data.get("athletes", [])
        
        athletes_with_alerts = [a for a in athletes if a.get("risk_alerts") and len(a["risk_alerts"]) > 0]
        
        print(f"Athletes with risk alerts: {len(athletes_with_alerts)}")
        
        # Expected: ~12 athletes with risk alerts (based on problem statement)
        assert len(athletes_with_alerts) >= 8, \
            f"Expected at least 8 athletes with risk_alerts, got {len(athletes_with_alerts)}"
        assert len(athletes_with_alerts) <= 15, \
            f"Expected at most 15 athletes with risk_alerts, got {len(athletes_with_alerts)}"
        
        print("PASS: Risk alerts distribution verified")

    def test_risk_alert_structure(self, roster_data):
        """Verify risk_alerts have required structure (category, why, badge_color)"""
        athletes = roster_data.get("athletes", [])
        
        athletes_with_alerts = [a for a in athletes if a.get("risk_alerts") and len(a["risk_alerts"]) > 0]
        
        for athlete in athletes_with_alerts:
            for alert in athlete["risk_alerts"]:
                assert "why" in alert, f"Alert missing 'why' for {athlete.get('name')}"
                # badge_color should be present
                assert "badge_color" in alert, f"Alert missing 'badge_color' for {athlete.get('name')}"
        
        print("PASS: Risk alert structure verified")

    def test_risk_level_consistency(self, roster_data):
        """Verify risk_level is 'critical' if any alert has red badge_color"""
        athletes = roster_data.get("athletes", [])
        
        critical_count = 0
        warning_count = 0
        
        for athlete in athletes:
            alerts = athlete.get("risk_alerts", [])
            risk_level = athlete.get("risk_level")
            
            if not alerts:
                assert risk_level is None, \
                    f"{athlete['name']}: no alerts but risk_level={risk_level}"
            else:
                has_red = any(a.get("badge_color") == "red" for a in alerts)
                if has_red:
                    assert risk_level == "critical", \
                        f"{athlete['name']}: has red alert but risk_level={risk_level}"
                    critical_count += 1
                else:
                    assert risk_level == "warning", \
                        f"{athlete['name']}: has alerts but no red, risk_level={risk_level}"
                    warning_count += 1
        
        print(f"Risk levels - Critical: {critical_count}, Warning: {warning_count}")
        print("PASS: Risk level consistency verified")


class TestNeedsAttentionSummary:
    """Test needsAttention array in response"""

    def test_needs_attention_array_exists(self, roster_data):
        """Verify needsAttention array is returned with athlete risk summaries"""
        needs_attention = roster_data.get("needsAttention", [])
        
        assert isinstance(needs_attention, list), "needsAttention should be a list"
        
        # Should have items for athletes with risk_alerts
        athletes_with_alerts = [a for a in roster_data.get("athletes", []) 
                              if a.get("risk_alerts") and len(a["risk_alerts"]) > 0]
        
        assert len(needs_attention) == len(athletes_with_alerts), \
            f"needsAttention count ({len(needs_attention)}) should match athletes with alerts ({len(athletes_with_alerts)})"
        
        print(f"PASS: needsAttention has {len(needs_attention)} items matching athletes with alerts")

    def test_needs_attention_structure(self, roster_data):
        """Verify needsAttention items have required fields"""
        needs_attention = roster_data.get("needsAttention", [])
        
        for item in needs_attention:
            assert "athlete_id" in item, "needsAttention item missing athlete_id"
            assert "athlete_name" in item, "needsAttention item missing athlete_name"
            assert "alerts" in item, "needsAttention item missing alerts"
            assert "risk_level" in item, "needsAttention item missing risk_level"
        
        print("PASS: needsAttention structure verified")


class TestExistingFunctionality:
    """Test that existing roster functionality still works"""

    def test_team_groups_exist(self, roster_data):
        """Verify teamGroups for Team View"""
        team_groups = roster_data.get("teamGroups", [])
        assert len(team_groups) >= 1, "Expected at least 1 team group"
        
        for group in team_groups:
            assert "team" in group
            assert "athletes" in group
            assert "count" in group
        
        print(f"PASS: teamGroups has {len(team_groups)} teams")

    def test_age_groups_exist(self, roster_data):
        """Verify ageGroups for Age Group View"""
        age_groups = roster_data.get("ageGroups", [])
        assert len(age_groups) >= 1, "Expected at least 1 age group"
        
        for group in age_groups:
            assert "label" in group
            assert "athletes" in group
            assert "count" in group
        
        print(f"PASS: ageGroups has {len(age_groups)} groups")

    def test_coach_groups_exist(self, roster_data):
        """Verify groups (coach groups) for Coach View"""
        groups = roster_data.get("groups", [])
        assert len(groups) >= 1, "Expected at least 1 coach group"
        
        for group in groups:
            assert "coach_name" in group
            assert "athletes" in group
            assert "count" in group
        
        print(f"PASS: groups has {len(groups)} coach groups")

    def test_summary_exists(self, roster_data):
        """Verify summary stats"""
        summary = roster_data.get("summary", {})
        
        assert "total_athletes" in summary
        assert "assigned" in summary
        assert "unassigned" in summary
        assert "coach_count" in summary
        assert "teams" in summary
        
        print(f"PASS: Summary - {summary['total_athletes']} athletes, {summary['teams']} teams, {summary['coach_count']} coaches")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

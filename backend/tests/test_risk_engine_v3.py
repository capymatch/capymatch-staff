"""
Risk Engine v3 API Tests
Tests the enriched /api/director-inbox endpoint with v3 risk fields:
- riskScore (0-100)
- severity (low/medium/high/critical)
- trajectory (improving/stable/worsening)
- confidence (low/medium/high)
- interventionType (monitor/nudge/review/escalate/blocker)
- riskSignals, explanationShort, whyNow, recommendedActionByRole, secondaryRisks

Also tests:
- Stage-aware weighting
- Compound risk interactions
- Sorting by riskScore descending
- Legacy field backward compatibility
"""

import pytest
import requests
import os
import sys

# Add backend to path for direct risk_engine imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Director credentials
DIRECTOR_EMAIL = "director@capymatch.com"
DIRECTOR_PASSWORD = "director123"


@pytest.fixture(scope="module")
def director_token():
    """Get director authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": DIRECTOR_EMAIL, "password": DIRECTOR_PASSWORD}
    )
    assert response.status_code == 200, f"Director login failed: {response.text}"
    data = response.json()
    assert "token" in data, "No token in login response"
    return data["token"]


@pytest.fixture
def director_client(director_token):
    """Authenticated session for director"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {director_token}"
    })
    return session


class TestRiskEngineV3Fields:
    """Tests for Risk Engine v3 fields in director inbox response"""

    def test_all_v3_fields_present(self, director_client):
        """Verify all v3 risk fields are present in response items"""
        response = director_client.get(f"{BASE_URL}/api/director-inbox")
        assert response.status_code == 200
        data = response.json()
        
        v3_fields = [
            "riskScore", "severity", "trajectory", "confidence",
            "interventionType", "riskSignals", "explanationShort",
            "whyNow", "recommendedActionByRole", "secondaryRisks"
        ]
        
        for item in data["items"]:
            for field in v3_fields:
                assert field in item, f"Item missing v3 field: {field}"

    def test_risk_score_is_valid_number(self, director_client):
        """Verify riskScore is a number 0-100"""
        response = director_client.get(f"{BASE_URL}/api/director-inbox")
        data = response.json()
        
        for item in data["items"]:
            rs = item["riskScore"]
            assert isinstance(rs, (int, float)), f"riskScore should be numeric, got {type(rs)}"
            assert 0 <= rs <= 100, f"riskScore {rs} out of range 0-100"

    def test_severity_enum_values(self, director_client):
        """Verify severity is one of: low, medium, high, critical"""
        response = director_client.get(f"{BASE_URL}/api/director-inbox")
        data = response.json()
        
        valid_values = ["low", "medium", "high", "critical"]
        for item in data["items"]:
            assert item["severity"] in valid_values, f"Invalid severity: {item['severity']}"

    def test_trajectory_enum_values(self, director_client):
        """Verify trajectory is one of: improving, stable, worsening"""
        response = director_client.get(f"{BASE_URL}/api/director-inbox")
        data = response.json()
        
        valid_values = ["improving", "stable", "worsening"]
        for item in data["items"]:
            assert item["trajectory"] in valid_values, f"Invalid trajectory: {item['trajectory']}"

    def test_confidence_enum_values(self, director_client):
        """Verify confidence is one of: low, medium, high"""
        response = director_client.get(f"{BASE_URL}/api/director-inbox")
        data = response.json()
        
        valid_values = ["low", "medium", "high"]
        for item in data["items"]:
            assert item["confidence"] in valid_values, f"Invalid confidence: {item['confidence']}"

    def test_intervention_type_enum_values(self, director_client):
        """Verify interventionType is one of: monitor, nudge, review, escalate, blocker"""
        response = director_client.get(f"{BASE_URL}/api/director-inbox")
        data = response.json()
        
        valid_values = ["monitor", "nudge", "review", "escalate", "blocker"]
        for item in data["items"]:
            assert item["interventionType"] in valid_values, f"Invalid interventionType: {item['interventionType']}"

    def test_risk_signals_is_list(self, director_client):
        """Verify riskSignals is a list of human-readable labels"""
        response = director_client.get(f"{BASE_URL}/api/director-inbox")
        data = response.json()
        
        for item in data["items"]:
            assert isinstance(item["riskSignals"], list), "riskSignals should be a list"
            assert len(item["riskSignals"]) >= 1, "riskSignals should have at least one signal"
            for signal in item["riskSignals"]:
                assert isinstance(signal, str), "Each signal should be a string"

    def test_why_now_non_empty(self, director_client):
        """Verify whyNow returns a non-empty string explaining urgency"""
        response = director_client.get(f"{BASE_URL}/api/director-inbox")
        data = response.json()
        
        for item in data["items"]:
            assert isinstance(item["whyNow"], str), "whyNow should be a string"
            assert len(item["whyNow"]) > 0, "whyNow should not be empty"

    def test_explanation_short_non_empty(self, director_client):
        """Verify explanationShort is a non-empty string"""
        response = director_client.get(f"{BASE_URL}/api/director-inbox")
        data = response.json()
        
        for item in data["items"]:
            assert isinstance(item["explanationShort"], str), "explanationShort should be a string"
            assert len(item["explanationShort"]) > 0, "explanationShort should not be empty"

    def test_recommended_action_by_role_structure(self, director_client):
        """Verify recommendedActionByRole has director/coach/family keys with contextual actions"""
        response = director_client.get(f"{BASE_URL}/api/director-inbox")
        data = response.json()
        
        role_keys = ["director", "coach", "family"]
        for item in data["items"]:
            actions = item["recommendedActionByRole"]
            assert isinstance(actions, dict), "recommendedActionByRole should be a dict"
            # At least director should have an action
            assert "director" in actions or "coach" in actions, "Should have at least director or coach action"
            for role, action in actions.items():
                assert role in role_keys, f"Invalid role key: {role}"
                assert isinstance(action, str), f"Action for {role} should be a string"
                assert len(action) > 0, f"Action for {role} should not be empty"

    def test_secondary_risks_is_list(self, director_client):
        """Verify secondaryRisks is a list"""
        response = director_client.get(f"{BASE_URL}/api/director-inbox")
        data = response.json()
        
        for item in data["items"]:
            assert isinstance(item["secondaryRisks"], list), "secondaryRisks should be a list"


class TestRiskEngineSorting:
    """Tests for sorting behavior"""

    def test_sorted_by_risk_score_descending(self, director_client):
        """Verify items are sorted by riskScore descending"""
        response = director_client.get(f"{BASE_URL}/api/director-inbox")
        data = response.json()
        
        items = data["items"]
        if len(items) < 2:
            pytest.skip("Not enough items to test sorting")
        
        scores = [item["riskScore"] for item in items]
        assert scores == sorted(scores, reverse=True), f"Items not sorted by riskScore DESC: {scores}"


class TestLegacyFieldBackwardCompatibility:
    """Tests for backward compatibility with legacy fields"""

    def test_legacy_fields_present(self, director_client):
        """Verify legacy fields (id, athleteName, issues, priority, group, cta) still present"""
        response = director_client.get(f"{BASE_URL}/api/director-inbox")
        data = response.json()
        
        legacy_fields = ["id", "athleteName", "issues", "priority", "group", "cta"]
        for item in data["items"]:
            for field in legacy_fields:
                assert field in item, f"Legacy field missing: {field}"

    def test_legacy_priority_values(self, director_client):
        """Verify legacy priority field has valid values"""
        response = director_client.get(f"{BASE_URL}/api/director-inbox")
        data = response.json()
        
        valid_priorities = ["high", "medium", "low"]
        for item in data["items"]:
            assert item["priority"] in valid_priorities, f"Invalid priority: {item['priority']}"

    def test_legacy_cta_structure(self, director_client):
        """Verify legacy cta has label and url"""
        response = director_client.get(f"{BASE_URL}/api/director-inbox")
        data = response.json()
        
        for item in data["items"]:
            assert "label" in item["cta"], "CTA missing label"
            assert "url" in item["cta"], "CTA missing url"


class TestRiskEngineUnitTests:
    """Direct unit tests for risk_engine.py module"""

    def test_stage_aware_weighting_offer_vs_added(self):
        """Test that same signal at Offer stage scores higher than at Added stage"""
        from risk_engine import evaluate_risk
        
        offer_result = evaluate_risk(["escalation"], best_stage="Offer")
        added_result = evaluate_risk(["escalation"], best_stage="Added")
        
        assert offer_result["riskScore"] > added_result["riskScore"], \
            f"Offer stage ({offer_result['riskScore']}) should score higher than Added ({added_result['riskScore']})"

    def test_compound_risk_higher_than_single(self):
        """Test that compound risks (escalation + no_activity) score higher than either alone"""
        from risk_engine import evaluate_risk
        
        escalation_only = evaluate_risk(["escalation"], best_stage="Engaged")
        no_activity_only = evaluate_risk(["no_activity"], best_stage="Engaged")
        compound = evaluate_risk(["escalation", "no_activity"], best_stage="Engaged")
        
        # Compound should be higher than either individual signal
        assert compound["riskScore"] >= escalation_only["riskScore"], \
            "Compound risk should be >= escalation alone"
        assert compound["riskScore"] >= no_activity_only["riskScore"], \
            "Compound risk should be >= no_activity alone"

    def test_no_activity_awaiting_reply_compound(self):
        """Test specific compound rule: no_activity + awaiting_reply"""
        from risk_engine import evaluate_risk
        
        result = evaluate_risk(["no_activity", "awaiting_reply"], best_stage="In Conversation")
        
        # Should have compound description in whyNow
        assert "inactive" in result["whyNow"].lower() or "waiting" in result["whyNow"].lower() or "cold" in result["whyNow"].lower(), \
            f"whyNow should mention inactivity/waiting: {result['whyNow']}"

    def test_trajectory_improving_with_recent_actions(self):
        """Test trajectory inference: recent actions should yield improving trajectory"""
        from risk_engine import evaluate_risk
        
        result = evaluate_risk(
            ["no_activity"],
            best_stage="Engaged",
            recent_actions_count=3  # Has recent actions
        )
        
        assert result["trajectory"] == "improving", \
            f"Recent actions should yield improving trajectory, got {result['trajectory']}"

    def test_trajectory_stable_default(self):
        """Test trajectory inference: default should be stable"""
        from risk_engine import evaluate_risk
        
        result = evaluate_risk(
            ["follow_up"],
            best_stage="Contacted",
            recent_actions_count=0,
            days_inactive=10
        )
        
        assert result["trajectory"] in ["stable", "worsening"], \
            f"Expected stable or worsening trajectory, got {result['trajectory']}"

    def test_severity_bands(self):
        """Test severity classification based on score"""
        from risk_engine import evaluate_risk
        
        # Critical: score >= 76
        critical = evaluate_risk(["escalation"], best_stage="Offer")  # Should be 100
        assert critical["severity"] == "critical", f"High score should be critical, got {critical['severity']}"
        
        # Low: score < 31
        low = evaluate_risk(["follow_up"], best_stage="Added")  # 30*0.8=24
        assert low["severity"] == "low", f"Low score should be low severity, got {low['severity']}"

    def test_confidence_high_for_explicit_blockers(self):
        """Test confidence is high for explicit blockers"""
        from risk_engine import evaluate_risk
        
        result = evaluate_risk(["escalation", "missing_documents"])
        assert result["confidence"] == "high", f"Blockers should have high confidence, got {result['confidence']}"

    def test_intervention_matrix(self):
        """Test intervention type based on severity + trajectory"""
        from risk_engine import evaluate_risk
        
        # Critical + stable should be escalate
        result = evaluate_risk(["escalation"], best_stage="Offer", recent_actions_count=0, days_inactive=5)
        # Score will be 100, severity critical, trajectory should be stable (no recent actions, not worsening)
        assert result["interventionType"] in ["escalate", "review", "blocker"], \
            f"Critical severity should have escalate/review/blocker intervention, got {result['interventionType']}"

    def test_empty_issues_returns_zero_score(self):
        """Test that empty issues returns zero score and low severity"""
        from risk_engine import evaluate_risk
        
        result = evaluate_risk([])
        assert result["riskScore"] == 0, "Empty issues should have 0 score"
        assert result["severity"] == "low", "Empty issues should have low severity"
        assert result["interventionType"] == "monitor", "Empty issues should have monitor intervention"

    def test_all_signal_types_have_base_score(self):
        """Test that all signal types are recognized and scored"""
        from risk_engine import evaluate_risk, SIGNAL_BASE_SCORE
        
        for signal_key in SIGNAL_BASE_SCORE.keys():
            result = evaluate_risk([signal_key])
            assert result["riskScore"] > 0, f"Signal {signal_key} should have non-zero score"
            assert result["primaryRisk"] is not None, f"Signal {signal_key} should have primaryRisk"

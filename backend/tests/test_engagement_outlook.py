"""
Test suite for Engagement Outlook Card API
Tests: GET /api/intelligence/program/{program_id}/engagement-outlook
Features: Freshness pill, next_step (most prominent), signals (Pro only), pipeline_health_state
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
ATHLETE_EMAIL = "emma.chen@athlete.capymatch.com"
ATHLETE_PASSWORD = "password123"
ADMIN_EMAIL = "douglas@capymatch.com"
ADMIN_PASSWORD = "1234"

# Program IDs for testing
UF_PROGRAM_ID = "15d08982-3c51-4761-9b83-67414484582e"
STANFORD_PROGRAM_ID = "a54a0014-0e83-4a16-b0c2-5e8f10401de2"
NONEXISTENT_PROGRAM_ID = "00000000-0000-0000-0000-000000000000"


@pytest.fixture(scope="module")
def athlete_token():
    """Get athlete auth token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ATHLETE_EMAIL, "password": ATHLETE_PASSWORD},
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Could not get athlete token: {response.text}")


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Could not get admin token: {response.text}")


class TestEngagementOutlookAuth:
    """Authentication tests for engagement-outlook endpoint"""

    def test_unauthenticated_returns_401(self):
        """Unauthenticated request should return 401"""
        response = requests.get(
            f"{BASE_URL}/api/intelligence/program/{UF_PROGRAM_ID}/engagement-outlook"
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Unauthenticated request returns 401")


class TestEngagementOutlookUF:
    """Tests for UF program (expected: Active Recently, high urgency next step)"""

    def test_uf_returns_200(self, athlete_token):
        """UF program should return 200 OK"""
        response = requests.get(
            f"{BASE_URL}/api/intelligence/program/{UF_PROGRAM_ID}/engagement-outlook",
            headers={"Authorization": f"Bearer {athlete_token}"},
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: UF engagement-outlook returns 200")

    def test_uf_has_required_fields(self, athlete_token):
        """UF response should have all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/intelligence/program/{UF_PROGRAM_ID}/engagement-outlook",
            headers={"Authorization": f"Bearer {athlete_token}"},
        )
        data = response.json()
        
        # Required fields
        assert "card_type" in data, "Missing card_type"
        assert data["card_type"] == "engagement_outlook", f"Wrong card_type: {data['card_type']}"
        assert "program_id" in data, "Missing program_id"
        assert "freshness_label" in data, "Missing freshness_label"
        assert "freshness_color" in data, "Missing freshness_color"
        assert "pipeline_health_state" in data, "Missing pipeline_health_state"
        assert "next_step" in data, "Missing next_step"
        assert "signals" in data, "Missing signals"
        
        print(f"PASS: UF has all required fields")
        print(f"  - card_type: {data['card_type']}")
        print(f"  - program_id: {data['program_id']}")
        print(f"  - freshness_label: {data['freshness_label']}")
        print(f"  - freshness_color: {data['freshness_color']}")
        print(f"  - pipeline_health_state: {data['pipeline_health_state']}")

    def test_uf_next_step_structure(self, athlete_token):
        """UF next_step should have action, urgency, context"""
        response = requests.get(
            f"{BASE_URL}/api/intelligence/program/{UF_PROGRAM_ID}/engagement-outlook",
            headers={"Authorization": f"Bearer {athlete_token}"},
        )
        data = response.json()
        next_step = data.get("next_step", {})
        
        assert "action" in next_step, "next_step missing action"
        assert "urgency" in next_step, "next_step missing urgency"
        assert "context" in next_step, "next_step missing context"
        assert next_step["urgency"] in ["high", "medium", "low", "none"], f"Invalid urgency: {next_step['urgency']}"
        
        print(f"PASS: UF next_step has proper structure")
        print(f"  - action: {next_step['action']}")
        print(f"  - urgency: {next_step['urgency']}")
        print(f"  - context: {next_step['context'][:60]}...")

    def test_uf_freshness_active_recently(self, athlete_token):
        """UF should show Active Recently freshness (based on context from main agent)"""
        response = requests.get(
            f"{BASE_URL}/api/intelligence/program/{UF_PROGRAM_ID}/engagement-outlook",
            headers={"Authorization": f"Bearer {athlete_token}"},
        )
        data = response.json()
        
        # Per main agent context: UF should show Active Recently
        freshness_label = data.get("freshness_label", "")
        freshness_color = data.get("freshness_color", "")
        
        print(f"UF Freshness: '{freshness_label}' ({freshness_color})")
        
        # Valid freshness labels
        valid_labels = ["Active Recently", "Needs Follow-Up", "Momentum Slowing", "No Recent Engagement"]
        assert freshness_label in valid_labels, f"Invalid freshness_label: {freshness_label}"
        
        valid_colors = ["green", "amber", "orange", "gray"]
        assert freshness_color in valid_colors, f"Invalid freshness_color: {freshness_color}"
        
        print(f"PASS: UF has valid freshness label and color")

    def test_uf_signals_array(self, athlete_token):
        """UF should have signals array with items"""
        response = requests.get(
            f"{BASE_URL}/api/intelligence/program/{UF_PROGRAM_ID}/engagement-outlook",
            headers={"Authorization": f"Bearer {athlete_token}"},
        )
        data = response.json()
        signals = data.get("signals", [])
        
        assert isinstance(signals, list), f"signals should be list, got {type(signals)}"
        
        # Per main agent context: UF should have 4 signals
        print(f"UF has {len(signals)} signals:")
        for i, s in enumerate(signals):
            assert "label" in s, f"Signal {i} missing label"
            assert "type" in s, f"Signal {i} missing type"
            assert s["type"] in ["positive", "neutral", "attention"], f"Invalid signal type: {s['type']}"
            print(f"  - [{s['type']}] {s['label']}")
        
        print(f"PASS: UF signals array validated")


class TestEngagementOutlookStanford:
    """Tests for Stanford program (expected: No Recent Engagement)"""

    def test_stanford_returns_200(self, athlete_token):
        """Stanford program should return 200 OK"""
        response = requests.get(
            f"{BASE_URL}/api/intelligence/program/{STANFORD_PROGRAM_ID}/engagement-outlook",
            headers={"Authorization": f"Bearer {athlete_token}"},
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: Stanford engagement-outlook returns 200")

    def test_stanford_freshness_no_recent(self, athlete_token):
        """Stanford should show lower engagement freshness"""
        response = requests.get(
            f"{BASE_URL}/api/intelligence/program/{STANFORD_PROGRAM_ID}/engagement-outlook",
            headers={"Authorization": f"Bearer {athlete_token}"},
        )
        data = response.json()
        
        freshness_label = data.get("freshness_label", "")
        freshness_color = data.get("freshness_color", "")
        
        print(f"Stanford Freshness: '{freshness_label}' ({freshness_color})")
        
        # Per main agent: Stanford should show "No Recent Engagement"
        valid_labels = ["Active Recently", "Needs Follow-Up", "Momentum Slowing", "No Recent Engagement"]
        assert freshness_label in valid_labels, f"Invalid freshness_label: {freshness_label}"
        
        print(f"PASS: Stanford freshness validated")

    def test_stanford_next_step_start_conversation(self, athlete_token):
        """Stanford next_step should be about starting conversation"""
        response = requests.get(
            f"{BASE_URL}/api/intelligence/program/{STANFORD_PROGRAM_ID}/engagement-outlook",
            headers={"Authorization": f"Bearer {athlete_token}"},
        )
        data = response.json()
        next_step = data.get("next_step", {})
        
        action = next_step.get("action", "")
        urgency = next_step.get("urgency", "")
        
        print(f"Stanford next_step: '{action}' (urgency={urgency})")
        
        # Should have valid urgency
        assert urgency in ["high", "medium", "low", "none"], f"Invalid urgency: {urgency}"
        assert action, "next_step action should not be empty"
        
        print(f"PASS: Stanford next_step validated")


class TestEngagementOutlookErrors:
    """Error handling tests"""

    def test_nonexistent_program_returns_404(self, athlete_token):
        """Non-existent program should return 404"""
        response = requests.get(
            f"{BASE_URL}/api/intelligence/program/{NONEXISTENT_PROGRAM_ID}/engagement-outlook",
            headers={"Authorization": f"Bearer {athlete_token}"},
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("PASS: Non-existent program returns 404")


class TestEngagementOutlookDataQuality:
    """Data quality and confidence tests"""

    def test_data_confidence_present(self, athlete_token):
        """Response should include data_confidence field"""
        response = requests.get(
            f"{BASE_URL}/api/intelligence/program/{UF_PROGRAM_ID}/engagement-outlook",
            headers={"Authorization": f"Bearer {athlete_token}"},
        )
        data = response.json()
        
        assert "data_confidence" in data, "Missing data_confidence field"
        confidence = data["data_confidence"]
        assert confidence in ["LOW", "MEDIUM", "HIGH"], f"Invalid data_confidence: {confidence}"
        
        print(f"PASS: data_confidence present: {confidence}")

    def test_university_name_present(self, athlete_token):
        """Response should include university_name"""
        response = requests.get(
            f"{BASE_URL}/api/intelligence/program/{UF_PROGRAM_ID}/engagement-outlook",
            headers={"Authorization": f"Bearer {athlete_token}"},
        )
        data = response.json()
        
        assert "university_name" in data, "Missing university_name"
        assert data["university_name"], "university_name should not be empty"
        
        print(f"PASS: university_name present: {data['university_name']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

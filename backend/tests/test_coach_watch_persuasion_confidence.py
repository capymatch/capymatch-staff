"""
Test Coach Watch 'What to do now' action-oriented copy and Confidence Level features.
Tests the 'whyThisMatters' (renamed from _WHY_THIS_MATTERS to _WHAT_TO_DO_NOW) and 'confidenceLevel' fields.

Requirements (UI Polish iteration):
- Stanford (hot_opportunity): whyThisMatters='Act now — this is a high-opportunity moment.', confidenceLevel='high'
- Creighton (no_signals): whyThisMatters='Start outreach now to get on the coach's radar early.', confidenceLevel='low'
- UCLA (active_conversation): whyThisMatters='Reply quickly to keep the conversation moving.', confidenceLevel='high'
- Florida (deprioritize): whyThisMatters='Focus on other schools with stronger signals.', confidenceLevel='low'
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ATHLETE_EMAIL = "emma.chen@athlete.capymatch.com"
ATHLETE_PASSWORD = "athlete123"

# Program IDs
STANFORD_ID = "e02f08c6-7c47-430a-aa8d-787a6fbeae00"
FLORIDA_ID = "470e3fd1-0b64-49ac-8530-42214ec7500b"
CREIGHTON_ID = "f624f30a-d505-493b-8d5d-4197b970f72f"
UCLA_ID = "85095202-8b95-4cb2-9390-3275d7840a3d"

# Expected values per state (updated for "What to do now" action-oriented copy)
EXPECTED_WHY_THIS_MATTERS = {
    "hot_opportunity": "Act now — this is a high-opportunity moment.",
    "no_signals": "Start outreach now to get on the coach's radar early.",
    "active_conversation": "Reply quickly to keep the conversation moving.",
    "deprioritize": "Focus on other schools with stronger signals.",
}

EXPECTED_CONFIDENCE = {
    "hot_opportunity": "high",
    "no_signals": "low",
    "active_conversation": "high",
    "deprioritize": "low",
}


@pytest.fixture(scope="module")
def auth_token():
    """Authenticate as athlete and get token."""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ATHLETE_EMAIL, "password": ATHLETE_PASSWORD}
    )
    if response.status_code != 200:
        pytest.skip(f"Auth failed: {response.status_code} - {response.text}")
    data = response.json()
    return data.get("access_token") or data.get("token")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Return auth headers."""
    return {"Authorization": f"Bearer {auth_token}"}


class TestCoachWatchPersuasionAndConfidence:
    """Test Coach Watch returns whyThisMatters and confidenceLevel for each state."""

    def test_stanford_hot_opportunity(self, auth_headers):
        """Stanford should return hot_opportunity state with high confidence."""
        response = requests.get(
            f"{BASE_URL}/api/coach-watch/{STANFORD_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        
        data = response.json()
        state = data.get("state")
        
        # Validate state
        assert state == "hot_opportunity", f"Expected hot_opportunity, got {state}"
        
        # Validate whyThisMatters
        why_matters = data.get("whyThisMatters", "")
        expected_why = EXPECTED_WHY_THIS_MATTERS["hot_opportunity"]
        assert why_matters == expected_why, f"whyThisMatters mismatch: got '{why_matters}', expected '{expected_why}'"
        
        # Validate confidenceLevel
        confidence = data.get("confidenceLevel", "")
        assert confidence == "high", f"Expected confidence 'high', got '{confidence}'"
        
        print(f"✅ Stanford: state={state}, confidenceLevel={confidence}, whyThisMatters present")

    def test_creighton_no_signals(self, auth_headers):
        """Creighton should return no_signals state with low confidence."""
        response = requests.get(
            f"{BASE_URL}/api/coach-watch/{CREIGHTON_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        
        data = response.json()
        state = data.get("state")
        
        # Validate state
        assert state == "no_signals", f"Expected no_signals, got {state}"
        
        # Validate whyThisMatters
        why_matters = data.get("whyThisMatters", "")
        expected_why = EXPECTED_WHY_THIS_MATTERS["no_signals"]
        assert why_matters == expected_why, f"whyThisMatters mismatch: got '{why_matters}', expected '{expected_why}'"
        
        # Validate confidenceLevel
        confidence = data.get("confidenceLevel", "")
        assert confidence == "low", f"Expected confidence 'low', got '{confidence}'"
        
        print(f"✅ Creighton: state={state}, confidenceLevel={confidence}, whyThisMatters present")

    def test_ucla_active_conversation(self, auth_headers):
        """UCLA should return active_conversation state with high confidence."""
        response = requests.get(
            f"{BASE_URL}/api/coach-watch/{UCLA_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        
        data = response.json()
        state = data.get("state")
        
        # Validate state
        assert state == "active_conversation", f"Expected active_conversation, got {state}"
        
        # Validate whyThisMatters
        why_matters = data.get("whyThisMatters", "")
        expected_why = EXPECTED_WHY_THIS_MATTERS["active_conversation"]
        assert why_matters == expected_why, f"whyThisMatters mismatch: got '{why_matters}', expected '{expected_why}'"
        
        # Validate confidenceLevel
        confidence = data.get("confidenceLevel", "")
        assert confidence == "high", f"Expected confidence 'high', got '{confidence}'"
        
        print(f"✅ UCLA: state={state}, confidenceLevel={confidence}, whyThisMatters present")

    def test_florida_deprioritize(self, auth_headers):
        """Florida should return deprioritize state with low confidence."""
        response = requests.get(
            f"{BASE_URL}/api/coach-watch/{FLORIDA_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        
        data = response.json()
        state = data.get("state")
        
        # Validate state
        assert state == "deprioritize", f"Expected deprioritize, got {state}"
        
        # Validate whyThisMatters
        why_matters = data.get("whyThisMatters", "")
        expected_why = EXPECTED_WHY_THIS_MATTERS["deprioritize"]
        assert why_matters == expected_why, f"whyThisMatters mismatch: got '{why_matters}', expected '{expected_why}'"
        
        # Validate confidenceLevel
        confidence = data.get("confidenceLevel", "")
        assert confidence == "low", f"Expected confidence 'low', got '{confidence}'"
        
        print(f"✅ Florida: state={state}, confidenceLevel={confidence}, whyThisMatters present")


class TestCoachWatchResponseStructure:
    """Validate Coach Watch API response structure includes all required fields."""

    def test_response_includes_all_new_fields(self, auth_headers):
        """Verify response includes whyThisMatters and confidenceLevel fields."""
        response = requests.get(
            f"{BASE_URL}/api/coach-watch/{STANFORD_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        
        # Check new fields exist
        assert "whyThisMatters" in data, "Missing whyThisMatters field"
        assert "confidenceLevel" in data, "Missing confidenceLevel field"
        
        # Check existing fields still present (additive change - no breaking changes)
        required_fields = [
            "state", "headline", "summary", "whyLine", "recommendedAction",
            "interestLevel", "trend", "score", "primaryCta", "secondaryCta"
        ]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        print("✅ All required fields present in Coach Watch response")

    def test_confidence_level_valid_values(self, auth_headers):
        """Verify confidenceLevel is one of high/medium/low."""
        valid_levels = {"high", "medium", "low"}
        
        for program_id in [STANFORD_ID, CREIGHTON_ID, UCLA_ID, FLORIDA_ID]:
            response = requests.get(
                f"{BASE_URL}/api/coach-watch/{program_id}",
                headers=auth_headers
            )
            if response.status_code == 200:
                data = response.json()
                confidence = data.get("confidenceLevel", "")
                assert confidence in valid_levels, f"Invalid confidence level '{confidence}' for program {program_id}"
        
        print("✅ All confidence levels are valid (high/medium/low)")

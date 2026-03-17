"""
Coach Watch API Tests - Weighted Relationship State Engine
Tests the /api/coach-watch/{program_id} endpoint for:
- Stanford (reply+visit): interestLevel=Medium, trend=Increasing, state=visit
- Creighton (no outreach): interestLevel=Not started, trend=Not started, state=pre_outreach
- UCLA (has outreach+reply): score>0, state=conversation
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
CREIGHTON_ID = "f624f30a-d505-493b-8d5d-4197b970f72f"
UCLA_ID = "85095202-8b95-4cb2-9390-3275d7840a3d"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for athlete user"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ATHLETE_EMAIL, "password": ATHLETE_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    token = data.get("token")
    assert token, "No token returned from login"
    return token


@pytest.fixture
def auth_headers(auth_token):
    """Authorization headers"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestCoachWatchEndpoint:
    """Tests for /api/coach-watch/{program_id} endpoint"""

    def test_stanford_structured_output(self, auth_headers):
        """Stanford (reply+visit): Verify structured response with all required fields"""
        response = requests.get(f"{BASE_URL}/api/coach-watch/{STANFORD_ID}", headers=auth_headers)
        
        assert response.status_code == 200, f"API call failed: {response.text}"
        data = response.json()
        
        # Verify all required fields exist
        required_fields = [
            "score", "interestLevel", "trend", "state", "summary",
            "recommendedAction", "primaryCta", "secondaryCta", "signals", "meta"
        ]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        # Verify meta fields
        meta = data["meta"]
        meta_fields = ["hasOutreach", "hasReply", "hasVisit", "hasOffer", "totalOpens", "totalClicks"]
        for field in meta_fields:
            assert field in meta, f"Missing meta field: {field}"

    def test_stanford_interest_level_medium(self, auth_headers):
        """Stanford: interestLevel should be Medium"""
        response = requests.get(f"{BASE_URL}/api/coach-watch/{STANFORD_ID}", headers=auth_headers)
        data = response.json()
        
        assert data["interestLevel"] == "Medium", f"Expected 'Medium', got '{data['interestLevel']}'"

    def test_stanford_trend_increasing(self, auth_headers):
        """Stanford: trend should be Increasing (has reply + visit)"""
        response = requests.get(f"{BASE_URL}/api/coach-watch/{STANFORD_ID}", headers=auth_headers)
        data = response.json()
        
        assert data["trend"] == "Increasing", f"Expected 'Increasing', got '{data['trend']}'"

    def test_stanford_state_visit(self, auth_headers):
        """Stanford: state should be 'visit'"""
        response = requests.get(f"{BASE_URL}/api/coach-watch/{STANFORD_ID}", headers=auth_headers)
        data = response.json()
        
        assert data["state"] == "visit", f"Expected 'visit', got '{data['state']}'"

    def test_stanford_score_positive(self, auth_headers):
        """Stanford: score should be > 0"""
        response = requests.get(f"{BASE_URL}/api/coach-watch/{STANFORD_ID}", headers=auth_headers)
        data = response.json()
        
        assert data["score"] > 0, f"Expected score > 0, got {data['score']}"

    def test_stanford_signals_include_coach_reply_and_visit(self, auth_headers):
        """Stanford: signals should include coach_reply and visit_invite"""
        response = requests.get(f"{BASE_URL}/api/coach-watch/{STANFORD_ID}", headers=auth_headers)
        data = response.json()
        
        signal_types = [sig["type"] for sig in data["signals"]]
        assert "coach_reply" in signal_types, f"Missing 'coach_reply' in signals: {signal_types}"
        assert "visit_invite" in signal_types, f"Missing 'visit_invite' in signals: {signal_types}"

    def test_creighton_interest_level_not_started(self, auth_headers):
        """Creighton (no outreach): interestLevel should be 'Not started', NOT 'Low interest'"""
        response = requests.get(f"{BASE_URL}/api/coach-watch/{CREIGHTON_ID}", headers=auth_headers)
        data = response.json()
        
        # Critical: Must NOT show "Low interest" when there's no data
        assert data["interestLevel"] != "Low interest", "Should NOT show 'Low interest' when no data"
        assert data["interestLevel"] == "Not started", f"Expected 'Not started', got '{data['interestLevel']}'"

    def test_creighton_trend_not_started(self, auth_headers):
        """Creighton: trend should be 'Not started'"""
        response = requests.get(f"{BASE_URL}/api/coach-watch/{CREIGHTON_ID}", headers=auth_headers)
        data = response.json()
        
        assert data["trend"] == "Not started", f"Expected 'Not started', got '{data['trend']}'"

    def test_creighton_state_pre_outreach(self, auth_headers):
        """Creighton: state should be 'pre_outreach'"""
        response = requests.get(f"{BASE_URL}/api/coach-watch/{CREIGHTON_ID}", headers=auth_headers)
        data = response.json()
        
        assert data["state"] == "pre_outreach", f"Expected 'pre_outreach', got '{data['state']}'"

    def test_creighton_score_zero(self, auth_headers):
        """Creighton: score should be 0 (no signals)"""
        response = requests.get(f"{BASE_URL}/api/coach-watch/{CREIGHTON_ID}", headers=auth_headers)
        data = response.json()
        
        assert data["score"] == 0, f"Expected score = 0, got {data['score']}"

    def test_creighton_no_false_low_interest(self, auth_headers):
        """Creighton: Verify no false 'Low interest' label (critical fix)"""
        response = requests.get(f"{BASE_URL}/api/coach-watch/{CREIGHTON_ID}", headers=auth_headers)
        data = response.json()
        
        # This is the critical test - athlete actions must not be treated as coach interest
        assert "low" not in data["interestLevel"].lower(), "Must not show 'Low' interest when no data"
        assert data["interestLevel"] in ["Not started", "No signals yet"], \
            f"Unexpected interestLevel: {data['interestLevel']}"

    def test_creighton_primary_cta_send_first_email(self, auth_headers):
        """Creighton: Primary CTA should be 'Send First Email' (no outreach yet)"""
        response = requests.get(f"{BASE_URL}/api/coach-watch/{CREIGHTON_ID}", headers=auth_headers)
        data = response.json()
        
        assert data["primaryCta"] == "Send First Email", f"Expected 'Send First Email', got '{data['primaryCta']}'"

    def test_creighton_no_schedule_followup_cta(self, auth_headers):
        """Creighton: No 'Schedule Follow Up' CTA (no outreach sent)"""
        response = requests.get(f"{BASE_URL}/api/coach-watch/{CREIGHTON_ID}", headers=auth_headers)
        data = response.json()
        
        assert data["secondaryCta"] is None, f"Expected no secondary CTA, got '{data['secondaryCta']}'"

    def test_ucla_score_positive(self, auth_headers):
        """UCLA (has outreach+reply): score should be > 0"""
        response = requests.get(f"{BASE_URL}/api/coach-watch/{UCLA_ID}", headers=auth_headers)
        data = response.json()
        
        assert data["score"] > 0, f"Expected score > 0, got {data['score']}"

    def test_ucla_state_conversation(self, auth_headers):
        """UCLA: state should be 'conversation' (has reply)"""
        response = requests.get(f"{BASE_URL}/api/coach-watch/{UCLA_ID}", headers=auth_headers)
        data = response.json()
        
        assert data["state"] == "conversation", f"Expected 'conversation', got '{data['state']}'"

    def test_ucla_has_outreach_flag(self, auth_headers):
        """UCLA: meta.hasOutreach should be true"""
        response = requests.get(f"{BASE_URL}/api/coach-watch/{UCLA_ID}", headers=auth_headers)
        data = response.json()
        
        assert data["meta"]["hasOutreach"] == True, "UCLA should have outreach"
        assert data["meta"]["hasReply"] == True, "UCLA should have reply"

    def test_ucla_has_schedule_followup_cta(self, auth_headers):
        """UCLA: Should have 'Schedule Follow Up' as secondary CTA (has outreach)"""
        response = requests.get(f"{BASE_URL}/api/coach-watch/{UCLA_ID}", headers=auth_headers)
        data = response.json()
        
        assert data["secondaryCta"] == "Schedule Follow Up", \
            f"Expected 'Schedule Follow Up', got '{data['secondaryCta']}'"

    def test_coach_watch_not_found(self, auth_headers):
        """Test 404 for non-existent program"""
        response = requests.get(f"{BASE_URL}/api/coach-watch/nonexistent-id", headers=auth_headers)
        assert response.status_code == 404

    def test_coach_watch_unauthorized(self):
        """Test 401 for unauthenticated request"""
        response = requests.get(f"{BASE_URL}/api/coach-watch/{STANFORD_ID}")
        assert response.status_code == 401 or response.status_code == 403


class TestCoachWatchSignalLogic:
    """Tests for signal computation logic"""

    def test_signal_points_positive_for_strong_signals(self, auth_headers):
        """Strong signals (reply, visit) should have positive points"""
        response = requests.get(f"{BASE_URL}/api/coach-watch/{STANFORD_ID}", headers=auth_headers)
        data = response.json()
        
        for sig in data["signals"]:
            if sig["strength"] == "strong":
                assert sig["points"] > 0, f"Strong signal '{sig['type']}' should have positive points"

    def test_signal_strength_categories(self, auth_headers):
        """Signals should have valid strength categories"""
        valid_strengths = ["strong", "medium", "negative"]
        response = requests.get(f"{BASE_URL}/api/coach-watch/{STANFORD_ID}", headers=auth_headers)
        data = response.json()
        
        for sig in data["signals"]:
            assert sig["strength"] in valid_strengths, f"Invalid strength: {sig['strength']}"

    def test_empty_signals_for_no_activity(self, auth_headers):
        """Creighton with no activity should have empty signals array"""
        response = requests.get(f"{BASE_URL}/api/coach-watch/{CREIGHTON_ID}", headers=auth_headers)
        data = response.json()
        
        assert data["signals"] == [], f"Expected empty signals, got {data['signals']}"


class TestCoachWatchMetaData:
    """Tests for meta data in coach watch response"""

    def test_stanford_meta_flags(self, auth_headers):
        """Stanford: Verify correct meta flags (hasReply=true, hasVisit=true)"""
        response = requests.get(f"{BASE_URL}/api/coach-watch/{STANFORD_ID}", headers=auth_headers)
        data = response.json()
        meta = data["meta"]
        
        assert meta["hasOutreach"] == True, "Stanford should have outreach"
        assert meta["hasReply"] == True, "Stanford should have reply"
        assert meta["hasVisit"] == True, "Stanford should have visit"

    def test_creighton_meta_all_false(self, auth_headers):
        """Creighton: All engagement flags should be false"""
        response = requests.get(f"{BASE_URL}/api/coach-watch/{CREIGHTON_ID}", headers=auth_headers)
        data = response.json()
        meta = data["meta"]
        
        assert meta["hasOutreach"] == False, "Creighton should NOT have outreach"
        assert meta["hasReply"] == False, "Creighton should NOT have reply"
        assert meta["hasVisit"] == False, "Creighton should NOT have visit"
        assert meta["hasOffer"] == False, "Creighton should NOT have offer"

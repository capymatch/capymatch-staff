"""
Test Coach Watch State-Copy Matrix and Transition Explanation Layer
Tests the new copy fields (headline, summary, whyLine) and state transition tracking.

Features tested:
- New fields: headline, whyLine, previousState, currentState, stateChangedAt, stateChangeReason, whatChangedCopy, triggeringSignals
- Updated state names: waiting_for_signal, follow_up_window_open, emerging_interest
- State persistence using coach_watch_states MongoDB collection
- Copy per state (headline, summary, whyLine)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

# Test credentials
ATHLETE_EMAIL = "emma.chen@athlete.capymatch.com"
ATHLETE_PASSWORD = "athlete123"

# Program IDs from seed data
STANFORD_ID = "e02f08c6-7c47-430a-aa8d-787a6fbeae00"  # hot_opportunity
FLORIDA_ID = "470e3fd1-0b64-49ac-8530-42214ec7500b"   # deprioritize
CREIGHTON_ID = "f624f30a-d505-493b-8d5d-4197b970f72f" # no_signals
UCLA_ID = "85095202-8b95-4cb2-9390-3275d7840a3d"      # active_conversation


@pytest.fixture(scope="module")
def auth_token():
    """Get athlete auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ATHLETE_EMAIL,
        "password": ATHLETE_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "access_token" in data or "token" in data
    return data.get("access_token") or data.get("token")


@pytest.fixture
def api_client(auth_token):
    """Session with auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestCoachWatchNewFields:
    """Test that coach-watch endpoint returns all new fields"""

    def test_stanford_returns_new_fields(self, api_client):
        """Verify Stanford (hot_opportunity) returns all new copy fields"""
        response = api_client.get(f"{BASE_URL}/api/coach-watch/{STANFORD_ID}")
        assert response.status_code == 200
        data = response.json()
        
        # Check new fields exist
        assert "headline" in data, "headline field missing"
        assert "whyLine" in data, "whyLine field missing"
        assert "previousState" in data, "previousState field missing"
        assert "currentState" in data, "currentState field missing"
        assert "stateChangedAt" in data, "stateChangedAt field missing"
        assert "stateChangeReason" in data, "stateChangeReason field missing"
        assert "whatChangedCopy" in data, "whatChangedCopy field missing"
        assert "triggeringSignals" in data, "triggeringSignals field missing"
        
    def test_all_programs_have_new_fields(self, api_client):
        """Verify all programs return the new copy layer fields"""
        for program_id in [STANFORD_ID, FLORIDA_ID, CREIGHTON_ID, UCLA_ID]:
            response = api_client.get(f"{BASE_URL}/api/coach-watch/{program_id}")
            assert response.status_code == 200
            data = response.json()
            
            # All new fields must be present
            required_fields = [
                "headline", "whyLine", "previousState", "currentState",
                "stateChangedAt", "stateChangeReason", "whatChangedCopy", "triggeringSignals"
            ]
            for field in required_fields:
                assert field in data, f"{field} missing from {program_id}"


class TestStanfordHotOpportunity:
    """Test Stanford (hot_opportunity) state copy values"""

    def test_stanford_headline(self, api_client):
        """Stanford headline should be 'Interest is active'"""
        response = api_client.get(f"{BASE_URL}/api/coach-watch/{STANFORD_ID}")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("state") == "hot_opportunity", f"Expected hot_opportunity, got {data.get('state')}"
        assert data.get("headline") == "Interest is active", f"Wrong headline: {data.get('headline')}"

    def test_stanford_summary(self, api_client):
        """Stanford summary should mention strong interest"""
        response = api_client.get(f"{BASE_URL}/api/coach-watch/{STANFORD_ID}")
        assert response.status_code == 200
        data = response.json()
        
        summary = data.get("summary", "")
        assert "strong interest" in summary.lower(), f"Summary doesn't mention strong interest: {summary}"

    def test_stanford_why_line(self, api_client):
        """Stanford whyLine should mention high-value signals"""
        response = api_client.get(f"{BASE_URL}/api/coach-watch/{STANFORD_ID}")
        assert response.status_code == 200
        data = response.json()
        
        why_line = data.get("whyLine", "")
        assert "signal" in why_line.lower() or "detected" in why_line.lower(), f"whyLine doesn't explain signals: {why_line}"

    def test_stanford_current_state(self, api_client):
        """Stanford currentState should equal state field"""
        response = api_client.get(f"{BASE_URL}/api/coach-watch/{STANFORD_ID}")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("currentState") == data.get("state"), "currentState doesn't match state"


class TestFloridaDeprioritize:
    """Test Florida (deprioritize) state copy values"""

    def test_florida_headline(self, api_client):
        """Florida headline should be 'Focus elsewhere for now'"""
        response = api_client.get(f"{BASE_URL}/api/coach-watch/{FLORIDA_ID}")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("state") == "deprioritize", f"Expected deprioritize, got {data.get('state')}"
        assert data.get("headline") == "Focus elsewhere for now", f"Wrong headline: {data.get('headline')}"

    def test_florida_summary(self, api_client):
        """Florida summary should mention lack of traction"""
        response = api_client.get(f"{BASE_URL}/api/coach-watch/{FLORIDA_ID}")
        assert response.status_code == 200
        data = response.json()
        
        summary = data.get("summary", "")
        assert "traction" in summary.lower() or "not enough" in summary.lower(), f"Summary doesn't mention traction: {summary}"

    def test_florida_why_line(self, api_client):
        """Florida whyLine should mention weak signals"""
        response = api_client.get(f"{BASE_URL}/api/coach-watch/{FLORIDA_ID}")
        assert response.status_code == 200
        data = response.json()
        
        why_line = data.get("whyLine", "")
        assert "weak" in why_line.lower() or "stale" in why_line.lower() or "signal" in why_line.lower(), f"whyLine unexpected: {why_line}"


class TestCreightonNoSignals:
    """Test Creighton (no_signals) state copy values"""

    def test_creighton_headline(self, api_client):
        """Creighton headline should be 'No coach engagement yet'"""
        response = api_client.get(f"{BASE_URL}/api/coach-watch/{CREIGHTON_ID}")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("state") == "no_signals", f"Expected no_signals, got {data.get('state')}"
        assert data.get("headline") == "No coach engagement yet", f"Wrong headline: {data.get('headline')}"

    def test_creighton_summary(self, api_client):
        """Creighton summary should mention worth pursuing"""
        response = api_client.get(f"{BASE_URL}/api/coach-watch/{CREIGHTON_ID}")
        assert response.status_code == 200
        data = response.json()
        
        summary = data.get("summary", "")
        assert "worth pursuing" in summary.lower() or "not started" in summary.lower(), f"Summary unexpected: {summary}"

    def test_creighton_why_line(self, api_client):
        """Creighton whyLine should mention no outreach"""
        response = api_client.get(f"{BASE_URL}/api/coach-watch/{CREIGHTON_ID}")
        assert response.status_code == 200
        data = response.json()
        
        why_line = data.get("whyLine", "")
        assert "outreach" in why_line.lower() or "activity" in why_line.lower(), f"whyLine unexpected: {why_line}"


class TestUCLAActiveConversation:
    """Test UCLA (active_conversation) state copy values"""

    def test_ucla_headline(self, api_client):
        """UCLA headline should be 'Conversation is active'"""
        response = api_client.get(f"{BASE_URL}/api/coach-watch/{UCLA_ID}")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("state") == "active_conversation", f"Expected active_conversation, got {data.get('state')}"
        assert data.get("headline") == "Conversation is active", f"Wrong headline: {data.get('headline')}"

    def test_ucla_summary(self, api_client):
        """UCLA summary should mention coach engaged"""
        response = api_client.get(f"{BASE_URL}/api/coach-watch/{UCLA_ID}")
        assert response.status_code == 200
        data = response.json()
        
        summary = data.get("summary", "")
        assert "coach" in summary.lower() and "engaged" in summary.lower(), f"Summary unexpected: {summary}"

    def test_ucla_why_line(self, api_client):
        """UCLA whyLine should mention reply or next-step signal"""
        response = api_client.get(f"{BASE_URL}/api/coach-watch/{UCLA_ID}")
        assert response.status_code == 200
        data = response.json()
        
        why_line = data.get("whyLine", "")
        assert "reply" in why_line.lower() or "signal" in why_line.lower(), f"whyLine unexpected: {why_line}"


class TestStatePersistence:
    """Test state persistence and transition tracking"""

    def test_second_call_returns_previous_state(self, api_client):
        """Second call should return previousState matching currentState from first call"""
        # First call
        response1 = api_client.get(f"{BASE_URL}/api/coach-watch/{STANFORD_ID}")
        assert response1.status_code == 200
        data1 = response1.json()
        current_state_first = data1.get("currentState")
        
        # Second call
        response2 = api_client.get(f"{BASE_URL}/api/coach-watch/{STANFORD_ID}")
        assert response2.status_code == 200
        data2 = response2.json()
        
        # previousState should match currentState from first call
        assert data2.get("previousState") == current_state_first, \
            f"previousState ({data2.get('previousState')}) should match first currentState ({current_state_first})"

    def test_same_state_returns_null_what_changed(self, api_client):
        """When state unchanged, whatChangedCopy should be null"""
        # Make two calls to ensure state is persisted
        api_client.get(f"{BASE_URL}/api/coach-watch/{UCLA_ID}")
        
        # Second call - state should be same
        response = api_client.get(f"{BASE_URL}/api/coach-watch/{UCLA_ID}")
        assert response.status_code == 200
        data = response.json()
        
        # If previous state equals current state, whatChangedCopy should be null
        if data.get("previousState") == data.get("currentState"):
            assert data.get("whatChangedCopy") is None, \
                f"whatChangedCopy should be null when state unchanged, got: {data.get('whatChangedCopy')}"


class TestUpdatedStateNames:
    """Test that old state names have been updated"""

    def test_state_name_waiting_for_signal(self, api_client):
        """'waiting' should now be 'waiting_for_signal'"""
        # This test validates the state name if a program happens to be in waiting state
        # For programs with recent outreach < 5 days, no signals
        response = api_client.get(f"{BASE_URL}/api/coach-watch/{STANFORD_ID}")
        assert response.status_code == 200
        data = response.json()
        
        # State should never be just 'waiting'
        assert data.get("state") != "waiting", "State 'waiting' should be 'waiting_for_signal'"
        
    def test_state_name_follow_up_window_open(self, api_client):
        """'follow_up_window' should now be 'follow_up_window_open'"""
        # Validate state names used
        for program_id in [STANFORD_ID, FLORIDA_ID, CREIGHTON_ID, UCLA_ID]:
            response = api_client.get(f"{BASE_URL}/api/coach-watch/{program_id}")
            data = response.json()
            
            # State should never be just 'follow_up_window'
            assert data.get("state") != "follow_up_window", "State 'follow_up_window' should be 'follow_up_window_open'"

    def test_state_name_emerging_interest(self, api_client):
        """'emerging' should now be 'emerging_interest'"""
        for program_id in [STANFORD_ID, FLORIDA_ID, CREIGHTON_ID, UCLA_ID]:
            response = api_client.get(f"{BASE_URL}/api/coach-watch/{program_id}")
            data = response.json()
            
            # State should never be just 'emerging'
            assert data.get("state") != "emerging", "State 'emerging' should be 'emerging_interest'"


class TestTriggeringSignals:
    """Test triggeringSignals field"""

    def test_triggering_signals_is_list(self, api_client):
        """triggeringSignals should be a list of signal types"""
        response = api_client.get(f"{BASE_URL}/api/coach-watch/{STANFORD_ID}")
        assert response.status_code == 200
        data = response.json()
        
        triggering_signals = data.get("triggeringSignals")
        assert isinstance(triggering_signals, list), f"triggeringSignals should be list, got {type(triggering_signals)}"

    def test_stanford_has_triggering_signals(self, api_client):
        """Stanford (hot_opportunity) should have triggering signals"""
        response = api_client.get(f"{BASE_URL}/api/coach-watch/{STANFORD_ID}")
        assert response.status_code == 200
        data = response.json()
        
        # Stanford has visit and reply signals
        triggering_signals = data.get("triggeringSignals", [])
        # Should have at least one signal
        assert len(triggering_signals) > 0 or data.get("state") == "no_signals", \
            f"Stanford should have signals: {triggering_signals}"


class TestTransitionCopyDict:
    """Test transition copy explanations"""

    def test_transition_copy_exists_for_known_transitions(self, api_client):
        """Verify the transition copy dictionary has expected transitions"""
        # We can't directly test the dict, but we can verify behavior
        # by checking that whatChangedCopy is a string when state changes
        response = api_client.get(f"{BASE_URL}/api/coach-watch/{STANFORD_ID}")
        assert response.status_code == 200
        data = response.json()
        
        # whatChangedCopy should be None or a string
        what_changed = data.get("whatChangedCopy")
        assert what_changed is None or isinstance(what_changed, str), \
            f"whatChangedCopy should be None or string, got {type(what_changed)}"


class TestAllHeadlineValues:
    """Test that all headline values match expected per state"""

    def test_hot_opportunity_headline(self, api_client):
        """hot_opportunity headline = 'Interest is active'"""
        response = api_client.get(f"{BASE_URL}/api/coach-watch/{STANFORD_ID}")
        data = response.json()
        if data.get("state") == "hot_opportunity":
            assert data.get("headline") == "Interest is active"

    def test_active_conversation_headline(self, api_client):
        """active_conversation headline = 'Conversation is active'"""
        response = api_client.get(f"{BASE_URL}/api/coach-watch/{UCLA_ID}")
        data = response.json()
        if data.get("state") == "active_conversation":
            assert data.get("headline") == "Conversation is active"

    def test_no_signals_headline(self, api_client):
        """no_signals headline = 'No coach engagement yet'"""
        response = api_client.get(f"{BASE_URL}/api/coach-watch/{CREIGHTON_ID}")
        data = response.json()
        if data.get("state") == "no_signals":
            assert data.get("headline") == "No coach engagement yet"

    def test_deprioritize_headline(self, api_client):
        """deprioritize headline = 'Focus elsewhere for now'"""
        response = api_client.get(f"{BASE_URL}/api/coach-watch/{FLORIDA_ID}")
        data = response.json()
        if data.get("state") == "deprioritize":
            assert data.get("headline") == "Focus elsewhere for now"

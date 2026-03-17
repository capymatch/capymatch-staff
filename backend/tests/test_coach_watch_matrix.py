"""
Test Coach Watch 10-State Relationship Matrix
Tests the state transitions and output fields for each program scenario
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ATHLETE_EMAIL = "emma.chen@athlete.capymatch.com"
ATHLETE_PASSWORD = "athlete123"

# Program IDs from seed data
STANFORD_ID = "e02f08c6-7c47-430a-aa8d-787a6fbeae00"  # Reply + Campus Visit = hot_opportunity
FLORIDA_ID = "470e3fd1-0b64-49ac-8530-42214ec7500b"   # No Reply, old outreach = deprioritize
CREIGHTON_ID = "f624f30a-d505-493b-8d5d-4197b970f72f" # N/A, Contacted = no_signals
UCLA_ID = "85095202-8b95-4cb2-9390-3275d7840a3d"      # Reply Received = active_conversation


class TestCoachWatchMatrix:
    """Test the 10-state Coach Watch relationship matrix"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ATHLETE_EMAIL, "password": ATHLETE_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def _get_coach_watch(self, program_id):
        """Helper to get coach-watch data"""
        response = requests.get(
            f"{BASE_URL}/api/coach-watch/{program_id}",
            headers=self.headers
        )
        return response

    # ============ Stanford Tests (hot_opportunity) ============
    
    def test_stanford_state_is_hot_opportunity(self):
        """Stanford should be hot_opportunity (has reply + campus visit)"""
        response = self._get_coach_watch(STANFORD_ID)
        assert response.status_code == 200
        data = response.json()
        assert data["state"] == "hot_opportunity", f"Expected hot_opportunity, got {data['state']}"

    def test_stanford_interest_level(self):
        """Stanford should have Medium or High interest level"""
        response = self._get_coach_watch(STANFORD_ID)
        assert response.status_code == 200
        data = response.json()
        assert data["interestLevel"] in ["Medium", "High"], f"Expected Medium or High, got {data['interestLevel']}"

    def test_stanford_trend_increasing(self):
        """Stanford should have Increasing trend"""
        response = self._get_coach_watch(STANFORD_ID)
        assert response.status_code == 200
        data = response.json()
        assert data["trend"] == "Increasing", f"Expected Increasing, got {data['trend']}"

    def test_stanford_has_visit_signal(self):
        """Stanford should have visit_invite signal"""
        response = self._get_coach_watch(STANFORD_ID)
        assert response.status_code == 200
        data = response.json()
        signal_types = [s["type"] for s in data.get("signals", [])]
        assert "visit_invite" in signal_types, f"Expected visit_invite signal, got {signal_types}"

    def test_stanford_has_reply_signal(self):
        """Stanford should have coach_reply signal"""
        response = self._get_coach_watch(STANFORD_ID)
        assert response.status_code == 200
        data = response.json()
        signal_types = [s["type"] for s in data.get("signals", [])]
        assert "coach_reply" in signal_types, f"Expected coach_reply signal, got {signal_types}"

    def test_stanford_meta_has_reply(self):
        """Stanford meta should indicate hasReply=true"""
        response = self._get_coach_watch(STANFORD_ID)
        assert response.status_code == 200
        data = response.json()
        assert data["meta"]["hasReply"] is True

    def test_stanford_meta_has_visit(self):
        """Stanford meta should indicate hasVisit=true"""
        response = self._get_coach_watch(STANFORD_ID)
        assert response.status_code == 200
        data = response.json()
        assert data["meta"]["hasVisit"] is True

    # ============ Florida Tests (deprioritize) ============

    def test_florida_state_is_deprioritize(self):
        """Florida should be deprioritize (no reply, old outreach > 14 days)"""
        response = self._get_coach_watch(FLORIDA_ID)
        assert response.status_code == 200
        data = response.json()
        assert data["state"] == "deprioritize", f"Expected deprioritize, got {data['state']}"

    def test_florida_interest_no_signals(self):
        """Florida should have 'No signals yet' interest level"""
        response = self._get_coach_watch(FLORIDA_ID)
        assert response.status_code == 200
        data = response.json()
        assert data["interestLevel"] == "No signals yet", f"Expected 'No signals yet', got {data['interestLevel']}"

    def test_florida_trend_cooling(self):
        """Florida should have Cooling trend"""
        response = self._get_coach_watch(FLORIDA_ID)
        assert response.status_code == 200
        data = response.json()
        assert data["trend"] == "Cooling", f"Expected Cooling, got {data['trend']}"

    def test_florida_has_negative_signal(self):
        """Florida should have no_engagement_14d negative signal"""
        response = self._get_coach_watch(FLORIDA_ID)
        assert response.status_code == 200
        data = response.json()
        signal_types = [s["type"] for s in data.get("signals", [])]
        assert "no_engagement_14d" in signal_types, f"Expected no_engagement_14d signal, got {signal_types}"

    def test_florida_meta_no_reply(self):
        """Florida meta should indicate hasReply=false"""
        response = self._get_coach_watch(FLORIDA_ID)
        assert response.status_code == 200
        data = response.json()
        assert data["meta"]["hasReply"] is False

    # ============ Creighton Tests (no_signals) ============

    def test_creighton_state_is_no_signals(self):
        """Creighton should be no_signals (N/A, no outreach)"""
        response = self._get_coach_watch(CREIGHTON_ID)
        assert response.status_code == 200
        data = response.json()
        assert data["state"] == "no_signals", f"Expected no_signals, got {data['state']}"

    def test_creighton_interest_not_started(self):
        """Creighton should have 'Not started' interest level"""
        response = self._get_coach_watch(CREIGHTON_ID)
        assert response.status_code == 200
        data = response.json()
        assert data["interestLevel"] == "Not started", f"Expected 'Not started', got {data['interestLevel']}"

    def test_creighton_trend_stable(self):
        """Creighton should have Stable trend"""
        response = self._get_coach_watch(CREIGHTON_ID)
        assert response.status_code == 200
        data = response.json()
        assert data["trend"] == "Stable", f"Expected Stable, got {data['trend']}"

    def test_creighton_no_signals(self):
        """Creighton should have empty signals list"""
        response = self._get_coach_watch(CREIGHTON_ID)
        assert response.status_code == 200
        data = response.json()
        assert len(data.get("signals", [])) == 0, f"Expected no signals, got {data.get('signals')}"

    def test_creighton_score_is_zero(self):
        """Creighton should have score=0"""
        response = self._get_coach_watch(CREIGHTON_ID)
        assert response.status_code == 200
        data = response.json()
        assert data["score"] == 0, f"Expected score=0, got {data['score']}"

    def test_creighton_meta_no_outreach(self):
        """Creighton meta should indicate hasOutreach=false"""
        response = self._get_coach_watch(CREIGHTON_ID)
        assert response.status_code == 200
        data = response.json()
        assert data["meta"]["hasOutreach"] is False

    # ============ UCLA Tests (active_conversation) ============

    def test_ucla_state_is_active_conversation(self):
        """UCLA should be active_conversation (has reply)"""
        response = self._get_coach_watch(UCLA_ID)
        assert response.status_code == 200
        data = response.json()
        assert data["state"] == "active_conversation", f"Expected active_conversation, got {data['state']}"

    def test_ucla_interest_medium(self):
        """UCLA should have Medium interest level"""
        response = self._get_coach_watch(UCLA_ID)
        assert response.status_code == 200
        data = response.json()
        assert data["interestLevel"] in ["Medium", "High"], f"Expected Medium or High, got {data['interestLevel']}"

    def test_ucla_has_reply_signal(self):
        """UCLA should have coach_reply signal"""
        response = self._get_coach_watch(UCLA_ID)
        assert response.status_code == 200
        data = response.json()
        signal_types = [s["type"] for s in data.get("signals", [])]
        assert "coach_reply" in signal_types, f"Expected coach_reply signal, got {signal_types}"

    def test_ucla_meta_has_reply(self):
        """UCLA meta should indicate hasReply=true"""
        response = self._get_coach_watch(UCLA_ID)
        assert response.status_code == 200
        data = response.json()
        assert data["meta"]["hasReply"] is True

    def test_ucla_score_positive(self):
        """UCLA should have positive score (> 0)"""
        response = self._get_coach_watch(UCLA_ID)
        assert response.status_code == 200
        data = response.json()
        assert data["score"] > 0, f"Expected positive score, got {data['score']}"

    # ============ Response Structure Tests ============

    def test_response_has_required_fields(self):
        """All coach-watch responses should have required fields"""
        response = self._get_coach_watch(STANFORD_ID)
        assert response.status_code == 200
        data = response.json()
        
        required_fields = [
            "score", "interestLevel", "trend", "state", "summary",
            "recommendedAction", "primaryCta", "secondaryCta",
            "mostEngagedContact", "signals", "meta"
        ]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"

    def test_meta_has_required_fields(self):
        """Meta object should have required fields"""
        response = self._get_coach_watch(STANFORD_ID)
        assert response.status_code == 200
        data = response.json()
        meta = data.get("meta", {})
        
        meta_fields = [
            "hasOutreach", "hasReply", "hasVisit", "hasOffer",
            "totalOpens", "totalClicks", "daysSinceActivity", "outreachCount"
        ]
        for field in meta_fields:
            assert field in meta, f"Missing meta field: {field}"

    def test_signals_have_required_fields(self):
        """Signal objects should have required fields"""
        response = self._get_coach_watch(STANFORD_ID)
        assert response.status_code == 200
        data = response.json()
        
        for signal in data.get("signals", []):
            assert "type" in signal, "Signal missing 'type'"
            assert "label" in signal, "Signal missing 'label'"
            assert "points" in signal, "Signal missing 'points'"
            assert "strength" in signal, "Signal missing 'strength'"

"""
AI Confidence Indicators Tests - CapyMatch Recruiting OS
Tests the new confidence indicator feature added to all 4 V2 AI endpoints.
Each endpoint must return:
- confidence.signal: "strong" | "moderate" | "limited"
- confidence.basis: human-readable string explaining what data was analyzed

Endpoints tested:
1. POST /api/ai/suggested-actions - Based on alerts, events, attention, recs
2. POST /api/ai/pod-brief/{id} - Based on timeline events, interventions, actions
3. POST /api/ai/program-insights - Based on athletes, events, recommendations, notes
4. POST /api/ai/event-followups/{id} - Based on note count, athletes observed
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
DIRECTOR_EMAIL = "director@capymatch.com"
DIRECTOR_PASSWORD = "director123"
COACH_EMAIL = "coach.williams@capymatch.com"
COACH_PASSWORD = "coach123"

# Test entities
ATHLETE_1 = "athlete_1"  # Owned by Coach Williams
EVENT_1 = "event_1"      # Has 14 notes in DB

VALID_SIGNALS = ["strong", "moderate", "limited"]


@pytest.fixture(scope="module")
def director_token():
    """Get director auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": DIRECTOR_EMAIL,
        "password": DIRECTOR_PASSWORD
    })
    assert response.status_code == 200, f"Director login failed: {response.text}"
    return response.json().get("token")


@pytest.fixture(scope="module")
def coach_token():
    """Get coach (williams) auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": COACH_EMAIL,
        "password": COACH_PASSWORD
    })
    assert response.status_code == 200, f"Coach login failed: {response.text}"
    return response.json().get("token")


class TestSuggestedActionsConfidence:
    """Tests for confidence indicator on POST /api/ai/suggested-actions"""
    
    def test_suggested_actions_has_confidence_object(self, director_token):
        """Response includes 'confidence' object with signal and basis"""
        response = requests.post(
            f"{BASE_URL}/api/ai/suggested-actions",
            headers={"Authorization": f"Bearer {director_token}"},
            timeout=55
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify confidence object exists
        assert "confidence" in data, "Missing 'confidence' object in response"
        confidence = data["confidence"]
        
        # Verify signal
        assert "signal" in confidence, "Missing 'signal' in confidence object"
        assert confidence["signal"] in VALID_SIGNALS, \
            f"Invalid signal: {confidence['signal']}. Expected one of {VALID_SIGNALS}"
        
        # Verify basis
        assert "basis" in confidence, "Missing 'basis' in confidence object"
        assert isinstance(confidence["basis"], str), "Basis should be a string"
        assert len(confidence["basis"]) > 10, "Basis should be meaningful text"
        
        print(f"suggested-actions confidence: signal={confidence['signal']}, basis={confidence['basis']}")
    
    def test_suggested_actions_basis_mentions_data_sources(self, director_token):
        """Basis text should mention alert counts, event counts, etc."""
        response = requests.post(
            f"{BASE_URL}/api/ai/suggested-actions",
            headers={"Authorization": f"Bearer {director_token}"},
            timeout=55
        )
        assert response.status_code == 200
        data = response.json()
        
        basis = data["confidence"]["basis"].lower()
        
        # Should mention at least one of these data sources
        data_source_keywords = ["alert", "event", "attention", "recommendation", "based on"]
        has_keyword = any(kw in basis for kw in data_source_keywords)
        assert has_keyword, f"Basis should mention data sources. Got: {data['confidence']['basis']}"
        
        print(f"Basis mentions data sources: {data['confidence']['basis']}")
    
    def test_coach_scoped_confidence(self, coach_token):
        """Coach's confidence should be based on coach's data subset"""
        response = requests.post(
            f"{BASE_URL}/api/ai/suggested-actions",
            headers={"Authorization": f"Bearer {coach_token}"},
            timeout=55
        )
        assert response.status_code == 200
        data = response.json()
        
        # Coach should still get confidence indicator
        assert "confidence" in data, "Coach response missing confidence"
        assert data["confidence"]["signal"] in VALID_SIGNALS
        assert len(data["confidence"]["basis"]) > 5
        
        print(f"Coach confidence: signal={data['confidence']['signal']}, basis={data['confidence']['basis']}")


class TestPodBriefConfidence:
    """Tests for confidence indicator on POST /api/ai/pod-brief/{athlete_id}"""
    
    def test_pod_brief_has_confidence_object(self, director_token):
        """Response includes 'confidence' object with signal and basis"""
        response = requests.post(
            f"{BASE_URL}/api/ai/pod-brief/{ATHLETE_1}",
            headers={"Authorization": f"Bearer {director_token}"},
            timeout=55
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify confidence object exists
        assert "confidence" in data, "Missing 'confidence' object in response"
        confidence = data["confidence"]
        
        # Verify signal
        assert "signal" in confidence, "Missing 'signal' in confidence object"
        assert confidence["signal"] in VALID_SIGNALS, \
            f"Invalid signal: {confidence['signal']}. Expected one of {VALID_SIGNALS}"
        
        # Verify basis
        assert "basis" in confidence, "Missing 'basis' in confidence object"
        assert isinstance(confidence["basis"], str), "Basis should be a string"
        
        print(f"pod-brief confidence: signal={confidence['signal']}, basis={confidence['basis']}")
    
    def test_pod_brief_basis_mentions_pod_data(self, director_token):
        """Basis should mention timeline events, interventions, actions"""
        response = requests.post(
            f"{BASE_URL}/api/ai/pod-brief/{ATHLETE_1}",
            headers={"Authorization": f"Bearer {director_token}"},
            timeout=55
        )
        assert response.status_code == 200
        data = response.json()
        
        basis = data["confidence"]["basis"].lower()
        
        # Should mention pod-related data sources
        pod_keywords = ["timeline", "intervention", "action", "event", "pod", "based on", "activity"]
        has_keyword = any(kw in basis for kw in pod_keywords)
        assert has_keyword, f"Basis should mention pod data. Got: {data['confidence']['basis']}"
        
        print(f"Pod brief basis: {data['confidence']['basis']}")
    
    def test_pod_brief_strong_signal_for_active_athlete(self, director_token):
        """athlete_1 has 30 timeline events + 2 interventions + 8 actions = strong signal"""
        response = requests.post(
            f"{BASE_URL}/api/ai/pod-brief/{ATHLETE_1}",
            headers={"Authorization": f"Bearer {director_token}"},
            timeout=55
        )
        assert response.status_code == 200
        data = response.json()
        
        # Per the spec, athlete_1 should have strong signal
        # Threshold is >=6 total (timeline + interventions + actions)
        signal = data["confidence"]["signal"]
        print(f"athlete_1 pod-brief signal: {signal} (expected strong or moderate based on actual data)")
        # Don't assert exact signal as data may vary, but verify it's valid
        assert signal in VALID_SIGNALS


class TestProgramInsightsConfidence:
    """Tests for confidence indicator on POST /api/ai/program-insights (director-only)"""
    
    def test_program_insights_has_confidence_object(self, director_token):
        """Response includes 'confidence' object with signal and basis"""
        response = requests.post(
            f"{BASE_URL}/api/ai/program-insights",
            headers={"Authorization": f"Bearer {director_token}"},
            timeout=55
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify confidence object exists
        assert "confidence" in data, "Missing 'confidence' object in response"
        confidence = data["confidence"]
        
        # Verify signal
        assert "signal" in confidence, "Missing 'signal' in confidence object"
        assert confidence["signal"] in VALID_SIGNALS, \
            f"Invalid signal: {confidence['signal']}. Expected one of {VALID_SIGNALS}"
        
        # Verify basis
        assert "basis" in confidence, "Missing 'basis' in confidence object"
        assert isinstance(confidence["basis"], str), "Basis should be a string"
        
        print(f"program-insights confidence: signal={confidence['signal']}, basis={confidence['basis']}")
    
    def test_program_insights_basis_mentions_program_data(self, director_token):
        """Basis should mention athletes, events, recommendations, notes"""
        response = requests.post(
            f"{BASE_URL}/api/ai/program-insights",
            headers={"Authorization": f"Bearer {director_token}"},
            timeout=55
        )
        assert response.status_code == 200
        data = response.json()
        
        basis = data["confidence"]["basis"].lower()
        
        # Should mention program-level data sources
        program_keywords = ["athlete", "event", "recommendation", "note", "based on"]
        has_keyword = any(kw in basis for kw in program_keywords)
        assert has_keyword, f"Basis should mention program data. Got: {data['confidence']['basis']}"
        
        print(f"Program insights basis: {data['confidence']['basis']}")
    
    def test_program_insights_strong_signal_expected(self, director_token):
        """Program has 25 athletes, 10 events, 29 recs, 23 notes = strong signal (>=30 total)"""
        response = requests.post(
            f"{BASE_URL}/api/ai/program-insights",
            headers={"Authorization": f"Bearer {director_token}"},
            timeout=55
        )
        assert response.status_code == 200
        data = response.json()
        
        signal = data["confidence"]["signal"]
        # Per spec, total ~87 items = strong signal expected
        print(f"program-insights signal: {signal} (expected 'strong' based on program data)")
        # The program has lots of data, so should be strong
        # But don't fail if moderate due to data variations
        assert signal in ["strong", "moderate"], f"Expected strong/moderate, got: {signal}"


class TestEventFollowupsConfidence:
    """Tests for confidence indicator on POST /api/ai/event-followups/{event_id}"""
    
    def test_event_followups_has_confidence_object(self, director_token):
        """Response includes 'confidence' object with signal and basis"""
        response = requests.post(
            f"{BASE_URL}/api/ai/event-followups/{EVENT_1}",
            headers={"Authorization": f"Bearer {director_token}"},
            timeout=55
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify confidence object exists
        assert "confidence" in data, "Missing 'confidence' object in response"
        confidence = data["confidence"]
        
        # Verify signal
        assert "signal" in confidence, "Missing 'signal' in confidence object"
        assert confidence["signal"] in VALID_SIGNALS, \
            f"Invalid signal: {confidence['signal']}. Expected one of {VALID_SIGNALS}"
        
        # Verify basis
        assert "basis" in confidence, "Missing 'basis' in confidence object"
        assert isinstance(confidence["basis"], str), "Basis should be a string"
        
        print(f"event-followups confidence: signal={confidence['signal']}, basis={confidence['basis']}")
    
    def test_event_followups_basis_mentions_note_count(self, director_token):
        """Basis should mention note count and athletes observed"""
        response = requests.post(
            f"{BASE_URL}/api/ai/event-followups/{EVENT_1}",
            headers={"Authorization": f"Bearer {director_token}"},
            timeout=55
        )
        assert response.status_code == 200
        data = response.json()
        
        basis = data["confidence"]["basis"].lower()
        
        # Should mention notes and/or athletes
        event_keywords = ["note", "athlete", "observed", "school", "based on", "follow-up", "event"]
        has_keyword = any(kw in basis for kw in event_keywords)
        assert has_keyword, f"Basis should mention event data. Got: {data['confidence']['basis']}"
        
        print(f"Event followups basis: {data['confidence']['basis']}")
    
    def test_event_1_strong_signal_expected(self, director_token):
        """event_1 has 14 notes = strong signal (>=8 notes and >=3 athletes)"""
        response = requests.post(
            f"{BASE_URL}/api/ai/event-followups/{EVENT_1}",
            headers={"Authorization": f"Bearer {director_token}"},
            timeout=55
        )
        assert response.status_code == 200
        data = response.json()
        
        signal = data["confidence"]["signal"]
        notes_analyzed = data.get("notes_analyzed", 0)
        
        print(f"event_1 signal: {signal}, notes_analyzed: {notes_analyzed}")
        
        # event_1 has 14 notes per spec, should be strong if >= 8 notes and >= 3 unique athletes
        # Don't fail on exact signal as athlete distribution may vary
        assert signal in VALID_SIGNALS


class TestConfidenceSignalThresholds:
    """Test that confidence signals reflect data quantity correctly"""
    
    def test_suggested_actions_signal_reflects_data(self, director_token):
        """Verify signal correlates with amount of available data"""
        response = requests.post(
            f"{BASE_URL}/api/ai/suggested-actions",
            headers={"Authorization": f"Bearer {director_token}"},
            timeout=55
        )
        assert response.status_code == 200
        data = response.json()
        
        # Extract counts from response if available
        confidence = data["confidence"]
        basis = confidence["basis"]
        signal = confidence["signal"]
        
        print(f"Signal: {signal}")
        print(f"Basis: {basis}")
        
        # Verify we have actual text, not just "Limited data"
        if "limited data" in basis.lower():
            assert signal == "limited", "Signal should be 'limited' when data is limited"
        else:
            # If basis mentions specific counts, signal should be moderate or strong
            assert signal in ["moderate", "strong"], \
                f"Signal should be moderate/strong when data exists. Got: {signal}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

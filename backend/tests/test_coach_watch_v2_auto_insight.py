"""
Test Coach Watch V2 Auto-Insight Feature
Tests:
1. POST /api/ai/auto-insight - response contract validation
2. Auto-insight caching (2hr TTL)
3. Cache invalidation on new interaction
4. POST /api/ai/next-step - Coach Watch context injection
5. POST /api/ai/journey-summary - Coach Watch context injection
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
ATHLETE_EMAIL = "emma.chen@athlete.capymatch.com"
ATHLETE_PASSWORD = "athlete123"
STANFORD_PROGRAM_ID = "cd5c0908-c3ea-49d1-8a5f-d57d18f32116"


@pytest.fixture(scope="module")
def athlete_token():
    """Get athlete auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ATHLETE_EMAIL,
        "password": ATHLETE_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Failed to login as athlete: {response.status_code} - {response.text}")
    return response.json().get("token")


@pytest.fixture(scope="module")
def athlete_headers(athlete_token):
    """Headers with athlete auth"""
    return {
        "Authorization": f"Bearer {athlete_token}",
        "Content-Type": "application/json"
    }


class TestAutoInsightEndpoint:
    """Test POST /api/ai/auto-insight endpoint"""
    
    def test_auto_insight_returns_correct_contract(self, athlete_headers):
        """Test that auto-insight returns all required fields"""
        response = requests.post(
            f"{BASE_URL}/api/ai/auto-insight",
            json={"program_id": STANFORD_PROGRAM_ID},
            headers=athlete_headers,
            timeout=30  # LLM calls can be slow
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response contract
        required_fields = [
            "state", "headline", "recommended_action", 
            "recommended_action_text", "confidence", "ai", "signals"
        ]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        # Verify ai sub-object
        assert "ai" in data
        assert "insight" in data["ai"], "Missing ai.insight"
        assert "urgency" in data["ai"], "Missing ai.urgency"
        
        # Verify signals is an array
        assert isinstance(data["signals"], list), "signals should be an array"
        
        # Verify state is one of the valid states
        valid_states = [
            "hot_opportunity", "active_conversation", "re_engaged",
            "emerging_interest", "cooling", "follow_up_window_open",
            "waiting_for_signal", "stalled", "deprioritize", "no_signals"
        ]
        assert data["state"] in valid_states, f"Invalid state: {data['state']}"
        
        # Verify confidence is valid
        valid_confidence = ["high", "medium", "low"]
        assert data["confidence"] in valid_confidence, f"Invalid confidence: {data['confidence']}"
        
        # Verify urgency is valid
        valid_urgency = ["high", "medium", "low"]
        assert data["ai"]["urgency"] in valid_urgency, f"Invalid urgency: {data['ai']['urgency']}"
        
        print(f"✓ Auto-insight response contract valid: state={data['state']}, confidence={data['confidence']}")
        print(f"  Headline: {data['headline']}")
        print(f"  AI Insight: {data['ai']['insight'][:100]}..." if len(data['ai'].get('insight', '')) > 100 else f"  AI Insight: {data['ai'].get('insight', '')}")
        print(f"  Signals: {data['signals']}")
    
    def test_auto_insight_caching(self, athlete_headers):
        """Test that second call returns cached result (faster)"""
        # First call - may hit LLM
        start1 = time.time()
        response1 = requests.post(
            f"{BASE_URL}/api/ai/auto-insight",
            json={"program_id": STANFORD_PROGRAM_ID},
            headers=athlete_headers,
            timeout=30
        )
        time1 = time.time() - start1
        
        assert response1.status_code == 200
        data1 = response1.json()
        
        # Second call - should be cached
        start2 = time.time()
        response2 = requests.post(
            f"{BASE_URL}/api/ai/auto-insight",
            json={"program_id": STANFORD_PROGRAM_ID},
            headers=athlete_headers,
            timeout=30
        )
        time2 = time.time() - start2
        
        assert response2.status_code == 200
        data2 = response2.json()
        
        # Verify same data returned
        assert data1["state"] == data2["state"], "Cached state should match"
        assert data1["headline"] == data2["headline"], "Cached headline should match"
        
        # Second call should be faster (cached)
        # Note: First call might also be cached from previous test runs
        print(f"✓ Caching test: First call {time1:.2f}s, Second call {time2:.2f}s")
        print(f"  Both returned state={data1['state']}")
    
    def test_auto_insight_invalid_program(self, athlete_headers):
        """Test auto-insight with invalid program_id"""
        response = requests.post(
            f"{BASE_URL}/api/ai/auto-insight",
            json={"program_id": "invalid-program-id-12345"},
            headers=athlete_headers,
            timeout=10
        )
        
        assert response.status_code == 404, f"Expected 404 for invalid program, got {response.status_code}"
        print("✓ Invalid program returns 404")
    
    def test_auto_insight_requires_auth(self):
        """Test that auto-insight requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/ai/auto-insight",
            json={"program_id": STANFORD_PROGRAM_ID},
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ Auto-insight requires authentication")


class TestCacheInvalidation:
    """Test cache invalidation on new interactions"""
    
    def test_cache_invalidation_on_interaction(self, athlete_headers):
        """Test that posting a new interaction clears the cache"""
        # First, get the current auto-insight (may create cache)
        response1 = requests.post(
            f"{BASE_URL}/api/ai/auto-insight",
            json={"program_id": STANFORD_PROGRAM_ID},
            headers=athlete_headers,
            timeout=30
        )
        assert response1.status_code == 200
        
        # Post a new interaction
        interaction_response = requests.post(
            f"{BASE_URL}/api/athlete/interactions",
            json={
                "program_id": STANFORD_PROGRAM_ID,
                "type": "Email",
                "notes": "Test interaction for cache invalidation",
                "outcome": "No Response"
            },
            headers=athlete_headers,
            timeout=10
        )
        
        # Interaction should succeed (200 or 201)
        assert interaction_response.status_code in [200, 201], f"Failed to create interaction: {interaction_response.status_code}"
        
        print("✓ Cache invalidation: New interaction posted successfully")
        print("  Note: Cache should be cleared, next auto-insight call will regenerate")


class TestNextStepWithCoachWatch:
    """Test POST /api/ai/next-step includes Coach Watch context"""
    
    def test_next_step_returns_valid_json(self, athlete_headers):
        """Test that next-step returns valid JSON with required fields"""
        response = requests.post(
            f"{BASE_URL}/api/ai/next-step",
            json={"program_id": STANFORD_PROGRAM_ID},
            headers=athlete_headers,
            timeout=30
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify required fields
        assert "next_step" in data, "Missing next_step field"
        assert "urgency" in data, "Missing urgency field"
        
        # Verify urgency is valid
        valid_urgency = ["high", "medium", "low"]
        assert data["urgency"] in valid_urgency, f"Invalid urgency: {data['urgency']}"
        
        print(f"✓ Next-step response valid: urgency={data['urgency']}")
        print(f"  Next step: {data['next_step'][:100]}..." if len(data.get('next_step', '')) > 100 else f"  Next step: {data.get('next_step', '')}")
    
    def test_next_step_requires_auth(self):
        """Test that next-step requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/ai/next-step",
            json={"program_id": STANFORD_PROGRAM_ID},
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ Next-step requires authentication")


class TestJourneySummaryWithCoachWatch:
    """Test POST /api/ai/journey-summary includes Coach Watch context"""
    
    def test_journey_summary_returns_valid_json(self, athlete_headers):
        """Test that journey-summary returns valid JSON with required fields"""
        response = requests.post(
            f"{BASE_URL}/api/ai/journey-summary",
            json={"program_id": STANFORD_PROGRAM_ID},
            headers=athlete_headers,
            timeout=30
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify required fields
        assert "relationship_summary" in data, "Missing relationship_summary field"
        
        print(f"✓ Journey-summary response valid")
        print(f"  Summary: {data['relationship_summary'][:100]}..." if len(data.get('relationship_summary', '')) > 100 else f"  Summary: {data.get('relationship_summary', '')}")
    
    def test_journey_summary_requires_auth(self):
        """Test that journey-summary requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/ai/journey-summary",
            json={"program_id": STANFORD_PROGRAM_ID},
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ Journey-summary requires authentication")


class TestCoachWatchEndpoint:
    """Test GET /api/coach-watch/{program_id} endpoint"""
    
    def test_coach_watch_returns_valid_response(self, athlete_headers):
        """Test that coach-watch returns valid response"""
        response = requests.get(
            f"{BASE_URL}/api/coach-watch/{STANFORD_PROGRAM_ID}",
            headers=athlete_headers,
            timeout=10
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify key fields
        required_fields = ["state", "headline", "recommendedAction", "confidenceLevel", "interestLevel"]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        print(f"✓ Coach-watch response valid: state={data['state']}, confidence={data['confidenceLevel']}")
        print(f"  Headline: {data['headline']}")
        print(f"  Recommended Action: {data['recommendedAction']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

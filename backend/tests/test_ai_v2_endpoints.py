"""
AI V2 Intelligence Layer Tests - CapyMatch Recruiting OS
Tests for 4 new V2 AI features:
1. /api/ai/suggested-actions - Mission Control + Support Pod next actions
2. /api/ai/pod-brief/{id} - Support Pod brief at top
3. /api/ai/pod-actions/{id} - Support Pod AI suggested actions
4. /api/ai/program-insights - Program-level strategic insights (director-only)
5. /api/ai/event-followups/{id} - Event-driven follow-up suggestions
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
ATHLETE_2 = "athlete_2"  # Also owned by Coach Williams
ATHLETE_4 = "athlete_4"  # Owned by Coach Garcia
EVENT_1 = "event_1"      # Has notes in DB


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


class TestAiSuggestedActions:
    """Tests for POST /api/ai/suggested-actions - Mission Control next actions"""
    
    def test_director_suggested_actions_success(self, director_token):
        """Director can generate suggested actions with structured output"""
        response = requests.post(
            f"{BASE_URL}/api/ai/suggested-actions",
            headers={"Authorization": f"Bearer {director_token}"},
            timeout=55
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "actions" in data, "Missing 'actions' field"
        assert "generated_at" in data, "Missing 'generated_at' field"
        assert "scope" in data, "Missing 'scope' field"
        assert data["scope"] == "full program", "Director scope should be 'full program'"
        
        # Verify actions have required fields (WHY/EVIDENCE/OWNER/PRIORITY)
        if data["actions"]:
            action = data["actions"][0]
            assert "action" in action, "Action missing 'action' field"
            # WHY, EVIDENCE, OWNER, PRIORITY may be present depending on LLM response
            print(f"Director suggested actions: {len(data['actions'])} actions generated")
    
    def test_coach_suggested_actions_scoped(self, coach_token):
        """Coach gets actions scoped to their athletes only"""
        response = requests.post(
            f"{BASE_URL}/api/ai/suggested-actions",
            headers={"Authorization": f"Bearer {coach_token}"},
            timeout=55
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Coach scope should be "your athletes"
        assert data["scope"] == "your athletes", f"Coach scope should be 'your athletes', got: {data['scope']}"
        print(f"Coach suggested actions: {len(data.get('actions', []))} actions, scope: {data['scope']}")
    
    def test_no_auth_returns_401(self):
        """No auth token returns 401"""
        response = requests.post(f"{BASE_URL}/api/ai/suggested-actions")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


class TestAiPodBrief:
    """Tests for POST /api/ai/pod-brief/{athlete_id} - Support Pod brief"""
    
    def test_director_pod_brief_success(self, director_token):
        """Director can generate pod brief for any athlete"""
        response = requests.post(
            f"{BASE_URL}/api/ai/pod-brief/{ATHLETE_1}",
            headers={"Authorization": f"Bearer {director_token}"},
            timeout=55
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify structure: text, status_signal, key_facts
        assert "text" in data, "Missing 'text' field"
        assert "status_signal" in data, "Missing 'status_signal' field"
        assert data["status_signal"] in ["needs_attention", "stable", "improving"], \
            f"Invalid status_signal: {data['status_signal']}"
        assert "key_facts" in data, "Missing 'key_facts' field"
        assert "athlete_name" in data, "Missing 'athlete_name' field"
        assert "generated_at" in data, "Missing 'generated_at' field"
        
        print(f"Pod brief for {ATHLETE_1}: status={data['status_signal']}, facts={len(data.get('key_facts', []))}")
    
    def test_coach_can_access_own_athlete(self, coach_token):
        """Coach Williams can access pod brief for athlete_1 (owned)"""
        response = requests.post(
            f"{BASE_URL}/api/ai/pod-brief/{ATHLETE_1}",
            headers={"Authorization": f"Bearer {coach_token}"},
            timeout=55
        )
        # athlete_1 is odd-numbered, should be owned by Coach Williams
        assert response.status_code == 200, f"Coach should access own athlete: {response.text}"
        data = response.json()
        assert "text" in data
        print(f"Coach Williams pod brief for {ATHLETE_1}: SUCCESS")
    
    def test_coach_cannot_access_other_athlete(self, coach_token):
        """Coach Williams cannot access pod brief for athlete_4 (owned by Garcia)"""
        response = requests.post(
            f"{BASE_URL}/api/ai/pod-brief/{ATHLETE_4}",
            headers={"Authorization": f"Bearer {coach_token}"},
            timeout=55
        )
        # athlete_4 is owned by Coach Garcia
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("Coach Williams correctly blocked from athlete_4 pod brief")
    
    def test_invalid_athlete_returns_404(self, director_token):
        """Invalid athlete ID returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/ai/pod-brief/invalid_athlete_xyz",
            headers={"Authorization": f"Bearer {director_token}"},
            timeout=10
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_no_auth_returns_401(self):
        """No auth token returns 401"""
        response = requests.post(f"{BASE_URL}/api/ai/pod-brief/{ATHLETE_1}")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


class TestAiPodActions:
    """Tests for POST /api/ai/pod-actions/{athlete_id} - Support Pod AI actions"""
    
    def test_director_pod_actions_success(self, director_token):
        """Director can generate pod actions for any athlete"""
        response = requests.post(
            f"{BASE_URL}/api/ai/pod-actions/{ATHLETE_1}",
            headers={"Authorization": f"Bearer {director_token}"},
            timeout=55
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "actions" in data, "Missing 'actions' field"
        assert "athlete_name" in data, "Missing 'athlete_name' field"
        assert "generated_at" in data, "Missing 'generated_at' field"
        
        print(f"Pod actions for {ATHLETE_1}: {len(data.get('actions', []))} actions")
    
    def test_coach_can_access_own_athlete(self, coach_token):
        """Coach Williams can access pod actions for owned athlete"""
        response = requests.post(
            f"{BASE_URL}/api/ai/pod-actions/{ATHLETE_1}",
            headers={"Authorization": f"Bearer {coach_token}"},
            timeout=55
        )
        assert response.status_code == 200, f"Coach should access own athlete: {response.text}"
        print("Coach Williams pod actions for athlete_1: SUCCESS")
    
    def test_coach_cannot_access_other_athlete(self, coach_token):
        """Coach Williams cannot access pod actions for athlete_4 (owned by Garcia)"""
        response = requests.post(
            f"{BASE_URL}/api/ai/pod-actions/{ATHLETE_4}",
            headers={"Authorization": f"Bearer {coach_token}"},
            timeout=10
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
    
    def test_no_auth_returns_401(self):
        """No auth token returns 401"""
        response = requests.post(f"{BASE_URL}/api/ai/pod-actions/{ATHLETE_1}")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


class TestAiProgramInsights:
    """Tests for POST /api/ai/program-insights - Director-only strategic insights"""
    
    def test_director_program_insights_success(self, director_token):
        """Director can generate program insights with narrative + structured insights"""
        response = requests.post(
            f"{BASE_URL}/api/ai/program-insights",
            headers={"Authorization": f"Bearer {director_token}"},
            timeout=55
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify structure: narrative, insights[]
        assert "narrative" in data, "Missing 'narrative' field"
        assert "insights" in data, "Missing 'insights' field"
        assert "generated_at" in data, "Missing 'generated_at' field"
        
        # Verify insights have severity
        if data["insights"]:
            insight = data["insights"][0]
            assert "insight" in insight, "Insight missing 'insight' field"
            # Check for WHY, EVIDENCE, RECOMMENDATION, SEVERITY
            print(f"Program insights: narrative={len(data['narrative'])} chars, {len(data['insights'])} insights")
    
    def test_coach_returns_403(self, coach_token):
        """Coach cannot access program insights (director-only)"""
        response = requests.post(
            f"{BASE_URL}/api/ai/program-insights",
            headers={"Authorization": f"Bearer {coach_token}"},
            timeout=10
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        detail = response.json().get("detail", "")
        assert "director" in detail.lower(), f"Error message should mention director: {detail}"
        print("Coach correctly blocked from program insights (403)")
    
    def test_no_auth_returns_401(self):
        """No auth token returns 401"""
        response = requests.post(f"{BASE_URL}/api/ai/program-insights")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


class TestAiEventFollowups:
    """Tests for POST /api/ai/event-followups/{event_id} - Event follow-up suggestions"""
    
    def test_director_event_followups_success(self, director_token):
        """Director can generate event follow-ups (event_1 has 14 notes)"""
        response = requests.post(
            f"{BASE_URL}/api/ai/event-followups/{EVENT_1}",
            headers={"Authorization": f"Bearer {director_token}"},
            timeout=55
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify structure: followups[], event_name, notes_analyzed
        assert "followups" in data, "Missing 'followups' field"
        assert "event_name" in data, "Missing 'event_name' field"
        assert "notes_analyzed" in data, "Missing 'notes_analyzed' field"
        assert "generated_at" in data, "Missing 'generated_at' field"
        
        # Verify followups have structured fields
        if data["followups"]:
            followup = data["followups"][0]
            assert "action" in followup, "Followup missing 'action' field"
        
        print(f"Event followups for {EVENT_1}: {len(data.get('followups', []))} followups, {data.get('notes_analyzed', 0)} notes analyzed")
    
    def test_coach_event_followups_scoped(self, coach_token):
        """Coach gets follow-ups scoped to their athletes only"""
        response = requests.post(
            f"{BASE_URL}/api/ai/event-followups/{EVENT_1}",
            headers={"Authorization": f"Bearer {coach_token}"},
            timeout=55
        )
        # Might be 200 (if coach's athletes have notes) or 400 (if no notes for coach's athletes)
        assert response.status_code in [200, 400], f"Expected 200 or 400, got {response.status_code}: {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            print(f"Coach event followups: {len(data.get('followups', []))} followups")
        else:
            print("Coach has no athletes with notes at this event (400)")
    
    def test_event_not_found_returns_404(self, director_token):
        """Invalid event ID returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/ai/event-followups/invalid_event_xyz",
            headers={"Authorization": f"Bearer {director_token}"},
            timeout=10
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_event_no_notes_returns_400(self, director_token):
        """Event with no notes returns 400"""
        # event_2 has no notes (per previous tests)
        response = requests.post(
            f"{BASE_URL}/api/ai/event-followups/event_2",
            headers={"Authorization": f"Bearer {director_token}"},
            timeout=10
        )
        # Should be 400 if no notes, or 404 if event doesn't exist
        assert response.status_code in [400, 404], f"Expected 400 or 404, got {response.status_code}"
    
    def test_no_auth_returns_401(self):
        """No auth token returns 401"""
        response = requests.post(f"{BASE_URL}/api/ai/event-followups/{EVENT_1}")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


class TestV2EndpointsAuth:
    """Verify all V2 endpoints require authentication"""
    
    def test_all_v2_endpoints_require_auth(self):
        """All V2 endpoints return 401 without auth"""
        endpoints = [
            ("POST", "/api/ai/suggested-actions"),
            ("POST", f"/api/ai/pod-brief/{ATHLETE_1}"),
            ("POST", f"/api/ai/pod-actions/{ATHLETE_1}"),
            ("POST", "/api/ai/program-insights"),
            ("POST", f"/api/ai/event-followups/{EVENT_1}"),
        ]
        
        for method, path in endpoints:
            if method == "POST":
                response = requests.post(f"{BASE_URL}{path}")
            else:
                response = requests.get(f"{BASE_URL}{path}")
            
            assert response.status_code == 401, \
                f"{method} {path} should return 401, got {response.status_code}"
            print(f"{method} {path}: 401 Unauthorized ✓")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

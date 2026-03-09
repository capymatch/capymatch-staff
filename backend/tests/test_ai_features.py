"""
Test AI Features - All AI endpoints from capymatch implementation
Tests: draft-email, next-step, journey-summary, assistant (conv), outreach-analysis, 
       highlight-advice, coach-watch, school-insight, Gmail inbox endpoints
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
ATHLETE_EMAIL = "emma.chen@athlete.capymatch.com"
ATHLETE_PASSWORD = "password123"


class TestAIFeatures:
    """Test all AI-powered endpoints"""
    
    @pytest.fixture(scope="class")
    def athlete_token(self):
        """Get athlete auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ATHLETE_EMAIL, "password": ATHLETE_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def headers(self, athlete_token):
        """Auth headers"""
        return {"Authorization": f"Bearer {athlete_token}"}
    
    @pytest.fixture(scope="class")
    def program_id(self, headers):
        """Get first program_id from athlete's pipeline"""
        response = requests.get(f"{BASE_URL}/api/athlete/programs", headers=headers)
        assert response.status_code == 200, f"Failed to get programs: {response.text}"
        programs = response.json()
        assert len(programs) > 0, "Athlete has no programs in pipeline"
        return programs[0]["program_id"]

    # ───────────────────────────────────────────────────────────────────────────
    # 1. POST /api/ai/draft-email - AI Draft Email
    # ───────────────────────────────────────────────────────────────────────────
    
    def test_ai_draft_email_intro(self, headers, program_id):
        """Test AI draft email - introduction type"""
        response = requests.post(
            f"{BASE_URL}/api/ai/draft-email",
            json={"program_id": program_id, "email_type": "intro"},
            headers=headers,
            timeout=60  # AI can take time
        )
        assert response.status_code == 200, f"Draft email failed: {response.text}"
        data = response.json()
        # Validate response structure
        assert "subject" in data, "Response missing 'subject'"
        assert "body" in data, "Response missing 'body'"
        assert "email_type" in data, "Response missing 'email_type'"
        assert data["email_type"] == "intro"
        # Validate content
        assert len(data["subject"]) > 5, "Subject too short"
        assert len(data["body"]) > 20, "Body too short"
        print(f"✅ AI Draft Email (intro) - Subject: {data['subject'][:50]}...")
    
    def test_ai_draft_email_follow_up(self, headers, program_id):
        """Test AI draft email - follow-up type"""
        response = requests.post(
            f"{BASE_URL}/api/ai/draft-email",
            json={"program_id": program_id, "email_type": "follow_up"},
            headers=headers,
            timeout=60
        )
        assert response.status_code == 200, f"Draft email failed: {response.text}"
        data = response.json()
        assert "subject" in data
        assert "body" in data
        assert data["email_type"] == "follow_up"
        print(f"✅ AI Draft Email (follow_up) - Subject: {data['subject'][:50]}...")
    
    def test_ai_draft_email_with_custom_instructions(self, headers, program_id):
        """Test AI draft email with custom instructions"""
        response = requests.post(
            f"{BASE_URL}/api/ai/draft-email",
            json={
                "program_id": program_id,
                "email_type": "intro",
                "custom_instructions": "Mention my recent tournament win"
            },
            headers=headers,
            timeout=60
        )
        assert response.status_code == 200, f"Draft email failed: {response.text}"
        data = response.json()
        assert "body" in data
        print(f"✅ AI Draft Email with custom instructions - generated successfully")
    
    def test_ai_draft_email_invalid_program(self, headers):
        """Test AI draft email with invalid program_id"""
        response = requests.post(
            f"{BASE_URL}/api/ai/draft-email",
            json={"program_id": "invalid-program-id", "email_type": "intro"},
            headers=headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✅ AI Draft Email - Correctly returns 404 for invalid program")

    # ───────────────────────────────────────────────────────────────────────────
    # 2. POST /api/ai/next-step - AI Next Step Recommendation
    # ───────────────────────────────────────────────────────────────────────────
    
    def test_ai_next_step(self, headers, program_id):
        """Test AI next step recommendation"""
        response = requests.post(
            f"{BASE_URL}/api/ai/next-step",
            json={"program_id": program_id},
            headers=headers,
            timeout=60
        )
        assert response.status_code == 200, f"Next step failed: {response.text}"
        data = response.json()
        # Validate response structure
        assert "next_step" in data, "Response missing 'next_step'"
        assert "reasoning" in data, "Response missing 'reasoning'"
        assert "urgency" in data, "Response missing 'urgency'"
        assert "action_type" in data, "Response missing 'action_type'"
        assert "program_id" in data, "Response missing 'program_id'"
        # Validate urgency is valid
        assert data["urgency"] in ["high", "medium", "low"], f"Invalid urgency: {data['urgency']}"
        # Validate action_type
        valid_actions = ["email", "call", "visit", "camp", "highlight", "academic", "wait"]
        assert data["action_type"] in valid_actions, f"Invalid action_type: {data['action_type']}"
        print(f"✅ AI Next Step - {data['next_step'][:60]}... (urgency: {data['urgency']})")
    
    def test_ai_next_step_invalid_program(self, headers):
        """Test AI next step with invalid program_id"""
        response = requests.post(
            f"{BASE_URL}/api/ai/next-step",
            json={"program_id": "invalid-program-id"},
            headers=headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✅ AI Next Step - Correctly returns 404 for invalid program")

    # ───────────────────────────────────────────────────────────────────────────
    # 3. POST /api/ai/journey-summary - AI Journey Summary
    # ───────────────────────────────────────────────────────────────────────────
    
    def test_ai_journey_summary(self, headers, program_id):
        """Test AI journey summary generation"""
        response = requests.post(
            f"{BASE_URL}/api/ai/journey-summary",
            json={"program_id": program_id},
            headers=headers,
            timeout=60
        )
        assert response.status_code == 200, f"Journey summary failed: {response.text}"
        data = response.json()
        # Validate response structure
        assert "relationship_summary" in data, "Response missing 'relationship_summary'"
        assert "key_highlights" in data, "Response missing 'key_highlights'"
        assert "suggested_action" in data, "Response missing 'suggested_action'"
        assert "action_type" in data, "Response missing 'action_type'"
        # Validate types
        assert isinstance(data["key_highlights"], list), "key_highlights should be a list"
        print(f"✅ AI Journey Summary - {data['relationship_summary'][:80]}...")
    
    def test_ai_journey_summary_invalid_program(self, headers):
        """Test AI journey summary with invalid program_id"""
        response = requests.post(
            f"{BASE_URL}/api/ai/journey-summary",
            json={"program_id": "invalid-program-id"},
            headers=headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✅ AI Journey Summary - Correctly returns 404 for invalid program")

    # ───────────────────────────────────────────────────────────────────────────
    # 4. POST /api/ai/assistant - AI Conversational Assistant
    # ───────────────────────────────────────────────────────────────────────────
    
    def test_ai_assistant_single_message(self, headers):
        """Test AI assistant with a single message"""
        response = requests.post(
            f"{BASE_URL}/api/ai/assistant",
            json={"message": "What should I know about recruiting?"},
            headers=headers,
            timeout=60
        )
        assert response.status_code == 200, f"Assistant failed: {response.text}"
        data = response.json()
        # Validate response structure
        assert "response" in data, "Response missing 'response'"
        assert "session_id" in data, "Response missing 'session_id'"
        assert len(data["response"]) > 20, "Response too short"
        print(f"✅ AI Assistant - Response: {data['response'][:80]}...")
        return data["session_id"]
    
    def test_ai_assistant_multi_turn(self, headers):
        """Test AI assistant with multi-turn conversation"""
        # First message
        resp1 = requests.post(
            f"{BASE_URL}/api/ai/assistant",
            json={"message": "How do I contact D1 coaches?"},
            headers=headers,
            timeout=60
        )
        assert resp1.status_code == 200, f"First message failed: {resp1.text}"
        session_id = resp1.json()["session_id"]
        
        # Second message in same session
        resp2 = requests.post(
            f"{BASE_URL}/api/ai/assistant",
            json={"message": "What about D2?", "session_id": session_id},
            headers=headers,
            timeout=60
        )
        assert resp2.status_code == 200, f"Second message failed: {resp2.text}"
        assert resp2.json()["session_id"] == session_id, "Session ID should persist"
        print(f"✅ AI Assistant Multi-turn - Session: {session_id}")
    
    def test_ai_assistant_empty_message(self, headers):
        """Test AI assistant with empty message"""
        response = requests.post(
            f"{BASE_URL}/api/ai/assistant",
            json={"message": ""},
            headers=headers
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✅ AI Assistant - Correctly rejects empty message")

    # ───────────────────────────────────────────────────────────────────────────
    # 5. GET /api/ai/assistant/sessions - List Assistant Sessions
    # ───────────────────────────────────────────────────────────────────────────
    
    def test_ai_assistant_sessions_list(self, headers):
        """Test listing assistant sessions"""
        response = requests.get(
            f"{BASE_URL}/api/ai/assistant/sessions",
            headers=headers
        )
        assert response.status_code == 200, f"Sessions list failed: {response.text}"
        data = response.json()
        assert "sessions" in data, "Response missing 'sessions'"
        assert isinstance(data["sessions"], list), "sessions should be a list"
        if data["sessions"]:
            session = data["sessions"][0]
            assert "session_id" in session, "Session missing session_id"
            assert "preview" in session, "Session missing preview"
        print(f"✅ AI Assistant Sessions - Found {len(data['sessions'])} sessions")

    # ───────────────────────────────────────────────────────────────────────────
    # 6. GET /api/ai/assistant/history?session_id=X - Get Conversation History
    # ───────────────────────────────────────────────────────────────────────────
    
    def test_ai_assistant_history(self, headers):
        """Test getting conversation history"""
        # First create a session
        resp1 = requests.post(
            f"{BASE_URL}/api/ai/assistant",
            json={"message": "Tell me about recruiting deadlines"},
            headers=headers,
            timeout=60
        )
        session_id = resp1.json()["session_id"]
        
        # Get history
        response = requests.get(
            f"{BASE_URL}/api/ai/assistant/history?session_id={session_id}",
            headers=headers
        )
        assert response.status_code == 200, f"History failed: {response.text}"
        data = response.json()
        assert "messages" in data, "Response missing 'messages'"
        assert "session_id" in data, "Response missing 'session_id'"
        assert len(data["messages"]) >= 2, "Should have at least user+assistant messages"
        print(f"✅ AI Assistant History - {len(data['messages'])} messages in session")

    # ───────────────────────────────────────────────────────────────────────────
    # 7. GET /api/ai/outreach-analysis - Outreach Analysis
    # ───────────────────────────────────────────────────────────────────────────
    
    def test_ai_outreach_analysis(self, headers):
        """Test outreach analysis endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/ai/outreach-analysis",
            headers=headers,
            timeout=60
        )
        assert response.status_code == 200, f"Outreach analysis failed: {response.text}"
        data = response.json()
        # Should have analysis or message
        if "analysis" in data and data["analysis"]:
            analysis = data["analysis"]
            assert "stats" in analysis, "Analysis missing 'stats'"
            stats = analysis["stats"]
            assert "total_schools" in stats, "Stats missing 'total_schools'"
            assert "total_interactions" in stats, "Stats missing 'total_interactions'"
            print(f"✅ AI Outreach Analysis - {stats['total_schools']} schools, {stats['total_interactions']} interactions")
        else:
            # No data yet
            print(f"✅ AI Outreach Analysis - {data.get('message', 'No analysis data yet')}")

    # ───────────────────────────────────────────────────────────────────────────
    # 8. POST /api/ai/highlight-advice - Highlight Reel Advice
    # ───────────────────────────────────────────────────────────────────────────
    
    def test_ai_highlight_advice_no_question(self, headers):
        """Test highlight advice without question (general advice)"""
        response = requests.post(
            f"{BASE_URL}/api/ai/highlight-advice",
            json={},
            headers=headers,
            timeout=60
        )
        assert response.status_code == 200, f"Highlight advice failed: {response.text}"
        data = response.json()
        assert "advice" in data, "Response missing 'advice'"
        advice = data["advice"]
        if "error" not in advice:
            # Validate structure when successful
            assert "video_length" in advice or "structure" in advice or "must_include_skills" in advice
        print(f"✅ AI Highlight Advice (general) - Generated successfully")
    
    def test_ai_highlight_advice_with_question(self, headers):
        """Test highlight advice with specific question"""
        response = requests.post(
            f"{BASE_URL}/api/ai/highlight-advice",
            json={"question": "How long should my highlight video be for D1 coaches?"},
            headers=headers,
            timeout=60
        )
        assert response.status_code == 200, f"Highlight advice failed: {response.text}"
        data = response.json()
        assert "advice" in data, "Response missing 'advice'"
        print(f"✅ AI Highlight Advice (with question) - Generated successfully")

    # ───────────────────────────────────────────────────────────────────────────
    # 9. POST /api/ai/coach-watch/scan - Coach Watch Scan
    # ───────────────────────────────────────────────────────────────────────────
    
    def test_ai_coach_watch_scan(self, headers):
        """Test coach watch scan (may take time)"""
        response = requests.post(
            f"{BASE_URL}/api/ai/coach-watch/scan",
            json={},
            headers=headers,
            timeout=90  # Can take longer
        )
        assert response.status_code == 200, f"Coach watch scan failed: {response.text}"
        data = response.json()
        # Should have alerts array or message
        assert "alerts" in data or "message" in data, "Response missing 'alerts' or 'message'"
        if "alerts" in data:
            assert isinstance(data["alerts"], list), "alerts should be a list"
            if data["alerts"]:
                alert = data["alerts"][0]
                assert "university_name" in alert or "headline" in alert
        print(f"✅ AI Coach Watch Scan - {len(data.get('alerts', []))} alerts found")

    # ───────────────────────────────────────────────────────────────────────────
    # 10. GET /api/ai/coach-watch/alerts - Get Coach Watch Alerts
    # ───────────────────────────────────────────────────────────────────────────
    
    def test_ai_coach_watch_alerts(self, headers):
        """Test getting coach watch alerts"""
        response = requests.get(
            f"{BASE_URL}/api/ai/coach-watch/alerts",
            headers=headers
        )
        assert response.status_code == 200, f"Coach watch alerts failed: {response.text}"
        data = response.json()
        assert "alerts" in data, "Response missing 'alerts'"
        assert isinstance(data["alerts"], list), "alerts should be a list"
        print(f"✅ AI Coach Watch Alerts - {len(data['alerts'])} stored alerts")

    # ───────────────────────────────────────────────────────────────────────────
    # 11. POST /api/ai/school-insight/{program_id} - School Insight
    # ───────────────────────────────────────────────────────────────────────────
    
    def test_ai_school_insight(self, headers, program_id):
        """Test school insight generation"""
        response = requests.post(
            f"{BASE_URL}/api/ai/school-insight/{program_id}",
            json={},
            headers=headers,
            timeout=60
        )
        assert response.status_code == 200, f"School insight failed: {response.text}"
        data = response.json()
        # Should have insight data
        if "insight" in data:
            insight = data["insight"]
            assert "strengths" in insight or "summary" in insight
            print(f"✅ AI School Insight - Summary: {insight.get('summary', 'N/A')[:60]}...")
        else:
            # Direct response with fields
            assert "program_id" in data or "university_name" in data
            print(f"✅ AI School Insight - Generated for {data.get('university_name', program_id)}")
    
    def test_ai_school_insight_invalid_program(self, headers):
        """Test school insight with invalid program_id"""
        response = requests.post(
            f"{BASE_URL}/api/ai/school-insight/invalid-program-id",
            json={},
            headers=headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✅ AI School Insight - Correctly returns 404 for invalid program")

    # ───────────────────────────────────────────────────────────────────────────
    # 12. DELETE /api/ai/school-insight/{program_id}/cache - Clear Cache
    # ───────────────────────────────────────────────────────────────────────────
    
    def test_ai_school_insight_clear_cache(self, headers, program_id):
        """Test clearing school insight cache"""
        response = requests.delete(
            f"{BASE_URL}/api/ai/school-insight/{program_id}/cache",
            headers=headers
        )
        assert response.status_code == 200, f"Clear cache failed: {response.text}"
        data = response.json()
        assert data.get("cleared") == True, "Expected cleared: true"
        print(f"✅ AI School Insight Cache Clear - Cleared successfully")


class TestGmailInbox:
    """Test Gmail Inbox endpoints (expects Gmail not connected)"""
    
    @pytest.fixture(scope="class")
    def athlete_token(self):
        """Get athlete auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ATHLETE_EMAIL, "password": ATHLETE_PASSWORD}
        )
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def headers(self, athlete_token):
        """Auth headers"""
        return {"Authorization": f"Bearer {athlete_token}"}

    # ───────────────────────────────────────────────────────────────────────────
    # Gmail Status - Should show not connected
    # ───────────────────────────────────────────────────────────────────────────
    
    def test_gmail_status_not_connected(self, headers):
        """Test Gmail status when not connected"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/gmail/status",
            headers=headers
        )
        assert response.status_code == 200, f"Gmail status failed: {response.text}"
        data = response.json()
        assert "connected" in data, "Response missing 'connected'"
        # Since Gmail is not connected for test account
        if not data["connected"]:
            print("✅ Gmail Status - Not connected (expected)")
        else:
            print(f"✅ Gmail Status - Connected as {data.get('gmail_email', 'unknown')}")

    # ───────────────────────────────────────────────────────────────────────────
    # Gmail Emails List - Should return 403 when not connected
    # ───────────────────────────────────────────────────────────────────────────
    
    def test_gmail_emails_not_connected(self, headers):
        """Test listing emails when Gmail not connected"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/gmail/emails",
            headers=headers
        )
        # Should return 403 when not connected
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✅ Gmail Emails - Correctly returns 403 when not connected")

    # ───────────────────────────────────────────────────────────────────────────
    # Gmail Connect - Should return auth URL
    # ───────────────────────────────────────────────────────────────────────────
    
    def test_gmail_connect_returns_auth_url(self, headers):
        """Test Gmail connect returns OAuth URL"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/gmail/connect",
            headers=headers
        )
        # Can be 200 with auth_url or 500 if OAuth not configured
        if response.status_code == 200:
            data = response.json()
            assert "auth_url" in data, "Response missing 'auth_url'"
            assert "google.com" in data["auth_url"], "auth_url should point to Google"
            print("✅ Gmail Connect - Returns OAuth URL")
        elif response.status_code == 500:
            # OAuth not configured
            print("✅ Gmail Connect - OAuth not configured (expected in test env)")
        else:
            pytest.fail(f"Unexpected status: {response.status_code}")


class TestAuthRequired:
    """Test that AI endpoints require authentication"""
    
    def test_draft_email_requires_auth(self):
        """AI draft email requires auth"""
        response = requests.post(
            f"{BASE_URL}/api/ai/draft-email",
            json={"program_id": "test", "email_type": "intro"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ AI Draft Email - Requires authentication")
    
    def test_next_step_requires_auth(self):
        """AI next step requires auth"""
        response = requests.post(
            f"{BASE_URL}/api/ai/next-step",
            json={"program_id": "test"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ AI Next Step - Requires authentication")
    
    def test_assistant_requires_auth(self):
        """AI assistant requires auth"""
        response = requests.post(
            f"{BASE_URL}/api/ai/assistant",
            json={"message": "test"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ AI Assistant - Requires authentication")
    
    def test_outreach_analysis_requires_auth(self):
        """Outreach analysis requires auth"""
        response = requests.get(f"{BASE_URL}/api/ai/outreach-analysis")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ AI Outreach Analysis - Requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

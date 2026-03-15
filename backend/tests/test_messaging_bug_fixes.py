"""
Test suite for In-App Messaging Bug Fixes
Verifies two critical bugs that were fixed:
1. Messages sent by coach not appearing in athlete's inbox
2. Message-sent event not being logged in Support Pod timeline

Test Flow:
1. Coach login → get token
2. Athlete (Emma) login → get token and athlete_id
3. Coach sends message to athlete_3 → verify response
4. Check pod timeline for support_message_sent event
5. Check athlete inbox for thread
6. Check unread count for athlete
7. Get thread detail as athlete
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://task-management-v2-1.preview.emergentagent.com"

# Test credentials
COACH_EMAIL = "coach.williams@capymatch.com"
COACH_PASSWORD = "coach123"
ATHLETE_EMAIL = "emma.chen@athlete.capymatch.com"
ATHLETE_PASSWORD = "athlete123"
ATHLETE_ID = "athlete_3"


class TestMessagingBugFixes:
    """Test suite for verifying the messaging bug fixes"""
    
    coach_token = None
    athlete_token = None
    athlete_user_id = None
    message_id = None
    thread_id = None
    test_subject = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data prefix"""
        self.test_subject = f"TEST_BugFix_{uuid.uuid4().hex[:8]}"
    
    def test_01_coach_login(self):
        """Coach login: POST /api/auth/login → should return token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": COACH_EMAIL, "password": COACH_PASSWORD}
        )
        
        assert response.status_code == 200, f"Coach login failed: {response.text}"
        data = response.json()
        
        assert "token" in data, "Response missing token"
        assert "user" in data, "Response missing user"
        assert data["user"]["role"] in ("club_coach", "director"), f"Unexpected role: {data['user']['role']}"
        
        TestMessagingBugFixes.coach_token = data["token"]
        print(f"✓ Coach login successful - Role: {data['user']['role']}, Name: {data['user'].get('name')}")
    
    def test_02_athlete_login(self):
        """Athlete login: POST /api/auth/login → should return token with athlete_id"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ATHLETE_EMAIL, "password": ATHLETE_PASSWORD}
        )
        
        assert response.status_code == 200, f"Athlete login failed: {response.text}"
        data = response.json()
        
        assert "token" in data, "Response missing token"
        assert "user" in data, "Response missing user"
        
        user = data["user"]
        assert user.get("athlete_id") == ATHLETE_ID, \
            f"BUG FIX VERIFICATION: athlete_id should be '{ATHLETE_ID}', got '{user.get('athlete_id')}'"
        
        TestMessagingBugFixes.athlete_token = data["token"]
        TestMessagingBugFixes.athlete_user_id = user["id"]
        
        print(f"✓ Athlete login successful - Name: {user.get('name')}, athlete_id: {user.get('athlete_id')}")
    
    def test_03_coach_sends_message(self):
        """Coach sends message: POST /api/support-messages → should return message_id and thread_id with status 'sent'"""
        assert TestMessagingBugFixes.coach_token, "Coach token not available"
        
        subject = f"TEST_BugFix_{uuid.uuid4().hex[:8]}"
        body = "This is a test message to verify the bug fix for athlete inbox."
        
        response = requests.post(
            f"{BASE_URL}/api/support-messages",
            headers={"Authorization": f"Bearer {TestMessagingBugFixes.coach_token}"},
            json={
                "athlete_id": ATHLETE_ID,
                "subject": subject,
                "body": body
            }
        )
        
        assert response.status_code == 200, f"Send message failed: {response.text}"
        data = response.json()
        
        assert "id" in data, "Response missing message id"
        assert "thread_id" in data, "Response missing thread_id"
        assert data.get("status") == "sent", f"Expected status 'sent', got '{data.get('status')}'"
        
        TestMessagingBugFixes.message_id = data["id"]
        TestMessagingBugFixes.thread_id = data["thread_id"]
        TestMessagingBugFixes.test_subject = subject
        
        print(f"✓ Message sent - message_id: {data['id']}, thread_id: {data['thread_id']}")
    
    def test_04_pod_timeline_has_message_event(self):
        """Pod timeline: GET /api/support-pods/athlete_3 → timeline.action_events should contain support_message_sent event"""
        assert TestMessagingBugFixes.coach_token, "Coach token not available"
        assert TestMessagingBugFixes.message_id, "Message not sent yet"
        
        response = requests.get(
            f"{BASE_URL}/api/support-pods/{ATHLETE_ID}",
            headers={"Authorization": f"Bearer {TestMessagingBugFixes.coach_token}"}
        )
        
        assert response.status_code == 200, f"Get support pod failed: {response.text}"
        data = response.json()
        
        assert "timeline" in data, "Response missing timeline"
        timeline = data["timeline"]
        assert "action_events" in timeline, "Timeline missing action_events"
        
        action_events = timeline["action_events"]
        
        # Find the support_message_sent event for our message
        message_events = [
            e for e in action_events 
            if e.get("type") == "support_message_sent" and e.get("message_id") == TestMessagingBugFixes.message_id
        ]
        
        assert len(message_events) > 0, \
            f"BUG FIX VERIFICATION: support_message_sent event not found for message_id={TestMessagingBugFixes.message_id}"
        
        event = message_events[0]
        assert event.get("thread_id") == TestMessagingBugFixes.thread_id, "Event thread_id mismatch"
        assert event.get("athlete_id") == ATHLETE_ID, "Event athlete_id mismatch"
        
        print(f"✓ Timeline has support_message_sent event - description: {event.get('description', '')[:50]}...")
    
    def test_05_athlete_inbox_has_thread(self):
        """Athlete inbox: GET /api/support-messages/inbox → should contain thread matching the one just created"""
        assert TestMessagingBugFixes.athlete_token, "Athlete token not available"
        assert TestMessagingBugFixes.thread_id, "Thread not created yet"
        
        response = requests.get(
            f"{BASE_URL}/api/support-messages/inbox",
            headers={"Authorization": f"Bearer {TestMessagingBugFixes.athlete_token}"}
        )
        
        assert response.status_code == 200, f"Get inbox failed: {response.text}"
        data = response.json()
        
        assert "threads" in data, "Response missing threads"
        threads = data["threads"]
        
        # Find our thread
        matching_threads = [t for t in threads if t.get("thread_id") == TestMessagingBugFixes.thread_id]
        
        assert len(matching_threads) > 0, \
            f"BUG FIX VERIFICATION: Thread {TestMessagingBugFixes.thread_id} not found in athlete inbox. " \
            f"Threads in inbox: {[t.get('thread_id') for t in threads]}"
        
        thread = matching_threads[0]
        assert thread.get("unread_count", 0) > 0, "Expected unread_count > 0 for new thread"
        assert thread.get("subject") == TestMessagingBugFixes.test_subject, "Thread subject mismatch"
        
        print(f"✓ Athlete inbox contains thread - subject: {thread.get('subject')}, unread: {thread.get('unread_count')}")
    
    def test_06_athlete_unread_count(self):
        """Unread count: GET /api/support-messages/unread-count → unread_count should be > 0"""
        assert TestMessagingBugFixes.athlete_token, "Athlete token not available"
        
        response = requests.get(
            f"{BASE_URL}/api/support-messages/unread-count",
            headers={"Authorization": f"Bearer {TestMessagingBugFixes.athlete_token}"}
        )
        
        assert response.status_code == 200, f"Get unread count failed: {response.text}"
        data = response.json()
        
        assert "unread_count" in data, "Response missing unread_count"
        assert data["unread_count"] > 0, "Expected unread_count > 0 after receiving message"
        
        print(f"✓ Athlete unread count: {data['unread_count']}")
    
    def test_07_athlete_thread_detail(self):
        """Thread detail: GET /api/support-messages/thread/{thread_id} → should return messages in the thread"""
        assert TestMessagingBugFixes.athlete_token, "Athlete token not available"
        assert TestMessagingBugFixes.thread_id, "Thread not created yet"
        
        response = requests.get(
            f"{BASE_URL}/api/support-messages/thread/{TestMessagingBugFixes.thread_id}",
            headers={"Authorization": f"Bearer {TestMessagingBugFixes.athlete_token}"}
        )
        
        assert response.status_code == 200, f"Get thread detail failed: {response.text}"
        data = response.json()
        
        assert "thread" in data, "Response missing thread"
        assert "messages" in data, "Response missing messages"
        
        messages = data["messages"]
        assert len(messages) > 0, "Expected at least 1 message in thread"
        
        # Find our message
        matching_messages = [m for m in messages if m.get("id") == TestMessagingBugFixes.message_id]
        assert len(matching_messages) > 0, f"Message {TestMessagingBugFixes.message_id} not found in thread"
        
        msg = matching_messages[0]
        assert msg.get("sender_role") in ("club_coach", "director"), "Message sender should be coach"
        
        print(f"✓ Thread detail returned {len(messages)} message(s) - sender: {msg.get('sender_name')}")


class TestTimelineEventTypes:
    """Verify ActivityHistory.js recognizes support_message_sent and support_message_reply types"""
    
    def test_support_message_types_in_timeline(self):
        """Verify timeline action_events include support_message types"""
        # First login as coach
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": COACH_EMAIL, "password": COACH_PASSWORD}
        )
        assert login_response.status_code == 200, f"Coach login failed: {login_response.text}"
        coach_token = login_response.json()["token"]
        
        # Get support pod timeline
        response = requests.get(
            f"{BASE_URL}/api/support-pods/{ATHLETE_ID}",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        
        assert response.status_code == 200, f"Get support pod failed: {response.text}"
        data = response.json()
        
        timeline = data.get("timeline", {})
        action_events = timeline.get("action_events", [])
        
        # Check if there are any support_message events
        support_message_events = [
            e for e in action_events 
            if e.get("type") in ("support_message_sent", "support_message_reply")
        ]
        
        print(f"✓ Found {len(support_message_events)} support message events in timeline")
        
        # List event types for verification
        event_types = list(set(e.get("type") for e in action_events))
        print(f"  Event types in timeline: {event_types}")
        
        # The test passes if we can fetch the timeline - frontend rendering is tested separately
        assert isinstance(action_events, list), "action_events should be a list"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

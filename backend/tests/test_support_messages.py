"""
Support Messages API Tests
Tests in-app messaging system for coach-athlete/pod communication.

Features tested:
1. POST /api/support-messages - Send new message / create thread
2. GET /api/support-messages/inbox - Get all threads with unread counts
3. GET /api/support-messages/thread/{thread_id} - Get thread messages + mark as read
4. POST /api/support-messages/{thread_id}/reply - Reply to thread
5. GET /api/support-messages/unread-count - Get unread count for badge
6. Timeline logging - support_message_sent events
7. Idempotency - sending to same thread_id adds to thread
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
ATHLETE_ID = "athlete_3"
COACH_EMAIL = "coach.williams@capymatch.com"
COACH_PASSWORD = "coach123"


class TestSupportMessagesAPI:
    """Tests for Support Messages endpoints"""

    @pytest.fixture(autouse=True)
    def setup(self, request):
        """Setup test session with auth"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as coach
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": COACH_EMAIL,
            "password": COACH_PASSWORD
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        self.token = login_resp.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        # Store test thread IDs for cleanup
        self.test_threads = []
        yield
        
        # Cleanup: We don't delete threads as they're logged in timeline
        # but we mark test data with TEST_ prefix for identification

    def test_01_send_message_creates_thread(self):
        """POST /api/support-messages creates new thread with message"""
        unique_subject = f"TEST_Message_{uuid.uuid4().hex[:8]}"
        
        response = self.session.post(f"{BASE_URL}/api/support-messages", json={
            "athlete_id": ATHLETE_ID,
            "subject": unique_subject,
            "body": "Automated test message for Support Messages feature",
            "recipient_ids": [ATHLETE_ID]
        })
        
        assert response.status_code == 200, f"Send message failed: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "id" in data, "Response missing message id"
        assert "thread_id" in data, "Response missing thread_id"
        assert "status" in data, "Response missing status"
        assert "recipients" in data, "Response missing recipients"
        
        # Validate values
        assert data["status"] == "sent"
        assert len(data["recipients"]) > 0
        assert data["recipients"][0]["id"] == ATHLETE_ID
        
        # Store for later tests
        self.test_thread_id = data["thread_id"]
        self.test_threads.append(data["thread_id"])
        print(f"✓ Created thread: {data['thread_id']}")

    def test_02_get_inbox_returns_threads(self):
        """GET /api/support-messages/inbox returns thread list with unread counts"""
        response = self.session.get(f"{BASE_URL}/api/support-messages/inbox")
        
        assert response.status_code == 200, f"Get inbox failed: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "threads" in data, "Response missing threads"
        assert "total_unread" in data, "Response missing total_unread"
        assert isinstance(data["threads"], list)
        assert isinstance(data["total_unread"], int)
        
        # Validate thread structure if threads exist
        if len(data["threads"]) > 0:
            thread = data["threads"][0]
            assert "thread_id" in thread
            assert "subject" in thread
            assert "last_message_at" in thread
            assert "last_sender_name" in thread
            assert "last_snippet" in thread
            assert "unread_count" in thread
            assert "participant_ids" in thread
            print(f"✓ Inbox has {len(data['threads'])} threads, {data['total_unread']} unread")
        else:
            print("✓ Inbox is empty (no threads)")

    def test_03_get_unread_count(self):
        """GET /api/support-messages/unread-count returns count for badge"""
        response = self.session.get(f"{BASE_URL}/api/support-messages/unread-count")
        
        assert response.status_code == 200, f"Get unread count failed: {response.text}"
        data = response.json()
        
        assert "unread_count" in data, "Response missing unread_count"
        assert isinstance(data["unread_count"], int)
        assert data["unread_count"] >= 0
        print(f"✓ Unread count: {data['unread_count']}")

    def test_04_get_thread_messages(self):
        """GET /api/support-messages/thread/{thread_id} returns messages in thread"""
        # First create a thread to test
        unique_subject = f"TEST_Thread_View_{uuid.uuid4().hex[:8]}"
        create_resp = self.session.post(f"{BASE_URL}/api/support-messages", json={
            "athlete_id": ATHLETE_ID,
            "subject": unique_subject,
            "body": "Test message for thread view",
            "recipient_ids": [ATHLETE_ID]
        })
        assert create_resp.status_code == 200
        thread_id = create_resp.json()["thread_id"]
        self.test_threads.append(thread_id)
        
        # Get thread messages
        response = self.session.get(f"{BASE_URL}/api/support-messages/thread/{thread_id}")
        
        assert response.status_code == 200, f"Get thread failed: {response.text}"
        data = response.json()
        
        # Validate structure
        assert "thread" in data, "Response missing thread"
        assert "messages" in data, "Response missing messages"
        
        # Validate thread metadata
        thread = data["thread"]
        assert thread["thread_id"] == thread_id
        assert thread["subject"] == unique_subject
        assert "participant_ids" in thread
        
        # Validate messages
        messages = data["messages"]
        assert len(messages) >= 1, "Thread should have at least 1 message"
        msg = messages[0]
        assert "id" in msg
        assert "sender_id" in msg
        assert "sender_name" in msg
        assert "body" in msg
        assert "created_at" in msg
        print(f"✓ Thread {thread_id} has {len(messages)} message(s)")

    def test_05_reply_to_thread(self):
        """POST /api/support-messages/{thread_id}/reply adds message to thread"""
        # First create a thread
        unique_subject = f"TEST_Reply_{uuid.uuid4().hex[:8]}"
        create_resp = self.session.post(f"{BASE_URL}/api/support-messages", json={
            "athlete_id": ATHLETE_ID,
            "subject": unique_subject,
            "body": "Original message",
            "recipient_ids": [ATHLETE_ID]
        })
        assert create_resp.status_code == 200
        thread_id = create_resp.json()["thread_id"]
        self.test_threads.append(thread_id)
        
        # Reply to thread
        reply_resp = self.session.post(f"{BASE_URL}/api/support-messages/{thread_id}/reply", json={
            "body": "This is a test reply"
        })
        
        assert reply_resp.status_code == 200, f"Reply failed: {reply_resp.text}"
        reply_data = reply_resp.json()
        
        assert "id" in reply_data
        assert reply_data["thread_id"] == thread_id
        assert reply_data["status"] == "sent"
        
        # Verify thread now has 2 messages
        thread_resp = self.session.get(f"{BASE_URL}/api/support-messages/thread/{thread_id}")
        assert thread_resp.status_code == 200
        thread_data = thread_resp.json()
        
        assert len(thread_data["messages"]) == 2, "Thread should have 2 messages after reply"
        assert thread_data["thread"]["message_count"] == 2
        print(f"✓ Reply added to thread, now has {len(thread_data['messages'])} messages")

    def test_06_timeline_logging(self):
        """Sending message creates support_message_sent event in pod timeline"""
        unique_subject = f"TEST_Timeline_{uuid.uuid4().hex[:8]}"
        
        # Send message
        send_resp = self.session.post(f"{BASE_URL}/api/support-messages", json={
            "athlete_id": ATHLETE_ID,
            "subject": unique_subject,
            "body": "Test message for timeline logging",
            "recipient_ids": [ATHLETE_ID]
        })
        assert send_resp.status_code == 200
        thread_id = send_resp.json()["thread_id"]
        self.test_threads.append(thread_id)
        
        # Check pod timeline for support_message_sent event
        pod_resp = self.session.get(f"{BASE_URL}/api/support-pods/{ATHLETE_ID}")
        assert pod_resp.status_code == 200
        pod_data = pod_resp.json()
        
        action_events = pod_data.get("timeline", {}).get("action_events", [])
        support_msg_events = [e for e in action_events if e.get("type") == "support_message_sent"]
        
        # Find our event
        our_event = next((e for e in support_msg_events if e.get("thread_id") == thread_id), None)
        
        assert our_event is not None, f"support_message_sent event not found for thread {thread_id}"
        assert unique_subject in our_event.get("description", "")
        assert our_event.get("actor") == "Coach Williams"
        print(f"✓ Timeline event logged: {our_event['description'][:50]}...")

    def test_07_idempotency_same_thread(self):
        """Sending message with existing thread_id adds to that thread"""
        unique_subject = f"TEST_Idem_{uuid.uuid4().hex[:8]}"
        
        # Create first message
        resp1 = self.session.post(f"{BASE_URL}/api/support-messages", json={
            "athlete_id": ATHLETE_ID,
            "subject": unique_subject,
            "body": "First message",
            "recipient_ids": [ATHLETE_ID]
        })
        assert resp1.status_code == 200
        thread_id = resp1.json()["thread_id"]
        self.test_threads.append(thread_id)
        
        # Send second message to same thread
        resp2 = self.session.post(f"{BASE_URL}/api/support-messages", json={
            "athlete_id": ATHLETE_ID,
            "subject": "Different Subject",  # Subject will be updated
            "body": "Second message to same thread",
            "recipient_ids": [ATHLETE_ID],
            "thread_id": thread_id  # Key: use existing thread_id
        })
        assert resp2.status_code == 200
        
        # Verify same thread_id returned
        assert resp2.json()["thread_id"] == thread_id, "Should use same thread_id"
        
        # Verify thread now has 2 messages
        thread_resp = self.session.get(f"{BASE_URL}/api/support-messages/thread/{thread_id}")
        assert thread_resp.status_code == 200
        thread_data = thread_resp.json()
        
        assert len(thread_data["messages"]) == 2, "Thread should have 2 messages"
        print(f"✓ Idempotency confirmed: thread has {len(thread_data['messages'])} messages")

    def test_08_thread_not_found(self):
        """GET /api/support-messages/thread/{invalid_id} returns 404"""
        fake_thread_id = str(uuid.uuid4())
        
        response = self.session.get(f"{BASE_URL}/api/support-messages/thread/{fake_thread_id}")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Thread not found returns 404")

    def test_09_reply_marks_messages_read(self):
        """GET thread marks all messages as read by current user"""
        unique_subject = f"TEST_ReadMark_{uuid.uuid4().hex[:8]}"
        
        # Create thread
        resp = self.session.post(f"{BASE_URL}/api/support-messages", json={
            "athlete_id": ATHLETE_ID,
            "subject": unique_subject,
            "body": "Test read marking",
            "recipient_ids": [ATHLETE_ID]
        })
        assert resp.status_code == 200
        thread_id = resp.json()["thread_id"]
        self.test_threads.append(thread_id)
        
        # Get thread (should mark as read)
        thread_resp = self.session.get(f"{BASE_URL}/api/support-messages/thread/{thread_id}")
        assert thread_resp.status_code == 200
        
        messages = thread_resp.json()["messages"]
        for msg in messages:
            assert "coach-williams" in msg.get("read_by", []), "Message should be read by coach"
        print("✓ Messages marked as read when viewed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

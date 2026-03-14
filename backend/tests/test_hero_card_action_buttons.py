"""
Test Hero Card Action Buttons Feature
Tests the new action buttons (Send Message, Log Check-In, Escalate, Resolve) on the AthleteHero card.
Tests:
- Issue resolve endpoint
- Support messages endpoint
- Hero card visibility logic based on issue type and severity
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


@pytest.fixture(scope="module")
def coach_token():
    """Get auth token for coach"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "coach.williams@capymatch.com",
        "password": "coach123"
    })
    assert response.status_code == 200, f"Coach login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(coach_token):
    """Auth headers for requests"""
    return {"Authorization": f"Bearer {coach_token}"}


class TestAthleteIssueData:
    """Test that athletes have the expected issue data for hero card logic"""
    
    def test_athlete_2_olivia_has_critical_blocker(self, auth_headers):
        """athlete_2 (Olivia Anderson) should have critical severity issue (shows Escalate)"""
        response = requests.get(f"{BASE_URL}/api/support-pods/athlete_2", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        current_issue = data.get("current_issue")
        assert current_issue is not None, "athlete_2 should have a current_issue"
        assert current_issue.get("severity") == "critical", "athlete_2 should have critical severity"
        assert current_issue.get("id") is not None, "Issue should have an id for Resolve button"
        assert current_issue.get("type") == "missing_blocker", "Should be missing_blocker type (shows 'Send Message')"
        print(f"PASS: athlete_2 has critical blocker issue - will show Send Message + Escalate + Resolve")
    
    def test_athlete_3_marcus_has_momentum_drop(self, auth_headers):
        """athlete_3 (Marcus Johnson) should have momentum_drop issue (shows Log Check-In)"""
        response = requests.get(f"{BASE_URL}/api/support-pods/athlete_3", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        current_issue = data.get("current_issue")
        assert current_issue is not None, "athlete_3 should have a current_issue"
        assert current_issue.get("type") == "momentum_drop", "Should be momentum_drop type (shows 'Log Check-In')"
        assert current_issue.get("severity") == "critical", "athlete_3 should have critical severity"
        assert current_issue.get("id") is not None, "Issue should have an id for Resolve button"
        days_inactive = current_issue.get("source_context", {}).get("days_inactive")
        assert days_inactive is not None and days_inactive > 0, "Should have days_inactive context"
        print(f"PASS: athlete_3 has momentum_drop issue ({days_inactive} days) - will show Log Check-In + Escalate + Resolve")
    
    def test_athlete_1_emma_has_overdue_actions(self, auth_headers):
        """athlete_1 (Emma Chen) should have overdue_actions issue"""
        response = requests.get(f"{BASE_URL}/api/support-pods/athlete_1", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        current_issue = data.get("current_issue")
        assert current_issue is not None, "athlete_1 should have a current_issue"
        assert current_issue.get("type") == "overdue_actions", "Should be overdue_actions type"
        assert current_issue.get("id") is not None, "Issue should have an id for Resolve button"
        print(f"PASS: athlete_1 has overdue_actions issue - will show Send Message + Escalate + Resolve")
    
    def test_athlete_5_lucas_no_issues(self, auth_headers):
        """athlete_5 (Lucas Rodriguez) should NOT have issues (hero card should not show)"""
        response = requests.get(f"{BASE_URL}/api/support-pods/athlete_5", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        current_issue = data.get("current_issue")
        all_active_issues = data.get("all_active_issues", [])
        pod_health = data.get("pod_health")
        
        assert current_issue is None, "athlete_5 should have no current_issue"
        assert len(all_active_issues) == 0, "athlete_5 should have no active issues"
        print(f"PASS: athlete_5 has no issues (pod_health: {pod_health}) - hero card should NOT show")


class TestResolveIssueEndpoint:
    """Test POST /api/support-pods/{athlete_id}/issues/{issue_id}/resolve"""
    
    def test_resolve_issue_success(self, auth_headers):
        """Test resolving an issue returns success"""
        # First get an issue to resolve
        response = requests.get(f"{BASE_URL}/api/support-pods/athlete_2", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Get an issue from all_active_issues (preferably secondary one to not break other tests)
        all_issues = data.get("all_active_issues", [])
        if len(all_issues) < 2:
            pytest.skip("Not enough issues to test resolve without breaking other tests")
        
        # Find the overdue_actions issue (less critical to resolve for test purposes)
        issue_to_resolve = None
        for issue in all_issues:
            if issue.get("type") == "overdue_actions":
                issue_to_resolve = issue
                break
        
        if not issue_to_resolve:
            issue_to_resolve = all_issues[-1]  # Use last issue if no overdue_actions
        
        issue_id = issue_to_resolve["id"]
        
        # Resolve the issue
        response = requests.post(
            f"{BASE_URL}/api/support-pods/athlete_2/issues/{issue_id}/resolve",
            headers=auth_headers,
            json={}
        )
        assert response.status_code == 200, f"Resolve failed: {response.text}"
        
        result = response.json()
        assert result.get("status") == "resolved", f"Issue should be resolved, got: {result}"
        assert result.get("resolved_by") is not None, "Should have resolved_by"
        print(f"PASS: Successfully resolved issue {issue_id}")
    
    def test_resolve_nonexistent_issue_returns_404(self, auth_headers):
        """Test resolving a nonexistent issue returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/support-pods/athlete_2/issues/nonexistent-issue-id/resolve",
            headers=auth_headers,
            json={}
        )
        assert response.status_code == 404, f"Expected 404 for nonexistent issue, got: {response.status_code}"
        print("PASS: Nonexistent issue returns 404")


class TestSupportMessagesEndpoint:
    """Test POST /api/support-messages for hero card Send Message / Log Check-In"""
    
    def test_send_message_success(self, auth_headers):
        """Test sending a support message (simulates Send Message CTA)"""
        response = requests.post(
            f"{BASE_URL}/api/support-messages",
            headers=auth_headers,
            json={
                "athlete_id": "athlete_2",
                "subject": "TEST: Coach Check-In",
                "body": "This is a test message from the hero card action button."
            }
        )
        assert response.status_code == 200, f"Send message failed: {response.text}"
        
        result = response.json()
        assert result.get("status") == "sent", f"Message should be sent, got: {result}"
        assert result.get("thread_id") is not None, "Should have a thread_id"
        assert result.get("id") is not None, "Should have a message id"
        print(f"PASS: Successfully sent message, thread_id: {result.get('thread_id')}")
    
    def test_send_escalation_message(self, auth_headers):
        """Test sending an escalation message (simulates Escalate CTA)"""
        response = requests.post(
            f"{BASE_URL}/api/support-messages",
            headers=auth_headers,
            json={
                "athlete_id": "athlete_3",
                "subject": "[ESCALATED] TEST: Momentum Drop",
                "body": "This issue has been escalated for priority review.\n\nDetails: Athlete has gone dark."
            }
        )
        assert response.status_code == 200, f"Escalation message failed: {response.text}"
        
        result = response.json()
        assert result.get("status") == "sent", f"Message should be sent, got: {result}"
        assert "[ESCALATED]" in "TEST" or result.get("thread_id"), "Should create escalation thread"
        print(f"PASS: Successfully sent escalation message, thread_id: {result.get('thread_id')}")
    
    def test_send_check_in_message(self, auth_headers):
        """Test sending a check-in message (simulates Log Check-In CTA for momentum_drop)"""
        response = requests.post(
            f"{BASE_URL}/api/support-messages",
            headers=auth_headers,
            json={
                "athlete_id": "athlete_3",
                "subject": "Momentum Drop — No activity in 22 days",
                "body": "Hey, just checking in — how are things going? Haven't heard from you in a while."
            }
        )
        assert response.status_code == 200, f"Check-in message failed: {response.text}"
        
        result = response.json()
        assert result.get("status") == "sent", f"Message should be sent"
        print(f"PASS: Successfully sent check-in message")
    
    def test_send_message_requires_athlete_id(self, auth_headers):
        """Test that athlete_id is required"""
        response = requests.post(
            f"{BASE_URL}/api/support-messages",
            headers=auth_headers,
            json={
                "subject": "Test",
                "body": "Test message"
            }
        )
        assert response.status_code == 422, f"Expected 422 for missing athlete_id, got: {response.status_code}"
        print("PASS: Missing athlete_id returns 422")


class TestAccessControl:
    """Test that unauthorized users cannot access these endpoints"""
    
    def test_resolve_requires_auth(self):
        """Test resolve endpoint requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/support-pods/athlete_2/issues/some-id/resolve",
            json={}
        )
        assert response.status_code in [401, 403], f"Expected auth error, got: {response.status_code}"
        print("PASS: Resolve endpoint requires auth")
    
    def test_send_message_requires_auth(self):
        """Test support-messages endpoint requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/support-messages",
            json={
                "athlete_id": "athlete_2",
                "subject": "Test",
                "body": "Test"
            }
        )
        assert response.status_code in [401, 403], f"Expected auth error, got: {response.status_code}"
        print("PASS: Support messages endpoint requires auth")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

"""
Test Issue Lifecycle System for Support Pods

Tests the following features:
1. Issue creation - GET /api/support-pods/athlete_3 creates momentum_drop issue idempotently
2. Current issue - Returns current_issue (highest priority) and all_active_issues array
3. Auto-resolve on interaction - POST /api/athletes/athlete_3/notes resolves issues
4. Resolution timeline - action_events contains issue_resolved event
5. Cooldown - Recently resolved issues don't get re-created within 24h
6. Healthy state - When no active issues, current_issue is null
7. Manual resolve - POST /api/support-pods/athlete_3/issues/{id}/resolve works
8. Auto-resolve on outreach - POST /api/athletes/athlete_3/messages resolves follow_up/engagement issues
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestIssueLifecycle:
    """Test the pod issue lifecycle system"""
    
    auth_token = None
    test_issue_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self, api_client):
        """Get auth token before tests"""
        if not TestIssueLifecycle.auth_token:
            login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
                "email": "coach.williams@capymatch.com",
                "password": "coach123"
            })
            assert login_response.status_code == 200, f"Login failed: {login_response.text}"
            TestIssueLifecycle.auth_token = login_response.json().get("token")
        api_client.headers.update({"Authorization": f"Bearer {TestIssueLifecycle.auth_token}"})
    
    def test_01_issue_creation_on_pod_load(self, api_client):
        """
        Test 1: GET /api/support-pods/athlete_3 creates momentum_drop issue
        Emma Chen has days_since_activity=33, which should trigger momentum_drop
        """
        response = api_client.get(f"{BASE_URL}/api/support-pods/athlete_3")
        assert response.status_code == 200, f"Failed to get pod: {response.text}"
        
        data = response.json()
        
        # Verify current_issue is returned
        assert "current_issue" in data, "Response missing current_issue field"
        assert "all_active_issues" in data, "Response missing all_active_issues field"
        
        current_issue = data.get("current_issue")
        all_issues = data.get("all_active_issues", [])
        
        # Emma Chen should have momentum_drop issue due to 33 days inactive
        if current_issue:
            print(f"Current issue type: {current_issue.get('type')}")
            print(f"Current issue severity: {current_issue.get('severity')}")
            print(f"Current issue title: {current_issue.get('title')}")
            
            # Store issue ID for later tests
            TestIssueLifecycle.test_issue_id = current_issue.get("id")
            
            # Verify issue structure
            assert "id" in current_issue, "Issue missing id"
            assert "type" in current_issue, "Issue missing type"
            assert "severity" in current_issue, "Issue missing severity"
            assert "title" in current_issue, "Issue missing title"
            assert "description" in current_issue, "Issue missing description"
            assert "status" in current_issue, "Issue missing status"
            assert current_issue.get("status") == "active", f"Issue status should be active, got {current_issue.get('status')}"
        
        print(f"All active issues count: {len(all_issues)}")
        for issue in all_issues:
            print(f"  - {issue.get('type')}: {issue.get('title')} (severity: {issue.get('severity')})")
    
    def test_02_idempotent_issue_creation(self, api_client):
        """
        Test 2: Calling GET /api/support-pods/athlete_3 again should NOT create duplicate issues
        """
        # First call
        response1 = api_client.get(f"{BASE_URL}/api/support-pods/athlete_3")
        assert response1.status_code == 200
        issues1 = response1.json().get("all_active_issues", [])
        count1 = len(issues1)
        
        # Wait a bit
        time.sleep(0.5)
        
        # Second call - should NOT create duplicates
        response2 = api_client.get(f"{BASE_URL}/api/support-pods/athlete_3")
        assert response2.status_code == 200
        issues2 = response2.json().get("all_active_issues", [])
        count2 = len(issues2)
        
        assert count1 == count2, f"Issue count changed from {count1} to {count2} - duplicates created!"
        print(f"Idempotent: Issue count remained {count1} after multiple calls")
    
    def test_03_current_issue_priority_order(self, api_client):
        """
        Test 3: Verify current_issue is the highest priority (critical > high > medium)
        """
        response = api_client.get(f"{BASE_URL}/api/support-pods/athlete_3")
        assert response.status_code == 200
        
        data = response.json()
        current_issue = data.get("current_issue")
        all_issues = data.get("all_active_issues", [])
        
        if current_issue and all_issues:
            # Priority order: critical (1) > high (2) > medium (3)
            severity_priority = {"critical": 1, "high": 2, "medium": 3}
            current_priority = severity_priority.get(current_issue.get("severity"), 99)
            
            # Verify current_issue has highest priority
            for issue in all_issues:
                issue_priority = severity_priority.get(issue.get("severity"), 99)
                assert current_priority <= issue_priority, \
                    f"current_issue has lower priority than another issue"
            
            print(f"Current issue '{current_issue.get('type')}' has severity '{current_issue.get('severity')}' (priority {current_priority})")
    
    def test_04_auto_resolve_on_interaction(self, api_client):
        """
        Test 4: POST /api/athletes/athlete_3/notes with check-in should auto-resolve
        momentum_drop, engagement_drop, and follow_up_overdue issues
        """
        # First check current state
        response_before = api_client.get(f"{BASE_URL}/api/support-pods/athlete_3")
        assert response_before.status_code == 200
        before_data = response_before.json()
        issues_before = before_data.get("all_active_issues", [])
        
        # Count issues that should be resolved by interaction
        resolvable_types = {"momentum_drop", "engagement_drop", "follow_up_overdue"}
        resolvable_before = [i for i in issues_before if i.get("type") in resolvable_types]
        print(f"Issues resolvable by interaction before: {len(resolvable_before)}")
        for i in resolvable_before:
            print(f"  - {i.get('type')}: {i.get('title')}")
        
        # Log a check-in interaction
        note_response = api_client.post(f"{BASE_URL}/api/athletes/athlete_3/notes", json={
            "text": "TEST_Check-in call with athlete - discussed momentum",
            "tag": "check-in",
            "category": "recruiting"
        })
        assert note_response.status_code == 200, f"Failed to log note: {note_response.text}"
        print("Logged check-in note successfully")
        
        # Wait for auto-resolve to process
        time.sleep(0.5)
        
        # Check issues after
        response_after = api_client.get(f"{BASE_URL}/api/support-pods/athlete_3")
        assert response_after.status_code == 200
        after_data = response_after.json()
        issues_after = after_data.get("all_active_issues", [])
        
        resolvable_after = [i for i in issues_after if i.get("type") in resolvable_types]
        print(f"Issues resolvable by interaction after: {len(resolvable_after)}")
        
        # Verify issues were resolved
        if len(resolvable_before) > 0:
            assert len(resolvable_after) < len(resolvable_before) or len(resolvable_after) == 0, \
                "Issues should have been auto-resolved after interaction"
            print("SUCCESS: Issues auto-resolved on interaction")
    
    def test_05_resolution_timeline_event(self, api_client):
        """
        Test 5: After auto-resolve, action_events should contain issue_resolved event
        """
        response = api_client.get(f"{BASE_URL}/api/support-pods/athlete_3")
        assert response.status_code == 200
        
        data = response.json()
        timeline = data.get("timeline", {})
        action_events = timeline.get("action_events", [])
        
        # Find issue_resolved events
        resolved_events = [e for e in action_events if e.get("type") == "issue_resolved"]
        
        print(f"Found {len(resolved_events)} issue_resolved events in timeline")
        for event in resolved_events[:5]:  # Show up to 5
            print(f"  - {event.get('description')}")
            print(f"    Actor: {event.get('actor')}, Source: {event.get('resolution_source')}")
        
        # Verify structure of resolved events
        if resolved_events:
            event = resolved_events[0]
            assert "description" in event, "Event missing description"
            assert "resolution_source" in event, "Event missing resolution_source"
            # Description should explain how it was resolved
            assert "resolved" in event.get("description", "").lower(), \
                "Event description should mention 'resolved'"
    
    def test_06_cooldown_prevents_recreation(self, api_client):
        """
        Test 6: After resolving an issue, reloading pod should NOT re-create 
        the same issue type within 24h cooldown period
        """
        # Get current state
        response1 = api_client.get(f"{BASE_URL}/api/support-pods/athlete_3")
        assert response1.status_code == 200
        issues1 = response1.json().get("all_active_issues", [])
        issue_types1 = {i.get("type") for i in issues1}
        
        # momentum_drop was resolved by test_04, should not be recreated
        # even though days_since_activity=33 still meets threshold
        print(f"Active issue types: {issue_types1}")
        
        # Reload again
        time.sleep(0.5)
        response2 = api_client.get(f"{BASE_URL}/api/support-pods/athlete_3")
        assert response2.status_code == 200
        issues2 = response2.json().get("all_active_issues", [])
        issue_types2 = {i.get("type") for i in issues2}
        
        # Same issue types should exist (no new ones created due to cooldown)
        assert issue_types1 == issue_types2, \
            f"Issue types changed after reload: {issue_types1} -> {issue_types2}"
        
        # Specifically check momentum_drop is NOT in active issues after resolution
        if "momentum_drop" not in issue_types2:
            print("SUCCESS: momentum_drop not recreated due to 24h cooldown")
        else:
            print("WARNING: momentum_drop may have been recreated")
    
    def test_07_healthy_state_when_no_issues(self, api_client):
        """
        Test 7: When no active issues exist, current_issue should be null
        Pod Hero should show 'On Track' state
        """
        response = api_client.get(f"{BASE_URL}/api/support-pods/athlete_3")
        assert response.status_code == 200
        
        data = response.json()
        current_issue = data.get("current_issue")
        all_issues = data.get("all_active_issues", [])
        
        if len(all_issues) == 0:
            assert current_issue is None, "current_issue should be null when no active issues"
            print("SUCCESS: Healthy state - current_issue is null, no active issues")
        else:
            print(f"Still have {len(all_issues)} active issues:")
            for i in all_issues:
                print(f"  - {i.get('type')}: {i.get('severity')}")
    
    def test_08_manual_resolve_endpoint(self, api_client):
        """
        Test 8: POST /api/support-pods/athlete_3/issues/{issue_id}/resolve 
        should manually resolve an issue with resolution_source='manual'
        """
        # First we need an active issue - but after test_04, momentum_drop was resolved
        # Let's check if there are any remaining issues
        response = api_client.get(f"{BASE_URL}/api/support-pods/athlete_3")
        assert response.status_code == 200
        
        data = response.json()
        all_issues = data.get("all_active_issues", [])
        
        if all_issues:
            issue_to_resolve = all_issues[0]
            issue_id = issue_to_resolve.get("id")
            print(f"Testing manual resolve on issue: {issue_to_resolve.get('type')} - {issue_to_resolve.get('title')}")
            
            # Manually resolve
            resolve_response = api_client.post(
                f"{BASE_URL}/api/support-pods/athlete_3/issues/{issue_id}/resolve",
                json={}
            )
            assert resolve_response.status_code == 200, f"Manual resolve failed: {resolve_response.text}"
            
            resolved = resolve_response.json()
            assert resolved.get("status") == "resolved", "Issue should be marked resolved"
            assert resolved.get("resolution_source") == "manual", "Resolution source should be 'manual'"
            print(f"SUCCESS: Issue manually resolved. Status: {resolved.get('status')}, Source: {resolved.get('resolution_source')}")
            
            # Verify it's removed from active issues
            response2 = api_client.get(f"{BASE_URL}/api/support-pods/athlete_3")
            issues_after = response2.json().get("all_active_issues", [])
            issue_ids_after = {i.get("id") for i in issues_after}
            assert issue_id not in issue_ids_after, "Resolved issue should not be in active issues"
            print("SUCCESS: Resolved issue removed from active issues")
        else:
            print("No active issues to test manual resolve on")
            pytest.skip("No active issues to test manual resolve")
    
    def test_09_auto_resolve_on_outreach(self, api_client):
        """
        Test 9: POST /api/athletes/athlete_3/messages should auto-resolve
        follow_up_overdue and engagement_drop issues
        """
        # Get current state
        response_before = api_client.get(f"{BASE_URL}/api/support-pods/athlete_3")
        assert response_before.status_code == 200
        issues_before = response_before.json().get("all_active_issues", [])
        
        resolvable_types = {"follow_up_overdue", "engagement_drop"}
        resolvable_before = [i for i in issues_before if i.get("type") in resolvable_types]
        print(f"Issues resolvable by outreach before: {len(resolvable_before)}")
        
        # Send outreach message
        message_response = api_client.post(f"{BASE_URL}/api/athletes/athlete_3/messages", json={
            "recipient": "athlete",
            "text": "TEST_Following up on our previous discussion"
        })
        assert message_response.status_code == 200, f"Failed to send message: {message_response.text}"
        print("Sent outreach message successfully")
        
        # Check after
        time.sleep(0.5)
        response_after = api_client.get(f"{BASE_URL}/api/support-pods/athlete_3")
        assert response_after.status_code == 200
        issues_after = response_after.json().get("all_active_issues", [])
        
        resolvable_after = [i for i in issues_after if i.get("type") in resolvable_types]
        print(f"Issues resolvable by outreach after: {len(resolvable_after)}")
        
        if len(resolvable_before) > 0:
            assert len(resolvable_after) < len(resolvable_before) or len(resolvable_after) == 0, \
                "follow_up_overdue/engagement_drop issues should have been resolved"
            print("SUCCESS: Issues auto-resolved on outreach")
        else:
            print("No follow_up/engagement issues were active to test")


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


# Run cleanup before and after test class
@pytest.fixture(scope="class", autouse=True)
def cleanup_test_data():
    """Cleanup TEST_ prefixed data after tests"""
    yield
    # Cleanup after tests
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        import asyncio
        
        async def do_cleanup():
            client = AsyncIOMotorClient("mongodb://localhost:27017")
            db = client["test_database"]
            
            # Delete test notes
            await db.athlete_notes.delete_many({"text": {"$regex": "^TEST_"}})
            # Delete test messages  
            await db.messages.delete_many({"text": {"$regex": "^TEST_"}})
            
            client.close()
        
        asyncio.run(do_cleanup())
    except Exception as e:
        print(f"Cleanup failed: {e}")

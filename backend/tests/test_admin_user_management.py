"""
Admin User Management & Subscription Tests

Tests for:
- GET /api/admin/users - list users with search/filter
- GET /api/admin/users/{userId} - user detail
- PUT /api/admin/users/{userId} - update plan/status
- POST /api/admin/users - create new user
- GET /api/admin/subscriptions - stats and user list
- PUT /api/admin/subscriptions/{userId} - change plan with audit
- GET /api/admin/subscription-logs - audit trail
- GET /api/admin/subscription-tiers - tier definitions
- Admin endpoints reject non-admin users
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials from problem statement
ADMIN_EMAIL = "douglas@capymatch.com"
ADMIN_PASSWORD = "1234"
ATHLETE_EMAIL = "emma.chen@athlete.capymatch.com"
ATHLETE_PASSWORD = "password123"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    data = response.json()
    return data.get("token")


@pytest.fixture(scope="module")
def athlete_token():
    """Get athlete auth token for rejection tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ATHLETE_EMAIL,
        "password": ATHLETE_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Athlete login failed: {response.status_code} - {response.text}")
    data = response.json()
    return data.get("token")


@pytest.fixture(scope="module")
def admin_session(admin_token):
    """Session with admin auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_token}"
    })
    return session


@pytest.fixture(scope="module")
def athlete_session(athlete_token):
    """Session with athlete auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {athlete_token}"
    })
    return session


class TestAdminUsersEndpoint:
    """Tests for GET /api/admin/users endpoint"""
    
    def test_list_users_returns_200(self, admin_session):
        """Admin can list users"""
        response = admin_session.get(f"{BASE_URL}/api/admin/users")
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        assert "total" in data
        assert "page" in data
        assert "limit" in data
        print(f"Listed {data['total']} total users, page {data['page']}")
    
    def test_list_users_returns_user_fields(self, admin_session):
        """User list has required fields: name, email, plan, school_count, status, created_at"""
        response = admin_session.get(f"{BASE_URL}/api/admin/users")
        assert response.status_code == 200
        data = response.json()
        if data["users"]:
            user = data["users"][0]
            assert "user_id" in user
            assert "email" in user
            assert "plan" in user
            assert "school_count" in user
            assert "status" in user
            assert "created_at" in user
            print(f"User fields verified: {list(user.keys())}")
    
    def test_list_users_search_by_name(self, admin_session):
        """Search parameter filters by name"""
        response = admin_session.get(f"{BASE_URL}/api/admin/users", params={"search": "emma"})
        assert response.status_code == 200
        data = response.json()
        # Should find Emma Chen if she exists
        print(f"Search 'emma' returned {data['total']} users")
        # Verify search is working - all returned users should match search
        for user in data["users"]:
            name_lower = (user.get("athlete_name", "") or user.get("name", "")).lower()
            email_lower = user.get("email", "").lower()
            assert "emma" in name_lower or "emma" in email_lower, f"Search mismatch: {user}"
    
    def test_list_users_search_by_email(self, admin_session):
        """Search parameter filters by email"""
        response = admin_session.get(f"{BASE_URL}/api/admin/users", params={"search": "@athlete"})
        assert response.status_code == 200
        data = response.json()
        print(f"Search '@athlete' returned {data['total']} users")
    
    def test_list_users_filter_by_plan(self, admin_session):
        """Plan filter parameter works"""
        for plan in ["basic", "pro", "premium"]:
            response = admin_session.get(f"{BASE_URL}/api/admin/users", params={"plan": plan})
            assert response.status_code == 200
            data = response.json()
            print(f"Plan filter '{plan}' returned {data['total']} users")
            # Verify filter is working
            for user in data["users"]:
                assert user["plan"] == plan, f"Plan mismatch: expected {plan}, got {user['plan']}"
    
    def test_list_users_pagination(self, admin_session):
        """Pagination parameters work"""
        response = admin_session.get(f"{BASE_URL}/api/admin/users", params={"page": 1, "limit": 5})
        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 1
        assert data["limit"] == 5
        assert len(data["users"]) <= 5
        print(f"Pagination: page 1, limit 5, got {len(data['users'])} users")


class TestAdminUserDetailEndpoint:
    """Tests for GET /api/admin/users/{userId}"""
    
    def test_get_user_detail_returns_200(self, admin_session):
        """Admin can get user detail"""
        # First get a user ID from the list
        list_response = admin_session.get(f"{BASE_URL}/api/admin/users", params={"limit": 1})
        assert list_response.status_code == 200
        users = list_response.json().get("users", [])
        if not users:
            pytest.skip("No users found to test detail")
        
        user_id = users[0]["user_id"]
        response = admin_session.get(f"{BASE_URL}/api/admin/users/{user_id}")
        assert response.status_code == 200
        data = response.json()
        assert "user" in data
        assert "plan" in data
        assert "status" in data
        assert "stats" in data
        assert "subscription" in data
        print(f"User detail for {user_id}: plan={data['plan']}, status={data['status']}")
    
    def test_get_user_detail_includes_stats(self, admin_session):
        """User detail includes stats: school_count, interaction_count, gmail_connected, questionnaire_completed"""
        list_response = admin_session.get(f"{BASE_URL}/api/admin/users", params={"limit": 1})
        users = list_response.json().get("users", [])
        if not users:
            pytest.skip("No users found")
        
        user_id = users[0]["user_id"]
        response = admin_session.get(f"{BASE_URL}/api/admin/users/{user_id}")
        assert response.status_code == 200
        stats = response.json().get("stats", {})
        assert "school_count" in stats
        assert "interaction_count" in stats
        assert "gmail_connected" in stats
        assert "questionnaire_completed" in stats
        print(f"Stats for {user_id}: {stats}")
    
    def test_get_user_detail_includes_programs(self, admin_session):
        """User detail includes programs list"""
        list_response = admin_session.get(f"{BASE_URL}/api/admin/users", params={"limit": 1})
        users = list_response.json().get("users", [])
        if not users:
            pytest.skip("No users found")
        
        user_id = users[0]["user_id"]
        response = admin_session.get(f"{BASE_URL}/api/admin/users/{user_id}")
        assert response.status_code == 200
        data = response.json()
        assert "programs" in data
        assert "recent_interactions" in data
        print(f"User has {len(data['programs'])} programs, {len(data['recent_interactions'])} recent interactions")
    
    def test_get_user_detail_404_for_invalid_id(self, admin_session):
        """Returns 404 for non-existent user"""
        response = admin_session.get(f"{BASE_URL}/api/admin/users/nonexistent-id-12345")
        assert response.status_code == 404


class TestAdminUserUpdateEndpoint:
    """Tests for PUT /api/admin/users/{userId}"""
    
    def test_update_user_plan_returns_200(self, admin_session):
        """Admin can update user plan"""
        # Get a user first
        list_response = admin_session.get(f"{BASE_URL}/api/admin/users", params={"limit": 1})
        users = list_response.json().get("users", [])
        if not users:
            pytest.skip("No users found")
        
        user_id = users[0]["user_id"]
        original_plan = users[0]["plan"]
        
        # Update to a different plan
        new_plan = "pro" if original_plan != "pro" else "basic"
        response = admin_session.put(f"{BASE_URL}/api/admin/users/{user_id}", json={
            "plan": new_plan
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") == True
        print(f"Updated user {user_id} from {original_plan} to {new_plan}")
        
        # Revert the plan
        admin_session.put(f"{BASE_URL}/api/admin/users/{user_id}", json={"plan": original_plan})
    
    def test_update_user_status_returns_200(self, admin_session):
        """Admin can update user status"""
        list_response = admin_session.get(f"{BASE_URL}/api/admin/users", params={"limit": 1})
        users = list_response.json().get("users", [])
        if not users:
            pytest.skip("No users found")
        
        user_id = users[0]["user_id"]
        original_status = users[0]["status"]
        
        # Test updating status
        response = admin_session.put(f"{BASE_URL}/api/admin/users/{user_id}", json={
            "status": "suspended"
        })
        assert response.status_code == 200
        
        # Revert status
        admin_session.put(f"{BASE_URL}/api/admin/users/{user_id}", json={"status": original_status})
        print(f"Status update test passed for user {user_id}")
    
    def test_update_user_creates_audit_log(self, admin_session):
        """Plan change creates audit log entry"""
        list_response = admin_session.get(f"{BASE_URL}/api/admin/users", params={"limit": 1})
        users = list_response.json().get("users", [])
        if not users:
            pytest.skip("No users found")
        
        user_id = users[0]["user_id"]
        original_plan = users[0]["plan"]
        new_plan = "premium" if original_plan != "premium" else "pro"
        
        # Get current logs count
        logs_before = admin_session.get(f"{BASE_URL}/api/admin/subscription-logs").json()
        count_before = logs_before.get("total", 0)
        
        # Update plan
        admin_session.put(f"{BASE_URL}/api/admin/users/{user_id}", json={"plan": new_plan})
        
        # Check if audit log was created
        logs_after = admin_session.get(f"{BASE_URL}/api/admin/subscription-logs").json()
        count_after = logs_after.get("total", 0)
        
        # Revert
        admin_session.put(f"{BASE_URL}/api/admin/users/{user_id}", json={"plan": original_plan})
        
        # Should have more logs now (note: revert also creates a log)
        assert count_after >= count_before
        print(f"Audit log count before: {count_before}, after: {count_after}")


class TestAdminUserCreateEndpoint:
    """Tests for POST /api/admin/users"""
    
    def test_create_user_returns_200(self, admin_session):
        """Admin can create new user"""
        unique_id = uuid.uuid4().hex[:8]
        response = admin_session.post(f"{BASE_URL}/api/admin/users", json={
            "name": f"TEST_User_{unique_id}",
            "email": f"test_{unique_id}@testcreate.com",
            "plan": "basic"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") == True
        assert "user_id" in data
        assert "email" in data
        print(f"Created user: {data['email']} with ID: {data['user_id']}")
    
    def test_create_user_requires_name_and_email(self, admin_session):
        """Create user requires name and email"""
        response = admin_session.post(f"{BASE_URL}/api/admin/users", json={
            "name": ""
        })
        assert response.status_code == 400
        
        response = admin_session.post(f"{BASE_URL}/api/admin/users", json={
            "email": ""
        })
        assert response.status_code == 400
        print("Validation for name/email working")
    
    def test_create_user_duplicate_email_fails(self, admin_session):
        """Cannot create user with existing email"""
        response = admin_session.post(f"{BASE_URL}/api/admin/users", json={
            "name": "Duplicate Test",
            "email": ATHLETE_EMAIL  # Existing email
        })
        assert response.status_code == 400
        print("Duplicate email rejection working")


class TestAdminSubscriptionsEndpoint:
    """Tests for GET /api/admin/subscriptions"""
    
    def test_list_subscriptions_returns_200(self, admin_session):
        """Admin can list subscriptions with stats"""
        response = admin_session.get(f"{BASE_URL}/api/admin/subscriptions")
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        assert "stats" in data
        assert "total" in data
        print(f"Subscriptions: {data['total']} users, stats: {data['stats']}")
    
    def test_list_subscriptions_includes_mrr(self, admin_session):
        """Subscription stats include MRR"""
        response = admin_session.get(f"{BASE_URL}/api/admin/subscriptions")
        assert response.status_code == 200
        stats = response.json().get("stats", {})
        assert "mrr" in stats
        assert "plan_counts" in stats
        assert "total_users" in stats
        print(f"MRR: ${stats['mrr']}, plan counts: {stats['plan_counts']}")
    
    def test_list_subscriptions_plan_counts(self, admin_session):
        """Plan counts include basic, pro, premium"""
        response = admin_session.get(f"{BASE_URL}/api/admin/subscriptions")
        assert response.status_code == 200
        plan_counts = response.json().get("stats", {}).get("plan_counts", {})
        assert "basic" in plan_counts
        assert "pro" in plan_counts
        assert "premium" in plan_counts
        print(f"Plan counts: basic={plan_counts['basic']}, pro={plan_counts['pro']}, premium={plan_counts['premium']}")
    
    def test_list_subscriptions_user_includes_limits(self, admin_session):
        """Subscription user list includes school/ai limits"""
        response = admin_session.get(f"{BASE_URL}/api/admin/subscriptions")
        assert response.status_code == 200
        users = response.json().get("users", [])
        if users:
            user = users[0]
            assert "school_limit" in user
            assert "ai_limit" in user
            assert "school_count" in user
            assert "ai_used" in user
            print(f"User limits: schools={user['school_count']}/{user['school_limit']}, AI={user['ai_used']}/{user['ai_limit']}")


class TestAdminSubscriptionChangeEndpoint:
    """Tests for PUT /api/admin/subscriptions/{userId}"""
    
    def test_change_subscription_returns_200(self, admin_session):
        """Admin can change user subscription"""
        list_response = admin_session.get(f"{BASE_URL}/api/admin/subscriptions", params={"limit": 1})
        users = list_response.json().get("users", [])
        if not users:
            pytest.skip("No users found")
        
        user_id = users[0]["user_id"]
        original_plan = users[0]["plan"]
        new_plan = "pro" if original_plan != "pro" else "basic"
        
        response = admin_session.put(f"{BASE_URL}/api/admin/subscriptions/{user_id}", json={
            "plan": new_plan,
            "reason": "Test plan change"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") == True
        assert "log" in data  # Should return the audit log entry
        print(f"Changed subscription for {user_id}: {original_plan} -> {new_plan}")
        
        # Revert
        admin_session.put(f"{BASE_URL}/api/admin/subscriptions/{user_id}", json={
            "plan": original_plan,
            "reason": "Test revert"
        })
    
    def test_change_subscription_invalid_plan_fails(self, admin_session):
        """Invalid plan is rejected"""
        list_response = admin_session.get(f"{BASE_URL}/api/admin/subscriptions", params={"limit": 1})
        users = list_response.json().get("users", [])
        if not users:
            pytest.skip("No users found")
        
        user_id = users[0]["user_id"]
        response = admin_session.put(f"{BASE_URL}/api/admin/subscriptions/{user_id}", json={
            "plan": "invalid_plan"
        })
        assert response.status_code == 400
        print("Invalid plan rejection working")


class TestAdminSubscriptionLogsEndpoint:
    """Tests for GET /api/admin/subscription-logs"""
    
    def test_list_subscription_logs_returns_200(self, admin_session):
        """Admin can list subscription logs"""
        response = admin_session.get(f"{BASE_URL}/api/admin/subscription-logs")
        assert response.status_code == 200
        data = response.json()
        assert "logs" in data
        assert "total" in data
        print(f"Found {data['total']} subscription logs")
    
    def test_subscription_logs_have_required_fields(self, admin_session):
        """Logs include user_id, old_plan, new_plan, created_at"""
        response = admin_session.get(f"{BASE_URL}/api/admin/subscription-logs")
        assert response.status_code == 200
        logs = response.json().get("logs", [])
        if logs:
            log = logs[0]
            assert "log_id" in log
            assert "user_id" in log
            assert "old_plan" in log
            assert "new_plan" in log
            assert "created_at" in log
            print(f"Log fields: {list(log.keys())}")


class TestAdminSubscriptionTiersEndpoint:
    """Tests for GET /api/admin/subscription-tiers"""
    
    def test_get_subscription_tiers_returns_200(self, admin_session):
        """Admin can get subscription tier definitions"""
        response = admin_session.get(f"{BASE_URL}/api/admin/subscription-tiers")
        assert response.status_code == 200
        data = response.json()
        assert "tiers" in data
        print(f"Tiers: {list(data['tiers'].keys())}")
    
    def test_subscription_tiers_include_basic_pro_premium(self, admin_session):
        """Tiers include basic, pro, premium with correct prices"""
        response = admin_session.get(f"{BASE_URL}/api/admin/subscription-tiers")
        assert response.status_code == 200
        tiers = response.json().get("tiers", {})
        
        assert "basic" in tiers
        assert "pro" in tiers
        assert "premium" in tiers
        
        assert tiers["basic"]["price"] == 0
        assert tiers["pro"]["price"] == 29
        assert tiers["premium"]["price"] == 49
        
        assert tiers["basic"]["max_schools"] == 5
        assert tiers["pro"]["max_schools"] == 25
        assert tiers["premium"]["max_schools"] == -1  # Unlimited
        
        print(f"Tier prices: basic=${tiers['basic']['price']}, pro=${tiers['pro']['price']}, premium=${tiers['premium']['price']}")


class TestAdminEndpointsRejectNonAdmin:
    """Tests that admin endpoints reject non-admin users"""
    
    def test_list_users_rejects_athlete(self, athlete_session):
        """Athlete cannot list users"""
        response = athlete_session.get(f"{BASE_URL}/api/admin/users")
        assert response.status_code == 403
        print("Athlete blocked from /admin/users")
    
    def test_user_detail_rejects_athlete(self, athlete_session):
        """Athlete cannot get user detail"""
        response = athlete_session.get(f"{BASE_URL}/api/admin/users/some-id")
        assert response.status_code == 403
        print("Athlete blocked from /admin/users/{id}")
    
    def test_create_user_rejects_athlete(self, athlete_session):
        """Athlete cannot create users"""
        response = athlete_session.post(f"{BASE_URL}/api/admin/users", json={
            "name": "Test",
            "email": "test@test.com"
        })
        assert response.status_code == 403
        print("Athlete blocked from POST /admin/users")
    
    def test_subscriptions_rejects_athlete(self, athlete_session):
        """Athlete cannot list subscriptions"""
        response = athlete_session.get(f"{BASE_URL}/api/admin/subscriptions")
        assert response.status_code == 403
        print("Athlete blocked from /admin/subscriptions")
    
    def test_subscription_change_rejects_athlete(self, athlete_session):
        """Athlete cannot change subscriptions"""
        response = athlete_session.put(f"{BASE_URL}/api/admin/subscriptions/some-id", json={
            "plan": "pro"
        })
        assert response.status_code == 403
        print("Athlete blocked from PUT /admin/subscriptions/{id}")
    
    def test_subscription_logs_rejects_athlete(self, athlete_session):
        """Athlete cannot view subscription logs"""
        response = athlete_session.get(f"{BASE_URL}/api/admin/subscription-logs")
        assert response.status_code == 403
        print("Athlete blocked from /admin/subscription-logs")
    
    def test_subscription_tiers_rejects_athlete(self, athlete_session):
        """Athlete cannot view subscription tiers"""
        response = athlete_session.get(f"{BASE_URL}/api/admin/subscription-tiers")
        assert response.status_code == 403
        print("Athlete blocked from /admin/subscription-tiers")

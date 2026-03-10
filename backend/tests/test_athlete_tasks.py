"""
Test suite for GET /api/athlete/tasks endpoint
Tests the new Upcoming Tasks feature that auto-generates tasks from pipeline data
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAthleteTasks:
    """Athlete Tasks endpoint tests - auto-generated action items from pipeline"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login as athlete and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "emma.chen@athlete.capymatch.com",
            "password": "password123"
        })
        if response.status_code != 200:
            pytest.skip("Authentication failed - skipping authenticated tests")
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    # --- Test 1: Tasks endpoint returns proper structure ---
    def test_tasks_endpoint_returns_200(self, auth_headers):
        """GET /api/athlete/tasks should return 200 with tasks array"""
        response = requests.get(f"{BASE_URL}/api/athlete/tasks", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "tasks" in data, "Response should have 'tasks' key"
        assert "total" in data, "Response should have 'total' key"
        assert isinstance(data["tasks"], list), "tasks should be a list"
        assert isinstance(data["total"], int), "total should be an integer"
        assert data["total"] == len(data["tasks"]), "total should match tasks count"
        print(f"Tasks endpoint returned {data['total']} tasks")
    
    # --- Test 2: Task structure validation ---
    def test_task_structure(self, auth_headers):
        """Each task should have required fields"""
        response = requests.get(f"{BASE_URL}/api/athlete/tasks", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        required_fields = ["task_id", "type", "priority", "title", "description", "link"]
        optional_fields = ["school", "program_id", "due_date", "days_diff"]
        
        for task in data["tasks"]:
            for field in required_fields:
                assert field in task, f"Task missing required field: {field}"
            
            # Validate task_id format
            assert task["task_id"], "task_id should not be empty"
            
            # Validate type is one of expected values
            valid_types = ["follow_up_overdue", "follow_up_today", "follow_up_soon", "first_outreach", "profile_completion"]
            assert task["type"] in valid_types, f"Invalid task type: {task['type']}"
            
            # Validate priority
            valid_priorities = ["high", "medium", "low"]
            assert task["priority"] in valid_priorities, f"Invalid priority: {task['priority']}"
            
            # Validate link exists and is a string
            assert isinstance(task["link"], str), "link should be a string"
            assert task["link"].startswith("/"), "link should start with /"
        
        print(f"All {len(data['tasks'])} tasks have valid structure")
    
    # --- Test 3: Tasks are sorted by priority and urgency ---
    def test_tasks_sorted_by_priority(self, auth_headers):
        """Tasks should be sorted: high priority first, then by urgency (most overdue first)"""
        response = requests.get(f"{BASE_URL}/api/athlete/tasks", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        tasks = data["tasks"]
        
        if len(tasks) < 2:
            print("Not enough tasks to verify sorting (need at least 2)")
            return
        
        priority_order = {"high": 0, "medium": 1, "low": 2}
        
        for i in range(len(tasks) - 1):
            current = tasks[i]
            next_task = tasks[i + 1]
            
            current_prio = priority_order.get(current["priority"], 9)
            next_prio = priority_order.get(next_task["priority"], 9)
            
            # Higher priority should come first
            assert current_prio <= next_prio, f"Task {i} priority ({current['priority']}) should come before task {i+1} ({next_task['priority']})"
            
            # If same priority, check days_diff ordering (lower/negative first)
            if current_prio == next_prio and current.get("days_diff") is not None and next_task.get("days_diff") is not None:
                # More negative (more overdue) should come first
                assert current["days_diff"] <= next_task["days_diff"] or next_task["days_diff"] is None, \
                    f"Within same priority, more overdue should come first"
        
        print("Tasks are correctly sorted by priority and urgency")
    
    # --- Test 4: Task types coverage ---
    def test_task_types_coverage(self, auth_headers):
        """Check which task types are present in response"""
        response = requests.get(f"{BASE_URL}/api/athlete/tasks", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        
        type_counts = {}
        for task in data["tasks"]:
            t = task["type"]
            type_counts[t] = type_counts.get(t, 0) + 1
        
        print(f"Task types found: {type_counts}")
        
        # Just log what we found, don't fail if certain types are missing
        all_types = ["follow_up_overdue", "follow_up_today", "follow_up_soon", "first_outreach", "profile_completion"]
        for t in all_types:
            if t in type_counts:
                print(f"  - {t}: {type_counts[t]} tasks")
            else:
                print(f"  - {t}: 0 tasks (none found)")
    
    # --- Test 5: Overdue follow-ups have negative days_diff ---
    def test_overdue_tasks_have_negative_days(self, auth_headers):
        """Overdue follow-up tasks should have negative days_diff"""
        response = requests.get(f"{BASE_URL}/api/athlete/tasks", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        
        overdue_tasks = [t for t in data["tasks"] if t["type"] == "follow_up_overdue"]
        
        for task in overdue_tasks:
            assert task["days_diff"] is not None, "Overdue task should have days_diff"
            assert task["days_diff"] < 0, f"Overdue task should have negative days_diff, got: {task['days_diff']}"
            assert task["priority"] == "high", "Overdue tasks should have high priority"
        
        print(f"Verified {len(overdue_tasks)} overdue tasks have negative days_diff")
    
    # --- Test 6: Due today tasks have days_diff = 0 ---
    def test_due_today_tasks(self, auth_headers):
        """Due today tasks should have days_diff = 0"""
        response = requests.get(f"{BASE_URL}/api/athlete/tasks", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        
        today_tasks = [t for t in data["tasks"] if t["type"] == "follow_up_today"]
        
        for task in today_tasks:
            assert task["days_diff"] == 0, f"Due today task should have days_diff=0, got: {task['days_diff']}"
            assert task["priority"] == "high", "Due today tasks should have high priority"
        
        print(f"Verified {len(today_tasks)} due-today tasks")
    
    # --- Test 7: Due soon tasks have days_diff 1-3 ---
    def test_due_soon_tasks(self, auth_headers):
        """Due soon tasks should have days_diff between 1 and 3"""
        response = requests.get(f"{BASE_URL}/api/athlete/tasks", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        
        soon_tasks = [t for t in data["tasks"] if t["type"] == "follow_up_soon"]
        
        for task in soon_tasks:
            assert task["days_diff"] is not None, "Due soon task should have days_diff"
            assert 1 <= task["days_diff"] <= 3, f"Due soon task should have days_diff 1-3, got: {task['days_diff']}"
            assert task["priority"] == "medium", "Due soon tasks should have medium priority"
        
        print(f"Verified {len(soon_tasks)} due-soon tasks")
    
    # --- Test 8: First outreach tasks ---
    def test_first_outreach_tasks(self, auth_headers):
        """First outreach tasks should have no due_date and medium priority"""
        response = requests.get(f"{BASE_URL}/api/athlete/tasks", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        
        outreach_tasks = [t for t in data["tasks"] if t["type"] == "first_outreach"]
        
        for task in outreach_tasks:
            assert task["due_date"] is None, "First outreach should not have due_date"
            assert task["days_diff"] is None, "First outreach should not have days_diff"
            assert task["priority"] == "medium", "First outreach should have medium priority"
            assert task["school"], "First outreach should have school name"
        
        print(f"Verified {len(outreach_tasks)} first-outreach tasks")
    
    # --- Test 9: Profile completion task ---
    def test_profile_completion_task(self, auth_headers):
        """Profile completion task should have low priority and link to /profile"""
        response = requests.get(f"{BASE_URL}/api/athlete/tasks", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        
        profile_tasks = [t for t in data["tasks"] if t["type"] == "profile_completion"]
        
        # There should be at most 1 profile completion task
        assert len(profile_tasks) <= 1, "Should have at most 1 profile completion task"
        
        for task in profile_tasks:
            assert task["priority"] == "low", "Profile completion should have low priority"
            assert task["link"] == "/profile", "Profile completion should link to /profile"
            assert task["school"] is None, "Profile completion should not have school"
            assert task["program_id"] is None, "Profile completion should not have program_id"
            assert "Missing:" in task["description"], "Profile completion should list missing fields"
        
        print(f"Verified {len(profile_tasks)} profile-completion tasks")
    
    # --- Test 10: Unauthenticated request returns 401 ---
    def test_tasks_requires_auth(self):
        """GET /api/athlete/tasks should return 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/athlete/tasks")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("Correctly returns 401 for unauthenticated requests")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

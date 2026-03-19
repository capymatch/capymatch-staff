"""
Test Coach Inbox + School Pod Risk - Risk Engine v3 integration for Coach Dashboard

Tests:
1. GET /api/coach-inbox - returns risk-enriched items scoped to coach's athletes only
2. GET /api/coach-inbox - filters out 'monitor' intervention items (coach sees only actionable)
3. GET /api/school-pod-risk/{program_id} - returns role-neutral risk context + role-specific action
4. POST /api/coach/escalate - creates escalation/flag in director_actions collection
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Coach Williams credentials
COACH_EMAIL = "coach.williams@capymatch.com"
COACH_PASSWORD = "coach123"

# Director credentials for verification
DIRECTOR_EMAIL = "director@capymatch.com"
DIRECTOR_PASSWORD = "director123"

# Test program - Marcus Johnson + University of Michigan
ATHLETE_3_ID = "athlete_3"  # Marcus Johnson
PROGRAM_ID = "ac37f39c-1727-4eac-8a6c-8055db9f5df5"


class TestCoachInboxRiskV3:
    """Tests for GET /api/coach-inbox with Risk Engine v3 fields"""

    @pytest.fixture(autouse=True)
    def setup_auth(self):
        """Get auth token for Coach Williams"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": COACH_EMAIL,
            "password": COACH_PASSWORD
        })
        if resp.status_code == 200:
            self.token = resp.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Coach login failed")

    def test_coach_inbox_returns_200(self):
        """Coach inbox endpoint returns 200"""
        resp = requests.get(f"{BASE_URL}/api/coach-inbox", headers=self.headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print("PASS: GET /api/coach-inbox returns 200")

    def test_coach_inbox_returns_items_array(self):
        """Response has items array, count, and highCount"""
        resp = requests.get(f"{BASE_URL}/api/coach-inbox", headers=self.headers)
        data = resp.json()
        assert "items" in data, "Missing 'items' key"
        assert "count" in data, "Missing 'count' key"
        assert "highCount" in data, "Missing 'highCount' key"
        assert isinstance(data["items"], list), "items should be a list"
        print(f"PASS: Response has items ({len(data['items'])}), count ({data['count']}), highCount ({data['highCount']})")

    def test_coach_inbox_has_v3_fields(self):
        """Each item has Risk Engine v3 fields"""
        resp = requests.get(f"{BASE_URL}/api/coach-inbox", headers=self.headers)
        data = resp.json()
        items = data.get("items", [])
        
        if not items:
            pytest.skip("No inbox items for coach")
        
        required_v3_fields = [
            "riskScore", "severity", "trajectory", "interventionType",
            "riskSignals", "whyNow", "coachAction", "secondaryRisks", "explanationShort"
        ]
        
        for item in items:
            for field in required_v3_fields:
                assert field in item, f"Missing v3 field '{field}' in item {item.get('id')}"
        
        print(f"PASS: All {len(items)} items have required v3 fields")

    def test_coach_inbox_filters_monitor_intervention(self):
        """Items with 'monitor' intervention should NOT appear in coach inbox"""
        resp = requests.get(f"{BASE_URL}/api/coach-inbox", headers=self.headers)
        data = resp.json()
        items = data.get("items", [])
        
        for item in items:
            assert item.get("interventionType") != "monitor", \
                f"Item {item.get('id')} has 'monitor' intervention - should be filtered out"
        
        print(f"PASS: No 'monitor' intervention items in coach inbox ({len(items)} items)")

    def test_coach_inbox_scoped_to_coach_athletes(self):
        """Items should only be for coach's assigned athletes"""
        resp = requests.get(f"{BASE_URL}/api/coach-inbox", headers=self.headers)
        data = resp.json()
        items = data.get("items", [])
        
        # Coach Williams athletes: Emma Chen, Olivia Anderson, Marcus Johnson, Sarah Martinez, Lucas Rodriguez
        # Per spec: athlete_1 (Emma), athlete_2 (Olivia), athlete_3 (Marcus), athlete_4 (Sarah), athlete_5 (Lucas)
        coach_athletes = {"athlete_1", "athlete_2", "athlete_3", "athlete_4", "athlete_5"}
        
        for item in items:
            athlete_id = item.get("athleteId", "")
            assert athlete_id in coach_athletes, \
                f"Item for athlete {athlete_id} not in coach's roster"
        
        print(f"PASS: All {len(items)} items scoped to coach's athletes")

    def test_coach_inbox_cta_labels_match_intervention(self):
        """CTA labels should match intervention type mapping"""
        resp = requests.get(f"{BASE_URL}/api/coach-inbox", headers=self.headers)
        data = resp.json()
        items = data.get("items", [])
        
        # Expected CTA mappings
        CTA_MAP = {
            "nudge": "Send follow-up",
            "review": "Open Pod",
            "escalate": "Request director help",
            "blocker": "Review blocker",
        }
        
        for item in items:
            intervention = item.get("interventionType")
            cta = item.get("cta", {}).get("label", "")
            expected_cta = CTA_MAP.get(intervention)
            
            if expected_cta:
                assert cta == expected_cta, \
                    f"CTA mismatch for {intervention}: got '{cta}', expected '{expected_cta}'"
        
        print(f"PASS: CTA labels correctly match intervention types")

    def test_coach_inbox_items_sorted_by_risk_score(self):
        """Items should be sorted by riskScore descending"""
        resp = requests.get(f"{BASE_URL}/api/coach-inbox", headers=self.headers)
        data = resp.json()
        items = data.get("items", [])
        
        if len(items) < 2:
            pytest.skip("Need at least 2 items to verify sorting")
        
        risk_scores = [item.get("riskScore", 0) for item in items]
        assert risk_scores == sorted(risk_scores, reverse=True), \
            f"Items not sorted by riskScore: {risk_scores}"
        
        print(f"PASS: Items sorted by riskScore DESC: {risk_scores}")

    def test_coach_inbox_severity_values_valid(self):
        """Severity values must be in valid set"""
        resp = requests.get(f"{BASE_URL}/api/coach-inbox", headers=self.headers)
        data = resp.json()
        items = data.get("items", [])
        
        valid_severities = {"critical", "high", "medium", "low"}
        
        for item in items:
            severity = item.get("severity")
            assert severity in valid_severities, \
                f"Invalid severity '{severity}' for item {item.get('id')}"
        
        print(f"PASS: All severity values valid")

    def test_coach_inbox_trajectory_values_valid(self):
        """Trajectory values must be in valid set"""
        resp = requests.get(f"{BASE_URL}/api/coach-inbox", headers=self.headers)
        data = resp.json()
        items = data.get("items", [])
        
        valid_trajectories = {"improving", "stable", "worsening"}
        
        for item in items:
            trajectory = item.get("trajectory")
            assert trajectory in valid_trajectories, \
                f"Invalid trajectory '{trajectory}' for item {item.get('id')}"
        
        print(f"PASS: All trajectory values valid")


class TestSchoolPodRisk:
    """Tests for GET /api/school-pod-risk/{program_id}"""

    @pytest.fixture(autouse=True)
    def setup_auth(self):
        """Get auth token for Coach Williams"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": COACH_EMAIL,
            "password": COACH_PASSWORD
        })
        if resp.status_code == 200:
            self.token = resp.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Coach login failed")

    def test_school_pod_risk_returns_200(self):
        """School pod risk endpoint returns 200 for valid program"""
        resp = requests.get(f"{BASE_URL}/api/school-pod-risk/{PROGRAM_ID}", headers=self.headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print(f"PASS: GET /api/school-pod-risk/{PROGRAM_ID} returns 200")

    def test_school_pod_risk_has_required_fields(self):
        """Response has all required risk context fields"""
        resp = requests.get(f"{BASE_URL}/api/school-pod-risk/{PROGRAM_ID}", headers=self.headers)
        data = resp.json()
        
        required_fields = [
            "program_id", "athlete_id", "school_name", "recruiting_status",
            "primaryRisk", "severity", "trajectory", "interventionType",
            "whyNow", "secondaryRisks", "riskSignals", "explanationShort",
            "recommendedActionByRole", "recommendedNextAction"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing required field '{field}'"
        
        print(f"PASS: All required risk context fields present")

    def test_school_pod_risk_has_role_based_actions(self):
        """recommendedActionByRole has coach/director/family keys"""
        resp = requests.get(f"{BASE_URL}/api/school-pod-risk/{PROGRAM_ID}", headers=self.headers)
        data = resp.json()
        
        actions = data.get("recommendedActionByRole", {})
        expected_roles = ["coach", "director", "family"]
        
        for role in expected_roles:
            assert role in actions, f"Missing role '{role}' in recommendedActionByRole"
        
        print(f"PASS: recommendedActionByRole has coach/director/family keys")

    def test_school_pod_risk_recommended_action_matches_role(self):
        """recommendedNextAction should match coach role action"""
        resp = requests.get(f"{BASE_URL}/api/school-pod-risk/{PROGRAM_ID}", headers=self.headers)
        data = resp.json()
        
        coach_action = data.get("recommendedActionByRole", {}).get("coach", "")
        recommended = data.get("recommendedNextAction", "")
        
        assert recommended == coach_action, \
            f"recommendedNextAction '{recommended}' != coach action '{coach_action}'"
        
        print(f"PASS: recommendedNextAction matches coach role action: '{recommended}'")

    def test_school_pod_risk_severity_valid(self):
        """Severity value must be in valid set"""
        resp = requests.get(f"{BASE_URL}/api/school-pod-risk/{PROGRAM_ID}", headers=self.headers)
        data = resp.json()
        
        severity = data.get("severity")
        valid_severities = {"critical", "high", "medium", "low"}
        assert severity in valid_severities, f"Invalid severity: {severity}"
        
        print(f"PASS: Severity '{severity}' is valid")

    def test_school_pod_risk_404_for_invalid_program(self):
        """Returns 404 for non-existent program"""
        resp = requests.get(f"{BASE_URL}/api/school-pod-risk/invalid-program-id", headers=self.headers)
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
        print("PASS: Returns 404 for invalid program_id")


class TestCoachEscalate:
    """Tests for POST /api/coach/escalate"""

    @pytest.fixture(autouse=True)
    def setup_auth(self):
        """Get auth tokens for Coach and Director"""
        # Coach login
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": COACH_EMAIL,
            "password": COACH_PASSWORD
        })
        if resp.status_code == 200:
            self.coach_token = resp.json().get("token")
            self.coach_headers = {"Authorization": f"Bearer {self.coach_token}"}
        else:
            pytest.skip("Coach login failed")
        
        # Director login for verification
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DIRECTOR_EMAIL,
            "password": DIRECTOR_PASSWORD
        })
        if resp.status_code == 200:
            self.director_token = resp.json().get("token")
            self.director_headers = {"Authorization": f"Bearer {self.director_token}"}
        else:
            pytest.skip("Director login failed")

    def test_coach_escalate_creates_entry(self):
        """POST /api/coach/escalate creates escalation document"""
        import uuid
        
        payload = {
            "athlete_id": ATHLETE_3_ID,
            "athlete_name": "Marcus Johnson",
            "school_name": "University of Michigan",
            "primary_risk": "Stalled communication",
            "why_now": "No response in 14 days",
            "coach_note": f"TEST_ESCALATION_{uuid.uuid4().hex[:8]}"
        }
        
        resp = requests.post(f"{BASE_URL}/api/coach/escalate", 
                            json=payload, headers=self.coach_headers)
        
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        
        assert data.get("success") == True, "Expected success=True"
        assert "action_id" in data, "Missing action_id in response"
        assert data.get("message") == "Escalation sent to director", \
            f"Unexpected message: {data.get('message')}"
        
        print(f"PASS: Escalation created with action_id: {data.get('action_id')}")
        
        # Store for verification
        self.created_action_id = data.get("action_id")

    def test_escalation_visible_in_director_inbox(self):
        """Escalation should appear in director's actions"""
        import uuid
        
        # Create escalation first
        payload = {
            "athlete_id": ATHLETE_3_ID,
            "athlete_name": "Marcus Johnson",
            "school_name": "University of Michigan",
            "primary_risk": "Communication issue",
            "why_now": "Urgent attention needed",
            "coach_note": f"TEST_DIRECTOR_VISIBLE_{uuid.uuid4().hex[:8]}"
        }
        
        resp = requests.post(f"{BASE_URL}/api/coach/escalate", 
                            json=payload, headers=self.coach_headers)
        assert resp.status_code == 200
        action_id = resp.json().get("action_id")
        
        # Check director actions
        resp = requests.get(f"{BASE_URL}/api/director/actions", headers=self.director_headers)
        assert resp.status_code == 200, f"Director actions failed: {resp.status_code}"
        
        data = resp.json()
        actions = data.get("actions", [])
        
        # Find the created escalation
        found = False
        for action in actions:
            if action.get("action_id") == action_id:
                found = True
                assert action.get("type") == "coach_escalation", \
                    f"Expected type 'coach_escalation', got '{action.get('type')}'"
                assert action.get("status") in ["open", "acknowledged"], \
                    f"Expected open/acknowledged status, got '{action.get('status')}'"
                break
        
        assert found, f"Escalation {action_id} not found in director actions"
        print(f"PASS: Escalation {action_id} visible in director inbox")


class TestDirectorStillWorks:
    """Verify director view still works after coach endpoint additions"""

    @pytest.fixture(autouse=True)
    def setup_auth(self):
        """Get auth token for Director"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DIRECTOR_EMAIL,
            "password": DIRECTOR_PASSWORD
        })
        if resp.status_code == 200:
            self.token = resp.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Director login failed")

    def test_director_inbox_still_works(self):
        """GET /api/director-inbox still returns 200"""
        resp = requests.get(f"{BASE_URL}/api/director-inbox", headers=self.headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        
        data = resp.json()
        assert "items" in data, "Missing 'items' key"
        print(f"PASS: Director inbox returns {len(data.get('items', []))} items")

    def test_director_actions_still_works(self):
        """GET /api/director/actions still returns 200"""
        resp = requests.get(f"{BASE_URL}/api/director/actions", headers=self.headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        
        data = resp.json()
        assert "actions" in data, "Missing 'actions' key"
        print(f"PASS: Director actions returns {len(data.get('actions', []))} actions")

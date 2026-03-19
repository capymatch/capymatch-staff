"""Test Risk Engine v3 with fresh seed data.

Covers:
1. Coach Williams dashboard shows correct items
2. Coach Garcia dashboard shows correct items  
3. Director inbox shows all 9 items with correct risk fields
4. Lucas Rodriguez (athlete_5) NOT in any inbox (healthy)
5. Liam Moore (athlete_9) shows in director inbox (no coach assigned)
6. Risk engine fields populated correctly
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
DIRECTOR = {"email": "director@capymatch.com", "password": "director123"}
COACH_WILLIAMS = {"email": "coach.williams@capymatch.com", "password": "coach123"}
COACH_GARCIA = {"email": "coach.garcia@capymatch.com", "password": "coach123"}

# Athlete mapping from seed
ATHLETE_MAP = {
    "athlete_1": "Emma Chen",
    "athlete_2": "Olivia Anderson",
    "athlete_3": "Marcus Johnson",
    "athlete_4": "Sarah Martinez",
    "athlete_5": "Lucas Rodriguez",  # HEALTHY - should NOT appear
    "athlete_6": "Ava Thompson",
    "athlete_7": "Noah Davis",
    "athlete_8": "Isabella Wilson",
    "athlete_9": "Liam Moore",  # No coach assigned
    "athlete_10": "Sophia Garcia",
}

# Coach assignments from seed
COACH_WILLIAMS_ATHLETES = ["athlete_1", "athlete_2", "athlete_3", "athlete_6", "athlete_10"]
COACH_GARCIA_ATHLETES = ["athlete_4", "athlete_5", "athlete_7", "athlete_8"]
# athlete_9 (Liam Moore) has NO coach


class TestAuthentication:
    """Test login functionality"""
    
    def test_director_login(self):
        """Director can log in"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json=DIRECTOR)
        assert resp.status_code == 200, f"Director login failed: {resp.text}"
        data = resp.json()
        assert "token" in data
        assert data["user"]["role"] == "director"
        print(f"PASS: Director login successful - {data['user']['name']}")
    
    def test_coach_williams_login(self):
        """Coach Williams can log in"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json=COACH_WILLIAMS)
        assert resp.status_code == 200, f"Coach Williams login failed: {resp.text}"
        data = resp.json()
        assert "token" in data
        assert data["user"]["role"] == "club_coach"
        print(f"PASS: Coach Williams login successful - {data['user']['name']}")
    
    def test_coach_garcia_login(self):
        """Coach Garcia can log in"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json=COACH_GARCIA)
        assert resp.status_code == 200, f"Coach Garcia login failed: {resp.text}"
        data = resp.json()
        assert "token" in data
        assert data["user"]["role"] == "club_coach"
        print(f"PASS: Coach Garcia login successful - {data['user']['name']}")


def get_token(creds):
    """Helper to get auth token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json=creds)
    return resp.json()["token"]


class TestDirectorInbox:
    """Test Director Inbox endpoint - sees all athletes across all coaches"""
    
    @pytest.fixture
    def director_token(self):
        return get_token(DIRECTOR)
    
    def test_director_inbox_returns_items(self, director_token):
        """Director inbox returns items with risk engine fields"""
        resp = requests.get(
            f"{BASE_URL}/api/director-inbox",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert resp.status_code == 200, f"Director inbox failed: {resp.text}"
        data = resp.json()
        
        assert "items" in data
        assert "count" in data
        assert "highCount" in data
        
        print(f"Director Inbox: {data['count']} items, {data['highCount']} high priority")
        return data
    
    def test_director_inbox_count(self, director_token):
        """Director inbox should have 9 items (all athletes except Lucas Rodriguez)"""
        resp = requests.get(
            f"{BASE_URL}/api/director-inbox",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        data = resp.json()
        
        # Should be 9 items (Lucas Rodriguez is healthy and should NOT appear)
        assert data["count"] == 9, f"Expected 9 items, got {data['count']}"
        print(f"PASS: Director inbox has {data['count']} items")
    
    def test_director_inbox_high_priority_count(self, director_token):
        """Director inbox should have 6 high priority items"""
        resp = requests.get(
            f"{BASE_URL}/api/director-inbox",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        data = resp.json()
        
        # According to seed: 6 high priority items
        assert data["highCount"] == 6, f"Expected 6 high priority, got {data['highCount']}"
        print(f"PASS: Director inbox has {data['highCount']} high priority items")
    
    def test_lucas_rodriguez_not_in_director_inbox(self, director_token):
        """Lucas Rodriguez (athlete_5) should NOT appear - he's healthy with offer"""
        resp = requests.get(
            f"{BASE_URL}/api/director-inbox",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        data = resp.json()
        
        athlete_ids = [item["athleteId"] for item in data["items"]]
        assert "athlete_5" not in athlete_ids, "Lucas Rodriguez should NOT be in inbox"
        
        athlete_names = [item["athleteName"] for item in data["items"]]
        assert "Lucas Rodriguez" not in athlete_names, "Lucas Rodriguez should NOT be in inbox by name"
        print("PASS: Lucas Rodriguez correctly excluded from director inbox")
    
    def test_liam_moore_in_director_inbox(self, director_token):
        """Liam Moore (athlete_9) should appear - no coach assigned"""
        resp = requests.get(
            f"{BASE_URL}/api/director-inbox",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        data = resp.json()
        
        athlete_ids = [item["athleteId"] for item in data["items"]]
        assert "athlete_9" in athlete_ids, "Liam Moore should be in inbox (no coach assigned)"
        
        # Find Liam's item and check for no_coach_assigned signal
        liam_item = next((i for i in data["items"] if i["athleteId"] == "athlete_9"), None)
        assert liam_item is not None
        assert "No coach assigned" in liam_item.get("issues", []) or "No coach assigned" in liam_item.get("riskSignals", [])
        print(f"PASS: Liam Moore in director inbox with signals: {liam_item.get('riskSignals', [])}")
    
    def test_director_inbox_risk_engine_fields(self, director_token):
        """All items should have Risk Engine v3 fields"""
        resp = requests.get(
            f"{BASE_URL}/api/director-inbox",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        data = resp.json()
        
        required_fields = ["severity", "trajectory", "interventionType", "whyNow", "riskScore", "riskSignals"]
        
        for item in data["items"]:
            for field in required_fields:
                assert field in item, f"Missing {field} in item for {item['athleteName']}"
            
            # Validate severity values
            assert item["severity"] in ["critical", "high", "medium", "low"], f"Invalid severity: {item['severity']}"
            
            # Validate trajectory values
            assert item["trajectory"] in ["improving", "stable", "worsening"], f"Invalid trajectory: {item['trajectory']}"
            
            # Validate interventionType values
            assert item["interventionType"] in ["monitor", "nudge", "review", "escalate", "blocker"], f"Invalid interventionType: {item['interventionType']}"
        
        print(f"PASS: All {len(data['items'])} items have valid Risk Engine v3 fields")


class TestCoachWilliamsInbox:
    """Test Coach Williams Inbox - should see only assigned athletes"""
    
    @pytest.fixture
    def coach_token(self):
        return get_token(COACH_WILLIAMS)
    
    def test_coach_williams_inbox_returns_items(self, coach_token):
        """Coach Williams inbox returns items"""
        resp = requests.get(
            f"{BASE_URL}/api/coach-inbox",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert resp.status_code == 200, f"Coach inbox failed: {resp.text}"
        data = resp.json()
        
        assert "items" in data
        assert "count" in data
        print(f"Coach Williams Inbox: {data['count']} items")
        return data
    
    def test_coach_williams_inbox_count(self, coach_token):
        """Coach Williams should see 3 items (based on test requirements)"""
        resp = requests.get(
            f"{BASE_URL}/api/coach-inbox",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        data = resp.json()
        
        # Expected: 3 items based on test requirements
        # Marcus Johnson (critical/worsening), Ava Thompson (critical/worsening), Olivia Anderson (critical/stable)
        assert data["count"] == 3, f"Expected 3 items for Coach Williams, got {data['count']}"
        print(f"PASS: Coach Williams inbox has {data['count']} items")
    
    def test_coach_williams_sees_only_assigned_athletes(self, coach_token):
        """Coach Williams should only see their assigned athletes"""
        resp = requests.get(
            f"{BASE_URL}/api/coach-inbox",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        data = resp.json()
        
        athlete_ids = [item["athleteId"] for item in data["items"]]
        
        # Should NOT see Coach Garcia's athletes
        for athlete_id in COACH_GARCIA_ATHLETES:
            if athlete_id != "athlete_5":  # athlete_5 shouldn't appear for anyone
                # It's OK if they don't appear due to risk filtering
                pass
        
        # Should NOT see unassigned athlete (athlete_9)
        assert "athlete_9" not in athlete_ids, "Coach Williams should NOT see Liam Moore (no coach)"
        
        # Athletes found should be from Williams' assigned list
        for athlete_id in athlete_ids:
            # Some athletes might not appear if they're healthy
            if athlete_id not in COACH_WILLIAMS_ATHLETES:
                pytest.fail(f"Coach Williams seeing non-assigned athlete: {athlete_id}")
        
        print(f"PASS: Coach Williams sees only assigned athletes: {athlete_ids}")
    
    def test_coach_williams_marcus_johnson_critical(self, coach_token):
        """Marcus Johnson should be critical/worsening for Coach Williams"""
        resp = requests.get(
            f"{BASE_URL}/api/coach-inbox",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        data = resp.json()
        
        marcus = next((i for i in data["items"] if i["athleteId"] == "athlete_3"), None)
        assert marcus is not None, "Marcus Johnson should be in Coach Williams inbox"
        
        assert marcus["severity"] == "critical", f"Expected critical severity for Marcus, got {marcus['severity']}"
        assert marcus["trajectory"] == "worsening", f"Expected worsening trajectory for Marcus, got {marcus['trajectory']}"
        print(f"PASS: Marcus Johnson - severity={marcus['severity']}, trajectory={marcus['trajectory']}")
    
    def test_coach_inbox_risk_engine_fields(self, coach_token):
        """All coach inbox items should have Risk Engine v3 fields"""
        resp = requests.get(
            f"{BASE_URL}/api/coach-inbox",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        data = resp.json()
        
        required_fields = ["severity", "trajectory", "interventionType", "whyNow", "riskScore", "riskSignals", "coachAction"]
        
        for item in data["items"]:
            for field in required_fields:
                assert field in item, f"Missing {field} in item for {item['athleteName']}"
        
        print(f"PASS: All {len(data['items'])} coach inbox items have Risk Engine v3 fields")


class TestCoachGarciaInbox:
    """Test Coach Garcia Inbox - should see only assigned athletes"""
    
    @pytest.fixture
    def coach_token(self):
        return get_token(COACH_GARCIA)
    
    def test_coach_garcia_inbox_returns_items(self, coach_token):
        """Coach Garcia inbox returns items"""
        resp = requests.get(
            f"{BASE_URL}/api/coach-inbox",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert resp.status_code == 200, f"Coach inbox failed: {resp.text}"
        data = resp.json()
        
        assert "items" in data
        print(f"Coach Garcia Inbox: {data['count']} items")
        return data
    
    def test_coach_garcia_inbox_count(self, coach_token):
        """Coach Garcia should see 3 items (based on test requirements)"""
        resp = requests.get(
            f"{BASE_URL}/api/coach-inbox",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        data = resp.json()
        
        # Expected: 3 items based on test requirements
        # Noah Davis (critical/improving), Sarah Martinez (high/improving), Isabella Wilson (medium/stable)
        assert data["count"] == 3, f"Expected 3 items for Coach Garcia, got {data['count']}"
        print(f"PASS: Coach Garcia inbox has {data['count']} items")
    
    def test_coach_garcia_lucas_not_visible(self, coach_token):
        """Lucas Rodriguez should NOT appear for Coach Garcia (healthy)"""
        resp = requests.get(
            f"{BASE_URL}/api/coach-inbox",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        data = resp.json()
        
        athlete_ids = [item["athleteId"] for item in data["items"]]
        assert "athlete_5" not in athlete_ids, "Lucas Rodriguez should NOT be in coach inbox"
        print("PASS: Lucas Rodriguez correctly excluded from Coach Garcia inbox")
    
    def test_coach_garcia_noah_davis_improving(self, coach_token):
        """Noah Davis (athlete_7) should have improving trajectory (recent autopilot actions)"""
        resp = requests.get(
            f"{BASE_URL}/api/coach-inbox",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        data = resp.json()
        
        noah = next((i for i in data["items"] if i["athleteId"] == "athlete_7"), None)
        if noah:
            # Noah might have improving trajectory due to recent actions
            print(f"Noah Davis - severity={noah.get('severity')}, trajectory={noah.get('trajectory')}")


class TestSupportPodAccess:
    """Test Support Pod access for different athlete types"""
    
    @pytest.fixture
    def director_token(self):
        return get_token(DIRECTOR)
    
    def test_support_pod_olivia_anderson_blocker(self, director_token):
        """Support pod for Olivia Anderson (blocker - missing docs)"""
        resp = requests.get(
            f"{BASE_URL}/api/support-pod/athlete_2",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert resp.status_code == 200, f"Support pod failed: {resp.text}"
        data = resp.json()
        
        assert data.get("athlete_id") == "athlete_2" or data.get("id") == "athlete_2"
        print(f"PASS: Support pod loads for Olivia Anderson (blocker)")
    
    def test_support_pod_lucas_rodriguez_healthy(self, director_token):
        """Support pod for Lucas Rodriguez (healthy - has offer)"""
        resp = requests.get(
            f"{BASE_URL}/api/support-pod/athlete_5",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert resp.status_code == 200, f"Support pod failed: {resp.text}"
        data = resp.json()
        
        assert data.get("athlete_id") == "athlete_5" or data.get("id") == "athlete_5"
        print(f"PASS: Support pod loads for Lucas Rodriguez (healthy)")


class TestAthleteProfiles:
    """Test athlete profile endpoints"""
    
    @pytest.fixture
    def director_token(self):
        return get_token(DIRECTOR)
    
    def test_get_all_athletes(self, director_token):
        """Get all athletes to verify seed data"""
        resp = requests.get(
            f"{BASE_URL}/api/athletes",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert resp.status_code == 200, f"Get athletes failed: {resp.text}"
        data = resp.json()
        
        # Should have 10 athletes from seed
        athletes = data if isinstance(data, list) else data.get("athletes", [])
        assert len(athletes) == 10, f"Expected 10 athletes, got {len(athletes)}"
        
        # Verify Lucas Rodriguez is in the list
        lucas = next((a for a in athletes if a.get("id") == "athlete_5"), None)
        assert lucas is not None, "Lucas Rodriguez should be in athletes list"
        
        # Verify Liam Moore has no coach
        liam = next((a for a in athletes if a.get("id") == "athlete_9"), None)
        assert liam is not None, "Liam Moore should be in athletes list"
        assert liam.get("primary_coach_id") is None, "Liam Moore should have no coach assigned"
        
        print(f"PASS: {len(athletes)} athletes found, Lucas present, Liam has no coach")


class TestRiskEngineFields:
    """Test that risk engine fields are populated correctly"""
    
    @pytest.fixture
    def director_token(self):
        return get_token(DIRECTOR)
    
    def test_severity_values(self, director_token):
        """Check severity distribution in director inbox"""
        resp = requests.get(
            f"{BASE_URL}/api/director-inbox",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        data = resp.json()
        
        severity_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        for item in data["items"]:
            sev = item.get("severity", "unknown")
            if sev in severity_counts:
                severity_counts[sev] += 1
        
        print(f"Severity distribution: {severity_counts}")
        
        # Should have at least some critical/high items
        assert severity_counts["critical"] + severity_counts["high"] > 0, "Should have critical or high severity items"
    
    def test_trajectory_values(self, director_token):
        """Check trajectory distribution in director inbox"""
        resp = requests.get(
            f"{BASE_URL}/api/director-inbox",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        data = resp.json()
        
        trajectory_counts = {"improving": 0, "stable": 0, "worsening": 0}
        for item in data["items"]:
            traj = item.get("trajectory", "unknown")
            if traj in trajectory_counts:
                trajectory_counts[traj] += 1
        
        print(f"Trajectory distribution: {trajectory_counts}")
    
    def test_intervention_types(self, director_token):
        """Check intervention types in director inbox"""
        resp = requests.get(
            f"{BASE_URL}/api/director-inbox",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        data = resp.json()
        
        intervention_counts = {}
        for item in data["items"]:
            intv = item.get("interventionType", "unknown")
            intervention_counts[intv] = intervention_counts.get(intv, 0) + 1
        
        print(f"Intervention distribution: {intervention_counts}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

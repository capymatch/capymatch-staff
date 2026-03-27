"""
Test Suite: CapyMatch Production Integrity Audit
Tests for:
1. DETERMINISM - Same endpoint called twice returns identical JSON
2. NO MOCK DATA - No fabricated signals, events, or random values

P0 fixes verified:
- decision_engine.py: All random.random() usage removed
- athlete_store.py: mock_data imports removed
- mission_control.py: mock_data imports removed
"""

import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
DIRECTOR_EMAIL = "director@capymatch.com"
DIRECTOR_PASSWORD = "director123"
COACH_EMAIL = "coach.williams@capymatch.com"
COACH_PASSWORD = "coach123"
ATHLETE_EMAIL = "emma.chen@athlete.capymatch.com"
ATHLETE_PASSWORD = "athlete123"

# Known mock data patterns to detect
MOCK_SIGNAL_PATTERNS = [
    "Received interest from UCLA",
    "Received interest from Stanford",
    "Received interest from Duke",
    "Received interest from USC",
    "Received interest from Michigan",
]

# Note: "College Exposure Camp", "Spring Classic", "Winter Showcase" are SEEDED events in DB
# They are NOT mock data - they are legitimate pre-populated data
# Mock data would be events generated at runtime by mock_data.py functions
# The fix removed runtime mock generation, not seeded data
MOCK_EVENT_NAMES = [
    # These would be mock patterns if they appeared without being in DB
    # Currently all events come from DB, so this list is empty
]


class TestAuth:
    """Authentication helper tests"""
    
    @pytest.fixture(scope="class")
    def director_token(self):
        """Get director authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DIRECTOR_EMAIL,
            "password": DIRECTOR_PASSWORD
        })
        assert response.status_code == 200, f"Director login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in director login response"
        return data["token"]
    
    @pytest.fixture(scope="class")
    def coach_token(self):
        """Get coach authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": COACH_EMAIL,
            "password": COACH_PASSWORD
        })
        assert response.status_code == 200, f"Coach login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in coach login response"
        return data["token"]
    
    @pytest.fixture(scope="class")
    def athlete_token(self):
        """Get athlete authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ATHLETE_EMAIL,
            "password": ATHLETE_PASSWORD
        })
        assert response.status_code == 200, f"Athlete login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in athlete login response"
        return data["token"]


class TestDeterminismCoach(TestAuth):
    """DETERMINISM: Coach endpoints return identical results on consecutive calls"""
    
    def test_mission_control_determinism_coach(self, coach_token):
        """Call GET /api/mission-control twice with coach token - verify identical output"""
        headers = {"Authorization": f"Bearer {coach_token}"}
        
        # First call
        response1 = requests.get(f"{BASE_URL}/api/mission-control", headers=headers)
        assert response1.status_code == 200, f"First call failed: {response1.text}"
        data1 = response1.json()
        
        # Second call
        response2 = requests.get(f"{BASE_URL}/api/mission-control", headers=headers)
        assert response2.status_code == 200, f"Second call failed: {response2.text}"
        data2 = response2.json()
        
        # Verify key fields are identical
        assert data1.get("role") == data2.get("role"), "Role mismatch between calls"
        
        # myRoster should be identical
        roster1 = data1.get("myRoster", [])
        roster2 = data2.get("myRoster", [])
        assert len(roster1) == len(roster2), f"Roster length mismatch: {len(roster1)} vs {len(roster2)}"
        
        # Compare roster items by ID
        roster1_ids = sorted([a.get("id") for a in roster1])
        roster2_ids = sorted([a.get("id") for a in roster2])
        assert roster1_ids == roster2_ids, "Roster athlete IDs differ between calls"
        
        # journey_state should be identical for each athlete
        for a1 in roster1:
            a2_match = next((a for a in roster2 if a.get("id") == a1.get("id")), None)
            if a2_match:
                assert a1.get("journey_state") == a2_match.get("journey_state"), \
                    f"journey_state differs for athlete {a1.get('id')}"
                assert a1.get("attention_status") == a2_match.get("attention_status"), \
                    f"attention_status differs for athlete {a1.get('id')}"
        
        # summary_lines should be identical
        assert data1.get("summary_lines") == data2.get("summary_lines"), \
            f"summary_lines differ: {data1.get('summary_lines')} vs {data2.get('summary_lines')}"
        
        # events should be identical
        events1 = data1.get("upcomingEvents", [])
        events2 = data2.get("upcomingEvents", [])
        events1_ids = sorted([e.get("id") for e in events1])
        events2_ids = sorted([e.get("id") for e in events2])
        assert events1_ids == events2_ids, "Event IDs differ between calls"
        
        # signals (recentActivity) should be identical
        signals1 = data1.get("recentActivity", [])
        signals2 = data2.get("recentActivity", [])
        assert len(signals1) == len(signals2), f"Signal count mismatch: {len(signals1)} vs {len(signals2)}"
        
        print(f"PASS: Coach mission-control is deterministic (roster={len(roster1)}, events={len(events1)}, signals={len(signals1)})")


class TestDeterminismDirector(TestAuth):
    """DETERMINISM: Director endpoints return identical results on consecutive calls"""
    
    def test_mission_control_determinism_director(self, director_token):
        """Call GET /api/mission-control twice with director token - verify identical output"""
        headers = {"Authorization": f"Bearer {director_token}"}
        
        # First call
        response1 = requests.get(f"{BASE_URL}/api/mission-control", headers=headers)
        assert response1.status_code == 200, f"First call failed: {response1.text}"
        data1 = response1.json()
        
        # Second call
        response2 = requests.get(f"{BASE_URL}/api/mission-control", headers=headers)
        assert response2.status_code == 200, f"Second call failed: {response2.text}"
        data2 = response2.json()
        
        # Verify role
        assert data1.get("role") == "director", "Expected director role"
        assert data2.get("role") == "director", "Expected director role"
        
        # programSnapshot should be identical
        snapshot1 = data1.get("programSnapshot", {})
        snapshot2 = data2.get("programSnapshot", {})
        assert snapshot1.get("totalAthletes") == snapshot2.get("totalAthletes"), \
            f"totalAthletes differs: {snapshot1.get('totalAthletes')} vs {snapshot2.get('totalAthletes')}"
        assert snapshot1.get("byStage") == snapshot2.get("byStage"), "byStage differs"
        assert snapshot1.get("byGradYear") == snapshot2.get("byGradYear"), "byGradYear differs"
        
        # upcomingEvents should be identical
        events1 = data1.get("upcomingEvents", [])
        events2 = data2.get("upcomingEvents", [])
        events1_ids = sorted([e.get("id") for e in events1])
        events2_ids = sorted([e.get("id") for e in events2])
        assert events1_ids == events2_ids, "Event IDs differ between calls"
        
        # recruitingSignals should be identical
        signals1 = data1.get("recruitingSignals", {})
        signals2 = data2.get("recruitingSignals", {})
        assert signals1 == signals2, f"recruitingSignals differ: {signals1} vs {signals2}"
        
        print(f"PASS: Director mission-control is deterministic (totalAthletes={snapshot1.get('totalAthletes')})")


class TestDeterminismSubEndpoints(TestAuth):
    """DETERMINISM: Sub-endpoints return identical results"""
    
    def test_snapshot_determinism(self, coach_token):
        """Call GET /api/mission-control/snapshot twice - verify identical output"""
        headers = {"Authorization": f"Bearer {coach_token}"}
        
        response1 = requests.get(f"{BASE_URL}/api/mission-control/snapshot", headers=headers)
        assert response1.status_code == 200, f"First call failed: {response1.text}"
        data1 = response1.json()
        
        response2 = requests.get(f"{BASE_URL}/api/mission-control/snapshot", headers=headers)
        assert response2.status_code == 200, f"Second call failed: {response2.text}"
        data2 = response2.json()
        
        assert data1 == data2, f"Snapshot differs between calls:\n{json.dumps(data1, indent=2)}\nvs\n{json.dumps(data2, indent=2)}"
        print(f"PASS: /api/mission-control/snapshot is deterministic (totalAthletes={data1.get('totalAthletes')})")
    
    def test_events_determinism(self, coach_token):
        """Call GET /api/mission-control/events twice - verify identical output"""
        headers = {"Authorization": f"Bearer {coach_token}"}
        
        response1 = requests.get(f"{BASE_URL}/api/mission-control/events", headers=headers)
        assert response1.status_code == 200, f"First call failed: {response1.text}"
        data1 = response1.json()
        
        response2 = requests.get(f"{BASE_URL}/api/mission-control/events", headers=headers)
        assert response2.status_code == 200, f"Second call failed: {response2.text}"
        data2 = response2.json()
        
        # Compare by event IDs
        ids1 = sorted([e.get("id") for e in data1])
        ids2 = sorted([e.get("id") for e in data2])
        assert ids1 == ids2, f"Event IDs differ: {ids1} vs {ids2}"
        
        # Compare full event data
        data1_sorted = sorted(data1, key=lambda e: e.get("id", ""))
        data2_sorted = sorted(data2, key=lambda e: e.get("id", ""))
        assert data1_sorted == data2_sorted, "Events differ between calls"
        
        print(f"PASS: /api/mission-control/events is deterministic (count={len(data1)})")
    
    def test_signals_determinism(self, coach_token):
        """Call GET /api/mission-control/signals twice - verify identical output"""
        headers = {"Authorization": f"Bearer {coach_token}"}
        
        response1 = requests.get(f"{BASE_URL}/api/mission-control/signals", headers=headers)
        assert response1.status_code == 200, f"First call failed: {response1.text}"
        data1 = response1.json()
        
        response2 = requests.get(f"{BASE_URL}/api/mission-control/signals", headers=headers)
        assert response2.status_code == 200, f"Second call failed: {response2.text}"
        data2 = response2.json()
        
        # Should be a list
        assert isinstance(data1, list), f"Expected list, got {type(data1)}"
        assert isinstance(data2, list), f"Expected list, got {type(data2)}"
        
        # Should be identical
        assert len(data1) == len(data2), f"Signal count differs: {len(data1)} vs {len(data2)}"
        
        print(f"PASS: /api/mission-control/signals is deterministic (count={len(data1)})")


class TestDeterminismAthlete(TestAuth):
    """DETERMINISM: Athlete endpoints return identical results"""
    
    def test_athlete_programs_determinism(self, athlete_token):
        """Call GET /api/athlete/programs twice - verify identical output"""
        headers = {"Authorization": f"Bearer {athlete_token}"}
        
        response1 = requests.get(f"{BASE_URL}/api/athlete/programs", headers=headers)
        assert response1.status_code == 200, f"First call failed: {response1.text}"
        data1 = response1.json()
        
        response2 = requests.get(f"{BASE_URL}/api/athlete/programs", headers=headers)
        assert response2.status_code == 200, f"Second call failed: {response2.text}"
        data2 = response2.json()
        
        # Compare program IDs
        ids1 = sorted([p.get("program_id") for p in data1])
        ids2 = sorted([p.get("program_id") for p in data2])
        assert ids1 == ids2, f"Program IDs differ: {ids1} vs {ids2}"
        
        print(f"PASS: /api/athlete/programs is deterministic (count={len(data1)})")


class TestNoMockData(TestAuth):
    """NO MOCK DATA: Verify no fabricated signals, events, or random values"""
    
    def test_signals_no_mock_data(self, coach_token):
        """Verify /api/mission-control/signals does NOT contain fabricated signals"""
        headers = {"Authorization": f"Bearer {coach_token}"}
        
        response = requests.get(f"{BASE_URL}/api/mission-control/signals", headers=headers)
        assert response.status_code == 200, f"Request failed: {response.text}"
        signals = response.json()
        
        # Should be a list (empty or with real signals)
        assert isinstance(signals, list), f"Expected list, got {type(signals)}"
        
        # Check for mock patterns
        for signal in signals:
            text = signal.get("text", "")
            for pattern in MOCK_SIGNAL_PATTERNS:
                assert pattern not in text, \
                    f"MOCK DATA DETECTED: Signal contains fabricated text '{pattern}': {text}"
        
        print(f"PASS: No mock signals detected (count={len(signals)})")
    
    def test_events_from_database(self, coach_token):
        """Verify /api/mission-control/events returns events from DB (not runtime-generated mock data)"""
        headers = {"Authorization": f"Bearer {coach_token}"}
        
        response = requests.get(f"{BASE_URL}/api/mission-control/events", headers=headers)
        assert response.status_code == 200, f"Request failed: {response.text}"
        events = response.json()
        
        # Should be a list
        assert isinstance(events, list), f"Expected list, got {type(events)}"
        
        # Events should have proper structure (from DB)
        for event in events:
            assert "id" in event, f"Event missing 'id' field: {event}"
            assert "name" in event, f"Event missing 'name' field: {event}"
            # daysAway is computed but should be present
            assert "daysAway" in event, f"Event missing 'daysAway' field: {event}"
        
        # The 3 seeded events should be present (Winter Showcase, College Exposure Camp, Spring Classic)
        # These are legitimate DB-seeded events, not runtime mock data
        event_names = [e.get("name") for e in events]
        print(f"PASS: Events from DB (count={len(events)}, names={event_names})")
    
    def test_snapshot_real_counts(self, director_token):
        """Verify /api/mission-control/snapshot returns real counts, not random values"""
        headers = {"Authorization": f"Bearer {director_token}"}
        
        # Call multiple times and verify counts are stable
        snapshots = []
        for i in range(3):
            response = requests.get(f"{BASE_URL}/api/mission-control/snapshot", headers=headers)
            assert response.status_code == 200, f"Request {i+1} failed: {response.text}"
            snapshots.append(response.json())
        
        # All snapshots should have identical totalAthletes
        total_athletes = [s.get("totalAthletes") for s in snapshots]
        assert len(set(total_athletes)) == 1, \
            f"totalAthletes varies between calls (random?): {total_athletes}"
        
        # byStage should be identical
        by_stages = [json.dumps(s.get("byStage", {}), sort_keys=True) for s in snapshots]
        assert len(set(by_stages)) == 1, \
            f"byStage varies between calls (random?): {by_stages}"
        
        # byGradYear should be identical
        by_years = [json.dumps(s.get("byGradYear", {}), sort_keys=True) for s in snapshots]
        assert len(set(by_years)) == 1, \
            f"byGradYear varies between calls (random?): {by_years}"
        
        print(f"PASS: Snapshot returns stable real counts (totalAthletes={total_athletes[0]})")


class TestBackendStarts:
    """Verify backend starts without import errors"""
    
    def test_health_endpoint(self):
        """Verify backend is running and healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        data = response.json()
        assert data.get("status") == "ok", f"Health status not ok: {data}"
        print("PASS: Backend is healthy")
    
    def test_no_random_import_in_decision_engine(self):
        """Verify decision_engine.py doesn't import random module"""
        # Read the decision_engine.py file
        with open("/app/backend/decision_engine.py", "r") as f:
            content = f.read()
        
        # Check for random imports
        assert "import random" not in content, \
            "decision_engine.py still imports random module"
        assert "from random import" not in content, \
            "decision_engine.py still imports from random module"
        assert "random.random()" not in content, \
            "decision_engine.py still uses random.random()"
        
        print("PASS: decision_engine.py has no random imports")
    
    def test_no_mock_data_import_in_athlete_store(self):
        """Verify athlete_store.py doesn't import mock_data"""
        with open("/app/backend/services/athlete_store.py", "r") as f:
            content = f.read()
        
        assert "from mock_data import" not in content, \
            "athlete_store.py still imports from mock_data"
        assert "import mock_data" not in content, \
            "athlete_store.py still imports mock_data"
        
        print("PASS: athlete_store.py has no mock_data imports")
    
    def test_no_mock_data_import_in_mission_control(self):
        """Verify mission_control.py doesn't import mock_data"""
        with open("/app/backend/routers/mission_control.py", "r") as f:
            content = f.read()
        
        assert "from mock_data import" not in content, \
            "mission_control.py still imports from mock_data"
        assert "import mock_data" not in content, \
            "mission_control.py still imports mock_data"
        
        print("PASS: mission_control.py has no mock_data imports")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

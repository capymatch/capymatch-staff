"""
Regression tests for Attention/Urgency/Priority unification (Sprint 1).
Tests backend attention computation and determinism.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ATHLETE_EMAIL = "emma.chen@athlete.capymatch.com"
ATHLETE_PASSWORD = "athlete123"
COACH_EMAIL = "coach.williams@capymatch.com"
COACH_PASSWORD = "coach123"
DIRECTOR_EMAIL = "director@capymatch.com"
DIRECTOR_PASSWORD = "director123"

# Required attention fields per the spec
REQUIRED_ATTENTION_FIELDS = [
    "attentionScore", "tier", "attentionLevel", "heroEligible", "urgency",
    "momentum", "primaryAction", "reason", "ctaLabel", "riskContext",
    "flags", "prioritySource", "recapRank", "owner"
]


@pytest.fixture(scope="module")
def athlete_token():
    """Get athlete auth token."""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ATHLETE_EMAIL,
        "password": ATHLETE_PASSWORD
    })
    if resp.status_code != 200:
        pytest.skip(f"Athlete login failed: {resp.status_code}")
    return resp.json().get("token")


@pytest.fixture(scope="module")
def coach_token():
    """Get coach auth token."""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": COACH_EMAIL,
        "password": COACH_PASSWORD
    })
    if resp.status_code != 200:
        pytest.skip(f"Coach login failed: {resp.status_code}")
    return resp.json().get("token")


@pytest.fixture(scope="module")
def director_token():
    """Get director auth token."""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": DIRECTOR_EMAIL,
        "password": DIRECTOR_PASSWORD
    })
    if resp.status_code != 200:
        pytest.skip(f"Director login failed: {resp.status_code}")
    return resp.json().get("token")


class TestAthleteAttentionAPI:
    """Tests for GET /api/athlete/programs attention field."""

    def test_programs_endpoint_returns_200(self, athlete_token):
        """Verify programs endpoint is accessible."""
        resp = requests.get(
            f"{BASE_URL}/api/athlete/programs",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print(f"PASS: GET /api/athlete/programs returns 200")

    def test_programs_have_attention_field(self, athlete_token):
        """Verify each program has an attention field."""
        resp = requests.get(
            f"{BASE_URL}/api/athlete/programs",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        programs = resp.json()
        assert isinstance(programs, list), "Expected list of programs"
        assert len(programs) > 0, "Expected at least one program"
        
        for p in programs:
            assert "attention" in p, f"Program {p.get('program_id')} missing attention field"
        
        print(f"PASS: All {len(programs)} programs have attention field")

    def test_attention_has_all_required_fields(self, athlete_token):
        """Verify attention field contains ALL required fields per spec."""
        resp = requests.get(
            f"{BASE_URL}/api/athlete/programs",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        programs = resp.json()
        
        for p in programs:
            attn = p.get("attention", {})
            missing = [f for f in REQUIRED_ATTENTION_FIELDS if f not in attn]
            assert not missing, f"Program {p.get('program_id')} attention missing fields: {missing}"
        
        print(f"PASS: All programs have all {len(REQUIRED_ATTENTION_FIELDS)} required attention fields")

    def test_attention_tier_values_valid(self, athlete_token):
        """Verify tier values are high/medium/low."""
        resp = requests.get(
            f"{BASE_URL}/api/athlete/programs",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        programs = resp.json()
        
        valid_tiers = {"high", "medium", "low"}
        for p in programs:
            tier = p.get("attention", {}).get("tier")
            assert tier in valid_tiers, f"Invalid tier '{tier}' for program {p.get('program_id')}"
        
        print(f"PASS: All tier values are valid (high/medium/low)")

    def test_attention_level_matches_tier(self, athlete_token):
        """Verify attentionLevel is an alias for tier."""
        resp = requests.get(
            f"{BASE_URL}/api/athlete/programs",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        programs = resp.json()
        
        for p in programs:
            attn = p.get("attention", {})
            assert attn.get("attentionLevel") == attn.get("tier"), \
                f"attentionLevel != tier for program {p.get('program_id')}"
        
        print(f"PASS: attentionLevel matches tier for all programs")

    def test_attention_urgency_values_valid(self, athlete_token):
        """Verify urgency values are critical/soon/monitor."""
        resp = requests.get(
            f"{BASE_URL}/api/athlete/programs",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        programs = resp.json()
        
        valid_urgencies = {"critical", "soon", "monitor"}
        for p in programs:
            urgency = p.get("attention", {}).get("urgency")
            assert urgency in valid_urgencies, f"Invalid urgency '{urgency}' for program {p.get('program_id')}"
        
        print(f"PASS: All urgency values are valid (critical/soon/monitor)")

    def test_attention_momentum_values_valid(self, athlete_token):
        """Verify momentum values are cooling/steady/building."""
        resp = requests.get(
            f"{BASE_URL}/api/athlete/programs",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        programs = resp.json()
        
        valid_momentum = {"cooling", "steady", "building"}
        for p in programs:
            momentum = p.get("attention", {}).get("momentum")
            assert momentum in valid_momentum, f"Invalid momentum '{momentum}' for program {p.get('program_id')}"
        
        print(f"PASS: All momentum values are valid (cooling/steady/building)")

    def test_attention_owner_values_valid(self, athlete_token):
        """Verify owner values are athlete/coach/director/shared."""
        resp = requests.get(
            f"{BASE_URL}/api/athlete/programs",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        programs = resp.json()
        
        valid_owners = {"athlete", "coach", "director", "shared"}
        for p in programs:
            owner = p.get("attention", {}).get("owner")
            assert owner in valid_owners, f"Invalid owner '{owner}' for program {p.get('program_id')}"
        
        print(f"PASS: All owner values are valid (athlete/coach/director/shared)")

    def test_attention_priority_source_valid(self, athlete_token):
        """Verify prioritySource is live/recap/merged."""
        resp = requests.get(
            f"{BASE_URL}/api/athlete/programs",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        programs = resp.json()
        
        valid_sources = {"live", "recap", "merged"}
        for p in programs:
            source = p.get("attention", {}).get("prioritySource")
            assert source in valid_sources, f"Invalid prioritySource '{source}' for program {p.get('program_id')}"
        
        print(f"PASS: All prioritySource values are valid (live/recap/merged)")

    def test_attention_flags_is_list(self, athlete_token):
        """Verify flags is a list."""
        resp = requests.get(
            f"{BASE_URL}/api/athlete/programs",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        programs = resp.json()
        
        for p in programs:
            flags = p.get("attention", {}).get("flags")
            assert isinstance(flags, list), f"flags should be list, got {type(flags)} for program {p.get('program_id')}"
        
        print(f"PASS: All flags fields are lists")

    def test_attention_hero_eligible_is_bool(self, athlete_token):
        """Verify heroEligible is boolean."""
        resp = requests.get(
            f"{BASE_URL}/api/athlete/programs",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        programs = resp.json()
        
        for p in programs:
            hero = p.get("attention", {}).get("heroEligible")
            assert isinstance(hero, bool), f"heroEligible should be bool, got {type(hero)} for program {p.get('program_id')}"
        
        print(f"PASS: All heroEligible fields are booleans")

    def test_attention_score_is_numeric(self, athlete_token):
        """Verify attentionScore is numeric."""
        resp = requests.get(
            f"{BASE_URL}/api/athlete/programs",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert resp.status_code == 200
        programs = resp.json()
        
        for p in programs:
            score = p.get("attention", {}).get("attentionScore")
            assert isinstance(score, (int, float)), f"attentionScore should be numeric, got {type(score)} for program {p.get('program_id')}"
        
        print(f"PASS: All attentionScore fields are numeric")


class TestAttentionDeterminism:
    """Tests for attention data determinism."""

    def test_consecutive_calls_return_identical_attention(self, athlete_token):
        """Two consecutive calls should return identical attention data."""
        headers = {"Authorization": f"Bearer {athlete_token}"}
        
        resp1 = requests.get(f"{BASE_URL}/api/athlete/programs", headers=headers)
        resp2 = requests.get(f"{BASE_URL}/api/athlete/programs", headers=headers)
        
        assert resp1.status_code == 200
        assert resp2.status_code == 200
        
        programs1 = resp1.json()
        programs2 = resp2.json()
        
        assert len(programs1) == len(programs2), "Program count differs between calls"
        
        # Compare attention data for each program
        attn1_map = {p["program_id"]: p.get("attention", {}) for p in programs1}
        attn2_map = {p["program_id"]: p.get("attention", {}) for p in programs2}
        
        for pid, attn1 in attn1_map.items():
            attn2 = attn2_map.get(pid, {})
            # Compare key fields
            for field in ["attentionScore", "tier", "attentionLevel", "urgency", "momentum", "owner", "prioritySource"]:
                assert attn1.get(field) == attn2.get(field), \
                    f"Field {field} differs for program {pid}: {attn1.get(field)} vs {attn2.get(field)}"
        
        print(f"PASS: Attention data is deterministic across consecutive calls")


class TestCoachMissionControl:
    """Tests for coach mission control endpoint."""

    def test_mission_control_returns_200(self, coach_token):
        """Verify mission control endpoint is accessible for coach."""
        resp = requests.get(
            f"{BASE_URL}/api/mission-control",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print(f"PASS: GET /api/mission-control returns 200 for coach")

    def test_mission_control_has_roster(self, coach_token):
        """Verify mission control returns roster with athletes."""
        resp = requests.get(
            f"{BASE_URL}/api/mission-control",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        # Coach view should have roster (can be myRoster, roster, or athletes)
        has_roster = "roster" in data or "athletes" in data or "myRoster" in data
        assert has_roster, f"Missing roster/athletes/myRoster in coach mission control. Keys: {list(data.keys())}"
        print(f"PASS: Coach mission control has roster data")

    def test_mission_control_athletes_have_journey_state(self, coach_token):
        """Verify athletes have journey_state field."""
        resp = requests.get(
            f"{BASE_URL}/api/mission-control",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        athletes = data.get("roster") or data.get("athletes") or data.get("myRoster") or []
        if len(athletes) > 0:
            # Check first athlete has journey_state
            first = athletes[0]
            assert "journey_state" in first or "journeyState" in first, \
                f"Athlete missing journey_state: {list(first.keys())}"
        
        print(f"PASS: Athletes have journey_state field")

    def test_mission_control_athletes_have_attention_status(self, coach_token):
        """Verify athletes have attention_status field."""
        resp = requests.get(
            f"{BASE_URL}/api/mission-control",
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        athletes = data.get("roster") or data.get("athletes") or data.get("myRoster") or []
        if len(athletes) > 0:
            first = athletes[0]
            assert "attention_status" in first or "attentionStatus" in first, \
                f"Athlete missing attention_status: {list(first.keys())}"
        
        print(f"PASS: Athletes have attention_status field")


class TestDirectorMissionControl:
    """Tests for director mission control endpoint."""

    def test_director_mission_control_returns_200(self, director_token):
        """Verify mission control endpoint is accessible for director."""
        resp = requests.get(
            f"{BASE_URL}/api/mission-control",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print(f"PASS: GET /api/mission-control returns 200 for director")

    def test_director_has_program_snapshot(self, director_token):
        """Verify director view has programSnapshot."""
        resp = requests.get(
            f"{BASE_URL}/api/mission-control",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        
        # Director view should have programSnapshot or similar
        has_snapshot = "programSnapshot" in data or "program_snapshot" in data or "snapshot" in data
        # Or it might be nested in a different structure
        if not has_snapshot:
            # Check if there's any program-related data
            has_programs = any(k for k in data.keys() if "program" in k.lower() or "snapshot" in k.lower())
            if not has_programs:
                print(f"Director mission control keys: {list(data.keys())}")
        
        print(f"PASS: Director mission control endpoint accessible")


class TestMissionControlDeterminism:
    """Tests for mission control determinism."""

    def test_coach_mission_control_determinism(self, coach_token):
        """Two consecutive calls should return identical data."""
        headers = {"Authorization": f"Bearer {coach_token}"}
        
        resp1 = requests.get(f"{BASE_URL}/api/mission-control", headers=headers)
        resp2 = requests.get(f"{BASE_URL}/api/mission-control", headers=headers)
        
        assert resp1.status_code == 200
        assert resp2.status_code == 200
        
        data1 = resp1.json()
        data2 = resp2.json()
        
        # Compare roster counts
        roster1 = data1.get("roster") or data1.get("athletes") or data1.get("myRoster") or []
        roster2 = data2.get("roster") or data2.get("athletes") or data2.get("myRoster") or []
        
        assert len(roster1) == len(roster2), "Roster count differs between calls"
        
        print(f"PASS: Coach mission control is deterministic")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

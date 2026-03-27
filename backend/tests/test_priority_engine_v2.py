"""
Priority Engine v2 Tests - Comprehensive testing for the canonical priority engine.

Tests cover:
- All new Priority Engine v2 fields in API responses
- Legacy alias backward compatibility
- Valid enum values for priority_band, attention_status, urgency, momentum, opportunity_tier
- Determinism: consecutive calls return identical results
- Business logic: stale_flag, blocker_flag, overdue_flag, hero_eligible
- why_this_is_priority non-empty for critical/high band programs
- Single program endpoint consistency
- Dashboard spotlight programs have pipeline_stage and board_group
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Valid enum values per Priority Engine v2 contract
VALID_PRIORITY_BANDS = {'critical', 'high', 'medium', 'low'}
VALID_ATTENTION_STATUSES = {'blocker', 'at_risk', 'needs_action', 'on_track'}
VALID_URGENCY_VALUES = {'critical', 'soon', 'monitor'}
VALID_MOMENTUM_VALUES = {'cooling', 'steady', 'building'}
VALID_OPPORTUNITY_TIERS = {'high_value', 'growing', 'early', 'inactive'}


# Session-scoped fixtures to avoid rate limiting
@pytest.fixture(scope="module")
def athlete_token():
    """Login as athlete once per module."""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "emma.chen@athlete.capymatch.com", "password": "athlete123"}
    )
    assert response.status_code == 200, f"Athlete login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def athlete_headers(athlete_token):
    """Auth headers for athlete."""
    return {"Authorization": f"Bearer {athlete_token}"}


@pytest.fixture(scope="module")
def coach_token():
    """Login as coach once per module."""
    time.sleep(1)  # Avoid rate limiting
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "coach.williams@capymatch.com", "password": "coach123"}
    )
    assert response.status_code == 200, f"Coach login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def coach_headers(coach_token):
    """Auth headers for coach."""
    return {"Authorization": f"Bearer {coach_token}"}


@pytest.fixture(scope="module")
def director_token():
    """Login as director once per module."""
    time.sleep(1)  # Avoid rate limiting
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "director@capymatch.com", "password": "director123"}
    )
    assert response.status_code == 200, f"Director login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def director_headers(director_token):
    """Auth headers for director."""
    return {"Authorization": f"Bearer {director_token}"}


@pytest.fixture(scope="module")
def athlete_programs(athlete_headers):
    """Fetch programs once per module."""
    response = requests.get(f"{BASE_URL}/api/athlete/programs", headers=athlete_headers)
    assert response.status_code == 200
    return response.json()


class TestPriorityEngineV2:
    """Priority Engine v2 API tests for athlete programs endpoint."""

    def test_programs_endpoint_returns_attention_object(self, athlete_programs):
        """GET /api/athlete/programs returns attention object for each program."""
        assert len(athlete_programs) > 0, "No programs returned"
        
        for p in athlete_programs:
            assert "attention" in p, f"Program {p.get('university_name')} missing attention object"
            assert p["attention"] is not None, f"Program {p.get('university_name')} has null attention"

    def test_attention_has_all_new_priority_engine_v2_fields(self, athlete_programs):
        """Verify all new Priority Engine v2 fields are present in attention object."""
        required_new_fields = [
            'priority_score', 'priority_band', 'attention_status', 'urgency',
            'momentum', 'opportunity_tier', 'stale_flag', 'blocker_flag',
            'overdue_flag', 'hero_eligible', 'primary_action', 'why_this_is_priority'
        ]
        
        for p in athlete_programs:
            attention = p.get("attention", {})
            for field in required_new_fields:
                assert field in attention, f"Program {p.get('university_name')} missing field: {field}"

    def test_attention_has_legacy_aliases_for_backward_compat(self, athlete_programs):
        """Verify legacy aliases are present for backward compatibility."""
        legacy_aliases = [
            'attentionScore', 'tier', 'attentionLevel', 'heroEligible',
            'primaryAction', 'ctaLabel'
        ]
        
        for p in athlete_programs:
            attention = p.get("attention", {})
            for alias in legacy_aliases:
                assert alias in attention, f"Program {p.get('university_name')} missing legacy alias: {alias}"

    def test_priority_band_values_are_valid(self, athlete_programs):
        """priority_band values must be: critical, high, medium, or low."""
        for p in athlete_programs:
            band = p.get("attention", {}).get("priority_band")
            assert band in VALID_PRIORITY_BANDS, \
                f"Program {p.get('university_name')} has invalid priority_band: {band}"

    def test_attention_status_values_are_valid(self, athlete_programs):
        """attention_status values must be: blocker, at_risk, needs_action, or on_track."""
        for p in athlete_programs:
            status = p.get("attention", {}).get("attention_status")
            assert status in VALID_ATTENTION_STATUSES, \
                f"Program {p.get('university_name')} has invalid attention_status: {status}"

    def test_urgency_values_are_valid(self, athlete_programs):
        """urgency values must be: critical, soon, or monitor."""
        for p in athlete_programs:
            urgency = p.get("attention", {}).get("urgency")
            assert urgency in VALID_URGENCY_VALUES, \
                f"Program {p.get('university_name')} has invalid urgency: {urgency}"

    def test_momentum_values_are_valid(self, athlete_programs):
        """momentum values must be: cooling, steady, or building."""
        for p in athlete_programs:
            momentum = p.get("attention", {}).get("momentum")
            assert momentum in VALID_MOMENTUM_VALUES, \
                f"Program {p.get('university_name')} has invalid momentum: {momentum}"

    def test_opportunity_tier_values_are_valid(self, athlete_programs):
        """opportunity_tier values must be: high_value, growing, early, or inactive."""
        for p in athlete_programs:
            tier = p.get("attention", {}).get("opportunity_tier")
            assert tier in VALID_OPPORTUNITY_TIERS, \
                f"Program {p.get('university_name')} has invalid opportunity_tier: {tier}"

    def test_determinism_consecutive_calls_identical(self, athlete_headers):
        """Two consecutive calls return identical priority_score and priority_band."""
        response1 = requests.get(f"{BASE_URL}/api/athlete/programs", headers=athlete_headers)
        assert response1.status_code == 200
        programs1 = response1.json()
        
        time.sleep(0.5)  # Small delay
        
        response2 = requests.get(f"{BASE_URL}/api/athlete/programs", headers=athlete_headers)
        assert response2.status_code == 200
        programs2 = response2.json()
        
        # Build maps for comparison
        map1 = {p["program_id"]: (p["attention"]["priority_score"], p["attention"]["priority_band"]) 
                for p in programs1}
        map2 = {p["program_id"]: (p["attention"]["priority_score"], p["attention"]["priority_band"]) 
                for p in programs2}
        
        for pid, (score1, band1) in map1.items():
            assert pid in map2, f"Program {pid} missing in second call"
            score2, band2 = map2[pid]
            assert score1 == score2, f"Program {pid} score changed: {score1} -> {score2}"
            assert band1 == band2, f"Program {pid} band changed: {band1} -> {band2}"

    def test_high_stage_programs_have_high_value_opportunity_tier(self, athlete_programs):
        """Programs with campus_visit/offer pipeline_stage should have high_value opportunity_tier."""
        high_stages = {'campus_visit', 'offer', 'committed'}
        for p in athlete_programs:
            stage = p.get("pipeline_stage")
            tier = p.get("attention", {}).get("opportunity_tier")
            if stage in high_stages:
                assert tier == "high_value", \
                    f"Program {p.get('university_name')} with stage {stage} should have high_value tier, got {tier}"

    def test_stale_flag_is_boolean(self, athlete_programs):
        """stale_flag should be a boolean for all programs."""
        for p in athlete_programs:
            stale = p.get("attention", {}).get("stale_flag")
            assert isinstance(stale, bool), \
                f"Program {p.get('university_name')} stale_flag is not boolean: {stale}"

    def test_blocker_flag_is_boolean_and_consistent(self, athlete_programs):
        """blocker_flag should be boolean and consistent with attention_status."""
        for p in athlete_programs:
            blocker = p.get("attention", {}).get("blocker_flag")
            assert isinstance(blocker, bool), \
                f"Program {p.get('university_name')} blocker_flag is not boolean: {blocker}"
        
        # Programs with blocker_flag should have blocker attention_status
        blocker_programs = [p for p in athlete_programs if p.get("attention", {}).get("blocker_flag") is True]
        for p in blocker_programs:
            status = p.get("attention", {}).get("attention_status")
            assert status == "blocker", \
                f"Program {p.get('university_name')} with blocker_flag should have blocker status, got {status}"

    def test_overdue_flag_is_boolean(self, athlete_programs):
        """overdue_flag should be a boolean for all programs."""
        for p in athlete_programs:
            overdue = p.get("attention", {}).get("overdue_flag")
            assert isinstance(overdue, bool), \
                f"Program {p.get('university_name')} overdue_flag is not boolean: {overdue}"

    def test_hero_eligible_for_critical_high_band(self, athlete_programs):
        """Critical/high band programs should be hero_eligible=True."""
        for p in athlete_programs:
            band = p.get("attention", {}).get("priority_band")
            hero = p.get("attention", {}).get("hero_eligible")
            
            if band in ("critical", "high"):
                assert hero is True, \
                    f"Program {p.get('university_name')} with {band} band should be hero_eligible"

    def test_why_this_is_priority_non_empty_for_critical_high(self, athlete_programs):
        """why_this_is_priority should be non-empty for critical/high band programs."""
        for p in athlete_programs:
            band = p.get("attention", {}).get("priority_band")
            why = p.get("attention", {}).get("why_this_is_priority", "")
            
            if band in ("critical", "high"):
                assert why and len(why.strip()) > 0, \
                    f"Program {p.get('university_name')} with {band} band should have why_this_is_priority"

    def test_single_program_has_pipeline_stage_and_board_group(self, athlete_headers, athlete_programs):
        """GET /api/athlete/programs/{id} should have pipeline_stage and board_group."""
        assert len(athlete_programs) > 0
        
        program_id = athlete_programs[0]["program_id"]
        
        # Get single program
        response = requests.get(f"{BASE_URL}/api/athlete/programs/{program_id}", headers=athlete_headers)
        assert response.status_code == 200
        single = response.json()
        
        # Verify pipeline_stage and board_group are present
        assert "pipeline_stage" in single, "Single program missing pipeline_stage"
        assert "board_group" in single, "Single program missing board_group"

    def test_dashboard_spotlight_has_pipeline_stage_and_board_group(self, athlete_headers):
        """GET /api/athlete/dashboard spotlight programs have pipeline_stage and board_group."""
        response = requests.get(f"{BASE_URL}/api/athlete/dashboard", headers=athlete_headers)
        assert response.status_code == 200
        dashboard = response.json()
        
        spotlight = dashboard.get("spotlight", [])
        for p in spotlight:
            assert "pipeline_stage" in p, f"Spotlight program {p.get('university_name')} missing pipeline_stage"
            assert "board_group" in p, f"Spotlight program {p.get('university_name')} missing board_group"

    def test_legacy_tier_alias_maps_correctly(self, athlete_programs):
        """Legacy 'tier' alias should map critical -> high for backward compat."""
        for p in athlete_programs:
            band = p.get("attention", {}).get("priority_band")
            tier = p.get("attention", {}).get("tier")
            
            # Per priority_engine.py: tier = priority_band if priority_band != "critical" else "high"
            if band == "critical":
                assert tier == "high", \
                    f"Program {p.get('university_name')} critical band should have tier=high, got {tier}"
            else:
                assert tier == band, \
                    f"Program {p.get('university_name')} tier should match band, got tier={tier}, band={band}"

    def test_attention_score_matches_priority_score(self, athlete_programs):
        """Legacy attentionScore should equal priority_score."""
        for p in athlete_programs:
            priority_score = p.get("attention", {}).get("priority_score")
            attention_score = p.get("attention", {}).get("attentionScore")
            
            assert priority_score == attention_score, \
                f"Program {p.get('university_name')} priority_score ({priority_score}) != attentionScore ({attention_score})"


class TestCoachMissionControl:
    """Verify Coach Mission Control still functions correctly."""

    def test_coach_mission_control_loads(self, coach_headers):
        """Coach mission control endpoint returns 200."""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=coach_headers)
        assert response.status_code == 200, f"Coach mission control failed: {response.text}"
        data = response.json()
        assert "priorities" in data, "Mission control missing priorities"
        assert "todays_summary" in data, "Mission control missing todays_summary"

    def test_coach_inbox_loads(self, coach_headers):
        """Coach inbox endpoint returns 200."""
        response = requests.get(f"{BASE_URL}/api/coach-inbox", headers=coach_headers)
        assert response.status_code == 200, f"Coach inbox failed: {response.text}"


class TestDirectorAccess:
    """Verify Director access still works."""

    def test_director_mission_control_loads(self, director_headers):
        """Director mission control endpoint returns 200."""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=director_headers)
        assert response.status_code == 200, f"Director mission control failed: {response.text}"

    def test_director_inbox_loads(self, director_headers):
        """Director inbox endpoint returns 200."""
        response = requests.get(f"{BASE_URL}/api/director-inbox", headers=director_headers)
        assert response.status_code == 200, f"Director inbox failed: {response.text}"

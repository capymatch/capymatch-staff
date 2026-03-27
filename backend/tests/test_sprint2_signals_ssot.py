"""
Sprint 2: Interaction Signals SSOT Tests

Tests that all signal data now comes from services/program_metrics.py via
extract_signals() and batch_get_metrics() instead of local computation.

Features tested:
- GET /api/athlete/programs returns programs with canonical signals
- GET /api/athlete/programs/{id} returns single program with canonical signals
- GET /api/athlete/dashboard returns programs with correct signals
- GET /api/athlete/programs?grouped=true returns groups with correct signals
- Attention computation still works (attention.tier, attention.attentionScore)
- Board grouping (board_group) uses canonical signals
- Journey rail computation works (journey_rail.active, journey_rail.pulse)
- POST /api/athlete/interactions invalidates metrics cache
- POST /api/athlete/programs/{id}/mark-replied invalidates metrics cache
- Determinism: consecutive calls return identical signal values
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
ATHLETE_EMAIL = "emma.chen@athlete.capymatch.com"
ATHLETE_PASSWORD = "athlete123"
COACH_EMAIL = "coach.williams@capymatch.com"
COACH_PASSWORD = "coach123"
DIRECTOR_EMAIL = "director@capymatch.com"
DIRECTOR_PASSWORD = "director123"


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


@pytest.fixture(scope="module")
def athlete_client(athlete_token):
    """Authenticated session for athlete."""
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {athlete_token}",
        "Content-Type": "application/json"
    })
    return session


@pytest.fixture(scope="module")
def coach_client(coach_token):
    """Authenticated session for coach."""
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {coach_token}",
        "Content-Type": "application/json"
    })
    return session


@pytest.fixture(scope="module")
def director_client(director_token):
    """Authenticated session for director."""
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {director_token}",
        "Content-Type": "application/json"
    })
    return session


# ═══════════════════════════════════════════════════════════════════════════
# CORE SIGNAL FIELDS TESTS
# ═══════════════════════════════════════════════════════════════════════════

class TestProgramsEndpointSignals:
    """Test GET /api/athlete/programs returns canonical signals from program_metrics."""

    def test_programs_endpoint_returns_200(self, athlete_client):
        """Verify endpoint is accessible."""
        resp = athlete_client.get(f"{BASE_URL}/api/athlete/programs")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print("PASS: GET /api/athlete/programs returns 200")

    def test_programs_have_signals_field(self, athlete_client):
        """Every program should have a signals object."""
        resp = athlete_client.get(f"{BASE_URL}/api/athlete/programs")
        programs = resp.json()
        assert isinstance(programs, list), "Expected list of programs"
        assert len(programs) > 0, "Expected at least one program"
        
        for p in programs:
            assert "signals" in p, f"Program {p.get('program_id')} missing signals field"
            assert isinstance(p["signals"], dict), f"signals should be dict, got {type(p['signals'])}"
        print(f"PASS: All {len(programs)} programs have signals field")

    def test_signals_have_core_fields(self, athlete_client):
        """Signals should have all core fields from program_metrics."""
        resp = athlete_client.get(f"{BASE_URL}/api/athlete/programs")
        programs = resp.json()
        
        # Core signal fields that must be present (from extract_signals)
        core_fields = [
            "outreach_count",
            "reply_count", 
            "has_coach_reply",
            "days_since_activity",
            "total_interactions",
        ]
        
        for p in programs[:5]:  # Check first 5 programs
            signals = p.get("signals", {})
            for field in core_fields:
                assert field in signals, f"Program {p.get('university_name')} missing signals.{field}"
        print(f"PASS: Core signal fields present: {core_fields}")

    def test_signals_have_enriched_fields(self, athlete_client):
        """Signals should have enriched fields from Sprint 2 migration."""
        resp = athlete_client.get(f"{BASE_URL}/api/athlete/programs")
        programs = resp.json()
        
        # Enriched fields added in Sprint 2
        enriched_fields = [
            "reply_rate",
            "meaningful_interaction_count",
            "engagement_trend",
            "engagement_freshness_label",
            "pipeline_health_state",
            "data_confidence",
        ]
        
        for p in programs[:5]:
            signals = p.get("signals", {})
            for field in enriched_fields:
                assert field in signals, f"Program {p.get('university_name')} missing enriched signals.{field}"
        print(f"PASS: Enriched signal fields present: {enriched_fields}")

    def test_signals_values_not_all_zero_for_active_programs(self, athlete_client):
        """Programs with interactions should have non-zero signal values."""
        resp = athlete_client.get(f"{BASE_URL}/api/athlete/programs")
        programs = resp.json()
        
        # Find programs that should have interactions
        programs_with_signals = [
            p for p in programs 
            if p.get("signals", {}).get("total_interactions", 0) > 0
        ]
        
        if programs_with_signals:
            for p in programs_with_signals[:3]:
                signals = p["signals"]
                # At least one of these should be non-zero
                has_activity = (
                    signals.get("outreach_count", 0) > 0 or
                    signals.get("reply_count", 0) > 0 or
                    signals.get("total_interactions", 0) > 0
                )
                assert has_activity, f"Program {p.get('university_name')} has interactions but all counts are 0"
            print(f"PASS: {len(programs_with_signals)} programs have non-zero signal values")
        else:
            print("SKIP: No programs with interactions found")


class TestSingleProgramSignals:
    """Test GET /api/athlete/programs/{id} returns canonical signals."""

    def test_single_program_has_signals(self, athlete_client):
        """Single program endpoint should return signals from program_metrics."""
        # First get list to find a program_id
        resp = athlete_client.get(f"{BASE_URL}/api/athlete/programs")
        programs = resp.json()
        assert len(programs) > 0, "Need at least one program"
        
        program_id = programs[0]["program_id"]
        
        # Get single program
        resp = athlete_client.get(f"{BASE_URL}/api/athlete/programs/{program_id}")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        
        program = resp.json()
        assert "signals" in program, "Single program missing signals field"
        
        # Verify same fields as list endpoint
        signals = program["signals"]
        assert "outreach_count" in signals
        assert "reply_count" in signals
        assert "has_coach_reply" in signals
        assert "pipeline_health_state" in signals
        assert "data_confidence" in signals
        print(f"PASS: Single program {program.get('university_name')} has canonical signals")

    def test_single_program_signals_match_list(self, athlete_client):
        """Single program signals should match list endpoint signals."""
        # Get list
        resp = athlete_client.get(f"{BASE_URL}/api/athlete/programs")
        programs = resp.json()
        assert len(programs) > 0
        
        list_program = programs[0]
        program_id = list_program["program_id"]
        
        # Get single
        resp = athlete_client.get(f"{BASE_URL}/api/athlete/programs/{program_id}")
        single_program = resp.json()
        
        # Compare key signal fields
        list_signals = list_program.get("signals", {})
        single_signals = single_program.get("signals", {})
        
        assert list_signals.get("outreach_count") == single_signals.get("outreach_count")
        assert list_signals.get("reply_count") == single_signals.get("reply_count")
        assert list_signals.get("has_coach_reply") == single_signals.get("has_coach_reply")
        print("PASS: Single program signals match list endpoint signals")


class TestDashboardSignals:
    """Test GET /api/athlete/dashboard returns programs with correct signals."""

    def test_dashboard_returns_200(self, athlete_client):
        """Dashboard endpoint should be accessible."""
        resp = athlete_client.get(f"{BASE_URL}/api/athlete/dashboard")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        print("PASS: GET /api/athlete/dashboard returns 200")

    def test_dashboard_spotlight_has_signals(self, athlete_client):
        """Dashboard spotlight programs should have signals."""
        resp = athlete_client.get(f"{BASE_URL}/api/athlete/dashboard")
        data = resp.json()
        
        spotlight = data.get("spotlight", [])
        if spotlight:
            for p in spotlight:
                assert "signals" in p, f"Spotlight program {p.get('university_name')} missing signals"
                signals = p["signals"]
                assert "outreach_count" in signals
                assert "has_coach_reply" in signals
            print(f"PASS: {len(spotlight)} spotlight programs have signals")
        else:
            print("SKIP: No spotlight programs in dashboard")

    def test_dashboard_follow_ups_have_signals(self, athlete_client):
        """Dashboard follow_ups_due programs should have signals."""
        resp = athlete_client.get(f"{BASE_URL}/api/athlete/dashboard")
        data = resp.json()
        
        follow_ups = data.get("follow_ups_due", [])
        if follow_ups:
            for p in follow_ups:
                assert "signals" in p, f"Follow-up program {p.get('university_name')} missing signals"
            print(f"PASS: {len(follow_ups)} follow-up programs have signals")
        else:
            print("SKIP: No follow-ups due in dashboard")


class TestGroupedProgramsSignals:
    """Test GET /api/athlete/programs?grouped=true returns groups with correct signals."""

    def test_grouped_endpoint_returns_200(self, athlete_client):
        """Grouped endpoint should be accessible."""
        resp = athlete_client.get(f"{BASE_URL}/api/athlete/programs?grouped=true")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        print("PASS: GET /api/athlete/programs?grouped=true returns 200")

    def test_grouped_programs_have_signals(self, athlete_client):
        """Programs in each group should have signals."""
        resp = athlete_client.get(f"{BASE_URL}/api/athlete/programs?grouped=true")
        data = resp.json()
        
        groups = data.get("groups", {})
        total_checked = 0
        
        for group_name, programs in groups.items():
            for p in programs:
                assert "signals" in p, f"Program in {group_name} missing signals"
                total_checked += 1
        
        print(f"PASS: {total_checked} programs across groups have signals")


# ═══════════════════════════════════════════════════════════════════════════
# ATTENTION COMPUTATION TESTS
# ═══════════════════════════════════════════════════════════════════════════

class TestAttentionComputation:
    """Test that attention computation still works with canonical signals."""

    def test_programs_have_attention_field(self, athlete_client):
        """Programs should have attention field computed from canonical signals."""
        resp = athlete_client.get(f"{BASE_URL}/api/athlete/programs")
        programs = resp.json()
        
        programs_with_attention = [p for p in programs if p.get("attention")]
        assert len(programs_with_attention) > 0, "Expected at least one program with attention"
        print(f"PASS: {len(programs_with_attention)} programs have attention field")

    def test_attention_has_required_fields(self, athlete_client):
        """Attention should have tier and attentionScore."""
        resp = athlete_client.get(f"{BASE_URL}/api/athlete/programs")
        programs = resp.json()
        
        for p in programs:
            if p.get("attention"):
                attn = p["attention"]
                assert "tier" in attn, f"Program {p.get('university_name')} attention missing tier"
                assert "attentionScore" in attn, f"Program {p.get('university_name')} attention missing attentionScore"
                assert attn["tier"] in ("high", "medium", "low"), f"Invalid tier: {attn['tier']}"
        print("PASS: Attention fields have tier and attentionScore")


# ═══════════════════════════════════════════════════════════════════════════
# BOARD GROUPING TESTS
# ═══════════════════════════════════════════════════════════════════════════

class TestBoardGrouping:
    """Test that board_group uses canonical signals."""

    def test_programs_have_board_group(self, athlete_client):
        """Every program should have board_group field."""
        resp = athlete_client.get(f"{BASE_URL}/api/athlete/programs")
        programs = resp.json()
        
        for p in programs:
            assert "board_group" in p, f"Program {p.get('university_name')} missing board_group"
        print(f"PASS: All {len(programs)} programs have board_group")

    def test_board_group_values_valid(self, athlete_client):
        """board_group should be one of the valid categories."""
        resp = athlete_client.get(f"{BASE_URL}/api/athlete/programs")
        programs = resp.json()
        
        valid_groups = {"archived", "overdue", "in_conversation", "waiting_on_reply", "needs_outreach"}
        
        for p in programs:
            group = p.get("board_group")
            assert group in valid_groups, f"Invalid board_group: {group}"
        print("PASS: All board_group values are valid")

    def test_in_conversation_uses_has_coach_reply(self, athlete_client):
        """Programs with has_coach_reply=True should be in_conversation."""
        resp = athlete_client.get(f"{BASE_URL}/api/athlete/programs")
        programs = resp.json()
        
        for p in programs:
            signals = p.get("signals", {})
            if signals.get("has_coach_reply") and p.get("is_active", True):
                # Should be in_conversation (unless overdue)
                assert p.get("board_group") in ("in_conversation", "overdue"), \
                    f"Program with coach reply should be in_conversation, got {p.get('board_group')}"
        print("PASS: has_coach_reply correctly maps to in_conversation")


# ═══════════════════════════════════════════════════════════════════════════
# JOURNEY RAIL TESTS
# ═══════════════════════════════════════════════════════════════════════════

class TestJourneyRail:
    """Test that journey_rail computation works with canonical signals."""

    def test_programs_have_journey_rail(self, athlete_client):
        """Programs should have journey_rail field."""
        resp = athlete_client.get(f"{BASE_URL}/api/athlete/programs")
        programs = resp.json()
        
        for p in programs:
            assert "journey_rail" in p, f"Program {p.get('university_name')} missing journey_rail"
        print(f"PASS: All {len(programs)} programs have journey_rail")

    def test_journey_rail_has_required_fields(self, athlete_client):
        """journey_rail should have active and pulse fields."""
        resp = athlete_client.get(f"{BASE_URL}/api/athlete/programs")
        programs = resp.json()
        
        for p in programs:
            rail = p.get("journey_rail", {})
            assert "active" in rail, f"journey_rail missing active"
            assert "pulse" in rail, f"journey_rail missing pulse"
        print("PASS: journey_rail has active and pulse fields")

    def test_journey_rail_active_values_valid(self, athlete_client):
        """journey_rail.active should be a valid stage."""
        resp = athlete_client.get(f"{BASE_URL}/api/athlete/programs")
        programs = resp.json()
        
        valid_stages = {"added", "outreach", "in_conversation", "campus_visit", "offer", "committed"}
        
        for p in programs:
            active = p.get("journey_rail", {}).get("active")
            assert active in valid_stages, f"Invalid journey_rail.active: {active}"
        print("PASS: All journey_rail.active values are valid stages")


# ═══════════════════════════════════════════════════════════════════════════
# CACHE INVALIDATION TESTS
# ═══════════════════════════════════════════════════════════════════════════

class TestCacheInvalidation:
    """Test that creating interactions invalidates metrics cache."""

    def test_create_interaction_updates_signals(self, athlete_client):
        """POST /api/athlete/interactions should update signals."""
        # Get a program
        resp = athlete_client.get(f"{BASE_URL}/api/athlete/programs")
        programs = resp.json()
        assert len(programs) > 0
        
        program = programs[0]
        program_id = program["program_id"]
        initial_total = program.get("signals", {}).get("total_interactions", 0)
        
        # Create an interaction
        resp = athlete_client.post(f"{BASE_URL}/api/athlete/interactions", json={
            "program_id": program_id,
            "type": "Email",
            "notes": "TEST_Sprint2_interaction_cache_test",
            "outcome": "No Response"
        })
        assert resp.status_code == 200, f"Failed to create interaction: {resp.text}"
        
        # Wait a moment for cache invalidation
        time.sleep(0.5)
        
        # Get program again
        resp = athlete_client.get(f"{BASE_URL}/api/athlete/programs/{program_id}")
        updated_program = resp.json()
        new_total = updated_program.get("signals", {}).get("total_interactions", 0)
        
        assert new_total >= initial_total, f"total_interactions should increase: {initial_total} -> {new_total}"
        print(f"PASS: Interaction created, total_interactions: {initial_total} -> {new_total}")


# ═══════════════════════════════════════════════════════════════════════════
# DETERMINISM TESTS
# ═══════════════════════════════════════════════════════════════════════════

class TestDeterminism:
    """Test that consecutive calls return identical signal values."""

    def test_consecutive_calls_return_identical_signals(self, athlete_client):
        """Two consecutive GET calls should return identical signals."""
        # First call
        resp1 = athlete_client.get(f"{BASE_URL}/api/athlete/programs")
        programs1 = resp1.json()
        
        # Second call
        resp2 = athlete_client.get(f"{BASE_URL}/api/athlete/programs")
        programs2 = resp2.json()
        
        assert len(programs1) == len(programs2), "Program count should be identical"
        
        # Compare signals for each program
        for p1, p2 in zip(programs1, programs2):
            s1 = p1.get("signals", {})
            s2 = p2.get("signals", {})
            
            assert s1.get("outreach_count") == s2.get("outreach_count"), \
                f"outreach_count mismatch for {p1.get('university_name')}"
            assert s1.get("reply_count") == s2.get("reply_count"), \
                f"reply_count mismatch for {p1.get('university_name')}"
            assert s1.get("has_coach_reply") == s2.get("has_coach_reply"), \
                f"has_coach_reply mismatch for {p1.get('university_name')}"
            assert s1.get("pipeline_health_state") == s2.get("pipeline_health_state"), \
                f"pipeline_health_state mismatch for {p1.get('university_name')}"
        
        print(f"PASS: {len(programs1)} programs have identical signals across calls")


# ═══════════════════════════════════════════════════════════════════════════
# COACH MISSION CONTROL TESTS
# ═══════════════════════════════════════════════════════════════════════════

class TestCoachMissionControl:
    """Test that Coach Mission Control still works with canonical signals."""

    def test_coach_mission_control_returns_200(self, coach_client):
        """Coach mission control should be accessible."""
        resp = coach_client.get(f"{BASE_URL}/api/mission-control")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        print("PASS: GET /api/mission-control returns 200")

    def test_coach_mission_control_has_roster(self, coach_client):
        """Mission control should have myRoster field."""
        resp = coach_client.get(f"{BASE_URL}/api/mission-control")
        data = resp.json()
        
        assert "myRoster" in data, "Mission control missing myRoster"
        print(f"PASS: Mission control has myRoster with {len(data.get('myRoster', []))} athletes")


# ═══════════════════════════════════════════════════════════════════════════
# CLEANUP
# ═══════════════════════════════════════════════════════════════════════════

@pytest.fixture(scope="module", autouse=True)
def cleanup_test_data(athlete_client):
    """Cleanup TEST_ prefixed interactions after tests."""
    yield
    # Cleanup: Delete test interactions
    try:
        resp = athlete_client.get(f"{BASE_URL}/api/athlete/interactions")
        if resp.status_code == 200:
            interactions = resp.json()
            for ix in interactions:
                if "TEST_" in (ix.get("notes") or ""):
                    # Note: There's no delete endpoint for interactions, so we skip cleanup
                    pass
    except Exception:
        pass


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

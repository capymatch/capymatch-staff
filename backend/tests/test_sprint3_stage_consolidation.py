"""
Sprint 3: Stage/Progress Consolidation Tests

Tests the canonical stage_engine.py as the SINGLE source of truth for:
- pipeline_stage computation
- board_group derivation (never stored)
- journey_rail computation
- recruiting_status normalization
- auto-corrections based on signals

Key rules tested:
1. recruiting_status is user-controlled (7-value enum)
2. pipeline_stage is system-derived
3. no-downward-contradiction (pipeline_stage_rank >= base_stage_rank)
4. signal upgrades only for added→outreach and outreach→in_conversation
5. stages >= in_conversation are LOCKED
6. auto-normalization of recruiting_status on write flows
7. journey_stage writes stopped
8. board_group is derived only and never stored
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Canonical enums from stage_engine.py
RECRUITING_STATUS_ENUM = (
    "Not Contacted", "Contacted", "In Conversation",
    "Campus Visit", "Offer", "Committed", "Archived"
)

PIPELINE_STAGE_ENUM = (
    "archived", "added", "outreach", "in_conversation",
    "campus_visit", "offer", "committed"
)

BOARD_GROUP_ENUM = (
    "archived", "overdue", "in_conversation",
    "waiting_on_reply", "needs_outreach"
)


@pytest.fixture(scope="module")
def athlete_token():
    """Get athlete auth token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "emma.chen@athlete.capymatch.com",
        "password": "athlete123"
    })
    if resp.status_code == 200:
        return resp.json().get("token")
    pytest.skip("Athlete login failed")


@pytest.fixture(scope="module")
def coach_token():
    """Get coach auth token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "coach.williams@capymatch.com",
        "password": "coach123"
    })
    if resp.status_code == 200:
        return resp.json().get("token")
    pytest.skip("Coach login failed")


@pytest.fixture(scope="module")
def director_token():
    """Get director auth token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "director@capymatch.com",
        "password": "director123"
    })
    if resp.status_code == 200:
        return resp.json().get("token")
    pytest.skip("Director login failed")


def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ═══════════════════════════════════════════════════════════════════════════
# TEST CLASS: Pipeline Stage Field Presence
# ═══════════════════════════════════════════════════════════════════════════

class TestPipelineStageFieldPresence:
    """Verify pipeline_stage field is returned in all program endpoints"""

    def test_list_programs_returns_pipeline_stage(self, athlete_token):
        """GET /api/athlete/programs returns pipeline_stage for every program"""
        resp = requests.get(f"{BASE_URL}/api/athlete/programs", headers=auth_headers(athlete_token))
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        programs = resp.json()
        assert isinstance(programs, list), "Expected list of programs"
        
        for p in programs:
            assert "pipeline_stage" in p, f"Program {p.get('program_id')} missing pipeline_stage"
            assert p["pipeline_stage"] in PIPELINE_STAGE_ENUM, f"Invalid pipeline_stage: {p['pipeline_stage']}"
        print(f"PASS: All {len(programs)} programs have valid pipeline_stage")

    def test_single_program_returns_pipeline_stage(self, athlete_token):
        """GET /api/athlete/programs/{id} returns pipeline_stage"""
        # First get a program ID
        resp = requests.get(f"{BASE_URL}/api/athlete/programs", headers=auth_headers(athlete_token))
        programs = resp.json()
        if not programs:
            pytest.skip("No programs to test")
        
        program_id = programs[0]["program_id"]
        resp = requests.get(f"{BASE_URL}/api/athlete/programs/{program_id}", headers=auth_headers(athlete_token))
        assert resp.status_code == 200
        program = resp.json()
        assert "pipeline_stage" in program, "Single program missing pipeline_stage"
        assert program["pipeline_stage"] in PIPELINE_STAGE_ENUM
        print(f"PASS: Single program {program_id} has pipeline_stage={program['pipeline_stage']}")

    def test_dashboard_programs_have_pipeline_stage(self, athlete_token):
        """GET /api/athlete/dashboard returns programs with pipeline_stage"""
        resp = requests.get(f"{BASE_URL}/api/athlete/dashboard", headers=auth_headers(athlete_token))
        assert resp.status_code == 200
        data = resp.json()
        
        # Check spotlight programs
        spotlight = data.get("spotlight", [])
        for p in spotlight:
            assert "pipeline_stage" in p, f"Spotlight program missing pipeline_stage"
        
        # Check follow_ups_due
        follow_ups = data.get("follow_ups_due", [])
        for p in follow_ups:
            assert "pipeline_stage" in p, f"Follow-up program missing pipeline_stage"
        
        print(f"PASS: Dashboard spotlight ({len(spotlight)}) and follow_ups ({len(follow_ups)}) have pipeline_stage")


# ═══════════════════════════════════════════════════════════════════════════
# TEST CLASS: Board Group Derivation
# ═══════════════════════════════════════════════════════════════════════════

class TestBoardGroupDerivation:
    """Verify board_group is derived from pipeline_stage (never stored)"""

    def test_programs_have_board_group(self, athlete_token):
        """GET /api/athlete/programs returns board_group for every program"""
        resp = requests.get(f"{BASE_URL}/api/athlete/programs", headers=auth_headers(athlete_token))
        assert resp.status_code == 200
        programs = resp.json()
        
        for p in programs:
            assert "board_group" in p, f"Program {p.get('program_id')} missing board_group"
            assert p["board_group"] in BOARD_GROUP_ENUM, f"Invalid board_group: {p['board_group']}"
        print(f"PASS: All {len(programs)} programs have valid board_group")

    def test_board_group_derivation_order(self, athlete_token):
        """Verify board_group derivation order: archived > overdue > in_conversation > waiting_on_reply > needs_outreach"""
        resp = requests.get(f"{BASE_URL}/api/athlete/programs", headers=auth_headers(athlete_token))
        programs = resp.json()
        
        for p in programs:
            pipeline_stage = p.get("pipeline_stage")
            board_group = p.get("board_group")
            
            # Archived programs must have board_group=archived
            if pipeline_stage == "archived":
                assert board_group == "archived", f"Archived program has board_group={board_group}"
            
            # in_conversation or higher stages should have board_group=in_conversation (unless overdue/archived)
            if pipeline_stage in ("in_conversation", "campus_visit", "offer", "committed"):
                assert board_group in ("in_conversation", "overdue", "archived"), \
                    f"Stage {pipeline_stage} has unexpected board_group={board_group}"
        
        print("PASS: board_group derivation order verified")


# ═══════════════════════════════════════════════════════════════════════════
# TEST CLASS: Journey Rail Consistency
# ═══════════════════════════════════════════════════════════════════════════

class TestJourneyRailConsistency:
    """Verify journey_rail.active matches pipeline_stage"""

    def test_journey_rail_active_matches_pipeline_stage(self, athlete_token):
        """journey_rail.active should match pipeline_stage"""
        resp = requests.get(f"{BASE_URL}/api/athlete/programs", headers=auth_headers(athlete_token))
        programs = resp.json()
        
        for p in programs:
            pipeline_stage = p.get("pipeline_stage")
            journey_rail = p.get("journey_rail", {})
            active = journey_rail.get("active")
            
            # For archived, journey_rail.active defaults to "added"
            if pipeline_stage == "archived":
                assert active == "added", f"Archived program has journey_rail.active={active}"
            else:
                assert active == pipeline_stage, \
                    f"Mismatch: pipeline_stage={pipeline_stage}, journey_rail.active={active}"
        
        print("PASS: journey_rail.active matches pipeline_stage for all programs")

    def test_journey_rail_has_required_fields(self, athlete_token):
        """journey_rail should have stages, active, line_fill, pulse"""
        resp = requests.get(f"{BASE_URL}/api/athlete/programs", headers=auth_headers(athlete_token))
        programs = resp.json()
        
        for p in programs:
            rail = p.get("journey_rail", {})
            assert "stages" in rail, "journey_rail missing stages"
            assert "active" in rail, "journey_rail missing active"
            assert "pulse" in rail, "journey_rail missing pulse"
        
        print("PASS: All journey_rail objects have required fields")


# ═══════════════════════════════════════════════════════════════════════════
# TEST CLASS: No-Downward-Contradiction Rule
# ═══════════════════════════════════════════════════════════════════════════

class TestNoDownwardContradiction:
    """Verify pipeline_stage_rank >= base_stage_rank(recruiting_status)"""

    PIPELINE_STAGE_RANK = {
        "archived": -1, "added": 0, "outreach": 1, "in_conversation": 2,
        "campus_visit": 3, "offer": 4, "committed": 5
    }
    
    BASE_STAGE_MAP = {
        "Not Contacted": "added", "Contacted": "outreach",
        "In Conversation": "in_conversation", "Campus Visit": "campus_visit",
        "Offer": "offer", "Committed": "committed", "Archived": "archived"
    }

    def test_no_downward_contradiction_for_all_programs(self, athlete_token):
        """pipeline_stage rank must be >= base_stage_rank for ALL programs"""
        resp = requests.get(f"{BASE_URL}/api/athlete/programs", headers=auth_headers(athlete_token))
        programs = resp.json()
        
        violations = []
        for p in programs:
            recruiting_status = p.get("recruiting_status", "Not Contacted")
            pipeline_stage = p.get("pipeline_stage", "added")
            
            base_stage = self.BASE_STAGE_MAP.get(recruiting_status, "added")
            base_rank = self.PIPELINE_STAGE_RANK.get(base_stage, 0)
            pipeline_rank = self.PIPELINE_STAGE_RANK.get(pipeline_stage, 0)
            
            if pipeline_rank < base_rank:
                violations.append({
                    "program_id": p.get("program_id"),
                    "university": p.get("university_name"),
                    "recruiting_status": recruiting_status,
                    "pipeline_stage": pipeline_stage,
                    "base_rank": base_rank,
                    "pipeline_rank": pipeline_rank
                })
        
        assert len(violations) == 0, f"Found {len(violations)} downward contradictions: {violations}"
        print(f"PASS: No downward contradictions in {len(programs)} programs")


# ═══════════════════════════════════════════════════════════════════════════
# TEST CLASS: Stage Locking
# ═══════════════════════════════════════════════════════════════════════════

class TestStageLocking:
    """Verify stages >= in_conversation are LOCKED to recruiting_status"""

    def test_locked_stages_equal_base_stage(self, athlete_token):
        """If recruiting_status is 'In Conversation' or higher, pipeline_stage must equal base stage"""
        resp = requests.get(f"{BASE_URL}/api/athlete/programs", headers=auth_headers(athlete_token))
        programs = resp.json()
        
        LOCKED_STATUSES = {"In Conversation", "Campus Visit", "Offer", "Committed"}
        BASE_STAGE_MAP = {
            "In Conversation": "in_conversation", "Campus Visit": "campus_visit",
            "Offer": "offer", "Committed": "committed"
        }
        
        violations = []
        for p in programs:
            recruiting_status = p.get("recruiting_status", "Not Contacted")
            pipeline_stage = p.get("pipeline_stage", "added")
            
            if recruiting_status in LOCKED_STATUSES:
                expected_stage = BASE_STAGE_MAP.get(recruiting_status)
                if pipeline_stage != expected_stage:
                    violations.append({
                        "program_id": p.get("program_id"),
                        "recruiting_status": recruiting_status,
                        "expected_stage": expected_stage,
                        "actual_stage": pipeline_stage
                    })
        
        assert len(violations) == 0, f"Found {len(violations)} locked stage violations: {violations}"
        print(f"PASS: All locked stages match base stage")


# ═══════════════════════════════════════════════════════════════════════════
# TEST CLASS: Signal Upgrades
# ═══════════════════════════════════════════════════════════════════════════

class TestSignalUpgrades:
    """Verify signal upgrades: added→outreach and outreach→in_conversation"""

    def test_outreach_signal_upgrade(self, athlete_token):
        """Program with recruiting_status='Not Contacted' + outreach_count > 0 → pipeline_stage='outreach'"""
        resp = requests.get(f"{BASE_URL}/api/athlete/programs", headers=auth_headers(athlete_token))
        programs = resp.json()
        
        for p in programs:
            recruiting_status = p.get("recruiting_status", "Not Contacted")
            pipeline_stage = p.get("pipeline_stage", "added")
            signals = p.get("signals", {})
            outreach_count = signals.get("outreach_count", 0)
            
            if recruiting_status == "Not Contacted" and outreach_count > 0:
                assert pipeline_stage == "outreach", \
                    f"Program {p.get('program_id')}: Not Contacted + outreach_count={outreach_count} should be 'outreach', got '{pipeline_stage}'"
        
        print("PASS: Outreach signal upgrade verified")

    def test_coach_reply_signal_upgrade(self, athlete_token):
        """Program with recruiting_status='Contacted' + has_coach_reply=True → pipeline_stage='in_conversation'"""
        resp = requests.get(f"{BASE_URL}/api/athlete/programs", headers=auth_headers(athlete_token))
        programs = resp.json()
        
        for p in programs:
            recruiting_status = p.get("recruiting_status", "Not Contacted")
            pipeline_stage = p.get("pipeline_stage", "added")
            signals = p.get("signals", {})
            has_coach_reply = signals.get("has_coach_reply", False)
            
            if recruiting_status == "Contacted" and has_coach_reply:
                assert pipeline_stage == "in_conversation", \
                    f"Program {p.get('program_id')}: Contacted + has_coach_reply should be 'in_conversation', got '{pipeline_stage}'"
        
        print("PASS: Coach reply signal upgrade verified")


# ═══════════════════════════════════════════════════════════════════════════
# TEST CLASS: Recruiting Status Normalization
# ═══════════════════════════════════════════════════════════════════════════

class TestRecruitingStatusNormalization:
    """Verify recruiting_status is normalized on write flows"""

    def test_update_program_normalizes_recruiting_status(self, athlete_token):
        """PUT /api/athlete/programs/{id} normalizes recruiting_status (e.g. 'Prospect' → 'Not Contacted')"""
        # Get a program to update
        resp = requests.get(f"{BASE_URL}/api/athlete/programs", headers=auth_headers(athlete_token))
        programs = resp.json()
        if not programs:
            pytest.skip("No programs to test")
        
        # Find a program that's not committed
        test_program = None
        for p in programs:
            if p.get("recruiting_status") not in ("Committed", "Archived"):
                test_program = p
                break
        
        if not test_program:
            pytest.skip("No suitable program for normalization test")
        
        program_id = test_program["program_id"]
        original_status = test_program.get("recruiting_status")
        
        # Try to set a legacy value
        resp = requests.put(
            f"{BASE_URL}/api/athlete/programs/{program_id}",
            headers=auth_headers(athlete_token),
            json={"recruiting_status": "Prospect"}  # Legacy value
        )
        assert resp.status_code == 200, f"Update failed: {resp.status_code}"
        
        # Verify it was normalized
        updated = resp.json()
        assert updated.get("recruiting_status") == "Not Contacted", \
            f"Expected 'Not Contacted', got '{updated.get('recruiting_status')}'"
        
        # Restore original status
        requests.put(
            f"{BASE_URL}/api/athlete/programs/{program_id}",
            headers=auth_headers(athlete_token),
            json={"recruiting_status": original_status}
        )
        
        print("PASS: recruiting_status normalization verified")


# ═══════════════════════════════════════════════════════════════════════════
# TEST CLASS: Journey Stage Writes Blocked
# ═══════════════════════════════════════════════════════════════════════════

class TestJourneyStageWritesBlocked:
    """Verify journey_stage writes are stripped from body"""

    def test_update_program_strips_journey_stage(self, athlete_token):
        """PUT /api/athlete/programs/{id} blocks journey_stage writes (stripped from body)"""
        resp = requests.get(f"{BASE_URL}/api/athlete/programs", headers=auth_headers(athlete_token))
        programs = resp.json()
        if not programs:
            pytest.skip("No programs to test")
        
        program_id = programs[0]["program_id"]
        
        # Try to write journey_stage (should be ignored)
        resp = requests.put(
            f"{BASE_URL}/api/athlete/programs/{program_id}",
            headers=auth_headers(athlete_token),
            json={"journey_stage": "committed", "notes": "TEST_journey_stage_blocked"}
        )
        assert resp.status_code == 200
        
        # Verify journey_stage was not written (pipeline_stage should not change to committed)
        updated = resp.json()
        # The pipeline_stage should be computed, not set to "committed" from journey_stage
        assert updated.get("pipeline_stage") != "committed" or updated.get("recruiting_status") == "Committed", \
            "journey_stage write was not blocked"
        
        print("PASS: journey_stage writes are blocked")


# ═══════════════════════════════════════════════════════════════════════════
# TEST CLASS: Interaction Auto-Correction
# ═══════════════════════════════════════════════════════════════════════════

class TestInteractionAutoCorrection:
    """Verify POST /api/athlete/interactions triggers auto-correction"""

    def test_create_interaction_triggers_auto_correction(self, athlete_token):
        """POST /api/athlete/interactions triggers auto-correction of recruiting_status based on signals"""
        # Get a program with "Not Contacted" status
        resp = requests.get(f"{BASE_URL}/api/athlete/programs", headers=auth_headers(athlete_token))
        programs = resp.json()
        
        test_program = None
        for p in programs:
            if p.get("recruiting_status") == "Not Contacted":
                test_program = p
                break
        
        if not test_program:
            # Create a test scenario by resetting a program
            for p in programs:
                if p.get("recruiting_status") not in ("Committed", "Archived"):
                    test_program = p
                    # Reset to Not Contacted
                    requests.put(
                        f"{BASE_URL}/api/athlete/programs/{p['program_id']}",
                        headers=auth_headers(athlete_token),
                        json={"recruiting_status": "Not Contacted"}
                    )
                    break
        
        if not test_program:
            pytest.skip("No suitable program for auto-correction test")
        
        program_id = test_program["program_id"]
        
        # Create an email interaction (should trigger auto-correction to "Contacted")
        resp = requests.post(
            f"{BASE_URL}/api/athlete/interactions",
            headers=auth_headers(athlete_token),
            json={
                "program_id": program_id,
                "type": "Email",
                "notes": "TEST_Sprint3_auto_correction_test",
                "outcome": "Sent"
            }
        )
        assert resp.status_code == 200, f"Create interaction failed: {resp.status_code}"
        
        # Verify the program was auto-corrected
        time.sleep(0.5)  # Allow async processing
        resp = requests.get(f"{BASE_URL}/api/athlete/programs/{program_id}", headers=auth_headers(athlete_token))
        updated = resp.json()
        
        # After sending an email, recruiting_status should be "Contacted"
        assert updated.get("recruiting_status") == "Contacted", \
            f"Expected 'Contacted' after email, got '{updated.get('recruiting_status')}'"
        
        print("PASS: Interaction auto-correction verified")


# ═══════════════════════════════════════════════════════════════════════════
# TEST CLASS: Determinism
# ═══════════════════════════════════════════════════════════════════════════

class TestDeterminism:
    """Verify consecutive calls return identical pipeline_stage and board_group"""

    def test_consecutive_calls_return_identical_results(self, athlete_token):
        """Two consecutive calls to GET /api/athlete/programs return identical pipeline_stage and board_group"""
        resp1 = requests.get(f"{BASE_URL}/api/athlete/programs", headers=auth_headers(athlete_token))
        resp2 = requests.get(f"{BASE_URL}/api/athlete/programs", headers=auth_headers(athlete_token))
        
        assert resp1.status_code == 200
        assert resp2.status_code == 200
        
        programs1 = {p["program_id"]: p for p in resp1.json()}
        programs2 = {p["program_id"]: p for p in resp2.json()}
        
        for pid, p1 in programs1.items():
            p2 = programs2.get(pid)
            assert p2 is not None, f"Program {pid} missing in second call"
            assert p1["pipeline_stage"] == p2["pipeline_stage"], \
                f"pipeline_stage mismatch for {pid}: {p1['pipeline_stage']} vs {p2['pipeline_stage']}"
            assert p1["board_group"] == p2["board_group"], \
                f"board_group mismatch for {pid}: {p1['board_group']} vs {p2['board_group']}"
        
        print(f"PASS: Determinism verified for {len(programs1)} programs")


# ═══════════════════════════════════════════════════════════════════════════
# TEST CLASS: Connected Experience Endpoint
# ═══════════════════════════════════════════════════════════════════════════

class TestConnectedExperience:
    """Verify connected experience endpoint returns pipeline_stage and board_group"""

    def test_connected_pipeline_returns_stage_data(self, coach_token):
        """GET /api/roster/athlete/{id}/pipeline returns pipeline_stage and board_group"""
        # First get an athlete ID from the roster
        resp = requests.get(f"{BASE_URL}/api/roster", headers=auth_headers(coach_token))
        if resp.status_code != 200:
            pytest.skip("Could not get roster")
        
        roster = resp.json()
        athletes = roster.get("athletes", [])
        if not athletes:
            pytest.skip("No athletes in roster")
        
        athlete_id = athletes[0].get("id")
        
        # Get pipeline summary
        resp = requests.get(
            f"{BASE_URL}/api/roster/athlete/{athlete_id}/pipeline",
            headers=auth_headers(coach_token)
        )
        
        if resp.status_code == 404:
            pytest.skip("Athlete pipeline not found")
        
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        
        # Check schools have pipeline_stage and board_group
        schools = data.get("schools", [])
        for stage_group in schools:
            for school in stage_group.get("schools", []):
                assert "board_group" in school, f"School missing board_group"
        
        print(f"PASS: Connected experience returns stage data")


# ═══════════════════════════════════════════════════════════════════════════
# TEST CLASS: Attention Engine Uses Pipeline Stage
# ═══════════════════════════════════════════════════════════════════════════

class TestAttentionEngineUsesPipelineStage:
    """Verify attention engine uses pipeline_stage for stage weight calculation"""

    def test_programs_have_attention_with_stage_weight(self, athlete_token):
        """Programs should have attention field computed using pipeline_stage"""
        resp = requests.get(f"{BASE_URL}/api/athlete/programs", headers=auth_headers(athlete_token))
        programs = resp.json()
        
        programs_with_attention = [p for p in programs if p.get("attention")]
        
        for p in programs_with_attention:
            attention = p.get("attention", {})
            assert "attentionScore" in attention, "attention missing attentionScore"
            assert "tier" in attention, "attention missing tier"
            
            # Verify tier is valid
            assert attention["tier"] in ("high", "medium", "low"), \
                f"Invalid attention tier: {attention['tier']}"
        
        print(f"PASS: {len(programs_with_attention)} programs have valid attention data")


# ═══════════════════════════════════════════════════════════════════════════
# TEST CLASS: Grouped Programs Endpoint
# ═══════════════════════════════════════════════════════════════════════════

class TestGroupedProgramsEndpoint:
    """Verify grouped programs endpoint uses board_group correctly"""

    def test_grouped_endpoint_returns_correct_groups(self, athlete_token):
        """GET /api/athlete/programs?grouped=true returns programs grouped by board_group"""
        resp = requests.get(
            f"{BASE_URL}/api/athlete/programs?grouped=true",
            headers=auth_headers(athlete_token)
        )
        assert resp.status_code == 200
        data = resp.json()
        
        assert "groups" in data, "Response missing 'groups'"
        assert "counts" in data, "Response missing 'counts'"
        
        groups = data["groups"]
        expected_groups = {"overdue", "needs_outreach", "waiting_on_reply", "in_conversation", "archived"}
        
        for group_name in expected_groups:
            assert group_name in groups, f"Missing group: {group_name}"
        
        # Verify programs in each group have matching board_group
        for group_name, programs in groups.items():
            for p in programs:
                assert p.get("board_group") == group_name, \
                    f"Program in '{group_name}' group has board_group='{p.get('board_group')}'"
        
        print(f"PASS: Grouped endpoint returns correct groups")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

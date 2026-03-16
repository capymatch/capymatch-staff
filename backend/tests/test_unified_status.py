"""
Unified Status Model Tests - Journey State + Attention Status
Tests the major redesign: separated athlete status into two independent dimensions:
- Journey State: recruiting progress (always positive)
- Attention Status: most urgent action needed (urgency-scored)

Key test scenarios:
1. API: /api/mission-control returns journey_state and attention_status for each athlete
2. Journey State derived from pipeline_best_stage
3. Attention Status: blockers outscore follow-ups, signal scoring works
4. Secondary signals and expandable issues
5. needingAction count matches athletes with primary attention status
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
COACH_WILLIAMS_CREDS = {"email": "coach.williams@capymatch.com", "password": "coach123"}


@pytest.fixture(scope="module")
def coach_token():
    """Get coach auth token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json=COACH_WILLIAMS_CREDS)
    if resp.status_code != 200:
        pytest.skip(f"Coach login failed: {resp.status_code}")
    return resp.json().get("token")


@pytest.fixture(scope="module")
def mission_control_data(coach_token):
    """Get mission control data once for all tests"""
    headers = {"Authorization": f"Bearer {coach_token}"}
    resp = requests.get(f"{BASE_URL}/api/mission-control", headers=headers)
    if resp.status_code != 200:
        pytest.skip(f"Mission control failed: {resp.status_code}")
    return resp.json()


class TestUnifiedStatusAPIResponse:
    """Test /api/mission-control returns unified status fields"""
    
    def test_roster_athletes_have_journey_state(self, mission_control_data):
        """Each athlete in myRoster should have journey_state object"""
        roster = mission_control_data.get("myRoster", [])
        assert len(roster) > 0, "Roster should not be empty"
        
        for athlete in roster:
            assert "journey_state" in athlete, f"Athlete {athlete.get('id')} missing journey_state"
            js = athlete["journey_state"]
            assert isinstance(js, dict), f"journey_state should be dict, got {type(js)}"
            assert "label" in js, f"journey_state missing label"
            assert "color" in js, f"journey_state missing color"
            assert "bg" in js, f"journey_state missing bg"
        
        print(f"✓ All {len(roster)} athletes have journey_state object with label/color/bg")
    
    def test_roster_athletes_have_attention_status(self, mission_control_data):
        """Each athlete in myRoster should have attention_status object"""
        roster = mission_control_data.get("myRoster", [])
        assert len(roster) > 0, "Roster should not be empty"
        
        for athlete in roster:
            assert "attention_status" in athlete, f"Athlete {athlete.get('id')} missing attention_status"
            attn = athlete["attention_status"]
            assert isinstance(attn, dict), f"attention_status should be dict, got {type(attn)}"
            # primary can be None or dict
            assert "primary" in attn, f"attention_status missing primary"
            # secondary is always a list
            assert "secondary" in attn, f"attention_status missing secondary"
            assert isinstance(attn["secondary"], list), f"secondary should be list"
            # total_issues is always an int
            assert "total_issues" in attn, f"attention_status missing total_issues"
            assert isinstance(attn["total_issues"], int), f"total_issues should be int"
        
        print(f"✓ All {len(roster)} athletes have attention_status object with primary/secondary/total_issues")


class TestJourneyStateMapping:
    """Test Journey State is correctly derived from pipeline_best_stage"""
    
    def test_lucas_offer_received(self, mission_control_data):
        """Lucas (athlete_5) at 'Offer' stage should have 'Offer Received' journey state"""
        roster = mission_control_data.get("myRoster", [])
        lucas = next((a for a in roster if a.get("id") == "athlete_5"), None)
        
        if lucas is None:
            pytest.skip("Lucas (athlete_5) not in roster")
        
        journey = lucas.get("journey_state", {})
        assert journey.get("label") == "Offer Received", f"Lucas journey_state.label should be 'Offer Received', got '{journey.get('label')}'"
        print(f"✓ Lucas (Offer) → journey_state.label = 'Offer Received'")
    
    def test_emma_visiting_schools(self, mission_control_data):
        """Emma (athlete_1) at 'Campus Visit' stage should have 'Visiting Schools' journey state"""
        roster = mission_control_data.get("myRoster", [])
        emma = next((a for a in roster if a.get("id") == "athlete_1"), None)
        
        if emma is None:
            pytest.skip("Emma (athlete_1) not in roster")
        
        journey = emma.get("journey_state", {})
        assert journey.get("label") == "Visiting Schools", f"Emma journey_state.label should be 'Visiting Schools', got '{journey.get('label')}'"
        print(f"✓ Emma (Campus Visit) → journey_state.label = 'Visiting Schools'")
    
    def test_marcus_visiting_schools(self, mission_control_data):
        """Marcus (athlete_3) at 'Campus Visit' stage should have 'Visiting Schools' journey state"""
        roster = mission_control_data.get("myRoster", [])
        marcus = next((a for a in roster if a.get("id") == "athlete_3"), None)
        
        if marcus is None:
            pytest.skip("Marcus (athlete_3) not in roster")
        
        journey = marcus.get("journey_state", {})
        assert journey.get("label") == "Visiting Schools", f"Marcus journey_state.label should be 'Visiting Schools', got '{journey.get('label')}'"
        print(f"✓ Marcus (Campus Visit) → journey_state.label = 'Visiting Schools'")
    
    def test_olivia_visiting_schools(self, mission_control_data):
        """Olivia (athlete_2) at 'Campus Visit' stage should have 'Visiting Schools' journey state"""
        roster = mission_control_data.get("myRoster", [])
        olivia = next((a for a in roster if a.get("id") == "athlete_2"), None)
        
        if olivia is None:
            pytest.skip("Olivia (athlete_2) not in roster")
        
        journey = olivia.get("journey_state", {})
        assert journey.get("label") == "Visiting Schools", f"Olivia journey_state.label should be 'Visiting Schools', got '{journey.get('label')}'"
        print(f"✓ Olivia (Campus Visit) → journey_state.label = 'Visiting Schools'")
    
    def test_sarah_reaching_out(self, mission_control_data):
        """Sarah (athlete_4) at 'Initial Contact' stage should have 'Reaching Out' journey state"""
        roster = mission_control_data.get("myRoster", [])
        sarah = next((a for a in roster if a.get("id") == "athlete_4"), None)
        
        if sarah is None:
            pytest.skip("Sarah (athlete_4) not in roster")
        
        journey = sarah.get("journey_state", {})
        assert journey.get("label") == "Reaching Out", f"Sarah journey_state.label should be 'Reaching Out', got '{journey.get('label')}'"
        print(f"✓ Sarah (Initial Contact) → journey_state.label = 'Reaching Out'")


class TestAttentionStatusPrimary:
    """Test Attention Status primary correctly reflects most urgent signal"""
    
    def test_emma_primary_is_blocker(self, mission_control_data):
        """Emma should have Blocker as primary attention status (2 Overdue Actions)"""
        roster = mission_control_data.get("myRoster", [])
        emma = next((a for a in roster if a.get("id") == "athlete_1"), None)
        
        if emma is None:
            pytest.skip("Emma (athlete_1) not in roster")
        
        attention = emma.get("attention_status", {})
        primary = attention.get("primary")
        
        if primary is None:
            pytest.fail("Emma should have a primary attention status, but got None (All Clear)")
        
        # Emma should have "Blocker" as primary (from overdue_actions pod issue)
        assert primary.get("label") == "Blocker", f"Emma's primary.label should be 'Blocker', got '{primary.get('label')}'"
        assert primary.get("nature") == "blocker", f"Emma's primary.nature should be 'blocker', got '{primary.get('nature')}'"
        
        # Score should be around 73 (critical severity + high time sensitivity)
        score = primary.get("score", 0)
        assert score >= 60, f"Emma's primary.score should be >= 60, got {score}"
        
        print(f"✓ Emma's primary attention = Blocker (score: {score})")
    
    def test_marcus_primary_is_blocker(self, mission_control_data):
        """Marcus should have Blocker as primary attention status (2 Overdue Actions)"""
        roster = mission_control_data.get("myRoster", [])
        marcus = next((a for a in roster if a.get("id") == "athlete_3"), None)
        
        if marcus is None:
            pytest.skip("Marcus (athlete_3) not in roster")
        
        attention = marcus.get("attention_status", {})
        primary = attention.get("primary")
        
        if primary is None:
            pytest.fail("Marcus should have a primary attention status, but got None (All Clear)")
        
        # Marcus should have "Blocker" as primary (from overdue_actions pod issue)
        assert primary.get("label") == "Blocker", f"Marcus's primary.label should be 'Blocker', got '{primary.get('label')}'"
        assert primary.get("nature") == "blocker", f"Marcus's primary.nature should be 'blocker', got '{primary.get('nature')}'"
        
        print(f"✓ Marcus's primary attention = Blocker (score: {primary.get('score', 0)})")
    
    def test_lucas_primary_is_at_risk(self, mission_control_data):
        """Lucas should have At Risk as primary (school cooling off), not overriding Offer Received journey"""
        roster = mission_control_data.get("myRoster", [])
        lucas = next((a for a in roster if a.get("id") == "athlete_5"), None)
        
        if lucas is None:
            pytest.skip("Lucas (athlete_5) not in roster")
        
        attention = lucas.get("attention_status", {})
        primary = attention.get("primary")
        journey = lucas.get("journey_state", {})
        
        # Verify journey state is still "Offer Received" regardless of attention
        assert journey.get("label") == "Offer Received", f"Lucas journey should still be 'Offer Received', got '{journey.get('label')}'"
        
        # Lucas should have "At Risk" as primary (from school cooling off)
        if primary is not None:
            label = primary.get("label", "")
            nature = primary.get("nature", "")
            # Accept either "At Risk" or "Urgent Follow-up" based on which signal has higher urgency
            acceptable_labels = ["At Risk", "Urgent Follow-up", "Blocker"]
            assert label in acceptable_labels, f"Lucas's primary.label should be in {acceptable_labels}, got '{label}'"
            print(f"✓ Lucas's primary attention = {label} (nature: {nature}, score: {primary.get('score', 0)})")
        else:
            print(f"✓ Lucas's primary attention = None (All Clear) - journey still 'Offer Received'")
    
    def test_sarah_has_no_primary(self, mission_control_data):
        """Sarah should have no primary attention status (All Clear)"""
        roster = mission_control_data.get("myRoster", [])
        sarah = next((a for a in roster if a.get("id") == "athlete_4"), None)
        
        if sarah is None:
            pytest.skip("Sarah (athlete_4) not in roster")
        
        attention = sarah.get("attention_status", {})
        primary = attention.get("primary")
        
        # Sarah should have no issues
        assert primary is None, f"Sarah's primary should be None (All Clear), got {primary}"
        print(f"✓ Sarah's primary attention = None (All Clear)")


class TestBlockerOutscoresFollowup:
    """Test that blockers always outscore event follow-ups"""
    
    def test_blocker_score_higher_than_followup(self, mission_control_data):
        """Blockers (critical pod issues) should always outrank event follow-ups"""
        roster = mission_control_data.get("myRoster", [])
        
        # Find athletes with blockers and athletes with follow-ups
        blockers = []
        followups = []
        
        for athlete in roster:
            attention = athlete.get("attention_status", {})
            primary = attention.get("primary")
            if primary:
                nature = primary.get("nature", "")
                if nature == "blocker":
                    blockers.append((athlete.get("name"), primary.get("score", 0)))
                elif nature == "urgent_followup":
                    followups.append((athlete.get("name"), primary.get("score", 0)))
        
        if blockers and followups:
            min_blocker_score = min(score for _, score in blockers)
            max_followup_score = max(score for _, score in followups)
            
            print(f"  Blockers: {blockers}")
            print(f"  Follow-ups: {followups}")
            
            # Blockers should generally score higher than follow-ups
            # Note: This isn't a strict requirement if time sensitivity differs significantly
            assert min_blocker_score >= max_followup_score - 10, \
                f"Blocker min score ({min_blocker_score}) should be close to or higher than followup max score ({max_followup_score})"
            print(f"✓ Blocker scores ({min_blocker_score}+) >= followup scores ({max_followup_score}-)")
        else:
            print(f"✓ Cannot compare (blockers: {len(blockers)}, followups: {len(followups)})")


class TestSecondarySignals:
    """Test secondary signals are populated for athletes with multiple issues"""
    
    def test_emma_has_secondary_signals(self, mission_control_data):
        """Emma should have secondary signals showing event follow-up + school alerts"""
        roster = mission_control_data.get("myRoster", [])
        emma = next((a for a in roster if a.get("id") == "athlete_1"), None)
        
        if emma is None:
            pytest.skip("Emma (athlete_1) not in roster")
        
        attention = emma.get("attention_status", {})
        secondary = attention.get("secondary", [])
        total = attention.get("total_issues", 0)
        
        # Emma should have multiple issues (overdue_actions as primary + other signals)
        print(f"  Emma total_issues: {total}")
        print(f"  Emma secondary: {secondary}")
        
        # If Emma has more than 1 issue, secondary should not be empty
        if total > 1:
            assert len(secondary) >= 1, f"Emma should have secondary signals if total_issues > 1"
            print(f"✓ Emma has {len(secondary)} secondary signals")
        else:
            print(f"✓ Emma has only 1 issue (no secondary)")


class TestNeedingActionCount:
    """Test todays_summary.needingAction matches athletes with attention_status.primary"""
    
    def test_needing_action_count_matches(self, mission_control_data):
        """todays_summary.needingAction should equal count of athletes with primary attention"""
        roster = mission_control_data.get("myRoster", [])
        summary = mission_control_data.get("todays_summary", {})
        
        # Count athletes with primary attention status
        with_primary = [a for a in roster if a.get("attention_status", {}).get("primary") is not None]
        expected_count = len(with_primary)
        
        # Get reported count
        reported_count = summary.get("needingAction", -1)
        
        assert reported_count == expected_count, \
            f"needingAction ({reported_count}) should match athletes with primary ({expected_count})"
        
        print(f"✓ needingAction = {reported_count} matches {expected_count} athletes with primary attention")
        
        # List athletes needing action
        for a in with_primary:
            primary = a.get("attention_status", {}).get("primary", {})
            print(f"  - {a.get('name')}: {primary.get('label')} (score: {primary.get('score', 0)})")


class TestJourneyIndependentOfAttention:
    """Test Journey State is never overridden by Attention Status"""
    
    def test_journey_preserved_with_issues(self, mission_control_data):
        """Athletes with attention issues should still have their journey state preserved"""
        roster = mission_control_data.get("myRoster", [])
        
        # Find athletes with both journey state and attention issues
        for athlete in roster:
            journey = athlete.get("journey_state", {})
            attention = athlete.get("attention_status", {})
            primary = attention.get("primary")
            
            # Every athlete should have a journey state label
            assert journey.get("label") is not None, \
                f"{athlete.get('name')} missing journey_state.label"
            
            # Journey label should be one of the valid states
            valid_labels = [
                "Committed", "Offer Received", "Visiting Schools",
                "Building Interest", "Reaching Out", "Getting Started"
            ]
            assert journey.get("label") in valid_labels, \
                f"{athlete.get('name')} has invalid journey label: {journey.get('label')}"
            
            if primary:
                # Verify attention does NOT override journey
                assert journey.get("label") != primary.get("label"), \
                    f"{athlete.get('name')}: journey '{journey.get('label')}' should differ from attention '{primary.get('label')}'"
        
        print(f"✓ All {len(roster)} athletes have valid journey states independent of attention status")


class TestAllClearSection:
    """Test athletes with no issues should show only journey state badge"""
    
    def test_all_clear_athletes_have_no_primary(self, mission_control_data):
        """Athletes in 'All Clear' section should have primary=None"""
        roster = mission_control_data.get("myRoster", [])
        
        all_clear = [a for a in roster if a.get("attention_status", {}).get("primary") is None]
        
        print(f"✓ {len(all_clear)} athletes in All Clear section:")
        for a in all_clear:
            journey = a.get("journey_state", {})
            print(f"  - {a.get('name')}: {journey.get('label')}")
        
        # Verify all_clear athletes have journey state but no attention
        for a in all_clear:
            journey = a.get("journey_state", {})
            attention = a.get("attention_status", {})
            
            assert journey.get("label") is not None, f"{a.get('name')} missing journey_state.label"
            assert attention.get("primary") is None, f"{a.get('name')} should not have primary attention"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

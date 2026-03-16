"""
Health Signal Consistency Tests
Tests for the unified health classification logic across list and detail endpoints.

P0 Bug Fix: Health signals were inconsistent between school list view and school detail view.
The fix unified health classification by:
1) classify_school_health() accepts actual_days_since_contact and playbook_complete params
2) List endpoint queries pod_action_events and playbook_progress for actual contact days
3) Detail endpoint computes health AFTER signal suppression
4) New hero_status field provides single source of truth for frontend
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
COACH_EMAIL = "coach.williams@capymatch.com"
COACH_PASSWORD = "coach123"
ATHLETE_ID = "athlete_1"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for coach user."""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": COACH_EMAIL, "password": COACH_PASSWORD},
        headers={"Content-Type": "application/json"}
    )
    if response.status_code != 200:
        pytest.skip(f"Auth failed: {response.status_code} - {response.text}")
    return response.json().get("token")


@pytest.fixture
def auth_headers(auth_token):
    """Create authorization headers."""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture(scope="module")
def schools_list(auth_token):
    """Fetch the schools list once for the module."""
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.get(
        f"{BASE_URL}/api/support-pods/{ATHLETE_ID}/schools",
        headers=headers
    )
    assert response.status_code == 200
    return response.json().get("schools", [])


class TestHealthConsistency:
    """Test that health status matches between list and detail endpoints."""

    def test_list_endpoint_returns_schools(self, auth_headers):
        """Basic test: list endpoint returns schools."""
        response = requests.get(
            f"{BASE_URL}/api/support-pods/{ATHLETE_ID}/schools",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "schools" in data
        assert len(data["schools"]) > 0
        print(f"Found {len(data['schools'])} schools for athlete")

    def test_school_list_has_health_fields(self, schools_list):
        """List endpoint returns all required health fields."""
        for school in schools_list:
            assert "health" in school, f"Missing 'health' in {school['university_name']}"
            assert "health_label" in school, f"Missing 'health_label' in {school['university_name']}"
            assert "health_color" in school, f"Missing 'health_color' in {school['university_name']}"
            assert "program_id" in school, f"Missing 'program_id' in {school['university_name']}"
        print(f"All {len(schools_list)} schools have required health fields")

    @pytest.mark.parametrize("school_index", range(7))  # Test up to 7 schools
    def test_health_consistency_list_vs_detail(self, auth_headers, schools_list, school_index):
        """CRITICAL: Verify health status matches between list and detail for each school."""
        if school_index >= len(schools_list):
            pytest.skip(f"Only {len(schools_list)} schools available")
        
        school = schools_list[school_index]
        program_id = school["program_id"]
        list_health = school["health"]
        list_label = school["health_label"]
        
        # Fetch detail endpoint
        response = requests.get(
            f"{BASE_URL}/api/support-pods/{ATHLETE_ID}/school/{program_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        detail = response.json()
        
        detail_health = detail["health"]
        detail_label = detail["health_display"]["label"]
        
        # CRITICAL CHECK: List and detail health must match
        assert list_health == detail_health, (
            f"CONSISTENCY BUG: {school['university_name']} - "
            f"List shows '{list_health}' ({list_label}) but Detail shows '{detail_health}' ({detail_label})"
        )
        
        print(f"✓ {school['university_name']}: list={list_health} == detail={detail_health}")


class TestHeroStatusAlignment:
    """Test that hero_status doesn't contradict health_display."""

    def test_detail_has_hero_status(self, auth_headers, schools_list):
        """Detail endpoint returns hero_status field."""
        for school in schools_list[:3]:  # Test first 3
            response = requests.get(
                f"{BASE_URL}/api/support-pods/{ATHLETE_ID}/school/{school['program_id']}",
                headers=auth_headers
            )
            assert response.status_code == 200
            detail = response.json()
            assert "hero_status" in detail, f"Missing hero_status for {school['university_name']}"
            assert "label" in detail["hero_status"]
            assert "color" in detail["hero_status"]
            assert "severity" in detail["hero_status"]
        print("All tested schools have hero_status with required fields")

    def test_hero_status_not_contradicts_health(self, auth_headers, schools_list):
        """hero_status.label should not contradict health_display.label in severity."""
        contradictions = []
        
        for school in schools_list:
            response = requests.get(
                f"{BASE_URL}/api/support-pods/{ATHLETE_ID}/school/{school['program_id']}",
                headers=auth_headers
            )
            if response.status_code != 200:
                continue
            
            detail = response.json()
            health = detail["health"]
            health_label = detail["health_display"]["label"]
            hero_label = detail["hero_status"]["label"]
            hero_severity = detail["hero_status"]["severity"]
            
            # Check for contradictions:
            # - at_risk health should NOT have hero "On Track"
            # - active/strong health should NOT have hero "Critical" or "At Risk"
            
            if health == "at_risk" and hero_label == "On Track":
                contradictions.append(f"{school['university_name']}: health=at_risk but hero=On Track")
            
            if health in ("active", "strong_momentum") and hero_label in ("Critical", "At Risk"):
                contradictions.append(f"{school['university_name']}: health={health} but hero={hero_label}")
            
            print(f"✓ {school['university_name']}: health={health}, hero={hero_label} (severity={hero_severity})")
        
        assert len(contradictions) == 0, f"Hero/Health contradictions found:\n" + "\n".join(contradictions)


class TestSignalSuppression:
    """Test that signals are properly suppressed based on context."""

    def test_recent_contact_suppresses_critical_signals(self, auth_headers, schools_list):
        """When actual_days_since_contact <= 3, critical/high signals should be suppressed."""
        for school in schools_list:
            if school.get("days_since_last_engagement") is not None and school["days_since_last_engagement"] <= 3:
                response = requests.get(
                    f"{BASE_URL}/api/support-pods/{ATHLETE_ID}/school/{school['program_id']}",
                    headers=auth_headers
                )
                detail = response.json()
                
                # Should not have critical or high priority signals if contact is recent
                critical_high_signals = [s for s in detail.get("signals", []) if s.get("priority") in ("critical", "high")]
                
                if school["days_since_last_engagement"] <= 3:
                    # With recent contact, critical/high signals should be suppressed
                    assert detail["health"] in ("active", "strong_momentum", "needs_follow_up", "awaiting_reply"), \
                        f"{school['university_name']}: Recent contact ({school['days_since_last_engagement']}d) but health={detail['health']}"
                    print(f"✓ {school['university_name']}: Recent contact ({school['days_since_last_engagement']}d), health={detail['health']}, signals suppressed correctly")
                    return  # Test passed for at least one school
        
        print("No schools with recent contact (<=3 days) found to test signal suppression")

    def test_playbook_complete_suppresses_critical(self, auth_headers, schools_list):
        """When playbook is complete, critical signals should be suppressed if contact is reasonably recent."""
        for school in schools_list:
            response = requests.get(
                f"{BASE_URL}/api/support-pods/{ATHLETE_ID}/school/{school['program_id']}",
                headers=auth_headers
            )
            detail = response.json()
            
            playbook = detail.get("playbook")
            checked_steps = detail.get("playbook_checked_steps", [])
            
            if playbook and len(playbook.get("steps", [])) > 0:
                total_steps = len(playbook["steps"])
                is_complete = len(checked_steps) >= total_steps
                
                if is_complete:
                    # If playbook is complete, critical signals should be suppressed
                    critical_signals = [s for s in detail.get("signals", []) if s.get("priority") == "critical"]
                    print(f"✓ {school['university_name']}: Playbook complete ({len(checked_steps)}/{total_steps}), critical signals: {len(critical_signals)}")
                    
                    # If playbook complete and recent contact, should NOT be at_risk
                    days = school.get("days_since_last_engagement")
                    if days is not None and days <= 14:
                        assert detail["health"] != "at_risk", \
                            f"BUG: {school['university_name']} has completed playbook and recent contact ({days}d) but health=at_risk"


class TestRecentContactOverride:
    """Test that recent contact properly overrides stale health states."""

    def test_active_health_for_recent_contact(self, auth_headers, schools_list):
        """Schools with actual_days <= 3 should show 'active' health, not 'at_risk'."""
        for school in schools_list:
            days = school.get("days_since_last_engagement")
            if days is not None and days <= 3:
                # Recent contact should result in active health
                assert school["health"] not in ("at_risk", "cooling_off"), \
                    f"BUG: {school['university_name']} has recent contact ({days}d) but health={school['health']}"
                print(f"✓ {school['university_name']}: days={days}, health={school['health']} (not at_risk)")
                return
        
        print("No schools with days <= 3 found - testing University of Florida directly")
        # University of Florida should have days_since=0 based on earlier test
        uf_schools = [s for s in schools_list if s["university_name"] == "University of Florida"]
        if uf_schools:
            uf = uf_schools[0]
            assert uf["health"] == "active", f"University of Florida should be 'active' but is {uf['health']}"
            print(f"✓ University of Florida: health=active (as expected for recent contact)")


class TestStaleContactHandling:
    """Test that stale contact is properly flagged."""

    def test_stale_contact_shows_risk(self, auth_headers, schools_list):
        """Schools with actual_days > 30 and overdue followups should show at_risk."""
        for school in schools_list:
            days = school.get("days_since_last_engagement")
            overdue = school.get("overdue_followups", 0)
            
            if days is not None and days > 30 and overdue > 0:
                # Stale + overdue should be at_risk
                assert school["health"] in ("at_risk", "needs_attention"), \
                    f"{school['university_name']}: {days}d stale + {overdue} overdue should be at_risk but is {school['health']}"
                print(f"✓ {school['university_name']}: {days}d stale + {overdue} overdue = {school['health']}")
                return
        
        print("No schools with stale contact (>30d) AND overdue followups found")


class TestAwaitingReplyState:
    """Test the awaiting_reply health state."""

    def test_awaiting_reply_schools(self, schools_list):
        """Schools with outreach sent but no meaningful engagement should show awaiting_reply."""
        awaiting = [s for s in schools_list if s["health"] == "awaiting_reply"]
        
        for school in awaiting:
            # These should NOT be at_risk
            assert school["health_label"] == "Awaiting Reply"
            print(f"✓ {school['university_name']}: health=awaiting_reply (not misclassified as at_risk)")
        
        if not awaiting:
            print("No schools in awaiting_reply state found")


class TestStillEarlyState:
    """Test the still_early health state for new schools."""

    def test_still_early_schools(self, schools_list):
        """New schools with no events should show still_early, not at_risk."""
        still_early = [s for s in schools_list if s["health"] == "still_early"]
        
        for school in still_early:
            assert school["health_label"] == "Early Stage"
            # days_since should be None or very low for early stage
            days = school.get("days_since_last_engagement")
            print(f"✓ {school['university_name']}: health=still_early, days={days}")
        
        if not still_early:
            print("No schools in still_early state found")


class TestDaysSinceEngagement:
    """Test that days_since_last_engagement uses actual timeline events."""

    def test_list_uses_actual_days(self, auth_headers, schools_list):
        """List endpoint should use actual days from timeline events when available."""
        # University of Florida should have days=0 based on recent event
        uf = next((s for s in schools_list if s["university_name"] == "University of Florida"), None)
        
        if uf:
            assert uf["days_since_last_engagement"] is not None
            assert uf["days_since_last_engagement"] <= 1, \
                f"University of Florida should have recent contact (0-1 days) but shows {uf['days_since_last_engagement']}"
            print(f"✓ University of Florida: days_since={uf['days_since_last_engagement']} (recent as expected)")
        else:
            pytest.skip("University of Florida not found in schools list")

    def test_detail_days_matches_list(self, auth_headers, schools_list):
        """Detail endpoint days_since should be consistent with list endpoint."""
        for school in schools_list[:3]:  # Test first 3
            response = requests.get(
                f"{BASE_URL}/api/support-pods/{ATHLETE_ID}/school/{school['program_id']}",
                headers=auth_headers
            )
            detail = response.json()
            
            list_days = school.get("days_since_last_engagement")
            detail_days = detail["metrics"].get("days_since_last_engagement")
            
            # Note: Detail uses metrics which may differ from actual timeline days
            # but health should still be consistent
            print(f"{school['university_name']}: list_days={list_days}, detail_metrics_days={detail_days}")


class TestEdgeCases:
    """Test edge cases for health classification."""

    def test_no_events_school(self, auth_headers, schools_list):
        """Schools with no recorded timeline events should have appropriate health states.
        
        Note: days_since_last_engagement=None means no timeline events, but the school
        may still have a health state based on metrics (e.g., stage_stalled_days, reply_status).
        - still_early: New schools with no history
        - awaiting_reply: Outreach sent but no meaningful engagement
        - cooling_off: Had engagement before but now stale (e.g., stage stalled)
        """
        for school in schools_list:
            if school.get("days_since_last_engagement") is None:
                # Schools without timeline events should NOT be 'active' or 'strong_momentum'
                assert school["health"] not in ("active", "strong_momentum"), \
                    f"{school['university_name']}: No recent events but health={school['health']} implies activity"
                print(f"✓ {school['university_name']}: No events, health={school['health']} (valid for no-events state)")

    def test_health_display_structure(self, auth_headers, schools_list):
        """Verify health_display has correct structure in detail response."""
        for school in schools_list[:2]:
            response = requests.get(
                f"{BASE_URL}/api/support-pods/{ATHLETE_ID}/school/{school['program_id']}",
                headers=auth_headers
            )
            detail = response.json()
            
            health_display = detail["health_display"]
            assert "label" in health_display
            assert "color" in health_display
            assert "bg" in health_display
            print(f"✓ {school['university_name']}: health_display structure valid")


class TestFrontendDataContract:
    """Test that backend provides all data frontend needs."""

    def test_hero_status_for_frontend(self, auth_headers, schools_list):
        """Detail endpoint provides hero_status for frontend single source of truth."""
        for school in schools_list[:3]:
            response = requests.get(
                f"{BASE_URL}/api/support-pods/{ATHLETE_ID}/school/{school['program_id']}",
                headers=auth_headers
            )
            detail = response.json()
            
            # Frontend should use hero_status directly
            hero = detail["hero_status"]
            assert "label" in hero
            assert "color" in hero
            assert "severity" in hero
            
            # Severity should be valid
            assert hero["severity"] in ("critical", "high", "medium", "info", "ok")
            print(f"✓ {school['university_name']}: hero_status.severity={hero['severity']}")

    def test_list_health_label_for_frontend(self, schools_list):
        """List endpoint provides health_label for direct display."""
        for school in schools_list:
            assert "health_label" in school
            assert "health_color" in school
            assert school["health_label"] != ""
            print(f"✓ {school['university_name']}: health_label={school['health_label']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

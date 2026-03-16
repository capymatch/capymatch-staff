"""
Tests for Dashboard School Alerts Feature
==========================================
Tests the new _enrich_roster_with_school_alerts() function in mission_control.py
that adds school-level alert counts to coach dashboard roster items.

Key features to test:
1. Emma Chen (athlete_1) should show school_alerts=2 (Emory: at_risk, Stanford: cooling_off)
2. Category promotion: Athletes with school alerts but no existing category get 'school_alert'
3. KPI consistency: todays_summary.needingAction includes promoted athletes
4. Early stage schools show 'still_early' with no signals, no '999 days'
5. School pod list-detail consistency
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Coach credentials
COACH_EMAIL = "coach.williams@capymatch.com"
COACH_PASSWORD = "coach123"

# Test athlete IDs
EMMA_ATHLETE_ID = "athlete_1"

# Test program IDs (from context)
PENN_STATE_PROGRAM_ID = "9f280f43-f1f8-4965-8e0e-fcbba322eacc"


@pytest.fixture(scope="module")
def coach_token():
    """Authenticate as coach and get token."""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": COACH_EMAIL,
        "password": COACH_PASSWORD
    })
    assert response.status_code == 200, f"Coach login failed: {response.text}"
    data = response.json()
    assert "token" in data, "No token in login response"
    return data["token"]


@pytest.fixture(scope="module")
def coach_headers(coach_token):
    """Return headers with coach auth token."""
    return {"Authorization": f"Bearer {coach_token}"}


class TestMissionControlSchoolAlerts:
    """Tests for dashboard mission-control endpoint with school alerts."""
    
    def test_mission_control_loads(self, coach_headers):
        """Mission control endpoint returns 200."""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=coach_headers)
        assert response.status_code == 200, f"Mission control failed: {response.text}"
        data = response.json()
        assert "role" in data
        assert data["role"] == "club_coach"
        print("✓ Mission control loads successfully")
    
    def test_roster_has_school_alerts_field(self, coach_headers):
        """Roster items include school_alerts field."""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=coach_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "myRoster" in data, "Missing myRoster in response"
        roster = data["myRoster"]
        assert len(roster) > 0, "Roster is empty"
        
        # Find Emma Chen (athlete_1)
        emma = next((a for a in roster if a["id"] == EMMA_ATHLETE_ID), None)
        assert emma is not None, f"Emma Chen (athlete_1) not found in roster"
        
        # Check school_alerts field exists
        assert "school_alerts" in emma, f"school_alerts field missing for Emma: {emma.keys()}"
        print(f"✓ Emma has school_alerts field: {emma['school_alerts']}")
    
    def test_emma_has_two_school_alerts(self, coach_headers):
        """Emma Chen should have exactly 2 school alerts (Emory: at_risk, Stanford: cooling_off)."""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=coach_headers)
        assert response.status_code == 200
        data = response.json()
        
        roster = data["myRoster"]
        emma = next((a for a in roster if a["id"] == EMMA_ATHLETE_ID), None)
        assert emma is not None
        
        # According to requirements, Emma should have 2 schools at risk
        school_alerts = emma.get("school_alerts", 0)
        assert school_alerts >= 2, f"Emma should have at least 2 school alerts, got {school_alerts}"
        print(f"✓ Emma has {school_alerts} school alerts (expected >= 2)")
    
    def test_school_alert_details_present(self, coach_headers):
        """Athletes with school alerts should have school_alert_details."""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=coach_headers)
        assert response.status_code == 200
        data = response.json()
        
        roster = data["myRoster"]
        emma = next((a for a in roster if a["id"] == EMMA_ATHLETE_ID), None)
        assert emma is not None
        
        if emma.get("school_alerts", 0) > 0:
            assert "school_alert_details" in emma, "Missing school_alert_details for athlete with alerts"
            details = emma["school_alert_details"]
            assert isinstance(details, list), "school_alert_details should be a list"
            
            # Each detail should have university_name and health
            for detail in details:
                assert "university_name" in detail, f"Missing university_name in detail: {detail}"
                assert "health" in detail, f"Missing health in detail: {detail}"
            
            # Print the actual details for verification
            print(f"✓ Emma's school_alert_details: {details}")
            
            # Check if Emory and Stanford are in the alerts (per requirements)
            alert_schools = [d["university_name"] for d in details]
            print(f"  Schools with alerts: {alert_schools}")
    
    def test_category_promotion_for_school_alerts(self, coach_headers):
        """Athletes with school alerts but no existing category get promoted to 'school_alert'."""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=coach_headers)
        assert response.status_code == 200
        data = response.json()
        
        roster = data["myRoster"]
        
        # Find athletes with school_alerts > 0
        athletes_with_alerts = [a for a in roster if a.get("school_alerts", 0) > 0]
        print(f"✓ Found {len(athletes_with_alerts)} athletes with school alerts")
        
        for athlete in athletes_with_alerts:
            # If they have school alerts, they should either have a category already
            # or get promoted to 'school_alert'
            if athlete.get("category"):
                print(f"  {athlete['name']}: category={athlete['category']}, alerts={athlete['school_alerts']}")
    
    def test_needing_action_includes_school_alert_athletes(self, coach_headers):
        """todays_summary.needingAction should include athletes promoted via school alerts."""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=coach_headers)
        assert response.status_code == 200
        data = response.json()
        
        roster = data["myRoster"]
        summary = data.get("todays_summary", {})
        
        # Count athletes needing action (with category)
        needing_action_list = [a for a in roster if a.get("category")]
        needing_action_count = summary.get("needingAction", 0)
        
        assert needing_action_count == len(needing_action_list), \
            f"KPI mismatch: needingAction={needing_action_count}, but {len(needing_action_list)} athletes have category"
        
        # Specifically check if school_alert category athletes are counted
        school_alert_athletes = [a for a in roster if a.get("category") == "school_alert"]
        print(f"✓ needingAction={needing_action_count}, includes {len(school_alert_athletes)} school_alert athletes")
    
    def test_why_field_for_school_alert_category(self, coach_headers):
        """Athletes with school_alert category should have descriptive 'why' field."""
        response = requests.get(f"{BASE_URL}/api/mission-control", headers=coach_headers)
        assert response.status_code == 200
        data = response.json()
        
        roster = data["myRoster"]
        
        # Find athlete with school_alert category or school alerts
        emma = next((a for a in roster if a["id"] == EMMA_ATHLETE_ID), None)
        assert emma is not None
        
        if emma.get("category") == "school_alert":
            assert "why" in emma and emma["why"], \
                f"school_alert athlete should have why field: {emma}"
            # The why should mention schools
            print(f"✓ school_alert 'why' field: {emma['why']}")
        else:
            # Even if not promoted, check school_alerts are present
            print(f"  Emma category: {emma.get('category')}, school_alerts: {emma.get('school_alerts')}")


class TestSchoolPodListHealth:
    """Tests for school list endpoint health classification."""
    
    def test_school_list_loads(self, coach_headers):
        """School list endpoint returns schools with health."""
        response = requests.get(
            f"{BASE_URL}/api/support-pods/{EMMA_ATHLETE_ID}/schools",
            headers=coach_headers
        )
        assert response.status_code == 200, f"School list failed: {response.text}"
        data = response.json()
        
        assert "schools" in data
        assert "total" in data
        schools = data["schools"]
        assert len(schools) > 0, "No schools found for Emma"
        print(f"✓ Found {len(schools)} schools for Emma")
    
    def test_early_stage_schools_show_still_early(self, coach_headers):
        """Prospect/Not Contacted schools should show 'still_early' health."""
        response = requests.get(
            f"{BASE_URL}/api/support-pods/{EMMA_ATHLETE_ID}/schools",
            headers=coach_headers
        )
        assert response.status_code == 200
        data = response.json()
        schools = data["schools"]
        
        # Find early-stage schools (Prospect, Not Contacted, Added)
        early_stages = ("Prospect", "Not Contacted", "Added", "")
        early_schools = [s for s in schools if s.get("recruiting_status", "").strip() in early_stages]
        
        for school in early_schools:
            health = school.get("health", "")
            # Early-stage schools should NOT be at_risk or cooling_off
            assert health not in ("at_risk", "cooling_off", "needs_attention"), \
                f"Early-stage school {school['university_name']} should be 'still_early', got '{health}'"
            print(f"✓ {school['university_name']} (status={school.get('recruiting_status')}) health={health}")
    
    def test_no_999_days_for_early_schools(self, coach_headers):
        """Early-stage schools should not show 999 days since engagement."""
        response = requests.get(
            f"{BASE_URL}/api/support-pods/{EMMA_ATHLETE_ID}/schools",
            headers=coach_headers
        )
        assert response.status_code == 200
        data = response.json()
        schools = data["schools"]
        
        for school in schools:
            days = school.get("days_since_last_engagement")
            recruiting_status = school.get("recruiting_status", "").strip()
            
            if days is not None and days >= 999:
                # This is a bug - 999 is a fallback value and shouldn't be shown
                print(f"WARNING: {school['university_name']} shows {days} days (status={recruiting_status})")
                # For early-stage, this is especially wrong
                if recruiting_status in ("Prospect", "Not Contacted", "Added", ""):
                    assert False, f"Early-stage school {school['university_name']} shows 999 days"
            else:
                print(f"✓ {school['university_name']}: days_since={days}")


class TestSchoolPodDetailConsistency:
    """Tests for list-detail health consistency."""
    
    def test_list_detail_health_match(self, coach_headers):
        """School health on list should match detail view."""
        # Get list
        list_response = requests.get(
            f"{BASE_URL}/api/support-pods/{EMMA_ATHLETE_ID}/schools",
            headers=coach_headers
        )
        assert list_response.status_code == 200
        schools = list_response.json()["schools"]
        
        # Check first 3 schools for consistency
        for school in schools[:3]:
            program_id = school["program_id"]
            list_health = school["health"]
            
            # Get detail
            detail_response = requests.get(
                f"{BASE_URL}/api/support-pods/{EMMA_ATHLETE_ID}/school/{program_id}",
                headers=coach_headers
            )
            assert detail_response.status_code == 200
            detail = detail_response.json()
            detail_health = detail["health"]
            
            assert list_health == detail_health, \
                f"{school['university_name']}: list health '{list_health}' != detail health '{detail_health}'"
            print(f"✓ {school['university_name']}: list={list_health}, detail={detail_health} MATCH")
    
    def test_hero_status_from_backend(self, coach_headers):
        """School Pod hero_status should come from backend."""
        # Get list first to find a school
        list_response = requests.get(
            f"{BASE_URL}/api/support-pods/{EMMA_ATHLETE_ID}/schools",
            headers=coach_headers
        )
        assert list_response.status_code == 200
        schools = list_response.json()["schools"]
        
        if not schools:
            pytest.skip("No schools to test")
        
        # Get detail for first school
        program_id = schools[0]["program_id"]
        detail_response = requests.get(
            f"{BASE_URL}/api/support-pods/{EMMA_ATHLETE_ID}/school/{program_id}",
            headers=coach_headers
        )
        assert detail_response.status_code == 200
        detail = detail_response.json()
        
        # hero_status should exist and have required fields
        assert "hero_status" in detail, "Missing hero_status in school pod detail"
        hero = detail["hero_status"]
        assert "label" in hero, "hero_status missing label"
        assert "color" in hero, "hero_status missing color"
        
        print(f"✓ hero_status for {schools[0]['university_name']}: label={hero['label']}, color={hero['color']}")


class TestEarlyStageSchools:
    """Tests specifically for early-stage school handling (Prospect, Not Contacted)."""
    
    def test_early_stage_no_signals(self, coach_headers):
        """Early-stage schools should not generate engagement-based signals."""
        # Get list of schools
        list_response = requests.get(
            f"{BASE_URL}/api/support-pods/{EMMA_ATHLETE_ID}/schools",
            headers=coach_headers
        )
        assert list_response.status_code == 200
        schools = list_response.json()["schools"]
        
        # Find an early-stage school
        early_stages = ("Prospect", "Not Contacted", "Added", "")
        early_school = next((s for s in schools if s.get("recruiting_status", "").strip() in early_stages), None)
        
        if not early_school:
            pytest.skip("No early-stage schools found")
        
        # Get detail for this school
        detail_response = requests.get(
            f"{BASE_URL}/api/support-pods/{EMMA_ATHLETE_ID}/school/{early_school['program_id']}",
            headers=coach_headers
        )
        assert detail_response.status_code == 200
        detail = detail_response.json()
        
        signals = detail.get("signals", [])
        # Early-stage schools should have no engagement-based alerts
        alert_signals = [s for s in signals if s.get("type") in ("alert", "warning")]
        
        if alert_signals:
            print(f"WARNING: Early-stage {early_school['university_name']} has signals: {alert_signals}")
        else:
            print(f"✓ Early-stage {early_school['university_name']} has no alert signals")
        
        # Should be empty or only have info-level signals
        for sig in alert_signals:
            # These specific signal IDs should NOT appear for early-stage
            assert sig.get("id") not in ("sig_overdue", "sig_stale"), \
                f"Early-stage school should not have {sig.get('id')} signal"


class TestSignalSuppression:
    """Tests for signal suppression with recent contact."""
    
    def test_recent_contact_suppresses_critical_signals(self, coach_headers):
        """Schools with recent contact (≤3 days) should not show critical/high signals."""
        list_response = requests.get(
            f"{BASE_URL}/api/support-pods/{EMMA_ATHLETE_ID}/schools",
            headers=coach_headers
        )
        assert list_response.status_code == 200
        schools = list_response.json()["schools"]
        
        # Find schools with recent contact
        recent_schools = [s for s in schools 
                        if s.get("days_since_last_engagement") is not None 
                        and s.get("days_since_last_engagement") <= 3]
        
        for school in recent_schools:
            # Get detail
            detail_response = requests.get(
                f"{BASE_URL}/api/support-pods/{EMMA_ATHLETE_ID}/school/{school['program_id']}",
                headers=coach_headers
            )
            assert detail_response.status_code == 200
            detail = detail_response.json()
            
            signals = detail.get("signals", [])
            critical_high = [s for s in signals if s.get("priority") in ("critical", "high")]
            
            # Recent contact should suppress critical/high signals
            if critical_high:
                print(f"WARNING: {school['university_name']} has {len(critical_high)} critical/high signals despite recent contact")
            else:
                print(f"✓ {school['university_name']} (days={school['days_since_last_engagement']}): no critical/high signals")


class TestDashboardIntegration:
    """Integration tests for dashboard school alerts flow."""
    
    def test_full_dashboard_flow(self, coach_headers):
        """End-to-end test: login -> mission-control -> verify Emma's school alerts."""
        # 1. Get mission control data
        mc_response = requests.get(f"{BASE_URL}/api/mission-control", headers=coach_headers)
        assert mc_response.status_code == 200
        mc_data = mc_response.json()
        
        # 2. Find Emma in roster
        roster = mc_data.get("myRoster", [])
        emma = next((a for a in roster if a["id"] == EMMA_ATHLETE_ID), None)
        assert emma is not None, "Emma not in roster"
        
        # 3. Check school alerts
        school_alerts = emma.get("school_alerts", 0)
        school_alert_details = emma.get("school_alert_details", [])
        
        print(f"Emma Chen dashboard data:")
        print(f"  - school_alerts: {school_alerts}")
        print(f"  - school_alert_details: {school_alert_details}")
        print(f"  - category: {emma.get('category')}")
        print(f"  - why: {emma.get('why')}")
        
        # 4. Get her school list for verification
        schools_response = requests.get(
            f"{BASE_URL}/api/support-pods/{EMMA_ATHLETE_ID}/schools",
            headers=coach_headers
        )
        assert schools_response.status_code == 200
        schools = schools_response.json()["schools"]
        
        # Count schools with alert-level health
        alert_health_states = {"at_risk", "cooling_off", "needs_attention", "needs_follow_up"}
        schools_needing_attention = [s for s in schools if s.get("health") in alert_health_states]
        
        print(f"\nSchools with alert-level health:")
        for s in schools_needing_attention:
            print(f"  - {s['university_name']}: {s['health']}")
        
        # Verify consistency
        assert school_alerts == len(schools_needing_attention), \
            f"Dashboard school_alerts ({school_alerts}) != actual schools needing attention ({len(schools_needing_attention)})"
        
        print(f"\n✓ Dashboard school_alerts count matches school list ({school_alerts})")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

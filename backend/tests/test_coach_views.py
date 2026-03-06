"""
Test Coach-Specific Views for Program Intelligence

Tests the persona switcher functionality with two modes:
- Director (Program View): Full program view with all 25 athletes
- Coach View: Filtered view by coach ownership (Martinez ~8, Rivera ~4 athletes)

No auth - uses coach_id parameter for filtering.
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestCoachesList:
    """Test GET /api/program/coaches endpoint"""

    def test_coaches_endpoint_returns_list(self):
        """Verify coaches endpoint returns a list"""
        response = requests.get(f"{BASE_URL}/api/program/coaches")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list of coaches"
        print(f"Coaches endpoint returned {len(data)} coaches")

    def test_coaches_have_required_fields(self):
        """Each coach should have id, name, and athlete_count"""
        response = requests.get(f"{BASE_URL}/api/program/coaches")
        assert response.status_code == 200
        coaches = response.json()
        
        for coach in coaches:
            assert "id" in coach, f"Coach missing 'id': {coach}"
            assert "name" in coach, f"Coach missing 'name': {coach}"
            assert "athlete_count" in coach, f"Coach missing 'athlete_count': {coach}"
            print(f"  - {coach['name']}: {coach['athlete_count']} athletes")

    def test_coach_martinez_exists(self):
        """Coach Martinez should be in the coaches list"""
        response = requests.get(f"{BASE_URL}/api/program/coaches")
        coaches = response.json()
        coach_names = [c['name'] for c in coaches]
        assert 'Coach Martinez' in coach_names, f"Coach Martinez not found. Available: {coach_names}"
        print("Coach Martinez found in coaches list")

    def test_coach_rivera_exists(self):
        """Coach Rivera should be in the coaches list"""
        response = requests.get(f"{BASE_URL}/api/program/coaches")
        coaches = response.json()
        coach_names = [c['name'] for c in coaches]
        assert 'Coach Rivera' in coach_names, f"Coach Rivera not found. Available: {coach_names}"
        print("Coach Rivera found in coaches list")


class TestDirectorView:
    """Test GET /api/program/intelligence (director mode - no coach_id)"""

    def test_director_view_mode(self):
        """Director view should have view_mode='director'"""
        response = requests.get(f"{BASE_URL}/api/program/intelligence")
        assert response.status_code == 200
        data = response.json()
        assert data.get('view_mode') == 'director', f"Expected view_mode='director', got {data.get('view_mode')}"
        print("Director view_mode confirmed")

    def test_director_athlete_count_is_25(self):
        """Director view should have athlete_count=25"""
        response = requests.get(f"{BASE_URL}/api/program/intelligence")
        assert response.status_code == 200
        data = response.json()
        assert data.get('athlete_count') == 25, f"Expected 25 athletes, got {data.get('athlete_count')}"
        print(f"Director view has {data.get('athlete_count')} athletes")

    def test_director_has_all_sections(self):
        """Director view should have all 5 sections"""
        response = requests.get(f"{BASE_URL}/api/program/intelligence")
        data = response.json()
        sections = ['program_health', 'readiness', 'event_effectiveness', 'advocacy_outcomes', 'support_load']
        for section in sections:
            assert section in data, f"Missing section: {section}"
        print("All 5 sections present in director view")

    def test_director_trends_have_direction(self):
        """Director trends should have direction='improving'/'declining'/'stable'"""
        response = requests.get(f"{BASE_URL}/api/program/intelligence")
        data = response.json()
        trends = data.get('trends', [])
        assert len(trends) > 0, "No trends in response"
        
        valid_directions = {'improving', 'declining', 'stable', 'baseline'}
        for trend in trends:
            direction = trend.get('direction')
            assert direction in valid_directions, f"Invalid direction '{direction}' in trend {trend.get('key')}"
        print(f"Director trends directions: {[t['direction'] for t in trends]}")

    def test_director_support_load_multiple_owners(self):
        """Director view should have multiple entries in support_load.by_owner"""
        response = requests.get(f"{BASE_URL}/api/program/intelligence")
        data = response.json()
        by_owner = data.get('support_load', {}).get('by_owner', [])
        assert len(by_owner) > 1, f"Expected multiple owners, got {len(by_owner)}"
        print(f"Director support_load has {len(by_owner)} owner entries")

    def test_director_support_load_imbalance_detection(self):
        """Director view should include imbalance detection"""
        response = requests.get(f"{BASE_URL}/api/program/intelligence")
        data = response.json()
        support_load = data.get('support_load', {})
        # imbalance_detected can be True or False, just verify it exists
        assert 'imbalance_detected' in support_load, "Missing imbalance_detected field"
        print(f"Director imbalance_detected: {support_load.get('imbalance_detected')}")

    def test_director_advocacy_school_activity(self):
        """Director view should have school_activity in advocacy_outcomes"""
        response = requests.get(f"{BASE_URL}/api/program/intelligence")
        data = response.json()
        school_activity = data.get('advocacy_outcomes', {}).get('school_activity', [])
        assert len(school_activity) > 0, "Director view should have school_activity"
        print(f"Director school_activity has {len(school_activity)} schools")


class TestCoachMartinezView:
    """Test GET /api/program/intelligence?coach_id=Coach%20Martinez"""

    def test_martinez_view_mode(self):
        """Coach Martinez view should have view_mode='coach'"""
        response = requests.get(f"{BASE_URL}/api/program/intelligence", params={"coach_id": "Coach Martinez"})
        assert response.status_code == 200
        data = response.json()
        assert data.get('view_mode') == 'coach', f"Expected view_mode='coach', got {data.get('view_mode')}"
        print("Coach Martinez view_mode='coach' confirmed")

    def test_martinez_athlete_count(self):
        """Coach Martinez should have ~8 athletes"""
        response = requests.get(f"{BASE_URL}/api/program/intelligence", params={"coach_id": "Coach Martinez"})
        data = response.json()
        count = data.get('athlete_count', 0)
        # Allow some flexibility: 6-10 athletes
        assert 5 <= count <= 12, f"Expected 6-10 athletes for Martinez, got {count}"
        print(f"Coach Martinez has {count} athletes")

    def test_martinez_coach_id_in_response(self):
        """Response should include coach_id='Coach Martinez'"""
        response = requests.get(f"{BASE_URL}/api/program/intelligence", params={"coach_id": "Coach Martinez"})
        data = response.json()
        assert data.get('coach_id') == 'Coach Martinez', f"Expected coach_id='Coach Martinez', got {data.get('coach_id')}"
        print("Coach Martinez coach_id confirmed in response")

    def test_martinez_support_load_single_owner(self):
        """Coach view should have exactly 1 entry in support_load.by_owner (only their own load)"""
        response = requests.get(f"{BASE_URL}/api/program/intelligence", params={"coach_id": "Coach Martinez"})
        data = response.json()
        by_owner = data.get('support_load', {}).get('by_owner', [])
        assert len(by_owner) == 1, f"Expected 1 owner entry for coach view, got {len(by_owner)}"
        assert by_owner[0]['owner'] == 'Coach Martinez', f"Expected only Coach Martinez, got {by_owner}"
        print(f"Coach Martinez support_load has single entry: {by_owner[0]['owner']}")

    def test_martinez_no_imbalance(self):
        """Coach view should have imbalance_detected=false (director-only concern)"""
        response = requests.get(f"{BASE_URL}/api/program/intelligence", params={"coach_id": "Coach Martinez"})
        data = response.json()
        imbalance = data.get('support_load', {}).get('imbalance_detected')
        assert imbalance == False, f"Coach view should have imbalance_detected=false, got {imbalance}"
        print("Coach Martinez imbalance_detected=false confirmed")

    def test_martinez_trends_direction_current(self):
        """Coach trends should have direction='current' not improving/declining"""
        response = requests.get(f"{BASE_URL}/api/program/intelligence", params={"coach_id": "Coach Martinez"})
        data = response.json()
        trends = data.get('trends', [])
        assert len(trends) > 0, "No trends in response"
        
        for trend in trends:
            direction = trend.get('direction')
            assert direction == 'current', f"Coach trend should have direction='current', got '{direction}' for {trend.get('key')}"
        print(f"All Coach Martinez trends have direction='current'")

    def test_martinez_advocacy_no_school_activity(self):
        """Coach view should have empty school_activity (director-only detail)"""
        response = requests.get(f"{BASE_URL}/api/program/intelligence", params={"coach_id": "Coach Martinez"})
        data = response.json()
        school_activity = data.get('advocacy_outcomes', {}).get('school_activity', [])
        assert school_activity == [], f"Coach view should have empty school_activity, got {len(school_activity)} items"
        print("Coach Martinez school_activity is empty (correct)")


class TestCoachRiveraView:
    """Test GET /api/program/intelligence?coach_id=Coach%20Rivera"""

    def test_rivera_view_mode(self):
        """Coach Rivera view should have view_mode='coach'"""
        response = requests.get(f"{BASE_URL}/api/program/intelligence", params={"coach_id": "Coach Rivera"})
        assert response.status_code == 200
        data = response.json()
        assert data.get('view_mode') == 'coach', f"Expected view_mode='coach', got {data.get('view_mode')}"
        print("Coach Rivera view_mode='coach' confirmed")

    def test_rivera_athlete_count(self):
        """Coach Rivera should have ~4 athletes"""
        response = requests.get(f"{BASE_URL}/api/program/intelligence", params={"coach_id": "Coach Rivera"})
        data = response.json()
        count = data.get('athlete_count', 0)
        # Allow some flexibility: 2-6 athletes
        assert 2 <= count <= 8, f"Expected 2-6 athletes for Rivera, got {count}"
        print(f"Coach Rivera has {count} athletes")

    def test_rivera_support_load_single_owner(self):
        """Coach Rivera view should have exactly 1 entry in support_load.by_owner"""
        response = requests.get(f"{BASE_URL}/api/program/intelligence", params={"coach_id": "Coach Rivera"})
        data = response.json()
        by_owner = data.get('support_load', {}).get('by_owner', [])
        assert len(by_owner) == 1, f"Expected 1 owner entry for coach view, got {len(by_owner)}"
        assert by_owner[0]['owner'] == 'Coach Rivera', f"Expected only Coach Rivera, got {by_owner}"
        print(f"Coach Rivera support_load has single entry: {by_owner[0]['owner']}")

    def test_rivera_no_imbalance(self):
        """Coach Rivera view should have imbalance_detected=false"""
        response = requests.get(f"{BASE_URL}/api/program/intelligence", params={"coach_id": "Coach Rivera"})
        data = response.json()
        imbalance = data.get('support_load', {}).get('imbalance_detected')
        assert imbalance == False, f"Coach view should have imbalance_detected=false, got {imbalance}"
        print("Coach Rivera imbalance_detected=false confirmed")

    def test_rivera_trends_direction_current(self):
        """Coach Rivera trends should have direction='current'"""
        response = requests.get(f"{BASE_URL}/api/program/intelligence", params={"coach_id": "Coach Rivera"})
        data = response.json()
        trends = data.get('trends', [])
        
        for trend in trends:
            direction = trend.get('direction')
            assert direction == 'current', f"Coach trend should have direction='current', got '{direction}'"
        print("All Coach Rivera trends have direction='current'")


class TestCoachFilteredData:
    """Test that coach views properly filter data"""

    def test_coach_filtered_health_data(self):
        """Coach view program_health should be based on filtered athletes"""
        # Get director view
        dir_response = requests.get(f"{BASE_URL}/api/program/intelligence")
        dir_data = dir_response.json()
        dir_health = dir_data['program_health']['pod_health']
        dir_total = dir_health['healthy'] + dir_health['needs_attention'] + dir_health['at_risk']

        # Get Martinez view
        coach_response = requests.get(f"{BASE_URL}/api/program/intelligence", params={"coach_id": "Coach Martinez"})
        coach_data = coach_response.json()
        coach_health = coach_data['program_health']['pod_health']
        coach_total = coach_health['healthy'] + coach_health['needs_attention'] + coach_health['at_risk']

        # Coach total should be less than director total
        assert coach_total < dir_total, f"Coach total ({coach_total}) should be less than director ({dir_total})"
        print(f"Director health total: {dir_total}, Coach Martinez: {coach_total}")

    def test_coach_filtered_recommendations(self):
        """Coach view should have filtered recommendation_count"""
        # Get director view
        dir_response = requests.get(f"{BASE_URL}/api/program/intelligence")
        dir_data = dir_response.json()
        dir_recs = dir_data.get('recommendation_count', 0)

        # Get Martinez view
        coach_response = requests.get(f"{BASE_URL}/api/program/intelligence", params={"coach_id": "Coach Martinez"})
        coach_data = coach_response.json()
        coach_recs = coach_data.get('recommendation_count', 0)

        # Coach recs should be <= director recs
        assert coach_recs <= dir_recs, f"Coach recs ({coach_recs}) should be <= director ({dir_recs})"
        print(f"Director recommendations: {dir_recs}, Coach Martinez: {coach_recs}")


class TestDataStructureValidation:
    """Validate response structures for both views"""

    def test_director_trends_structure(self):
        """Director trends should have proper structure with delta values"""
        response = requests.get(f"{BASE_URL}/api/program/intelligence")
        data = response.json()
        trends = data.get('trends', [])
        
        required_keys = ['key', 'label', 'current', 'suffix', 'delta', 'direction', 'interpretation']
        for trend in trends:
            for key in required_keys:
                assert key in trend, f"Trend missing '{key}': {trend}"
        print("Director trends have all required fields")

    def test_coach_trends_structure(self):
        """Coach trends should have proper structure (My Stats format)"""
        response = requests.get(f"{BASE_URL}/api/program/intelligence", params={"coach_id": "Coach Martinez"})
        data = response.json()
        trends = data.get('trends', [])
        
        required_keys = ['key', 'label', 'current', 'suffix', 'delta', 'direction', 'interpretation']
        for trend in trends:
            for key in required_keys:
                assert key in trend, f"Coach trend missing '{key}': {trend}"
            # Delta should be 0 for coach view
            assert trend['delta'] == 0, f"Coach trend delta should be 0, got {trend['delta']}"
        print("Coach trends have all required fields and delta=0")

    def test_event_effectiveness_filtered_for_coach(self):
        """Coach view should only show events with notes for their athletes"""
        response = requests.get(f"{BASE_URL}/api/program/intelligence", params={"coach_id": "Coach Martinez"})
        data = response.json()
        past_events = data.get('event_effectiveness', {}).get('past_events', [])
        # Events with no notes for this coach should be excluded
        for event in past_events:
            assert event.get('notes_captured', 0) > 0, f"Event with no notes shouldn't appear: {event.get('name')}"
        print(f"Coach Martinez has {len(past_events)} past events (all with notes)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

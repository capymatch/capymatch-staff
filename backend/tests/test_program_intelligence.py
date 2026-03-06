"""
Program Intelligence API Tests
Tests the GET /api/program/intelligence endpoint which returns 5 strategic decision sections:
1. Program Health - fragility, pod health, issues
2. Readiness - by grad year, stalled athletes
3. Event Effectiveness - past event outcomes, follow-up completion
4. Advocacy Outcomes - pipeline, response rates, aging recommendations
5. Support Load - owner distribution, imbalance detection
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')


class TestProgramIntelligenceAPI:
    """Test the /api/program/intelligence endpoint"""

    def test_endpoint_returns_200(self):
        """Test that the endpoint returns 200 OK"""
        response = requests.get(f"{BASE_URL}/api/program/intelligence")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: GET /api/program/intelligence returns 200")

    def test_response_has_all_five_sections(self):
        """Test that response contains all 5 required sections"""
        response = requests.get(f"{BASE_URL}/api/program/intelligence")
        data = response.json()
        
        required_sections = ['program_health', 'readiness', 'event_effectiveness', 'advocacy_outcomes', 'support_load']
        for section in required_sections:
            assert section in data, f"Missing section: {section}"
        print(f"PASS: Response has all 5 sections: {required_sections}")

    def test_response_has_metadata(self):
        """Test that response contains metadata fields"""
        response = requests.get(f"{BASE_URL}/api/program/intelligence")
        data = response.json()
        
        assert 'generated_at' in data, "Missing generated_at"
        assert 'athlete_count' in data, "Missing athlete_count"
        assert 'event_count' in data, "Missing event_count"
        assert 'recommendation_count' in data, "Missing recommendation_count"
        print(f"PASS: Metadata present - athlete_count={data['athlete_count']}, event_count={data['event_count']}, recommendation_count={data['recommendation_count']}")

    def test_expected_counts(self):
        """Test that counts match expected values from context"""
        response = requests.get(f"{BASE_URL}/api/program/intelligence")
        data = response.json()
        
        assert data['athlete_count'] == 25, f"Expected 25 athletes, got {data['athlete_count']}"
        assert data['event_count'] == 7, f"Expected 7 events, got {data['event_count']}"
        assert data['recommendation_count'] == 5, f"Expected 5 recommendations, got {data['recommendation_count']}"
        print("PASS: Expected counts match (25 athletes, 7 events, 5 recommendations)")


class TestProgramHealthSection:
    """Test Section 1: Program Health"""

    def test_pod_health_structure(self):
        """Test that pod_health has correct structure"""
        response = requests.get(f"{BASE_URL}/api/program/intelligence")
        data = response.json()
        health = data['program_health']
        
        assert 'pod_health' in health, "Missing pod_health"
        pod_health = health['pod_health']
        
        assert 'healthy' in pod_health, "Missing healthy count"
        assert 'needs_attention' in pod_health, "Missing needs_attention count"
        assert 'at_risk' in pod_health, "Missing at_risk count"
        
        # All should be non-negative integers
        assert isinstance(pod_health['healthy'], int) and pod_health['healthy'] >= 0
        assert isinstance(pod_health['needs_attention'], int) and pod_health['needs_attention'] >= 0
        assert isinstance(pod_health['at_risk'], int) and pod_health['at_risk'] >= 0
        
        print(f"PASS: Pod health counts - healthy={pod_health['healthy']}, needs_attention={pod_health['needs_attention']}, at_risk={pod_health['at_risk']}")

    def test_open_issues_structure(self):
        """Test that open_issues has correct structure"""
        response = requests.get(f"{BASE_URL}/api/program/intelligence")
        data = response.json()
        health = data['program_health']
        
        assert 'open_issues' in health, "Missing open_issues"
        issues = health['open_issues']
        
        required_keys = ['blockers', 'momentum_drops', 'event_follow_ups']
        for key in required_keys:
            assert key in issues, f"Missing {key} in open_issues"
            assert isinstance(issues[key], int), f"{key} should be int"
        
        print(f"PASS: Open issues - blockers={issues['blockers']}, momentum_drops={issues['momentum_drops']}, event_follow_ups={issues['event_follow_ups']}")

    def test_highest_risk_cluster_present(self):
        """Test that highest_risk_cluster is present with correct structure"""
        response = requests.get(f"{BASE_URL}/api/program/intelligence")
        data = response.json()
        health = data['program_health']
        
        assert 'highest_risk_cluster' in health, "Missing highest_risk_cluster"
        
        # Can be None if no risk clusters detected
        cluster = health['highest_risk_cluster']
        if cluster:
            assert 'type' in cluster, "Missing type in highest_risk_cluster"
            assert 'value' in cluster, "Missing value in highest_risk_cluster"
            assert 'reason' in cluster, "Missing reason in highest_risk_cluster"
            print(f"PASS: Highest risk cluster - {cluster['type']}={cluster['value']}, reason={cluster['reason']}")
        else:
            print("PASS: No highest risk cluster (None)")


class TestReadinessSection:
    """Test Section 2: Readiness"""

    def test_grad_years_structure(self):
        """Test that by_grad_year has 3 entries (2025, 2026, 2027)"""
        response = requests.get(f"{BASE_URL}/api/program/intelligence")
        data = response.json()
        readiness = data['readiness']
        
        assert 'by_grad_year' in readiness, "Missing by_grad_year"
        by_gy = readiness['by_grad_year']
        
        assert len(by_gy) == 3, f"Expected 3 grad years, got {len(by_gy)}"
        
        grad_years = [entry['grad_year'] for entry in by_gy]
        assert 2025 in grad_years, "Missing grad year 2025"
        assert 2026 in grad_years, "Missing grad year 2026"
        assert 2027 in grad_years, "Missing grad year 2027"
        
        print(f"PASS: 3 grad years present: {grad_years}")

    def test_grad_year_entry_structure(self):
        """Test that each grad year entry has required fields"""
        response = requests.get(f"{BASE_URL}/api/program/intelligence")
        data = response.json()
        by_gy = data['readiness']['by_grad_year']
        
        required_fields = ['grad_year', 'total_athletes', 'on_track_pct', 'actively_recruiting', 'blockers']
        for entry in by_gy:
            for field in required_fields:
                assert field in entry, f"Missing {field} in grad year {entry.get('grad_year', 'unknown')}"
            
            # Validate types
            assert isinstance(entry['total_athletes'], int), "total_athletes should be int"
            assert isinstance(entry['on_track_pct'], int), "on_track_pct should be int"
            assert 0 <= entry['on_track_pct'] <= 100, "on_track_pct should be 0-100"
        
        print("PASS: All grad year entries have required fields")
        for entry in by_gy:
            print(f"  {entry['grad_year']}: {entry['total_athletes']} athletes, {entry['on_track_pct']}% on track, {entry['blockers']} blockers")

    def test_stalled_athletes_structure(self):
        """Test that stalled_athletes is present"""
        response = requests.get(f"{BASE_URL}/api/program/intelligence")
        data = response.json()
        readiness = data['readiness']
        
        assert 'stalled_athletes' in readiness, "Missing stalled_athletes"
        stalled = readiness['stalled_athletes']
        
        assert isinstance(stalled, list), "stalled_athletes should be a list"
        
        # If any stalled athletes, verify structure
        if len(stalled) > 0:
            for athlete in stalled:
                assert 'id' in athlete, "Missing id in stalled athlete"
                assert 'name' in athlete, "Missing name in stalled athlete"
                assert 'grad_year' in athlete, "Missing grad_year in stalled athlete"
                assert 'days_in_stage' in athlete, "Missing days_in_stage in stalled athlete"
            print(f"PASS: {len(stalled)} stalled athletes found")
        else:
            print("PASS: No stalled athletes (empty list)")


class TestEventEffectivenessSection:
    """Test Section 3: Event Effectiveness"""

    def test_past_events_structure(self):
        """Test that past_events has correct structure with Winter Showcase"""
        response = requests.get(f"{BASE_URL}/api/program/intelligence")
        data = response.json()
        events = data['event_effectiveness']
        
        assert 'past_events' in events, "Missing past_events"
        past = events['past_events']
        
        assert isinstance(past, list), "past_events should be a list"
        assert len(past) >= 1, "Expected at least 1 past event"
        
        # Find Winter Showcase (event_0)
        winter_showcase = next((e for e in past if e['id'] == 'event_0' or 'Winter' in e.get('name', '')), None)
        assert winter_showcase is not None, "Expected Winter Showcase event"
        
        required_fields = ['id', 'name', 'notes_captured', 'hot_interactions', 'warm_interactions', 'follow_up_completion_pct']
        for field in required_fields:
            assert field in winter_showcase, f"Missing {field} in past event"
        
        # Verify 5 notes captured for Winter Showcase
        assert winter_showcase['notes_captured'] == 5, f"Expected 5 notes for Winter Showcase, got {winter_showcase['notes_captured']}"
        
        print(f"PASS: Winter Showcase found with {winter_showcase['notes_captured']} notes")
        print(f"  Hot: {winter_showcase['hot_interactions']}, Warm: {winter_showcase['warm_interactions']}")
        print(f"  Follow-up completion: {winter_showcase['follow_up_completion_pct']}%")

    def test_past_event_attention_note(self):
        """Test that attention_note is present for past events with follow-up issues"""
        response = requests.get(f"{BASE_URL}/api/program/intelligence")
        data = response.json()
        past = data['event_effectiveness']['past_events']
        
        # Check if any past event has attention_note (optional field)
        events_with_attention = [e for e in past if e.get('attention_note')]
        print(f"PASS: {len(events_with_attention)} past events have attention notes")
        for e in events_with_attention:
            print(f"  {e['name']}: {e['attention_note']}")

    def test_upcoming_events_structure(self):
        """Test that upcoming_events has correct structure"""
        response = requests.get(f"{BASE_URL}/api/program/intelligence")
        data = response.json()
        events = data['event_effectiveness']
        
        assert 'upcoming_events' in events, "Missing upcoming_events"
        upcoming = events['upcoming_events']
        
        assert isinstance(upcoming, list), "upcoming_events should be a list"
        
        if len(upcoming) > 0:
            for event in upcoming:
                assert 'id' in event, "Missing id in upcoming event"
                assert 'name' in event, "Missing name in upcoming event"
                assert 'days_away' in event, "Missing days_away in upcoming event"
                assert 'prep_status' in event, "Missing prep_status in upcoming event"
            print(f"PASS: {len(upcoming)} upcoming events with prep status")
        else:
            print("PASS: No upcoming events (empty list)")


class TestAdvocacyOutcomesSection:
    """Test Section 4: Advocacy Outcomes"""

    def test_pipeline_structure(self):
        """Test that pipeline has correct structure"""
        response = requests.get(f"{BASE_URL}/api/program/intelligence")
        data = response.json()
        advocacy = data['advocacy_outcomes']
        
        assert 'pipeline' in advocacy, "Missing pipeline"
        pipeline = advocacy['pipeline']
        
        required_fields = ['total', 'draft', 'sent', 'awaiting_reply', 'warm_response', 'closed']
        for field in required_fields:
            assert field in pipeline, f"Missing {field} in pipeline"
            assert isinstance(pipeline[field], int), f"{field} should be int"
        
        # Verify expected total
        assert pipeline['total'] == 5, f"Expected pipeline total=5, got {pipeline['total']}"
        
        print(f"PASS: Pipeline - total={pipeline['total']}, draft={pipeline['draft']}, sent={pipeline['sent']}, awaiting={pipeline['awaiting_reply']}, warm={pipeline['warm_response']}, closed={pipeline['closed']}")

    def test_response_rate(self):
        """Test that response_rate is present and valid"""
        response = requests.get(f"{BASE_URL}/api/program/intelligence")
        data = response.json()
        advocacy = data['advocacy_outcomes']
        
        assert 'response_rate' in advocacy, "Missing response_rate"
        rate = advocacy['response_rate']
        
        assert isinstance(rate, (int, float)), "response_rate should be numeric"
        assert 0 <= rate <= 1, f"response_rate should be 0-1, got {rate}"
        
        print(f"PASS: Response rate = {rate} ({round(rate * 100)}%)")

    def test_aging_recommendations_structure(self):
        """Test that aging_recommendations is present"""
        response = requests.get(f"{BASE_URL}/api/program/intelligence")
        data = response.json()
        advocacy = data['advocacy_outcomes']
        
        assert 'aging_recommendations' in advocacy, "Missing aging_recommendations"
        aging = advocacy['aging_recommendations']
        
        assert isinstance(aging, list), "aging_recommendations should be a list"
        
        if len(aging) > 0:
            for rec in aging:
                assert 'id' in rec, "Missing id in aging rec"
                assert 'athlete_name' in rec, "Missing athlete_name in aging rec"
                assert 'school_name' in rec, "Missing school_name in aging rec"
                assert 'days_since_sent' in rec, "Missing days_since_sent in aging rec"
            print(f"PASS: {len(aging)} aging recommendations found")
            for r in aging:
                print(f"  {r['athlete_name']} → {r['school_name']} ({r['days_since_sent']}d)")
        else:
            print("PASS: No aging recommendations (empty list)")

    def test_school_activity_structure(self):
        """Test that school_activity is present"""
        response = requests.get(f"{BASE_URL}/api/program/intelligence")
        data = response.json()
        advocacy = data['advocacy_outcomes']
        
        assert 'school_activity' in advocacy, "Missing school_activity"
        activity = advocacy['school_activity']
        
        assert isinstance(activity, list), "school_activity should be a list"
        
        if len(activity) > 0:
            for school in activity:
                assert 'school_name' in school, "Missing school_name"
                assert 'warmth' in school, "Missing warmth"
                assert 'recs_sent' in school, "Missing recs_sent"
            print(f"PASS: {len(activity)} schools in activity")
        else:
            print("PASS: No school activity (empty list)")


class TestSupportLoadSection:
    """Test Section 5: Support Load"""

    def test_by_owner_structure(self):
        """Test that by_owner has correct structure"""
        response = requests.get(f"{BASE_URL}/api/program/intelligence")
        data = response.json()
        support = data['support_load']
        
        assert 'by_owner' in support, "Missing by_owner"
        by_owner = support['by_owner']
        
        assert isinstance(by_owner, list), "by_owner should be a list"
        assert len(by_owner) > 0, "by_owner should not be empty"
        
        for owner in by_owner:
            assert 'owner' in owner, "Missing owner name"
            assert 'open_actions' in owner, "Missing open_actions"
            assert 'athletes_assigned' in owner, "Missing athletes_assigned"
            assert 'is_overloaded' in owner, "Missing is_overloaded"
        
        print(f"PASS: {len(by_owner)} owners in support load")
        for o in by_owner:
            overloaded = " (OVERLOADED)" if o['is_overloaded'] else ""
            print(f"  {o['owner']}: {o['open_actions']} actions, {o['athletes_assigned']} athletes{overloaded}")

    def test_unassigned_actions(self):
        """Test that unassigned_actions is present"""
        response = requests.get(f"{BASE_URL}/api/program/intelligence")
        data = response.json()
        support = data['support_load']
        
        assert 'unassigned_actions' in support, "Missing unassigned_actions"
        assert isinstance(support['unassigned_actions'], int), "unassigned_actions should be int"
        
        print(f"PASS: {support['unassigned_actions']} unassigned actions")

    def test_imbalance_detection(self):
        """Test that imbalance_detected and imbalance_note are present"""
        response = requests.get(f"{BASE_URL}/api/program/intelligence")
        data = response.json()
        support = data['support_load']
        
        assert 'imbalance_detected' in support, "Missing imbalance_detected"
        assert isinstance(support['imbalance_detected'], bool), "imbalance_detected should be bool"
        
        if support['imbalance_detected']:
            assert 'imbalance_note' in support, "Missing imbalance_note when imbalance detected"
            print(f"PASS: Imbalance detected - {support['imbalance_note']}")
        else:
            print("PASS: No imbalance detected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

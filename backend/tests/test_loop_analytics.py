"""
Loop Analytics API Tests
Tests for POST /api/analytics/events (batch ingest) and GET /api/analytics/loop-metrics (aggregation)
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials - Emma Chen athlete account
TEST_EMAIL = "emma.chen@athlete.capymatch.com"
TEST_PASSWORD = "athlete123"


class TestLoopAnalyticsAPI:
    """Tests for Loop Analytics endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token for Emma Chen"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as Emma Chen
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            self.token = data.get("access_token") or data.get("token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip(f"Login failed with status {login_response.status_code}")
    
    # ======== POST /api/analytics/events Tests ========
    
    def test_batch_ingest_three_events(self):
        """POST /api/analytics/events — test batch ingestion with 3 events, verify returns {ingested: 3}"""
        events = [
            {
                "event": "hero_viewed",
                "properties": {
                    "program_id": "test_prog_1",
                    "school_name": "Test University",
                    "priority_source": "live",
                    "attention_level": "high"
                }
            },
            {
                "event": "hero_expanded_why",
                "properties": {
                    "program_id": "test_prog_1",
                    "priority_source": "live",
                    "factors_count": 3
                }
            },
            {
                "event": "hero_action_clicked",
                "properties": {
                    "program_id": "test_prog_1",
                    "school_name": "Test University",
                    "priority_source": "live",
                    "cta_label": "View School"
                }
            }
        ]
        
        response = self.session.post(f"{BASE_URL}/api/analytics/events", json={"events": events})
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "ingested" in data, "Response should contain 'ingested' key"
        assert data["ingested"] == 3, f"Expected ingested: 3, got {data['ingested']}"
        print(f"PASS: Batch ingest returned ingested: {data['ingested']}")
    
    def test_batch_ingest_empty_events(self):
        """POST /api/analytics/events with empty events array — should return {ingested: 0}"""
        response = self.session.post(f"{BASE_URL}/api/analytics/events", json={"events": []})
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["ingested"] == 0, f"Expected ingested: 0, got {data['ingested']}"
        print(f"PASS: Empty batch returned ingested: 0")
    
    def test_ingest_all_event_types(self):
        """Test ingesting all supported analytics event types"""
        events = [
            {"event": "hero_viewed", "properties": {"program_id": "p1", "priority_source": "live"}},
            {"event": "hero_expanded_why", "properties": {"program_id": "p1"}},
            {"event": "hero_action_clicked", "properties": {"program_id": "p1", "priority_source": "live"}},
            {"event": "reinforcement_shown", "properties": {"trigger_type": "action_complete", "priority_source": "recap"}},
            {"event": "recap_teaser_viewed", "properties": {"heated_count": 2, "cooling_count": 1}},
            {"event": "recap_opened", "properties": {"heated": 2, "priorities": 3}},
            {"event": "recap_section_viewed", "properties": {"section": "momentum_shift"}},
            {"event": "recap_priority_clicked", "properties": {"program_id": "p2", "rank": "top"}}
        ]
        
        response = self.session.post(f"{BASE_URL}/api/analytics/events", json={"events": events})
        
        assert response.status_code == 200
        data = response.json()
        assert data["ingested"] == 8, f"Expected 8 events ingested, got {data['ingested']}"
        print(f"PASS: All 8 event types ingested successfully")
    
    # ======== GET /api/analytics/loop-metrics Tests ========
    
    def test_get_loop_metrics_structure(self):
        """GET /api/analytics/loop-metrics — verify returns structured metrics"""
        response = self.session.get(f"{BASE_URL}/api/analytics/loop-metrics")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Check top-level structure
        assert "total_events" in data, "Response should contain 'total_events'"
        assert "metrics" in data, "Response should contain 'metrics'"
        
        metrics = data.get("metrics", {})
        
        # Check expected metric keys exist (they may be 0 if no events)
        expected_keys = [
            "hero_view_count",
            "hero_click_rate",
            "why_expand_rate",
            "priority_source_breakdown",
            "completions_by_source"
        ]
        
        for key in expected_keys:
            assert key in metrics, f"Metrics should contain '{key}'"
        
        print(f"PASS: Loop metrics structure is correct. Total events: {data['total_events']}")
        print(f"  hero_view_count: {metrics.get('hero_view_count', 0)}")
        print(f"  hero_click_rate: {metrics.get('hero_click_rate', 0)}")
        print(f"  why_expand_rate: {metrics.get('why_expand_rate', 0)}")
        print(f"  priority_source_breakdown: {metrics.get('priority_source_breakdown', {})}")
        print(f"  completions_by_source: {metrics.get('completions_by_source', {})}")
    
    def test_get_loop_metrics_with_days_param(self):
        """GET /api/analytics/loop-metrics with days parameter"""
        response = self.session.get(f"{BASE_URL}/api/analytics/loop-metrics?days=7")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("period_days") == 7, f"Expected period_days: 7, got {data.get('period_days')}"
        print(f"PASS: Loop metrics accepts days parameter")
    
    def test_loop_metrics_without_auth(self):
        """GET /api/analytics/loop-metrics without auth — should return 401"""
        # Create new session without auth
        no_auth_session = requests.Session()
        no_auth_session.headers.update({"Content-Type": "application/json"})
        
        response = no_auth_session.get(f"{BASE_URL}/api/analytics/loop-metrics")
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print(f"PASS: Unauthenticated request returns 401")
    
    def test_events_without_auth(self):
        """POST /api/analytics/events without auth — should return 401"""
        no_auth_session = requests.Session()
        no_auth_session.headers.update({"Content-Type": "application/json"})
        
        response = no_auth_session.post(f"{BASE_URL}/api/analytics/events", json={
            "events": [{"event": "test", "properties": {}}]
        })
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print(f"PASS: Unauthenticated POST returns 401")
    
    # ======== Integration Test: Ingest then Verify in Metrics ========
    
    def test_ingest_and_verify_metrics_update(self):
        """Ingest events and verify they appear in loop-metrics"""
        # Get initial metrics
        initial_response = self.session.get(f"{BASE_URL}/api/analytics/loop-metrics")
        assert initial_response.status_code == 200
        initial_data = initial_response.json()
        initial_events = initial_data.get("total_events", 0)
        
        # Ingest new events
        events = [
            {"event": "hero_viewed", "properties": {"program_id": "int_test_prog", "priority_source": "live"}},
            {"event": "hero_viewed", "properties": {"program_id": "int_test_prog2", "priority_source": "recap"}}
        ]
        
        ingest_response = self.session.post(f"{BASE_URL}/api/analytics/events", json={"events": events})
        assert ingest_response.status_code == 200
        assert ingest_response.json()["ingested"] == 2
        
        # Get updated metrics
        updated_response = self.session.get(f"{BASE_URL}/api/analytics/loop-metrics")
        assert updated_response.status_code == 200
        updated_data = updated_response.json()
        updated_events = updated_data.get("total_events", 0)
        
        # Verify count increased
        assert updated_events >= initial_events + 2, f"Expected at least {initial_events + 2} events, got {updated_events}"
        print(f"PASS: Events increased from {initial_events} to {updated_events}")
    
    def test_priority_source_breakdown_tracking(self):
        """Verify priority_source_breakdown tracks live vs recap sources"""
        # Ingest events with different priority sources
        events = [
            {"event": "hero_viewed", "properties": {"program_id": "src_live", "priority_source": "live"}},
            {"event": "hero_viewed", "properties": {"program_id": "src_recap", "priority_source": "recap"}},
            {"event": "hero_viewed", "properties": {"program_id": "src_merged", "priority_source": "merged"}}
        ]
        
        response = self.session.post(f"{BASE_URL}/api/analytics/events", json={"events": events})
        assert response.status_code == 200
        
        # Get metrics
        metrics_response = self.session.get(f"{BASE_URL}/api/analytics/loop-metrics")
        assert metrics_response.status_code == 200
        data = metrics_response.json()
        
        breakdown = data.get("metrics", {}).get("priority_source_breakdown", {})
        
        # Verify all source types are tracked
        assert "live" in breakdown, "priority_source_breakdown should have 'live' key"
        assert "recap" in breakdown, "priority_source_breakdown should have 'recap' key"
        assert "merged" in breakdown, "priority_source_breakdown should have 'merged' key"
        
        print(f"PASS: priority_source_breakdown: {breakdown}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

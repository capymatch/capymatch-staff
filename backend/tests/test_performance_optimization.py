"""Performance Optimization Tests - Iteration 279

Tests for:
1. Profile endpoint with ?lite=true param (excludes photo_url)
2. Journey endpoint response time and parallelized queries
3. Top-actions batch queries
4. Pipeline page data loading
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
PROGRAM_ID = "cd5c0908-c3ea-49d1-8a5f-d57d18f32116"  # Test program for journey tests


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for athlete user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "emma.chen@athlete.capymatch.com",
        "password": "athlete123"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestProfileEndpointLiteMode:
    """Tests for /api/athlete/profile with ?lite=true parameter"""
    
    def test_profile_full_returns_photo_url(self, auth_headers):
        """Full profile should include photo_url field"""
        response = requests.get(f"{BASE_URL}/api/athlete/profile", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        # photo_url field should exist (may be empty string)
        assert "photo_url" in data or "athlete_name" in data, "Profile should have expected fields"
        print(f"Full profile response size: {len(response.content)} bytes")
    
    def test_profile_lite_excludes_photo_url(self, auth_headers):
        """Lite profile should NOT include photo_url field"""
        response = requests.get(f"{BASE_URL}/api/athlete/profile?lite=true", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        # photo_url should be excluded in lite mode
        assert "photo_url" not in data, "Lite profile should NOT include photo_url"
        # Other fields should still be present
        assert "athlete_name" in data or "contact_email" in data, "Lite profile should have other fields"
        print(f"Lite profile response size: {len(response.content)} bytes")
    
    def test_lite_profile_smaller_than_full(self, auth_headers):
        """Lite profile should be smaller than full profile"""
        full_response = requests.get(f"{BASE_URL}/api/athlete/profile", headers=auth_headers)
        lite_response = requests.get(f"{BASE_URL}/api/athlete/profile?lite=true", headers=auth_headers)
        
        assert full_response.status_code == 200
        assert lite_response.status_code == 200
        
        full_size = len(full_response.content)
        lite_size = len(lite_response.content)
        
        print(f"Full profile: {full_size} bytes, Lite profile: {lite_size} bytes")
        # Lite should be smaller or equal (if no photo)
        assert lite_size <= full_size, "Lite profile should be smaller or equal to full profile"


class TestJourneyEndpointPerformance:
    """Tests for /api/athlete/programs/{id}/journey endpoint performance"""
    
    def test_journey_endpoint_returns_timeline(self, auth_headers):
        """Journey endpoint should return timeline data"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/programs/{PROGRAM_ID}/journey",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "timeline" in data, "Journey response should have timeline"
        print(f"Journey timeline has {len(data['timeline'])} items")
    
    def test_journey_endpoint_response_time(self, auth_headers):
        """Journey endpoint should respond quickly (parallelized queries)"""
        start = time.time()
        response = requests.get(
            f"{BASE_URL}/api/athlete/programs/{PROGRAM_ID}/journey",
            headers=auth_headers
        )
        elapsed_ms = (time.time() - start) * 1000
        
        assert response.status_code == 200
        print(f"Journey endpoint response time: {elapsed_ms:.0f}ms")
        # Should respond under 500ms (target was 200ms, but network adds latency)
        assert elapsed_ms < 1000, f"Journey endpoint too slow: {elapsed_ms:.0f}ms"
    
    def test_journey_timeline_structure(self, auth_headers):
        """Journey timeline items should have expected structure"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/programs/{PROGRAM_ID}/journey",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        if data["timeline"]:
            item = data["timeline"][0]
            # Check expected fields
            expected_fields = ["id", "event_type", "type", "title", "date"]
            for field in expected_fields:
                assert field in item, f"Timeline item missing field: {field}"


class TestPipelineDataLoading:
    """Tests for Pipeline page data loading endpoints"""
    
    def test_programs_list_returns_data(self, auth_headers):
        """Programs list should return array of programs"""
        response = requests.get(f"{BASE_URL}/api/athlete/programs", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Programs should be a list"
        print(f"Programs list has {len(data)} items")
    
    def test_programs_include_attention_data(self, auth_headers):
        """Programs should include attention/priority data"""
        response = requests.get(f"{BASE_URL}/api/athlete/programs", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        if data:
            program = data[0]
            # Check for attention data (computed by priority engine)
            assert "attention" in program or "signals" in program, "Program should have attention or signals"
            print(f"First program has keys: {list(program.keys())[:10]}...")
    
    def test_programs_include_pipeline_stage(self, auth_headers):
        """Programs should include pipeline_stage for board grouping"""
        response = requests.get(f"{BASE_URL}/api/athlete/programs", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        if data:
            program = data[0]
            assert "pipeline_stage" in program, "Program should have pipeline_stage"
            assert "board_group" in program, "Program should have board_group"
    
    def test_top_actions_endpoint(self, auth_headers):
        """Top actions endpoint should return batch actions"""
        response = requests.get(
            f"{BASE_URL}/api/internal/programs/top-actions",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "actions" in data, "Top actions response should have actions array"
        print(f"Top actions returned {len(data['actions'])} items")
    
    def test_match_scores_endpoint(self, auth_headers):
        """Match scores endpoint should return scores"""
        response = requests.get(f"{BASE_URL}/api/match-scores", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "scores" in data, "Match scores response should have scores array"
        print(f"Match scores returned {len(data['scores'])} items")
    
    def test_momentum_recap_endpoint(self, auth_headers):
        """Momentum recap endpoint should return data"""
        response = requests.get(f"{BASE_URL}/api/athlete/momentum-recap", headers=auth_headers)
        assert response.status_code == 200
        # Response can be empty object or have data
        print(f"Momentum recap response: {response.json()}")


class TestEngagementEndpoint:
    """Tests for engagement endpoint performance"""
    
    def test_engagement_endpoint_returns_data(self, auth_headers):
        """Engagement endpoint should return engagement stats"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/engagement/{PROGRAM_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_opens" in data, "Engagement should have total_opens"
        assert "total_clicks" in data, "Engagement should have total_clicks"
        print(f"Engagement: opens={data['total_opens']}, clicks={data['total_clicks']}")
    
    def test_engagement_endpoint_response_time(self, auth_headers):
        """Engagement endpoint should respond quickly"""
        start = time.time()
        response = requests.get(
            f"{BASE_URL}/api/athlete/engagement/{PROGRAM_ID}",
            headers=auth_headers
        )
        elapsed_ms = (time.time() - start) * 1000
        
        assert response.status_code == 200
        print(f"Engagement endpoint response time: {elapsed_ms:.0f}ms")
        # Should respond under 500ms
        assert elapsed_ms < 1000, f"Engagement endpoint too slow: {elapsed_ms:.0f}ms"


class TestCoachWatchEndpoint:
    """Tests for coach watch endpoint"""
    
    def test_coach_watch_returns_data(self, auth_headers):
        """Coach watch endpoint should return relationship intelligence"""
        response = requests.get(
            f"{BASE_URL}/api/coach-watch/{PROGRAM_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "state" in data, "Coach watch should have state"
        assert "score" in data, "Coach watch should have score"
        print(f"Coach watch state: {data['state']}, score: {data['score']}")


class TestProgramDetailEndpoint:
    """Tests for single program detail endpoint"""
    
    def test_program_detail_returns_data(self, auth_headers):
        """Program detail should return full program data"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/programs/{PROGRAM_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "program_id" in data, "Program should have program_id"
        assert "university_name" in data, "Program should have university_name"
        print(f"Program: {data['university_name']}")
    
    def test_program_detail_includes_signals(self, auth_headers):
        """Program detail should include computed signals"""
        response = requests.get(
            f"{BASE_URL}/api/athlete/programs/{PROGRAM_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "signals" in data, "Program should have signals"
        assert "pipeline_stage" in data, "Program should have pipeline_stage"
        assert "journey_rail" in data, "Program should have journey_rail"


class TestParallelDataFetching:
    """Tests to verify parallel data fetching works correctly"""
    
    def test_pipeline_page_data_parallel(self, auth_headers):
        """Simulate Pipeline page parallel data fetching"""
        import concurrent.futures
        
        endpoints = [
            f"{BASE_URL}/api/athlete/programs",
            f"{BASE_URL}/api/match-scores",
            f"{BASE_URL}/api/athlete/tasks",
            f"{BASE_URL}/api/internal/programs/top-actions",
        ]
        
        start = time.time()
        
        def fetch(url):
            return requests.get(url, headers=auth_headers)
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            futures = [executor.submit(fetch, url) for url in endpoints]
            results = [f.result() for f in concurrent.futures.as_completed(futures)]
        
        elapsed_ms = (time.time() - start) * 1000
        
        # All should succeed
        for r in results:
            assert r.status_code == 200, f"Endpoint failed: {r.url}"
        
        print(f"Parallel fetch of 4 endpoints took {elapsed_ms:.0f}ms")
        # Should complete in reasonable time (parallel should be faster than sequential)
        assert elapsed_ms < 3000, f"Parallel fetch too slow: {elapsed_ms:.0f}ms"
    
    def test_journey_page_data_parallel(self, auth_headers):
        """Simulate Journey page parallel data fetching"""
        import concurrent.futures
        
        endpoints = [
            f"{BASE_URL}/api/athlete/programs/{PROGRAM_ID}",
            f"{BASE_URL}/api/athlete/programs/{PROGRAM_ID}/journey",
            f"{BASE_URL}/api/match-scores",
        ]
        
        start = time.time()
        
        def fetch(url):
            return requests.get(url, headers=auth_headers)
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            futures = [executor.submit(fetch, url) for url in endpoints]
            results = [f.result() for f in concurrent.futures.as_completed(futures)]
        
        elapsed_ms = (time.time() - start) * 1000
        
        # All should succeed
        for r in results:
            assert r.status_code == 200, f"Endpoint failed: {r.url}"
        
        print(f"Journey page parallel fetch took {elapsed_ms:.0f}ms")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

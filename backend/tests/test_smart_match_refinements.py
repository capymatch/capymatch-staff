"""
Test Smart Match Refinements:
1. Rerun Recommendations:
   - last_refreshed timestamp in API response
   - profile_changed_since_last_run flag
   - /smart-match/status endpoint for lightweight check

2. School Comparison:
   - Response structure supports comparison (strengths, improvements, breakdown)
"""

import pytest
import requests
import os
from time import sleep

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")


class TestRerunRecommendationsAPI:
    """Test Rerun Recommendations API endpoints"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as Emma Chen (Basic tier athlete)"""
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "emma.chen@athlete.capymatch.com",
            "password": "password123"
        })
        assert r.status_code == 200, f"Athlete login failed: {r.text}"
        self.token = r.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_recommendations_returns_last_refreshed(self):
        """GET /api/smart-match/recommendations returns last_refreshed timestamp"""
        r = requests.get(f"{BASE_URL}/api/smart-match/recommendations", headers=self.headers)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        assert "last_refreshed" in data, "Missing last_refreshed field in response"
        assert data["last_refreshed"] is not None, "last_refreshed should not be None"
        # Should be ISO format timestamp
        assert "T" in data["last_refreshed"], f"last_refreshed should be ISO format, got: {data['last_refreshed']}"
        print(f"✓ last_refreshed: {data['last_refreshed']}")

    def test_recommendations_returns_profile_changed_since_last_run(self):
        """GET /api/smart-match/recommendations returns profile_changed_since_last_run flag"""
        r = requests.get(f"{BASE_URL}/api/smart-match/recommendations", headers=self.headers)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        assert "profile_changed_since_last_run" in data, "Missing profile_changed_since_last_run field"
        assert isinstance(data["profile_changed_since_last_run"], bool), "profile_changed_since_last_run should be boolean"
        print(f"✓ profile_changed_since_last_run: {data['profile_changed_since_last_run']}")

    def test_second_call_returns_profile_changed_false(self):
        """Calling recommendations twice returns profile_changed_since_last_run=false"""
        # First call
        r1 = requests.get(f"{BASE_URL}/api/smart-match/recommendations", headers=self.headers)
        assert r1.status_code == 200
        
        # Brief pause to ensure timestamp changes
        sleep(0.5)
        
        # Second call without profile change
        r2 = requests.get(f"{BASE_URL}/api/smart-match/recommendations", headers=self.headers)
        assert r2.status_code == 200
        data2 = r2.json()
        
        # Since profile hasn't changed between calls, this should be False
        assert data2["profile_changed_since_last_run"] == False, \
            f"Expected profile_changed_since_last_run=False on second call, got {data2['profile_changed_since_last_run']}"
        print("✓ Second call correctly returns profile_changed_since_last_run=false")


class TestSmartMatchStatusEndpoint:
    """Test GET /api/smart-match/status endpoint"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as Emma Chen"""
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "emma.chen@athlete.capymatch.com",
            "password": "password123"
        })
        assert r.status_code == 200, f"Athlete login failed: {r.text}"
        self.token = r.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_status_endpoint_exists(self):
        """GET /api/smart-match/status returns 200"""
        r = requests.get(f"{BASE_URL}/api/smart-match/status", headers=self.headers)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    def test_status_returns_last_refreshed(self):
        """Status endpoint returns last_refreshed field"""
        # First ensure we have a run recorded
        requests.get(f"{BASE_URL}/api/smart-match/recommendations", headers=self.headers)
        
        r = requests.get(f"{BASE_URL}/api/smart-match/status", headers=self.headers)
        assert r.status_code == 200
        data = r.json()
        
        assert "last_refreshed" in data, "Missing last_refreshed in status response"
        assert data["last_refreshed"] is not None, "last_refreshed should not be None after recommendations call"
        print(f"✓ Status last_refreshed: {data['last_refreshed']}")

    def test_status_returns_profile_changed_flag(self):
        """Status endpoint returns profile_changed flag"""
        # First ensure we have a run recorded
        requests.get(f"{BASE_URL}/api/smart-match/recommendations", headers=self.headers)
        
        r = requests.get(f"{BASE_URL}/api/smart-match/status", headers=self.headers)
        assert r.status_code == 200
        data = r.json()
        
        assert "profile_changed" in data, "Missing profile_changed in status response"
        assert isinstance(data["profile_changed"], bool), "profile_changed should be boolean"
        print(f"✓ Status profile_changed: {data['profile_changed']}")

    def test_status_requires_auth(self):
        """Status endpoint requires authentication"""
        r = requests.get(f"{BASE_URL}/api/smart-match/status")
        assert r.status_code == 401, f"Expected 401 without auth, got {r.status_code}"

    def test_status_athlete_only(self):
        """Status endpoint is athlete-only (director gets 403)"""
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "director@capymatch.com",
            "password": "director123"
        })
        assert r.status_code == 200
        director_token = r.json()["token"]
        headers = {"Authorization": f"Bearer {director_token}"}
        
        r = requests.get(f"{BASE_URL}/api/smart-match/status", headers=headers)
        assert r.status_code == 403, f"Director should get 403, got {r.status_code}"


class TestSchoolComparisonResponseStructure:
    """Test that recommendations response supports school comparison"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as Emma Chen"""
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "emma.chen@athlete.capymatch.com",
            "password": "password123"
        })
        assert r.status_code == 200, f"Athlete login failed: {r.text}"
        self.token = r.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_recommendations_have_strengths_array(self):
        """Each recommendation has strengths array for comparison"""
        r = requests.get(f"{BASE_URL}/api/smart-match/recommendations", headers=self.headers)
        assert r.status_code == 200
        data = r.json()
        
        for rec in data["recommendations"]:
            assert "strengths" in rec, f"Missing strengths for {rec['university_name']}"
            assert isinstance(rec["strengths"], list), f"strengths should be a list"
            print(f"✓ {rec['university_name']} strengths: {len(rec['strengths'])} items")

    def test_recommendations_have_improvements_array(self):
        """Each recommendation has improvements array for comparison"""
        r = requests.get(f"{BASE_URL}/api/smart-match/recommendations", headers=self.headers)
        assert r.status_code == 200
        data = r.json()
        
        for rec in data["recommendations"]:
            assert "improvements" in rec, f"Missing improvements for {rec['university_name']}"
            assert isinstance(rec["improvements"], list), f"improvements should be a list"
            print(f"✓ {rec['university_name']} improvements: {len(rec['improvements'])} items")

    def test_recommendations_have_fit_label(self):
        """Each recommendation has fit_label for comparison display"""
        r = requests.get(f"{BASE_URL}/api/smart-match/recommendations", headers=self.headers)
        assert r.status_code == 200
        data = r.json()
        
        valid_labels = ["Excellent Fit", "Strong Fit", "Good Fit", "Moderate Fit", "Possible Fit", "Stretch"]
        
        for rec in data["recommendations"]:
            assert "fit_label" in rec, f"Missing fit_label for {rec['university_name']}"
            assert rec["fit_label"] in valid_labels, \
                f"Invalid fit_label '{rec['fit_label']}' for {rec['university_name']}"
            print(f"✓ {rec['university_name']} fit_label: {rec['fit_label']}")

    def test_recommendations_have_confidence(self):
        """Each recommendation has confidence level for comparison"""
        r = requests.get(f"{BASE_URL}/api/smart-match/recommendations", headers=self.headers)
        assert r.status_code == 200
        data = r.json()
        
        valid_confidence = ["high", "medium", "low"]
        
        for rec in data["recommendations"]:
            assert "confidence" in rec, f"Missing confidence for {rec['university_name']}"
            assert rec["confidence"] in valid_confidence, \
                f"Invalid confidence '{rec['confidence']}' for {rec['university_name']}"
            print(f"✓ {rec['university_name']} confidence: {rec['confidence']}")

    def test_breakdown_has_all_5_categories(self):
        """Breakdown has all 5 categories needed for comparison bars"""
        r = requests.get(f"{BASE_URL}/api/smart-match/recommendations", headers=self.headers)
        assert r.status_code == 200
        data = r.json()
        
        required_categories = ["athletic", "academic", "preference", "geographic", "opportunity"]
        
        for rec in data["recommendations"]:
            assert "breakdown" in rec, f"Missing breakdown for {rec['university_name']}"
            for cat in required_categories:
                assert cat in rec["breakdown"], f"Missing {cat} in breakdown for {rec['university_name']}"
                score = rec["breakdown"][cat]
                assert 0 <= score <= 100, f"Invalid {cat} score {score} for {rec['university_name']}"
            print(f"✓ {rec['university_name']} breakdown: all 5 categories present")


class TestComparisonDataConsistency:
    """Test data consistency across multiple recommendations for comparison"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as Emma Chen"""
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "emma.chen@athlete.capymatch.com",
            "password": "password123"
        })
        assert r.status_code == 200
        self.token = r.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_all_recommendations_have_comparable_structure(self):
        """All 3 basic tier recommendations should have identical structure"""
        r = requests.get(f"{BASE_URL}/api/smart-match/recommendations", headers=self.headers)
        assert r.status_code == 200
        data = r.json()
        
        # All must have the same set of top-level keys
        recs = data["recommendations"]
        assert len(recs) == 3, f"Expected 3 recommendations for basic tier, got {len(recs)}"
        
        first_keys = set(recs[0].keys())
        for i, rec in enumerate(recs[1:], 2):
            rec_keys = set(rec.keys())
            missing = first_keys - rec_keys
            extra = rec_keys - first_keys
            assert not missing, f"Recommendation {i} missing keys: {missing}"
            assert not extra, f"Recommendation {i} has extra keys: {extra}"
        
        print("✓ All 3 recommendations have identical structure for comparison")

    def test_can_select_schools_for_comparison(self):
        """Frontend can select multiple schools - verify data supports this"""
        r = requests.get(f"{BASE_URL}/api/smart-match/recommendations", headers=self.headers)
        assert r.status_code == 200
        data = r.json()
        
        recs = data["recommendations"]
        
        # Simulate selecting 2-3 schools for comparison
        selected = recs[:3]  # All 3 for basic tier
        
        # Verify each selected school has required comparison fields
        for s in selected:
            assert s.get("university_name"), "Missing university_name"
            assert s.get("match_score") is not None, "Missing match_score"
            assert s.get("fit_label"), "Missing fit_label"
            assert s.get("breakdown"), "Missing breakdown"
            assert s.get("strengths") is not None, "Missing strengths"
            assert s.get("improvements") is not None, "Missing improvements"
        
        print(f"✓ Can select {len(selected)} schools for comparison with required fields")

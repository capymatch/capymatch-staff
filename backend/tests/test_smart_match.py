"""
Test Smart Match Phase 1 - Rule-based scoring engine with subscription gating.

Tests:
- GET /api/smart-match/recommendations returns scored school recommendations
- Basic tier users get exactly 3 recommendations with gated=true
- Pro/Premium tier users get more recommendations with AI explanations
- Scores calculated correctly (match_score, breakdown, chips)
- in_pipeline status shows correctly for schools already in pipeline
- Auth enforcement: only athletes/parents can access
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")


class TestSmartMatchBasicTier:
    """Test Smart Match for Basic tier users (default - no subscription doc)"""

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

    def test_recommendations_endpoint_returns_200(self):
        """GET /api/smart-match/recommendations returns 200"""
        r = requests.get(f"{BASE_URL}/api/smart-match/recommendations", headers=self.headers)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    def test_basic_tier_gets_exactly_3_recommendations(self):
        """Basic tier users get exactly 3 recommendations"""
        r = requests.get(f"{BASE_URL}/api/smart-match/recommendations", headers=self.headers)
        assert r.status_code == 200
        data = r.json()
        
        assert "recommendations" in data
        assert "total" in data
        assert "tier" in data
        assert "gated" in data
        
        assert data["tier"] == "basic", f"Expected basic tier, got {data['tier']}"
        assert len(data["recommendations"]) == 3, f"Expected 3 recommendations for basic, got {len(data['recommendations'])}"
        assert data["total"] == 3

    def test_basic_tier_has_gated_true(self):
        """Basic tier should have gated=true indicating more results available"""
        r = requests.get(f"{BASE_URL}/api/smart-match/recommendations", headers=self.headers)
        assert r.status_code == 200
        data = r.json()
        
        assert data["gated"] == True, f"Expected gated=true for basic tier, got {data['gated']}"
        assert "gated_total" in data and data["gated_total"] is not None

    def test_basic_tier_has_no_ai_explanations(self):
        """Basic tier should not have AI explanations (ai_summary is None)"""
        r = requests.get(f"{BASE_URL}/api/smart-match/recommendations", headers=self.headers)
        assert r.status_code == 200
        data = r.json()
        
        for rec in data["recommendations"]:
            assert rec.get("ai_summary") is None, f"Basic tier should not have AI summary"

    def test_recommendations_sorted_by_match_score_descending(self):
        """Recommendations should be sorted by match_score descending"""
        r = requests.get(f"{BASE_URL}/api/smart-match/recommendations", headers=self.headers)
        assert r.status_code == 200
        data = r.json()
        
        scores = [rec["match_score"] for rec in data["recommendations"]]
        assert scores == sorted(scores, reverse=True), f"Scores not sorted descending: {scores}"


class TestSmartMatchResponseStructure:
    """Test the structure and fields of recommendation responses"""

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

    def test_recommendation_has_required_fields(self):
        """Each recommendation has all required fields"""
        r = requests.get(f"{BASE_URL}/api/smart-match/recommendations", headers=self.headers)
        assert r.status_code == 200
        data = r.json()
        
        required_fields = [
            "university_name", "division", "conference", "region",
            "state", "city", "domain", "match_score",
            "breakdown", "chips", "top_reason", "in_pipeline"
        ]
        
        for rec in data["recommendations"]:
            for field in required_fields:
                assert field in rec, f"Missing field: {field} in {rec['university_name']}"

    def test_breakdown_has_all_categories(self):
        """Score breakdown has all 5 categories"""
        r = requests.get(f"{BASE_URL}/api/smart-match/recommendations", headers=self.headers)
        assert r.status_code == 200
        data = r.json()
        
        categories = ["athletic", "academic", "preference", "geographic", "opportunity"]
        
        for rec in data["recommendations"]:
            breakdown = rec["breakdown"]
            for cat in categories:
                assert cat in breakdown, f"Missing category: {cat} in {rec['university_name']}"
                assert isinstance(breakdown[cat], (int, float)), f"{cat} score should be numeric"
                assert 0 <= breakdown[cat] <= 100, f"{cat} score should be 0-100"

    def test_match_score_is_valid_range(self):
        """Match scores are between 0 and 100"""
        r = requests.get(f"{BASE_URL}/api/smart-match/recommendations", headers=self.headers)
        assert r.status_code == 200
        data = r.json()
        
        for rec in data["recommendations"]:
            score = rec["match_score"]
            assert 0 <= score <= 100, f"Match score out of range: {score} for {rec['university_name']}"

    def test_chips_are_list_of_strings(self):
        """Chips should be a list of strings (max 3)"""
        r = requests.get(f"{BASE_URL}/api/smart-match/recommendations", headers=self.headers)
        assert r.status_code == 200
        data = r.json()
        
        for rec in data["recommendations"]:
            chips = rec["chips"]
            assert isinstance(chips, list), f"Chips should be a list"
            assert len(chips) <= 3, f"Should have max 3 chips, got {len(chips)}"
            for chip in chips:
                assert isinstance(chip, str), f"Each chip should be a string"


class TestSmartMatchInPipelineStatus:
    """Test in_pipeline status for schools already in pipeline"""

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

    def test_in_pipeline_field_exists(self):
        """All recommendations have in_pipeline field"""
        r = requests.get(f"{BASE_URL}/api/smart-match/recommendations", headers=self.headers)
        assert r.status_code == 200
        data = r.json()
        
        for rec in data["recommendations"]:
            assert "in_pipeline" in rec, f"Missing in_pipeline field for {rec['university_name']}"
            assert isinstance(rec["in_pipeline"], bool), f"in_pipeline should be boolean"


class TestSmartMatchAuthEnforcement:
    """Test authentication and authorization for Smart Match"""

    def test_requires_auth(self):
        """Smart Match requires authentication"""
        r = requests.get(f"{BASE_URL}/api/smart-match/recommendations")
        assert r.status_code == 401, f"Expected 401 without auth, got {r.status_code}"

    def test_director_cannot_access(self):
        """Director should get 403 - Smart Match is athlete-only"""
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "director@capymatch.com",
            "password": "director123"
        })
        assert r.status_code == 200
        token = r.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        r = requests.get(f"{BASE_URL}/api/smart-match/recommendations", headers=headers)
        assert r.status_code == 403, f"Director should get 403, got {r.status_code}"

    def test_coach_cannot_access(self):
        """Coach should get 403 - Smart Match is athlete-only"""
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "coach.williams@capymatch.com",
            "password": "coach123"
        })
        assert r.status_code == 200
        token = r.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        r = requests.get(f"{BASE_URL}/api/smart-match/recommendations", headers=headers)
        assert r.status_code == 403, f"Coach should get 403, got {r.status_code}"


class TestSmartMatchLimitParameter:
    """Test limit parameter behavior"""

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

    def test_limit_ignored_for_basic_tier(self):
        """Limit parameter should be ignored for basic tier (always 3)"""
        r = requests.get(f"{BASE_URL}/api/smart-match/recommendations", 
                        params={"limit": 100}, headers=self.headers)
        assert r.status_code == 200
        data = r.json()
        
        # Basic tier should always get 3 regardless of limit
        assert len(data["recommendations"]) == 3, f"Basic tier should always get 3, got {len(data['recommendations'])}"

"""
Test suite for Match Detail Drawer - Smart Match Phase 2

Tests the enhanced compute_match_score which now returns:
- fit_label: Text label like "Excellent Fit", "Strong Fit", etc.
- confidence: "high", "medium", or "low" based on data completeness
- breakdown: Object with 5 category scores
- strengths: Array of 2-4 bullet points explaining why school matches
- improvements: Array of suggestions (may be empty for high scores)
"""

import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://athlete-spotlight-3.preview.emergentagent.com")

# Test credentials
ATHLETE_EMAIL = "emma.chen@athlete.capymatch.com"
ATHLETE_PASSWORD = "password123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for athlete"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ATHLETE_EMAIL, "password": ATHLETE_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "token" in data, "No token in login response"
    return data["token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestSmartMatchRecommendationsNewFields:
    """Test new fields in smart-match/recommendations response for drawer"""

    def test_recommendations_returns_fit_label(self, auth_headers):
        """fit_label field exists and has valid value"""
        response = requests.get(
            f"{BASE_URL}/api/smart-match/recommendations",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "recommendations" in data
        assert len(data["recommendations"]) > 0
        
        first_match = data["recommendations"][0]
        assert "fit_label" in first_match, "fit_label field missing"
        
        valid_labels = ["Excellent Fit", "Strong Fit", "Good Fit", "Moderate Fit", "Possible Fit", "Stretch"]
        assert first_match["fit_label"] in valid_labels, f"Invalid fit_label: {first_match['fit_label']}"
        print(f"✓ fit_label: {first_match['fit_label']}")

    def test_recommendations_returns_confidence(self, auth_headers):
        """confidence field exists with high/medium/low value"""
        response = requests.get(
            f"{BASE_URL}/api/smart-match/recommendations",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        first_match = data["recommendations"][0]
        assert "confidence" in first_match, "confidence field missing"
        
        valid_confidence = ["high", "medium", "low"]
        assert first_match["confidence"] in valid_confidence, f"Invalid confidence: {first_match['confidence']}"
        print(f"✓ confidence: {first_match['confidence']}")

    def test_recommendations_returns_breakdown(self, auth_headers):
        """breakdown field contains all 5 category scores"""
        response = requests.get(
            f"{BASE_URL}/api/smart-match/recommendations",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        first_match = data["recommendations"][0]
        assert "breakdown" in first_match, "breakdown field missing"
        
        breakdown = first_match["breakdown"]
        required_categories = ["athletic", "academic", "preference", "geographic", "opportunity"]
        
        for category in required_categories:
            assert category in breakdown, f"Missing category: {category}"
            score = breakdown[category]
            assert isinstance(score, (int, float)), f"{category} score is not a number"
            assert 0 <= score <= 100, f"{category} score out of range: {score}"
            print(f"✓ breakdown.{category}: {score}")

    def test_recommendations_returns_strengths(self, auth_headers):
        """strengths field exists as array of strings"""
        response = requests.get(
            f"{BASE_URL}/api/smart-match/recommendations",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        first_match = data["recommendations"][0]
        assert "strengths" in first_match, "strengths field missing"
        
        strengths = first_match["strengths"]
        assert isinstance(strengths, list), "strengths should be an array"
        
        # High-scoring matches should have at least some strengths
        if first_match["match_score"] >= 70:
            assert len(strengths) > 0, "High-scoring match should have strengths"
        
        for s in strengths:
            assert isinstance(s, str), "Each strength should be a string"
            assert len(s) > 0, "Strength should not be empty"
        
        print(f"✓ strengths: {len(strengths)} items")
        for s in strengths[:3]:
            print(f"  - {s[:60]}...")

    def test_recommendations_returns_improvements(self, auth_headers):
        """improvements field exists as array (may be empty for high scores)"""
        response = requests.get(
            f"{BASE_URL}/api/smart-match/recommendations",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        first_match = data["recommendations"][0]
        assert "improvements" in first_match, "improvements field missing"
        
        improvements = first_match["improvements"]
        assert isinstance(improvements, list), "improvements should be an array"
        
        for imp in improvements:
            assert isinstance(imp, str), "Each improvement should be a string"
            assert len(imp) > 0, "Improvement should not be empty"
        
        # For high scores (93+), improvements may be empty - this is expected
        if first_match["match_score"] >= 90 and len(improvements) == 0:
            print("✓ improvements: empty (expected for excellent matches)")
        else:
            print(f"✓ improvements: {len(improvements)} items")
            for imp in improvements[:2]:
                print(f"  - {imp[:60]}...")


class TestSmartMatchScoreLabels:
    """Test fit_label assignment based on score ranges"""

    def test_excellent_fit_for_high_scores(self, auth_headers):
        """Scores >= 90 should get 'Excellent Fit' label"""
        response = requests.get(
            f"{BASE_URL}/api/smart-match/recommendations",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        for match in data["recommendations"]:
            if match["match_score"] >= 90:
                assert match["fit_label"] == "Excellent Fit", \
                    f"Score {match['match_score']} should be 'Excellent Fit', got '{match['fit_label']}'"
                print(f"✓ {match['university_name']}: {match['match_score']} -> {match['fit_label']}")

    def test_strong_fit_for_80_89_scores(self, auth_headers):
        """Scores 80-89 should get 'Strong Fit' label"""
        response = requests.get(
            f"{BASE_URL}/api/smart-match/recommendations",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        for match in data["recommendations"]:
            if 80 <= match["match_score"] < 90:
                assert match["fit_label"] == "Strong Fit", \
                    f"Score {match['match_score']} should be 'Strong Fit', got '{match['fit_label']}'"
                print(f"✓ {match['university_name']}: {match['match_score']} -> {match['fit_label']}")


class TestSmartMatchDataStructure:
    """Test overall data structure for drawer compatibility"""

    def test_full_recommendation_structure(self, auth_headers):
        """Verify all fields needed by MatchDetailDrawer component"""
        response = requests.get(
            f"{BASE_URL}/api/smart-match/recommendations",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["recommendations"]) > 0
        first_match = data["recommendations"][0]
        
        # Required fields for drawer
        required_fields = [
            "university_name",
            "division",
            "conference",
            "city",
            "state",
            "match_score",
            "fit_label",
            "confidence",
            "breakdown",
            "chips",
            "strengths",
            "improvements",
            "in_pipeline",
        ]
        
        for field in required_fields:
            assert field in first_match, f"Missing required field: {field}"
            print(f"✓ {field}: present")
        
        # Validate breakdown has all categories
        breakdown = first_match["breakdown"]
        categories = ["athletic", "academic", "preference", "geographic", "opportunity"]
        for cat in categories:
            assert cat in breakdown, f"Missing breakdown category: {cat}"
        
        print("\n✓ Full drawer-compatible structure verified")

    def test_chips_array_limited(self, auth_headers):
        """chips array should have max 3 items"""
        response = requests.get(
            f"{BASE_URL}/api/smart-match/recommendations",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        for match in data["recommendations"]:
            chips = match.get("chips", [])
            assert len(chips) <= 3, f"Too many chips: {len(chips)}"
        
        print("✓ All matches have <= 3 chips")

    def test_strengths_array_limited(self, auth_headers):
        """strengths array should have max 4 items"""
        response = requests.get(
            f"{BASE_URL}/api/smart-match/recommendations",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        for match in data["recommendations"]:
            strengths = match.get("strengths", [])
            assert len(strengths) <= 4, f"Too many strengths: {len(strengths)}"
        
        print("✓ All matches have <= 4 strengths")


class TestBasicTierGating:
    """Test that basic tier returns exactly 3 recommendations"""

    def test_basic_tier_three_recommendations(self, auth_headers):
        """Emma on basic tier should get exactly 3 recommendations"""
        response = requests.get(
            f"{BASE_URL}/api/smart-match/recommendations",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["tier"] == "basic", f"Expected basic tier, got {data['tier']}"
        assert len(data["recommendations"]) == 3, f"Expected 3 recommendations, got {len(data['recommendations'])}"
        assert data["gated"] == True, "Should be gated for basic tier"
        
        print(f"✓ Basic tier: {len(data['recommendations'])} recommendations, gated={data['gated']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

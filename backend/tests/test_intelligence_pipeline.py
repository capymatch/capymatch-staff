"""
Intelligence Pipeline Phase 1 Tests
Tests for School Insight and Timeline intelligence cards
"""

import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
PROGRAM_ID = "15d08982-3c51-4761-9b83-67414484582e"  # University of Florida


@pytest.fixture(scope="module")
def athlete_token():
    """Get token for athlete (Emma Chen) with Pro plan"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "emma.chen@athlete.capymatch.com",
        "password": "password123"
    })
    if response.status_code != 200:
        pytest.skip("Failed to login as athlete")
    return response.json()["token"]


@pytest.fixture(scope="module")
def admin_token():
    """Get token for admin (no athlete profile)"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "douglas@capymatch.com",
        "password": "1234"
    })
    if response.status_code != 200:
        pytest.skip("Failed to login as admin")
    return response.json()["token"]


class TestSchoolInsightEndpoint:
    """Tests for GET /api/intelligence/program/{program_id}/school-insight"""
    
    def test_school_insight_returns_valid_response(self, athlete_token):
        """School Insight returns a valid response with required fields"""
        response = requests.get(
            f"{BASE_URL}/api/intelligence/program/{PROGRAM_ID}/school-insight",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Required fields check
        assert data["card_type"] == "school_insight"
        assert "university_name" in data
        assert "confidence" in data
        assert "confidence_pct" in data
        assert "generated_at" in data
        assert "from_cache" in data
        assert "strengths" in data
        assert "concerns" in data
        assert "unknowns" in data
        
    def test_school_insight_confidence_badge(self, athlete_token):
        """School Insight returns proper confidence badge"""
        response = requests.get(
            f"{BASE_URL}/api/intelligence/program/{PROGRAM_ID}/school-insight",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        data = response.json()
        
        # Confidence must be HIGH/MEDIUM/LOW
        assert data["confidence"] in ["HIGH", "MEDIUM", "LOW"]
        
        # Confidence percentage must be between 0-100
        assert 0 <= data["confidence_pct"] <= 100
        
        # Verify confidence label matches percentage
        pct = data["confidence_pct"]
        if pct >= 70:
            assert data["confidence"] == "HIGH"
        elif pct >= 40:
            assert data["confidence"] == "MEDIUM"
        else:
            assert data["confidence"] == "LOW"
    
    def test_school_insight_strengths_with_evidence(self, athlete_token):
        """School Insight strengths should have evidence citing data"""
        response = requests.get(
            f"{BASE_URL}/api/intelligence/program/{PROGRAM_ID}/school-insight",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        data = response.json()
        
        # If LLM-generated, strengths should have evidence
        if data["generated_by"] == "llm":
            assert len(data["strengths"]) > 0
            for strength in data["strengths"]:
                assert "point" in strength
                assert "evidence" in strength
                assert len(strength["point"]) > 0
                assert len(strength["evidence"]) > 0
    
    def test_school_insight_concerns_with_evidence(self, athlete_token):
        """School Insight concerns should have evidence citing data"""
        response = requests.get(
            f"{BASE_URL}/api/intelligence/program/{PROGRAM_ID}/school-insight",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        data = response.json()
        
        # If LLM-generated, concerns should have evidence
        if data["generated_by"] == "llm" and len(data["concerns"]) > 0:
            for concern in data["concerns"]:
                assert "point" in concern
                assert "evidence" in concern
                assert len(concern["point"]) > 0
                assert len(concern["evidence"]) > 0
    
    def test_school_insight_caching(self, athlete_token):
        """School Insight should return from_cache=true on subsequent calls"""
        # First call may or may not be cached
        response1 = requests.get(
            f"{BASE_URL}/api/intelligence/program/{PROGRAM_ID}/school-insight",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert response1.status_code == 200
        
        # Second call should be cached
        response2 = requests.get(
            f"{BASE_URL}/api/intelligence/program/{PROGRAM_ID}/school-insight",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert response2.status_code == 200
        assert response2.json()["from_cache"] == True
    
    def test_school_insight_force_refresh(self, athlete_token):
        """School Insight with force=true bypasses cache"""
        response = requests.get(
            f"{BASE_URL}/api/intelligence/program/{PROGRAM_ID}/school-insight",
            headers={"Authorization": f"Bearer {athlete_token}"},
            params={"force": "true"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["from_cache"] == False
    
    def test_school_insight_404_without_athlete_profile(self, admin_token):
        """School Insight returns 404 for users without athlete profile"""
        response = requests.get(
            f"{BASE_URL}/api/intelligence/program/{PROGRAM_ID}/school-insight",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 404
        assert "No athlete profile found" in response.json()["detail"]


class TestTimelineEndpoint:
    """Tests for GET /api/intelligence/program/{program_id}/timeline"""
    
    def test_timeline_returns_valid_response(self, athlete_token):
        """Timeline returns a valid response with required fields"""
        response = requests.get(
            f"{BASE_URL}/api/intelligence/program/{PROGRAM_ID}/timeline",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Required fields check
        assert data["card_type"] == "timeline"
        assert "university_name" in data
        assert "confidence" in data
        assert "confidence_pct" in data
        assert "timeline_label" in data
        assert "timeline_color" in data
        assert "next_action" in data
        assert "from_cache" in data
        assert "generated_at" in data
    
    def test_timeline_label_and_color(self, athlete_token):
        """Timeline returns valid timeline label and color"""
        response = requests.get(
            f"{BASE_URL}/api/intelligence/program/{PROGRAM_ID}/timeline",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        data = response.json()
        
        # Valid timeline labels
        valid_labels = ["Committed", "Late Opportunities", "Standard Timeline", "Fills Early", "Unknown"]
        assert data["timeline_label"] in valid_labels
        
        # Valid timeline colors
        valid_colors = ["green", "blue", "amber", "teal", "gray"]
        assert data["timeline_color"] in valid_colors
    
    def test_timeline_next_action(self, athlete_token):
        """Timeline returns a next action suggestion"""
        response = requests.get(
            f"{BASE_URL}/api/intelligence/program/{PROGRAM_ID}/timeline",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        data = response.json()
        
        assert "next_action" in data
        assert len(data["next_action"]) > 0
    
    def test_timeline_urgency_fields(self, athlete_token):
        """Timeline returns urgency information"""
        response = requests.get(
            f"{BASE_URL}/api/intelligence/program/{PROGRAM_ID}/timeline",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        data = response.json()
        
        assert "urgency" in data
        assert data["urgency"] in ["normal", "medium", "high"]
        assert "urgency_note" in data  # Can be null
    
    def test_timeline_interaction_count(self, athlete_token):
        """Timeline shows interaction count"""
        response = requests.get(
            f"{BASE_URL}/api/intelligence/program/{PROGRAM_ID}/timeline",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        data = response.json()
        
        assert "interaction_count" in data
        assert isinstance(data["interaction_count"], int)
        assert data["interaction_count"] >= 0
    
    def test_timeline_llm_enhanced_narrative(self, athlete_token):
        """Timeline with 5+ interactions should have LLM-enhanced narrative"""
        response = requests.get(
            f"{BASE_URL}/api/intelligence/program/{PROGRAM_ID}/timeline",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        data = response.json()
        
        # Emma has 21+ interactions with UF, should be LLM-enhanced
        if data["interaction_count"] >= 5:
            assert data["generated_by"] == "llm_enhanced"
            assert "narrative" in data
            assert len(data.get("narrative", "")) > 0
    
    def test_timeline_caching(self, athlete_token):
        """Timeline should return from_cache=true on subsequent calls"""
        response1 = requests.get(
            f"{BASE_URL}/api/intelligence/program/{PROGRAM_ID}/timeline",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert response1.status_code == 200
        
        response2 = requests.get(
            f"{BASE_URL}/api/intelligence/program/{PROGRAM_ID}/timeline",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert response2.status_code == 200
        assert response2.json()["from_cache"] == True
    
    def test_timeline_force_refresh(self, athlete_token):
        """Timeline with force=true bypasses cache"""
        response = requests.get(
            f"{BASE_URL}/api/intelligence/program/{PROGRAM_ID}/timeline",
            headers={"Authorization": f"Bearer {athlete_token}"},
            params={"force": "true"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["from_cache"] == False
    
    def test_timeline_404_without_athlete_profile(self, admin_token):
        """Timeline returns 404 for users without athlete profile"""
        response = requests.get(
            f"{BASE_URL}/api/intelligence/program/{PROGRAM_ID}/timeline",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 404
        assert "No athlete profile found" in response.json()["detail"]


class TestConfidenceCalculation:
    """Tests for confidence calculation in payload builder"""
    
    def test_high_confidence_threshold(self, athlete_token):
        """HIGH confidence when >=70% fields available"""
        # Emma Chen has many fields filled, should be HIGH
        response = requests.get(
            f"{BASE_URL}/api/intelligence/program/{PROGRAM_ID}/school-insight",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        data = response.json()
        
        # For Emma with full profile, should be HIGH
        if data["confidence_pct"] >= 70:
            assert data["confidence"] == "HIGH"
    
    def test_confidence_badge_format(self, athlete_token):
        """Confidence badge includes percentage"""
        response = requests.get(
            f"{BASE_URL}/api/intelligence/program/{PROGRAM_ID}/school-insight",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        data = response.json()
        
        # Both confidence label and percentage should exist
        assert data["confidence"] in ["HIGH", "MEDIUM", "LOW"]
        assert isinstance(data["confidence_pct"], int)


class TestPayloadBuilderCache:
    """Tests for payload builder 12h cache"""
    
    def test_payload_reflected_in_cards(self, athlete_token):
        """Cards should reflect data from payload builder"""
        # Both cards should have same confidence
        school_response = requests.get(
            f"{BASE_URL}/api/intelligence/program/{PROGRAM_ID}/school-insight",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        timeline_response = requests.get(
            f"{BASE_URL}/api/intelligence/program/{PROGRAM_ID}/timeline",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        
        school_data = school_response.json()
        timeline_data = timeline_response.json()
        
        # Same payload -> same confidence
        assert school_data["confidence_pct"] == timeline_data["confidence_pct"]
        assert school_data["confidence"] == timeline_data["confidence"]


class TestDeterministicFallback:
    """Tests for deterministic fallback when confidence is LOW"""
    
    def test_school_insight_deterministic_for_low_confidence(self, athlete_token):
        """School insight uses deterministic fallback for LOW confidence"""
        # Note: We can't easily test this with Emma since she has HIGH confidence
        # This test documents expected behavior
        response = requests.get(
            f"{BASE_URL}/api/intelligence/program/{PROGRAM_ID}/school-insight",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        data = response.json()
        
        # If confidence is LOW, generated_by should be deterministic
        if data["confidence"] == "LOW":
            assert data["generated_by"] == "deterministic"
        else:
            assert data["generated_by"] in ["llm", "deterministic"]

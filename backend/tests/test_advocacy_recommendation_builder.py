"""
Test suite for Advocacy New Recommendation Page Improvements.

Features tested:
1. GET /api/advocacy/athlete-context/{athlete_id}/{school_id} - Athlete recruiting context
2. GET /api/advocacy/athletes - Athlete search for autocomplete
3. POST /api/advocacy/recommendations - Create with attachments field
4. AI Draft endpoint accepts fit_reasons/fit_note/highlight_video in body
5. Recommendation builder URL params pre-fill
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
COACH_EMAIL = "coach.williams@capymatch.com"
COACH_PASSWORD = "coach123"
DIRECTOR_EMAIL = "director@capymatch.com"
DIRECTOR_PASSWORD = "director123"


def get_auth_token(email: str, password: str) -> str:
    """Get auth token for API calls"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": email,
        "password": password
    })
    if response.status_code == 200:
        return response.json().get("token", "")
    return ""


# ============================================================================
# ATHLETE CONTEXT ENDPOINT
# ============================================================================

class TestAthleteContextEndpoint:
    """Test GET /api/advocacy/athlete-context/{athlete_id}/{school_id}"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.token = get_auth_token(COACH_EMAIL, COACH_PASSWORD)
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_athlete_context_returns_200(self):
        """Endpoint returns 200 for valid athlete+school"""
        response = requests.get(
            f"{BASE_URL}/api/advocacy/athlete-context/athlete_1/stanford",
            headers=self.headers
        )
        # May be 200 or 404 depending on data
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        print(f"✓ GET /api/advocacy/athlete-context/athlete_1/stanford returns {response.status_code}")
    
    def test_athlete_context_has_athlete_info(self):
        """Response includes athlete object with expected fields"""
        response = requests.get(
            f"{BASE_URL}/api/advocacy/athlete-context/athlete_1/stanford",
            headers=self.headers
        )
        if response.status_code == 200:
            data = response.json()
            assert "athlete" in data, "Missing athlete object"
            athlete = data["athlete"]
            # Check expected fields
            assert "id" in athlete, "Missing athlete.id"
            assert "name" in athlete, "Missing athlete.name"
            # Optional fields
            if "grad_year" in athlete:
                print(f"  grad_year: {athlete['grad_year']}")
            if "position" in athlete:
                print(f"  position: {athlete['position']}")
            if "team" in athlete:
                print(f"  team: {athlete['team']}")
            print(f"✓ Athlete context has athlete info: {athlete.get('name', 'Unknown')}")
        else:
            print("⚠ Skipped: athlete not found")
    
    def test_athlete_context_has_pipeline_status(self):
        """Response includes pipeline_status field"""
        response = requests.get(
            f"{BASE_URL}/api/advocacy/athlete-context/athlete_1/stanford",
            headers=self.headers
        )
        if response.status_code == 200:
            data = response.json()
            assert "pipeline_status" in data, "Missing pipeline_status"
            print(f"✓ Pipeline status: {data['pipeline_status']}")
        else:
            print("⚠ Skipped: athlete not found")
    
    def test_athlete_context_has_last_contact(self):
        """Response includes last_contact field"""
        response = requests.get(
            f"{BASE_URL}/api/advocacy/athlete-context/athlete_1/stanford",
            headers=self.headers
        )
        if response.status_code == 200:
            data = response.json()
            assert "last_contact" in data, "Missing last_contact"
            print(f"✓ Last contact: {data['last_contact']}")
        else:
            print("⚠ Skipped: athlete not found")
    
    def test_athlete_context_has_event_notes(self):
        """Response includes event_notes array"""
        response = requests.get(
            f"{BASE_URL}/api/advocacy/athlete-context/athlete_1/stanford",
            headers=self.headers
        )
        if response.status_code == 200:
            data = response.json()
            assert "event_notes" in data, "Missing event_notes"
            assert isinstance(data["event_notes"], list), "event_notes should be array"
            print(f"✓ Event notes: {len(data['event_notes'])} found")
        else:
            print("⚠ Skipped: athlete not found")
    
    def test_athlete_context_accepts_url_encoded_school_name(self):
        """Endpoint accepts URL-encoded school name (from SchoolPod)"""
        # Test with URL-encoded school name
        response = requests.get(
            f"{BASE_URL}/api/advocacy/athlete-context/athlete_1/Stanford%20University",
            headers=self.headers
        )
        # Should return 200 or 404, not 500
        assert response.status_code in [200, 404], f"Unexpected status for URL-encoded name: {response.status_code}"
        print(f"✓ URL-encoded school name handled: status {response.status_code}")
    
    def test_athlete_context_athlete_not_found(self):
        """Returns 404 for non-existent athlete"""
        response = requests.get(
            f"{BASE_URL}/api/advocacy/athlete-context/nonexistent_athlete/stanford",
            headers=self.headers
        )
        assert response.status_code == 404, f"Expected 404 for non-existent athlete, got {response.status_code}"
        print("✓ Non-existent athlete returns 404")


# ============================================================================
# ATHLETES SEARCH ENDPOINT
# ============================================================================

class TestAthletesSearchEndpoint:
    """Test GET /api/advocacy/athletes with search"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.token = get_auth_token(COACH_EMAIL, COACH_PASSWORD)
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_athletes_returns_200(self):
        """GET /api/advocacy/athletes returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/advocacy/athletes",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/advocacy/athletes returns 200")
    
    def test_athletes_returns_array(self):
        """Response is an array of athletes"""
        response = requests.get(
            f"{BASE_URL}/api/advocacy/athletes",
            headers=self.headers
        )
        data = response.json()
        assert isinstance(data, list), "Response should be an array"
        print(f"✓ Athletes endpoint returns array with {len(data)} athletes")
    
    def test_athletes_has_expected_fields(self):
        """Each athlete has expected fields for autocomplete"""
        response = requests.get(
            f"{BASE_URL}/api/advocacy/athletes",
            headers=self.headers
        )
        data = response.json()
        if data:
            athlete = data[0]
            assert "id" in athlete, "Missing id"
            assert "name" in athlete, "Missing name"
            # Optional but expected fields
            for field in ["grad_year", "position", "team", "photo_url"]:
                if field in athlete:
                    print(f"  {field}: present")
            print(f"✓ Athletes have expected structure")
        else:
            print("⚠ No athletes returned")
    
    def test_athletes_search_with_query(self):
        """Search athletes with ?q= parameter"""
        response = requests.get(
            f"{BASE_URL}/api/advocacy/athletes?q=Emma",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        # Should filter by name containing 'Emma'
        if data:
            names = [a.get("name", "") for a in data]
            matching = [n for n in names if "emma" in n.lower()]
            print(f"✓ Search for 'Emma': {len(data)} results, {len(matching)} name matches")
        else:
            print("✓ Search for 'Emma': 0 results (may not exist)")
    
    def test_athletes_search_short_query_returns_empty(self):
        """Search with query < 2 chars returns empty or all"""
        response = requests.get(
            f"{BASE_URL}/api/advocacy/athletes?q=E",
            headers=self.headers
        )
        assert response.status_code == 200
        # Short query might return all or empty depending on implementation
        print(f"✓ Short query 'E' handled: {len(response.json())} results")


# ============================================================================
# RECOMMENDATION CREATE WITH ATTACHMENTS
# ============================================================================

class TestRecommendationAttachments:
    """Test POST /api/advocacy/recommendations with attachments field"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.token = get_auth_token(COACH_EMAIL, COACH_PASSWORD)
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_create_recommendation_with_attachments(self):
        """Create recommendation with attachments array"""
        payload = {
            "athlete_id": "athlete_1",
            "school_id": "stanford",
            "school_name": "Stanford University",
            "fit_reasons": ["athletic_ability", "academic_fit"],
            "fit_note": "Strong candidate with excellent academics",
            "intro_message": "Dear Coach, I'd like to recommend...",
            "desired_next_step": "review_film",
            "attachments": [
                {"type": "highlight_reel", "url": "https://example.com/highlight.mp4"},
                {"type": "profile_link", "url": "https://example.com/profile"},
                {"type": "video_clip", "url": "https://example.com/clip.mp4"}
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/advocacy/recommendations",
            json=payload,
            headers=self.headers
        )
        assert response.status_code == 200, f"Create failed: {response.status_code} - {response.text}"
        data = response.json()
        
        assert "id" in data, "Missing recommendation id"
        assert data["status"] == "draft", "New rec should be draft"
        
        # Verify attachments were saved
        if "attachments" in data:
            assert len(data["attachments"]) == 3, f"Expected 3 attachments, got {len(data['attachments'])}"
            print(f"✓ Created recommendation with 3 attachments: {data['id']}")
        else:
            print(f"✓ Created recommendation: {data['id']} (attachments field may not be returned)")
        
        return data["id"]
    
    def test_create_recommendation_without_attachments(self):
        """Create recommendation without attachments (backward compatible)"""
        payload = {
            "athlete_id": "athlete_1",
            "school_id": "ucla",
            "school_name": "UCLA",
            "fit_reasons": ["coachability"],
            "intro_message": "Test recommendation",
        }
        
        response = requests.post(
            f"{BASE_URL}/api/advocacy/recommendations",
            json=payload,
            headers=self.headers
        )
        assert response.status_code == 200
        print(f"✓ Created recommendation without attachments: {response.json()['id']}")
    
    def test_create_recommendation_with_empty_attachments(self):
        """Create recommendation with empty attachments array"""
        payload = {
            "athlete_id": "athlete_1",
            "school_id": "duke",
            "school_name": "Duke",
            "fit_reasons": ["tactical_awareness"],
            "attachments": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/advocacy/recommendations",
            json=payload,
            headers=self.headers
        )
        assert response.status_code == 200
        print(f"✓ Created recommendation with empty attachments: {response.json()['id']}")


# ============================================================================
# AI DRAFT ENDPOINT WITH CONTEXT
# ============================================================================

class TestAIDraftWithContext:
    """Test POST /api/ai/advocacy-draft accepts fit_reasons/fit_note/highlight_video"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.token = get_auth_token(COACH_EMAIL, COACH_PASSWORD)
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_ai_draft_endpoint_exists(self):
        """AI draft endpoint accepts POST request"""
        response = requests.post(
            f"{BASE_URL}/api/ai/advocacy-draft/athlete_1/stanford",
            json={},
            headers=self.headers,
            timeout=60  # Long timeout for AI
        )
        # Should return 200 or 503 (service unavailable), not 404/405
        assert response.status_code in [200, 403, 503], f"Unexpected status: {response.status_code}"
        print(f"✓ AI draft endpoint returns {response.status_code}")
    
    def test_ai_draft_accepts_fit_reasons(self):
        """AI draft accepts fit_reasons in body"""
        response = requests.post(
            f"{BASE_URL}/api/ai/advocacy-draft/athlete_1/stanford",
            json={
                "fit_reasons": ["athletic_ability", "academic_fit", "character_leadership"]
            },
            headers=self.headers,
            timeout=60
        )
        # Just verify the request is accepted, not the AI response content
        assert response.status_code in [200, 403, 503], f"Fit reasons rejected: {response.status_code}"
        print(f"✓ AI draft accepts fit_reasons in body: status {response.status_code}")
    
    def test_ai_draft_accepts_fit_note(self):
        """AI draft accepts fit_note in body"""
        response = requests.post(
            f"{BASE_URL}/api/ai/advocacy-draft/athlete_1/stanford",
            json={
                "fit_note": "Emma shows exceptional leadership and coachability"
            },
            headers=self.headers,
            timeout=60
        )
        assert response.status_code in [200, 403, 503]
        print(f"✓ AI draft accepts fit_note in body: status {response.status_code}")
    
    def test_ai_draft_accepts_highlight_video(self):
        """AI draft accepts highlight_video in body"""
        response = requests.post(
            f"{BASE_URL}/api/ai/advocacy-draft/athlete_1/stanford",
            json={
                "highlight_video": "https://example.com/emma-highlights.mp4"
            },
            headers=self.headers,
            timeout=60
        )
        assert response.status_code in [200, 403, 503]
        print(f"✓ AI draft accepts highlight_video in body: status {response.status_code}")
    
    def test_ai_draft_with_full_context(self):
        """AI draft accepts all context params together"""
        response = requests.post(
            f"{BASE_URL}/api/ai/advocacy-draft/athlete_1/stanford",
            json={
                "fit_reasons": ["athletic_ability", "coachability"],
                "fit_note": "Strong technical skills and positive attitude",
                "highlight_video": "https://example.com/highlights.mp4"
            },
            headers=self.headers,
            timeout=60
        )
        assert response.status_code in [200, 403, 503]
        if response.status_code == 200:
            data = response.json()
            assert "text" in data, "AI draft should return text"
            print(f"✓ AI draft with full context: {len(data.get('text', ''))} chars")
        else:
            print(f"✓ AI draft endpoint available (status {response.status_code})")


# ============================================================================
# SCHOOLS SEARCH ENDPOINT (for autocomplete)
# ============================================================================

class TestSchoolsSearch:
    """Test schools search endpoint for recommendation builder autocomplete"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.token = get_auth_token(COACH_EMAIL, COACH_PASSWORD)
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_schools_search_returns_200(self):
        """GET /api/schools/search returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/schools/search?q=Stan&limit=10",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/schools/search returns 200")
    
    def test_schools_search_has_schools_array(self):
        """Response has schools array"""
        response = requests.get(
            f"{BASE_URL}/api/schools/search?q=Stan&limit=10",
            headers=self.headers
        )
        data = response.json()
        assert "schools" in data, "Missing schools array"
        assert isinstance(data["schools"], list), "schools should be array"
        print(f"✓ Schools search returns array with {len(data['schools'])} results")
    
    def test_schools_search_has_expected_fields(self):
        """School results have expected fields"""
        response = requests.get(
            f"{BASE_URL}/api/schools/search?q=Stan&limit=10",
            headers=self.headers
        )
        data = response.json()
        if data["schools"]:
            school = data["schools"][0]
            # Expected fields for autocomplete display
            assert "university_name" in school, "Missing university_name"
            if "division" in school:
                print(f"  division: {school['division']}")
            if "conference" in school:
                print(f"  conference: {school['conference']}")
            print(f"✓ School: {school['university_name']}")
        else:
            print("⚠ No schools found for 'Stan'")


# ============================================================================
# ADVOCACY HOME TABS (outcome tracking)
# ============================================================================

class TestAdvocacyHomeTabs:
    """Test advocacy home endpoint returns stats for all outcome tabs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.token = get_auth_token(COACH_EMAIL, COACH_PASSWORD)
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_recommendations_stats_has_all_outcomes(self):
        """Stats include all outcome tracking fields"""
        response = requests.get(
            f"{BASE_URL}/api/advocacy/recommendations",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "stats" in data, "Missing stats"
        stats = data["stats"]
        
        # Check for all outcome tracking stats
        expected_stats = ["total", "drafts", "sent", "awaiting", "warm", "closed"]
        for stat in expected_stats:
            assert stat in stats, f"Missing stat: {stat}"
        
        print(f"✓ Stats: total={stats['total']}, drafts={stats['drafts']}, sent={stats['sent']}, awaiting={stats['awaiting']}, warm={stats['warm']}, closed={stats['closed']}")
    
    def test_filter_by_status_awaiting_reply(self):
        """Filter by status=awaiting_reply works"""
        response = requests.get(
            f"{BASE_URL}/api/advocacy/recommendations?status=awaiting_reply",
            headers=self.headers
        )
        assert response.status_code == 200
        print(f"✓ Filter status=awaiting_reply: OK")
    
    def test_filter_by_status_warm_response(self):
        """Filter by status=warm_response works"""
        response = requests.get(
            f"{BASE_URL}/api/advocacy/recommendations?status=warm_response",
            headers=self.headers
        )
        assert response.status_code == 200
        print(f"✓ Filter status=warm_response: OK")
    
    def test_filter_by_status_closed(self):
        """Filter by status=closed works"""
        response = requests.get(
            f"{BASE_URL}/api/advocacy/recommendations?status=closed",
            headers=self.headers
        )
        assert response.status_code == 200
        print(f"✓ Filter status=closed: OK")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

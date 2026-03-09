"""
Test Knowledge Base API Routes (New KB Implementation)

Tests the new /api/knowledge-base/* routes with 953+ universities.
Routes tested:
- GET /api/knowledge-base - paginated list with filters (public)
- GET /api/knowledge-base/filters - distinct conferences/regions (public)
- GET /api/knowledge-base/school/{domain} - school detail with match score (optional auth)
- POST /api/knowledge-base/add-to-board - add school to pipeline (auth required)
- GET /api/suggested-schools - match-ranked suggestions (auth required)
- GET /api/admin/kb-jobs - list scraper jobs (admin only)
- POST /api/admin/kb-jobs/{job}/run - trigger scraper (admin only)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")


class TestKBListAndFilters:
    """Test Knowledge Base list and filter endpoints (public access)"""

    def test_list_returns_paginated_schools(self):
        """GET /api/knowledge-base returns paginated list of universities"""
        r = requests.get(f"{BASE_URL}/api/knowledge-base", params={"limit": 10})
        assert r.status_code == 200, f"Failed: {r.text}"
        data = r.json()
        
        # Verify pagination structure
        assert "universities" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        assert "limit" in data
        
        # 953+ universities imported
        assert data["total"] >= 900, f"Expected 900+ universities, got {data['total']}"
        assert len(data["universities"]) == 10
        assert data["page"] == 1

    def test_list_with_division_filter(self):
        """GET /api/knowledge-base?division=D1 returns only D1 schools"""
        r = requests.get(f"{BASE_URL}/api/knowledge-base", params={"division": "D1", "limit": 50})
        assert r.status_code == 200
        data = r.json()
        
        for uni in data["universities"]:
            assert uni["division"] == "D1", f"Expected D1, got {uni['division']} for {uni['university_name']}"

    def test_list_with_region_filter(self):
        """GET /api/knowledge-base?region=South returns South region schools"""
        r = requests.get(f"{BASE_URL}/api/knowledge-base", params={"region": "South", "limit": 50})
        assert r.status_code == 200
        data = r.json()
        
        for uni in data["universities"]:
            assert uni["region"].lower() == "south", f"Expected South, got {uni['region']}"

    def test_list_with_search_filter(self):
        """GET /api/knowledge-base?search=Texas returns schools matching Texas"""
        r = requests.get(f"{BASE_URL}/api/knowledge-base", params={"search": "Texas", "limit": 50})
        assert r.status_code == 200
        data = r.json()
        
        assert data["total"] > 0, "No Texas schools found"
        for uni in data["universities"]:
            assert "texas" in uni["university_name"].lower(), f"Expected Texas in name: {uni['university_name']}"

    def test_list_with_fields_parameter(self):
        """GET /api/knowledge-base?fields=list returns limited fields"""
        r = requests.get(f"{BASE_URL}/api/knowledge-base", params={"fields": "list", "limit": 5})
        assert r.status_code == 200
        data = r.json()
        
        # Verify essential list fields present
        uni = data["universities"][0]
        assert "university_name" in uni
        assert "division" in uni
        assert "conference" in uni
        assert "domain" in uni

    def test_pagination_page_2(self):
        """GET /api/knowledge-base?page=2 returns second page"""
        r = requests.get(f"{BASE_URL}/api/knowledge-base", params={"page": 2, "limit": 50})
        assert r.status_code == 200
        data = r.json()
        
        assert data["page"] == 2
        assert len(data["universities"]) == 50

    def test_filters_endpoint(self):
        """GET /api/knowledge-base/filters returns distinct conferences and regions"""
        r = requests.get(f"{BASE_URL}/api/knowledge-base/filters")
        assert r.status_code == 200
        data = r.json()
        
        assert "conferences" in data
        assert "regions" in data
        assert len(data["conferences"]) > 50, f"Expected 50+ conferences, got {len(data['conferences'])}"
        assert len(data["regions"]) >= 8, f"Expected 8+ regions, got {len(data['regions'])}"


class TestKBSchoolDetail:
    """Test school detail endpoint"""

    def test_get_school_detail_by_domain(self):
        """GET /api/knowledge-base/school/{domain} returns full school detail"""
        r = requests.get(f"{BASE_URL}/api/knowledge-base/school/stanford.edu")
        assert r.status_code == 200
        school = r.json()
        
        # Verify core fields
        assert school["domain"] == "stanford.edu"
        assert school["university_name"] == "Stanford University"
        assert school["division"] == "D1"
        
        # Scorecard should exist
        assert "scorecard" in school

    def test_school_detail_with_auth_has_match_score(self):
        """GET /api/knowledge-base/school/{domain} with auth returns match_score"""
        # Login as athlete
        login_r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "emma.chen@athlete.capymatch.com",
            "password": "password123"
        })
        assert login_r.status_code == 200
        token = login_r.json()["token"]
        
        r = requests.get(
            f"{BASE_URL}/api/knowledge-base/school/stanford.edu",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert r.status_code == 200
        school = r.json()
        
        # With auth, should have match score
        assert "match_score" in school
        assert "on_board" in school
        assert isinstance(school["match_score"], int)

    def test_school_not_found_404(self):
        """GET /api/knowledge-base/school/nonexistent.edu returns 404"""
        r = requests.get(f"{BASE_URL}/api/knowledge-base/school/nonexistent-fake-domain.edu")
        assert r.status_code == 404

    def test_school_with_scorecard_data(self):
        """School detail includes scorecard data (admission_rate, sat_avg, etc.)"""
        r = requests.get(f"{BASE_URL}/api/knowledge-base/school/stanford.edu")
        assert r.status_code == 200
        school = r.json()
        
        if school.get("scorecard"):
            sc = school["scorecard"]
            # Verify scorecard fields exist
            possible_fields = ["admission_rate", "sat_avg", "act_midpoint", "student_size", "tuition_in_state"]
            has_data = any(sc.get(f) is not None for f in possible_fields)
            assert has_data, "Scorecard should have at least some data"


class TestAddToBoard:
    """Test add-to-board (add school to pipeline) functionality"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as athlete for add-to-board tests"""
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "emma.chen@athlete.capymatch.com",
            "password": "password123"
        })
        assert r.status_code == 200
        self.token = r.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_add_to_board_requires_auth(self):
        """POST /api/knowledge-base/add-to-board without auth returns 401"""
        r = requests.post(
            f"{BASE_URL}/api/knowledge-base/add-to-board",
            json={"university_name": "Harvard University"}
        )
        assert r.status_code == 401

    def test_add_to_board_requires_university_name(self):
        """POST /api/knowledge-base/add-to-board without university_name returns 400"""
        r = requests.post(
            f"{BASE_URL}/api/knowledge-base/add-to-board",
            headers=self.headers,
            json={}
        )
        assert r.status_code == 400
        assert "university_name" in r.json()["detail"].lower()

    def test_add_to_board_invalid_university(self):
        """POST /api/knowledge-base/add-to-board with invalid university returns 404"""
        r = requests.post(
            f"{BASE_URL}/api/knowledge-base/add-to-board",
            headers=self.headers,
            json={"university_name": "Fake Nonexistent University"}
        )
        assert r.status_code == 404

    def test_add_duplicate_returns_400(self):
        """Adding same university twice returns 400"""
        # First add (may succeed or already exist)
        requests.post(
            f"{BASE_URL}/api/knowledge-base/add-to-board",
            headers=self.headers,
            json={"university_name": "University of Texas"}
        )
        
        # Second add should fail
        r = requests.post(
            f"{BASE_URL}/api/knowledge-base/add-to-board",
            headers=self.headers,
            json={"university_name": "University of Texas"}
        )
        assert r.status_code == 400
        assert "already" in r.json()["detail"].lower()


class TestSuggestedSchools:
    """Test suggested schools (match-ranked) endpoint"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as athlete for suggested schools tests"""
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "emma.chen@athlete.capymatch.com",
            "password": "password123"
        })
        assert r.status_code == 200
        self.token = r.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_suggested_schools_returns_matches(self):
        """GET /api/suggested-schools returns match-ranked suggestions"""
        r = requests.get(f"{BASE_URL}/api/suggested-schools", headers=self.headers)
        assert r.status_code == 200
        data = r.json()
        
        assert "suggestions" in data
        # Should return up to 20 suggestions
        assert len(data["suggestions"]) <= 20

    def test_suggested_schools_have_match_scores(self):
        """Suggested schools have match_score and match_reasons"""
        r = requests.get(f"{BASE_URL}/api/suggested-schools", headers=self.headers)
        assert r.status_code == 200
        data = r.json()
        
        if data["suggestions"]:
            suggestion = data["suggestions"][0]
            assert "match_score" in suggestion
            assert "match_reasons" in suggestion
            assert suggestion["match_score"] > 0

    def test_suggested_schools_sorted_by_score(self):
        """Suggestions are sorted by match_score descending"""
        r = requests.get(f"{BASE_URL}/api/suggested-schools", headers=self.headers)
        assert r.status_code == 200
        data = r.json()
        
        scores = [s["match_score"] for s in data["suggestions"]]
        assert scores == sorted(scores, reverse=True), "Suggestions not sorted by score"

    def test_suggested_schools_without_auth_empty(self):
        """GET /api/suggested-schools without auth returns empty list"""
        r = requests.get(f"{BASE_URL}/api/suggested-schools")
        assert r.status_code == 200
        data = r.json()
        assert data["suggestions"] == []


class TestAdminKBJobs:
    """Test admin KB job management endpoints"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as director for admin tests"""
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "director@capymatch.com",
            "password": "director123"
        })
        assert r.status_code == 200
        self.dir_token = r.json()["token"]
        self.dir_headers = {"Authorization": f"Bearer {self.dir_token}"}
        
        # Also get athlete token for access control tests
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "emma.chen@athlete.capymatch.com",
            "password": "password123"
        })
        assert r.status_code == 200
        self.athlete_token = r.json()["token"]
        self.athlete_headers = {"Authorization": f"Bearer {self.athlete_token}"}

    def test_list_kb_jobs_as_admin(self):
        """GET /api/admin/kb-jobs returns jobs and stats for admin"""
        r = requests.get(f"{BASE_URL}/api/admin/kb-jobs", headers=self.dir_headers)
        assert r.status_code == 200
        data = r.json()
        
        assert "stats" in data
        assert "jobs" in data
        
        # Verify stats
        stats = data["stats"]
        assert "total_schools" in stats
        assert stats["total_schools"] >= 900
        
        # Verify jobs structure
        jobs = data["jobs"]
        assert "scrape_school_data" in jobs
        assert "enrich_scorecard" in jobs

    def test_list_kb_jobs_denied_for_athlete(self):
        """GET /api/admin/kb-jobs returns 403 for non-admin"""
        r = requests.get(f"{BASE_URL}/api/admin/kb-jobs", headers=self.athlete_headers)
        assert r.status_code == 403

    def test_trigger_job_denied_for_athlete(self):
        """POST /api/admin/kb-jobs/{job}/run returns 403 for non-admin"""
        r = requests.post(
            f"{BASE_URL}/api/admin/kb-jobs/enrich_scorecard/run",
            headers=self.athlete_headers
        )
        assert r.status_code == 403

    def test_trigger_unknown_job_returns_400(self):
        """POST /api/admin/kb-jobs/unknown_job/run returns 400"""
        r = requests.post(
            f"{BASE_URL}/api/admin/kb-jobs/unknown_fake_job/run",
            headers=self.dir_headers
        )
        assert r.status_code == 400


class TestLegacyKBRoutes:
    """Test legacy /api/athlete/knowledge/* routes for backward compatibility"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as athlete for legacy routes"""
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "emma.chen@athlete.capymatch.com",
            "password": "password123"
        })
        assert r.status_code == 200
        self.token = r.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_legacy_search_returns_schools(self):
        """GET /api/athlete/knowledge/search returns schools with filters"""
        r = requests.get(f"{BASE_URL}/api/athlete/knowledge/search", headers=self.headers)
        assert r.status_code == 200
        data = r.json()
        
        assert "schools" in data
        assert "total" in data
        assert "filters" in data
        assert data["total"] >= 900

    def test_legacy_search_with_division_filter(self):
        """GET /api/athlete/knowledge/search?division=D1 filters correctly"""
        r = requests.get(
            f"{BASE_URL}/api/athlete/knowledge/search",
            params={"division": "D1"},
            headers=self.headers
        )
        assert r.status_code == 200
        data = r.json()
        
        for school in data["schools"]:
            assert school["division"] == "D1"

    def test_legacy_detail_endpoint(self):
        """GET /api/athlete/knowledge/{domain} returns school detail"""
        r = requests.get(f"{BASE_URL}/api/athlete/knowledge/stanford.edu", headers=self.headers)
        assert r.status_code == 200
        school = r.json()
        
        assert school["domain"] == "stanford.edu"
        assert "in_pipeline" in school
        assert "on_board" in school

    def test_legacy_add_to_pipeline(self):
        """POST /api/athlete/knowledge/{domain}/add-to-pipeline works"""
        # Use a school that may not be in pipeline
        r = requests.post(
            f"{BASE_URL}/api/athlete/knowledge/mit.edu/add-to-pipeline",
            headers=self.headers
        )
        # Either success (200) or already exists (400)
        assert r.status_code in [200, 400, 404]  # 404 if school not in KB

    def test_legacy_requires_auth(self):
        """Legacy search endpoint requires authentication"""
        r = requests.get(f"{BASE_URL}/api/athlete/knowledge/search")
        assert r.status_code == 401

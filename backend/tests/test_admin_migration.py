"""
Test Admin Area Migration - Phase 1 & 2
Tests: Admin Dashboard, Integrations, Universities, Coach Scraper, Scorecard sync
All admin endpoints require director role - tests both director access and 403 for non-admin
"""
import pytest
import requests
import os
import urllib.parse

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
DIRECTOR_EMAIL = "director@capymatch.com"
DIRECTOR_PASSWORD = "director123"
ATHLETE_EMAIL = "emma.chen@athlete.capymatch.com"
ATHLETE_PASSWORD = "password123"


class TestAdminAuth:
    """Test authentication and role-based access"""

    def test_director_login(self):
        """Director can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DIRECTOR_EMAIL,
            "password": DIRECTOR_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data.get("user", {}).get("role") == "director"

    def test_athlete_login(self):
        """Athlete can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ATHLETE_EMAIL,
            "password": ATHLETE_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data.get("user", {}).get("role") == "athlete"


@pytest.fixture(scope="module")
def director_token():
    """Get director auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": DIRECTOR_EMAIL,
        "password": DIRECTOR_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Director login failed")


@pytest.fixture(scope="module")
def athlete_token():
    """Get athlete auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ATHLETE_EMAIL,
        "password": ATHLETE_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Athlete login failed")


class TestAdminDashboard:
    """Admin Dashboard Stats endpoint tests"""

    def test_dashboard_stats_director_access(self, director_token):
        """Director can access admin dashboard stats"""
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard/stats",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "users" in data
        assert "subscriptions" in data
        assert "activity" in data
        assert "knowledge_base" in data
        
        # Verify users section
        assert "total_athletes" in data["users"]
        assert "total_users" in data["users"]
        assert "active_this_week" in data["users"]
        
        # Verify subscriptions section
        assert "plan_counts" in data["subscriptions"]
        assert "mrr" in data["subscriptions"]
        plans = data["subscriptions"]["plan_counts"]
        assert "basic" in plans
        assert "pro" in plans
        assert "premium" in plans
        
        # Verify KB health section
        kb = data["knowledge_base"]
        assert "total_schools" in kb
        assert "has_coach_email" in kb
        assert "has_scorecard" in kb
        assert isinstance(kb["total_schools"], int)

    def test_dashboard_stats_athlete_forbidden(self, athlete_token):
        """Athlete gets 403 when accessing admin dashboard"""
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard/stats",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert response.status_code == 403

    def test_dashboard_stats_no_auth_unauthorized(self):
        """Unauthenticated request gets 401"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard/stats")
        assert response.status_code == 401


class TestAdminIntegrations:
    """Admin Integrations Status endpoint tests"""

    def test_integrations_status_director_access(self, director_token):
        """Director can access integrations status"""
        response = requests.get(
            f"{BASE_URL}/api/admin/integrations",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify 6 integration sections exist
        assert "gmail" in data
        assert "stripe" in data
        assert "ai" in data
        assert "scorecard" in data
        assert "coach_scraper" in data
        assert "url_discovery" in data
        
        # Verify Gmail section
        gmail = data["gmail"]
        assert "connected" in gmail
        assert "configured" in gmail
        
        # Verify Stripe section
        stripe = data["stripe"]
        assert "connected" in stripe
        assert "stats" in stripe
        
        # Verify AI section
        ai = data["ai"]
        assert "connected" in ai
        assert "provider" in ai
        
        # Verify Scorecard section
        scorecard = data["scorecard"]
        assert "connected" in scorecard
        assert "stats" in scorecard
        assert "synced_schools" in scorecard["stats"]
        
        # Verify Coach Scraper section
        coach = data["coach_scraper"]
        assert "stats" in coach
        assert "has_coach_email" in coach["stats"]
        assert "missing_coach_email" in coach["stats"]
        
        # Verify URL Discovery section
        url = data["url_discovery"]
        assert "stats" in url
        assert "has_website" in url["stats"]

    def test_integrations_status_athlete_forbidden(self, athlete_token):
        """Athlete gets 403 when accessing integrations"""
        response = requests.get(
            f"{BASE_URL}/api/admin/integrations",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert response.status_code == 403


class TestAdminUniversities:
    """Admin Universities CRUD and health endpoints"""

    def test_universities_list_director_access(self, director_token):
        """Director can list universities with pagination"""
        response = requests.get(
            f"{BASE_URL}/api/admin/universities",
            headers={"Authorization": f"Bearer {director_token}"},
            params={"page": 1, "limit": 10}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "universities" in data
        assert "total" in data
        assert "page" in data
        assert "limit" in data
        assert isinstance(data["universities"], list)
        assert data["total"] > 0  # Should have KB data

    def test_universities_list_with_search(self, director_token):
        """Director can search universities by name"""
        response = requests.get(
            f"{BASE_URL}/api/admin/universities",
            headers={"Authorization": f"Bearer {director_token}"},
            params={"search": "university", "page": 1, "limit": 10}
        )
        assert response.status_code == 200
        data = response.json()
        assert "universities" in data

    def test_universities_list_with_division_filter(self, director_token):
        """Director can filter universities by division"""
        response = requests.get(
            f"{BASE_URL}/api/admin/universities",
            headers={"Authorization": f"Bearer {director_token}"},
            params={"division": "D1", "page": 1, "limit": 10}
        )
        assert response.status_code == 200
        data = response.json()
        # All returned universities should be D1 if any exist
        for uni in data["universities"]:
            if uni.get("division"):
                assert uni["division"] == "D1"

    def test_universities_list_with_health_filter(self, director_token):
        """Director can filter universities by health status"""
        response = requests.get(
            f"{BASE_URL}/api/admin/universities",
            headers={"Authorization": f"Bearer {director_token}"},
            params={"health": "missing_email", "page": 1, "limit": 10}
        )
        assert response.status_code == 200
        data = response.json()
        # All returned universities should have missing email
        for uni in data["universities"]:
            assert not uni.get("coach_email")

    def test_universities_health_stats(self, director_token):
        """Director can get KB health statistics"""
        response = requests.get(
            f"{BASE_URL}/api/admin/universities/health",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify health stats structure
        assert "total" in data
        assert "missing_coach" in data
        assert "missing_email" in data
        assert "missing_coordinator" in data
        assert "missing_website" in data
        assert "has_scorecard" in data
        assert "has_logo" in data
        assert "completeness_pct" in data
        assert "divisions" in data
        
        # Verify totals make sense
        assert data["total"] > 0
        assert 0 <= data["completeness_pct"] <= 100

    def test_universities_export_csv(self, director_token):
        """Director can export universities to CSV"""
        response = requests.get(
            f"{BASE_URL}/api/admin/universities/export",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        # Check CSV headers exist
        content = response.text
        assert "university_name" in content.lower()

    def test_universities_get_single(self, director_token):
        """Director can get single university detail"""
        # First get a university name from the list
        list_response = requests.get(
            f"{BASE_URL}/api/admin/universities",
            headers={"Authorization": f"Bearer {director_token}"},
            params={"page": 1, "limit": 1}
        )
        assert list_response.status_code == 200
        universities = list_response.json().get("universities", [])
        
        if not universities:
            pytest.skip("No universities in KB to test")
        
        uni_name = universities[0].get("university_name")
        encoded_name = urllib.parse.quote(uni_name, safe="")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/universities/{encoded_name}",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("university_name") == uni_name

    def test_universities_update(self, director_token):
        """Director can update university fields"""
        # Get a university to update
        list_response = requests.get(
            f"{BASE_URL}/api/admin/universities",
            headers={"Authorization": f"Bearer {director_token}"},
            params={"page": 1, "limit": 1}
        )
        assert list_response.status_code == 200
        universities = list_response.json().get("universities", [])
        
        if not universities:
            pytest.skip("No universities in KB to test")
        
        uni_name = universities[0].get("university_name")
        original_region = universities[0].get("region", "")
        test_region = "Test Region" if original_region != "Test Region" else "Other Region"
        encoded_name = urllib.parse.quote(uni_name, safe="")
        
        # Update
        response = requests.put(
            f"{BASE_URL}/api/admin/universities/{encoded_name}",
            headers={"Authorization": f"Bearer {director_token}"},
            json={"region": test_region}
        )
        assert response.status_code == 200
        
        # Verify update
        get_response = requests.get(
            f"{BASE_URL}/api/admin/universities/{encoded_name}",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert get_response.status_code == 200
        assert get_response.json().get("region") == test_region
        
        # Restore original
        requests.put(
            f"{BASE_URL}/api/admin/universities/{encoded_name}",
            headers={"Authorization": f"Bearer {director_token}"},
            json={"region": original_region}
        )

    def test_universities_list_athlete_forbidden(self, athlete_token):
        """Athlete gets 403 when accessing universities list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/universities",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert response.status_code == 403

    def test_universities_health_athlete_forbidden(self, athlete_token):
        """Athlete gets 403 when accessing health stats"""
        response = requests.get(
            f"{BASE_URL}/api/admin/universities/health",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert response.status_code == 403


class TestCoachScraper:
    """Coach Scraper endpoints tests"""

    def test_coach_scraper_status(self, director_token):
        """Director can get coach scraper status"""
        response = requests.get(
            f"{BASE_URL}/api/admin/coach-scraper/status",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify status structure
        assert "running" in data
        assert "done" in data
        assert isinstance(data["running"], bool)

    def test_coach_scraper_start(self, director_token):
        """Director can start coach scraper (returns immediately)"""
        response = requests.post(
            f"{BASE_URL}/api/admin/coach-scraper/scrape",
            headers={"Authorization": f"Bearer {director_token}"},
            json={}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "status" in data
        assert data["status"] in ["started", "already_running"]

    def test_coach_scraper_scrape_one(self, director_token):
        """Director can scrape single university"""
        # Get a university name with domain
        list_response = requests.get(
            f"{BASE_URL}/api/admin/universities",
            headers={"Authorization": f"Bearer {director_token}"},
            params={"page": 1, "limit": 50}
        )
        universities = list_response.json().get("universities", [])
        
        # Find one with a domain
        uni_with_domain = None
        for u in universities:
            if u.get("domain"):
                uni_with_domain = u
                break
        
        if not uni_with_domain:
            pytest.skip("No university with domain found")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/coach-scraper/scrape-one",
            headers={"Authorization": f"Bearer {director_token}"},
            json={"university_name": uni_with_domain["university_name"]}
        )
        # Can be 200 (found) or 200 with found=False
        assert response.status_code == 200

    def test_coach_scraper_athlete_forbidden(self, athlete_token):
        """Athlete gets 403 when accessing coach scraper"""
        response = requests.get(
            f"{BASE_URL}/api/admin/coach-scraper/status",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert response.status_code == 403


class TestScorecardSync:
    """College Scorecard sync endpoints tests"""

    def test_scorecard_sync_status(self, director_token):
        """Director can get scorecard sync status"""
        response = requests.get(
            f"{BASE_URL}/api/admin/integrations/scorecard/sync-status",
            headers={"Authorization": f"Bearer {director_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify status structure
        assert "running" in data
        assert "done" in data
        assert isinstance(data["running"], bool)

    def test_scorecard_sync_start(self, director_token):
        """Director can start scorecard sync (returns immediately)"""
        response = requests.post(
            f"{BASE_URL}/api/admin/integrations/scorecard/sync",
            headers={"Authorization": f"Bearer {director_token}"},
            json={}
        )
        # May return 200 or 400 if no API key configured
        assert response.status_code in [200, 400]
        if response.status_code == 200:
            data = response.json()
            assert "status" in data

    def test_scorecard_athlete_forbidden(self, athlete_token):
        """Athlete gets 403 when accessing scorecard endpoints"""
        response = requests.get(
            f"{BASE_URL}/api/admin/integrations/scorecard/sync-status",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert response.status_code == 403


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

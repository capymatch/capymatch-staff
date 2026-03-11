"""
Test Internal Athlete Profile V2 — Staff-only internal view + profile_visible rename

Tests:
- GET /api/internal/athlete/{athlete_id}/profile — staff-only full profile + recruiting context
- GET /api/internal/athlete/{athlete_id}/profile — 403 for athlete/parent roles
- GET /api/internal/athlete/{athlete_id}/profile — 404 for invalid athlete_id
- PUT /api/internal/athlete/{athlete_id}/profile/publish — staff can toggle profile_visible
- PUT /api/internal/athlete/{athlete_id}/profile/publish — 403 for non-staff
- PUT /api/internal/athlete/{athlete_id}/profile/publish — toggles work (true->false->true)
- GET /api/public/profile/{slug} — uses profile_visible (renamed from is_published)
- GET /api/public/profile/{slug} — 404 when profile_visible=false
- GET /api/athlete/public-profile/settings — returns profile_visible instead of is_published
- PUT /api/athlete/public-profile/settings — accepts both profile_visible and legacy is_published
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
DIRECTOR_EMAIL = "director@capymatch.com"
DIRECTOR_PASSWORD = "director123"
COACH_EMAIL = "coach.williams@capymatch.com"
COACH_PASSWORD = "coach123"
ATHLETE_EMAIL = "emma.chen@athlete.capymatch.com"
ATHLETE_PASSWORD = "password123"

# Known data
ATHLETE_ID = "athlete_3"
KNOWN_SLUG = "emma-chen-2026-oh"


class TestInternalProfileStaffAccess:
    """Test internal profile endpoint - staff access"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with director authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": DIRECTOR_EMAIL,
            "password": DIRECTOR_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.authenticated = True
            print(f"Authenticated as director: {DIRECTOR_EMAIL}")
        else:
            self.authenticated = False
            print(f"Failed to authenticate: {login_response.status_code}")
    
    def test_internal_profile_returns_full_data(self):
        """GET /api/internal/athlete/{athlete_id}/profile - returns full profile + recruiting context"""
        if not self.authenticated:
            pytest.skip("Authentication failed")
        
        response = self.session.get(f"{BASE_URL}/api/internal/athlete/{ATHLETE_ID}/profile")
        print(f"Internal profile response: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        print(f"Response keys: {data.keys()}")
        
        # Validate top-level response structure
        assert "profile" in data, "Response missing 'profile' key"
        assert "coach_summary" in data, "Response missing 'coach_summary' key"
        assert "completeness" in data, "Response missing 'completeness' key"
        assert "settings" in data, "Response missing 'settings' key"
        assert "slug" in data, "Response missing 'slug' key"
        assert "share_url" in data, "Response missing 'share_url' key"
        assert "athlete_id" in data, "Response missing 'athlete_id' key"
        assert "recruiting_context" in data, "Response missing 'recruiting_context' key"
        
        # Validate recruiting context structure
        rc = data["recruiting_context"]
        assert "pipeline" in rc, "recruiting_context missing 'pipeline'"
        assert "coach_flags" in rc, "recruiting_context missing 'coach_flags'"
        assert "director_actions" in rc, "recruiting_context missing 'director_actions'"
        assert "recent_interactions" in rc, "recruiting_context missing 'recent_interactions'"
        
        # Validate pipeline structure
        pipeline = rc["pipeline"]
        assert "total_schools" in pipeline, "pipeline missing 'total_schools'"
        assert "stages" in pipeline, "pipeline missing 'stages'"
        assert "schools" in pipeline, "pipeline missing 'schools'"
        
        # Validate settings has profile_visible (not is_published)
        settings = data["settings"]
        assert "profile_visible" in settings, "settings should have 'profile_visible'"
        
        print(f"Profile name: {data['profile'].get('athlete_name')}")
        print(f"Slug: {data['slug']}")
        print(f"Profile visible: {settings.get('profile_visible')}")
        print(f"Completeness score: {data['completeness'].get('score')}%")
        print(f"Pipeline schools: {pipeline.get('total_schools')}")
        print("PASS: Internal profile returns expected structure with recruiting context")
    
    def test_internal_profile_returns_athlete_id(self):
        """Verify internal profile returns correct athlete_id"""
        if not self.authenticated:
            pytest.skip("Authentication failed")
        
        response = self.session.get(f"{BASE_URL}/api/internal/athlete/{ATHLETE_ID}/profile")
        assert response.status_code == 200
        
        data = response.json()
        assert data["athlete_id"] == ATHLETE_ID, f"Expected athlete_id={ATHLETE_ID}, got {data['athlete_id']}"
        print(f"PASS: athlete_id matches: {ATHLETE_ID}")
    
    def test_internal_profile_404_for_invalid_athlete(self):
        """GET /api/internal/athlete/{athlete_id}/profile - 404 for invalid athlete_id"""
        if not self.authenticated:
            pytest.skip("Authentication failed")
        
        response = self.session.get(f"{BASE_URL}/api/internal/athlete/invalid_athlete_xyz/profile")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Invalid athlete_id returns 404")


class TestInternalProfileCoachAccess:
    """Test internal profile endpoint - coach access"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with coach authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": COACH_EMAIL,
            "password": COACH_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.authenticated = True
            print(f"Authenticated as coach: {COACH_EMAIL}")
        else:
            self.authenticated = False
            print(f"Failed to authenticate: {login_response.status_code}")
    
    def test_coach_can_access_internal_profile(self):
        """Club coach can access internal athlete profile"""
        if not self.authenticated:
            pytest.skip("Authentication failed")
        
        response = self.session.get(f"{BASE_URL}/api/internal/athlete/{ATHLETE_ID}/profile")
        print(f"Coach internal profile response: {response.status_code}")
        
        # Coach should either get 200 (if assigned) or 403 (if not assigned to this athlete)
        # Based on code: directors see all, coaches see assigned athletes
        if response.status_code == 200:
            data = response.json()
            assert "profile" in data
            assert "recruiting_context" in data
            print("PASS: Coach can access internal profile (assigned athlete)")
        elif response.status_code == 403:
            print("PASS: Coach gets 403 (not assigned to this athlete) - expected behavior")
        else:
            pytest.fail(f"Unexpected status: {response.status_code}")


class TestInternalProfileAthleteAccess:
    """Test internal profile endpoint - athlete access (should be 403)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with athlete authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ATHLETE_EMAIL,
            "password": ATHLETE_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.authenticated = True
            print(f"Authenticated as athlete: {ATHLETE_EMAIL}")
        else:
            self.authenticated = False
            print(f"Failed to authenticate: {login_response.status_code}")
    
    def test_athlete_cannot_access_internal_profile(self):
        """Athlete role gets 403 on internal profile endpoint"""
        if not self.authenticated:
            pytest.skip("Authentication failed")
        
        response = self.session.get(f"{BASE_URL}/api/internal/athlete/{ATHLETE_ID}/profile")
        
        assert response.status_code == 403, f"Expected 403 for athlete role, got {response.status_code}"
        print("PASS: Athlete role gets 403 on internal profile endpoint")


class TestStaffPublishToggle:
    """Test staff publish toggle endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with director authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": DIRECTOR_EMAIL,
            "password": DIRECTOR_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.authenticated = True
            print(f"Authenticated as director: {DIRECTOR_EMAIL}")
        else:
            self.authenticated = False
    
    def test_staff_can_toggle_publish_true(self):
        """PUT /api/internal/athlete/{athlete_id}/profile/publish - staff can publish"""
        if not self.authenticated:
            pytest.skip("Authentication failed")
        
        # Set profile_visible to true
        response = self.session.put(
            f"{BASE_URL}/api/internal/athlete/{ATHLETE_ID}/profile/publish",
            json={"profile_visible": True}
        )
        
        print(f"Publish toggle response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("ok") == True, "Response should have ok=true"
        assert data.get("profile_visible") == True, "profile_visible should be true"
        assert "slug" in data, "Response should have slug"
        assert "share_url" in data, "Response should have share_url"
        
        print(f"PASS: Staff can publish profile. Slug: {data.get('slug')}")
    
    def test_staff_can_toggle_publish_false(self):
        """PUT /api/internal/athlete/{athlete_id}/profile/publish - staff can unpublish"""
        if not self.authenticated:
            pytest.skip("Authentication failed")
        
        # Set profile_visible to false
        response = self.session.put(
            f"{BASE_URL}/api/internal/athlete/{ATHLETE_ID}/profile/publish",
            json={"profile_visible": False}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("ok") == True
        assert data.get("profile_visible") == False
        
        print("PASS: Staff can unpublish profile")
    
    def test_publish_toggle_cycle(self):
        """Verify toggles work: true->false->true"""
        if not self.authenticated:
            pytest.skip("Authentication failed")
        
        # Get current state
        profile_resp = self.session.get(f"{BASE_URL}/api/internal/athlete/{ATHLETE_ID}/profile")
        if profile_resp.status_code != 200:
            pytest.skip("Cannot get current profile state")
        
        original_state = profile_resp.json().get("settings", {}).get("profile_visible", False)
        print(f"Original profile_visible: {original_state}")
        
        # Toggle to opposite
        self.session.put(
            f"{BASE_URL}/api/internal/athlete/{ATHLETE_ID}/profile/publish",
            json={"profile_visible": not original_state}
        )
        
        # Verify change
        profile_resp = self.session.get(f"{BASE_URL}/api/internal/athlete/{ATHLETE_ID}/profile")
        new_state = profile_resp.json().get("settings", {}).get("profile_visible", False)
        assert new_state == (not original_state), f"Toggle failed: expected {not original_state}, got {new_state}"
        
        # Toggle back
        self.session.put(
            f"{BASE_URL}/api/internal/athlete/{ATHLETE_ID}/profile/publish",
            json={"profile_visible": original_state}
        )
        
        # Verify restored
        profile_resp = self.session.get(f"{BASE_URL}/api/internal/athlete/{ATHLETE_ID}/profile")
        final_state = profile_resp.json().get("settings", {}).get("profile_visible", False)
        assert final_state == original_state, f"Restore failed: expected {original_state}, got {final_state}"
        
        print(f"PASS: Toggle cycle works: {original_state} -> {not original_state} -> {original_state}")
    
    def test_publish_requires_boolean(self):
        """PUT /api/internal/athlete/{athlete_id}/profile/publish - requires boolean"""
        if not self.authenticated:
            pytest.skip("Authentication failed")
        
        # Send non-boolean value
        response = self.session.put(
            f"{BASE_URL}/api/internal/athlete/{ATHLETE_ID}/profile/publish",
            json={"profile_visible": "yes"}  # String instead of boolean
        )
        
        assert response.status_code == 400, f"Expected 400 for non-boolean, got {response.status_code}"
        print("PASS: Non-boolean profile_visible returns 400")
    
    def test_publish_404_for_invalid_athlete(self):
        """PUT /api/internal/athlete/{athlete_id}/profile/publish - 404 for invalid athlete"""
        if not self.authenticated:
            pytest.skip("Authentication failed")
        
        response = self.session.put(
            f"{BASE_URL}/api/internal/athlete/invalid_xyz/profile/publish",
            json={"profile_visible": True}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Invalid athlete_id returns 404 on publish toggle")


class TestPublishToggleAthleteAccess:
    """Test publish toggle - athlete should get 403"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with athlete authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ATHLETE_EMAIL,
            "password": ATHLETE_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.authenticated = True
        else:
            self.authenticated = False
    
    def test_athlete_cannot_use_staff_publish_toggle(self):
        """PUT /api/internal/athlete/{athlete_id}/profile/publish - 403 for athlete"""
        if not self.authenticated:
            pytest.skip("Authentication failed")
        
        response = self.session.put(
            f"{BASE_URL}/api/internal/athlete/{ATHLETE_ID}/profile/publish",
            json={"profile_visible": True}
        )
        
        assert response.status_code == 403, f"Expected 403 for athlete, got {response.status_code}"
        print("PASS: Athlete gets 403 on staff publish toggle")


class TestProfileVisibleRename:
    """Test the is_published -> profile_visible field rename"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with athlete authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ATHLETE_EMAIL,
            "password": ATHLETE_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.authenticated = True
        else:
            self.authenticated = False
    
    def test_settings_returns_profile_visible(self):
        """GET /api/athlete/public-profile/settings - returns profile_visible"""
        if not self.authenticated:
            pytest.skip("Authentication failed")
        
        response = self.session.get(f"{BASE_URL}/api/athlete/public-profile/settings")
        assert response.status_code == 200
        
        settings = response.json().get("settings", {})
        assert "profile_visible" in settings, "settings should have 'profile_visible' field"
        assert isinstance(settings["profile_visible"], bool), "profile_visible should be boolean"
        
        print(f"PASS: Settings returns profile_visible: {settings['profile_visible']}")
    
    def test_settings_accepts_profile_visible(self):
        """PUT /api/athlete/public-profile/settings - accepts profile_visible"""
        if not self.authenticated:
            pytest.skip("Authentication failed")
        
        # Get current state
        get_resp = self.session.get(f"{BASE_URL}/api/athlete/public-profile/settings")
        original = get_resp.json().get("settings", {}).get("profile_visible", False)
        
        # Update with profile_visible
        response = self.session.put(
            f"{BASE_URL}/api/athlete/public-profile/settings",
            json={"profile_visible": not original}
        )
        
        assert response.status_code == 200
        new_settings = response.json().get("settings", {})
        assert new_settings.get("profile_visible") == (not original)
        
        # Restore
        self.session.put(
            f"{BASE_URL}/api/athlete/public-profile/settings",
            json={"profile_visible": original}
        )
        
        print(f"PASS: Settings accepts profile_visible toggle")
    
    def test_settings_accepts_legacy_is_published(self):
        """PUT /api/athlete/public-profile/settings - accepts legacy is_published"""
        if not self.authenticated:
            pytest.skip("Authentication failed")
        
        # Get current state
        get_resp = self.session.get(f"{BASE_URL}/api/athlete/public-profile/settings")
        original = get_resp.json().get("settings", {}).get("profile_visible", False)
        
        # Update with legacy is_published key
        response = self.session.put(
            f"{BASE_URL}/api/athlete/public-profile/settings",
            json={"is_published": not original}
        )
        
        assert response.status_code == 200
        new_settings = response.json().get("settings", {})
        # is_published should be converted to profile_visible
        assert new_settings.get("profile_visible") == (not original), \
            f"Legacy is_published should set profile_visible. Got: {new_settings}"
        
        # Restore
        self.session.put(
            f"{BASE_URL}/api/athlete/public-profile/settings",
            json={"profile_visible": original}
        )
        
        print("PASS: Settings accepts legacy is_published -> converts to profile_visible")


class TestPublicProfileWithProfileVisible:
    """Test public profile respects profile_visible field"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session - need auth to modify settings"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ATHLETE_EMAIL,
            "password": ATHLETE_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.authenticated = True
        else:
            self.authenticated = False
    
    def get_public_session(self):
        """Create unauthenticated session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        return s
    
    def test_public_profile_visible_when_published(self):
        """GET /api/public/profile/{slug} - 200 when profile_visible=true"""
        if not self.authenticated:
            pytest.skip("Authentication failed")
        
        # Ensure published
        self.session.put(
            f"{BASE_URL}/api/athlete/public-profile/settings",
            json={"profile_visible": True}
        )
        
        # Get slug
        settings = self.session.get(f"{BASE_URL}/api/athlete/public-profile/settings").json()
        slug = settings.get("slug")
        
        # Check public access
        public = self.get_public_session()
        response = public.get(f"{BASE_URL}/api/public/profile/{slug}")
        
        assert response.status_code == 200, f"Expected 200 when published, got {response.status_code}"
        print(f"PASS: Public profile accessible when profile_visible=true")
    
    def test_public_profile_404_when_unpublished(self):
        """GET /api/public/profile/{slug} - 404 when profile_visible=false"""
        if not self.authenticated:
            pytest.skip("Authentication failed")
        
        # Get slug first
        settings = self.session.get(f"{BASE_URL}/api/athlete/public-profile/settings").json()
        slug = settings.get("slug")
        original = settings.get("settings", {}).get("profile_visible", False)
        
        # Unpublish
        self.session.put(
            f"{BASE_URL}/api/athlete/public-profile/settings",
            json={"profile_visible": False}
        )
        
        # Check public access - should be 404
        public = self.get_public_session()
        response = public.get(f"{BASE_URL}/api/public/profile/{slug}")
        
        assert response.status_code == 404, f"Expected 404 when unpublished, got {response.status_code}"
        
        # Restore
        self.session.put(
            f"{BASE_URL}/api/athlete/public-profile/settings",
            json={"profile_visible": original}
        )
        
        print("PASS: Public profile returns 404 when profile_visible=false")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

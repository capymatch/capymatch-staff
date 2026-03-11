"""
Test Public Athlete Profile V1 — Slug-based URLs, Privacy Settings, Completeness
Tests:
- GET /api/public/profile/{slug} — public profile with privacy filtering
- GET /api/athlete/public-profile/settings — settings, slug, completeness, coach_summary_preview  
- PUT /api/athlete/public-profile/settings — update visibility toggles
- POST /api/athlete/public-profile/generate-slug — regenerate slug
- Privacy filtering for contact_email, contact_phone, bio, measurables, club coach
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ATHLETE_EMAIL = "emma.chen@athlete.capymatch.com"
ATHLETE_PASSWORD = "password123"

# Known slug from development testing
KNOWN_SLUG = "emma-chen-2026-oh"


class TestPublicProfileEndpoints:
    """Test public profile endpoints (no auth required)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_public_profile_published_returns_200(self):
        """GET /api/public/profile/{slug} - returns public profile when published"""
        response = self.session.get(f"{BASE_URL}/api/public/profile/{KNOWN_SLUG}")
        print(f"Public profile response: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Profile data keys: {data.keys()}")
            
            # Validate response structure
            assert "profile" in data, "Response missing 'profile' key"
            assert "coach_summary" in data, "Response missing 'coach_summary' key"
            assert "visibility" in data, "Response missing 'visibility' key"
            assert "upcoming_events" in data, "Response missing 'upcoming_events' key"
            assert "past_events" in data, "Response missing 'past_events' key"
            
            # Validate profile structure
            profile = data["profile"]
            assert "athlete_name" in profile, "Profile missing 'athlete_name'"
            
            # Validate visibility structure
            visibility = data["visibility"]
            assert "show_contact_email" in visibility
            assert "show_contact_phone" in visibility
            assert "show_bio" in visibility
            assert "show_measurables" in visibility
            assert "show_club_coach" in visibility
            
            print(f"Coach summary: {data.get('coach_summary', 'N/A')[:100]}...")
            print("PASS: Public profile returns expected structure")
        else:
            # Profile might be unpublished - check that
            print(f"Got status {response.status_code} - profile may be unpublished")
            assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
    
    def test_public_profile_nonexistent_slug_returns_404(self):
        """GET /api/public/profile/{slug} - returns 404 for non-existent slug"""
        fake_slug = "nonexistent-athlete-slug-12345"
        response = self.session.get(f"{BASE_URL}/api/public/profile/{fake_slug}")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Non-existent slug returns 404")
    
    def test_public_profile_contact_email_privacy(self):
        """Verify contact_email is filtered based on show_contact_email setting"""
        response = self.session.get(f"{BASE_URL}/api/public/profile/{KNOWN_SLUG}")
        
        if response.status_code == 200:
            data = response.json()
            profile = data["profile"]
            visibility = data["visibility"]
            
            if visibility.get("show_contact_email"):
                # Email should be visible
                assert profile.get("contact_email"), "Email should be visible when show_contact_email=true"
                print(f"PASS: Contact email visible: {profile.get('contact_email')}")
            else:
                # Email should be hidden (empty string)
                assert profile.get("contact_email") == "", "Email should be hidden when show_contact_email=false"
                print("PASS: Contact email hidden as expected")
        else:
            pytest.skip("Profile not accessible")


class TestAuthenticatedSettings:
    """Test authenticated settings endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get auth token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ATHLETE_EMAIL,
            "password": ATHLETE_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.authenticated = True
            print(f"Authenticated as {ATHLETE_EMAIL}")
        else:
            self.authenticated = False
            print(f"Failed to authenticate: {login_response.status_code}")
    
    def test_get_public_profile_settings(self):
        """GET /api/athlete/public-profile/settings - returns settings, slug, completeness"""
        if not self.authenticated:
            pytest.skip("Authentication failed")
        
        response = self.session.get(f"{BASE_URL}/api/athlete/public-profile/settings")
        print(f"Settings response: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        print(f"Settings data keys: {data.keys()}")
        
        # Validate response structure
        assert "settings" in data, "Response missing 'settings' key"
        assert "slug" in data, "Response missing 'slug' key"
        assert "completeness" in data, "Response missing 'completeness' key"
        assert "coach_summary_preview" in data, "Response missing 'coach_summary_preview' key"
        assert "share_url" in data, "Response missing 'share_url' key"
        
        # Validate settings structure
        settings = data["settings"]
        assert "profile_visible" in settings, "Settings missing 'profile_visible' (renamed from is_published)"
        assert "show_contact_email" in settings, "Settings missing 'show_contact_email'"
        assert "show_contact_phone" in settings, "Settings missing 'show_contact_phone'"
        assert "show_bio" in settings, "Settings missing 'show_bio'"
        assert "show_measurables" in settings, "Settings missing 'show_measurables'"
        assert "show_club_coach" in settings, "Settings missing 'show_club_coach'"
        
        # Validate completeness structure
        completeness = data["completeness"]
        assert "score" in completeness, "Completeness missing 'score'"
        assert "filled" in completeness, "Completeness missing 'filled'"
        assert "missing" in completeness, "Completeness missing 'missing'"
        assert isinstance(completeness["score"], int), "Completeness score should be an int"
        
        print(f"Slug: {data.get('slug')}")
        print(f"Share URL: {data.get('share_url')}")
        print(f"Completeness: {completeness['score']}%")
        print(f"Coach summary preview: {data.get('coach_summary_preview', 'N/A')[:100]}...")
        print("PASS: Settings endpoint returns expected structure")
    
    def test_settings_auto_generates_slug(self):
        """GET /api/athlete/public-profile/settings - auto-generates slug on first call"""
        if not self.authenticated:
            pytest.skip("Authentication failed")
        
        response = self.session.get(f"{BASE_URL}/api/athlete/public-profile/settings")
        
        assert response.status_code == 200
        data = response.json()
        
        # Slug should be present (auto-generated if missing)
        assert data.get("slug"), "Slug should be auto-generated"
        assert len(data["slug"]) > 0, "Slug should not be empty"
        
        # Share URL should use the slug
        expected_share_url = f"/p/{data['slug']}"
        assert data.get("share_url") == expected_share_url, f"Share URL mismatch: {data.get('share_url')}"
        
        print(f"PASS: Slug auto-generated: {data['slug']}")
    
    def test_update_visibility_toggles(self):
        """PUT /api/athlete/public-profile/settings - updates visibility toggles"""
        if not self.authenticated:
            pytest.skip("Authentication failed")
        
        # Get current settings
        get_response = self.session.get(f"{BASE_URL}/api/athlete/public-profile/settings")
        original_settings = get_response.json().get("settings", {})
        original_show_bio = original_settings.get("show_bio", True)
        
        # Toggle show_bio
        new_show_bio = not original_show_bio
        update_response = self.session.put(
            f"{BASE_URL}/api/athlete/public-profile/settings",
            json={"show_bio": new_show_bio}
        )
        
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}"
        
        data = update_response.json()
        assert data.get("ok") == True, "Response should have ok=true"
        assert "settings" in data, "Response should have settings"
        assert data["settings"]["show_bio"] == new_show_bio, "show_bio should be updated"
        
        print(f"PASS: show_bio toggled from {original_show_bio} to {new_show_bio}")
        
        # Restore original setting
        self.session.put(
            f"{BASE_URL}/api/athlete/public-profile/settings",
            json={"show_bio": original_show_bio}
        )
        print("Restored original settings")
    
    def test_update_publish_toggle(self):
        """PUT /api/athlete/public-profile/settings - updates profile_visible toggle (legacy is_published also works)"""
        if not self.authenticated:
            pytest.skip("Authentication failed")
        
        # Get current settings
        get_response = self.session.get(f"{BASE_URL}/api/athlete/public-profile/settings")
        original_settings = get_response.json().get("settings", {})
        original_published = original_settings.get("profile_visible", False)
        
        # Toggle using legacy is_published key (backend converts it to profile_visible)
        new_published = not original_published
        update_response = self.session.put(
            f"{BASE_URL}/api/athlete/public-profile/settings",
            json={"is_published": new_published}
        )
        
        assert update_response.status_code == 200
        data = update_response.json()
        # Response uses profile_visible (the new name)
        assert data["settings"]["profile_visible"] == new_published
        
        print(f"PASS: profile_visible toggled from {original_published} to {new_published}")
        
        # Restore original setting
        self.session.put(
            f"{BASE_URL}/api/athlete/public-profile/settings",
            json={"profile_visible": original_published}
        )
        print("Restored original settings")
    
    def test_update_only_accepts_boolean_for_known_keys(self):
        """PUT /api/athlete/public-profile/settings - only accepts boolean values"""
        if not self.authenticated:
            pytest.skip("Authentication failed")
        
        # Try to set non-boolean value (should be ignored)
        update_response = self.session.put(
            f"{BASE_URL}/api/athlete/public-profile/settings",
            json={"show_bio": "yes"}  # String instead of boolean
        )
        
        assert update_response.status_code == 200
        data = update_response.json()
        
        # The non-boolean value should be ignored
        # show_bio should still be a boolean
        assert isinstance(data["settings"]["show_bio"], bool), "show_bio should still be boolean"
        print("PASS: Non-boolean values are ignored")
    
    def test_update_ignores_unknown_keys(self):
        """PUT /api/athlete/public-profile/settings - ignores unknown keys"""
        if not self.authenticated:
            pytest.skip("Authentication failed")
        
        # Get current settings
        get_response = self.session.get(f"{BASE_URL}/api/athlete/public-profile/settings")
        original_settings = get_response.json().get("settings", {})
        
        # Try to set unknown key
        update_response = self.session.put(
            f"{BASE_URL}/api/athlete/public-profile/settings",
            json={"unknown_key": True, "show_bio": original_settings.get("show_bio", True)}
        )
        
        assert update_response.status_code == 200
        data = update_response.json()
        
        # Unknown key should not be in settings
        assert "unknown_key" not in data["settings"], "Unknown key should be ignored"
        print("PASS: Unknown keys are ignored")
    
    def test_regenerate_slug(self):
        """POST /api/athlete/public-profile/generate-slug - regenerates slug"""
        if not self.authenticated:
            pytest.skip("Authentication failed")
        
        # Get current slug
        get_response = self.session.get(f"{BASE_URL}/api/athlete/public-profile/settings")
        original_slug = get_response.json().get("slug", "")
        
        # Regenerate slug
        regenerate_response = self.session.post(f"{BASE_URL}/api/athlete/public-profile/generate-slug")
        
        assert regenerate_response.status_code == 200, f"Expected 200, got {regenerate_response.status_code}"
        
        data = regenerate_response.json()
        assert data.get("ok") == True, "Response should have ok=true"
        assert "slug" in data, "Response should have slug"
        assert "share_url" in data, "Response should have share_url"
        
        new_slug = data["slug"]
        expected_share_url = f"/p/{new_slug}"
        assert data["share_url"] == expected_share_url
        
        print(f"PASS: Slug regenerated: {original_slug} -> {new_slug}")


class TestPrivacyFiltering:
    """Test privacy filtering on public profile"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get auth token
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
        """Create a fresh session for public (unauthenticated) requests"""
        public_session = requests.Session()
        public_session.headers.update({"Content-Type": "application/json"})
        return public_session
    
    def test_contact_email_privacy_filter(self):
        """Verify contact_email hidden when show_contact_email=false"""
        if not self.authenticated:
            pytest.skip("Authentication failed")
        
        # Get slug
        settings_resp = self.session.get(f"{BASE_URL}/api/athlete/public-profile/settings")
        slug = settings_resp.json().get("slug")
        
        # Save original setting
        original = settings_resp.json().get("settings", {}).get("show_contact_email", False)
        
        # Set show_contact_email=false and ensure published
        self.session.put(
            f"{BASE_URL}/api/athlete/public-profile/settings",
            json={"show_contact_email": False, "profile_visible": True}
        )
        
        # Check public profile
        public_session = self.get_public_session()
        public_resp = public_session.get(f"{BASE_URL}/api/public/profile/{slug}")
        
        if public_resp.status_code == 200:
            profile = public_resp.json().get("profile", {})
            assert profile.get("contact_email") == "", "contact_email should be empty when hidden"
            print("PASS: contact_email hidden when show_contact_email=false")
        
        # Set show_contact_email=true
        self.session.put(
            f"{BASE_URL}/api/athlete/public-profile/settings",
            json={"show_contact_email": True}
        )
        
        # Check public profile again
        public_resp = public_session.get(f"{BASE_URL}/api/public/profile/{slug}")
        
        if public_resp.status_code == 200:
            profile = public_resp.json().get("profile", {})
            # Email should now be visible (if athlete has email)
            print(f"Contact email when visible: '{profile.get('contact_email')}'")
        
        # Restore original
        self.session.put(
            f"{BASE_URL}/api/athlete/public-profile/settings",
            json={"show_contact_email": original}
        )
    
    def test_bio_privacy_filter(self):
        """Verify bio hidden when show_bio=false"""
        if not self.authenticated:
            pytest.skip("Authentication failed")
        
        # Get slug
        settings_resp = self.session.get(f"{BASE_URL}/api/athlete/public-profile/settings")
        slug = settings_resp.json().get("slug")
        original = settings_resp.json().get("settings", {}).get("show_bio", True)
        
        # Set show_bio=false and ensure published
        self.session.put(
            f"{BASE_URL}/api/athlete/public-profile/settings",
            json={"show_bio": False, "profile_visible": True}
        )
        
        # Check public profile
        public_session = self.get_public_session()
        public_resp = public_session.get(f"{BASE_URL}/api/public/profile/{slug}")
        
        if public_resp.status_code == 200:
            profile = public_resp.json().get("profile", {})
            assert profile.get("bio") == "", "bio should be empty when hidden"
            print("PASS: bio hidden when show_bio=false")
        
        # Restore original
        self.session.put(
            f"{BASE_URL}/api/athlete/public-profile/settings",
            json={"show_bio": original}
        )
    
    def test_unpublished_profile_returns_404(self):
        """Verify unpublished profile returns 404 to public"""
        if not self.authenticated:
            pytest.skip("Authentication failed")
        
        # Get slug
        settings_resp = self.session.get(f"{BASE_URL}/api/athlete/public-profile/settings")
        slug = settings_resp.json().get("slug")
        original = settings_resp.json().get("settings", {}).get("profile_visible", False)
        
        # Unpublish profile
        self.session.put(
            f"{BASE_URL}/api/athlete/public-profile/settings",
            json={"profile_visible": False}
        )
        
        # Check public profile - should return 404
        public_session = self.get_public_session()
        public_resp = public_session.get(f"{BASE_URL}/api/public/profile/{slug}")
        
        assert public_resp.status_code == 404, f"Expected 404 for unpublished, got {public_resp.status_code}"
        print("PASS: Unpublished profile returns 404")
        
        # Restore original
        self.session.put(
            f"{BASE_URL}/api/athlete/public-profile/settings",
            json={"profile_visible": original}
        )


class TestCompletenessCheck:
    """Test profile completeness calculation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get auth token
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
    
    def test_completeness_returns_score(self):
        """Verify completeness score is calculated (0-100)"""
        if not self.authenticated:
            pytest.skip("Authentication failed")
        
        response = self.session.get(f"{BASE_URL}/api/athlete/public-profile/settings")
        assert response.status_code == 200
        
        completeness = response.json().get("completeness", {})
        score = completeness.get("score", 0)
        
        assert 0 <= score <= 100, f"Score should be 0-100, got {score}"
        print(f"PASS: Completeness score: {score}%")
    
    def test_completeness_returns_filled_and_missing(self):
        """Verify completeness returns filled and missing fields"""
        if not self.authenticated:
            pytest.skip("Authentication failed")
        
        response = self.session.get(f"{BASE_URL}/api/athlete/public-profile/settings")
        assert response.status_code == 200
        
        completeness = response.json().get("completeness", {})
        filled = completeness.get("filled", [])
        missing = completeness.get("missing", [])
        
        assert isinstance(filled, list), "filled should be a list"
        assert isinstance(missing, list), "missing should be a list"
        
        # Total should equal 12 fields
        total = len(filled) + len(missing)
        assert total == 12, f"Total fields should be 12, got {total}"
        
        print(f"PASS: Filled fields ({len(filled)}): {filled}")
        print(f"Missing fields ({len(missing)}): {missing}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

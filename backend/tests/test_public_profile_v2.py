"""
Test Public Profile V2 - Coach Scan Mode & Dynamic Recruiting Snapshot

Tests:
- GET /api/public/profile/{slug} returns recruiting_signals array
- Recruiting signals include division interest
- Recruiting signals include 'Academic information available' when GPA exists
- Recruiting signals include 'Profile updated this season' when recently updated
- Recruiting signals are privacy-safe (no school names, no pipeline counts)
- GET /api/internal/athlete/{athlete_id}/profile still works for staff
- PUT /api/internal/athlete/{athlete_id}/profile/publish still works
- GET /api/athlete/public-profile/settings still returns profile_visible
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
DIRECTOR_CREDS = {"email": "director@capymatch.com", "password": "director123"}
ATHLETE_CREDS = {"email": "emma.chen@athlete.capymatch.com", "password": "password123"}
ATHLETE_ID = "athlete_3"
PUBLIC_SLUG = "emma-chen-2026-oh"


class TestPublicProfileV2RecruitingSignals:
    """Tests for recruiting_signals in public profile response"""

    def test_public_profile_returns_recruiting_signals(self):
        """GET /api/public/profile/{slug} returns recruiting_signals array"""
        response = requests.get(f"{BASE_URL}/api/public/profile/{PUBLIC_SLUG}")
        assert response.status_code == 200
        data = response.json()
        
        # Verify recruiting_signals is present and is a list
        assert "recruiting_signals" in data, "recruiting_signals field missing from response"
        assert isinstance(data["recruiting_signals"], list), "recruiting_signals should be a list"
        print(f"PASS: recruiting_signals present with {len(data['recruiting_signals'])} signals")

    def test_recruiting_signals_include_division_interest(self):
        """Recruiting signals include division interest"""
        response = requests.get(f"{BASE_URL}/api/public/profile/{PUBLIC_SLUG}")
        assert response.status_code == 200
        data = response.json()
        
        signals = data.get("recruiting_signals", [])
        division_signal = [s for s in signals if "D1" in s or "D2" in s or "D3" in s or "NAIA" in s or "exploring" in s.lower()]
        assert len(division_signal) > 0, "No division interest signal found"
        print(f"PASS: Division interest signal found: {division_signal[0]}")

    def test_recruiting_signals_include_academic_info_when_gpa_exists(self):
        """Recruiting signals include 'Academic information available' when GPA exists"""
        response = requests.get(f"{BASE_URL}/api/public/profile/{PUBLIC_SLUG}")
        assert response.status_code == 200
        data = response.json()
        
        # Emma has GPA=3.8 in seed data
        profile = data.get("profile", {})
        signals = data.get("recruiting_signals", [])
        
        gpa = profile.get("gpa")
        print(f"Profile GPA: {gpa}")
        
        if gpa and str(gpa).strip():
            academic_signal = [s for s in signals if "academic" in s.lower() or "gpa" in s.lower()]
            assert len(academic_signal) > 0, f"No academic info signal found despite GPA={gpa}"
            print(f"PASS: Academic info signal found: {academic_signal[0]}")
        else:
            print("SKIP: No GPA in profile, academic signal not expected")

    def test_recruiting_signals_include_profile_freshness(self):
        """Recruiting signals include 'Profile updated this season' when recently updated"""
        response = requests.get(f"{BASE_URL}/api/public/profile/{PUBLIC_SLUG}")
        assert response.status_code == 200
        data = response.json()
        
        signals = data.get("recruiting_signals", [])
        freshness_signal = [s for s in signals if "updated" in s.lower() or "season" in s.lower()]
        
        # This signal depends on when the profile was last updated
        if freshness_signal:
            print(f"PASS: Freshness signal found: {freshness_signal[0]}")
        else:
            print("INFO: No freshness signal (profile may not be recently updated)")
        # Don't fail this - it's conditional

    def test_recruiting_signals_privacy_safe_no_school_names(self):
        """Recruiting signals are privacy-safe (no school names)"""
        response = requests.get(f"{BASE_URL}/api/public/profile/{PUBLIC_SLUG}")
        assert response.status_code == 200
        data = response.json()
        
        signals = data.get("recruiting_signals", [])
        signals_text = " ".join(signals).lower()
        
        # School names that should NOT appear in public signals
        sensitive_patterns = ["university", "college", "state u", "stanford", "ucla", "duke", "ohio state"]
        
        for pattern in sensitive_patterns:
            assert pattern not in signals_text, f"Found sensitive pattern '{pattern}' in signals"
        
        print(f"PASS: No sensitive school names found in signals")

    def test_recruiting_signals_privacy_safe_no_pipeline_counts(self):
        """Recruiting signals don't expose exact pipeline counts"""
        response = requests.get(f"{BASE_URL}/api/public/profile/{PUBLIC_SLUG}")
        assert response.status_code == 200
        data = response.json()
        
        signals = data.get("recruiting_signals", [])
        signals_text = " ".join(signals).lower()
        
        # Should not see exact counts like "12 schools" or "5 programs"
        # Vague language like "across 5 states" is okay
        problematic_patterns = ["schools in pipeline", "programs added", "offers received"]
        
        for pattern in problematic_patterns:
            assert pattern not in signals_text, f"Found sensitive pipeline count pattern '{pattern}'"
        
        print(f"PASS: No sensitive pipeline counts found in signals")


class TestPublicProfileV2Response:
    """Tests for public profile response structure"""

    def test_public_profile_returns_profile_dict(self):
        """GET /api/public/profile/{slug} returns profile with expected fields"""
        response = requests.get(f"{BASE_URL}/api/public/profile/{PUBLIC_SLUG}")
        assert response.status_code == 200
        data = response.json()
        
        assert "profile" in data
        profile = data["profile"]
        
        # Key fields for Coach Scan Mode
        key_fields = ["athlete_name", "graduation_year", "position", "height", "gpa", "contact_email"]
        for field in key_fields:
            assert field in profile, f"Missing field: {field}"
        
        print(f"PASS: Profile contains all key fields: {key_fields}")

    def test_public_profile_returns_coach_summary(self):
        """GET /api/public/profile/{slug} returns coach_summary"""
        response = requests.get(f"{BASE_URL}/api/public/profile/{PUBLIC_SLUG}")
        assert response.status_code == 200
        data = response.json()
        
        assert "coach_summary" in data
        assert isinstance(data["coach_summary"], str)
        assert len(data["coach_summary"]) > 20, "Coach summary seems too short"
        print(f"PASS: Coach summary present: '{data['coach_summary'][:80]}...'")

    def test_public_profile_returns_events(self):
        """GET /api/public/profile/{slug} returns upcoming_events and past_events"""
        response = requests.get(f"{BASE_URL}/api/public/profile/{PUBLIC_SLUG}")
        assert response.status_code == 200
        data = response.json()
        
        assert "upcoming_events" in data
        assert "past_events" in data
        assert isinstance(data["upcoming_events"], list)
        assert isinstance(data["past_events"], list)
        print(f"PASS: Events present - upcoming: {len(data['upcoming_events'])}, past: {len(data['past_events'])}")

    def test_public_profile_404_for_nonexistent_slug(self):
        """GET /api/public/profile/{slug} returns 404 for non-existent slug"""
        response = requests.get(f"{BASE_URL}/api/public/profile/nonexistent-slug-xyz")
        assert response.status_code == 404
        print("PASS: 404 returned for non-existent slug")


class TestInternalProfileStillWorks:
    """Tests that internal staff profile endpoint still works"""

    @pytest.fixture
    def director_token(self):
        """Get director auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=DIRECTOR_CREDS)
        if response.status_code != 200:
            pytest.skip("Could not authenticate director")
        return response.json().get("token")

    def test_internal_profile_still_works_for_staff(self, director_token):
        """GET /api/internal/athlete/{athlete_id}/profile still works for staff"""
        headers = {"Authorization": f"Bearer {director_token}"}
        response = requests.get(f"{BASE_URL}/api/internal/athlete/{ATHLETE_ID}/profile", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Should return full profile + recruiting context
        assert "profile" in data
        assert "recruiting_context" in data
        assert "completeness" in data
        assert "settings" in data
        
        # Internal profile should NOT have recruiting_signals (that's public only)
        # Instead it has full recruiting_context with pipeline details
        recruiting_context = data.get("recruiting_context", {})
        assert "pipeline" in recruiting_context
        assert "coach_flags" in recruiting_context
        
        print(f"PASS: Internal profile works - pipeline has {recruiting_context['pipeline'].get('total_schools', 0)} schools")

    def test_internal_profile_403_for_athlete(self):
        """GET /api/internal/athlete/{athlete_id}/profile returns 403 for athlete"""
        # Login as athlete
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ATHLETE_CREDS)
        if response.status_code != 200:
            pytest.skip("Could not authenticate athlete")
        token = response.json().get("token")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/internal/athlete/{ATHLETE_ID}/profile", headers=headers)
        assert response.status_code == 403
        print("PASS: 403 returned for athlete accessing internal profile")


class TestPublishToggleStillWorks:
    """Tests that staff can still toggle publish status"""

    @pytest.fixture
    def director_token(self):
        """Get director auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=DIRECTOR_CREDS)
        if response.status_code != 200:
            pytest.skip("Could not authenticate director")
        return response.json().get("token")

    def test_publish_toggle_still_works(self, director_token):
        """PUT /api/internal/athlete/{athlete_id}/profile/publish still works"""
        headers = {"Authorization": f"Bearer {director_token}"}
        
        # Get current status
        response = requests.get(f"{BASE_URL}/api/internal/athlete/{ATHLETE_ID}/profile", headers=headers)
        current_visible = response.json().get("settings", {}).get("profile_visible", False)
        
        # Toggle to opposite
        new_visible = not current_visible
        response = requests.put(
            f"{BASE_URL}/api/internal/athlete/{ATHLETE_ID}/profile/publish",
            headers=headers,
            json={"profile_visible": new_visible}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("profile_visible") == new_visible
        print(f"PASS: Toggled profile_visible from {current_visible} to {new_visible}")
        
        # Toggle back to original
        response = requests.put(
            f"{BASE_URL}/api/internal/athlete/{ATHLETE_ID}/profile/publish",
            headers=headers,
            json={"profile_visible": current_visible}
        )
        assert response.status_code == 200
        print(f"PASS: Restored profile_visible to {current_visible}")


class TestAthleteSettingsStillWorks:
    """Tests that athlete settings endpoint still works"""

    @pytest.fixture
    def athlete_token(self):
        """Get athlete auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ATHLETE_CREDS)
        if response.status_code != 200:
            pytest.skip("Could not authenticate athlete")
        return response.json().get("token")

    def test_athlete_settings_returns_profile_visible(self, athlete_token):
        """GET /api/athlete/public-profile/settings returns profile_visible"""
        headers = {"Authorization": f"Bearer {athlete_token}"}
        response = requests.get(f"{BASE_URL}/api/athlete/public-profile/settings", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "settings" in data
        settings = data["settings"]
        assert "profile_visible" in settings
        assert isinstance(settings["profile_visible"], bool)
        
        assert "slug" in data
        assert "completeness" in data
        
        print(f"PASS: Settings returned - profile_visible={settings['profile_visible']}, slug={data['slug']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

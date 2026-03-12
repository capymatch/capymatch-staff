"""
Account & Settings Page Backend Tests (Sprint: Profile/Settings Redesign)
Tests for: AccountPage (/account), SettingsPage (/athlete-settings), Team API (/team)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials for athlete user
TEST_EMAIL = "emma.chen@athlete.capymatch.com"
TEST_PASSWORD = "password123"


@pytest.fixture(scope="module")
def auth_token():
    """Get auth token for test athlete"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Login failed: {response.status_code} {response.text}")
    token = response.json().get("token")
    if not token:
        pytest.skip("No token in login response")
    return token


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Auth headers for requests"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


# ═══════════════════════════════════════════════════════════════════
# ACCOUNT PAGE TESTS (/account) - Personal Info, Subscription, Password, Notifications
# ═══════════════════════════════════════════════════════════════════

class TestAccountPersonalInfo:
    """Tests for Personal Info section on AccountPage"""
    
    def test_get_settings_returns_name_email(self, auth_headers):
        """Personal info shows name and email from /api/athlete/settings"""
        response = requests.get(f"{BASE_URL}/api/athlete/settings", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "name" in data, "Missing name field for Personal Info"
        assert "email" in data, "Missing email field for Personal Info"
        assert data["email"] == TEST_EMAIL
    
    def test_edit_personal_info_name(self, auth_headers):
        """Can edit name via PUT /api/athlete/settings"""
        # Get original
        orig = requests.get(f"{BASE_URL}/api/athlete/settings", headers=auth_headers).json()
        orig_name = orig.get("name", "")
        
        # Update name
        response = requests.put(f"{BASE_URL}/api/athlete/settings",
                               headers=auth_headers,
                               json={"name": "TEST_Personal_Info_Update"})
        assert response.status_code == 200, f"Name update failed: {response.text}"
        
        # Verify change persisted
        verify = requests.get(f"{BASE_URL}/api/athlete/settings", headers=auth_headers).json()
        assert verify["name"] == "TEST_Personal_Info_Update"
        
        # Restore original
        requests.put(f"{BASE_URL}/api/athlete/settings",
                    headers=auth_headers, json={"name": orig_name})


class TestAccountSubscription:
    """Tests for Subscription card on AccountPage"""
    
    def test_subscription_endpoint_exists(self, auth_headers):
        """Subscription endpoint returns data"""
        response = requests.get(f"{BASE_URL}/api/subscription", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "tier" in data or "plan" in data or "subscription" in data, "Missing subscription info"
    
    def test_subscription_has_limits(self, auth_headers):
        """Subscription includes limits/usage info"""
        response = requests.get(f"{BASE_URL}/api/subscription", headers=auth_headers)
        data = response.json()
        # Should have limits or usage info for schools/AI drafts
        assert "limits" in data or "usage" in data or "schools_limit" in data.get("limits", {}), \
            "Missing subscription limits/usage for AccountPage"


class TestAccountPasswordChange:
    """Tests for Change Password section on AccountPage"""
    
    def test_change_password_requires_current(self, auth_headers):
        """Password change requires current password"""
        response = requests.post(f"{BASE_URL}/api/athlete/settings/change-password",
                                headers=auth_headers,
                                json={"new_password": "newpass123"})
        assert response.status_code == 400
    
    def test_change_password_min_length(self, auth_headers):
        """New password must be >= 6 characters"""
        response = requests.post(f"{BASE_URL}/api/athlete/settings/change-password",
                                headers=auth_headers,
                                json={"current_password": TEST_PASSWORD, "new_password": "12345"})
        assert response.status_code == 400
    
    def test_change_password_wrong_current(self, auth_headers):
        """Wrong current password rejected"""
        response = requests.post(f"{BASE_URL}/api/athlete/settings/change-password",
                                headers=auth_headers,
                                json={"current_password": "wrongpassword", "new_password": "newpass123"})
        assert response.status_code == 400


class TestAccountNotifications:
    """Tests for Notifications toggles on AccountPage"""
    
    def test_get_notification_prefs(self, auth_headers):
        """Get notification preferences"""
        response = requests.get(f"{BASE_URL}/api/athlete/settings", headers=auth_headers)
        data = response.json()
        prefs = data.get("preferences", {})
        assert "followup_reminders" in prefs, "Missing followup_reminders pref"
        assert "email_notifications" in prefs, "Missing email_notifications pref"
    
    def test_toggle_followup_reminders(self, auth_headers):
        """Can toggle followup_reminders"""
        # Get original
        orig = requests.get(f"{BASE_URL}/api/athlete/settings", headers=auth_headers).json()
        orig_val = orig.get("preferences", {}).get("followup_reminders", True)
        
        # Toggle
        response = requests.put(f"{BASE_URL}/api/athlete/settings",
                               headers=auth_headers,
                               json={"followup_reminders": not orig_val})
        assert response.status_code == 200
        
        # Verify
        verify = requests.get(f"{BASE_URL}/api/athlete/settings", headers=auth_headers).json()
        assert verify["preferences"]["followup_reminders"] == (not orig_val)
        
        # Restore
        requests.put(f"{BASE_URL}/api/athlete/settings",
                    headers=auth_headers, json={"followup_reminders": orig_val})


class TestAccountPrivacyExport:
    """Tests for Privacy / Data Export on AccountPage"""
    
    def test_export_data_returns_200(self, auth_headers):
        """Data export endpoint works"""
        response = requests.get(f"{BASE_URL}/api/athlete/settings/export-data", headers=auth_headers)
        assert response.status_code == 200
    
    def test_export_data_structure(self, auth_headers):
        """Export has required structure"""
        response = requests.get(f"{BASE_URL}/api/athlete/settings/export-data", headers=auth_headers)
        data = response.json()
        assert "athlete" in data, "Missing athlete in export"
        assert "exported_at" in data, "Missing exported_at timestamp"


class TestAccountDangerZone:
    """Tests for Danger Zone (account deletion) on AccountPage"""
    
    def test_delete_requires_confirmation(self, auth_headers):
        """Delete requires 'DELETE' confirmation text"""
        response = requests.delete(f"{BASE_URL}/api/athlete/settings/delete-account",
                                  headers=auth_headers, json={})
        assert response.status_code == 400
    
    def test_delete_wrong_confirmation(self, auth_headers):
        """Delete rejects wrong confirmation"""
        response = requests.delete(f"{BASE_URL}/api/athlete/settings/delete-account",
                                  headers=auth_headers, json={"confirmation": "delete"})
        assert response.status_code == 400


# ═══════════════════════════════════════════════════════════════════
# SETTINGS PAGE TESTS (/athlete-settings) - Theme, Gmail, Team, Privacy, Tour
# ═══════════════════════════════════════════════════════════════════

class TestSettingsTheme:
    """Tests for Appearance/Theme selector on SettingsPage"""
    
    def test_get_theme_preference(self, auth_headers):
        """Theme preference is returned"""
        response = requests.get(f"{BASE_URL}/api/athlete/settings", headers=auth_headers)
        data = response.json()
        prefs = data.get("preferences", {})
        assert "theme" in prefs, "Missing theme preference"
        assert prefs["theme"] in ["dark", "light", "system"], f"Invalid theme: {prefs['theme']}"
    
    def test_set_theme_dark(self, auth_headers):
        """Can set theme to dark"""
        response = requests.put(f"{BASE_URL}/api/athlete/settings",
                               headers=auth_headers, json={"theme": "dark"})
        assert response.status_code == 200
        verify = requests.get(f"{BASE_URL}/api/athlete/settings", headers=auth_headers).json()
        assert verify["preferences"]["theme"] == "dark"
    
    def test_set_theme_light(self, auth_headers):
        """Can set theme to light"""
        response = requests.put(f"{BASE_URL}/api/athlete/settings",
                               headers=auth_headers, json={"theme": "light"})
        assert response.status_code == 200
        verify = requests.get(f"{BASE_URL}/api/athlete/settings", headers=auth_headers).json()
        assert verify["preferences"]["theme"] == "light"
        # Restore dark
        requests.put(f"{BASE_URL}/api/athlete/settings",
                    headers=auth_headers, json={"theme": "dark"})
    
    def test_set_theme_system(self, auth_headers):
        """Can set theme to system"""
        response = requests.put(f"{BASE_URL}/api/athlete/settings",
                               headers=auth_headers, json={"theme": "system"})
        assert response.status_code == 200
        verify = requests.get(f"{BASE_URL}/api/athlete/settings", headers=auth_headers).json()
        assert verify["preferences"]["theme"] == "system"
        # Restore dark
        requests.put(f"{BASE_URL}/api/athlete/settings",
                    headers=auth_headers, json={"theme": "dark"})


class TestSettingsGmail:
    """Tests for Gmail Integration section on SettingsPage"""
    
    def test_gmail_status_endpoint(self, auth_headers):
        """Gmail status endpoint works"""
        response = requests.get(f"{BASE_URL}/api/athlete/gmail/status", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "connected" in data
        assert isinstance(data["connected"], bool)
    
    def test_gmail_disconnect_works(self, auth_headers):
        """Gmail disconnect endpoint works (even if not connected)"""
        response = requests.post(f"{BASE_URL}/api/athlete/gmail/disconnect", headers=auth_headers)
        assert response.status_code == 200


class TestSettingsPrivacyToggles:
    """Tests for Data & Privacy toggles on SettingsPage"""
    
    def test_toggle_inbound_scan(self, auth_headers):
        """Can toggle inbound_scan preference"""
        orig = requests.get(f"{BASE_URL}/api/athlete/settings", headers=auth_headers).json()
        orig_val = orig.get("preferences", {}).get("inbound_scan", True)
        
        response = requests.put(f"{BASE_URL}/api/athlete/settings",
                               headers=auth_headers, json={"inbound_scan": not orig_val})
        assert response.status_code == 200
        
        verify = requests.get(f"{BASE_URL}/api/athlete/settings", headers=auth_headers).json()
        assert verify["preferences"]["inbound_scan"] == (not orig_val)
        
        # Restore
        requests.put(f"{BASE_URL}/api/athlete/settings",
                    headers=auth_headers, json={"inbound_scan": orig_val})


# ═══════════════════════════════════════════════════════════════════
# TEAM MANAGEMENT TESTS (/api/team) - Owner info, Members, Invites
# ═══════════════════════════════════════════════════════════════════

class TestTeamGet:
    """Tests for GET /api/team - Team info retrieval"""
    
    def test_get_team_returns_200(self, auth_headers):
        """GET /api/team returns 200"""
        response = requests.get(f"{BASE_URL}/api/team", headers=auth_headers)
        assert response.status_code == 200
    
    def test_team_has_owner_info(self, auth_headers):
        """Team response has owner info"""
        response = requests.get(f"{BASE_URL}/api/team", headers=auth_headers)
        data = response.json()
        assert "owner" in data, "Missing owner field"
        assert "user_id" in data["owner"]
        assert "name" in data["owner"]
        assert "email" in data["owner"]
    
    def test_team_has_members_array(self, auth_headers):
        """Team response has members array"""
        response = requests.get(f"{BASE_URL}/api/team", headers=auth_headers)
        data = response.json()
        assert "members" in data
        assert isinstance(data["members"], list)
    
    def test_team_has_pending_invitations(self, auth_headers):
        """Team response has pending_invitations array"""
        response = requests.get(f"{BASE_URL}/api/team", headers=auth_headers)
        data = response.json()
        assert "pending_invitations" in data
        assert isinstance(data["pending_invitations"], list)
    
    def test_team_has_current_user_role(self, auth_headers):
        """Team shows current user's role (owner/member)"""
        response = requests.get(f"{BASE_URL}/api/team", headers=auth_headers)
        data = response.json()
        assert "current_user_role" in data
        assert data["current_user_role"] in ["owner", "member"]
    
    def test_team_has_limits(self, auth_headers):
        """Team has limits (max_members, current_count)"""
        response = requests.get(f"{BASE_URL}/api/team", headers=auth_headers)
        data = response.json()
        assert "limits" in data
        assert "max_members" in data["limits"]
        assert "current_count" in data["limits"]
    
    def test_team_unauthorized(self):
        """GET /api/team requires auth"""
        response = requests.get(f"{BASE_URL}/api/team")
        assert response.status_code in [401, 403]


class TestTeamInvite:
    """Tests for POST /api/team/invite - Sending invitations"""
    
    def test_invite_requires_email(self, auth_headers):
        """Invite requires email field"""
        response = requests.post(f"{BASE_URL}/api/team/invite",
                                headers=auth_headers, json={})
        assert response.status_code == 400
    
    def test_invite_valid_email(self, auth_headers):
        """Can invite with valid email"""
        # Use unique email to avoid duplicate errors
        import time
        unique_email = f"test_invite_{int(time.time())}@example.com"
        
        response = requests.post(f"{BASE_URL}/api/team/invite",
                                headers=auth_headers,
                                json={"email": unique_email})
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") == True
        assert "invite_id" in data
    
    def test_cannot_invite_self(self, auth_headers):
        """Cannot invite yourself"""
        response = requests.post(f"{BASE_URL}/api/team/invite",
                                headers=auth_headers,
                                json={"email": TEST_EMAIL})
        assert response.status_code == 400
    
    def test_invite_appears_in_pending(self, auth_headers):
        """After invite, email appears in pending_invitations"""
        import time
        unique_email = f"test_pending_{int(time.time())}@example.com"
        
        # Send invite
        requests.post(f"{BASE_URL}/api/team/invite",
                     headers=auth_headers, json={"email": unique_email})
        
        # Check pending
        team = requests.get(f"{BASE_URL}/api/team", headers=auth_headers).json()
        pending_emails = [inv["email"] for inv in team.get("pending_invitations", [])]
        assert unique_email in pending_emails
    
    def test_invite_unauthorized(self):
        """Invite requires auth"""
        response = requests.post(f"{BASE_URL}/api/team/invite",
                                json={"email": "test@example.com"})
        assert response.status_code in [401, 403]


class TestTeamCancelInvite:
    """Tests for DELETE /api/team/invitations/{invite_id} - Cancel invitation"""
    
    def test_cancel_invite_works(self, auth_headers):
        """Owner can cancel pending invite"""
        import time
        unique_email = f"test_cancel_{int(time.time())}@example.com"
        
        # Send invite
        invite_resp = requests.post(f"{BASE_URL}/api/team/invite",
                                   headers=auth_headers, json={"email": unique_email})
        invite_id = invite_resp.json().get("invite_id")
        
        # Cancel it
        cancel_resp = requests.delete(f"{BASE_URL}/api/team/invitations/{invite_id}",
                                     headers=auth_headers)
        assert cancel_resp.status_code == 200
    
    def test_cancel_invalid_invite_404(self, auth_headers):
        """Cancel non-existent invite returns 404"""
        response = requests.delete(f"{BASE_URL}/api/team/invitations/invalid_id_123",
                                  headers=auth_headers)
        assert response.status_code == 404


class TestTeamLeave:
    """Tests for POST /api/team/leave - Member leaves team"""
    
    def test_owner_cannot_leave_own_team(self, auth_headers):
        """Owner cannot leave their own team (they ARE the team)"""
        response = requests.post(f"{BASE_URL}/api/team/leave", headers=auth_headers)
        # Should return 400 since owner is not a "member"
        assert response.status_code == 400


# ═══════════════════════════════════════════════════════════════════
# SIDEBAR NAVIGATION TESTS - Verify routes exist
# ═══════════════════════════════════════════════════════════════════

class TestSidebarNavigation:
    """Tests that routes for Account/Settings exist and are accessible"""
    
    def test_account_page_backend_deps(self, auth_headers):
        """Account page dependencies: settings + subscription APIs work"""
        settings = requests.get(f"{BASE_URL}/api/athlete/settings", headers=auth_headers)
        subscription = requests.get(f"{BASE_URL}/api/subscription", headers=auth_headers)
        
        assert settings.status_code == 200, "Settings API must work for AccountPage"
        assert subscription.status_code == 200, "Subscription API must work for AccountPage"
    
    def test_settings_page_backend_deps(self, auth_headers):
        """Settings page dependencies: settings + gmail + team APIs work"""
        settings = requests.get(f"{BASE_URL}/api/athlete/settings", headers=auth_headers)
        gmail = requests.get(f"{BASE_URL}/api/athlete/gmail/status", headers=auth_headers)
        team = requests.get(f"{BASE_URL}/api/team", headers=auth_headers)
        
        assert settings.status_code == 200, "Settings API must work for SettingsPage"
        assert gmail.status_code == 200, "Gmail API must work for SettingsPage"
        assert team.status_code == 200, "Team API must work for SettingsPage"

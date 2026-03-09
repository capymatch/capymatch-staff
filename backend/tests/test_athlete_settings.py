"""
Athlete Settings Page Backend Tests
Tests for Settings API endpoints: profile CRUD, password change, data export, account deletion
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
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


class TestSettingsEndpoints:
    """Tests for /api/athlete/settings endpoints"""
    
    # ─── GET Settings ───
    def test_get_settings_returns_200(self, auth_headers):
        """GET /api/athlete/settings returns 200"""
        response = requests.get(f"{BASE_URL}/api/athlete/settings", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_get_settings_has_name_and_email(self, auth_headers):
        """Settings response has name and email"""
        response = requests.get(f"{BASE_URL}/api/athlete/settings", headers=auth_headers)
        data = response.json()
        assert "name" in data, "Missing 'name' field"
        assert "email" in data, "Missing 'email' field"
        assert data["email"] == TEST_EMAIL, f"Email mismatch: {data['email']}"
    
    def test_get_settings_has_preferences(self, auth_headers):
        """Settings response has preferences with expected fields"""
        response = requests.get(f"{BASE_URL}/api/athlete/settings", headers=auth_headers)
        data = response.json()
        assert "preferences" in data, "Missing 'preferences' field"
        prefs = data["preferences"]
        # Verify expected preference keys exist
        assert "email_notifications" in prefs, "Missing email_notifications preference"
        assert "followup_reminders" in prefs, "Missing followup_reminders preference"
        assert "inbound_scan" in prefs, "Missing inbound_scan preference"
        assert "theme" in prefs, "Missing theme preference"
    
    def test_get_settings_unauthorized(self):
        """GET /api/athlete/settings without auth returns 401/403"""
        response = requests.get(f"{BASE_URL}/api/athlete/settings")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    # ─── PUT Settings (Profile Update) ───
    def test_put_settings_name_update(self, auth_headers):
        """PUT /api/athlete/settings can update name"""
        # Get original name
        orig = requests.get(f"{BASE_URL}/api/athlete/settings", headers=auth_headers).json()
        orig_name = orig.get("name", "")
        
        # Update name
        response = requests.put(f"{BASE_URL}/api/athlete/settings", 
                               headers=auth_headers, 
                               json={"name": "TEST_Updated Name"})
        assert response.status_code == 200, f"Update failed: {response.status_code}: {response.text}"
        
        # Verify change
        verify = requests.get(f"{BASE_URL}/api/athlete/settings", headers=auth_headers).json()
        assert verify["name"] == "TEST_Updated Name", "Name not updated"
        
        # Restore original
        requests.put(f"{BASE_URL}/api/athlete/settings", 
                    headers=auth_headers, 
                    json={"name": orig_name})
    
    def test_put_settings_theme_update(self, auth_headers):
        """PUT /api/athlete/settings can update theme preference"""
        # Get original theme
        orig = requests.get(f"{BASE_URL}/api/athlete/settings", headers=auth_headers).json()
        orig_theme = orig.get("preferences", {}).get("theme", "dark")
        
        # Update theme
        new_theme = "light" if orig_theme == "dark" else "dark"
        response = requests.put(f"{BASE_URL}/api/athlete/settings", 
                               headers=auth_headers, 
                               json={"theme": new_theme})
        assert response.status_code == 200, f"Theme update failed: {response.status_code}"
        
        # Verify change
        verify = requests.get(f"{BASE_URL}/api/athlete/settings", headers=auth_headers).json()
        assert verify["preferences"]["theme"] == new_theme, "Theme not updated"
        
        # Restore original
        requests.put(f"{BASE_URL}/api/athlete/settings", 
                    headers=auth_headers, 
                    json={"theme": orig_theme})
    
    def test_put_settings_toggle_notifications(self, auth_headers):
        """PUT /api/athlete/settings can toggle notification preferences"""
        # Get original state
        orig = requests.get(f"{BASE_URL}/api/athlete/settings", headers=auth_headers).json()
        orig_followup = orig.get("preferences", {}).get("followup_reminders", True)
        
        # Toggle
        response = requests.put(f"{BASE_URL}/api/athlete/settings", 
                               headers=auth_headers, 
                               json={"followup_reminders": not orig_followup})
        assert response.status_code == 200
        
        # Verify
        verify = requests.get(f"{BASE_URL}/api/athlete/settings", headers=auth_headers).json()
        assert verify["preferences"]["followup_reminders"] == (not orig_followup)
        
        # Restore
        requests.put(f"{BASE_URL}/api/athlete/settings", 
                    headers=auth_headers, 
                    json={"followup_reminders": orig_followup})


class TestPasswordChange:
    """Tests for /api/athlete/settings/change-password"""
    
    def test_change_password_validation_empty(self, auth_headers):
        """Change password requires both current and new password"""
        response = requests.post(f"{BASE_URL}/api/athlete/settings/change-password",
                                headers=auth_headers,
                                json={})
        assert response.status_code == 400
        
    def test_change_password_validation_short(self, auth_headers):
        """New password must be at least 6 characters"""
        response = requests.post(f"{BASE_URL}/api/athlete/settings/change-password",
                                headers=auth_headers,
                                json={"current_password": TEST_PASSWORD, "new_password": "12345"})
        assert response.status_code == 400
        
    def test_change_password_wrong_current(self, auth_headers):
        """Wrong current password is rejected"""
        response = requests.post(f"{BASE_URL}/api/athlete/settings/change-password",
                                headers=auth_headers,
                                json={"current_password": "wrongpassword", "new_password": "newpassword123"})
        assert response.status_code == 400
        detail = response.json().get("detail", "")
        assert "incorrect" in detail.lower() or "wrong" in detail.lower() or "current" in detail.lower()
    
    def test_change_password_correct_flow(self, auth_headers):
        """Can change password with correct current password (change and revert)"""
        # Change password
        response = requests.post(f"{BASE_URL}/api/athlete/settings/change-password",
                                headers=auth_headers,
                                json={"current_password": TEST_PASSWORD, "new_password": "testchanged123"})
        assert response.status_code == 200, f"Password change failed: {response.text}"
        
        # Verify can login with new password
        login_new = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": "testchanged123"
        })
        assert login_new.status_code == 200, "Cannot login with new password"
        new_token = login_new.json()["token"]
        
        # Revert password
        revert = requests.post(f"{BASE_URL}/api/athlete/settings/change-password",
                              headers={"Authorization": f"Bearer {new_token}", "Content-Type": "application/json"},
                              json={"current_password": "testchanged123", "new_password": TEST_PASSWORD})
        assert revert.status_code == 200, f"Password revert failed: {revert.text}"


class TestExportData:
    """Tests for /api/athlete/settings/export-data"""
    
    def test_export_data_returns_200(self, auth_headers):
        """GET /api/athlete/settings/export-data returns 200"""
        response = requests.get(f"{BASE_URL}/api/athlete/settings/export-data", headers=auth_headers)
        assert response.status_code == 200, f"Export failed: {response.status_code}: {response.text}"
    
    def test_export_data_has_required_fields(self, auth_headers):
        """Export contains athlete, programs, coaches, interactions"""
        response = requests.get(f"{BASE_URL}/api/athlete/settings/export-data", headers=auth_headers)
        data = response.json()
        assert "athlete" in data, "Missing athlete field"
        assert "programs" in data, "Missing programs field"
        assert "college_coaches" in data, "Missing college_coaches field"
        assert "interactions" in data, "Missing interactions field"
        assert "exported_at" in data, "Missing exported_at timestamp"
    
    def test_export_data_unauthorized(self):
        """Export requires authentication"""
        response = requests.get(f"{BASE_URL}/api/athlete/settings/export-data")
        assert response.status_code in [401, 403]


class TestDeleteAccount:
    """Tests for /api/athlete/settings/delete-account - VALIDATION ONLY (do not actually delete)"""
    
    def test_delete_account_requires_confirmation(self, auth_headers):
        """DELETE requires 'DELETE' confirmation"""
        response = requests.delete(f"{BASE_URL}/api/athlete/settings/delete-account",
                                  headers=auth_headers,
                                  json={})
        assert response.status_code == 400
        
    def test_delete_account_wrong_confirmation(self, auth_headers):
        """DELETE rejects wrong confirmation text"""
        response = requests.delete(f"{BASE_URL}/api/athlete/settings/delete-account",
                                  headers=auth_headers,
                                  json={"confirmation": "delete"})  # lowercase
        assert response.status_code == 400
        
    def test_delete_account_unauthorized(self):
        """DELETE requires auth"""
        response = requests.delete(f"{BASE_URL}/api/athlete/settings/delete-account",
                                  json={"confirmation": "DELETE"})
        assert response.status_code in [401, 403]


class TestGmailStatus:
    """Tests for /api/athlete/gmail/status"""
    
    def test_gmail_status_returns_200(self, auth_headers):
        """GET /api/athlete/gmail/status returns 200"""
        response = requests.get(f"{BASE_URL}/api/athlete/gmail/status", headers=auth_headers)
        assert response.status_code == 200, f"Status failed: {response.status_code}: {response.text}"
    
    def test_gmail_status_has_connected_field(self, auth_headers):
        """Status has 'connected' boolean field"""
        response = requests.get(f"{BASE_URL}/api/athlete/gmail/status", headers=auth_headers)
        data = response.json()
        assert "connected" in data, "Missing 'connected' field"
        assert isinstance(data["connected"], bool), "connected should be boolean"


class TestGmailConnect:
    """Tests for /api/athlete/gmail/connect - OAuth URL generation"""
    
    def test_gmail_connect_returns_auth_url(self, auth_headers):
        """GET /api/athlete/gmail/connect returns auth_url"""
        response = requests.get(f"{BASE_URL}/api/athlete/gmail/connect", headers=auth_headers)
        # May return 500 if Gmail OAuth not configured, which is expected
        if response.status_code == 500:
            data = response.json()
            if "not configured" in data.get("detail", "").lower():
                pytest.skip("Gmail OAuth not configured in app_config")
        assert response.status_code == 200, f"Connect failed: {response.status_code}: {response.text}"
        data = response.json()
        assert "auth_url" in data, "Missing 'auth_url' in response"
        assert data["auth_url"].startswith("https://accounts.google.com"), "Invalid auth URL"
    
    def test_gmail_connect_unauthorized(self):
        """Connect requires auth"""
        response = requests.get(f"{BASE_URL}/api/athlete/gmail/connect")
        assert response.status_code in [401, 403]


class TestGmailDisconnect:
    """Tests for /api/athlete/gmail/disconnect"""
    
    def test_gmail_disconnect_unauthorized(self):
        """Disconnect requires auth"""
        response = requests.post(f"{BASE_URL}/api/athlete/gmail/disconnect")
        assert response.status_code in [401, 403]
    
    def test_gmail_disconnect_returns_ok(self, auth_headers):
        """Disconnect returns ok (even if not connected)"""
        response = requests.post(f"{BASE_URL}/api/athlete/gmail/disconnect", headers=auth_headers)
        # Should succeed even if not connected
        assert response.status_code == 200


class TestGmailImportHistory:
    """Tests for Gmail import-history endpoints"""
    
    def test_import_start_requires_gmail(self, auth_headers):
        """POST /api/athlete/gmail/import-history requires Gmail connection"""
        response = requests.post(f"{BASE_URL}/api/athlete/gmail/import-history", headers=auth_headers)
        # Should fail with 403 if Gmail not connected
        if response.status_code == 403:
            assert "not connected" in response.json().get("detail", "").lower()
        # Or may return 200/409 if there's an existing run or Gmail IS connected
        assert response.status_code in [200, 403, 409], f"Unexpected: {response.status_code}"
    
    def test_import_status_invalid_run_id(self, auth_headers):
        """GET /api/athlete/gmail/import-history/{run_id}/status - invalid ID returns 404"""
        response = requests.get(f"{BASE_URL}/api/athlete/gmail/import-history/invalid_run_id/status", 
                               headers=auth_headers)
        assert response.status_code == 404
    
    def test_import_confirm_invalid_run_id(self, auth_headers):
        """POST /api/athlete/gmail/import-history/{run_id}/confirm - invalid ID returns 404"""
        response = requests.post(f"{BASE_URL}/api/athlete/gmail/import-history/invalid_run_id/confirm",
                                headers=auth_headers,
                                json={"selected": []})
        assert response.status_code == 404


class TestGmailSend:
    """Tests for /api/athlete/gmail/send - email sending"""
    
    def test_send_email_unauthorized(self):
        """Send requires auth"""
        response = requests.post(f"{BASE_URL}/api/athlete/gmail/send",
                                json={"to": "test@test.com", "subject": "Test", "body": "Test"})
        assert response.status_code in [401, 403]
    
    def test_send_email_logs_without_gmail(self, auth_headers):
        """Send logs interaction even without Gmail (fallback mode)"""
        # First check if Gmail is connected
        status = requests.get(f"{BASE_URL}/api/athlete/gmail/status", headers=auth_headers).json()
        
        response = requests.post(f"{BASE_URL}/api/athlete/gmail/send",
                                headers=auth_headers,
                                json={
                                    "to": "test@example.edu",
                                    "subject": "TEST_Email Subject",
                                    "body": "TEST_Email body content",
                                    "program_id": "",
                                    "university_name": "Test University"
                                })
        # If Gmail not connected, should still return 200 with status=logged
        if not status.get("connected"):
            assert response.status_code == 200
            data = response.json()
            assert data.get("status") == "logged"
            assert data.get("gmail_sent") == False

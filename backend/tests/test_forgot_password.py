"""
Tests for Forgot Password / Password Reset Flow
- POST /api/auth/forgot-password: Generic response for both existing/non-existing emails
- POST /api/auth/reset-password: Token validation, password update, token invalidation
- Security: Hashed tokens, 1-hour expiry, single-use, older tokens invalidated
"""

import pytest
import requests
import os
import hashlib
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

# Test credentials
COACH_EMAIL = "coach.williams@capymatch.com"
COACH_PASSWORD = "coach123"
DIRECTOR_EMAIL = "director@capymatch.com"
DIRECTOR_PASSWORD = "director123"


@pytest.fixture(scope="module")
def mongo_db():
    """Direct MongoDB connection for token verification"""
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]
    yield db
    client.close()


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestForgotPasswordEndpoint:
    """Tests for POST /api/auth/forgot-password"""

    def test_forgot_password_existing_email_returns_generic_message(self, api_client):
        """Existing email returns generic message (no email enumeration)"""
        response = api_client.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": COACH_EMAIL
        })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "If an account exists" in data["message"]
        print(f"✓ Existing email returns generic message: {data['message']}")

    def test_forgot_password_nonexistent_email_returns_same_message(self, api_client):
        """Non-existing email returns SAME generic message (no email enumeration)"""
        response = api_client.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "nonexistent.user@capymatch.com"
        })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "If an account exists" in data["message"]
        print(f"✓ Non-existing email returns same generic message: {data['message']}")

    def test_forgot_password_empty_email_returns_generic(self, api_client):
        """Empty email returns generic message (doesn't reveal validation)"""
        response = api_client.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": ""
        })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ Empty email handled gracefully: {data['message']}")

    def test_forgot_password_stores_hashed_token_not_raw(self, api_client, mongo_db):
        """Token stored in DB is hashed, not raw"""
        # Generate a request
        test_email = COACH_EMAIL
        response = api_client.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": test_email
        })
        assert response.status_code == 200

        # Check DB for the token
        reset_doc = mongo_db.password_resets.find_one(
            {"email": test_email, "used": False},
            sort=[("created_at", -1)]
        )
        assert reset_doc is not None, "Reset token should be stored in DB"
        assert "token_hash" in reset_doc, "Should store token_hash field"
        
        # Verify it's a hex string (SHA-256 hash)
        token_hash = reset_doc["token_hash"]
        assert len(token_hash) == 64, "SHA-256 hash should be 64 hex chars"
        assert all(c in "0123456789abcdef" for c in token_hash), "Should be valid hex"
        print(f"✓ Token stored as SHA-256 hash: {token_hash[:20]}...")

    def test_forgot_password_invalidates_older_tokens(self, api_client, mongo_db):
        """Requesting new token invalidates older unused tokens for same email"""
        test_email = COACH_EMAIL
        
        # First request
        response1 = api_client.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": test_email
        })
        assert response1.status_code == 200
        
        # Get first token hash
        first_doc = mongo_db.password_resets.find_one(
            {"email": test_email},
            sort=[("created_at", -1)]
        )
        first_hash = first_doc["token_hash"]
        
        # Second request
        response2 = api_client.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": test_email
        })
        assert response2.status_code == 200
        
        # Check first token is now marked as used
        first_doc_after = mongo_db.password_resets.find_one({"token_hash": first_hash})
        assert first_doc_after["used"] == True, "Old token should be marked as used"
        
        # Get new token
        new_doc = mongo_db.password_resets.find_one(
            {"email": test_email, "used": False},
            sort=[("created_at", -1)]
        )
        assert new_doc is not None, "New token should exist"
        assert new_doc["token_hash"] != first_hash, "New token should be different"
        print(f"✓ Older token invalidated, new token created")


class TestResetPasswordEndpoint:
    """Tests for POST /api/auth/reset-password"""

    def test_reset_password_with_valid_token(self, api_client, mongo_db):
        """Valid token allows password reset"""
        # Create a known token directly in MongoDB
        raw_token = "test-valid-token-12345"
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        test_email = COACH_EMAIL
        
        # Remove any existing test tokens
        mongo_db.password_resets.delete_many({"token_hash": token_hash})
        
        # Insert test token
        mongo_db.password_resets.insert_one({
            "id": "test-reset-id-valid",
            "email": test_email,
            "token_hash": token_hash,
            "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
            "used": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Use token to reset password
        new_password = "newpassword123"
        response = api_client.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": raw_token,
            "password": new_password
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Password has been reset" in data["message"] or "reset" in data["message"].lower()
        print(f"✓ Password reset successful: {data['message']}")
        
        # Verify token is now marked as used
        used_token = mongo_db.password_resets.find_one({"token_hash": token_hash})
        assert used_token["used"] == True, "Token should be marked as used"
        print(f"✓ Token marked as used after reset")
        
        # Restore original password for other tests
        restore_token = "restore-token-12345"
        restore_hash = hashlib.sha256(restore_token.encode()).hexdigest()
        mongo_db.password_resets.insert_one({
            "id": "test-restore-id",
            "email": test_email,
            "token_hash": restore_hash,
            "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
            "used": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        restore_response = api_client.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": restore_token,
            "password": COACH_PASSWORD
        })
        assert restore_response.status_code == 200
        print(f"✓ Password restored to original: {COACH_PASSWORD}")

    def test_reset_password_rejects_used_token(self, api_client, mongo_db):
        """Used token is rejected"""
        raw_token = "test-used-token-67890"
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        
        # Remove any existing and insert as used
        mongo_db.password_resets.delete_many({"token_hash": token_hash})
        mongo_db.password_resets.insert_one({
            "id": "test-reset-id-used",
            "email": COACH_EMAIL,
            "token_hash": token_hash,
            "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
            "used": True,  # Already used
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        response = api_client.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": raw_token,
            "password": "newpassword123"
        })
        
        assert response.status_code == 400
        data = response.json()
        assert "Invalid" in data.get("detail", "") or "expired" in data.get("detail", "")
        print(f"✓ Used token rejected: {data.get('detail')}")

    def test_reset_password_rejects_expired_token(self, api_client, mongo_db):
        """Expired token is rejected"""
        raw_token = "test-expired-token-11111"
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        
        # Remove any existing and insert as expired
        mongo_db.password_resets.delete_many({"token_hash": token_hash})
        mongo_db.password_resets.insert_one({
            "id": "test-reset-id-expired",
            "email": COACH_EMAIL,
            "token_hash": token_hash,
            "expires_at": (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat(),  # Expired 2 hours ago
            "used": False,
            "created_at": (datetime.now(timezone.utc) - timedelta(hours=3)).isoformat()
        })
        
        response = api_client.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": raw_token,
            "password": "newpassword123"
        })
        
        assert response.status_code == 400
        data = response.json()
        assert "expired" in data.get("detail", "").lower() or "Invalid" in data.get("detail", "")
        print(f"✓ Expired token rejected: {data.get('detail')}")

    def test_reset_password_rejects_invalid_token(self, api_client):
        """Invalid/unknown token is rejected"""
        response = api_client.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": "completely-invalid-token-xyz",
            "password": "newpassword123"
        })
        
        assert response.status_code == 400
        data = response.json()
        assert "Invalid" in data.get("detail", "") or "expired" in data.get("detail", "")
        print(f"✓ Invalid token rejected: {data.get('detail')}")

    def test_reset_password_requires_min_6_chars(self, api_client, mongo_db):
        """Password must be at least 6 characters"""
        raw_token = "test-short-pw-token"
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        
        # Create valid token
        mongo_db.password_resets.delete_many({"token_hash": token_hash})
        mongo_db.password_resets.insert_one({
            "id": "test-reset-id-shortpw",
            "email": COACH_EMAIL,
            "token_hash": token_hash,
            "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
            "used": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Try with 5 char password
        response = api_client.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": raw_token,
            "password": "12345"  # Only 5 chars
        })
        
        assert response.status_code == 400
        data = response.json()
        assert "6 characters" in data.get("detail", "") or "at least" in data.get("detail", "").lower()
        print(f"✓ Short password rejected: {data.get('detail')}")

    def test_reset_password_requires_token_and_password(self, api_client):
        """Both token and password are required"""
        # Missing password
        response1 = api_client.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": "some-token"
        })
        assert response1.status_code == 400
        print(f"✓ Missing password rejected")
        
        # Missing token
        response2 = api_client.post(f"{BASE_URL}/api/auth/reset-password", json={
            "password": "newpassword123"
        })
        assert response2.status_code == 400
        print(f"✓ Missing token rejected")


class TestLoginAfterPasswordReset:
    """Test that login works with new password after reset"""

    def test_login_works_after_password_reset(self, api_client, mongo_db):
        """User can login with new password after reset"""
        test_email = COACH_EMAIL
        original_password = COACH_PASSWORD
        new_password = "temporaryNewPass123"
        
        # Create token for reset
        raw_token = "test-login-after-reset-token"
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        
        mongo_db.password_resets.delete_many({"token_hash": token_hash})
        mongo_db.password_resets.insert_one({
            "id": "test-login-reset-id",
            "email": test_email,
            "token_hash": token_hash,
            "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
            "used": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Reset password
        reset_response = api_client.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": raw_token,
            "password": new_password
        })
        assert reset_response.status_code == 200
        print(f"✓ Password reset successful")
        
        # Try login with new password
        login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_email,
            "password": new_password
        })
        assert login_response.status_code == 200
        data = login_response.json()
        assert "token" in data
        assert "user" in data
        print(f"✓ Login successful with new password")
        
        # Old password should NOT work
        old_login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_email,
            "password": original_password
        })
        assert old_login_response.status_code == 401
        print(f"✓ Old password correctly rejected")
        
        # IMPORTANT: Restore original password for other tests
        restore_token = "restore-final-token"
        restore_hash = hashlib.sha256(restore_token.encode()).hexdigest()
        mongo_db.password_resets.insert_one({
            "id": "test-restore-final-id",
            "email": test_email,
            "token_hash": restore_hash,
            "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
            "used": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        restore_response = api_client.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": restore_token,
            "password": original_password
        })
        assert restore_response.status_code == 200
        
        # Verify restored password works
        final_login = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_email,
            "password": original_password
        })
        assert final_login.status_code == 200
        print(f"✓ Original password restored successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

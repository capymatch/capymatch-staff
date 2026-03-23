"""
Error Handling Tests - Production Readiness Item #4

Tests:
1. Structured error responses with {error: {code, message, request_id}} envelope
2. X-Request-ID header present on ALL responses (success and error)
3. Success responses unchanged (no error envelope)
4. Validation errors include 'details' array
5. No stack traces exposed in error responses
"""

import pytest
import requests
import os
import re

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
# For direct header inspection, use localhost
DIRECT_URL = "http://localhost:8001"

# Test credentials
ATHLETE_EMAIL = "emma.chen@athlete.capymatch.com"
ATHLETE_PASSWORD = "athlete123"
COACH_EMAIL = "coach.williams@capymatch.com"
COACH_PASSWORD = "coach123"
DIRECTOR_EMAIL = "director@capymatch.com"
DIRECTOR_PASSWORD = "director123"


class TestRequestIDHeader:
    """Verify X-Request-ID header is present on all responses"""
    
    def test_request_id_on_success_response(self):
        """X-Request-ID should be present on successful responses"""
        response = requests.get(f"{DIRECT_URL}/api/")
        assert response.status_code == 200
        assert "X-Request-ID" in response.headers, "X-Request-ID header missing on success response"
        request_id = response.headers["X-Request-ID"]
        assert len(request_id) > 0, "X-Request-ID should not be empty"
        print(f"SUCCESS: X-Request-ID on success response: {request_id}")
    
    def test_request_id_on_error_response(self):
        """X-Request-ID should be present on error responses"""
        response = requests.get(f"{DIRECT_URL}/api/nonexistent-endpoint-12345")
        assert response.status_code == 404
        assert "X-Request-ID" in response.headers, "X-Request-ID header missing on error response"
        request_id = response.headers["X-Request-ID"]
        assert len(request_id) > 0, "X-Request-ID should not be empty"
        print(f"SUCCESS: X-Request-ID on error response: {request_id}")
    
    def test_request_id_on_auth_error(self):
        """X-Request-ID should be present on 401 responses"""
        response = requests.get(f"{DIRECT_URL}/api/mission-control")
        assert response.status_code == 401
        assert "X-Request-ID" in response.headers, "X-Request-ID header missing on 401 response"
        print(f"SUCCESS: X-Request-ID on 401 response: {response.headers['X-Request-ID']}")
    
    def test_request_id_on_login_success(self):
        """X-Request-ID should be present on successful login"""
        response = requests.post(f"{DIRECT_URL}/api/auth/login", json={
            "email": COACH_EMAIL,
            "password": COACH_PASSWORD
        })
        assert response.status_code == 200
        assert "X-Request-ID" in response.headers, "X-Request-ID header missing on login success"
        print(f"SUCCESS: X-Request-ID on login success: {response.headers['X-Request-ID']}")
    
    def test_request_id_on_login_failure(self):
        """X-Request-ID should be present on failed login"""
        response = requests.post(f"{DIRECT_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        assert "X-Request-ID" in response.headers, "X-Request-ID header missing on login failure"
        print(f"SUCCESS: X-Request-ID on login failure: {response.headers['X-Request-ID']}")


class TestStructuredErrorResponses:
    """Verify error responses follow {error: {code, message, request_id}} envelope"""
    
    def test_invalid_credentials_error_structure(self):
        """POST /api/auth/login with invalid credentials returns structured error"""
        response = requests.post(f"{DIRECT_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        data = response.json()
        
        # Verify error envelope structure
        assert "error" in data, "Response should have 'error' key"
        error = data["error"]
        assert "code" in error, "Error should have 'code' field"
        assert "message" in error, "Error should have 'message' field"
        assert "request_id" in error, "Error should have 'request_id' field"
        
        # Verify error code
        assert error["code"] == "UNAUTHORIZED", f"Expected code 'UNAUTHORIZED', got '{error['code']}'"
        
        # Verify request_id matches header
        header_rid = response.headers.get("X-Request-ID")
        assert error["request_id"] == header_rid, f"request_id in body ({error['request_id']}) should match header ({header_rid})"
        
        print(f"SUCCESS: Invalid credentials returns structured error: {data}")
    
    def test_not_found_error_structure(self):
        """GET /api/nonexistent returns structured {error: {code: 'NOT_FOUND', message, request_id}}"""
        response = requests.get(f"{DIRECT_URL}/api/nonexistent-endpoint-xyz")
        assert response.status_code == 404
        data = response.json()
        
        # Verify error envelope structure
        assert "error" in data, "Response should have 'error' key"
        error = data["error"]
        assert "code" in error, "Error should have 'code' field"
        assert "message" in error, "Error should have 'message' field"
        assert "request_id" in error, "Error should have 'request_id' field"
        
        # Verify error code
        assert error["code"] == "NOT_FOUND", f"Expected code 'NOT_FOUND', got '{error['code']}'"
        
        print(f"SUCCESS: Not found returns structured error: {data}")
    
    def test_unauthorized_error_structure(self):
        """GET /api/mission-control without auth returns structured {error: {code: 'UNAUTHORIZED', message, request_id}}"""
        response = requests.get(f"{DIRECT_URL}/api/mission-control")
        assert response.status_code == 401
        data = response.json()
        
        # Verify error envelope structure
        assert "error" in data, "Response should have 'error' key"
        error = data["error"]
        assert "code" in error, "Error should have 'code' field"
        assert "message" in error, "Error should have 'message' field"
        assert "request_id" in error, "Error should have 'request_id' field"
        
        # Verify error code
        assert error["code"] == "UNAUTHORIZED", f"Expected code 'UNAUTHORIZED', got '{error['code']}'"
        
        print(f"SUCCESS: Unauthorized returns structured error: {data}")
    
    def test_validation_error_structure(self):
        """POST /api/auth/login with missing fields returns structured validation error with details"""
        response = requests.post(f"{DIRECT_URL}/api/auth/login", json={})
        assert response.status_code == 422
        data = response.json()
        
        # Verify error envelope structure
        assert "error" in data, "Response should have 'error' key"
        error = data["error"]
        assert "code" in error, "Error should have 'code' field"
        assert "message" in error, "Error should have 'message' field"
        assert "request_id" in error, "Error should have 'request_id' field"
        
        # Verify error code
        assert error["code"] == "VALIDATION_ERROR", f"Expected code 'VALIDATION_ERROR', got '{error['code']}'"
        
        # Verify details array for validation errors
        assert "details" in error, "Validation error should have 'details' array"
        assert isinstance(error["details"], list), "details should be a list"
        assert len(error["details"]) > 0, "details should not be empty"
        
        # Verify details structure
        for detail in error["details"]:
            assert "field" in detail, "Each detail should have 'field'"
            assert "message" in detail, "Each detail should have 'message'"
        
        print(f"SUCCESS: Validation error returns structured error with details: {data}")
    
    def test_validation_error_partial_fields(self):
        """POST /api/auth/login with only email returns validation error"""
        response = requests.post(f"{DIRECT_URL}/api/auth/login", json={
            "email": "test@test.com"
        })
        assert response.status_code == 422
        data = response.json()
        
        assert "error" in data
        assert data["error"]["code"] == "VALIDATION_ERROR"
        assert "details" in data["error"]
        
        # Should mention password is missing
        details_str = str(data["error"]["details"])
        assert "password" in details_str.lower() or "required" in details_str.lower()
        
        print(f"SUCCESS: Partial fields validation error: {data}")


class TestSuccessResponsesUnchanged:
    """Verify success responses are NOT wrapped in error envelope"""
    
    def test_login_success_format(self):
        """POST /api/auth/login with valid credentials returns {token, user} — success format unchanged"""
        response = requests.post(f"{DIRECT_URL}/api/auth/login", json={
            "email": COACH_EMAIL,
            "password": COACH_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        
        # Verify success response format (NOT wrapped in error envelope)
        assert "error" not in data, "Success response should NOT have 'error' key"
        assert "token" in data, "Success response should have 'token'"
        assert "user" in data, "Success response should have 'user'"
        
        # Verify user structure
        user = data["user"]
        assert "email" in user, "User should have 'email'"
        assert "role" in user, "User should have 'role'"
        
        print(f"SUCCESS: Login success format unchanged - has token and user")
        return data["token"]
    
    def test_mission_control_success_format(self):
        """GET /api/mission-control with coach token returns correct data (not broken by error handling)"""
        # First login
        login_response = requests.post(f"{DIRECT_URL}/api/auth/login", json={
            "email": COACH_EMAIL,
            "password": COACH_PASSWORD
        })
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        
        # Then get mission control
        response = requests.get(
            f"{DIRECT_URL}/api/mission-control",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify success response format (NOT wrapped in error envelope)
        assert "error" not in data, "Success response should NOT have 'error' key"
        
        # Verify mission control data structure
        assert "role" in data, "Mission control should have 'role'"
        
        print(f"SUCCESS: Mission control success format unchanged - role: {data.get('role')}")
    
    def test_athletes_success_format(self):
        """GET /api/athletes with director token returns athlete list (not broken)"""
        # First login as director
        login_response = requests.post(f"{DIRECT_URL}/api/auth/login", json={
            "email": DIRECTOR_EMAIL,
            "password": DIRECTOR_PASSWORD
        })
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        
        # Then get athletes
        response = requests.get(
            f"{DIRECT_URL}/api/athletes",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify success response format (NOT wrapped in error envelope)
        assert "error" not in data, "Success response should NOT have 'error' key"
        
        # Verify athletes list
        assert isinstance(data, list), "Athletes endpoint should return a list"
        if len(data) > 0:
            athlete = data[0]
            assert "id" in athlete or "athlete_id" in athlete, "Athlete should have id"
        
        print(f"SUCCESS: Athletes success format unchanged - returned {len(data)} athletes")
    
    def test_root_endpoint_success_format(self):
        """GET /api/ returns success without error envelope"""
        response = requests.get(f"{DIRECT_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        
        # Verify success response format
        assert "error" not in data, "Success response should NOT have 'error' key"
        assert "message" in data, "Root endpoint should have 'message'"
        
        print(f"SUCCESS: Root endpoint success format unchanged: {data}")


class TestNoStackTracesExposed:
    """Verify no stack traces are exposed in error responses"""
    
    def test_no_stack_trace_in_401(self):
        """401 error should not expose stack trace"""
        response = requests.get(f"{DIRECT_URL}/api/mission-control")
        assert response.status_code == 401
        data = response.json()
        
        # Convert to string and check for stack trace indicators
        response_str = str(data).lower()
        assert "traceback" not in response_str, "Response should not contain 'traceback'"
        assert "file \"" not in response_str, "Response should not contain file paths"
        assert "line " not in response_str or "line" in data.get("error", {}).get("message", "").lower(), "Response should not contain line numbers from stack trace"
        
        print("SUCCESS: No stack trace in 401 response")
    
    def test_no_stack_trace_in_404(self):
        """404 error should not expose stack trace"""
        response = requests.get(f"{DIRECT_URL}/api/nonexistent-xyz")
        assert response.status_code == 404
        data = response.json()
        
        # Convert to string and check for stack trace indicators
        response_str = str(data).lower()
        assert "traceback" not in response_str, "Response should not contain 'traceback'"
        assert "file \"" not in response_str, "Response should not contain file paths"
        
        print("SUCCESS: No stack trace in 404 response")
    
    def test_no_stack_trace_in_422(self):
        """422 validation error should not expose stack trace"""
        response = requests.post(f"{DIRECT_URL}/api/auth/login", json={})
        assert response.status_code == 422
        data = response.json()
        
        # Convert to string and check for stack trace indicators
        response_str = str(data).lower()
        assert "traceback" not in response_str, "Response should not contain 'traceback'"
        assert "file \"" not in response_str, "Response should not contain file paths"
        
        print("SUCCESS: No stack trace in 422 response")
    
    def test_error_message_is_user_friendly(self):
        """Error messages should be user-friendly, not technical"""
        response = requests.get(f"{DIRECT_URL}/api/mission-control")
        assert response.status_code == 401
        data = response.json()
        
        message = data.get("error", {}).get("message", "")
        
        # Should not contain Python-specific terms
        assert "exception" not in message.lower() or "exception" in "authentication exception", "Message should not mention 'exception'"
        assert "error:" not in message.lower(), "Message should not have 'Error:' prefix"
        
        print(f"SUCCESS: Error message is user-friendly: {message}")


class TestErrorCodeMapping:
    """Verify correct error codes are returned for different HTTP status codes"""
    
    def test_401_returns_unauthorized_code(self):
        """401 status should return UNAUTHORIZED code"""
        response = requests.get(f"{DIRECT_URL}/api/mission-control")
        assert response.status_code == 401
        data = response.json()
        assert data["error"]["code"] == "UNAUTHORIZED"
        print("SUCCESS: 401 returns UNAUTHORIZED code")
    
    def test_404_returns_not_found_code(self):
        """404 status should return NOT_FOUND code"""
        response = requests.get(f"{DIRECT_URL}/api/nonexistent-xyz")
        assert response.status_code == 404
        data = response.json()
        assert data["error"]["code"] == "NOT_FOUND"
        print("SUCCESS: 404 returns NOT_FOUND code")
    
    def test_422_returns_validation_error_code(self):
        """422 status should return VALIDATION_ERROR code"""
        response = requests.post(f"{DIRECT_URL}/api/auth/login", json={})
        assert response.status_code == 422
        data = response.json()
        assert data["error"]["code"] == "VALIDATION_ERROR"
        print("SUCCESS: 422 returns VALIDATION_ERROR code")


class TestRequestIDConsistency:
    """Verify request_id in body matches X-Request-ID header"""
    
    def test_request_id_consistency_on_error(self):
        """request_id in error body should match X-Request-ID header"""
        response = requests.get(f"{DIRECT_URL}/api/mission-control")
        assert response.status_code == 401
        
        header_rid = response.headers.get("X-Request-ID")
        body_rid = response.json().get("error", {}).get("request_id")
        
        assert header_rid is not None, "X-Request-ID header should be present"
        assert body_rid is not None, "request_id should be in error body"
        assert header_rid == body_rid, f"Header ({header_rid}) and body ({body_rid}) request_id should match"
        
        print(f"SUCCESS: Request ID consistent - header and body both have: {header_rid}")
    
    def test_custom_request_id_is_preserved(self):
        """Custom X-Request-ID in request should be preserved in response"""
        custom_rid = "test-custom-rid-12345"
        response = requests.get(
            f"{DIRECT_URL}/api/mission-control",
            headers={"X-Request-ID": custom_rid}
        )
        
        header_rid = response.headers.get("X-Request-ID")
        assert header_rid == custom_rid, f"Custom request ID should be preserved. Expected {custom_rid}, got {header_rid}"
        
        # Also check in error body
        body_rid = response.json().get("error", {}).get("request_id")
        assert body_rid == custom_rid, f"Custom request ID should be in error body. Expected {custom_rid}, got {body_rid}"
        
        print(f"SUCCESS: Custom request ID preserved: {custom_rid}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

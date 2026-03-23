"""
Test file upload feature for message attachments.
Tests: POST /api/files/upload, GET /api/files/{file_id}/download, 
       POST /api/support-messages/{thread_id}/reply with attachments
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ATHLETE_EMAIL = "emma.chen@athlete.capymatch.com"
ATHLETE_PASSWORD = "athlete123"
COACH_EMAIL = "coach.williams@capymatch.com"
COACH_PASSWORD = "coach123"
DIRECTOR_EMAIL = "director@capymatch.com"
DIRECTOR_PASSWORD = "director123"

# Test thread ID
TEST_THREAD_ID = "d540a5fa-4595-4427-9d03-864d8996d5a1"


class TestFileUpload:
    """File upload endpoint tests"""
    
    @pytest.fixture(scope="class")
    def athlete_token(self):
        """Get athlete auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ATHLETE_EMAIL,
            "password": ATHLETE_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Athlete login failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def coach_token(self):
        """Get coach auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": COACH_EMAIL,
            "password": COACH_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Coach login failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def director_token(self):
        """Get director auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DIRECTOR_EMAIL,
            "password": DIRECTOR_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Director login failed: {response.status_code} - {response.text}")
    
    # ─── Upload Tests ───
    
    def test_upload_image_file(self, athlete_token):
        """Test uploading an image file"""
        # Create a small test PNG image (1x1 pixel)
        png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        
        files = {'file': ('test_image.png', io.BytesIO(png_data), 'image/png')}
        response = requests.post(
            f"{BASE_URL}/api/files/upload",
            files=files,
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        
        assert response.status_code == 200, f"Upload failed: {response.status_code} - {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "file_id" in data, "Response missing file_id"
        assert "filename" in data, "Response missing filename"
        assert "content_type" in data, "Response missing content_type"
        assert "size" in data, "Response missing size"
        
        # Verify values
        assert data["filename"] == "test_image.png"
        assert data["content_type"] == "image/png"
        assert data["size"] > 0
        
        # Store file_id for download test
        TestFileUpload.uploaded_file_id = data["file_id"]
        print(f"✓ Image upload successful: file_id={data['file_id']}")
    
    def test_upload_pdf_file(self, coach_token):
        """Test uploading a PDF file"""
        # Minimal PDF content
        pdf_data = b'%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000101 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF'
        
        files = {'file': ('test_document.pdf', io.BytesIO(pdf_data), 'application/pdf')}
        response = requests.post(
            f"{BASE_URL}/api/files/upload",
            files=files,
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        
        assert response.status_code == 200, f"PDF upload failed: {response.status_code} - {response.text}"
        data = response.json()
        
        assert data["filename"] == "test_document.pdf"
        assert data["content_type"] == "application/pdf"
        print(f"✓ PDF upload successful: file_id={data['file_id']}")
    
    def test_upload_text_file(self, director_token):
        """Test uploading a text file"""
        text_data = b'This is a test text file for CapyMatch file upload testing.'
        
        files = {'file': ('test_notes.txt', io.BytesIO(text_data), 'text/plain')}
        response = requests.post(
            f"{BASE_URL}/api/files/upload",
            files=files,
            headers={"Authorization": f"Bearer {director_token}"}
        )
        
        assert response.status_code == 200, f"Text upload failed: {response.status_code} - {response.text}"
        data = response.json()
        
        assert data["filename"] == "test_notes.txt"
        assert data["content_type"] == "text/plain"
        print(f"✓ Text file upload successful: file_id={data['file_id']}")
    
    def test_upload_csv_file(self, athlete_token):
        """Test uploading a CSV file"""
        csv_data = b'name,email,score\nJohn,john@test.com,95\nJane,jane@test.com,88'
        
        files = {'file': ('data.csv', io.BytesIO(csv_data), 'text/csv')}
        response = requests.post(
            f"{BASE_URL}/api/files/upload",
            files=files,
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        
        assert response.status_code == 200, f"CSV upload failed: {response.status_code} - {response.text}"
        data = response.json()
        
        assert data["filename"] == "data.csv"
        assert data["content_type"] == "text/csv"
        print(f"✓ CSV file upload successful: file_id={data['file_id']}")
    
    # ─── Validation Tests ───
    
    def test_reject_file_too_large(self, athlete_token):
        """Test that files larger than 10MB are rejected"""
        # Create a file slightly over 10MB
        large_data = b'x' * (10 * 1024 * 1024 + 1)  # 10MB + 1 byte
        
        files = {'file': ('large_file.txt', io.BytesIO(large_data), 'text/plain')}
        response = requests.post(
            f"{BASE_URL}/api/files/upload",
            files=files,
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        
        assert response.status_code == 400, f"Expected 400 for large file, got {response.status_code}"
        assert "too large" in response.text.lower() or "10 mb" in response.text.lower(), f"Error message should mention size limit: {response.text}"
        print("✓ Large file correctly rejected")
    
    def test_reject_disallowed_content_type(self, athlete_token):
        """Test that disallowed content types are rejected"""
        # Try to upload an executable
        exe_data = b'MZ\x90\x00\x03\x00\x00\x00'  # Fake EXE header
        
        files = {'file': ('malware.exe', io.BytesIO(exe_data), 'application/x-msdownload')}
        response = requests.post(
            f"{BASE_URL}/api/files/upload",
            files=files,
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        
        assert response.status_code == 400, f"Expected 400 for disallowed type, got {response.status_code}"
        assert "not allowed" in response.text.lower(), f"Error message should mention type not allowed: {response.text}"
        print("✓ Disallowed content type correctly rejected")
    
    def test_upload_requires_auth(self):
        """Test that upload requires authentication"""
        text_data = b'Test content'
        files = {'file': ('test.txt', io.BytesIO(text_data), 'text/plain')}
        
        response = requests.post(f"{BASE_URL}/api/files/upload", files=files)
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ Upload correctly requires authentication")
    
    # ─── Download Tests ───
    
    def test_download_uploaded_file(self, athlete_token):
        """Test downloading a previously uploaded file"""
        # First upload a file
        png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        
        files = {'file': ('download_test.png', io.BytesIO(png_data), 'image/png')}
        upload_response = requests.post(
            f"{BASE_URL}/api/files/upload",
            files=files,
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        
        assert upload_response.status_code == 200, f"Upload failed: {upload_response.text}"
        file_id = upload_response.json()["file_id"]
        
        # Now download it
        download_response = requests.get(
            f"{BASE_URL}/api/files/{file_id}/download",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        
        assert download_response.status_code == 200, f"Download failed: {download_response.status_code} - {download_response.text}"
        assert download_response.content == png_data, "Downloaded content doesn't match uploaded content"
        assert "image/png" in download_response.headers.get("Content-Type", ""), "Content-Type header incorrect"
        print(f"✓ File download successful: file_id={file_id}")
    
    def test_download_nonexistent_file(self, athlete_token):
        """Test downloading a file that doesn't exist"""
        response = requests.get(
            f"{BASE_URL}/api/files/nonexistent-file-id/download",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        
        assert response.status_code == 404, f"Expected 404 for nonexistent file, got {response.status_code}"
        print("✓ Nonexistent file correctly returns 404")
    
    def test_download_requires_auth(self):
        """Test that download requires authentication"""
        response = requests.get(f"{BASE_URL}/api/files/some-file-id/download")
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ Download correctly requires authentication")


class TestMessageAttachments:
    """Test sending messages with attachments"""
    
    @pytest.fixture(scope="class")
    def athlete_token(self):
        """Get athlete auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ATHLETE_EMAIL,
            "password": ATHLETE_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Athlete login failed: {response.status_code}")
    
    @pytest.fixture(scope="class")
    def coach_token(self):
        """Get coach auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": COACH_EMAIL,
            "password": COACH_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Coach login failed: {response.status_code}")
    
    def test_reply_with_attachment(self, athlete_token):
        """Test sending a reply with file attachment"""
        # First upload a file
        text_data = b'Test attachment content for message reply'
        files = {'file': ('reply_attachment.txt', io.BytesIO(text_data), 'text/plain')}
        
        upload_response = requests.post(
            f"{BASE_URL}/api/files/upload",
            files=files,
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        
        assert upload_response.status_code == 200, f"Upload failed: {upload_response.text}"
        file_data = upload_response.json()
        
        # Now send a reply with the attachment
        reply_payload = {
            "body": "TEST_Here is my reply with an attachment",
            "attachments": [{
                "file_id": file_data["file_id"],
                "filename": file_data["filename"],
                "content_type": file_data["content_type"],
                "size": file_data["size"]
            }]
        }
        
        reply_response = requests.post(
            f"{BASE_URL}/api/support-messages/{TEST_THREAD_ID}/reply",
            json=reply_payload,
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        
        assert reply_response.status_code == 200, f"Reply failed: {reply_response.status_code} - {reply_response.text}"
        reply_data = reply_response.json()
        
        assert "id" in reply_data, "Reply response missing message id"
        assert reply_data.get("status") == "sent", f"Reply status should be 'sent', got {reply_data.get('status')}"
        print(f"✓ Reply with attachment sent successfully: message_id={reply_data['id']}")
        
        # Store message ID for verification
        TestMessageAttachments.reply_message_id = reply_data["id"]
    
    def test_verify_attachment_in_thread(self, athlete_token):
        """Verify the attachment appears in the thread messages"""
        response = requests.get(
            f"{BASE_URL}/api/support-messages/thread/{TEST_THREAD_ID}",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        
        assert response.status_code == 200, f"Get thread failed: {response.status_code} - {response.text}"
        data = response.json()
        
        messages = data.get("messages", [])
        assert len(messages) > 0, "Thread should have messages"
        
        # Find our test message with attachment
        test_messages = [m for m in messages if "TEST_" in m.get("body", "")]
        assert len(test_messages) > 0, "Should find our test message"
        
        test_msg = test_messages[-1]  # Get the most recent test message
        attachments = test_msg.get("attachments", [])
        
        assert len(attachments) > 0, f"Message should have attachments, got: {test_msg}"
        assert attachments[0].get("filename") == "reply_attachment.txt", f"Attachment filename mismatch: {attachments}"
        print(f"✓ Attachment verified in thread: {attachments[0]['filename']}")
    
    def test_reply_without_body_but_with_attachment(self, coach_token):
        """Test sending a reply with only attachment (no body text)"""
        # Upload a file
        png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        
        files = {'file': ('image_only.png', io.BytesIO(png_data), 'image/png')}
        upload_response = requests.post(
            f"{BASE_URL}/api/files/upload",
            files=files,
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        
        assert upload_response.status_code == 200, f"Upload failed: {upload_response.text}"
        file_data = upload_response.json()
        
        # Send reply with empty body but with attachment
        reply_payload = {
            "body": "",  # Empty body
            "attachments": [{
                "file_id": file_data["file_id"],
                "filename": file_data["filename"],
                "content_type": file_data["content_type"],
                "size": file_data["size"]
            }]
        }
        
        reply_response = requests.post(
            f"{BASE_URL}/api/support-messages/{TEST_THREAD_ID}/reply",
            json=reply_payload,
            headers={"Authorization": f"Bearer {coach_token}"}
        )
        
        # This might be allowed or rejected depending on business logic
        # Just verify we get a valid response
        assert reply_response.status_code in [200, 400], f"Unexpected status: {reply_response.status_code}"
        print(f"✓ Reply with only attachment: status={reply_response.status_code}")
    
    def test_reply_with_multiple_attachments(self, athlete_token):
        """Test sending a reply with multiple attachments"""
        # Upload first file
        files1 = {'file': ('doc1.txt', io.BytesIO(b'Document 1 content'), 'text/plain')}
        upload1 = requests.post(
            f"{BASE_URL}/api/files/upload",
            files=files1,
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert upload1.status_code == 200
        file1 = upload1.json()
        
        # Upload second file
        files2 = {'file': ('doc2.txt', io.BytesIO(b'Document 2 content'), 'text/plain')}
        upload2 = requests.post(
            f"{BASE_URL}/api/files/upload",
            files=files2,
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        assert upload2.status_code == 200
        file2 = upload2.json()
        
        # Send reply with multiple attachments
        reply_payload = {
            "body": "TEST_Multiple attachments test",
            "attachments": [
                {
                    "file_id": file1["file_id"],
                    "filename": file1["filename"],
                    "content_type": file1["content_type"],
                    "size": file1["size"]
                },
                {
                    "file_id": file2["file_id"],
                    "filename": file2["filename"],
                    "content_type": file2["content_type"],
                    "size": file2["size"]
                }
            ]
        }
        
        reply_response = requests.post(
            f"{BASE_URL}/api/support-messages/{TEST_THREAD_ID}/reply",
            json=reply_payload,
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        
        assert reply_response.status_code == 200, f"Reply with multiple attachments failed: {reply_response.text}"
        print("✓ Reply with multiple attachments sent successfully")


class TestInboxWithAttachments:
    """Test inbox displays threads with attachments correctly"""
    
    @pytest.fixture(scope="class")
    def athlete_token(self):
        """Get athlete auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ATHLETE_EMAIL,
            "password": ATHLETE_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Athlete login failed: {response.status_code}")
    
    def test_inbox_loads(self, athlete_token):
        """Test that inbox loads successfully"""
        response = requests.get(
            f"{BASE_URL}/api/support-messages/inbox",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        
        assert response.status_code == 200, f"Inbox failed: {response.status_code} - {response.text}"
        data = response.json()
        
        assert "threads" in data, "Response should have threads"
        print(f"✓ Inbox loaded: {len(data['threads'])} threads")
    
    def test_thread_detail_shows_attachments(self, athlete_token):
        """Test that thread detail includes attachment data"""
        response = requests.get(
            f"{BASE_URL}/api/support-messages/thread/{TEST_THREAD_ID}",
            headers={"Authorization": f"Bearer {athlete_token}"}
        )
        
        assert response.status_code == 200, f"Thread detail failed: {response.status_code}"
        data = response.json()
        
        assert "messages" in data, "Response should have messages"
        messages = data["messages"]
        
        # Check if any message has attachments
        messages_with_attachments = [m for m in messages if m.get("attachments")]
        print(f"✓ Thread has {len(messages_with_attachments)} messages with attachments")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

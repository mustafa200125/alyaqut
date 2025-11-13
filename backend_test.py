import requests
import sys
import json
from datetime import datetime

class RubyConnectAPITester:
    def __init__(self, base_url="https://social-ruby-app.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{status} - {name}: {details}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                details += f" (Expected: {expected_status})"
                try:
                    error_data = response.json()
                    details += f" - {error_data.get('detail', 'Unknown error')}"
                except:
                    details += f" - {response.text[:100]}"
            
            self.log_test(name, success, details)
            
            if success:
                try:
                    return response.json()
                except:
                    return {}
            return None

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return None

    def test_user_registration(self):
        """Test user registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        test_user = {
            "email": f"test_user_{timestamp}@example.com",
            "password": "TestPass123!",
            "username": f"testuser_{timestamp}"
        }
        
        response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=test_user
        )
        
        if response:
            self.test_email = test_user["email"]
            self.test_password = test_user["password"]
            self.verification_code = response.get("code")
            return True
        return False

    def test_email_verification(self):
        """Test email verification"""
        if not hasattr(self, 'verification_code'):
            self.log_test("Email Verification", False, "No verification code available")
            return False
            
        response = self.run_test(
            "Email Verification",
            "POST",
            "auth/verify-email",
            200,
            data={
                "email": self.test_email,
                "code": self.verification_code
            }
        )
        
        if response and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            return True
        return False

    def test_user_login(self):
        """Test user login"""
        response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={
                "email": self.test_email,
                "password": self.test_password
            }
        )
        
        if response and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            return True
        return False

    def test_get_current_user(self):
        """Test get current user"""
        response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return response is not None

    def test_create_post(self):
        """Test creating a post"""
        response = self.run_test(
            "Create Post",
            "POST",
            "posts",
            200,
            data={
                "content": "هذا منشور تجريبي من اختبار API",
                "image_url": None
            }
        )
        
        if response and 'id' in response:
            self.test_post_id = response['id']
            return True
        return False

    def test_get_posts(self):
        """Test getting posts"""
        response = self.run_test(
            "Get Posts",
            "GET",
            "posts",
            200
        )
        return response is not None

    def test_like_post(self):
        """Test liking a post"""
        if not hasattr(self, 'test_post_id'):
            self.log_test("Like Post", False, "No test post available")
            return False
            
        response = self.run_test(
            "Like Post",
            "POST",
            f"posts/{self.test_post_id}/like",
            200
        )
        return response is not None

    def test_unlike_post(self):
        """Test unliking a post"""
        if not hasattr(self, 'test_post_id'):
            self.log_test("Unlike Post", False, "No test post available")
            return False
            
        response = self.run_test(
            "Unlike Post",
            "DELETE",
            f"posts/{self.test_post_id}/like",
            200
        )
        return response is not None

    def test_add_comment(self):
        """Test adding a comment"""
        if not hasattr(self, 'test_post_id'):
            self.log_test("Add Comment", False, "No test post available")
            return False
            
        response = self.run_test(
            "Add Comment",
            "POST",
            f"posts/{self.test_post_id}/comments",
            200,
            data={"content": "تعليق تجريبي"}
        )
        
        if response and 'id' in response:
            self.test_comment_id = response['id']
            return True
        return False

    def test_get_comments(self):
        """Test getting comments"""
        if not hasattr(self, 'test_post_id'):
            self.log_test("Get Comments", False, "No test post available")
            return False
            
        response = self.run_test(
            "Get Comments",
            "GET",
            f"posts/{self.test_post_id}/comments",
            200
        )
        return response is not None

    def test_user_suggestions(self):
        """Test getting user suggestions"""
        response = self.run_test(
            "Get User Suggestions",
            "GET",
            "users/suggestions",
            200
        )
        return response is not None

    def test_ai_content_suggestions(self):
        """Test AI content suggestions"""
        response = self.run_test(
            "AI Content Suggestions",
            "POST",
            "ai/content-suggestions",
            200
        )
        return response is not None

    def test_ai_moderate_content(self):
        """Test AI content moderation"""
        response = self.run_test(
            "AI Content Moderation",
            "POST",
            "ai/moderate-content",
            200,
            data={"text": "هذا محتوى للاختبار"}
        )
        return response is not None

    def test_ai_generate_hashtags(self):
        """Test AI hashtag generation"""
        response = self.run_test(
            "AI Generate Hashtags",
            "POST",
            "ai/generate-hashtags",
            200,
            data={"text": "منشور عن التكنولوجيا والذكاء الاصطناعي"}
        )
        return response is not None

    def test_get_conversations(self):
        """Test getting conversations"""
        response = self.run_test(
            "Get Conversations",
            "GET",
            "messages/conversations",
            200
        )
        return response is not None

    def test_stories(self):
        """Test getting stories"""
        response = self.run_test(
            "Get Stories",
            "GET",
            "stories",
            200
        )
        return response is not None

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Ruby Connect API Tests...")
        print("=" * 50)
        
        # Authentication flow
        if not self.test_user_registration():
            print("❌ Registration failed, stopping tests")
            return False
            
        if not self.test_email_verification():
            print("❌ Email verification failed, stopping tests")
            return False
            
        # Test authenticated endpoints
        self.test_get_current_user()
        
        # Posts functionality
        self.test_create_post()
        self.test_get_posts()
        self.test_like_post()
        self.test_unlike_post()
        self.test_add_comment()
        self.test_get_comments()
        
        # User features
        self.test_user_suggestions()
        
        # AI features
        self.test_ai_content_suggestions()
        self.test_ai_moderate_content()
        self.test_ai_generate_hashtags()
        
        # Messages and stories
        self.test_get_conversations()
        self.test_stories()
        
        # Test login with existing user
        self.test_user_login()
        
        print("=" * 50)
        print(f"📊 Tests completed: {self.tests_passed}/{self.tests_run} passed")
        
        return self.tests_passed == self.tests_run

def main():
    tester = RubyConnectAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/test_reports/backend_test_results.json', 'w', encoding='utf-8') as f:
        json.dump({
            "summary": {
                "total_tests": tester.tests_run,
                "passed_tests": tester.tests_passed,
                "success_rate": f"{(tester.tests_passed/tester.tests_run*100):.1f}%" if tester.tests_run > 0 else "0%"
            },
            "results": tester.test_results
        }, f, ensure_ascii=False, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
#!/usr/bin/env python3
import requests
import json

def test_auth_issues():
    base_url = "https://social-ruby-app.preview.emergentagent.com"
    
    print("🔍 Debugging Authentication Issues...")
    print("=" * 50)
    
    # Test 1: Try to login with test1@test.com
    print("\n1. Testing login with test1@test.com...")
    try:
        response = requests.post(
            f"{base_url}/api/auth/login",
            json={"email": "test1@test.com", "password": "test123"},
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test 2: Try to register voicetest@test.com (should fail if exists)
    print("\n2. Testing registration of voicetest@test.com...")
    try:
        response = requests.post(
            f"{base_url}/api/auth/register",
            json={"email": "voicetest@test.com", "username": "voicetest", "password": "test123"},
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test 3: Try to register a completely new user
    print("\n3. Testing registration of new user...")
    try:
        response = requests.post(
            f"{base_url}/api/auth/register",
            json={"email": "newtest@test.com", "username": "newtest", "password": "test123"},
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            code = data.get('code')
            
            # Test verification
            print("\n4. Testing email verification...")
            verify_response = requests.post(
                f"{base_url}/api/auth/verify-email",
                json={"email": "newtest@test.com", "code": code},
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            print(f"Verify Status: {verify_response.status_code}")
            print(f"Verify Response: {verify_response.text}")
            
            if verify_response.status_code == 200:
                verify_data = verify_response.json()
                token = verify_data.get('access_token')
                user_id = verify_data['user']['id']
                
                # Test voice message
                print("\n5. Testing voice message API...")
                voice_response = requests.post(
                    f"{base_url}/api/messages",
                    json={
                        "receiver_id": user_id,  # Send to self for testing
                        "content": "رسالة صوتية اختبار",
                        "message_type": "audio",
                        "media_url": "data:audio/webm;base64,test",
                        "media_size": 1024
                    },
                    headers={
                        'Content-Type': 'application/json',
                        'Authorization': f'Bearer {token}'
                    },
                    timeout=30
                )
                print(f"Voice Message Status: {voice_response.status_code}")
                print(f"Voice Message Response: {voice_response.text}")
                
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_auth_issues()
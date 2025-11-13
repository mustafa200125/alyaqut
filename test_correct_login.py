#!/usr/bin/env python3
import requests
import json

def test_correct_login():
    base_url = "https://social-ruby-app.preview.emergentagent.com"
    
    print("🔐 Testing Login with Correct Existing User...")
    print("=" * 50)
    
    # Test login with the actual existing user
    print("Testing login with test1@alyaqoot.com...")
    try:
        response = requests.post(
            f"{base_url}/api/auth/login",
            json={"email": "test1@alyaqoot.com", "password": "test123"},
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            token = data.get('access_token')
            user_id = data['user']['id']
            
            print(f"\n✅ Login successful! User ID: {user_id}")
            
            # Test voice message with this user
            print("\nTesting voice message with authenticated user...")
            voice_response = requests.post(
                f"{base_url}/api/messages",
                json={
                    "receiver_id": user_id,  # Send to self
                    "content": "رسالة صوتية اختبار من المستخدم الموجود",
                    "message_type": "audio",
                    "media_url": "data:audio/webm;base64,test_audio_data",
                    "media_size": 2048
                },
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {token}'
                },
                timeout=30
            )
            print(f"Voice Message Status: {voice_response.status_code}")
            print(f"Voice Message Response: {voice_response.text}")
            
        else:
            print("❌ Login failed with existing user")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_correct_login()
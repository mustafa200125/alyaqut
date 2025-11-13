#!/usr/bin/env python3
import requests
import json

def test_password_variations():
    base_url = "https://social-ruby-app.preview.emergentagent.com"
    
    print("🔐 Testing Different Password Variations...")
    print("=" * 50)
    
    # Common passwords to try
    passwords = ["test123", "password", "123456", "alyaqoot123", "Test123!", "testpass"]
    
    for password in passwords:
        print(f"\nTrying password: {password}")
        try:
            response = requests.post(
                f"{base_url}/api/auth/login",
                json={"email": "test1@alyaqoot.com", "password": password},
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                print(f"✅ SUCCESS! Password '{password}' works!")
                data = response.json()
                print(f"User: {data['user']['username']}")
                return password
            else:
                print(f"❌ Failed: {response.json().get('detail', 'Unknown error')}")
                
        except Exception as e:
            print(f"Error: {e}")
    
    print("\n❌ None of the common passwords worked")
    return None

if __name__ == "__main__":
    test_password_variations()
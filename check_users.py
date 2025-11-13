#!/usr/bin/env python3
import requests
import json

def check_existing_users():
    base_url = "https://social-ruby-app.preview.emergentagent.com"
    
    print("👥 Checking Existing Users in Database...")
    print("=" * 50)
    
    # First, create a test user to get a token
    print("Creating test user to get authentication token...")
    try:
        reg_response = requests.post(
            f"{base_url}/api/auth/register",
            json={"email": "checkuser@test.com", "username": "checkuser", "password": "test123"},
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        if reg_response.status_code == 200:
            code = reg_response.json().get('code')
            
            verify_response = requests.post(
                f"{base_url}/api/auth/verify-email",
                json={"email": "checkuser@test.com", "code": code},
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            if verify_response.status_code == 200:
                token = verify_response.json().get('access_token')
                
                # Now get user suggestions to see what users exist
                print("\nGetting user suggestions to see existing users...")
                suggestions_response = requests.get(
                    f"{base_url}/api/users/suggestions",
                    headers={
                        'Content-Type': 'application/json',
                        'Authorization': f'Bearer {token}'
                    },
                    timeout=30
                )
                
                print(f"Suggestions Status: {suggestions_response.status_code}")
                if suggestions_response.status_code == 200:
                    users = suggestions_response.json()
                    print(f"Found {len(users)} users in suggestions:")
                    for user in users:
                        print(f"  - {user.get('email', 'N/A')} ({user.get('username', 'N/A')})")
                else:
                    print(f"Error getting suggestions: {suggestions_response.text}")
                    
        else:
            print(f"Registration failed: {reg_response.text}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_existing_users()
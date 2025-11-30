import requests
import sys

BASE_URL = "http://localhost:8096"

def test_endpoints():
    # 1. Login
    print("Logging in...")
    response = requests.post(f"{BASE_URL}/token", data={"username": "admin", "password": "admin123"})
    if response.status_code != 200:
        print(f"Login failed: {response.text}")
        return
    
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("Login successful.")

    # 2. Test Get Users (Control)
    print("\nTesting GET /users...")
    response = requests.get(f"{BASE_URL}/users", headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code != 200:
        print(f"Error: {response.text}")

    # 3. Test Get Git Config
    print("\nTesting GET /workflow/git/config...")
    response = requests.get(f"{BASE_URL}/workflow/git/config", headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")

    # 4. Test Get PRs
    print("\nTesting GET /workflow/prs...")
    response = requests.get(f"{BASE_URL}/workflow/prs", headers=headers)
    print(f"Status: {response.status_code}")
    prs = response.json()
    print(f"Found {len(prs)} PRs")

    # 5. Test Get Diff (if PRs exist)
    if prs:
        pr_id = prs[0]["_id"]
        print(f"\nTesting GET /workflow/prs/{pr_id}/diff...")
        response = requests.get(f"{BASE_URL}/workflow/prs/{pr_id}/diff", headers=headers)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")

if __name__ == "__main__":
    test_endpoints()

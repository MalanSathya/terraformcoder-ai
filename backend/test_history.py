import requests
import json

BASE_URL = "http://127.0.0.1:8000"
# Wait, let's test the production one since user is testing there
BASE_URL = "https://terraformcoder-ai-backend.vercel.app"

# 1. Login
login_data = {"email": "malan.tests123@gmail.com", "password": "password123", "name": "Test User"}
# User might have a different test user, or we can just register one
res = requests.post(f"{BASE_URL}/api/auth/register", json=login_data)
if res.status_code == 409:
    res = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)

if res.status_code != 200:
    print(f"Login failed: {res.text}")
    exit(1)

token = res.json()["access_token"]
print("Logged in successfully.")

# 2. Add a trace generation
gen_data = {
    "description": "Test gen",
    "provider": "aws",
    "include_diagram": False
}
headers = {"Authorization": f"Bearer {token}"}
print("Generating...")
# gen_res = requests.post(f"{BASE_URL}/api/generate", json=gen_data, headers=headers)
# if gen_res.status_code != 200:
#    print(f"Gen failed: {gen_res.text}")

print("Fetching history...")
hist_res = requests.get(f"{BASE_URL}/api/history", headers=headers)
print(f"Status: {hist_res.status_code}")
print(hist_res.text)

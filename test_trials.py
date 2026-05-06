import urllib.request
import json
import uuid

BASE_URL = "http://localhost"

def fetch(path, method="GET", body=None, headers=None):
    if headers is None: headers = {}
    if body is not None:
        body = json.dumps(body).encode('utf-8')
        headers['Content-Type'] = 'application/json'
        
    req = urllib.request.Request(f"{BASE_URL}{path}", data=body, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode('utf-8'))

def run_tests():
    print("=== Visual Honesty API Advanced Edge Case Tests ===")
    
    # 1. Initialize session 1
    print("\n1. Initializing new participant session...")
    status, session_id = fetch("/api/user", "POST", {"category": "human", "demographics": {"agreed_to_consent": True}})
    headers = {"X-Session-ID": session_id}
    print(f"Session ID: {session_id}")
    
    # 2. Get first trial (pair)
    print("\n2. Fetching first trial...")
    status, trial1 = fetch("/api/user/trial/next", "GET", headers=headers)
    trial1_id = trial1["trial_id"]
    left_id = trial1["left"]["id"]
    
    # 3. Test: Submit invalid Trial ID
    print("\n3. Testing edge case: Submitting invalid Trial ID (random UUID)...")
    status, res = fetch("/api/user/trial/submit", "POST", {
        "trialId": str(uuid.uuid4()),
        "frontendTime": 500,
        "choice": left_id
    }, headers)
    print(f"Response: {status} {res}")
    
    # 4. Test: Submit malformed Trial ID (not a UUID)
    print("\n4. Testing edge case: Submitting malformed Trial ID (not a UUID)...")
    status, res = fetch("/api/user/trial/submit", "POST", {
        "trialId": "not-a-uuid-string",
        "frontendTime": 500,
        "choice": left_id
    }, headers)
    print(f"Response: {status} {res}")
    
    # 5. Test: Submit choice that is a random UUID (not in pair)
    print("\n5. Testing edge case: Submitting random UUID choice for pair...")
    status, res = fetch("/api/user/trial/submit", "POST", {
        "trialId": trial1_id,
        "frontendTime": 500,
        "choice": str(uuid.uuid4())
    }, headers)
    print(f"Response: {status} {res}")
    
    # 6. Initialize second session to test cross-session poisoning
    print("\n6. Initializing second session (Attacker)...")
    status, attacker_session = fetch("/api/user", "POST", {"category": "human", "demographics": {"agreed_to_consent": True}})
    attacker_headers = {"X-Session-ID": attacker_session}
    
    # 7. Test: Attacker tries to submit for Session 1's trial
    print("\n7. Testing edge case: Submitting trial owned by another session...")
    status, res = fetch("/api/user/trial/submit", "POST", {
        "trialId": trial1_id,
        "frontendTime": 500,
        "choice": left_id
    }, attacker_headers)
    print(f"Response: {status} {res}")
    
    # 8. Test: Submit with missing frontendTime
    print("\n8. Testing edge case: Submitting missing frontendTime...")
    status, res = fetch("/api/user/trial/submit", "POST", {
        "trialId": trial1_id,
        "choice": left_id
    }, headers)
    print(f"Response: {status} {res}")

    # 9. Submit valid choice for pair
    print("\n9. Submitting valid pair choice...")
    status, res = fetch("/api/user/trial/submit", "POST", {
        "trialId": trial1_id,
        "frontendTime": 500,
        "choice": left_id
    }, headers)
    print(f"Response: {status} {res}")
    
    # 10. Test: Try to submit the same trial again
    print("\n10. Testing edge case: Submitting the same trial twice...")
    status, res = fetch("/api/user/trial/submit", "POST", {
        "trialId": trial1_id,
        "frontendTime": 500,
        "choice": left_id
    }, headers)
    print(f"Response: {status} {res}")
    
    # 11. Fetch next trial (Single)
    print("\n11. Fetching second trial...")
    status, trial2 = fetch("/api/user/trial/next", "GET", headers=headers)
    trial2_id = trial2["trial_id"]
    
    # 12. Test: Submit Timeout (null verdict) for Single
    print("\n12. Testing edge case: Timeout submission (null verdict)...")
    status, res = fetch("/api/user/trial/submit", "POST", {
        "trialId": trial2_id,
        "frontendTime": 60000,
        "verdict": None
    }, headers)
    print(f"Response: {status} {res}")

    print("\n=== Advanced Tests Complete ===")

if __name__ == "__main__":
    run_tests()

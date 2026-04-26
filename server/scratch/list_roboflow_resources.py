import requests
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))
API_KEY = os.getenv("ROBOFLOW_API_KEY")

print(f"Checking Roboflow API with key: {API_KEY[:4]}...")

# 1. Validate API Key and get workspace info from root
url = f"https://api.roboflow.com/?api_key={API_KEY}"
try:
    resp = requests.get(url)
    print(f"Root Status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        print(f"Key is valid! Response: {data}")
        workspace_id = data.get("workspace")
        print(f"Detected Workspace ID: {workspace_id}")
        
        if workspace_id:
            # 2. Check projects in this workspace
            p_url = f"https://api.roboflow.com/{workspace_id}?api_key={API_KEY}"
            p_resp = requests.get(p_url)
            if p_resp.status_code == 200:
                p_data = p_resp.json()
                projects = p_data.get("workspace", {}).get("projects", [])
                print(f"Found {len(projects)} projects:")
                for p in projects:
                    print(f"  * Project ID: {p.get('id')}, Type: {p.get('type')}")
            else:
                print(f"Error getting projects: {p_resp.text}")
    else:
        print(f"Error at root: {resp.text}")
except Exception as e:
    print(f"Error: {e}")

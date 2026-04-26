import requests
import base64
import os
from dotenv import load_dotenv

# Load from server/.env
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))
API_KEY = os.getenv("ROBOFLOW_API_KEY")
WORKSPACE = "muhammad-sheik-nauman"
WORKFLOW_ID = "general-segmentation-api-2"

# Use the URL and payload format from test_roboflow2.py which seemed more complete
url = f"https://detect.roboflow.com/infer/workflows/{WORKSPACE}/{WORKFLOW_ID}"

print(f"Testing URL: {url}")
print(f"API Key starts with: {API_KEY[:4]}..." if API_KEY else "API Key NOT FOUND")

# Local image path from user's workspace
img_path = r"C:\Users\DELL\Documents\freshway\server\data\train\not_fresh\not_fresh_0915.jpg"

if os.path.exists(img_path):
    with open(img_path, "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode("ascii")

    payload = {
        "api_key": API_KEY,
        "inputs": {
            "image": {"type": "base64", "value": encoded_string}
        }
    }
    
    try:
        response = requests.post(url, json=payload)
        print("STATUS:", response.status_code)
        print("RESPONSE:", response.text)
    except Exception as e:
        print(f"ERROR: {e}")
else:
    print(f"Image not found at {img_path}")

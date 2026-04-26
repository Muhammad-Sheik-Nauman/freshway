import requests
import base64
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))
API_KEY = os.getenv("ROBOFLOW_API_KEY")
WORKSPACE = "muhammad-sheik-nauman"
WORKFLOW_ID = "general-segmentation-api-2"

# Trying the infer.roboflow.com domain
url = f"https://infer.roboflow.com/workflows/{WORKSPACE}/{WORKFLOW_ID}"

print(f"Testing URL: {url}")

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

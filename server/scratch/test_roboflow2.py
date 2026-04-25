import requests
import base64
import os

API_KEY = "OVjHANz3a9pZBoK1Q7lV"
WORKSPACE = "muhammad-sheik-nauman"
WORKFLOW_ID = "general-segmentation-api-2"

url = f"https://detect.roboflow.com/infer/workflows/{WORKSPACE}/{WORKFLOW_ID}"

img_path = r"c:\Users\DELL\Desktop\freshness\Chanos Chanos - Fresh\IMG_20191002_062711.jpg"

if os.path.exists(img_path):
    with open(img_path, "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode("ascii")

    payload = {
        "api_key": API_KEY,
        "inputs": {
            "image": {
                "type": "base64",
                "value": encoded_string
            },
            "classes": ["fish_eye", "fish-eye-detection"]
        }
    }
    
    try:
        response = requests.post(url, json=payload)
        print("STATUS:", response.status_code)
        import json
        print("RESPONSE:", json.dumps(response.json(), indent=2))
    except Exception as e:
        print(e)
else:
    print("Could not find a local image to test with.")

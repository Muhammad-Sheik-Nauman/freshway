import requests
import base64

API_KEY = "OVjHANz3a9pZBoK1Q7lV"
WORKSPACE = "muhammad-sheik-nauman"
WORKFLOW_ID = "general-segmentation-api-2"
IMAGE_URL = "https://media.istockphoto.com/id/1149457223/photo/fresh-fish.jpg?s=612x612&w=0&k=20&c=L_jK_Yg21r9H5B96E8tH9B6HkM3Y2lQp1n1R2N7b3Yc=" # test image

url = f"https://detect.roboflow.com/roboflow-workflows/{WORKSPACE}/{WORKFLOW_ID}?api_key={API_KEY}"

# For a workflow, the payload is JSON with an 'image' key or 'inputs'
# Let's try the standard Inference API first to see if it works.
import urllib.request
urllib.request.urlretrieve(IMAGE_URL, "test_fish.jpg")

with open("test_fish.jpg", "rb") as image_file:
    encoded_string = base64.b64encode(image_file.read()).decode("ascii")

# Roboflow hosted workflows expect POST with JSON:
payload = {
    "image": {
        "type": "base64",
        "value": encoded_string
    }
}
try:
    response = requests.post(url, json=payload)
    print("STATUS:", response.status_code)
    print("RESPONSE:", response.json())
except Exception as e:
    print(e)

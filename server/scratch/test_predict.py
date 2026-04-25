import requests

url = 'http://localhost:5000/predict'
# Create a dummy image
with open('test.png', 'wb') as f:
    f.write(b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82')

files = {'image': open('test.png', 'rb')}
try:
    r = requests.post(url, files=files)
    print(r.status_code)
    print(r.json())
except Exception as e:
    print(f"Error: {e}")

"""
Backend API entry point for Fish Freshness Assessment System
- Exposes endpoints for image upload and prediction
- Calls inference pipeline and business logic
"""
from flask import Flask, request, jsonify
import os
from inference.predict import predict

app = Flask(__name__)

@app.route("/predict", methods=["POST"])
def predict_endpoint():
    # Handle image upload
    if 'image' not in request.files:
        return jsonify({"error": "No image uploaded"}), 400
    image = request.files['image']
    image_path = os.path.join("temp", image.filename)
    os.makedirs("temp", exist_ok=True)
    image.save(image_path)
    # Run prediction pipeline
    result = predict(image_path)
    os.remove(image_path)
    return jsonify(result)

if __name__ == "__main__":
    app.run(debug=True)

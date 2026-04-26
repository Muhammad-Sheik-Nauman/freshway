from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv

# Load environment variables first
load_dotenv()

from inference.predict import predict

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes


@app.route("/predict", methods=["POST"])
def predict_endpoint():
    print("[SERVER] Received /predict request")
    """
    Predict fish freshness from an uploaded image.

    Expects: multipart/form-data with an 'image' file field.
    Returns: JSON with freshness label, confidence, market route, etc.
    """
    # Validate image upload
    if "image" not in request.files:
        return jsonify({"error": "No image uploaded", "status": "error"}), 400

    image = request.files["image"]
    if image.filename == "":
        return jsonify({"error": "No file selected", "status": "error"}), 400

    # Save temporarily
    os.makedirs("temp", exist_ok=True)
    image_path = os.path.join("temp", image.filename)
    image.save(image_path)

    try:
        lat = float(request.form.get("lat")) if request.form.get("lat") else None
        lng = float(request.form.get("lng")) if request.form.get("lng") else None
        
        # Run the MobileNetV2 prediction pipeline
        result = predict(image_path, lat, lng)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e), "status": "error"}), 500
    finally:
        # Clean up temp file
        if os.path.exists(image_path):
            os.remove(image_path)


@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint."""
    return jsonify({"status": "ok", "message": "FreshWay API is running"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

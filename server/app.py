import os
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from inference.predict import predict

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

TEMP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp")
os.makedirs(TEMP_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def is_allowed_file(filename: str) -> bool:
    ext = os.path.splitext(filename)[1].lower()
    return ext in ALLOWED_EXTENSIONS


@app.route("/predict", methods=["POST"])
def predict_endpoint():
    """
    Predict fish freshness from an uploaded image.

    Expects: multipart/form-data with an 'image' file field.
    Returns: JSON with freshness label, confidence, market route, etc.
    """
    # Validate image upload
    if "image" not in request.files:
        return jsonify({"error": "No image uploaded", "status": "error"}), 400

    image = request.files["image"]
    if not image or image.filename == "":
        return jsonify({"error": "No file selected", "status": "error"}), 400

    # Sanitize and validate file extension (Resolves ISSUE-003)
    clean_name = secure_filename(image.filename)
    ext = os.path.splitext(clean_name)[1].lower() or ".jpg"

    if ext not in ALLOWED_EXTENSIONS:
        return jsonify({
            "error": f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
            "status": "error"
        }), 400

    # Generate collision-free unique temporary filename
    unique_filename = f"{uuid.uuid4().hex}{ext}"
    image_path = os.path.join(TEMP_DIR, unique_filename)

    try:
        image.save(image_path)

        # Run the MobileNetV2 prediction pipeline
        result = predict(image_path)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e), "status": "error"}), 500
    finally:
        # Clean up temp file safely
        if os.path.exists(image_path):
            try:
                os.remove(image_path)
            except OSError:
                pass


@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint."""
    return jsonify({
        "status": "ok",
        "service": "FreshWay API",
        "version": "2.5.0",
        "message": "FreshWay API is running",
    })


if __name__ == "__main__":
    app.run(port=5000, debug=True)

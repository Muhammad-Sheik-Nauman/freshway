"""
Two-stage inference pipeline:
1. Freshness Classification (Highly Fresh / Fresh / Not Fresh)
2. Confidence gating (reject uncertain predictions)
3. Market routing via business logic

Uses MobileNetV2 model trained on fish eye images.
"""

import os
import numpy as np
import tensorflow as tf
from inference.preprocess import preprocess_for_inference, CLASS_NAMES, LABEL_MAP
from business_logic.routing import route_market

# Optional image quality validation
try:
    from utils.image_utils import validate_image_quality
except ImportError:
    validate_image_quality = None

# ─── CONFIG ──────────────────────────────────────────────────────────────────
CONFIDENCE_THRESHOLD = 0.60  # Minimum confidence to accept a prediction
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(os.path.dirname(BASE_DIR), "models")

# ─── MODEL LOADING ───────────────────────────────────────────────────────────
_model = None


def _load_model():
    """Load the trained MobileNetV2 model (lazy loading, cached)."""
    global _model
    if _model is not None:
        return _model

    # Production model: validated EXP-006 checkpoint.
    model_paths = [
    os.path.join(
        MODEL_DIR,
        "experiments",
        "exp006_v25_mobilenetv2",
        "freshness_exp006_best.keras",
    ),
]

    for path in model_paths:
        if os.path.exists(path):
            print(f"🔄 Loading model from: {path}")
            _model = tf.keras.models.load_model(path)
            print(f"✅ Model loaded successfully!")
            return _model

    raise FileNotFoundError(
        f"No trained model found! Expected one of:\n"
        + "\n".join(f"  - {p}" for p in model_paths)
        + "\n\nRun `python training/train_freshness_classifier.py` first."
    )


def predict(image_path: str) -> dict:
    """
    Run freshness prediction on a fish eye image.

    Args:
        image_path: Path to the uploaded image file.

    Returns:
        dict with keys:
            - freshness: Human-readable freshness label ("Highly Fresh", "Fresh", "Not Fresh", "Uncertain")
            - confidence: Prediction confidence as percentage (0.0 to 100.0)
            - status: "success" or "uncertain" or "error"
            - message: Human-readable description of the result
            - market_route: Suggested supply-chain market destination
            - all_scores: Confidence percentage for each class { "Fresh": float, ... }
            - warnings: Optional list of image quality warnings (e.g. glare, blur)
    """
    try:
        # 1. Image quality inspection (glare, blur)
        quality_warnings = []
        if validate_image_quality is not None:
            try:
                quality_res = validate_image_quality(image_path)
                quality_warnings = quality_res.get("warnings", [])
            except Exception:
                pass

        # 2. Load model
        model = _load_model()

        # 3. Preprocess image with direct 224x224 nearest-neighbor resize
        processed_img = preprocess_for_inference(image_path)

        # 4. Run prediction
        predictions = model.predict(processed_img, verbose=0)
        predicted_class_idx = np.argmax(predictions[0])
        confidence = float(predictions[0][predicted_class_idx])
        predicted_class = CLASS_NAMES[predicted_class_idx]
        freshness_label = LABEL_MAP[predicted_class]

        # 5. Build all scores dict (percentage 0 - 100)
        all_scores = {
            LABEL_MAP[CLASS_NAMES[i]]: round(float(predictions[0][i]) * 100, 1)
            for i in range(len(CLASS_NAMES))
        }

        # 6. Confidence gating (< 60% threshold)
        if confidence < CONFIDENCE_THRESHOLD:
            msg = f"Low confidence ({confidence*100:.1f}%). Please retake the photo with better lighting and focus on the fish eye."
            if quality_warnings:
                msg += f" (Note: {'; '.join(quality_warnings)})"

            return {
                "freshness": "Uncertain",
                "confidence": round(confidence * 100, 1),
                "status": "uncertain",
                "message": msg,
                "market_route": route_market("Uncertain"),
                "all_scores": all_scores,
                "warnings": quality_warnings,
            }

        # 7. Route to market
        market = route_market(freshness_label)

        return {
            "freshness": freshness_label,
            "confidence": round(confidence * 100, 1),
            "status": "success",
            "message": f"Fish eye analyzed: {freshness_label} with {confidence*100:.1f}% confidence.",
            "market_route": market,
            "all_scores": all_scores,
            "warnings": quality_warnings,
        }

    except FileNotFoundError as e:
        return {
            "freshness": None,
            "confidence": 0,
            "status": "error",
            "message": str(e),
            "warnings": [],
        }
    except Exception as e:
        return {
            "freshness": None,
            "confidence": 0,
            "status": "error",
            "message": f"Prediction failed: {str(e)}",
            "warnings": [],
        }

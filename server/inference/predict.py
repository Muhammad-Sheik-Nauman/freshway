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

    # Try best model first, then final model
    model_paths = [
        os.path.join(MODEL_DIR, "freshness_model_best.keras"),
        os.path.join(MODEL_DIR, "freshness_model_final.keras"),
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
            - freshness: Human-readable freshness label
            - confidence: Prediction confidence (0-1)
            - status: "success" or "uncertain"
            - message: Description of the result
            - market_route: Suggested market destination
            - all_scores: Confidence for each class
    """
    try:
        # 1. Load model
        model = _load_model()

        # 2. Preprocess image
        processed_img = preprocess_for_inference(image_path)

        # 3. Run prediction
        predictions = model.predict(processed_img, verbose=0)
        predicted_class_idx = np.argmax(predictions[0])
        confidence = float(predictions[0][predicted_class_idx])
        predicted_class = CLASS_NAMES[predicted_class_idx]
        freshness_label = LABEL_MAP[predicted_class]

        # 4. Build all scores dict
        all_scores = {
            LABEL_MAP[CLASS_NAMES[i]]: round(float(predictions[0][i]) * 100, 1)
            for i in range(len(CLASS_NAMES))
        }

        # 5. Confidence gating
        if confidence < CONFIDENCE_THRESHOLD:
            return {
                "freshness": "Uncertain",
                "confidence": round(confidence * 100, 1),
                "status": "uncertain",
                "message": f"Low confidence ({confidence*100:.1f}%). Please retake the photo with better lighting and focus on the fish eye.",
                "market_route": route_market("Uncertain"),
                "all_scores": all_scores,
            }

        # 6. Route to market
        market = route_market(freshness_label)

        return {
            "freshness": freshness_label,
            "confidence": round(confidence * 100, 1),
            "status": "success",
            "message": f"Fish eye analyzed: {freshness_label} with {confidence*100:.1f}% confidence.",
            "market_route": market,
            "all_scores": all_scores,
        }

    except FileNotFoundError as e:
        return {
            "freshness": None,
            "confidence": 0,
            "status": "error",
            "message": str(e),
        }
    except Exception as e:
        return {
            "freshness": None,
            "confidence": 0,
            "status": "error",
            "message": f"Prediction failed: {str(e)}",
        }

"""
Two-stage inference pipeline with Multi-Crop Averaging (ITA).
1. Freshness Classification (Highly Fresh / Fresh / Not Fresh)
2. Multi-Crop Ensemble (Averages 4 different views of the eye)
3. Confidence gating & Market routing
"""

import os
import numpy as np
import tensorflow as tf
import requests
import base64
import cv2
from dotenv import load_dotenv
from inference.expert_rules import analyze_expert_rules
from inference.preprocess import preprocess_for_inference, LABEL_MAP
from business_logic.routing import get_ice_recommendation, get_recommended_buyers, get_buyer_suggestion

# ─── CONFIG ──────────────────────────────────────────────────────────────────
CONFIDENCE_THRESHOLD = 0.40 
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(os.path.dirname(BASE_DIR), "models")

# --- ROBOFLOW CONFIG ---
load_dotenv(os.path.join(os.path.dirname(BASE_DIR), ".env"))
RF_API_KEY = os.getenv("ROBOFLOW_API_KEY")
RF_WORKSPACE = "muhammads-workspace-8ffqe"
RF_WORKFLOW_ID = "general-segmentation-api-2"
RF_URL = f"https://detect.roboflow.com/infer/workflows/{RF_WORKSPACE}/{RF_WORKFLOW_ID}"

# ─── MODEL LOADING ───────────────────────────────────────────────────────────
_model = None

def _load_model():
    """Load the trained MobileNetV2 model."""
    global _model
    if _model is not None:
        return _model
    model_paths = [
        os.path.join(MODEL_DIR, "freshness_model_best.keras"),
        os.path.join(MODEL_DIR, "freshness_model_final.keras"),
    ]
    for path in model_paths:
        if os.path.exists(path):
            _model = tf.keras.models.load_model(path)
            return _model
    raise FileNotFoundError(f"No trained model found!")

def _get_roboflow_box(image_path: str):
    """Sends image to Roboflow and returns the bounding box [x, y, w, h]."""
    try:
        if not RF_API_KEY:
            print("[ROBOFLOW] CRITICAL ERROR: API Key is None! Check your .env file.")
            return None

        with open(image_path, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode("ascii")

        # Try multiple URL patterns and payloads
        scenarios = [
            # Scenario 1: infer/workflows with inputs (New Workflows API)
            {
                "url": f"https://detect.roboflow.com/infer/workflows/{RF_WORKSPACE}/{RF_WORKFLOW_ID}",
                "payload": {
                    "api_key": RF_API_KEY,
                    "inputs": {
                        "image": {"type": "base64", "value": encoded_string},
                        "classes": ["fish_eye"]
                    }
                }
            },
            # Scenario 2: roboflow-workflows (Legacy/Alternative Workflows API)
            {
                "url": f"https://detect.roboflow.com/roboflow-workflows/{RF_WORKSPACE}/{RF_WORKFLOW_ID}?api_key={RF_API_KEY}",
                "payload": {
                    "image": {"type": "base64", "value": encoded_string}
                }
            }
        ]

        for i, scene in enumerate(scenarios):
            print(f"[ROBOFLOW] Attempting Scenario {i+1}: {scene['url']}")
            try:
                resp = requests.post(scene['url'], json=scene['payload'], timeout=12)
                print(f"[ROBOFLOW] Scenario {i+1} Status: {resp.status_code}")
                
                if resp.status_code == 200:
                    data = resp.json()
                    outputs = data.get("outputs", [])
                    # Handle different response formats
                    preds = []
                    if outputs and isinstance(outputs, list):
                        # Format: {"outputs": [{"step_name": {"predictions": [...]}}]}
                        for step in outputs[0].values():
                            if isinstance(step, dict) and "predictions" in step:
                                preds.extend(step["predictions"])
                    elif "predictions" in data:
                        # Format: {"predictions": [...]}
                        preds = data["predictions"]

                    if preds:
                        print(f"[ROBOFLOW] Found {len(preds)} total predictions.")
                        for p in preds:
                            conf = p.get("confidence", 0)
                            cls = p.get("class")
                            print(f"[ROBOFLOW] DETECTED: {cls} (conf: {conf:.2f})")
                            
                            # Match fish_eye or similar classes
                            if cls in ["fish_eye", "fish-eye", "eye"] and conf > 0.3:
                                points = p.get("points", [])
                                if points:
                                    xs = [pt["x"] for pt in points]
                                    ys = [pt["y"] for pt in points]
                                    min_x, max_x = int(min(xs)), int(max(xs))
                                    min_y, max_y = int(min(ys)), int(max(ys))
                                    print(f"[ROBOFLOW] SUCCESS: Box found at {[min_x, min_y, max_x-min_x, max_y-min_y]}")
                                    return [min_x, min_y, max_x - min_x, max_y - min_y]
                                elif "x" in p and "y" in p:
                                    # Handle bbox format [x_center, y_center, width, height]
                                    cx, cy, cw, ch = p["x"], p["y"], p["width"], p["height"]
                                    return [int(cx - cw/2), int(cy - ch/2), int(cw), int(ch)]
                else:
                    print(f"[ROBOFLOW] Scenario {i+1} Failed: {resp.text[:200]}")
            except Exception as e:
                print(f"[ROBOFLOW] Scenario {i+1} Error: {e}")

    except Exception as e:
        print(f"[ROBOFLOW] General Error: {e}")
    return None

def predict(image_path: str, lat: float = None, lng: float = None) -> dict:
    """Run prediction with Multi-Crop Averaging for superior accuracy."""
    try:
        # STEP 1: Get anchor box from Roboflow
        box = _get_roboflow_box(image_path)
        if not box:
            return {
                "freshness": "Invalid Image", "confidence": 0, "status": "error",
                "message": "No fish eye detected! Please ensure the eye is clear and centered.",
            }

        img = cv2.imread(image_path)
        if img is None: raise Exception("Failed to read image")
        H, W = img.shape[:2]
        x, y, w, h = box

        # STEP 2: Generate 4 unique crops (Multi-View Ensemble)
        # 1. Standard (10% padding)
        # 2. Tight (No padding)
        # 3. Wide (25% padding)
        # 4. Shifted (Shifted slightly down-right to catch iris edges)
        crop_configs = [
            (0.1, 0.1, 0, 0),    # Standard
            (0.0, 0.0, 0, 0),    # Tight
            (0.25, 0.25, 0, 0),  # Wide
            (0.1, 0.1, 5, 5),    # Shifted
        ]

        all_crop_probs = []
        # category_reasons will now store lists of reasons per category
        # 0: Highly Fresh, 1: Fresh, 2: Not Fresh
        category_reasons = {0: [], 1: [], 2: []}
        annotated_b64 = None

        for i, (px, py, sx, sy) in enumerate(crop_configs):
            pad_x, pad_y = int(w * px), int(h * py)
            shift_x, shift_y = int(w * sx / 100), int(h * sy / 100)

            x1, y1 = max(0, x - pad_x + shift_x), max(0, y - pad_y + shift_y)
            x2, y2 = min(W, x + w + pad_x + shift_x), min(H, y + h + pad_y + shift_y)
            
            crop = img[y1:y2, x1:x2]
            crop_temp_path = f"{image_path}_crop_{i}.jpg"
            cv2.imwrite(crop_temp_path, crop)

            # Analyze this specific crop
            model = _load_model()
            processed_img = preprocess_for_inference(crop_temp_path)
            ai_preds = model.predict(processed_img, verbose=0)[0]
            
            # Now returns (probs, cat_reasons_dict)
            expert_probs, expert_cat_reasons = analyze_expert_rules(crop_temp_path)
            for cat, res_list in expert_cat_reasons.items():
                category_reasons[cat].extend(res_list)
            
            # Map AI to [highly, fresh, not]
            ai_reordered = np.array([ai_preds[1], ai_preds[0], ai_preds[2]])
            # Hybrid for this crop (30% AI, 70% Expert)
            crop_probs = (ai_reordered * 0.3) + (np.array(expert_probs) * 0.7)
            all_crop_probs.append(crop_probs)

            # Capture first crop for annotation
            if i == 0:
                annot_img = img.copy()
                cv2.rectangle(annot_img, (x1, y1), (x2, y2), (0, 255, 0), 4)
                _, buffer = cv2.imencode('.jpg', annot_img)
                annotated_b64 = f"data:image/jpeg;base64,{base64.b64encode(buffer).decode('utf-8')}"

            if os.path.exists(crop_temp_path): os.remove(crop_temp_path)

        # STEP 3: Average the Jury's Vote
        combined_probs = np.mean(all_crop_probs, axis=0)
        
        predicted_class_idx = np.argmax(combined_probs)
        confidence = float(combined_probs[predicted_class_idx])
        raw_label = LABEL_MAP[["highly_fresh", "fresh", "not_fresh"][predicted_class_idx]]

        all_scores = {
            LABEL_MAP[c]: round(float(combined_probs[i]) * 100, 1)
            for i, c in enumerate(["highly_fresh", "fresh", "not_fresh"])
        }

        # STEP 4: Smart Result Generation
        final_freshness = raw_label
        final_status = "success"
        
        # Filter reasons to match the final classification
        # Only show reasons that support the final category to avoid confusion
        main_reasons = list(set(category_reasons[predicted_class_idx]))
        
        # If no reasons for the winning category, use a generic description
        if not main_reasons:
            if predicted_class_idx == 0: main_reasons = ["Highly clear and reflective eye surface."]
            elif predicted_class_idx == 1: main_reasons = ["Generally clear cornea with normal moisture."]
            else: main_reasons = ["Significant signs of deterioration detected."]
            
        # Format the reasons into a natural sentence
        if len(main_reasons) > 1:
            reasons_sentence = ", ".join(main_reasons[:-1]) + ", and " + main_reasons[-1]
        else:
            reasons_sentence = main_reasons[0]

        # Make it lowercase for sentence flow if it's not a proper noun
        if reasons_sentence[0].isupper() and not reasons_sentence[:5].isupper():
            reasons_sentence = reasons_sentence[0].lower() + reasons_sentence[1:]

        final_message = f"Ensemble analysis complete ({len(crop_configs)} views). This fish has {reasons_sentence}."
        
        if confidence < CONFIDENCE_THRESHOLD:
            final_freshness = f"Likely {raw_label}"
            final_status = "uncertain"
            final_message = f"Likely {raw_label} ({confidence*100:.0f}% ensemble confidence). Analysis shows {reasons_sentence}."

        return {
            "freshness": final_freshness,
            "confidence": float(confidence),
            "status": final_status,
            "message": final_message,
            "analysis_reasons": main_reasons,
            "ice_recommendation": get_ice_recommendation(raw_label),
            "recommended_buyers": get_recommended_buyers(raw_label, lat, lng),
            "buyer_suggestion": get_buyer_suggestion(raw_label),
            "all_scores": all_scores,
            "annotated_image": annotated_b64,
        }

    except Exception as e:
        return {
            "freshness": None, "confidence": 0, "status": "error",
            "message": f"Ensemble prediction failed: {str(e)}",
        }

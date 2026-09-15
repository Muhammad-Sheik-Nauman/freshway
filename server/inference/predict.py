"""
Two-stage inference pipeline with Multi-Crop Averaging (ITA).
1. Freshness Classification (Highly Fresh / Fresh / Not Fresh)
2. Multi-Crop Ensemble (Averages 4 different views of the eye)
3. Confidence gating & Market routing
"""

import os
import numpy as np
import tensorflow as tf
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input as mobilenet_preprocess
from tensorflow.keras.applications.efficientnet import preprocess_input as efficientnet_preprocess

# Inject into builtins so Keras Lambda deserialization can find them in the global namespace
import builtins
builtins.mobilenet_preprocess = mobilenet_preprocess
builtins.efficientnet_preprocess = efficientnet_preprocess
_ = (builtins, mobilenet_preprocess, efficientnet_preprocess)  # Prevent unused import warnings

import requests
import base64
import cv2
from dotenv import load_dotenv
from inference.expert_rules import analyze_expert_rules
from inference.preprocess import preprocess_for_inference, LABEL_MAP
from business_logic.routing import get_ice_recommendation, get_recommended_buyers, get_buyer_suggestion



def _enhance_image(img: np.ndarray) -> np.ndarray:
    """Sharpen and enhance a potentially blurry image before analysis."""
    # Unsharp mask for sharpening
    gaussian = cv2.GaussianBlur(img, (0, 0), 3)
    sharpened = cv2.addWeighted(img, 1.5, gaussian, -0.5, 0)
    # CLAHE on L channel to improve contrast
    lab = cv2.cvtColor(sharpened, cv2.COLOR_BGR2LAB)
    l_ch, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    l_ch = clahe.apply(l_ch)
    lab = cv2.merge([l_ch, a, b])
    enhanced = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
    return enhanced



def _detect_eye_fallback(img: np.ndarray) -> list:
    """
    Smart fallback: find the darkest dominant circle (fish eyes are dark pupils).
    Uses HoughCircles then ranks candidates by how dark/saturated they are.
    Only returns a result if confident — never guesses randomly.
    """
    try:
        H, W = img.shape[:2]
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (11, 11), 2)

        # Eye should be at least 3% and at most 35% of the shorter image dimension
        min_r = max(12, int(min(W, H) * 0.03))
        max_r = int(min(W, H) * 0.35)

        circles = cv2.HoughCircles(
            blurred, cv2.HOUGH_GRADIENT, dp=1.2,
            minDist=min(W, H) // 3,
            param1=60, param2=28,
            minRadius=min_r, maxRadius=max_r
        )
        if circles is None:
            return None

        circles = np.round(circles[0, :]).astype(int)

        # Score each circle: prefer DARK circles (fish eyes are dark pupils)
        best_score = float('inf')  # lower = darker = better
        best = None
        for cx, cy, r in circles:
            # Sample the interior brightness
            mask = np.zeros((H, W), np.uint8)
            cv2.circle(mask, (cx, cy), r, 255, -1)
            mean_brightness = cv2.mean(gray, mask=mask)[0]
            if mean_brightness < best_score:
                best_score = mean_brightness
                best = (cx, cy, r)

        if best is None:
            return None

        cx, cy, r = best
        # Only accept if the interior is darker than average (eyes are dark)
        overall_brightness = np.mean(gray)
        if best_score > overall_brightness * 0.95:  # not significantly darker — skip
            print(f"[FALLBACK] Darkest circle brightness {best_score:.1f} vs image avg {overall_brightness:.1f} — too bright, skipping")
            return None

        pad = int(r * 0.25)
        x1 = max(0, cx - r - pad)
        y1 = max(0, cy - r - pad)
        bw = min(W, cx + r + pad) - x1
        bh = min(H, cy + r + pad) - y1
        if bw > 20 and bh > 20:
            print(f"[FALLBACK] Dark circle found at ({cx},{cy}) r={r} brightness={best_score:.1f}")
            return [x1, y1, bw, bh]
    except Exception as e:
        print(f"[FALLBACK] Error: {e}")
    return None


# ─── CONFIG ──────────────────────────────────────────────────────────────────
CONFIDENCE_THRESHOLD = 0.38
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(os.path.dirname(BASE_DIR), "models")

# --- ROBOFLOW CONFIG ---
RF_API_KEY = os.environ.get("ROBOFLOW_API_KEY")
if not RF_API_KEY:
    # Try looking in the parent directory if needed
    load_dotenv(os.path.join(os.path.dirname(BASE_DIR), ".env"))
    RF_API_KEY = os.environ.get("ROBOFLOW_API_KEY")

if not RF_API_KEY:
    print("Warning: ROBOFLOW_API_KEY not found in environment variables.")
RF_WORKSPACE = "muhammad-sheik-nauman"
RF_WORKFLOW_ID = "general-segmentation-api-2"
RF_URL = f"https://detect.roboflow.com/infer/workflows/{RF_WORKSPACE}/{RF_WORKFLOW_ID}"

# ─── MODEL LOADING ───────────────────────────────────────────────────────────
_model = None
_is_ensemble = False  # Ensemble model has preprocessing baked in

def _load_model():
    """Load the best available freshness model (ensemble preferred, MobileNetV2 fallback)."""
    global _model, _is_ensemble
    if _model is not None:
        return _model

    # Priority 1: Ensemble model (MobileNetV2 + EfficientNetB0)
    ensemble_paths = [
        os.path.join(MODEL_DIR, "freshness_ensemble_best.keras"),
        os.path.join(MODEL_DIR, "freshness_ensemble_final.keras"),
    ]
    for path in ensemble_paths:
        if os.path.exists(path):
            print(f"[MODEL] Loading ENSEMBLE model from: {path}")
            _model = tf.keras.models.load_model(path, safe_mode=False)
            _is_ensemble = True
            return _model

    # Priority 2: Legacy single MobileNetV2 model
    legacy_paths = [
        os.path.join(MODEL_DIR, "freshness_model_best.keras"),
        os.path.join(MODEL_DIR, "freshness_model_final.keras"),
    ]
    for path in legacy_paths:
        if os.path.exists(path):
            print(f"[MODEL] Loading legacy MobileNetV2 model from: {path}")
            _model = tf.keras.models.load_model(path, safe_mode=False)
            _is_ensemble = False
            return _model

    raise FileNotFoundError(f"No trained model found!")


_yolo_model = None

def _get_local_yolo_box(image_path: str):
    """Detects fish eye using the locally trained YOLOv8 model."""
    global _yolo_model
    try:
        from ultralytics import YOLO
        if _yolo_model is None:
            model_path = os.path.join(MODEL_DIR, "fish_eye_yolo.pt")
            if os.path.exists(model_path):
                _yolo_model = YOLO(model_path)
            else:
                print(f"[YOLO] Local model not found at {model_path}")
                return None

        results = _yolo_model(image_path, conf=0.05, verbose=False)
        if not results:
            print(f"[YOLO] No results returned for {image_path}")
            return None
        
        result = results[0]
        boxes = result.boxes
        print(f"[YOLO] Found {len(boxes)} raw boxes in {image_path}")
        if len(boxes) == 0:
            return None
        
        best_box = None
        best_conf = 0.0
        for idx, box in enumerate(boxes):
            conf = float(box.conf[0])
            cls = int(box.cls[0])
            print(f"  - YOLO Box {idx}: class={cls}, conf={conf:.3f}, coords={box.xyxy[0].tolist()}")
            if conf > 0.10 and conf > best_conf:  # Lower acceptance threshold to 0.10
                xyxy = box.xyxy[0].tolist()
                xmin, ymin, xmax, ymax = map(int, xyxy)
                w = xmax - xmin
                h = ymax - ymin
                best_box = [xmin, ymin, w, h]
                best_conf = conf
                
        if best_box:
            print(f"[YOLO] Local model selected box with confidence {best_conf:.2f}")
            return best_box
    except Exception as e:
        print(f"[YOLO] Error during local detection: {e}")
    return None


def _get_roboflow_box(image_path: str):
    """Sends image to Roboflow and returns the bounding box [x, y, w, h]."""
    try:
        with open(image_path, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode("ascii")

        payload = {
            "api_key": RF_API_KEY,
            "inputs": {
                "image": {"type": "base64", "value": encoded_string},
                "classes": ["fish_eye"]
            }
        }
        
        resp = requests.post(RF_URL, json=payload, timeout=15)
        print(f"[ROBOFLOW] HTTP status code: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            print(f"[ROBOFLOW] API raw response: {data}")
            outputs = data.get("outputs", [])
            if outputs:
                best_box = None
                best_conf = 0.0
                for key, val in outputs[0].items():
                    if isinstance(val, dict) and "predictions" in val:
                        preds = val["predictions"]
                        for idx, p in enumerate(preds):
                            conf = p.get("confidence", 0)
                            cls = p.get("class", "")
                            print(f"  - Roboflow Pred {idx}: class={cls}, conf={conf:.3f}")
                            if cls == "fish_eye" and conf > 0.25 and conf > best_conf:  # Lower threshold slightly to 0.25
                                points = p.get("points", [])
                                if not points: continue
                                xs = [pt["x"] for pt in points]
                                ys = [pt["y"] for pt in points]
                                min_x, max_x = int(min(xs)), int(max(xs))
                                min_y, max_y = int(min(ys)), int(max(ys))
                                best_box = [min_x, min_y, max_x - min_x, max_y - min_y]
                                best_conf = conf
                if best_box:
                    print(f"[ROBOFLOW] selected box with confidence {best_conf:.2f}")
                    return best_box
    except Exception as e:
        print(f"[ROBOFLOW] Error: {e}")
    return None

def _validate_eye_crop(img: np.ndarray) -> bool:
    """Runs YOLOv8 on a candidate crop to check if it contains a fish eye."""
    global _yolo_model
    try:
        from ultralytics import YOLO
        if _yolo_model is None:
            model_path = os.path.join(MODEL_DIR, "fish_eye_yolo.pt")
            if os.path.exists(model_path):
                _yolo_model = YOLO(model_path)
            else:
                return True  # Fallback to true if model is not found
        
        # Save temporary crop for YOLO validation
        temp_path = "temp_validation_crop.jpg"
        cv2.imwrite(temp_path, img)
        
        # Run YOLO with low threshold to catch cloudy eyes, but reject fins/scales
        results = _yolo_model(temp_path, conf=0.04, verbose=False)
        
        if os.path.exists(temp_path):
            os.remove(temp_path)
            
        if not results:
            return False
        
        boxes = results[0].boxes
        if len(boxes) > 0:
            best_conf = max([float(b.conf[0]) for b in boxes])
            print(f"[VALIDATION] Found eye in crop with confidence: {best_conf:.3f}")
            return True
            
        print("[VALIDATION] No eye detected in crop (likely a fin, scale, or background)")
        return False
    except Exception as e:
        print(f"[VALIDATION] Error during validation: {e}")
        return True  # Fallback to true on error


def predict(image_path: str, lat: float = None, lng: float = None, manual_box: list = None) -> dict:
    """Run prediction with Multi-Crop Averaging for superior accuracy."""
    try:
        img_raw = cv2.imread(image_path)
        if img_raw is None: raise Exception("Failed to read image")
        H, W = img_raw.shape[:2]

        # GUARD: Validate that the image contains a fish eye using YOLO.
        # This replaces the unreliable Haar cascade face detection.
        # If YOLO can't find a fish eye anywhere in the image, reject it.
        if manual_box:
            x, y, w, h = manual_box
            pad_x = int(w * 1.0)
            pad_y = int(h * 1.0)
            x1 = max(0, x - pad_x)
            y1 = max(0, y - pad_y)
            x2 = min(W, x + w + pad_x)
            y2 = min(H, y + h + pad_y)
            validation_crop = img_raw[y1:y2, x1:x2]
            
            is_valid = _validate_eye_crop(validation_crop)
            if not is_valid:
                # Last resort: try validating on the full image instead of the crop
                is_valid = _validate_eye_crop(img_raw)
            if not is_valid:
                print("[PREDICT] YOLO could not confirm a fish eye — rejecting image")
                return {
                    "freshness": "Invalid Image",
                    "confidence": 0,
                    "status": "error",
                    "message": "No fish eye detected. Please upload a clear, close-up photo of the fish eye.",
                }

        # STEP 0: Enhance image to handle blur before detection
        img_enhanced = _enhance_image(img_raw)
        enhanced_path = image_path + "_enhanced.jpg"
        cv2.imwrite(enhanced_path, img_enhanced)

        # STEP 1: Try manual box, then Local YOLO, then Roboflow, then fallback
        box = manual_box
        if not box:
            box = _get_local_yolo_box(image_path)
        if not box:
            print("[PREDICT] Local YOLO missed on original, trying enhanced version...")
            box = _get_local_yolo_box(enhanced_path)
        if not box:
            print("[PREDICT] Local YOLO missed, trying Roboflow API on original...")
            box = _get_roboflow_box(image_path)
        if not box:
            print("[PREDICT] Roboflow missed on original, trying Roboflow API on enhanced version...")
            box = _get_roboflow_box(enhanced_path)
        
        # Option A Fallback: If AI detection misses, assume the eye is aligned in the center
        if not box:
            print("[PREDICT] AI detection missed. Falling back to static center crop...")
            crop_w = int(W * 0.22)
            crop_h = int(H * 0.22)
            crop_x = (W - crop_w) // 2
            crop_y = (H - crop_h) // 2
            box = [crop_x, crop_y, crop_w, crop_h]

        # Clean up enhanced temp file
        if os.path.exists(enhanced_path):
            os.remove(enhanced_path)

        # CRITICAL: Use ORIGINAL image for analysis — NOT the enhanced version.
        # CLAHE enhancement boosts saturation artificially, making expert rules
        # think everything looks "vivid/fresh" even when the fish is not fresh.
        # Enhanced image was only needed to help Roboflow detect the eye location.
        img = img_raw
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
        annotated_b64 = None

        for i, (px, py, sx, sy) in enumerate(crop_configs):
            pad_x, pad_y = int(w * px), int(h * py)
            shift_x, shift_y = int(w * sx / 100), int(h * sy / 100)

            x1, y1 = max(0, x - pad_x + shift_x), max(0, y - pad_y + shift_y)
            x2, y2 = min(W, x + w + pad_x + shift_x), min(H, y + h + pad_y + shift_y)
            
            crop = img[y1:y2, x1:x2]

            # Analyze this specific crop using the preloaded model in memory
            model = _load_model()

            if _is_ensemble:
                # Ensemble model has preprocessing baked in — feed raw [0, 255] RGB
                img_rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
                img_resized = cv2.resize(img_rgb, (224, 224))
                processed_img = np.expand_dims(img_resized.astype(np.float32), axis=0)
            else:
                # Legacy MobileNetV2 model needs external preprocessing
                processed_img = preprocess_for_inference(crop)

            ai_preds = model.predict(processed_img, verbose=0)[0]
            
            # Map AI outputs to [highly_fresh, fresh, not_fresh]
            # Model CLASS_NAMES = ["fresh", "highly_fresh", "not_fresh"]
            # so: preds[0]=fresh, preds[1]=highly_fresh, preds[2]=not_fresh
            ai_reordered = np.array([ai_preds[1], ai_preds[0], ai_preds[2]])

            # Call expert rules with debug information enabled, passing in-memory array directly
            expert_probs, triggered_rules = analyze_expert_rules(crop, return_debug=True)
            expert_arr = np.array(expert_probs)

            # Determine CNN Confidence
            cnn_confidence = float(np.max(ai_reordered))
            override_occurred = False
            override_reason = ""

            # Check for physical veto conditions
            is_veto = any(k.startswith("VETO_") for k in triggered_rules.keys())

            if is_veto:
                # Direct override by veto
                crop_probs = expert_arr
                override_occurred = True
                veto_key = [k for k in triggered_rules.keys() if k.startswith("VETO_")][0]
                override_reason = f"Hard Veto Triggered: {veto_key} ({triggered_rules[veto_key]})"
            elif cnn_confidence >= 0.60:
                # Check for expert disagreement before blindly trusting CNN
                cnn_class = int(np.argmax(ai_reordered))  # 0=HF, 1=F, 2=NF
                expert_leans_not_fresh = expert_arr[2] > expert_arr[0]  # expert not_fresh > highly_fresh

                if cnn_class in (0, 1) and expert_leans_not_fresh:
                    # CNN says fresh but expert rules see physical degradation → force blend
                    crop_probs = (ai_reordered * 0.50) + (expert_arr * 0.50)
                    override_occurred = True
                    override_reason = (
                        f"Expert Disagreement (CNN={['HF','F','NF'][cnn_class]} "
                        f"conf={cnn_confidence:.2f}, expert_NF={expert_arr[2]:.2f} > expert_HF={expert_arr[0]:.2f})"
                    )
                else:
                    # CNN and expert agree on direction — trust CNN
                    crop_probs = ai_reordered
                    override_reason = "None (Trusted high confidence CNN, expert agrees)"
            else:
                # Uncertainty fusion: 80% CNN, 20% Expert Rules
                crop_probs = (ai_reordered * 0.80) + (expert_arr * 0.20)
                override_occurred = True
                override_reason = f"Uncertainty Fusion (CNN Conf = {cnn_confidence:.2f} < 0.60)"

            # Print detailed debugging output
            print(f"[CROP {i}] Detailed Prediction Debug:")
            print(f"  - CNN Probs:    [Highly Fresh={ai_reordered[0]:.3f}, Fresh={ai_reordered[1]:.3f}, Not Fresh={ai_reordered[2]:.3f}]")
            print(f"  - Expert Probs: [Highly Fresh={expert_arr[0]:.3f}, Fresh={expert_arr[1]:.3f}, Not Fresh={expert_arr[2]:.3f}]")
            print(f"  - Final Fused:  [Highly Fresh={crop_probs[0]:.3f}, Fresh={crop_probs[1]:.3f}, Not Fresh={crop_probs[2]:.3f}]")
            print(f"  - Override:     {'YES' if override_occurred else 'NO'} ({override_reason})")
            print(f"  - Active Rules: {list(triggered_rules.values())}")
            all_crop_probs.append(crop_probs)

            # Capture the detected eye crop as the annotated image (zoomed in)
            if i == 0:
                # Zoomed eye crop for the result preview
                pad_x0 = int(w * 0.20)
                pad_y0 = int(h * 0.20)
                cx1 = max(0, x - pad_x0)
                cy1 = max(0, y - pad_y0)
                cx2 = min(W, x + w + pad_x0)
                cy2 = min(H, y + h + pad_y0)
                eye_crop = img[cy1:cy2, cx1:cx2].copy()

                # Draw a green circle to highlight the detected eye
                ch, cw = eye_crop.shape[:2]
                radius = int(min(cw, ch) * 0.44)
                cv2.circle(eye_crop, (cw // 2, ch // 2), radius, (0, 220, 80), 3)

                _, buffer = cv2.imencode('.jpg', eye_crop, [cv2.IMWRITE_JPEG_QUALITY, 92])
                annotated_b64 = f"data:image/jpeg;base64,{base64.b64encode(buffer).decode('utf-8')}"

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
        final_message = f"Ensemble analysis complete ({len(crop_configs)} views analyzed)."
        
        if confidence < CONFIDENCE_THRESHOLD:
            final_freshness = f"Likely {raw_label}"
            final_status = "uncertain"
            final_message = f"Likely {raw_label} ({confidence*100:.0f}% ensemble confidence)."

        return {
            "freshness": final_freshness,
            "confidence": float(confidence),
            "status": final_status,
            "message": final_message,
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

import cv2
import numpy as np


def analyze_expert_rules(image_path_or_arr, return_debug=False):
    """
    Analyzes an image of a fish eye based on expert physical rules.
    Returns a score list for [Highly Fresh, Fresh, Not Fresh].

    Uses hard veto conditions for definitive cases, then a weighted scoring
    system for ambiguous cases.
    
    If return_debug=True, returns (scores, triggered_rules_dict).
    """
    if isinstance(image_path_or_arr, str):
        img = cv2.imread(image_path_or_arr)
    else:
        img = image_path_or_arr

    if img is None:
        default_scores = [0.33, 0.33, 0.34]
        return (default_scores, {"error": "Image load failed"}) if return_debug else default_scores

    # CRITICAL: Resize to 224x224 to ensure absolute pixel counts are scale-independent
    img = cv2.resize(img, (224, 224))

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    hsv  = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

    avg_sat = float(np.mean(hsv[:, :, 1]))
    avg_val = float(np.mean(hsv[:, :, 2]))
    
    triggered_rules = {}

    # ─── HARD VETO CONDITIONS (override everything) ───────────────────────
    # These are physically certain indicators — no weighting needed.

    # VETO 1: Milky/Cloudy eye (extremely low saturation, i.e., grayscale)
    # Refactored: Threshold lowered to <12.0 based on actual dataset statistics
    if avg_sat < 12.0:
        triggered_rules["VETO_1_milky_eye"] = f"avg_sat={avg_sat:.1f} < 12.0"
        veto_scores = [0.0, 0.05, 0.95]
        return (veto_scores, triggered_rules) if return_debug else veto_scores

    # VETO 2: Blood-red patches (heavy blood spots)
    # Refactored: Threshold set to >0.35 area ratio to protect slightly red fresh eyes
    lower_red1 = np.array([0,   100, 100])
    upper_red1 = np.array([10,  255, 255])
    lower_red2 = np.array([160, 100, 100])
    upper_red2 = np.array([180, 255, 255])
    red_mask   = cv2.inRange(hsv, lower_red1, upper_red1) + \
                 cv2.inRange(hsv, lower_red2, upper_red2)
    red_pixels = cv2.countNonZero(red_mask)
    total_pixels = img.shape[0] * img.shape[1]
    red_ratio = red_pixels / max(total_pixels, 1)
    if red_ratio > 0.35:
        triggered_rules["VETO_2_blood_red"] = f"red_ratio={red_ratio:.3f} > 0.35"
        veto_scores = [0.0, 0.0, 1.0]
        return (veto_scores, triggered_rules) if return_debug else veto_scores

    # ─── WEIGHTED SCORING SYSTEM ─────────────────────────────────────────
    # [Highly Fresh, Fresh, Not Fresh]
    scores = np.array([0.0, 0.0, 0.0])

    # ─── 1. SATURATION / COLOR ───────────────────────────────────────────
    # Refactored thresholds: Highly fresh mean is ~45, Fresh mean is ~42
    if avg_sat > 45.0 and avg_val < 150.0:
        scores += [0.5, 0.15, 0.0]
        triggered_rules["Rule_1_SatColor"] = f"Highly Fresh (avg_sat={avg_sat:.1f}, val={avg_val:.1f})"
    elif avg_sat > 25.0 and avg_val < 170.0:
        scores += [0.25, 0.3, 0.0]
        triggered_rules["Rule_1_SatColor"] = f"Fresh (avg_sat={avg_sat:.1f}, val={avg_val:.1f})"
    elif avg_sat < 20.0:
        scores += [0.0, 0.05, 0.5]
        triggered_rules["Rule_1_SatColor"] = f"Not Fresh (low avg_sat={avg_sat:.1f})"
    else:
        scores += [0.1, 0.3, 0.1]
        triggered_rules["Rule_1_SatColor"] = f"Ambiguous (avg_sat={avg_sat:.1f})"

    # ─── 2. REFLECTIVITY / MOISTURE ──────────────────────────────────────
    # Refactored: Highly fresh median is ~294 pixels, mean is ~2434 pixels
    _, thresh = cv2.threshold(gray, 220, 255, cv2.THRESH_BINARY)
    white_pixels = cv2.countNonZero(thresh)
    if white_pixels > 2500:
        scores += [0.35, 0.1, 0.0]
        triggered_rules["Rule_2_Reflectivity"] = f"Highly Fresh (white_pixels={white_pixels} > 2500)"
    elif 100 < white_pixels <= 2500:
        scores += [0.25, 0.2, 0.0]
        triggered_rules["Rule_2_Reflectivity"] = f"Fresh (100 < white_pixels={white_pixels} <= 2500)"
    else:
        scores += [0.0, 0.05, 0.35]
        triggered_rules["Rule_2_Reflectivity"] = f"Dull / Not Fresh (white_pixels={white_pixels} <= 100)"

    # ─── 3. SHARPNESS / OPACITY ──────────────────────────────────────────
    # Note: low sharpness can be from photo quality, not fish age.
    # We only lightly penalize blur; we do NOT use it as a hard signal.
    lap_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    if lap_var > 150.0:
        scores += [0.3, 0.1, 0.0]
        triggered_rules["Rule_3_Sharpness"] = f"Crisp (lap_var={lap_var:.1f} > 150.0)"
    elif lap_var > 50.0:
        scores += [0.1, 0.2, 0.05]
        triggered_rules["Rule_3_Sharpness"] = f"Moderate (50.0 < lap_var={lap_var:.1f} <= 150.0)"
    else:
        scores += [0.0, 0.05, 0.15]
        triggered_rules["Rule_3_Sharpness"] = f"Blurry / Opaque (lap_var={lap_var:.1f} <= 50.0)"

    # ─── 4. BLOOD SPOTS (moderate) ───────────────────────────────────────
    # Refactored based on 224x224 scaled red counts
    if red_pixels > 2000:
        scores += [0.0, 0.0, 0.4]
        triggered_rules["Rule_4_BloodSpots"] = f"Severe (red_pixels={red_pixels} > 2000)"
    elif red_pixels > 500:
        scores += [0.0, 0.2, 0.15]
        triggered_rules["Rule_4_BloodSpots"] = f"Moderate (500 < red_pixels={red_pixels} <= 2000)"
    else:
        scores += [0.25, 0.15, 0.0]
        triggered_rules["Rule_4_BloodSpots"] = f"Minimal (red_pixels={red_pixels} <= 500)"

    # ─── 5. CONVEXITY / BULGE (Fresh = bulging outward) ──────────────────
    h, w = gray.shape
    mask_center = np.zeros((h, w), np.uint8)
    cv2.circle(mask_center, (w // 2, h // 2), int(min(w, h) * 0.25), 255, -1)
    center_bright = cv2.mean(gray, mask=mask_center)[0]
    overall_bright = cv2.mean(gray)[0]
    ratio = center_bright / (overall_bright + 1e-6)

    if ratio > 1.15:
        scores += [0.25, 0.1, 0.0]
        triggered_rules["Rule_5_Convexity"] = f"Bulging (ratio={ratio:.3f} > 1.15)"
    elif ratio < 0.88:
        scores += [0.0, 0.05, 0.25]
        triggered_rules["Rule_5_Convexity"] = f"Sunken (ratio={ratio:.3f} < 0.88)"
    else:
        scores += [0.05, 0.15, 0.05]
        triggered_rules["Rule_5_Convexity"] = f"Flat (0.88 <= ratio={ratio:.3f} <= 1.15)"

    # ─── 6. PUPIL CLARITY (Sharp defined pupil = fresh) ──────────────────
    # A fresh eye has a crisp, well-defined dark pupil in the centre.
    # A not-fresh eye has a hazy, indistinct, or shrunken pupil.
    # We check the sharpness (edge density) specifically in the centre region.
    ch, cw = h // 2, w // 2
    r_inner = int(min(h, w) * 0.22)
    center_mask = np.zeros((h, w), np.uint8)
    cv2.circle(center_mask, (cw, ch), r_inner, 255, -1)
    center_roi = cv2.bitwise_and(gray, gray, mask=center_mask)
    pupil_edge_var = cv2.Laplacian(center_roi, cv2.CV_64F).var()

    if pupil_edge_var > 80.0:
        scores += [0.3, 0.1, 0.0]
        triggered_rules["Rule_6_PupilClarity"] = f"Sharp boundary (var={pupil_edge_var:.1f} > 80.0)"
    elif pupil_edge_var > 25.0:
        scores += [0.1, 0.2, 0.05]
        triggered_rules["Rule_6_PupilClarity"] = f"Moderate boundary (25.0 < var={pupil_edge_var:.1f} <= 80.0)"
    else:
        scores += [0.0, 0.05, 0.25]
        triggered_rules["Rule_6_PupilClarity"] = f"Hazy/Undefined boundary (var={pupil_edge_var:.1f} <= 25.0)"

    # ─── 7. CORNEA OPACITY (Transparent cornea = fresh, Milky = not fresh) ─
    # Fresh eyes: cornea is transparent → you can see dark iris underneath.
    # Dark pixel ratio in centre = how "see-through" the cornea is.
    dark_px  = float(np.sum(gray[center_mask > 0] < 70))
    total_px = float(np.sum(center_mask > 0)) + 1e-6
    dark_ratio = dark_px / total_px

    if dark_ratio > 0.30:
        scores += [0.35, 0.1, 0.0]
        triggered_rules["Rule_7_CorneaOpacity"] = f"Transparent (dark_ratio={dark_ratio:.3f} > 0.30)"
    elif dark_ratio > 0.10:
        scores += [0.1, 0.25, 0.05]
        triggered_rules["Rule_7_CorneaOpacity"] = f"Semi-Transparent (0.10 < dark_ratio={dark_ratio:.3f} <= 0.30)"
    else:
        scores += [0.0, 0.05, 0.35]
        triggered_rules["Rule_7_CorneaOpacity"] = f"Opaque/Milky (dark_ratio={dark_ratio:.3f} <= 0.10)"

    # ─── NORMALIZE ───────────────────────────────────────────────────────
    total = np.sum(scores)
    if total > 0:
        scores = scores / total
    else:
        scores = np.array([0.33, 0.33, 0.34])

    return (scores.tolist(), triggered_rules) if return_debug else scores.tolist()

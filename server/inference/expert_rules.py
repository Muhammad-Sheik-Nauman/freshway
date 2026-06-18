import cv2
import numpy as np


def analyze_expert_rules(image_path):
    """
    Analyzes an image of a fish eye based on expert physical rules.
    Returns a score list for [Highly Fresh, Fresh, Not Fresh].

    Uses hard veto conditions for definitive cases, then a weighted scoring
    system for ambiguous cases.
    """
    img = cv2.imread(image_path)
    if img is None:
        return [0.33, 0.33, 0.34]  # Default neutral

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    hsv  = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

    avg_sat = float(np.mean(hsv[:, :, 1]))
    avg_val = float(np.mean(hsv[:, :, 2]))

    # ─── HARD VETO CONDITIONS (override everything) ───────────────────────
    # These are physically certain indicators — no weighting needed.

    # VETO 1: Milky/Cloudy eye (very low saturation) → definitively Not Fresh
    # A truly fresh eye has a dark, saturated pupil. avg_sat < 25 means
    # the image is almost completely grey/white — that's a cloudy, dead eye.
    if avg_sat < 25:
        return [0.0, 0.05, 0.95]

    # VETO 2: Blood-red patches (heavy blood spots) → definitively Not Fresh
    lower_red1 = np.array([0,   100, 100])
    upper_red1 = np.array([10,  255, 255])
    lower_red2 = np.array([160, 100, 100])
    upper_red2 = np.array([180, 255, 255])
    red_mask   = cv2.inRange(hsv, lower_red1, upper_red1) + \
                 cv2.inRange(hsv, lower_red2, upper_red2)
    red_pixels = cv2.countNonZero(red_mask)
    total_pixels = img.shape[0] * img.shape[1]
    red_ratio = red_pixels / max(total_pixels, 1)
    if red_ratio > 0.15:   # >15% of eye is red — major blood spots
        return [0.0, 0.0, 1.0]

    # ─── WEIGHTED SCORING SYSTEM ─────────────────────────────────────────
    # [Highly Fresh, Fresh, Not Fresh]
    scores = np.array([0.0, 0.0, 0.0])

    # ─── 1. SATURATION / COLOR ───────────────────────────────────────────
    # Fresh eye: deep dark (high sat, low-mid val)
    # Not fresh: grey/yellow/washed out (low sat, mid val)
    if avg_sat > 100 and avg_val < 120:
        scores += [0.5, 0.15, 0.0]    # Deep dark — very fresh
    elif avg_sat > 70 and avg_val < 160:
        scores += [0.25, 0.3, 0.0]    # Moderately dark — fresh
    elif avg_sat < 45 and 40 < avg_val < 200:
        scores += [0.0, 0.05, 0.5]    # Washed out grey — not fresh
    elif avg_sat < 65 and avg_val > 150:
        scores += [0.0, 0.1, 0.4]     # Bright and desaturated — not fresh
    else:
        scores += [0.1, 0.3, 0.1]     # Ambiguous

    # ─── 2. REFLECTIVITY / MOISTURE ──────────────────────────────────────
    # Moist fresh eyes have bright specular highlights (small, sharp)
    # Cloudy/milky eyes have large white/opaque patches (large, diffuse)
    _, thresh = cv2.threshold(gray, 220, 255, cv2.THRESH_BINARY)
    white_pixels = cv2.countNonZero(thresh)
    if 15 < white_pixels <= 300:
        scores += [0.35, 0.1, 0.0]    # Clear bright reflection (fresh)
    elif white_pixels > 300:
        scores += [0.0, 0.0, 0.5]     # Large white cloudy/milky area (not fresh)
    else:
        scores += [0.0, 0.05, 0.3]    # Dull — not fresh

    # ─── 3. SHARPNESS / OPACITY ──────────────────────────────────────────
    # Note: low sharpness can be from photo quality, not fish age.
    # We only lightly penalize blur; we do NOT use it as a hard signal.
    lap_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    if lap_var > 120:
        scores += [0.3, 0.1, 0.0]     # Crisp — likely fresh
    elif lap_var > 35:
        scores += [0.1, 0.2, 0.05]    # Moderate
    else:
        scores += [0.0, 0.05, 0.15]   # Very blurry / opaque

    # ─── 4. BLOOD SPOTS (moderate) ───────────────────────────────────────
    if red_pixels > 200:
        scores += [0.0, 0.0, 0.4]
    elif red_pixels > 30:
        scores += [0.0, 0.2, 0.15]
    else:
        scores += [0.25, 0.15, 0.0]

    # ─── 5. CONVEXITY / BULGE (Fresh = bulging outward) ──────────────────
    h, w = gray.shape
    mask_center = np.zeros((h, w), np.uint8)
    cv2.circle(mask_center, (w // 2, h // 2), int(min(w, h) * 0.25), 255, -1)
    center_bright = cv2.mean(gray, mask=mask_center)[0]
    overall_bright = cv2.mean(gray)[0]
    ratio = center_bright / (overall_bright + 1e-6)

    if ratio > 1.15:
        scores += [0.25, 0.1, 0.0]    # Bulging (centre bright) — fresh
    elif ratio < 0.88:
        scores += [0.0, 0.05, 0.25]   # Sunken (centre dark) — not fresh
    else:
        scores += [0.05, 0.15, 0.05]  # Flat

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

    if pupil_edge_var > 80:
        scores += [0.3, 0.1, 0.0]     # Sharp pupil boundary — highly fresh
    elif pupil_edge_var > 25:
        scores += [0.1, 0.2, 0.05]    # Moderate clarity
    else:
        scores += [0.0, 0.05, 0.25]   # Hazy/undefined pupil — not fresh

    # ─── 7. CORNEA OPACITY (Transparent cornea = fresh, Milky = not fresh) ─
    # Fresh eyes: cornea is transparent → you can see dark iris underneath.
    # Dark pixel ratio in centre = how "see-through" the cornea is.
    dark_px  = float(np.sum(gray[center_mask > 0] < 70))
    total_px = float(np.sum(center_mask > 0)) + 1e-6
    dark_ratio = dark_px / total_px

    if dark_ratio > 0.30:
        scores += [0.35, 0.1, 0.0]    # Clearly dark pupil visible — very fresh
    elif dark_ratio > 0.10:
        scores += [0.1, 0.25, 0.05]   # Some dark area — fresh
    else:
        scores += [0.0, 0.05, 0.35]   # No dark area — milky/opaque — not fresh

    # ─── NORMALIZE ───────────────────────────────────────────────────────
    total = np.sum(scores)
    if total > 0:
        scores = scores / total
    else:
        scores = np.array([0.33, 0.33, 0.34])

    return scores.tolist()

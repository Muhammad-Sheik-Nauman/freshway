import cv2
import numpy as np

def analyze_expert_rules(image_path):
    """
    Analyzes an image of a fish eye based on expert physical rules.
    Returns a score dictionary for [Highly Fresh, Fresh, Not Fresh].
    """
    img = cv2.imread(image_path)
    if img is None:
        return [0.33, 0.33, 0.34] # Default neutral
        
    # The image will eventually be pre-cropped by YOLO, so we analyze the whole input
    
    # Convert to different color spaces
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    
    # Initialize scores (probabilities)
    # [Highly Fresh, Fresh, Not Fresh]
    expert_scores = np.array([0.0, 0.0, 0.0])
    
    # ─── 1. REFLECTIVITY & MOISTURE (Rules 5, 7) ────────────────────────
    # Fresh eyes have sharp white specular highlights
    _, thresh = cv2.threshold(gray, 220, 255, cv2.THRESH_BINARY)
    white_pixels = cv2.countNonZero(thresh)
    if white_pixels > 50: # Clear highlights
        expert_scores += [0.4, 0.1, 0.0]
    elif white_pixels > 5: # Some reflection
        expert_scores += [0.1, 0.3, 0.1]
    else: # Dull, no reflection
        expert_scores += [0.0, 0.1, 0.4]
        
    # ─── 2. COLOR ANALYSIS (Rule 3) & CLOUDINESS KILL SWITCH ────────────
    # Check for Gray/Yellow/Discolored vs Black/Blue
    # Calculate average saturation and value
    avg_sat = np.mean(hsv[:,:,1])
    avg_val = np.mean(hsv[:,:,2])
    
    # KILL SWITCH: If saturation is very low, the eye is milky/cloudy.
    # A fresh eye is deep black/blue/brown (higher saturation/contrast).
    # A cloudy eye is completely desaturated (gray/white).
    if avg_sat < 50:
        # It's cloudy. Force a 100% Not Fresh score and skip other checks.
        return [0.0, 0.0, 1.0]
        
    # Yellowish/Gray detection (Low saturation, mid-value usually means gray)
    if avg_sat < 80 and 50 < avg_val < 200:
        expert_scores += [0.0, 0.1, 0.4]
    elif avg_sat > 100 and avg_val < 100: # Deep dark colors
        expert_scores += [0.4, 0.1, 0.0]
    else:
        expert_scores += [0.1, 0.3, 0.1]

    # ─── 3. CLARITY & PUPIL DEFINITION (Rules 1, 4, 9, 10) ──────────────
    # Use Laplacian for sharpness (blur detection)
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    if laplacian_var > 100: # Sharp edges
        expert_scores += [0.4, 0.1, 0.0]
    elif laplacian_var > 30: # Moderate
        expert_scores += [0.1, 0.3, 0.1]
    else: # Blurry / Opaque
        expert_scores += [0.0, 0.1, 0.4]
        
    # ─── 4. BLOOD SPOTS (Rule 8) ────────────────────────────────────────
    # Detect red patches in the eye
    lower_red1 = np.array([0, 100, 100])
    upper_red1 = np.array([10, 255, 255])
    lower_red2 = np.array([160, 100, 100])
    upper_red2 = np.array([180, 255, 255])
    
    mask1 = cv2.inRange(hsv, lower_red1, upper_red1)
    mask2 = cv2.inRange(hsv, lower_red2, upper_red2)
    red_mask = mask1 + mask2
    red_pixels = cv2.countNonZero(red_mask)
    
    if red_pixels > 500: # Large blood patches
        expert_scores += [0.0, 0.0, 0.5]
    elif red_pixels > 50: # Some spots
        expert_scores += [0.0, 0.3, 0.2]
    else: # Clean
        expert_scores += [0.3, 0.2, 0.0]

    # ─── 5. EYE CONVEXITY (Bulging vs. Sunken) ──────────────────────────
    # Fresh eyes bulge (more light in center). Old eyes sink (darker edges).
    # We compare the brightness of the center 50% vs the outer ring.
    h, w = gray.shape
    mask_center = np.zeros((h, w), np.uint8)
    cv2.circle(mask_center, (w//2, h//2), int(min(w,h)*0.25), 255, -1)
    
    avg_brightness_center = cv2.mean(gray, mask=mask_center)[0]
    avg_brightness_full = cv2.mean(gray)[0]
    
    # If center is significantly brighter than the surround, it's likely bulging (catching light)
    convexity_ratio = avg_brightness_center / (avg_brightness_full + 1)
    
    if convexity_ratio > 1.2: # Likely Bulging
        expert_scores += [0.3, 0.1, 0.0]
    elif convexity_ratio < 0.9: # Likely Sunken/Deep Shadows
        expert_scores += [0.0, 0.1, 0.3]
    else: # Flat
        expert_scores += [0.1, 0.2, 0.1]

    # Normalize scores so they sum to 1.0
    total = np.sum(expert_scores)
    if total > 0:
        expert_scores = expert_scores / total
    else:
        expert_scores = np.array([0.33, 0.33, 0.34])
        
    return expert_scores.tolist()

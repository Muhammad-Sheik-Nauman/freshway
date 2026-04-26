import cv2
import numpy as np

def analyze_expert_rules(image_path):
    """
    Analyzes an image of a fish eye based on expert physical rules.
    Returns (score_list, reasons_list).
    """
    img = cv2.imread(image_path)
    if img is None:
        return [0.33, 0.33, 0.34], ["Image read error"]
        
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    
    expert_scores = np.array([0.0, 0.0, 0.0])
    # Categorized reasons: {category_index: [reasons]}
    # 0: Highly Fresh, 1: Fresh, 2: Not Fresh
    cat_reasons = {0: [], 1: [], 2: []}
    
    # ─── 1. REFLECTIVITY & MOISTURE ────────────────────────
    _, thresh = cv2.threshold(gray, 220, 255, cv2.THRESH_BINARY)
    white_pixels = cv2.countNonZero(thresh)
    if white_pixels > 50:
        expert_scores += [0.4, 0.1, 0.0]
        cat_reasons[0].append("Sharp, clear highlights indicating moisture and high freshness.")
    elif white_pixels > 5:
        expert_scores += [0.1, 0.3, 0.1]
        cat_reasons[1].append("Moderate reflectivity; eye is slightly drying.")
    else:
        expert_scores += [0.0, 0.1, 0.4]
        cat_reasons[2].append("Dull eye surface with no moisture reflection.")
        
    # ─── 2. COLOR ANALYSIS & CLOUDINESS ────────────
    avg_sat = np.mean(hsv[:,:,1])
    avg_val = np.mean(hsv[:,:,2])
    
    if avg_sat < 50:
        return [0.0, 0.0, 1.0], {2: ["Milky/cloudy pupil detected - strong sign of deterioration."]}
        
    if avg_sat < 80 and 50 < avg_val < 200:
        expert_scores += [0.0, 0.1, 0.4]
        cat_reasons[2].append("Discolored or grayish pupil detected.")
    elif avg_sat > 100 and avg_val < 100:
        expert_scores += [0.4, 0.1, 0.0]
        cat_reasons[0].append("Deep, dark pupil color indicating high freshness.")
    else:
        expert_scores += [0.1, 0.3, 0.1]

    # ─── 3. CLARITY & PUPIL DEFINITION ──────────────
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    if laplacian_var > 100:
        expert_scores += [0.4, 0.1, 0.0]
        cat_reasons[0].append("Sharp pupil edges and clear cornea.")
    elif laplacian_var > 30:
        expert_scores += [0.1, 0.3, 0.1]
        cat_reasons[1].append("Slightly blurry pupil edges.")
    else:
        expert_scores += [0.0, 0.1, 0.4]
        cat_reasons[2].append("Opaque cornea or very blurry pupil definition.")
        
    # ─── 4. BLOOD SPOTS ────────────────────────────────────────
    lower_red1 = np.array([0, 100, 100])
    upper_red1 = np.array([10, 255, 255])
    lower_red2 = np.array([160, 100, 100])
    upper_red2 = np.array([180, 255, 255])
    
    mask1 = cv2.inRange(hsv, lower_red1, upper_red1)
    mask2 = cv2.inRange(hsv, lower_red2, upper_red2)
    red_mask = mask1 + mask2
    red_pixels = cv2.countNonZero(red_mask)
    
    if red_pixels > 500:
        expert_scores += [0.0, 0.0, 0.5]
        cat_reasons[2].append("Significant blood spots or hemorrhaging in the eye.")
    elif red_pixels > 50:
        expert_scores += [0.0, 0.3, 0.2]
        cat_reasons[2].append("Minor blood spots detected in the eye.")
    
    # ─── 5. EYE CONVEXITY ──────────────────────────
    h, w = gray.shape
    mask_center = np.zeros((h, w), np.uint8)
    cv2.circle(mask_center, (w//2, h//2), int(min(w,h)*0.25), 255, -1)
    
    avg_brightness_center = cv2.mean(gray, mask=mask_center)[0]
    avg_brightness_full = cv2.mean(gray)[0]
    
    convexity_ratio = avg_brightness_center / (avg_brightness_full + 1)
    
    if convexity_ratio > 1.2:
        expert_scores += [0.3, 0.1, 0.0]
        cat_reasons[0].append("Bulging (convex) eye shape, characteristic of fresh fish.")
    elif convexity_ratio < 0.9:
        expert_scores += [0.0, 0.1, 0.3]
        cat_reasons[2].append("Sunken eye shape, indicating moisture loss.")

    # Normalize
    total = np.sum(expert_scores)
    if total > 0:
        expert_scores = expert_scores / total
    else:
        expert_scores = np.array([0.33, 0.33, 0.34])
        
    return expert_scores.tolist(), cat_reasons

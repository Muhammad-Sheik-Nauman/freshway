import os
import sys
import cv2
import numpy as np

# Ensure server directory is in sys.path
SCRATCH_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(SCRATCH_DIR)
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from inference.expert_rules import analyze_expert_rules

val_dir = os.path.join(BASE_DIR, "data", "val")
class_names = ["fresh", "highly_fresh", "not_fresh"]

for c in class_names:
    print(f"\n=== CLASS: {c} ===")
    class_path = os.path.join(val_dir, c)
    images = sorted([f for f in os.listdir(class_path) if f.lower().endswith('.jpg')])[:5]
    
    for img_name in images:
        fpath = os.path.join(class_path, img_name)
        img = cv2.imread(fpath)
        H, W = img.shape[:2]
        
        # Run rules
        scores = analyze_expert_rules(fpath)
        
        # Details inside rules
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        hsv  = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        avg_sat = float(np.mean(hsv[:, :, 1]))
        avg_val = float(np.mean(hsv[:, :, 2]))
        
        _, thresh = cv2.threshold(gray, 220, 255, cv2.THRESH_BINARY)
        white_pixels = cv2.countNonZero(thresh)
        
        lap_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # red pixels
        lower_red1 = np.array([0,   100, 100])
        upper_red1 = np.array([10,  255, 255])
        lower_red2 = np.array([160, 100, 100])
        upper_red2 = np.array([180, 255, 255])
        red_mask   = cv2.inRange(hsv, lower_red1, upper_red1) + \
                     cv2.inRange(hsv, lower_red2, upper_red2)
        red_pixels = cv2.countNonZero(red_mask)
        red_ratio = red_pixels / (H * W)
        
        print(f"Image {img_name} ({W}x{H}):")
        print(f"  Scores: Highly Fresh={scores[0]:.2f}, Fresh={scores[1]:.2f}, Not Fresh={scores[2]:.2f}")
        print(f"  Features: avg_sat={avg_sat:.1f}, avg_val={avg_val:.1f}, white_pixels={white_pixels}, lap_var={lap_var:.1f}, red_ratio={red_ratio:.3f}")

import os
import sys
import cv2
import numpy as np

# Ensure server directory is in sys.path
SCRATCH_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(SCRATCH_DIR)
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

val_dir = os.path.join(BASE_DIR, "data", "val")
class_names = ["fresh", "highly_fresh", "not_fresh"]

stats = {c: {"sat": [], "val": [], "white": [], "lap": [], "red": []} for c in class_names}

for c in class_names:
    class_path = os.path.join(val_dir, c)
    for fname in os.listdir(class_path):
        if fname.lower().endswith(('.png', '.jpg', '.jpeg')):
            fpath = os.path.join(class_path, fname)
            img = cv2.imread(fpath)
            if img is None:
                continue
            
            # Resize to 224x224
            img = cv2.resize(img, (224, 224))
            
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            hsv  = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
            
            sat = float(np.mean(hsv[:, :, 1]))
            val = float(np.mean(hsv[:, :, 2]))
            
            _, thresh = cv2.threshold(gray, 220, 255, cv2.THRESH_BINARY)
            white = cv2.countNonZero(thresh)
            
            lap = cv2.Laplacian(gray, cv2.CV_64F).var()
            
            # red pixels
            lower_red1 = np.array([0,   100, 100])
            upper_red1 = np.array([10,  255, 255])
            lower_red2 = np.array([160, 100, 100])
            upper_red2 = np.array([180, 255, 255])
            red_mask   = cv2.inRange(hsv, lower_red1, upper_red1) + \
                         cv2.inRange(hsv, lower_red2, upper_red2)
            red = cv2.countNonZero(red_mask)
            
            stats[c]["sat"].append(sat)
            stats[c]["val"].append(val)
            stats[c]["white"].append(white)
            stats[c]["lap"].append(lap)
            stats[c]["red"].append(red)

print("=== DATASET STATISTICS (Resized to 224x224) ===")
for c in class_names:
    print(f"\nClass: {c}")
    print(f"  Saturation: mean={np.mean(stats[c]['sat']):.2f}, std={np.std(stats[c]['sat']):.2f}, min={np.min(stats[c]['sat']):.2f}, max={np.max(stats[c]['sat']):.2f}")
    print(f"  Value (Brightness): mean={np.mean(stats[c]['val']):.2f}, std={np.std(stats[c]['val']):.2f}")
    print(f"  White Pixels (>220): mean={np.mean(stats[c]['white']):.2f}, std={np.std(stats[c]['white']):.2f}, median={np.percentile(stats[c]['white'], 50):.2f}, 90th={np.percentile(stats[c]['white'], 90):.2f}")
    print(f"  Laplacian Variance: mean={np.mean(stats[c]['lap']):.2f}, std={np.std(stats[c]['lap']):.2f}, min={np.min(stats[c]['lap']):.2f}")
    print(f"  Red Pixels: mean={np.mean(stats[c]['red']):.2f}, std={np.std(stats[c]['red']):.2f}, 90th={np.percentile(stats[c]['red'], 90):.2f}")

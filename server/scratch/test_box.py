import os
import sys
import cv2

# Ensure server directory is in sys.path
SCRATCH_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(SCRATCH_DIR)
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from inference.predict import _get_local_yolo_box, _detect_eye_fallback

val_dir = os.path.join(BASE_DIR, "data", "val", "fresh")
images = sorted([f for f in os.listdir(val_dir) if f.lower().endswith('.jpg')])[:5]

for img_name in images:
    img_path = os.path.join(val_dir, img_name)
    img = cv2.imread(img_path)
    H, W = img.shape[:2]
    
    yolo_box = _get_local_yolo_box(img_path)
    fallback_box = _detect_eye_fallback(img)
    
    print(f"Image: {img_name} ({W}x{H})")
    print(f"  YOLO Box: {yolo_box}")
    print(f"  Fallback Circle Box: {fallback_box}")
    print("-" * 40)

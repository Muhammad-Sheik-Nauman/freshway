"""
Step 1: Download the fish eye dataset from Roboflow Universe.
Step 2: Train a YOLOv8-nano model on it.
Step 3: Copy the trained model to server/models/fish_eye_yolo.pt

Run from server/ directory:
    python scratch/train_eye_detector.py
"""

import os
import sys
import shutil

# ── CONFIG ─────────────────────────────────────────────────────────────────
API_KEY      = "UKX1beagTuTJScwPDy4J"
WORKSPACE    = "sowmya-ehtuu"
PROJECT      = "fish-eye-detection-fxm8r"
VERSION      = 1

BASE_DIR     = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_DIR  = os.path.join(BASE_DIR, "scratch", "fish_eye_dataset")
MODEL_OUT    = os.path.join(BASE_DIR, "models", "fish_eye_yolo.pt")
# ───────────────────────────────────────────────────────────────────────────

def step1_download():
    print("\n[STEP 1] Downloading dataset from Roboflow Universe...")
    from roboflow import Roboflow
    rf      = Roboflow(api_key=API_KEY)
    project = rf.workspace(WORKSPACE).project(PROJECT)
    dataset = project.version(VERSION).download("yolov8", location=DATASET_DIR, overwrite=True)
    print(f"[STEP 1] Dataset saved to: {dataset.location}")
    return dataset.location


def step2_train(data_dir: str):
    print("\n[STEP 2] Training YOLOv8-nano model...")
    from ultralytics import YOLO

    yaml_path = os.path.join(data_dir, "data.yaml")
    if not os.path.exists(yaml_path):
        # Some Roboflow exports put the yaml one level up
        yaml_path = os.path.join(data_dir, "..", "data.yaml")
    yaml_path = os.path.abspath(yaml_path)
    print(f"[STEP 2] Using data config: {yaml_path}")

    model = YOLO("yolov8n.pt")          # nano — fast, small, good accuracy
    results = model.train(
        data=yaml_path,
        epochs=60,
        imgsz=640,
        batch=8,                         # lower batch for CPU training
        patience=15,                     # stop early if no improvement
        project=os.path.join(BASE_DIR, "scratch", "yolo_runs"),
        name="fish_eye_v1",
        exist_ok=True,
        verbose=False,
        device="cpu",                    # use CPU (change to 0 for GPU)
        # Augmentations to handle blurry/varied fish photos
        hsv_h=0.015, hsv_s=0.7, hsv_v=0.4,
        degrees=10.0,
        flipud=0.0,
        fliplr=0.5,
        mosaic=0.5,
    )
    best_weights = os.path.join(BASE_DIR, "scratch", "yolo_runs", "fish_eye_v1", "weights", "best.pt")
    print(f"\n[STEP 2] Training complete. Best weights: {best_weights}")
    return best_weights


def step3_copy(weights_path: str):
    print(f"\n[STEP 3] Copying model to {MODEL_OUT}...")
    os.makedirs(os.path.dirname(MODEL_OUT), exist_ok=True)
    shutil.copy2(weights_path, MODEL_OUT)
    print(f"[STEP 3] Done! Model saved at: {MODEL_OUT}")


if __name__ == "__main__":
    try:
        data_dir     = step1_download()
        weights_path = step2_train(data_dir)
        step3_copy(weights_path)
        print("\n✅ Fish eye detector trained and ready!")
        print(f"   Model path: {MODEL_OUT}")
        print("\nNext step: The predict.py will automatically use this local model.")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback; traceback.print_exc()
        sys.exit(1)

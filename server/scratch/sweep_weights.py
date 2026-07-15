"""
Parameter Sweep for Decision-Level Fusion Weights
=================================================
Sweeps different weight ratios between MobileNetV2 and EfficientNetB0
probability predictions to find the optimal combination.

Equation:
P_final = w * P_EfficientNet + (1 - w) * P_MobileNet
"""

import os
import sys
import numpy as np
import tensorflow as tf
import cv2

# Ensure server directory is in sys.path
SCRATCH_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(SCRATCH_DIR)
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from tensorflow.keras.applications.mobilenet_v2 import preprocess_input as mobilenet_preprocess
from tensorflow.keras.applications.efficientnet import preprocess_input as efficientnet_preprocess
import builtins
builtins.mobilenet_preprocess = mobilenet_preprocess
builtins.efficientnet_preprocess = efficientnet_preprocess

from evaluate_individual_vs_hybrid import scan_val_images, build_isolated_models

VAL_DIR = os.path.join(BASE_DIR, "data", "val")
ENSEMBLE_PATH = os.path.join(BASE_DIR, "models", "freshness_ensemble_best.keras")

def main():
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')

    print("=" * 70)
    print("  Ensemble Weighted Probability Sweep  ")
    print("=" * 70)

    if not os.path.exists(VAL_DIR):
        print(f"Validation directory not found at: {VAL_DIR}")
        return

    image_list, class_names = scan_val_images(VAL_DIR)
    total_images = len(image_list)
    print(f"Loaded {total_images} validation images.\n")

    print("Loading Ensemble model...")
    ensemble_model = tf.keras.models.load_model(ENSEMBLE_PATH, safe_mode=False)

    print("Isolating branches...")
    m_only_model, e_only_model = build_isolated_models(ensemble_model)

    print("\nRunning inference for all images across both branches...")
    m_probs_list = []
    e_probs_list = []
    y_true = []

    for idx, (fpath, true_idx) in enumerate(image_list):
        if (idx + 1) % 50 == 0 or idx == 0 or (idx + 1) == total_images:
            sys.stdout.write(f"\rProgress: {idx+1}/{total_images} ({((idx+1)/total_images)*100:.1f}%)")
            sys.stdout.flush()

        img = cv2.imread(fpath)
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img_resized = cv2.resize(img_rgb, (224, 224))
        processed = np.expand_dims(img_resized.astype(np.float32), axis=0)

        # Predict using isolated branches
        m_prob = m_only_model.predict(processed, verbose=0)[0]
        e_prob = e_only_model.predict(processed, verbose=0)[0]

        m_probs_list.append(m_prob)
        e_probs_list.append(e_prob)
        y_true.append(true_idx)

    print("\n\nPredictions completed! Sweeping weights...")

    m_probs = np.array(m_probs_list)
    e_probs = np.array(e_probs_list)
    y_true = np.array(y_true)

    # Weights to sweep: from 100% MobileNet (w_eff = 0.0) to 100% EfficientNet (w_eff = 1.0)
    weight_steps = np.linspace(0.0, 1.0, 21)

    print("\n" + "-" * 60)
    print(f"{'Weight (MobileNet)':20s} | {'Weight (EfficientNet)':22s} | {'Accuracy':10s}")
    print("-" * 60)

    best_acc = 0.0
    best_w_eff = 0.0

    for w_eff in weight_steps:
        w_mob = 1.0 - w_eff
        
        # Linear blend of prediction probabilities
        blended_probs = (w_mob * m_probs) + (w_eff * e_probs)
        preds = np.argmax(blended_probs, axis=1)
        
        accuracy = np.mean(preds == y_true)
        print(f"{w_mob:20.2f} | {w_eff:22.2f} | {accuracy*100:8.2f}%")

        if accuracy > best_acc:
            best_acc = accuracy
            best_w_eff = w_eff

    print("-" * 60)
    print(f"\n[BEST COMBINATION]")
    print(f"  MobileNetV2 Weight: {1.0 - best_w_eff:.2f}")
    print(f"  EfficientNetB0 Weight: {best_w_eff:.2f}")
    print(f"  Max Blended Accuracy: {best_acc*100:.2f}% (vs current feature-concatenation 69.34%)")
    print("=" * 70 + "\n")

if __name__ == "__main__":
    main()

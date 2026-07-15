"""
FreshWay Ablation Experiment Runner — Ensemble Edition
======================================================
Uses the trained MobileNetV2 + EfficientNetB0 ensemble model
(freshness_ensemble_best.keras) for all evaluations.

Ablation Configurations:
  A: Ensemble CNN Only (Standard Crop)
  B: Ensemble CNN + Multi-View ITA (4-crop averaging)
  C: Ensemble CNN + Expert Rules (single crop, hybrid fusion)
  D: Full Hybrid (Multi-View + Expert Rules — production pipeline)

Metrics computed per configuration:
  - Per-class Precision, Recall, F1-Score, ROC-AUC
  - Overall Accuracy
  - Confusion Matrix
  - Macro-averaged Precision, Recall, F1, AUC
"""

import os
import sys
import json
import numpy as np
import cv2
from contextlib import contextmanager

# Ensure server directory is in sys.path
SCRATCH_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(SCRATCH_DIR)
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import tensorflow as tf

# ── Register preprocessing functions for Keras Lambda deserialization ────────
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input as mobilenet_preprocess
from tensorflow.keras.applications.efficientnet import preprocess_input as efficientnet_preprocess
import builtins
builtins.mobilenet_preprocess = mobilenet_preprocess
builtins.efficientnet_preprocess = efficientnet_preprocess

from inference.expert_rules import analyze_expert_rules

# Suppress tensorflow logs
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

@contextmanager
def suppress_stdout():
    with open(os.devnull, "w") as devnull:
        old_stdout = sys.stdout
        sys.stdout = devnull
        try:
            yield
        finally:
            sys.stdout = old_stdout

def scan_val_images(val_dir):
    class_names = sorted([d for d in os.listdir(val_dir) if os.path.isdir(os.path.join(val_dir, d))])
    image_list = []
    for class_idx, class_name in enumerate(class_names):
        class_path = os.path.join(val_dir, class_name)
        for fname in sorted(os.listdir(class_path)):
            if fname.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp')):
                fpath = os.path.join(class_path, fname)
                image_list.append((fpath, class_idx))
    return image_list, class_names


def load_ensemble_model():
    """Load the trained MobileNetV2 + EfficientNetB0 ensemble model."""
    paths = [
        os.path.join(BASE_DIR, "models", "freshness_ensemble_best.keras"),
        os.path.join(BASE_DIR, "models", "freshness_ensemble_final.keras"),
    ]
    for p in paths:
        if os.path.exists(p):
            print(f"  Loading ensemble model from: {p}")
            return tf.keras.models.load_model(p, safe_mode=False)
    raise FileNotFoundError(
        "Ensemble model not found! Expected freshness_ensemble_best.keras "
        "or freshness_ensemble_final.keras in server/models/"
    )


def preprocess_for_ensemble(img_bgr):
    """
    Preprocess a BGR OpenCV image for the ensemble model.
    The ensemble model has MobileNetV2 and EfficientNetB0 preprocessing
    baked in via Lambda layers, so we feed raw [0, 255] float32 RGB images.
    Returns shape (1, 224, 224, 3).
    """
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    img_resized = cv2.resize(img_rgb, (224, 224))
    return np.expand_dims(img_resized.astype(np.float32), axis=0)


def get_crops(img):
    H, W = img.shape[:2]
    # Simulate production eye bounding box as the whole pre-cropped image
    x, y, w, h = 0, 0, W, H
    
    crop_configs = [
        (0.1, 0.1, 0, 0),    # Standard
        (0.0, 0.0, 0, 0),    # Tight
        (0.25, 0.25, 0, 0),  # Wide
        (0.1, 0.1, 5, 5),    # Shifted
    ]
    
    crops = []
    for px, py, sx, sy in crop_configs:
        pad_x, pad_y = int(w * px), int(h * py)
        shift_x, shift_y = int(w * sx / 100), int(h * sy / 100)

        x1, y1 = max(0, x - pad_x + shift_x), max(0, y - pad_y + shift_y)
        x2, y2 = min(W, x + w + pad_x + shift_x), min(H, y + h + pad_y + shift_y)
        crops.append(img[y1:y2, x1:x2])
        
    return crops

def calculate_metrics_manual(y_true, y_pred, y_probs, class_names):
    num_classes = len(class_names)
    
    # 1. Confusion Matrix
    cm = np.zeros((num_classes, num_classes), dtype=int)
    for t, p in zip(y_true, y_pred):
        if 0 <= t < num_classes and 0 <= p < num_classes:
            cm[t, p] += 1
            
    # 2. Class-specific Metrics
    metrics_per_class = {}
    tp_total = 0
    
    for idx, name in enumerate(class_names):
        tp = cm[idx, idx]
        fp = np.sum(cm[:, idx]) - tp
        fn = np.sum(cm[idx, :]) - tp
        support = np.sum(cm[idx, :])
        
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
        
        # Calculate AUC (One-vs-Rest)
        y_true_bin = (y_true == idx).astype(int)
        y_scores_class = y_probs[:, idx]
        
        # Manual AUC using Trapezoidal Rule
        desc_indices = np.argsort(y_scores_class)[::-1]
        y_true_sorted = y_true_bin[desc_indices]
        
        tps = np.cumsum(y_true_sorted)
        fps = np.cumsum(1 - y_true_sorted)
        total_pos = np.sum(y_true_bin)
        total_neg = len(y_true_bin) - total_pos
        
        tpr = tps / total_pos if total_pos > 0 else np.zeros_like(tps)
        fpr = fps / total_neg if total_neg > 0 else np.zeros_like(fps)
        tpr = np.r_[0, tpr]
        fpr = np.r_[0, fpr]
        
        auc_val = 0.0
        for i in range(1, len(fpr)):
            auc_val += (fpr[i] - fpr[i-1]) * (tpr[i] + tpr[i-1]) / 2.0
            
        metrics_per_class[name] = {
            "precision": float(precision),
            "recall": float(recall),
            "f1_score": float(f1),
            "support": int(support),
            "auc": float(auc_val)
        }
        tp_total += tp
        
    overall_accuracy = tp_total / len(y_true) if len(y_true) > 0 else 0.0
    
    return {
        "accuracy": overall_accuracy,
        "confusion_matrix": cm.tolist(),
        "metrics_per_class": metrics_per_class
    }

def main():
    # Fix Windows console encoding for Unicode characters
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    
    val_dir = os.path.join(BASE_DIR, "data", "val")
    print("=" * 80)
    print("  FreshWay Ablation Experiment — Ensemble Edition")
    print("  Model: MobileNetV2 + EfficientNetB0 Dual-Backbone")
    print("=" * 80)

    print("\nScanning validation dataset...")
    image_list, class_names = scan_val_images(val_dir)
    total_images = len(image_list)
    print(f"Found {total_images} validation images across classes: {class_names}")

    print("Loading freshness ensemble model...")
    model = load_ensemble_model()

    # Predictions storage
    # Config A: Ensemble CNN Only (Standard Crop)
    # Config B: Ensemble CNN + Multi-View ITA
    # Config C: Ensemble CNN + Expert Rules
    # Config D: Full Hybrid (Multi-View + Expert Rules)
    y_true = []
    preds_a, probs_a = [], []
    preds_b, probs_b = [], []
    preds_c, probs_c = [], []
    preds_d, probs_d = [], []

    print("\nRunning model evaluations on all configurations...")
    for idx, (img_path, true_idx) in enumerate(image_list):
        if (idx + 1) % 20 == 0 or idx == 0 or (idx + 1) == total_images:
            sys.stdout.write(f"\rProgress: {idx+1}/{total_images} ({((idx+1)/total_images)*100:.1f}%)")
            sys.stdout.flush()

        img = cv2.imread(img_path)
        if img is None:
            continue
            
        y_true.append(true_idx)

        # Generate crops
        crops = get_crops(img)

        # ─── 1. ENSEMBLE CNN PREDICTIONS ───
        # Standard crop (crop 0) for Config A
        processed_crop0 = preprocess_for_ensemble(crops[0])
        cnn_probs_single = model.predict(processed_crop0, verbose=0)[0]  # [fresh, highly_fresh, not_fresh]
        
        # Configuration A (Ensemble CNN Only — single standard crop)
        preds_a.append(np.argmax(cnn_probs_single))
        probs_a.append(cnn_probs_single)

        # Configuration B (Ensemble CNN + Multi-View ITA — 4 crops averaged)
        all_cnn_probs = []
        for crop in crops:
            processed_crop = preprocess_for_ensemble(crop)
            probs = model.predict(processed_crop, verbose=0)[0]
            all_cnn_probs.append(probs)
        cnn_probs_multiview = np.mean(all_cnn_probs, axis=0)  # [fresh, highly_fresh, not_fresh]
        preds_b.append(np.argmax(cnn_probs_multiview))
        probs_b.append(cnn_probs_multiview)

        # ─── 2. EXPERT RULES PREDICTIONS ───
        # For single crop (Config C)
        expert_probs_single, triggered_single = analyze_expert_rules(crops[0], return_debug=True)
        expert_arr_single = np.array(expert_probs_single)  # [highly_fresh, fresh, not_fresh]
        # Align to folder classes: [fresh, highly_fresh, not_fresh]
        expert_folder_single = np.array([expert_arr_single[1], expert_arr_single[0], expert_arr_single[2]])

        # For multi-view crops (Config D)
        all_expert_probs = []
        all_triggered_multiview = []
        for crop in crops:
            ep, tr = analyze_expert_rules(crop, return_debug=True)
            all_expert_probs.append(ep)
            all_triggered_multiview.append(tr)
        expert_probs_multiview = np.mean(all_expert_probs, axis=0)  # [highly_fresh, fresh, not_fresh]
        expert_folder_multiview = np.array([expert_probs_multiview[1], expert_probs_multiview[0], expert_probs_multiview[2]])

        # ─── 3. FUSION LOGIC ───
        # Config C (Ensemble CNN Single + Expert Single)
        cnn_conf_c = float(np.max(cnn_probs_single))
        is_veto_c = any(k.startswith("VETO_") for k in triggered_single.keys())
        if is_veto_c:
            fused_c = expert_folder_single
        elif cnn_conf_c >= 0.60:
            fused_c = cnn_probs_single
        else:
            fused_c = (cnn_probs_single * 0.80) + (expert_folder_single * 0.20)
        preds_c.append(np.argmax(fused_c))
        probs_c.append(fused_c)

        # Config D (Full Hybrid — Multi-View Ensemble + Expert Rules)
        cnn_conf_d = float(np.max(cnn_probs_multiview))
        is_veto_d = any(any(k.startswith("VETO_") for k in tr.keys()) for tr in all_triggered_multiview)
        if is_veto_d:
            fused_d = expert_folder_multiview
        elif cnn_conf_d >= 0.60:
            fused_d = cnn_probs_multiview
        else:
            fused_d = (cnn_probs_multiview * 0.80) + (expert_folder_multiview * 0.20)
        preds_d.append(np.argmax(fused_d))
        probs_d.append(fused_d)

    print("\n\nAll predictions completed! Calculating metrics...")

    # Convert lists to arrays
    y_true = np.array(y_true)
    probs_a = np.array(probs_a)
    probs_b = np.array(probs_b)
    probs_c = np.array(probs_c)
    probs_d = np.array(probs_d)

    # Calculate metrics for each configuration
    metrics_a = calculate_metrics_manual(y_true, preds_a, probs_a, class_names)
    metrics_b = calculate_metrics_manual(y_true, preds_b, probs_b, class_names)
    metrics_c = calculate_metrics_manual(y_true, preds_c, probs_c, class_names)
    metrics_d = calculate_metrics_manual(y_true, preds_d, probs_d, class_names)

    # Print comparative results
    print("\n" + "="*90)
    print("          FreshWay Ensemble Pipeline — Configuration Comparison")
    print("          Model: MobileNetV2 + EfficientNetB0 Dual-Backbone")
    print("="*90)
    print(f"{'Configuration':35s} | {'Accuracy':10s} | {'Macro F1':10s} | {'Macro Prec':12s} | {'Macro Rec':10s} | {'Macro AUC':10s}")
    print("-"*90)
    
    for label, metrics in [
        ("A: Ensemble CNN Only", metrics_a),
        ("B: Ensemble CNN + Multi-View", metrics_b),
        ("C: Ensemble CNN + Expert Rules", metrics_c),
        ("D: Full Hybrid (Production)", metrics_d)
    ]:
        precisions = [m["precision"] for m in metrics["metrics_per_class"].values()]
        recalls = [m["recall"] for m in metrics["metrics_per_class"].values()]
        f1s = [m["f1_score"] for m in metrics["metrics_per_class"].values()]
        aucs = [m["auc"] for m in metrics["metrics_per_class"].values()]
        print(f"{label:35s} | {metrics['accuracy']*100:8.2f}% | {np.mean(f1s)*100:8.2f}% | {np.mean(precisions)*100:10.2f}% | {np.mean(recalls)*100:8.2f}% | {np.mean(aucs):.4f}")
    print("="*90 + "\n")

    # Print detailed per-class metrics for each config
    for label, metrics in [
        ("A: Ensemble CNN Only", metrics_a),
        ("B: Ensemble CNN + Multi-View", metrics_b),
        ("C: Ensemble CNN + Expert Rules", metrics_c),
        ("D: Full Hybrid (Production)", metrics_d)
    ]:
        print(f"\n  ── {label} ──")
        print(f"  {'Class':15s} | {'Precision':10s} | {'Recall':10s} | {'F1-Score':10s} | {'AUC':8s} | {'Support':8s}")
        print(f"  {'-'*70}")
        for name in class_names:
            m = metrics["metrics_per_class"][name]
            print(f"  {name:15s} | {m['precision']*100:8.2f}% | {m['recall']*100:8.2f}% | {m['f1_score']*100:8.2f}% | {m['auc']:.4f} | {m['support']:>6d}")
        print(f"  Confusion Matrix:")
        cm = np.array(metrics["confusion_matrix"])
        for row in cm:
            print(f"    {row}")

    # Generate Detailed Report
    report_md_path = os.path.join(SCRATCH_DIR, "FreshWay_Ablation_Experiment_Report.md")
    generate_report(report_md_path, metrics_a, metrics_b, metrics_c, metrics_d, class_names)
    print(f"\nDetailed report saved to: {report_md_path}")

    # Save raw results as JSON for programmatic access
    results_json_path = os.path.join(SCRATCH_DIR, "ablation_results.json")
    results = {
        "model": "MobileNetV2 + EfficientNetB0 Ensemble",
        "total_images": int(total_images),
        "class_names": class_names,
        "configurations": {
            "A_ensemble_cnn_only": metrics_a,
            "B_ensemble_multiview": metrics_b,
            "C_ensemble_expert_rules": metrics_c,
            "D_full_hybrid": metrics_d,
        }
    }
    with open(results_json_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"Raw results saved to: {results_json_path}")


def generate_report(filepath, ma, mb, mc, md, class_names):
    def format_class_table(metrics):
        table = "| Class | Precision | Recall | F1-Score | ROC-AUC | Support |\n"
        table += "|---|---|---|---|---|---|\n"
        for name in class_names:
            m = metrics["metrics_per_class"][name]
            table += f"| **{name}** | {m['precision']*100:.2f}% | {m['recall']*100:.2f}% | {m['f1_score']*100:.2f}% | {m['auc']:.4f} | {m['support']} |\n"
        # Add macro average row
        precisions = [metrics["metrics_per_class"][n]["precision"] for n in class_names]
        recalls = [metrics["metrics_per_class"][n]["recall"] for n in class_names]
        f1s = [metrics["metrics_per_class"][n]["f1_score"] for n in class_names]
        aucs = [metrics["metrics_per_class"][n]["auc"] for n in class_names]
        total_support = sum(metrics["metrics_per_class"][n]["support"] for n in class_names)
        table += f"| **Macro Avg** | {np.mean(precisions)*100:.2f}% | {np.mean(recalls)*100:.2f}% | {np.mean(f1s)*100:.2f}% | {np.mean(aucs):.4f} | {total_support} |\n"
        return table

    def macro_avg(metrics, key):
        return np.mean([m[key] for m in metrics["metrics_per_class"].values()])

    report_content = f"""# FreshWay Ablation Experiment Report — Ensemble Model

> **Model Architecture**: MobileNetV2 + EfficientNetB0 Dual-Backbone Ensemble  
> **Validation Set**: {sum(m['support'] for m in ma['metrics_per_class'].values())} images across {len(class_names)} classes  
> **Classes**: {', '.join(class_names)}

---

## 1. Executive Summary

| Configuration | Accuracy | Macro Precision | Macro Recall | Macro F1 | Macro AUC |
|---|---|---|---|---|---|
| **A: Ensemble CNN Only** | {ma['accuracy']*100:.2f}% | {macro_avg(ma, 'precision')*100:.2f}% | {macro_avg(ma, 'recall')*100:.2f}% | {macro_avg(ma, 'f1_score')*100:.2f}% | {macro_avg(ma, 'auc'):.4f} |
| **B: Ensemble CNN + Multi-View** | {mb['accuracy']*100:.2f}% | {macro_avg(mb, 'precision')*100:.2f}% | {macro_avg(mb, 'recall')*100:.2f}% | {macro_avg(mb, 'f1_score')*100:.2f}% | {macro_avg(mb, 'auc'):.4f} |
| **C: Ensemble CNN + Expert Rules** | {mc['accuracy']*100:.2f}% | {macro_avg(mc, 'precision')*100:.2f}% | {macro_avg(mc, 'recall')*100:.2f}% | {macro_avg(mc, 'f1_score')*100:.2f}% | {macro_avg(mc, 'auc'):.4f} |
| **D: Full Hybrid (Production)** | {md['accuracy']*100:.2f}% | {macro_avg(md, 'precision')*100:.2f}% | {macro_avg(md, 'recall')*100:.2f}% | {macro_avg(md, 'f1_score')*100:.2f}% | {macro_avg(md, 'auc'):.4f} |

---

## 2. Ablation Analysis

### Configuration Descriptions
| Config | CNN Backbone | Multi-View (4 crops) | Expert Rules | Fusion Strategy |
|---|---|---|---|---|
| **A** | MobileNetV2 + EfficientNetB0 | ✗ | ✗ | CNN only |
| **B** | MobileNetV2 + EfficientNetB0 | ✓ | ✗ | 4-crop average |
| **C** | MobileNetV2 + EfficientNetB0 | ✗ | ✓ | 80/20 CNN-primary + Veto |
| **D** | MobileNetV2 + EfficientNetB0 | ✓ | ✓ | 4-crop avg + 80/20 fusion + Veto |

### Key Observations
- **A → B**: Effect of Multi-View Image Test Averaging (ITA)
- **A → C**: Effect of Expert Rules (physical feature analysis)
- **A → D**: Combined effect of both enhancements (production pipeline)
- **B vs D**: Marginal contribution of Expert Rules when Multi-View is active

---

## 3. Detailed Per-Class Metrics

### Configuration A: Ensemble CNN Only (Standard Crop)
{format_class_table(ma)}

**Confusion Matrix:**
```
{np.array(ma['confusion_matrix'])}
```

### Configuration B: Ensemble CNN + Multi-View ITA
{format_class_table(mb)}

**Confusion Matrix:**
```
{np.array(mb['confusion_matrix'])}
```

### Configuration C: Ensemble CNN + Expert Rules
{format_class_table(mc)}

**Confusion Matrix:**
```
{np.array(mc['confusion_matrix'])}
```

### Configuration D: Full Hybrid (Production Pipeline)
{format_class_table(md)}

**Confusion Matrix:**
```
{np.array(md['confusion_matrix'])}
```

---

## 4. Metric Definitions

| Metric | Formula | Interpretation |
|---|---|---|
| **Precision** | TP / (TP + FP) | Of predicted positives, how many are correct |
| **Recall** | TP / (TP + FN) | Of actual positives, how many were found |
| **F1-Score** | 2 × (P × R) / (P + R) | Harmonic mean of Precision and Recall |
| **ROC-AUC** | Area under ROC curve | Discriminative ability (1.0 = perfect, 0.5 = random) |
| **Accuracy** | Correct / Total | Overall correctness |

---

## 5. Architecture Details

The ensemble model uses a **dual-backbone** architecture:
- **MobileNetV2**: Captures fine texture and edge patterns
- **EfficientNetB0**: Captures color gradients and global structure
- **Fusion Head**: Concatenates both backbone features → Dense(256) → Dense(128) → Softmax(3)
- Each backbone has its own preprocessing baked into the model graph via Lambda layers
- Training: Two-phase (frozen backbones → fine-tune last 30 layers of each)
"""
    with open(filepath, "w") as f:
        f.write(report_content)

if __name__ == "__main__":
    main()

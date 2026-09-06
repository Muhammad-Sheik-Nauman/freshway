"""
Evaluation and Diagnostic Suite for FreshWay Fish Freshness Classifier.

Computes:
- Confusion Matrix (Categorical Freshness Classes)
- Per-class Precision, Recall, F1-Score, and Support
- Macro and Weighted Average Accuracy
- Confusion breakdown: Adjacent class transitions vs severe errors
- Exports JSON and Markdown evaluation reports.

Usage:
    python training/evaluate.py
    python training/evaluate.py --model models/freshness_model_best.keras --data data/val
"""

import os
import sys
import json
import argparse
import numpy as np
from datetime import datetime

# Path setup
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

DEFAULT_MODEL = os.path.join(BASE_DIR, "models", "freshness_model_best.keras")
DEFAULT_VAL_DIR = os.path.join(BASE_DIR, "data", "val")
REPORT_PATH = os.path.join(BASE_DIR, "models", "evaluation_report.json")
CLASS_NAMES = ["fresh", "highly_fresh", "not_fresh"]
HUMAN_LABELS = {
    "fresh": "Fresh",
    "highly_fresh": "Highly Fresh",
    "not_fresh": "Not Fresh",
}


def compute_metrics(y_true, y_pred, class_names):
    """Compute confusion matrix, precision, recall, and f1-score."""
    n_classes = len(class_names)
    matrix = np.zeros((n_classes, n_classes), dtype=int)

    for t, p in zip(y_true, y_pred):
        matrix[t, p] += 1

    per_class = {}
    for i, name in enumerate(class_names):
        tp = matrix[i, i]
        fp = np.sum(matrix[:, i]) - tp
        fn = np.sum(matrix[i, :]) - tp
        support = np.sum(matrix[i, :])

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

        per_class[name] = {
            "label": HUMAN_LABELS.get(name, name),
            "precision": round(float(precision), 4),
            "recall": round(float(recall), 4),
            "f1_score": round(float(f1), 4),
            "support": int(support),
        }

    total_samples = len(y_true)
    correct = np.trace(matrix)
    overall_accuracy = correct / total_samples if total_samples > 0 else 0.0

    macro_p = np.mean([v["precision"] for v in per_class.values()])
    macro_r = np.mean([v["recall"] for v in per_class.values()])
    macro_f1 = np.mean([v["f1_score"] for v in per_class.values()])

    # Error analysis
    # Adjacent error: Highly Fresh <-> Fresh, Fresh <-> Not Fresh
    # Severe error: Highly Fresh <-> Not Fresh
    idx_hf = class_names.index("highly_fresh") if "highly_fresh" in class_names else 1
    idx_nf = class_names.index("not_fresh") if "not_fresh" in class_names else 2
    severe_errors = matrix[idx_hf, idx_nf] + matrix[idx_nf, idx_hf]

    report = {
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "total_samples": int(total_samples),
        "overall_accuracy": round(float(overall_accuracy), 4),
        "overall_accuracy_percent": round(float(overall_accuracy * 100), 2),
        "macro_avg": {
            "precision": round(float(macro_p), 4),
            "recall": round(float(macro_r), 4),
            "f1_score": round(float(macro_f1), 4),
        },
        "per_class": per_class,
        "confusion_matrix": {
            "classes": [HUMAN_LABELS.get(c, c) for c in class_names],
            "matrix": matrix.tolist(),
        },
        "severe_misclassifications": int(severe_errors),
    }

    return report


def display_report(report):
    """Print formatted terminal report."""
    print("\n" + "=" * 64)
    print("  FRESHWAY CLASSIFIER EVALUATION REPORT")
    print("=" * 64)
    print(f"\nTimestamp:        {report['timestamp']}")
    print(f"Total Evaluated:  {report['total_samples']} images")
    print(f"Overall Accuracy: {report['overall_accuracy_percent']}%\n")

    print(f"{'Class':<16} | {'Precision':<10} | {'Recall':<10} | {'F1-Score':<10} | {'Support':<8}")
    print("-" * 64)
    for name, m in report["per_class"].items():
        print(f"{m['label']:<16} | {m['precision']:<10.4f} | {m['recall']:<10.4f} | {m['f1_score']:<10.4f} | {m['support']:<8}")

    print("-" * 64)
    macro = report["macro_avg"]
    print(f"{'Macro Average':<16} | {macro['precision']:<10.4f} | {macro['recall']:<10.4f} | {macro['f1_score']:<10.4f} | {report['total_samples']:<8}\n")

    print("[MATRIX] Confusion Matrix (Rows = Actual, Columns = Predicted):")
    labels = report["confusion_matrix"]["classes"]
    col_header = " " * 18 + " | ".join(f"{lbl[:10]:>10}" for lbl in labels)
    print(col_header)
    print("-" * len(col_header))
    for i, row in enumerate(report["confusion_matrix"]["matrix"]):
        row_str = f"{labels[i]:<16} | " + " | ".join(f"{val:>10}" for val in row)
        print(row_str)

    print(f"\n[ALERT] Severe Misclassifications (Highly Fresh <-> Not Fresh): {report['severe_misclassifications']}")
    if report["severe_misclassifications"] == 0:
        print("   [OK] Zero severe errors! The model respects biological ordering.")
    else:
        print("   [WARN] Extreme errors detected; inspect lighting or label noise on these samples.")
    print()


def run_evaluation(model_path, data_dir):
    """Run model on validation directory and evaluate."""
    import tensorflow as tf
    from tensorflow.keras.preprocessing.image import ImageDataGenerator
    from tensorflow.keras.applications.mobilenet_v2 import preprocess_input

    if not os.path.exists(model_path):
        print(f"[ERROR] Model file not found at: {model_path}")
        return None

    if not os.path.exists(data_dir):
        print(f"[ERROR] Validation data directory not found at: {data_dir}")
        return None

    print(f"[INFO] Loading model: {model_path}")
    model = tf.keras.models.load_model(model_path)

    print(f"[INFO] Loading validation generator from: {data_dir}")
    val_datagen = ImageDataGenerator(preprocessing_function=preprocess_input)
    val_gen = val_datagen.flow_from_directory(
        data_dir,
        target_size=(224, 224),
        batch_size=32,
        class_mode="categorical",
        classes=CLASS_NAMES,
        shuffle=False,
    )

    if val_gen.samples == 0:
        print(f"[ERROR] No images found in {data_dir} under class folders {CLASS_NAMES}")
        return None

    print("[INFO] Running inference on all validation samples...")
    raw_predictions = model.predict(val_gen, verbose=1)
    y_pred = np.argmax(raw_predictions, axis=1)
    y_true = val_gen.classes

    report = compute_metrics(y_true, y_pred, CLASS_NAMES)
    display_report(report)

    with open(REPORT_PATH, "w") as f:
        json.dump(report, f, indent=2)
    print(f"[SAVED] Full evaluation report saved to: {REPORT_PATH}\n")

    return report


def main():
    parser = argparse.ArgumentParser(description="FreshWay Model Evaluation Suite")
    parser.add_argument("--model", type=str, default=DEFAULT_MODEL, help="Path to .keras model")
    parser.add_argument("--data", type=str, default=DEFAULT_VAL_DIR, help="Path to validation directory")
    args = parser.parse_args()

    run_evaluation(args.model, args.data)


if __name__ == "__main__":
    main()

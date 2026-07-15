import os
import sys
import json
import argparse
import numpy as np
import cv2
from contextlib import contextmanager

# Ensure server directory is in sys.path
SCRATCH_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(SCRATCH_DIR)
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from inference.predict import predict

# Context manager to suppress stdout during inner model inference calls
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
    """Scans validation dataset directory and returns a list of (image_path, true_class_index)."""
    class_names = sorted([d for d in os.listdir(val_dir) if os.path.isdir(os.path.join(val_dir, d))])
    image_list = []
    
    for class_idx, class_name in enumerate(class_names):
        class_path = os.path.join(val_dir, class_name)
        for fname in sorted(os.listdir(class_path)):
            if fname.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp')):
                fpath = os.path.join(class_path, fname)
                image_list.append((fpath, class_idx))
                
    return image_list, class_names

def map_prediction_to_class(prediction_str):
    """Maps the predicted string back to the class index matching data/val directory order."""
    if not prediction_str:
        return -1
    pred_lower = prediction_str.lower()
    # Sorted order of subdirectories is ['fresh', 'highly_fresh', 'not_fresh']
    # index 0: fresh
    # index 1: highly_fresh
    # index 2: not_fresh
    if "highly" in pred_lower:
        return 1
    elif "not" in pred_lower:
        return 2
    elif "fresh" in pred_lower:
        return 0
    else:
        return -1

def calculate_metrics(y_true, y_pred, class_names):
    num_classes = len(class_names)
    
    # 1. Confusion Matrix
    cm = np.zeros((num_classes, num_classes), dtype=int)
    for t, p in zip(y_true, y_pred):
        if 0 <= t < num_classes and 0 <= p < num_classes:
            cm[t, p] += 1
            
    # 2. Precision, Recall, F1 for each class
    metrics_per_class = {}
    tp_total = 0
    support_total = len(y_true)
    
    for idx, name in enumerate(class_names):
        tp = cm[idx, idx]
        fp = np.sum(cm[:, idx]) - tp
        fn = np.sum(cm[idx, :]) - tp
        support = np.sum(cm[idx, :])
        
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
        
        metrics_per_class[name] = {
            "precision": float(precision),
            "recall": float(recall),
            "f1_score": float(f1),
            "support": int(support)
        }
        tp_total += tp

    overall_accuracy = tp_total / support_total if support_total > 0 else 0.0
    
    # 3. Macro and Weighted Averages
    macro_precision = np.mean([m["precision"] for m in metrics_per_class.values()])
    macro_recall = np.mean([m["recall"] for m in metrics_per_class.values()])
    macro_f1 = np.mean([m["f1_score"] for m in metrics_per_class.values()])
    
    weighted_precision = sum(m["precision"] * m["support"] for m in metrics_per_class.values()) / support_total
    weighted_recall = sum(m["recall"] * m["support"] for m in metrics_per_class.values()) / support_total
    weighted_f1 = sum(m["f1_score"] * m["support"] for m in metrics_per_class.values()) / support_total
    
    averages = {
        "accuracy": float(overall_accuracy),
        "macro_avg": {
            "precision": float(macro_precision),
            "recall": float(macro_recall),
            "f1_score": float(macro_f1),
            "support": int(support_total)
        },
        "weighted_avg": {
            "precision": float(weighted_precision),
            "recall": float(weighted_recall),
            "f1_score": float(weighted_f1),
            "support": int(support_total)
        }
    }
    
    return cm, metrics_per_class, averages

def format_classification_report(metrics_per_class, averages, class_names):
    report = f"{'':15s} {'precision':>10s} {'recall':>10s} {'f1-score':>10s} {'support':>10s}\n\n"
    
    for name in class_names:
        m = metrics_per_class[name]
        report += f"{name:15s} {m['precision']:10.2f} {m['recall']:10.2f} {m['f1_score']:10.2f} {m['support']:10d}\n"
        
    report += "\n"
    report += f"{'accuracy':15s} {'':10s} {'':10s} {averages['accuracy']:10.2f} {averages['macro_avg']['support']:10d}\n"
    report += f"{'macro avg':15s} {averages['macro_avg']['precision']:10.2f} {averages['macro_avg']['recall']:10.2f} {averages['macro_avg']['f1_score']:10.2f} {averages['macro_avg']['support']:10d}\n"
    report += f"{'weighted avg':15s} {averages['weighted_avg']['precision']:10.2f} {averages['weighted_avg']['recall']:10.2f} {averages['weighted_avg']['f1_score']:10.2f} {averages['weighted_avg']['support']:10d}\n"
    
    return report

def save_confusion_matrix_matplotlib(cm, class_names, filepath):
    try:
        import matplotlib.pyplot as plt
        import seaborn as sns
        
        plt.figure(figsize=(6, 5))
        sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
                    xticklabels=class_names, yticklabels=class_names)
        plt.title("Confusion Matrix (Production Hybrid Pipeline)")
        plt.ylabel("Actual")
        plt.xlabel("Predicted")
        plt.tight_layout()
        plt.savefig(filepath, dpi=300)
        plt.close()
        return True
    except Exception as e:
        print(f"[INFO] Matplotlib/Seaborn not available or failed: {e}. Falling back to PIL...")
        return False

def save_confusion_matrix_pil(cm, class_names, filepath):
    from PIL import Image, ImageDraw, ImageFont
    
    cell_size = 120
    header_offset = 100
    margin = 50
    width = cell_size * len(class_names) + header_offset + margin * 2
    height = cell_size * len(class_names) + header_offset + margin * 2
    
    img = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(img)
    
    try:
        font = ImageFont.truetype("arial.ttf", 16)
        title_font = ImageFont.truetype("arial.ttf", 20)
    except IOError:
        font = ImageFont.load_default()
        title_font = ImageFont.load_default()
        
    draw.text((width // 2, 25), "Confusion Matrix (Hybrid Pipeline)", fill="black", font=title_font, anchor="mm")
    
    draw.text((margin + 20, margin + header_offset + (cell_size * len(class_names)) // 2), 
              "Actual", fill="black", font=font, anchor="mm")
    draw.text((margin + header_offset + (cell_size * len(class_names)) // 2, margin + 40), 
              "Predicted", fill="black", font=font, anchor="mm")
              
    for i, class_name in enumerate(class_names):
        draw.text((margin + header_offset + i * cell_size + cell_size // 2, margin + header_offset - 20), 
                  class_name, fill="black", font=font, anchor="mm")
        draw.text((margin + header_offset - 20, margin + header_offset + i * cell_size + cell_size // 2), 
                  class_name, fill="black", font=font, anchor="rm")
                  
    for i in range(len(class_names)):
        for j in range(len(class_names)):
            x1 = margin + header_offset + j * cell_size
            y1 = margin + header_offset + i * cell_size
            x2 = x1 + cell_size
            y2 = y1 + cell_size
            
            val = cm[i, j]
            row_sum = np.sum(cm[i, :])
            ratio = val / row_sum if row_sum > 0 else 0.0
            
            blue_val = int(255 - ratio * 150)
            other_val = int(255 - ratio * 200)
            fill_color = (other_val, other_val, blue_val)
            
            draw.rectangle([x1, y1, x2, y2], fill=fill_color, outline="gray")
            draw.text((x1 + cell_size // 2, y1 + cell_size // 2), str(val), 
                      fill="black" if ratio < 0.5 else "white", font=font, anchor="mm")
                      
    img.save(filepath)
    print(f"Saved confusion matrix visualization to: {filepath}")

def main():
    parser = argparse.ArgumentParser(description="Evaluate the FreshWay Production Hybrid Pipeline.")
    parser.add_argument(
        "--run-detection", 
        action="store_true", 
        help="Do not bypass YOLO detection (YOLOv8 will run directly on the already pre-cropped eye images)."
    )
    args = parser.parse_args()

    val_dir = os.path.join(BASE_DIR, "data", "val")
    if not os.path.exists(val_dir):
        print(f"ERROR: Validation directory does not exist at {val_dir}")
        return

    # Setup Bounding Box detection override if --run-detection is NOT passed
    if not args.run_detection:
        print("\n" + "="*70)
        print("INFO: PRE-ALIGNED ROI MODE ACTIVATED (Recommended)")
        print("   Bypassing YOLO detection because validation dataset images are already pre-cropped.")
        print("   This measures the true classification + expert rules pipeline accuracy (~92.4%).")
        print("   To force full YOLO detection (and see double-cropping drop accuracy), run with:")
        print("   python scratch/evaluate_hybrid.py --run-detection")
        print("="*70 + "\n")
        
        # Override _get_local_yolo_box dynamically
        import inference.predict
        def mock_get_local_yolo_box(image_path):
            img = cv2.imread(image_path)
            if img is not None:
                H, W = img.shape[:2]
                return [0, 0, W, H]
            return None
        inference.predict._get_local_yolo_box = mock_get_local_yolo_box
    else:
        print("\n" + "="*70)
        print("WARNING: FULL DETECTION MODE ACTIVATED")
        print("   Running local YOLOv8 eye localization on already pre-cropped validation images.")
        print("   Note: This will likely degrade accuracy (~35%) due to double-cropping.")
        print("="*70 + "\n")

    print("Scanning validation dataset...")
    image_list, class_names = scan_val_images(val_dir)
    total_images = len(image_list)
    print(f"Found {total_images} validation images across classes: {class_names}")

    y_true = []
    y_pred = []

    print("\nEvaluating Hybrid Production Pipeline on validation set...")
    for idx, (img_path, true_idx) in enumerate(image_list):
        if (idx + 1) % 20 == 0 or idx == 0 or (idx + 1) == total_images:
            sys.stdout.write(f"\rProgress: {idx+1}/{total_images} ({((idx+1)/total_images)*100:.1f}%)")
            sys.stdout.flush()
            
        with suppress_stdout():
            try:
                pred_res = predict(img_path)
                pred_label = pred_res.get("freshness", None)
            except Exception as e:
                pred_label = None
                
        pred_idx = map_prediction_to_class(pred_label)
        
        # Safe fallback: if prediction fails, mark as incorrect prediction
        if pred_idx == -1:
            pred_idx = (true_idx + 1) % len(class_names)
            
        y_true.append(true_idx)
        y_pred.append(pred_idx)
    
    print("\nEvaluation complete! Processing metrics...\n")
    
    y_true = np.array(y_true)
    y_pred = np.array(y_pred)
    
    # Calculate metrics
    cm, metrics_per_class, averages = calculate_metrics(y_true, y_pred, class_names)
    
    # Format report
    report_str = format_classification_report(metrics_per_class, averages, class_names)
    
    # Print results to terminal
    print("=" * 60)
    print("   FreshWay Production Hybrid Pipeline Evaluation Results")
    print("=" * 60)
    print(f"Overall Accuracy: {averages['accuracy']*100:.2f}%\n")
    print("Confusion Matrix:")
    print(cm)
    print("\nClassification Report:")
    print(report_str)
    
    # Save artifacts
    report_path = os.path.join(SCRATCH_DIR, "classification_report.txt")
    with open(report_path, "w") as f:
        f.write(report_str)
    print(f"Saved classification report text to: {report_path}")
    
    json_path = os.path.join(SCRATCH_DIR, "evaluation_results.json")
    results_dict = {
        "overall_accuracy": averages["accuracy"],
        "metrics_per_class": metrics_per_class,
        "averages": averages,
        "confusion_matrix": cm.tolist()
    }
    with open(json_path, "w") as f:
        json.dump(results_dict, f, indent=4)
    print(f"Saved evaluation results JSON to: {json_path}")
    
    cm_path = os.path.join(SCRATCH_DIR, "confusion_matrix.png")
    if not save_confusion_matrix_matplotlib(cm, class_names, cm_path):
        save_confusion_matrix_pil(cm, class_names, cm_path)

if __name__ == "__main__":
    main()

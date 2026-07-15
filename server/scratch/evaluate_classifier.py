import os
import numpy as np
import tensorflow as tf
import cv2

def load_val_data_manually(val_dir, target_size=(224, 224)):
    """Loads and preprocesses validation images manually, bypassing ImageDataGenerator."""
    class_names = sorted([d for d in os.listdir(val_dir) if os.path.isdir(os.path.join(val_dir, d))])
    x_list = []
    y_list = []
    
    for class_idx, class_name in enumerate(class_names):
        class_path = os.path.join(val_dir, class_name)
        for fname in sorted(os.listdir(class_path)):
            if fname.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp')):
                fpath = os.path.join(class_path, fname)
                try:
                    img = cv2.imread(fpath)
                    if img is None:
                        continue
                    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                    img = cv2.resize(img, target_size)
                    # MobileNetV2 normalizes inputs to the [-1, 1] range:
                    img_normalized = (img.astype(np.float32) / 127.5) - 1.0
                    x_list.append(img_normalized)
                    y_list.append(class_idx)
                except Exception as e:
                    print(f"Warning: Failed to load {fpath}: {e}")
                    
    return np.array(x_list), np.array(y_list), class_names

# ─── CONFIG ──────────────────────────────────────────────────────────────────
IMG_SIZE = (224, 224)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VAL_DIR = os.path.join(BASE_DIR, "data", "val")
MODEL_PATHS = [
    os.path.join(BASE_DIR, "models", "freshness_model_best.keras"),
    os.path.join(BASE_DIR, "models", "freshness_model_final.keras"),
]

def load_evaluation_model():
    for path in MODEL_PATHS:
        if os.path.exists(path):
            print(f"Loading model from: {path}")
            return tf.keras.models.load_model(path)
    raise FileNotFoundError("No trained freshness classifier model found inside models/ folder!")

def evaluate_using_numpy(y_true, y_pred, preds):
    """Fallback evaluation metrics calculated directly via NumPy."""
    classes = [0, 1, 2]
    class_names = ["Fresh", "Highly Fresh", "Not Fresh"] # order matching folder indexes during flow
    
    # 1. Confusion Matrix
    cm = np.zeros((3, 3), dtype=int)
    for t, p in zip(y_true, y_pred):
        cm[t, p] += 1
        
    print("\nCONFUSION MATRIX (NumPy Fallback):")
    print(f"{"Actual \\ Pred":15s} | {"Fresh":12s} | {"Highly Fresh":12s} | {"Not Fresh":12s}")
    print("-" * 65)
    for i in range(3):
        print(f"{class_names[i]:15s} | {cm[i, 0]:12d} | {cm[i, 1]:12d} | {cm[i, 2]:12d}")
        
    # 2. Precision, Recall, F1
    print("\nCLASSIFICATION REPORT (NumPy Fallback):")
    print(f"{"Class Name":15s} | {"Precision":10s} | {"Recall":10s} | {"F1-Score":10s} | {"Support":10s}")
    print("-" * 65)
    
    overall_correct = 0
    total_samples = len(y_true)
    
    for c in classes:
        tp = cm[c, c]
        fp = np.sum(cm[:, c]) - tp
        fn = np.sum(cm[c, :]) - tp
        support = np.sum(cm[c, :])
        
        overall_correct += tp
        
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
        
        print(f"{class_names[c]:15s} | {precision*100:9.2f}% | {recall*100:9.2f}% | {f1*100:9.2f}% | {support:10d}")
        
    overall_accuracy = overall_correct / total_samples if total_samples > 0 else 0.0
    print("-" * 65)
    print(f"{"Overall Accuracy":15s} | {overall_accuracy*100:9.2f}% | {"":10s} | {"":10s} | {total_samples:10d}")

    # 3. AUC calculations (One-vs-Rest trapezoidal approximation)
    print("\nAREA UNDER THE ROC CURVE (AUC):")
    print("-" * 65)
    for c in classes:
        # Convert multiclass true targets to binary (1 for class c, 0 for others)
        y_true_bin = (y_true == c).astype(int)
        y_scores = preds[:, c]
        
        # Sort scores and corresponding labels
        desc_score_indices = np.argsort(y_scores)[::-1]
        y_scores_sorted = y_scores[desc_score_indices]
        y_true_bin_sorted = y_true_bin[desc_score_indices]
        
        # Compute TPR and FPR thresholds
        tps = np.cumsum(y_true_bin_sorted)
        fps = np.cumsum(1 - y_true_bin_sorted)
        
        total_pos = np.sum(y_true_bin)
        total_neg = len(y_true_bin) - total_pos
        
        tpr = tps / total_pos if total_pos > 0 else np.zeros_like(tps)
        fpr = fps / total_neg if total_neg > 0 else np.zeros_like(fps)
        
        # Add starting point (0, 0)
        tpr = np.r_[0, tpr]
        fpr = np.r_[0, fpr]
        
        # Calculate Area under curve using trapezoidal rule (auc = sum((x_i - x_i-1) * (y_i + y_i-1) / 2))
        auc_val = 0.0
        for idx in range(1, len(fpr)):
            auc_val += (fpr[idx] - fpr[idx-1]) * (tpr[idx] + tpr[idx-1]) / 2.0
            
        print(f"Class {c} ({class_names[c]}): AUC = {auc_val:.4f}")
    print()

def main():
    print("\n" + "="*50)
    print("      FreshWay Freshness Model Evaluator")
    print("="*50)

    if not os.path.exists(VAL_DIR):
        print(f"ERROR: Validation directory not found at: {VAL_DIR}")
        return

    # Load Model
    try:
        model = load_evaluation_model()
    except Exception as e:
        print(e)
        return

    # Load and preprocess validation data manually
    print("Scanning and loading validation images...")
    x_val, y_true, class_names = load_val_data_manually(VAL_DIR, target_size=IMG_SIZE)
    
    if len(x_val) == 0:
        print("ERROR: No images found inside validation directory!")
        return

    print(f"Evaluating model on {len(x_val)} validation samples...")
    preds = model.predict(x_val, batch_size=32, verbose=1)
    
    y_pred = np.argmax(preds, axis=1)

    # Class index map
    class_indices = {name: idx for idx, name in enumerate(class_names)}
    print(f"Class indices map: {class_indices}")

    # Check for scikit-learn
    try:
        from sklearn.metrics import classification_report, confusion_matrix, roc_curve, auc
        from sklearn.preprocessing import label_binarize
        
        print("\nCONFUSION MATRIX (scikit-learn):")
        cm = confusion_matrix(y_true, y_pred)
        print(cm)
        
        print("\nCLASSIFICATION REPORT (scikit-learn):")
        print(classification_report(y_true, y_pred, target_names=class_names))
        
        # Binary target representation for ROC/AUC
        classes = [0, 1, 2]
        y_true_bin = label_binarize(y_true, classes=classes)
        
        print("\nROC AUC (scikit-learn):")
        for i, c_name in enumerate(class_names):
            fpr, tpr, _ = roc_curve(y_true_bin[:, i], preds[:, i])
            roc_auc = auc(fpr, tpr)
            print(f"Class {i} ({c_name}) AUC: {roc_auc:.4f}")
            
    except ImportError:
        print("\n[INFO] scikit-learn not found in this environment. Falling back to native NumPy calculations...")
        evaluate_using_numpy(y_true, y_pred, preds)

if __name__ == "__main__":
    main()

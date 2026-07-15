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

from inference.preprocess import preprocess_for_inference

# Inject preprocessors into builtins to avoid Keras Lambda deserialization NameErrors
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input as mobilenet_preprocess
from tensorflow.keras.applications.efficientnet import preprocess_input as efficientnet_preprocess
import builtins
builtins.mobilenet_preprocess = mobilenet_preprocess
builtins.efficientnet_preprocess = efficientnet_preprocess
_ = (builtins, mobilenet_preprocess, efficientnet_preprocess)  # Prevent unused import warnings

# Paths
VAL_DIR = os.path.join(BASE_DIR, "data", "val")
ENSEMBLE_PATH = os.path.join(BASE_DIR, "models", "freshness_ensemble_best.keras")
LEGACY_PATH = os.path.join(BASE_DIR, "models", "freshness_model_best.keras")

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

def load_legacy_model():
    if os.path.exists(LEGACY_PATH):
        print(f"Loading legacy MobileNetV2 model: {LEGACY_PATH}")
        return tf.keras.models.load_model(LEGACY_PATH)
    return None

def build_isolated_models(ensemble_model):
    """
    Isolates the branches of the ensemble model by zeroing out the opposite branch's features
    before they enter the shared fusion head.
    """
    raw_input = ensemble_model.input
    
    # Get outputs from the dense branches
    m_branch = ensemble_model.get_layer("mobilenet_dropout").output
    e_branch = ensemble_model.get_layer("efficientnet_dropout").output
    
    # Create zero Tensors of the same shape using Keras Lambda layers to avoid Keras 3 symbolic errors
    from tensorflow.keras.layers import Lambda
    m_zeros = Lambda(lambda x: tf.zeros_like(x), name="m_zeros")(m_branch)
    e_zeros = Lambda(lambda x: tf.zeros_like(x), name="e_zeros")(e_branch)
    
    # Define common fusion head layers
    concat = ensemble_model.get_layer("fusion_concat")
    dense1 = ensemble_model.get_layer("fusion_dense1")
    bn1 = ensemble_model.get_layer("fusion_bn1")
    drop1 = ensemble_model.get_layer("fusion_dropout1")
    dense2 = ensemble_model.get_layer("fusion_dense2")
    bn2 = ensemble_model.get_layer("fusion_bn2")
    drop2 = ensemble_model.get_layer("fusion_dropout2")
    output_layer = ensemble_model.get_layer("classification_output")
    
    # ─── 1. MobileNetV2 Branch Only ───
    m_concat = concat([m_branch, e_zeros])
    x_m = dense1(m_concat)
    x_m = bn1(x_m)
    x_m = drop1(x_m)
    x_m = dense2(x_m)
    x_m = bn2(x_m)
    x_m = drop2(x_m)
    m_only_out = output_layer(x_m)
    mobilenet_branch_model = tf.keras.models.Model(inputs=raw_input, outputs=m_only_out)
    
    # ─── 2. EfficientNetB0 Branch Only ───
    e_concat = concat([m_zeros, e_branch])
    x_e = dense1(e_concat)
    x_e = bn1(x_e)
    x_e = drop1(x_e)
    x_e = dense2(x_e)
    x_e = bn2(x_e)
    x_e = drop2(x_e)
    e_only_out = output_layer(x_e)
    efficientnet_branch_model = tf.keras.models.Model(inputs=raw_input, outputs=e_only_out)
    
    return mobilenet_branch_model, efficientnet_branch_model

def evaluate_model(model, image_list, is_legacy=False):
    correct = 0
    total = len(image_list)
    
    for idx, (fpath, true_idx) in enumerate(image_list):
        # Preprocessing
        if is_legacy:
            processed = preprocess_for_inference(fpath)
        else:
            # Ensemble model expects raw [0, 255] RGB resized to 224x224
            img = cv2.imread(fpath)
            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            img_resized = cv2.resize(img_rgb, (224, 224))
            processed = np.expand_dims(img_resized.astype(np.float32), axis=0)
            
        preds = model.predict(processed, verbose=0)[0]
        
        # Align predictions order
        if is_legacy:
            # Legacy Model CLASS_NAMES = ["fresh", "highly_fresh", "not_fresh"] (order matching folder)
            pred_idx = np.argmax(preds)
        else:
            # Ensemble Model outputs [fresh, highly_fresh, not_fresh]
            pred_idx = np.argmax(preds)
            
        if pred_idx == true_idx:
            correct += 1
            
    return correct / total if total > 0 else 0.0

def main():
    print("=" * 60)
    print("  FreshWay Individual vs. Hybrid Comparison Evaluator")
    print("=" * 60)
    
    if not os.path.exists(VAL_DIR):
        print(f"Validation directory not found at: {VAL_DIR}")
        return
        
    image_list, class_names = scan_val_images(VAL_DIR)
    print(f"Loaded {len(image_list)} validation images from directory.\n")
    
    # 1. Evaluate Legacy MobileNetV2 model
    legacy_model = load_legacy_model()
    legacy_acc = 0.0
    if legacy_model:
        print("Evaluating legacy MobileNetV2 model (baseline)...")
        legacy_acc = evaluate_model(legacy_model, image_list, is_legacy=True)
        print(f"Legacy MobileNetV2 Accuracy: {legacy_acc*100:.2f}%\n")
    else:
        print("Legacy MobileNetV2 model not found, skipping baseline.\n")
        
    # Load Ensemble Model
    if not os.path.exists(ENSEMBLE_PATH):
        print(f"Ensemble model not found at {ENSEMBLE_PATH}!")
        return
        
    print(f"Loading Ensemble model: {ENSEMBLE_PATH}")
    ensemble_model = tf.keras.models.load_model(ENSEMBLE_PATH, safe_mode=False)
    
    # Isolate models
    print("Isolating MobileNetV2 and EfficientNetB0 branches...")
    m_only_model, e_only_model = build_isolated_models(ensemble_model)
    
    # 2. Evaluate MobileNetV2 branch
    print("Evaluating MobileNetV2 branch (in ensemble)...")
    m_branch_acc = evaluate_model(m_only_model, image_list, is_legacy=False)
    
    # 3. Evaluate EfficientNetB0 branch
    print("Evaluating EfficientNetB0 branch (in ensemble)...")
    e_branch_acc = evaluate_model(e_only_model, image_list, is_legacy=False)
    
    # 4. Evaluate Full Ensemble Model
    print("Evaluating Full Ensemble model (Hybrid)...")
    ensemble_acc = evaluate_model(ensemble_model, image_list, is_legacy=False)
    
    print("\n" + "=" * 60)
    print("             COMPARISON EVALUATION SUMMARY")
    print("=" * 60)
    if legacy_model:
        print(f"1. Legacy Standalone MobileNetV2:   {legacy_acc*100:.2f}%")
    print(f"2. Ensemble - MobileNetV2 Branch:   {m_branch_acc*100:.2f}%")
    print(f"3. Ensemble - EfficientNetB0 Branch: {e_branch_acc*100:.2f}%")
    print(f"4. Full Ensemble (Hybrid):          {ensemble_acc*100:.2f}%")
    print("=" * 60)
    print("Interpretation:")
    print(" - The Full Ensemble (Hybrid) should outperform the individual branches")
    print("   as they capture different features (edges/textures vs colors).")
    print("=" * 60)

if __name__ == "__main__":
    main()

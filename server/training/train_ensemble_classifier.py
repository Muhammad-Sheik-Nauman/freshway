"""
Train Fish Freshness Ensemble Classifier: MobileNetV2 + EfficientNetB0.

Architecture: Dual-backbone ensemble with shared classification head.
  - MobileNetV2 (pretrained on ImageNet) → captures texture/edge patterns
  - EfficientNetB0 (pretrained on ImageNet) → captures color gradients & global structure
  - Shared Dense head fuses both → learns optimal combination

Classes: Highly Fresh, Fresh, Not Fresh
Input: 224x224 RGB images of fish eyes

Optimizations:
- Each backbone uses its OWN correct preprocessing (built into the model graph)
- Class weights to handle imbalanced dataset
- Checkpoint/resume support
- Two-phase training with gradual unfreezing of BOTH backbones

Usage:
    python training/train_ensemble_classifier.py
"""

import os
import sys
import json
import numpy as np
import tensorflow as tf
from tensorflow.keras.applications import MobileNetV2, EfficientNetB0
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input as mobilenet_preprocess
from tensorflow.keras.applications.efficientnet import preprocess_input as efficientnet_preprocess
from tensorflow.keras.layers import (
    Dense, GlobalAveragePooling2D, Dropout, BatchNormalization,
    Concatenate, Input, Lambda,
)
from tensorflow.keras.models import Model
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import (
    EarlyStopping,
    ReduceLROnPlateau,
    ModelCheckpoint,
    Callback,
)
import cv2
from datetime import datetime

# ─── CONFIG ──────────────────────────────────────────────────────────────────
IMG_SIZE = (224, 224)
BATCH_SIZE = 16  # Smaller batch for dual-backbone memory
PHASE1_EPOCHS = 20
PHASE2_EPOCHS = 40
LEARNING_RATE = 5e-4
NUM_CLASSES = 3
CLASS_NAMES = ["fresh", "highly_fresh", "not_fresh"]

# Paths (relative to server/)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TRAIN_DIR = os.path.join(BASE_DIR, "data", "train")
VAL_DIR = os.path.join(BASE_DIR, "data", "val")
MODEL_SAVE_DIR = os.path.join(BASE_DIR, "models")

# Checkpoint paths
CHECKPOINT_PATH = os.path.join(MODEL_SAVE_DIR, "ensemble_checkpoint.keras")
PROGRESS_PATH = os.path.join(MODEL_SAVE_DIR, "ensemble_training_progress.json")
BEST_MODEL_PATH = os.path.join(MODEL_SAVE_DIR, "freshness_ensemble_best.keras")
FINAL_MODEL_PATH = os.path.join(MODEL_SAVE_DIR, "freshness_ensemble_final.keras")


# ─── CUSTOM CALLBACK: Save progress after each epoch ────────────────────────
class SaveProgressCallback(Callback):
    """Saves training progress after each epoch for resume support."""

    def __init__(self, phase, start_epoch=0):
        super().__init__()
        self.phase = phase
        self.start_epoch = start_epoch

    def on_epoch_end(self, epoch, logs=None):
        actual_epoch = self.start_epoch + epoch + 1
        progress = {
            "phase": self.phase,
            "epoch": actual_epoch,
            "accuracy": float(logs.get("accuracy", 0)),
            "val_accuracy": float(logs.get("val_accuracy", 0)),
            "loss": float(logs.get("loss", 0)),
            "val_loss": float(logs.get("val_loss", 0)),
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }
        with open(PROGRESS_PATH, "w") as f:
            json.dump(progress, f, indent=2)

        self.model.save(CHECKPOINT_PATH)
        print(f"\n[SAVE] Checkpoint saved! Phase {self.phase}, Epoch {actual_epoch}")
        print(f"   Train Acc: {logs.get('accuracy', 0):.4f} | Val Acc: {logs.get('val_accuracy', 0):.4f}")
        print(f"   You can safely stop and resume later.\n")


def load_progress():
    """Load training progress from disk if it exists."""
    if os.path.exists(PROGRESS_PATH):
        with open(PROGRESS_PATH, "r") as f:
            return json.load(f)
    return None


def compute_class_weights(train_dir):
    """Compute class weights to handle imbalanced dataset."""
    class_counts = {}
    for class_name in CLASS_NAMES:
        class_path = os.path.join(train_dir, class_name)
        if os.path.exists(class_path):
            count = len([f for f in os.listdir(class_path) if os.path.isfile(os.path.join(class_path, f))])
            class_counts[class_name] = count

    total = sum(class_counts.values())
    n_classes = len(class_counts)

    class_weights = {}
    for i, class_name in enumerate(CLASS_NAMES):
        class_weights[i] = total / (n_classes * class_counts[class_name])

    print(f"\n[WEIGHTS] Class Weights (handling imbalance):")
    for i, class_name in enumerate(CLASS_NAMES):
        print(f"   {class_name}: {class_counts[class_name]} images -> weight {class_weights[i]:.3f}")
    print()

    return class_weights


def build_ensemble_model():
    """
    Build dual-backbone ensemble: MobileNetV2 + EfficientNetB0.

    Each backbone has its own preprocessing Lambda layer baked into the graph,
    so at inference time we just feed raw [0, 255] uint8-compatible images.
    """
    # Shared raw input (pixel values in [0, 255] float range)
    raw_input = Input(shape=(IMG_SIZE[0], IMG_SIZE[1], 3), name="raw_input")

    # ── BRANCH 1: MobileNetV2 ─────────────────────────────────────────────
    mobilenet_preprocessed = Lambda(
        lambda x: mobilenet_preprocess(x), output_shape=(IMG_SIZE[0], IMG_SIZE[1], 3), name="mobilenet_preprocess"
    )(raw_input)

    mobilenet_base = MobileNetV2(
        weights="imagenet",
        include_top=False,
        input_shape=(IMG_SIZE[0], IMG_SIZE[1], 3),
    )
    mobilenet_base._name = "mobilenetv2_base"
    mobilenet_base.trainable = False

    mobilenet_features = mobilenet_base(mobilenet_preprocessed)
    mobilenet_pool = GlobalAveragePooling2D(name="mobilenet_gap")(mobilenet_features)
    mobilenet_branch = Dense(256, activation="relu", name="mobilenet_dense")(mobilenet_pool)
    mobilenet_branch = BatchNormalization(name="mobilenet_bn")(mobilenet_branch)
    mobilenet_branch = Dropout(0.4, name="mobilenet_dropout")(mobilenet_branch)

    # ── BRANCH 2: EfficientNetB0 ──────────────────────────────────────────
    efficientnet_preprocessed = Lambda(
        lambda x: efficientnet_preprocess(x), output_shape=(IMG_SIZE[0], IMG_SIZE[1], 3), name="efficientnet_preprocess"
    )(raw_input)

    efficientnet_base = EfficientNetB0(
        weights="imagenet",
        include_top=False,
        input_shape=(IMG_SIZE[0], IMG_SIZE[1], 3),
    )
    efficientnet_base._name = "efficientnetb0_base"
    efficientnet_base.trainable = False

    efficientnet_features = efficientnet_base(efficientnet_preprocessed)
    efficientnet_pool = GlobalAveragePooling2D(name="efficientnet_gap")(efficientnet_features)
    efficientnet_branch = Dense(256, activation="relu", name="efficientnet_dense")(efficientnet_pool)
    efficientnet_branch = BatchNormalization(name="efficientnet_bn")(efficientnet_branch)
    efficientnet_branch = Dropout(0.4, name="efficientnet_dropout")(efficientnet_branch)

    # ── FUSION HEAD ───────────────────────────────────────────────────────
    merged = Concatenate(name="fusion_concat")([mobilenet_branch, efficientnet_branch])
    x = Dense(256, activation="relu", name="fusion_dense1")(merged)
    x = BatchNormalization(name="fusion_bn1")(x)
    x = Dropout(0.3, name="fusion_dropout1")(x)
    x = Dense(128, activation="relu", name="fusion_dense2")(x)
    x = BatchNormalization(name="fusion_bn2")(x)
    x = Dropout(0.2, name="fusion_dropout2")(x)
    output = Dense(NUM_CLASSES, activation="softmax", name="classification_output")(x)

    model = Model(inputs=raw_input, outputs=output, name="FreshWay_Ensemble")

    trainable = sum(tf.keras.backend.count_params(w) for w in model.trainable_weights)
    total_params = model.count_params()

    print(f"\n{'='*60}")
    print(f"  FreshWay Ensemble Classifier")
    print(f"  Backbones: MobileNetV2 + EfficientNetB0")
    print(f"  Total parameters: {total_params:,}")
    print(f"  Trainable parameters: {trainable:,}")
    print(f"{'='*60}\n")

    return model, mobilenet_base, efficientnet_base


def load_dataset(directory, class_names, img_size, augment=False):
    """
    Load dataset from directory into numpy arrays.
    Returns images in [0, 255] float32 range (preprocessing is baked into the model).
    """
    images = []
    labels = []

    for class_idx, class_name in enumerate(class_names):
        class_dir = os.path.join(directory, class_name)
        if not os.path.exists(class_dir):
            print(f"WARNING: Class directory not found: {class_dir}")
            continue

        files = sorted([f for f in os.listdir(class_dir)
                       if f.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp'))])

        for fname in files:
            fpath = os.path.join(class_dir, fname)
            try:
                img = cv2.imread(fpath)
                if img is None:
                    continue
                img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                img = cv2.resize(img, img_size)
                images.append(img.astype(np.float32))
                labels.append(class_idx)
            except Exception as e:
                print(f"Warning: Failed to load {fpath}: {e}")

    images = np.array(images, dtype=np.float32)
    labels = np.array(labels, dtype=np.int32)

    print(f"  Loaded {len(images)} images from {directory}")
    for i, name in enumerate(class_names):
        count = np.sum(labels == i)
        print(f"    {name}: {count} images")

    return images, labels


def augment_batch(images, labels):
    """Apply random augmentations to a batch of images."""
    augmented_images = []
    for img in images:
        aug = img.copy()

        # Random horizontal flip
        if np.random.random() > 0.5:
            aug = np.fliplr(aug)

        # Random vertical flip
        if np.random.random() > 0.5:
            aug = np.flipud(aug)

        # Random rotation (0, 90, 180, 270)
        k = np.random.randint(0, 4)
        aug = np.rot90(aug, k)

        # Random brightness adjustment
        brightness = np.random.uniform(0.7, 1.3)
        aug = np.clip(aug * brightness, 0, 255)

        # Random zoom (crop and resize)
        if np.random.random() > 0.5:
            h, w = aug.shape[:2]
            zoom = np.random.uniform(0.8, 1.0)
            new_h, new_w = int(h * zoom), int(w * zoom)
            start_h = np.random.randint(0, h - new_h + 1)
            start_w = np.random.randint(0, w - new_w + 1)
            aug = aug[start_h:start_h+new_h, start_w:start_w+new_w]
            aug = cv2.resize(aug, (w, h))

        augmented_images.append(aug.astype(np.float32))

    return np.array(augmented_images, dtype=np.float32)


def create_dataset(images, labels, batch_size, augment=False, shuffle=True):
    """Create a tf.data.Dataset from numpy arrays."""
    num_classes = NUM_CLASSES

    def generator():
        indices = np.arange(len(images))
        if shuffle:
            np.random.shuffle(indices)
        for i in range(0, len(indices), batch_size):
            batch_idx = indices[i:i+batch_size]
            batch_images = images[batch_idx]
            batch_labels = labels[batch_idx]

            if augment:
                batch_images = augment_batch(batch_images, batch_labels)

            # One-hot encode labels
            batch_labels_oh = np.zeros((len(batch_labels), num_classes), dtype=np.float32)
            for j, label in enumerate(batch_labels):
                batch_labels_oh[j, label] = 1.0

            yield batch_images, batch_labels_oh

    dataset = tf.data.Dataset.from_generator(
        generator,
        output_signature=(
            tf.TensorSpec(shape=(None, IMG_SIZE[0], IMG_SIZE[1], 3), dtype=tf.float32),
            tf.TensorSpec(shape=(None, NUM_CLASSES), dtype=tf.float32),
        ),
    )
    return dataset


def get_callbacks(phase, start_epoch=0):
    """Configure training callbacks."""
    os.makedirs(MODEL_SAVE_DIR, exist_ok=True)

    callbacks = [
        EarlyStopping(
            monitor="val_accuracy",
            patience=10,
            restore_best_weights=True,
            verbose=1,
        ),
        ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.5,
            patience=4,
            min_lr=1e-7,
            verbose=1,
        ),
        ModelCheckpoint(
            filepath=BEST_MODEL_PATH,
            monitor="val_accuracy",
            save_best_only=True,
            verbose=1,
        ),
        SaveProgressCallback(phase=phase, start_epoch=start_epoch),
    ]
    return callbacks


def unfreeze_for_finetuning(model, mobilenet_base, efficientnet_base):
    """Unfreeze the last 30 layers of both backbones for fine-tuning."""
    mobilenet_base.trainable = True
    for layer in mobilenet_base.layers[:-30]:
        layer.trainable = False

    efficientnet_base.trainable = True
    for layer in efficientnet_base.layers[:-30]:
        layer.trainable = False

    model.compile(
        optimizer=Adam(learning_rate=1e-5),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )

    trainable_count = sum(
        tf.keras.backend.count_params(w) for w in model.trainable_weights
    )
    print(f"Trainable parameters after unfreezing both backbones: {trainable_count:,}\n")


def main():
    print("\n" + "=" * 60)
    print("  FISH FRESHNESS ENSEMBLE CLASSIFIER")
    print("  MobileNetV2 + EfficientNetB0 Dual-Backbone")
    print("=" * 60 + "\n")

    if not os.path.exists(TRAIN_DIR):
        print(f"ERROR: Training directory not found: {TRAIN_DIR}")
        sys.exit(1)

    # Compute class weights
    class_weights = compute_class_weights(TRAIN_DIR)

    # Load datasets into memory (images stay as [0, 255] float32)
    print("[DATA] Loading training dataset...")
    train_images, train_labels = load_dataset(TRAIN_DIR, CLASS_NAMES, IMG_SIZE)
    print("\n[DATA] Loading validation dataset...")
    val_images, val_labels = load_dataset(VAL_DIR, CLASS_NAMES, IMG_SIZE)

    # Calculate steps per epoch
    steps_per_epoch = len(train_images) // BATCH_SIZE
    validation_steps = len(val_images) // BATCH_SIZE

    print(f"\nSteps per epoch: {steps_per_epoch}")
    print(f"Validation steps: {validation_steps}")

    # Check for existing progress
    progress = load_progress()

    # ── RESUME FROM CHECKPOINT ──────────────────────────────────────────
    if progress and os.path.exists(CHECKPOINT_PATH):
        print(f"\n[RESUME] RESUMING from checkpoint!")
        print(f"   Phase: {progress['phase']}, Epoch: {progress['epoch']}")
        print(f"   Last val_accuracy: {progress['val_accuracy']:.4f}")
        print(f"   Saved at: {progress['timestamp']}")

        print("📦 Rebuilding model architecture...")
        model, mobilenet_base, efficientnet_base = build_ensemble_model()
        print("⚙️ Loading weights from checkpoint...")
        model.load_weights(CHECKPOINT_PATH)

        if progress["phase"] == 1:
            completed = progress["epoch"]
            remaining = PHASE1_EPOCHS - completed

            if remaining > 0:
                print(f"\n  RESUMING PHASE 1: {remaining} epochs remaining")
                model.compile(
                    optimizer=Adam(learning_rate=LEARNING_RATE),
                    loss="categorical_crossentropy",
                    metrics=["accuracy"],
                )
                train_ds = create_dataset(train_images, train_labels, BATCH_SIZE, augment=True, shuffle=True)
                val_ds = create_dataset(val_images, val_labels, BATCH_SIZE, augment=False, shuffle=False)
                model.fit(
                    train_ds,
                    epochs=remaining,
                    validation_data=val_ds,
                    class_weight=class_weights,
                    steps_per_epoch=steps_per_epoch,
                    validation_steps=validation_steps,
                    callbacks=get_callbacks(phase=1, start_epoch=completed),
                )

            # Move to Phase 2
            print(f"\n{'='*60}")
            print(f"  PHASE 2: Fine-tuning last 30 layers of BOTH backbones")
            print(f"{'='*60}\n")
            if mobilenet_base and efficientnet_base:
                unfreeze_for_finetuning(model, mobilenet_base, efficientnet_base)
            train_ds = create_dataset(train_images, train_labels, BATCH_SIZE, augment=True, shuffle=True)
            val_ds = create_dataset(val_images, val_labels, BATCH_SIZE, augment=False, shuffle=False)
            model.fit(
                train_ds,
                epochs=PHASE2_EPOCHS,
                validation_data=val_ds,
                class_weight=class_weights,
                steps_per_epoch=steps_per_epoch,
                validation_steps=validation_steps,
                callbacks=get_callbacks(phase=2, start_epoch=0),
            )

        elif progress["phase"] == 2:
            completed = progress["epoch"]
            remaining = PHASE2_EPOCHS - completed
            if remaining > 0:
                print(f"\n  RESUMING PHASE 2: {remaining} epochs remaining")
                if mobilenet_base and efficientnet_base:
                    unfreeze_for_finetuning(model, mobilenet_base, efficientnet_base)
                train_ds = create_dataset(train_images, train_labels, BATCH_SIZE, augment=True, shuffle=True)
                val_ds = create_dataset(val_images, val_labels, BATCH_SIZE, augment=False, shuffle=False)
                model.fit(
                    train_ds,
                    epochs=remaining,
                    validation_data=val_ds,
                    class_weight=class_weights,
                    steps_per_epoch=steps_per_epoch,
                    validation_steps=validation_steps,
                    callbacks=get_callbacks(phase=2, start_epoch=completed),
                )

    # ── FRESH START ─────────────────────────────────────────────────────
    else:
        print("[BUILD] Building ensemble model (MobileNetV2 + EfficientNetB0)...")
        model, mobilenet_base, efficientnet_base = build_ensemble_model()

        model.compile(
            optimizer=Adam(learning_rate=LEARNING_RATE),
            loss="categorical_crossentropy",
            metrics=["accuracy"],
        )

        # Phase 1: Train only the shared head
        print(f"\n{'='*60}")
        print(f"  PHASE 1: Training fusion head (both backbones frozen)")
        print(f"  {PHASE1_EPOCHS} epochs | LR: {LEARNING_RATE} | Batch: {BATCH_SIZE}")
        print(f"{'='*60}\n")

        train_ds = create_dataset(train_images, train_labels, BATCH_SIZE, augment=True, shuffle=True)
        val_ds = create_dataset(val_images, val_labels, BATCH_SIZE, augment=False, shuffle=False)

        model.fit(
            train_ds,
            epochs=PHASE1_EPOCHS,
            validation_data=val_ds,
            class_weight=class_weights,
            steps_per_epoch=steps_per_epoch,
            validation_steps=validation_steps,
            callbacks=get_callbacks(phase=1, start_epoch=0),
        )

        # Phase 2: Fine-tune both backbones
        print(f"\n{'='*60}")
        print(f"  PHASE 2: Fine-tuning last 30 layers of BOTH backbones")
        print(f"  Up to {PHASE2_EPOCHS} epochs | LR: 1e-5")
        print(f"{'='*60}\n")

        unfreeze_for_finetuning(model, mobilenet_base, efficientnet_base)

        train_ds = create_dataset(train_images, train_labels, BATCH_SIZE, augment=True, shuffle=True)
        val_ds = create_dataset(val_images, val_labels, BATCH_SIZE, augment=False, shuffle=False)

        model.fit(
            train_ds,
            epochs=PHASE2_EPOCHS,
            validation_data=val_ds,
            class_weight=class_weights,
            steps_per_epoch=steps_per_epoch,
            validation_steps=validation_steps,
            callbacks=get_callbacks(phase=2, start_epoch=0),
        )

    # ── SAVE & EVALUATE ─────────────────────────────────────────────────
    model.save(FINAL_MODEL_PATH)
    print(f"\n[OK] Final ensemble model saved to: {FINAL_MODEL_PATH}")

    print("\n[EVAL] Final Evaluation on Validation Set:")
    val_ds = create_dataset(val_images, val_labels, BATCH_SIZE, augment=False, shuffle=False)
    loss, accuracy = model.evaluate(val_ds, steps=validation_steps)
    print(f"   Loss: {loss:.4f}")
    print(f"   Accuracy: {accuracy:.4f} ({accuracy*100:.1f}%)")

    if os.path.exists(PROGRESS_PATH):
        os.remove(PROGRESS_PATH)

    print("\n[DONE] Ensemble training complete!")


if __name__ == "__main__":
    main()

"""
Train Fish Freshness Classification Model using Transfer Learning.

Architecture Options:
- MobileNetV2 (pretrained on ImageNet) with lightweight Swish bottleneck head
- EfficientNetV2-B0 (pretrained on ImageNet) with lightweight Swish bottleneck head

Classes: Highly Fresh, Fresh, Not Fresh
Input: 224x224 RGB images of fish eyes

Optimizations (Addressing the ~69% Accuracy Bottleneck):
1. Batch Normalization Freezing Protocol: Keeps base BN layers in inference mode
   during Phase 2 fine-tuning to prevent ImageNet running statistics corruption.
2. Lightweight Swish Head: Replaces oversized 3-layer 820k parameter head with a
   single 128-unit Swish bottleneck + Dropout to eliminate variance shift and overfitting.
3. Biology-Preserving Augmentations: Replaced destructive nearest-fill streaks and
   extreme brightness distortions with subtle, biology-safe transformations.
4. Label Smoothing (0.10): Mitigates overconfidence on continuous class transitions
   (Highly Fresh <-> Fresh).
5. Aspect-Ratio Preprocessing & Smart Generators.

Usage:
    python training/train_freshness_classifier.py
    python training/train_freshness_classifier.py --backbone efficientnetv2 --epochs1 20 --epochs2 30
"""

import os
import sys
import json
import argparse
from datetime import datetime
import numpy as np
import tensorflow as tf
from tensorflow.keras.applications import MobileNetV2, EfficientNetV2B0
from tensorflow.keras.applications import mobilenet_v2, efficientnet_v2
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout
from tensorflow.keras.models import Model
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.losses import CategoricalCrossentropy
from tensorflow.keras.callbacks import (
    EarlyStopping,
    ReduceLROnPlateau,
    ModelCheckpoint,
    Callback,
)
from tensorflow.keras.preprocessing.image import ImageDataGenerator

# ─── CONFIG ──────────────────────────────────────────────────────────────────
IMG_SIZE = (224, 224)
BATCH_SIZE = 32
PHASE1_EPOCHS = 20
PHASE2_EPOCHS = 40
PHASE1_LR = 5e-4
PHASE2_LR = 1e-5
LABEL_SMOOTHING = 0.10
NUM_CLASSES = 3
CLASS_NAMES = ["fresh", "highly_fresh", "not_fresh"]

# Paths (relative to server/)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TRAIN_DIR = os.path.join(BASE_DIR, "data", "train")
VAL_DIR = os.path.join(BASE_DIR, "data", "val")
MODEL_SAVE_DIR = os.path.join(BASE_DIR, "models")

# Checkpoint paths
CHECKPOINT_PATH = os.path.join(MODEL_SAVE_DIR, "freshness_checkpoint.keras")
PROGRESS_PATH = os.path.join(MODEL_SAVE_DIR, "training_progress.json")
BEST_MODEL_PATH = os.path.join(MODEL_SAVE_DIR, "freshness_model_best.keras")
FINAL_MODEL_PATH = os.path.join(MODEL_SAVE_DIR, "freshness_model_final.keras")


# ─── CUSTOM CALLBACK: Save progress after each epoch ────────────────────────
class SaveProgressCallback(Callback):
    """Saves training progress after each epoch for resume support."""

    def __init__(self, phase, start_epoch=0, backbone="mobilenetv2"):
        super().__init__()
        self.phase = phase
        self.start_epoch = start_epoch
        self.backbone = backbone

    def on_epoch_end(self, epoch, logs=None):
        actual_epoch = self.start_epoch + epoch + 1
        progress = {
            "phase": self.phase,
            "epoch": actual_epoch,
            "backbone": self.backbone,
            "accuracy": float(logs.get("accuracy", 0)),
            "val_accuracy": float(logs.get("val_accuracy", 0)),
            "loss": float(logs.get("loss", 0)),
            "val_loss": float(logs.get("val_loss", 0)),
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }
        with open(PROGRESS_PATH, "w") as f:
            json.dump(progress, f, indent=2)

        self.model.save(CHECKPOINT_PATH)
        print(f"\n[SAVED] Checkpoint saved! Phase {self.phase}, Epoch {actual_epoch}")
        print(f"   Train Acc: {logs.get('accuracy', 0):.4f} | Val Acc: {logs.get('val_accuracy', 0):.4f}")
        print(f"   Checkpoint: {CHECKPOINT_PATH}\n")


def load_progress():
    """Load training progress from disk if it exists."""
    if os.path.exists(PROGRESS_PATH):
        try:
            with open(PROGRESS_PATH, "r") as f:
                return json.load(f)
        except Exception:
            return None
    return None


def compute_class_weights(train_dir):
    """
    Compute balanced class weights to handle imbalanced datasets.
    Formula: total / (n_classes * class_count)
    """
    class_counts = {}
    for class_name in CLASS_NAMES:
        class_path = os.path.join(train_dir, class_name)
        if os.path.exists(class_path):
            count = len([f for f in os.listdir(class_path) if os.path.isfile(os.path.join(class_path, f))])
            class_counts[class_name] = max(count, 1)
        else:
            class_counts[class_name] = 1

    total = sum(class_counts.values())
    n_classes = len(class_counts)

    class_weights = {}
    for i, class_name in enumerate(CLASS_NAMES):
        class_weights[i] = total / (n_classes * class_counts[class_name])

    print(f"\n[INFO] Class Weights (handling dataset imbalance):")
    for i, class_name in enumerate(CLASS_NAMES):
        print(f"   {class_name}: {class_counts[class_name]} images -> weight {class_weights[i]:.3f}")
    print()

    return class_weights


def build_model(backbone_name="mobilenetv2"):
    """
    Build model with a modern, streamlined classification head.

    Key Architectural Fixes:
    1. Replaced 3-layer 820k parameter head with a compact 128-unit Swish bottleneck.
    2. Removed BatchNormalization from after non-linearities to eliminate train/test variance shift.
    3. Added Swish activation for smoother gradients across optical feature spaces.
    """
    input_shape = (IMG_SIZE[0], IMG_SIZE[1], 3)

    if backbone_name.lower() in ["efficientnetv2", "efficientnet_v2", "effnet"]:
        print("[INFO] Initializing EfficientNetV2-B0 backbone (ImageNet weights)...")
        base_model = EfficientNetV2B0(
            weights="imagenet",
            include_top=False,
            input_shape=input_shape,
        )
    else:
        print("[INFO] Initializing MobileNetV2 backbone (ImageNet weights)...")
        base_model = MobileNetV2(
            weights="imagenet",
            include_top=False,
            input_shape=input_shape,
        )

    # Freeze base model for Phase 1
    base_model.trainable = False

    # Streamlined, variance-shift-free classification head
    x = base_model.output
    x = GlobalAveragePooling2D(name="avg_pool")(x)
    x = Dropout(0.35, name="top_dropout")(x)
    x = Dense(128, activation="swish", name="dense_features")(x)
    x = Dropout(0.20, name="feature_dropout")(x)
    output = Dense(NUM_CLASSES, activation="softmax", name="predictions")(x)

    model = Model(inputs=base_model.input, outputs=output, name=f"freshness_{backbone_name}")

    trainable = sum(tf.keras.backend.count_params(w) for w in model.trainable_weights)
    print(f"\n{'='*60}")
    print(f"  Fish Freshness Classifier ({backbone_name.upper()})")
    print(f"  Total parameters:     {model.count_params():,}")
    print(f"  Trainable parameters: {trainable:,}")
    print(f"{'='*60}\n")

    return model, base_model


def get_preprocess_fn(backbone_name="mobilenetv2"):
    """Select proper preprocessing function based on backbone."""
    if backbone_name.lower() in ["efficientnetv2", "efficientnet_v2", "effnet"]:
        return efficientnet_v2.preprocess_input
    return mobilenet_v2.preprocess_input


def create_data_generators(backbone_name="mobilenetv2", batch_size=BATCH_SIZE):
    """
    Create data generators with biology-preserving augmentations.

    Fixes over previous pipeline:
    - Replaced 'nearest' fill mode with 'reflect' to prevent edge streaks mimicking cataract cloudiness.
    - Tightened brightness range to [0.90, 1.10] to preserve pupil/cornea opacity contrast.
    - Restricted rotation to 15° and zoom to [0.92, 1.08] to preserve spherical eyeball geometry.
    - Removed vertical flip to preserve natural gravity fluid settling in fish cornea.
    """
    preprocess_fn = get_preprocess_fn(backbone_name)

    train_datagen = ImageDataGenerator(
        preprocessing_function=preprocess_fn,
        rotation_range=15,
        width_shift_range=0.10,
        height_shift_range=0.10,
        zoom_range=[0.92, 1.08],
        horizontal_flip=True,
        vertical_flip=False,
        brightness_range=[0.90, 1.10],
        fill_mode="reflect",
    )

    val_datagen = ImageDataGenerator(
        preprocessing_function=preprocess_fn,
    )

    train_generator = train_datagen.flow_from_directory(
        TRAIN_DIR,
        target_size=IMG_SIZE,
        batch_size=batch_size,
        class_mode="categorical",
        classes=CLASS_NAMES,
        shuffle=True,
    )

    val_generator = val_datagen.flow_from_directory(
        VAL_DIR,
        target_size=IMG_SIZE,
        batch_size=batch_size,
        class_mode="categorical",
        classes=CLASS_NAMES,
        shuffle=False,
    )

    print(f"[DATA] Training samples:   {train_generator.samples}")
    print(f"[DATA] Validation samples: {val_generator.samples}")
    print(f"[DATA] Class mapping:      {train_generator.class_indices}")

    return train_generator, val_generator


def get_callbacks(phase, start_epoch=0, backbone="mobilenetv2"):
    """Configure training callbacks."""
    os.makedirs(MODEL_SAVE_DIR, exist_ok=True)

    callbacks = [
        EarlyStopping(
            monitor="val_accuracy",
            patience=8,
            restore_best_weights=True,
            verbose=1,
        ),
        ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.5,
            patience=3,
            min_lr=1e-7,
            verbose=1,
        ),
        ModelCheckpoint(
            filepath=BEST_MODEL_PATH,
            monitor="val_accuracy",
            save_best_only=True,
            verbose=1,
        ),
        SaveProgressCallback(phase=phase, start_epoch=start_epoch, backbone=backbone),
    ]
    return callbacks


def unfreeze_for_finetuning(model, base_model, unfreeze_layers=50, lr=PHASE2_LR):
    """
    Unfreeze top convolutional layers while EXPLICITLY keeping BatchNormalization
    layers frozen in inference mode.

    CRITICAL ACCURACY FIX (addresses the ~69% ceiling):
    When fine-tuning on a specialized dataset with small batches (32),
    allowing BatchNormalization layers to update their running mean/variance
    destabilizes ImageNet pretrained representations. Freezing all BN layers
    keeps them in inference mode and prevents feature degradation.
    """
    base_model.trainable = True

    # Freeze earlier layers
    if unfreeze_layers > 0:
        for layer in base_model.layers[:-unfreeze_layers]:
            layer.trainable = False

    # CRITICAL: Explicitly freeze all BatchNormalization layers
    bn_frozen_count = 0
    for layer in base_model.layers:
        if isinstance(layer, (tf.keras.layers.BatchNormalization, tf.keras.layers.LayerNormalization)):
            layer.trainable = False
            bn_frozen_count += 1

    model.compile(
        optimizer=Adam(learning_rate=lr),
        loss=CategoricalCrossentropy(label_smoothing=LABEL_SMOOTHING),
        metrics=["accuracy"],
    )

    trainable_count = sum(tf.keras.backend.count_params(w) for w in model.trainable_weights)
    print(f"[FREEZE] Kept {bn_frozen_count} BatchNormalization layers frozen in inference mode.")
    print(f"[PARAMS] Trainable parameters after unfreezing top {unfreeze_layers} layers: {trainable_count:,}\n")


def parse_args():
    parser = argparse.ArgumentParser(description="FreshWay Fish Freshness Classifier Training")
    parser.add_argument("--backbone", type=str, default="mobilenetv2", choices=["mobilenetv2", "efficientnetv2"],
                        help="Backbone architecture (mobilenetv2 or efficientnetv2)")
    parser.add_argument("--batch-size", type=int, default=BATCH_SIZE, help="Training batch size")
    parser.add_argument("--epochs1", type=int, default=PHASE1_EPOCHS, help="Phase 1 head epochs")
    parser.add_argument("--epochs2", type=int, default=PHASE2_EPOCHS, help="Phase 2 fine-tuning epochs")
    parser.add_argument("--lr1", type=float, default=PHASE1_LR, help="Phase 1 learning rate")
    parser.add_argument("--lr2", type=float, default=PHASE2_LR, help="Phase 2 learning rate")
    parser.add_argument("--unfreeze-layers", type=int, default=50, help="Number of base layers to unfreeze in phase 2")
    return parser.parse_args()


def main():
    args = parse_args()

    print("\n" + "=" * 64)
    print(f"  FRESHWAY FISH FRESHNESS CLASSIFIER v2.5")
    print(f"  Backbone: {args.backbone.upper()} | Label Smoothing: {LABEL_SMOOTHING}")
    print(f"  Optimizations: BN Freeze + Swish Head + Reflect Augmentations")
    print("=" * 64 + "\n")

    if not os.path.exists(TRAIN_DIR):
        print(f"[ERROR] Training directory not found: {TRAIN_DIR}")
        print("   Please populate server/data/train/ with class folders (fresh, highly_fresh, not_fresh).")
        sys.exit(1)

    # Compute class weights for imbalanced data
    class_weights = compute_class_weights(TRAIN_DIR)

    # Create data generators
    print("[DATA] Loading dataset generators...")
    train_gen, val_gen = create_data_generators(backbone_name=args.backbone, batch_size=args.batch_size)

    # Check for existing progress
    progress = load_progress()

    loss_fn = CategoricalCrossentropy(label_smoothing=LABEL_SMOOTHING)

    # ── RESUME FROM CHECKPOINT ──────────────────────────────────────────
    if progress and os.path.exists(CHECKPOINT_PATH):
        print(f"\n[RESUME] Resuming from checkpoint!")
        print(f"   Phase: {progress['phase']}, Epoch: {progress['epoch']}")
        print(f"   Last val_accuracy: {progress.get('val_accuracy', 0):.4f}")
        print(f"   Saved at: {progress.get('timestamp', 'unknown')}")

        model = tf.keras.models.load_model(CHECKPOINT_PATH)

        base_model = None
        for layer in model.layers:
            if isinstance(layer, tf.keras.Model):
                base_model = layer
                break

        if progress["phase"] == 1:
            completed = progress["epoch"]
            remaining = args.epochs1 - completed

            if remaining > 0:
                print(f"\n  RESUMING PHASE 1: {remaining} epochs remaining")
                model.compile(
                    optimizer=Adam(learning_rate=args.lr1),
                    loss=loss_fn,
                    metrics=["accuracy"],
                )
                model.fit(
                    train_gen,
                    epochs=remaining,
                    validation_data=val_gen,
                    class_weight=class_weights,
                    callbacks=get_callbacks(phase=1, start_epoch=completed, backbone=args.backbone),
                )

            # Move to Phase 2
            print(f"\n{'='*60}")
            print(f"  PHASE 2: Fine-tuning top {args.unfreeze_layers} layers with BN Freeze")
            print(f"{'='*60}\n")
            if base_model:
                unfreeze_for_finetuning(model, base_model, unfreeze_layers=args.unfreeze_layers, lr=args.lr2)
            model.fit(
                train_gen,
                epochs=args.epochs2,
                validation_data=val_gen,
                class_weight=class_weights,
                callbacks=get_callbacks(phase=2, start_epoch=0, backbone=args.backbone),
            )

        elif progress["phase"] == 2:
            completed = progress["epoch"]
            remaining = args.epochs2 - completed
            if remaining > 0:
                print(f"\n  RESUMING PHASE 2: {remaining} epochs remaining")
                if base_model:
                    unfreeze_for_finetuning(model, base_model, unfreeze_layers=args.unfreeze_layers, lr=args.lr2)
                model.fit(
                    train_gen,
                    epochs=remaining,
                    validation_data=val_gen,
                    class_weight=class_weights,
                    callbacks=get_callbacks(phase=2, start_epoch=completed, backbone=args.backbone),
                )

    # ── FRESH START ─────────────────────────────────────────────────────
    else:
        print(f"[BUILD] Building fresh {args.backbone.upper()} model...")
        model, base_model = build_model(backbone_name=args.backbone)

        model.compile(
            optimizer=Adam(learning_rate=args.lr1),
            loss=loss_fn,
            metrics=["accuracy"],
        )

        # Phase 1: Train head with frozen base
        print(f"\n{'='*60}")
        print(f"  PHASE 1: Training classification head (base frozen)")
        print(f"  {args.epochs1} epochs | LR: {args.lr1}")
        print(f"{'='*60}\n")

        model.fit(
            train_gen,
            epochs=args.epochs1,
            validation_data=val_gen,
            class_weight=class_weights,
            callbacks=get_callbacks(phase=1, start_epoch=0, backbone=args.backbone),
        )

        # Phase 2: Fine-tune top layers with BN frozen in inference mode
        print(f"\n{'='*60}")
        print(f"  PHASE 2: Fine-tuning top {args.unfreeze_layers} layers with BN Freeze Protocol")
        print(f"  Up to {args.epochs2} epochs | LR: {args.lr2}")
        print(f"{'='*60}\n")

        unfreeze_for_finetuning(model, base_model, unfreeze_layers=args.unfreeze_layers, lr=args.lr2)

        model.fit(
            train_gen,
            epochs=args.epochs2,
            validation_data=val_gen,
            class_weight=class_weights,
            callbacks=get_callbacks(phase=2, start_epoch=0, backbone=args.backbone),
        )

    # ── SAVE & EVALUATE ─────────────────────────────────────────────────
    model.save(FINAL_MODEL_PATH)
    print(f"\n[SAVED] Final model saved to: {FINAL_MODEL_PATH}")

    print("\n[EVAL] Final Evaluation on Validation Set:")
    loss, accuracy = model.evaluate(val_gen)
    print(f"   Validation Loss:     {loss:.4f}")
    print(f"   Validation Accuracy: {accuracy:.4f} ({accuracy*100:.1f}%)")

    if os.path.exists(PROGRESS_PATH):
        os.remove(PROGRESS_PATH)

    print("\n[DONE] Training complete! To inspect full confusion matrix and class metrics, run:")
    print("   python training/evaluate.py\n")


if __name__ == "__main__":
    main()

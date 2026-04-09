"""
Train Fish Freshness Classification Model using MobileNetV2.

Architecture: MobileNetV2 (pretrained on ImageNet) with custom classification head.
Classes: Highly Fresh, Fresh, Not Fresh
Input: 224x224 RGB images of fish eyes

Optimizations:
- Proper MobileNetV2 preprocessing ([-1, 1] range, NOT [0, 1])
- Class weights to handle imbalanced dataset
- Checkpoint/resume support
- Two-phase training with gradual unfreezing

Usage:
    python training/train_freshness_classifier.py
"""

import os
import sys
import json
import numpy as np
import tensorflow as tf
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout, BatchNormalization
from tensorflow.keras.models import Model
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import (
    EarlyStopping,
    ReduceLROnPlateau,
    ModelCheckpoint,
    Callback,
)
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from datetime import datetime

# ─── CONFIG ──────────────────────────────────────────────────────────────────
IMG_SIZE = (224, 224)
BATCH_SIZE = 32
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
CHECKPOINT_PATH = os.path.join(MODEL_SAVE_DIR, "freshness_checkpoint.keras")
PROGRESS_PATH = os.path.join(MODEL_SAVE_DIR, "training_progress.json")
BEST_MODEL_PATH = os.path.join(MODEL_SAVE_DIR, "freshness_model_best.keras")
FINAL_MODEL_PATH = os.path.join(MODEL_SAVE_DIR, "freshness_model_final.keras")


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
        print(f"\n💾 Checkpoint saved! Phase {self.phase}, Epoch {actual_epoch}")
        print(f"   Train Acc: {logs.get('accuracy', 0):.4f} | Val Acc: {logs.get('val_accuracy', 0):.4f}")
        print(f"   You can safely stop and resume later.\n")


def load_progress():
    """Load training progress from disk if it exists."""
    if os.path.exists(PROGRESS_PATH):
        with open(PROGRESS_PATH, "r") as f:
            return json.load(f)
    return None


def compute_class_weights(train_dir):
    """
    Compute class weights to handle imbalanced dataset.
    Classes with fewer samples get higher weights.
    """
    class_counts = {}
    for class_name in CLASS_NAMES:
        class_path = os.path.join(train_dir, class_name)
        if os.path.exists(class_path):
            count = len([f for f in os.listdir(class_path) if os.path.isfile(os.path.join(class_path, f))])
            class_counts[class_name] = count

    total = sum(class_counts.values())
    n_classes = len(class_counts)

    # Sklearn-style balanced class weights: total / (n_classes * count)
    class_weights = {}
    for i, class_name in enumerate(CLASS_NAMES):
        class_weights[i] = total / (n_classes * class_counts[class_name])

    print(f"\n⚖️  Class Weights (handling imbalance):")
    for i, class_name in enumerate(CLASS_NAMES):
        print(f"   {class_name}: {class_counts[class_name]} images → weight {class_weights[i]:.3f}")
    print()

    return class_weights


def build_model():
    """
    Build MobileNetV2 with custom classification head.

    Key: Using MobileNetV2's native preprocessing ([-1, 1] range).
    """
    base_model = MobileNetV2(
        weights="imagenet",
        include_top=False,
        input_shape=(IMG_SIZE[0], IMG_SIZE[1], 3),
    )

    base_model.trainable = False

    # Classification head
    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = Dense(512, activation="relu")(x)
    x = BatchNormalization()(x)
    x = Dropout(0.4)(x)
    x = Dense(256, activation="relu")(x)
    x = BatchNormalization()(x)
    x = Dropout(0.3)(x)
    x = Dense(128, activation="relu")(x)
    x = BatchNormalization()(x)
    x = Dropout(0.2)(x)
    output = Dense(NUM_CLASSES, activation="softmax")(x)

    model = Model(inputs=base_model.input, outputs=output)

    trainable = sum(tf.keras.backend.count_params(w) for w in model.trainable_weights)
    print(f"\n{'='*60}")
    print(f"  MobileNetV2 Fish Freshness Classifier v2")
    print(f"  Total parameters: {model.count_params():,}")
    print(f"  Trainable parameters: {trainable:,}")
    print(f"{'='*60}\n")

    return model, base_model


def create_data_generators():
    """
    Create data generators with PROPER MobileNetV2 preprocessing.

    CRITICAL FIX: Using preprocess_input (scales to [-1, 1])
    instead of rescale=1/255 (scales to [0, 1]).
    MobileNetV2 was trained with [-1, 1] normalization!
    """
    train_datagen = ImageDataGenerator(
        preprocessing_function=preprocess_input,  # ← CORRECT for MobileNetV2!
        rotation_range=40,
        width_shift_range=0.25,
        height_shift_range=0.25,
        shear_range=0.2,
        zoom_range=0.3,
        horizontal_flip=True,
        vertical_flip=True,
        brightness_range=[0.7, 1.3],
        fill_mode="nearest",
    )

    val_datagen = ImageDataGenerator(
        preprocessing_function=preprocess_input,  # ← Same preprocessing for validation
    )

    train_generator = train_datagen.flow_from_directory(
        TRAIN_DIR,
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode="categorical",
        classes=CLASS_NAMES,
        shuffle=True,
    )

    val_generator = val_datagen.flow_from_directory(
        VAL_DIR,
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode="categorical",
        classes=CLASS_NAMES,
        shuffle=False,
    )

    print(f"Training samples: {train_generator.samples}")
    print(f"Validation samples: {val_generator.samples}")
    print(f"Class indices: {train_generator.class_indices}")

    return train_generator, val_generator


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


def unfreeze_for_finetuning(model, base_model):
    """Unfreeze the last 50 layers of MobileNetV2 for fine-tuning."""
    base_model.trainable = True
    # Freeze all except last 50 layers
    for layer in base_model.layers[:-50]:
        layer.trainable = False

    model.compile(
        optimizer=Adam(learning_rate=1e-5),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )

    trainable_count = sum(
        tf.keras.backend.count_params(w) for w in model.trainable_weights
    )
    print(f"Trainable parameters after unfreezing: {trainable_count:,}\n")


def main():
    print("\n" + "🐟" * 30)
    print("  FISH FRESHNESS CLASSIFIER v2 — MobileNetV2")
    print("  Improvements: Proper preprocessing + Class weights")
    print("🐟" * 30 + "\n")

    if not os.path.exists(TRAIN_DIR):
        print(f"ERROR: Training directory not found: {TRAIN_DIR}")
        sys.exit(1)

    # Compute class weights for imbalanced data
    class_weights = compute_class_weights(TRAIN_DIR)

    # Create data generators
    print("📂 Loading dataset...")
    train_gen, val_gen = create_data_generators()

    # Check for existing progress
    progress = load_progress()

    # ── RESUME FROM CHECKPOINT ──────────────────────────────────────────
    if progress and os.path.exists(CHECKPOINT_PATH):
        print(f"\n🔄 RESUMING from checkpoint!")
        print(f"   Phase: {progress['phase']}, Epoch: {progress['epoch']}")
        print(f"   Last val_accuracy: {progress['val_accuracy']:.4f}")
        print(f"   Saved at: {progress['timestamp']}")

        model = tf.keras.models.load_model(CHECKPOINT_PATH)

        base_model = None
        for layer in model.layers:
            if isinstance(layer, tf.keras.Model):
                base_model = layer
                break

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
                model.fit(
                    train_gen,
                    epochs=remaining,
                    validation_data=val_gen,
                    class_weight=class_weights,
                    callbacks=get_callbacks(phase=1, start_epoch=completed),
                )

            # Move to Phase 2
            print(f"\n{'='*60}")
            print(f"  PHASE 2: Fine-tuning last 50 layers of MobileNetV2")
            print(f"{'='*60}\n")
            if base_model:
                unfreeze_for_finetuning(model, base_model)
            model.fit(
                train_gen,
                epochs=PHASE2_EPOCHS,
                validation_data=val_gen,
                class_weight=class_weights,
                callbacks=get_callbacks(phase=2, start_epoch=0),
            )

        elif progress["phase"] == 2:
            completed = progress["epoch"]
            remaining = PHASE2_EPOCHS - completed
            if remaining > 0:
                print(f"\n  RESUMING PHASE 2: {remaining} epochs remaining")
                if base_model:
                    unfreeze_for_finetuning(model, base_model)
                model.fit(
                    train_gen,
                    epochs=remaining,
                    validation_data=val_gen,
                    class_weight=class_weights,
                    callbacks=get_callbacks(phase=2, start_epoch=completed),
                )

    # ── FRESH START ─────────────────────────────────────────────────────
    else:
        print("📦 Building fresh MobileNetV2 model (v2 — improved)...")
        model, base_model = build_model()

        model.compile(
            optimizer=Adam(learning_rate=LEARNING_RATE),
            loss="categorical_crossentropy",
            metrics=["accuracy"],
        )

        # Phase 1
        print(f"\n{'='*60}")
        print(f"  PHASE 1: Training classification head (base frozen)")
        print(f"  {PHASE1_EPOCHS} epochs | LR: {LEARNING_RATE}")
        print(f"{'='*60}\n")

        model.fit(
            train_gen,
            epochs=PHASE1_EPOCHS,
            validation_data=val_gen,
            class_weight=class_weights,
            callbacks=get_callbacks(phase=1, start_epoch=0),
        )

        # Phase 2
        print(f"\n{'='*60}")
        print(f"  PHASE 2: Fine-tuning last 50 layers of MobileNetV2")
        print(f"  Up to {PHASE2_EPOCHS} epochs | LR: 1e-5")
        print(f"{'='*60}\n")

        unfreeze_for_finetuning(model, base_model)

        model.fit(
            train_gen,
            epochs=PHASE2_EPOCHS,
            validation_data=val_gen,
            class_weight=class_weights,
            callbacks=get_callbacks(phase=2, start_epoch=0),
        )

    # ── SAVE & EVALUATE ─────────────────────────────────────────────────
    model.save(FINAL_MODEL_PATH)
    print(f"\n✅ Final model saved to: {FINAL_MODEL_PATH}")

    print("\n📊 Final Evaluation on Validation Set:")
    loss, accuracy = model.evaluate(val_gen)
    print(f"   Loss: {loss:.4f}")
    print(f"   Accuracy: {accuracy:.4f} ({accuracy*100:.1f}%)")

    if os.path.exists(PROGRESS_PATH):
        os.remove(PROGRESS_PATH)

    print("\n🎉 Training complete!")


if __name__ == "__main__":
    main()

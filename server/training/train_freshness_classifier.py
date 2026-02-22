"""
Train Fish Freshness Classification Model using MobileNetV2.

Architecture: MobileNetV2 (pretrained on ImageNet) with custom classification head.
Classes: Highly Fresh, Fresh, Not Fresh
Input: 224x224 RGB images of fish eyes

Features:
- Resume from checkpoint (automatically picks up where you left off)
- Saves checkpoint after every epoch
- Two-phase training (frozen base → fine-tuning)

Usage:
    python training/train_freshness_classifier.py
"""

import os
import sys
import json
import tensorflow as tf
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout, BatchNormalization
from tensorflow.keras.models import Model
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import (
    EarlyStopping,
    ReduceLROnPlateau,
    ModelCheckpoint,
    TensorBoard,
    Callback,
)
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from datetime import datetime

# ─── CONFIG ──────────────────────────────────────────────────────────────────
IMG_SIZE = (224, 224)
BATCH_SIZE = 32
PHASE1_EPOCHS = 15
PHASE2_EPOCHS = 50  # Will early-stop much sooner
LEARNING_RATE = 1e-4
NUM_CLASSES = 3
CLASS_NAMES = ["fresh", "highly_fresh", "not_fresh"]

# Paths (relative to server/)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TRAIN_DIR = os.path.join(BASE_DIR, "data", "train")
VAL_DIR = os.path.join(BASE_DIR, "data", "val")
MODEL_SAVE_DIR = os.path.join(BASE_DIR, "models")
LOG_DIR = os.path.join(BASE_DIR, "logs", "fit")

# Checkpoint paths
CHECKPOINT_PATH = os.path.join(MODEL_SAVE_DIR, "freshness_checkpoint.keras")
PROGRESS_PATH = os.path.join(MODEL_SAVE_DIR, "training_progress.json")
BEST_MODEL_PATH = os.path.join(MODEL_SAVE_DIR, "freshness_model_best.keras")
FINAL_MODEL_PATH = os.path.join(MODEL_SAVE_DIR, "freshness_model_final.keras")


# ─── CUSTOM CALLBACK: Save progress after each epoch ────────────────────────
class SaveProgressCallback(Callback):
    """Saves training progress (epoch, phase, metrics) after each epoch."""

    def __init__(self, phase, start_epoch=0):
        super().__init__()
        self.phase = phase
        self.start_epoch = start_epoch

    def on_epoch_end(self, epoch, logs=None):
        actual_epoch = self.start_epoch + epoch + 1
        progress = {
            "phase": self.phase,
            "epoch": actual_epoch,
            "total_phase1_epochs": PHASE1_EPOCHS,
            "total_phase2_epochs": PHASE2_EPOCHS,
            "accuracy": float(logs.get("accuracy", 0)),
            "val_accuracy": float(logs.get("val_accuracy", 0)),
            "loss": float(logs.get("loss", 0)),
            "val_loss": float(logs.get("val_loss", 0)),
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }

        # Save progress JSON
        with open(PROGRESS_PATH, "w") as f:
            json.dump(progress, f, indent=2)

        # Save checkpoint model (every epoch)
        self.model.save(CHECKPOINT_PATH)

        print(f"\n💾 Checkpoint saved! Phase {self.phase}, Epoch {actual_epoch}")
        print(f"   Accuracy: {logs.get('accuracy', 0):.4f} | Val Accuracy: {logs.get('val_accuracy', 0):.4f}")
        print(f"   You can safely stop and resume later.\n")


def load_progress():
    """Load training progress from disk if it exists."""
    if os.path.exists(PROGRESS_PATH):
        with open(PROGRESS_PATH, "r") as f:
            return json.load(f)
    return None


def build_model():
    """
    Build MobileNetV2 with a custom classification head.
    """
    base_model = MobileNetV2(
        weights="imagenet",
        include_top=False,
        input_shape=(IMG_SIZE[0], IMG_SIZE[1], 3),
    )

    # Freeze the base model layers for transfer learning
    base_model.trainable = False

    # Custom classification head
    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = Dense(256, activation="relu")(x)
    x = BatchNormalization()(x)
    x = Dropout(0.5)(x)
    x = Dense(128, activation="relu")(x)
    x = BatchNormalization()(x)
    x = Dropout(0.3)(x)
    output = Dense(NUM_CLASSES, activation="softmax")(x)

    model = Model(inputs=base_model.input, outputs=output)

    print(f"\n{'='*60}")
    print(f"  MobileNetV2 Fish Freshness Classifier")
    print(f"  Total parameters: {model.count_params():,}")
    trainable = sum(tf.keras.backend.count_params(w) for w in model.trainable_weights)
    print(f"  Trainable parameters: {trainable:,}")
    print(f"{'='*60}\n")

    return model, base_model


def create_data_generators():
    """Create training and validation data generators with augmentation."""
    train_datagen = ImageDataGenerator(
        rescale=1.0 / 255,
        rotation_range=30,
        width_shift_range=0.2,
        height_shift_range=0.2,
        shear_range=0.15,
        zoom_range=0.2,
        horizontal_flip=True,
        vertical_flip=False,
        brightness_range=[0.8, 1.2],
        fill_mode="nearest",
    )

    val_datagen = ImageDataGenerator(rescale=1.0 / 255)

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

    log_dir = os.path.join(LOG_DIR, datetime.now().strftime("%Y%m%d-%H%M%S"))
    os.makedirs(log_dir, exist_ok=True)

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
        TensorBoard(log_dir=log_dir, histogram_freq=1),
        SaveProgressCallback(phase=phase, start_epoch=start_epoch),
    ]
    return callbacks


def unfreeze_for_finetuning(model, base_model):
    """Unfreeze the last 30 layers of MobileNetV2 for fine-tuning."""
    base_model.trainable = True
    for layer in base_model.layers[:-30]:
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
    print("  FISH FRESHNESS CLASSIFIER — MobileNetV2")
    print("🐟" * 30 + "\n")

    # Verify data directories exist
    if not os.path.exists(TRAIN_DIR):
        print(f"ERROR: Training directory not found: {TRAIN_DIR}")
        sys.exit(1)

    # Check for existing progress
    progress = load_progress()

    # Create data generators
    print("📂 Loading dataset...")
    train_gen, val_gen = create_data_generators()

    # ── RESUME FROM CHECKPOINT ──────────────────────────────────────────
    if progress and os.path.exists(CHECKPOINT_PATH):
        print(f"\n🔄 RESUMING from checkpoint!")
        print(f"   Phase: {progress['phase']}")
        print(f"   Epoch: {progress['epoch']}")
        print(f"   Last accuracy: {progress['accuracy']:.4f}")
        print(f"   Last val_accuracy: {progress['val_accuracy']:.4f}")
        print(f"   Saved at: {progress['timestamp']}")

        # Load the checkpoint model
        model = tf.keras.models.load_model(CHECKPOINT_PATH)

        # Get the base model for potential unfreezing
        base_model = None
        for layer in model.layers:
            if isinstance(layer, tf.keras.Model):
                base_model = layer
                break

        if progress["phase"] == 1:
            completed = progress["epoch"]
            remaining = PHASE1_EPOCHS - completed

            if remaining > 0:
                print(f"\n{'='*60}")
                print(f"  RESUMING PHASE 1: {remaining} epochs remaining ({completed}/{PHASE1_EPOCHS} done)")
                print(f"{'='*60}\n")

                model.compile(
                    optimizer=Adam(learning_rate=LEARNING_RATE),
                    loss="categorical_crossentropy",
                    metrics=["accuracy"],
                )

                model.fit(
                    train_gen,
                    epochs=remaining,
                    validation_data=val_gen,
                    callbacks=get_callbacks(phase=1, start_epoch=completed),
                )

            # Move to Phase 2
            print(f"\n{'='*60}")
            print(f"  PHASE 2: Fine-tuning last 30 layers of MobileNetV2")
            print(f"{'='*60}\n")

            if base_model:
                unfreeze_for_finetuning(model, base_model)

            model.fit(
                train_gen,
                epochs=PHASE2_EPOCHS,
                validation_data=val_gen,
                callbacks=get_callbacks(phase=2, start_epoch=0),
            )

        elif progress["phase"] == 2:
            completed = progress["epoch"]
            remaining = PHASE2_EPOCHS - completed

            if remaining > 0:
                print(f"\n{'='*60}")
                print(f"  RESUMING PHASE 2: {remaining} epochs remaining ({completed}/{PHASE2_EPOCHS} done)")
                print(f"{'='*60}\n")

                if base_model:
                    unfreeze_for_finetuning(model, base_model)

                model.fit(
                    train_gen,
                    epochs=remaining,
                    validation_data=val_gen,
                    callbacks=get_callbacks(phase=2, start_epoch=completed),
                )
            else:
                print("✅ Training was already complete!")

    # ── FRESH START ─────────────────────────────────────────────────────
    else:
        print("📦 Building fresh MobileNetV2 model...")
        model, base_model = build_model()

        model.compile(
            optimizer=Adam(learning_rate=LEARNING_RATE),
            loss="categorical_crossentropy",
            metrics=["accuracy"],
        )

        # Phase 1: Train classification head
        print(f"\n{'='*60}")
        print(f"  PHASE 1: Training classification head (base frozen)")
        print(f"  {PHASE1_EPOCHS} epochs")
        print(f"{'='*60}\n")

        model.fit(
            train_gen,
            epochs=PHASE1_EPOCHS,
            validation_data=val_gen,
            callbacks=get_callbacks(phase=1, start_epoch=0),
        )

        # Phase 2: Fine-tune
        print(f"\n{'='*60}")
        print(f"  PHASE 2: Fine-tuning last 30 layers of MobileNetV2")
        print(f"{'='*60}\n")

        unfreeze_for_finetuning(model, base_model)

        model.fit(
            train_gen,
            epochs=PHASE2_EPOCHS,
            validation_data=val_gen,
            callbacks=get_callbacks(phase=2, start_epoch=0),
        )

    # ── SAVE FINAL MODEL ────────────────────────────────────────────────
    model.save(FINAL_MODEL_PATH)
    print(f"\n✅ Final model saved to: {FINAL_MODEL_PATH}")

    # Evaluate
    print("\n📊 Final Evaluation on Validation Set:")
    loss, accuracy = model.evaluate(val_gen)
    print(f"   Loss: {loss:.4f}")
    print(f"   Accuracy: {accuracy:.4f} ({accuracy*100:.1f}%)")

    # Clean up checkpoint (training complete)
    if os.path.exists(PROGRESS_PATH):
        os.remove(PROGRESS_PATH)
        print("\n🧹 Cleaned up checkpoint files (training complete)")

    print("\n🎉 Training complete!")


if __name__ == "__main__":
    main()

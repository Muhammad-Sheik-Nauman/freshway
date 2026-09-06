"""EXP-007: species-balanced sample weighting on the immutable EXP-006 split.

This trainer preserves the EXP-006 architecture, preprocessing, augmentation,
optimizer, callbacks, and freshness class weighting. The only training change
is a per-example species balance weight multiplied by the existing freshness
class weight. Outputs are isolated from production and EXP-006.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import time
from datetime import datetime
from pathlib import Path

import numpy as np
import tensorflow as tf
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
from tensorflow.keras.callbacks import Callback, EarlyStopping, ModelCheckpoint, ReduceLROnPlateau
from tensorflow.keras.losses import CategoricalCrossentropy
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.utils import img_to_array, load_img, to_categorical

THIS_DIR = Path(__file__).resolve().parent
SERVER_DIR = THIS_DIR.parent
PROJECT_ROOT = SERVER_DIR.parent

from train_freshness_classifier import (  # noqa: E402
    CLASS_NAMES,
    LABEL_SMOOTHING,
    NUM_CLASSES,
    build_model,
    unfreeze_for_finetuning,
)

IMG_SIZE = (224, 224)
BASELINE_MODEL = SERVER_DIR / "models" / "freshness_model_best.keras"
PRODUCTION_MODEL = SERVER_DIR / "models" / "experiments" / "exp006_v25_mobilenetv2" / "freshness_exp006_best.keras"
DEFAULT_MANIFEST = PROJECT_ROOT / "experiments" / "manifests" / "baseline_split_v1.json"
DEFAULT_OUT = SERVER_DIR / "models" / "experiments" / "exp007_species_balanced_mobilenetv2"
DEBUG_LOG = PROJECT_ROOT.parent / "debug-exp007.log"
FORBIDDEN_NAMES = {
    "freshness_model_best.keras",
    "freshness_model_final.keras",
    "freshness_checkpoint.keras",
    "freshness_exp006_best.keras",
    "freshness_exp006_final.keras",
}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def debug_log(message: str, data: dict) -> None:
    record = {
        "timestamp": int(time.time() * 1000),
        "message": message,
        "data": data,
        "runId": "exp007-train",
    }
    with DEBUG_LOG.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record) + "\n")


def load_manifest(path: Path) -> dict:
    manifest = json.loads(path.read_text(encoding="utf-8"))
    if manifest.get("schema_version") != "freshway-baseline-split-v1":
        raise ValueError(f"Unsupported manifest schema: {manifest.get('schema_version')!r}")
    return manifest


def freshness_class_weights(records: list[dict]) -> dict[int, float]:
    counts = {index: 0 for index in range(NUM_CLASSES)}
    for record in records:
        counts[int(record["class_index"])] += 1
    total = sum(counts.values())
    return {index: total / (NUM_CLASSES * max(count, 1)) for index, count in counts.items()}


def species_weights(records: list[dict]) -> tuple[dict[str, float], dict[str, int]]:
    counts: dict[str, int] = {}
    for record in records:
        species = record["species"]
        counts[species] = counts.get(species, 0) + 1
    total = sum(counts.values())
    number_of_species = len(counts)
    weights = {
        species: total / (number_of_species * count)
        for species, count in sorted(counts.items())
    }
    return weights, dict(sorted(counts.items()))


class WeightedManifestSequence(tf.keras.utils.Sequence):
    """Load manifest images and optionally return combined sample weights."""

    def __init__(
        self,
        records: list[dict],
        dataset_root: Path,
        batch_size: int,
        augment: bool,
        shuffle: bool,
        sample_weights: np.ndarray | None = None,
        seed: int = 20260906,
    ):
        self.records = list(records)
        self.dataset_root = dataset_root
        self.batch_size = batch_size
        self.augment = augment
        self.shuffle = shuffle
        self.sample_weights = sample_weights
        self.rng = np.random.default_rng(seed)
        self.datagen = ImageDataGenerator(
            rotation_range=15,
            width_shift_range=0.10,
            height_shift_range=0.10,
            zoom_range=[0.92, 1.08],
            horizontal_flip=True,
            vertical_flip=False,
            brightness_range=[0.90, 1.10],
            fill_mode="reflect",
        )
        if self.sample_weights is not None and len(self.sample_weights) != len(self.records):
            raise ValueError("Sample weights must match the sequence records.")
        self.on_epoch_end()

    def __len__(self) -> int:
        return int(np.ceil(len(self.records) / self.batch_size))

    def on_epoch_end(self) -> None:
        self.indices = np.arange(len(self.records))
        if self.shuffle:
            self.rng.shuffle(self.indices)

    def __getitem__(self, index: int):
        batch_indices = self.indices[index * self.batch_size : (index + 1) * self.batch_size]
        images = np.zeros((len(batch_indices), IMG_SIZE[0], IMG_SIZE[1], 3), dtype=np.float32)
        labels = np.zeros((len(batch_indices),), dtype=np.int32)
        for batch_position, record_index in enumerate(batch_indices):
            record = self.records[int(record_index)]
            image = load_img(
                self.dataset_root / record["relative_path"],
                color_mode="rgb",
                target_size=IMG_SIZE,
                interpolation="nearest",
                keep_aspect_ratio=False,
            )
            array = img_to_array(image)
            if self.augment:
                array = self.datagen.random_transform(array)
            images[batch_position] = preprocess_input(array)
            labels[batch_position] = record["class_index"]

        targets = to_categorical(labels, NUM_CLASSES)
        if self.sample_weights is None:
            return images, targets
        return images, targets, self.sample_weights[batch_indices]


class EpochDebugCallback(Callback):
    def __init__(self, phase: int):
        super().__init__()
        self.phase = phase

    def on_epoch_end(self, epoch, logs=None):
        logs = logs or {}
        debug_log(
            "epoch_metrics",
            {
                "phase": self.phase,
                "epoch": int(epoch) + 1,
                "loss": float(logs.get("loss", 0)),
                "accuracy": float(logs.get("accuracy", 0)),
                "val_loss": float(logs.get("val_loss", 0)),
                "val_accuracy": float(logs.get("val_accuracy", 0)),
            },
        )


def combined_sample_weights(records: list[dict], class_weight: dict[int, float], species_weight: dict[str, float]) -> np.ndarray:
    weights = np.asarray(
        [class_weight[int(record["class_index"])] * species_weight[record["species"]] for record in records],
        dtype=np.float32,
    )
    return weights / float(np.mean(weights))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="EXP-007 species-balanced manifest training.")
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--epochs1", type=int, default=20)
    parser.add_argument("--epochs2", type=int, default=40)
    parser.add_argument("--lr1", type=float, default=5e-4)
    parser.add_argument("--lr2", type=float, default=1e-5)
    parser.add_argument("--unfreeze-layers", type=int, default=50)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    output_dir = args.output_dir.resolve()
    if output_dir.exists() and any(output_dir.iterdir()):
        raise SystemExit(f"Refusing non-empty EXP-007 output directory: {output_dir}")
    if output_dir.name in FORBIDDEN_NAMES:
        raise SystemExit(f"Refusing protected model directory name: {output_dir.name}")

    baseline_before = sha256_file(BASELINE_MODEL) if BASELINE_MODEL.is_file() else None
    production_before = sha256_file(PRODUCTION_MODEL) if PRODUCTION_MODEL.is_file() else None
    manifest = load_manifest(args.manifest.resolve())
    dataset_root = Path(manifest["dataset_root"])
    train_records = [record for record in manifest["records"] if record["split"] == "train"]
    val_records = [record for record in manifest["records"] if record["split"] == "val"]
    test_records = [record for record in manifest["records"] if record["split"] == "test"]
    if not test_records:
        raise ValueError("Manifest test split is empty.")

    class_weight = freshness_class_weights(train_records)
    species_weight, species_counts = species_weights(train_records)
    train_weight = combined_sample_weights(train_records, class_weight, species_weight)
    output_dir.mkdir(parents=True, exist_ok=False)
    config = {
        "experiment": "EXP-007",
        "strategy": "combined sample weight = freshness class weight * inverse-frequency species weight; normalized to mean 1",
        "manifest": str(args.manifest.resolve()),
        "manifest_records_sha256": manifest["records_sha256"],
        "dataset_root": str(dataset_root),
        "train_n": len(train_records),
        "val_n": len(val_records),
        "test_n": len(test_records),
        "class_weights": class_weight,
        "species_counts": species_counts,
        "species_weights": species_weight,
        "combined_train_weight_mean": float(np.mean(train_weight)),
        "preprocessing": {
            "color_mode": "rgb",
            "target_size": [224, 224],
            "resize_interpolation": "nearest",
            "keep_aspect_ratio": False,
            "crop": "none; direct resize",
            "normalization": "mobilenet_v2.preprocess_input [-1, 1]",
            "train_augment": "EXP-006 reflect/bounded brightness; applied before preprocess_input",
        },
        "architecture": "EXP-006 MobileNetV2 + GAP + Dropout(0.35) + Dense(128, swish) + Dropout(0.20) + Dense(3, softmax)",
        "batch_size": args.batch_size,
        "epochs1": args.epochs1,
        "epochs2": args.epochs2,
        "lr1": args.lr1,
        "lr2": args.lr2,
        "unfreeze_layers": args.unfreeze_layers,
        "label_smoothing": LABEL_SMOOTHING,
        "callbacks": "EXP-006 EarlyStopping/ReduceLROnPlateau/ModelCheckpoint; patience 8/3",
        "baseline_sha256_before": baseline_before,
        "production_exp006_sha256_before": production_before,
        "output_dir": str(output_dir),
        "started_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }
    (output_dir / "run_config.json").write_text(json.dumps(config, indent=2) + "\n", encoding="utf-8")
    debug_log("train_start", config)

    train_sequence = WeightedManifestSequence(
        train_records,
        dataset_root,
        args.batch_size,
        augment=True,
        shuffle=True,
        sample_weights=train_weight,
    )
    validation_sequence = WeightedManifestSequence(
        val_records,
        dataset_root,
        args.batch_size,
        augment=False,
        shuffle=False,
    )
    best_path = output_dir / "freshness_exp007_best.keras"
    final_path = output_dir / "freshness_exp007_final.keras"
    model, base_model = build_model("mobilenetv2")
    loss = CategoricalCrossentropy(label_smoothing=LABEL_SMOOTHING)
    model.compile(optimizer=Adam(learning_rate=args.lr1), loss=loss, metrics=["accuracy"])
    phase1_callbacks = [
        EarlyStopping(monitor="val_accuracy", patience=8, restore_best_weights=True, verbose=1),
        ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=3, min_lr=1e-7, verbose=1),
        ModelCheckpoint(filepath=str(best_path), monitor="val_accuracy", save_best_only=True, verbose=1),
        EpochDebugCallback(phase=1),
    ]
    print(f"[EXP-007] train={len(train_records)} val={len(val_records)} test={len(test_records)} out={output_dir}")
    model.fit(train_sequence, epochs=args.epochs1, validation_data=validation_sequence, callbacks=phase1_callbacks)

    unfreeze_for_finetuning(model, base_model, unfreeze_layers=args.unfreeze_layers, lr=args.lr2)
    phase2_callbacks = [
        EarlyStopping(monitor="val_accuracy", patience=8, restore_best_weights=True, verbose=1),
        ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=3, min_lr=1e-7, verbose=1),
        ModelCheckpoint(filepath=str(best_path), monitor="val_accuracy", save_best_only=True, verbose=1),
        EpochDebugCallback(phase=2),
    ]
    model.fit(train_sequence, epochs=args.epochs2, validation_data=validation_sequence, callbacks=phase2_callbacks)
    model.save(final_path)

    baseline_after = sha256_file(BASELINE_MODEL) if BASELINE_MODEL.is_file() else None
    production_after = sha256_file(PRODUCTION_MODEL) if PRODUCTION_MODEL.is_file() else None
    summary = {
        "best": str(best_path),
        "final": str(final_path),
        "baseline_sha256_before": baseline_before,
        "baseline_sha256_after": baseline_after,
        "baseline_unchanged": baseline_before == baseline_after,
        "production_exp006_sha256_before": production_before,
        "production_exp006_sha256_after": production_after,
        "production_exp006_unchanged": production_before == production_after,
        "test_records_used_for_training": 0,
        "finished_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }
    (output_dir / "run_summary.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    debug_log("train_end", summary)
    print(json.dumps(summary, indent=2))
    if not summary["baseline_unchanged"] or not summary["production_exp006_unchanged"]:
        raise SystemExit("ERROR: protected model hash changed.")


if __name__ == "__main__":
    main()
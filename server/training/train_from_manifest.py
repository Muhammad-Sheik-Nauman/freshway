"""EXP-006: train v2.5 on baseline_split_v1 without touching source images or baseline .keras files.

Val/eval contract matches evaluate_manifest.py:
RGB, nearest 224x224, no crop, MobileNetV2 preprocess_input [-1, 1].
Train applies v2.5 biology-safe augmentations on [0, 255] then the same preprocess_input.

Usage (from repo, with .venv-py311):
    python server/training/train_from_manifest.py
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
import time
from datetime import datetime
from pathlib import Path

import numpy as np
import tensorflow as tf
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
from tensorflow.keras.callbacks import (
    Callback,
    EarlyStopping,
    ModelCheckpoint,
    ReduceLROnPlateau,
)
from tensorflow.keras.losses import CategoricalCrossentropy
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.utils import img_to_array, load_img, to_categorical

THIS_DIR = Path(__file__).resolve().parent
SERVER_DIR = THIS_DIR.parent
PROJECT_ROOT = SERVER_DIR.parent
sys.path.insert(0, str(THIS_DIR))

from train_freshness_classifier import (  # noqa: E402
    CLASS_NAMES,
    LABEL_SMOOTHING,
    NUM_CLASSES,
    build_model,
    unfreeze_for_finetuning,
)

IMG_SIZE = (224, 224)
BASELINE_MODEL = SERVER_DIR / "models" / "freshness_model_best.keras"
DEFAULT_MANIFEST = PROJECT_ROOT / "experiments" / "manifests" / "baseline_split_v1.json"
DEFAULT_OUT = SERVER_DIR / "models" / "experiments" / "exp006_v25_mobilenetv2"
DEBUG_LOG = PROJECT_ROOT.parent / "debug-5bce46.log"
SESSION = "5bce46"
FORBIDDEN_NAMES = {
    "freshness_model_best.keras",
    "freshness_model_final.keras",
    "freshness_checkpoint.keras",
}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def debug_log(hypothesis_id: str, location: str, message: str, data: dict) -> None:
    rec = {
        "sessionId": SESSION,
        "timestamp": int(time.time() * 1000),
        "hypothesisId": hypothesis_id,
        "location": location,
        "message": message,
        "data": data,
        "runId": "exp006-train",
    }
    # region agent log
    with DEBUG_LOG.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(rec) + "\n")
    # endregion


def load_manifest(path: Path) -> dict:
    manifest = json.loads(path.read_text(encoding="utf-8"))
    if manifest.get("schema_version") != "freshway-baseline-split-v1":
        raise ValueError(f"Unsupported manifest: {manifest.get('schema_version')!r}")
    return manifest


class ManifestSequence(tf.keras.utils.Sequence):
    """Loads source JPEGs in place; never copies or renames the dataset tree."""

    def __init__(
        self,
        records: list[dict],
        dataset_root: Path,
        batch_size: int,
        augment: bool,
        shuffle: bool,
        seed: int = 20260906,
    ):
        self.records = list(records)
        self.dataset_root = dataset_root
        self.batch_size = batch_size
        self.augment = augment
        self.shuffle = shuffle
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
        self.on_epoch_end()

    def __len__(self) -> int:
        return int(np.ceil(len(self.records) / self.batch_size))

    def on_epoch_end(self) -> None:
        self.indices = np.arange(len(self.records))
        if self.shuffle:
            self.rng.shuffle(self.indices)

    def __getitem__(self, idx: int):
        batch_idx = self.indices[idx * self.batch_size : (idx + 1) * self.batch_size]
        images = np.zeros((len(batch_idx), IMG_SIZE[0], IMG_SIZE[1], 3), dtype=np.float32)
        labels = np.zeros((len(batch_idx),), dtype=np.int32)
        for i, rec_i in enumerate(batch_idx):
            rec = self.records[int(rec_i)]
            path = self.dataset_root / rec["relative_path"]
            image = load_img(
                path,
                color_mode="rgb",
                target_size=IMG_SIZE,
                interpolation="nearest",
                keep_aspect_ratio=False,
            )
            array = img_to_array(image)
            if self.augment:
                array = self.datagen.random_transform(array)
            images[i] = preprocess_input(array)
            labels[i] = rec["class_index"]
        return images, to_categorical(labels, NUM_CLASSES)


class EpochDebugCallback(Callback):
    def __init__(self, phase: int):
        super().__init__()
        self.phase = phase

    def on_epoch_end(self, epoch, logs=None):
        logs = logs or {}
        debug_log(
            "T",
            "train_from_manifest.py:on_epoch_end",
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


def class_weights(records: list[dict]) -> dict[int, float]:
    counts = {i: 0 for i in range(NUM_CLASSES)}
    for rec in records:
        counts[int(rec["class_index"])] += 1
    total = sum(counts.values())
    return {i: total / (NUM_CLASSES * max(counts[i], 1)) for i in range(NUM_CLASSES)}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="EXP-006 manifest training (does not overwrite baseline).")
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
    out = args.output_dir.resolve()
    if out.name in FORBIDDEN_NAMES or any(p.name in FORBIDDEN_NAMES for p in [out]):
        raise SystemExit("Refusing to use a baseline model filename as output-dir.")
    out.mkdir(parents=True, exist_ok=True)
    for name in FORBIDDEN_NAMES:
        if (out / name).exists():
            raise SystemExit(f"Refusing output that collides with baseline name: {name}")

    baseline_hash_before = sha256_file(BASELINE_MODEL) if BASELINE_MODEL.is_file() else None
    manifest = load_manifest(args.manifest.resolve())
    dataset_root = Path(manifest["dataset_root"])
    train_records = [r for r in manifest["records"] if r["split"] == "train"]
    val_records = [r for r in manifest["records"] if r["split"] == "val"]
    weights = class_weights(train_records)

    config = {
        "experiment": "EXP-006",
        "manifest": str(args.manifest.resolve()),
        "manifest_records_sha256": manifest["records_sha256"],
        "dataset_root": str(dataset_root),
        "train_n": len(train_records),
        "val_n": len(val_records),
        "class_names": CLASS_NAMES,
        "class_weights": weights,
        "preprocessing": {
            "color_mode": "rgb",
            "target_size": [224, 224],
            "resize_interpolation": "nearest",
            "keep_aspect_ratio": False,
            "crop": "none; direct resize",
            "normalization": "mobilenet_v2.preprocess_input [-1, 1]",
            "train_augment": "v2.5 reflect/bounded brightness; applied before preprocess_input",
        },
        "baseline_sha256_before": baseline_hash_before,
        "output_dir": str(out),
        "started_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }
    (out / "run_config.json").write_text(json.dumps(config, indent=2) + "\n", encoding="utf-8")
    debug_log("T", "train_from_manifest.py:main", "train_start", config)

    train_seq = ManifestSequence(train_records, dataset_root, args.batch_size, augment=True, shuffle=True)
    val_seq = ManifestSequence(val_records, dataset_root, args.batch_size, augment=False, shuffle=False)

    best_path = out / "freshness_exp006_best.keras"
    final_path = out / "freshness_exp006_final.keras"
    if best_path.name in FORBIDDEN_NAMES or final_path.name in FORBIDDEN_NAMES:
        raise SystemExit("Internal naming error: would overwrite baseline.")

    model, base_model = build_model("mobilenetv2")
    loss_fn = CategoricalCrossentropy(label_smoothing=LABEL_SMOOTHING)
    model.compile(optimizer=Adam(learning_rate=args.lr1), loss=loss_fn, metrics=["accuracy"])

    phase1_cb = [
        EarlyStopping(monitor="val_accuracy", patience=8, restore_best_weights=True, verbose=1),
        ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=3, min_lr=1e-7, verbose=1),
        ModelCheckpoint(filepath=str(best_path), monitor="val_accuracy", save_best_only=True, verbose=1),
        EpochDebugCallback(phase=1),
    ]
    print(f"[EXP-006] train={len(train_records)} val={len(val_records)} out={out}")
    model.fit(
        train_seq,
        epochs=args.epochs1,
        validation_data=val_seq,
        class_weight=weights,
        callbacks=phase1_cb,
    )

    unfreeze_for_finetuning(model, base_model, unfreeze_layers=args.unfreeze_layers, lr=args.lr2)
    phase2_cb = [
        EarlyStopping(monitor="val_accuracy", patience=8, restore_best_weights=True, verbose=1),
        ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=3, min_lr=1e-7, verbose=1),
        ModelCheckpoint(filepath=str(best_path), monitor="val_accuracy", save_best_only=True, verbose=1),
        EpochDebugCallback(phase=2),
    ]
    model.fit(
        train_seq,
        epochs=args.epochs2,
        validation_data=val_seq,
        class_weight=weights,
        callbacks=phase2_cb,
    )

    model.save(final_path)
    baseline_hash_after = sha256_file(BASELINE_MODEL) if BASELINE_MODEL.is_file() else None
    summary = {
        "best": str(best_path),
        "final": str(final_path),
        "baseline_sha256_before": baseline_hash_before,
        "baseline_sha256_after": baseline_hash_after,
        "baseline_unchanged": baseline_hash_before == baseline_hash_after,
        "finished_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }
    (out / "run_summary.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    debug_log("T", "train_from_manifest.py:main", "train_end", summary)
    print(json.dumps(summary, indent=2))
    if not summary["baseline_unchanged"]:
        raise SystemExit("ERROR: baseline freshness_model_best.keras hash changed.")


if __name__ == "__main__":
    main()

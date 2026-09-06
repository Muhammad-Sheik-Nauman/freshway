"""Evaluate a three-class FreshWay model against an immutable split manifest.

This evaluator never copies or modifies source images and loads models with
``compile=False``. It intentionally reconstructs the committed baseline's
direct-nearest-resize MobileNetV2 preprocessing, rather than importing the
current production inference preprocessor (which center-crops before resize).

Usage:
    python training/evaluate_manifest.py --manifest <manifest.json> --model <model.keras> --output <report.json>
"""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import defaultdict
from pathlib import Path
from typing import Any

import numpy as np


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_MANIFEST = PROJECT_ROOT / "experiments" / "manifests" / "baseline_split_v1.json"
DEFAULT_MODEL = PROJECT_ROOT / "server" / "models" / "freshness_model_best.keras"
DEFAULT_OUTPUT = PROJECT_ROOT / "experiments" / "results" / "baseline_reference_v1.json"
CLASS_NAMES = ("fresh", "highly_fresh", "not_fresh")
HUMAN_LABELS = {"fresh": "Fresh", "highly_fresh": "Highly Fresh", "not_fresh": "Not Fresh"}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def canonical_digest(value: Any) -> str:
    payload = json.dumps(value, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def load_manifest(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        manifest = json.load(handle)
    if manifest.get("schema_version") != "freshway-baseline-split-v1":
        raise ValueError(f"Unsupported manifest schema: {manifest.get('schema_version')!r}")
    records = manifest.get("records")
    if not isinstance(records, list) or not records:
        raise ValueError("Manifest has no records.")
    if canonical_digest(records) != manifest.get("records_sha256"):
        raise ValueError("Manifest records digest does not match; refuse evaluation.")
    expected_preprocessing = {
        "color_mode": "rgb",
        "target_size": [224, 224],
        "resize_interpolation": "nearest",
        "keep_aspect_ratio": False,
        "normalization": "tf.keras.applications.mobilenet_v2.preprocess_input (x / 127.5 - 1.0)",
        "crop": "none; direct resize",
    }
    if manifest.get("baseline_preprocessing") != expected_preprocessing:
        raise ValueError("Manifest preprocessing contract differs from baseline_v1; refuse mixed evaluation.")
    return manifest


def resolve_and_verify_records(records: list[dict[str, Any]], dataset_root: Path) -> list[Path]:
    root = dataset_root.resolve()
    paths: list[Path] = []
    for record in records:
        path = (root / record["relative_path"]).resolve()
        if not path.is_relative_to(root):
            raise ValueError(f"Manifest path escapes dataset root: {record['relative_path']}")
        if not path.is_file():
            raise FileNotFoundError(f"Manifest source file is missing: {path}")
        if path.stat().st_size != record["bytes"] or sha256_file(path) != record["sha256"]:
            raise ValueError(f"Manifest source file changed: {path}")
        paths.append(path)
    return paths


def compute_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, Any]:
    matrix = np.zeros((len(CLASS_NAMES), len(CLASS_NAMES)), dtype=int)
    for actual, predicted in zip(y_true, y_pred):
        matrix[int(actual), int(predicted)] += 1

    per_class: dict[str, Any] = {}
    weighted_f1 = 0.0
    for index, class_code in enumerate(CLASS_NAMES):
        true_positive = int(matrix[index, index])
        false_positive = int(matrix[:, index].sum() - true_positive)
        false_negative = int(matrix[index, :].sum() - true_positive)
        support = int(matrix[index, :].sum())
        precision = true_positive / (true_positive + false_positive) if true_positive + false_positive else 0.0
        recall = true_positive / (true_positive + false_negative) if true_positive + false_negative else 0.0
        f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
        weighted_f1 += f1 * support
        per_class[class_code] = {
            "label": HUMAN_LABELS[class_code],
            "precision": round(precision, 6),
            "recall": round(recall, 6),
            "f1_score": round(f1, 6),
            "support": support,
        }

    total = int(len(y_true))
    accuracy = float(np.trace(matrix) / total) if total else 0.0
    macro_f1 = float(np.mean([item["f1_score"] for item in per_class.values()]))
    return {
        "samples": total,
        "accuracy": round(accuracy, 6),
        "accuracy_percent": round(accuracy * 100, 2),
        "macro_f1": round(macro_f1, 6),
        "weighted_f1": round(weighted_f1 / total, 6) if total else 0.0,
        "per_class": per_class,
        "confusion_matrix": {"classes": [HUMAN_LABELS[name] for name in CLASS_NAMES], "matrix": matrix.tolist()},
        "severe_misclassifications": int(matrix[1, 2] + matrix[2, 1]),
    }


def per_source_category_accuracy(records: list[dict[str, Any]], y_pred: np.ndarray) -> dict[str, Any]:
    groups: dict[str, list[tuple[int, int]]] = defaultdict(list)
    for record, predicted in zip(records, y_pred):
        groups[record["source_category"]].append((record["class_index"], int(predicted)))
    result: dict[str, Any] = {}
    for category, pairs in sorted(groups.items()):
        correct = sum(actual == predicted for actual, predicted in pairs)
        result[category] = {
            "samples": len(pairs),
            "accuracy": round(correct / len(pairs), 6),
            "accuracy_percent": round(correct * 100 / len(pairs), 2),
        }
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate a FreshWay model against the baseline_v1 manifest.")
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--model", type=Path, default=DEFAULT_MODEL)
    parser.add_argument("--dataset-root", type=Path, default=None, help="Override the absolute dataset root stored in the manifest.")
    parser.add_argument("--split", choices=("test", "val", "train"), default="test")
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--force", action="store_true", help="Allow replacement of an existing report.")
    parser.add_argument("--verify-only", action="store_true", help="Verify manifest files without loading a model or evaluating.")
    args = parser.parse_args()

    manifest_path = args.manifest.resolve()
    model_path = args.model.resolve()
    output_path = args.output.resolve()
    manifest = load_manifest(manifest_path)
    dataset_root = args.dataset_root.resolve() if args.dataset_root else Path(manifest["dataset_root"])
    records = [record for record in manifest["records"] if record["split"] == args.split]
    if not records:
        raise ValueError(f"Manifest contains no records for split {args.split!r}.")
    paths = resolve_and_verify_records(records, dataset_root)
    print(f"[VERIFIED] {len(paths)} unchanged source files for split={args.split}")
    if args.verify_only:
        return
    if output_path.exists() and not args.force:
        raise SystemExit(f"Refusing to overwrite existing report: {output_path}. Use --force only after review.")
    if not model_path.is_file():
        raise FileNotFoundError(f"Model does not exist: {model_path}")

    import tensorflow as tf

    model = tf.keras.models.load_model(model_path, compile=False, safe_mode=True)
    if tuple(model.input_shape) != (None, 224, 224, 3) or model.output_shape[-1] != len(CLASS_NAMES):
        raise ValueError(f"Model shape is incompatible with baseline_v1: input={model.input_shape}, output={model.output_shape}")

    predictions: list[np.ndarray] = []
    for start in range(0, len(paths), args.batch_size):
        batch_paths = paths[start : start + args.batch_size]
        batch_images = []
        for path in batch_paths:
            image = tf.keras.utils.load_img(
                path,
                color_mode="rgb",
                target_size=(224, 224),
                interpolation="nearest",
                keep_aspect_ratio=False,
            )
            array = tf.keras.utils.img_to_array(image)
            batch_images.append(tf.keras.applications.mobilenet_v2.preprocess_input(array))
        probabilities = model.predict(np.asarray(batch_images, dtype=np.float32), verbose=0)
        predictions.append(np.argmax(probabilities, axis=1))

    y_pred = np.concatenate(predictions)
    y_true = np.asarray([record["class_index"] for record in records], dtype=np.int64)
    report = {
        "evaluation_protocol": "freshway-baseline-evaluation-v1",
        "interpretation": "new reproducible reference evaluation; not a reproduction of the undocumented historical ~69% split",
        "manifest": str(manifest_path),
        "manifest_records_sha256": manifest["records_sha256"],
        "dataset_root": str(dataset_root.resolve()),
        "split": args.split,
        "model": str(model_path),
        "model_sha256": sha256_file(model_path),
        "preprocessing": manifest["baseline_preprocessing"],
        "metrics": compute_metrics(y_true, y_pred),
        "per_source_category": per_source_category_accuracy(records, y_pred),
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"[SAVED] {output_path}")
    print(f"[RESULT] accuracy={report['metrics']['accuracy_percent']}% macro_f1={report['metrics']['macro_f1']}")


if __name__ == "__main__":
    main()

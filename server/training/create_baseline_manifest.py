"""Create a deterministic, source-data-read-only FreshWay split manifest.

The manifest assigns every original JPEG to train, validation, or test without
copying, moving, renaming, or changing any source image.  It is intentionally
standard-library-only so that the data contract can be recreated independently
of TensorFlow.

Usage:
    python training/create_baseline_manifest.py
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import random
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DATASET_ROOT = PROJECT_ROOT.parent / "fish_dataset"
DEFAULT_OUTPUT = PROJECT_ROOT / "experiments" / "manifests" / "baseline_split_v1.json"

MANIFEST_VERSION = "freshway-baseline-split-v1"
SEED = 20260904
SPLIT_RATIOS = {"train": 0.70, "val": 0.15, "test": 0.15}
SPLIT_ORDER = ("train", "val", "test")
CLASS_MAPPING = {
    "fresh": {"index": 0, "label": "Fresh"},
    "highly_fresh": {"index": 1, "label": "Highly Fresh"},
    "not_fresh": {"index": 2, "label": "Not Fresh"},
}
JPEG_SUFFIXES = {".jpg", ".jpeg"}


def normalize_category_name(name: str) -> str:
    """Normalize incidental spacing in the source directory names."""
    return re.sub(r"\s+", " ", name).strip()


def parse_source_category(directory_name: str) -> tuple[str, str]:
    """Return the normalized species name and three-class freshness code."""
    normalized = normalize_category_name(directory_name)
    suffix_mapping = (
        (" - Highly Fresh", "highly_fresh"),
        (" - Not Fresh", "not_fresh"),
        (" - Fresh", "fresh"),
    )
    for suffix, class_code in suffix_mapping:
        if normalized.endswith(suffix):
            species = normalized[: -len(suffix)].strip()
            if species:
                return species, class_code
    raise ValueError(
        f"Cannot map source directory {directory_name!r}. "
        "Expected '<species> - Fresh', '<species> - Highly Fresh', or "
        "'<species> - Not Fresh'."
    )


def sha256_file(path: Path) -> str:
    """Return a content hash without altering the source file."""
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def split_counts(total: int) -> dict[str, int]:
    """Apportion each stratum with largest-remainder rounding.

    The counts sum exactly to the stratum size and remain as close as possible
    to 70/15/15. Ties resolve in train, validation, test order.
    """
    quotas = {split: total * ratio for split, ratio in SPLIT_RATIOS.items()}
    counts = {split: math.floor(quotas[split]) for split in SPLIT_ORDER}
    remaining = total - sum(counts.values())
    ranked = sorted(
        SPLIT_ORDER,
        key=lambda split: (-(quotas[split] - counts[split]), SPLIT_ORDER.index(split)),
    )
    for split in ranked[:remaining]:
        counts[split] += 1
    return counts


def stratum_seed(seed: int, source_category: str) -> int:
    """Derive a platform-stable shuffle seed for one species/freshness stratum."""
    payload = f"{seed}|{source_category}".encode("utf-8")
    return int.from_bytes(hashlib.sha256(payload).digest()[:8], "big")


def canonical_digest(value: Any) -> str:
    payload = json.dumps(value, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def collect_source_files(dataset_root: Path) -> dict[str, list[Path]]:
    """Collect JPEGs from the 24 original category directories only."""
    if not dataset_root.is_dir():
        raise FileNotFoundError(f"Dataset root does not exist: {dataset_root}")

    strata: dict[str, list[Path]] = {}
    for directory in sorted((path for path in dataset_root.iterdir() if path.is_dir()), key=lambda p: p.name.casefold()):
        normalized_category = normalize_category_name(directory.name)
        parse_source_category(normalized_category)
        files = sorted(
            (
                path
                for path in directory.iterdir()
                if path.is_file() and path.suffix.casefold() in JPEG_SUFFIXES
            ),
            key=lambda path: path.name.casefold(),
        )
        if not files:
            raise ValueError(f"No JPEG files found in source category: {directory}")
        strata[normalized_category] = files

    if len(strata) != 24:
        raise ValueError(f"Expected 24 source categories; found {len(strata)}.")
    return strata


def assign_splits(strata: dict[str, list[Path]], seed: int) -> dict[Path, str]:
    """Assign a deterministic split independently inside every source stratum."""
    assignments: dict[Path, str] = {}
    for source_category, files in strata.items():
        shuffled = list(files)
        random.Random(stratum_seed(seed, source_category)).shuffle(shuffled)
        counts = split_counts(len(shuffled))
        boundaries = {
            "train": counts["train"],
            "val": counts["train"] + counts["val"],
        }
        for index, path in enumerate(shuffled):
            split = "train" if index < boundaries["train"] else "val" if index < boundaries["val"] else "test"
            assignments[path] = split
    return assignments


def build_manifest(dataset_root: Path, seed: int) -> dict[str, Any]:
    """Build a self-validating manifest with per-file content hashes."""
    dataset_root = dataset_root.resolve()
    strata = collect_source_files(dataset_root)
    assignments = assign_splits(strata, seed)
    records: list[dict[str, Any]] = []

    for source_category, files in strata.items():
        species, class_code = parse_source_category(source_category)
        for path in files:
            relative_path = path.relative_to(dataset_root).as_posix()
            records.append(
                {
                    "relative_path": relative_path,
                    "source_category": source_category,
                    "species": species,
                    "class_code": class_code,
                    "class_index": CLASS_MAPPING[class_code]["index"],
                    "split": assignments[path],
                    "bytes": path.stat().st_size,
                    "sha256": sha256_file(path),
                }
            )

    records.sort(key=lambda record: record["relative_path"].casefold())
    summary: dict[str, Any] = {"total_images": len(records), "splits": {}}
    for split in SPLIT_ORDER:
        split_records = [record for record in records if record["split"] == split]
        class_counts = Counter(record["class_code"] for record in split_records)
        stratum_counts = Counter(record["source_category"] for record in split_records)
        summary["splits"][split] = {
            "images": len(split_records),
            "class_counts": {class_code: class_counts[class_code] for class_code in CLASS_MAPPING},
            "stratum_counts": dict(sorted(stratum_counts.items())),
        }

    return {
        "schema_version": MANIFEST_VERSION,
        "dataset_root": str(dataset_root),
        "seed": seed,
        "split_ratios": SPLIT_RATIOS,
        "split_algorithm": "per-24-stratum SHA-256-derived Mersenne-Twister shuffle with largest-remainder 70/15/15 apportionment",
        "class_mapping": CLASS_MAPPING,
        "baseline_preprocessing": {
            "color_mode": "rgb",
            "target_size": [224, 224],
            "resize_interpolation": "nearest",
            "keep_aspect_ratio": False,
            "normalization": "tf.keras.applications.mobilenet_v2.preprocess_input (x / 127.5 - 1.0)",
            "crop": "none; direct resize",
        },
        "records_sha256": canonical_digest(records),
        "summary": summary,
        "records": records,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Create FreshWay's deterministic baseline split manifest.")
    parser.add_argument("--dataset-root", type=Path, default=DEFAULT_DATASET_ROOT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--seed", type=int, default=SEED)
    parser.add_argument("--force", action="store_true", help="Allow replacement of an existing manifest.")
    args = parser.parse_args()

    output = args.output.resolve()
    if output.exists() and not args.force:
        raise SystemExit(f"Refusing to overwrite existing manifest: {output}. Use --force only after review.")

    manifest = build_manifest(args.dataset_root, args.seed)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    print(f"[CREATED] {output}")
    print(f"[DATA] {manifest['summary']['total_images']} source JPEGs; seed={manifest['seed']}")
    for split in SPLIT_ORDER:
        details = manifest["summary"]["splits"][split]
        print(f"[SPLIT] {split}: {details['images']} images; {details['class_counts']}")
    print(f"[DIGEST] records_sha256={manifest['records_sha256']}")


if __name__ == "__main__":
    main()

# Diagnosis: why EXP-005 is 38.07% (2026-09-06)

Read-only. No training. No edits to model, dataset, manifest, evaluator, or production inference.

## Training class mapping (architecture-matched source)

Git commit `8901efd` (`server/training/train_freshness_classifier.py`) is the **only** committed trainer whose head matches the saved file:

`GAP → Dense(256, ReLU) → BN → Dropout(0.50) → Dense(128, ReLU) → BN → Dropout(0.30) → Dense(3, softmax)`

```python
CLASS_NAMES = ["fresh", "highly_fresh", "not_fresh"]
# flow_from_directory(..., classes=CLASS_NAMES, class_mode="categorical")
# → class_indices {'fresh': 0, 'highly_fresh': 1, 'not_fresh': 2}
```

Later commit `3b6d92b` and current `train_freshness_classifier.py` keep the **same** `classes=` order but use a **different head** (512→256→128, then v2.5 Swish-128). Those scripts did **not** produce this `.keras` file.

The `.keras` zip has **no** `class_names` / `class_indices` / `"fresh"` strings (`metadata.json` only has `keras_version` 3.13.2 and `date_saved` 2026-02-22). Softmax is unnamed 3-way. Ordering is **not** embedded in the weights.

## Training preprocessing (8901efd, architecture match)

- RGB `flow_from_directory`, `target_size=(224,224)`
- Interpolation: Keras default **`nearest`**, `keep_aspect_ratio=False`
- Crop/letterbox: **none** (direct resize)
- Normalization: **`rescale=1.0/255` → [0, 1]** (train and val). **No** `mobilenet_v2.preprocess_input`. **No** `Rescaling` layer in the saved graph.
- Train-only aug: rotation 30°, shifts 0.2, shear 0.15, zoom 0.2, hflip, brightness [0.8, 1.2], `fill_mode="nearest"`. Val: rescale only.

Commit `3b6d92b` (docs/EXP-001 story) instead used `preprocess_input` **[-1, 1]** and the 512-head — **architecture mismatch with these weights**.

## Evaluator class mapping

`evaluate_manifest.py` / manifest: `fresh=0`, `highly_fresh=1`, `not_fresh=2`. **Matches** `classes=CLASS_NAMES` in every trainer revision.

## Evaluator preprocessing

RGB, nearest 224×224, no crop, **`mobilenet_v2.preprocess_input` → [-1, 1]**.

## Whether they match

| Item | Match? |
| :--- | :--- |
| Class index order vs 8901efd / 3b6d92b / current trainer | **Yes** |
| Resize / nearest / no crop | **Yes** (val path; aug is train-only) |
| Normalization vs **architecture-matched** 8901efd | **No** (`[0,1]` vs `[-1,1]`) |
| Normalization vs **documented** 3b6d92b / EXP-001 | Yes on paper, but those scripts **do not** match this file’s head |
| Docs’ 512→256→128 head for this `.keras` | **Not supported** by the archive |

## Runtime checks (not a new official split)

- All 6 label permutations of the EXP-005 matrix: **identity is best** (38.07%). Next 37.31%. Rejects a simple class-swap.
- Same 654 test images, same nearest resize: `[-1,1]` **38.07%** (pred counts 515 / 135 / 4); `[0,1]` **34.71%** (603 / 17 / 34). Matching 8901efd’s rescale **does not recover** accuracy.
- Majority-class dummy on this test set (always Highly Fresh) = **40.21%**. The model is **below** that dummy.

## Most likely explanation for 38%

**Not** a class-index bug. **Not** “evaluator nearest-resize vs train bilinear.”  

The on-disk model is the **early 256/128 head**, with **no stored labels**, almost always predicting index 0 on this **new** test split. EXP-005’s `[-1,1]` contract matches later docs, not the 8901efd generator that matches the head; switching to `[0,1]` still ~35%. So 38% is the artifact’s **true behavior on `baseline_split_v1`**, not a recoverable 69%. Historical ~69% remains a **different, unrecovered** split/script claim and must not be attached to this file.

## Evidence files

- `git show 8901efd:server/training/train_freshness_classifier.py`
- `git show 3b6d92b:server/training/train_freshness_classifier.py`
- `server/models/freshness_model_best.keras` metadata + head
- `server/training/evaluate_manifest.py`
- `experiments/results/baseline_reference_v1.json`
- `debug-5bce46.log` (permutation + dual-norm)

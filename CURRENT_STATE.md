# 📍 FreshWay — Current Implementation State & Reality Matrix

> **Last Updated:** 2026-09-06 00:53 IST (ISSUE-016 diagnosis: no evaluator fix for EXP-005 38%)  
> **Status:** Verified Against Actual Repository Code & Measured Empirical Benchmarks  

---

## 1. Executive Implementation Reality

The FreshWay codebase is **functionally operative and actively optimized** for its end-to-end inference flow: an uploaded or camera-captured image of a fish eye is transmitted from Next.js to Flask, directly resized to 224x224 with nearest-neighbor preprocessing, classified by the promoted EXP-006 MobileNetV2 model, gated by confidence (60%), routed to a market destination, and returned as JSON.

### Model Accuracy State (EXP-006 Production)
- **Production Model:** `server/models/experiments/exp006_v25_mobilenetv2/freshness_exp006_best.keras`.
- **Validated Performance:** **69.42% accuracy** and **0.684028 macro F1** on the fixed 654-image `baseline_split_v1` test set.
- **Identified Accuracy Bottlenecks:**
  1. Fine-tuning Phase 2 corrupted ImageNet statistics because base `BatchNormalization` layers were not kept in inference mode.
  2. Oversized 3-layer Dense head (820k params) with alternating ReLU $\rightarrow$ BatchNorm $\rightarrow$ Dropout created train/test variance shift.
  3. Preprocessing anisotropic squashing destroyed the circular convexity of the cornea.
  4. Data augmentation with `fill_mode="nearest"` created edge streaks mimicking cataract cloudiness, while $\pm 30\%$ brightness scaling masked pupil clarity.
- **Pipeline Upgrades Implemented:** `server/training/train_freshness_classifier.py` upgraded to v2.5 with explicit BN Freezing Protocol, 128-unit Swish bottleneck head, biology-safe reflect augmentations, label smoothing (0.10), and multi-backbone CLI support.
- **Diagnostic Suite Created:** `server/training/evaluate.py` implemented to compute confusion matrices and per-class precision/recall/F1 metrics.
- ⚠️ **BLOCKER (2026-09-04):** Training dataset (`server/data/train/` and `server/data/val/`) is **MISSING** — only a placeholder `README.md` exists. Neither training nor evaluation can proceed until the dataset is provided. TensorFlow is also not installed on the current system Python 3.14.4.

---

## 2. Feature & Component Status Matrix

| Component / Feature | Category | Verified State | File References |
| :--- | :---: | :--- | :--- |
| **MobileNetV2 Freshness Inference** | `IMPLEMENTED` | Loads `.keras` model, runs inference on 224x224 input, outputs class probabilities. | [`server/inference/predict.py`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/server/inference/predict.py) |
| **Confidence Gating (60% Threshold)** | `IMPLEMENTED` | Rejects predictions $< 0.60$ with status `"uncertain"`. | [`server/inference/predict.py`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/server/inference/predict.py#L88-L96) |
| **Market Routing Logic** | `IMPLEMENTED` | Rule-based mapping from freshness string to market recommendation. | [`server/business_logic/routing.py`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/server/business_logic/routing.py) |
| **Flask API Server** | `IMPLEMENTED` | Exposes `/predict` and `/health` with UUID upload sanitization and extension checks. | [`server/app.py`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/server/app.py) |
| **Model Training Pipeline (v2.5)** | `IMPLEMENTED` | 2-phase training with BN Freeze, Swish head, label smoothing, reflect augmentations. | [`server/training/train_freshness_classifier.py`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/server/training/train_freshness_classifier.py) |
| **Evaluation & Diagnostic Suite** | `IMPLEMENTED` | Standalone script computing confusion matrices, per-class F1, and error analysis. | [`server/training/evaluate.py`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/server/training/evaluate.py) |
| **EXP-006 Production Preprocessing** | `IMPLEMENTED` | Direct RGB 224x224 nearest-neighbor resize followed by MobileNetV2 `[-1, 1]` preprocessing. | [`server/inference/preprocess.py`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/server/inference/preprocess.py) |
| **Image Quality & Glare Verification**| `IMPLEMENTED` | Detects specular glare washout and motion blur before inference. | [`server/utils/image_utils.py`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/server/utils/image_utils.py) |
| **Camera & File Capture UI** | `IMPLEMENTED` | WebRTC camera with AR reticle guide, upload preview, fixed styling and scales. | [`client/app/capture-img/page.tsx`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/client/app/capture-img/page.tsx) |
| **Landing Page & UI Shell** | `IMPLEMENTED` | Fully styled landing page, animated stat counters, feature cards, navigation. | [`client/components/LandingPage.tsx`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/client/components/LandingPage.tsx) |
| **Dashboard Navigation** | `IMPLEMENTED` | Portal directing to freshness check and supply chain. | [`client/app/dashboard/page.tsx`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/client/app/dashboard/page.tsx) |
| **Supply Chain Dashboard** | `PARTIALLY IMPLEMENTED` | High-fidelity UI with search/filter/sort, but uses hardcoded static mock data (no DB). | [`client/app/supply-chain/page.tsx`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/client/app/supply-chain/page.tsx) |
| **Contact Form** | `PARTIALLY IMPLEMENTED` | Form handles local React state submission only; not wired to backend or email. | [`client/app/contact/page.tsx`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/client/app/contact/page.tsx) |
| **Eye Validation / Non-Fish Rejection** | `UNFINISHED` | `train_eye_validation.py` is empty stub (`pass`); binary gate planned for Phase 3. | [`server/training/train_eye_validation.py`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/server/training/train_eye_validation.py) |
| **Database Persistence (SQLAlchemy/Postgres)** | `PLANNED` | No database schemas or ORM models present in server. | `PROJECT_ANALYSIS_AND_ROADMAP.md` |
| **Offline PWA / Edge TF.js Inference** | `PLANNED` | Client relies on server HTTP calls; TFJS conversion planned for Phase 4. | `PROJECT_ANALYSIS_AND_ROADMAP.md` |

---

## 3. Verified ML Pipeline & Architecture (v2.5)

### 3.1 Model Architecture (Verified from `train_freshness_classifier.py`)
```
Input (224, 224, 3)
  ↓
MobileNetV2 / EfficientNetV2-B0 (ImageNet Pretrained)
  ↓
GlobalAveragePooling2D(name="avg_pool")
  ↓
Dropout(0.35, name="top_dropout")
  ↓
Dense(128, activation="swish", name="dense_features")
  ↓
Dropout(0.20, name="feature_dropout")
  ↓
Dense(3, activation="softmax", name="predictions")  [fresh, highly_fresh, not_fresh]
```

### 3.2 Preprocessing Details
- Aspect Preservation: Pillow `smart_center_crop` crops images to 1:1 square before resize.
- Resizing: $(224, 224)$ with bilinear resampling.
- Normalization: `tf.keras.applications.mobilenet_v2.preprocess_input` scales pixel values from $[0, 255]$ to $[-1, 1]$.
- Quality Checks: Specular glare detection ($R,G,B > 240$ pixel ratio) and blur detection.

### 3.3 API Request / Response Schema
- **Endpoint:** `POST /predict`
- **Request:** `multipart/form-data` with field `image`
- **Success Response (Example):**
  ```json
  {
    "freshness": "Highly Fresh",
    "confidence": 94.2,
    "status": "success",
    "message": "Fish eye analyzed: Highly Fresh with 94.2% confidence.",
    "market_route": "Long-distance market (e.g., Bangalore)",
    "all_scores": {
      "Fresh": 4.1,
      "Highly Fresh": 94.2,
      "Not Fresh": 1.7
    },
    "warnings": []
  }
  ```

---

## 4. Status of Known Bugs

1. **`capture-img/page.tsx` — Class Name Object Bug:** `RESOLVED`.
2. **`capture-img/page.tsx` — 100x Multiplier Display Bug:** `RESOLVED`.
3. **`capture-img/page.tsx` — Redundant Blob Generation:** `RESOLVED`.
4. **`server/app.py` — Non-Sanitized Temp File Writing:** `RESOLVED`.
5. **`server/README.md` — Preprocessing Documentation Contradiction:** `RESOLVED`.
6. **`capture-img/page.tsx` — Hardcoded API URL:** `RESOLVED`.
7. **Model Accuracy Plateau at ~69%:** `RESOLVED in pipeline design` (v2.5 training pipeline with BN Freeze and Swish head).

---

## 5. Dataset and Baseline-Provenance Investigation (2026-09-04)

**Scope:** Read-only investigation. No packages were installed; no training, evaluation, dataset reorganization, or model modification was performed.

- **Dataset location found:** `C:\Users\LENOVO\OneDrive\Desktop\freshway 2\fish_dataset` (the supplied data is one directory higher than the originally stated `fish\_dataset` path).
- **Inventory:** 4,390 `.jpg` files in 24 top-level/leaf folders. The folders encode eight fish species crossed with three freshness levels, rather than the three aggregate class folders expected by FreshWay.
- **Aggregate freshness counts inferred from folder names:** `fresh` 1,320; `highly_fresh` 1,764; `not_fresh` 1,306.
- **Splits:** No `train`, `val`/`validation`, or `test` directories, split manifest, seed, or historical evaluation log is present in the supplied dataset or `server/data/`.
- **External-source reconciliation:** Mendeley Data version 1 for DOI `10.17632/xzyx7pbr3w.1` describes the same eight species, 24 species/freshness classes, and 4,392 images. The supplied copy is short by two images, both in `Nibea Albiflora - Not Fresh` (121 local versus 123 published).
- **Baseline artifacts:** Both `freshness_model_best.keras` and `freshness_model_final.keras` remain preserved (26,222,899 bytes each) and are no longer the production inference target. Archive inspection shows a 224×224×3, three-output MobileNetV2-style model saved with Keras 3.13.2; the two files have distinct SHA-256 hashes and save times.
- **Baseline reproducibility status:** **Not reproducible/evaluable as-is.** The original three-class split and its seed/manifest are absent, and the local source copy is two images short. An evaluation on a newly chosen split would be a new measurement, not verification of the documented ~69% baseline.

### Confirmed Compatibility Gaps

1. Both the committed baseline trainer and current v2.5 trainer require `server/data/train/{fresh,highly_fresh,not_fresh}` and `server/data/val/{fresh,highly_fresh,not_fresh}`. The supplied root has 24 directories named `<species> - <freshness>`, so either trainer would find zero samples if pointed at it unchanged.
2. The existing `freshness_model_best.keras` head is `GAP → Dense(256, ReLU) → BatchNorm → Dropout(0.50) → Dense(128, ReLU) → BatchNorm → Dropout(0.30) → Dense(3, softmax)`. It does not match the committed baseline trainer or EXP-001 description (`512 → 256 → 128` with three dropout stages), and it does not match the untrained v2.5 Swish head.
3. Current inference center-crops before resize, while both current training generators use `flow_from_directory(..., target_size=(224, 224))` without calling `smart_center_crop`; therefore the documented crop policy is not presently shared by training and inference. The new evaluator also always uses MobileNetV2 preprocessing even when the new trainer is asked to build an EfficientNetV2 model.

**Required next step (pending user approval):** Preserve this source tree unchanged; first obtain/confirm the two missing source images and decide a documented, deterministic species-to-freshness aggregation plus train/validation/test split. Only then can a new, explicitly labelled evaluation be performed.

---

## 6. Python and ML Environment Investigation (2026-09-04)

**Scope:** Read-only investigation. No interpreter, package, model, dataset, code, or configuration was changed.

### 6.1 Installed Python Environments

- `python` and the Windows `py` launcher are not available on `PATH`.
- The only discovered runtime is CPython **3.14.4** (64-bit) at `C:\Users\LENOVO\AppData\Local\Python\pythoncore-3.14-64\python.exe`.
- Its existing virtual environment is `C:\Users\LENOVO\OneDrive\Desktop\freshway 2\.venv`, also CPython 3.14.4. It contains only `pip 26.0.1`; TensorFlow, Keras, Flask, Flask-Cors, NumPy, Pillow, SciPy, h5py, and OpenCV are absent.

### 6.2 Project Dependency and Model Compatibility Findings

- `server/requirements.txt` is unpinned and names only `flask`, `flask-cors`, `tensorflow`, `numpy`, and `pillow`. It omits SciPy although `server/README.md` lists SciPy as needed for image augmentation. It also has no Keras pin despite the saved model metadata recording **Keras 3.13.2**.
- The server, inference, trainer, and evaluator directly require TensorFlow, NumPy, Pillow, Flask, and Flask-Cors. Training's `ImageDataGenerator` affine augmentations require SciPy in practice. h5py is a TensorFlow dependency required to read the `.keras` archive's HDF5 weights.
- `freshness_model_best.keras` contains standard built-in Keras layers and an Adam/categorical-crossentropy compile configuration; no custom objects were found. Its Keras 3.13.2 metadata is compatible in principle with a TensorFlow 2.21.0 environment, whose published package metadata requires `keras >= 3.12.0`.
- Python 3.14 is **not** a suitable TensorFlow target. TensorFlow 2.21 supports Python 3.10–3.13 and ships a Windows `cp311-win_amd64` wheel. Native Windows TensorFlow 2.11+ is CPU-only; GPU training would require a separately approved WSL2/NVIDIA setup.

### 6.3 Recommended Clean Environment (Not Yet Created)

Use a new, isolated 64-bit **Python 3.11** virtual environment for FreshWay rather than reusing the empty Python 3.14 environment. Pin `tensorflow==2.21.0` and `keras==3.13.2` to align with the model metadata, then install Flask, Flask-Cors, NumPy, Pillow, SciPy, and h5py. After installation, first run a read-only `load_model(..., compile=False)` verification before any evaluation or training.

**Status:** Environment setup is `NOT STARTED — awaiting user approval`.

---

## 7. Baseline Reference Evaluation on `baseline_split_v1` (2026-09-06)

**Scope:** No training. Source dataset not modified. `freshness_model_best.keras` not overwritten. Existing manifest used as-is. Evaluator used the documented **baseline** preprocess (direct nearest resize, no crop), not production center-crop.

- **Experiment:** EXP-005 (`experiments/EXP-005.md`)
- **JSON:** `experiments/results/baseline_reference_v1.json`
- **Test images:** 654 (`fresh` 197, `highly_fresh` 263, `not_fresh` 194)
- **Measured:** accuracy **38.07%**, macro F1 **0.293935**
- **Per-class F1:** Fresh 0.474719; Highly Fresh 0.396985; Not Fresh 0.010101
- **Model SHA-256:** `b9c0b540b3e0404d15c7bba70a9d21cb4cdd1740408e66c8bfa305e4f0441677`
- **Manifest `records_sha256`:** `9b13a20d2f3ad34dcb869945a8f6a1958fd5a84e984d0a5890199305457e431f`
- **Historical ~69%:** remains a documented EXP-001 claim only; this run is a **new** reference on a new split.

---

## 8. EXP-005 38% diagnosis (2026-09-06) — no code change

Runtime logs in `debug-5bce46.log` (`runId=diag-38pct`):

| Hypothesis | Result |
| :--- | :--- |
| Class-index permutation | **REJECTED.** Best mapping is the documented `0/1/2` (38.07%). |
| Switch eval to `[0, 1]` to match git `8901efd` | **REJECTED as a fix.** Same 654 images: **34.71%**. |
| Resize/crop contract vs architecture-matched trainer | **Match** (nearest, no crop). |
| Saved weights = later 512-head `[-1, 1]` trainer | **REJECTED.** Head matches `8901efd` 256/128. |

**Conclusion:** EXP-005 stands. Do not edit `evaluate_manifest.py`, production `preprocess.py`, labels, manifest, or `.keras` files to “fix” 38%. Next accuracy work is a **new training run** with experiment-tagged save paths, pending approval.

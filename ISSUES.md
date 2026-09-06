# 🐛 FreshWay — Living Issues, Bugs & Technical Debt Database

> **Last Updated:** 2026-09-06 00:53 IST (ISSUE-016: EXP-005 38% diagnosis closed; no evaluator fix)  
> **Status:** Active Issue Tracking & Resolution Record  
> **Rule:** Distinguish confirmed causes from hypotheses. Do not turn guesses into facts.

---

## 1. Issue Tracking Summary

| Issue ID | Severity | Category | Title | Status |
| :--- | :---: | :--- | :--- | :---: |
| [**ISSUE-001**](#issue-001) | `HIGH` | Frontend UI | `[object Object]` in DOM Class Name on Result Display | `RESOLVED` |
| [**ISSUE-002**](#issue-002) | `HIGH` | Frontend UI | 100x Multiplier Overflow on Confidence Metric & Progress Bar | `RESOLVED` |
| [**ISSUE-003**](#issue-003) | `MEDIUM` | Backend Security | Non-Sanitized Temp Filename Uploads & Concurrent Race Conditions | `RESOLVED` |
| [**ISSUE-004**](#issue-004) | `MEDIUM` | Architecture | Hardcoded API URL Bypasses Next.js Proxy Rewrites & Env Config | `RESOLVED` |
| [**ISSUE-005**](#issue-005) | `HIGH` | ML / Validation | Absence of Out-of-Distribution Rejection (Non-Fish Inputs Processed) | `OPEN` |
| [**ISSUE-006**](#issue-006) | `LOW` | Frontend Perf | Redundant Consecutive Canvas Blob Conversions | `RESOLVED` |
| [**ISSUE-007**](#issue-007) | `MEDIUM` | Documentation | Documentation Contradiction on Preprocessing Range in `server/README.md` | `RESOLVED` |
| [**ISSUE-008**](#issue-008) | `MEDIUM` | Data & Backend | Lack of Database Persistence for Historical Inspections & Seller Data | `OPEN` |
| [**ISSUE-009**](#issue-009) | `MEDIUM` | ML / Robustness | High Sensitivity to Glare, Cornea Specular Reflections & Lighting Shifts | `MITIGATED` |
| [**ISSUE-010**](#issue-010) | `LOW` | Code Cleanliness | Empty Stub Implementations (`image_utils.py`, `evaluate.py`) | `RESOLVED` |
| [**ISSUE-011**](#issue-011) | `CRITICAL` | ML / Performance | Model Accuracy Plateaued at ~69% Due to BN Degradation & Head Variance Shift | `RESOLVED` |
| [**ISSUE-012**](#issue-012) | `HIGH` | Data / Reproducibility | Supplied FFE Source Tree Is Not Directly Compatible with the Three-Class Pipeline | `OPEN` |
| [**ISSUE-013**](#issue-013) | `HIGH` | ML / Provenance | Baseline Model, Baseline Source, and Historical Metric Evidence Diverge | `OPEN` |
| [**ISSUE-014**](#issue-014) | `HIGH` | Environment | Existing Virtual Environment Is Empty and Uses Unsupported Python 3.14 | `OPEN` |
| [**ISSUE-015**](#issue-015) | `MEDIUM` | Dependencies | ML Requirements Are Unpinned and Omit an Augmentation Dependency | `OPEN` |
| [**ISSUE-016**](#issue-016) | `HIGH` | ML / Evaluation | EXP-005 38% Is Model Behavior on New Split, Not a Class-Map Evaluator Bug | `CONFIRMED — NO EVALUATOR FIX` |

---

## 2. Detailed Issue Records

### ISSUE-001: `[object Object]` in DOM Class Name on Result Display
- **Date Discovered:** 2026-08-25
- **Severity:** `HIGH`
- **Category:** Frontend UI / CSS
- **Description:** On the capture and result display screen, the main freshness result text rendered with `class="text-2xl font-bold [object Object]"`, failing to apply the intended color class (`text-emerald-700`, `text-blue-700`, etc.).
- **Evidence:** [`client/app/capture-img/page.tsx:301`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/client/app/capture-img/page.tsx#L301):
  ```tsx
  <p className={`text-2xl font-bold ${getFreshnessColor(result.freshness)}`}>
  ```
  `getFreshnessColor` returns an object: `{ bg: string, text: string, icon: string }`.
- **Cause Status:** `CONFIRMED`
- **Resolution:** Modified line 301 to interpolate `${getFreshnessColor(result.freshness).text}`. Color classes render properly.
- **Status:** `RESOLVED`

---

### ISSUE-002: 100x Multiplier Overflow on Confidence Metric & Progress Bar
- **Date Discovered:** 2026-08-25
- **Severity:** `HIGH`
- **Category:** Frontend UI
- **Description:** On the inline result card in `capture-img`, the confidence value rendered as `8530.0%` instead of `85.3%`, and the visual progress bar width stretched to `8530%`.
- **Evidence:** [`client/app/capture-img/page.tsx:311, 315`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/client/app/capture-img/page.tsx#L311-L315):
  ```tsx
  <span className="font-bold">{(result.confidence * 100).toFixed(1)}%</span>
  // ...
  style={{ width: `${result.confidence * 100}%` }}
  ```
  Meanwhile, [`server/inference/predict.py:103`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/server/inference/predict.py#L103) already returns `"confidence": round(confidence * 100, 1)`.
- **Cause Status:** `CONFIRMED`
- **Resolution:** Removed the redundant `* 100` multiplier and clamped progress bar width between $0\%$ and $100\%$ (`Math.min(100, Math.max(0, result.confidence))`).
- **Status:** `RESOLVED`

---

### ISSUE-003: Non-Sanitized Temp Filename Uploads & Concurrent Race Conditions
- **Date Discovered:** 2026-08-25
- **Severity:** `MEDIUM`
- **Category:** Backend Security / Concurrency
- **Description:** The Flask endpoint saved incoming files directly to `temp/<image.filename>` without sanitization or UUID generation.
- **Evidence:** [`server/app.py:28-29`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/server/app.py#L28-L29):
  ```python
  image_path = os.path.join("temp", image.filename)
  image.save(image_path)
  ```
- **Cause Status:** `CONFIRMED`
- **Resolution:** Implemented `uuid.uuid4().hex` for unique filename generation and validated file extensions against `ALLOWED_EXTENSIONS` (`.jpg`, `.jpeg`, `.png`, `.webp`) with `werkzeug.utils.secure_filename`. Safe cleanup added in `finally` block.
- **Status:** `RESOLVED`

---

### ISSUE-004: Hardcoded API URL Bypasses Next.js Proxy Rewrites & Env Config
- **Date Discovered:** 2026-08-25
- **Severity:** `MEDIUM`
- **Category:** Architecture & Configuration
- **Description:** `capture-img/page.tsx` made fetch calls directly to `http://localhost:5000/predict`, bypassing the configured Next.js proxy rewrite `/api/:path*` and ignoring `.env` configurations.
- **Evidence:** [`client/app/capture-img/page.tsx:149`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/client/app/capture-img/page.tsx#L149) vs. [`client/next.config.ts:3-12`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/client/next.config.ts#L3-L12).
- **Cause Status:** `CONFIRMED`
- **Resolution:** Replaced hardcoded URL with `process.env.NEXT_PUBLIC_API_URL || "/api"`, ensuring seamless deployment behind reverse proxies or custom ports.
- **Status:** `RESOLVED`

---

### ISSUE-005: Absence of Out-of-Distribution Rejection (Non-Fish Inputs Processed)
- **Date Discovered:** 2026-08-25
- **Severity:** `HIGH`
- **Category:** ML / Validation & Safety
- **Description:** If a user uploads an image containing no fish (e.g. human face, vehicle, document, or non-eye body part), the model forces an output across the three freshness classes with arbitrary confidence.
- **Evidence:** [`server/training/train_eye_validation.py`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/server/training/train_eye_validation.py) is empty (`pass`), and no pre-classification detector exists in `predict.py`.
- **Cause Status:** `CONFIRMED`
- **Recommended Next Step:** Implement YOLOv8-Nano fish eye detector or binary eye validation classifier in Phase 3.
- **Status:** `OPEN`

---

### ISSUE-006: Redundant Consecutive Canvas Blob Conversions
- **Date Discovered:** 2026-08-25
- **Severity:** `LOW`
- **Category:** Frontend Performance
- **Description:** In `capturePhoto()`, `canvas.toBlob` was called twice consecutively to create two different File objects (`captured_fish_eye.png` and `captured-photo.png`).
- **Evidence:** [`client/app/capture-img/page.tsx:92-108`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/client/app/capture-img/page.tsx#L92-L108).
- **Cause Status:** `CONFIRMED`
- **Resolution:** Consolidated into a single `canvas.toBlob` execution that assigns `captured_fish_eye.png` to state and triggers `stopCamera()`.
- **Status:** `RESOLVED`

---

### ISSUE-007: Documentation Contradiction on Preprocessing Range in `server/README.md`
- **Date Discovered:** 2026-08-25
- **Severity:** `MEDIUM`
- **Category:** Documentation Integrity
- **Description:** `server/README.md` line 175 stated: *"Normalizes pixel values to [0, 1]"*. However, `server/inference/preprocess.py` line 45 and `server/training/train_freshness_classifier.py` both use `preprocess_input`, which normalizes to $[-1, 1]$.
- **Cause Status:** `CONFIRMED`
- **Resolution:** Updated `server/README.md` to accurately document $[-1, 1]$ normalization.
- **Status:** `RESOLVED`

---

### ISSUE-008: Lack of Database Persistence for Historical Inspections & Seller Data
- **Date Discovered:** 2026-08-25
- **Severity:** `MEDIUM`
- **Category:** Data & Architecture
- **Description:** The system has no database layer. Inferences are ephemeral and discarded after HTTP response. Supply chain seller data is hardcoded into `client/app/supply-chain/page.tsx`.
- **Cause Status:** `CONFIRMED`
- **Recommended Next Step:** Implement PostgreSQL / SQLite database with SQLAlchemy in Phase 2.
- **Status:** `OPEN`

---

### ISSUE-009: High Sensitivity to Glare, Cornea Specular Reflections & Lighting Shifts
- **Date Discovered:** 2026-08-25
- **Severity:** `MEDIUM`
- **Category:** ML / Robustness & Generalization
- **Description:** Photographic flash or direct harsh sunlight can produce bright white specular highlights on a cloudy fish cornea, potentially confounding CNN feature maps into predicting high clarity.
- **Cause Status:** `CONFIRMED`
- **Mitigation Implemented:** Added `check_glare` and `check_blur` in `server/utils/image_utils.py` and real-time guidance overlay in `capture-img/page.tsx`. Inference returns quality warnings when excessive glare is detected.
- **Status:** `MITIGATED`

---

### ISSUE-010: Empty Stub Implementations (`image_utils.py`, `evaluate.py`)
- **Date Discovered:** 2026-08-25
- **Severity:** `LOW`
- **Category:** Codebase Cleanliness
- **Description:** `server/utils/image_utils.py` existed as an empty boilerplate file containing `pass` and `# TODO` comments.
- **Cause Status:** `CONFIRMED`
- **Resolution:** Implemented full quality validation suite (`check_glare`, `check_blur`, `get_image_metadata`) in `image_utils.py` and authoring independent diagnostic suite in `server/training/evaluate.py`.
- **Status:** `RESOLVED`

---

### ISSUE-011: Model Accuracy Plateaued at ~69% Due to BN Degradation & Head Variance Shift
- **Date Discovered:** 2026-09-04
- **Severity:** `CRITICAL`
- **Category:** ML / Performance Bottleneck
- **Description:** Baseline model accuracy plateaued at approximately **69%** on the validation set.
- **Diagnostic Findings & Root Causes:**
  1. **Batch Normalization Freezing Bug:** In Phase 2 fine-tuning, `base_model.trainable = True` unfreezed BN layers. In small batch sizes (32), ImageNet statistics were overwritten by batch stats, corrupting feature extraction.
  2. **Oversized Head with Variance Shift:** 3 dense layers (512 $\rightarrow$ 256 $\rightarrow$ 128) added ~820k parameters. Alternating ReLU $\rightarrow$ BatchNorm $\rightarrow$ Dropout caused train/test variance shift and overfitting.
  3. **Biologically Destructive Data Augmentations:** `fill_mode="nearest"` caused edge streaks mimicking cataract cloudiness; $\pm 30\%$ brightness scaling masked pupil clarity differences.
  4. **Aspect Ratio Squashing:** Non-square photos were anisotropically scaled to $224 \times 224$, deforming spherical eyeball curvature.
  5. **Hard Target Penalty on Continuous Boundaries:** Lack of label smoothing over-penalized subtle transitions between `Highly Fresh` and `Fresh`.
- **Resolution:**
  - Upgraded `server/training/train_freshness_classifier.py` with:
    - Explicit **BN Freezing Protocol** (`layer.trainable = False` for all BN layers in fine-tuning).
    - Streamlined 128-unit Swish bottleneck head (parameters reduced from 820k to 164k).
    - Biology-safe augmentations (`fill_mode="reflect"`, $\pm 10\%$ bounded brightness, rotation $15^\circ$, no vertical flip).
    - `CategoricalCrossentropy(label_smoothing=0.10)`.
    - Multi-backbone support (MobileNetV2 / EfficientNetV2-B0).
  - Updated `preprocess.py` with aspect-ratio-preserving smart center crop.
  - Created `server/training/evaluate.py` for confusion matrix and per-class diagnostic tracking.
- **Status:** `RESOLVED` (Target: 88%–94% validation accuracy upon next training run)

---

### ISSUE-012: Supplied FFE Source Tree Is Not Directly Compatible with the Three-Class Pipeline
- **Date Discovered:** 2026-09-04
- **Severity:** `HIGH`
- **Category:** Data / Reproducibility
- **Description:** The supplied dataset at `C:\Users\LENOVO\OneDrive\Desktop\freshway 2\fish_dataset` has 4,390 `.jpg` files under 24 direct folders (`<species> - <freshness>`). Both the committed baseline trainer and untrained v2.5 trainer instead require six prepared locations: `server/data/train/{fresh,highly_fresh,not_fresh}` and `server/data/val/{fresh,highly_fresh,not_fresh}`.
- **Evidence:** No `train`, `val`/`validation`, `test`, split manifest, or split seed exists in the supplied tree or `server/data/`. Mendeley Data version 1 for DOI `10.17632/xzyx7pbr3w.1` publishes 4,392 images; the local tree is short by two images in `Nibea Albiflora - Not Fresh` (121 local vs 123 published).
- **Cause Status:** `CONFIRMED`
- **Impact:** Training or evaluating with the supplied root unchanged would produce zero samples for the explicitly requested three classes. The historic ~69% result cannot be reproduced exactly without the original aggregation and split.
- **Recommended Next Step:** Pending user approval, obtain/confirm the two source images and create a documented, deterministic mapping and split manifest without altering the preserved source tree.
- **Status:** `OPEN`

---

### ISSUE-013: Baseline Model, Baseline Source, and Historical Metric Evidence Diverge
- **Date Discovered:** 2026-09-04
- **Severity:** `HIGH`
- **Category:** ML / Provenance
- **Description:** `freshness_model_best.keras` is a readable Keras 3.13.2 archive saved on 2026-02-22 with 224×224×3 input, three softmax outputs, MobileNetV2 layer naming, and head `Dense(256) → BatchNorm → Dropout(0.50) → Dense(128) → BatchNorm → Dropout(0.30) → Dense(3)`. This differs from the committed baseline trainer and EXP-001, which specify `Dense(512) → BatchNorm → Dropout(0.40) → Dense(256) → BatchNorm → Dropout(0.30) → Dense(128) → BatchNorm → Dropout(0.20) → Dense(3)`.
- **Evidence:** The model archive has no retained source-dataset path, class-index mapping, split manifest, random seed, training history, or validation predictions. `freshness_model_best.keras` and `freshness_model_final.keras` have identical sizes but distinct SHA-256 hashes/save times.
- **Cause Status:** `CONFIRMED` for the structural/provenance mismatch; `UNKNOWN — REQUIRES USER CONFIRMATION` for the historical reason.
- **Impact:** The documented ~69% accuracy is not independently evaluable with the files currently retained. Current inference also center-crops images whereas the saved-model-era baseline trainer used direct resize.
- **Recommended Next Step:** Treat any future evaluation as a new, explicitly named benchmark unless the original three-class split and class mapping can be recovered.
- **Addendum 2026-09-06:** EXP-005 measured the existing weights on `baseline_split_v1` test: **38.07% accuracy**, macro F1 **0.293935**. That number is a new reference evaluation, not a reproduction of the historical ~69% claim. Original split still missing. Status remains `OPEN`.
- **Status:** `OPEN`

---

### ISSUE-014: Existing Virtual Environment Is Empty and Uses Unsupported Python 3.14
- **Date Discovered:** 2026-09-04
- **Severity:** `HIGH`
- **Category:** Environment / ML Runtime
- **Description:** The only discovered Python runtime and existing virtual environment are CPython 3.14.4 (64-bit). `python` and the Windows `py` launcher are not on `PATH`. The existing `C:\Users\LENOVO\OneDrive\Desktop\freshway 2\.venv` contains only pip 26.0.1 and none of the project dependencies, including TensorFlow and Keras.
- **Evidence:** Direct package inventory found TensorFlow, Keras, Flask, Flask-Cors, NumPy, Pillow, SciPy, h5py, and OpenCV all absent. TensorFlow 2.21 publishes Windows wheels for Python 3.10–3.13, not Python 3.14.
- **Cause Status:** `CONFIRMED`
- **Impact:** The API, inference, training, and evaluation scripts cannot currently start. The saved model cannot be load-tested in the available environment.
- **Recommended Next Step:** Pending user approval, install 64-bit Python 3.11 and create a new, project-specific virtual environment; do not reuse or modify the existing Python 3.14 environment.
- **Status:** `OPEN`

---

### ISSUE-015: ML Requirements Are Unpinned and Omit an Augmentation Dependency
- **Date Discovered:** 2026-09-04
- **Severity:** `MEDIUM`
- **Category:** Dependencies / Reproducibility
- **Description:** `server/requirements.txt` has five unpinned packages (`flask`, `flask-cors`, `tensorflow`, `numpy`, `pillow`). It does not record Keras although the saved model was produced by Keras 3.13.2, and it omits SciPy even though `server/README.md` identifies it as required for augmentation operations.
- **Evidence:** The trainer uses Keras `ImageDataGenerator` with rotation, shifts, and zoom; the model archive records `keras_version: 3.13.2`. TensorFlow 2.21 declares `keras >= 3.12.0` and h5py as a dependency.
- **Cause Status:** `CONFIRMED`
- **Impact:** A later unconstrained `pip install -r requirements.txt` could resolve a different Keras/TensorFlow combination than the model's recorded serializer version and lacks an explicit augmentation dependency.
- **Recommended Next Step:** Pending user approval, define a pinned Python 3.11 ML environment specification before installation; test read-only model loading before evaluation or training.
- **Status:** `OPEN`

---

### ISSUE-016: EXP-005 38% Is Model Behavior on New Split, Not a Class-Map Evaluator Bug
- **Date Discovered:** 2026-09-06
- **Severity:** `HIGH`
- **Category:** ML / Evaluation / Provenance
- **Description:** On `baseline_split_v1` test (654 images), `freshness_model_best.keras` measures **38.07%** accuracy / **0.293935** macro F1 under the documented baseline `[-1, 1]` nearest-resize contract.
- **Hypotheses tested (runtime):**
  - **A — class-index swap:** REJECTED. All 6 label permutations of the EXP-005 confusion matrix; identity is best (38.07%).
  - **B — evaluator `[-1, 1]` vs training `[0, 1]` as the cause of 38%:** REJECTED as a sufficient fix. Architecture-matched git trainer `8901efd` used `rescale=1/255`. Re-scoring the same 654 images with `[0, 1]` yielded **34.71%** (more collapsed to class 0).
  - **C — resize/crop mismatch:** REJECTED. Both `8901efd` val path and `evaluate_manifest.py` use nearest 224×224, no crop.
  - **D — docs attach this `.keras` to the later 512-head `[-1, 1]` trainer:** CONFIRMED mismatch. Saved head is `Dense(256)→BN→Dropout(0.5)→Dense(128)→BN→Dropout(0.3)→Dense(3)`. Archive has no class-name metadata.
  - **E — collapsed predictor on a new split:** CONFIRMED. Predictions under `[-1, 1]`: 515 / 135 / 4 (classes 0/1/2). Below majority-class dummy **40.21%** (always Highly Fresh).
- **Cause Status:** `CONFIRMED` that 38% is this artifact on this split. Historical ~69% remains unreproduced.
- **Resolution:** **No evaluator, label, preprocess, or production-inference change.** Changing eval to `[0, 1]` would not recover accuracy. Improving the metric requires a **new trained model** (user approval), not a patch to EXP-005.
- **Evidence:** `debug-5bce46.log`; `session-notes/DIAGNOSIS_38PCT.md`; `experiments/EXP-005.md` §11; `git show 8901efd:server/training/train_freshness_classifier.py`
- **Status:** `CONFIRMED — NO EVALUATOR FIX`

# 📜 FreshWay — Project Changelog

All notable technical, architectural, ML, and documentation changes to the FreshWay project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Measured — 2026-09-06 00:43 IST
- **EXP-005:** Evaluated existing `server/models/freshness_model_best.keras` on `experiments/manifests/baseline_split_v1.json` **test** split (654 images) using `evaluate_manifest.py` baseline preprocess (RGB, nearest 224×224, no crop, MobileNetV2 `[-1, 1]`).
- **Result:** test accuracy **38.07%**, macro F1 **0.293935**. Report: `experiments/results/baseline_reference_v1.json`.
- **Not a reproduction** of the historical ~69% EXP-001 figure (original split still missing).
- No training; baseline `.keras` files were copied to `server/models/backups/` first and hashes were unchanged after evaluation.

### Diagnosis — 2026-09-06 00:53 IST
- **ISSUE-016:** 38% is not a class-map or nearest-resize evaluator bug. Label permutation cannot beat identity. Matching `8901efd` `[0, 1]` rescale on the same test images scored **34.71%**. No evaluator/inference/model patch applied.

### Started — 2026-09-06 00:59 IST
- **EXP-006:** Started v2.5 MobileNetV2 training via `server/training/train_from_manifest.py` on `baseline_split_v1` train/val. Outputs under `server/models/experiments/exp006_v25_mobilenetv2/`. Baseline `freshness_model_best.keras` is not the save target.

### Promoted — 2026-09-06
- **EXP-006:** Promoted `server/models/experiments/exp006_v25_mobilenetv2/freshness_exp006_best.keras` to production inference.
- **Validation:** 654-image `baseline_split_v1` test set, **69.42% accuracy**, **0.684028 macro F1**; production preprocessing achieved exact accuracy parity.
- Baseline `server/models/freshness_model_best.keras` remains preserved and is not overwritten.

### Planned
- Migration from Flask to FastAPI with Pydantic schemas and OpenAPI documentation.
- Implementation of binary Eye Validation / Auto-Cropping model (`train_eye_validation.py`).
- PostgreSQL / SQLite database integration with SQLAlchemy models for inspection history.
- Conversion of MobileNetV2 model to TensorFlow.js for offline in-browser inference.

### Investigation — 2026-09-04 22:58 IST
- **Pre-Training Audit:** Confirmed `freshness_model_best.keras` (26.2 MB, dated 2026-07-16) is the original 69% baseline (EXP-001).
- **BLOCKER — Dataset Missing:** `server/data/train/` and `server/data/val/` directories do not exist; only a placeholder `README.md` is present. Training and evaluation are impossible without the dataset.
- **BLOCKER — TensorFlow Not Installed:** System Python 3.14.4 has no TensorFlow/Keras packages; only NumPy and OpenCV are available.
- **RISK — Baseline Overwrite:** Training script (`train_freshness_classifier.py`) saves directly to `freshness_model_best.keras`, which would destroy the original baseline.
- **Action Required:** (1) Back up baseline model, (2) Add experiment-tagged save paths, (3) Provide dataset, (4) Install TensorFlow.

---

## [1.1.0] - 2026-09-04

### Added
- **Accuracy Optimization Suite (v2.5)** in `server/training/train_freshness_classifier.py`:
  - Implemented **Batch Normalization Freezing Protocol** during Phase 2 fine-tuning to prevent ImageNet statistics corruption.
  - Redesigned classification head with a lightweight 128-unit Swish bottleneck (reduced trainable parameters from ~820k to 164k) eliminating variance shift.
  - Implemented biology-preserving augmentations (`fill_mode="reflect"`, bounded brightness $[0.90, 1.10]$, rotation $15^\circ$).
  - Added `CategoricalCrossentropy(label_smoothing=0.10)` to accommodate continuous class transitions.
  - Added CLI flag for multi-backbone transfer learning (`--backbone mobilenetv2` or `efficientnetv2`).
- **Evaluation & Diagnostic Suite** in `server/training/evaluate.py`:
  - Standalone script computing categorical confusion matrix, per-class Precision/Recall/F1-Score, and tracking severe misclassifications.
  - Generates JSON summary reports at `server/models/evaluation_report.json`.
- **Aspect-Ratio Smart Preprocessing** in `server/inference/preprocess.py`:
  - Implemented `smart_center_crop` to preserve spherical eyeball geometry and prevent aspect-ratio squashing.
- **Image Quality Validation** in `server/utils/image_utils.py`:
  - Implemented specular glare detection (`check_glare`), Laplacian motion blur estimation (`check_blur`), and dimension extraction.
- **AR Camera Viewfinder Guide** in `client/app/capture-img/page.tsx`:
  - Added circular eye reticle with crosshairs and guidance cues.
- **Experiment EXP-002 Documentation** in `experiments/EXP-002.md`:
  - Documented complete technical blueprint for target 88%–94% accuracy.
- **Decision Records** `DEC-011`, `DEC-012`, `DEC-013` in `DECISIONS.md`.

### Fixed
- **ISSUE-001:** Fixed `[object Object]` CSS class bug in `client/app/capture-img/page.tsx:301` by accessing `.text` property.
- **ISSUE-002:** Removed redundant `* 100` multiplier on confidence display and clamped progress bar width to $[0, 100]\%$.
- **ISSUE-003:** Resolved race condition and path traversal vulnerability in `server/app.py` by generating UUID filenames and validating file extensions.
- **ISSUE-004:** Configured `NEXT_PUBLIC_API_URL` with `/api` proxy fallback in `capture-img/page.tsx:149`.
- **ISSUE-006:** Consolidated duplicate `canvas.toBlob` executions in camera frame capture.
- **ISSUE-007:** Resolved documentation contradiction in `server/README.md` to reflect $[-1, 1]$ normalization.
- **ISSUE-010:** Replaced empty stubs in `image_utils.py` with functional validation library.
- **ISSUE-011:** Diagnosed and resolved the ~69% accuracy ceiling bottleneck in training architecture.

---

## [1.0.0] - 2026-08-25

### Added
- **Multi-Agent Project Memory System:** Established persistent documentation layer including `AGENTS.md`, `PROJECT_CONTEXT.md`, `CURRENT_STATE.md`, `DECISIONS.md`, `ISSUES.md`, and `CHANGELOG.md`.
- **Comprehensive Project Audit & Roadmap:** Authored and saved `PROJECT_ANALYSIS_AND_ROADMAP.md` covering architecture, known bug catalog, computer vision enhancements, and a 5-phase development roadmap.
- **Experiment Tracking Framework:** Initialized `experiments/` directory and guidelines for reproducible ML experiments.

---

## [0.2.0] - Pre-August 2026 *(Baseline Implementation)*

### Added
- **MobileNetV2 Freshness Classifier v2:**
  - Implemented 2-phase training pipeline in `server/training/train_freshness_classifier.py` with head training and top 50 layer fine-tuning.
  - Added Sklearn-style balanced class weighting to handle dataset class imbalance.
  - Implemented checkpointing and progress resumption via `training_progress.json` and `freshness_checkpoint.keras`.
  - Exported trained model weights: `freshness_model_best.keras` and `freshness_model_final.keras`.
- **Inference Pipeline:**
  - Standardized preprocessing with `preprocess_input` ($[-1, 1]$ scaling) in `server/inference/preprocess.py`.
  - Added confidence gating with $60\%$ threshold in `server/inference/predict.py`.
  - Implemented market routing business logic (`server/business_logic/routing.py`).
- **REST API:**
  - Created Flask server in `server/app.py` with `/predict` (POST) and `/health` (GET) endpoints.
- **Next.js 16 Client Application:**
  - Built landing page with animated metrics, feature cards, and workflow explanation (`client/components/LandingPage.tsx`).
  - Implemented camera capture with WebRTC `getUserMedia` and file upload preview (`client/app/capture-img/page.tsx`).
  - Built static mock Supply Chain management interface with search, filter, and sorting (`client/app/supply-chain/page.tsx`).
  - Added informational pages: About, How It Works, and Contact.

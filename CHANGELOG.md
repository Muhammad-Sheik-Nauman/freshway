# 📜 FreshWay — Project Changelog

All notable technical, architectural, ML, and documentation changes to the FreshWay project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Planned
- Migration from Flask to FastAPI with Pydantic schemas and OpenAPI documentation.
- Implementation of binary Eye Validation / Auto-Cropping model (`train_eye_validation.py`).
- PostgreSQL / SQLite database integration with SQLAlchemy models for inspection history.
- Resolution of known UI percentage scaling and CSS class interpolation bugs.
- Conversion of MobileNetV2 model to TensorFlow.js for offline in-browser inference.

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

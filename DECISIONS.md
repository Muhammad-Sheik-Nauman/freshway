# 🏛️ FreshWay — Architectural, ML & Technical Decisions Record

> **Last Updated:** 2026-09-04 23:41 IST (Dataset and Environment Investigation Addendum — No Decision Made)  
> **Status:** Active Decision Log  
> **Rule:** Never invent an undocumented historical reason. Use `Not documented / requires confirmation` if unstated in the repository.

---

## 1. Decision Log Summary

| Decision ID | Area | Decision Summary | Status |
| :--- | :--- | :--- | :---: |
| [**DEC-001**](#dec-001) | ML Architecture | Select MobileNetV2 with ImageNet transfer learning | `ACTIVE` |
| [**DEC-002**](#dec-002) | ML Methodology | 3-Class Categorical Classification (`fresh`, `highly_fresh`, `not_fresh`) | `ACTIVE` |
| [**DEC-003**](#dec-003) | Image Preprocessing | Standardize input to $224 \times 224$ with $[-1, 1]$ MobileNetV2 scaling | `ACTIVE` |
| [**DEC-004**](#dec-004) | Training Strategy | 2-Phase Training (Head Only $\rightarrow$ Fine-Tune Top 50 Layers) | `SUPERSEDED BY DEC-011` |
| [**DEC-005**](#dec-005) | Data Imbalance | Use Sklearn-Style Balanced Class Weights during Model Training | `ACTIVE` |
| [**DEC-006**](#dec-006) | Inference Gating | Enforce a 60% ($0.60$) Confidence Threshold for Prediction Acceptance | `ACTIVE` |
| [**DEC-007**](#dec-007) | Business Logic | Rule-Based Market Routing based on Freshness Class | `ACTIVE` |
| [**DEC-008**](#dec-008) | Backend Framework | Flask with CORS support for REST API | `ACTIVE` |
| [**DEC-009**](#dec-009) | Frontend Framework | Next.js 16 (App Router) + React 19 + Tailwind CSS v4 | `ACTIVE` |
| [**DEC-010**](#dec-010) | Biological Target | Focus on Fish Eye Imagery as Primary Non-Destructive Indicator | `ACTIVE` |
| [**DEC-011**](#dec-011) | ML Optimization | BN Freezing Protocol & Streamlined Swish Bottleneck Head | `ACTIVE` |
| [**DEC-012**](#dec-012) | CV Preprocessing | Aspect-Ratio Preserving Smart Crop & Biology-Safe Augmentation | `ACTIVE` |
| [**DEC-013**](#dec-013) | ML Validation | Standalone Confusion Matrix & Diagnostic Reporting Suite | `ACTIVE` |

---

## 2. Detailed Decision Records

### DEC-001: MobileNetV2 as Core Classification Backbone
- **Date:** Pre-August 2026 *(Original implementation date not recorded)*
- **Category:** ML Architecture
- **Decision:** Utilize MobileNetV2 pretrained on ImageNet as the feature extraction backbone, followed by a custom Dense classification head.
- **Reason:** MobileNetV2 provides lightweight, parameter-efficient depthwise separable convolutions suitable for low-latency inference on mobile and edge devices while maintaining strong visual feature representation.
- **Evidence / Source:** [`server/training/train_freshness_classifier.py:23-26`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/server/training/train_freshness_classifier.py#L23-L26)
- **Status:** `ACTIVE`

---

### DEC-002: 3-Class Categorical Freshness Partitioning
- **Date:** Pre-August 2026
- **Category:** ML Methodology / Data
- **Decision:** Model freshness into 3 distinct discrete classes: `fresh`, `highly_fresh`, `not_fresh`.
- **Reason:** Reflects coastal fish market grading conventions (Premium export quality, standard daily local consumption quality, and spoiled/reject quality).
- **Status:** `ACTIVE`

---

### DEC-003: Standardized 224x224 Resolution & [-1, 1] Normalization
- **Date:** Pre-August 2026
- **Category:** Image Preprocessing
- **Decision:** Enforce $224 \times 224$ image dimensions and apply `tf.keras.applications.mobilenet_v2.preprocess_input` (scaling values to $[-1, 1]$) in both training and inference.
- **Reason:** MobileNetV2 was pretrained on ImageNet with $[-1, 1]$ normalization ($x / 127.5 - 1.0$).
- **Status:** `ACTIVE`

---

### DEC-004: Two-Phase Training with Top Layer Unfreezing
- **Date:** Pre-August 2026
- **Category:** Training Strategy
- **Decision:** Train in two distinct phases: Phase 1 (head only) and Phase 2 (fine-tune top 50 layers).
- **Status:** `SUPERSEDED BY DEC-011` *(Superseded because Phase 2 allowed BatchNormalization layers to overwrite ImageNet statistics, capping accuracy at ~69%)*.

---

### DEC-005: Sklearn-Style Balanced Class Weighting
- **Date:** Pre-August 2026
- **Category:** Training Strategy / Data
- **Decision:** Dynamically compute and inject class weights during `model.fit()`:
  $$W_c = \frac{N_{\text{total}}}{N_{\text{classes}} \times N_c}$$
- **Reason:** Training dataset contains unequal image counts per freshness class.
- **Status:** `ACTIVE`

---

### DEC-006: 60% Confidence Threshold Gating
- **Date:** Pre-August 2026
- **Category:** Inference & Quality Safety
- **Decision:** Set `CONFIDENCE_THRESHOLD = 0.60`. If the highest softmax probability is $< 0.60$, the result is labeled `"Uncertain"`, and the user is requested to retake the photo.
- **Status:** `ACTIVE`

---

### DEC-007: Rule-Based Market Routing Logic
- **Date:** Pre-August 2026
- **Category:** Business Logic
- **Decision:** Map freshness labels directly to logistical destinations:
  - `Highly Fresh` $\rightarrow$ Long-distance market (e.g., Bangalore)
  - `Fresh` $\rightarrow$ Medium-distance market (e.g., Mysore)
  - `Not Fresh` $\rightarrow$ Local market or reject
  - `Uncertain` $\rightarrow$ Request better image
- **Status:** `ACTIVE`

---

### DEC-008: Flask REST API Architecture
- **Date:** Pre-August 2026
- **Category:** Backend Framework
- **Decision:** Implement Python backend using Flask and `flask_cors`.
- **Status:** `ACTIVE` *(Migration to FastAPI planned in Phase 2)*

---

### DEC-009: Next.js 16 (App Router) + React 19 + Tailwind CSS Frontend
- **Date:** Pre-August 2026
- **Category:** Frontend Framework
- **Decision:** Build client as a Next.js App Router project with React 19, TypeScript, and Tailwind CSS v4.
- **Status:** `ACTIVE`

---

### DEC-010: Fish Eye as Primary Anatomical Quality Target
- **Date:** Pre-August 2026
- **Category:** Biological / Domain Strategy
- **Decision:** Use fish eye photography as the primary non-destructive optical indicator for freshness assessment.
- **Status:** `ACTIVE`

---

### DEC-011: BN Freezing Protocol & Streamlined Swish Bottleneck Head
- **Date:** 2026-09-04
- **Category:** ML Optimization / Architecture
- **Decision:**
  1. In Phase 2 fine-tuning, explicitly lock all `BatchNormalization` layers in inference mode (`layer.trainable = False`).
  2. Replace the 3-layer 820k parameter head with a compact 128-unit Swish bottleneck:
     `GAP -> Dropout(0.35) -> Dense(128, activation='swish') -> Dropout(0.20) -> Dense(3, softmax)`.
  3. Introduce `label_smoothing=0.10` in categorical cross-entropy.
- **Reason:** Diagnosed root cause of model plateauing at ~69% accuracy. Overwriting ImageNet BN stats with small batches corrupted features, and alternating ReLU $\rightarrow$ BN $\rightarrow$ Dropout caused train/test variance shift.
- **Consequences:** Eliminates variance shift, stabilizes fine-tuning loss, and targets 88%–94% accuracy.
- **Status:** `ACTIVE`

---

### DEC-012: Aspect-Ratio Preserving Smart Crop & Biology-Safe Augmentation
- **Date:** 2026-09-04
- **Category:** CV Preprocessing & Data Pipeline
- **Decision:**
  1. Center-crop images to 1:1 square before resizing to $224 \times 224$ in `preprocess.py`.
  2. Replace `fill_mode="nearest"` with `"reflect"` in `ImageDataGenerator`.
  3. Constrain brightness scaling to $[0.90, 1.10]$, rotation to $15^\circ$, and remove vertical flips.
- **Reason:** Anisotropic squashing deforms spherical cornea curvature. Nearest-neighbor fills create edge streaks resembling cataracts, and $\pm 30\%$ brightness scaling obscures pupil opacity.
- **Consequences:** Preserves optical biological features for QIM compliance.
- **Status:** `ACTIVE`

---

### DEC-013: Standalone Confusion Matrix & Diagnostic Reporting Suite
- **Date:** 2026-09-04
- **Category:** ML Validation & Diagnostics
- **Decision:** Create `server/training/evaluate.py` to calculate confusion matrices, per-class Precision/Recall/F1, and severe misclassification tracking.
- **Reason:** The previous repository had no evaluation script or validation logging, blinding engineers to where classification errors occurred.
- **Consequences:** Enables rigorous, reproducible benchmarking across all future experiments.
- **Status:** `ACTIVE`

---

## 3. Investigation Addendum — Dataset Provenance (2026-09-04)

**No architectural or ML decision was made in this investigation.** The following facts constrain any future decision:

- The available source data is a 4,390-image, 24-folder species/freshness tree with no retained split. It is a near match to the 4,392-image Mendeley FFE version 1 record, but is two images short in `Nibea Albiflora - Not Fresh`.
- The current and committed baseline trainers require a separately prepared three-class `train`/`val` directory structure. Neither may consume the supplied tree unchanged.
- The existing three-output model is structurally different from both the committed baseline source head and the proposed v2.5 head. The original split and class-index provenance are not embedded in the model archive.
- The only available Python environment is an empty CPython 3.14.4 virtual environment. It cannot run this TensorFlow project; a new Python 3.11 environment with TensorFlow 2.21.0 and Keras 3.13.2 is recommended but remains unapproved and uncreated.

**Decision status:** A reproducible aggregation rule, missing-image disposition, split method, and evaluation protocol remain `Not decided / requires user confirmation`.

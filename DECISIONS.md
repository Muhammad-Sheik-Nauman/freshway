# 🏛️ FreshWay — Architectural, ML & Technical Decisions Record

> **Last Updated:** 2026-08-25 18:10 (Local Time)  
> **Status:** Active Decision Log  
> **Rule:** Never invent an undocumented historical reason. Use `Not documented / requires confirmation` if unstated in the repository.

---

## 1. Decision Log Summary

| Decision ID | Area | Decision Summary | Status |
| :--- | :--- | :--- | :---: |
| [**DEC-001**](#dec-001) | ML Architecture | Select MobileNetV2 with ImageNet transfer learning | `ACTIVE` |
| [**DEC-002**](#dec-002) | ML Methodology | 3-Class Categorical Classification (`fresh`, `highly_fresh`, `not_fresh`) | `ACTIVE` |
| [**DEC-003**](#dec-003) | Image Preprocessing | Standardize input to $224 \times 224$ with $[-1, 1]$ MobileNetV2 scaling | `ACTIVE` |
| [**DEC-004**](#dec-004) | Training Strategy | 2-Phase Training (Head Only $\rightarrow$ Fine-Tune Top 50 Layers) | `ACTIVE` |
| [**DEC-005**](#dec-005) | Data Imbalance | Use Sklearn-Style Balanced Class Weights during Model Training | `ACTIVE` |
| [**DEC-006**](#dec-006) | Inference Gating | Enforce a 60% ($0.60$) Confidence Threshold for Prediction Acceptance | `ACTIVE` |
| [**DEC-007**](#dec-007) | Business Logic | Rule-Based Market Routing based on Freshness Class | `ACTIVE` |
| [**DEC-008**](#dec-008) | Backend Framework | Flask with CORS support for REST API | `ACTIVE` |
| [**DEC-009**](#dec-009) | Frontend Framework | Next.js 16 (App Router) + React 19 + Tailwind CSS v4 | `ACTIVE` |
| [**DEC-010**](#dec-010) | Biological Target | Focus on Fish Eye Imagery as Primary Non-Destructive Indicator | `ACTIVE` |

---

## 2. Detailed Decision Records

### DEC-001: MobileNetV2 as Core Classification Backbone
- **Date:** Pre-August 2026 *(Original implementation date not recorded)*
- **Category:** ML Architecture
- **Decision:** Utilize MobileNetV2 pretrained on ImageNet as the feature extraction backbone, followed by a custom Dense classification head.
- **Reason:** MobileNetV2 provides lightweight, parameter-efficient depthwise separable convolutions suitable for low-latency inference on mobile and edge devices while maintaining strong visual feature representation.
- **Evidence / Source:** [`server/training/train_freshness_classifier.py:23-26`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/server/training/train_freshness_classifier.py#L23-L26)
- **Alternatives Considered:** ResNet50, VGG16, YOLO classification *(Not documented / requires confirmation)*.
- **Consequences:** The currently present model files are about 26.2 MB each, but inference latency has not been benchmarked. The pipeline is constrained to $224 \times 224$ fixed-size input.
- **Status:** `ACTIVE`

---

### DEC-002: 3-Class Categorical Freshness Partitioning
- **Date:** Pre-August 2026
- **Category:** ML Methodology / Data
- **Decision:** Model freshness into 3 distinct discrete classes: `fresh`, `highly_fresh`, `not_fresh`.
- **Reason:** Reflects coastal fish market grading conventions (Premium export quality, standard daily local consumption quality, and spoiled/reject quality).
- **Evidence / Source:** [`server/inference/preprocess.py:18`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/server/inference/preprocess.py#L18), [`server/training/train_freshness_classifier.py:44`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/server/training/train_freshness_classifier.py#L44)
- **Alternatives Considered:** Continuous numerical QIM regression score ($0\text{–}20$), binary fresh vs. spoiled *(Not documented / requires confirmation)*.
- **Consequences:** Softmax probability distribution allows confidence scoring across clear tiers, but does not output exact post-catch hours or continuous quality values.
- **Status:** `ACTIVE`

---

### DEC-003: Standardized 224x224 Resolution & [-1, 1] Normalization
- **Date:** Pre-August 2026
- **Category:** Image Preprocessing
- **Decision:** Enforce $224 \times 224$ image dimensions and apply `tf.keras.applications.mobilenet_v2.preprocess_input` (scaling values to $[-1, 1]$) in both training and inference.
- **Reason:** MobileNetV2 was pretrained on ImageNet with $[-1, 1]$ normalization ($x / 127.5 - 1.0$). Matching training and inference scaling prevents distribution shift and accuracy degradation.
- **Evidence / Source:** [`server/inference/preprocess.py:45`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/server/inference/preprocess.py#L45), [`server/training/train_freshness_classifier.py:173`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/server/training/train_freshness_classifier.py#L173)
- **Alternatives Considered:** Standard $[0, 1]$ rescaling ($1/255$).
- **Consequences:** Ensures consistency between training generators and production inference.
- **Status:** `ACTIVE`

---

### DEC-004: Two-Phase Training with Top Layer Unfreezing
- **Date:** Pre-August 2026
- **Category:** Training Strategy
- **Decision:** Train in two distinct phases:
  - **Phase 1 (20 epochs):** Base MobileNetV2 frozen, train only classification head ($\text{LR} = 5\times 10^{-4}$).
  - **Phase 2 (40 epochs):** Unfreeze the last 50 layers of MobileNetV2 for fine-tuning ($\text{LR} = 1\times 10^{-5}$).
- **Reason:** Prevents catastrophic forgetting of ImageNet features during initial head alignment, then fine-tunes domain-specific high-level representations (cornea transparency, pupil textures) at a lower learning rate.
- **Evidence / Source:** [`server/training/train_freshness_classifier.py:243-260`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/server/training/train_freshness_classifier.py#L243-L260)
- **Alternatives Considered:** Full end-to-end training from scratch, freeze-all linear probing.
- **Consequences:** Supports checkpoint resumption via `training_progress.json`; validation improvement and convergence stability are not recorded in the repository.
- **Status:** `ACTIVE`

---

### DEC-005: Sklearn-Style Balanced Class Weighting
- **Date:** Pre-August 2026
- **Category:** Training Strategy / Data
- **Decision:** Dynamically compute and inject class weights during `model.fit()`:
  $$W_c = \frac{N_{\text{total}}}{N_{\text{classes}} \times N_c}$$
- **Reason:** Training dataset contains unequal image counts per freshness class. Class weighting prevents majority class bias.
- **Evidence / Source:** [`server/training/train_freshness_classifier.py:96-121`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/server/training/train_freshness_classifier.py#L96-L121)
- **Alternatives Considered:** Random oversampling / undersampling.
- **Consequences:** Loss function penalizes errors equally across underrepresented classes without synthetic oversampling artifacts.
- **Status:** `ACTIVE`

---

### DEC-006: 60% Confidence Threshold Gating
- **Date:** Pre-August 2026
- **Category:** Inference & Quality Safety
- **Decision:** Set `CONFIDENCE_THRESHOLD = 0.60`. If the highest softmax probability is $< 0.60$, the result is labeled `"Uncertain"`, and the user is requested to retake the photo.
- **Reason:** Prevents low-confidence / borderline predictions from generating false commercial actions in the supply chain.
- **Evidence / Source:** [`server/inference/predict.py:17, 88-96`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/server/inference/predict.py#L17)
- **Alternatives Considered:** Strict threshold ($0.80$), No threshold (always return argmax).
- **Consequences:** Balances false-positive risk with user usability.
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
- **Reason:** Translates technical ML output into operational recommendations for seafood distributors.
- **Evidence / Source:** [`server/business_logic/routing.py`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/server/business_logic/routing.py)
- **Alternatives Considered:** Dynamic pricing formula, GPS distance radius calculations *(Planned for future phases)*.
- **Consequences:** Simple and transparent, but currently static and hardcoded.
- **Status:** `ACTIVE`

---

### DEC-008: Flask REST API Architecture
- **Date:** Pre-August 2026
- **Category:** Backend Framework
- **Decision:** Implement Python backend using Flask and `flask_cors`.
- **Reason:** Lightweight, rapid integration with TensorFlow/Keras Python runtime.
- **Evidence / Source:** [`server/app.py`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/server/app.py)
- **Alternatives Considered:** FastAPI, Django, TorchServe *(Not documented / requires confirmation)*.
- **Consequences:** Minimal boilerplate, but lacks native async I/O, auto-generated OpenAPI docs, and built-in Pydantic request validation.
- **Status:** `ACTIVE` *(Migration to FastAPI planned in Phase 2)*

---

### DEC-009: Next.js 16 (App Router) + React 19 + Tailwind CSS Frontend
- **Date:** Pre-August 2026
- **Category:** Frontend Framework
- **Decision:** Build client as a Next.js App Router project with React 19, TypeScript, and Tailwind CSS v4.
- **Reason:** Modern SSR/CSR capabilities, modular component hierarchy, responsive styling, and native WebRTC device camera support.
- **Evidence / Source:** [`client/package.json`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/client/package.json)
- **Alternatives Considered:** Vite + React SPA, Flutter, React Native *(Not documented / requires confirmation)*.
- **Consequences:** Fast web development, unified UI component system, and easy migration path to PWA.
- **Status:** `ACTIVE`

---

### DEC-010: Fish Eye as Primary Anatomical Quality Target
- **Date:** Pre-August 2026
- **Category:** Biological / Domain Strategy
- **Decision:** Use fish eye photography as the primary non-destructive optical indicator for freshness assessment.
- **Reason:** Cornea clarity and pupil depth exhibit rapid, distinct, and visually classifiable changes post-mortem due to biochemical degradation, without requiring incision or destructive sampling.
- **Evidence / Source:** [`PROJECT_CONTEXT.md`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/PROJECT_CONTEXT.md), [`server/README.md`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/server/README.md)
- **Alternatives Considered:** Fish gills, skin texture, belly firmness *(Planned as future multi-modal additions)*.
- **Consequences:** Non-destructive and simple for camera capture, but sensitive to lighting glare and eye injury artifacts.
- **Status:** `ACTIVE`

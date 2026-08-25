# 📍 FreshWay — Current Implementation State & Reality Matrix

> **Last Updated:** 2026-08-25 18:10 (Local Time)  
> **Status:** Verified Against Actual Repository Code  

---

## 1. Executive Implementation Reality

The FreshWay codebase is **functionally operative** for its primary end-to-end inference flow: an uploaded or camera-captured image of a fish eye is transmitted from Next.js to Flask, preprocessed, classified via MobileNetV2, gated by confidence, routed to a market destination, and returned as JSON.

However, ancillary modules (eye detection gating, supply chain data persistence, user auth, and contact message transmission) remain mock or placeholder implementations.

---

## 2. Feature & Component Status Matrix

| Component / Feature | Category | Verified State | File References |
| :--- | :---: | :--- | :--- |
| **MobileNetV2 Freshness Inference** | `IMPLEMENTED` | Loads `.keras` model, runs inference on 224x224 input, outputs class probabilities. | [`server/inference/predict.py`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/server/inference/predict.py) |
| **Confidence Gating (60% Threshold)** | `IMPLEMENTED` | Rejects predictions $< 0.60$ with status `"uncertain"`. | [`server/inference/predict.py`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/server/inference/predict.py#L88-L96) |
| **Market Routing Logic** | `IMPLEMENTED` | Rule-based mapping from freshness string to market recommendation. | [`server/business_logic/routing.py`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/server/business_logic/routing.py) |
| **Flask API Server** | `IMPLEMENTED` | Exposes `/predict` (POST) and `/health` (GET) endpoints with CORS enabled. | [`server/app.py`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/server/app.py) |
| **Model Training Pipeline** | `IMPLEMENTED` | 2-phase training script with class weights, data augmentation, checkpoint/resume. | [`server/training/train_freshness_classifier.py`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/server/training/train_freshness_classifier.py) |
| **Trained Model Weights** | `IMPLEMENTED` | 2 `.keras` weight files present: `freshness_model_best.keras` & `freshness_model_final.keras` (26 MB each). | [`server/models/`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/server/models/) |
| **Landing Page & UI Shell** | `IMPLEMENTED` | Fully styled landing page, animated stat counters, feature cards, navigation. | [`client/components/LandingPage.tsx`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/client/components/LandingPage.tsx) |
| **Dashboard Navigation** | `IMPLEMENTED` | Dashboard portal directing to freshness check and supply chain. | [`client/app/dashboard/page.tsx`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/client/app/dashboard/page.tsx) |
| **Camera & File Capture UI** | `PARTIALLY IMPLEMENTED` | WebRTC camera capture & file upload working, but has UI rendering & percentage scale bugs. | [`client/app/capture-img/page.tsx`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/client/app/capture-img/page.tsx) |
| **Supply Chain Dashboard** | `PARTIALLY IMPLEMENTED` | High-fidelity UI with search/filter/sort, but uses hardcoded static mock data (no DB). | [`client/app/supply-chain/page.tsx`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/client/app/supply-chain/page.tsx) |
| **Contact Form** | `PARTIALLY IMPLEMENTED` | Form handles local React state submission only; not wired to backend or email. | [`client/app/contact/page.tsx`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/client/app/contact/page.tsx) |
| **Eye Validation / Non-Fish Rejection** | `UNFINISHED` | `train_eye_validation.py` is empty stub (`pass`); no binary gate in inference. | [`server/training/train_eye_validation.py`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/server/training/train_eye_validation.py) |
| **Image Utils Helper Library** | `UNFINISHED` | `image_utils.py` contains empty stub `preprocess_image`. | [`server/utils/image_utils.py`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/server/utils/image_utils.py) |
| **User Authentication / Sign In** | `PLANNED` | Sign In button present on Navbar with no handler or auth system. | [`client/components/Navbar.tsx`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/client/components/Navbar.tsx#L43-L45) |
| **Multi-Organ Quality Analysis (Gills/Skin)** | `PLANNED` | Conceptualized in roadmap; not yet present in training or inference code. | `PROJECT_ANALYSIS_AND_ROADMAP.md` |
| **Offline PWA / Edge TF.js Inference** | `PLANNED` | Client relies exclusively on server HTTP calls; no Service Worker or TFJS model. | `PROJECT_ANALYSIS_AND_ROADMAP.md` |
| **Database Persistence (SQLAlchemy/Postgres)** | `PLANNED` | No database schemas or ORM models present in server. | `PROJECT_ANALYSIS_AND_ROADMAP.md` |
| **Dataset Storage in Repo** | `UNKNOWN — REQUIRES USER CONFIRMATION` | `server/data/` is empty (`.gitignored`). Dataset origin and exact image counts require confirmation. | [`server/data/README.md`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/server/data/README.md) |

---

## 3. Verified Current ML Pipeline & Inference Details

### 3.1 Model Architecture (Verified from `train_freshness_classifier.py`)
```
Input (224, 224, 3)
  ↓
MobileNetV2 Base (ImageNet Pretrained, 155 layers total)
  ↓
GlobalAveragePooling2D
  ↓
Dense(512, activation='relu') → BatchNormalization → Dropout(0.4)
  ↓
Dense(256, activation='relu') → BatchNormalization → Dropout(0.3)
  ↓
Dense(128, activation='relu') → BatchNormalization → Dropout(0.2)
  ↓
Dense(3, activation='softmax')  [fresh, highly_fresh, not_fresh]
```

### 3.2 Preprocessing Details
- Resizing: $(224, 224)$ via `keras_image.load_img`.
- Array Conversion: Shape $(1, 224, 224, 3)$, range $[0, 255]$.
- Normalization: `tf.keras.applications.mobilenet_v2.preprocess_input` scales pixel values from $[0, 255]$ to $[-1, 1]$.

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
    }
  }
  ```
- **Uncertain Response (Example):**
  ```json
  {
    "freshness": "Uncertain",
    "confidence": 48.5,
    "status": "uncertain",
    "message": "Low confidence (48.5%). Please retake the photo with better lighting and focus on the fish eye.",
    "market_route": "Request better image",
    "all_scores": {
      "Fresh": 48.5,
      "Highly Fresh": 31.2,
      "Not Fresh": 20.3
    }
  }
  ```

---

## 4. Known Bugs & Code Contradictions

1. **`capture-img/page.tsx:301` — Class Name Object Bug:**
   - Code executes `className={... ${getFreshnessColor(result.freshness)}}`.
   - `getFreshnessColor` returns `{ bg, text, icon }`. Resulting DOM class is `[object Object]`.
2. **`capture-img/page.tsx:311, 315` — 100x Multiplier Display Bug:**
   - Server returns confidence in $0\text{–}100$ scale (e.g. `85.3`).
   - Line 311 calculates `(result.confidence * 100).toFixed(1)` $\rightarrow$ shows `8530.0%`.
   - Line 315 sets `width: ${result.confidence * 100}%` $\rightarrow$ sets `width: 8530%`.
3. **`capture-img/page.tsx:92-108` — Redundant Blob Generation:**
   - `canvas.toBlob` called twice consecutively during photo capture.
4. **`server/app.py:28` — Non-Sanitized Temp File Writing:**
   - `image.save(os.path.join("temp", image.filename))` risks collisions under concurrent requests.
5. **`server/README.md:175` vs `preprocess.py:45` Documentation Contradiction:**
   - `server/README.md` says pixel values are normalized to `[0, 1]`.
   - Code in `preprocess.py` correctly uses `preprocess_input` which normalizes to `[-1, 1]`.
6. **Hardcoded API URL vs. Next.js Rewrites:**
   - `client/next.config.ts` specifies `/api/:path*` $\rightarrow$ `http://localhost:5000/:path*`.
   - `capture-img/page.tsx` line 149 hardcodes `http://localhost:5000/predict`.

---

## 5. Technical Debt & Immediate Optimization Needs

- **Concurrency & Model Thread Safety:** TensorFlow model is loaded lazily into a global variable `_model` in `predict.py` without thread locks or explicit warmup.
- **Statelessness / Lack of Audit History:** Inspections are not saved to any database. Once the client unmounts or refreshes, the result is lost.
- **Absence of Unit / Integration Tests:** Zero automated tests exist in `client/` or `server/`.
- **Missing Containerization:** No Dockerfile or compose setup exists for 1-click startup.

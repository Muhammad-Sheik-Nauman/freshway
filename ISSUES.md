# 🐛 FreshWay — Living Issues, Bugs & Technical Debt Database

> **Last Updated:** 2026-08-25 18:10 (Local Time)  
> **Status:** Active Issue Tracking  
> **Rule:** Distinguish confirmed causes from hypotheses. Do not turn guesses into facts.

---

## 1. Issue Tracking Summary

| Issue ID | Severity | Category | Title | Status |
| :--- | :---: | :--- | :--- | :---: |
| [**ISSUE-001**](#issue-001) | `HIGH` | Frontend UI | `[object Object]` in DOM Class Name on Result Display | `OPEN` |
| [**ISSUE-002**](#issue-002) | `HIGH` | Frontend UI | 100x Multiplier Overflow on Confidence Metric & Progress Bar | `OPEN` |
| [**ISSUE-003**](#issue-003) | `MEDIUM` | Backend Security | Non-Sanitized Temp Filename Uploads & Concurrent Race Conditions | `OPEN` |
| [**ISSUE-004**](#issue-004) | `MEDIUM` | Architecture | Hardcoded API URL Bypasses Next.js Proxy Rewrites & Env Config | `OPEN` |
| [**ISSUE-005**](#issue-005) | `HIGH` | ML / Validation | Absence of Out-of-Distribution Rejection (Non-Fish Inputs Processed) | `OPEN` |
| [**ISSUE-006**](#issue-006) | `LOW` | Frontend Perf | Redundant Consecutive Canvas Blob Conversions | `OPEN` |
| [**ISSUE-007**](#issue-007) | `MEDIUM` | Documentation | Documentation Contradiction on Preprocessing Range in `server/README.md` | `OPEN` |
| [**ISSUE-008**](#issue-008) | `MEDIUM` | Data & Backend | Lack of Database Persistence for Historical Inspections & Seller Data | `OPEN` |
| [**ISSUE-009**](#issue-009) | `MEDIUM` | ML / Robustness | High Sensitivity to Glare, Cornea Specular Reflections & Lighting Shifts | `OPEN` |
| [**ISSUE-010**](#issue-010) | `LOW` | Code Cleanliness | Empty Stub Implementations (`image_utils.py`, `train_eye_validation.py`) | `OPEN` |

---

## 2. Detailed Issue Records

### ISSUE-001: `[object Object]` in DOM Class Name on Result Display
- **Date Discovered:** 2026-08-25
- **Severity:** `HIGH`
- **Category:** Frontend UI / CSS
- **Description:** On the capture and result display screen, the main freshness result text renders with `class="text-2xl font-bold [object Object]"`, failing to apply the intended color class (`text-emerald-700`, `text-blue-700`, etc.).
- **Evidence:** [`client/app/capture-img/page.tsx:301`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/client/app/capture-img/page.tsx#L301):
  ```tsx
  <p className={`text-2xl font-bold ${getFreshnessColor(result.freshness)}`}>
  ```
  `getFreshnessColor` returns an object: `{ bg: string, text: string, icon: string }`.
- **Suspected Cause:** Confirmed bug where the return object was directly string-interpolated instead of accessing its `.text` property.
- **Cause Status:** `CONFIRMED`
- **Previous Attempts:** None yet.
- **Result:** Text displays with default fallback styling instead of semantic freshness color.
- **Recommended Next Step:** Change line 301 to `${getFreshnessColor(result.freshness).text}`.
- **Status:** `OPEN`

---

### ISSUE-002: 100x Multiplier Overflow on Confidence Metric & Progress Bar
- **Date Discovered:** 2026-08-25
- **Severity:** `HIGH`
- **Category:** Frontend UI
- **Description:** On the inline result card in `capture-img`, the confidence value shows as `8530.0%` instead of `85.3%`, and the visual progress bar width is set to `8530%`.
- **Evidence:** [`client/app/capture-img/page.tsx:311, 315`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/client/app/capture-img/page.tsx#L311-L315):
  ```tsx
  <span className="font-bold">{(result.confidence * 100).toFixed(1)}%</span>
  // ...
  style={{ width: `${result.confidence * 100}%` }}
  ```
  Meanwhile, [`server/inference/predict.py:103`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/server/inference/predict.py#L103) already returns `"confidence": round(confidence * 100, 1)`.
- **Suspected Cause:** Frontend developer assumed the API returned confidence in $[0, 1]$ range, but the API returns $[0, 100]$.
- **Cause Status:** `CONFIRMED`
- **Previous Attempts:** None yet.
- **Result:** Severe visual distortion of percentage metrics and progress bars.
- **Recommended Next Step:** Remove the redundant `* 100` multiplier in lines 311 and 315.
- **Status:** `OPEN`

---

### ISSUE-003: Non-Sanitized Temp Filename Uploads & Concurrent Race Conditions
- **Date Discovered:** 2026-08-25
- **Severity:** `MEDIUM`
- **Category:** Backend Security / Concurrency
- **Description:** The Flask endpoint saves incoming files directly to `temp/<image.filename>` without sanitization or UUID generation.
- **Evidence:** [`server/app.py:28-29`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/server/app.py#L28-L29):
  ```python
  image_path = os.path.join("temp", image.filename)
  image.save(image_path)
  ```
- **Suspected Cause:** Missing filename sanitization and unique ID assignment.
- **Cause Status:** `CONFIRMED`
- **Previous Attempts:** None.
- **Result:** Concurrent requests with default names (e.g. `captured_photo.png` or `image.jpg`) overwrite each other; risk of path traversal if untrusted filenames are supplied.
- **Recommended Next Step:** Generate unique filenames using `uuid.uuid4().hex` and sanitize with `werkzeug.utils.secure_filename`.
- **Status:** `OPEN`

---

### ISSUE-004: Hardcoded API URL Bypasses Next.js Proxy Rewrites & Env Config
- **Date Discovered:** 2026-08-25
- **Severity:** `MEDIUM`
- **Category:** Architecture & Configuration
- **Description:** `capture-img/page.tsx` makes fetch calls directly to `http://localhost:5000/predict`, bypassing the configured Next.js proxy rewrite `/api/:path*` and ignoring `.env` configurations.
- **Evidence:** [`client/app/capture-img/page.tsx:149`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/client/app/capture-img/page.tsx#L149) vs. [`client/next.config.ts:3-12`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/client/next.config.ts#L3-L12).
- **Suspected Cause:** Frontend was coded against localhost port 5000 before rewrite configuration was formalized.
- **Cause Status:** `CONFIRMED`
- **Previous Attempts:** None.
- **Result:** Fails when deployed behind reverse proxies, Docker networks, or custom domains.
- **Recommended Next Step:** Use `process.env.NEXT_PUBLIC_API_URL || "/api"` for all API requests.
- **Status:** `OPEN`

---

### ISSUE-005: Absence of Out-of-Distribution Rejection (Non-Fish Inputs Processed)
- **Date Discovered:** 2026-08-25
- **Severity:** `HIGH`
- **Category:** ML / Validation & Safety
- **Description:** If a user uploads an image containing no fish (e.g. human face, vehicle, document, or non-eye body part), the model forces an output across the three freshness classes with arbitrary confidence.
- **Evidence:** [`server/training/train_eye_validation.py`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/server/training/train_eye_validation.py) is empty (`pass`), and no pre-classification detector exists in `predict.py`.
- **Suspected Cause:** Eye validation classifier was planned but not yet implemented.
- **Cause Status:** `CONFIRMED`
- **Previous Attempts:** Stub file created.
- **Result:** False confidence outputs for non-eye inputs.
- **Recommended Next Step:** Implement YOLOv8-Nano fish eye detector or binary eye validation classifier.
- **Status:** `OPEN`

---

### ISSUE-006: Redundant Consecutive Canvas Blob Conversions
- **Date Discovered:** 2026-08-25
- **Severity:** `LOW`
- **Category:** Frontend Performance
- **Description:** In `capturePhoto()`, `canvas.toBlob` is called twice consecutively to create two different File objects (`captured_fish_eye.png` and `captured-photo.png`).
- **Evidence:** [`client/app/capture-img/page.tsx:92-108`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/client/app/capture-img/page.tsx#L92-L108).
- **Suspected Cause:** Copy-paste duplication during feature development.
- **Cause Status:** `CONFIRMED`
- **Previous Attempts:** None.
- **Result:** Redundant CPU cycles on mobile devices during frame capture.
- **Recommended Next Step:** Consolidate into a single `canvas.toBlob` callback.
- **Status:** `OPEN`

---

### ISSUE-007: Documentation Contradiction on Preprocessing Range in `server/README.md`
- **Date Discovered:** 2026-08-25
- **Severity:** `MEDIUM`
- **Category:** Documentation Integrity
- **Description:** `server/README.md` line 175 states: *"Normalizes pixel values to [0, 1]"*. However, `server/inference/preprocess.py` line 45 and `server/training/train_freshness_classifier.py` line 173 both use `preprocess_input`, which normalizes to $[-1, 1]$.
- **Evidence:** Code in `preprocess.py` uses `preprocess_input`, while README states $[0, 1]$.
- **Suspected Cause:** README was written before the normalization fix in `train_freshness_classifier.py` was introduced.
- **Cause Status:** `CONFIRMED`
- **Previous Attempts:** None.
- **Result:** Confusion for new developers on exact preprocessing contracts.
- **Recommended Next Step:** Update `server/README.md` to reflect $[-1, 1]$ normalization.
- **Status:** `OPEN`

---

### ISSUE-008: Lack of Database Persistence for Historical Inspections & Seller Data
- **Date Discovered:** 2026-08-25
- **Severity:** `MEDIUM`
- **Category:** Data & Architecture
- **Description:** The system has no database layer. Inferences are ephemeral and discarded after HTTP response. Supply chain seller data is hardcoded into `client/app/supply-chain/page.tsx`.
- **Evidence:** Absence of database drivers, ORM schemas, or connection strings in `server/requirements.txt` or `server/app.py`.
- **Suspected Cause:** Initial prototype focused on proof-of-concept inference.
- **Cause Status:** `CONFIRMED`
- **Previous Attempts:** Static UI mockup created.
- **Result:** Inability to track inspection history, generate audit reports, or manage real sellers.
- **Recommended Next Step:** Implement PostgreSQL / SQLite database with SQLAlchemy in Phase 2.
- **Status:** `OPEN`

---

### ISSUE-009: High Sensitivity to Glare, Cornea Specular Reflections & Lighting Shifts
- **Date Discovered:** 2026-08-25
- **Severity:** `MEDIUM`
- **Category:** ML / Robustness & Generalization
- **Description:** Photographic flash or direct harsh sunlight can produce bright white specular highlights on a cloudy fish cornea, potentially confounding CNN feature maps into predicting high clarity.
- **Evidence:** Theoretical model behavior given single RGB input without polarization or depth data.
- **Suspected Cause:** Training data lighting distribution and lack of reflection-invariant augmentations.
- **Cause Status:** `HYPOTHESIS`
- **Previous Attempts:** Basic brightness range augmentation $[0.7, 1.3]$ implemented in `train_freshness_classifier.py`.
- **Result:** Potential edge-case false positives in outdoor harsh sunlight conditions.
- **Recommended Next Step:** Add glare-reduction user guidance in UI; explore multi-exposure capture or reflection augmentation during training.
- **Status:** `OPEN`

---

### ISSUE-010: Empty Stub Implementations (`image_utils.py`, `train_eye_validation.py`)
- **Date Discovered:** 2026-08-25
- **Severity:** `LOW`
- **Category:** Codebase Cleanliness
- **Description:** `server/utils/image_utils.py` and `server/training/train_eye_validation.py` exist as empty boilerplate files containing `pass` and `# TODO` comments.
- **Evidence:** [`server/utils/image_utils.py`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/server/utils/image_utils.py), [`server/training/train_eye_validation.py`](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/server/training/train_eye_validation.py).
- **Suspected Cause:** Placeholder modules left unfinished during initial scaffolding.
- **Cause Status:** `CONFIRMED`
- **Previous Attempts:** None.
- **Result:** Dead code references.
- **Recommended Next Step:** Implement the modules or document their target milestones.
- **Status:** `OPEN`

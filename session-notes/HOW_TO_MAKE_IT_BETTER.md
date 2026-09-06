# How to make FreshWay better

> **Author:** this agent (session 2026-09-06)  
> **Scope:** independent recommendation from current repo + existing project docs (read-only)  
> **Not a measured accuracy claim.** No training or evaluation was run in this session.

---

## The short version

FreshWay already has a working capture → Flask → MobileNetV2 → market-route path. It does **not** yet have a trustworthy accuracy number, a train/inference match, or a product loop that stores results.

Do **not** start with FastAPI, YOLO, PWA, Grad-CAM, gills, or maps. Those are later. The product gets better by making the **eye classifier honest, reproducible, and hard to misuse**, then adding only the features a dock inspector would notice.

---

## What is already in good shape

**Fact (code):**

- Next.js capture/upload UI talks to `/predict` (env URL or `/api` proxy).
- Flask validates extension, UUID temp files, CORS, `/health`.
- Inference loads `freshness_model_best.keras`, quality-checks glare/blur, 60% confidence gate, rule-based routing.
- A **read-only split manifest** already exists: `experiments/manifests/baseline_split_v1.json`, plus `create_baseline_manifest.py` and `evaluate_manifest.py`.
- A Python 3.11 venv exists at `freshway/.venv-py311` (older docs still describe only empty Python 3.14). Treat that as an observation that the environment gate may already be partly unblocked.

**Observation:** the 5-phase roadmap is larger than the current bottleneck. Shipping more UI around a ~69% (historical, not re-measured here) three-class model will not make the system more useful at a harbor.

---

## The real bottlenecks (do these in order)

### 1. Freeze a number you can defend

**Problem:** the shipped `.keras` files do not match the committed trainer head, the original train/val split is gone, and inference **center-crops** while training/`evaluate.py` **resize-squash**. `evaluate_manifest.py` even documents that it uses the old nearest-resize path on purpose.

Until you evaluate on a **named split + named preprocess + named model file**, “88–94% after v2.5” is a target, not a result.

**Do:**

1. Keep `fish_dataset/` untouched. Use the existing manifest; do not copy images into `server/data/` as the source of truth.
2. Backup `freshness_model_best.keras` / `freshness_model_final.keras` to dated copies **before any train**. The trainer still overwrites those exact paths (`BEST_MODEL_PATH` / `FINAL_MODEL_PATH`).
3. Run `evaluate_manifest.py` on the **current** best model and save JSON under `experiments/results/` with a new experiment file (e.g. `EXP-005`). That number is the real baseline for *this* split.
4. Then evaluate the **same** model with **inference** preprocess (center-crop). If the two numbers differ, you have quantified the train/serve mismatch.

**Do not:** retrain until those two reports exist.

### 2. Make train and serve the same image

**Problem:** `preprocess.py` crops to square then bilinear-resizes. `train_freshness_classifier.py` uses `ImageDataGenerator.flow_from_directory(..., target_size=(224,224))` with no `smart_center_crop`. Users on phones send 16:9 frames; the model was (or will be) trained on a different geometry.

**Do:** one shared preprocess function used by train, eval, and `/predict`. Pick crop-then-resize as the production policy (it matches camera UI) and train against that. Keep a one-off evaluator for the *legacy* model if you still need to compare to history.

### 3. Retrain without destroying provenance

**Problem:** v2.5 (BN freeze, Swish 128 head, milder aug, label smoothing) is implemented but unproven. Saving on top of the baseline erases the only historical artifact.

**Do:**

- Tag outputs: `freshness_exp005_mobilenetv2_swish_best.keras`
- Log seed, manifest hash, backbone, preprocess id, class weights
- Report **macro F1** and the confusion matrix, not only accuracy (classes are unbalanced: highly_fresh is larger in the source tree)
- Stratify by **species** in the split (manifest already has species). If accuracy is high overall but collapses on one species, the model is memorizing species cues, not freshness.

**Hypothesis (not measured):** v2.5 may help, but 88–94% is optimistic until you see the confusion matrix. Adjacent classes (`highly_fresh` vs `fresh`) will dominate errors.

### 4. Reject garbage inputs before you add YOLO

**Problem:** any photo still gets a freshness class. `train_eye_validation.py` is still a stub. Full YOLOv8 is a large new dataset and stack.

**Do first (cheap):**

- Keep glare/blur warnings, but **fail closed** when quality is terrible (today warnings are informational).
- Simple heuristic or a tiny binary “eye vs not-eye” head trained on a few hundred negatives (desks, faces, full-fish-from-far). Return `status: "rejected"` with a clear retake message.

**Do later:** ROI detector / auto-crop when you have labeled boxes.

### 5. Make the inspector loop complete

The capture page is the product. Supply chain, contact form, and landing stats are mostly presentation.

**Do:**

- Persist each scan (SQLite is enough): timestamp, predicted class, confidence, warnings, optional notes. No Postgres until you have multi-user deploy.
- History page that reads that store. Without this, nobody can audit or improve labels.
- Contact form: either POST to an endpoint or remove “submit” theater.
- Supply chain: label it **demo / mock** in the UI, or load JSON from the server. Fake seller tables look like a finished ERP.

**Do not** migrate Flask → FastAPI until you have tests around `/predict` and `/health`. FastAPI is a rewrite tax, not an accuracy fix.

### 6. Harden the demo so it does not lie

**Do:**

- Pin `server/requirements.txt` (TensorFlow/Keras/NumPy/Pillow/SciPy/Flask). Unpinned installs will drift from Keras 3.13.2 model files.
- Health check should say whether the model loaded, not only that Flask started.
- A few pytest cases: missing file, bad extension, routing labels, confidence gate math.
- Docker later, after pins and a known-good eval.

### 7. UI that matches dock reality

**Do (small, high leverage):**

- Camera: force a tight crop to the reticle (what you send should be the eye, not the full 16:9 frame).
- Show all three class scores always; inspectors distrust a single label.
- Kannada / Malayalam later is valuable; English-only is fine until the model is trusted.
- PWA/offline TF.js only after a **measured** on-device model (size, latency, same preprocess).

---

## What to delay (and why)

| Idea in the existing roadmap | When it actually helps |
| :--- | :--- |
| FastAPI + Swagger | After tests exist; optional |
| PostgreSQL + JWT roles | When more than one inspector shares a server |
| YOLOv8 eye detector | After binary reject works and you have boxes |
| Gill + skin fusion | When you have paired photos, not a second CNN on hope |
| Grad-CAM | Nice for papers/demos; does not raise accuracy |
| TF.js / PWA | After a model you would trust **online** |
| Maps / PDF certificates / batch crates | After history + a real batch of labeled scans |

---

## Suggested 2-week sequence

| Days | Outcome |
| :---: | :--- |
| 1 | Backup models; run manifest eval on current `.keras` (legacy preprocess + inference preprocess). Write `experiments/EXP-00x.md` with real numbers. |
| 2 | Shared preprocess; trainer writes experiment-tagged paths only. |
| 3–5 | Train v2.5 on manifest; compare test macro F1 to day-1 baseline. Keep the worse model if it loses. |
| 6 | Fail-closed quality + simple non-eye reject message. |
| 7–8 | SQLite inspections + `/history` UI. |
| 9 | Pin requirements; `/health` includes model status; 5–10 pytest cases. |
| 10 | Camera sends reticle crop; UI always shows `all_scores`. |

If day 5 does not beat the day-1 baseline on the **same** test split, do not ship v2.5. Debug the matrix (species leakage, crop, class mapping) instead of adding architecture.

---

## How you will know it got better

Use these, not roadmap checkboxes:

1. Test-set macro F1 and confusion matrix on `baseline_split_v1` (or a successor manifest with a new id).
2. Same metric on a small **phone-captured** holdout (harbor lighting), even 50 images.
3. Rate of `"uncertain"` / `"rejected"` on junk photos (should be high) vs real eyes (should be low).
4. An inspector can open yesterday’s scans without asking you to re-run the demo.

---

## Conflicts with older docs (do not silently “fix” them)

These are observations vs `CURRENT_STATE.md` / `CHANGELOG.md` as of 2026-09-04; this file does not edit them.

- ISSUE-011 is marked resolved because the **training code** changed. Accuracy is not resolved until a new eval exists.
- Environment was documented as Python 3.14-only; `freshway/.venv-py311` is now present.
- Manifest + `evaluate_manifest.py` already exist; the “next step is invent a split” work is partly done.
- Trainer overwrite of `freshness_model_best.keras` is still a live risk.

---

## Approval needed before this agent implements

Per project rules: dataset moves, retraining, replacing `.keras` files, FastAPI, and YOLO need an explicit yes. This document is recommendation only.

# 🐟 FreshWay Server — Fish Freshness Classification API

Backend server powered by **Flask** and **MobileNetV2 (CNN)** for classifying fish freshness from eye images.

---

## 📁 Project Structure

```
server/
├── app.py                          # 🚀 Flask API entry point
├── requirements.txt                # 📦 Python dependencies
├── README.md                       # 📖 You are here
│
├── inference/                      # 🔍 Prediction pipeline
│   ├── __init__.py
│   ├── predict.py                  # Main prediction logic (loads model, runs inference)
│   └── preprocess.py               # Image preprocessing (resize, normalize for MobileNetV2)
│
├── training/                       # 🧠 Model training scripts
│   ├── __init__.py
│   ├── train_freshness_classifier.py   # Train the freshness CNN model
│   └── train_eye_validation.py         # (Future) Train eye detection model
│
├── business_logic/                 # 📊 Business rules
│   ├── __init__.py
│   └── routing.py                  # Market routing based on freshness label
│
├── models/                         # 💾 Trained model files (NOT in git)
│   ├── freshness_model_best.keras      # Best model checkpoint (auto-saved during training)
│   ├── freshness_model_final.keras     # Final model after training completes
│   ├── freshness_checkpoint.keras      # Resume checkpoint (used for pause/resume training)
│   └── training_progress.json          # Training progress tracker (epoch, phase, accuracy)
│
├── data/                           # 🖼️ Training dataset (NOT in git)
│   ├── train/                      # 80% of images for training
│   │   ├── fresh/                  # Fresh fish eye images
│   │   ├── highly_fresh/           # Highly fresh fish eye images
│   │   └── not_fresh/              # Not fresh fish eye images
│   └── val/                        # 20% of images for validation
│       ├── fresh/
│       ├── highly_fresh/
│       └── not_fresh/
│
├── logs/                           # 📈 TensorBoard training logs (NOT in git)
├── temp/                           # 🗑️ Temporary uploaded images (auto-cleaned)
└── utils/                          # 🔧 Utility functions
    └── image_utils.py              # Image processing helpers
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Run the API Server
```bash
python app.py
```
Server starts at `http://localhost:5000`

### 3. Test the API
```bash
# Health check
curl http://localhost:5000/health

# Predict freshness (upload an image)
curl -X POST -F "image=@fish_eye.jpg" http://localhost:5000/predict
```

---

## 🧠 Training the Model (One-Time Setup)

### Step 1: Prepare the Dataset

Download the fish eye dataset and extract it. Then organize images into the folder structure:

```
server/data/
├── train/
│   ├── fresh/           ← Put ~80% of fresh fish eye photos here
│   ├── highly_fresh/    ← Put ~80% of highly fresh photos here
│   └── not_fresh/       ← Put ~80% of not fresh photos here
└── val/
    ├── fresh/           ← Put ~20% of fresh photos here
    ├── highly_fresh/    ← Put ~20% of highly fresh photos here
    └── not_fresh/       ← Put ~20% of not fresh photos here
```

> ⚠️ The `data/` folder is in `.gitignore`. Each team member needs to set up their own local copy of the dataset.

### Step 2: Run Training
```bash
python training/train_freshness_classifier.py
```

Training runs in **two phases**:
| Phase | What it does | Epochs |
|-------|-------------|--------|
| **Phase 1** | Trains only the classification head (MobileNetV2 base frozen) | 15 |
| **Phase 2** | Fine-tunes last 30 layers of MobileNetV2 | Up to 50 (early stops) |

### Step 3: Resume Training (if interrupted)
Just run the same command again:
```bash
python training/train_freshness_classifier.py
```
It automatically detects the checkpoint and resumes from where you left off.

> ⏱️ Training takes ~1-2 hours on CPU (8GB RAM laptop). Keep your laptop plugged in and don't let it sleep!

---

## 📂 File-by-File Guide

### `app.py` — Flask API Server
**Purpose:** Entry point for the backend. Receives image uploads and returns freshness predictions.

**Key endpoints:**
| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/predict` | Upload a fish eye image → get freshness result |
| `GET` | `/health` | Health check (returns `{"status": "ok"}`) |

**What to modify:**
- Add new API endpoints here
- Change the port (default: 5000)
- Add authentication/middleware if needed

---

### `inference/predict.py` — Prediction Pipeline
**Purpose:** Loads the trained MobileNetV2 model and runs predictions on uploaded images.

**How it works:**
1. Lazy-loads the trained `.keras` model (cached after first load)
2. Preprocesses the image (resize to 224×224, normalize pixels)
3. Runs MobileNetV2 inference
4. Applies **confidence gating** (rejects predictions below 60% confidence)
5. Routes to market via business logic

**Returns:**
```json
{
  "freshness": "Fresh",
  "confidence": 85.3,
  "status": "success",
  "message": "Fish eye analyzed: Fresh with 85.3% confidence.",
  "market_route": "Medium-distance market (e.g., Mysore)",
  "all_scores": {
    "Fresh": 85.3,
    "Highly Fresh": 10.2,
    "Not Fresh": 4.5
  }
}
```

**What to modify:**
- Change `CONFIDENCE_THRESHOLD` (default: 0.60) to adjust strictness
- Add new post-processing logic

---

### `inference/preprocess.py` — Image Preprocessing
**Purpose:** Prepares images for MobileNetV2 input.

**What it does:**
- Loads image from file path
- Resizes to **224×224** pixels (MobileNetV2 input size)
- Normalizes pixel values to **[0, 1]**
- Adds batch dimension

**What to modify:**
- Change `IMG_SIZE` if using a different model
- Add additional preprocessing (cropping, color correction, etc.)

---

### `training/train_freshness_classifier.py` — Model Training
**Purpose:** Trains the MobileNetV2 CNN model on fish eye images.

**Architecture:**
```
MobileNetV2 (pretrained on ImageNet, frozen/fine-tuned)
    ↓
Global Average Pooling
    ↓
Dense(256) → BatchNorm → Dropout(0.5)
    ↓
Dense(128) → BatchNorm → Dropout(0.3)
    ↓
Softmax(3 classes)
```

**Features:**
- ✅ Transfer learning from ImageNet
- ✅ Data augmentation (rotation, flip, zoom, brightness)
- ✅ Early stopping & learning rate scheduling
- ✅ Checkpoint/resume support
- ✅ TensorBoard logging

**What to modify:**
- `BATCH_SIZE` — decrease if running out of RAM (try 16)
- `PHASE1_EPOCHS` / `PHASE2_EPOCHS` — more epochs = longer training
- `LEARNING_RATE` — lower = slower but potentially better
- Data augmentation parameters in `create_data_generators()`

---

### `training/train_eye_validation.py` — Eye Validation Model (TODO)
**Purpose:** (Future) Train a model to detect whether an image contains a fish eye or not.

**Status:** Not implemented yet. This would be a binary classifier (Fish Eye / Not Fish Eye) that runs before the freshness classifier.

---

### `business_logic/routing.py` — Market Routing
**Purpose:** Routes fish to appropriate markets based on freshness.

**Current routing logic:**
| Freshness | Market Route |
|-----------|-------------|
| Highly Fresh | Long-distance market (e.g., Bangalore) |
| Fresh | Medium-distance market (e.g., Mysore) |
| Not Fresh | Local market or reject |
| Uncertain | Request better image |

**What to modify:**
- Add real market names/locations
- Add pricing logic
- Connect to a database for tracking

---

### `utils/image_utils.py` — Image Utilities
**Purpose:** Shared helper functions for image processing.

**Status:** Basic scaffold. Can be used for:
- Image validation (check format, size)
- Cropping/rotation utilities
- Color correction

---

## 🔧 Configuration

| Config | File | Default |
|--------|------|---------|
| API Port | `app.py` | `5000` |
| Image Size | `inference/preprocess.py` | `224×224` |
| Confidence Threshold | `inference/predict.py` | `0.60 (60%)` |
| Batch Size | `training/train_freshness_classifier.py` | `32` |
| Learning Rate | `training/train_freshness_classifier.py` | `1e-4 (Phase 1), 1e-5 (Phase 2)` |

---

## 📦 Dependencies

```
flask          — Web framework for the API
flask-cors     — Cross-origin support (allows frontend to call API)
tensorflow     — Deep learning framework (MobileNetV2)
numpy          — Numerical computing
pillow         — Image loading and processing
scipy          — Required by TensorFlow for image augmentation
```

Install all: `pip install -r requirements.txt`

---

## ❓ FAQ

**Q: Do I need to train the model every time I run the server?**
A: No! Training is a one-time process. Once the `.keras` model files are saved, the server just loads them on startup.

**Q: Where do I get the dataset?**
A: Ask the team lead for the fish eye dataset zip file. Extract and organize into `data/train/` and `data/val/` folders.

**Q: The model accuracy is low, how to improve?**
A: Try these:
1. Add more training images
2. Use class weights to handle imbalanced data
3. Increase training epochs
4. Try different augmentation strategies

**Q: My laptop freezes during training?**
A: Reduce `BATCH_SIZE` from 32 to 16 in `train_freshness_classifier.py`. Close other apps to free up RAM.

**Q: Can I use GPU for training?**
A: Yes! If you have an NVIDIA GPU, install `tensorflow[gpu]` and training will be 10-20x faster.

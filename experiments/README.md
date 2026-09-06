# 🔬 FreshWay — Machine Learning Experiments Protocol

> **Status:** Active ML Experiment System  
> **Rule:** Never record an experiment result that was not actually measured.

---

## 1. Experiment Registry

| Exp ID | Date | Focus / Model | Target Metric | Status | Record File |
| :--- | :---: | :--- | :--- | :---: | :--- |
| **EXP-001** | 2026-08-25 | MobileNetV2 2-Phase Baseline with Class Weights & `[-1, 1]` Preprocessing | Val Accuracy / Loss | `HISTORICAL CLAIM (~69%); ORIGINAL SPLIT NOT RECOVERED` | [`EXP-001.md`](./EXP-001.md) |
| **EXP-002** | *Planned* | YOLOv8-Nano Fish Eye Auto-Detection & Cropping | mAP@50 / Crop Accuracy | `PLANNED` | *To be created* |
| **EXP-003** | *Planned* | Multi-Organ Feature Fusion (Eye + Gills CNN) | Macro F1-Score | `PLANNED` | *To be created* |
| **EXP-004** | *Planned* | TensorFlow.js Quantization (INT8 vs FP16) | Inference Latency / Model Size | `PLANNED` | *To be created* |
| **EXP-005** | 2026-09-06 | Existing `freshness_model_best.keras` on `baseline_split_v1` test | Test accuracy / macro F1 | `MEASURED: 38.07% acc, 0.293935 macro F1` | [`EXP-005.md`](./EXP-005.md) |
| **EXP-006** | 2026-09-06 | v2.5 MobileNetV2 on `baseline_split_v1` (tagged production save) | Test accuracy / macro F1 | `PROMOTED: 69.42% acc, 0.684028 macro F1` | [`EXP-006.md`](./EXP-006.md) |
| **EXP-007** | 2026-09-06 | Species-balanced sample weighting from EXP-006 | Test accuracy / macro F1 | `MEASURED: 66.67% acc, 0.655661 macro F1; NOT PROMOTED` | [`EXP-007.md`](./EXP-007.md) |

---

## 2. Protocol for New Experiments

When running an experiment:
1. Create a new markdown file: `experiments/EXP-XXX.md`.
2. Follow the standardized schema:
   - **Experiment Question**
   - **Date**
   - **Hypothesis**
   - **Dataset & Split**
   - **Baseline**
   - **Method / Model Configuration**
   - **Changes Applied**
   - **Metrics Evaluated**
   - **Results & Loss/Accuracy Curve Observations**
   - **Interpretation & Limitations**
   - **Conclusion & Next Steps**
3. Log all hyperparameters and checkpoint paths.

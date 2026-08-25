# 🤖 AGENTS.md — Instructions & Protocols for AI Coding Agents

> **Project:** Freshway (Computer Vision–Based Fish Freshness Assessment)  
> **Last Updated:** 2026-08-25 18:10 (Local Time)  
> **Target Audience:** All current and future AI coding agents, autonomous agents, and pair-programming assistants working on the Freshway codebase.  

---

## 1. Core Mission & Identity

Freshway is a dedicated **computer vision–based fish freshness assessment and supply chain routing system**. It analyzes photographic images of fish eyes to classify freshness into three specific tiers (`Highly Fresh`, `Fresh`, `Not Fresh`), produces confidence scores, and provides downstream market routing recommendations.

**Guiding Rule:**
Do **NOT** reinterpret Freshway as a generic fish species classifier, generic computer-vision sandbox, generic food-quality project, or general e-commerce marketplace. Preserve Freshway's precise intended purpose at all times.

---

## 2. Mandatory Reading Before Making Any Changes

Before reading, modifying, or creating any application source code, you **MUST** read the following context files in this exact order:

1. [**`AGENTS.md`**](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/AGENTS.md) *(this file — rules & protocols)*
2. [**`PROJECT_CONTEXT.md`**](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/PROJECT_CONTEXT.md) *(project identity, boundaries, architecture, pipeline, domain assumptions)*
3. [**`CURRENT_STATE.md`**](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/CURRENT_STATE.md) *(actual repository reality vs. planned features, what is working vs. incomplete)*
4. [**`DECISIONS.md`**](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/DECISIONS.md) *(architectural, ML, and product decision history and rationales)*
5. [**`ISSUES.md`**](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/ISSUES.md) *(known bugs, accuracy limitations, technical debt, and troubleshooting records)*
6. [**`PROJECT_ANALYSIS_AND_ROADMAP.md`**](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/PROJECT_ANALYSIS_AND_ROADMAP.md) *(design vision, comprehensive audit, and phased roadmap)*

Only after reviewing these documents should you inspect the targeted source code files.

---

## 3. Important Development Rules

### Rule 1: Understand Before Modifying
Inspect the existing codebase, imports, and data flows before proposing changes or rewrites. Never write code on top of false assumptions about how the system currently functions.

### Rule 2: Preserve the Intended Purpose
Freshway's core value proposition is objective, non-destructive, rapid fish freshness evaluation via deep learning on fish eyes for coastal seafood supply chains (e.g., Mangalore/Kerala coastal belt).

### Rule 3: Prefer Targeted Improvements Over Unnecessary Rewrites
The project is already technically implemented with working frontend and backend pipelines. Refactor surgically. Avoid rewriting working modules when targeted bug fixes or modular additions achieve the goal.

### Rule 4: Never Invent Facts
- Never invent dataset sample counts, accuracy metrics, benchmark numbers, or test results.
- Never claim an accuracy improvement without having run and measured actual evaluation scripts.
- Never claim an experiment succeeded without reproducible log evidence.
- If an architectural reason or historical detail cannot be found, document it explicitly as:
  `UNKNOWN — REQUIRES USER CONFIRMATION`.

### Rule 5: Distinguish Fact, Observation, Hypothesis, and Recommendation
- **Fact:** Verified in the actual running codebase or repository files.
- **Observation:** Direct empirical behavior noticed during runtime or testing.
- **Hypothesis:** Suspected root cause or theoretical model explanation.
- **Recommendation:** Proposed future action or architectural refactoring.

### Rule 6: Source-of-Truth Hierarchy
When information or documentation conflicts, adhere strictly to this hierarchy:
1. **Actual working code in the repository**
2. **Explicit user decisions / instructions**
3. **Verified experiment and evaluation results**
4. **Existing project documentation (`PROJECT_CONTEXT.md`, `CURRENT_STATE.md`, etc.)**
5. **Roadmaps and design plans (`PROJECT_ANALYSIS_AND_ROADMAP.md`)**
6. **AI assumptions (Lowest priority — must be validated)**

### Rule 7: Flag Conflicts Explicitly
If the code does something different from what documentation or roadmap claims, **explicitly record the conflict** in `ISSUES.md` or `CURRENT_STATE.md` rather than silently picking one.

### Rule 8: Preserve Reproducibility & Environment Stability
- Do not make breaking dependency upgrades without clear justification.
- Keep Python requirements (`requirements.txt`) and Node dependencies (`package.json`) clean and synced.
- Preserve all existing comments, docstrings, and type definitions that are unrelated to your edits.

---

## 4. Approval Rule for Major Architectural Changes

For major modifications involving:
- ML architecture / base model changes (e.g., replacing MobileNetV2 with YOLO / EfficientNet)
- Dataset strategy or directory reorganization
- Model replacement or retraining methodology
- Output semantic changes (modifying class names or confidence ranges)
- Recommendation / market routing logic alterations
- Major dependency / framework replacements (e.g., Flask $\rightarrow$ FastAPI)
- Structural folder restructuring or file deletions

You **MUST** present a structured proposal covering:
1. **Current approach:** How the system currently does it.
2. **Problem with current approach:** Concrete limitation or failure mode.
3. **Proposed approach:** Detailed technical design of the change.
4. **Why the proposed approach is better:** Expected measurable benefits.
5. **Risks and tradeoffs:** Potential regressions, performance costs, or compatibility breaks.
6. **Validation plan:** How the change will be verified and tested.

Wait for user consent before executing destructive or architectural transformations.

---

## 5. Documentation Maintenance Protocol

Maintain the documentation files as the project evolves without overwhelming the repository with trivial updates.

| Event | Action Required |
| :--- | :--- |
| **Bug Discovered** | Add entry in [**`ISSUES.md`**](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/ISSUES.md) with ID (`ISSUE-XXX`), severity, evidence, and status `OPEN`. |
| **Bug Resolved** | Update status in [**`ISSUES.md`**](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/ISSUES.md) to `RESOLVED`, add resolution notes, and add entry to [**`CHANGELOG.md`**](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/CHANGELOG.md). |
| **Major Implementation / Feature** | Update [**`CURRENT_STATE.md`**](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/CURRENT_STATE.md) and record in [**`CHANGELOG.md`**](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/CHANGELOG.md). |
| **Architectural / ML Decision Made** | Add entry in [**`DECISIONS.md`**](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/DECISIONS.md) (`DEC-XXX`) with reason, evidence, and consequences. |
| **New Understanding / Core Shift** | Update [**`PROJECT_CONTEXT.md`**](file:///c:/Users/LENOVO/OneDrive/Desktop/freshway%202/freshway/PROJECT_CONTEXT.md). |
| **New ML Experiment Run** | Create record under `experiments/EXP-XXX.md` with dataset, baseline, metrics, and conclusions. |

### Timestamp Format
Whenever updating documents for non-trivial changes, update the header:
`Last Updated: YYYY-MM-DD HH:MM` (using the system's local time).

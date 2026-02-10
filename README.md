# Computer Vision–Based Fish Freshness Assessment


---
## 🚀 Getting Started

### 1️⃣ Fork the Repository

Click the **Fork** button on the top right of this repository  
This will create a copy under your own GitHub account.

Example:
https://github.com/YOUR-USERNAME/freshway

---

### 2️⃣ Clone Your Forked Repository

Replace `YOUR-USERNAME` with your GitHub username:


git clone https://github.com/YOUR-USERNAME/freshway.git
cd freshway


### 2. Install Frontend (Client)
```bash
cd client
npm install
```
Start development server:
```bash
npm run dev
```
App runs at:
```
http://localhost:3000
```

### 3. Install Backend (Server)
```bash
cd ../../server
pip install -r requirements.txt
```
Start backend server:
```bash
python app.py
```
API runs at:
```
http://localhost:5000
```

### 4. Environment Variables
Create:
```
client/my-app/.env.local
```
Example:
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```
⚠️ Never commit `.env.local` or any secret keys.

---

## 🧰 Requirements
- Node.js >= 18
- npm >= 9
- Python >= 3.9
- pip
- Git

Check:
```bash
node -v
npm -v
python --version
pip --version
```

---

## 📁 Project Structure
```
freshway/
  client/           → Frontend (Next.js/React)
    my-app/         → Main app
  server/           → Backend (Flask, ML, API)
    data/           → Datasets
    models/         → Saved models
    training/       → Model training scripts
    inference/      → Inference pipeline
    business_logic/ → Business rules
    utils/          → Utilities
    app.py          → API entry
    requirements.txt
  docs/             → Documentation (optional)
```

---

## 🌿 Git Workflow (MANDATORY FOR ALL MEMBERS)
This is a team/organization repository. Do not treat it like a personal repo.

### 🚫 Not Allowed
- Direct push to main
- Force push shared branches
- Committing .env or secrets
- Large unrelated commits

### ✅ Required
- Feature branches
- Pull Requests
- Code review before merge
- Clear commit messages

### 🟢 Daily Development Workflow
**Step 1 — Pull latest main**
```bash
git checkout main
git pull origin main
```
**Step 2 — Create feature branch**
```bash
git checkout -b feature/your-feature-name
```
Examples:
- feature/login-ui
- feature/dashboard
- fix/navbar-overflow
- refactor/api-cleanup

**Step 3 — Make changes & commit**
```bash
git add .
git commit -m "feat: add login validation"
```
Commit message format:
| Type     | Usage         |
|----------|--------------|
| feat     | new feature   |
| fix      | bug fix       |
| refactor | cleanup       |
| docs     | documentation |
| style    | UI/styling    |

**Step 4 — Push branch**
```bash
git push origin feature/your-feature-name
```
**Step 5 — Open Pull Request**
- Go to the repository on GitHub
- Click "New Pull Request"
- Select your branch → main
- Add description
- Request review
- Merge after approval

---

## 🔧 Useful Git Commands
Check current branch:
```bash
git branch
```
Check remote:
```bash
git remote -v
```
Should show:
```
https://github.com/Muhammad-Sheik-Nauman/freshway.git
```
Fix wrong remote:
```bash
git remote set-url origin https://github.com/Muhammad-Sheik-Nauman/freshway.git
```
Delete local branch:
```bash
git branch -d feature/branch-name
```
Sync with latest main:
```bash
git fetch origin
git rebase origin/main
```

---

## 🤝 Contribution Guidelines
- Keep PRs small and focused
- One feature per branch
- Write meaningful commit messages
- Review teammates’ PRs
- Document new features in README or docs
- Add tests if possible (for backend/frontend logic)






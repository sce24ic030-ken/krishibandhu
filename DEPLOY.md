# Deploying KrishiBandhu to Render

Two services are wired up by `render.yaml` (a Render "Blueprint"):

| Service | Type | URL (free tier) |
|---|---|---|
| `krishibandhu-api` | Node Web Service | `https://krishibandhu-api.onrender.com` |
| `krishibandhu-frontend` | Static Site | `https://krishibandhu-frontend.onrender.com` |

---

## Step 1 — Put the code on GitHub (one-time)

```powershell
cd D:\SIH26132\KrishiBandhu\KrishiBandhu
git init
git add .
git commit -m "Initial KrishiBandhu code"
```

Log in to GitHub and create a repo:

```powershell
gh auth login          # browser/device code — one-time
gh repo create krishibandhu --private --source=. --push
```

> `.gitignore` already excludes `node_modules`, `dist`, `.env` — your API keys
> never leave this machine.

## Step 2 — Atlas: allow Render's IPs (⚠️ required)

Render's servers aren't on your Atlas allowlist. Open
**Atlas → Network Access → Add IP Address → `0.0.0.0/0` (Allow access from anywhere)**.

This is necessary because Render free tier uses changing egress IPs.
Do this **before** Step 3, or the backend will boot but every DB call fails.

## Step 3 — Create the services (one click)

1. Render dashboard → **New → Blueprint**
2. Connect your GitHub account, pick the `krishibandhu` repo
3. Render reads `render.yaml` and shows both services → **Apply**
4. When prompted, fill the **secret env vars** flagged `sync: false` —
   copy the values from your local `backend\.env`:
   - `MONGO_URI` (your Atlas string — already working locally)
   - `JWT_SECRET`, `LLM_API_KEYS`, `WHISPER_API_KEYS`, `WHISPER_API_KEY`,
     `VISION_LLM_API_KEYS`, `GEMINI_API_KEY`, `GEMINI_MODEL`,
     `OPENWEATHER_API_KEY` … (paste them all)
5. Let both deploys finish (frontend ~1 min, backend ~2–4 min)

## Step 4 — Verify

- Backend health: open `https://krishibandhu-api.onrender.com/api/health` → should say OK
- Open `https://krishibandhu-frontend.onrender.com` → log in with a demo account.
  (Create users on Render by hitting the API, or point the backend at the same
  Atlas DB — existing demo users are already there.)
- Chat, voice, AI image upload, weather — all call the backend through
  `VITE_API_URL` (already set in the blueprint).

---

## How updates flow after this

Your **database is shared** (Atlas), and code updates flow through git:

```powershell
git add .
git commit -m "fix: ..."
git push
```

Render **auto-redeploys** both services on push (default). Data changes are
instant — no deploy needed.

## Things to know about Render *free* tier

- **Cold start:** services sleep after ~15 min idle; the first visit takes
  ~30–60 s to wake. It is not a crash.
- **Ephemeral disk:** uploaded parchi receipts (written to `backend/uploads`)
  are lost on every redeploy. For production, either use the built-in
  persistent disk (paid) or switch uploads to S3/Cloudinary.
- **Health check:** `/api/health` keeps the backend awake slightly longer and
  shows deploy status.

## Optional: run both services locally with the same config

```powershell
cd backend;  npm run dev      # :5000
cd frontend; npm run dev      # :5173
```
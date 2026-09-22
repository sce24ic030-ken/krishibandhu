# KrishiBandhu — Full Project Steps & Access Record

> Saved: 22 Sep 2026 · Session `ses_f3c035897ffeaVeO5QxQjYePkX`
> Project complete — **no pending work**. This file lets any future session resume instantly.

---

## 1. 🌐 Links

| What | URL |
|---|---|
| **Frontend app** | `https://krishibandhu-frontend-833m.onrender.com` |
| **Backend API** | `https://krishibandhu-api.onrender.com` |
| Login page | `https://krishibandhu-frontend-833m.onrender.com/login` |
| Settings / demo accounts | `https://krishibandhu-frontend-833m.onrender.com/settings` |
| Git repo | `https://github.com/sce24ic030-ken/krishibandhu.git` (branch `main`) |

## 2. 🔑 Credentials (all verified live)

| Role | Email | Password |
|---|---|---|
| Farmer | `farmer@krishibandhu.com` | `Farmer123` |
| Trader | `swetha@krishibandhu.com` | `Swetha123` |
| Admin | `admin@krishibandhu.com` | `Admin123` |

Key IDs: farmer (Ramesh Patil) `6ab140e79a4a35d4bc7e2df0` · trader `6ab251ca50febbe8ce2f677d` · Pune APMC `6ab140ec74e8ec7a9a1c6be2`

## 3. 📄 Page routes

Dashboard `/dashboard` · Glut Watch `/market?tab=glut` ⭐ · Market `/market` · AI Assistant `/ai-assistant` ⭐ · Weather `/weather` · Crops `/crops` · Passbook `/passbook` · Credit Score `/credit-score` · Parchi `/parchi` · Backhaul `/backhaul` · Storage `/storage` · Trader `/trader` · Alerts `/alerts` · Net Realization `/net-realization` · Admin `/admin` (+ `/admin/users`, `/admin/markets`, `/admin/crops`, `/admin/bids`, `/admin/parchi`, `/admin/transactions`, `/admin/payments`, `/admin/backhaul`, `/admin/storage-requests`)

## 4. ✅ Work delivered (each requirement → what was done)

### A. Trader renamed to Swetha
- `users` doc name = `Swetha`; email `swetha@krishibandhu.com`, password `Swetha123`.
- Parchi/Bid populated names auto-update (1 parchi shows "Swetha").
- Settings page demo card shows role **Trader** (login `swetha@krishibandhu.com` / `Swetha123`); label is the generic role, not the person's name.

### B. Glut engine (mandi arrival intelligence)
- Third tab on Market page: **"Arrival / Glut Watch"** → `/market?tab=glut`; Dashboard shortcut card links there.
- Commodity prefilled with farmer's crops; market select; trickle of markets with data.
- Heuristic: ≥1.5× daily avg → **heavy_glut**, ≤0.6× → **thin_supply**, else **normal**.
- Reads real MSAMB data. Live verdict: *"Already 1,92,700 kg of Tomato in Pune APMC today … 1.0x the recent daily average — normal supply."*
- Files: `backend/controllers/marketGlutController.js`, `backend/routes/marketGlutRoutes.js`, `backend/routes/adminMarketRoutes.js`, `frontend/src/components/GlutWatch.jsx` + `.css`, `frontend/src/pages/Market.jsx` + `.css`, `frontend/src/pages/Dashboard.jsx`.

### C. AI chat — never shows "Unable to get a response from AI"
- **Groq-first pipeline**: 14 keys (7 LLM + 7 WHISPER) round-robin; account's real chat models verified via `GET /openai/v1/models`: `qwen/qwen3.8-27b`, `allam-2-7b`, `openai/gpt-oss-20b`, `openai/gpt-oss-120b` (env `GROQ_MODEL=groq/compound` is bogus → filtered in code via `GROQ_MODEL_CANDIDATES`).
- **Gemini = second provider** via raw REST (`:generateContent` v1beta) with `AbortController` per-attempt timeouts (`GEMINI_TIMEOUT_MS` default 25000, round 2 = 15000) — the `@google/genai` SDK p-retries 503s (40s+ stalls). `GEMINI_API_KEY` is shared with the Parchi receipt service (quota contention).
- `GROQ_BUDGET_MS` default 12000; per-attempt fetch abort capped by remaining pool budget.
- Round 2 = Gemini-only; graceful **language-aware fallback** never throws → error banner impossible.
- `POST /api/ai/chat` + `POST /api/ai/translate` (`backend/controllers/aiController.js`, `backend/routes/aiRoutes.js`, `backend/services/aiService.js`, `backend/services/groqService.js`).

### D. Chat history re-translates on language switch (EN/मराठी/हिंदी)
- `frontend/src/components/FloatingChatButton.jsx` + `frontend/src/pages/AIAssistant.jsx`: batch `POST /api/ai/translate`, index-aligned update, `chatLangRef` guard, cancelled-flag, "Translating chat…" indicator.
- Verified live in browser: EN → मराठी re-translated greeting + user question + assistant answer (prices/₹/MSAMB preserved).

### E. Floating chat input placeholder fit (360px)
- Mobile popup widened `304px → 328px`; placeholder shortened to **"Ask about crops, farming…"** (mr: `पिके, शेतीबद्दल विचारा…`, hi: `फसलों, खेती के बारे में पूछें…`).
- Verified live: placeholder renders 174px inside 209px input — fits.

### F. Settings page cleanup
- Removed fake claim **"AI Nursery Assistant (Gemini)"** (no such feature exists) → **"AI farming assistant — crops, markets & weather"** (translated mr/hi).
- Audited all other claims (PWA, offline QR queue, price-trend forecast, credit score, admin tower, hash-chained ledger, multilingual) — all real.

## 5. 🧪 Production verification (live, on deploy `237cb11`)

| Check | Result |
|---|---|
| CHAT (en) | 200 · 1.2s · real MSAMB answer (Tomato Pune modal ₹1,050) · no error banner |
| CHAT (mr) | 200 · 18.1s · real Marathi answer · no error banner |
| TRANSLATE en→hi | 200 · 0.6s · natural Hindi |
| GLUT regression | "Already 1,92,700 kg of Tomato in Pune APMC today" |
| Placeholder fit @360px | fits (174/209px) |
| Language-switch re-translation | verified in browser (whole convo → Marathi) |
| Settings page | Trader demo card + corrected feature list (English & Marathi) |

## 6. 📦 Git state

- Commits on `main`: `f707c54` (Glut Engine + MSAMB sync) → `39dcd95` (AI resilience + history translation) → `237cb11` (real second provider + UI fixes). Working tree clean.
- Push to `main` auto-redeploys BOTH Render services.

## 7. 🔧 Environment (Render)

- Env: `GROQ_MODEL=groq/compound` (bogus — code filters it) · `GEMINI_MODEL=gemini-3.6-flash` · 7 LLM keys + 7 WHISPER keys (14 Groq keys) · `GEMINI_API_KEY` set (quota-exhausted → chat must run off Groq) · `GROQ_BUDGET_MS`/`GEMINI_TIMEOUT_MS` unset (defaults 12000/25000).
- Render API key + service IDs: `deploy/CLI-ACCESS.local.md` (gitignored — **never commit**). Services: `srv-dap0vo740ujc73b5vc60` (api), `srv-dap0vortqb8s73eueq10` (frontend).
- Secrets policy: never committed; `.env` files untracked.

## 8. 🛠️ Helper scripts (local, in `C:\Users\acube\AppData\Local\Temp\opencode\`)

`kb-ai-deploy2.cjs` (deploy poll + live verify) · `kb-test-ai.cjs` (local chat/translate) · `kb-groq-models.cjs` / `kb-groq-chat-probe.cjs` (Groq discovery) · `kb-probe-gemini-rest.cjs` · `kb-check-swetha.cjs` · `kb-seed.cjs` · `kb-sync-msamb.cjs` · `kb-test-glut.cjs` · `kb-glut-deploy-test.cjs`

## 9. 🎬 2-minute demo flow

1. Open app at **360px mobile width** → login `farmer@krishibandhu.com / Farmer123`.
2. **Glut Watch** (`/market?tab=glut`) → Tomato + Pune APMC → see today's arrival verdict.
3. Open floating **AI chat bubble** → ask *"What is the tomato price in Pune today?"* → real answer in ~1-2s.
4. Switch **EN → मराठी → हिंदी** (navbar top-right) → entire app + chat history re-translates instantly.
5. Bonus: `/settings` shows all three demo accounts (Farmer / Trader / Admin); `/admin` shows the control tower.

## 10. ⚠️ Gotchas learned

- Launcher bubble toggles on **pointer events** (drag logic) — `el.click()` won't open it; dispatch `pointerdown`+`pointerup`.
- React selects here have no `name` attr → find via `querySelectorAll('select')` + `options.length`.
- PowerShell: `&&` invalid; write `.cjs` scripts instead of `node -e` (mangles `\$`); `.env` is CRLF — always `.trim()`.
- Git via `C:\Program Files\Git\cmd\git.exe` (stderr "errors" are benign; pushes succeed).
- Live MSAMB data spans 2026-09-21 + 2026-09-22; Tomato in 6 markets today.
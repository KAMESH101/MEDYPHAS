# Medyphas AI – Demo guide (Dexathon 2026, Team Codofobia)

Prototype with demo data. Not medical advice. Use only the fictional files in [demo/](demo/).

## Before the demo (10 minutes ahead)

1. Open `https://<render-service>.onrender.com/api/health` – the free tier sleeps after 15 min idle and
   takes up to a minute to wake. Check `"model_loaded": true` and `"gemini_available": true`.
2. Open the Vercel site, log in once as `patient_demo` / `password123`.
3. **Warm the cache:** upload `demo/sample_lab_report_red.png` once with **தமிழ் (Tamil)** selected.
   Results are cached by file hash, so the live upload during the demo comes back instantly and doesn't
   spend free-tier quota.
4. Allow location access in the browser (for distances and the bystander location box).
5. Have the phone dialer muted – "Call 108" really opens the dialer; don't press call.

## 2-minute script

**0:00 – Hook (10 s)**
"When people get a lab report or prescription they often can't read it, and in an emergency bystanders
don't know where to go. Medyphas AI explains reports in their language and gets urgent cases to the right hospital."

**0:10 – Patient mode (60 s)**
1. Logged in as `patient_demo` → **Understand My Report**.
2. Language: **தமிழ் (Tamil)** → upload `sample_lab_report_red.png` → **Read & Explain**.
3. Point at the **Red · Urgent** badge and the alert line *Serum Potassium 6.9 – very high potassium*.
   "Urgency is decided by clinical safety rules and our XGBoost model – not by the AI. A dangerous lab value
   is always Red, and the model can never downgrade it."
4. Scroll to **What it says** – Tamil explanation → tap **Listen**.
5. Scroll back up to **Nearest suitable hospitals** – ranked by specialist match, free beds and distance;
   tap **Directions** (opens Google Maps) and show the **Call 108** button.
   (Optional, if time: upload `sample_prescription.png` – it only explains the three prescribed medicines,
   exactly as written; it never suggests new drugs or doses.)

**1:10 – Bystander mode (35 s)**
1. Log out → on the login page press the big red **Help someone in an emergency** (no login).
2. "You can help. You don't have to give your name."
3. Tap **Heavy bleeding** and **Head injury** → hospitals with **trauma care** move to the top.
4. Show the **location box** – coordinates in large type to read to the 108 operator – and the big **Call 108**.

**1:45 – Close (15 s)**
"Rules decide, AI only explains, keys stay on the server, and if Gemini is rate-limited we fall back to Groq
and then to built-in text, so it always answers. Demo data only – it's a prototype, not a doctor."

## Fallback plan
- Gemini quota exhausted → explanation shows "Basic explanation (AI busy)" – still Red, still hospitals.
- Backend asleep → the yellow "Waking up server…" banner; keep talking through the bystander page while it wakes.
- No internet for Maps → the hospital list still shows names, beds and Call 108.

---

## Checklist

### Phase 1 – Fix and stabilise
- [x] No Gemini calls or keys in the frontend; key only in backend `.env`; Config page is read-only status
- [x] `VITE_API_URL` (default `http://localhost:8000`) + frontend `.env.example`
- [x] One entry point `uvicorn app.main:app` (auth merged; `main_auth.py` removed); run.txt updated
- [x] Missing `HTTPException` fixed; broken SHAP `except` fixed
- [x] `shap` removed; XGBoost native contributions for top factors
- [x] All model/data/DB/.env paths relative to the code
- [x] passlib → `bcrypt` (no `__about__` error; 72-byte limit validated)
- [x] `google-genai` SDK, `GEMINI_MODEL` env var, structured JSON output with Pydantic schemas
- [x] Python 3.11 everywhere; one pinned `requirements.txt` with `xgboost-cpu`; other requirement files deleted
- [x] Training works from backend root; model saved with `save_model(...json)`; scaler/encoder as plain JSON; model committed
- [x] `Externalmodel-colab/` and `*.log` excluded from git and deploy
- [x] Rule engine normalises symptoms once; "weakness" alone no longer triggers stroke; tests added
- [x] Emergency buttons call 108 / 112
- [x] Silent mock login removed; "Waking up / offline" banner

### Phase 2 – Align with the pitch deck
- [x] Green / Yellow / Red everywhere; frontend never decides risk or diagnosis
- [x] Quick Fix: medicine recommendation and disease prediction removed (UI + API); now "Which Doctor?"
- [x] Disclaimer on every result screen
- [x] Patient mode: upload → Gemini extraction (medicines, lab values) → explanation in English/Tamil/Hindi
- [x] Lab danger rules; rules raise to Red; ML never downgrades Red; rules-only fallback if ML fails
- [x] Red → ranked hospitals → Google Maps directions + Call 108
- [x] Listen button: Gemini TTS via backend, browser speech fallback
- [x] Bystander mode `/#/emergency`, no login, chips, location, Call 108
- [x] `hospitals.json` (DEMO DATA), `/api/hospitals/rank`, staff bed update page + endpoint
- [x] `ai_provider.py`: Gemini → Groq → rule-based text; cache by file hash
- [x] Tests: rules, ML-never-downgrades-Red, hospital ranking, quick-fix has no medicines, AI fallback

### Phase 3 – Deploy
- [x] `render.yaml`, `.python-version`, `/api/health` with model + AI status, startup seeding
- [x] `vercel.json`, "Waking up server…" after 3 s, `CORS_ORIGINS` (+ optional preview regex)
- [x] README / run.txt rewritten; unbacked claims removed; fictional sample documents
- [x] Deploy rehearsal from a fresh clone (clean 3.11 install, tests, Render-style start, CORS, Vite build)
- [ ] Push to GitHub, create Render Blueprint and Vercel project (needs your accounts)
- [ ] Live test on the public URLs

### Not done / known limitations
- [ ] Live Gemini / Groq / Gemini-TTS calls are untested here (no API keys in this environment) – test after deploy
- [ ] Tamil / Hindi template text needs a native-speaker check
- [ ] Dashboard charts, Live Triage queue and appointments are still static sample data
- [ ] Upload and triage endpoints don't require login and have no rate limit (fine for a demo; add both before any wider use)
- [ ] Tailwind is loaded from its CDN (works, but logs a production warning)
- [ ] SQLite on Render is wiped on restart (by design for the free tier)

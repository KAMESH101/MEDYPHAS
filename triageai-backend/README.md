# TriageAI Backend (Medyphas AI)

FastAPI service for Medyphas AI. Prototype with demo data – not medical advice.
See the [main README](../README.md) for the overview, deploy steps and env vars.

## Run

```bash
python -m venv .venv && source .venv/bin/activate   # Python 3.11
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000          # single entry point
pytest                                             # test suite
```

## Endpoints

| Method & path | What it does |
|---|---|
| `GET /api/health` | Status: database, ML model loaded, Gemini/Groq available |
| `POST /auth/signup`, `POST /auth/login` | Accounts (bcrypt + JWT) |
| `POST /api/triage` | Vitals + symptoms → LOW/MEDIUM/HIGH, department, top factors, explanation |
| `POST /api/triage/upload` | Patient mode: PDF/PNG/JPG + `language` (en/ta/hi) → medicines, lab values, urgency, plain-language explanation |
| `GET /api/hospitals/rank?lat=&lng=&specialty=\|symptoms=` | Ranked DEMO hospitals with Google Maps directions |
| `GET /api/hospitals`, `PATCH /api/hospitals/{id}/beds` | List hospitals / staff bed updates (DOCTOR or ADMIN token) |
| `POST /api/specialist-helper` (`/api/quick-fix` alias) | Which kind of specialist to see – never a diagnosis or medicine |
| `GET /api/symptoms` | Symptom and history pick-lists |
| `POST /api/tts` | Read-aloud WAV (Gemini TTS); 503 when unavailable |
| `POST /api/assistant/chat` | Staff assistant (server-side Gemini, safety prompt) |
| `GET /api/patients`, `GET /api/stats` | Triage history and counts |

Interactive docs: `/docs`.

## Code map

```
app/services/rule_engine.py      clinical rules (symptoms normalised once) + rules-only baseline
app/services/lab_rules.py        dangerous lab values -> Red, out-of-range -> Yellow
app/services/triage_service.py   decide_risk(): max(rules, lab rules, ML) – ML never downgrades Red
app/services/ml_service.py       XGBoost JSON model + tree-contribution factors
app/services/ai_provider.py      Gemini -> Groq -> template text, cache by file hash
app/services/ehr_parser.py       Gemini structured extraction (schemas/report.py)
app/services/hospital_service.py hospital ranking (specialty 60 / beds 20 / distance 20)
app/services/specialist_helper.py symptom -> specialist lookup table
app/data/hospitals.json          DEMO hospitals (fictional)
```

## ML model

Trained on synthetic data – the reported accuracy only reflects that synthetic set.

```bash
python ml/generate_data.py && python ml/train_model.py
```

Writes `ml/models/xgb_model.json` (XGBoost native format) and `ml/models/model_meta.json`
(feature order, classes, scaler parameters). Both are committed so deploys never train.

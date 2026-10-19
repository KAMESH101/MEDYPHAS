# Medyphas AI – Frontend

React 19 + TypeScript + Vite. Prototype with demo data – not medical advice.
See the [main README](../README.md) for the full overview and deploy steps.

## Run

```bash
npm install
cp .env.example .env      # VITE_API_URL=http://localhost:8000
npm run dev               # http://localhost:3000
npm run build             # production build in dist/
npm run typecheck
```

`VITE_API_URL` is the only setting. No AI keys belong here – all AI calls go through the backend.

## Main screens (hash routes)

| Route | Screen | Login |
|---|---|---|
| `/#/emergency` | Bystander mode: Call 108, location for the operator, tap chips, ranked hospitals | No |
| `/#/report` | Patient mode: upload prescription / lab report, explanation in English/Tamil/Hindi, Listen, urgency, hospitals | Yes |
| `/#/triage` | Staff triage assessment with Green/Yellow/Red result | Yes |
| `/#/hospital-admin` | Staff: update free beds | Yes (staff) |
| `/#/quick-fix` | "Which Doctor?" specialist helper (no diagnosis, no medicine) | Yes |
| `/#/config` | System status (reads `/api/health`) | Yes |

## Useful pieces

- `services/api.ts` – all backend calls; shows the "Waking up server…" / "Server offline" banner, no mock data.
- `services/risk.ts` + `components/RiskBadge.tsx` – LOW/MEDIUM/HIGH → Green/Yellow/Red.
- `components/Disclaimer.tsx` – shown on every result screen.
- `components/HospitalList.tsx` – ranked hospitals with directions and Call 108.
- `services/emergency.ts` – 108 / 112.

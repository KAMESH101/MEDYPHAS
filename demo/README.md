# Sample documents (fictional)

Use ONLY these (or other made-up) documents when demoing. The free Gemini / Groq tiers
may use submitted data, so never upload a real patient's record.

| File | What it is | Expected urgency |
|---|---|---|
| `sample_lab_report_red.png` | Lab report, 58 M, serum potassium 6.9 mmol/L (critical) plus several mildly abnormal values | **Red**: lab danger rule `LAB_CRITICAL_POTASSIUM` -> hospitals + Call 108 |
| `sample_prescription.png` | Prescription, 61 M, BP 146/92, three medicines (Metformin, Amlodipine, Atorvastatin) with dose, timing and duration | Green or Yellow (risk model); explains only the three prescribed medicines |
| `sample_lab_report_green.png` | Lab report, 34 F, all values inside the printed ranges | **Green** |

All names, numbers, clinics and doctors are made up and every page is watermarked
"SAMPLE - NOT A REAL PATIENT".

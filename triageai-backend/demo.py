"""Quick command-line demo of the triage pipeline (rules + ML) without the web server.

Run from triageai-backend/:
    python demo.py
"""
from app.schemas.patient import PatientInput
from app.services.ml_service import ml_service
from app.services.rule_engine import evaluate_rules

SAMPLES = {
    "Young adult, mild headache": PatientInput(
        age=30, gender="F", symptoms=["headache"],
        bp_systolic=120, bp_diastolic=80, heart_rate=72, temperature=37.0, spo2=98,
    ),
    "Older adult, fever + diabetes": PatientInput(
        age=58, gender="M", symptoms=["fever", "cough"],
        bp_systolic=138, bp_diastolic=88, heart_rate=92, temperature=38.7, spo2=95,
        pre_existing=["diabetes"],
    ),
    "Low oxygen (rule)": PatientInput(
        age=45, gender="M", symptoms=["shortness of breath"], spo2=87,
    ),
}


def main():
    print("=" * 60)
    print("TriageAI demo (synthetic model, not medical advice)")
    print("=" * 60)
    ml_loaded = ml_service.load_models()

    for label, patient in SAMPLES.items():
        print(f"\n--- {label}")
        rule = evaluate_rules(patient)
        if rule.triggered:
            print(f"Rule {rule.rule_name} -> {rule.risk_level} ({rule.department})")
            continue
        if not ml_loaded:
            print("No rule triggered and ML model not loaded")
            continue
        risk, confidence, factors = ml_service.predict(patient)
        print(f"ML -> {risk} ({confidence:.0%})")
        for f in factors:
            print(f"   {f.feature}: {f.direction} risk ({f.contribution:.2f})")


if __name__ == "__main__":
    main()

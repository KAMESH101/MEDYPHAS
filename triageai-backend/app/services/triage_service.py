"""Main triage orchestration service."""
from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.patient import PatientInput, TriageOutput, RiskLevelEnum, TopFactor
from app.schemas.report import LabValue
from app.models.patient import Patient
from app.services.rule_engine import evaluate_rules, baseline_risk
from app.services.lab_rules import LabAlert, evaluate_lab_values
from app.services.ml_service import ml_service
from app.services.ai_provider import ai_provider

RISK_ORDER = {"LOW": 0, "MEDIUM": 1, "HIGH": 2}
TRAUMA_KEYWORDS = ("bleeding", "injury", "injured", "accident", "fracture", "burn", "can't move", "cannot move", "fall")


def assign_department(risk_level: str, symptoms: list, rule_name: str = None) -> str:
    """
    Assign appropriate department based on risk and symptoms.
    
    Args:
        risk_level: HIGH, MEDIUM, or LOW
        symptoms: List of patient symptoms
        rule_name: Unused, kept for backwards compatibility
        
    Returns:
        Department name
    """
    symptoms_lower = [s.lower() for s in symptoms]
    
    # High risk general emergency
    if risk_level == "HIGH":
        if any(k in s for s in symptoms_lower for k in TRAUMA_KEYWORDS):
            return "Trauma / Emergency"
        elif any("chest" in s or "heart" in s for s in symptoms_lower):
            return "Cardiology / Emergency"
        elif any("breath" in s for s in symptoms_lower):
            return "Respiratory / Emergency"
        elif any(k in s for s in symptoms_lower for k in ("head", "confusion", "seizure", "unconscious", "stroke", "speech")):
            return "Neurology / Emergency"
        else:
            return "Emergency"
    
    # Medium risk specialized departments
    elif risk_level == "MEDIUM":
        if any("abdominal" in s or "stomach" in s for s in symptoms_lower):
            return "Gastroenterology"
        elif any("cough" in s or "fever" in s for s in symptoms_lower):
            return "Internal Medicine"
        else:
            return "General Medicine"
    
    # Low risk outpatient
    else:
        return "Outpatient / General Practice"




class RiskDecision(BaseModel):
    """Final urgency decision and where it came from."""

    risk_level: str
    confidence: float
    department: str
    rule_triggered: Optional[str] = None
    top_factors: List[TopFactor] = []
    lab_alerts: List[LabAlert] = []
    model_risk_level: Optional[str] = None  # what ML (or the rules-only baseline) said on its own


def decide_risk(patient_input: PatientInput, lab_values: Optional[List[LabValue]] = None) -> RiskDecision:
    """
    Combine clinical rules, lab danger rules and the ML model into one urgency level.

    Safety contract:
    - Any clinical rule or critical lab value makes the result HIGH (Red).
    - Out-of-range lab values make it at least MEDIUM (Yellow).
    - The ML model can only RAISE urgency: the final level is the maximum of all sources,
      so ML can never downgrade a rule-based Red.
    - If the ML model is missing or fails, a rules-only baseline is used instead.
    """
    rule_result = evaluate_rules(patient_input)
    lab_alerts = evaluate_lab_values(lab_values or [])

    # ML runs even when a rule fired, so its factors can still be shown.
    model_risk, model_confidence, top_factors = None, 0.5, []
    if ml_service.is_loaded():
        try:
            model_risk, model_confidence, top_factors = ml_service.predict(patient_input)
        except Exception as e:
            print(f"⚠️ ML prediction failed, using rules-only baseline: {e}")
    if model_risk is None:
        model_risk = baseline_risk(patient_input)

    critical_lab = next((a for a in lab_alerts if a.level == "HIGH"), None)

    if rule_result.triggered:
        return RiskDecision(
            risk_level="HIGH", confidence=1.0, department=rule_result.department,
            rule_triggered=rule_result.rule_name, top_factors=top_factors,
            lab_alerts=lab_alerts, model_risk_level=model_risk,
        )

    if critical_lab:
        return RiskDecision(
            risk_level="HIGH", confidence=1.0, department=critical_lab.department,
            rule_triggered=critical_lab.rule_name, top_factors=top_factors,
            lab_alerts=lab_alerts, model_risk_level=model_risk,
        )

    risk_level, confidence, rule_name = model_risk, model_confidence, None
    if lab_alerts and RISK_ORDER["MEDIUM"] > RISK_ORDER[risk_level]:
        risk_level, confidence, rule_name = "MEDIUM", 1.0, lab_alerts[0].rule_name

    return RiskDecision(
        risk_level=risk_level, confidence=confidence,
        department=assign_department(risk_level, patient_input.symptoms),
        rule_triggered=rule_name, top_factors=top_factors,
        lab_alerts=lab_alerts, model_risk_level=model_risk,
    )


async def run_full_triage(
    patient_input: PatientInput,
    db: AsyncSession,
    lab_values: Optional[List[LabValue]] = None,
) -> TriageOutput:
    """
    Execute complete triage pipeline.
    
    Pipeline:
    1. Urgency decision: clinical rules + lab danger rules + ML (see decide_risk)
    2. Explanation generation (Gemini -> Groq -> fallback text)
    3. Database persistence
    """
    decision = decide_risk(patient_input, lab_values)

    explanation, _source = await ai_provider.explain_triage(
        patient=patient_input,
        risk_level=decision.risk_level,
        department=decision.department,
        top_factors=decision.top_factors,
        rule_triggered=decision.rule_triggered
    )
    
    patient_record = Patient(
        age=patient_input.age,
        gender=patient_input.gender.value,
        bp_systolic=patient_input.bp_systolic,
        bp_diastolic=patient_input.bp_diastolic,
        heart_rate=patient_input.heart_rate,
        temperature=patient_input.temperature,
        spo2=patient_input.spo2,
        symptoms=patient_input.symptoms,
        pre_existing=patient_input.pre_existing,
        risk_level=decision.risk_level,
        confidence=decision.confidence,
        department=decision.department,
        rule_triggered=decision.rule_triggered,
        shap_factors=[factor.model_dump() for factor in decision.top_factors] or None,
        explanation=explanation
    )
    
    db.add(patient_record)
    await db.commit()
    await db.refresh(patient_record)
    
    return TriageOutput(
        patient_id=patient_record.id,
        risk_level=RiskLevelEnum(decision.risk_level),
        confidence=decision.confidence,
        department=decision.department,
        rule_triggered=decision.rule_triggered,
        top_factors=decision.top_factors,
        lab_alerts=[a.model_dump() for a in decision.lab_alerts],
        explanation=explanation,
        triage_timestamp=patient_record.created_at or datetime.now(timezone.utc)
    )

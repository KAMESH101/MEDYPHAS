"""Clinical decision rule engine."""
from typing import Optional
from pydantic import BaseModel
from app.schemas.patient import PatientInput


class RuleResult(BaseModel):
    """Result from rule engine evaluation."""
    
    triggered: bool
    risk_level: Optional[str] = None
    rule_name: Optional[str] = None
    department: Optional[str] = None


def evaluate_rules(patient: PatientInput) -> RuleResult:
    """
    Evaluate clinical decision rules for immediate triage.
    
    Rules are checked in priority order. First matching rule wins.
    These rules override ML predictions for critical cases.
    
    Args:
        patient: Patient input data
        
    Returns:
        RuleResult indicating if rule triggered and triage decision
    """
    symptoms_lower = [s.lower() for s in patient.symptoms]
    conditions_lower = [c.lower() for c in patient.pre_existing]
    
    # RULE 1: SpO2 Critical (<90%)
    if patient.spo2 and patient.spo2 < 90:
        return RuleResult(
            triggered=True,
            risk_level="HIGH",
            rule_name="SPO2_CRITICAL",
            department="Emergency / Respiratory"
        )
    
    # RULE 2: Blood Pressure Critical (>180/110)
    if patient.bp_systolic and patient.bp_diastolic:
        if patient.bp_systolic > 180 or patient.bp_diastolic > 110:
            return RuleResult(
                triggered=True,
                risk_level="HIGH",
                rule_name="BP_CRITICAL",
                department="Cardiology / Emergency"
            )
    
    # RULE 3: Heart Rate Extremes (<50 or >120)
    if patient.heart_rate:
        if patient.heart_rate < 50 or patient.heart_rate > 120:
            return RuleResult(
                triggered=True,
                risk_level="HIGH",
                rule_name="HR_EXTREME",
                department="Cardiology"
            )
    
    # RULE 4: High Fever (>39.5°C) + Elderly (>65)
    if patient.temperature and patient.temperature > 39.5 and patient.age > 65:
        return RuleResult(
            triggered=True,
            risk_level="HIGH",
            rule_name="FEVER_ELDERLY",
            department="Internal Medicine"
        )
    
    # RULE 5: Chest Pain (any age with cardiac history)
    if any("chest" in s and "pain" in s for s in symptoms_lower):
        if any(c in conditions_lower for c in ["heart_disease", "hypertension"]):
            return RuleResult(
                triggered=True,
                risk_level="HIGH",
                rule_name="CHEST_PAIN_CARDIAC_HX",
                department="Cardiology / Emergency"
            )
    
    # RULE 6: Chest Pain + Age >50
    if any("chest" in s and "pain" in s for s in symptoms_lower):
        if patient.age > 50:
            return RuleResult(
                triggered=True,
                risk_level="HIGH",
                rule_name="CHEST_PAIN_ELDERLY",
                department="Cardiology / Emergency"
            )
    
    # RULE 7: Stroke Symptoms (confusion, slurred speech, numbness)
    stroke_symptoms = ["confusion", "slurred_speech", "numbness", "vision_changes", "weakness"]
    if any(symptom.replace(" ", "_") in symptoms_lower for symptom in stroke_symptoms):
        return RuleResult(
            triggered=True,
            risk_level="HIGH",
            rule_name="STROKE_SYMPTOMS",
            department="Neurology / Emergency"
        )
    
    # RULE 8: Seizure
    if any("seizure" in s for s in symptoms_lower):
        return RuleResult(
            triggered=True,
            risk_level="HIGH",
            rule_name="SEIZURE",
            department="Neurology / Emergency"
        )
    
    # RULE 9: Severe Shortness of Breath + Low SpO2
    if any("shortness" in s and "breath" in s for s in symptoms_lower):
        if patient.spo2 and patient.spo2 < 94:
            return RuleResult(
                triggered=True,
                risk_level="HIGH",
                rule_name="SOB_LOW_SPO2",
                department="Emergency / Respiratory"
            )
    
    # RULE 10: Multiple Severe Symptoms (3+)
    severe_symptoms = [
        "chest_pain", "shortness_of_breath", "confusion", "seizure",
        "severe_abdominal_pain", "vomiting_blood", "severe_headache"
    ]
    severe_count = sum(1 for s in symptoms_lower 
                      if any(sev in s.replace(" ", "_") for sev in severe_symptoms))
    if severe_count >= 3:
        return RuleResult(
            triggered=True,
            risk_level="HIGH",
            rule_name="MULTIPLE_SEVERE",
            department="Emergency"
        )
    
    # RULE 11: Very High Fever (>40°C)
    if patient.temperature and patient.temperature > 40.0:
        return RuleResult(
            triggered=True,
            risk_level="HIGH",
            rule_name="FEVER_EXTREME",
            department="Infectious Disease / Emergency"
        )
    
    # No rules triggered
    return RuleResult(triggered=False)

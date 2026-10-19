"""Clinical decision rule engine."""
import re
from typing import List, Optional
from pydantic import BaseModel
from app.schemas.patient import PatientInput


class RuleResult(BaseModel):
    """Result from rule engine evaluation."""

    triggered: bool
    risk_level: Optional[str] = None
    rule_name: Optional[str] = None
    department: Optional[str] = None


def normalize_term(term: str) -> str:
    """'Slurred Speech', 'slurred-speech' and 'slurred_speech' all become 'slurred_speech'."""
    return re.sub(r"[\s\-]+", "_", term.strip().lower()).strip("_")


def _has(symptoms: List[str], *keywords: str) -> bool:
    """True if any normalised symptom contains any of the (normalised) keywords."""
    return any(k in s for s in symptoms for k in keywords)


# Stroke (BE-FAST): speech or face signs, or confusion, are enough on their own.
STROKE_STRONG_SIGNS = (
    "slurred_speech", "difficulty_speaking", "speech_difficulty", "aphasia",
    "facial_droop", "face_droop", "drooping_face", "confusion",
)
# Common, non-specific symptoms: only count when one-sided or when two appear together.
STROKE_SUPPORTING_SIGNS = ("weakness", "numbness", "vision_changes", "vision_loss", "blurred_vision")
ONE_SIDED_MARKERS = ("one_sided", "one_side", "left_side", "right_side", "unilateral", "half_body")


def _stroke_signs(symptoms: List[str]) -> bool:
    if _has(symptoms, *STROKE_STRONG_SIGNS):
        return True
    supporting = [s for s in symptoms if _has([s], *STROKE_SUPPORTING_SIGNS)]
    if any(_has([s], *ONE_SIDED_MARKERS) for s in supporting):
        return True
    distinct = {k for k in STROKE_SUPPORTING_SIGNS if _has(supporting, k)}
    return len(distinct) >= 2


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
    # Normalise once: lowercase, spaces/hyphens -> underscores
    symptoms = [normalize_term(s) for s in patient.symptoms]
    conditions = [normalize_term(c) for c in patient.pre_existing]
    has_chest_pain = _has(symptoms, "chest_pain")

    # RULE 1: SpO2 Critical (<90%)
    if patient.spo2 and patient.spo2 < 90:
        return RuleResult(
            triggered=True,
            risk_level="HIGH",
            rule_name="SPO2_CRITICAL",
            department="Emergency / Respiratory"
        )

    # RULE 2: Blood Pressure Critical (>180/110); either value alone is enough
    if (patient.bp_systolic and patient.bp_systolic > 180) or (patient.bp_diastolic and patient.bp_diastolic > 110):
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
    if has_chest_pain and any(c in conditions for c in ["heart_disease", "hypertension"]):
        return RuleResult(
            triggered=True,
            risk_level="HIGH",
            rule_name="CHEST_PAIN_CARDIAC_HX",
            department="Cardiology / Emergency"
        )

    # RULE 6: Chest Pain + Age >50
    if has_chest_pain and patient.age > 50:
        return RuleResult(
            triggered=True,
            risk_level="HIGH",
            rule_name="CHEST_PAIN_ELDERLY",
            department="Cardiology / Emergency"
        )

    # RULE 7: Stroke Symptoms. Speech/face signs or confusion trigger alone; weakness,
    # numbness or vision changes only if one-sided or combined (weakness alone does not).
    if _stroke_signs(symptoms):
        return RuleResult(
            triggered=True,
            risk_level="HIGH",
            rule_name="STROKE_SYMPTOMS",
            department="Neurology / Emergency"
        )

    # RULE 8: Seizure
    if _has(symptoms, "seizure", "convulsion", "fits"):
        return RuleResult(
            triggered=True,
            risk_level="HIGH",
            rule_name="SEIZURE",
            department="Neurology / Emergency"
        )

    # RULE 9: Severe Shortness of Breath + Low SpO2
    if _has(symptoms, "shortness_of_breath", "breathlessness", "difficulty_breathing"):
        if patient.spo2 and patient.spo2 < 94:
            return RuleResult(
                triggered=True,
                risk_level="HIGH",
                rule_name="SOB_LOW_SPO2",
                department="Emergency / Respiratory"
            )

    # RULE 10: Multiple Severe Symptoms (3+)
    severe_symptoms = (
        "chest_pain", "shortness_of_breath", "confusion", "seizure",
        "severe_abdominal_pain", "vomiting_blood", "severe_headache"
    )
    severe_count = sum(1 for s in symptoms if _has([s], *severe_symptoms))
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


def baseline_risk(patient: PatientInput) -> str:
    """
    Rules-only risk estimate used when no critical rule fired and the ML model is
    unavailable. Mirrors the scoring used to label the synthetic training data, so it
    errs on the side of caution (score >= 4 is HIGH).
    """
    score = 0
    if patient.age > 65:
        score += 2
    elif patient.age > 50:
        score += 1
    if (patient.bp_systolic or 0) > 140 or (patient.bp_diastolic or 0) > 90:
        score += 1
    if patient.spo2 is not None and patient.spo2 < 94:
        score += 1
    if (patient.temperature or 0) > 38.5:
        score += 1
    if patient.heart_rate is not None and patient.heart_rate > 100:
        score += 1
    conditions = {normalize_term(c) for c in patient.pre_existing}
    if "heart_disease" in conditions:
        score += 2
    if "diabetes" in conditions:
        score += 1
    if len(patient.symptoms) >= 3:
        score += 1
    if score >= 4:
        return "HIGH"
    return "MEDIUM" if score >= 2 else "LOW"

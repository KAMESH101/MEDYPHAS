"""Main triage orchestration service."""
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.patient import PatientInput, TriageOutput, RiskLevelEnum
from app.models.patient import Patient
from app.services.rule_engine import evaluate_rules
from app.services.ml_service import ml_service
from app.services.gemini_service import gemini_service


def assign_department(risk_level: str, symptoms: list, rule_name: str = None) -> str:
    """
    Assign appropriate department based on risk and symptoms.
    
    Args:
        risk_level: HIGH, MEDIUM, or LOW
        symptoms: List of patient symptoms
        rule_name: Clinical rule name if triggered
        
    Returns:
        Department name
    """
    # If rule already assigned department, use it
    if rule_name:
        # Rule engine already provides department in most cases
        return "Emergency"  # Fallback
    
    symptoms_lower = [s.lower() for s in symptoms]
    
    # High risk general emergency
    if risk_level == "HIGH":
        if any("chest" in s or "heart" in s for s in symptoms_lower):
            return "Cardiology / Emergency"
        elif any("breath" in s for s in symptoms_lower):
            return "Respiratory / Emergency"
        elif any("head" in s or "confusion" in s for s in symptoms_lower):
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


async def run_full_triage(
    patient_input: PatientInput,
    db: AsyncSession
) -> TriageOutput:
    """
    Execute complete triage pipeline.
    
    Pipeline:
    1. Rule engine evaluation (immediate escalation if triggered)
    2. ML model prediction with SHAP (if no rule triggered)
    3. Department assignment
    4. Gemini explanation generation
    5. Database persistence
    
    Args:
        patient_input: Validated patient data
        db: Database session
        
    Returns:
        Complete triage output
    """
    # Step 1: Check clinical rules
    rule_result = evaluate_rules(patient_input)
    
    if rule_result.triggered:
        # Rule overrides ML prediction
        risk_level = rule_result.risk_level
        confidence = 1.0  # Rules have 100% confidence
        department = rule_result.department
        rule_name = rule_result.rule_name
        top_factors = []  # Rules don't use SHAP
    else:
        # Step 2: ML prediction with SHAP
        risk_level, confidence, top_factors = ml_service.predict_with_shap(patient_input)
        rule_name = None
        
        # Step 3: Assign department
        department = assign_department(risk_level, patient_input.symptoms)
    
    # Step 4: Generate explanation
    explanation = await gemini_service.generate_explanation(
        patient=patient_input,
        risk_level=risk_level,
        department=department,
        top_factors=top_factors,
        rule_triggered=rule_name
    )
    
    # Step 5: Save to database
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
        risk_level=risk_level,
        confidence=confidence,
        department=department,
        rule_triggered=rule_name,
        shap_factors=[factor.dict() for factor in top_factors] if top_factors else None,
        explanation=explanation
    )
    
    db.add(patient_record)
    await db.commit()
    await db.refresh(patient_record)
    
    # Build output
    return TriageOutput(
        patient_id=patient_record.id,
        risk_level=RiskLevelEnum(risk_level),
        confidence=confidence,
        department=department,
        rule_triggered=rule_name,
        top_factors=top_factors,
        explanation=explanation,
        triage_timestamp=patient_record.created_at or datetime.utcnow()
    )

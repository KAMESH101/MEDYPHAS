"""Rule engine unit tests (from PRD Section 14.1)."""
import pytest
from app.services.rule_engine import evaluate_rules
from app.schemas.patient import PatientInput, GenderEnum


def make_patient(**kwargs):
    """Helper to create patient with defaults."""
    defaults = dict(
        age=45,
        gender=GenderEnum.MALE,
        symptoms=['headache'],
        pre_existing=[],
        bp_systolic=120,
        bp_diastolic=80,
        heart_rate=75,
        temperature=37.0,
        spo2=98.0
    )
    return PatientInput(**{**defaults, **kwargs})


def test_spo2_critical():
    """Test SpO2 < 90% triggers HIGH risk."""
    p = make_patient(spo2=88.0)
    result = evaluate_rules(p)
    
    assert result.triggered
    assert result.risk_level == 'HIGH'
    assert result.rule_name == 'SPO2_CRITICAL'
    assert 'Emergency' in result.department or 'Respiratory' in result.department


def test_bp_critical():
    """Test BP > 180/110 triggers HIGH risk."""
    p = make_patient(bp_systolic=190, bp_diastolic=115)
    result = evaluate_rules(p)
    
    assert result.triggered
    assert result.risk_level == 'HIGH'
    assert result.rule_name == 'BP_CRITICAL'


def test_normal_patient_no_rule():
    """Test normal vitals don't trigger any rules."""
    p = make_patient(
        bp_systolic=120,
        heart_rate=72,
        temperature=37.0,
        spo2=98.0
    )
    result = evaluate_rules(p)
    
    assert not result.triggered


def test_chest_pain_elderly():
    """Test chest pain in elderly triggers HIGH risk."""
    p = make_patient(age=65, symptoms=['chest pain'], spo2=97.0)
    result = evaluate_rules(p)
    
    assert result.triggered
    assert result.risk_level == 'HIGH'
    assert 'CHEST_PAIN' in result.rule_name


def test_fever_extreme():
    """Test very high fever triggers HIGH risk."""
    p = make_patient(temperature=40.5)
    result = evaluate_rules(p)
    
    assert result.triggered
    assert result.risk_level == 'HIGH'
    assert result.rule_name == 'FEVER_EXTREME'


def test_heart_rate_extreme_high():
    """Test heart rate > 120 triggers HIGH risk."""
    p = make_patient(heart_rate=135)
    result = evaluate_rules(p)
    
    assert result.triggered
    assert result.risk_level == 'HIGH'
    assert result.rule_name == 'HR_EXTREME'


def test_heart_rate_extreme_low():
    """Test heart rate < 50 triggers HIGH risk."""
    p = make_patient(heart_rate=45)
    result = evaluate_rules(p)
    
    assert result.triggered
    assert result.risk_level == 'HIGH'
    assert result.rule_name == 'HR_EXTREME'


def test_stroke_symptoms():
    """Test stroke symptoms trigger HIGH risk."""
    p = make_patient(symptoms=['confusion', 'weakness'])
    result = evaluate_rules(p)
    
    assert result.triggered
    assert result.risk_level == 'HIGH'
    assert result.rule_name == 'STROKE_SYMPTOMS'

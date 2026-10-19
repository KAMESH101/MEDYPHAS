"""Rule engine unit tests (from PRD Section 14.1)."""
import pytest
from app.services.rule_engine import evaluate_rules, baseline_risk
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


# --- Symptom normalisation -------------------------------------------------

@pytest.mark.parametrize("symptom", ["slurred speech", "slurred_speech", "Slurred Speech", "slurred-speech"])
def test_slurred_speech_spellings_all_match(symptom):
    """Spaces, underscores, hyphens and case are normalised before matching."""
    result = evaluate_rules(make_patient(symptoms=[symptom]))

    assert result.triggered
    assert result.rule_name == 'STROKE_SYMPTOMS'


@pytest.mark.parametrize("symptom", ["chest pain", "chest_pain", "Severe Chest-Pain"])
def test_chest_pain_spellings_all_match(symptom):
    result = evaluate_rules(make_patient(age=60, symptoms=[symptom]))

    assert result.triggered
    assert result.rule_name == 'CHEST_PAIN_ELDERLY'


def test_condition_spellings_match():
    """'Heart Disease' in the history triggers the cardiac chest pain rule."""
    result = evaluate_rules(make_patient(age=30, symptoms=['chest pain'], pre_existing=['Heart Disease']))

    assert result.rule_name == 'CHEST_PAIN_CARDIAC_HX'


# --- Rule 7: stroke --------------------------------------------------------

@pytest.mark.parametrize("symptoms", [['weakness'], ['numbness'], ['vision changes'], ['weakness', 'headache']])
def test_single_nonspecific_symptom_does_not_trigger_stroke(symptoms):
    """Weakness (or numbness / vision changes) alone is common and must not trigger the stroke rule."""
    result = evaluate_rules(make_patient(symptoms=symptoms))

    assert result.rule_name != 'STROKE_SYMPTOMS'
    assert not result.triggered


@pytest.mark.parametrize("symptoms", [
    ['weakness', 'numbness'],
    ['one-sided weakness'],
    ['numbness left side'],
    ['facial droop'],
    ['vision changes', 'weakness'],
])
def test_stroke_patterns_trigger(symptoms):
    result = evaluate_rules(make_patient(symptoms=symptoms))

    assert result.triggered
    assert result.rule_name == 'STROKE_SYMPTOMS'
    assert 'Neurology' in result.department


# --- Other rules -----------------------------------------------------------

def test_seizure():
    result = evaluate_rules(make_patient(symptoms=['seizure']))

    assert result.rule_name == 'SEIZURE'


def test_shortness_of_breath_low_spo2():
    result = evaluate_rules(make_patient(symptoms=['shortness of breath'], spo2=92.0))

    assert result.rule_name == 'SOB_LOW_SPO2'


def test_shortness_of_breath_normal_spo2_no_rule():
    result = evaluate_rules(make_patient(symptoms=['shortness of breath'], spo2=97.0))

    assert not result.triggered


def test_fever_elderly():
    result = evaluate_rules(make_patient(age=70, temperature=39.8))

    assert result.rule_name == 'FEVER_ELDERLY'


def test_systolic_alone_is_enough_for_bp_rule():
    """A single critical BP value triggers even if the other one is missing."""
    p = make_patient(bp_systolic=195, bp_diastolic=None)

    assert evaluate_rules(p).rule_name == 'BP_CRITICAL'


def test_rule_priority_spo2_before_bp():
    p = make_patient(spo2=85.0, bp_systolic=200)

    assert evaluate_rules(p).rule_name == 'SPO2_CRITICAL'


# --- Rules-only baseline (used when the ML model is unavailable) ------------

def test_baseline_low_for_healthy_adult():
    assert baseline_risk(make_patient(age=30)) == 'LOW'


def test_baseline_medium_for_older_patient_with_fever():
    assert baseline_risk(make_patient(age=60, temperature=38.8)) == 'MEDIUM'


def test_baseline_high_for_many_risk_factors():
    p = make_patient(age=70, pre_existing=['heart disease'], temperature=38.8)

    assert baseline_risk(p) == 'HIGH'

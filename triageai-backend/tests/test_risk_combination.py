"""Combining rules, lab rules and ML: ML can never downgrade a rule-based Red."""
import pytest

from app.schemas.patient import PatientInput, TopFactor
from app.schemas.report import LabValue
from app.services import triage_service
from app.services.ml_service import ml_service


def patient(**kwargs):
    defaults = dict(age=30, gender="F", symptoms=["headache"], bp_systolic=120, bp_diastolic=80,
                    heart_rate=72, temperature=37.0, spo2=98.0)
    return PatientInput(**{**defaults, **kwargs})


@pytest.fixture
def ml_says_low(monkeypatch):
    """Force the ML model to answer LOW with high confidence."""
    monkeypatch.setattr(ml_service, "predict",
                        lambda p: ("LOW", 0.99, [TopFactor(feature="Age", contribution=1.0, direction="decreases")]))


@pytest.mark.parametrize("kwargs", [
    dict(spo2=85.0),
    dict(symptoms=["slurred speech"]),
    dict(age=60, symptoms=["chest pain"]),
    dict(heart_rate=140),
])
def test_ml_never_downgrades_rule_red(ml_says_low, kwargs):
    decision = triage_service.decide_risk(patient(**kwargs))

    assert decision.model_risk_level == "LOW"
    assert decision.risk_level == "HIGH"
    assert decision.rule_triggered


def test_ml_never_downgrades_critical_lab_red(ml_says_low):
    decision = triage_service.decide_risk(patient(), [LabValue(name="Potassium", value=7.2, unit="mmol/L")])

    assert decision.risk_level == "HIGH"
    assert decision.rule_triggered == "LAB_CRITICAL_POTASSIUM"


def test_out_of_range_lab_raises_low_to_yellow(ml_says_low):
    decision = triage_service.decide_risk(
        patient(), [LabValue(name="Cholesterol", value=250, unit="mg/dL", reference_range="<200")])

    assert decision.risk_level == "MEDIUM"


def test_ml_can_raise_when_no_rule(monkeypatch):
    monkeypatch.setattr(ml_service, "predict", lambda p: ("HIGH", 0.8, []))

    assert triage_service.decide_risk(patient()).risk_level == "HIGH"


def test_ml_failure_falls_back_to_rules(monkeypatch):
    def boom(p):
        raise RuntimeError("model broke")
    monkeypatch.setattr(ml_service, "predict", boom)

    decision = triage_service.decide_risk(patient())
    assert decision.risk_level == "LOW"
    assert decision.top_factors == []


def test_rule_red_still_shows_ml_factors():
    decision = triage_service.decide_risk(patient(spo2=85.0))

    assert decision.risk_level == "HIGH"
    assert decision.top_factors  # real model is loaded in conftest


@pytest.mark.parametrize("symptoms,expected", [
    (["heavy bleeding"], "Trauma / Emergency"),
    (["head injury"], "Trauma / Emergency"),
    (["chest pain"], "Cardiology / Emergency"),
    (["breathing trouble"], "Respiratory / Emergency"),
    (["seizure"], "Neurology / Emergency"),
])
def test_assign_department_for_emergencies(symptoms, expected):
    assert triage_service.assign_department("HIGH", symptoms) == expected

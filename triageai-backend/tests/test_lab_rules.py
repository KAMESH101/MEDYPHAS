"""Lab danger rules: can only raise urgency."""
import pytest

from app.schemas.report import LabValue
from app.services.lab_rules import evaluate_lab_values, parse_reference_range


def lab(name, value, unit=None, ref=None):
    return LabValue(name=name, value=value, unit=unit, reference_range=ref)


@pytest.mark.parametrize("value", [
    lab("Serum Potassium", 7.1, "mmol/L"),
    lab("K+", 2.1, "mEq/L"),
    lab("Sodium", 115, "mmol/L"),
    lab("Random Blood Sugar", 520, "mg/dL"),
    lab("Blood Glucose", 2.4, "mmol/L"),
    lab("Hemoglobin", 6.2, "g/dL"),
    lab("Platelet Count", 15000, "/µL"),
    lab("Platelets", 0.15, "lakh/cumm"),
    lab("Troponin I", 0.8, "ng/mL", "< 0.04"),
    lab("INR", 6.3),
])
def test_critical_values_are_red(value):
    alerts = evaluate_lab_values([value])

    assert alerts and alerts[0].level == "HIGH"
    assert alerts[0].rule_name.startswith("LAB_CRITICAL_")


@pytest.mark.parametrize("value", [
    lab("Serum Potassium", 4.2, "mmol/L", "3.5-5.0"),
    lab("Hemoglobin", 13.5, "g/dL", "12-16"),
    lab("Platelet Count", 250000, "/µL"),
    lab("Fasting Blood Sugar", 92, "mg/dL", "70 - 100"),
    lab("Troponin I", 0.01, "ng/mL", "< 0.04"),
])
def test_normal_values_raise_nothing(value):
    assert evaluate_lab_values([value]) == []


@pytest.mark.parametrize("value", [
    lab("Vitamin K", 0.5, "ng/mL"),     # not potassium
    lab("Hb A1c", 6.5, "%"),            # not haemoglobin
    lab("HbA1c", 5.9, "%"),
])
def test_lookalike_names_do_not_trigger_critical_rules(value):
    assert all(a.level != "HIGH" for a in evaluate_lab_values([value]))


def test_out_of_reference_range_is_yellow():
    alerts = evaluate_lab_values([lab("Total Cholesterol", 260, "mg/dL", "< 200")])

    assert alerts[0].level == "MEDIUM"
    assert alerts[0].rule_name == "LAB_OUT_OF_RANGE"


def test_missing_values_are_ignored():
    assert evaluate_lab_values([lab("Urine culture", None, None, None)]) == []


@pytest.mark.parametrize("text,expected", [
    ("3.5 - 5.0", (3.5, 5.0)),
    ("12 to 16", (12, 16)),
    ("< 200", (None, 200)),
    ("> 60", (60, None)),
    ("1,50,000 - 4,50,000", (150000, 450000)),
    ("see note", (None, None)),
    (None, (None, None)),
])
def test_parse_reference_range(text, expected):
    assert parse_reference_range(text) == expected

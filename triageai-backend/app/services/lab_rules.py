"""Simple safety rules for clearly dangerous lab values.

These rules can only RAISE urgency (to MEDIUM for "outside the report's reference range",
to HIGH for critical values). They never lower anything. Thresholds are conservative
textbook "critical value" limits for adults and are for a prototype demo only.
"""
import re
from typing import Callable, List, Optional, Tuple

from pydantic import BaseModel

from app.schemas.report import LabValue


class LabAlert(BaseModel):
    """One lab value that raised the urgency."""

    test: str
    value: Optional[float]
    unit: Optional[str]
    level: str          # "HIGH" or "MEDIUM"
    rule_name: str
    message: str
    department: str


def _norm(text: Optional[str]) -> str:
    return re.sub(r"[^a-z0-9/µ.]+", " ", (text or "").lower()).strip()


# Names that contain a critical-test word but are different tests (e.g. "Vitamin K", "Hb A1c").
EXCLUDED_WORDS = ("a1c", "hba1c", "urine", "vitamin", "glycated", "glycosylated")
SHORT_ALIAS_SUFFIXES = ("", " count", " level", " total", " serum")


def _matches(name: str, aliases: Tuple[str, ...]) -> bool:
    normalized = _norm(name)
    if any(w in normalized for w in EXCLUDED_WORDS):
        return False
    words = f" {normalized} "
    for alias in aliases:
        if len(alias) <= 3:
            # Short aliases (K, Na, Hb, INR...) must be the whole test name
            if any(normalized == alias + suffix for suffix in SHORT_ALIAS_SUFFIXES):
                return True
        elif f" {alias} " in words:
            return True
    return False


# Each check gets (value, normalised unit) and returns a reason string if critical, else None.
Check = Callable[[float, str], Optional[str]]


def _potassium(v: float, unit: str) -> Optional[str]:
    if v < 2.5:
        return "very low potassium"
    if v > 6.5:
        return "very high potassium"
    return None


def _sodium(v: float, unit: str) -> Optional[str]:
    if v < 120:
        return "very low sodium"
    if v > 160:
        return "very high sodium"
    return None


def _glucose(v: float, unit: str) -> Optional[str]:
    mmol = "mmol" in unit or v < 35  # mg/dL values below 35 are rare; treat small numbers as mmol/L
    low, high = (3.0, 22.2) if mmol else (54, 400)
    if v < low:
        return "very low blood sugar"
    if v > high:
        return "very high blood sugar"
    return None


def _hemoglobin(v: float, unit: str) -> Optional[str]:
    limit = 70 if ("g/l" in unit and "dl" not in unit) or v > 25 else 7
    return "very low haemoglobin" if v < limit else None


def _platelets(v: float, unit: str) -> Optional[str]:
    if "lakh" in unit:
        limit = 0.2
    elif v >= 2000:  # reported as cells/µL
        limit = 20_000
    else:            # x10^3/µL or x10^9/L
        limit = 20
    return "very low platelets" if v < limit else None


def _wbc(v: float, unit: str) -> Optional[str]:
    thousands = v / 1000 if v >= 500 else v  # cells/µL -> x10^3/µL
    if thousands < 1.0:
        return "very low white cell count"
    if thousands > 30:
        return "very high white cell count"
    return None


def _creatinine(v: float, unit: str) -> Optional[str]:
    limit = 440 if ("mol" in unit or v > 30) else 5.0
    return "very high creatinine (kidney function)" if v >= limit else None


def _inr(v: float, unit: str) -> Optional[str]:
    return "very high INR (bleeding risk)" if v > 5.0 else None


def _calcium(v: float, unit: str) -> Optional[str]:
    mmol = "mmol" in unit or v < 4
    low, high = (1.5, 3.25) if mmol else (6.0, 13.0)
    if v < low:
        return "very low calcium"
    if v > high:
        return "very high calcium"
    return None


CRITICAL_RULES: List[Tuple[str, Tuple[str, ...], Check, str]] = [
    ("POTASSIUM", ("potassium", "k", "k+", "serum potassium"), _potassium, "Emergency / Internal Medicine"),
    ("SODIUM", ("sodium", "na", "na+", "serum sodium"), _sodium, "Emergency / Internal Medicine"),
    ("GLUCOSE", ("glucose", "blood sugar", "sugar", "fbs", "rbs", "ppbs", "fasting blood sugar",
                 "random blood sugar", "blood glucose"), _glucose, "Emergency / Endocrinology"),
    ("HEMOGLOBIN", ("hemoglobin", "haemoglobin", "hb", "hgb"), _hemoglobin, "Emergency / Internal Medicine"),
    ("PLATELETS", ("platelet", "platelets", "platelet count", "plt"), _platelets, "Emergency / Internal Medicine"),
    ("WBC", ("wbc", "white blood cell", "white blood cells", "total leucocyte count", "tlc",
             "total wbc count", "leukocytes"), _wbc, "Emergency / Internal Medicine"),
    ("CREATININE", ("creatinine", "serum creatinine"), _creatinine, "Nephrology / Emergency"),
    ("INR", ("inr",), _inr, "Emergency / Internal Medicine"),
    ("CALCIUM", ("calcium", "ca", "serum calcium"), _calcium, "Emergency / Internal Medicine"),
]


def parse_reference_range(text: Optional[str]) -> Tuple[Optional[float], Optional[float]]:
    """Parse '3.5 - 5.0', '<200', '> 60', 'up to 1.2' into (low, high)."""
    if not text:
        return None, None
    t = text.replace(",", "").lower()
    numbers = [float(n) for n in re.findall(r"\d+(?:\.\d+)?", t)]
    if not numbers:
        return None, None
    if len(numbers) >= 2 and re.search(r"\d\s*(?:-|–|to)\s*\d", t):
        return numbers[0], numbers[1]
    if "<" in t or "up to" in t or "below" in t or "less" in t:
        return None, numbers[0]
    if ">" in t or "above" in t or "more" in t:
        return numbers[0], None
    return None, None


def evaluate_lab_values(labs: List[LabValue]) -> List[LabAlert]:
    """Return every alert raised by the lab values, most severe first."""
    alerts: List[LabAlert] = []
    for lab in labs:
        if lab.value is None:
            continue
        unit = _norm(lab.unit)

        # Troponin above its reference range is a possible heart attack: always Red.
        if _matches(lab.name, ("troponin", "trop i", "trop t", "hs troponin", "troponin i", "troponin t")):
            _, high = parse_reference_range(lab.reference_range)
            if high is not None and lab.value > high:
                alerts.append(LabAlert(
                    test=lab.name, value=lab.value, unit=lab.unit, level="HIGH",
                    rule_name="LAB_CRITICAL_TROPONIN",
                    message="raised troponin (possible heart muscle injury)",
                    department="Cardiology / Emergency",
                ))
                continue

        critical = None
        for rule, aliases, check, department in CRITICAL_RULES:
            if _matches(lab.name, aliases):
                reason = check(lab.value, unit)
                if reason:
                    critical = LabAlert(
                        test=lab.name, value=lab.value, unit=lab.unit, level="HIGH",
                        rule_name=f"LAB_CRITICAL_{rule}", message=reason, department=department,
                    )
                break
        if critical:
            alerts.append(critical)
            continue

        low, high = parse_reference_range(lab.reference_range)
        if (low is not None and lab.value < low) or (high is not None and lab.value > high):
            alerts.append(LabAlert(
                test=lab.name, value=lab.value, unit=lab.unit, level="MEDIUM",
                rule_name="LAB_OUT_OF_RANGE",
                message="outside the reference range printed on the report",
                department="General Medicine",
            ))

    alerts.sort(key=lambda a: 0 if a.level == "HIGH" else 1)
    return alerts

"""Schemas for prescriptions and lab reports (Patient mode).

The app only EXPLAINS what is already written on the document. It never suggests
new medicines, doses or diagnoses.
"""
from typing import List, Literal, Optional

from pydantic import BaseModel, Field

Language = Literal["en", "ta", "hi"]
LANGUAGE_NAMES = {"en": "English", "ta": "Tamil", "hi": "Hindi"}


class Medicine(BaseModel):
    """A medicine exactly as written on the prescription."""

    name: str
    dose: Optional[str] = Field(None, description="e.g. '500 mg', as written")
    timing: Optional[str] = Field(None, description="e.g. 'twice daily after food', as written")
    duration: Optional[str] = Field(None, description="e.g. '5 days', as written")


class LabValue(BaseModel):
    """One lab test result exactly as written on the report."""

    name: str
    value: Optional[float] = Field(None, description="Numeric result; null if not a number")
    unit: Optional[str] = None
    reference_range: Optional[str] = Field(None, description="Normal range as printed, e.g. '3.5-5.0'")


class MedicineExplanation(BaseModel):
    name: str
    explanation: str = Field(..., description="What it is generally used for and how to take it as prescribed")


class LabExplanation(BaseModel):
    name: str
    explanation: str = Field(..., description="What the test measures and whether this value is in range")


class ReportExplanation(BaseModel):
    """Plain-language explanation in the requested language."""

    summary: str
    medicines: List[MedicineExplanation] = Field(default_factory=list)
    lab_values: List[LabExplanation] = Field(default_factory=list)

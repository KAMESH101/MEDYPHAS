"""EHR/EMR document parsing service using Gemini (multimodal, structured JSON output)."""
from typing import List, Literal, Optional

from google.genai import types
from pydantic import BaseModel, Field, ValidationError

from app.schemas.patient import GenderEnum, PatientInput
from app.services.gemini_service import gemini_service


class ExtractedPatient(BaseModel):
    """Response schema Gemini must fill. Unknown values are null, never guessed."""

    age: Optional[int] = Field(None, description="Patient age in years, null if not visible")
    gender: Optional[Literal["M", "F", "Other"]] = None
    symptoms: List[str] = Field(default_factory=list, description="Symptoms or complaints, lowercase")
    bp_systolic: Optional[int] = None
    bp_diastolic: Optional[int] = None
    heart_rate: Optional[int] = None
    temperature: Optional[float] = Field(None, description="Body temperature in Celsius")
    spo2: Optional[float] = Field(None, description="Oxygen saturation in percent")
    pre_existing: List[str] = Field(default_factory=list, description="Known conditions, lowercase")


EHR_EXTRACTION_PROMPT = """You are a medical data extraction assistant. Read this medical document (EHR/EMR,
prescription or lab report) and fill in the JSON schema.

Rules:
- Extract only information explicitly visible in the document; use null (or an empty list) when missing
- Convert temperature to Celsius
- Normalize symptom and condition names to lowercase (e.g. "Chest Pain" -> "chest pain")
- For gender, use "M", "F", or "Other"
- Do not add diagnoses or medicines that are not written in the document"""

# PatientInput rejects values outside these ranges; drop implausible readings instead of failing.
_RANGES = {
    "bp_systolic": (50, 250),
    "bp_diastolic": (30, 150),
    "heart_rate": (30, 220),
    "temperature": (35.0, 43.0),
    "spo2": (70.0, 100.0),
}


def _in_range(name: str, value):
    if value is None:
        return None
    low, high = _RANGES[name]
    return value if low <= value <= high else None


async def parse_ehr_document(content: bytes, content_type: str) -> PatientInput:
    """
    Parse EHR/EMR document using Gemini.

    Args:
        content: File content as bytes
        content_type: MIME type (image/png, image/jpeg, application/pdf)

    Returns:
        PatientInput with extracted data

    Raises:
        ValueError if Gemini isn't configured or the output can't be used
    """
    if not gemini_service.is_available():
        raise ValueError("Gemini API key not configured on the server. Cannot parse documents.")

    try:
        data = await gemini_service.generate_json(
            [types.Part.from_bytes(data=content, mime_type=content_type), EHR_EXTRACTION_PROMPT],
            ExtractedPatient,
        )
    except ValidationError as e:
        raise ValueError(f"Gemini returned data that doesn't match the schema: {e}")
    except Exception as e:
        raise Exception(f"EHR parsing failed: {e}")

    age = data.age if data.age is not None and 0 <= data.age <= 120 else 30
    return PatientInput(
        age=age,
        gender=GenderEnum(data.gender or "Other"),
        symptoms=data.symptoms or ["unspecified"],
        bp_systolic=_in_range("bp_systolic", data.bp_systolic),
        bp_diastolic=_in_range("bp_diastolic", data.bp_diastolic),
        heart_rate=_in_range("heart_rate", data.heart_rate),
        temperature=_in_range("temperature", data.temperature),
        spo2=_in_range("spo2", data.spo2),
        pre_existing=data.pre_existing,
    )

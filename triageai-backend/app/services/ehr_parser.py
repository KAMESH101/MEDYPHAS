"""EHR/EMR, prescription and lab report parsing (Gemini multimodal, structured JSON output)."""
from google.genai import types
from pydantic import ValidationError

from app.schemas.patient import GenderEnum, PatientInput
from app.schemas.report import ExtractedDocument
from app.services.gemini_service import gemini_service

# Backwards-compatible name
ExtractedPatient = ExtractedDocument

EHR_EXTRACTION_PROMPT = """You are a medical data extraction assistant. Read this medical document
(prescription, lab report, discharge summary or EHR/EMR) and fill in the JSON schema.

Rules:
- Extract only information explicitly visible in the document; use null (or an empty list) when missing
- medicines: every medicine written on the prescription with dose, timing and duration exactly as written
- lab_values: every test result with its numeric value, unit and the reference range printed next to it
- Convert body temperature to Celsius
- Normalize symptom and condition names to lowercase (e.g. "Chest Pain" -> "chest pain")
- For gender, use "M", "F", or "Other"
- Do not add diagnoses, medicines or values that are not written in the document"""

# PatientInput rejects values outside these ranges; drop implausible readings instead of failing.
_RANGES = {
    "bp_systolic": (50, 250),
    "bp_diastolic": (30, 150),
    "heart_rate": (30, 220),
    "temperature": (35.0, 43.0),
    "spo2": (70.0, 100.0),
}

NO_SYMPTOMS = "no symptoms reported"


def _in_range(name: str, value):
    if value is None:
        return None
    low, high = _RANGES[name]
    return value if low <= value <= high else None


async def extract_document(content: bytes, content_type: str) -> ExtractedDocument:
    """
    Read a document with Gemini.

    Raises ValueError if Gemini isn't configured or the output doesn't match the schema.
    """
    if not gemini_service.is_available():
        raise ValueError("Gemini API key not configured on the server. Cannot read documents.")

    try:
        return await gemini_service.generate_json(
            [types.Part.from_bytes(data=content, mime_type=content_type), EHR_EXTRACTION_PROMPT],
            ExtractedDocument,
        )
    except ValidationError as e:
        raise ValueError(f"Gemini returned data that doesn't match the schema: {e}")


def to_patient_input(data: ExtractedDocument) -> PatientInput:
    """Turn extracted data into triage input. Missing age defaults to 30 (adult)."""
    age = data.age if data.age is not None and 0 <= data.age <= 120 else 30
    return PatientInput(
        age=age,
        gender=GenderEnum(data.gender or "Other"),
        symptoms=data.symptoms or [NO_SYMPTOMS],
        bp_systolic=_in_range("bp_systolic", data.bp_systolic),
        bp_diastolic=_in_range("bp_diastolic", data.bp_diastolic),
        heart_rate=_in_range("heart_rate", data.heart_rate),
        temperature=_in_range("temperature", data.temperature),
        spo2=_in_range("spo2", data.spo2),
        pre_existing=data.pre_existing,
    )


async def parse_ehr_document(content: bytes, content_type: str) -> PatientInput:
    """Parse a document straight into triage input."""
    try:
        return to_patient_input(await extract_document(content, content_type))
    except ValueError:
        raise
    except Exception as e:
        raise Exception(f"EHR parsing failed: {e}")

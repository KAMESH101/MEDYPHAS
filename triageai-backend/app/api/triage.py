"""Triage API endpoints."""
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.database import get_db
from app.schemas.patient import PatientInput, ReportAnalysis, TriageOutput
from app.schemas.report import Language
from app.services.ai_provider import DISCLAIMER, ai_provider, file_hash
from app.services.ehr_parser import to_patient_input
from app.services.lab_rules import evaluate_lab_values
from app.services.triage_service import run_full_triage

ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg"]

router = APIRouter(prefix="/api/triage", tags=["Triage"])


@router.post("", response_model=TriageOutput, status_code=201)
async def triage_patient(
    patient: PatientInput,
    db: AsyncSession = Depends(get_db)
):
    """
    Perform complete triage analysis on patient data.
    
    This endpoint:
    1. Validates patient input
    2. Checks clinical decision rules
    3. Runs ML model with SHAP explanations
    4. Generates natural language explanation via Gemini
    5. Saves result to database
    
    Returns complete triage result with risk level, department, and explanation.
    """
    try:
        result = await run_full_triage(patient, db)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Triage failed: {str(e)}")


@router.post("/upload", response_model=ReportAnalysis, status_code=201)
async def triage_from_document(
    file: UploadFile = File(...),
    language: Language = Form("en"),
    db: AsyncSession = Depends(get_db)
):
    """
    Patient mode: upload a prescription, lab report or EHR and get it explained.

    Accepts: PDF, PNG, JPG. Language: en (English), ta (Tamil), hi (Hindi).

    Process:
    1. Gemini reads the document into validated JSON (medicines, lab values, vitals...),
       cached by file hash
    2. Urgency (Green/Yellow/Red) from clinical rules + lab danger rules + ML
    3. Plain-language explanation in the chosen language (Gemini -> Groq -> template)

    The explanation only covers what is written on the document; it never suggests new
    medicines, doses or diagnoses.
    """
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported file type. Allowed: PDF, PNG, JPG")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="The file is empty")
    if len(content) > settings.MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"File too large (max {settings.MAX_UPLOAD_MB} MB)")

    try:
        doc, cached = await ai_provider.extract_document(content, file.content_type)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"⚠️ Document reading failed: {e}")
        raise HTTPException(
            status_code=503,
            detail="Could not read the document right now (AI service busy or unavailable). Please try again.",
        )

    try:
        patient = to_patient_input(doc)
        triage = await run_full_triage(patient, db, lab_values=doc.lab_values)
        alerts = evaluate_lab_values(doc.lab_values)
        explanation, source = await ai_provider.explain_report(
            doc, triage.risk_level.value, alerts, language, content_hash=file_hash(content)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Document processing failed: {e}")

    return ReportAnalysis(
        **triage.model_dump(),
        document_type=doc.document_type,
        patient=patient.model_dump(mode="json"),
        medicines=[m.model_dump() for m in doc.medicines],
        lab_values=[lab.model_dump() for lab in doc.lab_values],
        language=language,
        report_explanation=explanation.model_dump(),
        explanation_source=source,
        cached=cached,
        disclaimer=DISCLAIMER[language],
    )

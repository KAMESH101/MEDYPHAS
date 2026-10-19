"""Triage API endpoints."""
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.patient import PatientInput, TriageOutput
from app.services.triage_service import run_full_triage
from app.services.ehr_parser import parse_ehr_document

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


@router.post("/upload", response_model=TriageOutput, status_code=201)
async def triage_from_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload EHR/EMR document and perform triage.
    
    Accepts: PDF, PNG, JPG files containing patient medical records.
    
    Process:
    1. Parse document using Gemini Vision
    2. Extract patient data (age, vitals, symptoms, etc.)
    3. Run full triage pipeline
    
    Returns complete triage result.
    """
    # Validate file type
    allowed_types = ["application/pdf", "image/png", "image/jpeg"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: PDF, PNG, JPG"
        )
    
    try:
        # Read file content
        content = await file.read()
        
        # Parse document
        patient_input = await parse_ehr_document(content, file.content_type)
        
        # Run triage
        result = await run_full_triage(patient_input, db)
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Document processing failed: {str(e)}")

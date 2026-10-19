"""Patient data API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from app.database import get_db
from app.models.patient import Patient
from app.schemas.patient import PatientResponse

router = APIRouter(prefix="/api/patients", tags=["Patients"])


@router.get("", response_model=List[PatientResponse])
async def list_patients(
    risk_level: Optional[str] = Query(None, description="Filter by risk level: HIGH, MEDIUM, LOW"),
    limit: int = Query(50, ge=1, le=500, description="Maximum number of records"),
    db: AsyncSession = Depends(get_db)
):
    """
    List all triaged patients with optional filtering.
    
    Query Parameters:
    - risk_level: Filter by HIGH, MEDIUM, or LOW
    - limit: Max records to return (default 50, max 500)
    
    Returns list of patients ordered by triage time (newest first).
    """
    try:
        # Build query
        query = select(Patient).order_by(Patient.created_at.desc()).limit(limit)
        
        # Apply risk level filter
        if risk_level:
            risk_upper = risk_level.upper()
            if risk_upper not in ["HIGH", "MEDIUM", "LOW"]:
                raise HTTPException(status_code=400, detail="Invalid risk_level. Must be HIGH, MEDIUM, or LOW")
            query = query.where(Patient.risk_level == risk_upper)
        
        # Execute query
        result = await db.execute(query)
        patients = result.scalars().all()
        
        return patients
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")


@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient(
    patient_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed information for a single patient.
    
    Returns complete triage record including SHAP factors and explanation.
    """
    try:
        result = await db.execute(
            select(Patient).where(Patient.id == patient_id)
        )
        patient = result.scalar_one_or_none()
        
        if not patient:
            raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")
        
        return patient
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")

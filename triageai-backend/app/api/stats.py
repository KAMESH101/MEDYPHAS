"""Analytics and system health API endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.patient import Patient
from app.schemas.stats import StatsResponse, HealthResponse
from app.services.ml_service import ml_service
from app.services.gemini_service import gemini_service

router = APIRouter(prefix="/api", tags=["Analytics"])


@router.get("/stats", response_model=StatsResponse)
async def get_statistics(db: AsyncSession = Depends(get_db)):
    """
    Get aggregated triage statistics.
    
    Returns:
    - Total patient count
    - Risk level distribution (HIGH/MEDIUM/LOW counts)
    - Department workload distribution
    """
    try:
        # Total patients
        total_result = await db.execute(select(func.count(Patient.id)))
        total_patients = total_result.scalar()
        
        # Risk distribution
        risk_result = await db.execute(
            select(Patient.risk_level, func.count(Patient.id))
            .group_by(Patient.risk_level)
        )
        risk_distribution = {
            "HIGH": 0,
            "MEDIUM": 0,
            "LOW": 0
        }
        for risk, count in risk_result.all():
            risk_distribution[risk] = count
        
        # Department load
        dept_result = await db.execute(
            select(Patient.department, func.count(Patient.id))
            .group_by(Patient.department)
        )
        department_load = {dept: count for dept, count in dept_result.all()}
        
        return StatsResponse(
            total_patients=total_patients,
            risk_distribution=risk_distribution,
            department_load=department_load
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stats query failed: {str(e)}")


@router.get("/health", response_model=HealthResponse)
async def health_check(db: AsyncSession = Depends(get_db)):
    """
    System health check endpoint.
    
    Verifies:
    - ML model is loaded
    - Gemini API is available
    - Database is connected
    
    Returns status and component availability.
    """
    try:
        # Check database
        await db.execute(select(1))
        db_status = "connected"
    except Exception:
        db_status = "error"
    
    return HealthResponse(
        status="ok" if db_status == "connected" else "degraded",
        model_loaded=ml_service.is_loaded(),
        gemini_available=gemini_service.is_available(),
        database=db_status
    )

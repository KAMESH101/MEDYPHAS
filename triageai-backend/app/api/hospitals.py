"""Hospital routing endpoints (DEMO DATA)."""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_staff
from app.database import get_db
from app.models.hospital import Hospital
from app.services.hospital_service import RankedHospital, parse_specialties, rank_hospitals
from app.services.triage_service import assign_department

router = APIRouter(prefix="/api/hospitals", tags=["Hospitals"])

DEMO_NOTICE = "DEMO DATA: fictional hospitals, beds and phone numbers. In a real emergency call 108."


class HospitalOut(BaseModel):
    id: str
    name: str
    area: Optional[str]
    lat: float
    lng: float
    specialties: List[str]
    beds_available: int
    has_trauma_care: bool
    phone: Optional[str]

    model_config = {"from_attributes": True}


class RankResponse(BaseModel):
    required_specialties: List[str]
    location_used: bool
    notice: str = DEMO_NOTICE
    hospitals: List[RankedHospital]


class BedsUpdate(BaseModel):
    beds_available: int = Field(..., ge=0, le=5000)


@router.get("", response_model=List[HospitalOut])
async def list_hospitals(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Hospital).order_by(Hospital.name))
    return result.scalars().all()


@router.get("/rank", response_model=RankResponse)
async def rank(
    lat: Optional[float] = Query(None, ge=-90, le=90),
    lng: Optional[float] = Query(None, ge=-180, le=180),
    specialty: Optional[str] = Query(None, description="Department, e.g. 'Cardiology / Emergency'"),
    symptoms: Optional[str] = Query(None, description="Comma-separated symptoms; used when no specialty is given"),
    limit: int = Query(5, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
):
    """
    Rank hospitals for an urgent (Red) case.

    The required specialty comes from `specialty`, or from the symptoms via the same
    assign_department() the triage pipeline uses.
    """
    if not specialty and symptoms:
        symptom_list = [s.strip() for s in symptoms.split(",") if s.strip()]
        specialty = assign_department("HIGH", symptom_list)
    required = parse_specialties(specialty or "Emergency")

    result = await db.execute(select(Hospital))
    ranked = rank_hospitals(result.scalars().all(), required, lat, lng, limit)
    return RankResponse(
        required_specialties=required,
        location_used=lat is not None and lng is not None,
        hospitals=ranked,
    )


@router.patch("/{hospital_id}/beds", response_model=HospitalOut)
async def update_beds(
    hospital_id: str,
    update: BedsUpdate,
    db: AsyncSession = Depends(get_db),
    _staff: dict = Depends(require_staff),
):
    """Hospital update dashboard: staff set the number of free beds."""
    hospital = await db.get(Hospital, hospital_id)
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
    hospital.beds_available = update.beds_available
    await db.commit()
    await db.refresh(hospital)
    return hospital

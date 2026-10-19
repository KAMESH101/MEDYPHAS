"""Specialist helper endpoints (formerly Quick Fix).

The old Quick Fix predicted a disease and recommended a medicine. That is removed: this now
only suggests which kind of specialist to consult, and flags red-flag symptoms as emergencies.
"""
from typing import List

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.specialist_helper import SpecialistAdvice, all_history, all_symptoms, suggest_specialists

router = APIRouter(prefix="/api", tags=["Specialist helper"])


class SpecialistRequest(BaseModel):
    symptoms: List[str] = Field(..., min_length=1, max_length=20)
    history: str = "None"


@router.get("/symptoms")
async def get_symptoms():
    """Symptom and history pick-lists for the UI."""
    return {"symptoms": all_symptoms(), "history": all_history()}


@router.post("/specialist-helper", response_model=SpecialistAdvice)
async def specialist_helper(data: SpecialistRequest):
    """Suggest which specialist to consult. Never returns a diagnosis or a medicine."""
    return suggest_specialists(data.symptoms, data.history)


@router.post("/quick-fix", response_model=SpecialistAdvice, deprecated=True)
async def quick_fix(data: SpecialistRequest):
    """Old path kept for compatibility; returns the same specialist advice (no disease, no medicine)."""
    return suggest_specialists(data.symptoms, data.history)

"""Analytics and statistics schemas."""
from pydantic import BaseModel
from typing import Dict


class StatsResponse(BaseModel):
    """Aggregated triage statistics."""
    
    total_patients: int
    risk_distribution: Dict[str, int]  # {"HIGH": 5, "MEDIUM": 10, "LOW": 20}
    department_load: Dict[str, int]    # {"Emergency": 8, "Cardiology": 5, ...}


class HealthResponse(BaseModel):
    """System health check response."""
    
    status: str
    model_loaded: bool
    gemini_available: bool
    database: str

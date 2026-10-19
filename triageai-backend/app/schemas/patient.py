"""Pydantic schemas for patient data validation."""
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from enum import Enum
from datetime import datetime


class GenderEnum(str, Enum):
    """Gender options."""
    MALE = "M"
    FEMALE = "F"
    OTHER = "Other"


class RiskLevelEnum(str, Enum):
    """Risk level classification."""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class PatientInput(BaseModel):
    """Input schema for patient triage request."""
    
    age: int = Field(..., ge=0, le=120, description="Patient age in years")
    gender: GenderEnum
    symptoms: List[str] = Field(..., min_length=1, description="List of symptoms")
    
    # Vital signs (optional but recommended)
    bp_systolic: Optional[int] = Field(None, ge=50, le=250, description="Systolic BP in mmHg")
    bp_diastolic: Optional[int] = Field(None, ge=30, le=150, description="Diastolic BP in mmHg")
    heart_rate: Optional[int] = Field(None, ge=30, le=220, description="Heart rate in bpm")
    temperature: Optional[float] = Field(None, ge=35.0, le=43.0, description="Body temp in Celsius")
    spo2: Optional[float] = Field(None, ge=70.0, le=100.0, description="Blood oxygen %")
    
    # Medical history
    pre_existing: List[str] = Field(default_factory=list, description="Pre-existing conditions")
    
    @field_validator("symptoms")
    @classmethod
    def symptoms_must_be_non_empty(cls, v):
        """Ensure symptoms list is not empty."""
        if not v or all(s.strip() == "" for s in v):
            raise ValueError("At least one valid symptom is required")
        return [s.strip().lower() for s in v if s.strip()]
    
    @field_validator("pre_existing")
    @classmethod
    def normalize_conditions(cls, v):
        """Normalize condition names."""
        return [c.strip().lower() for c in v if c.strip()]


class TopFactor(BaseModel):
    """SHAP factor contribution."""
    
    feature: str
    contribution: float
    direction: str  # "increases" or "decreases"


class TriageOutput(BaseModel):
    """Complete triage result output."""
    
    patient_id: str
    risk_level: RiskLevelEnum
    confidence: float = Field(..., ge=0.0, le=1.0)
    department: str
    rule_triggered: Optional[str] = None
    top_factors: List[TopFactor] = Field(default_factory=list)
    explanation: str
    triage_timestamp: datetime


class PatientResponse(BaseModel):
    """Patient database record response."""
    
    id: str
    age: int
    gender: str
    symptoms: List[str]
    bp_systolic: Optional[int]
    bp_diastolic: Optional[int]
    heart_rate: Optional[int]
    temperature: Optional[float]
    spo2: Optional[float]
    pre_existing: List[str]
    risk_level: str
    confidence: float
    department: str
    rule_triggered: Optional[str]
    shap_factors: Optional[List[dict]]
    explanation: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

"""SQLAlchemy Patient model."""
from sqlalchemy import Column, String, Integer, Float, JSON, DateTime
from sqlalchemy.sql import func
from app.database import Base
import uuid


class Patient(Base):
    """Patient database model storing triage results."""
    
    __tablename__ = "patients"
    
    # Primary key
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Demographics
    age = Column(Integer, nullable=False)
    gender = Column(String, nullable=False)
    
    # Vital signs
    bp_systolic = Column(Integer, nullable=True)
    bp_diastolic = Column(Integer, nullable=True)
    heart_rate = Column(Integer, nullable=True)
    temperature = Column(Float, nullable=True)
    spo2 = Column(Float, nullable=True)
    
    # Clinical data (stored as JSON arrays)
    symptoms = Column(JSON, nullable=False)
    pre_existing = Column(JSON, nullable=False, default=list)
    
    # Triage results
    risk_level = Column(String, nullable=False)
    confidence = Column(Float, nullable=False)
    department = Column(String, nullable=False)
    rule_triggered = Column(String, nullable=True)
    
    # Explainability
    shap_factors = Column(JSON, nullable=True)
    explanation = Column(String, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

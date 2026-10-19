"""SQLAlchemy Hospital model (DEMO DATA seeded from app/data/hospitals.json)."""
from sqlalchemy import Boolean, Column, DateTime, Float, Integer, JSON, String
from sqlalchemy.sql import func

from app.database import Base


class Hospital(Base):
    """A hospital that can receive a referred patient."""

    __tablename__ = "hospitals"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    area = Column(String, nullable=True)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    specialties = Column(JSON, nullable=False, default=list)
    beds_available = Column(Integer, nullable=False, default=0)
    has_trauma_care = Column(Boolean, nullable=False, default=False)
    phone = Column(String, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

"""User model."""
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.database import Base
import uuid

class User(Base):
    """User database model."""
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False)  # "PATIENT" or "MEDICAL_STAFF"
    is_doctor = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

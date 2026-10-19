"""User schemas."""
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.services.auth import BCRYPT_MAX_BYTES

UserRole = Literal["DOCTOR", "PATIENT", "ADMIN"]


class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)
    role: UserRole
    is_doctor: bool = False

    @field_validator("password")
    @classmethod
    def password_fits_bcrypt(cls, v: str) -> str:
        if len(v.encode("utf-8")) > BCRYPT_MAX_BYTES:
            raise ValueError(f"Password must be at most {BCRYPT_MAX_BYTES} bytes")
        return v


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    role: str
    is_doctor: bool


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

"""User schemas."""
from pydantic import BaseModel
from typing import Optional

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str
    role: str
    is_doctor: bool = False

class UserResponse(UserBase):
    id: str
    role: str
    is_doctor: bool

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

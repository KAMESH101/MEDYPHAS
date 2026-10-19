"""Shared API dependencies."""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.services.auth import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

STAFF_ROLES = {"DOCTOR", "ADMIN"}


async def require_staff(token: str | None = Depends(oauth2_scheme)) -> dict:
    """Allow only logged-in medical staff (DOCTOR or ADMIN)."""
    payload = decode_access_token(token) if token else None
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Please log in as medical staff",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if payload.get("role") not in STAFF_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Medical staff only")
    return payload

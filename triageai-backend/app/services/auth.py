"""Authentication services.

Uses the `bcrypt` library directly (passlib 1.7.4 is unmaintained and breaks with
bcrypt >= 4.1: "module 'bcrypt' has no attribute '__about__'") and PyJWT for tokens.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt

from app.config import settings

ALGORITHM = "HS256"

# bcrypt only uses the first 72 bytes of a password and raises above that.
# Signup rejects longer passwords; login treats them as wrong instead of crashing.
BCRYPT_MAX_BYTES = 72


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against a bcrypt hash."""
    password_bytes = plain_password.encode("utf-8")
    if len(password_bytes) > BCRYPT_MAX_BYTES:
        return False
    try:
        return bcrypt.checkpw(password_bytes, hashed_password.encode("utf-8"))
    except ValueError:
        # Malformed hash in the database
        return False


def get_password_hash(password: str) -> str:
    """Hash password with a fresh salt."""
    password_bytes = password.encode("utf-8")
    if len(password_bytes) > BCRYPT_MAX_BYTES:
        raise ValueError(f"Password must be at most {BCRYPT_MAX_BYTES} bytes")
    return bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode("utf-8")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    """Return the token payload, or None if it is invalid or expired."""
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None

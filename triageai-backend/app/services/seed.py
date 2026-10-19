"""Seed demo data on startup.

Render's free tier has an ephemeral disk, so the SQLite file is wiped on every restart.
Seeding is idempotent: existing rows are left alone.
"""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.user import User
from app.services.auth import get_password_hash

DEMO_USERS = [
    # (username, role, is_doctor)
    ("dr_strange", "DOCTOR", True),
    ("patient_demo", "PATIENT", False),
]


async def seed_demo_users(session: AsyncSession) -> int:
    """Create the demo accounts if they don't exist. Returns how many were created."""
    created = 0
    for username, role, is_doctor in DEMO_USERS:
        result = await session.execute(select(User).where(User.username == username))
        if result.scalars().first():
            continue
        session.add(User(
            username=username,
            hashed_password=get_password_hash(settings.DEMO_USER_PASSWORD),
            role=role,
            is_doctor=is_doctor,
        ))
        created += 1
    await session.commit()
    return created


async def seed_all() -> None:
    """Run every seeder. Called from the app lifespan."""
    if not settings.SEED_DEMO_USERS:
        return
    async with AsyncSessionLocal() as session:
        created = await seed_demo_users(session)
    if created:
        print(f"✅ Seeded {created} demo user(s)")

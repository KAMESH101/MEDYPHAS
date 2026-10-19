"""Seed demo data on startup.

Render's free tier has an ephemeral disk, so the SQLite file is wiped on every restart.
Seeding is idempotent: existing rows are left alone.
"""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.hospital import Hospital
from app.models.user import User
from app.services.auth import get_password_hash
from app.services.hospital_service import load_seed_hospitals

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


async def seed_hospitals(session: AsyncSession) -> int:
    """Insert DEMO hospitals from app/data/hospitals.json that aren't in the database yet."""
    existing = set((await session.execute(select(Hospital.id))).scalars().all())
    created = 0
    for row in load_seed_hospitals():
        if row["id"] in existing:
            continue
        session.add(Hospital(**row))
        created += 1
    await session.commit()
    return created


async def seed_all() -> None:
    """Run every seeder. Called from the app lifespan."""
    async with AsyncSessionLocal() as session:
        hospitals = await seed_hospitals(session)
        users = await seed_demo_users(session) if settings.SEED_DEMO_USERS else 0
    if hospitals:
        print(f"✅ Seeded {hospitals} demo hospital(s)")
    if users:
        print(f"✅ Seeded {users} demo user(s)")

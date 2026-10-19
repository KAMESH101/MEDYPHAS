"""Pytest configuration and fixtures."""
import os

# Tests must never call real AI services or depend on a developer's .env
os.environ["GEMINI_API_KEY"] = ""
os.environ["SEED_DEMO_USERS"] = "false"

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app.schemas.patient import PatientInput, GenderEnum
from app.services.ml_service import ml_service


# In-memory database shared across connections for the duration of a test
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
test_engine = create_async_engine(TEST_DATABASE_URL, echo=False, poolclass=StaticPool)
TestSessionLocal = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture(scope="session", autouse=True)
def load_ml_model():
    """Load the committed model once (the app lifespan doesn't run under ASGITransport)."""
    ml_service.load_models()
    yield


@pytest.fixture(scope="function")
async def test_db():
    """Create test database for each test."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestSessionLocal() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def client(test_db):
    """Create test client with test database."""
    async def override_get_db():
        yield test_db

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
def sample_patient_high_risk():
    """Sample HIGH risk patient."""
    return PatientInput(
        age=67,
        gender=GenderEnum.MALE,
        symptoms=["chest pain", "shortness of breath"],
        bp_systolic=188,
        bp_diastolic=112,
        heart_rate=98,
        temperature=37.8,
        spo2=94.0,
        pre_existing=["diabetes", "hypertension"]
    )


@pytest.fixture
def sample_patient_normal():
    """Sample normal/LOW risk patient."""
    return PatientInput(
        age=30,
        gender=GenderEnum.FEMALE,
        symptoms=["headache"],
        bp_systolic=120,
        bp_diastolic=80,
        heart_rate=72,
        temperature=37.0,
        spo2=98.0,
        pre_existing=[]
    )

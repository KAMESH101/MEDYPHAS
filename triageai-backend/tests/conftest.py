"""Pytest configuration and fixtures."""
import pytest
import asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.main import app
from app.database import Base, get_db
from app.schemas.patient import PatientInput, GenderEnum


# Test database URL
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# Create test engine
test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


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
    
    async with AsyncClient(app=app, base_url="http://test") as ac:
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

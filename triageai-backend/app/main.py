"""TriageAI FastAPI Application.

Single entry point for everything (auth, triage, analytics, AI assistant):
    uvicorn app.main:app --reload
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.services.ml_service import ml_service
from app.services.gemini_service import gemini_service
from app.services.seed import seed_all
from app.api import triage, patients, stats, auth, websocket, quickfix
from app.models.user import User  # noqa: F401  (registers the table with Base)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle manager."""
    print("🚀 Starting TriageAI Backend...")

    await init_db()
    print("✅ Database initialized")

    await seed_all()

    # ML is optional: if the model can't load, triage runs on the clinical rules only.
    ml_service.load_models()
    quickfix.quickfix_model.load()

    gemini_service.initialize()

    print("✅ Application startup complete")
    yield
    print("👋 Shutting down TriageAI Backend...")


app = FastAPI(
    title="TriageAI Backend",
    description="""
    Medyphas AI triage prototype (demo data, not medical advice).

    - **Clinical decision rules** for immediate escalation
    - **XGBoost model** trained on synthetic data, with per-patient feature contributions
    - **Gemini** (server-side only) for plain-language explanations and document parsing
    """,
    version="1.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(triage.router)
app.include_router(patients.router)
app.include_router(stats.router)
app.include_router(quickfix.router)
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(websocket.router)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "TriageAI Backend API",
        "version": app.version,
        "docs": "/docs",
        "health": "/api/health"
    }

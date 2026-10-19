"""TriageAI FastAPI Application (Auth Only)."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.database import init_db
from app.api import auth, websocket
from app.models.user import User

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Starting TriageAI Backend (Auth Operations Only)...")
    await init_db()
    print("✅ Database initialized")
    print("✅ Application startup complete")
    yield
    print("👋 Shutting down TriageAI Backend...")

app = FastAPI(
    title="TriageAI Backend (Auth)",
    version="1.0.0",
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

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(websocket.router)

@app.get("/")
async def root():
    return {
        "message": "TriageAI Backend API (Auth Only)",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health"
    }

"""TriageAI FastAPI Application."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
import joblib
import pandas as pd
import numpy as np
import pickle
from pydantic import BaseModel
from typing import List, Optional
from app.config import settings
from app.database import init_db
from app.services.ml_service import ml_service
from app.services.gemini_service import gemini_service
from app.api import triage, patients, stats, auth, websocket
from app.models.user import User  # Import to register with Base


# --- Data Models ---
class PatientData(BaseModel):
    age: int
    gender: str
    symptoms: List[str]
    bp_systolic: int
    bp_diastolic: int
    heart_rate: int
    temperature: float
    spo2: float
    pre_existing: List[str]

class QuickFixRequest(BaseModel):
    symptoms: List[str]
    history: str


# Global variables for Quick Fix model
qf_model = None
qf_le_history = None
qf_le_disease = None
qf_disease_to_medicine = None
qf_symptoms_list = []
qf_history_list = []


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle manager."""
    # Startup
    print("🚀 Starting TriageAI Backend...")
    
    # Initialize database
    await init_db()
    print("✅ Database initialized")
    
    # Load ML models
    ml_service.load_models()

    # Load Quick Fix Model
    global qf_model, qf_le_history, qf_le_disease, qf_disease_to_medicine, qf_symptoms_list, qf_history_list
    try:
        with open("app/models/quickfix_model.pkl", "rb") as f:
            quickfix_artifacts = pickle.load(f)
            qf_model = quickfix_artifacts["model_disease"]
            qf_le_history = quickfix_artifacts["le_history"]
            qf_le_disease = quickfix_artifacts["le_disease"]
            qf_disease_to_medicine = quickfix_artifacts["disease_to_medicine"]
            qf_symptoms_list = quickfix_artifacts["all_symptoms"]
            qf_history_list = quickfix_artifacts["all_history"]
        print("✅ Quick Fix model loaded successfully")
    except Exception as e:
        print(f"⚠️ Failed to load Quick Fix model: {e}")
        qf_model = None
    
    # Initialize Gemini
    gemini_service.initialize()
    
    print("✅ Application startup complete")
    print("📖 API Docs: http://localhost:8000/docs")
    
    yield
    
    # Shutdown
    print("👋 Shutting down TriageAI Backend...")


# Create FastAPI app
app = FastAPI(
    title="TriageAI Backend",
    description="""
    AI-Powered Patient Triage System
    
    This backend provides intelligent patient triage using:
    - **Clinical Decision Rules**: 11 evidence-based medical rules for immediate escalation
    - **XGBoost ML Model**: Trained on synthetic patient data with >85% accuracy
    - **SHAP Explainability**: Per-patient feature contribution analysis
    - **Gemini AI**: Natural language explanations of triage decisions
    - **EHR Parsing**: Extract patient data from PDF/image documents
    
    ## Features
    - Form-based patient triage
    - EHR/EMR document upload and parsing
    - Patient history retrieval
    - Real-time analytics dashboard
    - System health monitoring
    
    ## Technology Stack
    FastAPI • SQLAlchemy • XGBoost • SHAP • Gemini 1.5 Flash • Pydantic v2
    """,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(triage.router)
app.include_router(patients.router)
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(websocket.router)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "TriageAI Backend API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health"
    }

@app.get("/api/symptoms")
async def get_symptoms():
    if not qf_model:
        raise HTTPException(status_code=503, detail="Quick Fix model not loaded")
    return {
        "symptoms": qf_symptoms_list,
        "history": qf_history_list
    }

@app.post("/api/quick-fix")
async def quick_fix_predict(data: QuickFixRequest):
    if not qf_model:
        raise HTTPException(status_code=503, detail="Quick Fix model not loaded")
    
    try:
        # Prepare Input Vector
        input_vector = []
        
        # Encode History
        # Handle unknown history gracefully by defaulting to "None"
        try:
            history_val = qf_le_history.transform([data.history])[0]
        except ValueError:
             try:
                history_val = qf_le_history.transform(["None"])[0] 
             except:
                history_val = 0 # Fallback
        
        # Encode Symptoms (Multi-hot)
        # Start with all zeros
        symptom_vector = [0] * len(qf_symptoms_list)
        
        for symptom in data.symptoms:
            if symptom in qf_symptoms_list:
                idx = qf_symptoms_list.index(symptom)
                symptom_vector[idx] = 1
        
        # Combine
        X_input = [symptom_vector + [history_val]]
        
        # Predict Disease
        disease_idx = qf_model.predict(X_input)[0]
        disease = qf_le_disease.inverse_transform([disease_idx])[0]
        
        # Lookup Medicine
        medicine = qf_disease_to_medicine.get(disease, "Consult Doctor")
        
        # Confidence
        probs = qf_model.predict_proba(X_input)[0]
        confidence = float(probs[disease_idx])
        
        return {
            "disease": disease,
            "medicine": medicine,
            "confidence": round(confidence, 2)
        }

    except Exception as e:
        print(f"Quick Fix Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

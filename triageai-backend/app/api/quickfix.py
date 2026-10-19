"""Quick Fix endpoints (symptom pick-list + legacy disease model).

Moved out of main.py unchanged in behaviour; Phase 2 repurposes this endpoint.
"""
import pickle
from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings

router = APIRouter(prefix="/api", tags=["Quick Fix"])


class QuickFixRequest(BaseModel):
    symptoms: List[str]
    history: str


class QuickFixModel:
    """Holds the Quick Fix artifacts loaded from app/models/quickfix_model.pkl."""

    def __init__(self):
        self.model = None
        self.le_history = None
        self.le_disease = None
        self.disease_to_medicine = None
        self.symptoms_list: List[str] = []
        self.history_list: List[str] = []

    def load(self) -> bool:
        try:
            with open(settings.QUICKFIX_MODEL_PATH, "rb") as f:
                artifacts = pickle.load(f)
            self.model = artifacts["model_disease"]
            self.le_history = artifacts["le_history"]
            self.le_disease = artifacts["le_disease"]
            self.disease_to_medicine = artifacts["disease_to_medicine"]
            self.symptoms_list = artifacts["all_symptoms"]
            self.history_list = artifacts["all_history"]
            print("✅ Quick Fix model loaded successfully")
            return True
        except Exception as e:
            print(f"⚠️ Failed to load Quick Fix model: {e}")
            self.model = None
            return False


quickfix_model = QuickFixModel()


@router.get("/symptoms")
async def get_symptoms():
    if not quickfix_model.model:
        raise HTTPException(status_code=503, detail="Quick Fix model not loaded")
    return {
        "symptoms": quickfix_model.symptoms_list,
        "history": quickfix_model.history_list
    }


@router.post("/quick-fix")
async def quick_fix_predict(data: QuickFixRequest):
    qf = quickfix_model
    if not qf.model:
        raise HTTPException(status_code=503, detail="Quick Fix model not loaded")

    try:
        # Encode History; unknown history falls back to "None"
        try:
            history_val = qf.le_history.transform([data.history])[0]
        except ValueError:
            try:
                history_val = qf.le_history.transform(["None"])[0]
            except ValueError:
                history_val = 0

        # Encode Symptoms (multi-hot)
        symptom_vector = [0] * len(qf.symptoms_list)
        for symptom in data.symptoms:
            if symptom in qf.symptoms_list:
                symptom_vector[qf.symptoms_list.index(symptom)] = 1

        X_input = [symptom_vector + [history_val]]

        disease_idx = qf.model.predict(X_input)[0]
        disease = qf.le_disease.inverse_transform([disease_idx])[0]
        medicine = qf.disease_to_medicine.get(disease, "Consult Doctor")
        probs = qf.model.predict_proba(X_input)[0]
        confidence = float(probs[disease_idx])

        return {
            "disease": disease,
            "medicine": medicine,
            "confidence": round(confidence, 2)
        }

    except Exception as e:
        print(f"Quick Fix Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

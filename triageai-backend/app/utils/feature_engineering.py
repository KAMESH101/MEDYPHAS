"""Feature engineering utilities for ML model."""
import pandas as pd
from typing import Dict, List
from app.schemas.patient import PatientInput
from app.config import settings


def build_features(patient: PatientInput) -> pd.DataFrame:
    """
    Transform PatientInput into feature vector for ML model.
    
    Args:
        patient: Validated patient input data
        
    Returns:
        DataFrame with single row containing all engineered features
    """
    features = {}
    
    # Demographics
    features["age"] = patient.age
    features["gender_M"] = 1 if patient.gender.value == "M" else 0
    features["gender_F"] = 1 if patient.gender.value == "F" else 0
    features["gender_Other"] = 1 if patient.gender.value == "Other" else 0
    
    # Vital signs (use mean values if missing)
    features["bp_systolic"] = patient.bp_systolic if patient.bp_systolic else 120
    features["bp_diastolic"] = patient.bp_diastolic if patient.bp_diastolic else 80
    features["heart_rate"] = patient.heart_rate if patient.heart_rate else 75
    features["temperature"] = patient.temperature if patient.temperature else 37.0
    features["spo2"] = patient.spo2 if patient.spo2 else 98.0
    
    # One-hot encode symptoms
    patient_symptoms = [s.lower().replace(" ", "_") for s in patient.symptoms]
    for symptom in settings.SYMPTOM_FEATURES:
        features[f"symptom_{symptom}"] = 1 if symptom in patient_symptoms else 0
    
    # One-hot encode pre-existing conditions
    patient_conditions = [c.lower().replace(" ", "_") for c in patient.pre_existing]
    for condition in settings.CONDITION_FEATURES:
        features[f"condition_{condition}"] = 1 if condition in patient_conditions else 0
    
    # Derived features
    features["symptom_count"] = len(patient.symptoms)
    features["condition_count"] = len(patient.pre_existing)
    
    # Create DataFrame
    return pd.DataFrame([features])


def get_feature_names() -> List[str]:
    """
    Get ordered list of feature names as expected by the model.
    
    Returns:
        List of feature column names
    """
    features = ["age"]
    
    # Gender one-hot
    features.extend(["gender_M", "gender_F", "gender_Other"])
    
    # Vitals
    features.extend(["bp_systolic", "bp_diastolic", "heart_rate", "temperature", "spo2"])
    
    # Symptoms
    features.extend([f"symptom_{s}" for s in settings.SYMPTOM_FEATURES])
    
    # Conditions
    features.extend([f"condition_{c}" for c in settings.CONDITION_FEATURES])
    
    # Derived
    features.extend(["symptom_count", "condition_count"])
    
    return features

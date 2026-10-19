"""Machine Learning model service with SHAP explainability."""
import pickle
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple
from pathlib import Path
import shap
from app.config import settings
from app.schemas.patient import PatientInput, TopFactor
from app.utils.feature_engineering import build_features, get_feature_names


class MLService:
    """ML model loader and prediction service."""
    
    def __init__(self):
        """Initialize ML service (models loaded on startup)."""
        self.model = None
        self.scaler = None
        self.encoder = None
        self.explainer = None
        self.feature_names = get_feature_names()
        
    def load_models(self):
        """Load trained XGBoost model, scaler, and encoder."""
        model_dir = Path(settings.MODEL_DIR)
        
        try:
            with open(model_dir / "xgb_model.pkl", "rb") as f:
                self.model = pickle.load(f)
            
            with open(model_dir / "scaler.pkl", "rb") as f:
                self.scaler = pickle.load(f)
            
            with open(model_dir / "encoder.pkl", "rb") as f:
                self.encoder = pickle.load(f)
            
            # Initialize SHAP explainer (KernelExplainer for model-agnostic explanations)
            # Use a small background dataset for efficiency
            background_data = np.zeros((10, len(self.feature_names)))
            self.explainer = shap.KernelExplainer(
                self.model.predict_proba,
                background_data
            )
            
            print("✅ ML models loaded successfully")
            return True
            
        except FileNotFoundError as e:
            print(f"⚠️  ML models not found: {e}")
            print("   Run 'python ml/generate_data.py' and 'python ml/train_model.py' first")
            return False
        except Exception as e:
            print(f"❌ Error loading ML models: {e}")
            return False
    
    def is_loaded(self) -> bool:
        """Check if models are loaded."""
        return self.model is not None
    
    def predict_with_shap(
        self, 
        patient: PatientInput
    ) -> Tuple[str, float, List[TopFactor]]:
        """
        Make prediction with SHAP explanations.
        
        Args:
            patient: Patient input data
            
        Returns:
            Tuple of (risk_level, confidence, top_factors)
        """
        if not self.is_loaded():
            raise RuntimeError("ML models not loaded. Call load_models() first.")
        
        # Build features
        features_df = build_features(patient)
        
        # Ensure correct column order
        features_df = features_df[self.feature_names]
        
        # Scale features
        features_scaled = self.scaler.transform(features_df)
        
        # Get predictions
        probabilities = self.model.predict_proba(features_scaled)[0]
        predicted_class_idx = np.argmax(probabilities)
        predicted_class = int(predicted_class_idx) # Cast to Python int
        confidence = float(probabilities[predicted_class])
        
        # Decode risk level
        risk_level = self.encoder.inverse_transform([predicted_class])[0]
        
        top_factors = []
        try:
            # SHAP explanations
            shap_values = self.explainer.shap_values(features_scaled)
            
            # For multi-class, shap_values is a list of arrays (one per class)
            # Use the predicted class's SHAP values
            if isinstance(shap_values, list):
                shap_values_class = shap_values[predicted_class]
            else:
                shap_values_class = shap_values
            
            # Get top 3 contributing features
            # shap_values_class shape is (1, n_features)
            feature_importance = np.abs(shap_values_class[0])
            top_indices = np.argsort(feature_importance)[-3:][::-1]
            
            for idx in top_indices:
                feature_name = self.feature_names[idx]
                contribution = float(shap_values_class[0][idx])
                direction = "increases" if contribution > 0 else "decreases"
                
                # Format feature name for display
                display_name = feature_name.replace("_", " ").title()
                
                top_factors.append(TopFactor(
                    feature=display_name,
                    contribution=abs(contribution),
                    direction=direction
                ))
        except Exception as e:
            print(f"⚠️ SHAP generation failed: {e}")
            # Continue without SHAP factors rather than crashing

            direction = "increases" if contribution > 0 else "decreases"
            
            # Format feature name for display
            display_name = feature_name.replace("_", " ").title()
            
            top_factors.append(TopFactor(
                feature=display_name,
                contribution=abs(contribution),
                direction=direction
            ))
        
        return risk_level, confidence, top_factors


# Global ML service instance
ml_service = MLService()

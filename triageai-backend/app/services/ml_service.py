"""Machine Learning model service with per-patient feature contributions.

The model is stored in XGBoost's native JSON format and the preprocessing (feature order,
scaler parameters, class labels) as plain JSON, so nothing here depends on pickle or on a
specific scikit-learn version. "Top factors" come from XGBoost's built-in tree contributions
(pred_contribs=True, the TreeSHAP algorithm) instead of the much slower shap KernelExplainer.
"""
import json
from pathlib import Path
from typing import List, Optional, Tuple

import numpy as np
import xgboost as xgb

from app.config import settings
from app.schemas.patient import PatientInput, TopFactor
from app.utils.feature_engineering import build_features, get_feature_names

MODEL_FILE = "xgb_model.json"
META_FILE = "model_meta.json"

_DISPLAY_NAMES = {
    "spo2": "SpO2",
    "bp_systolic": "Systolic BP",
    "bp_diastolic": "Diastolic BP",
    "heart_rate": "Heart Rate",
    "temperature": "Temperature",
    "age": "Age",
    "symptom_count": "Number of Symptoms",
    "condition_count": "Number of Conditions",
}


def display_name(feature: str) -> str:
    """Human-readable label for a model feature."""
    if feature in _DISPLAY_NAMES:
        return _DISPLAY_NAMES[feature]
    for prefix in ("symptom_", "condition_", "gender_"):
        if feature.startswith(prefix):
            feature = feature[len(prefix):]
            break
    return feature.replace("_", " ").title()


class MLService:
    """ML model loader and prediction service."""

    def __init__(self):
        """Initialize ML service (models loaded on startup)."""
        self.booster: Optional[xgb.Booster] = None
        self.classes: List[str] = []
        self.mean: Optional[np.ndarray] = None
        self.scale: Optional[np.ndarray] = None
        self.feature_names = get_feature_names()

    def load_models(self, model_dir: Optional[Path] = None) -> bool:
        """Load the trained XGBoost model and its preprocessing metadata."""
        model_dir = Path(model_dir or settings.MODEL_DIR)
        try:
            with open(model_dir / META_FILE, encoding="utf-8") as f:
                meta = json.load(f)

            if meta["feature_names"] != self.feature_names:
                raise ValueError("Feature order in model_meta.json does not match app/utils/feature_engineering.py")

            booster = xgb.Booster()
            booster.load_model(model_dir / MODEL_FILE)

            self.classes = meta["classes"]
            self.mean = np.asarray(meta["scaler"]["mean"], dtype=float)
            self.scale = np.asarray(meta["scaler"]["scale"], dtype=float)
            self.booster = booster

            print("✅ ML models loaded successfully")
            return True

        except FileNotFoundError as e:
            print(f"⚠️  ML models not found: {e}")
            print("   Run 'python ml/generate_data.py && python ml/train_model.py' first. Triage will use rules only.")
        except Exception as e:
            print(f"❌ Error loading ML models: {e}. Triage will use rules only.")
        self.booster = None
        return False

    def is_loaded(self) -> bool:
        """Check if models are loaded."""
        return self.booster is not None

    def _dmatrix(self, patient: PatientInput) -> xgb.DMatrix:
        features = build_features(patient)[self.feature_names].to_numpy(dtype=float)
        scaled = (features - self.mean) / self.scale
        return xgb.DMatrix(scaled, feature_names=self.feature_names)

    def predict(self, patient: PatientInput) -> Tuple[str, float, List[TopFactor]]:
        """
        Predict risk level with the top contributing factors.

        Returns:
            Tuple of (risk_level, confidence, top_factors)
        """
        if not self.is_loaded():
            raise RuntimeError("ML models not loaded. Call load_models() first.")

        dmatrix = self._dmatrix(patient)

        probabilities = self.booster.predict(dmatrix)[0]
        predicted_class = int(np.argmax(probabilities))
        confidence = float(probabilities[predicted_class])
        risk_level = self.classes[predicted_class]

        return risk_level, confidence, self._top_factors(dmatrix)

    def _top_factors(self, dmatrix: xgb.DMatrix, k: int = 3) -> List[TopFactor]:
        """
        Top-k features by contribution towards the HIGH risk class, so "increases" always
        means "pushes towards higher risk" whatever the predicted level is.
        """
        try:
            # Shape for multi-class: (rows, classes, features + 1); the last column is the bias.
            contribs = self.booster.predict(dmatrix, pred_contribs=True)
            risk_class = self.classes.index("HIGH") if "HIGH" in self.classes else 0
            class_contribs = np.asarray(contribs)[0, risk_class, :-1]

            factors = []
            for idx in np.argsort(np.abs(class_contribs))[::-1][:k]:
                value = float(class_contribs[idx])
                if value == 0.0:
                    break
                factors.append(TopFactor(
                    feature=display_name(self.feature_names[idx]),
                    contribution=round(abs(value), 4),
                    direction="increases" if value > 0 else "decreases",
                ))
            return factors
        except Exception as e:
            # Explanations are optional; never fail the triage because of them.
            print(f"⚠️ Feature contribution calculation failed: {e}")
            return []


# Global ML service instance
ml_service = MLService()

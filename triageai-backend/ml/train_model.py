"""XGBoost model training script.

Run from triageai-backend/:
    python ml/generate_data.py && python ml/train_model.py

Outputs (committed to git so the deploy never has to train):
    ml/models/xgb_model.json   - XGBoost native JSON format (portable across xgboost versions)
    ml/models/model_meta.json  - feature order, class labels and scaler parameters (plain JSON, no pickle)
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import accuracy_score, classification_report
from sklearn.preprocessing import LabelEncoder, StandardScaler

# Paths are relative to this file, not the working directory
ML_DIR = Path(__file__).resolve().parent
DATA_DIR = ML_DIR / "data"
MODEL_DIR = ML_DIR / "models"


def load_data():
    """Load training, validation, and test datasets."""
    train_df = pd.read_csv(DATA_DIR / "train.csv")
    val_df = pd.read_csv(DATA_DIR / "val.csv")
    test_df = pd.read_csv(DATA_DIR / "test.csv")

    return train_df, val_df, test_df


def prepare_features(df):
    """Separate features and labels."""
    X = df.drop('risk_level', axis=1)
    y = df['risk_level']
    return X, y


def main():
    """Train and save XGBoost model."""
    print("🚂 Training XGBoost model...")

    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    train_df, val_df, test_df = load_data()
    print(f"✅ Loaded datasets: {len(train_df)} train, {len(val_df)} val, {len(test_df)} test")

    X_train, y_train = prepare_features(train_df)
    X_val, y_val = prepare_features(val_df)
    X_test, y_test = prepare_features(test_df)
    feature_names = list(X_train.columns)

    # Encode labels
    encoder = LabelEncoder()
    y_train_encoded = encoder.fit_transform(y_train)
    y_val_encoded = encoder.transform(y_val)
    y_test_encoded = encoder.transform(y_test)

    print(f"📊 Classes: {encoder.classes_}")

    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)
    X_test_scaled = scaler.transform(X_test)

    # Train XGBoost classifier. softprob (not softmax) so we get real class probabilities.
    print("🔧 Training XGBoost...")
    model = xgb.XGBClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        objective='multi:softprob',
        num_class=len(encoder.classes_),
        random_state=42,
        eval_metric='mlogloss'
    )

    model.fit(
        X_train_scaled,
        y_train_encoded,
        eval_set=[(X_val_scaled, y_val_encoded)],
        verbose=False
    )

    # Evaluate on test set
    y_pred = model.predict(X_test_scaled)
    accuracy = accuracy_score(y_test_encoded, y_pred)

    print(f"\n✅ Training complete!")
    print(f"🎯 Test Accuracy (synthetic data): {accuracy:.4f}")

    print(f"\n📈 Classification Report:")
    print(classification_report(
        y_test_encoded,
        y_pred,
        target_names=encoder.classes_,
        digits=3
    ))

    # Save model in XGBoost's own JSON format and the preprocessing as plain JSON
    model.save_model(MODEL_DIR / "xgb_model.json")

    meta = {
        "feature_names": feature_names,
        "classes": [str(c) for c in encoder.classes_],
        "scaler": {
            "mean": [float(v) for v in scaler.mean_],
            "scale": [float(v) for v in scaler.scale_],
        },
        "test_accuracy": round(float(accuracy), 4),
        "xgboost_version": xgb.__version__,
        "trained_on": "synthetic data from ml/generate_data.py",
    }
    with open(MODEL_DIR / "model_meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    print(f"💾 Models saved to {MODEL_DIR}/")
    print("   - xgb_model.json")
    print("   - model_meta.json")

    # Feature importance
    print(f"\n🔍 Top 10 Feature Importances:")
    feature_importance = pd.DataFrame({
        'feature': feature_names,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)

    print(feature_importance.head(10).to_string(index=False))


if __name__ == "__main__":
    main()

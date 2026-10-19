"""XGBoost model training script."""
import pandas as pd
import numpy as np
import pickle
from pathlib import Path
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import classification_report, accuracy_score
import xgboost as xgb

# Paths
DATA_DIR = Path("ml/data")
MODEL_DIR = Path("ml/models")


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
    
    # Create model directory
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    
    # Load data
    train_df, val_df, test_df = load_data()
    print(f"✅ Loaded datasets: {len(train_df)} train, {len(val_df)} val, {len(test_df)} test")
    
    # Prepare features
    X_train, y_train = prepare_features(train_df)
    X_val, y_val = prepare_features(val_df)
    X_test, y_test = prepare_features(test_df)
    
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
    
    # Train XGBoost classifier
    print("🔧 Training XGBoost...")
    model = xgb.XGBClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        objective='multi:softmax',
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
    print(f"🎯 Test Accuracy: {accuracy:.4f}")
    
    if accuracy < 0.85:
        print("⚠️  WARNING: Accuracy below 0.85 target!")
    
    print(f"\n📈 Classification Report:")
    print(classification_report(
        y_test_encoded,
        y_pred,
        target_names=encoder.classes_,
        digits=3
    ))
    
    # Save models
    with open(MODEL_DIR / "xgb_model.pkl", "wb") as f:
        pickle.dump(model, f)
    
    with open(MODEL_DIR / "scaler.pkl", "wb") as f:
        pickle.dump(scaler, f)
    
    with open(MODEL_DIR / "encoder.pkl", "wb") as f:
        pickle.dump(encoder, f)
    
    print(f"💾 Models saved to {MODEL_DIR}/")
    print("   - xgb_model.pkl")
    print("   - scaler.pkl")
    print("   - encoder.pkl")
    
    # Feature importance
    print(f"\n🔍 Top 10 Feature Importances:")
    feature_importance = pd.DataFrame({
        'feature': X_train.columns,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print(feature_importance.head(10).to_string(index=False))


if __name__ == "__main__":
    main()

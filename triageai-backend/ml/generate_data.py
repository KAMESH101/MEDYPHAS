"""Synthetic patient data generator for ML training."""
import pandas as pd
import numpy as np
from pathlib import Path

# Set random seed for reproducibility
np.random.seed(420)

# Constants
N_SAMPLES = 5000
DATA_DIR = Path("ml/data")

# Feature definitions
SYMPTOMS = [
    "chest_pain", "shortness_of_breath", "headache", "fever",
    "cough", "nausea", "vomiting", "dizziness", "weakness",
    "abdominal_pain", "confusion", "slurred_speech", "numbness",
    "vision_changes", "seizure"
]

CONDITIONS = [
    "diabetes", "hypertension", "asthma", "heart_disease",
    "copd", "kidney_disease", "cancer", "stroke_history"
]


def assign_risk_label(row):
    """
    Assign risk label based on clinical logic.
    
    This creates realistic labels for supervised learning.
    """
    # Critical vitals → HIGH
    if row['spo2'] < 90:
        return 'HIGH'
    if row['bp_systolic'] > 180 or row['bp_diastolic'] > 110:
        return 'HIGH'
    if row['heart_rate'] < 50 or row['heart_rate'] > 120:
        return 'HIGH'
    if row['temperature'] > 40:
        return 'HIGH'
    
    # Severe symptoms → HIGH
    severe_symptoms = ['chest_pain', 'seizure', 'confusion', 'slurred_speech']
    if any(row[f'symptom_{s}'] == 1 for s in severe_symptoms if s in SYMPTOMS):
        if row['age'] > 50:
            return 'HIGH'
    
    # Multiple risk factors → MEDIUM/HIGH
    risk_score = 0
    
    # Age risk
    if row['age'] > 65:
        risk_score += 2
    elif row['age'] > 50:
        risk_score += 1
    
    # Vital signs
    if row['bp_systolic'] > 140 or row['bp_diastolic'] > 90:
        risk_score += 1
    if row['spo2'] < 94:
        risk_score += 1
    if row['temperature'] > 38.5:
        risk_score += 1
    
    # Conditions
    if row['condition_heart_disease'] == 1:
        risk_score += 2
    if row['condition_diabetes'] == 1:
        risk_score += 1
    
    # Symptom count
    if row['symptom_count'] >= 3:
        risk_score += 1
    
    # Assign based on score
    if risk_score >= 4:
        return 'HIGH'
    elif risk_score >= 2:
        return 'MEDIUM'
    else:
        return 'LOW'


def generate_patient_data(n_samples):
    """Generate synthetic patient dataset."""
    data = {}
    
    # Demographics
    data['age'] = np.random.randint(18, 90, n_samples)
    data['gender_M'] = np.random.randint(0, 2, n_samples)
    data['gender_F'] = 1 - data['gender_M']
    data['gender_Other'] = np.zeros(n_samples, dtype=int)
    
    # Vital signs with realistic distributions
    data['bp_systolic'] = np.random.normal(125, 20, n_samples).clip(90, 200)
    data['bp_diastolic'] = np.random.normal(80, 15, n_samples).clip(60, 130)
    data['heart_rate'] = np.random.normal(75, 15, n_samples).clip(40, 150)
    data['temperature'] = np.random.normal(37.2, 0.8, n_samples).clip(36, 41)
    data['spo2'] = np.random.normal(97, 3, n_samples).clip(85, 100)
    
    # Symptoms (binary, ~20% chance for each)
    for symptom in SYMPTOMS:
        # Some symptoms more common than others
        if symptom in ['headache', 'cough', 'fever']:
            prob = 0.25
        elif symptom in ['chest_pain', 'shortness_of_breath']:
            prob = 0.15
        else:
            prob = 0.10
        data[f'symptom_{symptom}'] = np.random.binomial(1, prob, n_samples)
    
    # Pre-existing conditions (binary, ~15% chance for each)
    for condition in CONDITIONS:
        if condition in ['diabetes', 'hypertension']:
            prob = 0.20
        else:
            prob = 0.10
        data[f'condition_{condition}'] = np.random.binomial(1, prob, n_samples)
    
    # Derived features
    data['symptom_count'] = sum(data[f'symptom_{s}'] for s in SYMPTOMS)
    data['condition_count'] = sum(data[f'condition_{c}'] for c in CONDITIONS)
    
    # Create DataFrame
    df = pd.DataFrame(data)
    
    # Assign risk labels
    df['risk_level'] = df.apply(assign_risk_label, axis=1)
    
    return df


def main():
    """Generate and save training datasets."""
    print("🔬 Generating synthetic patient data...")
    
    # Create data directory
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    # Generate full dataset
    df = generate_patient_data(N_SAMPLES)
    
    # Split: 70% train, 15% val, 15% test
    train_df = df.iloc[:int(0.7 * N_SAMPLES)]
    val_df = df.iloc[int(0.7 * N_SAMPLES):int(0.85 * N_SAMPLES)]
    test_df = df.iloc[int(0.85 * N_SAMPLES):]
    
    # Save to CSV
    train_df.to_csv(DATA_DIR / "train.csv", index=False)
    val_df.to_csv(DATA_DIR / "val.csv", index=False)
    test_df.to_csv(DATA_DIR / "test.csv", index=False)
    
    print(f"✅ Generated {N_SAMPLES} patient records")
    print(f"   Train: {len(train_df)} samples")
    print(f"   Val:   {len(val_df)} samples")
    print(f"   Test:  {len(test_df)} samples")
    print(f"\n📊 Risk Distribution:")
    print(df['risk_level'].value_counts())
    print(f"\n💾 Saved to {DATA_DIR}/")


if __name__ == "__main__":
    main()

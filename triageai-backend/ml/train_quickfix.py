
import pandas as pd
import numpy as np
import pickle
import os
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split

# --- Configuration ---
MODEL_DIR = "app/models"
if not os.path.exists(MODEL_DIR):
    os.makedirs(MODEL_DIR)

# --- Expanded Knowledge Base ---
# Format: Disease -> { "symptoms": [LIST], "history": [LIST], "medicine": "Drug" }
KNOWLEDGE_BASE = {
    "Common Cold": {
        "symptoms": ["Cough", "Sore Throat", "Runny Nose", "Sneezing", "Low Grade Fever", "Congestion"],
        "history": ["None", "Asthma"],
        "medicine": "Paracetamol, Decongestants, Rest"
    },
    "Influenza (Flu)": {
        "symptoms": ["High Fever", "Chills", "Muscle Aches", "Fatigue", "Dry Cough", "Headache", "Weakness"],
        "history": ["None", "Diabetes", "Asthma", "Heart Disease"],
        "medicine": "Oseltamivir (Tamiflu), Ibuprofen, Fluids"
    },
    "COVID-19": {
        "symptoms": ["Fever", "Dry Cough", "Loss of Taste", "Loss of Smell", "Shortness of Breath", "Fatigue", "Sore Throat"],
        "history": ["None", "Diabetes", "Hypertension", "Obesity"],
        "medicine": "Paxlovid (if severe), Paracetamol, Isolation"
    },
    "Migraine": {
        "symptoms": ["Severe Headache", "Nausea", "Sensitivity to Light", "Sensitivity to Sound", "Visual Aura", "Throbbing Pain"],
        "history": ["None", "Family History of Migraine"],
        "medicine": "Sumatriptan, Ibuprofen, Dark Room Rest"
    },
    "Tension Headache": {
        "symptoms": ["Dull Headache", "Neck Pain", "Scalp Tenderness", "Shoulder Pain", "Pressure Sensation"],
        "history": ["None", "Stress"],
        "medicine": "Ibuprofen, Aspirin, Stress Management"
    },
    "Gastroenteritis (Stomach Flu)": {
        "symptoms": ["Nausea", "Vomiting", "Diarrhea", "Stomach Cramps", "Low Grade Fever", "Dehydration"],
        "history": ["None"],
        "medicine": "ORS (Rehydration), Loperamide (if non-infectious), Probiotics"
    },
    "GERD (Acid Reflux)": {
        "symptoms": ["Heartburn", "Acid Regurgitation", "Chest Pain", "Difficulty Swallowing", "Chronic Cough"],
        "history": ["None", "Obesity", "Smoking"],
        "medicine": "Omeprazole, Antacids, Lifestyle Changes"
    },
    "Hypertension (High BP Episode)": {
        "symptoms": ["Severe Headache", "Vision Problems", "Chest Pain", "Difficulty Breathing", "Irregular Heartbeat"],
        "history": ["Hypertension", "Diabetes", "High Cholesterol"],
        "medicine": "Consult Doctor Immediately (Emergency), Amlodipine (Maintenance)"
    },
    "Type 2 Diabetes (Hyperglycemia)": {
        "symptoms": ["Increased Thirst", "Frequent Urination", "Blurry Vision", "Fatigue", "Slow Healing Sores"],
        "history": ["Diabetes", "Obesity", "Family History"],
        "medicine": "Metformin, Insulin, Hydration"
    },
    "Asthma Exacerbation": {
        "symptoms": ["Wheezing", "Shortness of Breath", "Chest Tightness", "Coughing"],
        "history": ["Asthma", "Allergies", "Smoking"],
        "medicine": "Salbutamol Inhaler, Corticosteroids"
    },
    "Allergic Rhinitis": {
        "symptoms": ["Sneezing", "Runny Nose", "Itchy Eyes", "Congestion", "Watery Eyes"],
        "history": ["Allergies", "Eczema"],
        "medicine": "Cetirizine, Loratadine, Nasal Sprays"
    },
     "Urinary Tract Infection (UTI)": {
        "symptoms": ["Burning Urination", "Frequent Urination", "Pelvic Pain", "Cloudy Urine"],
        "history": ["None", "Diabetes", "Kidney Stones"],
        "medicine": "Antibiotics (Nitrofurantoin), Cranberry Juice, Hydration"
    },
    "Pneumonia": {
        "symptoms": ["High Fever", "Chills", "Cough with Phlegm", "Shortness of Breath", "Chest Pain (Sharp)"],
        "history": ["Smoking", "Asthma", "COPD"],
        "medicine": "Antibiotics (Amoxicillin), Rest, Fluids - SEVERE: Hospital"
    },
    "Anemia": {
        "symptoms": ["Fatigue", "Weakness", "Pale Skin", "Dizziness", "Cold Hands/Feet"],
        "history": ["None", "Heavy Periods", "Kidney Disease"],
        "medicine": "Iron Supplements, Vitamin C, Dietary Changes"
    },
    "Food Poisoning": {
        "symptoms": ["Nausea", "Vomiting", "Watery Diarrhea", "Stomach Cramps", "Fever"],
        "history": ["None"],
        "medicine": "Fluids, ORS, Rest, Anti-emetics"
    },
     "Insomnia": {
        "symptoms": ["Difficulty Sleeping", "Waking Up Early", "Daytime Tiredness", "Irritability"],
        "history": ["Stress", "Anxiety", "Depression"],
        "medicine": "Melatonin, Sleep Hygiene, CBT-I"
    },
    "Anxiety Attack": {
        "symptoms": ["Palpitations", "Sweating", "Trembling", "Feelings of Doom", "Shortness of Breath"],
        "history": ["Anxiety", "Stress", "Trauma"],
        "medicine": "Breathing Exercises, SSRIs (Long term), Therapy"
    }
}

# --- Extract Master Lists ---
ALL_SYMPTOMS = sorted(list(set([s for d in KNOWLEDGE_BASE.values() for s in d["symptoms"]])))
ALL_HISTORY = sorted(list(set([h for d in KNOWLEDGE_BASE.values() for h in d["history"]])))
ALL_DISEASES = sorted(list(KNOWLEDGE_BASE.keys()))
ALL_MEDICINES = sorted(list(set([d["medicine"] for d in KNOWLEDGE_BASE.values()])))

print(f"Stats: {len(ALL_SYMPTOMS)} Symptoms, {len(ALL_HISTORY)} Conditions, {len(ALL_DISEASES)} Diseases")

# --- Generate Synthetic Data ---
SAMPLES_PER_DISEASE = 500
data = []

for disease, info in KNOWLEDGE_BASE.items():
    possible_symptoms = info["symptoms"]
    possible_history = info["history"]
    medicine = info["medicine"]
    
    for _ in range(SAMPLES_PER_DISEASE):
        # Weighted random selection of symptoms (2 to 5 symptoms)
        num_symptoms = np.random.randint(2, min(6, len(possible_symptoms) + 1))
        chosen_symptoms = np.random.choice(possible_symptoms, num_symptoms, replace=False)
        
        # Random history
        chosen_history = np.random.choice(possible_history)
        
        row = {
            "disease": disease,
            "medicine": medicine,
            "history": chosen_history
        }
        
        # One-hot encode symptoms for the row
        for sym in ALL_SYMPTOMS:
            row[sym] = 1 if sym in chosen_symptoms else 0
            
        data.append(row)

df = pd.DataFrame(data)

# --- Encoding ---
le_history = LabelEncoder()
df['history_encoded'] = le_history.fit_transform(df['history'])

le_disease = LabelEncoder()
df['disease_encoded'] = le_disease.fit_transform(df['disease'])

le_medicine = LabelEncoder()
df['medicine_encoded'] = le_medicine.fit_transform(df['medicine'])

# --- Training Data ---
X = df[ALL_SYMPTOMS + ['history_encoded']]
y_disease = df['disease_encoded']
y_medicine = df['medicine_encoded'] # Note: In real life, medicine depends on disease + patient specifics. Here we simplify.

# --- Model Training ---
print("Training Disease Prediction Model...")
rf_disease = RandomForestClassifier(n_estimators=100, random_state=42)
rf_disease.fit(X, y_disease)
print(f"Disease Model Accuracy: {rf_disease.score(X, y_disease):.4f}")

# Map disease to medicine (Deterministic for this simple lookup, or train a second model)
# For this task, we will train a second model to predict medicine directly from symptoms + history + predicted_disease
# But actually, looking at our data, medicine is 1:1 mapped to disease in our KB. 
# So we can just use a dictionary lookup for Disease -> Medicine to be 100% accurate to our KB.
disease_to_medicine = {d: KNOWLEDGE_BASE[d]["medicine"] for d in KNOWLEDGE_BASE}

# --- Saving ---
artifacts = {
    "model_disease": rf_disease,
    "le_history": le_history,
    "le_disease": le_disease,
    "disease_to_medicine": disease_to_medicine,
    "all_symptoms": ALL_SYMPTOMS,
    "all_history": ALL_HISTORY
}

output_path = os.path.join(MODEL_DIR, "quickfix_model.pkl")
with open(output_path, "wb") as f:
    pickle.dump(artifacts, f)

print(f"✅ Model and artifacts saved to {output_path}")
print("Symptoms List Sample:", ALL_SYMPTOMS[:5])


import pickle
import joblib
import pandas as pd
import numpy as np
import os
import sys

MODEL_DIR = "../Externalmodel-colab"
DISEASE_MODEL_PATH = os.path.join(MODEL_DIR, "disease_prediction_model.pkl")
MEDICINE_MODEL_PATH = os.path.join(MODEL_DIR, "medicine_prediction_model_rf.pkl")

def inspect_model(path, name):
    print(f"--- Inspecting {name} ---")
    try:
        with open(path, 'rb') as f:
            model = pickle.load(f)
    except Exception as e:
        print(f"Failed to load with pickle: {e}")
        try:
            model = joblib.load(path)
            print("Loaded with joblib")
        except Exception as e2:
            print(f"Failed to load with joblib: {e2}")
            return

    print(f"Type: {type(model)}")
    
    if hasattr(model, 'feature_names_in_'):
        print(f"Feature Names ({len(model.feature_names_in_)}): {model.feature_names_in_}")
    else:
        print("No feature_names_in_ found.")

    if hasattr(model, 'classes_'):
        print(f"Classes ({len(model.classes_)}): {model.classes_[:10]}...") 
    
    if hasattr(model, 'n_features_in_'):
        print(f"Expected Features Count: {model.n_features_in_}")

    return model

print(f"Python Version: {sys.version}")
d_model = inspect_model(DISEASE_MODEL_PATH, "Disease Model")
m_model = inspect_model(MEDICINE_MODEL_PATH, "Medicine Model")

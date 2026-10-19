"""ML service tests."""
import pytest
from app.services.ml_service import ml_service
from app.schemas.patient import PatientInput, GenderEnum


def test_ml_service_initialization():
    """Test ML service can be initialized."""
    assert ml_service is not None


def test_feature_names_defined():
    """Test feature names are properly defined."""
    from app.utils.feature_engineering import get_feature_names
    
    feature_names = get_feature_names()
    
    # Should have demographic, vital, symptom, and condition features
    assert 'age' in feature_names
    assert 'bp_systolic' in feature_names
    assert 'symptom_chest_pain' in feature_names
    assert 'condition_diabetes' in feature_names


def test_build_features():
    """Test feature engineering transforms patient to DataFrame."""
    from app.utils.feature_engineering import build_features
    
    patient = PatientInput(
        age=50,
        gender=GenderEnum.MALE,
        symptoms=['chest pain', 'fever'],
        bp_systolic=140,
        bp_diastolic=90,
        heart_rate=85,
        temperature=38.5,
        spo2=96.0,
        pre_existing=['diabetes']
    )
    
    features_df = build_features(patient)
    
    # Check DataFrame shape
    assert len(features_df) == 1
    
    # Check specific features
    assert features_df['age'].iloc[0] == 50
    assert features_df['gender_M'].iloc[0] == 1
    assert features_df['symptom_chest_pain'].iloc[0] == 1
    assert features_df['symptom_fever'].iloc[0] == 1
    assert features_df['condition_diabetes'].iloc[0] == 1
    assert features_df['symptom_count'].iloc[0] == 2
    assert features_df['condition_count'].iloc[0] == 1

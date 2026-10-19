"""API integration tests (from PRD Section 14.2)."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_triage_high_risk(client: AsyncClient):
    """Test complete triage flow for HIGH risk patient."""
    response = await client.post('/api/triage', json={
        'age': 67,
        'gender': 'M',
        'symptoms': ['chest pain', 'shortness of breath'],
        'bp_systolic': 188,
        'bp_diastolic': 112,
        'heart_rate': 98,
        'temperature': 37.8,
        'spo2': 94.0,
        'pre_existing': ['diabetes', 'hypertension']
    })
    
    assert response.status_code == 201
    data = response.json()
    
    # Verify response structure
    assert 'patient_id' in data
    assert data['risk_level'] == 'HIGH'
    assert data['confidence'] > 0.7
    assert data['department'] != ''
    assert len(data['explanation']) > 20
    
    # Should have top factors (from SHAP or empty if rule triggered)
    assert 'top_factors' in data


@pytest.mark.asyncio
async def test_triage_missing_symptoms_fails(client: AsyncClient):
    """Test validation error for missing symptoms."""
    response = await client.post('/api/triage', json={
        'age': 30,
        'gender': 'F',
        'symptoms': []  # Empty symptoms should fail
    })
    
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_get_patients_empty(client: AsyncClient):
    """Test listing patients when database is empty."""
    response = await client.get('/api/patients')
    
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_get_patient_not_found(client: AsyncClient):
    """Test 404 for non-existent patient."""
    response = await client.get('/api/patients/nonexistent-id')
    
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_stats_empty_database(client: AsyncClient):
    """Test stats endpoint with empty database."""
    response = await client.get('/api/stats')
    
    assert response.status_code == 200
    data = response.json()
    
    assert data['total_patients'] == 0
    assert data['risk_distribution'] == {'HIGH': 0, 'MEDIUM': 0, 'LOW': 0}
    assert data['department_load'] == {}


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    """Test health check endpoint."""
    response = await client.get('/api/health')
    
    assert response.status_code == 200
    data = response.json()
    
    assert 'status' in data
    assert 'model_loaded' in data
    assert 'gemini_available' in data
    assert 'database' in data
    assert data['database'] == 'connected'


@pytest.mark.asyncio
async def test_triage_normal_patient_uses_ml(client: AsyncClient):
    response = await client.post('/api/triage', json={
        'age': 30, 'gender': 'F', 'symptoms': ['headache'],
        'bp_systolic': 120, 'bp_diastolic': 80, 'heart_rate': 72, 'temperature': 37.0, 'spo2': 98.0,
    })

    assert response.status_code == 201
    data = response.json()
    assert data['rule_triggered'] is None
    assert data['risk_level'] in {'LOW', 'MEDIUM', 'HIGH'}
    assert len(data['top_factors']) > 0


@pytest.mark.asyncio
async def test_triage_falls_back_to_rules_when_model_missing(client: AsyncClient, monkeypatch):
    """If the ML model isn't loaded, triage still answers (rules-only) instead of HTTP 500."""
    from app.services.ml_service import ml_service

    monkeypatch.setattr(ml_service, 'booster', None)
    response = await client.post('/api/triage', json={'age': 30, 'gender': 'F', 'symptoms': ['headache']})

    assert response.status_code == 201
    assert response.json()['risk_level'] == 'LOW'
    assert response.json()['top_factors'] == []


@pytest.mark.asyncio
async def test_signup_and_login(client: AsyncClient):
    response = await client.post('/auth/signup', json={
        'username': 'test_doc', 'password': 'secret123', 'role': 'DOCTOR', 'is_doctor': True
    })
    assert response.status_code == 200

    response = await client.post('/auth/login', data={'username': 'test_doc', 'password': 'secret123'})
    assert response.status_code == 200
    body = response.json()
    assert body['access_token']
    assert body['user']['username'] == 'test_doc'

    response = await client.post('/auth/login', data={'username': 'test_doc', 'password': 'wrong-pass'})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_signup_rejects_password_over_72_bytes(client: AsyncClient):
    response = await client.post('/auth/signup', json={
        'username': 'longpw', 'password': 'x' * 73, 'role': 'PATIENT'
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_login_with_overlong_password_is_401_not_500(client: AsyncClient):
    response = await client.post('/auth/login', data={'username': 'nobody', 'password': 'y' * 100})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_demo_users_seed_idempotently(test_db):
    from app.services.seed import seed_demo_users

    assert await seed_demo_users(test_db) == 2
    assert await seed_demo_users(test_db) == 0


@pytest.mark.asyncio
async def test_assistant_chat_without_key_is_503(client: AsyncClient):
    response = await client.post('/api/assistant/chat', json={'history': [], 'message': 'hello'})
    assert response.status_code == 503

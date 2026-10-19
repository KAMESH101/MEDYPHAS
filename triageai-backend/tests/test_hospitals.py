"""Hospital ranking and the bed update endpoint."""
from types import SimpleNamespace

import pytest
from httpx import AsyncClient

from app.services.hospital_service import haversine_km, load_seed_hospitals, parse_specialties, rank_hospitals
from app.services.seed import seed_hospitals

EGMORE = (13.0732, 80.2609)


def h(id, specialties, beds=10, lat=EGMORE[0], lng=EGMORE[1], trauma=False):
    return SimpleNamespace(id=id, name=id, area=None, lat=lat, lng=lng, phone=None,
                           specialties=specialties, beds_available=beds, has_trauma_care=trauma)


def test_seed_file_is_labelled_demo_and_has_enough_hospitals():
    hospitals = load_seed_hospitals()
    assert len(hospitals) >= 15
    assert all("(Demo)" in x["name"] for x in hospitals)
    required = {"id", "name", "lat", "lng", "specialties", "beds_available", "has_trauma_care", "phone"}
    assert all(required <= x.keys() for x in hospitals)


def test_haversine_chennai_to_vellore_is_about_130_km():
    assert 120 < haversine_km(*EGMORE, 12.9165, 79.1325) < 140


def test_parse_specialties():
    assert parse_specialties("Cardiology / Emergency") == ["Cardiology", "Emergency"]
    assert parse_specialties("Outpatient / General Practice") == ["General Medicine"]
    assert parse_specialties(None) == []


def test_specialist_match_outweighs_distance_and_beds():
    near_general = h("near_general", ["Emergency", "General Medicine"], beds=20)
    far_cardiac = h("far_cardiac", ["Emergency", "Cardiology"], beds=5, lat=13.0, lng=80.22)  # ~9 km

    ranked = rank_hospitals([near_general, far_cardiac], ["Cardiology", "Emergency"], *EGMORE)

    assert ranked[0].id == "far_cardiac"
    assert "Cardiology" in ranked[0].matched_specialties


def test_beds_break_ties_between_equal_specialists():
    full = h("full", ["Cardiology"], beds=0)
    free = h("free", ["Cardiology"], beds=15)

    ranked = rank_hospitals([full, free], ["Cardiology"], *EGMORE)

    assert [r.id for r in ranked] == ["free", "full"]
    assert "No beds reported free" in ranked[1].reasons


def test_distance_breaks_ties():
    near = h("near", ["Cardiology"])
    far = h("far", ["Cardiology"], lat=12.9165, lng=79.1325)

    ranked = rank_hospitals([far, near], ["Cardiology"], *EGMORE)

    assert ranked[0].id == "near"
    assert ranked[0].distance_km < 1


def test_trauma_care_counts_as_trauma_specialty():
    ranked = rank_hospitals([h("a", ["Emergency"]), h("b", ["Emergency"], trauma=True)], ["Trauma", "Emergency"])

    assert ranked[0].id == "b"


def test_ranking_without_location():
    ranked = rank_hospitals([h("a", ["Emergency"])], ["Emergency"])

    assert ranked[0].distance_km is None
    assert ranked[0].maps_url.startswith("https://www.google.com/maps/dir/?api=1&destination=")


@pytest.fixture
async def seeded_client(client, test_db):
    await seed_hospitals(test_db)
    return client


async def test_rank_endpoint_uses_assign_department_for_symptoms(seeded_client: AsyncClient):
    response = await seeded_client.get('/api/hospitals/rank', params={
        'lat': EGMORE[0], 'lng': EGMORE[1], 'symptoms': 'heavy bleeding'})

    assert response.status_code == 200
    data = response.json()
    assert data['required_specialties'][0] == 'Trauma'
    assert data['location_used'] is True
    assert 'DEMO' in data['notice']
    assert data['hospitals'][0]['has_trauma_care']


async def test_rank_endpoint_with_explicit_specialty(seeded_client: AsyncClient):
    response = await seeded_client.get('/api/hospitals/rank', params={'specialty': 'Neurology / Emergency', 'limit': 3})

    data = response.json()
    assert len(data['hospitals']) == 3
    assert 'Neurology' in data['hospitals'][0]['specialties']


async def _token(client, username, role):
    await client.post('/auth/signup', json={'username': username, 'password': 'secret123', 'role': role})
    response = await client.post('/auth/login', data={'username': username, 'password': 'secret123'})
    return response.json()['access_token']


async def test_staff_can_update_beds(seeded_client: AsyncClient):
    token = await _token(seeded_client, 'staff1', 'DOCTOR')

    response = await seeded_client.patch('/api/hospitals/egmore-govt/beds', json={'beds_available': 3},
                                         headers={'Authorization': f'Bearer {token}'})

    assert response.status_code == 200
    assert response.json()['beds_available'] == 3


async def test_bed_update_requires_staff(seeded_client: AsyncClient):
    response = await seeded_client.patch('/api/hospitals/egmore-govt/beds', json={'beds_available': 3})
    assert response.status_code == 401

    token = await _token(seeded_client, 'patient1', 'PATIENT')
    response = await seeded_client.patch('/api/hospitals/egmore-govt/beds', json={'beds_available': 3},
                                         headers={'Authorization': f'Bearer {token}'})
    assert response.status_code == 403


async def test_bed_update_rejects_negative(seeded_client: AsyncClient):
    token = await _token(seeded_client, 'staff2', 'DOCTOR')
    response = await seeded_client.patch('/api/hospitals/egmore-govt/beds', json={'beds_available': -1},
                                         headers={'Authorization': f'Bearer {token}'})
    assert response.status_code == 422

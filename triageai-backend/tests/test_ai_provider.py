"""AI provider fallback chain, cache and the Patient-mode upload endpoint (AI calls mocked)."""
import json

import pytest
from httpx import AsyncClient

from app.schemas.report import ExtractedDocument, LabValue, Medicine, ReportExplanation
from app.services import ai_provider as provider_module
from app.services import ehr_parser
from app.services.ai_provider import ai_provider, fallback_report_explanation
from app.services.gemini_service import gemini_service

DOC = ExtractedDocument(
    document_type="lab_report",
    age=58,
    gender="M",
    medicines=[Medicine(name="Metformin", dose="500 mg", timing="twice daily after food", duration="30 days")],
    lab_values=[
        LabValue(name="Serum Potassium", value=7.0, unit="mmol/L", reference_range="3.5-5.0"),
        LabValue(name="Hemoglobin", value=13.2, unit="g/dL", reference_range="13-17"),
    ],
)


@pytest.fixture(autouse=True)
def clean_provider(monkeypatch):
    ai_provider.documents.clear()
    ai_provider.explanations.clear()
    monkeypatch.setattr(gemini_service, "available", False)
    monkeypatch.setattr(provider_module.settings, "GROQ_API_KEY", "")
    yield


@pytest.fixture
def gemini_reads_doc(monkeypatch):
    calls = {"n": 0}

    async def fake_extract(content, content_type):
        calls["n"] += 1
        return DOC

    monkeypatch.setattr(ehr_parser, "extract_document", fake_extract)
    return calls


@pytest.mark.parametrize("language,word", [("en", "Red"), ("ta", "சிவப்பு"), ("hi", "लाल")])
def test_fallback_explanation_in_each_language(language, word):
    explanation = fallback_report_explanation(DOC, "HIGH", language)

    assert word in explanation.summary
    assert "108" in explanation.summary
    assert [m.name for m in explanation.medicines] == ["Metformin"]
    assert "500 mg" in explanation.medicines[0].explanation
    assert len(explanation.lab_values) == 2


async def test_no_providers_uses_rules():
    explanation, source = await ai_provider.explain_report(DOC, "HIGH", [], "en")

    assert source == "rules"
    assert "Red" in explanation.summary


async def test_gemini_error_falls_back_to_groq(monkeypatch):
    monkeypatch.setattr(gemini_service, "available", True)
    monkeypatch.setattr(gemini_service, "client", object())

    async def gemini_429(*args, **kwargs):
        raise RuntimeError("429 RESOURCE_EXHAUSTED")

    groq_answer = ReportExplanation(summary="from groq").model_dump_json()

    async def fake_groq(prompt, json_mode=False, temperature=0.3):
        assert json_mode
        assert "Never suggest a new medicine" in prompt
        return groq_answer

    monkeypatch.setattr(gemini_service, "generate_json", gemini_429)
    monkeypatch.setattr(provider_module.settings, "GROQ_API_KEY", "test-key")
    monkeypatch.setattr(provider_module, "groq_complete", fake_groq)

    explanation, source = await ai_provider.explain_report(DOC, "HIGH", [], "ta")

    assert source == "groq"
    assert explanation.summary == "from groq"


async def test_groq_bad_json_falls_back_to_rules(monkeypatch):
    async def bad_groq(prompt, json_mode=False, temperature=0.3):
        return "not json"

    monkeypatch.setattr(provider_module.settings, "GROQ_API_KEY", "test-key")
    monkeypatch.setattr(provider_module, "groq_complete", bad_groq)

    _, source = await ai_provider.explain_report(DOC, "LOW", [], "hi")

    assert source == "rules"


async def test_triage_explanation_falls_back_to_template():
    from app.schemas.patient import PatientInput

    patient = PatientInput(age=40, gender="F", symptoms=["headache"])
    text, source = await ai_provider.explain_triage(patient, "LOW", "Outpatient", [])

    assert source == "rules"
    assert "not a substitute for a doctor" in text


async def test_documents_are_cached_by_file_hash(gemini_reads_doc):
    first, cached1 = await ai_provider.extract_document(b"same file", "image/png")
    second, cached2 = await ai_provider.extract_document(b"same file", "image/png")
    await ai_provider.extract_document(b"other file", "image/png")

    assert (cached1, cached2) == (False, True)
    assert first is second
    assert gemini_reads_doc["n"] == 2


async def test_upload_report_end_to_end(client: AsyncClient, gemini_reads_doc):
    response = await client.post(
        '/api/triage/upload',
        files={'file': ('report.png', b'fake image bytes', 'image/png')},
        data={'language': 'ta'},
    )

    assert response.status_code == 201
    data = response.json()
    # Critical potassium -> Red, whatever ML says
    assert data['risk_level'] == 'HIGH'
    assert data['rule_triggered'] == 'LAB_CRITICAL_POTASSIUM'
    assert data['lab_alerts'][0]['test'] == 'Serum Potassium'
    # Only medicines from the document, nothing added
    assert [m['name'] for m in data['medicines']] == ['Metformin']
    assert [m['name'] for m in data['report_explanation']['medicines']] == ['Metformin']
    assert data['language'] == 'ta'
    assert data['explanation_source'] == 'rules'
    assert '108' in data['disclaimer']
    assert 'Emergency' in data['department']


async def test_upload_rejects_unsupported_type(client: AsyncClient):
    response = await client.post('/api/triage/upload', files={'file': ('a.txt', b'hello', 'text/plain')})
    assert response.status_code == 400


async def test_upload_rejects_unknown_language(client: AsyncClient, gemini_reads_doc):
    response = await client.post('/api/triage/upload', files={'file': ('a.png', b'x', 'image/png')},
                                 data={'language': 'fr'})
    assert response.status_code == 422


async def test_upload_without_gemini_key_explains_why(client: AsyncClient):
    response = await client.post('/api/triage/upload', files={'file': ('a.png', b'x', 'image/png')})

    assert response.status_code == 400
    assert 'Gemini' in response.json()['detail']


async def test_tts_without_gemini_is_503(client: AsyncClient):
    response = await client.post('/api/tts', json={'text': 'hello', 'language': 'en'})
    assert response.status_code == 503


def test_pcm_to_wav_header():
    from app.services.gemini_service import pcm_to_wav

    wav = pcm_to_wav(b"\x00\x00" * 100)
    assert wav[:4] == b"RIFF" and wav[8:12] == b"WAVE"

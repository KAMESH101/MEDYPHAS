"""AI provider layer: Gemini (primary) -> Groq (text fallback) -> rule-based text.

- Document reading (images/PDF) needs Gemini; there is no fallback for that.
- Text explanations try Gemini, then Groq (on a 429, timeout or any other error), then a
  fixed template, so the app always answers.
- Results are cached in memory by file hash to save free-tier quota.

The AI only EXPLAINS. Urgency (Green/Yellow/Red) is decided by rules + ML before this runs,
and the prompts forbid new medicines, dose changes and diagnoses.
"""
import hashlib
import json
from collections import OrderedDict
from typing import Any, List, Optional, Tuple, Type, TypeVar

import httpx
from pydantic import BaseModel, ValidationError

from app.config import settings
from app.schemas.patient import PatientInput, TopFactor
from app.schemas.report import (
    LANGUAGE_NAMES, ExtractedDocument, LabExplanation, Language, MedicineExplanation, ReportExplanation,
)
from app.services import ehr_parser
from app.services.gemini_service import gemini_service
from app.services.lab_rules import LabAlert, parse_reference_range

T = TypeVar("T", bound=BaseModel)

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_TIMEOUT_S = 30

COLOR = {"LOW": "Green", "MEDIUM": "Yellow", "HIGH": "Red"}

DISCLAIMER = {
    "en": "This is not a substitute for a doctor. In an emergency call 108.",
    "ta": "இது மருத்துவருக்கு மாற்று அல்ல. அவசரநிலையில் 108 ஐ அழைக்கவும்.",
    "hi": "यह डॉक्टर का विकल्प नहीं है। आपात स्थिति में 108 पर कॉल करें।",
}


class LRUCache:
    """Tiny in-memory LRU cache (lost on restart, which is fine for a demo)."""

    def __init__(self, max_size: int):
        self.max_size = max_size
        self._data: "OrderedDict[str, Any]" = OrderedDict()

    def get(self, key: str):
        if key not in self._data:
            return None
        self._data.move_to_end(key)
        return self._data[key]

    def set(self, key: str, value) -> None:
        self._data[key] = value
        self._data.move_to_end(key)
        while len(self._data) > self.max_size:
            self._data.popitem(last=False)

    def clear(self) -> None:
        self._data.clear()


def file_hash(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


# ---------------------------------------------------------------------------
# Groq (OpenAI-compatible chat completions)
# ---------------------------------------------------------------------------

def groq_available() -> bool:
    return bool(settings.GROQ_API_KEY)


async def groq_complete(prompt: str, json_mode: bool = False, temperature: float = 0.3) -> str:
    """Call Groq. Raises on any error."""
    body = {
        "model": settings.GROQ_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": temperature,
    }
    if json_mode:
        body["response_format"] = {"type": "json_object"}
    async with httpx.AsyncClient(timeout=GROQ_TIMEOUT_S) as client:
        response = await client.post(
            GROQ_URL, json=body, headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"}
        )
        response.raise_for_status()
        text = (response.json()["choices"][0]["message"]["content"] or "").strip()
    if not text:
        raise ValueError("Groq returned an empty response")
    return text


# ---------------------------------------------------------------------------
# Rule-based fallback text (en / ta / hi)
# ---------------------------------------------------------------------------

_COLOR_WORD = {
    "en": {"LOW": "Green", "MEDIUM": "Yellow", "HIGH": "Red"},
    "ta": {"LOW": "பச்சை", "MEDIUM": "மஞ்சள்", "HIGH": "சிவப்பு"},
    "hi": {"LOW": "हरा", "MEDIUM": "पीला", "HIGH": "लाल"},
}
_SUMMARY_PREFIX = {
    "en": "We read your document. Urgency: {color}.",
    "ta": "உங்கள் ஆவணத்தைப் படித்தோம். அவசர நிலை: {color}.",
    "hi": "हमने आपका दस्तावेज़ पढ़ा। तात्कालिकता: {color}।",
}
_ACTION = {
    "en": {
        "HIGH": "Please go to a hospital now or call 108.",
        "MEDIUM": "Please see a doctor soon (within a day or two).",
        "LOW": "No urgent warning signs were found. Follow your doctor's advice.",
    },
    "ta": {
        "HIGH": "உடனே மருத்துவமனைக்குச் செல்லுங்கள் அல்லது 108 ஐ அழைக்கவும்.",
        "MEDIUM": "விரைவில் (ஓரிரு நாட்களில்) மருத்துவரைச் சந்தியுங்கள்.",
        "LOW": "அவசர எச்சரிக்கை அறிகுறிகள் எதுவும் இல்லை. உங்கள் மருத்துவரின் ஆலோசனையைப் பின்பற்றுங்கள்.",
    },
    "hi": {
        "HIGH": "कृपया तुरंत अस्पताल जाएँ या 108 पर कॉल करें।",
        "MEDIUM": "कृपया जल्द (एक-दो दिन में) डॉक्टर से मिलें।",
        "LOW": "कोई तत्काल चेतावनी संकेत नहीं मिला। अपने डॉक्टर की सलाह मानें।",
    },
}
_MEDICINE = {
    "en": "Take exactly as written: {details}. Ask your doctor or pharmacist if you are unsure.",
    "ta": "எழுதியபடியே எடுத்துக்கொள்ளுங்கள்: {details}. சந்தேகம் இருந்தால் உங்கள் மருத்துவர் அல்லது மருந்தாளரிடம் கேளுங்கள்.",
    "hi": "जैसा लिखा है वैसा ही लें: {details}। संदेह हो तो अपने डॉक्टर या फार्मासिस्ट से पूछें।",
}
_LAB = {
    "en": {"range": "normal range on the report: {range}", "in": "Within the range.",
           "out": "Outside the range - show this to your doctor.", "none": "No range printed."},
    "ta": {"range": "அறிக்கையில் உள்ள சாதாரண வரம்பு: {range}", "in": "வரம்பிற்குள் உள்ளது.",
           "out": "வரம்பிற்கு வெளியே உள்ளது - இதை உங்கள் மருத்துவரிடம் காட்டுங்கள்.", "none": "வரம்பு குறிப்பிடப்படவில்லை."},
    "hi": {"range": "रिपोर्ट पर सामान्य सीमा: {range}", "in": "सीमा के भीतर है।",
           "out": "सीमा से बाहर है - इसे अपने डॉक्टर को दिखाएँ।", "none": "कोई सीमा नहीं छपी है।"},
}


def fallback_report_explanation(doc: ExtractedDocument, risk_level: str, language: Language) -> ReportExplanation:
    """Explanation built from templates when no AI provider is reachable."""
    summary = " ".join([
        _SUMMARY_PREFIX[language].format(color=_COLOR_WORD[language][risk_level]),
        _ACTION[language][risk_level],
        DISCLAIMER[language],
    ])
    medicines = []
    for m in doc.medicines:
        details = ", ".join(x for x in (m.dose, m.timing, m.duration) if x) or "-"
        medicines.append(MedicineExplanation(name=m.name, explanation=_MEDICINE[language].format(details=details)))
    labs = []
    words = _LAB[language]
    for lab in doc.lab_values:
        low, high = parse_reference_range(lab.reference_range)
        parts = [f"{lab.value if lab.value is not None else '-'} {lab.unit or ''}".strip()]
        if low is None and high is None:
            parts.append(words["none"])
        else:
            parts.append(words["range"].format(range=lab.reference_range))
            out = lab.value is not None and ((low is not None and lab.value < low) or (high is not None and lab.value > high))
            parts.append(words["out"] if out else words["in"])
        labs.append(LabExplanation(name=lab.name, explanation=" ".join(parts)))
    return ReportExplanation(summary=summary, medicines=medicines, lab_values=labs)


# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

def build_report_prompt(doc: ExtractedDocument, risk_level: str, alerts: List[LabAlert], language: Language) -> str:
    language_name = LANGUAGE_NAMES[language]
    data = {
        "document_type": doc.document_type,
        "medicines": [m.model_dump() for m in doc.medicines],
        "lab_values": [lab.model_dump() for lab in doc.lab_values],
        "warning_signs_found_by_rules": [f"{a.test}: {a.message}" for a in alerts],
    }
    return f"""You explain a patient's own medical document in simple {language_name} to a person with no medical training.

The urgency has ALREADY been decided by safety rules: {COLOR[risk_level]} ({risk_level}). Do not change or soften it.

Data read from the document:
{json.dumps(data, ensure_ascii=False, indent=2)}

Write, in {language_name}:
- summary: 2-4 short sentences: what kind of document this is, the urgency colour, and what to do
  (Red: go to a hospital now or call 108; Yellow: see a doctor soon; Green: follow your doctor's advice).
  End with: "{DISCLAIMER[language]}"
- medicines: for EACH medicine listed, 1-2 sentences on what it is commonly used for and how to take it
  exactly as written (dose, timing, duration).
- lab_values: for EACH test listed, 1-2 sentences on what the test measures and whether the value is
  inside the printed reference range.

Strict rules:
- Only talk about the medicines and tests listed above.
- Never suggest a new medicine, a different dose, stopping a medicine, or a diagnosis.
- Never say the patient has a specific disease.
- Keep medicine and test names exactly as written (English letters).
- Use short, simple sentences."""


def _schema_hint(schema: Type[BaseModel]) -> str:
    return f"\n\nRespond with ONLY a JSON object matching this JSON schema:\n{json.dumps(schema.model_json_schema())}"


# ---------------------------------------------------------------------------
# Provider
# ---------------------------------------------------------------------------

class AIProvider:
    """Single entry point for every AI call in the backend."""

    def __init__(self):
        self.documents = LRUCache(settings.AI_CACHE_SIZE)     # file hash -> ExtractedDocument
        self.explanations = LRUCache(settings.AI_CACHE_SIZE)  # (hash, language, risk) -> ReportExplanation

    def status(self) -> dict:
        return {"gemini": gemini_service.is_available(), "groq": groq_available()}

    async def _text_with_fallback(self, prompt: str, schema: Optional[Type[T]] = None) -> Tuple[Optional[Any], str]:
        """Try Gemini, then Groq. Returns (result, source) or (None, 'rules') if both fail."""
        if gemini_service.is_available():
            try:
                if schema:
                    return await gemini_service.generate_json([prompt], schema, temperature=0.3), "gemini"
                return await gemini_service.generate_text(prompt), "gemini"
            except Exception as e:
                print(f"⚠️ Gemini failed ({type(e).__name__}: {e}); trying Groq")

        if groq_available():
            try:
                if schema:
                    text = await groq_complete(prompt + _schema_hint(schema), json_mode=True)
                    return schema.model_validate_json(text), "groq"
                return await groq_complete(prompt), "groq"
            except (httpx.HTTPError, ValidationError, ValueError, KeyError) as e:
                print(f"⚠️ Groq failed ({type(e).__name__}: {e}); using rule-based text")

        return None, "rules"

    async def explain_triage(
        self,
        patient: PatientInput,
        risk_level: str,
        department: str,
        top_factors: List[TopFactor],
        rule_triggered: Optional[str] = None,
    ) -> Tuple[str, str]:
        """Short staff-facing explanation of a triage decision. Returns (text, source)."""
        prompt = gemini_service.build_explanation_prompt(patient, risk_level, department, top_factors, rule_triggered)
        text, source = await self._text_with_fallback(prompt)
        if text is None:
            return gemini_service.fallback_explanation(patient, risk_level, department, top_factors), "rules"
        return text, source

    async def extract_document(self, content: bytes, content_type: str) -> Tuple[ExtractedDocument, bool]:
        """Read a document (Gemini only). Returns (data, from_cache)."""
        key = file_hash(content)
        cached = self.documents.get(key)
        if cached is not None:
            return cached, True
        doc = await ehr_parser.extract_document(content, content_type)
        self.documents.set(key, doc)
        return doc, False

    async def explain_report(
        self,
        doc: ExtractedDocument,
        risk_level: str,
        alerts: List[LabAlert],
        language: Language,
        content_hash: Optional[str] = None,
    ) -> Tuple[ReportExplanation, str]:
        """Patient-facing explanation in en/ta/hi. Returns (explanation, source)."""
        cache_key = f"{content_hash}:{language}:{risk_level}" if content_hash else None
        if cache_key:
            cached = self.explanations.get(cache_key)
            if cached is not None:
                return cached

        prompt = build_report_prompt(doc, risk_level, alerts, language)
        explanation, source = await self._text_with_fallback(prompt, ReportExplanation)
        if explanation is None:
            explanation = fallback_report_explanation(doc, risk_level, language)

        result = (explanation, source)
        if cache_key and source != "rules":
            self.explanations.set(cache_key, result)
        return result


ai_provider = AIProvider()

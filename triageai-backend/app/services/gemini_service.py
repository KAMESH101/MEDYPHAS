"""Gemini AI service (google-genai SDK) for explanations, document parsing and the staff assistant.

The API key and model name come from the backend environment only (GEMINI_API_KEY,
GEMINI_MODEL). Gemini never decides the risk level: that comes from the rule engine + ML.
"""
import io
import wave
from typing import List, Optional, Type, TypeVar

from google import genai
from google.genai import types
from pydantic import BaseModel

from app.config import settings
from app.schemas.patient import PatientInput, TopFactor

T = TypeVar("T", bound=BaseModel)

REQUEST_TIMEOUT_MS = 30_000

SAFETY_RULES = (
    "Never suggest new medicines, doses or a diagnosis. "
    "Never change or contradict the risk level you are given. "
    "Always remind the reader that this is not a substitute for a doctor."
)

ASSISTANT_SYSTEM_INSTRUCTION = (
    "You are Medyphas AI, an assistant for medical staff in a triage prototype. "
    "Explain medical terms, summarise general guidelines and help structure a clinician's own reasoning. "
    "Do not make diagnoses, do not prescribe or suggest medicines or doses, and do not override triage "
    "decisions; say that final decisions rest with the treating clinician. Keep answers concise and plain text. "
    "If something sounds like an emergency, tell the user to call 108 (ambulance) or 112."
)


def pcm_to_wav(pcm: bytes, sample_rate: int = 24_000) -> bytes:
    """Wrap raw 16-bit mono PCM (what Gemini TTS returns) in a WAV container."""
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        wav.writeframes(pcm)
    return buffer.getvalue()


def _is_configured(key: str) -> bool:
    return bool(key) and key != "your_api_key_here"


class GeminiService:
    """Gemini AI integration."""

    def __init__(self):
        """Initialize Gemini service."""
        self.client: Optional[genai.Client] = None
        self.model_name = settings.GEMINI_MODEL
        self.available = False

    def initialize(self) -> bool:
        """Create the Gemini client if an API key is configured."""
        if not _is_configured(settings.GEMINI_API_KEY):
            print("⚠️  GEMINI_API_KEY not set. Explanations use fallback text; document upload is disabled.")
            print("   Get a free API key from: https://aistudio.google.com/app/apikey")
            return False

        try:
            self.client = genai.Client(
                api_key=settings.GEMINI_API_KEY,
                http_options=types.HttpOptions(timeout=REQUEST_TIMEOUT_MS),
            )
            self.model_name = settings.GEMINI_MODEL
            self.available = True
            print(f"✅ Gemini AI service initialized ({self.model_name})")
            return True
        except Exception as e:
            print(f"⚠️  Gemini initialization failed: {e}")
            return False

    def is_available(self) -> bool:
        """Check if Gemini is available."""
        return self.available and self.client is not None

    async def generate_json(self, contents: list, schema: Type[T], temperature: float = 0.1) -> T:
        """
        Call Gemini with structured JSON output validated against a Pydantic schema.

        Raises RuntimeError if Gemini isn't configured, ValueError if the output doesn't validate.
        """
        if not self.is_available():
            raise RuntimeError("Gemini API key not configured")

        response = await self.client.aio.models.generate_content(
            model=self.model_name,
            contents=contents,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=schema,
                temperature=temperature,
            ),
        )
        if isinstance(response.parsed, schema):
            return response.parsed
        # SDK couldn't parse it for us; validate the raw text ourselves
        return schema.model_validate_json(response.text or "")

    async def generate_text(self, prompt: str, temperature: float = 0.3) -> str:
        """Plain text generation. Raises on any API error (callers decide the fallback)."""
        if not self.is_available():
            raise RuntimeError("Gemini API key not configured")
        response = await self.client.aio.models.generate_content(
            model=self.model_name,
            contents=prompt,
            config=types.GenerateContentConfig(temperature=temperature),
        )
        text = (response.text or "").strip()
        if not text:
            raise ValueError("Gemini returned an empty response")
        return text

    def build_explanation_prompt(
        self,
        patient: PatientInput,
        risk_level: str,
        department: str,
        top_factors: List[TopFactor],
        rule_triggered: Optional[str] = None
    ) -> str:
        """Prompt for the 2-3 sentence triage explanation shown to staff."""
        return f"""You are a medical AI assistant helping explain patient triage decisions to healthcare professionals.

Patient Profile:
- Age: {patient.age} years old
- Gender: {patient.gender.value}
- Symptoms: {', '.join(patient.symptoms)}
- Vital Signs:
  * Blood Pressure: {patient.bp_systolic}/{patient.bp_diastolic} mmHg (if provided)
  * Heart Rate: {patient.heart_rate} bpm (if provided)
  * Temperature: {patient.temperature}°C (if provided)
  * SpO2: {patient.spo2}% (if provided)
- Pre-existing Conditions: {', '.join(patient.pre_existing) if patient.pre_existing else 'None'}

Triage Decision (already made by clinical rules and a risk model; do not change it):
- Risk Level: {risk_level}
- Recommended Department: {department}
- Clinical Rule Triggered: {rule_triggered if rule_triggered else 'None (ML model prediction)'}

Top Contributing Factors (from the risk model):
{self._format_factors(top_factors)}

Write a concise, professional 2-3 sentence explanation of why this patient was classified as {risk_level} risk.
Mention the most important factors. {SAFETY_RULES} Do not use markdown formatting."""

    async def generate_explanation(
        self,
        patient: PatientInput,
        risk_level: str,
        department: str,
        top_factors: List[TopFactor],
        rule_triggered: Optional[str] = None
    ) -> str:
        """
        Generate human-readable triage explanation using Gemini.

        Falls back to a template sentence if Gemini is unavailable or the call fails.
        """
        prompt = self.build_explanation_prompt(patient, risk_level, department, top_factors, rule_triggered)
        try:
            return await self.generate_text(prompt)
        except Exception as e:
            if self.is_available():
                print(f"⚠️  Gemini API call failed: {e}")
            return self.fallback_explanation(patient, risk_level, department, top_factors)

    async def text_to_speech(self, text: str, voice: str = "Kore") -> bytes:
        """Read text aloud with the Gemini TTS model. Returns a WAV file (24 kHz, 16-bit mono)."""
        if not self.is_available():
            raise RuntimeError("Gemini API key not configured")
        response = await self.client.aio.models.generate_content(
            model=settings.GEMINI_TTS_MODEL,
            contents=text,
            config=types.GenerateContentConfig(
                response_modalities=["AUDIO"],
                speech_config=types.SpeechConfig(
                    voice_config=types.VoiceConfig(
                        prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=voice)
                    )
                ),
            ),
        )
        pcm = response.candidates[0].content.parts[0].inline_data.data
        return pcm_to_wav(pcm)

    async def chat(self, history: List[dict], message: str) -> str:
        """Staff assistant chat. history items are {"role": "user"|"model", "text": str}."""
        if not self.is_available():
            raise RuntimeError("Gemini API key not configured")

        chat = self.client.aio.chats.create(
            model=self.model_name,
            config=types.GenerateContentConfig(
                system_instruction=ASSISTANT_SYSTEM_INSTRUCTION,
                temperature=0.4,
            ),
            history=[
                types.Content(role=h["role"], parts=[types.Part(text=h["text"])])
                for h in history
            ],
        )
        response = await chat.send_message(message)
        return (response.text or "").strip()

    def _format_factors(self, factors: List[TopFactor]) -> str:
        """Format model factors for prompt."""
        if not factors:
            return "None (decision made by a clinical rule)"
        lines = []
        for i, factor in enumerate(factors, 1):
            lines.append(f"{i}. {factor.feature} ({factor.direction} risk, contribution: {factor.contribution:.2f})")
        return "\n".join(lines)

    def fallback_explanation(
        self,
        patient: PatientInput,
        risk_level: str,
        department: str,
        top_factors: List[TopFactor]
    ) -> str:
        """Generate basic explanation when Gemini is unavailable."""
        if top_factors:
            reason = "primarily due to " + ", ".join(f.feature for f in top_factors[:2])
        else:
            reason = "based on clinical safety rules"

        return (
            f"This {patient.age}-year-old {patient.gender.value} patient has been classified as "
            f"{risk_level} RISK {reason}. "
            f"Recommended for {department} evaluation. "
            f"This assessment is based on clinical algorithms and machine learning analysis "
            f"and is not a substitute for a doctor."
        )


# Global Gemini service instance
gemini_service = GeminiService()

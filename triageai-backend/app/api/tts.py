"""Read-aloud endpoint (Gemini TTS). The frontend falls back to the browser's speechSynthesis."""
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.schemas.report import Language
from app.services.gemini_service import gemini_service

router = APIRouter(prefix="/api", tags=["Text to speech"])


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=3000)
    language: Language = "en"


@router.post("/tts", responses={200: {"content": {"audio/wav": {}}}})
async def text_to_speech(request: TTSRequest):
    """Return the text read aloud as a WAV file. 503 when Gemini TTS isn't available."""
    if not gemini_service.is_available():
        raise HTTPException(status_code=503, detail="Text-to-speech is not configured on the server")
    try:
        audio = await gemini_service.text_to_speech(request.text)
    except Exception as e:
        print(f"⚠️ Gemini TTS failed: {e}")
        raise HTTPException(status_code=503, detail="Text-to-speech is temporarily unavailable")
    return Response(content=audio, media_type="audio/wav")

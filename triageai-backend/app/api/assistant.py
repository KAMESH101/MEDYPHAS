"""Staff AI assistant (Diagnostics page). Proxies Gemini so the key stays on the server."""
from typing import List, Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.gemini_service import gemini_service

router = APIRouter(prefix="/api/assistant", tags=["AI Assistant"])

MAX_HISTORY = 20


class ChatTurn(BaseModel):
    role: Literal["user", "model"]
    text: str = Field(..., max_length=8000)


class ChatRequest(BaseModel):
    history: List[ChatTurn] = Field(default_factory=list)
    message: str = Field(..., min_length=1, max_length=4000)


class ChatResponse(BaseModel):
    reply: str


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Send a message to the assistant. Safety rules are enforced by the server-side system prompt."""
    if not gemini_service.is_available():
        raise HTTPException(status_code=503, detail="AI assistant is not configured on the server (GEMINI_API_KEY).")

    # Gemini requires the conversation to start with a user turn; drop the UI greeting.
    history = [t.model_dump() for t in request.history[-MAX_HISTORY:]]
    while history and history[0]["role"] != "user":
        history.pop(0)

    try:
        reply = await gemini_service.chat(history, request.message)
    except Exception as e:
        print(f"⚠️ Assistant chat failed: {e}")
        raise HTTPException(status_code=502, detail="AI assistant is temporarily unavailable. Please try again.")
    return ChatResponse(reply=reply or "I couldn't generate a response.")

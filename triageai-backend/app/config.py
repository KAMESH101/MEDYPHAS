"""Configuration settings for TriageAI backend."""
from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict

# triageai-backend/ (the folder that contains app/ and ml/). All file paths are
# resolved from here, so the server works no matter which directory it is started from.
BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DB_PATH = BASE_DIR / "data" / "triageai.db"


class Settings(BaseSettings):
    """Application configuration loaded from environment variables (or triageai-backend/.env)."""

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        case_sensitive=True,
        extra="ignore",
    )

    # AI providers (server-side only; never sent to the browser)
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.8-flash"
    GEMINI_TTS_MODEL: str = "gemini-3.8-flash-tts"
    # Groq: fallback for text explanations only (no document reading)
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "openai/gpt-oss-120b"
    # Number of analysed documents kept in memory (keyed by file hash) to save free-tier quota
    AI_CACHE_SIZE: int = 128
    MAX_UPLOAD_MB: int = 10

    # Database. On Render's free tier the disk is temporary, so demo data is re-seeded on startup.
    DATABASE_URL: str = f"sqlite+aiosqlite:///{DEFAULT_DB_PATH.as_posix()}"

    # CORS: comma-separated list of allowed frontend origins
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    # Auth
    SECRET_KEY: str = "dev-only-insecure-secret-set-SECRET_KEY-in-env"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Demo accounts created on startup (public prototype credentials, documented in README)
    SEED_DEMO_USERS: bool = True
    DEMO_USER_PASSWORD: str = "password123"

    # ML model paths
    MODEL_DIR: Path = BASE_DIR / "ml" / "models"
    DATA_DIR: Path = BASE_DIR / "ml" / "data"

    # Feature definitions
    SYMPTOM_FEATURES: List[str] = [
        "chest_pain", "shortness_of_breath", "headache", "fever",
        "cough", "nausea", "vomiting", "dizziness", "weakness",
        "abdominal_pain", "confusion", "slurred_speech", "numbness",
        "vision_changes", "seizure"
    ]

    CONDITION_FEATURES: List[str] = [
        "diabetes", "hypertension", "asthma", "heart_disease",
        "copd", "kidney_disease", "cancer", "stroke_history"
    ]

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip().rstrip("/") for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()

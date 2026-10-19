"""Configuration settings for TriageAI backend."""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""
    
    # Gemini API
    GEMINI_API_KEY: str = ""
    
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./triageai-backend/database/triageai.db"
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"
    
    # ML Model paths
    MODEL_DIR: str = "ml/models"
    DATA_DIR: str = "ml/data"
    
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
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

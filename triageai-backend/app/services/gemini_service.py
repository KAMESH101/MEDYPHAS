"""Gemini AI service for natural language explanations."""
import google.generativeai as genai
from app.config import settings
from app.schemas.patient import PatientInput, TopFactor
from typing import List, Optional


class GeminiService:
    """Gemini AI integration for triage explanations."""
    
    def __init__(self):
        """Initialize Gemini service."""
        self.model = None
        self.available = False
        
    def initialize(self):
        """Configure and initialize Gemini API."""
        if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "your_api_key_here":
            print("⚠️  Gemini API key not configured. Natural language explanations will be disabled.")
            print("   Get a free API key from: https://aistudio.google.com/app/apikey")
            return False
        
        try:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.model = genai.GenerativeModel("gemini-1.5-flash")
            self.available = True
            print("✅ Gemini AI service initialized")
            return True
        except Exception as e:
            print(f"⚠️  Gemini initialization failed: {e}")
            return False
    
    def is_available(self) -> bool:
        """Check if Gemini is available."""
        return self.available
    
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
        
        Args:
            patient: Patient input data
            risk_level: Predicted risk level
            department: Assigned department
            top_factors: Top SHAP contributing factors
            rule_triggered: Name of clinical rule if any
            
        Returns:
            Natural language explanation string
        """
        if not self.is_available():
            return self._fallback_explanation(patient, risk_level, department, top_factors)
        
        # Build structured prompt
        prompt = f"""You are a medical AI assistant helping explain patient triage decisions to healthcare professionals.

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

Triage Decision:
- Risk Level: {risk_level}
- Recommended Department: {department}
- Clinical Rule Triggered: {rule_triggered if rule_triggered else 'None (ML model prediction)'}

Top Contributing Factors (from explainable AI):
{self._format_factors(top_factors)}

Generate a concise, professional 2-3 sentence explanation of why this patient was classified as {risk_level} risk. 
Mention the most critical factors and any immediate recommendations. 
Use medical terminology appropriately but remain clear. Do not use markdown formatting."""

        try:
            response = await self.model.generate_content_async(prompt)
            return response.text.strip()
        except Exception as e:
            print(f"⚠️  Gemini API call failed: {e}")
            return self._fallback_explanation(patient, risk_level, department, top_factors)
    
    def _format_factors(self, factors: List[TopFactor]) -> str:
        """Format SHAP factors for prompt."""
        lines = []
        for i, factor in enumerate(factors, 1):
            lines.append(f"{i}. {factor.feature} ({factor.direction} risk, contribution: {factor.contribution:.2f})")
        return "\n".join(lines)
    
    def _fallback_explanation(
        self,
        patient: PatientInput,
        risk_level: str,
        department: str,
        top_factors: List[TopFactor]
    ) -> str:
        """Generate basic explanation when Gemini is unavailable."""
        factors_str = ", ".join([f.feature for f in top_factors[:2]])
        
        return (
            f"This {patient.age}-year-old {patient.gender.value} patient has been classified as "
            f"{risk_level} RISK primarily due to {factors_str}. "
            f"Recommended for {department} evaluation. "
            f"This assessment is based on clinical algorithms and machine learning analysis."
        )


# Global Gemini service instance
gemini_service = GeminiService()

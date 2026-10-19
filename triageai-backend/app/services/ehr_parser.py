"""EHR/EMR document parsing service using Gemini Vision."""
import base64
import json
import google.generativeai as genai
from app.config import settings
from app.schemas.patient import PatientInput, GenderEnum


# Extraction prompt for Gemini Vision
EHR_EXTRACTION_PROMPT = """You are a medical data extraction AI. Analyze this medical document (EHR/EMR) and extract the following patient information in JSON format:

{
  "age": <integer>,
  "gender": "<M, F, or Other>",
  "symptoms": ["<symptom1>", "<symptom2>", ...],
  "bp_systolic": <integer or null>,
  "bp_diastolic": <integer or null>,
  "heart_rate": <integer or null>,
  "temperature": <float or null>,
  "spo2": <float or null>,
  "pre_existing": ["<condition1>", "<condition2>", ...]
}

Rules:
- Extract only information explicitly visible in the document
- Use null for missing vital signs
- Normalize symptom names to lowercase (e.g., "Chest Pain" → "chest pain")
- For gender, use "M", "F", or "Other"
- Return ONLY valid JSON, no additional text
- If age is not visible, use a reasonable estimate based on context

Return the JSON object now:"""


async def parse_ehr_document(content: bytes, content_type: str) -> PatientInput:
    """
    Parse EHR/EMR document using Gemini Vision API.
    
    Args:
        content: File content as bytes
        content_type: MIME type (image/png, image/jpeg, application/pdf)
        
    Returns:
        PatientInput with extracted data
        
    Raises:
        Exception if parsing fails
    """
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "your_api_key_here":
        raise ValueError("Gemini API key not configured. Cannot parse documents.")
    
    try:
        # Initialize Gemini with vision model
        genai.configure(api_key=settings.GEMINI_API_KEY)
        vision_model = genai.GenerativeModel("gemini-1.5-flash")
        
        # Encode content for Gemini
        b64_content = base64.b64encode(content).decode()
        
        # Create multimodal request
        response = await vision_model.generate_content_async([
            {
                'mime_type': content_type,
                'data': b64_content
            },
            EHR_EXTRACTION_PROMPT
        ])
        
        # Parse response
        text = response.text.strip()
        
        # Strip markdown code fences if present
        if text.startswith('```'):
            lines = text.split('\n')
            text = '\n'.join(lines[1:-1])  # Remove first and last lines
            if text.startswith('json'):
                text = text[4:].strip()
        
        # Parse JSON
        data = json.loads(text)
        
        # Validate and build PatientInput
        return PatientInput(
            age=data.get('age', 30),
            gender=GenderEnum(data.get('gender', 'Other')),
            symptoms=data.get('symptoms') or ['unspecified'],
            bp_systolic=data.get('bp_systolic'),
            bp_diastolic=data.get('bp_diastolic'),
            heart_rate=data.get('heart_rate'),
            temperature=data.get('temperature'),
            spo2=data.get('spo2'),
            pre_existing=data.get('pre_existing') or []
        )
        
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse Gemini response as JSON: {e}")
    except Exception as e:
        raise Exception(f"EHR parsing failed: {e}")

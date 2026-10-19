"""Which specialist should I see?" helper (replaces the old Quick Fix disease/medicine model).

A transparent lookup table from symptoms to the kind of doctor that usually handles them.
It never names a disease and never suggests a medicine. Red-flag symptoms send the user to
emergency care (108) instead.
"""
from collections import defaultdict
from typing import Dict, List, Tuple

from pydantic import BaseModel

# symptom -> (specialties in order of relevance, is_red_flag)
SYMPTOM_SPECIALTIES: Dict[str, Tuple[List[str], bool]] = {
    # Red flags: go to emergency, don't wait for an appointment
    "Chest Pain": (["Cardiology"], True),
    "Shortness of Breath": (["Respiratory", "Cardiology"], True),
    "Slurred Speech": (["Neurology"], True),
    "One-sided Weakness": (["Neurology"], True),
    "Confusion": (["Neurology"], True),
    "Seizure": (["Neurology"], True),
    "Fainting": (["Cardiology", "Neurology"], True),
    "Vomiting Blood": (["Gastroenterology"], True),
    "Heavy Bleeding": (["Trauma"], True),
    "Severe Headache": (["Neurology"], True),
    # General
    "Fever": (["General Medicine"], False),
    "Chills": (["General Medicine"], False),
    "Fatigue": (["General Medicine"], False),
    "Weakness": (["General Medicine"], False),
    "Pale Skin": (["General Medicine"], False),
    "Weight Loss": (["General Medicine", "Endocrinology"], False),
    "Headache": (["General Medicine", "Neurology"], False),
    "Dizziness": (["General Medicine", "Neurology"], False),
    "Numbness": (["Neurology"], False),
    # Heart
    "Palpitations": (["Cardiology"], False),
    "Irregular Heartbeat": (["Cardiology"], False),
    "Leg Swelling": (["Cardiology", "Nephrology"], False),
    # Lungs
    "Cough": (["General Medicine", "Respiratory"], False),
    "Chronic Cough": (["Respiratory"], False),
    "Wheezing": (["Respiratory"], False),
    "Chest Tightness": (["Respiratory", "Cardiology"], False),
    # Stomach
    "Nausea": (["Gastroenterology", "General Medicine"], False),
    "Vomiting": (["Gastroenterology", "General Medicine"], False),
    "Diarrhea": (["Gastroenterology"], False),
    "Abdominal Pain": (["Gastroenterology"], False),
    "Heartburn": (["Gastroenterology"], False),
    "Difficulty Swallowing": (["Gastroenterology", "ENT"], False),
    # ENT / eyes / skin
    "Sore Throat": (["ENT", "General Medicine"], False),
    "Runny Nose": (["ENT"], False),
    "Sneezing": (["ENT"], False),
    "Congestion": (["ENT"], False),
    "Ear Pain": (["ENT"], False),
    "Loss of Smell": (["ENT"], False),
    "Blurry Vision": (["Ophthalmology"], False),
    "Itchy Eyes": (["Ophthalmology"], False),
    "Rash": (["Dermatology"], False),
    "Itching": (["Dermatology"], False),
    # Urine / hormones
    "Burning Urination": (["Urology"], False),
    "Frequent Urination": (["Urology", "Endocrinology"], False),
    "Increased Thirst": (["Endocrinology"], False),
    # Bones and joints
    "Joint Pain": (["Orthopedics"], False),
    "Back Pain": (["Orthopedics"], False),
    "Neck Pain": (["Orthopedics"], False),
    "Swollen Joint": (["Orthopedics"], False),
    # Mind and sleep
    "Difficulty Sleeping": (["Psychiatry", "General Medicine"], False),
    "Anxiety": (["Psychiatry"], False),
    "Low Mood": (["Psychiatry"], False),
}

# Conditions the user already has -> the specialist who usually follows them up
HISTORY_SPECIALTIES: Dict[str, str] = {
    "None": "",
    "Diabetes": "Endocrinology",
    "Hypertension": "Cardiology",
    "Heart Disease": "Cardiology",
    "Asthma": "Respiratory",
    "COPD": "Respiratory",
    "Kidney Disease": "Nephrology",
    "Thyroid Disorder": "Endocrinology",
    "Pregnancy": "Obstetrics",
}

DISCLAIMER = (
    "This only suggests which kind of doctor to see. It is not a diagnosis and does not "
    "recommend any medicine. Not a substitute for a doctor."
)


class SpecialtySuggestion(BaseModel):
    specialty: str
    matched_symptoms: List[str]
    reason: str


class SpecialistAdvice(BaseModel):
    urgent: bool
    red_flags: List[str]
    message: str
    suggestions: List[SpecialtySuggestion]
    disclaimer: str = DISCLAIMER


def all_symptoms() -> List[str]:
    return sorted(SYMPTOM_SPECIALTIES)


def all_history() -> List[str]:
    return list(HISTORY_SPECIALTIES)


def _lookup(symptom: str):
    key = symptom.strip().lower().replace("_", " ")
    for name, value in SYMPTOM_SPECIALTIES.items():
        if name.lower() == key:
            return name, value
    return None, None


def suggest_specialists(symptoms: List[str], history: str = "None", limit: int = 3) -> SpecialistAdvice:
    """Rank specialties by how many of the chosen symptoms they usually handle."""
    scores: Dict[str, float] = defaultdict(float)
    matched: Dict[str, List[str]] = defaultdict(list)
    red_flags: List[str] = []

    for symptom in symptoms:
        name, entry = _lookup(symptom)
        if not entry:
            continue
        specialties, red_flag = entry
        if red_flag:
            red_flags.append(name)
        for rank, specialty in enumerate(specialties):
            scores[specialty] += 1.0 if rank == 0 else 0.5
            matched[specialty].append(name)

    history_specialty = HISTORY_SPECIALTIES.get(history, "")
    if history_specialty and scores:
        scores[history_specialty] += 0.5

    if not scores:
        scores["General Medicine"] = 1.0

    ranked = sorted(scores.items(), key=lambda kv: (-kv[1], kv[0]))[:limit]
    suggestions = []
    for specialty, _ in ranked:
        symptoms_for = matched.get(specialty, [])
        if symptoms_for:
            reason = "Usually handles: " + ", ".join(symptoms_for)
        elif specialty == history_specialty:
            reason = f"Follows up {history.lower()}"
        else:
            reason = "A general physician can examine you first and refer you if needed"
        suggestions.append(SpecialtySuggestion(specialty=specialty, matched_symptoms=symptoms_for, reason=reason))

    urgent = bool(red_flags)
    message = (
        "Warning signs selected: " + ", ".join(red_flags) + ". Go to emergency care now or call 108."
        if urgent else
        "Book an appointment with one of these doctors. If you get worse, seek care sooner."
    )
    return SpecialistAdvice(urgent=urgent, red_flags=red_flags, message=message, suggestions=suggestions)

"""Hospital ranking: specialist match (highest weight) + beds available + distance."""
import json
import math
from typing import List, Optional, Sequence

from pydantic import BaseModel

from app.config import BASE_DIR

HOSPITALS_FILE = BASE_DIR / "app" / "data" / "hospitals.json"

# Weights add up to 100
SPECIALTY_WEIGHT = 60
BEDS_WEIGHT = 20
DISTANCE_WEIGHT = 20
BEDS_FOR_FULL_SCORE = 20
DISTANCE_HALF_SCORE_KM = 5  # a hospital 5 km away gets half the distance points

# Department names produced by assign_department()/rules -> hospital specialty tags
SPECIALTY_ALIASES = {
    "outpatient": "General Medicine",
    "general practice": "General Medicine",
    "infectious disease": "Internal Medicine",
}


class RankedHospital(BaseModel):
    id: str
    name: str
    area: Optional[str] = None
    lat: float
    lng: float
    phone: Optional[str] = None
    specialties: List[str]
    beds_available: int
    has_trauma_care: bool
    distance_km: Optional[float] = None
    score: float
    matched_specialties: List[str]
    maps_url: str
    reasons: List[str]


def load_seed_hospitals() -> List[dict]:
    with open(HOSPITALS_FILE, encoding="utf-8") as f:
        return json.load(f)["hospitals"]


def parse_specialties(department: Optional[str]) -> List[str]:
    """'Cardiology / Emergency' -> ['Cardiology', 'Emergency'] (primary first)."""
    if not department:
        return []
    result = []
    for part in department.split("/"):
        name = part.strip()
        if not name:
            continue
        name = SPECIALTY_ALIASES.get(name.lower(), name)
        if name not in result:
            result.append(name)
    return result


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance between two points in km."""
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def maps_directions_url(lat: float, lng: float) -> str:
    return f"https://www.google.com/maps/dir/?api=1&destination={lat:.6f},{lng:.6f}"


def _specialty_score(required: List[str], available: Sequence[str], trauma_care: bool) -> tuple[float, List[str]]:
    """Primary (first) specialty counts 70%, the rest share 30%."""
    if not required:
        return 1.0, []
    have = {s.lower() for s in available}
    if trauma_care:
        have.add("trauma")
    matched = [s for s in required if s.lower() in have]
    primary = 0.7 if required[0].lower() in have else 0.0
    others = required[1:]
    secondary = 0.3 * (sum(1 for s in others if s.lower() in have) / len(others)) if others else (0.3 if primary else 0.0)
    return primary + secondary, matched


def rank_hospitals(
    hospitals: Sequence,
    required_specialties: List[str],
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    limit: int = 5,
) -> List[RankedHospital]:
    """
    Score = 60 x specialist match + 20 x beds + 20 x distance.

    Hospitals with no beds stay in the list (they may still stabilise and transfer) but rank lower.
    Without a location, distance is ignored and every hospital gets half the distance points.
    """
    ranked = []
    for h in hospitals:
        spec_score, matched = _specialty_score(required_specialties, h.specialties, h.has_trauma_care)
        beds_score = min(max(h.beds_available, 0), BEDS_FOR_FULL_SCORE) / BEDS_FOR_FULL_SCORE

        if lat is not None and lng is not None:
            distance = haversine_km(lat, lng, h.lat, h.lng)
            distance_score = 1 / (1 + distance / DISTANCE_HALF_SCORE_KM)
        else:
            distance, distance_score = None, 0.5

        score = SPECIALTY_WEIGHT * spec_score + BEDS_WEIGHT * beds_score + DISTANCE_WEIGHT * distance_score

        reasons = []
        if matched:
            reasons.append("Has " + ", ".join(matched))
        elif required_specialties:
            reasons.append(f"No {required_specialties[0]} department listed")
        reasons.append(f"{h.beds_available} beds available" if h.beds_available > 0 else "No beds reported free")
        if distance is not None:
            reasons.append(f"{distance:.1f} km away")

        ranked.append(RankedHospital(
            id=h.id, name=h.name, area=h.area, lat=h.lat, lng=h.lng, phone=h.phone,
            specialties=list(h.specialties), beds_available=h.beds_available,
            has_trauma_care=h.has_trauma_care,
            distance_km=round(distance, 2) if distance is not None else None,
            score=round(score, 1), matched_specialties=matched,
            maps_url=maps_directions_url(h.lat, h.lng), reasons=reasons,
        ))

    ranked.sort(key=lambda r: (-r.score, r.distance_km if r.distance_km is not None else 0))
    return ranked[:limit]

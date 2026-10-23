"""
Deterministic, explainable scoring rules.

Every criterion returns a normalized 0-100 sub-score. The final score is the
weighted average of those sub-scores (weights sum to 1.0), so the result is
always 0-100 and directly comparable between cars.

This is rule-based logic, not machine learning.
"""

from __future__ import annotations

from typing import Dict, List, Tuple

ENGINE_VERSION = "1.0.0"

PKR_PER_USD = 280

WEIGHTS: Dict[str, float] = {
    "budget": 0.25,
    "lifestyle": 0.18,
    "luxury_features": 0.15,
    "family_size": 0.12,
    "driving_style": 0.12,
    "fuel_preference": 0.08,
    "priority": 0.05,
    "environment": 0.05,
}

BUDGET_BANDS = {
    "under_2cr": (0, 20_000_000),
    "2cr_5cr": (20_000_000, 50_000_000),
    "5cr_10cr": (50_000_000, 100_000_000),
    "over_10cr": (100_000_000, float("inf")),
}

LIFESTYLE_CATEGORIES = {
    "urban": ["sedan", "hatchback", "compact", "electric"],
    "adventure": ["suv", "truck", "crossover"],
    "family": ["suv", "minivan", "sedan", "crossover"],
    "luxury": ["luxury", "sedan", "coupe"],
    "sporty": ["sports", "coupe", "supercar"],
    "eco": ["electric", "hybrid", "hatchback"],
    "executive": ["luxury", "sedan"],
}

LUXURY_KEYWORDS = ("leather", "premium", "panoramic", "heated", "massage", "wood", "ambient")
TECH_KEYWORDS = ("digital", "screen", "camera", "sensor", "assist", "display", "navigation")


def _budget(car: dict, band_key: str) -> float:
    pkr = (car.get("price") or 0) * PKR_PER_USD
    low, high = BUDGET_BANDS.get(band_key, (0, float("inf")))
    if low <= pkr <= high:
        return 100
    if low * 0.7 <= pkr <= high * 1.3:
        return 60
    if low * 0.5 <= pkr <= high * 1.5:
        return 30
    return 10


def _lifestyle(car: dict, lifestyle: str) -> float:
    cat = (car.get("category") or "").lower()
    if cat in LIFESTYLE_CATEGORIES.get(lifestyle, []):
        return 100
    if lifestyle == "executive" and (car.get("price") or 0) > 80_000:
        return 70
    return 20


def _family(car: dict, size: int) -> float:
    seats = car.get("seats") or 5
    if seats >= size:
        return 100
    if seats >= size - 1:
        return 60
    return 20


def _driving(car: dict, style: str) -> float:
    hp = car.get("horsepower") or 200
    if style == "aggressive":
        return 100 if hp > 400 else 70 if hp > 250 else 40
    if style == "balanced":
        return 100 if 150 <= hp <= 400 else 60
    if style == "calm":
        return 100 if hp <= 300 else 50
    return 50


def _fuel(car: dict, pref: str) -> float:
    fuel = (car.get("fuel_type") or "").lower()
    if fuel == pref:
        return 100
    if {pref, fuel} == {"hybrid", "electric"}:
        return 70
    return 20


def _luxury(car: dict, luxury_importance: str, tech_importance: str) -> float:
    feats = [f.lower() for f in (car.get("features") or [])]
    lux = sum(any(k in f for k in LUXURY_KEYWORDS) for f in feats)
    tech = sum(any(k in f for k in TECH_KEYWORDS) for f in feats)

    score = 50.0
    if luxury_importance == "high":
        if lux >= 2:
            score += 30
        if (car.get("price") or 0) > 60_000:
            score += 20
    if tech_importance == "high" and tech >= 2:
        score += 20
    elif tech_importance == "medium" and tech >= 1:
        score += 10
    return min(100.0, score)


def _priority(car: dict, priority: str) -> float:
    cat = (car.get("category") or "").lower()
    hp = car.get("horsepower") or 200
    seats = car.get("seats") or 5
    fuel = (car.get("fuel_type") or "").lower()

    if priority == "luxury":
        return _luxury(car, "high", "high")
    if priority == "performance":
        s = 40 + (50 if hp >= 450 else 30 if hp >= 300 else 0)
        s += 20 if cat in ("sports", "supercar", "coupe") else 0
        return min(100, s)
    if priority == "space":
        s = 40 + (50 if seats >= 7 else 25 if seats >= 5 else 0)
        s += 15 if cat in ("suv", "minivan") else 0
        return min(100, s)
    if priority == "efficiency":
        s = 40 + (60 if fuel == "electric" else 45 if fuel == "hybrid" else 0)
        return min(100, s)
    return 50


def _environment(car: dict, env: str) -> float:
    cat = (car.get("category") or "").lower()
    hp = car.get("horsepower") or 200
    fuel = (car.get("fuel_type") or "").lower()

    if env == "city":
        if cat in ("hatchback", "sedan", "compact", "electric"):
            return 100
        if fuel in ("hybrid", "electric"):
            return 90
        return 70 if cat == "suv" and hp <= 450 else 45
    if env == "highway":
        if cat in ("luxury", "sedan", "suv") and hp >= 250:
            return 100
        return 85 if hp >= 350 else 60
    if fuel in ("hybrid", "electric") or cat in ("sedan", "suv", "luxury"):
        return 80
    return 60


REASON_TEXT = {
    "budget": "fits the budget band you selected",
    "lifestyle": "suits your {lifestyle} lifestyle",
    "family_size": "has enough seating for {family_size} people",
    "driving_style": "matches your {driving_style} driving style",
    "fuel_preference": "runs on your preferred {fuel_preference} fuel",
    "luxury_features": "delivers the comfort and tech level you asked for",
    "priority": "is strong on your top priority ({priority})",
    "environment": "is well suited to {city_highway} driving",
}


def _explain(breakdown: Dict[str, float], answers: dict) -> Tuple[List[str], List[str]]:
    reasons: List[str] = []
    concerns: List[str] = []
    for key, value in breakdown.items():
        text = REASON_TEXT[key].format(**answers)
        if value >= 80:
            reasons.append(text.capitalize())
        elif value <= 40:
            concerns.append(f"Weaker match: {text}")
    if not reasons:
        reasons.append("A reasonable all-round option from current inventory")
    return reasons[:4], concerns[:3]


def score_car(car: dict, answers: dict) -> dict:
    breakdown: Dict[str, float] = {
        "budget": _budget(car, answers["budget_range"]),
        "lifestyle": _lifestyle(car, answers["lifestyle"]),
        "family_size": _family(car, answers.get("family_size", 5)),
        "driving_style": _driving(car, answers.get("driving_style", "balanced")),
        "fuel_preference": _fuel(car, answers.get("fuel_preference", "gasoline")),
        "luxury_features": _luxury(
            car, answers.get("luxury_importance", "medium"), answers.get("tech_importance", "medium")
        ),
        "priority": _priority(car, answers["priority"]),
        "environment": _environment(car, answers.get("city_highway", "both")),
    }

    total = sum(breakdown[k] * WEIGHTS[k] for k in WEIGHTS)
    reasons, concerns = _explain(breakdown, answers)

    return {
        "car_id": car["id"],
        "score": int(round(max(0.0, min(100.0, total)))),
        "breakdown": {k: round(v, 1) for k, v in breakdown.items()},
        "reasons": reasons,
        "concerns": concerns,
    }

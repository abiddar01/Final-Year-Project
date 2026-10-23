"""
SmartAuto AI — Lifestyle-to-Car Recommendation Service
======================================================

A small FastAPI service that scores cars against a user's lifestyle answers.

IMPORTANT / ACADEMIC HONESTY:
This is a deterministic, rule-based weighted scoring engine. It is NOT machine
learning — there is no training data, no model and no learned parameters.
Every weight below is hand-authored and every score is explainable.

Run locally:
    pip install -r requirements.txt
    uvicorn app.main:app --reload --port 8000

Endpoint:
    POST /recommend   -> ranked recommendations with reasons
    GET  /health      -> liveness probe
"""

from __future__ import annotations

from typing import Dict, List, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .scoring import ENGINE_VERSION, WEIGHTS, score_car

app = FastAPI(title="SmartAuto AI Recommendation Service", version=ENGINE_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class Car(BaseModel):
    id: str
    name: str
    brand: str
    category: str
    fuel_type: str
    price: float = 0                     # USD, as stored by the app
    seats: Optional[int] = 5
    horsepower: Optional[int] = None
    engine_size: Optional[int] = None
    availability_type: str = "in_showroom"
    features: List[str] = Field(default_factory=list)
    description: Optional[str] = None


class Answers(BaseModel):
    lifestyle: str
    budget_range: str
    priority: str
    family_size: int = 5
    driving_style: str = "balanced"
    fuel_preference: str = "gasoline"
    city_highway: str = "both"
    luxury_importance: str = "medium"
    tech_importance: str = "medium"


class RecommendRequest(BaseModel):
    answers: Answers
    cars: List[Car]
    limit: int = 4


class Recommendation(BaseModel):
    car_id: str
    score: int                       # normalized 0-100
    breakdown: Dict[str, float]      # per-criterion normalized 0-100
    reasons: List[str]
    concerns: List[str]


class RecommendResponse(BaseModel):
    engine: str = "python-rule-based"
    engine_version: str = ENGINE_VERSION
    weights: Dict[str, float] = WEIGHTS
    recommendations: List[Recommendation]


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "engine_version": ENGINE_VERSION}


@app.post("/recommend", response_model=RecommendResponse)
def recommend(payload: RecommendRequest) -> RecommendResponse:
    answers = payload.answers.model_dump()

    candidates = [c for c in payload.cars if c.availability_type != "sold_out"]
    scored = [score_car(c.model_dump(), answers) for c in candidates]
    scored.sort(key=lambda r: r["score"], reverse=True)

    top = scored[: max(1, min(payload.limit, 10))]
    return RecommendResponse(recommendations=[Recommendation(**r) for r in top])

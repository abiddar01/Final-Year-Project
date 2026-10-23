# SmartAuto AI — Recommendation Service (Python / FastAPI)

Lifestyle-to-car recommendation engine used by the SmartAuto AI web app.

> **Not machine learning.** This is a deterministic, rule-based weighted scoring
> engine. Weights are hand-authored in `app/scoring.py`, there is no training
> data or learned model, and every score is fully explainable.

## Run locally

```bash
cd python-services/recommendation-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## API

### `GET /health`
```json
{ "status": "ok", "engine_version": "1.0.0" }
```

### `POST /recommend`
Request:
```json
{
  "limit": 4,
  "answers": {
    "lifestyle": "family",
    "budget_range": "2cr_5cr",
    "priority": "space",
    "family_size": 6,
    "driving_style": "calm",
    "fuel_preference": "hybrid",
    "city_highway": "city",
    "luxury_importance": "medium",
    "tech_importance": "high"
  },
  "cars": [
    { "id": "uuid", "name": "Toyota Fortuner", "brand": "Toyota", "category": "suv",
      "fuel_type": "diesel", "price": 60000, "seats": 7, "horsepower": 201,
      "availability_type": "in_showroom", "features": ["Leather seats", "360 camera"] }
  ]
}
```

Response:
```json
{
  "engine": "python-rule-based",
  "engine_version": "1.0.0",
  "weights": { "budget": 0.25, "lifestyle": 0.18, "...": 0 },
  "recommendations": [
    { "car_id": "uuid", "score": 84,
      "breakdown": { "budget": 100.0, "lifestyle": 100.0 },
      "reasons": ["Fits the budget band you selected"],
      "concerns": [] }
  ]
}
```

## Scoring model

| Criterion        | Weight |
| ---------------- | ------ |
| Budget           | 0.25   |
| Lifestyle        | 0.18   |
| Luxury & tech    | 0.15   |
| Family size      | 0.12   |
| Driving style    | 0.12   |
| Fuel preference  | 0.08   |
| Top priority     | 0.05   |
| Driving environment | 0.05 |

Each criterion returns a normalized 0–100 sub-score; the final score is the
weighted average, so it is always 0–100 and comparable across cars.
Sub-scores ≥ 80 become "reasons", sub-scores ≤ 40 become "concerns".

## Connecting the web app

The frontend calls this service through `src/services/recommendationService.ts`.
Set the base URL and it is used automatically:

```
VITE_RECOMMENDATION_API_URL=https://your-service.example.com
```

If the variable is unset, or the service is unreachable / errors out, the app
falls back to the equivalent TypeScript engine in `src/lib/matchingEngine.ts`
so the feature never breaks for the user.

### Node/Express proxy (optional)

If you front the Python service with Express, expose `POST /api/recommend`
and forward the body unchanged to `POST {PY_SERVICE}/recommend`; point
`VITE_RECOMMENDATION_API_URL` at the Express origin instead.

## Deploy

Any container host works (Render, Railway, Fly.io, Azure App Service):

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

/**
 * Recommendation service layer.
 *
 * Primary source: the Python (FastAPI) rule-based scoring engine in
 * `python-services/recommendation-service`, reached via
 * `VITE_RECOMMENDATION_API_URL` (optionally through a Node/Express proxy).
 *
 * Fallback: the equivalent TypeScript engine in `src/lib/matchingEngine.ts`,
 * so the feature keeps working when the service is not deployed or is down.
 *
 * Neither engine is machine learning — both are deterministic weighted
 * rule-based scoring with explainable reasons.
 */

import type { Car, QuizAnswer } from "@/lib/types";
import { calculateMatch, type ScoreBreakdown } from "@/lib/matchingEngine";

const API_BASE = (import.meta.env.VITE_RECOMMENDATION_API_URL as string | undefined)?.replace(/\/$/, "");
const TIMEOUT_MS = 8000;

export type RecommendationEngine = "python-rule-based" | "local-rule-based";

export interface Recommendation {
  car: Car;
  score: number;
  breakdown: ScoreBreakdown;
  reasons: string[];
  concerns: string[];
}

export interface RecommendationResult {
  engine: RecommendationEngine;
  /** Set when the remote engine was configured but could not be used. */
  fallbackReason?: string;
  recommendations: Recommendation[];
}

interface RemoteRecommendation {
  car_id: string;
  score: number;
  breakdown: Record<string, number>;
  reasons: string[];
  concerns: string[];
}

function toBreakdown(b: Record<string, number>, total: number): ScoreBreakdown {
  return {
    budget: b.budget ?? 0,
    lifestyle: b.lifestyle ?? 0,
    familySize: b.family_size ?? 0,
    drivingStyle: b.driving_style ?? 0,
    fuelPreference: b.fuel_preference ?? 0,
    luxuryFeatures: b.luxury_features ?? 0,
    priority: b.priority ?? 0,
    environment: b.environment ?? 0,
    total,
  };
}

function localRecommend(cars: Car[], answers: QuizAnswer, limit: number): Recommendation[] {
  return cars
    .filter((c) => (c.availability_type || "in_showroom") !== "sold_out")
    .map((car) => {
      const breakdown = calculateMatch(car, answers);
      const entries: [keyof ScoreBreakdown, string][] = [
        ["budget", "Fits the budget band you selected"],
        ["lifestyle", `Suits your ${answers.lifestyle} lifestyle`],
        ["familySize", `Has enough seating for ${answers.family_size} people`],
        ["drivingStyle", `Matches your ${answers.driving_style} driving style`],
        ["fuelPreference", `Runs on your preferred ${answers.fuel_preference} fuel`],
        ["luxuryFeatures", "Delivers the comfort and tech level you asked for"],
        ["priority", `Is strong on your top priority (${answers.priority})`],
        ["environment", `Is well suited to ${answers.city_highway} driving`],
      ];
      const reasons = entries.filter(([k]) => (breakdown[k] as number) >= 80).map(([, t]) => t).slice(0, 4);
      const concerns = entries
        .filter(([k]) => (breakdown[k] as number) <= 40)
        .map(([, t]) => `Weaker match: ${t.charAt(0).toLowerCase()}${t.slice(1)}`)
        .slice(0, 3);
      return {
        car,
        score: breakdown.total,
        breakdown,
        reasons: reasons.length ? reasons : ["A reasonable all-round option from current inventory"],
        concerns,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

async function remoteRecommend(cars: Car[], answers: QuizAnswer, limit: number): Promise<Recommendation[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        limit,
        answers,
        cars: cars.map((c) => ({
          id: c.id,
          name: c.name,
          brand: c.brand,
          category: c.category,
          fuel_type: c.fuel_type,
          price: c.price,
          seats: c.seats,
          horsepower: c.horsepower,
          engine_size: c.engine_size,
          availability_type: c.availability_type,
          features: c.features ?? [],
          description: c.description,
        })),
      }),
    });

    if (!res.ok) throw new Error(`Recommendation service returned ${res.status}`);

    const data = (await res.json()) as { recommendations?: RemoteRecommendation[] };
    const byId = new Map(cars.map((c) => [c.id, c]));

    const mapped = (data.recommendations ?? [])
      .map((r) => {
        const car = byId.get(r.car_id);
        if (!car) return null;
        return {
          car,
          score: r.score,
          breakdown: toBreakdown(r.breakdown ?? {}, r.score),
          reasons: r.reasons ?? [],
          concerns: r.concerns ?? [],
        } as Recommendation;
      })
      .filter((r): r is Recommendation => r !== null);

    if (mapped.length === 0) throw new Error("Recommendation service returned no usable results");
    return mapped;
  } finally {
    clearTimeout(timer);
  }
}

export async function getRecommendations(
  cars: Car[],
  answers: QuizAnswer,
  limit = 4
): Promise<RecommendationResult> {
  if (cars.length === 0) {
    return { engine: "local-rule-based", recommendations: [] };
  }

  if (API_BASE) {
    try {
      const recommendations = await remoteRecommend(cars, answers, limit);
      return { engine: "python-rule-based", recommendations };
    } catch (err) {
      const reason = err instanceof Error ? err.message : "Recommendation service unavailable";
      return {
        engine: "local-rule-based",
        fallbackReason: reason,
        recommendations: localRecommend(cars, answers, limit),
      };
    }
  }

  return { engine: "local-rule-based", recommendations: localRecommend(cars, answers, limit) };
}

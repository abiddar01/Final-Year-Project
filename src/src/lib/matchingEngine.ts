import type { Car, QuizAnswer } from "@/lib/types";

export interface ScoreBreakdown {
  budget: number;
  lifestyle: number;
  familySize: number;
  drivingStyle: number;
  fuelPreference: number;
  luxuryFeatures: number;
  priority: number;
  environment: number;
  total: number;
}

// Pakistani market priority brands
const pkBrands = ["mercedes", "bmw", "toyota", "lexus", "porsche", "range rover", "land rover", "audi"];

const WEIGHTS = {
  budget: 0.25,
  lifestyle: 0.18,
  familySize: 0.12,
  drivingStyle: 0.12,
  fuelPreference: 0.08,
  luxuryFeatures: 0.15,
  priority: 0.05,
  environment: 0.05,
};

function scoreBudget(car: Car, answer: string): number {
  const pkr = car.price * 280;
  const budgetMap: Record<string, [number, number]> = {
    under_2cr: [0, 20000000],
    "2cr_5cr": [20000000, 50000000],
    "5cr_10cr": [50000000, 100000000],
    over_10cr: [100000000, Infinity],
  };
  const [min, max] = budgetMap[answer] ?? [0, Infinity];
  if (pkr >= min && pkr <= max) return 100;
  if (pkr >= min * 0.7 && pkr <= max * 1.3) return 60;
  if (pkr >= min * 0.5 && pkr <= max * 1.5) return 30;
  return 10;
}

function scoreLifestyle(car: Car, lifestyle: string): number {
  const map: Record<string, string[]> = {
    urban: ["sedan", "hatchback", "compact", "electric"],
    adventure: ["suv", "truck", "crossover"],
    family: ["suv", "minivan", "sedan", "crossover"],
    luxury: ["luxury", "sedan", "coupe"],
    sporty: ["sports", "coupe", "supercar"],
    eco: ["electric", "hybrid", "hatchback"],
    executive: ["luxury", "sedan"],
  };
  const cat = car.category.toLowerCase();
  if (map[lifestyle]?.includes(cat)) return 100;
  // Partial match for luxury-adjacent
  if (lifestyle === "executive" && (car.features?.some(f => f.toLowerCase().includes("leather")) || car.price > 80000)) return 70;
  return 20;
}

function scoreFamilySize(car: Car, size: number): number {
  const seats = car.seats ?? 5;
  if (seats >= size) return 100;
  if (seats >= size - 1) return 60;
  return 20;
}

function scoreDrivingStyle(car: Car, style: string): number {
  const hp = car.horsepower ?? 200;
  if (style === "aggressive" && hp > 400) return 100;
  if (style === "aggressive" && hp > 250) return 70;
  if (style === "balanced" && hp >= 150 && hp <= 400) return 100;
  if (style === "calm" && hp <= 300) return 100;
  if (style === "calm" && hp > 300) return 50;
  return 50;
}

function scoreFuelPref(car: Car, pref: string): number {
  if (car.fuel_type.toLowerCase() === pref) return 100;
  if (pref === "hybrid" && car.fuel_type.toLowerCase() === "electric") return 70;
  if (pref === "electric" && car.fuel_type.toLowerCase() === "hybrid") return 70;
  return 20;
}

function scorePriority(car: Car, priority: string): number {
  const cat = car.category.toLowerCase();
  const hp = car.horsepower ?? 200;
  const seats = car.seats ?? 5;
  const feats = car.features ?? [];

  switch (priority) {
    case "luxury":
      return scoreLuxury(car, "high", "high");
    case "performance": {
      let s = 40;
      if (hp >= 450) s += 50;
      else if (hp >= 300) s += 30;
      if (["sports", "supercar", "coupe"].includes(cat)) s += 20;
      return Math.min(100, s);
    }
    case "space": {
      let s = 40;
      if (seats >= 7) s += 50;
      else if (seats >= 5) s += 25;
      if (cat === "suv" || cat === "minivan") s += 15;
      return Math.min(100, s);
    }
    case "efficiency": {
      let s = 40;
      const fuel = car.fuel_type.toLowerCase();
      if (fuel === "electric") s += 60;
      else if (fuel === "hybrid") s += 45;
      if (feats.some((f) => f.toLowerCase().includes("start/stop"))) s += 10;
      return Math.min(100, s);
    }
    default:
      return 50;
  }
}

function scoreEnvironment(car: Car, env: string): number {
  const cat = car.category.toLowerCase();
  const hp = car.horsepower ?? 200;
  const fuel = car.fuel_type.toLowerCase();

  if (env === "city") {
    if (["hatchback", "sedan", "compact", "electric"].includes(cat)) return 100;
    if (fuel === "hybrid" || fuel === "electric") return 90;
    if (cat === "suv" && hp <= 450) return 70;
    return 45;
  }

  if (env === "highway") {
    if (["luxury", "sedan", "suv"].includes(cat) && hp >= 250) return 100;
    if (hp >= 350) return 85;
    return 60;
  }

  // both / unknown
  if (fuel === "hybrid" || fuel === "electric") return 80;
  if (["sedan", "suv", "luxury"].includes(cat)) return 80;
  return 60;
}

function scoreLuxury(car: Car, luxuryImportance: string, techImportance: string): number {
  let s = 50;
  const feats = car.features ?? [];
  const luxFeats = feats.filter(f => {
    const fl = f.toLowerCase();
    return fl.includes("leather") || fl.includes("premium") || fl.includes("panoramic") || fl.includes("heated") || fl.includes("massage") || fl.includes("wood") || fl.includes("ambient");
  }).length;
  const techFeats = feats.filter(f => {
    const fl = f.toLowerCase();
    return fl.includes("digital") || fl.includes("screen") || fl.includes("camera") || fl.includes("sensor") || fl.includes("assist") || fl.includes("display") || fl.includes("navigation");
  }).length;

  if (luxuryImportance === "high" && luxFeats >= 2) s += 30;
  if (luxuryImportance === "high" && car.price > 60000) s += 20;
  if (techImportance === "high" && techFeats >= 2) s += 20;
  if (techImportance === "medium" && techFeats >= 1) s += 10;

  return Math.min(100, s);
}

export function calculateMatch(car: Car, answers: QuizAnswer): ScoreBreakdown {
  const budget = scoreBudget(car, answers.budget_range);
  const lifestyle = scoreLifestyle(car, answers.lifestyle);
  const familySize = scoreFamilySize(car, answers.family_size);
  const drivingStyle = scoreDrivingStyle(car, answers.driving_style);
  const fuelPreference = scoreFuelPref(car, answers.fuel_preference);
  const luxuryFeatures = scoreLuxury(car, answers.luxury_importance, answers.tech_importance);
  const priority = scorePriority(car, answers.priority);
  const environment = scoreEnvironment(car, answers.city_highway);

  // Boost for Pakistan-common brands
  let brandBoost = 0;
  if (pkBrands.some((b) => car.brand.toLowerCase().includes(b))) brandBoost = 4;

  const total = Math.min(
    100,
    Math.round(
      budget * WEIGHTS.budget +
        lifestyle * WEIGHTS.lifestyle +
        familySize * WEIGHTS.familySize +
        drivingStyle * WEIGHTS.drivingStyle +
        fuelPreference * WEIGHTS.fuelPreference +
        luxuryFeatures * WEIGHTS.luxuryFeatures +
        priority * WEIGHTS.priority +
        environment * WEIGHTS.environment +
        brandBoost,
    ),
  );

  return { budget, lifestyle, familySize, drivingStyle, fuelPreference, luxuryFeatures, priority, environment, total };
}

export function generateExplanation(car: Car, breakdown: ScoreBreakdown, answers: QuizAnswer): string {
  const parts: string[] = [];

  if (breakdown.budget >= 80) parts.push("fits well within your budget");
  if (breakdown.lifestyle >= 80) parts.push(`matches your ${answers.lifestyle} lifestyle`);
  if (breakdown.priority >= 80) parts.push("aligns with your top priority");
  if (breakdown.environment >= 80) parts.push("fits your city/highway driving needs");
  if (breakdown.familySize >= 80) parts.push("offers adequate seating for your family");
  if (breakdown.drivingStyle >= 80) parts.push(`suits your ${answers.driving_style} driving preference`);
  if (breakdown.fuelPreference >= 80) parts.push(`runs on your preferred ${answers.fuel_preference} fuel`);
  if (breakdown.luxuryFeatures >= 80) parts.push("delivers the luxury and tech features you value");

  if (parts.length === 0) parts.push("is a solid option worth considering");

  const joined =
    parts.length > 1 ? parts.slice(0, -1).join(", ") + " and " + parts[parts.length - 1] : parts[0];

  return `The ${car.name} ${joined}. ${car.description ? car.description.slice(0, 120) + (car.description.length > 120 ? "..." : "") : ""}`;
}

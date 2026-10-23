import type { Car, QuizAnswer } from "@/lib/types";
import type { ScoreBreakdown } from "@/lib/matchingEngine";

export interface LifestyleProfile {
  title: string;
  tagline: string;
  emoji: string;
  traits: string[];
  idealCarTraits: string[];
}

export function buildLifestyleProfile(answers: QuizAnswer): LifestyleProfile {
  const traits: string[] = [];
  const idealCarTraits: string[] = [];

  // Lifestyle-driven title
  let title = "Versatile Driver";
  let emoji = "🚗";
  let tagline = "Balanced needs across daily and weekend driving";

  switch (answers.lifestyle) {
    case "family":
      title = "Family Driver";
      emoji = "👨‍👩‍👧";
      tagline = "Safety, space and dependable comfort come first";
      idealCarTraits.push("Spacious interior", "Top safety scores", "Comfortable ride");
      break;
    case "urban":
      title = "City Commuter";
      emoji = "🏙️";
      tagline = "Easy parking, smart tech and effortless daily driving";
      idealCarTraits.push("Compact footprint", "Efficient drivetrain", "Smart connectivity");
      break;
    case "adventure":
      title = "Weekend Explorer";
      emoji = "🏔️";
      tagline = "Built for road trips, rough terrain and the unknown";
      idealCarTraits.push("All-wheel drive", "Ground clearance", "Cargo capacity");
      break;
    case "executive":
      title = "Business Executive";
      emoji = "💼";
      tagline = "Prestige, comfort and a refined arrival";
      idealCarTraits.push("Premium cabin", "Quiet ride", "Brand prestige");
      break;
    case "sporty":
      title = "Performance Enthusiast";
      emoji = "🏁";
      tagline = "Power, precision and the thrill of the drive";
      idealCarTraits.push("Strong horsepower", "Sharp handling", "Sport tuning");
      break;
    case "eco":
      title = "Eco-Conscious Driver";
      emoji = "🌿";
      tagline = "Lower emissions without giving up comfort";
      idealCarTraits.push("Hybrid or electric", "Low running cost", "Modern tech");
      break;
  }

  // Budget tier
  switch (answers.budget_range) {
    case "under_2cr":
      traits.push("Smart budget under PKR 2 Cr");
      break;
    case "2cr_5cr":
      traits.push("Mid-luxury budget PKR 2-5 Cr");
      break;
    case "5cr_10cr":
      traits.push("Premium budget PKR 5-10 Cr");
      break;
    case "over_10cr":
      traits.push("Ultra-luxury PKR 10 Cr+");
      break;
  }

  // Family size
  if (answers.family_size >= 6) traits.push("Large group / family of 5+");
  else if (answers.family_size >= 4) traits.push("Small family driver");
  else traits.push("Solo or couple");

  // Driving style
  if (answers.driving_style === "aggressive") traits.push("Sporty driver");
  else if (answers.driving_style === "calm") traits.push("Relaxed driver");
  else traits.push("Balanced driver");

  // Environment
  if (answers.city_highway === "city") traits.push("Mostly city driving");
  else if (answers.city_highway === "highway") traits.push("Highway cruiser");
  else traits.push("Mixed city + highway");

  // Fuel
  if (answers.fuel_preference === "electric") traits.push("EV-ready");
  else if (answers.fuel_preference === "hybrid") traits.push("Hybrid-friendly");
  else if (answers.fuel_preference === "diesel") traits.push("Prefers diesel");
  else traits.push("Prefers petrol");

  // Luxury / tech
  if (answers.luxury_importance === "high") traits.push("High luxury expectations");
  if (answers.tech_importance === "high") traits.push("Tech-forward");

  return { title, tagline, emoji, traits, idealCarTraits };
}

/**
 * Build a richer, advisor-style explanation grounded in the actual car's data
 * and the user's answers.
 */
export function buildAdvisorExplanation(
  car: Car,
  breakdown: ScoreBreakdown,
  answers: QuizAnswer,
  profile: LifestyleProfile
): string {
  const reasons: string[] = [];

  // Budget reasoning
  if (breakdown.budget >= 80) {
    reasons.push(`it sits comfortably inside your ${profile.title.toLowerCase()} budget`);
  } else if (breakdown.budget >= 60) {
    reasons.push("it is close to your budget range and worth stretching for");
  }

  // Lifestyle / category reasoning
  const cat = car.category?.toLowerCase() ?? "";
  if (answers.lifestyle === "family" && (cat === "suv" || cat === "minivan" || (car.seats ?? 5) >= 6)) {
    reasons.push(`the ${car.seats ?? 5}-seat ${cat} layout gives your family room to breathe`);
  } else if (answers.lifestyle === "urban" && ["sedan", "hatchback", "compact", "electric"].includes(cat)) {
    reasons.push("its compact footprint makes daily city driving and parking easy");
  } else if (answers.lifestyle === "adventure" && (cat === "suv" || cat === "truck" || cat === "crossover")) {
    reasons.push("the higher stance and cargo space suit weekend trips and rougher roads");
  } else if (answers.lifestyle === "executive" && (cat === "luxury" || cat === "sedan")) {
    reasons.push("the refined cabin and silent ride make every arrival feel deliberate");
  } else if (answers.lifestyle === "sporty" && (car.horsepower ?? 0) >= 350) {
    reasons.push(`${car.horsepower} hp delivers the performance edge you wanted`);
  } else if (answers.lifestyle === "eco" && ["electric", "hybrid"].includes(car.fuel_type?.toLowerCase())) {
    reasons.push(`the ${car.fuel_type.toLowerCase()} drivetrain keeps running costs and emissions low`);
  }

  // Driving environment
  if (answers.city_highway === "highway" && (car.horsepower ?? 0) >= 250) {
    reasons.push("it cruises confidently on long highway runs");
  } else if (answers.city_highway === "city" && ((car.fuel_type === "hybrid" || car.fuel_type === "electric") || (car.horsepower ?? 0) <= 250)) {
    reasons.push("efficiency and easy maneuvering shine in city traffic");
  }

  // Fuel preference
  if (car.fuel_type?.toLowerCase() === answers.fuel_preference) {
    reasons.push(`it runs on your preferred ${car.fuel_type.toLowerCase()}`);
  }

  // Luxury / tech
  const feats = car.features ?? [];
  if (answers.luxury_importance === "high" && feats.length >= 2) {
    reasons.push(`premium touches like ${feats.slice(0, 2).join(" and ")} match your taste`);
  } else if (answers.tech_importance === "high" && feats.some((f) => /screen|digital|assist|camera/i.test(f))) {
    const tech = feats.find((f) => /screen|digital|assist|camera/i.test(f));
    if (tech) reasons.push(`modern tech like ${tech.toLowerCase()} keeps up with you`);
  }

  if (reasons.length === 0) {
    reasons.push(`it is a solid all-round option for a ${profile.title.toLowerCase()}`);
  }

  const top = reasons.slice(0, 3);
  const joined =
    top.length > 1 ? top.slice(0, -1).join(", ") + " and " + top[top.length - 1] : top[0];

  return `As a ${profile.title}, the ${car.name} works for you because ${joined}.`;
}

/** Strengths: list of short bullet phrases of WHY this car matches the user. */
export function buildStrengths(
  car: Car,
  breakdown: ScoreBreakdown,
  answers: QuizAnswer
): string[] {
  const out: string[] = [];
  if (breakdown.budget >= 80) out.push("Fits your budget comfortably");
  if (breakdown.lifestyle >= 80) out.push(`Matches your ${answers.lifestyle} lifestyle`);
  if (breakdown.familySize >= 80) out.push(`Seats ${car.seats ?? 5} — enough for your group`);
  if (breakdown.drivingStyle >= 80) out.push(`Suits a ${answers.driving_style} driving style`);
  if (breakdown.fuelPreference >= 80) out.push(`Runs on your preferred ${answers.fuel_preference}`);
  if (breakdown.environment >= 80) out.push(`Great for ${answers.city_highway} driving`);
  if (breakdown.luxuryFeatures >= 80) out.push("Delivers the luxury & tech you want");
  if (breakdown.priority >= 80) out.push("Aligns with your top priority");
  return out.slice(0, 4);
}

/** Gaps: things the user asked for that this car does NOT fully deliver. */
export function buildGaps(
  car: Car,
  breakdown: ScoreBreakdown,
  answers: QuizAnswer
): string[] {
  const out: string[] = [];
  if (breakdown.budget < 60) out.push("Sits outside your stated budget");
  if (breakdown.familySize < 60)
    out.push(`Only ${car.seats ?? 5} seats — tight for ${answers.family_size}+ people`);
  if (breakdown.fuelPreference < 60)
    out.push(`Runs on ${car.fuel_type}, not your preferred ${answers.fuel_preference}`);
  if (breakdown.lifestyle < 60) out.push(`Not the typical pick for an ${answers.lifestyle} lifestyle`);
  if (breakdown.environment < 60) out.push(`Less ideal for mostly ${answers.city_highway} driving`);
  if (breakdown.luxuryFeatures < 60 && answers.luxury_importance === "high")
    out.push("Lighter on premium cabin features than you'd like");
  if (breakdown.drivingStyle < 60)
    out.push(`Power profile may not suit a ${answers.driving_style} driver`);
  return out.slice(0, 3);
}

export function buildBestFor(car: Car): string[] {
  const tags: string[] = [];
  const cat = car.category?.toLowerCase() ?? "";
  const seats = car.seats ?? 5;
  const hp = car.horsepower ?? 0;
  const fuel = car.fuel_type?.toLowerCase() ?? "";

  if (seats >= 7 || cat === "minivan") tags.push("Large families");
  if (cat === "suv" || cat === "crossover") tags.push("Road trips");
  if (hp >= 450) tags.push("Thrill seekers");
  if (cat === "luxury" || cat === "sedan") tags.push("Executive comfort");
  if (fuel === "electric" || fuel === "hybrid") tags.push("Eco-minded buyers");
  if (cat === "hatchback" || cat === "compact") tags.push("City commutes");
  return tags.slice(0, 3);
}

export function buildNotIdealFor(car: Car, answers?: QuizAnswer): string[] {
  const tags: string[] = [];
  const cat = car.category?.toLowerCase() ?? "";
  const seats = car.seats ?? 5;
  const hp = car.horsepower ?? 0;

  if (seats <= 4) tags.push("Large families");
  if (cat === "supercar" || cat === "sports") tags.push("Daily city errands");
  if (hp >= 500) tags.push("Strict fuel budgets");
  if (cat === "hatchback" || cat === "compact") tags.push("Long highway hauls");
  return tags.slice(0, 3);
}

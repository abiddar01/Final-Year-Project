/**
 * Constrained negotiation engine (deterministic business logic).
 *
 * The AI layer NEVER decides pricing. This module owns every decision:
 * accept / counter / final offer / reject / escalate, and the exact rupee
 * figure that may be offered. The AI only phrases the decision.
 */
import type { Car } from "@/lib/types";
import { PKR_RATE, formatPKRShort } from "@/lib/importDuty";

export type NegotiationStrategy = "conservative" | "balanced" | "aggressive";

export type NegotiationStatus =
  | "OPENING"
  | "NEGOTIATING"
  | "COUNTER_OFFER"
  | "FINAL_OFFER"
  | "ACCEPTED"
  | "REJECTED"
  | "ESCALATED";

export type NegotiationAction =
  | "OPENING"
  | "ACCEPT"
  | "COUNTER_OFFER"
  | "FINAL_OFFER"
  | "REJECT"
  | "REJECT_TOO_LOW"
  | "ESCALATE"
  | "REQUEST_OFFER"
  | "OFF_TOPIC";

/** Internal pricing rules for one vehicle. Never send min/target to the customer UI. */
export interface NegotiationConfig {
  enabled: boolean;
  listedPrice: number;
  idealSellingPrice: number;
  targetAcceptancePrice: number;
  absoluteMinimumPrice: number;
  maxDiscountPercent: number;
  maxRounds: number;
  strategy: NegotiationStrategy;
  incentives: string[];
}

export interface NegotiationState {
  config: NegotiationConfig;
  round: number;
  customerOffer: number | null;
  previousCustomerOffer: number | null;
  currentCounterOffer: number;
  status: NegotiationStatus;
}

export interface NegotiationDecision {
  action: NegotiationAction;
  status: NegotiationStatus;
  round: number;
  customerOffer: number | null;
  /** The only price the AI is allowed to quote. Null when no price may be quoted. */
  allowedQuotePrice: number | null;
  /** Lowest figure worth submitting, shown when an offer is far too low. */
  suggestedMinimumOffer: number | null;
  incentivesOffered: string[];
  /** Deterministic wording used when the AI layer is unavailable. */
  fallbackText: string;
  /** Short internal note for the AI layer (never shown to the customer). */
  reason: string;
  closed: boolean;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);
const round1k = (n: number) => Math.round(n / 100000) * 100000;
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export const INCENTIVE_OPTIONS = [
  "Free registration",
  "Window tint",
  "First free service",
  "Free delivery",
  "Accessories package",
];

/** Concession share of the remaining gap, per round, per strategy. */
const CONCESSION: Record<NegotiationStrategy, number[]> = {
  conservative: [0.3, 0.22, 0.15, 0.08, 0.05],
  balanced: [0.42, 0.3, 0.18, 0.1, 0.05],
  aggressive: [0.55, 0.38, 0.22, 0.12, 0.06],
};

/** Build the pricing rules for a car, using admin values when set and safe defaults otherwise. */
export function getNegotiationConfig(car: Car): NegotiationConfig {
  const c = car as Car & Record<string, unknown>;
  const listedPrice = num(car.price) * PKR_RATE;

  const ideal = num(c.ideal_price_pkr) || listedPrice * 0.95;
  const target = num(c.target_price_pkr) || listedPrice * 0.9;
  const minimum = num(c.min_price_pkr) || listedPrice * 0.86;

  const maxDiscountPercent = num(c.max_discount_percent) || 12;
  const discountFloor = listedPrice * (1 - maxDiscountPercent / 100);

  // Enforce a coherent ladder: listed >= ideal >= target >= minimum >= discount floor.
  const absoluteMinimumPrice = clamp(Math.max(minimum, discountFloor), 0, listedPrice);
  const targetAcceptancePrice = clamp(target, absoluteMinimumPrice, listedPrice);
  const idealSellingPrice = clamp(ideal, targetAcceptancePrice, listedPrice);

  const strategyRaw = String(c.negotiation_strategy ?? "balanced").toLowerCase();
  const strategy: NegotiationStrategy =
    strategyRaw === "conservative" || strategyRaw === "aggressive" ? strategyRaw : "balanced";

  return {
    enabled: c.negotiation_enabled !== false,
    listedPrice,
    idealSellingPrice,
    targetAcceptancePrice,
    absoluteMinimumPrice,
    maxDiscountPercent,
    maxRounds: Math.max(1, Math.round(num(c.max_negotiation_rounds) || 5)),
    strategy,
    incentives: Array.isArray(c.allowed_incentives) ? (c.allowed_incentives as string[]) : [],
  };
}

export function createSession(car: Car): NegotiationState {
  const config = getNegotiationConfig(car);
  return {
    config,
    round: 0,
    customerOffer: null,
    previousCustomerOffer: null,
    currentCounterOffer: config.listedPrice,
    status: "OPENING",
  };
}

/* --------------------------- price extraction --------------------------- */

/**
 * Extract a PKR offer from natural language.
 * Understands crore / cr / lakh / lac / million / m / k and bare numbers.
 */
export function extractCustomerOffer(text: string, listedPrice = 0): number | null {
  const t = text.toLowerCase().replace(/,/g, "");
  const matches = [...t.matchAll(/(\d+(?:\.\d+)?)\s*(crore|crores|cr|karor|lakh|lac|lakhs|million|mn|m|k|thousand)?/g)];
  const values: number[] = [];

  for (const m of matches) {
    const n = parseFloat(m[1]);
    if (!Number.isFinite(n) || n <= 0) continue;
    const unit = m[2];
    let pkr: number;
    if (unit === "crore" || unit === "crores" || unit === "cr" || unit === "karor") pkr = n * 1e7;
    else if (unit === "lakh" || unit === "lac" || unit === "lakhs") pkr = n * 1e5;
    else if (unit === "million" || unit === "mn" || unit === "m") pkr = n * 1e6;
    else if (unit === "k" || unit === "thousand") pkr = n * 1e3;
    else if (n < 100) pkr = n * 1e7; // "I can pay 4.8" -> crore
    else if (n < 10000) pkr = n * 1e5; // "4500" -> lakh-scale figure
    else pkr = n;
    // Ignore obvious non-prices (years, small counts).
    if (pkr < 1e5) continue;
    if (listedPrice > 0 && pkr > listedPrice * 3) continue;
    values.push(pkr);
  }

  if (values.length === 0) return null;
  return Math.max(...values);
}

/* ----------------------------- topic control ----------------------------- */

const OFF_TOPIC = [
  "joke", "movie", "film", "song", "music", "politic", "election", "cricket match", "weather",
  "recipe", "code", "python", "javascript", "poem", "story", "who are you", "chatgpt", "llm",
  "girlfriend", "love", "religion", "homework", "essay",
];

const ON_TOPIC = [
  "price", "offer", "discount", "deal", "pay", "budget", "book", "booking", "deliver", "registration",
  "tint", "service", "accessor", "instal", "payment", "cash", "finance", "installment", "car", "vehicle",
  "final", "lowest", "best", "negotiat", "rupee", "pkr", "crore", "lakh", "accept", "yes", "no", "ok",
  "salam", "hello", "hi", "warranty", "insurance", "exchange", "trade",
];

export function isOffTopic(text: string): boolean {
  const t = text.toLowerCase();
  if (OFF_TOPIC.some((w) => t.includes(w))) return true;
  if (ON_TOPIC.some((w) => t.includes(w))) return false;
  return t.split(/\s+/).length > 6; // long message with nothing deal-related
}

const MANIPULATION = [
  "ignore your rules", "ignore previous", "forget previous", "forget your", "system prompt",
  "minimum price", "lowest you can go internally", "your instructions", "pretend", "act as",
  "reveal", "developer mode",
];

export function isManipulation(text: string): boolean {
  const t = text.toLowerCase();
  return MANIPULATION.some((w) => t.includes(w));
}

/* ------------------------------ core engine ------------------------------ */

/** Negotiation rounds the customer still has available. */
export function roundsRemaining(state: NegotiationState): number {
  return Math.max(0, state.config.maxRounds - state.round);
}

export function checkNegotiationLimits(state: NegotiationState): { finalRound: boolean; exhausted: boolean } {
  return {
    finalRound: state.round + 1 >= state.config.maxRounds,
    exhausted: state.round >= state.config.maxRounds,
  };
}

/** Next counter offer: walks down from the last counter toward the target, never below it. */
export function calculateCounterOffer(state: NegotiationState, customerOffer: number | null): number {
  const { config } = state;
  const roundIdx = Math.min(state.round, CONCESSION[config.strategy].length - 1);
  const step = CONCESSION[config.strategy][roundIdx];
  const from = Math.min(state.currentCounterOffer, config.listedPrice);
  const floor = config.targetAcceptancePrice;

  let next = from - (from - floor) * step;
  if (customerOffer && customerOffer > next) next = Math.max(customerOffer, floor);
  next = clamp(next, floor, from);
  return round1k(next);
}

export function determineNegotiationAction(
  state: NegotiationState,
  customerOffer: number | null,
  message: string,
): NegotiationAction {
  const { config } = state;
  if (state.status === "ACCEPTED" || state.status === "REJECTED" || state.status === "ESCALATED") return "REJECT";
  if (customerOffer === null) {
    if (isOffTopic(message) && !isManipulation(message)) return "OFF_TOPIC";
    return "REQUEST_OFFER";
  }
  if (customerOffer >= config.targetAcceptancePrice) return "ACCEPT";

  // Unrealistically low offers are declined gracefully without burning a round.
  if (customerOffer < config.absoluteMinimumPrice * 0.85) return "REJECT_TOO_LOW";

  const { finalRound, exhausted } = checkNegotiationLimits(state);
  if (exhausted) {
    return customerOffer >= config.absoluteMinimumPrice ? "ESCALATE" : "REJECT";
  }
  if (finalRound) return "FINAL_OFFER";
  return "COUNTER_OFFER";
}

/** Evaluate one customer message and return the (immutable) business decision + next state. */
export function evaluateOffer(
  state: NegotiationState,
  message: string,
  carName: string,
): { decision: NegotiationDecision; state: NegotiationState } {
  const { config } = state;
  const customerOffer = extractCustomerOffer(message, config.listedPrice);
  const action = determineNegotiationAction(state, customerOffer, message);

  const next: NegotiationState = {
    ...state,
    previousCustomerOffer: state.customerOffer,
    customerOffer: customerOffer ?? state.customerOffer,
  };

  const incentives = config.incentives;
  let allowedQuotePrice: number | null = null;
  let suggestedMinimumOffer: number | null = null;
  let fallbackText = "";
  let reason = "";
  let closed = false;

  switch (action) {
    case "ACCEPT": {
      allowedQuotePrice = Math.max(customerOffer ?? 0, config.targetAcceptancePrice);
      next.status = "ACCEPTED";
      closed = true;
      fallbackText = `That works. We can proceed with ${formatPKRShort(allowedQuotePrice)} for the ${carName}, subject to the standard confirmation process. Would you like to move ahead with the booking?`;
      reason = "Offer met or exceeded the acceptance threshold.";
      break;
    }
    case "COUNTER_OFFER": {
      const counter = calculateCounterOffer(state, customerOffer);
      allowedQuotePrice = counter;
      next.round = state.round + 1;
      next.currentCounterOffer = counter;
      next.status = "COUNTER_OFFER";
      const nearRange = (customerOffer ?? 0) >= config.absoluteMinimumPrice;
      fallbackText = nearRange
        ? `I appreciate the offer of ${formatPKRShort(customerOffer ?? 0)} — you are close to a workable figure. I can bring it to ${formatPKRShort(counter)} at this stage. If you can move up slightly, we can close this quickly.`
        : `I understand you are looking for the best possible deal, but ${formatPKRShort(customerOffer ?? 0)} is well below the workable range for this vehicle. Considering its condition and current demand, I can discuss ${formatPKRShort(counter)}.`;
      reason = nearRange ? "Offer inside the working band but under target." : "Offer below the permitted floor.";
      break;
    }
    case "FINAL_OFFER": {
      const finalPrice = round1k(config.targetAcceptancePrice);
      allowedQuotePrice = finalPrice;
      next.round = state.round + 1;
      next.currentCounterOffer = finalPrice;
      next.status = "FINAL_OFFER";
      const addon = incentives.length
        ? ` I can also include ${incentives.slice(0, 2).join(" and ").toLowerCase()} as part of the package.`
        : "";
      fallbackText = `I have explored all the flexibility available on this vehicle. The best final figure I can offer is ${formatPKRShort(finalPrice)}.${addon} If that works, I would be glad to help you proceed with the booking.`;
      reason = "Final round reached; quoting the acceptance price only.";
      break;
    }
    case "ESCALATE": {
      next.status = "ESCALATED";
      closed = true;
      allowedQuotePrice = round1k(config.targetAcceptancePrice);
      fallbackText = `We are close, but I cannot move further on my own. Let me pass this to our sales manager, who can review your offer personally. Our team will contact you shortly — in the meantime, ${formatPKRShort(allowedQuotePrice)} remains the figure on the table.`;
      reason = "Rounds exhausted with the offer inside the escalation band.";
      break;
    }
    case "REJECT": {
      next.status = "REJECTED";
      closed = true;
      fallbackText = `Thank you for your time. Unfortunately, that figure is outside what we can do on this vehicle, and we have reached the end of what I can negotiate. If your budget changes, or if you would like to see other options in your range, I would be happy to help.`;
      reason = "Offer under the floor after the rounds were exhausted.";
      break;
    }
    case "REJECT_TOO_LOW": {
      suggestedMinimumOffer = round1k(config.absoluteMinimumPrice);
      next.status = "NEGOTIATING";
      fallbackText = `I appreciate your interest, but ${formatPKRShort(customerOffer ?? 0)} is unfortunately far below what we can consider for this vehicle. If you are able to start from around ${formatPKRShort(suggestedMinimumOffer)}, I would be glad to see what I can arrange for you.`;
      reason = "Offer far below the workable band; invited a realistic re-offer.";
      break;
    }
    case "OFF_TOPIC": {
      fallbackText = `I am here specifically to help with the purchase and pricing of the ${carName}. If you would like, please share the price you have in mind, or tell me which part of the deal you would like to discuss.`;
      reason = "Message unrelated to the vehicle purchase.";
      break;
    }
    case "REQUEST_OFFER":
    default: {
      next.status = state.status === "OPENING" ? "NEGOTIATING" : state.status;
      const anchor = round1k(Math.min(state.currentCounterOffer, config.listedPrice));
      allowedQuotePrice = anchor;
      fallbackText = `I would be glad to explore the best possible deal for you. The figure on the table right now is ${formatPKRShort(anchor)}. To see what flexibility is possible, what price range are you considering?`;
      reason = "No price detected in the customer message.";
      break;
    }
  }

  return {
    decision: {
      action,
      status: next.status,
      round: next.round,
      customerOffer,
      allowedQuotePrice,
      suggestedMinimumOffer,
      incentivesOffered: action === "FINAL_OFFER" || action === "COUNTER_OFFER" ? incentives : [],
      fallbackText,
      reason,
      closed,
    },
    state: next,
  };
}

/** Context handed to the AI layer. Contains no internal floor or target figures. */
export function generateNegotiationContext(
  car: Car,
  state: NegotiationState,
  decision: NegotiationDecision,
) {
  return {
    car: {
      name: car.name,
      brand: car.brand,
      year: car.year,
      listedPrice: formatPKRShort(state.config.listedPrice),
    },
    action: decision.action,
    allowedQuotePrice: decision.allowedQuotePrice ? formatPKRShort(decision.allowedQuotePrice) : null,
    suggestedMinimumOffer: decision.suggestedMinimumOffer
      ? formatPKRShort(decision.suggestedMinimumOffer)
      : null,
    customerOffer: decision.customerOffer ? formatPKRShort(decision.customerOffer) : null,
    negotiationRound: decision.round,
    maxRounds: state.config.maxRounds,
    incentives: decision.incentivesOffered,
    closed: decision.closed,
  };
}

export function openingMessage(car: Car, config: NegotiationConfig): string {
  return `Welcome, and thank you for your interest in the ${car.name}. I can assist you with the purchase terms for this vehicle. The listed price is ${formatPKRShort(config.listedPrice)}. If you are interested, please share the price you have in mind.`;
}

/** Customer-safe status label. */
export function statusLabel(status: NegotiationStatus): string {
  switch (status) {
    case "OPENING": return "Opening";
    case "NEGOTIATING": return "In discussion";
    case "COUNTER_OFFER": return "Counter offer on the table";
    case "FINAL_OFFER": return "Final offer";
    case "ACCEPTED": return "Deal agreed";
    case "REJECTED": return "Closed";
    case "ESCALATED": return "Referred to sales manager";
    default: return "In discussion";
  }
}

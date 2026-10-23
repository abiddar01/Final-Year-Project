
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
  allowedQuotePrice: number | null;
  suggestedMinimumOffer: number | null;
  incentivesOffered: string[];
  fallbackText: string;
  reason: string;
  closed: boolean;
}

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(Math.max(n, lo), hi);

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

const CONCESSION: Record<NegotiationStrategy, number[]> = {
  conservative: [0.3, 0.22, 0.15, 0.08, 0.05],
  balanced: [0.42, 0.3, 0.18, 0.1, 0.05],
  aggressive: [0.55, 0.38, 0.22, 0.12, 0.06],
};

export function getNegotiationConfig(car: Car): NegotiationConfig {
  const c = car as Car & Record<string, unknown>;
  const listedPrice = num(car.price) * PKR_RATE;

  const ideal = num(c.ideal_price_pkr) || listedPrice * 0.95;
  const target = num(c.target_price_pkr) || listedPrice * 0.9;
  const minimum = num(c.min_price_pkr) || listedPrice * 0.86;

  const maxDiscountPercent = num(c.max_discount_percent) || 12;
  const discountFloor = listedPrice * (1 - maxDiscountPercent / 100);

  const absoluteMinimumPrice = clamp(
    Math.max(minimum, discountFloor),
    0,
    listedPrice,
  );

  const targetAcceptancePrice = clamp(
    target,
    absoluteMinimumPrice,
    listedPrice,
  );

  const idealSellingPrice = clamp(
    ideal,
    targetAcceptancePrice,
    listedPrice,
  );

  const strategyRaw = String(c.negotiation_strategy ?? "balanced").toLowerCase();

  const strategy: NegotiationStrategy =
    strategyRaw === "conservative" || strategyRaw === "aggressive"
      ? strategyRaw
      : "balanced";

  return {
    enabled: c.negotiation_enabled !== false,
    listedPrice,
    idealSellingPrice,
    targetAcceptancePrice,
    absoluteMinimumPrice,
    maxDiscountPercent,
    maxRounds: Math.max(
      1,
      Math.round(num(c.max_negotiation_rounds) || 5),
    ),
    strategy,
    incentives: Array.isArray(c.allowed_incentives)
      ? (c.allowed_incentives as string[])
      : [],
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

export function extractCustomerOffer(
  text: string,
  listedPrice = 0,
): number | null {
  const t = text.toLowerCase().replace(/,/g, "");

  const matches = [
    ...t.matchAll(
      /(\d+(?:\.\d+)?)\s*(crore|crores|cr|karor|lakh|lac|lakhs|million|mn|m|k|thousand)?/g,
    ),
  ];

  const values: number[] = [];

  for (const m of matches) {
    const n = parseFloat(m[1]);
    if (!Number.isFinite(n) || n <= 0) continue;

    const unit = m[2];
    let pkr: number;

    if (
      unit === "crore" ||
      unit === "crores" ||
      unit === "cr" ||
      unit === "karor"
    ) {
      pkr = n * 1e7;
    } else if (
      unit === "lakh" ||
      unit === "lac" ||
      unit === "lakhs"
    ) {
      pkr = n * 1e5;
    } else if (
      unit === "million" ||
      unit === "mn" ||
      unit === "m"
    ) {
      pkr = n * 1e6;
    } else if (unit === "k" || unit === "thousand") {
      pkr = n * 1e3;
    } else if (n < 100) {
      pkr = n * 1e7;
    } else if (n < 10000) {
      pkr = n * 1e5;
    } else {
      pkr = n;
    }

    if (pkr < 1e5) continue;
    if (listedPrice > 0 && pkr > listedPrice * 3) continue;

    values.push(pkr);
  }

  if (values.length === 0) return null;

  return Math.max(...values);
}

/* ----------------------------- topic control ----------------------------- */

const OFF_TOPIC = [
  "joke", "movie", "film", "song", "music", "politic", "election",
  "cricket match", "weather", "recipe", "code", "python", "javascript",
  "poem", "story", "who are you", "chatgpt", "llm", "girlfriend", "love",
  "religion", "homework", "essay",
];

const ON_TOPIC = [
  "price", "offer", "discount", "deal", "pay", "budget", "book", "booking",
  "deliver", "registration", "tint", "service", "accessor", "instal",
  "payment", "cash", "finance", "installment", "car", "vehicle", "final",
  "lowest", "best", "negotiat", "rupee", "pkr", "crore", "lakh", "accept",
  "yes", "no", "ok", "salam", "hello", "hi", "warranty", "insurance",
  "exchange", "trade",
];

export function isOffTopic(text: string): boolean {
  const t = text.toLowerCase();

  if (OFF_TOPIC.some((w) => t.includes(w))) return true;
  if (ON_TOPIC.some((w) => t.includes(w))) return false;

  return t.split(/\s+/).length > 6;
}

const MANIPULATION = [
  "ignore your rules", "ignore previous", "forget previous", "forget your",
  "system prompt", "minimum price", "lowest you can go internally",
  "your instructions", "pretend", "act as", "reveal", "developer mode",
];

export function isManipulation(text: string): boolean {
  const t = text.toLowerCase();
  return MANIPULATION.some((w) => t.includes(w));
}

/* -------------------------- customer intent -------------------------- */

function isAcceptanceIntent(message: string): boolean {
  return /\b(i accept|i'll accept|i will accept|we accept|deal|deal accepted|agreed|i agree|alright i accept|okay i accept|ok i accept|sounds good|that works|yes let's proceed|yes lets proceed)\b/i.test(
    message.trim(),
  );
}

function isBestPriceRequest(message: string): boolean {
  return /\b(best price|lowest price|best offer|final price|final offer|lowest you can go|best you can do|your best price)\b/i.test(
    message,
  );
}

function isPriceObjection(message: string): boolean {
  return /\b(too high|very high|still high|expensive|can't afford|cannot afford|over my budget|out of my budget|too much)\b/i.test(
    message,
  );
}

function isRegistrationRequest(message: string): boolean {
  return /\b(free registration|include registration|registration included|registration free)\b/i.test(
    message,
  );
}

/* ------------------------------ core engine ------------------------------ */

export function roundsRemaining(state: NegotiationState): number {
  return Math.max(0, state.config.maxRounds - state.round);
}

export function checkNegotiationLimits(
  state: NegotiationState,
): { finalRound: boolean; exhausted: boolean } {
  return {
    finalRound: state.round + 1 >= state.config.maxRounds,
    exhausted: state.round >= state.config.maxRounds,
  };
}

export function calculateCounterOffer(
  state: NegotiationState,
  customerOffer: number | null,
): number {
  const { config } = state;
  const roundIdx = Math.min(
    state.round,
    CONCESSION[config.strategy].length - 1,
  );

  const step = CONCESSION[config.strategy][roundIdx];
  const from = Math.min(state.currentCounterOffer, config.listedPrice);
  const floor = config.targetAcceptancePrice;

  let next = from - (from - floor) * step;

  if (customerOffer && customerOffer > next) {
    next = Math.max(customerOffer, floor);
  }

  next = clamp(next, floor, from);

  return round1k(next);
}

export function determineNegotiationAction(
  state: NegotiationState,
  customerOffer: number | null,
  message: string,
): NegotiationAction {
  const { config } = state;

  if (
    state.status === "ACCEPTED" ||
    state.status === "REJECTED" ||
    state.status === "ESCALATED"
  ) {
    return "REJECT";
  }

  if (isManipulation(message)) {
    return "OFF_TOPIC";
  }

  if (isAcceptanceIntent(message)) {
    if (
      state.status === "COUNTER_OFFER" ||
      state.status === "FINAL_OFFER"
    ) {
      return "ACCEPT";
    }

    return "REQUEST_OFFER";
  }

  if (isBestPriceRequest(message) || isPriceObjection(message)) {
    const { finalRound, exhausted } = checkNegotiationLimits(state);

    if (exhausted) return "ESCALATE";
    if (finalRound) return "FINAL_OFFER";

    return "COUNTER_OFFER";
  }

  if (customerOffer === null) {
    if (isOffTopic(message)) return "OFF_TOPIC";
    return "REQUEST_OFFER";
  }

  if (customerOffer >= config.targetAcceptancePrice) {
    return "ACCEPT";
  }

  if (customerOffer < config.absoluteMinimumPrice * 0.85) {
    return "REJECT_TOO_LOW";
  }

  const { finalRound, exhausted } = checkNegotiationLimits(state);

  if (exhausted) {
    return customerOffer >= config.absoluteMinimumPrice
      ? "ESCALATE"
      : "REJECT";
  }

  if (finalRound) return "FINAL_OFFER";

  return "COUNTER_OFFER";
}

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
      allowedQuotePrice =
        customerOffer !== null
          ? Math.max(customerOffer, config.targetAcceptancePrice)
          : Math.max(
              state.currentCounterOffer,
              config.targetAcceptancePrice,
            );

      next.status = "ACCEPTED";
      closed = true;

      fallbackText =
        `That works. We can proceed with ${formatPKRShort(allowedQuotePrice)} ` +
        `for the ${carName}, subject to the standard confirmation process. ` +
        `Would you like to move ahead with the booking?`;

      reason = "Customer accepted an authorised offer or met the acceptance threshold.";
      break;
    }

    case "COUNTER_OFFER": {
      const counter = calculateCounterOffer(state, customerOffer);

      allowedQuotePrice = counter;
      next.round = state.round + 1;
      next.currentCounterOffer = counter;
      next.status = "COUNTER_OFFER";

      if (customerOffer !== null) {
        const nearRange = customerOffer >= config.absoluteMinimumPrice;

        fallbackText = nearRange
          ? `I appreciate your offer of ${formatPKRShort(customerOffer)}. I can offer ${formatPKRShort(counter)} at this stage. Would that work for you?`
          : `I understand you are looking for a better deal. I can offer ${formatPKRShort(counter)} for this vehicle. Would you like to discuss this figure?`;

        reason = nearRange
          ? "Offer inside the working band but under target."
          : "Customer offer below the working band; counter-offer calculated within pricing limits.";
      } else {
        fallbackText =
          `I understand you are looking for the best possible price. ` +
          `I can offer ${formatPKRShort(counter)} for the ${carName}. ` +
          `Would you like to proceed or discuss the package options?`;

        reason = "Customer requested a better price without specifying a numeric offer.";
      }

      break;
    }

    case "FINAL_OFFER": {
      const finalPrice = round1k(config.targetAcceptancePrice);

      allowedQuotePrice = finalPrice;
      next.round = state.round + 1;
      next.currentCounterOffer = finalPrice;
      next.status = "FINAL_OFFER";

      const approvedRegistration = incentives.some((item) =>
        /free registration/i.test(item),
      );

      const addon = incentives.length
        ? ` I can also discuss approved incentives such as ${incentives.slice(0, 2).join(" and ").toLowerCase()}.`
        : "";

      fallbackText =
        `I have explored the available flexibility. My best final figure is ${formatPKRShort(finalPrice)}.` +
        (approvedRegistration && isRegistrationRequest(message)
          ? " Free registration is also an approved incentive for discussion."
          : addon) +
        ` If that works, I would be glad to help you proceed with the booking.`;

      reason = "Final round reached; quoting the authorised target price only.";
      break;
    }

    case "ESCALATE": {
      next.status = "ESCALATED";
      closed = true;
      allowedQuotePrice = round1k(config.targetAcceptancePrice);

      fallbackText =
        `We are close, but I cannot move further on my own. ` +
        `Let me pass this to our sales manager for a review. ` +
        `${formatPKRShort(allowedQuotePrice)} remains the current figure on the table.`;

      reason = "Negotiation rounds exhausted; escalated for manager review.";
      break;
    }

    case "REJECT": {
      next.status = "REJECTED";
      closed = true;

      fallbackText =
        `Thank you for your time. Unfortunately, we cannot proceed with this negotiation as it stands. ` +
        `If you would like to discuss another vehicle or revisit the deal, I would be happy to help.`;

      reason = "The negotiation is already closed or the offer is outside permitted limits.";
      break;
    }

    case "REJECT_TOO_LOW": {
      suggestedMinimumOffer = round1k(config.absoluteMinimumPrice);
      next.status = "NEGOTIATING";

      fallbackText =
        `I appreciate your interest, but ${formatPKRShort(customerOffer ?? 0)} ` +
        `is unfortunately far below what we can consider for this vehicle. ` +
        `If you can offer around ${formatPKRShort(suggestedMinimumOffer)}, ` +
        `I would be glad to review it.`;

      reason = "Offer far below the workable band; invited a realistic re-offer.";
      break;
    }

    case "OFF_TOPIC": {
      fallbackText =
        `I am here specifically to help with the purchase and pricing of the ${carName}. ` +
        `Please share the price you have in mind or tell me which part of the deal you would like to discuss.`;

      reason = "Message unrelated to the vehicle purchase or a request to override negotiation rules.";
      break;
    }

    case "REQUEST_OFFER":
    default: {
      next.status =
        state.status === "OPENING" ? "NEGOTIATING" : state.status;

      const anchor = round1k(
        Math.min(state.currentCounterOffer, config.listedPrice),
      );

      allowedQuotePrice = anchor;

      if (isRegistrationRequest(message)) {
        const registrationApproved = incentives.some((item) =>
          /free registration/i.test(item),
        );

        fallbackText = registrationApproved
          ? `Free registration is an approved incentive we can discuss as part of the deal. What price range are you considering so I can assess the overall package?`
          : `I understand you would like free registration included. I cannot confirm it because it is not listed among the approved incentives. What price range are you considering?`;
      } else if (isAcceptanceIntent(message)) {
        fallbackText =
          `I would be happy to help you finalise the deal. However, we have not agreed on a specific negotiated price yet. ` +
          `What price range would you like me to consider?`;
      } else {
        fallbackText =
          `I would be glad to explore the best possible deal for you. ` +
          `The figure on the table right now is ${formatPKRShort(anchor)}. ` +
          `To see what flexibility is possible, what price range are you considering?`;
      }

      reason = "No actionable numeric offer or pending counter-offer acceptance was detected.";
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
      incentivesOffered:
        action === "FINAL_OFFER" || action === "COUNTER_OFFER"
          ? incentives
          : [],
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
    allowedQuotePrice: decision.allowedQuotePrice
      ? formatPKRShort(decision.allowedQuotePrice)
      : null,
    suggestedMinimumOffer: decision.suggestedMinimumOffer
      ? formatPKRShort(decision.suggestedMinimumOffer)
      : null,
    customerOffer: decision.customerOffer
      ? formatPKRShort(decision.customerOffer)
      : null,
    negotiationRound: decision.round,
    maxRounds: state.config.maxRounds,
    incentives: decision.incentivesOffered,
    closed: decision.closed,
  };
}

export function openingMessage(car: Car, config: NegotiationConfig): string {
  return (
    `Welcome, and thank you for your interest in the ${car.name}. ` +
    `I can assist you with the purchase terms for this vehicle. ` +
    `The listed price is ${formatPKRShort(config.listedPrice)}. ` +
    `If you are interested, please share the price you have in mind.`
  );
}

export function statusLabel(status: NegotiationStatus): string {
  switch (status) {
    case "OPENING":
      return "Opening";
    case "NEGOTIATING":
      return "In discussion";
    case "COUNTER_OFFER":
      return "Counter offer on the table";
    case "FINAL_OFFER":
      return "Final offer";
    case "ACCEPTED":
      return "Deal agreed";
    case "REJECTED":
      return "Closed";
    case "ESCALATED":
      return "Referred to sales manager";
    default:
      return "In discussion";
  }
}

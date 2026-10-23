/**
 * AI wording layer for the negotiation agent.
 *
 * The rule-based engine decides everything; this service only asks the AI to
 * phrase that decision. Any failure — or any reply that tries to quote a price
 * the engine did not authorise — falls back to the engine's own wording, so
 * the pricing boundaries can never be broken by the model.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Car } from "@/lib/types";
import {
  generateNegotiationContext,
  type NegotiationDecision,
  type NegotiationState,
} from "@/lib/negotiationEngine";

export interface AgentReply {
  text: string;
  source: "ai" | "fallback";
}

/** Rupee figures (in PKR) mentioned in a piece of text. */
function pricesIn(text: string): number[] {
  const t = text.toLowerCase().replace(/,/g, "");
  const out: number[] = [];
  for (const m of t.matchAll(/(\d+(?:\.\d+)?)\s*(crore|cr|lakh|lac|million)/g)) {
    const n = parseFloat(m[1]);
    if (!Number.isFinite(n)) continue;
    const u = m[2];
    out.push(u === "lakh" || u === "lac" ? n * 1e5 : u === "million" ? n * 1e6 : n * 1e7);
  }
  return out;
}

/** True when the reply only mentions figures the engine authorised. */
function replyIsSafe(text: string, allowed: number[]): boolean {
  const tolerance = 0.02;
  return pricesIn(text).every((p) =>
    allowed.some((a) => a > 0 && Math.abs(p - a) / a <= tolerance),
  );
}

export async function generateAgentReply(
  car: Car,
  state: NegotiationState,
  decision: NegotiationDecision,
  customerMessage: string,
  history: { role: "user" | "assistant"; content: string }[] = [],
): Promise<AgentReply> {
  const context = generateNegotiationContext(car, state, decision);
  const allowed = [
    decision.allowedQuotePrice ?? 0,
    decision.suggestedMinimumOffer ?? 0,
    decision.customerOffer ?? 0,
    state.config.listedPrice,
  ].filter((n) => n > 0);

  
  try {
    const { data, error } = await supabase.functions.invoke("negotiation-assistant", {
      body: { context, customerMessage, history: history.slice(-8) },
    });

    if (error) throw error;

    const text = typeof data?.reply === "string" ? data.reply.trim() : "";

    if (!text) throw new Error("Empty response");

    if (!replyIsSafe(text, allowed)) {
      throw new Error("Reply quoted an unauthorised price");
    }

    return { text, source: "ai" };
  } catch (error) {
    console.error("[Negotiation Agent] AI request failed:", error);
    return { text: decision.fallbackText, source: "fallback" };
  }
}

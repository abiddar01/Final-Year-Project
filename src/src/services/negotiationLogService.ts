/**
 * Persists negotiation sessions so the admin panel can review every
 * outcome (agreed deals, escalations, rejections) with its transcript.
 * Failures are silent — logging must never interrupt the customer flow.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Car } from "@/lib/types";
import type { NegotiationState } from "@/lib/negotiationEngine";

export interface NegotiationTranscriptEntry {
  role: "user" | "assistant";
  content: string;
}

export async function saveNegotiationSession(
  sessionId: string,
  car: Car,
  state: NegotiationState,
  transcript: NegotiationTranscriptEntry[],
): Promise<void> {
  try {
    const { error } = await supabase.from("negotiation_sessions").upsert(
      [{
        session_id: sessionId,
        car_id: car.id,
        car_name: car.name,
        status: state.status,
        rounds_used: state.round,
        max_rounds: state.config.maxRounds,
        listed_price: state.config.listedPrice,
        customer_offer: state.customerOffer,
        counter_offer: state.currentCounterOffer,
        agreed_price: state.status === "ACCEPTED" ? state.currentCounterOffer : null,
        transcript: transcript.map((m) => ({ role: m.role, content: m.content })),
        updated_at: new Date().toISOString(),
      }],
      { onConflict: "session_id" },
    );
    if (error) console.warn("negotiation log:", error.message);
  } catch (e) {
    console.warn("negotiation log:", e);
  }
}

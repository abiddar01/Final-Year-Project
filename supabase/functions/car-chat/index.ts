import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    // Fetch all cars from database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: cars, error } = await supabase.from("cars").select("*");
    if (error) {
      console.error("Failed to fetch cars:", error);
      throw new Error("Could not load catalogue");
    }

    // Build catalogue knowledge
    const formatPKR = (usd: number) => {
      const pkr = usd * 280;
      if (pkr >= 10000000) return `PKR ${(pkr / 10000000).toFixed(1)} Crore`;
      if (pkr >= 100000) return `PKR ${(pkr / 100000).toFixed(1)} Lakh`;
      return `PKR ${pkr.toLocaleString()}`;
    };

    const availLabel = (t: string) => {
      if (t === "available_on_import") return "Available on Import";
      if (t === "sold_out") return "Sold Out";
      return "In Showroom";
    };

    const carCatalogue = (cars || []).map((c: any) => {
      return `- ${c.name} (${c.brand} ${c.model} ${c.year})
  Price: ${formatPKR(Number(c.price))}
  Category: ${c.category}
  Fuel: ${c.fuel_type}
  Transmission: ${c.transmission}
  Horsepower: ${c.horsepower || "N/A"}
  Top Speed: ${c.top_speed ? c.top_speed + " km/h" : "N/A"}
  0-100: ${c.acceleration ? c.acceleration + "s" : "N/A"}
  Seats: ${c.seats || "N/A"}
  Availability: ${availLabel(c.availability_type || "in_showroom")}
  Featured: ${c.is_featured ? "Yes" : "No"}
  Description: ${c.description || "No description"}
  Features: ${(c.features || []).join(", ") || "None listed"}`;
    }).join("\n\n");

    const SYSTEM_PROMPT = `You are LUXE AI, the premium automotive assistant for Elegance Wheels showroom.

CRITICAL RULES:
1. You ONLY know about vehicles in our catalogue below. You have NO other car knowledge.
2. If a customer asks about a vehicle NOT in our catalogue, respond exactly: "Sorry, this vehicle is not currently available in our catalogue. You can explore available cars in our showroom. Would you like me to show you similar vehicles?"
3. NEVER make up or hallucinate vehicle information.
4. NEVER use markdown formatting like ** or ## or bullet points with -.
5. Use clean line breaks and spacing.
6. Keep responses to 4-6 lines maximum.
7. Use bullet points with the dot character (•) only.
8. Be professional, concise, premium brand voice.
9. No emojis. No marketing fluff. No unnecessary text.
10. When showing car details, use this format:
    Car Name (Year)
    Price: PKR X.X Crore
    Fuel: Type
    Availability: In Showroom / Available on Import / Sold Out
    Test Drive: Available
    Then a one-line description.
11. When a user asks vaguely about a brand, list all matching cars from catalogue.
12. Always offer to book a test drive when relevant.

OUR VEHICLE CATALOGUE:

${carCatalogue}

Greeting format:
Welcome to Elegance Wheels.

I am LUXE AI, your automotive assistant.

I can help you:
• Explore available cars
• Compare vehicles
• Book test drives

How can I assist you today?`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GEMINI_API_KEY}`,,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gemini-3.8-flash",,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages.map((m: any) => ({ role: m.role, content: m.content })),
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

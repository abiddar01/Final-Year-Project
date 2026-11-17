import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

let catalogueCache: { at: number; data: any[] } | null = null;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, botName } = await req.json();
    const assistantName = typeof botName === "string" && /^[A-Za-z]{2,20}$/.test(botName) ? botName : "Hira";
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    // Fetch all cars from database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Cache the catalogue for 60s so we don't hit the database on every message
    let cars = catalogueCache && Date.now() - catalogueCache.at < 60_000 ? catalogueCache.data : null;
    if (!cars) {
      const { data, error } = await supabase
        .from("cars")
        .select("name,brand,model,year,price,category,fuel_type,transmission,horsepower,top_speed,acceleration,seats,availability_type,is_featured,description,features");
      if (error) {
        console.error("Failed to fetch cars:", error);
        throw new Error("Could not load catalogue");
      }
      cars = data || [];
      catalogueCache = { at: Date.now(), data: cars };
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

    const SYSTEM_PROMPT = `You are ${assistantName}, the virtual assistant for Elegance Wheels showroom.

IDENTITY AND CONVERSATION RULES:
- Your name is ${assistantName}. Never call yourself LUXE AI or any other name.
- The customer has ALREADY been greeted by the chat window before this conversation reached you. NEVER greet them again. NEVER say "Welcome", "Assalam o Alaikum", "Hello" or "Hi" at the start of a reply, and NEVER introduce yourself or list what you can do, unless the customer explicitly asks who you are or what you can do.
- Answer the customer's latest message directly, starting with the answer itself.
- You are an AI assistant. If someone asks whether you are a human or a bot, say honestly that you are an AI assistant for Elegance Wheels. Do not claim to be a human.
- For price negotiation questions, explain that final prices can be discussed with our sales consultants at the showroom or by booking a test drive, and do not invent discounts.

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

${carCatalogue}`;

    // Fast model first. If it fails, is overloaded, or takes too long, try the next one.
    const MODELS = ["gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-flash-lite-latest"];

    let response: Response | null = null;
    for (const model of MODELS) {
      try {
        response = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${GEMINI_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                ...messages.map((m: any) => ({ role: m.role, content: m.content })),
              ],
              stream: true,
            }),
            signal: AbortSignal.timeout(7000), // give up on this model after 7s
          }
        );
      } catch (err) {
        console.error(`Model ${model} timed out or failed:`, err);
        response = null;
        continue;
      }
      if (response.ok) break;
      const errText = await response.text();
      console.error(`Model ${model} failed:`, response.status, errText);
      if (![503, 429, 404].includes(response.status)) break;
    }

    if (!response) throw new Error("No response from AI service");

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
      console.error("AI gateway error after all models:", response.status);
      return new Response(
        JSON.stringify({ error: "AI service is busy. Please try again shortly." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

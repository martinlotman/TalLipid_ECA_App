import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a warm, supportive Health Assistant for a clinical study app called HealthTrack.
You help participants with:
- Answering health-related questions in simple language
- Medication reminders and adherence tips
- Analyzing trends in their daily health data (steps, sleep, heart rate, SpO2, stress)
- Guiding them through wellness check-ins

RULES:
- Be encouraging but never give medical diagnoses or replace professional advice.
- When health data is provided in context, reference specific numbers and trends.
- Keep responses concise (2-4 sentences) unless asked for detail.
- If the user mentions symptoms or emergencies, urge them to contact their healthcare provider.
- Address the user by their first name when available.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    const { messages } = await req.json();

    // Build health context from user's recent daily logs
    let healthContext = "";
    if (authHeader) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name")
        .maybeSingle();

      const { data: logs } = await supabase
        .from("daily_logs")
        .select("date, medication_taken, steps, sleep_hours, heart_rate, spo2, stress_level")
        .order("date", { ascending: false })
        .limit(7);

      if (profile?.first_name) {
        healthContext += `\nUser's name: ${profile.first_name}`;
      }

      if (logs && logs.length > 0) {
        healthContext += `\n\nUser's recent health data (last ${logs.length} days):\n`;
        for (const log of logs) {
          const parts = [`Date: ${log.date}`];
          if (log.medication_taken !== null) parts.push(`Medication: ${log.medication_taken ? "taken" : "missed"}`);
          if (log.steps !== null) parts.push(`Steps: ${log.steps}`);
          if (log.sleep_hours !== null) parts.push(`Sleep: ${log.sleep_hours}h`);
          if (log.heart_rate !== null) parts.push(`HR: ${log.heart_rate}bpm`);
          if (log.spo2 !== null) parts.push(`SpO2: ${log.spo2}%`);
          if (log.stress_level !== null) parts.push(`Stress: ${log.stress_level}/100`);
          healthContext += `- ${parts.join(", ")}\n`;
        }
      }
    }

    const systemMessage = SYSTEM_PROMPT + (healthContext ? `\n\n--- HEALTH CONTEXT ---${healthContext}` : "");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemMessage },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("health-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

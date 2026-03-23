import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-token",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Authenticate via personal API token
    const apiToken = req.headers.get("x-api-token");
    if (!apiToken) {
      return new Response(
        JSON.stringify({ error: "Missing x-api-token header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Look up token
    const { data: tokenRow, error: tokenErr } = await supabase
      .from("user_api_tokens")
      .select("id, user_id, revoked")
      .eq("token", apiToken)
      .maybeSingle();

    if (tokenErr || !tokenRow || tokenRow.revoked) {
      return new Response(
        JSON.stringify({ error: "Invalid or revoked API token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = tokenRow.user_id;

    // Update last_used_at
    await supabase
      .from("user_api_tokens")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", tokenRow.id);

    // Parse body
    const body = await req.json();
    const {
      steps,
      sleep_hours,
      heart_rate,
      spo2,
      stress_level,
      date,
    } = body;

    const logDate = date || new Date().toISOString().split("T")[0];

    const fields: Record<string, unknown> = {
      sync_source: "watch",
    };
    if (steps != null) fields.steps = Math.round(Number(steps));
    if (sleep_hours != null) fields.sleep_hours = Number(sleep_hours);
    if (heart_rate != null) fields.heart_rate = Math.round(Number(heart_rate));
    if (spo2 != null) fields.spo2 = Math.round(Number(spo2));
    if (stress_level != null) fields.stress_level = Math.round(Number(stress_level));

    // Upsert daily_logs
    const { data: existing } = await supabase
      .from("daily_logs")
      .select("id")
      .eq("date", logDate)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      await supabase.from("daily_logs").update(fields).eq("id", existing.id);
    } else {
      await supabase.from("daily_logs").insert({
        date: logDate,
        user_id: userId,
        ...fields,
      });
    }

    return new Response(
      JSON.stringify({ success: true, date: logDate }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("health-data-import error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

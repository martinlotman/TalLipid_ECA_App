
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const redcapApiUrl = Deno.env.get("REDCAP_API_URL")!;
    const redcapApiKey = Deno.env.get("REDCAP_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get logs from the past 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fromDate = sevenDaysAgo.toISOString().split("T")[0];

    const { data: logs, error } = await supabase
      .from("daily_logs")
      .select("*")
      .gte("date", fromDate)
      .order("date", { ascending: true });

    if (error) throw error;

    const totalDays = logs?.length ?? 0;

    // Calculate metrics
    let medTakenDays = 0;
    let medNotTakenDays = 0;
    let noMarkDays = 0;
    let totalSteps = 0;
    let stepsCount = 0;
    let totalSleep = 0;
    let sleepCount = 0;

    for (const log of logs ?? []) {
      if (log.medication_taken === true) medTakenDays++;
      else if (log.medication_taken === false) medNotTakenDays++;
      else noMarkDays++;

      if (log.steps != null) {
        totalSteps += log.steps;
        stepsCount++;
      }
      if (log.sleep_hours != null) {
        totalSleep += Number(log.sleep_hours);
        sleepCount++;
      }
    }

    // Days in the week with no log entry at all also count as "no mark"
    noMarkDays += 7 - totalDays;

    const avgSteps = stepsCount > 0 ? Math.round(totalSteps / stepsCount) : 0;
    const avgSleep =
      sleepCount > 0 ? parseFloat((totalSleep / sleepCount).toFixed(1)) : 0;

    const today = new Date().toISOString().split("T")[0];

    // Build REDCap import payload
    const record = {
      record_id: `weekly_${today}`,
      date_visit_w2d: today,
      med_yes_w2d: String(medTakenDays),
      med_no_w2d_2: String(medNotTakenDays),
      no_mark_1_w2d: String(noMarkDays),
      avg_steps_w2d: String(avgSteps),
      avg_sleep_w2d: String(avgSleep),
    };

    // POST to REDCap
    const formData = new FormData();
    formData.append("token", redcapApiKey);
    formData.append("content", "record");
    formData.append("format", "json");
    formData.append("type", "flat");
    formData.append("overwriteBehavior", "normal");
    formData.append("data", JSON.stringify([record]));
    formData.append("returnContent", "count");
    formData.append("returnFormat", "json");

    const redcapResponse = await fetch(`${redcapApiUrl}api/`, {
      method: "POST",
      body: formData,
    });

    const redcapResult = await redcapResponse.text();

    if (!redcapResponse.ok) {
      console.error("REDCap error:", redcapResult);
      throw new Error(`REDCap returned ${redcapResponse.status}: ${redcapResult}`);
    }

    // Mark logs as synced
    if (logs && logs.length > 0) {
      const ids = logs.map((l: any) => l.id);
      await supabase
        .from("daily_logs")
        .update({ synced_to_redcap: true })
        .in("id", ids);
    }

    console.log("REDCap sync success:", redcapResult, "Record:", record);

    return new Response(
      JSON.stringify({ success: true, record, redcapResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Sync error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

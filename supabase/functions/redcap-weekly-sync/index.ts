
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

    // Check if a specific user_id was passed (manual trigger)
    let targetUserId: string | null = null;
    try {
      const body = await req.json();
      targetUserId = body?.user_id ?? null;
    } catch { /* no body = sync all eligible */ }

    // Get all profiles that are due for sync
    const now = new Date();
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, redcap_record_id, sync_interval_days, last_synced_at");

    if (profilesError) throw profilesError;

    const eligibleProfiles = (profiles ?? []).filter((p: any) => {
      if (!p.redcap_record_id) return false; // skip users without REDCap ID
      if (targetUserId) return p.id === targetUserId; // manual trigger for specific user
      if (!p.last_synced_at) return true; // never synced
      const lastSync = new Date(p.last_synced_at);
      const daysSince = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince >= (p.sync_interval_days ?? 7);
    });

    const results: any[] = [];

    for (const profile of eligibleProfiles) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - (profile.sync_interval_days ?? 7));
      const fromDate = sevenDaysAgo.toISOString().split("T")[0];

      const { data: logs, error } = await supabase
        .from("daily_logs")
        .select("*")
        .eq("user_id", profile.id)
        .gte("date", fromDate)
        .order("date", { ascending: true });

      if (error) {
        console.error(`Error fetching logs for user ${profile.id}:`, error);
        results.push({ user_id: profile.id, error: error.message });
        continue;
      }

      const totalDays = logs?.length ?? 0;
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

      const interval = profile.sync_interval_days ?? 7;
      noMarkDays += interval - totalDays;

      const avgSteps = stepsCount > 0 ? Math.round(totalSteps / stepsCount) : 0;
      const avgSleep = sleepCount > 0 ? parseFloat((totalSleep / sleepCount).toFixed(1)) : 0;

      const today = now.toISOString().split("T")[0];

      const record = {
        record_id: profile.redcap_record_id,
        date_visit_w2d: today,
        med_yes_w2d: String(medTakenDays),
        med_no_w2d_2: String(medNotTakenDays),
        no_mark_1_w2d: String(noMarkDays),
        avg_steps_w2d: String(avgSteps),
        avg_sleep_w2d: String(avgSleep),
      };

      // Use REDCAP_API_URL directly — it should be the full API endpoint
      const redcapUrl = redcapApiUrl.endsWith('/') ? redcapApiUrl : `${redcapApiUrl}/`;
      console.log(`Pushing to REDCap URL: ${redcapUrl}`, JSON.stringify(record));

      const formData = new FormData();
      formData.append("token", redcapApiKey);
      formData.append("content", "record");
      formData.append("format", "json");
      formData.append("type", "flat");
      formData.append("overwriteBehavior", "normal");
      formData.append("data", JSON.stringify([record]));
      formData.append("returnContent", "count");
      formData.append("returnFormat", "json");

      const redcapResponse = await fetch(redcapUrl, {
        method: "POST",
        body: formData,
      });

      const redcapResult = await redcapResponse.text();

      if (!redcapResponse.ok) {
        console.error(`REDCap error for user ${profile.id}:`, redcapResult);
        results.push({ user_id: profile.id, error: redcapResult });
        continue;
      }

      // Mark logs as synced & update last_synced_at
      if (logs && logs.length > 0) {
        const ids = logs.map((l: any) => l.id);
        await supabase
          .from("daily_logs")
          .update({ synced_to_redcap: true })
          .in("id", ids);
      }

      await supabase
        .from("profiles")
        .update({ last_synced_at: now.toISOString() })
        .eq("id", profile.id);

      console.log(`Synced user ${profile.id} (REDCap ID: ${profile.redcap_record_id}):`, record);
      results.push({ user_id: profile.id, record, redcapResult });
    }

    return new Response(
      JSON.stringify({ success: true, synced: results.length, results }),
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

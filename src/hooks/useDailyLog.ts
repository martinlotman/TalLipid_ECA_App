
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DailyLog } from "@/components/DailyLogHistory";

export interface HealthData {
  steps: number;
  sleepHours: number;
  heartRate: number;
  spo2: number;
  stressLevel: number;
  syncSource: "watch" | "manual";
}

const getTodayStr = () => new Date().toISOString().split("T")[0];

export function useDailyLog() {
  const [logs, setLogs] = useState<DailyLog[]>([]);

  // Load logs from DB on mount
  useEffect(() => {
    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from("daily_logs")
        .select("*")
        .order("date", { ascending: false })
        .limit(30);

      if (!error && data) {
        setLogs(
          data.map((row: any) => ({
            date: row.date,
            medicationTaken: row.medication_taken ?? undefined,
            steps: row.steps ?? undefined,
            sleepHours: row.sleep_hours != null ? Number(row.sleep_hours) : undefined,
            heartRate: row.heart_rate ?? undefined,
            spo2: row.spo2 ?? undefined,
            stressLevel: row.stress_level ?? undefined,
            synced: row.synced_to_redcap ?? false,
            syncSource: row.sync_source ?? undefined,
          }))
        );
      }
    };
    fetchLogs();
  }, []);

  const today = getTodayStr();
  const todayLog = logs.find((l) => l.date === today);

  const upsertToDb = useCallback(async (fields: Record<string, any>) => {
    const { data: existing } = await supabase
      .from("daily_logs")
      .select("id")
      .eq("date", today)
      .maybeSingle();

    if (existing) {
      await supabase.from("daily_logs").update(fields).eq("id", existing.id);
    } else {
      await supabase.from("daily_logs").insert({ date: today, ...fields });
    }
  }, [today]);

  const submitMedication = useCallback(
    async (taken: boolean) => {
      setLogs((prev) => {
        const existing = prev.find((l) => l.date === today);
        if (existing) {
          return prev.map((l) =>
            l.date === today ? { ...l, medicationTaken: taken } : l
          );
        }
        return [{ date: today, medicationTaken: taken, synced: false }, ...prev];
      });
      await upsertToDb({ medication_taken: taken });
    },
    [today, upsertToDb]
  );

  const submitHealthData = useCallback(
    async (data: HealthData) => {
      const dbFields = {
        steps: data.steps,
        sleep_hours: data.sleepHours,
        heart_rate: data.heartRate,
        spo2: data.spo2,
        stress_level: data.stressLevel,
        sync_source: data.syncSource,
      };

      setLogs((prev) => {
        const existing = prev.find((l) => l.date === today);
        if (existing) {
          return prev.map((l) =>
            l.date === today ? { ...l, ...data } : l
          );
        }
        return [{ date: today, ...data, synced: false }, ...prev];
      });
      await upsertToDb(dbFields);
    },
    [today, upsertToDb]
  );

  return { logs, todayLog, submitMedication, submitHealthData };
}

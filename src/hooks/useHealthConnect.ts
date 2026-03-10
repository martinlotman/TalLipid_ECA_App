import { useState, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import type { HealthData } from "@/hooks/useDailyLog";

let HealthPlugin: any = null;

async function getHealthPlugin() {
  if (HealthPlugin) return HealthPlugin;
  try {
    const mod = await import("@capgo/capacitor-health");
    HealthPlugin = mod.Health;
    return HealthPlugin;
  } catch {
    return null;
  }
}

const isNative = Capacitor.isNativePlatform();
const platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'

export function useHealthConnect() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAvailable = isNative;

  const syncFromWatch = useCallback(async (): Promise<HealthData | null> => {
    setLoading(true);
    setError(null);

    if (!isNative) {
      setError(
        platform === "ios"
          ? "Health sync requires the native iOS app with Apple Health access."
          : "Health sync requires the native Android app with Health Connect installed."
      );
      setLoading(false);
      return null;
    }

    try {
      const Health = await getHealthPlugin();
      if (!Health) {
        setError("Health plugin not available.");
        setLoading(false);
        return null;
      }

      // Check availability
      const { available, reason } = await Health.isAvailable();
      if (!available) {
        setError(
          platform === "ios"
            ? `Apple Health is not available on this device${reason ? `: ${reason}` : ""}.`
            : `Health Connect is not available on this device${reason ? `: ${reason}` : ""}. Please install Google Health Connect.`
        );
        setLoading(false);
        return null;
      }

      // Request permissions for all data types we need
      await Health.requestAuthorization({
        read: ["steps", "heartRate", "oxygenSaturation", "sleep"],
        write: [],
      });

      // Query today's data
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startDate = startOfDay.toISOString();
      const endDate = now.toISOString();

      // For sleep, look back to yesterday evening (sleep usually starts the night before)
      const sleepStart = new Date(startOfDay);
      sleepStart.setHours(sleepStart.getHours() - 12); // noon yesterday
      const sleepStartDate = sleepStart.toISOString();

      // Read steps
      let steps = 0;
      try {
        const stepsResult = await Health.readSamples({
          dataType: "steps",
          startDate,
          endDate,
        });
        if (stepsResult?.samples?.length) {
          steps = stepsResult.samples.reduce((sum: number, s: any) => sum + (s.value || 0), 0);
        }
      } catch (e) {
        console.warn("Could not read steps:", e);
      }

      // Read heart rate
      let heartRate = 0;
      try {
        const hrResult = await Health.readSamples({
          dataType: "heartRate",
          startDate,
          endDate,
        });
        if (hrResult?.samples?.length) {
          const avg =
            hrResult.samples.reduce((sum: number, s: any) => sum + (s.value || 0), 0) /
            hrResult.samples.length;
          heartRate = Math.round(avg);
        }
      } catch (e) {
        console.warn("Could not read heart rate:", e);
      }

      // Read blood oxygen (SpO2)
      let spo2 = 0;
      try {
        const spo2Result = await Health.readSamples({
          dataType: "oxygenSaturation",
          startDate,
          endDate,
        });
        if (spo2Result?.samples?.length) {
          const latest = spo2Result.samples[spo2Result.samples.length - 1];
          // HealthKit returns as fraction (0.0–1.0), Health Connect returns as percentage
          const rawValue = latest.value || 0;
          spo2 = rawValue <= 1 ? Math.round(rawValue * 100) : Math.round(rawValue);
        }
      } catch (e) {
        console.warn("Could not read SpO2:", e);
      }

      // Read sleep
      let sleepHours = 0;
      try {
        const sleepResult = await Health.readSamples({
          dataType: "sleep",
          startDate: sleepStartDate,
          endDate,
        });
        if (sleepResult?.samples?.length) {
          // Sum all sleep segments duration in hours
          let totalMs = 0;
          for (const s of sleepResult.samples) {
            if (s.startDate && s.endDate) {
              const start = new Date(s.startDate).getTime();
              const end = new Date(s.endDate).getTime();
              totalMs += end - start;
            } else if (s.value) {
              // Some implementations return value in minutes
              totalMs += (s.value as number) * 60 * 1000;
            }
          }
          sleepHours = Math.round((totalMs / (1000 * 60 * 60)) * 10) / 10; // 1 decimal
        }
      } catch (e) {
        console.warn("Could not read sleep:", e);
      }

      const healthData: HealthData = {
        steps,
        heartRate,
        spo2,
        stressLevel: 0, // Not available via HealthKit/Health Connect — user enters manually
        sleepHours,
        syncSource: "watch",
      };

      setLoading(false);
      return healthData;
    } catch (err: any) {
      console.error("Health sync error:", err);
      setError(err?.message || "Failed to sync health data.");
      setLoading(false);
      return null;
    }
  }, []);

  return { syncFromWatch, loading, error, isAvailable, platform };
}

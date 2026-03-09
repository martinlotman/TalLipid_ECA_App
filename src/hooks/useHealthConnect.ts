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
      const { available } = await Health.isAvailable();
      if (!available) {
        setError(
          platform === "ios"
            ? "Apple Health is not available on this device."
            : "Health Connect is not available on this device. Please install Google Health Connect."
        );
        setLoading(false);
        return null;
      }

      // Request permissions — same API for both platforms
      await Health.requestAuthorization({
        read: ["steps", "heartRate"],
        write: [],
      });

      // Query today's data
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startDate = startOfDay.toISOString();
      const endDate = now.toISOString();

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
      } catch {
        console.warn("Could not read steps");
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
      } catch {
        console.warn("Could not read heart rate");
      }

      const healthData: HealthData = {
        steps,
        heartRate,
        spo2: 0,
        stressLevel: 0,
        sleepHours: 0,
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

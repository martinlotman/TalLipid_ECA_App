import { useState, useEffect } from "react";
import type { DailyLog } from "@/components/DailyLogHistory";

const STORAGE_KEY = "health-daily-logs";

const getTodayStr = () => new Date().toISOString().split("T")[0];

export interface HealthData {
  steps: number;
  sleepHours: number;
  heartRate: number;
  spo2: number;
  stressLevel: number;
  syncSource: "watch" | "manual";
}

export function useDailyLog() {
  const [logs, setLogs] = useState<DailyLog[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  }, [logs]);

  const today = getTodayStr();
  const todayLog = logs.find((l) => l.date === today);

  const submitMedication = (taken: boolean) => {
    setLogs((prev) => {
      const existing = prev.find((l) => l.date === today);
      if (existing) {
        return prev.map((l) =>
          l.date === today ? { ...l, medicationTaken: taken } : l
        );
      }
      return [{ date: today, medicationTaken: taken, synced: false }, ...prev];
    });
  };

  const submitHealthData = (data: HealthData) => {
    setLogs((prev) => {
      const existing = prev.find((l) => l.date === today);
      if (existing) {
        return prev.map((l) =>
          l.date === today ? { ...l, ...data } : l
        );
      }
      return [{ date: today, ...data, synced: false }, ...prev];
    });
  };

  return { logs, todayLog, submitMedication, submitHealthData };
}

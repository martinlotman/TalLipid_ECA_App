import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Footprints,
  Moon,
  Heart,
  Activity,
  Brain,
  Watch,
  Save,
  RefreshCw,
  PenLine,
} from "lucide-react";
import type { HealthData } from "@/hooks/useDailyLog";
import type { DailyLog } from "@/components/DailyLogHistory";

interface HealthDataEntryProps {
  onSubmit: (data: HealthData) => void;
  submitted?: boolean;
  todayLog?: DailyLog;
}

const METRICS = [
  { key: "steps", label: "Steps", icon: Footprints, unit: "", placeholder: "e.g. 8500", type: "number" },
  { key: "heartRate", label: "Heart Rate", icon: Heart, unit: "bpm", placeholder: "e.g. 72", type: "number" },
  { key: "spo2", label: "Blood Oxygen", icon: Activity, unit: "%", placeholder: "e.g. 97", type: "number" },
  { key: "stressLevel", label: "Stress Level", icon: Brain, unit: "/100", placeholder: "e.g. 35", type: "number" },
  { key: "sleepHours", label: "Sleep", icon: Moon, unit: "hrs", placeholder: "e.g. 7.5", step: "0.5" },
] as const;

const HealthDataEntry = ({ onSubmit, submitted, todayLog }: HealthDataEntryProps) => {
  const [mode, setMode] = useState<"idle" | "syncing" | "manual">("idle");
  const [formData, setFormData] = useState<Record<string, string>>({});

  const simulateWatchSync = useCallback(() => {
    setMode("syncing");
    // Simulate fetching data from Redmi Watch 5 Active via Health Connect
    setTimeout(() => {
      const synced: HealthData = {
        steps: Math.floor(4000 + Math.random() * 8000),
        heartRate: Math.floor(60 + Math.random() * 30),
        spo2: Math.floor(95 + Math.random() * 5),
        stressLevel: Math.floor(20 + Math.random() * 50),
        sleepHours: parseFloat((5 + Math.random() * 4).toFixed(1)),
        syncSource: "watch",
      };
      onSubmit(synced);
      setMode("idle");
    }, 2000);
  }, [onSubmit]);

  const handleManualSubmit = () => {
    const data: HealthData = {
      steps: parseInt(formData.steps) || 0,
      heartRate: parseInt(formData.heartRate) || 0,
      spo2: parseInt(formData.spo2) || 0,
      stressLevel: parseInt(formData.stressLevel) || 0,
      sleepHours: parseFloat(formData.sleepHours) || 0,
      syncSource: "manual",
    };
    onSubmit(data);
    setMode("idle");
  };

  // Display synced data
  if (submitted && todayLog) {
    return (
      <Card className="glass-card">
        <CardContent className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              Today's Watch Data
            </p>
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              <Watch className="h-3 w-3" />
              {todayLog.syncSource === "watch" ? "Redmi Watch 5 Active" : "Manual Entry"}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {METRICS.map(({ key, label, icon: Icon, unit }) => {
              const value = todayLog[key as keyof DailyLog];
              if (value === undefined) return null;
              return (
                <div
                  key={key}
                  className="flex flex-col items-center rounded-2xl bg-primary/8 p-3"
                >
                  <Icon className="mb-1 h-5 w-5 text-primary" />
                  <span className="text-lg font-bold text-foreground">
                    {typeof value === "number" ? value.toLocaleString() : value}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {label}
                    {unit && ` (${unit})`}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Manual entry form
  if (mode === "manual") {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-center text-base">Manual Entry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-5 pb-5">
          {METRICS.map(({ key, label, icon: Icon, placeholder, step }) => (
            <div key={key} className="space-y-1">
              <Label htmlFor={key} className="flex items-center gap-2 text-xs font-medium">
                <Icon className="h-3.5 w-3.5 text-primary" />
                {label}
              </Label>
              <Input
                id={key}
                type="number"
                step={step}
                placeholder={placeholder}
                value={formData[key] || ""}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, [key]: e.target.value }))
                }
                className="h-10 rounded-xl text-sm"
              />
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setMode("idle")}
            >
              Cancel
            </Button>
            <Button
              variant="hero"
              className="flex-1 gap-2"
              onClick={handleManualSubmit}
            >
              <Save className="h-4 w-4" />
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default: sync or manual choice
  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-center text-xl">Health Data</CardTitle>
        <p className="text-center text-xs text-muted-foreground">
          Sync from your Redmi Watch 5 Active or enter manually
        </p>
      </CardHeader>
      <CardContent className="space-y-3 px-5 pb-5">
        <Button
          variant="hero"
          className="w-full gap-2"
          onClick={simulateWatchSync}
          disabled={mode === "syncing"}
        >
          {mode === "syncing" ? (
            <RefreshCw className="h-5 w-5 animate-spin" />
          ) : (
            <Watch className="h-5 w-5" />
          )}
          {mode === "syncing" ? "Syncing from watch…" : "Sync from Watch"}
        </Button>
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => setMode("manual")}
        >
          <PenLine className="h-4 w-4" />
          Enter Manually
        </Button>
      </CardContent>
    </Card>
  );
};

export default HealthDataEntry;

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
  AlertCircle,
} from "lucide-react";
import type { HealthData } from "@/hooks/useDailyLog";
import type { DailyLog } from "@/components/DailyLogHistory";
import { useHealthConnect } from "@/hooks/useHealthConnect";

interface HealthDataEntryProps {
  onSubmit: (data: HealthData) => void;
  submitted?: boolean;
  todayLog?: DailyLog;
}

const METRICS: { key: string; label: string; icon: typeof Footprints; unit: string; placeholder: string; step?: string }[] = [
  { key: "steps", label: "Steps", icon: Footprints, unit: "", placeholder: "e.g. 8500" },
  { key: "heartRate", label: "Heart Rate", icon: Heart, unit: "bpm", placeholder: "e.g. 72" },
  { key: "spo2", label: "Blood Oxygen", icon: Activity, unit: "%", placeholder: "e.g. 97" },
  { key: "stressLevel", label: "Stress Level", icon: Brain, unit: "/100", placeholder: "e.g. 35" },
  { key: "sleepHours", label: "Sleep", icon: Moon, unit: "hrs", placeholder: "e.g. 7.5", step: "0.5" },
];

// Metrics that Health Connect can auto-fill
const HC_AUTO_METRICS = ["steps", "heartRate", "spo2", "sleepHours"];

const HealthDataEntry = ({ onSubmit, submitted, todayLog }: HealthDataEntryProps) => {
  const [mode, setMode] = useState<"idle" | "syncing" | "manual" | "review">("idle");
  const [formData, setFormData] = useState<Record<string, string>>({});
  const { syncFromWatch, loading: hcLoading, error: hcError, isAvailable: hcAvailable } = useHealthConnect();

  const handleWatchSync = useCallback(async () => {
    setMode("syncing");
    const data = await syncFromWatch();
    if (data) {
      // Pre-fill the form with synced data, let user complete SpO2/stress/sleep manually
      setFormData({
        steps: String(data.steps),
        heartRate: String(data.heartRate),
        spo2: data.spo2 ? String(data.spo2) : "",
        stressLevel: data.stressLevel ? String(data.stressLevel) : "",
        sleepHours: data.sleepHours ? String(data.sleepHours) : "",
      });
      setMode("review");
    } else {
      setMode("idle");
    }
  }, [syncFromWatch]);

  const handleSubmitReview = () => {
    const data: HealthData = {
      steps: parseInt(formData.steps) || 0,
      heartRate: parseInt(formData.heartRate) || 0,
      spo2: parseInt(formData.spo2) || 0,
      stressLevel: parseInt(formData.stressLevel) || 0,
      sleepHours: parseFloat(formData.sleepHours) || 0,
      syncSource: "watch",
    };
    onSubmit(data);
    setMode("idle");
  };

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

  // Review synced data (some fields auto-filled, others need manual input)
  if (mode === "review") {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-center text-base">Review Synced Data</CardTitle>
          <p className="text-center text-xs text-muted-foreground">
            Steps & heart rate synced from watch. Please complete the remaining fields.
          </p>
        </CardHeader>
        <CardContent className="space-y-3 px-5 pb-5">
          {METRICS.map(({ key, label, icon: Icon, placeholder, step }) => {
            const isSynced = HC_AUTO_METRICS.includes(key) && formData[key];
            return (
              <div key={key} className="space-y-1">
                <Label htmlFor={key} className="flex items-center gap-2 text-xs font-medium">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  {label}
                  {isSynced && (
                    <span className="ml-auto text-[10px] text-primary font-medium">
                      ✓ from watch
                    </span>
                  )}
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
                  className={`h-10 rounded-xl text-sm ${isSynced ? "border-primary/30 bg-primary/5" : ""}`}
                />
              </div>
            );
          })}
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
              onClick={handleSubmitReview}
            >
              <Save className="h-4 w-4" />
              Save All
            </Button>
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
        {hcError && (
          <div className="flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{hcError}</span>
          </div>
        )}
        <Button
          variant="hero"
          className="w-full gap-2"
          onClick={handleWatchSync}
          disabled={mode === "syncing" || hcLoading}
        >
          {mode === "syncing" || hcLoading ? (
            <RefreshCw className="h-5 w-5 animate-spin" />
          ) : (
            <Watch className="h-5 w-5" />
          )}
          {mode === "syncing" || hcLoading ? "Syncing from watch…" : "Sync from Watch"}
        </Button>
        {!hcAvailable && (
          <p className="text-center text-[10px] text-muted-foreground">
            Watch sync requires the native app with Health Connect (Android) or Apple Health (iOS)
          </p>
        )}
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

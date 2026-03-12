import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, Footprints, Moon, Heart, Activity } from "lucide-react";
import { useTranslation } from "@/contexts/LanguageContext";

export interface DailyLog {
  date: string;
  medicationTaken?: boolean;
  steps?: number;
  sleepHours?: number;
  heartRate?: number;
  spo2?: number;
  stressLevel?: number;
  synced: boolean;
  syncSource?: "watch" | "manual";
}

interface DailyLogHistoryProps {
  logs: DailyLog[];
}

const DailyLogHistory = ({ logs }: DailyLogHistoryProps) => {
  const { t, language } = useTranslation();
  const dateLocale = language === "et" ? "et-EE" : language === "ru" ? "ru-RU" : "en-US";

  if (logs.length === 0) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6 text-center text-muted-foreground">
          {t("history.empty")}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t("history.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-6 pb-6">
        {logs.slice(0, 7).map((log) => (
          <div key={log.date} className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/30 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {new Date(log.date).toLocaleDateString(dateLocale, {
                  weekday: "short", month: "short", day: "numeric",
                })}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {log.steps !== undefined && (
                  <span className="flex items-center gap-1"><Footprints className="h-3 w-3" />{log.steps.toLocaleString()}</span>
                )}
                {log.heartRate !== undefined && (
                  <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{log.heartRate}</span>
                )}
                {log.spo2 !== undefined && (
                  <span className="flex items-center gap-1"><Activity className="h-3 w-3" />{log.spo2}%</span>
                )}
                {log.sleepHours !== undefined && (
                  <span className="flex items-center gap-1"><Moon className="h-3 w-3" />{log.sleepHours}h</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {log.syncSource && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {log.syncSource === "watch" ? `⌚ ${t("history.watch")}` : `✍️ ${t("history.manual")}`}
                </span>
              )}
              {log.medicationTaken !== undefined && (
                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${log.medicationTaken ? "bg-success/15" : "bg-destructive/15"}`}>
                  {log.medicationTaken ? <Check className="h-4 w-4 text-success" /> : <X className="h-4 w-4 text-destructive" />}
                </div>
              )}
              <div
                className={`h-2 w-2 rounded-full ${log.synced ? "bg-success" : "bg-accent"}`}
                title={log.synced ? t("history.syncedRedcap") : t("history.pendingSync")}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default DailyLogHistory;

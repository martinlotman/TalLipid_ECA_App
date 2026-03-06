import { Activity } from "lucide-react";
import MedicationCheck from "@/components/MedicationCheck";
import HealthDataEntry from "@/components/HealthDataEntry";
import DailyLogHistory from "@/components/DailyLogHistory";
import ConversationalAgent from "@/components/ConversationalAgent";
import NotificationBanner from "@/components/NotificationBanner";
import { useDailyLog } from "@/hooks/useDailyLog";

const Index = () => {
  const { logs, todayLog, submitMedication, submitHealthData } = useDailyLog();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">HealthTrack</h1>
            <p className="text-xs text-muted-foreground">Daily health monitor</p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-lg space-y-4 px-4 py-6">
        {/* Today's date */}
        <p className="text-center text-sm font-medium text-muted-foreground">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>

        {/* Notification banner */}
        <NotificationBanner />

        {/* Medication check */}
        <MedicationCheck
          onSubmit={submitMedication}
          submitted={todayLog?.medicationTaken !== undefined}
          lastAnswer={todayLog?.medicationTaken}
        />

        {/* Health data entry */}
        <HealthDataEntry
          onSubmit={submitHealthData}
          submitted={todayLog?.steps !== undefined}
          todayLog={todayLog}
        />

        {/* Conversational Agent */}
        <ConversationalAgent />

        {/* History */}
        <DailyLogHistory logs={logs} />
      </main>
    </div>
  );
};

export default Index;

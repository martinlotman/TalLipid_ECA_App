import { Activity, LogOut, Shield } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MedicationCheck from "@/components/MedicationCheck";
import HealthDataEntry from "@/components/HealthDataEntry";
import DailyLogHistory from "@/components/DailyLogHistory";
import ConversationalAgent from "@/components/ConversationalAgent";
import NotificationBanner from "@/components/NotificationBanner";
import { useDailyLog } from "@/hooks/useDailyLog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { user, signOut } = useAuth();
  const { logs, todayLog, submitMedication, submitHealthData } = useDailyLog();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => {
      setIsAdmin(!!data);
    });
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">HealthTrack</h1>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
          {isAdmin && (
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} title="Admin">
              <Shield className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={signOut} title="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
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

        {/* Conversational Agent */}
        <ConversationalAgent />

        {/* Health data entry */}
        <HealthDataEntry
          onSubmit={submitHealthData}
          submitted={todayLog?.steps !== undefined}
          todayLog={todayLog}
        />

        {/* History */}
        <DailyLogHistory logs={logs} />
      </main>
    </div>
  );
};

export default Index;

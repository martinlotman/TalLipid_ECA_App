import { Activity, ClipboardList, Download, LogOut, Shield, Smartphone, Watch } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MedicationCheck from "@/components/MedicationCheck";
import HealthDataEntry from "@/components/HealthDataEntry";
import DailyLogHistory from "@/components/DailyLogHistory";
import ConversationalAgent from "@/components/ConversationalAgent";
import NotificationBanner from "@/components/NotificationBanner";
import { useDailyLog } from "@/hooks/useDailyLog";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { user, signOut } = useAuth();
  const { t, language } = useTranslation();
  const { logs, todayLog, submitMedication, submitHealthData } = useDailyLog();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => {
      setIsAdmin(!!data);
    });
  }, [user]);

  const dateLocale = language === "et" ? "et-EE" : language === "ru" ? "ru-RU" : "en-US";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">TalLipid</h1>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
          {isAdmin && (
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} title="Admin">
              <Shield className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => navigate("/install")} title={t("install.title")}>
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate("/questionnaires")} title={t("quest.title")}>
            <ClipboardList className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate("/watch-setup")} title={t("watchSetup.title")}>
            <Watch className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate("/shortcuts")} title="Apple Shortcuts">
            <Smartphone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={signOut} title={t("nav.signOut")}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-4 px-4 py-6">
        <p className="text-center text-sm font-medium text-muted-foreground">
          {new Date().toLocaleDateString(dateLocale, {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>

        <NotificationBanner />
        <MedicationCheck
          onSubmit={submitMedication}
          submitted={todayLog?.medicationTaken !== undefined}
          lastAnswer={todayLog?.medicationTaken}
        />
        <ConversationalAgent />
        <HealthDataEntry
          onSubmit={submitHealthData}
          submitted={todayLog?.steps !== undefined}
          todayLog={todayLog}
        />
        <DailyLogHistory logs={logs} />
      </main>
    </div>
  );
};

export default Index;

import { Bell, BellRing, X, Info } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

interface AdminNotification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

const NotificationBanner = () => {
  const { permissionGranted, requestPermission, showAdminNotification } = useNotifications();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [adminNotifs, setAdminNotifs] = useState<AdminNotification[]>([]);

  // Fetch existing unread notifications
  useEffect(() => {
    if (!user) return;
    supabase
      .from("admin_notifications")
      .select("id, title, body, read, created_at")
      .eq("target_user_id", user.id)
      .eq("read", false)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => setAdminNotifs(data ?? []));
  }, [user]);

  // Realtime subscription for new admin notifications → show as push notification
  useEffect(() => {
    if (!user || !permissionGranted) return;

    const channel = supabase
      .channel("admin-notifs-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "admin_notifications",
          filter: `target_user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as AdminNotification;
          // Show OS-level notification
          showAdminNotification(newNotif.title, newNotif.body);
          // Also add to in-app banner
          setAdminNotifs((prev) => [newNotif, ...prev].slice(0, 5));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, permissionGranted, showAdminNotification]);

  const dismissNotif = async (id: string) => {
    await supabase.from("admin_notifications").update({ read: true }).eq("id", id);
    setAdminNotifs((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="space-y-2">
      {adminNotifs.map((n) => (
        <div key={n.id} className="flex items-start gap-2 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3">
          <Info className="h-4 w-4 mt-0.5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{n.title}</p>
            <p className="text-xs text-muted-foreground">{n.body}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => dismissNotif(n.id)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}

      {permissionGranted ? (
        <div className="flex items-center gap-2 rounded-2xl bg-success/10 px-4 py-3 text-sm text-success">
          <BellRing className="h-4 w-4" />
          <span>{t("notif.active")}</span>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Bell className="h-4 w-4" />
            <span>{t("notif.enable")}</span>
          </div>
          <Button size="sm" variant="default" className="rounded-xl" onClick={requestPermission}>
            {t("notif.enableBtn")}
          </Button>
        </div>
      )}
    </div>
  );
};

export default NotificationBanner;

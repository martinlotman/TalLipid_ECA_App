import { Bell, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/useNotifications";

const NotificationBanner = () => {
  const { permissionGranted, requestPermission } = useNotifications();

  if (permissionGranted) {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-success/10 px-4 py-3 text-sm text-success">
        <BellRing className="h-4 w-4" />
        <span>Notifications active — reminders at 20:30 daily &amp; Fridays 19:00</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Bell className="h-4 w-4" />
        <span>Enable reminders for medications &amp; video calls</span>
      </div>
      <Button size="sm" variant="default" className="rounded-xl" onClick={requestPermission}>
        Enable
      </Button>
    </div>
  );
};

export default NotificationBanner;

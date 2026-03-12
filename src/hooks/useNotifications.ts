import { useEffect, useState, useCallback } from "react";
import { Capacitor } from "@capacitor/core";

const PERMISSION_KEY = "tallipid_notif_permission";

export function useNotifications() {
  const [permissionGranted, setPermissionGranted] = useState(() => {
    return localStorage.getItem(PERMISSION_KEY) === "granted";
  });

  // Register the custom notification service worker and schedule checks
  const registerNotificationSW = useCallback(async () => {
    if (!("serviceWorker" in navigator)) return;

    try {
      // Register our custom notification SW (separate from Workbox PWA SW)
      const reg = await navigator.serviceWorker.register("/sw-notifications.js", {
        scope: "/",
      });
      console.log("Notification SW registered:", reg.scope);

      // Ask the SW to check for any due notifications now
      if (reg.active) {
        reg.active.postMessage({ type: "CHECK_NOTIFICATIONS" });
      }

      // Also set up periodic check from main thread as fallback
      // (runs while the app tab is open)
      const checkInterval = setInterval(() => {
        if (reg.active) {
          reg.active.postMessage({ type: "CHECK_NOTIFICATIONS" });
        }
      }, 10 * 60 * 1000); // every 10 minutes

      return () => clearInterval(checkInterval);
    } catch (err) {
      console.warn("Failed to register notification SW:", err);
    }
  }, []);

  useEffect(() => {
    if (permissionGranted && !Capacitor.isNativePlatform()) {
      registerNotificationSW();
    }
  }, [permissionGranted, registerNotificationSW]);

  // Capacitor native notifications
  useEffect(() => {
    if (Capacitor.isNativePlatform() && permissionGranted) {
      setupCapacitorNotifications();
    }
  }, [permissionGranted]);

  const setupCapacitorNotifications = async () => {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      await LocalNotifications.cancel({
        notifications: [{ id: 1001 }, { id: 1002 }],
      });
      await LocalNotifications.schedule({
        notifications: [
          {
            id: 1001,
            title: "💊 Daily Medication Check",
            body: "Have you taken all of your medications today? Open TalLipid to log it.",
            schedule: {
              on: { hour: 20, minute: 30 },
              repeats: true,
              allowWhileIdle: true,
            },
            sound: "default",
          },
          {
            id: 1002,
            title: "📹 Weekly Health Check-in",
            body: "Your scheduled video call with the AI Health Assistant starts now.",
            schedule: {
              on: { weekday: 6, hour: 19, minute: 0 },
              repeats: true,
              allowWhileIdle: true,
            },
            sound: "default",
          },
        ],
      });
    } catch (err) {
      console.warn("Capacitor notification scheduling failed:", err);
    }
  };

  const requestPermission = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const { LocalNotifications } = await import("@capacitor/local-notifications");
        const perm = await LocalNotifications.requestPermissions();
        if (perm.display === "granted") {
          setPermissionGranted(true);
          localStorage.setItem(PERMISSION_KEY, "granted");
          await setupCapacitorNotifications();
        }
      } catch (err) {
        console.warn("Capacitor permission request failed:", err);
      }
    } else {
      if (!("Notification" in window)) {
        console.warn("Notifications not supported in this browser");
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        setPermissionGranted(true);
        localStorage.setItem(PERMISSION_KEY, "granted");
        await registerNotificationSW();
        // Show a test notification to confirm it works
        new Notification("✅ TalLipid Notifications Enabled", {
          body: "You will receive daily medication reminders at 20:30 and weekly check-in reminders on Fridays at 19:00.",
          icon: "/pwa-icon-192.png",
        });
      }
    }
  };

  // Utility: send admin notification via SW
  const showAdminNotification = useCallback((title: string, body: string) => {
    if (!permissionGranted) return;

    if (Capacitor.isNativePlatform()) {
      import("@capacitor/local-notifications").then(({ LocalNotifications }) => {
        LocalNotifications.schedule({
          notifications: [{
            id: Math.floor(Math.random() * 100000),
            title,
            body,
            sound: "default",
          }],
        });
      });
    } else if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.active?.postMessage({ type: "SHOW_ADMIN_NOTIFICATION", title, body });
      });
    } else if ("Notification" in window) {
      new Notification(title, { body, icon: "/pwa-icon-192.png" });
    }
  }, [permissionGranted]);

  return { permissionGranted, requestPermission, showAdminNotification };
}

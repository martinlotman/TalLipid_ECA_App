import { useEffect, useState, useCallback } from "react";
import { Capacitor } from "@capacitor/core";

const PERMISSION_KEY = "tallipid_notif_permission";

export function useNotifications() {
  const [permissionGranted, setPermissionGranted] = useState(() => {
    return localStorage.getItem(PERMISSION_KEY) === "granted";
  });

  // Register the custom notification service worker and schedule checks (PWA only)
  const registerNotificationSW = useCallback(async () => {
    if (!("serviceWorker" in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.register("/sw-notifications.js", {
        scope: "/",
      });
      console.log("Notification SW registered:", reg.scope);
      if (reg.active) {
        reg.active.postMessage({ type: "CHECK_NOTIFICATIONS" });
      }
      const checkInterval = setInterval(() => {
        if (reg.active) {
          reg.active.postMessage({ type: "CHECK_NOTIFICATIONS" });
        }
      }, 10 * 60 * 1000);
      return () => clearInterval(checkInterval);
    } catch (err) {
      console.warn("Failed to register notification SW:", err);
    }
  }, []);

  // Setup native push notifications (FCM/APNs)
  const setupNativePush = useCallback(async () => {
    try {
      const { PushNotifications } = await import("@capacitor/push-notifications");

      // Listen for registration success
      await PushNotifications.addListener("registration", (token) => {
        console.log("Push registration token:", token.value);
        // TODO: Send token to backend for server-side push
      });

      await PushNotifications.addListener("registrationError", (err) => {
        console.error("Push registration error:", err.error);
      });

      // Handle foreground notifications
      await PushNotifications.addListener("pushNotificationReceived", (notification) => {
        console.log("Push notification received:", notification);
      });

      // Handle notification tap
      await PushNotifications.addListener("pushNotificationActionPerformed", (notification) => {
        console.log("Push notification action:", notification);
      });

      await PushNotifications.register();
    } catch (err) {
      console.warn("Native push setup failed:", err);
    }
  }, []);

  // Setup Capacitor local notifications for scheduled reminders
  const setupCapacitorNotifications = useCallback(async () => {
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
      console.log("Local notifications scheduled");
    } catch (err) {
      console.warn("Capacitor notification scheduling failed:", err);
    }
  }, []);

  useEffect(() => {
    if (!permissionGranted) return;

    if (Capacitor.isNativePlatform()) {
      setupCapacitorNotifications();
      setupNativePush();
    } else {
      registerNotificationSW();
    }
  }, [permissionGranted, registerNotificationSW, setupCapacitorNotifications, setupNativePush]);

  const requestPermission = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        // Request local notification permissions
        const { LocalNotifications } = await import("@capacitor/local-notifications");
        const localPerm = await LocalNotifications.requestPermissions();

        // Request push notification permissions
        const { PushNotifications } = await import("@capacitor/push-notifications");
        const pushPerm = await PushNotifications.requestPermissions();

        if (localPerm.display === "granted" || pushPerm.receive === "granted") {
          setPermissionGranted(true);
          localStorage.setItem(PERMISSION_KEY, "granted");
          await setupCapacitorNotifications();
          await setupNativePush();
        }
      } catch (err) {
        console.warn("Native permission request failed:", err);
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
        new Notification("✅ TalLipid Notifications Enabled", {
          body: "You will receive daily medication reminders at 20:30 and weekly check-in reminders on Fridays at 19:00.",
          icon: "/pwa-icon-192.png",
        });
      }
    }
  };

  // Utility: send admin notification
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

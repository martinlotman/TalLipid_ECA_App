import { useEffect, useState } from "react";
import { LocalNotifications, ScheduleOn } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";

const MEDICATION_NOTIFICATION_ID = 1001;
const VIDEO_CALL_NOTIFICATION_ID = 1002;

export function useNotifications() {
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    initNotifications();
  }, []);

  const initNotifications = async () => {
    if (Capacitor.isNativePlatform()) {
      await setupCapacitorNotifications();
    } else {
      await setupWebNotifications();
    }
  };

  const setupCapacitorNotifications = async () => {
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display === "granted") {
      setPermissionGranted(true);
      await scheduleCapacitorNotifications();
    }
  };

  const scheduleCapacitorNotifications = async () => {
    // Cancel existing before re-scheduling
    await LocalNotifications.cancel({
      notifications: [
        { id: MEDICATION_NOTIFICATION_ID },
        { id: VIDEO_CALL_NOTIFICATION_ID },
      ],
    });

    await LocalNotifications.schedule({
      notifications: [
        {
          id: MEDICATION_NOTIFICATION_ID,
          title: "💊 Daily Medication Check",
          body: "Have you taken all of your medications today? Open HealthTrack to log it.",
          schedule: {
            on: { hour: 20, minute: 30 },
            repeats: true,
            allowWhileIdle: true,
          },
          sound: "default",
          actionTypeId: "MEDICATION_CHECK",
        },
        {
          id: VIDEO_CALL_NOTIFICATION_ID,
          title: "📹 Weekly Health Check-in",
          body: "Your scheduled video call with the AI Health Assistant starts now. Tap to join!",
          schedule: {
            on: { weekday: 6, hour: 19, minute: 0 } as ScheduleOn, // Friday = 6 in Capacitor (1=Sun)
            repeats: true,
            allowWhileIdle: true,
          },
          sound: "default",
          actionTypeId: "VIDEO_CALL",
        },
      ],
    });
  };

  const setupWebNotifications = async () => {
    if (!("Notification" in window)) return;

    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      setPermissionGranted(true);
      scheduleWebNotifications();
    }
  };

  const scheduleWebNotifications = () => {
    // Schedule daily medication reminder at 20:30
    scheduleDailyWeb(20, 30, {
      title: "💊 Daily Medication Check",
      body: "Have you taken all of your medications today? Open HealthTrack to log it.",
    });

    // Schedule weekly Friday video call reminder at 19:00
    scheduleWeeklyWeb(5, 19, 0, {
      title: "📹 Weekly Health Check-in",
      body: "Your scheduled video call with the AI Health Assistant starts now. Tap to join!",
    });
  };

  const scheduleDailyWeb = (
    hour: number,
    minute: number,
    opts: { title: string; body: string }
  ) => {
    const now = new Date();
    const next = new Date();
    next.setHours(hour, minute, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);

    const delay = next.getTime() - now.getTime();
    setTimeout(() => {
      new Notification(opts.title, { body: opts.body, icon: "/favicon.ico" });
      // Re-schedule for next day
      scheduleDailyWeb(hour, minute, opts);
    }, delay);
  };

  const scheduleWeeklyWeb = (
    dayOfWeek: number, // 0=Sun, 5=Fri
    hour: number,
    minute: number,
    opts: { title: string; body: string }
  ) => {
    const now = new Date();
    const next = new Date();
    next.setHours(hour, minute, 0, 0);
    const daysUntil = (dayOfWeek - now.getDay() + 7) % 7 || 7;
    next.setDate(now.getDate() + daysUntil);
    if (next <= now) next.setDate(next.getDate() + 7);

    const delay = next.getTime() - now.getTime();
    setTimeout(() => {
      new Notification(opts.title, { body: opts.body, icon: "/favicon.ico" });
      scheduleWeeklyWeb(dayOfWeek, hour, minute, opts);
    }, delay);
  };

  const requestPermission = async () => {
    await initNotifications();
  };

  return { permissionGranted, requestPermission };
}

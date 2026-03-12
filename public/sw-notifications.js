// Custom service worker for scheduled notifications
// This runs independently of the main app

const MEDICATION_HOUR = 20;
const MEDICATION_MINUTE = 30;
const VIDEO_CALL_DAY = 5; // Friday (0=Sun)
const VIDEO_CALL_HOUR = 19;
const VIDEO_CALL_MINUTE = 0;

const LAST_MED_KEY = "lastMedNotifDate";
const LAST_VIDEO_KEY = "lastVideoNotifDate";

// Check and show scheduled notifications
async function checkScheduledNotifications() {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const weekStr = `${now.getFullYear()}-W${Math.ceil(now.getDate() / 7)}-${now.getDay()}`;

  // Daily medication reminder at 20:30
  if (now.getHours() >= MEDICATION_HOUR && now.getMinutes() >= MEDICATION_MINUTE) {
    const cache = await caches.open("notification-state");
    const lastMed = await cache.match(LAST_MED_KEY);
    const lastMedDate = lastMed ? await lastMed.text() : "";

    if (lastMedDate !== todayStr) {
      await self.registration.showNotification("💊 Daily Medication Check", {
        body: "Have you taken all of your medications today? Open TalLipid to log it.",
        icon: "/pwa-icon-192.png",
        badge: "/pwa-icon-192.png",
        tag: "medication-daily",
        renotify: true,
        vibrate: [200, 100, 200],
        requireInteraction: true,
        data: { url: "/" },
      });
      await cache.put(LAST_MED_KEY, new Response(todayStr));
    }
  }

  // Weekly Friday video call reminder at 19:00
  if (now.getDay() === VIDEO_CALL_DAY && now.getHours() >= VIDEO_CALL_HOUR && now.getMinutes() >= VIDEO_CALL_MINUTE) {
    const cache = await caches.open("notification-state");
    const lastVideo = await cache.match(LAST_VIDEO_KEY);
    const lastVideoDate = lastVideo ? await lastVideo.text() : "";

    if (lastVideoDate !== todayStr) {
      await self.registration.showNotification("📹 Weekly Health Check-in", {
        body: "Your scheduled video call with the AI Health Assistant starts now. Tap to join!",
        icon: "/pwa-icon-192.png",
        badge: "/pwa-icon-192.png",
        tag: "video-call-weekly",
        renotify: true,
        vibrate: [200, 100, 200],
        requireInteraction: true,
        data: { url: "/" },
      });
      await cache.put(LAST_VIDEO_KEY, new Response(todayStr));
    }
  }
}

// Handle notification clicks — open the app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

// Handle messages from the main app
self.addEventListener("message", (event) => {
  if (event.data?.type === "CHECK_NOTIFICATIONS") {
    checkScheduledNotifications();
  }
  if (event.data?.type === "SHOW_ADMIN_NOTIFICATION") {
    const { title, body } = event.data;
    self.registration.showNotification(title, {
      body,
      icon: "/pwa-icon-192.png",
      badge: "/pwa-icon-192.png",
      tag: "admin-notification",
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url: "/" },
    });
  }
});

// Periodic check every 15 minutes (while SW is alive)
setInterval(checkScheduledNotifications, 15 * 60 * 1000);

// Also check on SW activation
self.addEventListener("activate", (event) => {
  event.waitUntil(checkScheduledNotifications());
});

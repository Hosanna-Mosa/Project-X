// Minimal service worker for browser Web Push on the admin/support/vendor dashboard.
// Handles two events: an incoming push (show a system notification) and a click on that
// notification (focus an already-open dashboard tab, or open a new one, at the right screen).

self.addEventListener("push", (event) => {
  let payload = { title: "New notification", body: "", data: {} };
  try {
    if (event.data) payload = event.data.json();
  } catch (err) {
    // Not JSON — fall back to plain text so we still show something.
    payload = { title: "New notification", body: event.data ? event.data.text() : "", data: {} };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "New notification", {
      body: payload.body || "",
      icon: "/favicon.ico",
      data: payload.data || {},
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const deepLink = event.notification.data?.deepLink;
  const targetPath = deepLink && typeof deepLink === "object" && typeof deepLink.screen === "string" ? deepLink.screen : "/";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const targetUrl = new URL(targetPath, self.location.origin).href;

      // Reuse an already-open dashboard tab if we have one, navigating it to the right screen.
      for (const client of allClients) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) await client.navigate(targetUrl);
          return;
        }
      }

      await self.clients.openWindow(targetUrl);
    })()
  );
});

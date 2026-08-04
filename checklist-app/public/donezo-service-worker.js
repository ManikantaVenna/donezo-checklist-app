self.addEventListener("push", (event) => {
  let payload = {
    title: "Daily routines waiting",
    body: "You still have daily routines to finish in Donezo.",
    url: "/",
  };

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch (_err) {
      payload.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/donezo-256.png",
      badge: "/icons/donezo-256.png",
      tag: `donezo-daily-reminder-${Date.now()}`,
      renotify: true,
      requireInteraction: true,
      timestamp: Date.now(),
      data: { url: payload.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/", self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const existingClient = clients.find((client) => client.url === targetUrl);
        if (existingClient) return existingClient.focus();
        return self.clients.openWindow(targetUrl);
      }),
  );
});

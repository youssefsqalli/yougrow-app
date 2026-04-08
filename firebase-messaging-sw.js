importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');
importScripts('./firebase-sw-config.js');

let initialized = false;
let messaging = null;

function initMessaging(config) {
  if (initialized) return;
  firebase.initializeApp(config);
  messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || "YouGrow";
    const options = {
      body: payload.notification?.body || "Create your top priorities for today.",
      icon: payload.notification?.icon,
      tag: "vat-fcm-reminder",
      renotify: true,
      data: payload.data || {},
    };

    self.registration.showNotification(title, options);
  });
  initialized = true;
}

if (self.FIREBASE_SW_CONFIG && self.FIREBASE_SW_CONFIG.apiKey) {
  initMessaging(self.FIREBASE_SW_CONFIG);
}

self.addEventListener('message', (event) => {
  if (!event.data || event.data.type !== 'INIT_FIREBASE_SW') return;

  const config = event.data.config;
  if (!config) return;
  initMessaging(config);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('./');
      return null;
    })
  );
});

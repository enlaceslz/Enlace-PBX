// Enlace-PBX Enterprise Service Worker
// Web Push Notifications, Asterisk Call Alerting & Offline Support

const CACHE_NAME = 'enlace-pbx-cache-v1';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo-icon.png',
  '/logo-enlace.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Push Event: Handles incoming Web Push notifications (RFC 8292)
self.addEventListener('push', (event) => {
  let data = {
    title: 'Enlace-PBX: Chamada Recebida',
    body: 'Ramal tocando em segundo plano.',
    icon: '/logo-icon.png',
    badge: '/logo-icon.png',
    tag: 'incoming-call',
    vibrate: [200, 100, 200, 100, 200],
    data: { url: '/' }
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/logo-icon.png',
    badge: data.badge || '/logo-icon.png',
    vibrate: data.vibrate || [200, 100, 200],
    tag: data.tag || 'enlace-call-alert',
    renotify: true,
    data: data.data || { url: '/' },
    actions: data.actions || [
      { action: 'open_call', title: '📞 Atender Webphone' },
      { action: 'dismiss', title: '✕ Recusar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification Click: Focuses existing window or opens the app to answer
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.postMessage({ type: 'OPEN_WEBPHONE_INCOMING', payload: event.notification.data });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/?webphone=open');
      }
    })
  );
});

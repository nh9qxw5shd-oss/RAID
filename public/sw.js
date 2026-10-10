// Served from /raid/sw.js with scope /raid/ (the app is mounted under /raid on the Derby
// Control hub). Nothing is cached: navigations go to the network, so no stale page can be served.
const BASE = '/raid';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));

// Network-first for navigation; let Next.js handle everything else
self.addEventListener('fetch', (e) => {
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match(BASE)));
  }
});

// Show notification from server-side push (future use)
self.addEventListener('push', (e) => {
  if (!e.data) return;
  const { title, body, url } = e.data.json();
  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: `${BASE}/icon.svg`,
      badge: `${BASE}/favicon.svg`,
      data: { url: url || BASE },
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url || BASE;
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then((wins) => {
      const existing = wins.find((w) => w.url.includes(self.location.origin));
      if (existing) { existing.focus(); existing.navigate(url); }
      else clients.openWindow(url);
    })
  );
});

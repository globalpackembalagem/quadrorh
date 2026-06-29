const SW_VERSION = 'quadro-rh-pwa-v2-reserva-faltas-20260629';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', () => {
  // Network-first by default. The system data stays live and updates with Vercel.
});

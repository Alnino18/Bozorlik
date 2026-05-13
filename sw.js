self.addEventListener("install", event => {
  event.waitUntil(
    caches.open("bozorlik-cache").then(cache => {
      return cache.addAll([
        "/",
        "/index.html",
        "/style.css",
        "/app.js",
        "/manifest.json",
        "/icon-192.png",
        "/icon-512.png",
        "/splash.png"
      ]);
    })
  );
});

self.addEventListener("install", evt => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", evt => {
  evt.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", evt => {
  evt.respondWith(
    caches.match(evt.request).then(resp => resp || fetch(evt.request))
  );
});

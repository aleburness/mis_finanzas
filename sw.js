// Mis Finanzas: funciona con y sin internet
const VERSION = "mf-v1";
const BASE = ["./", "./index.html", "./manifest.webmanifest",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/maskable-512.png", "./icons/apple-touch-icon.png", "./icons/icon.svg"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(BASE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // La página: primero internet (para tener la versión nueva), si no hay, la guardada
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(r => {
      const copia = r.clone();
      caches.open(VERSION).then(c => c.put("./index.html", copia));
      return r;
    }).catch(() => caches.match("./index.html")));
    return;
  }

  // Fuentes de Google: usa la guardada y actualízala por detrás
  if (url.hostname.endsWith("fonts.googleapis.com") || url.hostname.endsWith("fonts.gstatic.com")) {
    e.respondWith(caches.open(VERSION).then(async c => {
      const guardada = await c.match(req);
      const red = fetch(req).then(r => { c.put(req, r.clone()); return r; }).catch(() => guardada);
      return guardada || red;
    }));
    return;
  }

  // Lo demás de la app (íconos, manifest): primero lo guardado
  if (url.origin === location.origin) {
    e.respondWith(caches.match(req).then(r => r || fetch(req)));
  }
});

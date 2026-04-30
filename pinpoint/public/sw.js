// PinPoint Service Worker — minimal offline shell + runtime caching
// IMPORTANT: only handles SAME-ORIGIN GET requests. Cross-origin requests
// (Mapbox API, OSM tiles, Supabase, Google APIs, etc.) are passed through
// to the browser's default fetch handler — intercepting them would force
// CORS opaque responses that break MapLibre WebGL textures, etc.
const CACHE = "pinpoint-v5";
const PRECACHE = ["/", "/play", "/library", "/lanes", "/upload", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try { url = new URL(req.url); } catch { return; }

  // Bail for everything cross-origin — let the browser handle it natively.
  // This is critical: Mapbox / OSM tile fetches MUST NOT go through the SW,
  // or they come back as opaque responses that MapLibre cannot render.
  if (url.origin !== self.location.origin) return;

  // Don't intercept API routes, Next data, or auth callbacks.
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname.startsWith("/_next/data/")) return;
  if (url.pathname.startsWith("/auth/")) return;

  // HTML: network-first, fallback to cache.
  const accept = req.headers.get("accept") || "";
  if (accept.includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/")))
    );
    return;
  }

  // Same-origin static assets: stale-while-revalidate.
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetched = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetched;
    })
  );
});

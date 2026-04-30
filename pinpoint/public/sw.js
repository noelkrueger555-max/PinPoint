// PinPoint Service Worker — minimal offline shell + runtime caching
// IMPORTANT: only handles SAME-ORIGIN GET requests. Cross-origin requests
// (Mapbox API, OSM tiles, Supabase, Google APIs, etc.) are passed through
// to the browser's default fetch handler — intercepting them would force
// CORS opaque responses that break MapLibre WebGL textures, etc.
//
// Cache versioning: the registering page passes `?v=<buildId>` so each new
// deploy gets a unique cache, and old caches are purged in `activate`.
const SW_VERSION = (() => {
  try {
    const v = new URL(self.location.href).searchParams.get("v");
    return v && v.length > 0 ? v : "dev";
  } catch {
    return "dev";
  }
})();
const CACHE = `pinpoint-${SW_VERSION}`;
const PRECACHE = ["/", "/play", "/library", "/lanes", "/upload", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE).catch(() => {}))
  );
  // Do NOT call skipWaiting() here — we wait until the user accepts the
  // "neue Version verfügbar" toast (which posts a SKIP_WAITING message).
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Allow the page to trigger an immediate activation when the user accepts
// the "neue Version verfügbar" toast.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
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

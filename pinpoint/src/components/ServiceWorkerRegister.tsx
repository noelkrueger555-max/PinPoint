"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    // Purge any stale caches eagerly — old SW versions cached cross-origin
    // tile responses opaquely which broke MapLibre. Keeping only the most
    // recent same-origin cache.
    if (typeof caches !== "undefined") {
      caches.keys().then((keys) => {
        for (const k of keys) {
          if (!k.startsWith("pinpoint-v5")) {
            caches.delete(k).catch(() => {});
          }
        }
      }).catch(() => {});
    }

    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((reg) => {
        // Force a check for an updated sw.js on every load.
        try { reg.update(); } catch {}
        // When a newly installed worker takes control, reload once so the
        // page runs against the new code instead of the old controller.
        let reloaded = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (reloaded) return;
          reloaded = true;
          window.location.reload();
        });
      })
      .catch(() => {});
  }, []);
  return null;
}

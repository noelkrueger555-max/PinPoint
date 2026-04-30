"use client";

import { useEffect, useState } from "react";

/**
 * Service-worker registration with a controlled update prompt.
 *
 * Old behaviour: SW called `skipWaiting()` + `clients.claim()` → page
 * auto-reloaded under the user (sometimes mid-game). Bad UX.
 *
 * New behaviour:
 * 1. Register `/sw.js?v=<buildId>` so each deploy gets a fresh cache.
 * 2. Detect when a new worker is `installed` while the current page is
 *    still controlled by the old worker → flag `updateAvailable`.
 * 3. Render a small toast inviting the user to refresh.
 * 4. On click: post `SKIP_WAITING` to the waiting worker, listen for
 *    `controllerchange`, then reload exactly once.
 */
export default function ServiceWorkerRegister() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const buildId = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";
    const swUrl = `/sw.js?v=${encodeURIComponent(buildId)}`;

    // Purge any stale caches that don't match the current build id.
    if (typeof caches !== "undefined") {
      caches
        .keys()
        .then((keys) => {
          for (const k of keys) {
            if (k.startsWith("pinpoint-") && k !== `pinpoint-${buildId}`) {
              caches.delete(k).catch(() => {});
            }
          }
        })
        .catch(() => {});
    }

    let reloaded = false;
    const onControllerChange = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };

    navigator.serviceWorker
      .register(swUrl, { updateViaCache: "none" })
      .then((reg) => {
        try {
          reg.update();
        } catch {}

        if (reg.waiting && navigator.serviceWorker.controller) {
          setWaiting(reg.waiting);
        }

        reg.addEventListener("updatefound", () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (
              installing.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              setWaiting(installing);
            }
          });
        });

        navigator.serviceWorker.addEventListener(
          "controllerchange",
          onControllerChange
        );
      })
      .catch(() => {});

    return () => {
      navigator.serviceWorker.removeEventListener?.(
        "controllerchange",
        onControllerChange
      );
    };
  }, []);

  if (!waiting) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: "max(16px, env(safe-area-inset-bottom))",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        background: "var(--paper, #f5efe1)",
        color: "var(--ink, #111)",
        border: "2px solid var(--ink, #111)",
        boxShadow: "4px 4px 0 var(--ink, #111)",
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        fontFamily:
          'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
        fontSize: 13,
        maxWidth: "calc(100vw - 24px)",
      }}
    >
      <span>Neue Version verfügbar.</span>
      <button
        type="button"
        onClick={() => {
          try {
            waiting.postMessage({ type: "SKIP_WAITING" });
          } catch {
            window.location.reload();
          }
        }}
        style={{
          background: "var(--ink, #111)",
          color: "var(--paper, #f5efe1)",
          padding: "4px 10px",
          fontWeight: 700,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          border: "none",
          cursor: "pointer",
        }}
      >
        Aktualisieren
      </button>
      <button
        type="button"
        onClick={() => setWaiting(null)}
        aria-label="Hinweis schließen"
        style={{
          background: "transparent",
          border: "none",
          color: "inherit",
          cursor: "pointer",
          opacity: 0.6,
          fontSize: 16,
          lineHeight: 1,
          padding: 2,
        }}
      >
        ×
      </button>
    </div>
  );
}

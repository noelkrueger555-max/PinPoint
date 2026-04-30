"use client";

/**
 * Tiny in-house toast system (no dependencies).
 *
 * Why not `sonner` / `react-hot-toast`?
 * - Already shipping a service-worker update toast in the same brand style.
 * - Avoids an extra ~12 kB dep for a feature with 3 call sites.
 * - Stays inside the paper / hand-stamp visual language.
 *
 * Usage:
 *   import { toast } from "@/lib/toast";
 *   toast.error("Cloud-Sync fehlgeschlagen");
 *   toast.success("Foto hochgeladen");
 *   toast.info("Tagesfoto aktualisiert");
 *
 * Render `<Toaster />` once in the root layout.
 */

import { useEffect, useState } from "react";

type ToastKind = "info" | "success" | "error";
interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

type Listener = (items: ToastItem[]) => void;

const listeners = new Set<Listener>();
let queue: ToastItem[] = [];
let nextId = 1;

function emit() {
  for (const l of listeners) l(queue);
}

function push(kind: ToastKind, message: string, ttl = 4500) {
  const id = nextId++;
  queue = [...queue, { id, kind, message }];
  emit();
  if (typeof window !== "undefined") {
    window.setTimeout(() => {
      queue = queue.filter((t) => t.id !== id);
      emit();
    }, ttl);
  }
}

export const toast = {
  info: (message: string) => push("info", message),
  success: (message: string) => push("success", message, 3500),
  error: (message: string) => push("error", message, 6000),
};

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => {
    listeners.add(setItems);
    return () => {
      listeners.delete(setItems);
    };
  }, []);
  if (items.length === 0) return null;
  return (
    <div
      aria-live="polite"
      style={{
        position: "fixed",
        top: "max(16px, env(safe-area-inset-top))",
        right: 16,
        zIndex: 9998,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        maxWidth: "min(360px, calc(100vw - 32px))",
        pointerEvents: "none",
      }}
    >
      {items.map((t) => (
        <div
          key={t.id}
          role={t.kind === "error" ? "alert" : "status"}
          style={{
            background: "var(--paper, #f5efe1)",
            color: "var(--ink, #111)",
            border: `2px solid ${
              t.kind === "error"
                ? "var(--pin, #c0392b)"
                : t.kind === "success"
                ? "var(--postal-blue, #1f4e8c)"
                : "var(--ink, #111)"
            }`,
            boxShadow: "4px 4px 0 var(--ink, #111)",
            padding: "10px 14px",
            fontFamily:
              'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
            fontSize: 13,
            lineHeight: 1.4,
            pointerEvents: "auto",
          }}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pinpoint:install-dismissed";

export default function InstallPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISS_KEY)) return;

    // Already running standalone? bail.
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // iOS Safari
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
      // Surface after a short delay to avoid mid-flow interruption
      setTimeout(() => setVisible(true), 4000);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!visible || !evt) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
  };

  const install = async () => {
    try {
      await evt.prompt();
      const choice = await evt.userChoice;
      if (choice.outcome === "accepted") {
        try {
          localStorage.setItem(DISMISS_KEY, String(Date.now()));
        } catch {}
      }
    } catch {
      // ignore — user closed system dialog
    }
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label="App installieren"
      className="fixed z-[100] bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-[360px] paper-card p-4 flex items-start gap-3"
      style={{
        transform: "rotate(-0.3deg)",
        boxShadow: "8px 8px 0 var(--pin)",
        borderColor: "var(--pin)",
      }}
    >
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center border-2 border-ink shrink-0"
        style={{ background: "var(--mustard)" }}
      >
        <Download className="w-5 h-5 text-ink" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-display text-base font-bold leading-tight">
          PinPoint installieren
        </div>
        <div className="text-xs text-ink-soft mt-1">
          Schneller Start vom Homescreen, offline spielbar.
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={install} className="btn-primary text-xs">
            Installieren
          </button>
          <button onClick={dismiss} className="btn-ghost text-xs">
            Später
          </button>
        </div>
      </div>
      <button
        onClick={dismiss}
        aria-label="Schließen"
        className="text-ink-mute hover:text-ink"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

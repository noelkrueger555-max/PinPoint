"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import PageHeader from "@/components/PageHeader";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[route-error]", error);
  }, [error]);

  return (
    <>
      <PageHeader />
      <main className="max-w-[760px] mx-auto px-6 md:px-8 pt-12 pb-20 relative z-[2]">
        <div
          className="paper-card p-8"
          style={{
            transform: "rotate(-0.4deg)",
            borderColor: "var(--pin)",
            boxShadow: "8px 8px 0 var(--pin)",
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="w-7 h-7" style={{ color: "var(--pin)" }} />
            <h1 className="font-display text-3xl font-bold">
              Diese Seite konnte nicht geladen werden
            </h1>
          </div>
          <p className="text-sm text-ink-soft mt-2">
            Eventuell ein temporäres Problem. Versuch&apos;s erneut oder geh zurück.
          </p>
          {error.digest && (
            <div className="mt-4 paper-card-soft p-3 font-mono text-[11px] text-ink-mute">
              digest: {error.digest}
            </div>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={reset} className="btn-primary">
              <RefreshCw className="w-4 h-4" />
              Erneut versuchen
            </button>
            <Link href="/" className="btn-ghost">
              Zur Startseite
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}

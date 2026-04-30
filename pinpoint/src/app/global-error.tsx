"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="de">
      <body
        style={{
          minHeight: "100vh",
          background: "#f5f1e8",
          color: "#1a1816",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
        }}
      >
        <div
          style={{
            maxWidth: 560,
            background: "#fffaf0",
            border: "2px solid #1a1816",
            boxShadow: "8px 8px 0 #c0392b",
            padding: "2rem",
            transform: "rotate(-0.4deg)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <AlertTriangle size={32} color="#c0392b" />
            <div
              style={{
                fontSize: 32,
                fontWeight: 900,
                letterSpacing: "-0.04em",
              }}
            >
              Etwas ist schiefgelaufen
            </div>
          </div>
          <p style={{ color: "#555", fontSize: 14, marginBottom: 16 }}>
            Wir haben den Fehler protokolliert. Du kannst entweder neu laden
            oder zur Startseite zurück.
          </p>
          {error.digest && (
            <div
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, monospace",
                fontSize: 11,
                color: "#888",
                background: "#f0ead8",
                padding: "8px 10px",
                marginBottom: 16,
                border: "1px dashed #888",
              }}
            >
              digest: {error.digest}
            </div>
          )}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={reset}
              style={{
                background: "#c0392b",
                color: "#fffaf0",
                border: "2px solid #1a1816",
                padding: "10px 18px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <RefreshCw size={14} />
              Erneut versuchen
            </button>
            <Link
              href="/"
              style={{
                background: "#fffaf0",
                color: "#1a1816",
                border: "2px solid #1a1816",
                padding: "10px 18px",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Zur Startseite
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}

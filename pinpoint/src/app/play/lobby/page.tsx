"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import AuthGate from "@/components/AuthGate";
import LobbyPlay from "@/components/LobbyPlay";

function LobbyEntry() {
  const [code, setCode] = useState<string | null>(null);
  const [input, setInput] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get("code");
    if (c) setCode(c.toUpperCase());
  }, []);

  if (code) {
    return <LobbyPlay code={code} />;
  }

  return (
    <div className="paper-card p-7 max-w-xl mx-auto mt-12">
      <div className="dashed-pill mb-3">🔑 Lobby beitreten</div>
      <div className="font-display text-2xl font-bold">Code eingeben</div>
      <p className="text-sm text-ink-soft mt-2">
        Du brauchst den 6-stelligen Code aus der Einladung.
      </p>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
        maxLength={6}
        placeholder="ABC123"
        className="paper-input mt-4 font-mono uppercase tracking-[0.3em] text-center text-lg"
      />
      <button
        disabled={input.length !== 6}
        onClick={() => {
          window.history.replaceState(null, "", `?code=${input}`);
          setCode(input);
        }}
        className="btn-primary w-full mt-4"
      >
        Beitreten
      </button>
      <p className="text-xs text-ink-mute mt-4 font-mono">
        Du hast keine Einladung?{" "}
        <Link href="/share" className="btn-link">
          Lobby selbst öffnen
        </Link>
        .
      </p>
    </div>
  );
}

export default function LobbyPage() {
  return (
    <AuthGate
      reason={
        <>
          Lobby-Modus braucht ein <em className="accent-italic">Konto</em> für die
          Server-Validierung.
        </>
      }
    >
      <PageHeader />
      <main className="max-w-[1280px] mx-auto px-6 md:px-8 pt-6 pb-20 relative z-[2]">
        <Suspense fallback={null}>
          <LobbyEntry />
        </Suspense>
      </main>
    </AuthGate>
  );
}

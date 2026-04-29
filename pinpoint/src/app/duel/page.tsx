"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Swords, Users, Loader2, Copy } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import AuthGate from "@/components/AuthGate";
import { isCloudEnabled, getCurrentUser } from "@/lib/supabase";
import { createDuelRoom, joinDuelRoom, type DuelRoom } from "@/lib/duel";
import { listPhotos } from "@/lib/store";

export default function DuelPage() {
  const cloud = isCloudEnabled();
  const [user, setUser] = useState<{ id?: string; email?: string | null } | null>(null);
  const [room, setRoom] = useState<DuelRoom | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cloud) getCurrentUser().then((u) => setUser(u ?? null));
  }, [cloud]);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const photos = await listPhotos();
      if (photos.length < 5) throw new Error("Mindestens 5 Fotos nötig.");
      const r = await createDuelRoom(photos.slice(0, 5).map((p) => p.id));
      setRoom(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  };

  const join = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await joinDuelRoom(code.trim().toUpperCase());
      setRoom(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthGate reason={<>Duell-Modus braucht ein <em className="accent-italic">Konto</em>.</>}>
      <PageHeader />
      <main className="max-w-[1100px] mx-auto px-6 md:px-8 pt-8 pb-20 relative z-[2]">
        <div className="dashed-pill mb-3">⚔ Realtime · 1 vs. 1</div>
        <h1 className="font-display-wonk font-black text-[clamp(40px,6vw,72px)] leading-[0.95] tracking-[-0.04em]">
          Duell <em className="accent-italic">live</em>
        </h1>
        <p className="text-ink-soft mt-3 text-lg max-w-[640px]">
          Beide Spieler sehen dieselben Fotos gleichzeitig. Wer am schnellsten
          und am genauesten tippt, gewinnt.
        </p>

        {!cloud && (
          <div className="mt-10 paper-card-soft p-6 font-mono text-sm text-ink-soft">
            Cloud-Modus nicht konfiguriert. Setze Supabase-Env-Vars und melde dich auf{" "}
            <Link href="/share" className="btn-link">/share</Link> an.
          </div>
        )}

        {cloud && !user && (
          <div className="mt-10 paper-card-soft p-6 font-mono text-sm text-ink-soft">
            Bitte zuerst auf <Link href="/share" className="btn-link">/share</Link> anmelden.
          </div>
        )}

        {cloud && user && !room && (
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-7">
            <div className="paper-card p-7" style={{ transform: "rotate(-0.5deg)" }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-ink mb-4" style={{ background: "var(--pin)", color: "var(--paper)" }}>
                <Swords className="w-5 h-5" />
              </div>
              <span className="tag-pin">Host</span>
              <div className="font-display text-2xl font-bold mt-1">Raum öffnen</div>
              <p className="text-ink-soft mt-2 text-sm">
                5 zufällige Fotos aus deiner Bibliothek. Schick deinem Gegner den Code.
              </p>
              <button onClick={create} disabled={busy} className="btn-primary w-full mt-5">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Swords className="w-4 h-4" />}
                Duell erstellen
              </button>
            </div>

            <div className="paper-card p-7" style={{ transform: "rotate(0.5deg)" }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-ink mb-4" style={{ background: "var(--postal-blue)", color: "var(--paper)" }}>
                <Users className="w-5 h-5" />
              </div>
              <span className="tag-pin">Challenger</span>
              <div className="font-display text-2xl font-bold mt-1">Code eingeben</div>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="6-stelliger Code"
                maxLength={6}
                className="paper-input mt-4 font-mono uppercase tracking-[0.3em] text-center text-lg"
              />
              <button onClick={join} disabled={busy || code.length !== 6} className="btn-ghost w-full mt-3">
                Beitreten
              </button>
            </div>
          </div>
        )}

        {room && (
          <div className="mt-10 paper-card p-8 text-center" style={{ transform: "rotate(-0.3deg)" }}>
            <span className="tag-pin">{room.state === "waiting" ? "Warte auf Gegner" : room.state === "playing" ? "Läuft" : "Beendet"}</span>
            <div className="font-display-wonk font-black text-6xl tracking-[0.2em] my-4" style={{ color: "var(--pin)" }}>
              {room.code}
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(room.code)}
              className="btn-ghost"
            >
              <Copy className="w-3.5 h-3.5" />
              Code kopieren
            </button>
            <div className="mt-6 grid grid-cols-2 gap-4 text-left">
              <div className="paper-card-soft rounded p-4">
                <div className="text-xs font-mono uppercase tracking-wider text-ink-mute">Host</div>
                <div className="font-display text-3xl font-bold tabular-nums" style={{ color: "var(--pin)" }}>{room.host_score}</div>
              </div>
              <div className="paper-card-soft rounded p-4">
                <div className="text-xs font-mono uppercase tracking-wider text-ink-mute">Challenger</div>
                <div className="font-display text-3xl font-bold tabular-nums" style={{ color: "var(--postal-blue)" }}>{room.challenger_score}</div>
              </div>
            </div>
            <p className="mt-6 text-xs font-mono uppercase tracking-wider text-ink-mute">
              ✦ Realtime-Channel aktiv · Round {room.current_round + 1} / {room.photo_ids.length}
            </p>
          </div>
        )}

        {error && (
          <div className="mt-8 paper-card p-5" style={{ borderColor: "var(--pin)", boxShadow: "6px 6px 0 var(--pin)" }}>
            <div className="font-display text-lg font-bold">Fehler</div>
            <div className="text-sm text-ink-soft mt-1">{error}</div>
          </div>
        )}
      </main>
    </AuthGate>
  );
}

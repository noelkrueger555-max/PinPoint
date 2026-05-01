"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { Swords, Users, Loader2, Copy, Share2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import GuestGate from "@/components/GuestGate";
import AlbumPicker from "@/components/AlbumPicker";
import { isCloudEnabled, getCurrentUser, getSupabase } from "@/lib/supabase";
import { createDuelRoom, joinDuelRoom, type DuelRoom } from "@/lib/duel";
import { listAlbumPhotos } from "@/lib/albums";
import { toast } from "@/lib/toast";
import { duelInviteUrl, shareInvite } from "@/lib/invite";
import DuelMatch from "@/components/DuelMatch";

function DuelInner() {
  const cloud = isCloudEnabled();
  const [user, setUser] = useState<{ id?: string; email?: string | null } | null>(null);
  const [room, setRoom] = useState<DuelRoom | null>(null);
  const [code, setCode] = useState("");
  const [albumId, setAlbumId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoJoinTried, setAutoJoinTried] = useState(false);

  useEffect(() => {
    if (cloud) getCurrentUser().then((u) => setUser(u ?? null));
  }, [cloud]);

  // Pre-fill code from ?code= URL param so invite links work directly.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const c = new URLSearchParams(window.location.search).get("code");
    if (c) setCode(c.toUpperCase());
  }, []);

  // Auto-join once we have user + an inbound code.
  useEffect(() => {
    if (autoJoinTried) return;
    if (!user?.id || !code || code.length !== 6 || room) return;
    setAutoJoinTried(true);
    (async () => {
      setBusy(true);
      try {
        const r = await joinDuelRoom(code);
        setRoom(r);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fehler");
      } finally {
        setBusy(false);
      }
    })();
  }, [user?.id, code, room, autoJoinTried]);

  useEffect(() => {
    if (!room) return;
    const sb = getSupabase();
    if (!sb) return;
    let cancelled = false;
    const tick = async () => {
      const { data } = await sb
        .from("duel_rooms")
        .select("*")
        .eq("id", room.id)
        .maybeSingle();
      if (!cancelled && data) setRoom(data as DuelRoom);
    };
    const iv = setInterval(tick, 2500);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [room]);

  const create = async () => {
    if (!albumId) {
      toast.error("Bitte ein Album wählen.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const photos = await listAlbumPhotos(albumId);
      if (photos.length < 5) throw new Error("Album braucht mindestens 5 Fotos.");
      const shuffled = [...photos]
        .sort(() => Math.random() - 0.5)
        .slice(0, 5)
        .map((p) => p.id);
      const r = await createDuelRoom({ photoIds: shuffled, albumId });
      setRoom(r);
      const url = new URL(window.location.href);
      url.searchParams.set("code", r.code);
      window.history.replaceState(null, "", url.toString());
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

  const onShare = () => {
    if (!room) return;
    shareInvite({
      title: "PinPoint Duell",
      text: `Tritt meinem PinPoint-Duell bei – Code ${room.code}`,
      url: duelInviteUrl(room.code),
    });
  };

  const onCopyCode = () => {
    if (!room) return;
    navigator.clipboard.writeText(room.code);
    toast.success("Code kopiert");
  };

  return (
    <>
      <PageHeader />
      <main className="max-w-[1100px] mx-auto px-4 md:px-8 pt-6 pb-20 relative z-[2]">
        <div className="dashed-pill mb-3">⚔ Realtime · 1 vs. 1</div>
        <h1 className="font-display-wonk font-black text-[clamp(40px,6vw,72px)] leading-[0.95] tracking-[-0.04em]">
          Duell <em className="accent-italic">live</em>
        </h1>
        <p className="text-ink-soft mt-3 text-lg max-w-[640px]">
          Beide Spieler sehen dieselben Fotos eines Albums gleichzeitig. Wer
          am schnellsten und am genauesten tippt, gewinnt.
        </p>

        {!cloud && (
          <div className="mt-10 paper-card-soft p-6 font-mono text-sm text-ink-soft">
            Cloud-Modus nicht konfiguriert.
          </div>
        )}

        {cloud && user && !room && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="paper-card p-5 md:p-7" style={{ transform: "rotate(-0.5deg)" }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-ink mb-4" style={{ background: "var(--pin)", color: "var(--paper)" }}>
                <Swords className="w-5 h-5" />
              </div>
              <span className="tag-pin">Host</span>
              <div className="font-display text-2xl font-bold mt-1">Album wählen</div>
              <p className="text-ink-soft mt-2 text-sm mb-4">
                5 zufällige Fotos werden gezogen und mit dem Gegner geteilt.
              </p>
              <AlbumPicker value={albumId} onChange={setAlbumId} minPhotos={5} />
              <button onClick={create} disabled={busy || !albumId} className="btn-primary w-full mt-5">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Swords className="w-4 h-4" />}
                Duell erstellen
              </button>
            </div>

            <div className="paper-card p-5 md:p-7" style={{ transform: "rotate(0.5deg)" }}>
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
                inputMode="text"
                autoCapitalize="characters"
                className="paper-input mt-4 font-mono uppercase tracking-[0.3em] text-center text-lg"
              />
              <button onClick={join} disabled={busy || code.length !== 6} className="btn-ghost w-full mt-3">
                Beitreten
              </button>
            </div>
          </div>
        )}

        {room && room.state === "playing" && user?.id && (
          <div className="mt-8">
            <DuelMatch room={room} meIsHost={room.host === user.id} userId={user.id} />
          </div>
        )}

        {room && room.state !== "playing" && (
          <div className="mt-8 paper-card p-6 md:p-8 text-center" style={{ transform: "rotate(-0.3deg)" }}>
            <span className="tag-pin">{room.state === "waiting" ? "Warte auf Gegner" : "Beendet"}</span>
            <div className="font-display-wonk font-black text-5xl md:text-6xl tracking-[0.2em] my-4" style={{ color: "var(--pin)" }}>
              {room.code}
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
              <button onClick={onShare} className="btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2">
                <Share2 className="w-4 h-4" />
                Einladung teilen
              </button>
              <button onClick={onCopyCode} className="btn-ghost w-full sm:w-auto inline-flex items-center justify-center gap-2">
                <Copy className="w-3.5 h-3.5" />
                Nur Code kopieren
              </button>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 text-left">
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
            <Link href="/duel" className="btn-ghost mt-3 inline-block">Neu starten</Link>
          </div>
        )}
      </main>
    </>
  );
}

export default function DuelPage() {
  return (
    <GuestGate inviteLabel="Duell">
      <Suspense fallback={null}>
        <DuelInner />
      </Suspense>
    </GuestGate>
  );
}

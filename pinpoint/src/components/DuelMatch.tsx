"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Loader2, MapPin, Swords } from "lucide-react";
import { fetchLobbyPhotos } from "@/lib/lobby";
import { submitValidatedSession, type ValidateGuess } from "@/lib/leaderboard";
import {
  reportDuelScore,
  finishDuel,
  subscribeDuel,
  type DuelEvent,
  type DuelRoom,
} from "@/lib/duel";
import { getSupabase } from "@/lib/supabase";
import { evaluateSession, getAchievementById } from "@/lib/achievements";
import { toast } from "@/lib/toast";

const MapPicker = dynamic(() => import("./MapPicker"), { ssr: false });

interface DuelPhoto {
  id: string;
  fullUrl?: string;
  caption: string | null;
  hints: string[] | null;
  difficulty: number;
}

type Phase = "loading" | "playing" | "waiting" | "submitting" | "done" | "error";

export default function DuelMatch({
  room,
  meIsHost,
  userId,
}: {
  room: DuelRoom;
  meIsHost: boolean;
  userId: string;
}) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [photos, setPhotos] = useState<DuelPhoto[]>([]);
  const [index, setIndex] = useState(0);
  const [guess, setGuess] = useState<{ lat: number; lng: number } | null>(null);
  const [guesses, setGuesses] = useState<ValidateGuess[]>([]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const startedAtRef = useRef(0);
  const [opponentDoneRound, setOpponentDoneRound] = useState<number>(-1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [final, setFinal] = useState<{ mine: number; theirs: number | null }>({
    mine: 0,
    theirs: null,
  });

  const sendRef = useRef<((e: DuelEvent) => void) | null>(null);

  // Load photos via the same lobby helper (no lat/lng leakage).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const synthetic = {
          id: room.id,
          code: room.code,
          title: "Duel",
          photo_ids: room.photo_ids,
          lane_ids: [],
          owner: room.host,
          created_at: "",
          expires_at: null,
        };
        const data = await fetchLobbyPhotos(synthetic);
        if (cancelled) return;
        if (!data || data.length === 0) {
          setErrorMsg("Keine Fotos in diesem Raum.");
          setPhase("error");
          return;
        }
        setPhotos(
          data.map((p) => ({
            id: p.id,
            fullUrl: p.fullUrl,
            caption: p.caption ?? null,
            hints: (p as { hints?: string[] | null }).hints ?? null,
            difficulty: p.difficulty,
          }))
        );
        setPhase("playing");
        startedAtRef.current = performance.now();
      } catch (e) {
        if (cancelled) return;
        setErrorMsg(e instanceof Error ? e.message : "Konnte Duell nicht laden.");
        setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [room.id, room.code, room.host, room.photo_ids]);

  // Realtime channel
  useEffect(() => {
    const sub = subscribeDuel(room.code, (e) => {
      if (e.type === "round-end") {
        setOpponentDoneRound(e.round);
      } else if (e.type === "finished") {
        setFinal((prev) => ({
          ...prev,
          theirs: meIsHost ? e.challengerScore : e.hostScore,
        }));
      }
    });
    if (!sub) return;
    sendRef.current = sub.send;
    return () => sub.dispose();
  }, [room.code, meIsHost]);

  const current = photos[index];
  const totalRounds = photos.length;
  const isLast = index + 1 >= totalRounds;
  const photoSrc = useMemo(() => current?.fullUrl ?? null, [current]);

  const submit = () => {
    if (!current || !guess) return;
    const g: ValidateGuess = {
      photoId: current.id,
      guessLat: guess.lat,
      guessLng: guess.lng,
      hintsUsed,
      timeMs: Math.round(performance.now() - startedAtRef.current),
    };
    const all = [...guesses, g];
    setGuesses(all);
    sendRef.current?.({
      type: "round-end",
      round: index,
    });
    if (isLast) {
      finalize(all);
      return;
    }
    setIndex(index + 1);
    setGuess(null);
    setHintsUsed(0);
    startedAtRef.current = performance.now();
  };

  const finalize = async (all: ValidateGuess[]) => {
    setPhase("submitting");
    try {
      const result = await submitValidatedSession({
        mode: "duel",
        guesses: all,
      });
      const myField: "host_score" | "challenger_score" = meIsHost
        ? "host_score"
        : "challenger_score";
      await reportDuelScore(room.id, myField, result.totalScore);
      setFinal((prev) => ({ ...prev, mine: result.totalScore }));

      // Pull the room state once to see if opponent already finished.
      const sb = getSupabase();
      if (sb) {
        const { data: latest } = await sb
          .from("duel_rooms")
          .select("host_score, challenger_score, state")
          .eq("id", room.id)
          .maybeSingle();
        if (latest) {
          const theirs = meIsHost
            ? (latest as { challenger_score: number }).challenger_score
            : (latest as { host_score: number }).host_score;
          if (theirs > 0) {
            setFinal({ mine: result.totalScore, theirs });
          }
          // If both are in, broadcast final + mark room finished.
          if (
            (latest as { host_score: number }).host_score > 0 &&
            (latest as { challenger_score: number }).challenger_score > 0
          ) {
            await finishDuel(room.id);
            sendRef.current?.({
              type: "finished",
              hostScore: (latest as { host_score: number }).host_score,
              challengerScore: (latest as { challenger_score: number }).challenger_score,
            });
          }
        }
      }
      setPhase("done");
      // Achievement evaluation
      try {
        const newly = await evaluateSession({
          mode: "duel",
          totalScore: result.totalScore,
          photoCount: photos.length,
          guessesUnder50: 0,
        });
        for (const id of newly) {
          const a = getAchievementById(id);
          if (a) toast.success(`${a.icon} ${a.title} freigeschaltet!`);
        }
      } catch {}
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Score-Upload fehlgeschlagen");
      setPhase("error");
    }
  };

  if (phase === "loading") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }
  if (phase === "error") {
    return (
      <div className="paper-card p-8 max-w-xl mx-auto mt-12" style={{ borderColor: "var(--pin)" }}>
        <div className="font-display text-2xl font-bold">Duell-Fehler</div>
        <p className="text-sm text-ink-soft mt-2">{errorMsg}</p>
      </div>
    );
  }
  if (phase === "submitting") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin" />
        <div className="text-sm text-ink-soft font-mono">Server-Validierung…</div>
      </div>
    );
  }
  if (phase === "done") {
    const won = final.theirs !== null && final.mine > final.theirs;
    const lost = final.theirs !== null && final.mine < final.theirs;
    const tied = final.theirs !== null && final.mine === final.theirs;
    return (
      <div className="paper-card p-8 max-w-xl mx-auto mt-12 text-center">
        <Swords className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--pin)" }} />
        <div className="font-display-wonk font-black text-5xl tabular-nums" style={{ color: "var(--pin)" }}>
          {final.mine.toLocaleString("de-DE")}
        </div>
        <div className="text-xs font-mono uppercase tracking-wider text-ink-mute mt-1">
          dein Score
        </div>
        <div className="my-4 text-sm text-ink-soft">
          Gegner:{" "}
          <span className="font-display text-2xl font-bold tabular-nums">
            {final.theirs == null ? "wartet…" : final.theirs.toLocaleString("de-DE")}
          </span>
        </div>
        {won && <div className="dashed-pill" style={{ color: "var(--stamp-green)" }}>🏆 Gewonnen</div>}
        {lost && <div className="dashed-pill" style={{ color: "var(--pin)" }}>Knapp daneben</div>}
        {tied && <div className="dashed-pill">Unentschieden</div>}
        {final.theirs == null && (
          <div className="dashed-pill">Wir warten auf den Gegner…</div>
        )}
      </div>
    );
  }

  // playing
  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-xs font-mono uppercase tracking-wider text-ink-mute">
        <span>
          Runde {index + 1} / {totalRounds} · {meIsHost ? "Host" : "Challenger"}
        </span>
        <span>
          Gegner: Runde {opponentDoneRound + 1 || "—"}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[calc(100vh-200px)] min-h-[560px]">
        <div className="paper-card relative overflow-hidden">
          {photoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoSrc} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-ink-soft">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}
        </div>
        <div className="paper-card relative overflow-hidden">
          <MapPicker onPick={(lat, lng) => setGuess({ lat, lng })} />
          <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
            {(current?.hints?.length ?? 0) > 0 && (
              <button
                type="button"
                disabled={hintsUsed >= (current?.hints?.length ?? 0)}
                onClick={() => setHintsUsed((h) => h + 1)}
                className="btn-ghost"
              >
                Hinweis ({hintsUsed}/{current?.hints?.length})
              </button>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => setGuess(null)}
              className="btn-ghost"
            >
              Zurücksetzen
            </button>
            <button
              type="button"
              disabled={!guess}
              onClick={submit}
              className="btn-primary"
            >
              <MapPin className="w-4 h-4" />
              {isLast ? "Abschluss" : "Tipp abgeben"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      <div className="mt-2 text-[11px] font-mono uppercase tracking-wider text-ink-mute">
        Daten: {userId.slice(0, 8)}…
      </div>
    </div>
  );
}

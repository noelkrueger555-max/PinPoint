"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Loader2, MapPin, Trophy } from "lucide-react";
import { fetchLobbyByCode, fetchLobbyPhotos, type LobbyPayload } from "@/lib/lobby";
import { submitValidatedSession, type ValidateGuess } from "@/lib/leaderboard";
import { reportPhoto, type ReportReason } from "@/lib/moderation";
import { evaluateSession, getAchievementById } from "@/lib/achievements";
import { toast } from "@/lib/toast";

const MapPicker = dynamic(() => import("./MapPicker"), { ssr: false });

interface LobbyPhoto {
  id: string;
  fullUrl?: string;
  thumbUrl?: string;
  caption: string | null;
  hints: string[] | null;
  difficulty: number;
}

type Phase = "loading" | "missing" | "playing" | "submitting" | "done" | "error";

export default function LobbyPlay({ code }: { code: string }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lobby, setLobby] = useState<LobbyPayload | null>(null);
  const [photos, setPhotos] = useState<LobbyPhoto[]>([]);
  const [index, setIndex] = useState(0);
  const [guess, setGuess] = useState<{ lat: number; lng: number } | null>(null);
  const [guesses, setGuesses] = useState<ValidateGuess[]>([]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const startedAtRef = useRef(0);
  const [final, setFinal] = useState<{ total: number; rounds: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const lp = await fetchLobbyByCode(code);
        if (cancelled) return;
        if (!lp) {
          setPhase("missing");
          return;
        }
        setLobby(lp);
        const data = await fetchLobbyPhotos(lp);
        if (cancelled) return;
        if (!data || data.length === 0) {
          setPhase("missing");
          return;
        }
        setPhotos(
          data.map((p) => ({
            id: p.id,
            fullUrl: p.fullUrl,
            thumbUrl: p.thumbUrl,
            caption: p.caption ?? null,
            hints: (p as { hints?: string[] | null }).hints ?? null,
            difficulty: p.difficulty,
          }))
        );
        setPhase("playing");
        startedAtRef.current = performance.now();
      } catch (e) {
        if (cancelled) return;
        setErrorMsg(e instanceof Error ? e.message : "Lobby konnte nicht geladen werden.");
        setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  const current = photos[index];
  const totalRounds = photos.length;
  const isLast = index + 1 >= totalRounds;

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
        mode: "lobby",
        lobbyId: lobby?.id,
        guesses: all,
      });
      setFinal({ total: result.totalScore, rounds: result.validatedRounds });
      setPhase("done");
      toast.success("Lobby-Score serverseitig bestätigt");
      // Achievement evaluation (local-only, best-effort)
      try {
        const newly = await evaluateSession({
          mode: "lobby",
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
      toast.error(e instanceof Error ? e.message : "Score-Upload fehlgeschlagen");
      setPhase("error");
      setErrorMsg(e instanceof Error ? e.message : "Score-Upload fehlgeschlagen");
    }
  };

  const totalHints = current?.hints?.length ?? 0;
  const hintsRemaining = totalHints - hintsUsed;

  const photoSrc = useMemo(() => current?.fullUrl ?? current?.thumbUrl ?? null, [current]);

  if (phase === "loading") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }
  if (phase === "missing") {
    return (
      <div className="paper-card p-8 max-w-xl mx-auto mt-12">
        <div className="font-display text-2xl font-bold">Lobby nicht gefunden</div>
        <p className="text-sm text-ink-soft mt-2">
          Der Code <code className="font-mono">{code}</code> existiert nicht oder ist abgelaufen.
        </p>
      </div>
    );
  }
  if (phase === "error") {
    return (
      <div className="paper-card p-8 max-w-xl mx-auto mt-12" style={{ borderColor: "var(--pin)" }}>
        <div className="font-display text-2xl font-bold">Fehler</div>
        <p className="text-sm text-ink-soft mt-2">{errorMsg}</p>
      </div>
    );
  }
  if (phase === "submitting") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin" />
        <div className="text-sm text-ink-soft font-mono">Score wird serverseitig validiert…</div>
      </div>
    );
  }
  if (phase === "done" && final) {
    return (
      <div className="paper-card p-8 max-w-xl mx-auto mt-12 text-center">
        <Trophy className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--pin)" }} />
        <div className="font-display-wonk font-black text-5xl tabular-nums" style={{ color: "var(--pin)" }}>
          {final.total.toLocaleString("de-DE")}
        </div>
        <div className="text-xs font-mono uppercase tracking-wider text-ink-mute mt-2">
          {final.rounds} / {totalRounds} Runden bestätigt
        </div>
        <p className="text-sm text-ink-soft mt-4">
          Tipp: Vergleiche dich mit anderen unter{" "}
          <a href="/leaderboard" className="btn-link">/leaderboard</a>.
        </p>
      </div>
    );
  }

  // playing
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[calc(100vh-160px)] min-h-[560px]">
      <div className="paper-card relative overflow-hidden">
        {photoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoSrc} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-soft">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        )}
        <div className="absolute top-3 left-3 dashed-pill bg-paper">
          Runde {index + 1} / {totalRounds}
        </div>
        {current?.caption && (
          <div className="absolute bottom-3 left-3 right-3 paper-card-soft p-2 text-xs italic">
            “{current.caption}”
          </div>
        )}
      </div>

      <div className="paper-card relative overflow-hidden">
        <MapPicker onPick={(lat, lng) => setGuess({ lat, lng })} />
        <AnimatePresence>
          <motion.div
            key={`bar-${index}`}
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute bottom-3 left-3 right-3 flex items-center gap-2"
          >
            {totalHints > 0 && (
              <button
                type="button"
                disabled={hintsRemaining <= 0}
                onClick={() => setHintsUsed((h) => h + 1)}
                className="btn-ghost"
                title={
                  hintsRemaining <= 0
                    ? "Keine Hinweise mehr"
                    : `Hinweis (${hintsUsed}/${totalHints} — −15%)`
                }
              >
                Hinweis ({hintsUsed}/{totalHints})
              </button>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => {
                setGuess(null);
                toast.info("Tipp zurückgesetzt");
              }}
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
          </motion.div>
        </AnimatePresence>
        {current && <ReportInline photoId={current.id} />}
        {hintsUsed > 0 && current?.hints && (
          <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-1.5">
            {current.hints.slice(0, hintsUsed).map((h, i) => (
              <span
                key={i}
                className="paper-card-soft px-2 py-0.5 text-xs"
                style={{ borderColor: "var(--mustard, #c89b1e)" }}
              >
                {h}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReportInline({ photoId }: { photoId: string }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const reasons: { id: ReportReason; label: string }[] = [
    { id: "nsfw", label: "NSFW" },
    { id: "private-info", label: "Privat" },
    { id: "spam", label: "Spam" },
    { id: "other", label: "Sonst." },
  ];
  if (done) {
    return (
      <span className="absolute top-3 right-3 text-[10px] font-mono uppercase tracking-wider text-ink-mute">
        ✓ gemeldet
      </span>
    );
  }
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="absolute top-3 right-3 text-[10px] font-mono uppercase tracking-wider text-ink-mute hover:text-ink"
      >
        melden
      </button>
    );
  }
  return (
    <div className="absolute top-3 right-3 flex gap-1 paper-card-soft p-1">
      {reasons.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={async () => {
            try {
              await reportPhoto(photoId, r.id);
              toast.success("Meldung gesendet");
              setDone(true);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Meldung fehlgeschlagen");
            }
          }}
          className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 hover:bg-ink hover:text-paper"
        >
          {r.label}
        </button>
      ))}
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-[10px] font-mono px-1 text-ink-mute"
      >
        ×
      </button>
    </div>
  );
}

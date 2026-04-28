"use client";

import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  MapPin,
  Trophy,
  Lightbulb,
  Timer,
  Lock,
  Film,
  Loader2,
  Download,
} from "lucide-react";
import { getLane, getPhoto, listPhotos } from "@/lib/store";
import { calcScore, formatDistance, haversineKm } from "@/lib/geo";
import {
  DIFFICULTY_COLORS,
  DIFFICULTY_LABELS,
  type GameMode,
  type Guess,
  type Photo,
} from "@/lib/types";
import { recordGuess, recordSession } from "@/lib/stats";
import { exportLaneRecap } from "@/lib/recap";
import { isCloudEnabled } from "@/lib/supabase";
import { submitDailyScore } from "@/lib/leaderboard";
import { sfx, haptic } from "@/lib/feedback";
import { evaluateSession, getAchievementById } from "@/lib/achievements";

const MapPicker = dynamic(() => import("./MapPicker"), { ssr: false });

const ROUND_SIZE = 5;
const SPEEDRUN_SECONDS = 20;

type Phase = "loading" | "empty" | "playing" | "reveal" | "done";

interface GameProps {
  mode?: GameMode;
  laneId?: string;
}

export default function Game({ mode = "classic", laneId }: GameProps) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [laneTitle, setLaneTitle] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [guess, setGuess] = useState<{ lat: number; lng: number } | null>(null);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [unlockedNow, setUnlockedNow] = useState<{ id: string; title: string; icon: string; description: string; rarity: string }[]>([]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(SPEEDRUN_SECONDS);

  // load round
  useEffect(() => {
    (async () => {
      let round: Photo[] = [];
      if (mode === "lane" && laneId) {
        const lane = await getLane(laneId);
        if (!lane) {
          setPhase("empty");
          return;
        }
        setLaneTitle(lane.title);
        const list = await Promise.all(lane.photoIds.map(getPhoto));
        round = list.filter((p): p is Photo => !!p);
      } else if (mode === "daily") {
        const all = await listPhotos();
        if (all.length === 0) {
          setPhase("empty");
          return;
        }
        const today = new Date().toISOString().slice(0, 10);
        const seed = [...today].reduce((s, c) => s + c.charCodeAt(0), 0);
        round = [...all]
          .map((p, i) => ({ p, k: ((i + 1) * 9301 + seed * 49297) % 233280 }))
          .sort((a, b) => a.k - b.k)
          .slice(0, Math.min(ROUND_SIZE, all.length))
          .map((x) => x.p);
      } else {
        const all = await listPhotos();
        if (all.length === 0) {
          setPhase("empty");
          return;
        }
        round = [...all]
          .sort(() => Math.random() - 0.5)
          .slice(0, Math.min(ROUND_SIZE, all.length));
      }

      if (round.length === 0) {
        setPhase("empty");
        return;
      }
      setPhotos(round);
      setPhase("playing");
      setStartedAt(performance.now());
      setTimeLeft(SPEEDRUN_SECONDS);
    })();
  }, [mode, laneId]);

  const current = photos[index];

  useEffect(() => {
    if (!current) {
      setPhotoUrl(null);
      return;
    }
    const url = URL.createObjectURL(current.blob);
    setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [current]);

  const totalScore = useMemo(
    () => guesses.reduce((s, g) => s + g.score, 0),
    [guesses]
  );

  const submitInternal = (g: { lat: number; lng: number } | null) => {
    if (!current) return;
    const distanceKm = g
      ? haversineKm({ lat: current.lat, lng: current.lng }, g)
      : 20015;
    let score = calcScore({
      distanceKm,
      difficulty: current.difficulty,
      hintsPenalty: hintsUsed * 0.15,
    });
    if (mode === "no-move") score = Math.round(score * 1.5);
    if (mode === "speedrun") {
      const bonus = Math.max(0, timeLeft / SPEEDRUN_SECONDS);
      score = Math.round(score * (1 + bonus * 0.4));
    }
    const newGuess: Guess = {
      photoId: current.id,
      guessLat: g?.lat ?? 0,
      guessLng: g?.lng ?? 0,
      distanceKm,
      score,
      hintsUsed,
      timeMs: performance.now() - startedAt,
    };
    setGuesses((prev) => [...prev, newGuess]);
    recordGuess(newGuess, current);
    // Audio + haptic feedback based on quality
    if (distanceKm < 1) { sfx.perfect(); haptic("success"); }
    else if (distanceKm < 100) { sfx.reveal(); haptic("medium"); }
    else { sfx.fail(); haptic("light"); }
    setPhase("reveal");
  };

  const submit = () => {
    if (!guess) return;
    sfx.submit();
    haptic("medium");
    submitInternal(guess);
  };

  // speedrun timer
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    if (mode !== "speedrun" || phase !== "playing") return;
    setTimeLeft(SPEEDRUN_SECONDS);
    const start = performance.now();
    const tick = () => {
      const elapsed = (performance.now() - start) / 1000;
      const left = Math.max(0, SPEEDRUN_SECONDS - elapsed);
      setTimeLeft(left);
      if (left <= 0) {
        submitInternal(guess);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, phase, mode]);

  const next = () => {
    if (index + 1 >= photos.length) {
      recordSession({
        mode,
        totalScore,
        photoCount: photos.length,
      });
      // Cloud submit for daily mode (best-effort, ignore failures)
      if (mode === "daily" && isCloudEnabled()) {
        const today = new Date().toISOString().slice(0, 10);
        submitDailyScore(today, totalScore).catch(() => {});
      }
      // Achievement evaluation (local-only)
      const allGuesses = [...guesses];
      const bestDistanceKm = allGuesses.length ? Math.min(...allGuesses.map((g) => g.distanceKm)) : undefined;
      const guessesUnder50 = allGuesses.filter((g) => g.distanceKm < 50).length;
      evaluateSession({ mode, totalScore, photoCount: photos.length, bestDistanceKm, guessesUnder50 })
        .then((newly) => {
          if (newly.length > 0) {
            sfx.achievement();
            setUnlockedNow(newly.map((id) => getAchievementById(id)).filter(Boolean) as { id: string; title: string; icon: string; description: string; rarity: string }[]);
          }
        });
      setPhase("done");
      return;
    }
    setIndex(index + 1);
    setGuess(null);
    setHintsUsed(0);
    setPhase("playing");
    setStartedAt(performance.now());
  };

  // Keyboard shortcuts: Enter / Space = submit (playing) or next (reveal)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Enter" || e.key === " ") {
        if (phase === "playing" && guess) { e.preventDefault(); submit(); }
        else if (phase === "reveal") { e.preventDefault(); next(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, guess]);

  if (phase === "loading") {
    return (
      <div className="flex items-center justify-center h-screen text-ink-soft font-mono text-sm uppercase tracking-wider">
        Lade Spiel…
      </div>
    );
  }

  if (phase === "empty") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="paper-card p-10 max-w-md text-center flex flex-col gap-4" style={{ transform: "rotate(-0.5deg)" }}>
          <div className="text-5xl">📸</div>
          <span className="tag-pin self-center">Hinweis</span>
          <h2 className="font-display text-3xl font-bold">
            {mode === "lane" ? "Lane nicht gefunden" : "Noch keine Fotos"}
          </h2>
          <p className="text-ink-soft">
            {mode === "lane"
              ? "Diese Memory Lane existiert nicht (mehr)."
              : "Lade zuerst ein paar Fotos hoch, um eine Runde zu starten."}
          </p>
          <Link href="/upload" className="btn-primary self-center">
            Fotos hochladen
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <Summary
        guesses={guesses}
        totalScore={totalScore}
        photos={photos}
        mode={mode}
        laneTitle={laneTitle}
        unlocked={unlockedNow}
      />
    );
  }

  const lastGuess = guesses[guesses.length - 1];
  const nextPhoto = mode === "lane" ? photos[index + 1] : undefined;

  return (
    <div className="h-screen flex flex-col bg-paper">
      <div className="flex items-center justify-between px-6 py-3 bg-paper-warm border-b-2 border-ink">
        <Link
          href="/"
          className="flex items-center gap-2 text-ink-soft hover:text-pin transition"
        >
          <span className="logo-mark" style={{ width: 22, height: 22 }} />
          <span className="font-display text-base font-bold">PinPoint</span>
        </Link>
        <div className="flex items-center gap-4">
          {laneTitle && (
            <div className="hidden md:block text-xs font-mono uppercase tracking-wider text-ink-soft">
              🛣️ {laneTitle}
            </div>
          )}
          <div className="font-mono text-xs uppercase tracking-wider text-ink-mute">
            <span className="font-display text-ink font-bold text-base">{index + 1}</span>{" "}/{" "}
            {photos.length}
          </div>
          {mode === "speedrun" && phase === "playing" && (
            <div
              className="flex items-center gap-1 font-mono font-bold"
              style={{ color: timeLeft < 5 ? "var(--pin)" : "var(--postal-blue)" }}
            >
              <Timer className="w-4 h-4" />
              {timeLeft.toFixed(1)}s
            </div>
          )}
          {mode === "no-move" && (
            <div className="stamp-tag" style={{ transform: "rotate(-3deg)" }}>
              <Lock className="w-3 h-3 inline mr-1" />
              No-Move
            </div>
          )}
          <div className="flex items-center gap-1" style={{ color: "var(--pin)" }}>
            <Trophy className="w-4 h-4" />
            <span className="font-display font-bold tabular-nums text-lg">
              {totalScore.toLocaleString("de-DE")}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_1fr] overflow-hidden">
        <div className="relative bg-black flex items-center justify-center overflow-hidden">
          {photoUrl && (
            <motion.img
              key={current.id}
              src={photoUrl}
              alt=""
              initial={{ scale: 1.08, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="max-h-full max-w-full object-contain"
            />
          )}
          {current && (
            <div
              className="absolute top-4 left-4 stamp-tag"
              style={{ color: DIFFICULTY_COLORS[current.difficulty], transform: "rotate(-4deg)" }}
            >
              ◆ {DIFFICULTY_LABELS[current.difficulty]}
            </div>
          )}
          {phase === "playing" && current && (
            <div className="absolute bottom-4 left-4 flex gap-2">
              <button
                onClick={() => setHintsUsed((h) => Math.min(h + 1, 3))}
                className="btn-ghost text-xs py-1.5 px-3 disabled:opacity-50"
                style={{ background: "var(--paper)" }}
                disabled={hintsUsed >= 3}
              >
                <Lightbulb className="w-3 h-3" style={{ color: "var(--mustard)" }} />
                Hinweis ({hintsUsed}/3 — −15%)
              </button>
            </div>
          )}
        </div>

        <div className="relative">
          {phase === "playing" && (
            <MapPicker
              marker={guess}
              onPick={(lat, lng) => setGuess({ lat, lng })}
              noZoom={mode === "no-move"}
            />
          )}
          {phase === "reveal" && current && lastGuess && (
            <MapPicker
              interactive={false}
              marker={
                lastGuess.guessLat !== 0 || lastGuess.guessLng !== 0
                  ? { lat: lastGuess.guessLat, lng: lastGuess.guessLng }
                  : null
              }
              markers={[
                {
                  id: "real",
                  lat: current.lat,
                  lng: current.lng,
                  color: "#2d5f3f",
                },
                ...(nextPhoto
                  ? [
                      {
                        id: "next-hint",
                        lat: nextPhoto.lat,
                        lng: nextPhoto.lng,
                        color: "#1f3a66",
                      },
                    ]
                  : []),
              ]}
              line={{
                from: { lat: lastGuess.guessLat, lng: lastGuess.guessLng },
                to: { lat: current.lat, lng: current.lng },
              }}
              fitBoundsTo={[
                { lat: lastGuess.guessLat, lng: lastGuess.guessLng },
                { lat: current.lat, lng: current.lng },
                ...(nextPhoto
                  ? [{ lat: nextPhoto.lat, lng: nextPhoto.lng }]
                  : []),
              ]}
            />
          )}

          <AnimatePresence mode="wait">
            {phase === "playing" && (
              <motion.div
                key="play-controls"
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 80, opacity: 0 }}
                className="absolute bottom-4 left-4 right-4 paper-card p-4 flex items-center justify-between gap-4"
              >
                <div className="text-xs font-mono uppercase tracking-wider text-ink-soft flex items-center gap-2">
                  <MapPin className="w-3 h-3" />
                  {guess
                    ? `${guess.lat.toFixed(3)}, ${guess.lng.toFixed(3)}`
                    : "Setze einen Pin auf die Karte"}
                </div>
                <button
                  onClick={submit}
                  disabled={!guess}
                  className="btn-primary"
                >
                  Tippen
                </button>
              </motion.div>
            )}
            {phase === "reveal" && lastGuess && (
              <RevealCard
                key="reveal"
                guess={lastGuess}
                truth={current ? { lat: current.lat, lng: current.lng } : null}
                onNext={next}
                isLast={index + 1 >= photos.length}
                hasNextHint={!!nextPhoto}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function RevealCard({
  guess,
  truth,
  onNext,
  isLast,
  hasNextHint,
}: {
  guess: Guess;
  truth: { lat: number; lng: number } | null;
  onNext: () => void;
  isLast: boolean;
  hasNextHint: boolean;
}) {
  const [displayScore, setDisplayScore] = useState(0);
  const [placeLabel, setPlaceLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!truth) return;
    let cancelled = false;
    import("@/lib/mapbox").then(async ({ reverseGeocode, isMapboxEnabled }) => {
      if (!isMapboxEnabled()) return;
      const label = await reverseGeocode(truth.lat, truth.lng);
      if (!cancelled && label) setPlaceLabel(label);
    });
    return () => { cancelled = true; };
  }, [truth]);

  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const duration = 1200;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplayScore(Math.round(guess.score * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [guess.score]);

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      className="absolute bottom-4 left-4 right-4 paper-card p-5 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-ink-mute">Distanz</div>
          <div className="font-display text-2xl font-bold">
            {formatDistance(guess.distanceKm)}
          </div>
          {placeLabel && (
            <div className="text-xs text-ink-soft mt-1 italic">→ {placeLabel}</div>
          )}
        </div>
        <div className="text-right">
          <div className="text-xs font-mono uppercase tracking-wider text-ink-mute">Punkte</div>
          <div className="font-display text-4xl font-black tabular-nums" style={{ color: "var(--pin)" }}>
            +{displayScore.toLocaleString("de-DE")}
          </div>
        </div>
      </div>
      {hasNextHint && (
        <div className="stamp-tag self-start" style={{ borderColor: "var(--postal-blue)", color: "var(--postal-blue)" }}>
          🛣️ Nächstes Foto — blauer Pin
        </div>
      )}
      <button
        onClick={onNext}
        className="btn-primary flex items-center justify-center gap-2"
      >
        {isLast ? "Ergebnis sehen" : "Nächste Runde"}
        <ArrowRight className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

function Summary({
  guesses,
  totalScore,
  photos,
  mode,
  laneTitle,
  unlocked,
}: {
  guesses: Guess[];
  totalScore: number;
  photos: Photo[];
  mode: GameMode;
  laneTitle: string | null;
  unlocked: { id: string; title: string; icon: string; description: string; rarity: string }[];
}) {
  const max = guesses.length * 5000 * 3;
  const pct = Math.round((totalScore / max) * 100);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [recapUrl, setRecapUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onExport = async () => {
    setExporting(true);
    setError(null);
    setProgress(0);
    try {
      const blob = await exportLaneRecap({
        title: laneTitle ?? "PinPoint Recap",
        guesses,
        photos,
        totalScore,
        onProgress: setProgress,
      });
      const url = URL.createObjectURL(blob);
      setRecapUrl(url);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(laneTitle ?? "pinpoint-recap").toLowerCase().replace(/[^a-z0-9-]+/g, "-")}.webm`;
      a.click();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export fehlgeschlagen");
    } finally {
      setExporting(false);
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="paper-card p-8 max-w-2xl w-full flex flex-col gap-6"
        style={{ transform: "rotate(-0.4deg)" }}
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center border-2 border-ink mb-3" style={{ background: "var(--mustard)" }}>
            <Trophy className="w-8 h-8 text-ink" />
          </div>
          <span className="tag-pin">Runde beendet</span>
          <h2 className="font-display text-3xl font-bold mt-2">
            {mode === "lane" && laneTitle
              ? laneTitle
              : "Geschafft!"}
          </h2>
          <div className="font-display-wonk text-6xl font-black tabular-nums mt-3" style={{ color: "var(--pin)" }}>
            {totalScore.toLocaleString("de-DE")}
          </div>
          <div className="text-xs font-mono uppercase tracking-wider text-ink-mute mt-1">{pct}% des Maximums</div>
        </div>
        {unlocked.length > 0 && (
          <div className="paper-card-soft p-4 border-2" style={{ borderColor: "var(--mustard)" }}>
            <div className="text-xs font-mono uppercase tracking-wider text-ink-mute mb-2">
              ★ Freigeschaltet
            </div>
            <div className="flex flex-col gap-2">
              {unlocked.map((a) => (
                <div key={a.id} className="flex items-center gap-3">
                  <div className="text-2xl">{a.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold text-sm">{a.title}</div>
                    <div className="text-xs text-ink-soft truncate">{a.description}</div>
                  </div>
                  <span className="tag-pin text-[10px]">{a.rarity}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="stitched-divider" />
        <div className="flex flex-col gap-2">
          {guesses.map((g, i) => {
            const photo = photos.find((p) => p.id === g.photoId);
            return (
              <div
                key={i}
                className="paper-card-soft rounded p-3 flex items-center gap-3"
              >
                <div className="font-mono text-xs text-ink-mute w-6">
                  #{i + 1}
                </div>
                {photo && (
                  <div
                    className="w-3 h-3 rounded-full border border-ink"
                    style={{
                      background: DIFFICULTY_COLORS[photo.difficulty],
                    }}
                  />
                )}
                <div className="flex-1 text-sm text-ink-soft">
                  {formatDistance(g.distanceKm)}
                </div>
                <div className="font-display font-bold tabular-nums" style={{ color: "var(--pin)" }}>
                  {g.score.toLocaleString("de-DE")}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-3 flex-wrap">
          <Link href="/" className="btn-ghost flex-1 text-center min-w-[120px]">
            Home
          </Link>
          {mode === "lane" && (
            <button
              onClick={onExport}
              disabled={exporting}
              className="btn-ghost flex-1 min-w-[160px]"
            >
              {exporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {Math.round(progress * 100)}%
                </>
              ) : recapUrl ? (
                <>
                  <Download className="w-4 h-4" />
                  Erneut speichern
                </>
              ) : (
                <>
                  <Film className="w-4 h-4" />
                  Recap-Video
                </>
              )}
            </button>
          )}
          <button
            onClick={() => window.location.reload()}
            className="btn-primary flex-1 min-w-[140px]"
          >
            Neue Runde
          </button>
        </div>
        {error && (
          <div className="text-xs font-mono uppercase tracking-wider text-pin">
            ⚠ {error}
          </div>
        )}
      </motion.div>
    </div>
  );
}

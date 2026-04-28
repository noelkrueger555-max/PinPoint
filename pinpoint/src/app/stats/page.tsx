"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Trophy, Flame, Target, MapPin, Trash2, Volume2, VolumeX } from "lucide-react";
import { getStats, resetStats, type Stats } from "@/lib/stats";
import { GAME_MODE_LABELS } from "@/lib/types";
import { ACHIEVEMENTS, getUnlocked } from "@/lib/achievements";
import { isSoundEnabled, setSoundEnabled } from "@/lib/feedback";
import PageHeader from "@/components/PageHeader";

const MapPicker = dynamic(() => import("@/components/MapPicker"), { ssr: false });

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [soundOn, setSoundOn] = useState(true);
  const refresh = () => {
    getStats().then(setStats);
    getUnlocked().then(setUnlocked);
  };
  useEffect(() => {
    refresh();
    setSoundOn(isSoundEnabled());
  }, []);

  if (!stats) {
    return (
      <>
        <PageHeader />
        <div className="flex items-center justify-center min-h-[60vh] text-ink-soft font-mono text-sm uppercase tracking-wider">
          Lade…
        </div>
      </>
    );
  }

  const markers = stats.locations.map((l) => ({
    id: l.photoId,
    lat: l.lat,
    lng: l.lng,
    color: l.bestScore > 4000 ? "#2d5f3f" : l.bestScore > 2000 ? "#e3a82a" : "#c33129",
  }));

  const tiles: { tag: string; label: string; value: string; bg: string; iconStroke: string; icon: React.ReactNode; tilt: number }[] = [
    { tag: "Highlight", label: "Beste Runde", value: stats.bestSession.toLocaleString("de-DE"), bg: "var(--mustard)", iconStroke: "var(--ink)", icon: <Trophy className="w-5 h-5" />, tilt: -0.7 },
    { tag: "Aktivität", label: "Tipps gesamt", value: stats.totalGuesses.toString(), bg: "var(--postal-blue)", iconStroke: "var(--paper)", icon: <Target className="w-5 h-5" />, tilt: 0.4 },
    { tag: "Streak", label: `${stats.currentStreak}🔥 / max ${stats.bestStreak}`, value: `${stats.currentStreak}`, bg: "var(--pin)", iconStroke: "var(--paper)", icon: <Flame className="w-5 h-5" />, tilt: -0.4 },
    { tag: "Karte", label: "Orte erraten", value: stats.locations.length.toString(), bg: "var(--stamp-green)", iconStroke: "var(--paper)", icon: <MapPin className="w-5 h-5" />, tilt: 0.7 },
  ];

  return (
    <>
      <PageHeader
        rightSlot={
          <div className="flex items-center gap-3">
            <button
              onClick={() => { const next = !soundOn; setSoundEnabled(next); setSoundOn(next); }}
              className="text-xs font-mono uppercase tracking-wider text-ink-mute hover:text-pin flex items-center gap-1"
              title={soundOn ? "Sound aus" : "Sound an"}
            >
              {soundOn ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
              {soundOn ? "Sound" : "Stumm"}
            </button>
            <button
              onClick={async () => {
                if (confirm("Alle Statistiken zurücksetzen?")) {
                  await resetStats();
                  refresh();
                }
              }}
              className="text-xs font-mono uppercase tracking-wider text-ink-mute hover:text-pin flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Reset
            </button>
          </div>
        }
      />

      <main className="max-w-[1200px] mx-auto px-6 md:px-8 pt-8 pb-20 relative z-[2]">
        <div className="dashed-pill mb-3">📊 Reise-Tagebuch</div>
        <h1 className="font-display-wonk font-black text-[clamp(40px,6vw,72px)] leading-[0.95] tracking-[-0.04em]">
          Deine <em className="accent-italic">Statistiken</em>
        </h1>

        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-5">
          {tiles.map((t) => (
            <div
              key={t.tag}
              className="paper-card p-5"
              style={{ transform: `rotate(${t.tilt}deg)` }}
            >
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center border-2 border-ink mb-3"
                style={{ background: t.bg, color: t.iconStroke }}
              >
                {t.icon}
              </div>
              <div className="tag-pin">{t.tag}</div>
              <div className="font-display text-2xl font-bold mt-1 tabular-nums">{t.value}</div>
              <div className="text-xs text-ink-soft mt-1">{t.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-12">
          <div className="section-eyebrow mb-2">◆ Heatmap der Orte</div>
          <h2 className="font-display text-3xl font-bold tracking-tight mb-5">Wo warst du überall?</h2>
          <div
            className="overflow-hidden border-2 border-ink h-[420px]"
            style={{ boxShadow: "8px 8px 0 var(--postal-blue)" }}
          >
            <MapPicker interactive={false} markers={markers} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-5 text-xs font-mono uppercase tracking-wider text-ink-soft">
            <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--stamp-green)" }} /> Top</span>
            <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--mustard)" }} /> Mittel</span>
            <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--pin)" }} /> Daneben</span>
          </div>
        </div>

        <div className="mt-14">
          <div className="section-eyebrow mb-2">★ Achievements</div>
          <h2 className="font-display text-3xl font-bold tracking-tight mb-5">
            Trophys <span className="text-ink-soft text-xl font-normal">{unlocked.size}/{ACHIEVEMENTS.length}</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {ACHIEVEMENTS.map((a) => {
              const has = unlocked.has(a.id);
              return (
                <div
                  key={a.id}
                  className="paper-card-soft p-4 rounded-md"
                  style={{
                    opacity: has ? 1 : 0.4,
                    filter: has ? "none" : "grayscale(1)",
                    borderColor: has
                      ? a.rarity === "legendary" ? "var(--mustard)"
                        : a.rarity === "epic" ? "var(--postal-blue)"
                        : a.rarity === "rare" ? "var(--stamp-green)"
                        : "var(--ink)"
                      : undefined,
                  }}
                >
                  <div className="text-3xl mb-2">{a.icon}</div>
                  <div className="font-display font-bold text-sm leading-tight">{a.title}</div>
                  <div className="text-xs text-ink-soft mt-1 leading-snug">{a.description}</div>
                  <div className="mt-2 text-[10px] font-mono uppercase tracking-wider text-ink-mute">{a.rarity}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-14">
          <div className="section-eyebrow mb-2">✦ Letzte Runden</div>
          <h2 className="font-display text-3xl font-bold tracking-tight mb-5">Deine Sessions</h2>
          {stats.sessions.length === 0 ? (
            <div className="paper-card-soft p-8 text-center text-ink-soft">
              Noch keine Runden gespielt.{" "}
              <Link href="/play" className="btn-link">Eine starten →</Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {[...stats.sessions].reverse().slice(0, 10).map((s, i) => (
                <div key={i} className="paper-card-soft p-4 rounded-md flex items-center justify-between gap-3">
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="stamp-tag">{GAME_MODE_LABELS[s.mode]}</span>
                    <span className="font-mono text-xs text-ink-mute uppercase tracking-wider truncate">
                      {new Date(s.at).toLocaleString("de-DE")}
                    </span>
                  </div>
                  <div className="font-display font-bold text-2xl tabular-nums" style={{ color: "var(--pin)" }}>
                    {s.totalScore.toLocaleString("de-DE")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

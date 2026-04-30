"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { ACHIEVEMENTS, getUnlocked, type Achievement } from "@/lib/achievements";

const RARITY_COLOR: Record<Achievement["rarity"], string> = {
  common: "var(--ink-mute, #888)",
  rare: "var(--postal-blue)",
  epic: "var(--mustard)",
  legendary: "var(--pin)",
};

export default function AchievementsPage() {
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUnlocked().then((s) => {
      setUnlocked(s);
      setLoading(false);
    });
  }, []);

  const total = ACHIEVEMENTS.length;
  const got = ACHIEVEMENTS.filter((a) => unlocked.has(a.id)).length;
  const pct = total > 0 ? Math.round((got / total) * 100) : 0;

  return (
    <>
      <PageHeader />
      <main className="max-w-[1100px] mx-auto px-6 md:px-8 pt-8 pb-20 relative z-[2]">
        <div className="dashed-pill mb-3">🏆 Sammlung</div>
        <h1 className="font-display-wonk font-black text-[clamp(40px,6vw,72px)] leading-[0.95] tracking-[-0.04em]">
          Erfolge
        </h1>
        <p className="text-ink-soft mt-3 text-lg max-w-[640px]">
          {loading
            ? "Lade…"
            : `${got} / ${total} freigeschaltet · ${pct}%`}
        </p>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {ACHIEVEMENTS.map((a, i) => {
            const isUnlocked = unlocked.has(a.id);
            return (
              <div
                key={a.id}
                className="paper-card p-5 relative overflow-hidden"
                style={{
                  transform: `rotate(${((i % 5) - 2) * 0.3}deg)`,
                  opacity: isUnlocked ? 1 : 0.55,
                  borderColor: isUnlocked ? RARITY_COLOR[a.rarity] : undefined,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-4xl" style={{ filter: isUnlocked ? "none" : "grayscale(1)" }}>
                    {a.icon}
                  </div>
                  <span
                    className="tag-pin text-[10px]"
                    style={{ color: RARITY_COLOR[a.rarity] }}
                  >
                    {a.rarity.toUpperCase()}
                  </span>
                </div>
                <div className="mt-3 font-display text-lg font-bold leading-tight">
                  {a.title}
                </div>
                <div className="text-sm text-ink-soft mt-1">
                  {a.description}
                </div>
                {!isUnlocked && (
                  <div className="absolute top-3 right-3">
                    <Lock className="w-4 h-4 text-ink-mute" />
                  </div>
                )}
                {isUnlocked && (
                  <div
                    className="stamp-tag mt-3"
                    style={{
                      borderColor: RARITY_COLOR[a.rarity],
                      color: RARITY_COLOR[a.rarity],
                    }}
                  >
                    ✓ Freigeschaltet
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}

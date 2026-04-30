"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { isCloudEnabled } from "@/lib/supabase";
import { fetchDailyLeaderboard, type DailyEntry } from "@/lib/leaderboard";

export default function LeaderboardPage() {
  const cloud = isCloudEnabled();
  const today = new Date().toISOString().slice(0, 10);
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cloud) return;
    setLoading(true);
    fetchDailyLeaderboard(today, 50)
      .then(setEntries)
      .catch((e) => setError(e instanceof Error ? e.message : "Fehler"))
      .finally(() => setLoading(false));
  }, [cloud, today]);

  return (
    <>
      <PageHeader />
      <main className="max-w-[900px] mx-auto px-6 md:px-8 pt-8 pb-20 relative z-[2]">
        <div className="dashed-pill mb-3">🏆 Daily · global</div>
        <h1 className="font-display-wonk font-black text-[clamp(40px,6vw,72px)] leading-[0.95] tracking-[-0.04em]">
          Bestenliste <em className="accent-italic">heute</em>
        </h1>
        <p className="text-ink-soft mt-3 text-lg max-w-[640px]">
          {today} — alle Spieler:innen weltweit raten dieselben 5 Fotos.
        </p>

        {!cloud && (
          <div className="mt-10 paper-card-soft p-6 font-mono text-sm text-ink-soft">
            Cloud-Modus nicht konfiguriert.
          </div>
        )}

        {cloud && loading && (
          <div className="mt-10 flex items-center gap-2 text-ink-soft font-mono text-sm uppercase tracking-wider">
            <Loader2 className="w-4 h-4 animate-spin" />
            Lade…
          </div>
        )}

        {cloud && !loading && entries.length === 0 && !error && (
          <div className="mt-10 paper-card-soft p-8 text-center text-ink-soft">
            Heute hat noch niemand gespielt.{" "}
            <Link href="/play" className="btn-link">Album wählen →</Link>
          </div>
        )}

        {entries.length > 0 && (
          <div className="mt-10 flex flex-col gap-2">
            {entries.map((e, i) => (
              <div
                key={e.player_id}
                className="paper-card-soft rounded p-4 flex items-center gap-4"
                style={{ transform: `rotate(${(i % 3 - 1) * 0.2}deg)` }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-ink font-display font-bold"
                  style={{
                    background:
                      e.rank === 1 ? "var(--mustard)" :
                      e.rank === 2 ? "var(--paper-edge)" :
                      e.rank === 3 ? "var(--pin)" : "var(--paper-warm)",
                    color: e.rank === 3 ? "var(--paper)" : "var(--ink)",
                  }}
                >
                  {e.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold truncate">{e.display_name}</div>
                </div>
                <div className="font-display font-black text-2xl tabular-nums" style={{ color: "var(--pin)" }}>
                  {e.score.toLocaleString("de-DE")}
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mt-8 text-pin font-mono text-sm">⚠ {error}</div>
        )}
      </main>
    </>
  );
}

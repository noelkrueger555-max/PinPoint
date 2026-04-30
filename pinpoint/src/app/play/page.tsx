"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, KeyRound, Play, Image as ImageIcon, Users } from "lucide-react";
import { listMyAlbums, type Album } from "@/lib/albums";
import PageHeader from "@/components/PageHeader";
import AuthGate from "@/components/AuthGate";

export default function PlayHub() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listMyAlbums()
      .then(setAlbums)
      .finally(() => setLoading(false));
  }, []);

  const playable = albums.filter((a) => (a.photo_count ?? 0) >= 1);

  return (
    <AuthGate
      reason={
        <>
          Sign-in, dann <em className="accent-italic">Album wählen</em>.
        </>
      }
    >
      <PageHeader />
      <main className="max-w-[1280px] mx-auto px-6 md:px-8 pt-8 pb-24 relative z-[2]">
        <div className="mb-3 dashed-pill">▴ Album wählen</div>
        <h1 className="font-display-wonk font-black text-[clamp(40px,6vw,72px)] leading-[0.95] tracking-[-0.04em]">
          Was wird heute <em className="accent-italic">gespielt?</em>
        </h1>
        <p className="text-ink-soft mt-3 text-lg max-w-[640px]">
          Bei PinPoint spielst du immer ein Album — eine Sammlung von Fotos, die
          du selbst zusammenstellst oder zu der dich Freunde einladen.
        </p>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-7">
          <Link
            href="/duel"
            className="paper-card p-8 no-underline text-ink relative block"
            style={{
              transform: "rotate(-0.4deg)",
              background: "var(--pin)",
              color: "var(--paper)",
            }}
          >
            <div
              className="stamp-tag absolute -top-5 right-6"
              style={{ transform: "rotate(8deg)" }}
            >
              LIVE
            </div>
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-5 border-2 border-paper bg-paper text-pin">
              <span className="text-2xl">⚔️</span>
            </div>
            <span
              className="tag-pin"
              style={{ background: "var(--paper)", color: "var(--pin)" }}
            >
              Battle · 1 vs 1
            </span>
            <h3 className="font-display text-[28px] font-bold tracking-tight mt-1 text-paper">
              Duell
            </h3>
            <p className="text-paper/85 mt-2">
              Echtzeit-Match gegen einen Freund. Code teilen, gemeinsam raten.
            </p>
          </Link>
          <Link
            href="/share"
            className="paper-card p-8 no-underline text-ink relative block"
            style={{
              transform: "rotate(0.4deg)",
              background: "var(--postal-blue)",
              color: "var(--paper)",
            }}
          >
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-5 border-2 border-paper bg-paper text-postal-blue">
              <span className="text-2xl">👥</span>
            </div>
            <span
              className="tag-pin"
              style={{ background: "var(--paper)", color: "var(--postal-blue)" }}
            >
              Battle · 2–50
            </span>
            <h3 className="font-display text-[28px] font-bold tracking-tight mt-1 text-paper">
              Lobby
            </h3>
            <p className="text-paper/85 mt-2">
              Erstelle eine Lobby und teile den 6-Zeichen-Code mit Freunden.
            </p>
          </Link>
        </div>

        <div className="mt-16 flex items-baseline justify-between mb-6 flex-wrap gap-4">
          <div>
            <div className="section-eyebrow">✦ Solo &amp; gemeinsam</div>
            <h2 className="font-display text-[36px] font-bold tracking-tight mt-2">
              Deine Alben
            </h2>
          </div>
          <div className="flex gap-2">
            <Link href="/albums" className="btn-pill-light no-underline">
              <KeyRound className="w-4 h-4" />
              Alle Alben
            </Link>
            <Link href="/albums" className="btn-pill-dark no-underline">
              <Plus className="w-4 h-4" />
              Neues Album
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="paper-card-soft p-8 text-center text-ink-soft">
            Lade Alben…
          </div>
        ) : playable.length === 0 ? (
          <div className="paper-card-soft p-10 text-center">
            <div className="text-ink-soft mb-4">
              Noch keine spielbaren Alben. Erstelle eins und füge Fotos hinzu —
              oder tritt einem bei.
            </div>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link href="/upload" className="btn-primary no-underline">
                <ImageIcon className="w-4 h-4" />
                Fotos hochladen
              </Link>
              <Link href="/albums" className="btn-ghost no-underline">
                Album erstellen
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {playable.map((a, i) => (
              <Link
                key={a.id}
                href={`/play/album/${a.id}`}
                className="paper-card overflow-hidden flex flex-col no-underline text-ink hover:shadow-[8px_8px_0_var(--ink)] transition-shadow"
                style={{ transform: `rotate(${i % 2 === 0 ? -0.3 : 0.3}deg)` }}
              >
                <div className="h-32 bg-paper-warm border-b-2 border-ink flex items-center justify-center">
                  <ImageIcon className="w-10 h-10 text-ink-mute opacity-30" />
                </div>
                <div className="p-5 flex-1 flex flex-col gap-2">
                  <h3 className="font-display font-bold text-xl tracking-tight truncate">
                    {a.title}
                  </h3>
                  {a.description && (
                    <p className="text-sm text-ink-soft line-clamp-2">
                      {a.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-ink-mute font-mono uppercase tracking-wider mt-1">
                    <span className="flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      {a.photo_count ?? 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {a.member_count ?? 0}
                    </span>
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-ink">
                    <Play className="w-3.5 h-3.5" />
                    Spielen
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </AuthGate>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listLanes, listPhotos } from "@/lib/store";
import type { Lane, Photo } from "@/lib/types";
import PageHeader from "@/components/PageHeader";
import AuthGate from "@/components/AuthGate";

export default function PlayHub() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [lanes, setLanes] = useState<Lane[]>([]);

  useEffect(() => {
    listPhotos().then(setPhotos);
    listLanes().then(setLanes);
  }, []);

  const hasPhotos = photos.length > 0;

  return (
    <AuthGate reason={<>Sign-in, dann <em className="accent-italic">los geht’s</em>.</>}>
      <PageHeader />
      <main className="max-w-[1280px] mx-auto px-6 md:px-8 pt-8 pb-24 relative z-[2]">
        <div className="mb-3 dashed-pill">▴ Modus wählen</div>
        <h1 className="font-display-wonk font-black text-[clamp(40px,6vw,72px)] leading-[0.95] tracking-[-0.04em]">
          Was wird heute <em className="accent-italic">gespielt?</em>
        </h1>
        <p className="text-ink-soft mt-3 text-lg max-w-[560px]">
          {hasPhotos
            ? `${photos.length} Fotos in deiner Bibliothek bereit zum Spielen.`
            : "Du brauchst zuerst Fotos in deiner Bibliothek."}
        </p>

        {!hasPhotos && (
          <div className="mt-8">
            <Link href="/upload" className="btn-primary">Fotos hochladen</Link>
          </div>
        )}

        {hasPhotos && (
          <>
            {/* BATTLE row — primary CTA */}
            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-7">
              <Link
                href="/duel"
                className="paper-card p-8 no-underline text-ink relative block"
                style={{ transform: "rotate(-0.4deg)", background: "var(--pin)", color: "var(--paper)" }}
              >
                <div className="stamp-tag absolute -top-5 right-6" style={{ transform: "rotate(8deg)" }}>LIVE</div>
                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-5 border-2 border-paper bg-paper text-pin">
                  <span className="text-2xl">⚔️</span>
                </div>
                <span className="tag-pin" style={{ background: "var(--paper)", color: "var(--pin)" }}>Battle · 1 vs 1</span>
                <h3 className="font-display text-[28px] font-bold tracking-tight mt-1 text-paper">Duell</h3>
                <p className="text-paper/85 mt-2">Echtzeit-Match gegen einen Freund. Code teilen, gemeinsam raten, größter Score gewinnt.</p>
                <div className="mt-5 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider">
                  Battle starten →
                </div>
              </Link>
              <Link
                href="/share"
                className="paper-card p-8 no-underline text-ink relative block"
                style={{ transform: "rotate(0.4deg)", background: "var(--postal-blue)", color: "var(--paper)" }}
              >
                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-5 border-2 border-paper bg-paper text-postal-blue">
                  <span className="text-2xl">👥</span>
                </div>
                <span className="tag-pin" style={{ background: "var(--paper)", color: "var(--postal-blue)" }}>Battle · 2–50</span>
                <h3 className="font-display text-[28px] font-bold tracking-tight mt-1 text-paper">Lobby</h3>
                <p className="text-paper/85 mt-2">Erstelle eine Lobby mit deinen Fotos, teile den 6-Zeichen-Code, ladet beliebig viele Freunde ein.</p>
                <div className="mt-5 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider">
                  Lobby öffnen →
                </div>
              </Link>
            </div>

            <div className="mt-12 mb-4 section-eyebrow">✦ Solo-Modi</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
            <ModeCard
              href="/play/classic"
              tag="Klassisch · empfohlen"
              title="Daily Drop"
              desc="5 zufällige Fotos · entspannt raten · perfekt zum Reinkommen."
              bg="var(--mustard)"
              iconStroke="var(--ink)"
              tilt={-0.6}
              icon={<><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>}
            />
            <ModeCard
              href="/play/speedrun"
              tag="Schnelldenker"
              title="Speedrun"
              desc="20 s pro Foto · Zeitbonus bis +40 % · pure Reflexe."
              bg="var(--pin)"
              iconStroke="var(--paper)"
              tilt={0.5}
              stamp="Adrenalin"
              icon={<><circle cx="12" cy="12" r="10" /><path d="M12 7v5l3 2" /></>}
            />
            <ModeCard
              href="/play/no-move"
              tag="Hardcore"
              title="No-Move"
              desc="Keine Karten-Bewegung · nur dein Auge · ×1.5 Punkte."
              bg="var(--postal-blue)"
              iconStroke="var(--paper)"
              tilt={0.5}
              icon={<><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>}
            />
            <ModeCard
              href="/play/daily"
              tag="Täglich · global"
              title="Daily Five"
              desc="Jeden Tag dieselben 5 Fotos. Vergleich dich mit deiner Crew."
              bg="var(--stamp-green)"
              iconStroke="var(--paper)"
              tilt={-0.6}
              icon={<><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>}
            />
          </div>
          </>
        )}

        <div className="mt-20">
          <div className="flex items-baseline justify-between mb-6 flex-wrap gap-4">
            <div>
              <div className="section-eyebrow">✦ Story-Mode</div>
              <h2 className="font-display text-[36px] font-bold tracking-tight mt-2">Memory Lanes</h2>
            </div>
            <Link href="/lanes" className="btn-link">Lane erstellen →</Link>
          </div>
          {lanes.length === 0 ? (
            <div className="paper-card-soft p-8 text-center text-ink-soft rounded-md">
              Noch keine Lanes. Verwandle eine ganze Reise in einen Geo-Trail.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {lanes.map((l, i) => (
                <Link
                  key={l.id}
                  href={`/play/lane?id=${l.id}`}
                  className="paper-card p-6 flex items-center justify-between gap-4 no-underline text-ink"
                  style={{ transform: i % 2 === 0 ? "rotate(-0.4deg)" : "rotate(0.4deg)" }}
                >
                  <div className="flex-1 min-w-0">
                    <span className="tag-pin">Story-Mode</span>
                    <div className="font-display text-2xl font-bold mt-1 truncate">{l.title}</div>
                    {l.description && (
                      <div className="text-sm text-ink-soft mt-1 line-clamp-1">{l.description}</div>
                    )}
                    <div className="text-xs font-mono text-ink-mute mt-3 uppercase tracking-wider">
                      {l.photoIds.length} Stationen
                    </div>
                  </div>
                  <div className="text-3xl flex-shrink-0">🛣️</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </AuthGate>
  );
}

function ModeCard({
  href, tag, title, desc, bg, iconStroke, icon, tilt, stamp,
}: {
  href: string; tag: string; title: string; desc: string;
  bg: string; iconStroke: string; icon: React.ReactNode;
  tilt: number; stamp?: string;
}) {
  return (
    <Link
      href={href}
      className="paper-card p-8 no-underline text-ink relative block"
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      {stamp && (
        <div className="stamp-tag absolute -top-5 right-6" style={{ transform: "rotate(8deg)" }}>{stamp}</div>
      )}
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mb-5 border-2 border-ink"
        style={{ background: bg }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke={iconStroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
          {icon}
        </svg>
      </div>
      <span className="tag-pin">{tag}</span>
      <h3 className="font-display text-[28px] font-bold tracking-tight mt-1">{title}</h3>
      <p className="text-ink-soft mt-2">{desc}</p>
      <div className="mt-5 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-ink">
        Spielen
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M3 8h10m0 0L9 4m4 4L9 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </Link>
  );
}

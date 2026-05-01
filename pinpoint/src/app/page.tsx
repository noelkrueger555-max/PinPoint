"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Upload,
  UserPlus,
  Users,
  Play,
  Trophy,
  BarChart3,
  Award,
  Map as MapIcon,
  Smartphone,
  Camera,
} from "lucide-react";
import AuthMenu from "@/components/AuthMenu";
import { getCurrentUser, isCloudEnabled } from "@/lib/supabase";

/* ── Mini interactive tutorial ──────────────────────── */
type TutStep = {
  key: string;
  tab: string;
  title: string;
  body: string;
  visual: React.ReactNode;
};

function MiniTutorial() {
  const [active, setActive] = useState(0);

  const steps: TutStep[] = [
    {
      key: "upload",
      tab: "1 · Foto hoch",
      title: "Foto rein, Standort kommt automatisch.",
      body:
        "Drag & Drop reicht. PinPoint liest die GPS-Daten aus dem Bild — fehlt der Ort, setzt du den Pin selbst auf die Karte. Schwierigkeit wird automatisch geschätzt.",
      visual: (
        <div className="paper-card-soft p-5 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-paper-warm border border-ink flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">santorini-2024.jpg</div>
              <div className="text-xs text-ink-mute font-mono">
                EXIF · 36.41° N · 25.43° E · Juli 2024
              </div>
            </div>
            <span className="chip" style={{ color: "var(--stamp-green)" }}>
              Mittel
            </span>
          </div>
          <div className="h-1.5 bg-paper-warm rounded-full overflow-hidden">
            <div
              className="h-full"
              style={{
                width: "100%",
                background: "var(--stamp-green)",
                animation: "pp-fadein 1.5s ease-out",
              }}
            />
          </div>
          <div className="text-xs text-ink-mute font-mono uppercase tracking-wider">
            ✓ Foto bereit · Sichtbarkeit: Freunde
          </div>
        </div>
      ),
    },
    {
      key: "friends",
      tab: "2 · Crew bauen",
      title: "Username setzen, Freunde adden.",
      body:
        "Leg deinen Handle fest (z. B. @noel_k), dann findest du Freunde über die Suche. Akzeptierte Crew-Member sehen dieselben Alben & Lobbys.",
      visual: (
        <div className="paper-card-soft p-5 flex flex-col gap-3">
          <div className="text-xs font-mono uppercase tracking-wider text-ink-mute">
            Suche
          </div>
          <div className="paper-input flex items-center gap-2 !py-2.5">
            <UserPlus className="w-4 h-4 opacity-60" />
            <span>@lisa</span>
          </div>
          {[
            { name: "Lisa Brandt", handle: "@lisa", action: "Hinzufügen" },
            { name: "Max Heinz", handle: "@maxh", action: "Freund:in" },
          ].map((p, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 border-t border-dashed border-paper-edge pt-3"
            >
              <div>
                <div className="text-sm font-semibold">{p.name}</div>
                <div className="text-xs text-ink-mute font-mono">{p.handle}</div>
              </div>
              <span
                className="text-xs font-mono uppercase tracking-wider px-3 py-1 rounded-full border"
                style={{
                  background: i === 0 ? "var(--ink)" : "transparent",
                  color: i === 0 ? "var(--paper)" : "var(--ink)",
                  borderColor: "var(--ink)",
                }}
              >
                {p.action}
              </span>
            </div>
          ))}
        </div>
      ),
    },
    {
      key: "mode",
      tab: "3 · Modus",
      title: "Sieben Modi. Eine Karte.",
      body:
        "Daily Drop für entspannte Runden. Speedrun für Reflex-Adrenalin. No-Move für Hardcore (×1.5 Punkte). Memory Lane für komplette Reisen. Plus Live-Duell & Lobby für Crew-Sessions.",
      visual: (
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { t: "Daily Drop", s: "5 Fotos · entspannt", c: "var(--mustard)" },
            { t: "Speedrun", s: "20 s · Zeit-Bonus", c: "var(--pin)" },
            { t: "No-Move", s: "kein Zoom · ×1.5", c: "var(--postal-blue)" },
            { t: "Memory Lane", s: "Reise · Story", c: "var(--stamp-green)" },
            { t: "Daily Five", s: "Welt vs. Welt", c: "var(--ink)" },
            { t: "Duell · Live", s: "1 vs 1", c: "var(--pin-deep)" },
          ].map((m) => (
            <div
              key={m.t}
              className="paper-card-soft p-3 flex flex-col gap-1"
              style={{ borderLeft: `4px solid ${m.c}` }}
            >
              <div className="text-sm font-bold tracking-tight">{m.t}</div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-ink-mute">
                {m.s}
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      key: "guess",
      tab: "4 · Pin setzen",
      title: "Tippen. Distanz lesen. Punkten.",
      body:
        "Du siehst das Foto, klickst irgendwo auf die Weltkarte. Lösung wird enthüllt: Distanz, Punkte, Story. Je näher dran, desto mehr — Schwierigkeit multipliziert.",
      visual: (
        <div className="mini-map">
          <svg
            viewBox="0 0 400 250"
            preserveAspectRatio="xMidYMid slice"
            className="w-full h-full block"
            aria-hidden
          >
            <defs>
              <pattern id="topo2" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M0 16 Q 8 4, 16 16 T 32 16" stroke="#c4b48a" strokeWidth="0.6" fill="none" opacity="0.55" />
                <path d="M0 24 Q 8 12, 16 24 T 32 24" stroke="#c4b48a" strokeWidth="0.6" fill="none" opacity="0.4" />
              </pattern>
            </defs>
            <rect width="400" height="250" fill="url(#topo2)" />
            <path
              d="M0 110 Q 80 90, 140 130 T 280 140 T 400 120 L 400 250 L 0 250 Z"
              fill="#dccfa6"
              opacity="0.45"
            />
            <path
              d="M0 110 Q 80 90, 140 130 T 280 140 T 400 120"
              stroke="#1c1a16"
              strokeWidth="1"
              fill="none"
            />
            {/* dashed connector between guess and real */}
            <line
              x1="120"
              y1="80"
              x2="260"
              y2="150"
              stroke="#1c1a16"
              strokeWidth="1.5"
              strokeDasharray="5 5"
            />
          </svg>
          <div className="mm-pin guess" style={{ top: "32%", left: "30%" }} />
          <div className="mm-pin real" style={{ top: "60%", left: "65%" }} />
          <div
            className="absolute font-mono text-[10px] uppercase tracking-wider bg-paper border border-ink px-2 py-1"
            style={{ top: "20%", left: "22%" }}
          >
            Dein Pin
          </div>
          <div
            className="absolute font-mono text-[10px] uppercase tracking-wider bg-paper border border-ink px-2 py-1"
            style={{ top: "70%", left: "60%" }}
          >
            Echt · Santorini
          </div>
          <div
            className="stamp absolute"
            style={{ bottom: 8, right: 8, transform: "rotate(-3deg)" }}
          >
            <strong>+3 240 PUNKTE</strong>
            240 km · Mittel ×1.0
          </div>
        </div>
      ),
    },
  ];

  const step = steps[active];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-10 lg:gap-14 items-start">
      <div>
        <div className="section-eyebrow mb-3">▴ Mini-Anleitung</div>
        <h2 className="font-display font-extrabold text-[clamp(36px,5vw,60px)] leading-[0.95] tracking-[-0.035em] mb-5">
          So fühlt sich <em className="accent-italic">eine Runde</em> an.
        </h2>
        <p className="text-ink-soft text-lg max-w-[480px] mb-7">
          Vier Schritte. Klick dich durch — du siehst genau, was dich erwartet.
        </p>
        <div className="flex flex-wrap gap-2 mb-7">
          {steps.map((s, i) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setActive(i)}
              className="tutorial-tab"
              data-active={active === i}
            >
              {s.tab}
            </button>
          ))}
        </div>
        <div key={step.key} className="tut-fadein">
          <h3 className="font-display text-[26px] md:text-[30px] font-bold tracking-tight mb-2">
            {step.title}
          </h3>
          <p className="text-ink-soft text-base leading-relaxed max-w-[520px]">
            {step.body}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setActive((a) => (a + 1) % steps.length)}
              className="btn-primary"
            >
              {active === steps.length - 1 ? "Nochmal von vorn" : "Nächster Schritt"}
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path
                  d="M3 8h10m0 0L9 4m4 4L9 12"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <Link href="/play" className="btn-link">
              Echte Runde starten →
            </Link>
          </div>
        </div>
      </div>
      <div className="tutorial-stage p-5 md:p-7" key={"stage-" + step.key}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="logo-mark" style={{ width: 18, height: 18 }} />
            <span className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">
              Vorschau · {step.tab}
            </span>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-mute">
            {active + 1} / {steps.length}
          </span>
        </div>
        <div className="tut-fadein">{step.visual}</div>
      </div>
    </div>
  );
}

export default function Home() {
  const [signedIn, setSignedIn] = useState<boolean>(false);
  useEffect(() => {
    if (isCloudEnabled()) {
      getCurrentUser().then((u) => setSignedIn(!!u));
    }
  }, []);

  return (
    <>
      <div className="max-w-[1280px] mx-auto px-8 relative z-[2]">
        {/* NAV */}
        <nav className="pt-7 flex justify-between items-center relative z-10 gap-4">
          <Link href="/" className="flex items-center gap-2.5 font-display text-[26px] font-black tracking-tight text-ink no-underline">
            <span className="logo-mark" />
            <span>PinPoint</span>
          </Link>
          <ul className="hidden md:flex gap-7 list-none text-sm font-medium tracking-wide">
            <li><Link href="/play" className="text-ink-soft hover:text-pin no-underline border-b border-dashed border-transparent hover:border-pin pb-0.5 transition-colors">Spielen</Link></li>
            <li><Link href="/albums" className="text-ink-soft hover:text-pin no-underline border-b border-dashed border-transparent hover:border-pin pb-0.5 transition-colors">Alben</Link></li>
            <li><Link href="/leaderboard" className="text-ink-soft hover:text-pin no-underline border-b border-dashed border-transparent hover:border-pin pb-0.5 transition-colors">Ranking</Link></li>
            <li><Link href="/duel" className="text-ink-soft hover:text-pin no-underline border-b border-dashed border-transparent hover:border-pin pb-0.5 transition-colors">Duell</Link></li>
            {signedIn && (
              <>
                <li><Link href="/friends" className="text-ink-soft hover:text-pin no-underline border-b border-dashed border-transparent hover:border-pin pb-0.5 transition-colors">Freunde</Link></li>
                <li><Link href="/stats" className="text-ink-soft hover:text-pin no-underline border-b border-dashed border-transparent hover:border-pin pb-0.5 transition-colors">Stats</Link></li>
              </>
            )}
          </ul>
          <div className="flex items-center gap-3">
            <Link href="/upload" className="hidden sm:inline-flex btn-pill-dark">
              Foto hochladen
            </Link>
            <AuthMenu />
          </div>
        </nav>

        {/* HERO */}
        <section className="pt-20 pb-24 lg:pt-24 lg:pb-32 relative min-h-[80vh]">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-16 items-center">
            <div>
              <div className="eyebrow reveal reveal-1 mb-7">
                <span className="dot" />
                {signedIn ? "Willkommen zurück" : "Beta · Sommer 2026"}
              </div>
              <h1 className="reveal reveal-2 font-display-wonk font-black text-[clamp(48px,8vw,112px)] leading-[0.92] tracking-[-0.045em] text-ink mb-8">
                Wo war das,<br />
                <span className="accent-italic">nochmal</span>?<br />
                <span className="underline-hand">Erinner dich.</span>
              </h1>
              <p className="reveal reveal-3 text-lg lg:text-xl leading-relaxed text-ink-soft mb-10 max-w-[480px]">
                PinPoint verwandelt eure Urlaubsfotos in ein Spiel. Eine Person lädt ein Foto hoch,
                alle anderen <strong className="font-semibold highlight-mustard">setzen einen Pin auf der Karte</strong> — wer am nächsten dran ist, gewinnt.
                Aus Erinnerungen wird ein Quiz, aus Reisen werden Geschichten.
              </p>
              <div className="reveal reveal-4 flex flex-wrap gap-5 items-center">
                <Link href="/play" className="btn-primary">
                  Battle starten
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10m0 0L9 4m4 4L9 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
                <Link href="/duel" className="btn-link">⚔️ vs. Freunde →</Link>
                <Link href="#how" className="btn-link">So funktioniert&apos;s →</Link>
              </div>
              <div className="reveal reveal-4 mt-12 flex flex-wrap gap-x-8 gap-y-3 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-soft">
                <div className="flex items-center gap-2">📸 <strong className="text-ink font-bold">Eigene Fotos</strong> — kein Streetview</div>
                <div className="flex items-center gap-2">⚔️ <strong className="text-ink font-bold">7 Modi</strong> — solo bis 1 vs 1</div>
                <div className="flex items-center gap-2">🏆 <strong className="text-ink font-bold">Achievements</strong> · Stats · Ranking</div>
              </div>
            </div>

            {/* POLAROID PILE */}
            <div className="relative h-[600px] hidden lg:block">
              <div className="polaroid absolute" style={{ top: 20, left: 30, transform: "rotate(-7deg)", zIndex: 3 }}>
                <div className="polaroid-img" style={{ width: 220, height: 220, backgroundImage: "linear-gradient(135deg,rgba(0,0,0,0.05),rgba(0,0,0,0.15)), url(https://picsum.photos/seed/santorini-blue/440/440)" }} />
                <div className="polaroid-caption">irgendwo blau ✿</div>
                <div className="polaroid-date">07 · 24</div>
                <div className="pin-mark absolute" style={{ top: -8, right: 18 }} />
              </div>
              <div className="polaroid absolute" style={{ top: 100, right: 20, transform: "rotate(5deg)", zIndex: 2 }}>
                <div className="polaroid-img" style={{ width: 220, height: 220, backgroundImage: "linear-gradient(135deg,rgba(0,0,0,0.05),rgba(0,0,0,0.15)), url(https://picsum.photos/seed/tokyo-night/440/440)" }} />
                <div className="polaroid-caption">3 Uhr morgens</div>
                <div className="polaroid-date">11 · 23</div>
              </div>
              <div className="polaroid absolute" style={{ top: 280, left: 80, transform: "rotate(3deg)", zIndex: 4 }}>
                <div className="polaroid-img" style={{ width: 220, height: 220, backgroundImage: "linear-gradient(135deg,rgba(0,0,0,0.05),rgba(0,0,0,0.15)), url(https://picsum.photos/seed/iceland-falls/440/440)" }} />
                <div className="polaroid-caption">kalt, aber wow</div>
                <div className="polaroid-date">02 · 25</div>
                <div className="pin-mark absolute" style={{ top: -8, left: 24, background: "var(--postal-blue)" }} />
              </div>
              <div className="polaroid absolute" style={{ top: 320, right: 60, transform: "rotate(-4deg)", zIndex: 1, width: 200 }}>
                <div className="polaroid-img" style={{ width: 172, height: 172, backgroundImage: "linear-gradient(135deg,rgba(0,0,0,0.05),rgba(0,0,0,0.15)), url(https://picsum.photos/seed/marrakech-souk/400/400)" }} />
                <div className="polaroid-caption">der Markt 🌶</div>
                <div className="polaroid-date">04 · 25</div>
              </div>

              <div className="stamp absolute" style={{ bottom: -10, left: "50%", transform: "translateX(-30%) rotate(-8deg)", zIndex: 5 }}>
                <strong>+200 PUNKTE</strong>
                240 m daneben
              </div>

              <svg className="absolute" viewBox="0 0 90 60" style={{ width: 90, height: 60, top: 240, left: 280, transform: "rotate(-15deg)", zIndex: 6 }}>
                <path d="M5 30 Q 30 5, 70 25" stroke="#1c1a16" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                <path d="M65 18 L 72 25 L 64 32" stroke="#1c1a16" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <text x="0" y="55" transform="rotate(-8 0 55)" style={{ fontFamily: "Caveat, cursive", fontSize: 18, fill: "#1c1a16" }}>wo war das?</text>
              </svg>
            </div>
          </div>
        </section>

        <div className="stitched-divider" />

        {/* QUICK START · 4 tickets */}
        <section className="py-20 lg:py-24" id="how">
          <div className="text-center mb-14">
            <div className="section-eyebrow mb-4">▴ in 4 Schritten · ca. 2 min</div>
            <h2 className="font-display font-extrabold text-[clamp(38px,5.5vw,68px)] leading-none tracking-[-0.035em]">
              Erster Pin in <em className="accent-italic">2 Minuten</em>.
            </h2>
            <p className="text-ink-soft text-lg mt-5 max-w-[560px] mx-auto">
              Kein Account-Marathon, keine Tutorials. Vier Klicks zwischen dir und der ersten Runde.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { n: "1", t: "Anmelden", s: "Google oder Magic-Link", href: "/play", Icon: UserPlus },
              { n: "2", t: "Username setzen", s: "@dein_handle in Freunde", href: "/friends", Icon: Users },
              { n: "3", t: "Foto hochladen", s: "GPS automatisch · oder Pin", href: "/upload", Icon: Upload },
              { n: "4", t: "Loslegen", s: "Album · Daily · Duell", href: "/play", Icon: Play },
            ].map((s, i) => (
              <Link key={s.n} href={s.href} className="ticket no-underline" style={{ transform: i % 2 === 0 ? "rotate(-0.4deg)" : "rotate(0.4deg)" }}>
                <span className="ticket-num">{s.n}</span>
                <div className="flex items-center gap-2 text-ink-soft text-[11px] font-mono uppercase tracking-wider">
                  <s.Icon className="w-3.5 h-3.5" />
                  Schritt {s.n}
                </div>
                <div className="font-display text-[22px] font-bold tracking-tight">{s.t}</div>
                <div className="text-sm text-ink-soft">{s.s}</div>
              </Link>
            ))}
          </div>
        </section>

        <div className="stitched-divider" />

        {/* INTERACTIVE MINI-TUTORIAL */}
        <section className="py-24 lg:py-28" id="tutorial">
          <MiniTutorial />
        </section>
      </div>

      {/* GAME MODES */}
      <section className="section-warm sawtooth-top sawtooth-bottom py-24 lg:py-32" id="modes">
        <div className="max-w-[1280px] mx-auto px-8">
          <div className="text-center mb-14">
            <div className="section-eyebrow mb-4">✦ sieben Modi · ein Pin</div>
            <h2 className="font-display font-extrabold text-[clamp(40px,6vw,72px)] leading-none tracking-[-0.035em]">
              Spielmodi für <em className="accent-italic">jede Stimmung</em>
            </h2>
            <p className="text-ink-soft text-lg mt-5 max-w-[600px] mx-auto">
              Von entspannten Daily-Runden bis Hardcore No-Move. Jeder Modus zählt für eigene Achievements & Stats.
            </p>
          </div>

          {/* All 7 modes as a quick pill rail */}
          <div className="flex flex-wrap justify-center gap-2.5 mb-14">
            {[
              { t: "🟡 Daily Drop", h: "/play" },
              { t: "🔴 Speedrun · 20 s", h: "/play" },
              { t: "🔵 No-Move · ×1.5", h: "/play" },
              { t: "🟢 Daily Five · global", h: "/leaderboard" },
              { t: "🛣️ Memory Lane", h: "/lanes" },
              { t: "⚔️ Duell · live", h: "/duel" },
              { t: "👥 Lobby · 2–50", h: "/share" },
            ].map((m) => (
              <Link key={m.t} href={m.h} className="mode-pill no-underline">
                {m.t}
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              { tag: "Klassisch · empfohlen", title: "Daily Drop", desc: "5 Fotos aus deiner Bibliothek, kein Zeitdruck. Perfekter Einstieg — und ein kurzes Ritual am Morgen.", bg: "var(--mustard)", iconStroke: "var(--ink)", icon: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></> },
              { tag: "Adrenalin · 20 s", title: "Speedrun", desc: "Zwanzig Sekunden pro Foto. Bis zu +40 % Zeit-Bonus für schnelle Treffer. Pure Reflexe.", bg: "var(--pin)", iconStroke: "var(--paper)", stamp: "Achievement: Speed Demon", icon: <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></> },
              { tag: "Hardcore · ×1.5", title: "No-Move", desc: "Karte ist fix — kein Pan, kein Zoom. Dafür anderthalbfache Punkte. Nur für die Hartgesottenen.", bg: "var(--postal-blue)", iconStroke: "var(--paper)", icon: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 9h6v6H9z" /></> },
              { tag: "Welt vs. Welt", title: "Daily Five", desc: "Dieselben fünf Fotos für alle Spieler:innen weltweit. Jeden Tag neu. Direkter Vergleich im globalen Ranking.", bg: "var(--stamp-green)", iconStroke: "var(--paper)", stamp: "global · 24 h", icon: <><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15 15 0 010 20a15 15 0 010-20z" /></> },
              { tag: "Story-Mode", title: "Memory Lane", desc: "5–10 Fotos einer Reise hintereinander, in Reihenfolge. Erzählt nebenbei den ganzen Trip. Kombinierter Score.", bg: "var(--paper-deep)", iconStroke: "var(--ink)", border: true, icon: <><path d="M3 6l9-3 9 3-9 3-9-3z" /><path d="M3 12l9 3 9-3" /><path d="M3 18l9 3 9-3" /></> },
              { tag: "Live · 1 vs 1 oder 2–50", title: "Duell & Lobby", desc: "Echtzeit-Duell mit 6-Zeichen-Code, oder asynchrone Lobby für deine ganze Crew. Live-Punktestand, Live-Druck.", bg: "var(--ink)", iconStroke: "var(--paper)", icon: <><circle cx="9" cy="7" r="4" /><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /><path d="M21 21v-2a4 4 0 0 0-3-3.85" /></> },
            ].map((m, i) => (
              <div
                key={m.title}
                className="paper-card p-10 relative"
                style={{ transform: i % 2 === 0 ? "rotate(-0.5deg)" : "rotate(0.5deg)" }}
              >
                {m.stamp && (
                  <div className="stamp-tag absolute -top-5 right-6" style={{ transform: "rotate(8deg)" }}>{m.stamp}</div>
                )}
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mb-6 border-2 border-ink"
                  style={{ background: m.bg }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke={m.iconStroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                    {m.icon}
                  </svg>
                </div>
                <span className="tag-pin mb-2 block">{m.tag}</span>
                <h3 className="font-display text-[30px] font-bold tracking-tight mb-3">{m.title}</h3>
                <p className="text-ink-soft text-base leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>

          {/* Scoring explainer */}
          <div className="mt-16 paper-card p-8 md:p-10 grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-8 items-center">
            <div>
              <div className="section-eyebrow mb-3">◆ Punktesystem</div>
              <h3 className="font-display text-[28px] md:text-[34px] font-bold tracking-tight mb-3">
                Nah dran. Mehr Punkte. <em className="accent-italic">Schwer × mehr.</em>
              </h3>
              <p className="text-ink-soft text-base leading-relaxed mb-4">
                Distanz zum echten Ort entscheidet — danach multipliziert die Schwierigkeit. Anonyme Hotelzimmer geben mehr Punkte als der Eiffelturm.
              </p>
              <ul className="grid grid-cols-2 gap-x-5 gap-y-2 text-sm">
                <li>🟢 Einfach · ×0.7</li>
                <li>🟡 Mittel · ×1.0</li>
                <li>🟠 Schwer · ×1.5</li>
                <li>🔴 Brutal · ×2.5</li>
                <li>💀 Insane · ×3.0</li>
                <li>⚡ Speedrun · +Zeit-Bonus</li>
              </ul>
            </div>
            <div className="paper-card-soft p-6 font-mono text-sm leading-relaxed">
              <div className="text-ink-mute text-[10px] uppercase tracking-widest mb-3">Formel</div>
              <div className="text-base md:text-lg text-ink mb-4" style={{ fontFamily: "var(--font-fraunces), serif", fontStyle: "italic" }}>
                Score = max(0, 5000 · e<sup>−d/s</sup>) · M
              </div>
              <div className="grid grid-cols-[60px_1fr] gap-y-1.5 text-[12px] text-ink-soft">
                <div className="font-bold text-ink">d</div><div>Distanz in km</div>
                <div className="font-bold text-ink">s</div><div>Skala (Welt 2000 · Stadt 50)</div>
                <div className="font-bold text-ink">M</div><div>Schwierigkeits-Multiplikator</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-[1280px] mx-auto px-8 relative z-[2]">
        {/* PUBLIC SECTION */}
        <section className="py-28 lg:py-36" id="public">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-20 items-center">
            <div>
              <div className="section-eyebrow mb-4">◆ über deinen Kreis hinaus</div>
              <h2 className="font-display font-extrabold text-[clamp(40px,5.5vw,64px)] leading-none tracking-[-0.035em] mb-6">
                Privat mit Freunden.<br /><em className="accent-italic">Öffentlich</em>, wenn du willst.
              </h2>
              <p className="text-lg text-ink-soft mb-6 max-w-[500px]">
                Jedes Foto bekommt eine eigene Sichtbarkeit. Lade dein Lieblings-Sonnenuntergang hoch
                und teile ihn nur mit deiner Familie — oder pack ihn in den öffentlichen Pool und sieh,
                wie tausend Fremde versuchen, ihn zu finden.
              </p>

              <ul className="list-none mt-8 p-0">
                {[
                  { icon: "🔒", t: "Nur dein Kreis", s: "Familie, Freunde, geschlossene Gruppen" },
                  { icon: "👥", t: "Freunde von Freunden", s: "Erweiterter Bekanntenkreis, perfekt für Gruppenreisen" },
                  { icon: "🌍", t: "Öffentlich", s: "Daily Challenge für alle — sammle globale Punkte" },
                ].map((p) => (
                  <li key={p.t} className="privacy-row">
                    <span className="privacy-icon">{p.icon}</span>
                    <div>
                      <strong className="block font-bold mb-0.5">{p.t}</strong>
                      <span className="text-ink-soft text-sm">{p.s}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div
              className="relative aspect-[4/5] border-2 border-ink overflow-hidden"
              style={{ background: "#ede0c0", boxShadow: "8px 8px 0 var(--pin)" }}
            >
              <svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" className="w-full h-full block">
                <defs>
                  <pattern id="topo" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M0 20 Q 10 5, 20 20 T 40 20" stroke="#c4b48a" strokeWidth="0.6" fill="none" opacity="0.5" />
                    <path d="M0 30 Q 10 15, 20 30 T 40 30" stroke="#c4b48a" strokeWidth="0.6" fill="none" opacity="0.4" />
                  </pattern>
                </defs>
                <rect width="400" height="500" fill="url(#topo)" />
                <path d="M0 180 Q 80 160, 140 200 T 280 220 T 400 200 L 400 500 L 0 500 Z" fill="#dccfa6" opacity="0.5" />
                <path d="M0 180 Q 80 160, 140 200 T 280 220 T 400 200" stroke="#1c1a16" strokeWidth="1.2" fill="none" />
                <path d="M50 50 Q 200 100, 380 80" stroke="#1c1a16" strokeWidth="0.8" fill="none" strokeDasharray="3 3" opacity="0.4" />
                <path d="M30 250 Q 200 280, 380 320" stroke="#1c1a16" strokeWidth="0.8" fill="none" strokeDasharray="3 3" opacity="0.4" />
                <g transform="translate(50 80)">
                  <circle r="22" fill="none" stroke="#1c1a16" strokeWidth="1" />
                  <path d="M0 -18 L 5 0 L 0 18 L -5 0 Z" fill="#c33129" />
                  <text x="0" y="-26" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="10" fill="#1c1a16" fontWeight="700">N</text>
                </g>
              </svg>

              {[
                { top: "22%", left: "30%", color: "var(--pin)", delay: "0.1s" },
                { top: "38%", left: "65%", color: "var(--postal-blue)", delay: "0.4s" },
                { top: "58%", left: "20%", color: "var(--stamp-green)", delay: "0.7s" },
                { top: "68%", left: "72%", color: "var(--mustard)", delay: "1.0s" },
                { top: "78%", left: "45%", color: "var(--pin)", delay: "1.3s" },
              ].map((p, i) => (
                <div
                  key={i}
                  className="absolute"
                  style={{
                    top: p.top,
                    left: p.left,
                    width: 22,
                    height: 22,
                    background: p.color,
                    borderRadius: "50% 50% 50% 0",
                    transform: "rotate(-45deg)",
                    boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
                    animation: `pp-drop 0.6s ease-out backwards`,
                    animationDelay: p.delay,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: "50%", left: "50%",
                      transform: "translate(-50%, -50%) rotate(45deg)",
                      width: 8, height: 8,
                      background: "var(--paper)",
                      borderRadius: "50%",
                    }}
                  />
                </div>
              ))}

              <div className="absolute font-mono text-[10px] uppercase tracking-wider bg-paper border border-ink px-2.5 py-1 whitespace-nowrap" style={{ top: "18%", left: "36%" }}>Lisa · 89 m</div>
              <div className="absolute font-mono text-[10px] uppercase tracking-wider bg-paper border border-ink px-2.5 py-1 whitespace-nowrap" style={{ top: "64%", left: "76%" }}>Tom · 1.2 km</div>
              <div className="absolute bottom-4 right-4 bg-paper border border-ink px-3 py-2 font-mono text-[10px] uppercase tracking-wider">52.516 N · 13.378 E</div>
            </div>
          </div>
        </section>

        {/* FEATURES GRID */}
        <section className="py-20 lg:py-24" id="features">
          <div className="text-center mb-12">
            <div className="section-eyebrow mb-4">✦ alles drin</div>
            <h2 className="font-display font-extrabold text-[clamp(36px,5vw,60px)] leading-none tracking-[-0.035em]">
              Mehr als nur <em className="accent-italic">raten</em>.
            </h2>
            <p className="text-ink-soft text-lg mt-5 max-w-[560px] mx-auto">
              Achievements, Stats, Lanes, PWA-Install. Alles ohne Extra-App, alles in deinem Browser.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { icon: <Award className="w-5 h-5" />, t: "Achievements", s: "Sammle Badges", h: "/achievements" },
              { icon: <BarChart3 className="w-5 h-5" />, t: "Stats", s: "Heatmap & Trends", h: "/stats" },
              { icon: <MapIcon className="w-5 h-5" />, t: "Lanes", s: "Reisen als Story", h: "/lanes" },
              { icon: <Users className="w-5 h-5" />, t: "Freunde", s: "Crew + Suche", h: "/friends" },
              { icon: <Trophy className="w-5 h-5" />, t: "Ranking", s: "Daily & Saison", h: "/leaderboard" },
              { icon: <Smartphone className="w-5 h-5" />, t: "PWA", s: "App-Like, offline", h: "#how" },
            ].map((f) => (
              <Link key={f.t} href={f.h} className="feature-card">
                <div className="fc-icon">{f.icon}</div>
                <div className="font-display text-lg font-bold tracking-tight">{f.t}</div>
                <div className="text-xs text-ink-soft">{f.s}</div>
              </Link>
            ))}
          </div>
        </section>

        <div className="stitched-divider" />

        {/* FAQ */}
        <section className="py-20 lg:py-24" id="faq">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-10 lg:gap-16">
            <div>
              <div className="section-eyebrow mb-3">◆ häufig gefragt</div>
              <h2 className="font-display font-extrabold text-[clamp(36px,5vw,60px)] leading-[0.95] tracking-[-0.035em] mb-5">
                Antworten auf <em className="accent-italic">die Klassiker.</em>
              </h2>
              <p className="text-ink-soft text-base mb-5">
                Mehr Details? Schau in den <Link href="/play" className="btn-link">Spiel-Hub</Link> oder ins <a href="https://github.com/" className="btn-link">User-Guide</a>.
              </p>
            </div>
            <div>
              {[
                { q: "Brauche ich einen Account?", a: "Anschauen geht ohne. Aber für Foto-Upload, Freunde, Lanes und Ranking brauchst du eine Anmeldung — ein Klick mit Google oder ein Magic-Link per E-Mail. Kein Passwort." },
                { q: "Was passiert mit meinen Fotos?", a: "Du entscheidest pro Foto: privat (nur du), Freunde (deine Crew), oder öffentlich (Daily-Pool). Privat bleibt privat — keine fremden Augen, kein Training für KI." },
                { q: "Wie funktioniert die Punktevergabe?", a: "Distanz zum echten Ort × Schwierigkeits-Multiplikator. Eiffelturm gibt wenig (×0.7), ein Hotelzimmer viel (×2.5). Speedrun bringt zusätzlich bis zu +40 % Zeit-Bonus." },
                { q: "Was ist eine Memory Lane?", a: "5–10 Fotos einer Reise in chronologischer Reihenfolge. Erzählt nebenbei den ganzen Trip — und gibt einen kombinierten Score am Ende. Lanes baust du unter „Lanes“." },
                { q: "Geht das auch offline / als App?", a: "PinPoint ist eine PWA — du kannst sie auf Home-Screen installieren, sie startet wie eine native App, funktioniert grundlegend offline und cloudet automatisch zwischen Geräten." },
                { q: "Was wenn das Foto keinen GPS-Standort hat?", a: "Dann setzt du beim Upload selbst einen Pin auf die Karte oder nutzt die Ortsuche — fertig. Genauso präzise wie EXIF, nur manuell." },
              ].map((f) => (
                <details key={f.q} className="faq-item">
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* CTA */}
      <section className="section-dark py-24 lg:py-32" id="cta">
        <div className="max-w-[1280px] mx-auto px-8 text-center">
          <h2 className="font-display-wonk font-black text-[clamp(48px,7vw,96px)] leading-[0.95] tracking-[-0.04em] mb-6 text-paper">
            Spiel die Welt<br />deiner <em className="font-light italic" style={{ color: "var(--mustard)" }}>Freunde.</em>
          </h2>
          <p className="text-lg max-w-[540px] mx-auto mb-12" style={{ color: "rgba(241, 231, 208, 0.75)" }}>
            Lade Fotos hoch, baue eine Memory Lane oder spring in den Daily-Drop.
            Spiele privat mit deinem Kreis &mdash; oder global mit Tausenden anderen.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/play" className="btn-primary" style={{ background: "var(--paper)", color: "var(--ink)", boxShadow: "4px 4px 0 var(--mustard)" }}>
              Jetzt spielen
            </Link>
            <Link href="/upload" className="btn-ghost" style={{ borderColor: "var(--paper)", color: "var(--paper)" }}>
              Foto hochladen
            </Link>
          </div>
        </div>
      </section>

      <footer className="py-12 border-t border-dashed border-paper-edge">
        <div className="max-w-[1280px] mx-auto px-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm mb-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="logo-mark" style={{ width: 22, height: 22 }} />
              <span className="font-display text-lg font-black tracking-tight">PinPoint</span>
            </div>
            <p className="text-ink-soft text-[13px]">
              Wo war das nochmal? Aus Erinnerungen wird ein Spiel.
            </p>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-ink-mute mb-3">Spielen</div>
            <ul className="space-y-1.5">
              <li><Link href="/play" className="text-ink-soft hover:text-pin no-underline">Spiel-Hub</Link></li>
              <li><Link href="/duel" className="text-ink-soft hover:text-pin no-underline">Duell · live</Link></li>
              <li><Link href="/share" className="text-ink-soft hover:text-pin no-underline">Lobby</Link></li>
              <li><Link href="/lanes" className="text-ink-soft hover:text-pin no-underline">Memory Lanes</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-ink-mute mb-3">Du</div>
            <ul className="space-y-1.5">
              <li><Link href="/upload" className="text-ink-soft hover:text-pin no-underline">Foto hochladen</Link></li>
              <li><Link href="/albums" className="text-ink-soft hover:text-pin no-underline">Alben</Link></li>
              <li><Link href="/friends" className="text-ink-soft hover:text-pin no-underline">Freunde</Link></li>
              <li><Link href="/stats" className="text-ink-soft hover:text-pin no-underline">Stats</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-ink-mute mb-3">Mehr</div>
            <ul className="space-y-1.5">
              <li><Link href="/leaderboard" className="text-ink-soft hover:text-pin no-underline">Ranking</Link></li>
              <li><Link href="/achievements" className="text-ink-soft hover:text-pin no-underline">Achievements</Link></li>
              <li><Link href="#tutorial" className="text-ink-soft hover:text-pin no-underline">Mini-Anleitung</Link></li>
              <li><Link href="#faq" className="text-ink-soft hover:text-pin no-underline">FAQ</Link></li>
            </ul>
          </div>
        </div>
        <div className="text-center text-[12px] text-ink-mute font-mono tracking-wide">
          PinPoint · 2026 · <span className="text-ink-soft">52.5200° N — 13.4050° E</span> · Mit Liebe gebaut.
        </div>
      </footer>
    </>
  );
}

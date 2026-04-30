"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AuthMenu from "@/components/AuthMenu";
import { getCurrentUser, isCloudEnabled } from "@/lib/supabase";

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
                <div className="flex items-center gap-2">⚔️ <strong className="text-ink font-bold">Solo oder Battle</strong> — beliebig viele</div>
                <div className="flex items-center gap-2">👥 <strong className="text-ink font-bold">2–50</strong> Spieler pro Lobby</div>
                <div className="flex items-center gap-2">🏆 <strong className="text-ink font-bold">Tägliches</strong> Ranking</div>
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

        {/* HOW IT WORKS */}
        <section className="py-24 lg:py-32" id="how">
          <div className="text-center mb-20">
            <div className="section-eyebrow mb-4">▴ in drei Schritten</div>
            <h2 className="font-display font-extrabold text-[clamp(40px,6vw,72px)] leading-none tracking-[-0.035em]">
              So <em className="accent-italic">funktioniert&apos;s</em>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            <div
              className="hidden md:block absolute z-0 h-0.5 left-[16.66%] right-[16.66%] top-[40px]"
              style={{
                backgroundImage: "linear-gradient(to right, var(--paper-edge) 50%, transparent 50%)",
                backgroundSize: "12px 2px",
                backgroundRepeat: "repeat-x",
              }}
            />
            {[
              { n: "01", title: "Foto hochladen", desc: "Standort kommt automatisch aus den Foto-Metadaten — oder du setzt den Pin selbst auf die Karte." },
              { n: "02", title: "Freunde raten", desc: "Deine Crew sieht das Foto und tippt, wo's wohl war. Je näher dran, desto mehr Punkte.", bg: "var(--mustard)" },
              { n: "03", title: "Story enthüllen", desc: "Lösung mit Datum, Ort und der Geschichte dahinter. Jedes Foto wird Teil eurer gemeinsamen Karte.", bg: "var(--pin)", color: "var(--paper)" },
            ].map((s) => (
              <div key={s.n} className="text-center relative z-10">
                <div className="step-number mb-6 mx-auto" style={{ background: s.bg, color: s.color }}>{s.n}</div>
                <h3 className="font-display text-[28px] font-bold mb-3 tracking-tight">{s.title}</h3>
                <p className="text-ink-soft text-base max-w-[280px] mx-auto">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* GAME MODES */}
      <section className="section-warm sawtooth-top sawtooth-bottom py-24 lg:py-32" id="modes">
        <div className="max-w-[1280px] mx-auto px-8">
          <div className="text-center mb-20">
            <div className="section-eyebrow mb-4">✦ mehr als nur raten</div>
            <h2 className="font-display font-extrabold text-[clamp(40px,6vw,72px)] leading-none tracking-[-0.035em]">
              Spielmodi für <em className="accent-italic">jede Stimmung</em>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              { tag: "Klassisch", title: "Daily Drop", desc: "Ein Foto pro Tag, geteilt mit deinem Kreis. Wie Wordle, aber für Reise-Erinnerungen — kurzes Ritual am Morgen.", bg: "var(--mustard)", iconStroke: "var(--ink)", icon: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></> },
              { tag: "Wann · Wo · Wer", title: "Triple Guess", desc: "Nicht nur der Ort — auch Jahr, Jahreszeit und Fotograf werden geraten. Aus einem Bild werden drei Spielmomente.", bg: "var(--pin)", iconStroke: "var(--paper)", stamp: "Beta · Limited", icon: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></> },
              { tag: "Story-Mode", title: "Memory Lane", desc: "5–10 Fotos einer Reise hintereinander, kombinierter Punktestand. Erzählt nebenbei den ganzen Trip — von Ankunft bis Heimreise.", bg: "var(--stamp-green)", iconStroke: "var(--paper)", icon: <><path d="M3 6l9-3 9 3-9 3-9-3z" /><path d="M3 12l9 3 9-3" /><path d="M3 18l9 3 9-3" /></> },
              { tag: "Live · Async", title: "Duell & Koop", desc: "Eins gegen eins um die genauere Position — oder gemeinsam einen Pin platzieren, Durchschnitt zählt. Zwei Vibes, ein Spiel.", bg: "var(--postal-blue)", iconStroke: "var(--paper)", icon: <><circle cx="9" cy="7" r="4" /><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /><path d="M21 21v-2a4 4 0 0 0-3-3.85" /></> },
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

      <footer className="py-10 text-center text-[13px] text-ink-soft font-mono tracking-wide">
        PinPoint · 2026 · <span className="text-ink">52.5200° N — 13.4050° E</span> · Mit Liebe gebaut.
      </footer>
    </>
  );
}

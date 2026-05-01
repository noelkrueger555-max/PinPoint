"use client";

/**
 * AuthGate — wraps a page and forces sign-in before content is shown.
 *
 * Falls back gracefully when cloud is not configured (renders children),
 * so dev/offline mode keeps working.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Lock,
  CloudUpload,
  Users,
  Trophy,
  Award,
  ArrowLeft,
} from "lucide-react";
import {
  isCloudEnabled,
  getCurrentUser,
  onAuthChange,
} from "@/lib/supabase";
import AuthForm from "./AuthForm";

export default function AuthGate({
  children,
  reason,
}: {
  children: React.ReactNode;
  /** Custom headline for the lock screen. */
  reason?: React.ReactNode;
}) {
  const cloud = isCloudEnabled();
  const [checked, setChecked] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (!cloud) {
      setChecked(true);
      return;
    }
    let cancelled = false;
    getCurrentUser()
      .then((u) => {
        if (!cancelled) setSignedIn(!!u);
      })
      .finally(() => {
        if (!cancelled) setChecked(true);
      });
    const unsub = onAuthChange((isIn) => {
      if (!cancelled) setSignedIn(isIn);
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [cloud]);

  // Cloud disabled → app stays usable in offline/local mode.
  if (!cloud) return <>{children}</>;

  if (!checked) {
    return (
      <div className="max-w-[1280px] mx-auto px-6 md:px-8 pt-32 pb-24 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-ink-mute" />
      </div>
    );
  }

  if (signedIn) return <>{children}</>;

  return (
    <main className="max-w-[1100px] mx-auto px-5 md:px-8 pt-6 md:pt-12 pb-20 relative z-[2]">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-pin mb-5"
      >
        <ArrowLeft className="w-4 h-4" /> Zur Startseite
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_460px] gap-8 lg:gap-14 items-start">
        {/* Benefits hero */}
        <div className="hidden md:block">
          <div className="dashed-pill mb-3 inline-block">
            <Lock className="w-3 h-3 inline mr-1" /> Account erforderlich
          </div>
          <h1 className="font-display-wonk font-black text-[clamp(36px,5.5vw,64px)] leading-[0.95] tracking-[-0.035em] mb-4">
            {reason ?? (
              <>
                Erstelle einen <em className="accent-italic">Account</em>.<br />
                Dauert <em className="accent-italic">10 Sekunden</em>.
              </>
            )}
          </h1>
          <p className="text-ink-soft text-lg mb-8 max-w-[440px]">
            Kostenlos, EU-Hosting, DSGVO-konform. Du kannst dich jederzeit wieder abmelden — deine Daten gehören dir.
          </p>

          <ul className="space-y-3.5">
            {[
              {
                Icon: CloudUpload,
                t: "Cloud-Sync",
                s: "Fotos & Lanes auf allen Geräten verfügbar",
                color: "var(--postal-blue)",
              },
              {
                Icon: Users,
                t: "Crew & Lobbys",
                s: "Mit Freunden spielen, Lobby-Codes teilen",
                color: "var(--pin)",
              },
              {
                Icon: Trophy,
                t: "Ranking & Daily Five",
                s: "Globale Bestenliste, jeden Tag neu",
                color: "var(--mustard)",
              },
              {
                Icon: Award,
                t: "Achievements & Stats",
                s: "30+ Badges, Heatmap, persönliche Trends",
                color: "var(--stamp-green)",
              },
            ].map((b) => (
              <li
                key={b.t}
                className="flex items-start gap-4 paper-card-soft p-4"
              >
                <span
                  className="w-10 h-10 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                  style={{ borderColor: "var(--ink)", background: b.color, color: "var(--paper)" }}
                >
                  <b.Icon className="w-4 h-4" />
                </span>
                <div>
                  <div className="font-bold">{b.t}</div>
                  <div className="text-sm text-ink-soft">{b.s}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Auth card */}
        <div>
          {/* Mobile-only headline above form */}
          <div className="md:hidden mb-5 text-center">
            <div className="dashed-pill mb-3 inline-block">
              <Lock className="w-3 h-3 inline mr-1" /> Sign-in
            </div>
            <h1 className="font-display-wonk font-black text-[34px] leading-[0.95] tracking-[-0.035em]">
              {reason ?? (
                <>
                  Bei <em className="accent-italic">PinPoint</em> einsteigen
                </>
              )}
            </h1>
            <p className="text-ink-soft text-sm mt-2 max-w-[320px] mx-auto">
              Cloud-Sync, Crew, Ranking — kostenlos in 10 Sekunden.
            </p>
          </div>

          <div className="paper-card p-6 md:p-8">
            <AuthForm onSignedIn={() => setSignedIn(true)} />
          </div>

          {/* Mini-benefits on mobile, below form */}
          <ul className="md:hidden mt-5 grid grid-cols-2 gap-2 text-[12px]">
            {[
              { Icon: CloudUpload, t: "Cloud-Sync" },
              { Icon: Users, t: "Crew & Lobbys" },
              { Icon: Trophy, t: "Ranking" },
              { Icon: Award, t: "Achievements" },
            ].map((b) => (
              <li
                key={b.t}
                className="flex items-center gap-2 paper-card-soft px-3 py-2"
              >
                <b.Icon className="w-3.5 h-3.5 text-ink-soft" />
                <span className="text-ink-soft">{b.t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}

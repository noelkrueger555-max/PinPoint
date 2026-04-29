"use client";

/**
 * AuthGate — wraps a page and forces sign-in before content is shown.
 *
 * Falls back gracefully when cloud is not configured (renders children),
 * so dev/offline mode keeps working.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { isCloudEnabled, getCurrentUser, onAuthChange } from "@/lib/supabase";
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
    <main className="max-w-[1280px] mx-auto px-6 md:px-8 pt-12 pb-24 relative z-[2]">
      <div className="max-w-md mx-auto paper-card p-8 text-center">
        <div className="dashed-pill mb-3 inline-block">🔒 Account erforderlich</div>
        <h1 className="font-display-wonk font-black text-3xl md:text-4xl tracking-tight mt-2 mb-3">
          {reason ?? (
            <>
              Erstelle einen <em className="accent-italic">Account</em> oder melde dich an.
            </>
          )}
        </h1>
        <p className="text-ink-soft text-sm mb-6">
          PinPoint speichert deine Fotos, Punkte, Freunde und Memory Lanes sicher in deinem Profil.
          Account erstellen dauert 10 Sekunden — kostenlos, EU-Hosting.
        </p>

        <AuthForm onSignedIn={() => setSignedIn(true)} />

        <Link
          href="/"
          className="mt-6 inline-block text-sm text-ink-soft hover:text-pin"
        >
          ← Zurück zur Startseite
        </Link>
      </div>
    </main>
  );
}

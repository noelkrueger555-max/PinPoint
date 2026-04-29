"use client";

/**
 * AuthGate — wraps a page and forces sign-in before content is shown.
 *
 * Falls back gracefully when cloud is not configured (renders children),
 * so dev/offline mode keeps working.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Lock } from "lucide-react";
import {
  isCloudEnabled,
  getCurrentUser,
  signInWithGoogle,
  signInWithMagicLink,
} from "@/lib/supabase";

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
  const [email, setEmail] = useState("");
  const [magicSent, setMagicSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    return () => {
      cancelled = true;
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
        <div className="dashed-pill mb-3 inline-block">🔒 Anmeldung erforderlich</div>
        <h1 className="font-display-wonk font-black text-3xl md:text-4xl tracking-tight mt-2 mb-3">
          {reason ?? (
            <>
              Du brauchst einen <em className="accent-italic">Account</em>, um zu spielen.
            </>
          )}
        </h1>
        <p className="text-ink-soft text-sm mb-7">
          PinPoint speichert deine Fotos, Punkte, Freunde und Memory Lanes sicher in deinem Profil.
          Anmelden dauert 10 Sekunden.
        </p>

        <button
          onClick={async () => {
            setError(null);
            setSubmitting(true);
            try {
              await signInWithGoogle();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Anmeldung fehlgeschlagen");
              setSubmitting(false);
            }
          }}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-3 border-2 border-ink bg-paper hover:bg-paper-warm py-3 px-4 font-display font-bold transition-colors disabled:opacity-60"
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11.1 0 20-8.9 20-20 0-1.3-.1-2.4-.4-3.5z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5h-1.9V20H24v8h11.3c-.8 2.2-2.1 4.1-3.9 5.6l6.2 5.2C40.9 35.3 44 30 44 24c0-1.3-.1-2.4-.4-3.5z" />
          </svg>
          Mit Google anmelden
        </button>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 border-t border-dashed border-ink-mute/50" />
          <span className="text-xs uppercase tracking-wider text-ink-mute font-mono">oder</span>
          <div className="flex-1 border-t border-dashed border-ink-mute/50" />
        </div>

        {magicSent ? (
          <div className="paper-card-soft p-4 text-sm">
            <strong className="block font-display font-bold mb-1">Mail unterwegs!</strong>
            Klick den Magic-Link in deinem Postfach.
          </div>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!email.trim()) return;
              setError(null);
              setSubmitting(true);
              try {
                await signInWithMagicLink(email.trim());
                setMagicSent(true);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Mailversand fehlgeschlagen");
              } finally {
                setSubmitting(false);
              }
            }}
            className="space-y-3 text-left"
          >
            <div className="paper-input flex items-center gap-2">
              <input
                type="email"
                required
                placeholder="du@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-transparent outline-none border-0 p-0 font-sans text-ink"
              />
            </div>
            <button
              type="submit"
              disabled={submitting || !email.trim()}
              className="btn-primary w-full justify-center disabled:opacity-60"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Magic-Link senden"}
            </button>
          </form>
        )}

        {error && (
          <div className="mt-4 text-sm text-pin font-medium border border-pin/40 px-3 py-2 paper-card-soft">
            {error}
          </div>
        )}

        <div className="mt-6 text-[11px] uppercase tracking-wider font-mono text-ink-mute flex items-center justify-center gap-2">
          <Lock className="w-3 h-3" /> Verschlüsselt · DSGVO · EU-Hosting
        </div>

        <Link href="/" className="mt-6 inline-block text-sm text-ink-soft hover:text-pin">
          ← Zurück zur Startseite
        </Link>
      </div>
    </main>
  );
}

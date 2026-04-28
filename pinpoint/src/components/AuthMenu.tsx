"use client";

import { useEffect, useState } from "react";
import { LogIn, LogOut, Loader2, Mail } from "lucide-react";
import {
  isCloudEnabled,
  getCurrentUser,
  signInWithGoogle,
  signInWithMagicLink,
  signOut,
} from "@/lib/supabase";

interface SimpleUser {
  email?: string | null;
  user_metadata?: { full_name?: string; avatar_url?: string };
}

export default function AuthMenu() {
  const cloud = isCloudEnabled();
  const [user, setUser] = useState<SimpleUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [magicSent, setMagicSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cloud) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    getCurrentUser()
      .then((u) => {
        if (!cancelled) setUser((u as SimpleUser) ?? null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cloud]);

  if (!cloud) return null;

  if (loading) {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-ink-soft font-mono">
        <Loader2 className="w-4 h-4 animate-spin" />
      </span>
    );
  }

  if (user) {
    const name =
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "Profil";
    const avatar = user.user_metadata?.avatar_url;
    return (
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 paper-card-soft px-3 py-2 hover:translate-y-[-1px] transition-transform"
          aria-label="Profilmenü"
        >
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              alt=""
              className="w-7 h-7 rounded-full border border-ink object-cover"
            />
          ) : (
            <span className="w-7 h-7 rounded-full border border-ink bg-mustard flex items-center justify-center text-xs font-bold uppercase">
              {name.slice(0, 1)}
            </span>
          )}
          <span className="hidden sm:block text-sm font-medium max-w-[140px] truncate">
            {name}
          </span>
        </button>
        {open && (
          <div className="absolute right-0 mt-2 w-64 paper-card p-3 z-50 shadow-xl">
            <div className="px-2 py-2 border-b border-dashed border-ink-mute/40">
              <div className="text-xs uppercase tracking-wider text-ink-mute font-mono mb-1">
                Eingeloggt als
              </div>
              <div className="text-sm font-bold truncate">{user.email}</div>
            </div>
            <button
              onClick={async () => {
                await signOut();
                setUser(null);
                setOpen(false);
              }}
              className="w-full mt-2 flex items-center gap-2 px-2 py-2 text-sm hover:bg-paper-warm rounded transition-colors"
            >
              <LogOut className="w-4 h-4" /> Abmelden
            </button>
          </div>
        )}
      </div>
    );
  }

  // Not signed in → button + modal
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-pill-dark inline-flex items-center gap-2"
      >
        <LogIn className="w-4 h-4" /> Anmelden
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          style={{ background: "rgba(28, 26, 22, 0.55)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="paper-card w-full max-w-md p-8 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="dashed-pill mb-3 mx-auto inline-block">📮 Willkommen zurück</div>
              <h2 className="font-display-wonk font-black text-3xl tracking-tight">
                Bei <em className="accent-italic">PinPoint</em> anmelden
              </h2>
              <p className="text-ink-soft text-sm mt-3">
                Speichere deine Fotos in der Cloud, spiele mit Freunden und sieh dich im
                globalen Daily-Leaderboard.
              </p>
            </div>

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

            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 border-t border-dashed border-ink-mute/50" />
              <span className="text-xs uppercase tracking-wider text-ink-mute font-mono">oder</span>
              <div className="flex-1 border-t border-dashed border-ink-mute/50" />
            </div>

            {magicSent ? (
              <div className="text-center paper-card-soft p-5">
                <Mail className="w-8 h-8 mx-auto mb-3 text-pin" />
                <div className="font-display font-bold text-lg mb-1">Mail unterwegs!</div>
                <div className="text-sm text-ink-soft">
                  Prüf dein Postfach — der Magic-Link öffnet PinPoint direkt im Browser.
                </div>
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
                className="space-y-3"
              >
                <div className="paper-input flex items-center gap-2">
                  <Mail className="w-4 h-4 text-ink-mute" />
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

            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center hover:bg-paper-warm rounded-full transition-colors"
              aria-label="Schließen"
            >
              ✕
            </button>

            <div className="mt-6 text-center text-[11px] uppercase tracking-wider font-mono text-ink-mute">
              Wir versenden keine Werbung. DSGVO-konform · EU-Hosting
            </div>
          </div>
        </div>
      )}
    </>
  );
}

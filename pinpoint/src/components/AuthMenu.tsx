"use client";

import { useEffect, useState } from "react";
import { LogIn, LogOut, Loader2 } from "lucide-react";
import {
  isCloudEnabled,
  getCurrentUser,
  signOut,
  onAuthChange,
} from "@/lib/supabase";
import AuthForm from "./AuthForm";

interface SimpleUser {
  email?: string | null;
  user_metadata?: { full_name?: string; display_name?: string; avatar_url?: string };
}

export default function AuthMenu() {
  const cloud = isCloudEnabled();
  const [user, setUser] = useState<SimpleUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

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
    const unsub = onAuthChange((isIn) => {
      if (cancelled) return;
      if (!isIn) {
        setUser(null);
      } else {
        getCurrentUser().then((u) => {
          if (!cancelled) setUser((u as SimpleUser) ?? null);
        });
      }
      setOpen(false);
    });
    return () => {
      cancelled = true;
      unsub();
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
      user.user_metadata?.display_name ||
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
          className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8 overflow-y-auto"
          style={{ background: "rgba(28, 26, 22, 0.55)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="paper-card w-full max-w-md p-8 relative my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="dashed-pill mb-3 mx-auto inline-block">📮 Willkommen</div>
              <h2 className="font-display-wonk font-black text-3xl tracking-tight">
                Bei <em className="accent-italic">PinPoint</em> einsteigen
              </h2>
              <p className="text-ink-soft text-sm mt-3">
                Speichere Fotos, sammle Punkte, spiele mit Freunden.
              </p>
            </div>

            <AuthForm onSignedIn={() => setOpen(false)} />

            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center hover:bg-paper-warm rounded-full transition-colors"
              aria-label="Schließen"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}

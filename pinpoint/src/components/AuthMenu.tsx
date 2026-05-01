"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  LogIn,
  LogOut,
  Loader2,
  User,
  Trophy,
  Award,
  BarChart3,
  Settings,
  X,
  Users,
} from "lucide-react";
import {
  isCloudEnabled,
  getCurrentUser,
  signOut,
  onAuthChange,
} from "@/lib/supabase";
import AuthForm from "./AuthForm";

interface SimpleUser {
  email?: string | null;
  user_metadata?: {
    full_name?: string;
    display_name?: string;
    avatar_url?: string;
  };
}

export default function AuthMenu() {
  const cloud = isCloudEnabled();
  const [user, setUser] = useState<SimpleUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false); // sign-in modal
  const [menuOpen, setMenuOpen] = useState(false); // signed-in dropdown
  const wrapRef = useRef<HTMLDivElement | null>(null);

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
      setMenuOpen(false);
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [cloud]);

  // Close dropdown on outside click / Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // Lock body scroll while sign-in modal is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!cloud) return null;

  if (loading) {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-ink-soft font-mono">
        <Loader2 className="w-4 h-4 animate-spin" />
      </span>
    );
  }

  /* ── Signed-in: avatar button + rich dropdown / sheet ── */
  if (user) {
    const name =
      user.user_metadata?.full_name ||
      user.user_metadata?.display_name ||
      user.email?.split("@")[0] ||
      "Profil";
    const avatar = user.user_metadata?.avatar_url;
    const initial = name.slice(0, 1).toUpperCase();

    return (
      <div className="relative" ref={wrapRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 paper-card-soft pl-1 pr-3 py-1 hover:translate-y-[-1px] transition-transform"
          aria-label="Profilmenü"
          aria-expanded={menuOpen}
        >
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              alt=""
              className="w-8 h-8 rounded-full border border-ink object-cover"
            />
          ) : (
            <span className="w-8 h-8 rounded-full border border-ink bg-mustard flex items-center justify-center text-sm font-bold uppercase">
              {initial}
            </span>
          )}
          <span className="hidden sm:block text-sm font-medium max-w-[140px] truncate">
            {name}
          </span>
        </button>

        {menuOpen && (
          <>
            {/* Mobile: backdrop behind sheet */}
            <div
              className="fixed inset-0 z-40 sm:hidden"
              style={{ background: "rgba(28,26,22,0.5)" }}
              onClick={() => setMenuOpen(false)}
              aria-hidden
            />
            <div className="profile-menu" role="menu">
              <div className="pm-header">
                <span className="avatar-bubble" style={{ width: 48, height: 48, fontSize: 20, boxShadow: "2px 2px 0 var(--ink)" }}>
                  {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatar} alt="" />
                  ) : (
                    initial
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{name}</div>
                  <div className="text-[12px] font-mono text-ink-mute truncate">
                    {user.email}
                  </div>
                </div>
              </div>
              <div className="pm-list">
                <Link href="/account" onClick={() => setMenuOpen(false)} role="menuitem">
                  <User className="w-4 h-4" /> Konto &amp; Profil
                </Link>
                <Link href="/friends" onClick={() => setMenuOpen(false)} role="menuitem">
                  <Users className="w-4 h-4" /> Freunde
                </Link>
                <Link href="/stats" onClick={() => setMenuOpen(false)} role="menuitem">
                  <BarChart3 className="w-4 h-4" /> Stats
                </Link>
                <Link href="/achievements" onClick={() => setMenuOpen(false)} role="menuitem">
                  <Award className="w-4 h-4" /> Erfolge
                </Link>
                <Link href="/leaderboard" onClick={() => setMenuOpen(false)} role="menuitem">
                  <Trophy className="w-4 h-4" /> Ranking
                </Link>
                <div className="pm-divider" />
                <Link href="/account#settings" onClick={() => setMenuOpen(false)} role="menuitem">
                  <Settings className="w-4 h-4" /> Einstellungen
                </Link>
                <button
                  onClick={async () => {
                    await signOut();
                    setUser(null);
                    setMenuOpen(false);
                  }}
                  className="pm-danger"
                  role="menuitem"
                >
                  <LogOut className="w-4 h-4" /> Abmelden
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  /* ── Signed-out: button → sign-in modal/sheet ── */
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-pill-dark inline-flex items-center gap-2"
      >
        <LogIn className="w-4 h-4" />
        <span>Anmelden</span>
      </button>
      {open && (
        <div
          className="auth-backdrop"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Anmelden oder Registrieren"
        >
          <div className="auth-card p-6 sm:p-8" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center hover:bg-paper-warm rounded-full transition-colors"
              aria-label="Schließen"
              type="button"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center mb-6">
              <div className="dashed-pill mb-3 inline-block">📮 Willkommen</div>
              <h2 className="font-display-wonk font-black text-3xl tracking-tight">
                Bei <em className="accent-italic">PinPoint</em> einsteigen
              </h2>
              <p className="text-ink-soft text-sm mt-3 max-w-[360px] mx-auto">
                Speichere Fotos, sammle Punkte, spiele mit Freunden — kostenlos, in 10 Sekunden.
              </p>
            </div>

            <AuthForm onSignedIn={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}

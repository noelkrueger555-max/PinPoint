"use client";

/**
 * AuthForm — shared login / register / magic-link / google block.
 * Used by AuthGate (full page) and AuthMenu (modal).
 */

import { useState } from "react";
import { Loader2, Lock, Mail, KeyRound, UserPlus, LogIn } from "lucide-react";
import {
  signInWithGoogle,
  signInWithMagicLink,
  signInWithPassword,
  signUpWithPassword,
  sendPasswordReset,
} from "@/lib/supabase";

type Mode = "login" | "register" | "magic";

export interface AuthFormProps {
  /** Called once a session is active (password login or signup w/o confirm). */
  onSignedIn?: () => void;
  /** Called after a magic-link / signup-confirm email was dispatched. */
  onMailSent?: () => void;
  /** Initial tab. */
  initialMode?: Mode;
  compact?: boolean;
}

export default function AuthForm({
  onSignedIn,
  onMailSent,
  initialMode = "login",
  compact = false,
}: AuthFormProps) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const tab = (m: Mode, label: string, Icon: typeof LogIn) => (
    <button
      type="button"
      onClick={() => {
        setMode(m);
        setError(null);
        setInfo(null);
      }}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-mono uppercase tracking-wider transition-colors ${
        mode === m
          ? "bg-ink text-paper"
          : "bg-paper text-ink-soft hover:text-pin"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );

  return (
    <div className="text-left">
      <button
        type="button"
        onClick={async () => {
          setError(null);
          setSubmitting(true);
          try {
            await signInWithGoogle();
          } catch (e) {
            setError(
              e instanceof Error
                ? e.message
                : "Anmeldung fehlgeschlagen"
            );
            setSubmitting(false);
          }
        }}
        disabled={submitting}
        className="w-full flex items-center justify-center gap-3 border-2 border-ink bg-paper hover:bg-paper-warm py-3 px-4 font-display font-bold transition-colors disabled:opacity-60"
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
          <path fill="#FFC107" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11.1 0 20-8.9 20-20 0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5h-1.9V20H24v8h11.3c-.8 2.2-2.1 4.1-3.9 5.6l6.2 5.2C40.9 35.3 44 30 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        Mit Google fortfahren
      </button>

      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 border-t border-dashed border-ink-mute/50" />
        <span className="text-[10px] uppercase tracking-wider text-ink-mute font-mono">
          oder mit E-Mail
        </span>
        <div className="flex-1 border-t border-dashed border-ink-mute/50" />
      </div>

      <div className="flex border-2 border-ink mb-4">
        {tab("login", "Anmelden", LogIn)}
        {tab("register", "Registrieren", UserPlus)}
        {tab("magic", "Magic-Link", Mail)}
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!email.trim()) return;
          setError(null);
          setInfo(null);
          setSubmitting(true);
          try {
            if (mode === "magic") {
              await signInWithMagicLink(email.trim());
              setInfo("Magic-Link gesendet — Posteingang prüfen.");
              onMailSent?.();
            } else if (mode === "register") {
              if (password.length < 8) {
                throw new Error("Passwort braucht mindestens 8 Zeichen.");
              }
              const { needsConfirmation } = await signUpWithPassword(
                email.trim(),
                password,
                displayName.trim() || undefined
              );
              if (needsConfirmation) {
                setInfo(
                  "Bestätigungs-Mail gesendet — bitte Postfach prüfen."
                );
                onMailSent?.();
              } else {
                onSignedIn?.();
              }
            } else {
              await signInWithPassword(email.trim(), password);
              onSignedIn?.();
            }
          } catch (err) {
            setError(
              err instanceof Error ? err.message : "Aktion fehlgeschlagen"
            );
          } finally {
            setSubmitting(false);
          }
        }}
        className="space-y-3"
      >
        {mode === "register" && (
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider font-mono text-ink-mute">
              Anzeigename
            </span>
            <div className="paper-input flex items-center gap-2 mt-1">
              <input
                type="text"
                placeholder="z. B. Lara"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="flex-1 bg-transparent outline-none border-0 p-0 font-sans text-ink"
              />
            </div>
          </label>
        )}

        <label className="block">
          <span className="text-[11px] uppercase tracking-wider font-mono text-ink-mute">
            E-Mail
          </span>
          <div className="paper-input flex items-center gap-2 mt-1">
            <Mail className="w-4 h-4 text-ink-mute" />
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="du@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 bg-transparent outline-none border-0 p-0 font-sans text-ink"
            />
          </div>
        </label>

        {mode !== "magic" && (
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider font-mono text-ink-mute">
              Passwort
            </span>
            <div className="paper-input flex items-center gap-2 mt-1">
              <KeyRound className="w-4 h-4 text-ink-mute" />
              <input
                type="password"
                required
                minLength={8}
                autoComplete={
                  mode === "register" ? "new-password" : "current-password"
                }
                placeholder={
                  mode === "register" ? "mind. 8 Zeichen" : "dein Passwort"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 bg-transparent outline-none border-0 p-0 font-sans text-ink"
              />
            </div>
          </label>
        )}

        <button
          type="submit"
          disabled={submitting || !email.trim()}
          className="btn-primary w-full justify-center disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : mode === "register" ? (
            "Account erstellen"
          ) : mode === "magic" ? (
            "Magic-Link senden"
          ) : (
            "Anmelden"
          )}
        </button>

        {mode === "login" && (
          <button
            type="button"
            onClick={async () => {
              if (!email.trim()) {
                setError("Bitte zuerst E-Mail eingeben.");
                return;
              }
              setError(null);
              setSubmitting(true);
              try {
                await sendPasswordReset(email.trim());
                setInfo("Passwort-Reset-Mail gesendet.");
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : "Reset fehlgeschlagen"
                );
              } finally {
                setSubmitting(false);
              }
            }}
            className="text-xs text-ink-soft hover:text-pin underline-offset-2 hover:underline w-full text-center"
          >
            Passwort vergessen?
          </button>
        )}
      </form>

      {error && (
        <div className="mt-4 text-sm text-pin font-medium border border-pin/40 px-3 py-2 paper-card-soft">
          {error}
        </div>
      )}
      {info && !error && (
        <div className="mt-4 text-sm text-ink border border-ink/30 px-3 py-2 paper-card-soft">
          {info}
        </div>
      )}

      {!compact && (
        <div className="mt-5 text-[11px] uppercase tracking-wider font-mono text-ink-mute flex items-center justify-center gap-2">
          <Lock className="w-3 h-3" /> Verschlüsselt · DSGVO · EU-Hosting
        </div>
      )}
    </div>
  );
}

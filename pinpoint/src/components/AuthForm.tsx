"use client";

/**
 * AuthForm — shared login / register / magic-link / google block.
 * Mobile-first: large touch targets, password reveal, strength meter,
 * full success state after magic-link / signup-confirm.
 */

import { useState } from "react";
import {
  Loader2,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowLeft,
} from "lucide-react";
import {
  signInWithGoogle,
  signInWithMagicLink,
  signInWithPassword,
  signUpWithPassword,
  sendPasswordReset,
} from "@/lib/supabase";

type Mode = "login" | "register";

export interface AuthFormProps {
  /** Called once a session is active (password login or signup w/o confirm). */
  onSignedIn?: () => void;
  /** Called after a magic-link / signup-confirm email was dispatched. */
  onMailSent?: () => void;
  /** Initial tab. */
  initialMode?: Mode;
  compact?: boolean;
}

/** Cheap password strength heuristic — score 0…4. */
function passwordScore(pw: string): number {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 4);
}

function pwLabel(score: number): string {
  return ["zu kurz", "schwach", "ok", "stark", "sehr stark"][score] ?? "";
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
  const [showPw, setShowPw] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** When set, the form shows a success screen ("mail sent") */
  const [mailSent, setMailSent] = useState<null | "magic" | "signup" | "reset">(
    null
  );

  const score = passwordScore(password);
  const passwordOk = mode === "register" ? score >= 2 : password.length > 0;
  const emailHost = email.includes("@") ? email.split("@")[1] : "";
  const mailDeepLink =
    emailHost && /^(gmail|googlemail)/i.test(emailHost)
      ? "https://mail.google.com"
      : emailHost && /^(outlook|hotmail|live|msn)/i.test(emailHost)
        ? "https://outlook.live.com"
        : null;

  /* ── Success screen after mail dispatch ─────────────── */
  if (mailSent) {
    const headlines = {
      magic: "Magic-Link unterwegs!",
      signup: "Account fast fertig!",
      reset: "Reset-Mail unterwegs!",
    };
    const subs = {
      magic:
        "Wir haben dir einen 1-Klick-Login-Link geschickt. Öffne ihn auf diesem Gerät, dann bist du drin.",
      signup:
        "Bitte bestätige die E-Mail in deinem Postfach — danach geht's direkt los.",
      reset: "Klick den Link im Postfach, dann setzt du ein neues Passwort.",
    };
    return (
      <div className="text-center py-3">
        <div
          className="w-16 h-16 mx-auto mb-4 rounded-full border-2 flex items-center justify-center"
          style={{
            borderColor: "var(--stamp-green)",
            background: "rgba(45,95,63,0.08)",
          }}
        >
          <Mail className="w-7 h-7" style={{ color: "var(--stamp-green)" }} />
        </div>
        <h3 className="font-display font-bold text-2xl tracking-tight mb-2">
          {headlines[mailSent]}
        </h3>
        <p className="text-ink-soft text-base max-w-[340px] mx-auto mb-2">
          {subs[mailSent]}
        </p>
        <div className="font-mono text-xs text-ink-mute mt-3 mb-5">
          Gesendet an <strong className="text-ink">{email}</strong>
        </div>
        {mailDeepLink && (
          <a
            href={mailDeepLink}
            target="_blank"
            rel="noreferrer noopener"
            className="btn-primary w-full justify-center mb-3"
          >
            Postfach öffnen
          </a>
        )}
        <button
          type="button"
          onClick={() => {
            setMailSent(null);
            setError(null);
          }}
          className="text-sm text-ink-soft hover:text-pin inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Andere E-Mail benutzen
        </button>
      </div>
    );
  }

  return (
    <div className="text-left">
      {/* Google */}
      <button
        type="button"
        onClick={async () => {
          setError(null);
          setSubmitting(true);
          try {
            await signInWithGoogle();
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Anmeldung fehlgeschlagen"
            );
            setSubmitting(false);
          }
        }}
        disabled={submitting}
        className="w-full flex items-center justify-center gap-3 border-2 border-ink bg-paper hover:bg-paper-warm py-3.5 px-4 rounded-xl font-display font-bold text-base transition-colors disabled:opacity-60 min-h-[52px]"
      >
        <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
          <path fill="#FFC107" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11.1 0 20-8.9 20-20 0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5h-1.9V20H24v8h11.3c-.8 2.2-2.1 4.1-3.9 5.6l6.2 5.2C40.9 35.3 44 30 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        Mit Google fortfahren
      </button>

      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 border-t border-dashed border-ink-mute/40" />
        <span className="text-[10px] uppercase tracking-wider text-ink-mute font-mono">
          oder mit E-Mail
        </span>
        <div className="flex-1 border-t border-dashed border-ink-mute/40" />
      </div>

      {/* 2-tab segmented control (login | register) */}
      <div className="auth-tabs mb-5">
        <button
          type="button"
          data-active={mode === "login"}
          onClick={() => {
            setMode("login");
            setError(null);
          }}
        >
          Anmelden
        </button>
        <button
          type="button"
          data-active={mode === "register"}
          onClick={() => {
            setMode("register");
            setError(null);
          }}
        >
          Registrieren
        </button>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!email.trim()) return;
          setError(null);
          setSubmitting(true);
          try {
            if (mode === "register") {
              if (password.length < 8) {
                throw new Error("Passwort braucht mindestens 8 Zeichen.");
              }
              const { needsConfirmation } = await signUpWithPassword(
                email.trim(),
                password,
                displayName.trim() || undefined
              );
              if (needsConfirmation) {
                setMailSent("signup");
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
        className="space-y-4"
      >
        {mode === "register" && (
          <div>
            <label htmlFor="auth-name" className="input-label">
              Anzeigename
            </label>
            <div className="input-big">
              <input
                id="auth-name"
                type="text"
                placeholder="z. B. Lara"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="name"
                maxLength={40}
              />
            </div>
          </div>
        )}

        <div>
          <label htmlFor="auth-email" className="input-label">
            E-Mail
          </label>
          <div className="input-big">
            <Mail className="input-icon" />
            <input
              id="auth-email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              placeholder="du@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="auth-pw"
            className="input-label flex items-center justify-between"
          >
            <span>Passwort</span>
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
                    setMailSent("reset");
                  } catch (err) {
                    setError(
                      err instanceof Error ? err.message : "Reset fehlgeschlagen"
                    );
                  } finally {
                    setSubmitting(false);
                  }
                }}
                className="text-[11px] uppercase tracking-wider text-ink-soft hover:text-pin normal-case"
              >
                vergessen?
              </button>
            )}
          </label>
          <div className="input-big">
            <KeyRound className="input-icon" />
            <input
              id="auth-pw"
              type={showPw ? "text" : "password"}
              required
              minLength={8}
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              placeholder={mode === "register" ? "mind. 8 Zeichen" : "dein Passwort"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="input-action"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? "Passwort verbergen" : "Passwort anzeigen"}
              tabIndex={-1}
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {mode === "register" && password.length > 0 && (
            <>
              <div className="pwd-meter" data-score={score}>
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className="text-[11px] font-mono text-ink-mute mt-1.5 uppercase tracking-wider">
                Stärke: {pwLabel(score)}
              </div>
            </>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting || !email.trim() || !passwordOk}
          className="btn-primary w-full justify-center min-h-[52px] text-base disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : mode === "register" ? (
            "Account erstellen"
          ) : (
            "Anmelden"
          )}
        </button>

        {/* Magic-Link as secondary action */}
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
              await signInWithMagicLink(email.trim());
              setMailSent("magic");
              onMailSent?.();
            } catch (err) {
              setError(
                err instanceof Error ? err.message : "Magic-Link fehlgeschlagen"
              );
            } finally {
              setSubmitting(false);
            }
          }}
          disabled={submitting || !email.trim()}
          className="w-full inline-flex items-center justify-center gap-2 text-sm font-medium text-ink-soft hover:text-pin underline-offset-4 hover:underline disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          Lieber Magic-Link statt Passwort
        </button>
      </form>

      {error && (
        <div className="alert-card alert-error mt-4">
          <AlertCircle className="w-4 h-4" />
          <div>{error}</div>
        </div>
      )}

      {!compact && (
        <>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            {[
              { Icon: Lock, t: "Verschlüsselt" },
              { Icon: CheckCircle2, t: "DSGVO-konform" },
              { Icon: Mail, t: "EU-Hosting" },
            ].map((b) => (
              <div
                key={b.t}
                className="flex flex-col items-center gap-1 text-[10px] uppercase tracking-wider font-mono text-ink-mute py-2"
              >
                <b.Icon className="w-3.5 h-3.5" />
                {b.t}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

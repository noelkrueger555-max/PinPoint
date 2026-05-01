"use client";

/**
 * GuestGate — variant of AuthGate for invite-code routes (lobby, duel,
 * album-join). If the user has no account, offers two paths:
 *   1) Full sign-in (renders the standard AuthForm)
 *   2) "Als Gast spielen" — anonymous Supabase auth, only requires a
 *      display-name. Guest users can still play, see scores and chat;
 *      they can later upgrade to a full account by linking an email.
 *
 * Renders children once any auth (real or guest) succeeds.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, UserCircle, Mail } from "lucide-react";
import {
  isCloudEnabled,
  getCurrentUser,
  onAuthChange,
  signInAsGuest,
} from "@/lib/supabase";
import AuthForm from "./AuthForm";
import { toast } from "@/lib/toast";

export default function GuestGate({
  children,
  inviteLabel,
}: {
  children: React.ReactNode;
  /** Short label shown in the header, e.g. "Lobby ABC123" */
  inviteLabel?: string;
}) {
  const cloud = isCloudEnabled();
  const [checked, setChecked] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [mode, setMode] = useState<"choose" | "guest" | "account">("choose");
  const [guestName, setGuestName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!cloud) {
      setChecked(true);
      return;
    }
    let cancelled = false;
    getCurrentUser()
      .then((u) => !cancelled && setSignedIn(!!u))
      .finally(() => !cancelled && setChecked(true));
    const unsub = onAuthChange((s) => !cancelled && setSignedIn(s));
    return () => {
      cancelled = true;
      unsub();
    };
  }, [cloud]);

  if (!cloud) return <>{children}</>;
  if (!checked) {
    return (
      <div className="max-w-[1280px] mx-auto px-6 md:px-8 pt-32 pb-24 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-ink-mute" />
      </div>
    );
  }
  if (signedIn) return <>{children}</>;

  const playAsGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = guestName.trim();
    if (name.length < 2) {
      toast.error("Bitte einen Namen mit mindestens 2 Zeichen eingeben.");
      return;
    }
    setBusy(true);
    try {
      await signInAsGuest(name);
      toast.success(`Willkommen, ${name}!`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Anmeldung fehlgeschlagen";
      // Common cause: anonymous auth disabled in Supabase Auth settings.
      if (msg.toLowerCase().includes("anonymous")) {
        toast.error("Gast-Modus ist im Projekt deaktiviert. Bitte einen Account anlegen.");
      } else {
        toast.error(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="max-w-[680px] mx-auto px-4 md:px-8 pt-6 md:pt-12 pb-20 relative z-[2]">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-pin mb-5"
      >
        <ArrowLeft className="w-4 h-4" /> Zur Startseite
      </Link>

      {inviteLabel && (
        <div className="dashed-pill mb-3 inline-block">📨 Einladung · {inviteLabel}</div>
      )}
      <h1 className="font-display-wonk font-black text-[clamp(32px,5vw,52px)] leading-[0.95] tracking-[-0.03em] mb-3">
        Wie willst du <em className="accent-italic">spielen</em>?
      </h1>
      <p className="text-ink-soft text-base mb-7">
        Du kannst sofort als Gast loslegen oder einen Account erstellen, um
        Fortschritt zu speichern.
      </p>

      {mode === "choose" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setMode("guest")}
            className="paper-card p-6 text-left hover:translate-y-[-2px] transition"
            style={{ transform: "rotate(-0.5deg)" }}
          >
            <UserCircle className="w-8 h-8 mb-3" style={{ color: "var(--postal-blue)" }} />
            <div className="font-display text-2xl font-bold">Als Gast spielen</div>
            <p className="text-sm text-ink-soft mt-2">
              Einfach Namen wählen und mitspielen. Kein Passwort, keine Mail.
            </p>
            <span className="tag-pin mt-3 inline-block">Schnellster Weg</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("account")}
            className="paper-card p-6 text-left hover:translate-y-[-2px] transition"
            style={{ transform: "rotate(0.5deg)" }}
          >
            <Mail className="w-8 h-8 mb-3" style={{ color: "var(--pin)" }} />
            <div className="font-display text-2xl font-bold">Account erstellen</div>
            <p className="text-sm text-ink-soft mt-2">
              Fortschritt, Achievements, eigene Alben hochladen.
            </p>
            <span className="tag-pin mt-3 inline-block">Empfohlen</span>
          </button>
        </div>
      )}

      {mode === "guest" && (
        <form onSubmit={playAsGuest} className="paper-card p-6 flex flex-col gap-4">
          <div>
            <div className="dashed-pill mb-2 inline-block">👻 Gast-Modus</div>
            <div className="font-display text-2xl font-bold">Wähle deinen Anzeigenamen</div>
            <p className="text-sm text-ink-soft mt-1">
              So wird dein Name den anderen in der Lobby gezeigt. Du kannst
              ihn später jederzeit ändern oder zu einem echten Account
              wechseln.
            </p>
          </div>
          <input
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="z. B. PinPilot"
            maxLength={32}
            autoFocus
            className="paper-input"
          />
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => setMode("choose")}
              className="btn-ghost"
            >
              Zurück
            </button>
            <button type="submit" disabled={busy || guestName.trim().length < 2} className="btn-primary">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Loslegen
            </button>
          </div>
        </form>
      )}

      {mode === "account" && (
        <div className="paper-card p-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setMode("choose")}
            className="btn-ghost self-start text-xs inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Zurück
          </button>
          <AuthForm />
        </div>
      )}
    </main>
  );
}

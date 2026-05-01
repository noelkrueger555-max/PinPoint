"use client";

/**
 * /account — full account & profile management.
 * Sections: Profile, Account (email/password), Cloud-Sync, Sign-out, Danger.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  User as UserIcon,
  Save,
  Check,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  LogOut,
  AlertTriangle,
  CloudUpload,
  Trash2,
  AlertCircle,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import AuthGate from "@/components/AuthGate";
import {
  getCurrentUser,
  signOut,
  updateUserPassword,
  updateUserEmail,
  isCloudEnabled,
  getSupabase,
} from "@/lib/supabase";
import {
  getMyProfile,
  updateProfile,
  type ProfileLite,
} from "@/lib/friends";
import { useRouter } from "next/navigation";

export default function AccountPage() {
  return (
    <AuthGate
      reason={
        <>
          Konto-Verwaltung – <em className="accent-italic">erst anmelden</em>.
        </>
      }
    >
      <PageHeader />
      <AccountInner />
    </AuthGate>
  );
}

function AccountInner() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileLite | null>(null);
  const [email, setEmail] = useState<string>("");
  const [createdAt, setCreatedAt] = useState<string>("");

  // Profile editor state
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<null | { ok: boolean; text: string }>(null);
  const [profileDirty, setProfileDirty] = useState(false);

  // Email change
  const [newEmail, setNewEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailMsg, setEmailMsg] = useState<null | { ok: boolean; text: string }>(null);

  // Password change
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<null | { ok: boolean; text: string }>(null);

  // Danger
  const [confirmDelete, setConfirmDelete] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState<null | { ok: boolean; text: string }>(null);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [u, p] = await Promise.all([getCurrentUser(), getMyProfile()]);
      if (cancelled) return;
      setProfile(p);
      setEmail(u?.email ?? "");
      setCreatedAt(u?.created_at ?? "");
      setDisplayName(p?.display_name ?? "");
      setUsername(p?.username ?? "");
      setAvatarUrl(p?.avatar_url ?? "");
      // Pull bio (not in ProfileLite)
      const sb = getSupabase();
      if (sb && u?.id) {
        const { data: row } = await sb
          .from("profiles")
          .select("bio")
          .eq("id", u.id)
          .maybeSingle();
        if (!cancelled && row && typeof (row as { bio?: string }).bio === "string") {
          setBio((row as { bio: string }).bio);
          setOriginalBio((row as { bio: string }).bio);
        }
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Track if profile fields differ from server state
  const [originalBio, setOriginalBio] = useState("");
  useEffect(() => {
    if (!profile) return;
    const dirty =
      displayName !== (profile.display_name ?? "") ||
      username !== (profile.username ?? "") ||
      avatarUrl !== (profile.avatar_url ?? "") ||
      bio !== originalBio;
    setProfileDirty(dirty);
  }, [displayName, username, avatarUrl, bio, profile, originalBio]);

  async function saveProfile() {
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      await updateProfile({
        display_name: displayName,
        username,
        bio,
        avatar_url: avatarUrl.trim() || undefined,
      });
      const fresh = await getMyProfile();
      setProfile(fresh);
      setOriginalBio(bio);
      setProfileMsg({ ok: true, text: "Profil gespeichert." });
      setProfileDirty(false);
      setTimeout(() => setProfileMsg(null), 3000);
    } catch (e) {
      setProfileMsg({
        ok: false,
        text: e instanceof Error ? e.message : "Speichern fehlgeschlagen.",
      });
    } finally {
      setSavingProfile(false);
    }
  }

  async function changeEmail() {
    if (!newEmail.trim()) return;
    setSavingEmail(true);
    setEmailMsg(null);
    try {
      await updateUserEmail(newEmail.trim());
      setEmailMsg({
        ok: true,
        text:
          "Bestätigungs-Mail an die neue Adresse gesendet. Klick den Link, um den Wechsel abzuschließen.",
      });
      setNewEmail("");
    } catch (e) {
      setEmailMsg({
        ok: false,
        text: e instanceof Error ? e.message : "E-Mail-Wechsel fehlgeschlagen.",
      });
    } finally {
      setSavingEmail(false);
    }
  }

  async function changePassword() {
    setPwMsg(null);
    if (newPw.length < 8) {
      setPwMsg({ ok: false, text: "Mindestens 8 Zeichen." });
      return;
    }
    if (newPw !== newPw2) {
      setPwMsg({ ok: false, text: "Passwörter stimmen nicht überein." });
      return;
    }
    setSavingPw(true);
    try {
      await updateUserPassword(newPw);
      setPwMsg({ ok: true, text: "Passwort aktualisiert." });
      setNewPw("");
      setNewPw2("");
      setTimeout(() => setPwMsg(null), 3000);
    } catch (e) {
      setPwMsg({
        ok: false,
        text: e instanceof Error ? e.message : "Passwort-Wechsel fehlgeschlagen.",
      });
    } finally {
      setSavingPw(false);
    }
  }

  async function handleDelete() {
    setDeleteMsg(null);
    if (confirmDelete.trim().toUpperCase() !== "LÖSCHEN") {
      setDeleteMsg({
        ok: false,
        text: 'Bitte tippe „LÖSCHEN“ zur Bestätigung.',
      });
      return;
    }
    setDeleting(true);
    try {
      const sb = getSupabase();
      // Try server-side RPC if available; otherwise mark for deletion + sign out.
      if (sb) {
        const { error } = await sb.rpc("delete_account");
        if (error && !/(could not|does not exist|function)/i.test(error.message ?? "")) {
          throw error;
        }
      }
      await signOut();
      router.push("/");
    } catch (e) {
      setDeleteMsg({
        ok: false,
        text:
          e instanceof Error
            ? `Konnte Konto nicht löschen: ${e.message}. Bitte support@…`
            : "Löschen fehlgeschlagen.",
      });
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <main className="max-w-[920px] mx-auto px-5 md:px-8 pt-12 pb-32 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-ink-mute" />
      </main>
    );
  }

  const initial = (displayName || email || "?").slice(0, 1).toUpperCase();
  const memberSince = createdAt
    ? new Date(createdAt).toLocaleDateString("de-DE", {
        year: "numeric",
        month: "long",
      })
    : "";

  return (
    <main className="max-w-[920px] mx-auto px-5 md:px-8 pt-6 md:pt-10 pb-32 relative z-[2]">
      <div className="dashed-pill mb-3">⚙ Konto &amp; Profil</div>
      <h1 className="font-display-wonk font-black text-[clamp(36px,5.5vw,64px)] leading-[0.95] tracking-[-0.035em]">
        Dein <em className="accent-italic">Konto</em>.
      </h1>
      <p className="text-ink-soft mt-3 text-base md:text-lg max-w-[560px]">
        Profil, Anmeldedaten und alles, was zu deinem PinPoint-Account gehört.
      </p>

      {/* Identity strip */}
      <div className="account-section mt-8 flex items-center gap-4 md:gap-5">
        <span className="avatar-bubble" style={{ width: 64, height: 64, fontSize: 26 }}>
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" />
          ) : (
            initial
          )}
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-display text-xl md:text-2xl font-bold tracking-tight truncate">
            {displayName || email.split("@")[0]}
          </div>
          {profile?.username && (
            <div className="font-mono text-xs text-pin">@{profile.username}</div>
          )}
          <div className="font-mono text-xs text-ink-mute mt-0.5 truncate">
            {email}
          </div>
          {memberSince && (
            <div className="font-mono text-[11px] text-ink-mute mt-0.5">
              Mitglied seit {memberSince}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6 mt-6">
        {/* PROFILE */}
        <section className="account-section lg:col-span-2" id="profile">
          <h2 className="flex items-center gap-2">
            <UserIcon className="w-5 h-5" /> Profil
          </h2>
          <p className="as-sub">
            Wie dich Freunde finden und sehen. <strong>Username</strong> ist eindeutig — ohne
            ihn findet dich niemand in der Suche.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="input-label" htmlFor="acc-name">Anzeigename</label>
              <div className="input-big">
                <input
                  id="acc-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={40}
                  placeholder="z. B. Noel"
                />
              </div>
            </div>
            <div>
              <label className="input-label" htmlFor="acc-username">Username</label>
              <div className="input-big">
                <span className="font-mono text-ink-mute">@</span>
                <input
                  id="acc-username"
                  type="text"
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                  }
                  maxLength={24}
                  placeholder="dein_handle"
                  className="font-mono"
                />
              </div>
              <span className="text-[11px] font-mono text-ink-mute mt-1.5 block">
                a–z, 0–9, _. Mind. 3 Zeichen.
              </span>
            </div>
            <div className="md:col-span-2">
              <label className="input-label" htmlFor="acc-bio">Bio</label>
              <div className="input-big" style={{ alignItems: "flex-start" }}>
                <textarea
                  id="acc-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 280))}
                  maxLength={280}
                  rows={3}
                  placeholder="Kurze Beschreibung (optional, max. 280 Zeichen)"
                  className="resize-none"
                />
              </div>
              <span className="text-[11px] font-mono text-ink-mute mt-1.5 block">
                {bio.length} / 280
              </span>
            </div>
            <div className="md:col-span-2">
              <label className="input-label" htmlFor="acc-avatar">Avatar-URL</label>
              <div className="input-big">
                <input
                  id="acc-avatar"
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://…"
                  className="font-mono text-[13px]"
                />
              </div>
              <span className="text-[11px] font-mono text-ink-mute mt-1.5 block">
                Quadratisches Bild empfohlen. Kommt z. B. von Google-Login automatisch.
              </span>
            </div>
          </div>

          {profileMsg && (
            <div className={`alert-card mt-4 ${profileMsg.ok ? "alert-success" : "alert-error"}`}>
              {profileMsg.ok ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <div>{profileMsg.text}</div>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-3 items-center">
            <button
              onClick={saveProfile}
              disabled={savingProfile || !displayName.trim() || !profileDirty}
              className="btn-primary disabled:opacity-50"
            >
              {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Profil speichern
            </button>
            {profileDirty && !savingProfile && (
              <span className="text-xs font-mono text-ink-mute uppercase tracking-wider">
                ungespeicherte Änderungen
              </span>
            )}
          </div>
        </section>

        {/* EMAIL */}
        <section className="account-section" id="email">
          <h2 className="flex items-center gap-2">
            <Mail className="w-5 h-5" /> E-Mail
          </h2>
          <p className="as-sub">Aktuelle Adresse: <strong className="font-mono">{email}</strong></p>

          <label className="input-label" htmlFor="acc-newemail">Neue E-Mail</label>
          <div className="input-big">
            <Mail className="input-icon" />
            <input
              id="acc-newemail"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="neue@example.com"
            />
          </div>
          <p className="text-[11px] font-mono text-ink-mute mt-1.5">
            Du bekommst einen Bestätigungslink an die neue Adresse.
          </p>

          {emailMsg && (
            <div className={`alert-card mt-4 ${emailMsg.ok ? "alert-info" : "alert-error"}`}>
              {emailMsg.ok ? <Mail className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <div>{emailMsg.text}</div>
            </div>
          )}

          <button
            onClick={changeEmail}
            disabled={savingEmail || !newEmail.trim() || newEmail.trim() === email}
            className="btn-primary mt-4 disabled:opacity-50"
          >
            {savingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            E-Mail ändern
          </button>
        </section>

        {/* PASSWORD */}
        <section className="account-section" id="password">
          <h2 className="flex items-center gap-2">
            <KeyRound className="w-5 h-5" /> Passwort
          </h2>
          <p className="as-sub">Mindestens 8 Zeichen. Nutzt du Google-Login? Dann brauchst du keins.</p>

          <label className="input-label" htmlFor="acc-pw1">Neues Passwort</label>
          <div className="input-big">
            <KeyRound className="input-icon" />
            <input
              id="acc-pw1"
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="mind. 8 Zeichen"
            />
            <button
              type="button"
              className="input-action"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? "Verbergen" : "Anzeigen"}
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <label className="input-label mt-4" htmlFor="acc-pw2">Bestätigen</label>
          <div className="input-big">
            <KeyRound className="input-icon" />
            <input
              id="acc-pw2"
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              value={newPw2}
              onChange={(e) => setNewPw2(e.target.value)}
              placeholder="nochmal eingeben"
            />
          </div>

          {pwMsg && (
            <div className={`alert-card mt-4 ${pwMsg.ok ? "alert-success" : "alert-error"}`}>
              {pwMsg.ok ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <div>{pwMsg.text}</div>
            </div>
          )}

          <button
            onClick={changePassword}
            disabled={savingPw || newPw.length < 8 || newPw !== newPw2}
            className="btn-primary mt-4 disabled:opacity-50"
          >
            {savingPw ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Passwort speichern
          </button>
        </section>

        {/* CLOUD / SETTINGS PLACEHOLDER */}
        <section className="account-section lg:col-span-2" id="settings">
          <h2 className="flex items-center gap-2">
            <CloudUpload className="w-5 h-5" /> Daten &amp; Sync
          </h2>
          <p className="as-sub">
            PinPoint synct automatisch zwischen deinen Geräten, sobald du eingeloggt bist.
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <li className="paper-card-soft p-3 flex items-center gap-2">
              <Check className="w-4 h-4 text-stamp-green" />
              {isCloudEnabled() ? "Cloud aktiv" : "Cloud aus"}
            </li>
            <li className="paper-card-soft p-3 flex items-center gap-2">
              <Check className="w-4 h-4 text-stamp-green" />
              Auto-Sync (Fotos · Lanes · Stats)
            </li>
            <li className="paper-card-soft p-3 flex items-center gap-2">
              <Check className="w-4 h-4 text-stamp-green" />
              EU-Hosting · DSGVO
            </li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <Link href="/library" className="btn-pill-light no-underline">
              Bibliothek
            </Link>
            <Link href="/stats" className="btn-pill-light no-underline">
              Statistiken
            </Link>
            <Link href="/friends" className="btn-pill-light no-underline">
              Freunde
            </Link>
          </div>
        </section>

        {/* SIGN OUT */}
        <section className="account-section">
          <h2 className="flex items-center gap-2">
            <LogOut className="w-5 h-5" /> Abmelden
          </h2>
          <p className="as-sub">Auf diesem Gerät ausloggen. Deine Daten bleiben in der Cloud.</p>
          <button
            onClick={async () => {
              await signOut();
              router.push("/");
            }}
            className="btn-ghost"
          >
            <LogOut className="w-4 h-4" />
            Jetzt abmelden
          </button>
        </section>

        {/* DANGER */}
        <section className="account-section danger-section">
          <h2 className="flex items-center gap-2 text-pin-deep">
            <AlertTriangle className="w-5 h-5" /> Konto löschen
          </h2>
          <p className="as-sub" style={{ color: "var(--ink-soft)" }}>
            Endgültig &amp; unumkehrbar. Fotos, Alben, Punkte, Freunde — alles weg.
          </p>
          <label className="input-label" htmlFor="acc-confirm">
            Tippe <strong className="text-pin">LÖSCHEN</strong> zum Bestätigen
          </label>
          <div className="input-big">
            <input
              id="acc-confirm"
              type="text"
              value={confirmDelete}
              onChange={(e) => setConfirmDelete(e.target.value)}
              placeholder="LÖSCHEN"
              className="font-mono"
            />
          </div>

          {deleteMsg && (
            <div className={`alert-card mt-4 ${deleteMsg.ok ? "alert-success" : "alert-error"}`}>
              <AlertCircle className="w-4 h-4" />
              <div>{deleteMsg.text}</div>
            </div>
          )}

          <button
            onClick={handleDelete}
            disabled={deleting || confirmDelete.trim().toUpperCase() !== "LÖSCHEN"}
            className="mt-4 inline-flex items-center gap-2 px-5 py-3 rounded-full border-2 border-pin text-pin hover:bg-pin hover:text-paper transition-colors font-semibold disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-pin"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Konto endgültig löschen
          </button>
        </section>
      </div>
    </main>
  );
}

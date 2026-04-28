"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Download, Upload, Check, AlertTriangle, Loader2, Cloud, Copy, LogIn } from "lucide-react";
import { exportLobby, importLobby, type ImportResult } from "@/lib/share";
import { listLanes, listPhotos } from "@/lib/store";
import { isCloudEnabled, getCurrentUser, signInWithMagicLink, signInWithGoogle, signOut } from "@/lib/supabase";
import { syncAllToCloud } from "@/lib/cloud-sync";
import { createLobby } from "@/lib/lobby";
import PageHeader from "@/components/PageHeader";

export default function SharePage() {
  const [title, setTitle] = useState("");
  const [photoCount, setPhotoCount] = useState(0);
  const [laneCount, setLaneCount] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Cloud
  const cloud = isCloudEnabled();
  const [email, setEmail] = useState("");
  const [magicSent, setMagicSent] = useState(false);
  const [user, setUser] = useState<{ email?: string | null } | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [lobbyCode, setLobbyCode] = useState<string | null>(null);

  useEffect(() => {
    listPhotos().then((p) => setPhotoCount(p.length));
    listLanes().then((l) => setLaneCount(l.length));
    if (cloud) getCurrentUser().then((u) => setUser(u ?? null));
  }, [importResult, cloud]);

  const doExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const blob = await exportLobby(title || undefined);
      const safe = (title || "pinpoint-lobby")
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .slice(0, 40);
      const filename = `${safe}-${Date.now()}.pinpoint.json`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export fehlgeschlagen");
    } finally {
      setExporting(false);
    }
  };

  const doImport = async (file: File) => {
    setImporting(true);
    setError(null);
    setImportResult(null);
    try {
      const res = await importLobby(file);
      setImportResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import fehlgeschlagen");
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <PageHeader />
      <main className="max-w-[1100px] mx-auto px-6 md:px-8 pt-8 pb-20 relative z-[2]">
        <div className="dashed-pill mb-3">📮 Postkarte verschicken</div>
        <h1 className="font-display-wonk font-black text-[clamp(40px,6vw,72px)] leading-[0.95] tracking-[-0.04em]">
          Lobby <em className="accent-italic">teilen</em>
        </h1>
        <p className="text-ink-soft mt-3 text-lg max-w-[640px]">
          Exportiere deine Fotos und Lanes als{" "}
          <span className="font-mono text-xs px-1.5 py-0.5 border border-ink rounded bg-paper-warm">.pinpoint.json</span>{" "}
          und schick sie Freunden via WhatsApp, AirDrop oder Mail. Sie importieren
          die Datei und können sofort raten — komplett ohne Server.
        </p>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-7">
          <div className="paper-card p-7" style={{ transform: "rotate(-0.4deg)" }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-ink" style={{ background: "var(--mustard)" }}>
                <Download className="w-5 h-5 text-ink" />
              </div>
              <div>
                <span className="tag-pin">Export</span>
                <div className="font-display text-xl font-bold leading-none mt-0.5">Datei erstellen</div>
                <div className="text-xs font-mono text-ink-mute mt-1">{photoCount} Fotos · {laneCount} Lanes</div>
              </div>
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Lobby-Name (optional)"
              className="paper-input mb-4"
            />
            <button
              onClick={doExport}
              disabled={exporting || photoCount === 0}
              className="btn-primary w-full"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Datei herunterladen
            </button>
            <p className="mt-4 text-xs text-ink-mute font-mono uppercase tracking-wider">
              ⚠ Enthält Fotos in voller Größe · ~1–2 MB pro Foto
            </p>
          </div>

          <div className="paper-card p-7" style={{ transform: "rotate(0.4deg)" }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-ink" style={{ background: "var(--pin)" }}>
                <Upload className="w-5 h-5" style={{ color: "var(--paper)" }} />
              </div>
              <div>
                <span className="tag-pin">Import</span>
                <div className="font-display text-xl font-bold leading-none mt-0.5">Lobby laden</div>
                <div className="text-xs font-mono text-ink-mute mt-1">.pinpoint.json eines Freundes</div>
              </div>
            </div>
            <input
              ref={fileInput}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) doImport(f);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileInput.current?.click()}
              disabled={importing}
              className="btn-ghost w-full"
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Datei wählen
            </button>
            <p className="mt-4 text-xs text-ink-mute font-mono uppercase tracking-wider">
              ✦ Wird zu deiner Bibliothek hinzugefügt
            </p>
          </div>
        </div>

        {importResult && (
          <div className="mt-8 paper-card p-5 flex items-start gap-3" style={{ borderColor: "var(--stamp-green)", boxShadow: "6px 6px 0 var(--stamp-green)" }}>
            <Check className="w-5 h-5 mt-0.5" style={{ color: "var(--stamp-green)" }} />
            <div>
              <div className="font-display text-lg font-bold">
                Erfolgreich importiert{importResult.title ? ` · ${importResult.title}` : ""}
              </div>
              <div className="text-sm text-ink-soft mt-1">
                {importResult.photosAdded} Fotos und {importResult.lanesAdded} Lanes hinzugefügt.
              </div>
              <div className="mt-4 flex gap-3 flex-wrap">
                <Link href="/play" className="btn-primary">Jetzt spielen</Link>
                <Link href="/library" className="btn-ghost">Zur Bibliothek</Link>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-8 paper-card p-5 flex items-start gap-3" style={{ borderColor: "var(--pin)", boxShadow: "6px 6px 0 var(--pin)" }}>
            <AlertTriangle className="w-5 h-5 mt-0.5" style={{ color: "var(--pin)" }} />
            <div>
              <div className="font-display text-lg font-bold">Fehler</div>
              <div className="text-sm text-ink-soft mt-1">{error}</div>
            </div>
          </div>
        )}

        <div className="stitched-divider mt-16 mb-10" />

        <div className="section-eyebrow mb-2">☁ Cloud-Modus · optional</div>
        <h2 className="font-display text-3xl font-bold tracking-tight">Per Code teilen</h2>
        <p className="text-ink-soft mt-2 max-w-[640px]">
          Wenn ein Supabase-Projekt verbunden ist, kannst du eine Lobby auch
          per <span className="font-mono">6-stelligem Code</span> teilen — kein Datei-Upload nötig.
        </p>

        {!cloud ? (
          <div className="mt-6 paper-card-soft p-6 font-mono text-sm text-ink-soft">
            <div className="font-display font-bold text-base text-ink mb-1">Nicht konfiguriert</div>
            Setze <span className="bg-paper-warm px-1.5 py-0.5 rounded border border-ink">NEXT_PUBLIC_SUPABASE_URL</span> und{" "}
            <span className="bg-paper-warm px-1.5 py-0.5 rounded border border-ink">NEXT_PUBLIC_SUPABASE_ANON_KEY</span> in <span className="bg-paper-warm px-1.5 py-0.5 rounded border border-ink">.env.local</span>.
          </div>
        ) : !user ? (
          <div className="mt-6 paper-card p-7 max-w-md" style={{ transform: "rotate(-0.3deg)" }}>
            <span className="tag-pin">Anmelden</span>
            <div className="font-display text-xl font-bold leading-none mt-1 mb-4">Cloud-Login</div>
            {magicSent ? (
              <div className="font-mono text-sm text-ink-soft">
                ✦ Link verschickt an <span className="text-ink">{email}</span>. Check dein Postfach.
              </div>
            ) : (
              <>
                <button
                  onClick={async () => {
                    try { await signInWithGoogle(); }
                    catch (e) { setError(e instanceof Error ? e.message : "Google-Login fehlgeschlagen"); }
                  }}
                  className="btn-ghost w-full mb-4 flex items-center justify-center gap-2"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/>
                    <path fill="#FBBC05" d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.95l3.66-2.84Z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.07.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"/>
                  </svg>
                  Mit Google anmelden
                </button>
                <div className="flex items-center gap-3 my-4 text-xs font-mono uppercase tracking-wider text-ink-mute">
                  <div className="flex-1 border-t border-dashed border-ink-mute" />
                  oder Magic-Link
                  <div className="flex-1 border-t border-dashed border-ink-mute" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="dein@email.com"
                  className="paper-input mb-3"
                />
                <button
                  onClick={async () => {
                    try {
                      await signInWithMagicLink(email);
                      setMagicSent(true);
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Sign-in fehlgeschlagen");
                    }
                  }}
                  disabled={!email.includes("@")}
                  className="btn-primary w-full"
                >
                  <LogIn className="w-4 h-4" />
                  Link senden
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-7">
            <div className="paper-card p-7" style={{ transform: "rotate(-0.4deg)" }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-ink" style={{ background: "var(--postal-blue)", color: "var(--paper)" }}>
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <span className="tag-pin">Sync</span>
                  <div className="font-display text-xl font-bold leading-none mt-0.5">Bibliothek hochladen</div>
                  <div className="text-xs font-mono text-ink-mute mt-1">{user.email}</div>
                </div>
                <button
                  onClick={async () => { await signOut(); setUser(null); setLobbyCode(null); setSyncStatus(null); }}
                  className="ml-auto text-xs font-mono uppercase tracking-wider text-ink-mute hover:text-pin"
                  title="Abmelden"
                >
                  Logout
                </button>
              </div>
              <button
                onClick={async () => {
                  setSyncStatus("Starte…");
                  try {
                    await syncAllToCloud((m) => setSyncStatus(m));
                    setSyncStatus("Fertig ✓");
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Sync fehlgeschlagen");
                    setSyncStatus(null);
                  }
                }}
                className="btn-ghost w-full"
              >
                <Cloud className="w-4 h-4" />
                Alles synchronisieren
              </button>
              {syncStatus && (
                <div className="mt-3 font-mono text-xs uppercase tracking-wider text-ink-soft">{syncStatus}</div>
              )}
            </div>

            <div className="paper-card p-7" style={{ transform: "rotate(0.4deg)" }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-ink" style={{ background: "var(--stamp-green)", color: "var(--paper)" }}>
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <span className="tag-pin">Lobby-Code</span>
                  <div className="font-display text-xl font-bold leading-none mt-0.5">Code generieren</div>
                </div>
              </div>
              {lobbyCode ? (
                <div className="text-center">
                  <div className="font-display-wonk font-black text-5xl tracking-[0.2em] my-3" style={{ color: "var(--pin)" }}>
                    {lobbyCode}
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(lobbyCode)}
                    className="btn-ghost"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Kopieren
                  </button>
                </div>
              ) : (
                <button
                  onClick={async () => {
                    try {
                      const ps = await listPhotos();
                      const ls = await listLanes();
                      const lobby = await createLobby({
                        title: title || "Lobby",
                        photoIds: ps.map((p) => p.id),
                        laneIds: ls.map((l) => l.id),
                      });
                      setLobbyCode(lobby.code);
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Code-Erstellung fehlgeschlagen");
                    }
                  }}
                  className="btn-primary w-full"
                  disabled={photoCount === 0}
                >
                  Code erstellen
                </button>
              )}
              <p className="mt-4 text-xs text-ink-mute font-mono uppercase tracking-wider">
                ✦ Lade vorher Bibliothek hoch
              </p>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

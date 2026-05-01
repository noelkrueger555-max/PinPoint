"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, BookImage, Check, ArrowLeft } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import GuestGate from "@/components/GuestGate";
import {
  getAlbumByInviteCode,
  joinAlbumByCode,
  type Album,
} from "@/lib/albums";
import { toast } from "@/lib/toast";

function JoinInner() {
  const router = useRouter();
  const [code, setCode] = useState<string | null>(null);
  const [album, setAlbum] = useState<Album | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const c = new URLSearchParams(window.location.search).get("code");
    if (c) setCode(c.toUpperCase());
  }, []);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    (async () => {
      try {
        const a = await getAlbumByInviteCode(code);
        if (cancelled) return;
        if (!a) {
          setError("Album nicht gefunden – Code prüfen.");
          return;
        }
        setAlbum(a);
        // Already a member? Skip the join step.
        if (a.my_role) {
          router.replace(`/albums/${a.id}`);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Fehler");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, router]);

  const join = async () => {
    if (!code) return;
    setBusy(true);
    setError(null);
    try {
      const a = await joinAlbumByCode(code);
      toast.success(`Album "${a.title}" beigetreten`);
      router.replace(`/albums/${a.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setBusy(false);
    }
  };

  if (!code) {
    return (
      <div className="paper-card p-6 max-w-xl mx-auto">
        <Link href="/albums" className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-pin mb-4">
          <ArrowLeft className="w-4 h-4" /> Zu meinen Alben
        </Link>
        <div className="font-display text-xl font-bold">Kein Code in der URL</div>
        <p className="text-sm text-ink-soft mt-2">
          Frage die Person, die dich eingeladen hat, nach dem 8-stelligen
          Album-Code.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="paper-card p-6 max-w-xl mx-auto" style={{ borderColor: "var(--pin)" }}>
        <div className="font-display text-xl font-bold">Hoppla</div>
        <p className="text-sm text-ink-soft mt-2">{error}</p>
        <Link href="/albums" className="btn-ghost mt-4 inline-block">Zu meinen Alben</Link>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-ink-mute" />
      </div>
    );
  }

  return (
    <div className="paper-card p-6 md:p-8 max-w-xl mx-auto" style={{ transform: "rotate(-0.3deg)" }}>
      <div className="dashed-pill mb-3 inline-block">📨 Einladung</div>
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-ink shrink-0" style={{ background: "var(--mustard)" }}>
          <BookImage className="w-5 h-5 text-ink" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl md:text-3xl font-bold leading-tight">{album.title}</h1>
          {album.description && (
            <p className="text-sm text-ink-soft mt-1">{album.description}</p>
          )}
          <div className="text-[11px] font-mono uppercase tracking-wider text-ink-mute mt-2">
            {album.photo_count ?? 0} Foto{album.photo_count === 1 ? "" : "s"} · {album.member_count ?? 1} Mitglied{album.member_count === 1 ? "" : "er"}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={join}
        disabled={busy}
        className="btn-primary w-full mt-6 inline-flex items-center justify-center gap-2"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        Album beitreten
      </button>
      <Link href="/albums" className="btn-ghost w-full mt-2 inline-flex items-center justify-center gap-2">
        Abbrechen
      </Link>
    </div>
  );
}

export default function AlbumJoinPage() {
  return (
    <GuestGate inviteLabel="Album">
      <PageHeader />
      <main className="max-w-[1280px] mx-auto px-4 md:px-8 pt-6 pb-20 relative z-[2]">
        <Suspense fallback={null}>
          <JoinInner />
        </Suspense>
      </main>
    </GuestGate>
  );
}

"use client";

/**
 * Album picker — used by multiplayer creation flows (duel host, lobby
 * creator). Lists every album the current user has access to (owner,
 * editor or player) along with photo count, since multiplayer rounds
 * need at least N photos.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookImage, Loader2, Plus } from "lucide-react";
import { listMyAlbums, type Album } from "@/lib/albums";

interface Props {
  value: string | null;
  onChange: (albumId: string | null) => void;
  /** Hide albums with fewer than this many photos. Defaults to 1. */
  minPhotos?: number;
}

export default function AlbumPicker({ value, onChange, minPhotos = 1 }: Props) {
  const [albums, setAlbums] = useState<Album[] | null>(null);

  useEffect(() => {
    listMyAlbums().then(setAlbums).catch(() => setAlbums([]));
  }, []);

  if (albums === null) {
    return (
      <div className="flex items-center gap-2 text-ink-soft text-sm font-mono">
        <Loader2 className="w-4 h-4 animate-spin" />
        Lade Alben…
      </div>
    );
  }

  const playable = albums.filter((a) => (a.photo_count ?? 0) >= minPhotos);

  if (playable.length === 0) {
    return (
      <div className="paper-card-soft p-4 text-sm text-ink-soft flex flex-col gap-3">
        <div className="flex items-center gap-2 font-mono uppercase tracking-wider text-xs">
          <BookImage className="w-4 h-4" />
          Kein spielbares Album
        </div>
        <p>
          Du brauchst mindestens ein Album mit {minPhotos}+ Foto
          {minPhotos === 1 ? "" : "s"}, um zu spielen.
        </p>
        <Link href="/albums" className="btn-ghost self-start text-xs inline-flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> Album erstellen
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto">
      {playable.map((a) => {
        const active = value === a.id;
        return (
          <button
            type="button"
            key={a.id}
            onClick={() => onChange(active ? null : a.id)}
            className={`paper-card-soft p-3 text-left transition flex items-center justify-between gap-3 border-2 ${
              active ? "border-pin" : "border-transparent hover:border-ink/20"
            }`}
            aria-pressed={active}
          >
            <div className="min-w-0 flex-1">
              <div className="font-display font-bold text-base truncate">{a.title}</div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-ink-mute mt-0.5">
                {a.photo_count ?? 0} Foto{a.photo_count === 1 ? "" : "s"} ·{" "}
                {a.member_count ?? 1} Mitglied
                {a.member_count === 1 ? "" : "er"} · {a.my_role}
              </div>
            </div>
            {active && (
              <span className="tag-pin shrink-0">Gewählt</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

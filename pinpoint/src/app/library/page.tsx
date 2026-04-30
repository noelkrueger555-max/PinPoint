"use client";

import Link from "next/link";
import { Trash2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { deletePhoto, listPhotos } from "@/lib/store";
import { deletePhotoFromCloud } from "@/lib/cloud-sync";
import { toast } from "@/lib/toast";
import { DIFFICULTY_LABELS, type Photo } from "@/lib/types";
import PageHeader from "@/components/PageHeader";
import AuthGate from "@/components/AuthGate";

export default function LibraryPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});

  const refresh = async () => {
    const list = await listPhotos();
    setPhotos(list);
    const map: Record<string, string> = {};
    for (const p of list) map[p.id] = URL.createObjectURL(p.thumbBlob);
    setUrls((prev) => {
      Object.values(prev).forEach((u) => URL.revokeObjectURL(u));
      return map;
    });
  };

  useEffect(() => {
    refresh();
    return () => {
      Object.values(urls).forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remove = async (id: string) => {
    await deletePhoto(id);
    // Best-effort cloud delete — local always wins. Surface failures only.
    deletePhotoFromCloud(id)
      .then((r) => {
        if (!r.removed && r.reason && r.reason !== "cloud-disabled" && r.reason !== "not-signed-in") {
          toast.error(`Cloud-Löschen fehlgeschlagen: ${r.reason}`);
        }
      })
      .catch(() => {});
    refresh();
  };

  return (
    <AuthGate>
      <PageHeader
        rightSlot={
          <Link href="/upload" className="btn-pill-dark">
            <Upload className="w-4 h-4" />
            Hochladen
          </Link>
        }
      />
      <main className="max-w-[1280px] mx-auto px-6 md:px-8 pt-8 pb-20 relative z-[2]">
        <div className="dashed-pill mb-3">📚 Deine Sammlung</div>
        <div className="flex items-end justify-between flex-wrap gap-3">
          <h1 className="font-display-wonk font-black text-[clamp(40px,6vw,72px)] leading-[0.95] tracking-[-0.04em]">
            Bibliothek
          </h1>
          <span className="font-mono text-sm text-ink-soft uppercase tracking-wider">
            {photos.length} Foto{photos.length === 1 ? "" : "s"}
          </span>
        </div>

        {photos.length === 0 ? (
          <div className="paper-card-soft p-12 mt-10 text-center text-ink-soft">
            Noch keine Fotos. Lade welche hoch, um zu starten.
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {photos.map((p, i) => (
              <div
                key={p.id}
                className="polaroid"
                style={{ transform: `rotate(${(i % 5 - 2) * 0.6}deg)` }}
              >
                {urls[p.id] && (
                  <div
                    className="polaroid-img"
                    style={{ backgroundImage: `url(${urls[p.id]})` }}
                  />
                )}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-1">
                  <span className="tag-pin truncate">{DIFFICULTY_LABELS[p.difficulty]}</span>
                  <button
                    onClick={() => remove(p.id)}
                    className="text-ink-mute hover:text-pin transition-colors"
                    aria-label="Löschen"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="polaroid-date">
                  {p.lat.toFixed(1)}, {p.lng.toFixed(1)}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </AuthGate>
  );
}

"use client";

import { motion, AnimatePresence } from "framer-motion";
import imageCompression from "browser-image-compression";
import { Upload, MapPin, Image as ImageIcon, Loader2, Check, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { readExif } from "@/lib/exif";
import { estimateDifficulty } from "@/lib/difficulty";
import { stripMetadata } from "@/lib/image";
import { savePhoto, newId } from "@/lib/store";
import { uploadPhoto } from "@/lib/cloud-sync";
import { isCloudEnabled } from "@/lib/supabase";
import { toast } from "@/lib/toast";
import {
  DIFFICULTY_COLORS,
  DIFFICULTY_LABELS,
  type Difficulty,
  type Photo,
} from "@/lib/types";

const MapPicker = dynamic(() => import("./MapPicker"), { ssr: false });
import PlacesSearch from "./PlacesSearch";

interface PendingPhoto {
  id: string;
  file: File;
  previewUrl: string;
  blob: Blob;
  thumbBlob: Blob;
  lat?: number;
  lng?: number;
  takenAt?: number;
  difficulty: Difficulty;
  autoDifficulty?: Difficulty;
  caption: string;
  hints: string[];
  story: string;
  source: "exif" | "manual";
  saving?: boolean;
  saved?: boolean;
  exifMissing?: boolean;
  cloudError?: string;
}

export default function PhotoUpload({ onSaved }: { onSaved?: () => void }) {
  const [pending, setPending] = useState<PendingPhoto[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    for (const file of arr) {
      const id = newId();

      // 1) Read EXIF FIRST from the original file. image-compression strips
      //    metadata when re-encoding to JPEG, so the original is the only
      //    reliable source of GPS / DateTimeOriginal.
      const exif = await readExif(file);

      // 2) Compress for storage / upload.
      let compressed: Blob = file;
      try {
        compressed = await imageCompression(file, {
          maxSizeMB: 1.6,
          maxWidthOrHeight: 2048,
          useWebWorker: true,
          fileType: "image/jpeg",
          initialQuality: 0.85,
        });
      } catch {
        // fall back to raw file
      }
      // 2b) Hard-strip metadata via Canvas re-encode. Guarantees no GPS/XMP
      //     can leak when a user later switches the photo to public.
      try {
        compressed = await stripMetadata(compressed, 0.85);
      } catch {}
      let thumb: Blob = compressed;
      try {
        thumb = await imageCompression(compressed as File, {
          maxSizeMB: 0.15,
          maxWidthOrHeight: 480,
          useWebWorker: true,
          fileType: "image/jpeg",
          initialQuality: 0.7,
        });
      } catch {}

      let auto: Difficulty | undefined;
      try {
        auto = await estimateDifficulty(thumb);
      } catch {}

      const previewUrl = URL.createObjectURL(thumb);
      const hasGps = exif.lat != null && exif.lng != null;
      setPending((prev) => [
        ...prev,
        {
          id,
          file,
          previewUrl,
          blob: compressed,
          thumbBlob: thumb,
          lat: exif.lat,
          lng: exif.lng,
          takenAt: exif.takenAt,
          difficulty: auto ?? 3,
          autoDifficulty: auto,
          caption: "",
          hints: [],
          story: "",
          source: hasGps ? "exif" : "manual",
          exifMissing: !hasGps,
        },
      ]);
      if (!hasGps) {
        setActiveId(id);
      }
    }
  }, []);

  const onDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };

  const updatePending = (id: string, patch: Partial<PendingPhoto>) => {
    setPending((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const remove = (id: string) => {
    setPending((prev) => {
      const found = prev.find((p) => p.id === id);
      if (found) URL.revokeObjectURL(found.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
    if (activeId === id) setActiveId(null);
  };

  const save = async (p: PendingPhoto) => {
    if (p.lat == null || p.lng == null) {
      setActiveId(p.id);
      return;
    }
    updatePending(p.id, { saving: true });
    const cleanHints = p.hints.map((h) => h.trim()).filter(Boolean);
    const photo: Photo = {
      id: p.id,
      blob: p.blob,
      thumbBlob: p.thumbBlob,
      lat: p.lat,
      lng: p.lng,
      takenAt: p.takenAt,
      caption: p.caption.trim() || undefined,
      hints: cleanHints.length > 0 ? cleanHints : undefined,
      story: p.story.trim() || undefined,
      difficulty: p.difficulty,
      autoDifficulty: p.autoDifficulty,
      source: p.source,
      createdAt: Date.now(),
    };
    await savePhoto(photo);
    // Cloud-first: upload immediately so other devices see it. Local
    // IndexedDB stays as the offline cache for blobs we already have.
    if (isCloudEnabled()) {
      try {
        await uploadPhoto(photo, "private");
      } catch (err) {
        console.warn("[upload] cloud sync failed", err);
        const msg = (err as Error).message;
        toast.error(`Cloud-Sync fehlgeschlagen: ${msg}`);
        updatePending(p.id, {
          saving: false,
          saved: true,
          cloudError: msg,
        });
        onSaved?.();
        return;
      }
    }
    updatePending(p.id, { saving: false, saved: true });
    onSaved?.();
  };

  const saveAll = async () => {
    for (const p of pending) {
      if (!p.saved && p.lat != null && p.lng != null) await save(p);
    }
  };

  const active = pending.find((p) => p.id === activeId) ?? null;
  const allReady = pending.length > 0 && pending.every((p) => p.lat != null && p.lng != null);

  return (
    <div className="flex flex-col gap-6">
      <motion.label
        htmlFor="upload-input"
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className="paper-card-soft p-6 md:p-10 text-center cursor-pointer block transition-colors"
        style={{
          borderColor: dragOver ? "var(--pin)" : undefined,
          boxShadow: dragOver ? "6px 6px 0 var(--pin)" : undefined,
        }}
        whileHover={{ scale: 1.005 }}
      >
        <input
          id="upload-input"
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center gap-3 text-ink">
          <div className="w-14 h-14 rounded-full flex items-center justify-center border-2 border-ink" style={{ background: "var(--mustard)" }}>
            <Upload className="w-6 h-6 text-ink" />
          </div>
          <div className="font-display text-2xl font-bold tracking-tight">
            Fotos hierher ziehen <em className="accent-italic">oder klicken</em>
          </div>
          <div className="text-xs font-mono uppercase tracking-wider text-ink-mute">
            JPG · PNG · HEIC — lokal verarbeitet · EXIF wird ausgelesen
          </div>
        </div>
      </motion.label>

      {pending.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {pending.map((p) => (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="paper-card overflow-hidden flex flex-col"
                style={{ transform: `rotate(${((p.id.charCodeAt(0) % 5) - 2) * 0.4}deg)` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.previewUrl}
                  alt=""
                  className="w-full aspect-square object-cover"
                  style={{ filter: "saturate(0.92) contrast(0.96)" }}
                />
                <div className="p-3 flex flex-col gap-2 text-xs border-t-2 border-ink bg-paper-deep">
                  <div className="flex items-center justify-between">
                    <span className="tag-pin" style={{ color: DIFFICULTY_COLORS[p.difficulty] }}>
                      ◆ {DIFFICULTY_LABELS[p.difficulty]}
                    </span>
                    <button
                      onClick={() => remove(p.id)}
                      className="text-ink-mute hover:text-pin"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {p.lat != null && p.lng != null ? (
                    <div className="flex items-center gap-1 font-mono uppercase tracking-wider" style={{ color: "var(--stamp-green)" }}>
                      <MapPin className="w-3 h-3" />
                      {p.source === "exif" ? "EXIF" : "Manuell"} ·{" "}
                      {p.lat.toFixed(2)}, {p.lng.toFixed(2)}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 font-mono uppercase tracking-wider" style={{ color: "var(--pin)" }}>
                      <MapPin className="w-3 h-3" />
                      {p.exifMissing ? "Kein GPS im Foto" : "Ort fehlt"}
                    </div>
                  )}
                  <input
                    type="text"
                    value={p.caption}
                    onChange={(e) => updatePending(p.id, { caption: e.target.value })}
                    placeholder="Bildunterschrift (optional)"
                    className="w-full text-xs px-2 py-1 border-2 border-ink bg-paper-deep rounded focus:outline-none focus:border-pin"
                    maxLength={140}
                  />
                  <textarea
                    value={p.hints.join("\n")}
                    onChange={(e) =>
                      updatePending(p.id, {
                        hints: e.target.value.split(/\r?\n/),
                      })
                    }
                    placeholder={"Hinweise (eine pro Zeile)\nz. B. Mittelalterliche Altstadt"}
                    rows={2}
                    className="w-full text-xs px-2 py-1 border-2 border-ink bg-paper-deep rounded focus:outline-none focus:border-pin font-mono resize-none"
                  />
                  <textarea
                    value={p.story}
                    onChange={(e) =>
                      updatePending(p.id, { story: e.target.value.slice(0, 2000) })
                    }
                    placeholder={"Story (optional, wird nach dem Tipp gezeigt)"}
                    rows={2}
                    maxLength={2000}
                    className="w-full text-xs px-2 py-1 border-2 border-ink bg-paper-deep rounded focus:outline-none focus:border-pin resize-none"
                  />
                  <div className="flex gap-1">
                    {([1, 2, 3, 4, 5] as Difficulty[]).map((d) => (
                      <button
                        key={d}
                        onClick={() => updatePending(p.id, { difficulty: d })}
                        className="flex-1 h-1.5 rounded-full transition-opacity"
                        style={{
                          background: DIFFICULTY_COLORS[d],
                          opacity: p.difficulty >= d ? 1 : 0.2,
                        }}
                        aria-label={DIFFICULTY_LABELS[d]}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => setActiveId(p.id)}
                      className="flex-1 btn-ghost text-xs py-1.5 px-2"
                    >
                      Ort
                    </button>
                    <button
                      onClick={() => save(p)}
                      disabled={p.saved || p.lat == null || p.saving}
                      className="flex-1 btn-primary text-xs py-1.5 px-2"
                    >
                      {p.saving ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : p.saved ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        "Speichern"
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {pending.length > 0 && (
        <div className="flex justify-stretch md:justify-end">
          <button
            onClick={saveAll}
            disabled={!allReady}
            className="btn-primary w-full md:w-auto"
          >
            Alle speichern
          </button>
        </div>
      )}

      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="paper-modal-backdrop"
            onClick={() => setActiveId(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="paper-modal w-full max-w-3xl h-[80dvh] md:h-[600px] overflow-hidden flex flex-col"
            >
              <div className="p-4 flex items-center justify-between border-b-2 border-ink bg-paper-warm">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" style={{ color: "var(--pin)" }} />
                  <span className="font-display font-bold text-lg">Ort manuell setzen</span>
                </div>
                <button
                  onClick={() => setActiveId(null)}
                  className="text-ink-soft hover:text-pin"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-3 border-b-2 border-ink bg-paper">
                <PlacesSearch
                  placeholder="Ort suchen (Google Places)…"
                  onPick={(lat, lng) =>
                    updatePending(active.id, { lat, lng, source: "manual" })
                  }
                />
              </div>
              <div className="flex-1 relative min-h-[320px]" style={{ minHeight: 320 }}>
                <MapPicker
                  marker={
                    active.lat != null && active.lng != null
                      ? { lat: active.lat, lng: active.lng }
                      : null
                  }
                  initialCenter={
                    active.lat != null && active.lng != null
                      ? { lat: active.lat, lng: active.lng }
                      : undefined
                  }
                  initialZoom={active.lat != null ? 8 : 1.5}
                  onPick={(lat, lng) =>
                    updatePending(active.id, { lat, lng, source: "manual" })
                  }
                />
              </div>
              <div className="p-4 flex items-center justify-between gap-3 border-t-2 border-ink bg-paper-warm">
                <div className="text-xs font-mono text-ink-mute uppercase tracking-wider">
                  {active.lat != null && active.lng != null
                    ? `${active.lat.toFixed(4)}, ${active.lng.toFixed(4)}`
                    : "Klicke auf die Karte"}
                </div>
                <button
                  onClick={() => setActiveId(null)}
                  disabled={active.lat == null}
                  className="btn-primary"
                >
                  Übernehmen
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

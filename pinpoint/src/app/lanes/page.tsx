"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Play, X, Check, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { deleteLane, listLanes, listPhotos, newId, saveLane } from "@/lib/store";
import type { Lane, Photo } from "@/lib/types";
import PageHeader from "@/components/PageHeader";
import AuthGate from "@/components/AuthGate";

export default function LanesPage() {
  const [lanes, setLanes] = useState<Lane[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);

  const load = async () => {
    const [ls, ps] = await Promise.all([listLanes(), listPhotos()]);
    setLanes(ls);
    setPhotos(ps);
    const m: Record<string, string> = {};
    for (const p of ps) m[p.id] = URL.createObjectURL(p.thumbBlob);
    setThumbs((prev) => {
      Object.values(prev).forEach((u) => URL.revokeObjectURL(u));
      return m;
    });
  };

  useEffect(() => {
    load();
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      Object.values(thumbs).forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remove = async (id: string) => {
    await deleteLane(id);
    load();
  };

  return (
    <AuthGate>
      <PageHeader
        rightSlot={
          <button
            onClick={() => setCreating(true)}
            disabled={photos.length < 2}
            className="btn-pill-dark disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Neue Lane
          </button>
        }
      />

      <main className="max-w-[1200px] mx-auto px-6 md:px-8 pt-8 pb-20 relative z-[2]">
        <div className="dashed-pill mb-3">🛣️ Story-Mode</div>
        <h1 className="font-display-wonk font-black text-[clamp(40px,6vw,72px)] leading-[0.95] tracking-[-0.04em]">
          Memory <em className="accent-italic">Lanes</em>
        </h1>
        <p className="text-ink-soft mt-3 text-lg max-w-[640px]">
          Verwandle eine ganze Reise in einen chronologischen Geo-Trail. Spieler
          raten Foto für Foto und sehen, wie sich die Route auf der Karte
          aufdeckt.
        </p>

        {photos.length < 2 && (
          <div className="mt-10 paper-card-soft p-8 text-center text-ink-soft">
            Du brauchst mindestens 2 Fotos.{" "}
            <Link href="/upload" className="btn-link">Lade welche hoch</Link>.
          </div>
        )}

        {lanes.length === 0 && photos.length >= 2 && (
          <div className="mt-10 paper-card-soft p-8 text-center text-ink-soft">
            Noch keine Lanes erstellt. Klick oben auf{" "}
            <span className="font-display font-bold text-ink">Neue Lane</span>, um zu starten.
          </div>
        )}

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-7">
          {lanes.map((l, i) => (
            <div
              key={l.id}
              className="paper-card overflow-hidden flex flex-col"
              style={{ transform: `rotate(${i % 2 === 0 ? -0.4 : 0.4}deg)` }}
            >
              <div className="grid grid-cols-4 h-32 bg-paper-warm">
                {l.photoIds.slice(0, 4).map((pid) => (
                  <div
                    key={pid}
                    className="bg-cover bg-center border-r-2 border-ink last:border-r-0"
                    style={{
                      backgroundImage: thumbs[pid] ? `url(${thumbs[pid]})` : undefined,
                      background: thumbs[pid] ? undefined : "#c4b48a",
                    }}
                  />
                ))}
              </div>
              <div className="p-5 flex items-center justify-between gap-3 border-t-2 border-ink">
                <div className="min-w-0">
                  <span className="tag-pin">Lane</span>
                  <div className="font-display text-xl font-bold truncate mt-0.5">{l.title}</div>
                  <div className="text-xs font-mono text-ink-mute uppercase tracking-wider mt-1">
                    {l.photoIds.length} Stationen
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => remove(l.id)}
                    className="text-ink-mute hover:text-pin p-2"
                    title="Löschen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <Link href={`/play/lane?id=${l.id}`} className="btn-pill-dark">
                    <Play className="w-3 h-3" />
                    Spielen
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <AnimatePresence>
        {creating && (
          <LaneEditor
            photos={photos}
            thumbs={thumbs}
            onClose={() => setCreating(false)}
            onSave={async (lane) => {
              await saveLane(lane);
              setCreating(false);
              load();
            }}
          />
        )}
      </AnimatePresence>
    </AuthGate>
  );
}

function LaneEditor({
  photos, thumbs, onClose, onSave,
}: {
  photos: Photo[];
  thumbs: Record<string, string>;
  onClose: () => void;
  onSave: (lane: Lane) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };
  const sortByDate = () => {
    const ordered = [...selected].sort((a, b) => {
      const pa = photos.find((p) => p.id === a);
      const pb = photos.find((p) => p.id === b);
      return (pa?.takenAt ?? 0) - (pb?.takenAt ?? 0);
    });
    setSelected(ordered);
  };

  const canSave = title.trim().length > 0 && selected.length >= 2;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setSelected((items) => {
      const oldIdx = items.indexOf(active.id as string);
      const newIdx = items.indexOf(over.id as string);
      return arrayMove(items, oldIdx, newIdx);
    });
  };

  const submit = async () => {
    if (!canSave) return;
    const lane: Lane = {
      id: newId(),
      title: title.trim(),
      description: description.trim() || undefined,
      photoIds: selected,
      coverPhotoId: selected[0],
      createdAt: Date.now(),
    };
    await onSave(lane);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="paper-modal-backdrop"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="paper-modal w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="px-6 py-5 border-b-2 border-ink flex items-center justify-between bg-paper-warm">
          <div>
            <span className="tag-pin">Story-Mode</span>
            <div className="font-display text-xl font-bold leading-none mt-1">Neue Memory Lane</div>
          </div>
          <button onClick={onClose} className="text-ink-soft hover:text-pin">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titel · z. B. Italien-Trip 2025"
              className="paper-input"
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kurzbeschreibung (optional)"
              className="paper-input"
            />
          </div>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="font-mono text-xs uppercase tracking-wider text-ink-soft">
              {selected.length} von {photos.length} ausgewählt
            </div>
            <button
              onClick={sortByDate}
              disabled={selected.length === 0}
              className="btn-ghost text-xs py-2 px-4"
            >
              Nach Datum sortieren
            </button>
          </div>

          {selected.length > 0 && (
            <div>
              <div className="section-eyebrow mb-3">◆ Reihenfolge — zum Sortieren ziehen</div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={selected} strategy={verticalListSortingStrategy}>
                  <div className="flex flex-col gap-2">
                    {selected.map((id, idx) => {
                      const p = photos.find((x) => x.id === id);
                      if (!p) return null;
                      return (
                        <SortableRow
                          key={id}
                          id={id}
                          idx={idx}
                          photo={p}
                          thumb={thumbs[id]}
                          onRemove={() => toggle(id)}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}

          <div>
            <div className="section-eyebrow mb-3">✦ Fotos auswählen</div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {photos.map((p) => {
                const idx = selected.indexOf(p.id);
                const isSel = idx >= 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => toggle(p.id)}
                    className="relative aspect-square overflow-hidden border-2 transition"
                    style={{
                      borderColor: isSel ? "var(--pin)" : "var(--paper-edge)",
                      boxShadow: isSel ? "3px 3px 0 var(--pin)" : "none",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={thumbs[p.id]} alt="" className="w-full h-full object-cover" />
                    {isSel && (
                      <div className="absolute top-1 right-1 w-7 h-7 rounded-full flex items-center justify-center font-display font-bold text-sm border-2 border-ink" style={{ background: "var(--pin)", color: "var(--paper)" }}>
                        {idx + 1}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t-2 border-ink flex justify-end gap-3 bg-paper-warm">
          <button onClick={onClose} className="btn-ghost">Abbrechen</button>
          <button onClick={submit} disabled={!canSave} className="btn-primary">
            <Check className="w-4 h-4" />
            Lane erstellen
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SortableRow({
  id, idx, photo, thumb, onRemove,
}: {
  id: string; idx: number; photo: Photo; thumb: string; onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 0,
  };
  return (
    <div ref={setNodeRef} style={style} className="paper-card-soft rounded p-2 flex items-center gap-3">
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-ink-mute hover:text-ink touch-none">
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="font-mono text-xs text-ink-soft w-6 text-center">{idx + 1}</div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={thumb} alt="" className="w-10 h-10 rounded object-cover border border-ink" />
      <div className="flex-1 font-mono text-xs text-ink-soft">
        {photo.lat.toFixed(2)}, {photo.lng.toFixed(2)}
      </div>
      <button onClick={onRemove} className="text-pin hover:text-pin-deep px-2">×</button>
    </div>
  );
}

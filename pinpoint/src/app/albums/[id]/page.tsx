"use client";

import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Play,
  Plus,
  Trash2,
  Users,
  X,
  UserPlus,
  Copy,
  Check,
  LogOut,
  Pencil,
  Save,
} from "lucide-react";
import {
  getAlbum,
  listAlbumMembers,
  listAlbumPhotos,
  addPhotosToAlbum,
  removePhotoFromAlbum,
  removeMember,
  setMemberRole,
  inviteFriendToAlbum,
  leaveAlbum,
  deleteAlbum,
  updateAlbum,
  type Album,
  type AlbumMember,
  type AlbumPhotoRef,
} from "@/lib/albums";
import { listFriends, type FriendRow } from "@/lib/friends";
import { getSupabase } from "@/lib/supabase";
import { listPhotos } from "@/lib/store";
import type { Photo } from "@/lib/types";
import PageHeader from "@/components/PageHeader";
import AuthGate from "@/components/AuthGate";
import { toast } from "@/lib/toast";

export default function AlbumDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <AuthGate>
      <AlbumDetail id={id} />
    </AuthGate>
  );
}

function AlbumDetail({ id }: { id: string }) {
  const [album, setAlbum] = useState<Album | null>(null);
  const [photos, setPhotos] = useState<AlbumPhotoRef[]>([]);
  const [members, setMembers] = useState<AlbumMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [a, ps, ms] = await Promise.all([
      getAlbum(id),
      listAlbumPhotos(id),
      listAlbumMembers(id),
    ]);
    setAlbum(a);
    setPhotos(ps);
    setMembers(ms);
    if (a) {
      setEditTitle(a.title);
      setEditDesc(a.description ?? "");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Build signed thumb URLs for photos in album.
  useEffect(() => {
    if (photos.length === 0) {
      setThumbUrls({});
      return;
    }
    const sb = getSupabase();
    if (!sb) return;
    let cancelled = false;
    (async () => {
      const out: Record<string, string> = {};
      await Promise.all(
        photos.map(async (p) => {
          if (!p.thumb_path) return;
          const { data } = await sb.storage
            .from("thumbs")
            .createSignedUrl(p.thumb_path, 60 * 30);
          if (data?.signedUrl) out[p.id] = data.signedUrl;
        })
      );
      if (!cancelled) setThumbUrls(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [photos]);

  const canEdit = album?.my_role === "owner" || album?.my_role === "editor";
  const isOwner = album?.my_role === "owner";

  const copyCode = async () => {
    if (!album) return;
    try {
      await navigator.clipboard.writeText(album.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const onRemovePhoto = async (photoId: string) => {
    if (!confirm("Foto aus dem Album entfernen?")) return;
    try {
      await removePhotoFromAlbum(id, photoId);
      toast.success("Foto entfernt");
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const onLeave = async () => {
    if (!confirm("Album wirklich verlassen?")) return;
    try {
      await leaveAlbum(id);
      toast.success("Album verlassen");
      window.location.href = "/albums";
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const onDelete = async () => {
    if (!confirm("Album endgültig löschen? Fotos bleiben erhalten.")) return;
    try {
      await deleteAlbum(id);
      toast.success("Album gelöscht");
      window.location.href = "/albums";
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const onSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateAlbum(id, {
        title: editTitle,
        description: editDesc,
      });
      setEditing(false);
      toast.success("Gespeichert");
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  if (loading) {
    return (
      <>
        <PageHeader />
        <main className="max-w-[1200px] mx-auto px-6 md:px-8 pt-8 pb-20 text-ink-soft">
          Lade Album…
        </main>
      </>
    );
  }
  if (!album) {
    return (
      <>
        <PageHeader />
        <main className="max-w-[1200px] mx-auto px-6 md:px-8 pt-8 pb-20">
          <div className="paper-card-soft p-10 text-center">
            <div className="text-ink-soft mb-4">Album nicht gefunden.</div>
            <Link href="/albums" className="btn-primary inline-flex">
              <ArrowLeft className="w-4 h-4" />
              Alle Alben
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <PageHeader />
      <main className="max-w-[1200px] mx-auto px-6 md:px-8 pt-8 pb-20 relative z-[2]">
        <Link
          href="/albums"
          className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-pin no-underline mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Alle Alben
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex-1 min-w-[300px]">
            <div className="dashed-pill mb-3">📚 Album</div>
            {editing && isOwner ? (
              <form onSubmit={onSaveEdit} className="flex flex-col gap-3 max-w-xl">
                <input
                  required
                  maxLength={80}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="px-3 py-2 border-2 border-ink bg-paper-deep rounded text-2xl font-display font-bold focus:outline-none focus:border-pin"
                />
                <textarea
                  maxLength={500}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={2}
                  className="px-3 py-2 border-2 border-ink bg-paper-deep rounded text-sm focus:outline-none focus:border-pin resize-none"
                  placeholder="Beschreibung"
                />
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary">
                    <Save className="w-4 h-4" />
                    Speichern
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="btn-ghost"
                  >
                    Abbrechen
                  </button>
                </div>
              </form>
            ) : (
              <>
                <h1 className="font-display-wonk font-black text-[clamp(36px,5vw,60px)] leading-[0.95] tracking-[-0.04em]">
                  {album.title}
                </h1>
                {album.description && (
                  <p className="text-ink-soft mt-3 text-base max-w-[640px]">
                    {album.description}
                  </p>
                )}
              </>
            )}
          </div>

          <div className="flex flex-col gap-2 items-stretch md:items-end w-full md:w-auto">
            <button
              onClick={copyCode}
              className="paper-card px-4 py-2 flex items-center gap-2 hover:shadow-[4px_4px_0_var(--pin)] justify-between md:justify-start"
              title="Einladungs-Code kopieren"
            >
              <span className="text-xs font-mono uppercase tracking-wider text-ink-mute">
                Code
              </span>
              <span className="font-mono font-bold tracking-[0.3em] text-lg">
                {album.invite_code}
              </span>
              {copied ? (
                <Check className="w-4 h-4 text-stamp-green" />
              ) : (
                <Copy className="w-4 h-4 text-ink-mute" />
              )}
            </button>
            <div className="flex gap-2">
              {photos.length > 0 && (
                <Link
                  href={`/play/album/${album.id}`}
                  className="btn-primary no-underline flex-1 md:flex-none"
                >
                  <Play className="w-4 h-4" />
                  Spielen
                </Link>
              )}
              {isOwner && !editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="btn-ghost"
                  title="Bearbeiten"
                  aria-label="Album bearbeiten"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Photos */}
        <section className="mt-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-2xl tracking-tight">
              Fotos · <span className="text-ink-mute">{photos.length}</span>
            </h2>
            {canEdit && (
              <button onClick={() => setAdding(true)} className="btn-pill-dark">
                <Plus className="w-4 h-4" />
                Fotos hinzufügen
              </button>
            )}
          </div>

          {photos.length === 0 ? (
            <div className="paper-card-soft p-10 text-center text-ink-soft">
              Noch keine Fotos.{" "}
              {canEdit && (
                <button onClick={() => setAdding(true)} className="btn-link">
                  Welche hinzufügen
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {photos.map((p) => (
                <div
                  key={p.id}
                  className="paper-card overflow-hidden relative group"
                >
                  {thumbUrls[p.id] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbUrls[p.id]}
                      alt={p.caption ?? ""}
                      className="w-full aspect-square object-cover"
                      style={{ filter: "saturate(0.92) contrast(0.96)" }}
                    />
                  ) : (
                    <div className="w-full aspect-square bg-paper-warm" />
                  )}
                  {p.caption && (
                    <div className="px-2 py-1.5 text-xs border-t-2 border-ink bg-paper-deep truncate">
                      {p.caption}
                    </div>
                  )}
                  {canEdit && (
                    <button
                      onClick={() => onRemovePhoto(p.id)}
                      className="absolute top-2 right-2 w-7 h-7 bg-paper border-2 border-ink rounded-full flex items-center justify-center text-pin opacity-0 group-hover:opacity-100 transition-opacity hover:bg-pin hover:text-paper"
                      title="Entfernen"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Members */}
        <section className="mt-14">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-2xl tracking-tight">
              Mitglieder · <span className="text-ink-mute">{members.length}</span>
            </h2>
            {isOwner && (
              <button onClick={() => setInviting(true)} className="btn-pill-dark">
                <UserPlus className="w-4 h-4" />
                Freund einladen
              </button>
            )}
          </div>

          <div className="paper-card-soft divide-y-2 divide-ink/10">
            {members.map((m) => (
              <div
                key={m.member}
                className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3 flex-wrap"
              >
                <Users className="w-4 h-4 text-ink-mute" />
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold truncate">
                    {m.display_name}
                  </div>
                  {m.username && (
                    <div className="text-xs font-mono text-ink-mute truncate">
                      @{m.username}
                    </div>
                  )}
                </div>
                <span className="tag-pin text-[10px]">{m.role}</span>
                {isOwner && m.role !== "owner" && (
                  <>
                    <select
                      value={m.role}
                      onChange={async (e) => {
                        try {
                          await setMemberRole({
                            albumId: id,
                            memberId: m.member,
                            role: e.target.value as "editor" | "player",
                          });
                          toast.success("Rolle aktualisiert");
                          await load();
                        } catch (err) {
                          toast.error((err as Error).message);
                        }
                      }}
                      className="text-xs border-2 border-ink bg-paper-deep rounded px-2 py-1"
                    >
                      <option value="player">Spieler</option>
                      <option value="editor">Editor</option>
                    </select>
                    <button
                      onClick={async () => {
                        if (!confirm("Mitglied entfernen?")) return;
                        try {
                          await removeMember(id, m.member);
                          toast.success("Entfernt");
                          await load();
                        } catch (err) {
                          toast.error((err as Error).message);
                        }
                      }}
                      className="text-pin hover:scale-110 transition-transform"
                      title="Entfernen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Danger zone */}
        <section className="mt-14 flex flex-wrap gap-3">
          {!isOwner && (
            <button onClick={onLeave} className="btn-ghost">
              <LogOut className="w-4 h-4" />
              Album verlassen
            </button>
          )}
          {isOwner && (
            <button
              onClick={onDelete}
              className="btn-ghost text-pin border-pin"
            >
              <Trash2 className="w-4 h-4" />
              Album löschen
            </button>
          )}
        </section>
      </main>

      <AnimatePresence>
        {adding && (
          <AddPhotosModal
            albumId={id}
            existingIds={new Set(photos.map((p) => p.id))}
            onClose={() => setAdding(false)}
            onAdded={async () => {
              setAdding(false);
              await load();
            }}
          />
        )}
        {inviting && (
          <InviteModal
            albumId={id}
            existingMemberIds={new Set(members.map((m) => m.member))}
            onClose={() => setInviting(false)}
            onInvited={async () => {
              setInviting(false);
              await load();
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function AddPhotosModal({
  albumId,
  existingIds,
  onClose,
  onAdded,
}: {
  albumId: string;
  existingIds: Set<string>;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ps = await listPhotos();
      if (cancelled) return;
      setPhotos(ps);
      const m: Record<string, string> = {};
      for (const p of ps) m[p.id] = URL.createObjectURL(p.thumbBlob);
      setThumbs(m);
    })();
    return () => {
      cancelled = true;
      Object.values(thumbs).forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = async () => {
    if (selected.size === 0) return;
    setSaving(true);
    try {
      await addPhotosToAlbum(albumId, [...selected]);
      toast.success(`${selected.size} Foto${selected.size === 1 ? "" : "s"} hinzugefügt`);
      onAdded();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const available = photos.filter((p) => !existingIds.has(p.id));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="paper-modal-backdrop"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="paper-card p-4 md:p-6 max-w-3xl w-full md:mx-4 max-h-[85dvh] md:max-h-[85vh] flex flex-col"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-2xl tracking-tight">
            Fotos hinzufügen
          </h2>
          <button onClick={onClose} className="text-ink-mute hover:text-pin">
            <X className="w-5 h-5" />
          </button>
        </div>
        {available.length === 0 ? (
          <div className="text-center text-ink-soft py-10">
            Keine weiteren Fotos verfügbar.{" "}
            <Link href="/upload" className="btn-link">
              Lade welche hoch
            </Link>
            .
          </div>
        ) : (
          <>
            <div className="overflow-auto flex-1 -mx-2 px-2">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {available.map((p) => {
                  const sel = selected.has(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggle(p.id)}
                      className="paper-card overflow-hidden relative aspect-square focus:outline-none focus:ring-2 focus:ring-pin"
                      style={{
                        boxShadow: sel ? "4px 4px 0 var(--pin)" : undefined,
                        borderColor: sel ? "var(--pin)" : undefined,
                      }}
                    >
                      {thumbs[p.id] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumbs[p.id]}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      )}
                      {sel && (
                        <div className="absolute top-1 right-1 w-6 h-6 bg-pin border-2 border-ink rounded-full flex items-center justify-center text-paper">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-between items-center pt-4 mt-2 border-t-2 border-ink">
              <div className="text-sm text-ink-soft">
                {selected.size} ausgewählt
              </div>
              <button
                onClick={submit}
                disabled={selected.size === 0 || saving}
                className="btn-primary"
              >
                {saving ? "Speichere…" : "Hinzufügen"}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

function InviteModal({
  albumId,
  existingMemberIds,
  onClose,
  onInvited,
}: {
  albumId: string;
  existingMemberIds: Set<string>;
  onClose: () => void;
  onInvited: () => void;
}) {
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<"player" | "editor">("player");

  useEffect(() => {
    listFriends()
      .then((fs) => setFriends(fs.filter((f) => f.status === "accepted")))
      .finally(() => setLoading(false));
  }, []);

  const invite = async (friendId: string) => {
    try {
      await inviteFriendToAlbum({ albumId, friendId, role });
      toast.success("Eingeladen");
      onInvited();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const available = friends.filter((f) => !existingMemberIds.has(f.id));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="paper-modal-backdrop"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="paper-card p-4 md:p-6 max-w-md w-full md:mx-4 overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-2xl tracking-tight">
            Freund einladen
          </h2>
          <button onClick={onClose} className="text-ink-mute hover:text-pin">
            <X className="w-5 h-5" />
          </button>
        </div>

        <label className="text-xs font-mono uppercase tracking-wider text-ink-mute block mb-4">
          Rolle
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "player" | "editor")}
            className="mt-1 w-full px-3 py-2 border-2 border-ink bg-paper-deep rounded text-sm font-sans normal-case tracking-normal"
          >
            <option value="player">Spieler (nur spielen)</option>
            <option value="editor">Editor (Fotos verwalten)</option>
          </select>
        </label>

        {loading ? (
          <div className="text-ink-soft text-sm py-4">Lade Freunde…</div>
        ) : available.length === 0 ? (
          <div className="text-ink-soft text-sm py-4">
            Keine Freunde verfügbar. Tipp: Teile den Einladungs-Code, dann können
            sie selbst beitreten.{" "}
            <Link href="/friends" className="btn-link">
              Freunde verwalten
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-[50vh] overflow-auto">
            {available.map((f) => (
              <button
                key={f.id}
                onClick={() => invite(f.id)}
                className="flex items-center gap-3 px-3 py-2 border-2 border-ink rounded bg-paper-deep hover:bg-paper-warm text-left"
              >
                <Users className="w-4 h-4 text-ink-mute" />
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold truncate">
                    {f.display_name}
                  </div>
                  {f.username && (
                    <div className="text-xs font-mono text-ink-mute truncate">
                      @{f.username}
                    </div>
                  )}
                </div>
                <UserPlus className="w-4 h-4" />
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

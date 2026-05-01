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
  Share2,
  Activity,
  ImagePlus,
  ImageMinus,
  UserCog,
  Trophy,
  Sparkles,
} from "lucide-react";
import {
  getAlbum,
  listAlbumMembers,
  listAlbumPhotos,
  addPhotosToAlbum,
  removePhotoFromAlbum,
  removeMember,
  setMemberPermissions,
  inviteFriendToAlbum,
  leaveAlbum,
  deleteAlbum,
  updateAlbum,
  listAlbumActivity,
  listAlbumScores,
  type Album,
  type AlbumMember,
  type AlbumPhotoRef,
  type AlbumActivity,
  type AlbumScoreRow,
} from "@/lib/albums";
import { listFriends, type FriendRow } from "@/lib/friends";
import { getSupabase } from "@/lib/supabase";
import { listPhotos } from "@/lib/store";
import type { Photo } from "@/lib/types";
import PageHeader from "@/components/PageHeader";
import AuthGate from "@/components/AuthGate";
import { toast } from "@/lib/toast";
import { albumInviteUrl, shareInvite } from "@/lib/invite";

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
  const [activity, setActivity] = useState<AlbumActivity[]>([]);
  const [scores, setScores] = useState<AlbumScoreRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [a, ps, ms, act, sc] = await Promise.all([
      getAlbum(id),
      listAlbumPhotos(id),
      listAlbumMembers(id),
      listAlbumActivity(id, 20),
      listAlbumScores(id, 10),
    ]);
    setAlbum(a);
    setPhotos(ps);
    setMembers(ms);
    setActivity(act);
    setScores(sc);
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

  const canEdit =
    album?.my_role === "owner" ||
    album?.my_permissions?.can_add_photos === true;
  const canInvite =
    album?.my_role === "owner" || album?.my_permissions?.can_invite === true;
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

  const onShareInvite = () => {
    if (!album) return;
    shareInvite({
      title: `PinPoint Album: ${album.title}`,
      text: `Tritt meinem PinPoint-Album "${album.title}" bei`,
      url: albumInviteUrl(album.invite_code),
    });
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
            <div className="flex gap-2">
              <button
                onClick={copyCode}
                className="paper-card px-4 py-2 flex items-center gap-2 hover:shadow-[4px_4px_0_var(--pin)] justify-between md:justify-start flex-1"
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
              <button
                onClick={onShareInvite}
                className="btn-ghost shrink-0"
                title="Einladungslink teilen"
                aria-label="Einladungslink teilen"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Teilen</span>
              </button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {photos.length > 0 && (
                <Link
                  href={`/play/album/${album.id}`}
                  className="btn-primary no-underline flex-1 md:flex-none"
                >
                  <Play className="w-4 h-4" />
                  Spielen
                </Link>
              )}
              {photos.length >= 5 && (
                <Link
                  href={`/share?album=${album.id}`}
                  className="btn-ghost no-underline"
                  title="Lobby mit diesem Album öffnen"
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="hidden sm:inline">Mit Freunden</span>
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
            {canInvite && (
              <button onClick={() => setInviting(true)} className="btn-pill-dark">
                <UserPlus className="w-4 h-4" />
                Freund einladen
              </button>
            )}
          </div>

          <div className="paper-card-soft divide-y-2 divide-ink/10">
            {members.map((m) => (
              <MemberRow
                key={m.member}
                albumId={id}
                member={m}
                isOwner={isOwner}
                onChanged={load}
              />
            ))}
          </div>
        </section>

        {/* Leaderboard */}
        {scores.length > 0 && (
          <section className="mt-14">
            <h2 className="font-display font-bold text-2xl tracking-tight mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5" style={{ color: "var(--mustard)" }} />
              Rangliste
            </h2>
            <div className="paper-card-soft divide-y-2 divide-ink/10">
              {scores.map((s, i) => (
                <div key={s.player} className="flex items-center gap-3 px-4 py-2.5">
                  <div
                    className="w-7 h-7 rounded-full border-2 border-ink flex items-center justify-center font-display font-black text-xs tabular-nums shrink-0"
                    style={{
                      background: i === 0 ? "var(--mustard)" : i < 3 ? "var(--paper-deep)" : "var(--paper)",
                    }}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold truncate">{s.display_name}</div>
                    {s.username && (
                      <div className="text-[11px] font-mono text-ink-mute truncate">@{s.username}</div>
                    )}
                  </div>
                  <div className="font-display-wonk font-black text-xl tabular-nums" style={{ color: "var(--pin)" }}>
                    {s.best_score.toLocaleString("de-DE")}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Activity feed */}
        {activity.length > 0 && (
          <section className="mt-14">
            <h2 className="font-display font-bold text-2xl tracking-tight mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-ink-mute" />
              Aktivitäten
            </h2>
            <div className="paper-card-soft divide-y-2 divide-ink/10">
              {activity.map((a) => (
                <div key={a.id} className="px-4 py-2.5 text-sm flex items-start gap-2">
                  <span className="font-mono text-[10px] uppercase text-ink-mute mt-0.5 shrink-0 tabular-nums">
                    {timeAgo(a.created_at)}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="font-display font-bold">{a.actor_name ?? "Jemand"}</span>{" "}
                    <span className="text-ink-soft">{activityText(a)}</span>
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

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
  const [perms, setPerms] = useState({
    can_add_photos: true,
    can_remove_photos: false,
    can_invite: false,
  });

  useEffect(() => {
    listFriends()
      .then((fs) => setFriends(fs.filter((f) => f.status === "accepted")))
      .finally(() => setLoading(false));
  }, []);

  const invite = async (friendId: string) => {
    try {
      await inviteFriendToAlbum({ albumId, friendId, role: "player" });
      // Apply chosen permissions immediately.
      await setMemberPermissions({
        albumId,
        memberId: friendId,
        permissions: perms,
      });
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
          Berechtigungen
          <div className="mt-2 paper-card-soft p-3 grid gap-2 normal-case tracking-normal font-sans">
            <PermToggle
              icon={<ImagePlus className="w-3.5 h-3.5" />}
              label="Fotos hinzufügen"
              hint="Eigene Fotos zum Album beitragen"
              checked={perms.can_add_photos}
              onChange={(v) => setPerms((p) => ({ ...p, can_add_photos: v }))}
            />
            <PermToggle
              icon={<ImageMinus className="w-3.5 h-3.5" />}
              label="Fotos entfernen"
              hint="Auch fremde Fotos aus dem Album werfen"
              checked={perms.can_remove_photos}
              onChange={(v) => setPerms((p) => ({ ...p, can_remove_photos: v }))}
            />
            <PermToggle
              icon={<UserPlus className="w-3.5 h-3.5" />}
              label="Andere einladen"
              hint="Weitere Freunde zum Album hinzufügen"
              checked={perms.can_invite}
              onChange={(v) => setPerms((p) => ({ ...p, can_invite: v }))}
            />
          </div>
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

// ─────────────────────────────────────────────
// Members & permissions
// ─────────────────────────────────────────────
function MemberRow({
  albumId,
  member,
  isOwner,
  onChanged,
}: {
  albumId: string;
  member: AlbumMember;
  isOwner: boolean;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const isMemberOwner = member.role === "owner";
  const togglePerm = async (key: "can_add_photos" | "can_remove_photos" | "can_invite", v: boolean) => {
    try {
      await setMemberPermissions({
        albumId,
        memberId: member.member,
        permissions: { [key]: v },
      });
      onChanged();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };
  return (
    <div className="px-3 sm:px-5 py-3">
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        <Users className="w-4 h-4 text-ink-mute" />
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold truncate">{member.display_name}</div>
          {member.username && (
            <div className="text-xs font-mono text-ink-mute truncate">@{member.username}</div>
          )}
        </div>
        {isMemberOwner ? (
          <span className="tag-pin text-[10px]">OWNER</span>
        ) : (
          <PermSummary member={member} />
        )}
        {isOwner && !isMemberOwner && (
          <>
            <button
              onClick={() => setOpen((o) => !o)}
              className="text-ink-mute hover:text-pin transition-colors"
              title="Berechtigungen"
              aria-label="Berechtigungen ändern"
            >
              <UserCog className="w-4 h-4" />
            </button>
            <button
              onClick={async () => {
                if (!confirm(`${member.display_name} entfernen?`)) return;
                try {
                  await removeMember(albumId, member.member);
                  toast.success("Entfernt");
                  onChanged();
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
      {isOwner && open && !isMemberOwner && (
        <div className="mt-3 ml-6 paper-card-soft p-3 grid gap-2">
          <PermToggle
            icon={<ImagePlus className="w-3.5 h-3.5" />}
            label="Fotos hinzufügen"
            checked={member.can_add_photos}
            onChange={(v) => togglePerm("can_add_photos", v)}
          />
          <PermToggle
            icon={<ImageMinus className="w-3.5 h-3.5" />}
            label="Fotos entfernen"
            checked={member.can_remove_photos}
            onChange={(v) => togglePerm("can_remove_photos", v)}
          />
          <PermToggle
            icon={<UserPlus className="w-3.5 h-3.5" />}
            label="Andere einladen"
            checked={member.can_invite}
            onChange={(v) => togglePerm("can_invite", v)}
          />
        </div>
      )}
    </div>
  );
}

function PermSummary({ member }: { member: AlbumMember }) {
  const flags = [
    member.can_add_photos && "+",
    member.can_remove_photos && "−",
    member.can_invite && "★",
  ].filter(Boolean) as string[];
  if (flags.length === 0) {
    return <span className="tag-pin text-[10px] opacity-60">NUR SPIELEN</span>;
  }
  return (
    <span
      className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 border-2 border-ink rounded bg-paper-deep"
      title="+ darf hinzufügen · − darf entfernen · ★ darf einladen"
    >
      {flags.join(" ")}
    </span>
  );
}

function PermToggle({
  icon,
  label,
  hint,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 accent-[var(--pin)] cursor-pointer"
      />
      <span className="flex-1 min-w-0">
        <span className="text-sm font-display font-bold flex items-center gap-1.5">
          {icon}
          {label}
        </span>
        {hint && <span className="block text-[11px] text-ink-mute">{hint}</span>}
      </span>
    </label>
  );
}

// ─────────────────────────────────────────────
// Activity helpers
// ─────────────────────────────────────────────
function activityText(a: AlbumActivity): string {
  switch (a.kind) {
    case "joined":
      return "ist dem Album beigetreten";
    case "left":
      return "hat das Album verlassen";
    case "photo_added": {
      const c = (a.payload?.count as number | undefined) ?? 1;
      return `hat ${c} Foto${c === 1 ? "" : "s"} hinzugefügt`;
    }
    case "photo_removed":
      return "hat ein Foto entfernt";
    case "renamed":
      return "hat das Album umbenannt";
    case "invited":
      return "hat ein Mitglied eingeladen";
    case "permissions_changed":
      return "hat Berechtigungen angepasst";
    case "removed_member":
      return "hat ein Mitglied entfernt";
    default:
      return a.kind;
  }
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "gerade";
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

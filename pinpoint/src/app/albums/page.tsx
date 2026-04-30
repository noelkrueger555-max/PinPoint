"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Users, Image as ImageIcon, KeyRound, Play, X } from "lucide-react";
import {
  createAlbum,
  joinAlbumByCode,
  listMyAlbums,
  type Album,
} from "@/lib/albums";
import PageHeader from "@/components/PageHeader";
import AuthGate from "@/components/AuthGate";
import { toast } from "@/lib/toast";

export default function AlbumsPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  const load = async () => {
    setLoading(true);
    const list = await listMyAlbums();
    setAlbums(list);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await createAlbum({
        title: title.trim(),
        description: description.trim() || undefined,
      });
      setTitle("");
      setDescription("");
      setCreating(false);
      toast.success("Album erstellt");
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const submitJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    try {
      await joinAlbumByCode(code);
      setJoinCode("");
      setJoining(false);
      toast.success("Album beigetreten");
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <AuthGate
      reason={
        <>
          Erstelle <em className="accent-italic">Alben</em> und teile sie mit Freunden.
        </>
      }
    >
      <PageHeader
        rightSlot={
          <div className="flex gap-2">
            <button
              onClick={() => setJoining(true)}
              className="btn-pill-light"
              aria-label="Album beitreten"
            >
              <KeyRound className="w-4 h-4" />
              <span className="hidden sm:inline">Beitreten</span>
            </button>
            <button
              onClick={() => setCreating(true)}
              className="btn-pill-dark"
              aria-label="Neues Album"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Neu</span>
            </button>
          </div>
        }
      />

      <main className="max-w-[1200px] mx-auto px-6 md:px-8 pt-8 pb-20 relative z-[2]">
        <div className="dashed-pill mb-3">📚 Album-Modus</div>
        <h1 className="font-display-wonk font-black text-[clamp(40px,6vw,72px)] leading-[0.95] tracking-[-0.04em]">
          Deine <em className="accent-italic">Alben</em>
        </h1>
        <p className="text-ink-soft mt-3 text-lg max-w-[640px]">
          Sammle Fotos in Alben, lade Freunde ein und spielt zusammen. Jedes Album hat einen
          Einladungs-Code zum Beitreten — wie ein privater Spiele-Raum.
        </p>

        {loading ? (
          <div className="mt-10 paper-card-soft p-8 text-center text-ink-soft">
            Lade Alben…
          </div>
        ) : albums.length === 0 ? (
          <div className="mt-10 paper-card-soft p-10 text-center">
            <div className="text-ink-soft mb-4">
              Noch keine Alben. Erstelle dein erstes oder tritt einem bei.
            </div>
            <div className="flex gap-3 justify-center flex-wrap">
              <button onClick={() => setCreating(true)} className="btn-primary">
                <Plus className="w-4 h-4" />
                Album erstellen
              </button>
              <button onClick={() => setJoining(true)} className="btn-ghost">
                <KeyRound className="w-4 h-4" />
                Code eingeben
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {albums.map((a, i) => (
              <Link
                key={a.id}
                href={`/albums/${a.id}`}
                className="paper-card overflow-hidden flex flex-col no-underline text-ink hover:shadow-[8px_8px_0_var(--ink)] transition-shadow"
                style={{ transform: `rotate(${i % 2 === 0 ? -0.3 : 0.3}deg)` }}
              >
                <div className="h-40 bg-paper-warm border-b-2 border-ink flex items-center justify-center">
                  <ImageIcon className="w-12 h-12 text-ink-mute opacity-30" />
                </div>
                <div className="p-5 flex-1 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-display font-bold text-xl tracking-tight truncate">
                      {a.title}
                    </h2>
                    {a.my_role === "owner" && (
                      <span className="tag-pin text-[10px]">★ Owner</span>
                    )}
                  </div>
                  {a.description && (
                    <p className="text-sm text-ink-soft line-clamp-2">
                      {a.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-ink-mute font-mono uppercase tracking-wider mt-1">
                    <span className="flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      {a.photo_count ?? 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {a.member_count ?? 0}
                    </span>
                    <span className="ml-auto opacity-60">{a.invite_code}</span>
                  </div>
                  {(a.photo_count ?? 0) >= 1 && (
                    <Link
                      href={`/play/album/${a.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="btn-primary text-sm py-1.5 px-3 mt-2 self-start no-underline"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Spielen
                    </Link>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="paper-modal-backdrop"
            onClick={() => setCreating(false)}
          >
            <motion.form
              onSubmit={submit}
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="paper-card p-7 max-w-md w-full mx-4 flex flex-col gap-4 overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-2xl tracking-tight">
                  Neues Album
                </h2>
                <button type="button" onClick={() => setCreating(false)} className="text-ink-mute hover:text-pin">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <label className="text-xs font-mono uppercase tracking-wider text-ink-mute">
                Titel
                <input
                  autoFocus
                  required
                  maxLength={80}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="z. B. Italien-Roadtrip 2024"
                  className="mt-1 w-full px-3 py-2 border-2 border-ink bg-paper-deep rounded focus:outline-none focus:border-pin text-base text-ink normal-case font-sans tracking-normal"
                />
              </label>
              <label className="text-xs font-mono uppercase tracking-wider text-ink-mute">
                Beschreibung (optional)
                <textarea
                  maxLength={500}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Worum geht's in diesem Album?"
                  rows={3}
                  className="mt-1 w-full px-3 py-2 border-2 border-ink bg-paper-deep rounded focus:outline-none focus:border-pin text-sm text-ink normal-case font-sans tracking-normal resize-none"
                />
              </label>
              <button type="submit" className="btn-primary w-full md:w-auto md:self-end">
                Erstellen
              </button>
            </motion.form>
          </motion.div>
        )}

        {joining && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="paper-modal-backdrop"
            onClick={() => setJoining(false)}
          >
            <motion.form
              onSubmit={submitJoin}
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="paper-card p-7 max-w-md w-full mx-4 flex flex-col gap-4 overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-2xl tracking-tight">
                  Album beitreten
                </h2>
                <button type="button" onClick={() => setJoining(false)} className="text-ink-mute hover:text-pin">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <label className="text-xs font-mono uppercase tracking-wider text-ink-mute">
                Einladungs-Code
                <input
                  autoFocus
                  required
                  maxLength={8}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABC23XYZ"
                  className="mt-1 w-full px-3 py-2 border-2 border-ink bg-paper-deep rounded focus:outline-none focus:border-pin text-2xl text-center tracking-[0.4em] font-mono"
                />
              </label>
              <button type="submit" className="btn-primary w-full md:w-auto md:self-end">
                Beitreten
              </button>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthGate>
  );
}

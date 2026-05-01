"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, UserPlus, Check, X, Users } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import AuthGate from "@/components/AuthGate";
import {
  acceptFriendRequest,
  getMyProfile,
  listFriends,
  removeFriend,
  searchProfiles,
  sendFriendRequest,
  type FriendRow,
  type ProfileLite,
} from "@/lib/friends";
import { getCurrentUser } from "@/lib/supabase";

export default function FriendsPage() {
  return (
    <AuthGate>
      <PageHeader />
      <FriendsInner />
    </AuthGate>
  );
}

function FriendsInner() {
  const [me, setMe] = useState<ProfileLite | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ProfileLite[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const refresh = async () => {
    const [u, p, list] = await Promise.all([
      getCurrentUser(),
      getMyProfile(),
      listFriends(),
    ]);
    setMyUserId(u?.id ?? null);
    setMe(p);
    setFriends(list);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  // debounced search
  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      const r = await searchProfiles(search);
      setResults(r.filter((p) => p.id !== myUserId));
      setSearching(false);
    }, 250);
    return () => clearTimeout(t);
  }, [search, myUserId]);

  const accepted = friends.filter((f) => f.status === "accepted");
  const incoming = friends.filter(
    (f) => f.status === "pending" && f.requested_by !== myUserId,
  );
  const outgoing = friends.filter(
    (f) => f.status === "pending" && f.requested_by === myUserId,
  );

  const isFriendOrPending = (uid: string) => friends.some((f) => f.friend_id === uid);

  const invite = async (uid: string) => {
    setBusy((b) => ({ ...b, [uid]: true }));
    try {
      await sendFriendRequest(uid);
      await refresh();
    } catch (e) {
      console.warn(e);
    } finally {
      setBusy((b) => ({ ...b, [uid]: false }));
    }
  };

  const accept = async (uid: string) => {
    setBusy((b) => ({ ...b, [uid]: true }));
    try {
      await acceptFriendRequest(uid);
      await refresh();
    } finally {
      setBusy((b) => ({ ...b, [uid]: false }));
    }
  };

  const remove = async (uid: string) => {
    setBusy((b) => ({ ...b, [uid]: true }));
    try {
      await removeFriend(uid);
      await refresh();
    } finally {
      setBusy((b) => ({ ...b, [uid]: false }));
    }
  };



  return (
    <main className="max-w-[1100px] mx-auto px-6 md:px-8 pt-8 pb-20 relative z-[2]">
      <div className="dashed-pill mb-3">👥 Dein Kreis</div>
      <h1 className="font-display-wonk font-black text-[clamp(40px,6vw,72px)] leading-[0.95] tracking-[-0.04em]">
        Freunde &amp; <em className="accent-italic">Profil</em>
      </h1>
      <p className="text-ink-soft mt-3 text-lg max-w-[640px]">
        Such Spieler:innen per Username, schicke Anfragen und bau dir eine Crew zum Mitspielen.
      </p>

      {loading ? (
        <div className="mt-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-ink-mute" />
        </div>
      ) : (
        <div className="mt-12 grid lg:grid-cols-[1.1fr_1fr] gap-10">
          {/* LEFT */}
          <div className="space-y-10">
            {/* PROFILE — slim link to /account */}
            <section className="paper-card p-5 flex items-center gap-4">
              <span className="avatar-bubble" style={{ width: 52, height: 52, fontSize: 22 }}>
                {me?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={me.avatar_url} alt="" />
                ) : (
                  (me?.display_name ?? "?").slice(0, 1).toUpperCase()
                )}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">{me?.display_name ?? "Dein Profil"}</div>
                {me?.username && (
                  <div className="text-xs font-mono text-pin truncate">@{me.username}</div>
                )}
                <div className="text-xs text-ink-mute mt-0.5">
                  Profil, Bio &amp; Avatar bearbeiten
                </div>
              </div>
              <a href="/account" className="btn-pill-light text-xs no-underline whitespace-nowrap">
                Bearbeiten →
              </a>
            </section>

            {/* SEARCH */}
            <section className="paper-card p-6">
              <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
                <Search className="w-5 h-5" /> Freunde finden
              </h2>
              <div className="paper-input flex items-center gap-2">
                <Search className="w-4 h-4 text-ink-mute" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Username oder Name…"
                  className="flex-1 bg-transparent outline-none border-0 p-0 font-sans text-ink"
                />
                {searching && <Loader2 className="w-4 h-4 animate-spin text-ink-mute" />}
              </div>

              {results.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {results.map((p) => {
                    const already = isFriendOrPending(p.id);
                    return (
                      <li key={p.id} className="paper-card-soft p-3 flex items-center gap-3">
                        <Avatar profile={p} />
                        <div className="flex-1 min-w-0">
                          <div className="font-bold truncate">{p.display_name}</div>
                          {p.username && (
                            <div className="text-xs font-mono text-ink-mute truncate">@{p.username}</div>
                          )}
                        </div>
                        <button
                          onClick={() => invite(p.id)}
                          disabled={already || busy[p.id]}
                          className="btn-pill-dark text-xs disabled:opacity-50"
                        >
                          {busy[p.id] ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : already ? (
                            "✓ verknüpft"
                          ) : (
                            <>
                              <UserPlus className="w-3 h-3" /> Anfrage
                            </>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {search.trim() && !searching && results.length === 0 && (
                <div className="text-sm text-ink-mute mt-4">Niemand gefunden.</div>
              )}
            </section>
          </div>

          {/* RIGHT — friends + requests */}
          <div className="space-y-10">
            {incoming.length > 0 && (
              <section className="paper-card p-6">
                <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
                  📮 Anfragen <span className="text-sm font-mono text-pin">({incoming.length})</span>
                </h2>
                <ul className="space-y-2">
                  {incoming.map((f) => (
                    <li key={f.friend_id} className="paper-card-soft p-3 flex items-center gap-3">
                      <Avatar profile={f} />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold truncate">{f.display_name}</div>
                        {f.username && (
                          <div className="text-xs font-mono text-ink-mute truncate">@{f.username}</div>
                        )}
                      </div>
                      <button
                        onClick={() => accept(f.friend_id)}
                        disabled={busy[f.friend_id]}
                        className="btn-primary text-xs"
                      >
                        {busy[f.friend_id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Check className="w-3 h-3" /> Annehmen</>}
                      </button>
                      <button
                        onClick={() => remove(f.friend_id)}
                        disabled={busy[f.friend_id]}
                        className="text-ink-mute hover:text-pin p-1"
                        title="Ablehnen"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="paper-card p-6">
              <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" /> Deine Crew
                <span className="text-sm font-mono text-ink-mute">({accepted.length})</span>
              </h2>
              {accepted.length === 0 ? (
                <p className="text-sm text-ink-mute">
                  Noch keine Freunde — such oben ein paar Spieler:innen.
                </p>
              ) : (
                <ul className="space-y-2">
                  {accepted.map((f) => (
                    <li key={f.friend_id} className="paper-card-soft p-3 flex items-center gap-3">
                      <Avatar profile={f} />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold truncate">{f.display_name}</div>
                        {f.username && (
                          <div className="text-xs font-mono text-ink-mute truncate">@{f.username}</div>
                        )}
                      </div>
                      <button
                        onClick={() => remove(f.friend_id)}
                        disabled={busy[f.friend_id]}
                        className="text-ink-mute hover:text-pin text-xs font-mono uppercase"
                      >
                        {busy[f.friend_id] ? <Loader2 className="w-3 h-3 animate-spin" /> : "Entfernen"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {outgoing.length > 0 && (
              <section className="paper-card p-6">
                <h2 className="font-display text-xl font-bold mb-4">Gesendet</h2>
                <ul className="space-y-2">
                  {outgoing.map((f) => (
                    <li key={f.friend_id} className="paper-card-soft p-3 flex items-center gap-3">
                      <Avatar profile={f} />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold truncate">{f.display_name}</div>
                        {f.username && (
                          <div className="text-xs font-mono text-ink-mute truncate">@{f.username}</div>
                        )}
                      </div>
                      <span className="text-xs font-mono text-ink-mute uppercase">Wartet…</span>
                      <button
                        onClick={() => remove(f.friend_id)}
                        disabled={busy[f.friend_id]}
                        className="text-ink-mute hover:text-pin p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function Avatar({ profile }: { profile: { display_name: string; avatar_url: string | null } }) {
  if (profile.avatar_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={profile.avatar_url} alt="" className="w-9 h-9 rounded-full border border-ink object-cover" />;
  }
  return (
    <span className="w-9 h-9 rounded-full border border-ink bg-mustard flex items-center justify-center text-sm font-bold uppercase">
      {profile.display_name.slice(0, 1)}
    </span>
  );
}

/**
 * Albums — named photo collections shareable with friends.
 *
 * An album is owned by one user, but other users can be invited via an
 * invite-code. Members get read access (and 'editor' members get write).
 * Albums are the only thing you play.
 */

import { getSupabase, isCloudEnabled } from "./supabase";
import type { Photo } from "./types";
import { getPhoto, savePhoto } from "./store";

export interface Album {
  id: string;
  owner: string;
  title: string;
  description: string | null;
  cover_photo: string | null;
  invite_code: string;
  created_at: string;
  // Hydrated client-side:
  photo_count?: number;
  member_count?: number;
  my_role?: AlbumRole;
}

export type AlbumRole = "owner" | "editor" | "player";

export interface AlbumMember {
  member: string;
  role: AlbumRole;
  joined_at: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
}

export interface AlbumPhotoRef {
  id: string;
  position: number;
  added_by: string;
  caption: string | null;
  story: string | null;
  hints: string[] | null;
  difficulty: number;
  thumb_path: string;
  storage_path: string;
}

function genInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export async function listMyAlbums(): Promise<Album[]> {
  if (!isCloudEnabled()) return [];
  const sb = getSupabase();
  if (!sb) return [];
  const { data: u } = await sb.auth.getUser();
  const me = u.user?.id;
  if (!me) return [];

  // Albums where I'm a member (owner trigger ensures owners are members too)
  const { data: memberRows, error } = await sb
    .from("album_members")
    .select("album_id, role")
    .eq("member", me);
  if (error) {
    console.warn("[albums] listMyAlbums member fetch", error);
    return [];
  }
  const ids = (memberRows ?? []).map((r) => (r as { album_id: string }).album_id);
  if (ids.length === 0) return [];

  const { data: albums, error: e2 } = await sb
    .from("albums")
    .select("id, owner, title, description, cover_photo, invite_code, created_at")
    .in("id", ids)
    .order("created_at", { ascending: false });
  if (e2) {
    console.warn("[albums] listMyAlbums albums fetch", e2);
    return [];
  }

  // Counts
  const counts = await Promise.all(
    (albums ?? []).map(async (a) => {
      const id = (a as { id: string }).id;
      const [{ count: pc }, { count: mc }] = await Promise.all([
        sb.from("album_photos").select("*", { count: "exact", head: true }).eq("album_id", id),
        sb.from("album_members").select("*", { count: "exact", head: true }).eq("album_id", id),
      ]);
      return { id, pc: pc ?? 0, mc: mc ?? 0 };
    })
  );
  const cm = new Map(counts.map((c) => [c.id, c]));
  const roleMap = new Map(
    (memberRows ?? []).map((r) => [
      (r as { album_id: string }).album_id,
      (r as { role: AlbumRole }).role,
    ])
  );

  return (albums ?? []).map((a) => {
    const al = a as Album;
    const c = cm.get(al.id);
    return {
      ...al,
      photo_count: c?.pc ?? 0,
      member_count: c?.mc ?? 0,
      my_role: roleMap.get(al.id) ?? "player",
    };
  });
}

export async function createAlbum(args: {
  title: string;
  description?: string;
}): Promise<Album> {
  const sb = getSupabase();
  if (!sb) throw new Error("Cloud-Modus nicht konfiguriert.");
  const { data: u } = await sb.auth.getUser();
  const me = u.user?.id;
  if (!me) throw new Error("Bitte zuerst anmelden.");

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = genInviteCode();
    const { data, error } = await sb
      .from("albums")
      .insert({
        owner: me,
        title: args.title.trim().slice(0, 80),
        description: args.description?.trim().slice(0, 500) || null,
        invite_code: code,
      })
      .select()
      .single();
    if (!error && data) return data as Album;
    if (error && !error.message.toLowerCase().includes("duplicate")) {
      throw error;
    }
  }
  throw new Error("Konnte keinen Album-Code generieren.");
}

export async function updateAlbum(id: string, patch: {
  title?: string;
  description?: string;
  cover_photo?: string | null;
}): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Cloud-Modus nicht konfiguriert.");
  const cleaned: Record<string, string | null> = {};
  if (patch.title !== undefined) {
    const v = patch.title.trim().slice(0, 80);
    if (!v) throw new Error("Titel darf nicht leer sein.");
    cleaned.title = v;
  }
  if (patch.description !== undefined) {
    cleaned.description = patch.description.trim().slice(0, 500) || null;
  }
  if (patch.cover_photo !== undefined) cleaned.cover_photo = patch.cover_photo;
  const { error } = await sb.from("albums").update(cleaned).eq("id", id);
  if (error) throw error;
}

export async function deleteAlbum(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Cloud-Modus nicht konfiguriert.");
  const { error } = await sb.from("albums").delete().eq("id", id);
  if (error) throw error;
}

export async function getAlbumByInviteCode(code: string): Promise<Album | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb
    .from("albums")
    .select("id, owner, title, description, cover_photo, invite_code, created_at")
    .eq("invite_code", code.toUpperCase())
    .maybeSingle();
  return (data as Album | null) ?? null;
}

export async function joinAlbumByCode(code: string): Promise<Album> {
  const album = await getAlbumByInviteCode(code);
  if (!album) throw new Error("Album nicht gefunden.");
  const sb = getSupabase()!;
  const { data: u } = await sb.auth.getUser();
  const me = u.user?.id;
  if (!me) throw new Error("Bitte zuerst anmelden.");
  const { error } = await sb
    .from("album_members")
    .insert({ album_id: album.id, member: me, role: "player" });
  // Ignore duplicate-key errors — already a member is fine.
  if (error && !error.message.toLowerCase().includes("duplicate")) {
    throw error;
  }
  return album;
}

export async function leaveAlbum(albumId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Cloud-Modus nicht konfiguriert.");
  const { data: u } = await sb.auth.getUser();
  const me = u.user?.id;
  if (!me) throw new Error("Bitte zuerst anmelden.");
  const { error } = await sb
    .from("album_members")
    .delete()
    .eq("album_id", albumId)
    .eq("member", me);
  if (error) throw error;
}

export async function inviteFriendToAlbum(args: {
  albumId: string;
  friendId: string;
  role?: "editor" | "player";
}): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Cloud-Modus nicht konfiguriert.");
  // Owner can write any row via the owner-manage policy. To use insert path
  // we upsert (owner-manage covers update/delete; insert for self-join only).
  // So we use upsert with service-equivalent: owner can insert because the
  // self-join policy requires member = auth.uid(), which won't apply for an
  // owner inviting someone else. We use rpc fallback: just call an insert
  // and rely on the album_members table; if it fails, show the error.
  const { error } = await sb
    .from("album_members")
    .insert({
      album_id: args.albumId,
      member: args.friendId,
      role: args.role ?? "player",
    });
  if (error) throw error;
}

export async function setMemberRole(args: {
  albumId: string;
  memberId: string;
  role: AlbumRole;
}): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Cloud-Modus nicht konfiguriert.");
  const { error } = await sb
    .from("album_members")
    .update({ role: args.role })
    .eq("album_id", args.albumId)
    .eq("member", args.memberId);
  if (error) throw error;
}

export async function removeMember(albumId: string, memberId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Cloud-Modus nicht konfiguriert.");
  const { error } = await sb
    .from("album_members")
    .delete()
    .eq("album_id", albumId)
    .eq("member", memberId);
  if (error) throw error;
}

export async function listAlbumMembers(albumId: string): Promise<AlbumMember[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data: rows, error } = await sb
    .from("album_members")
    .select("member, role, joined_at")
    .eq("album_id", albumId);
  if (error || !rows) return [];

  const ids = (rows as { member: string }[]).map((r) => r.member);
  if (ids.length === 0) return [];
  const { data: profs } = await sb
    .from("profiles")
    .select("id, display_name, username, avatar_url")
    .in("id", ids);
  const pm = new Map(
    (profs ?? []).map((p) => [
      (p as { id: string }).id,
      p as { id: string; display_name: string; username: string | null; avatar_url: string | null },
    ])
  );
  return (rows as { member: string; role: AlbumRole; joined_at: string }[]).map((r) => {
    const p = pm.get(r.member);
    return {
      member: r.member,
      role: r.role,
      joined_at: r.joined_at,
      display_name: p?.display_name ?? "?",
      username: p?.username ?? null,
      avatar_url: p?.avatar_url ?? null,
    };
  });
}

export async function listAlbumPhotos(albumId: string): Promise<AlbumPhotoRef[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data: links } = await sb
    .from("album_photos")
    .select("photo_id, position, added_by")
    .eq("album_id", albumId)
    .order("position", { ascending: true });
  if (!links || links.length === 0) return [];
  const ids = links.map((l) => (l as { photo_id: string }).photo_id);
  const { data: photos } = await sb
    .from("photos")
    .select("id, caption, story, hints, difficulty, thumb_path, storage_path")
    .in("id", ids);
  const pm = new Map(
    (photos ?? []).map((p) => [(p as { id: string }).id, p as Record<string, unknown>])
  );
  return links
    .map((l) => {
      const ll = l as { photo_id: string; position: number; added_by: string };
      const p = pm.get(ll.photo_id);
      if (!p) return null;
      return {
        id: ll.photo_id,
        position: ll.position,
        added_by: ll.added_by,
        caption: (p.caption as string | null) ?? null,
        story: (p.story as string | null) ?? null,
        hints: (p.hints as string[] | null) ?? null,
        difficulty: (p.difficulty as number) ?? 3,
        thumb_path: (p.thumb_path as string) ?? "",
        storage_path: (p.storage_path as string) ?? "",
      } satisfies AlbumPhotoRef;
    })
    .filter((x): x is AlbumPhotoRef => !!x);
}

export async function addPhotosToAlbum(albumId: string, photoIds: string[]): Promise<void> {
  if (photoIds.length === 0) return;
  const sb = getSupabase();
  if (!sb) throw new Error("Cloud-Modus nicht konfiguriert.");
  const { data: u } = await sb.auth.getUser();
  const me = u.user?.id;
  if (!me) throw new Error("Bitte zuerst anmelden.");

  // Find next position
  const { data: max } = await sb
    .from("album_photos")
    .select("position")
    .eq("album_id", albumId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  let pos = ((max as { position: number } | null)?.position ?? -1) + 1;

  const rows = photoIds.map((pid) => ({
    album_id: albumId,
    photo_id: pid,
    added_by: me,
    position: pos++,
  }));
  // upsert ignores duplicates on the composite PK
  const { error } = await sb
    .from("album_photos")
    .upsert(rows, { onConflict: "album_id,photo_id", ignoreDuplicates: true });
  if (error) throw error;
}

export async function removePhotoFromAlbum(albumId: string, photoId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Cloud-Modus nicht konfiguriert.");
  const { error } = await sb
    .from("album_photos")
    .delete()
    .eq("album_id", albumId)
    .eq("photo_id", photoId);
  if (error) throw error;
}

export async function getAlbum(id: string): Promise<Album | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb
    .from("albums")
    .select("id, owner, title, description, cover_photo, invite_code, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const { data: u } = await sb.auth.getUser();
  const me = u.user?.id;
  let myRole: AlbumRole = "player";
  if (me) {
    const { data: m } = await sb
      .from("album_members")
      .select("role")
      .eq("album_id", id)
      .eq("member", me)
      .maybeSingle();
    if (m) myRole = (m as { role: AlbumRole }).role;
  }
  return { ...(data as Album), my_role: myRole };
}

/**
 * Build a signed URL for an album photo, picking thumb or full.
 * Returns null if not accessible.
 */
export async function albumPhotoUrl(
  path: string,
  bucket: "photos" | "thumbs" = "photos",
  expiresSec = 60 * 60
): Promise<string | null> {
  const sb = getSupabase();
  if (!sb || !path) return null;
  const { data, error } = await sb.storage.from(bucket).createSignedUrl(path, expiresSec);
  if (error || !data) return null;
  return data.signedUrl;
}

/**
 * Load all photos in an album as runtime `Photo` objects (with blobs ready
 * for `<img>` rendering). For each linked photo we use the local IndexedDB
 * cache when available, otherwise we fetch the blob from the photos bucket
 * via a signed URL and store it locally for next time.
 */
export async function loadAlbumPlayPhotos(albumId: string): Promise<Photo[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data: links } = await sb
    .from("album_photos")
    .select("photo_id, position")
    .eq("album_id", albumId)
    .order("position", { ascending: true });
  if (!links || links.length === 0) return [];
  const ids = (links as { photo_id: string; position: number }[]).map((l) => l.photo_id);

  const { data: rows } = await sb
    .from("photos")
    .select(
      "id, lat, lng, taken_at, caption, story, hints, difficulty, auto_difficulty, storage_path, thumb_path"
    )
    .in("id", ids);
  if (!rows) return [];

  const meta = new Map(
    (rows as Array<{
      id: string;
      lat: number;
      lng: number;
      taken_at: string | null;
      caption: string | null;
      story: string | null;
      hints: string[] | null;
      difficulty: number;
      auto_difficulty: number | null;
      storage_path: string | null;
      thumb_path: string | null;
    }>).map((r) => [r.id, r])
  );

  const out: Photo[] = [];
  for (const id of ids) {
    const row = meta.get(id);
    if (!row) continue;
    const local = await getPhoto(id);
    if (local && local.blob) {
      out.push(local);
      continue;
    }
    // Fetch blob from storage via signed URL.
    if (!row.storage_path) continue;
    const photoSigned = await sb.storage
      .from("photos")
      .createSignedUrl(row.storage_path, 60 * 30);
    const thumbSigned = row.thumb_path
      ? await sb.storage.from("thumbs").createSignedUrl(row.thumb_path, 60 * 30)
      : null;
    if (!photoSigned.data?.signedUrl) continue;
    try {
      const [blobRes, thumbRes] = await Promise.all([
        fetch(photoSigned.data.signedUrl),
        thumbSigned?.data?.signedUrl
          ? fetch(thumbSigned.data.signedUrl)
          : Promise.resolve(null),
      ]);
      if (!blobRes.ok) continue;
      const blob = await blobRes.blob();
      const thumb = thumbRes && thumbRes.ok ? await thumbRes.blob() : blob;
      const photo: Photo = {
        id,
        blob,
        thumbBlob: thumb,
        lat: row.lat,
        lng: row.lng,
        takenAt: row.taken_at ? new Date(row.taken_at).getTime() : undefined,
        caption: row.caption ?? undefined,
        story: row.story ?? undefined,
        hints: row.hints ?? undefined,
        difficulty: (row.difficulty ?? 3) as Photo["difficulty"],
        autoDifficulty: (row.auto_difficulty ?? undefined) as Photo["autoDifficulty"],
        source: "exif",
        createdAt: row.taken_at ? new Date(row.taken_at).getTime() : Date.now(),
      };
      await savePhoto(photo);
      out.push(photo);
    } catch (err) {
      console.warn("[album] failed to fetch photo", id, err);
    }
  }
  return out;
}


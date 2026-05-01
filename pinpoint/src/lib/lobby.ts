/**
 * Cloud-Lobbies — share a set of photos/lanes via 6-character code.
 * Anyone with the code can SELECT (RLS-friendly) and join the lobby.
 */

import { getSupabase } from "./supabase";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // unambiguous

function genCode(len = 6): string {
  let s = "";
  const buf = new Uint32Array(len);
  crypto.getRandomValues(buf);
  for (let i = 0; i < len; i++) s += ALPHABET[buf[i] % ALPHABET.length];
  return s;
}

export interface LobbyPayload {
  id: string;
  code: string;
  title: string;
  album_id: string | null;
  photo_ids: string[];
  lane_ids: string[];
  owner: string;
  created_at: string;
  expires_at: string | null;
}

export async function createLobby(args: {
  title: string;
  albumId?: string | null;
  photoIds: string[];
  laneIds?: string[];
  expiresAt?: Date | null;
}): Promise<LobbyPayload> {
  const sb = getSupabase();
  if (!sb) throw new Error("Cloud-Modus nicht konfiguriert.");
  const { data: userData } = await sb.auth.getUser();
  const user = userData.user;
  if (!user) throw new Error("Bitte zuerst anmelden.");

  // try a few times in the unlikely event of collision
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = genCode();
    const { data, error } = await sb
      .from("lobbies")
      .insert({
        owner: user.id,
        code,
        title: args.title,
        album_id: args.albumId ?? null,
        photo_ids: args.photoIds,
        lane_ids: args.laneIds ?? [],
        expires_at: args.expiresAt ? args.expiresAt.toISOString() : null,
      })
      .select()
      .single();
    if (!error && data) return data as LobbyPayload;
    if (error && !error.message.includes("duplicate")) throw error;
  }
  throw new Error("Konnte keinen Lobby-Code generieren.");
}

export async function fetchLobbyByCode(code: string): Promise<LobbyPayload | null> {
  const sb = getSupabase();
  if (!sb) throw new Error("Cloud-Modus nicht konfiguriert.");
  const { data, error } = await sb
    .from("lobbies")
    .select("*")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (error) throw error;
  const lobby = (data as LobbyPayload | null) ?? null;
  if (!lobby) return null;
  if (lobby.expires_at && new Date(lobby.expires_at).getTime() < Date.now()) {
    throw new Error("Lobby ist abgelaufen.");
  }
  return lobby;
}

/**
 * Fetch signed URLs for photo blobs in a lobby. Caller can stream them
 * straight into the existing Game component.
 *
 * SECURITY: this intentionally does NOT return `lat/lng`. Lobby play must
 * route the final score through the `validate-score` Edge Function (see
 * `submitValidatedSession` in lib/leaderboard.ts), which reads the truth
 * from the photos table via service-role. Clients only see the truth on
 * the reveal screen if/when the server returns it for the current round.
 */
export async function fetchLobbyPhotos(lobby: LobbyPayload) {
  const sb = getSupabase();
  if (!sb) throw new Error("Cloud-Modus nicht konfiguriert.");
  const { data: photos, error } = await sb
    .from("photos")
    .select("id, difficulty, auto_difficulty, caption, hints, taken_at, storage_path, thumb_path")
    .in("id", lobby.photo_ids);
  if (error) throw error;
  if (!photos || photos.length === 0) return [];

  // Fetch signed URLs in batch
  const signed = await Promise.all(
    photos.map(async (p) => {
      const [{ data: full }, { data: thumb }] = await Promise.all([
        sb.storage.from("photos").createSignedUrl(p.storage_path, 60 * 30),
        sb.storage.from("thumbs").createSignedUrl(p.thumb_path, 60 * 30),
      ]);
      return { ...p, fullUrl: full?.signedUrl, thumbUrl: thumb?.signedUrl };
    })
  );
  return signed;
}

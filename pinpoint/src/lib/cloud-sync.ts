/**
 * Cloud sync — opt-in upload of local IndexedDB photos & lanes to Supabase.
 *
 * The local-first store remains the source of truth; this module mirrors
 * data into Supabase when the user is signed in, so other devices/players
 * can join via lobby code.
 */

import { getSupabase, isCloudEnabled } from "./supabase";
import { listLanes, listPhotos, savePhoto, getPhoto } from "./store";
import type { Lane, Photo } from "./types";

export async function uploadPhoto(photo: Photo, visibility: "private" | "friends" | "public" = "private") {
  const sb = getSupabase();
  if (!sb) throw new Error("Cloud-Modus nicht konfiguriert.");
  const { data: userData } = await sb.auth.getUser();
  const user = userData.user;
  if (!user) throw new Error("Bitte zuerst anmelden.");

  const photoPath = `${user.id}/${photo.id}.jpg`;
  const thumbPath = `${user.id}/${photo.id}.jpg`;

  const [, thumbUp] = await Promise.all([
    sb.storage.from("photos").upload(photoPath, photo.blob, {
      contentType: "image/jpeg",
      upsert: true,
    }),
    sb.storage.from("thumbs").upload(thumbPath, photo.thumbBlob, {
      contentType: "image/jpeg",
      upsert: true,
    }),
  ]);
  if (thumbUp.error) throw thumbUp.error;

  const { error } = await sb.from("photos").upsert({
    id: photo.id,
    owner: user.id,
    storage_path: photoPath,
    thumb_path: thumbPath,
    lat: photo.lat,
    lng: photo.lng,
    taken_at: photo.takenAt ? new Date(photo.takenAt).toISOString() : null,
    caption: photo.caption ?? null,
    story: photo.story ?? null,
    hints: photo.hints ?? [],
    difficulty: photo.difficulty,
    auto_difficulty: photo.autoDifficulty ?? null,
    visibility,
  });
  if (error) throw error;
}

export async function uploadLane(lane: Lane, visibility: "private" | "friends" | "public" = "private") {
  const sb = getSupabase();
  if (!sb) throw new Error("Cloud-Modus nicht konfiguriert.");
  const { data: userData } = await sb.auth.getUser();
  const user = userData.user;
  if (!user) throw new Error("Bitte zuerst anmelden.");

  const { error: laneErr } = await sb.from("lanes").upsert({
    id: lane.id,
    owner: user.id,
    title: lane.title,
    description: lane.description ?? null,
    cover_photo: lane.coverPhotoId ?? null,
    visibility,
  });
  if (laneErr) throw laneErr;

  // Replace lane_photos
  await sb.from("lane_photos").delete().eq("lane_id", lane.id);
  const rows = lane.photoIds.map((pid, i) => ({
    lane_id: lane.id,
    photo_id: pid,
    position: i,
  }));
  if (rows.length > 0) {
    const { error } = await sb.from("lane_photos").insert(rows);
    if (error) throw error;
  }
}

/**
 * Convenience: push everything that's not in the cloud yet.
 */
export async function syncAllToCloud(onProgress?: (msg: string) => void) {
  if (!isCloudEnabled()) throw new Error("Cloud-Modus nicht konfiguriert.");
  const photos = await listPhotos();
  const lanes = await listLanes();
  let i = 0;
  for (const p of photos) {
    onProgress?.(`Foto ${++i}/${photos.length}`);
    await uploadPhoto(p);
  }
  i = 0;
  for (const l of lanes) {
    onProgress?.(`Lane ${++i}/${lanes.length}`);
    await uploadLane(l);
  }
}

/**
 * Best-effort cloud delete for a photo. Removes the row (RLS limits this
 * to the owner) and tries to delete both storage objects. Errors are
 * swallowed because the local delete must always succeed; we log so the
 * caller can surface a toast.
 */
export async function deletePhotoFromCloud(photoId: string): Promise<{ removed: boolean; reason?: string }> {
  if (!isCloudEnabled()) return { removed: false, reason: "cloud-disabled" };
  const sb = getSupabase();
  if (!sb) return { removed: false, reason: "no-client" };
  const { data: userData } = await sb.auth.getUser();
  const user = userData.user;
  if (!user) return { removed: false, reason: "not-signed-in" };

  const photoPath = `${user.id}/${photoId}.jpg`;
  // Remove storage objects first; if the row delete fails we still want
  // the blobs gone so quota stays clean.
  try {
    await Promise.all([
      sb.storage.from("photos").remove([photoPath]),
      sb.storage.from("thumbs").remove([photoPath]),
    ]);
  } catch {
    // ignore — bucket may already be empty for this id
  }

  const { error } = await sb.from("photos").delete().eq("id", photoId).eq("owner", user.id);
  if (error) return { removed: false, reason: error.message };
  return { removed: true };
}

export async function deleteLaneFromCloud(laneId: string): Promise<{ removed: boolean; reason?: string }> {
  if (!isCloudEnabled()) return { removed: false, reason: "cloud-disabled" };
  const sb = getSupabase();
  if (!sb) return { removed: false, reason: "no-client" };
  const { data: userData } = await sb.auth.getUser();
  const user = userData.user;
  if (!user) return { removed: false, reason: "not-signed-in" };
  const { error } = await sb.from("lanes").delete().eq("id", laneId).eq("owner", user.id);
  if (error) return { removed: false, reason: error.message };
  return { removed: true };
}

/**
 * Pull all photos the current user can access (own + via album membership)
 * down to IndexedDB so play works offline. This is the fix for "photos
 * disappeared on a different device" — IndexedDB is per-device so we now
 * treat the cloud as the source of truth and rehydrate locally on login.
 */
export async function restoreFromCloud(opts?: {
  onProgress?: (msg: string, current: number, total: number) => void;
  signal?: AbortSignal;
}): Promise<{ restored: number; skipped: number; failed: number }> {
  if (!isCloudEnabled()) return { restored: 0, skipped: 0, failed: 0 };
  const sb = getSupabase();
  if (!sb) return { restored: 0, skipped: 0, failed: 0 };
  const { data: userData } = await sb.auth.getUser();
  const user = userData.user;
  if (!user) return { restored: 0, skipped: 0, failed: 0 };

  const { data: rows, error } = await sb
    .from("photos")
    .select(
      "id, owner, lat, lng, taken_at, caption, story, hints, difficulty, auto_difficulty, storage_path, thumb_path"
    );
  if (error) {
    console.warn("[restore] photos fetch failed", error);
    return { restored: 0, skipped: 0, failed: 0 };
  }
  const list = rows ?? [];
  let restored = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < list.length; i++) {
    if (opts?.signal?.aborted) break;
    const row = list[i] as {
      id: string;
      owner: string;
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
    };
    opts?.onProgress?.(`Foto ${i + 1}/${list.length}`, i + 1, list.length);

    const existing = await getPhoto(row.id);
    if (existing && existing.blob && existing.thumbBlob) {
      skipped++;
      continue;
    }

    try {
      // For own photos we can use the photos bucket (private, RLS lets owner read).
      // For others' photos, the photos bucket policy denies us — we fall back to
      // signed URLs which the server can issue if RLS allows. Easiest is to use
      // signed URLs for both: works regardless of bucket visibility.
      const photoSigned = row.storage_path
        ? await sb.storage.from("photos").createSignedUrl(row.storage_path, 60 * 10)
        : null;
      const thumbSigned = row.thumb_path
        ? await sb.storage.from("thumbs").createSignedUrl(row.thumb_path, 60 * 10)
        : null;

      const blobUrl = photoSigned?.data?.signedUrl;
      const thumbUrl = thumbSigned?.data?.signedUrl;
      if (!blobUrl) {
        failed++;
        continue;
      }
      const [blobRes, thumbRes] = await Promise.all([
        fetch(blobUrl),
        thumbUrl ? fetch(thumbUrl) : Promise.resolve(null),
      ]);
      if (!blobRes.ok) {
        failed++;
        continue;
      }
      const blob = await blobRes.blob();
      const thumb = thumbRes && thumbRes.ok ? await thumbRes.blob() : blob;

      const photo: Photo = {
        id: row.id,
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
      restored++;
    } catch (err) {
      console.warn("[restore] photo failed", row.id, err);
      failed++;
    }
  }
  return { restored, skipped, failed };
}

let restorePromise: Promise<unknown> | null = null;
/**
 * Idempotent: kicks off restoreFromCloud once per session. Subsequent calls
 * resolve to the same promise. Safe to call from multiple components.
 */
export function ensureCloudRestore() {
  if (restorePromise) return restorePromise;
  restorePromise = restoreFromCloud().catch((err) => {
    console.warn("[restore] failed", err);
  });
  return restorePromise;
}


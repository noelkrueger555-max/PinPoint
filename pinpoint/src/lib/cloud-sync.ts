/**
 * Cloud sync — opt-in upload of local IndexedDB photos & lanes to Supabase.
 *
 * The local-first store remains the source of truth; this module mirrors
 * data into Supabase when the user is signed in, so other devices/players
 * can join via lobby code.
 */

import { getSupabase, isCloudEnabled } from "./supabase";
import { listLanes, listPhotos } from "./store";
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

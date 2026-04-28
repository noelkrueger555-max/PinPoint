"use client";

import { listLanes, listPhotos, savePhoto, saveLane, newId } from "./store";
import type { Lane, Photo } from "./types";

const FORMAT_VERSION = 1;

interface SerializedPhoto extends Omit<Photo, "blob" | "thumbBlob"> {
  blobBase64: string;
  blobMime: string;
  thumbBase64: string;
  thumbMime: string;
}

interface ExportFile {
  format: "pinpoint";
  version: number;
  exportedAt: number;
  title?: string;
  photos: SerializedPhoto[];
  lanes: Lane[];
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(
      ...bytes.subarray(i, Math.min(i + chunk, bytes.length))
    );
  }
  return btoa(binary);
}

function base64ToBlob(b64: string, mime: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export async function exportLobby(title?: string): Promise<Blob> {
  const [photos, lanes] = await Promise.all([listPhotos(), listLanes()]);
  const serialized: SerializedPhoto[] = await Promise.all(
    photos.map(async (p) => ({
      id: p.id,
      lat: p.lat,
      lng: p.lng,
      takenAt: p.takenAt,
      caption: p.caption,
      story: p.story,
      difficulty: p.difficulty,
      autoDifficulty: p.autoDifficulty,
      source: p.source,
      createdAt: p.createdAt,
      blobBase64: await blobToBase64(p.blob),
      blobMime: p.blob.type || "image/jpeg",
      thumbBase64: await blobToBase64(p.thumbBlob),
      thumbMime: p.thumbBlob.type || "image/jpeg",
    }))
  );
  const file: ExportFile = {
    format: "pinpoint",
    version: FORMAT_VERSION,
    exportedAt: Date.now(),
    title,
    photos: serialized,
    lanes,
  };
  const json = JSON.stringify(file);
  return new Blob([json], { type: "application/json" });
}

export interface ImportResult {
  photosAdded: number;
  lanesAdded: number;
  title?: string;
}

export async function importLobby(file: File): Promise<ImportResult> {
  const text = await file.text();
  const data = JSON.parse(text) as ExportFile;
  if (data.format !== "pinpoint") {
    throw new Error("Keine gültige PinPoint-Datei.");
  }
  if (data.version > FORMAT_VERSION) {
    throw new Error("Diese Datei stammt aus einer neueren Version.");
  }

  // Re-key on import so we never overwrite local photos by ID
  const idMap = new Map<string, string>();
  for (const sp of data.photos) {
    const newPhotoId = newId();
    idMap.set(sp.id, newPhotoId);
    const photo: Photo = {
      id: newPhotoId,
      lat: sp.lat,
      lng: sp.lng,
      takenAt: sp.takenAt,
      caption: sp.caption,
      story: sp.story,
      difficulty: sp.difficulty,
      autoDifficulty: sp.autoDifficulty,
      source: sp.source,
      createdAt: sp.createdAt,
      blob: base64ToBlob(sp.blobBase64, sp.blobMime),
      thumbBlob: base64ToBlob(sp.thumbBase64, sp.thumbMime),
    };
    await savePhoto(photo);
  }

  for (const l of data.lanes) {
    const lane: Lane = {
      id: newId(),
      title: l.title,
      description: l.description,
      coverPhotoId: l.coverPhotoId ? idMap.get(l.coverPhotoId) : undefined,
      photoIds: l.photoIds.map((pid) => idMap.get(pid)).filter((x): x is string => !!x),
      createdAt: l.createdAt,
    };
    if (lane.photoIds.length > 0) await saveLane(lane);
  }

  return {
    photosAdded: data.photos.length,
    lanesAdded: data.lanes.length,
    title: data.title,
  };
}

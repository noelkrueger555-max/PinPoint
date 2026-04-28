"use client";

import { get, set, del, keys } from "idb-keyval";
import type { Lane, Photo } from "./types";

const PHOTO_PREFIX = "photo:";
const LANE_PREFIX = "lane:";

function key(id: string) {
  return `${PHOTO_PREFIX}${id}`;
}
function laneKey(id: string) {
  return `${LANE_PREFIX}${id}`;
}

export async function savePhoto(photo: Photo): Promise<void> {
  await set(key(photo.id), photo);
}

export async function getPhoto(id: string): Promise<Photo | undefined> {
  return get<Photo>(key(id));
}

export async function deletePhoto(id: string): Promise<void> {
  await del(key(id));
}

export async function listPhotos(): Promise<Photo[]> {
  const allKeys = await keys();
  const photoKeys = allKeys.filter(
    (k) => typeof k === "string" && k.startsWith(PHOTO_PREFIX)
  );
  const photos = await Promise.all(photoKeys.map((k) => get<Photo>(k)));
  return photos
    .filter((p): p is Photo => !!p)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function newId(): string {
  return crypto.randomUUID();
}

// === Lanes ===

export async function saveLane(lane: Lane): Promise<void> {
  await set(laneKey(lane.id), lane);
}

export async function getLane(id: string): Promise<Lane | undefined> {
  return get<Lane>(laneKey(id));
}

export async function deleteLane(id: string): Promise<void> {
  await del(laneKey(id));
}

export async function listLanes(): Promise<Lane[]> {
  const allKeys = await keys();
  const laneKeys = allKeys.filter(
    (k) => typeof k === "string" && k.startsWith(LANE_PREFIX)
  );
  const lanes = await Promise.all(laneKeys.map((k) => get<Lane>(k)));
  return lanes
    .filter((l): l is Lane => !!l)
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** Cache of object URLs so we don't leak. */
const urlCache = new Map<string, string>();

export function blobUrl(id: string, blob: Blob): string {
  const cached = urlCache.get(id);
  if (cached) return cached;
  const url = URL.createObjectURL(blob);
  urlCache.set(id, url);
  return url;
}

export function revokeBlobUrl(id: string) {
  const url = urlCache.get(id);
  if (url) {
    URL.revokeObjectURL(url);
    urlCache.delete(id);
  }
}

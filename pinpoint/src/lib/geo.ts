import { DIFFICULTY_MULTIPLIER, type Difficulty } from "./types";

const EARTH_RADIUS_KM = 6371;

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export interface ScoreParams {
  distanceKm: number;
  difficulty: Difficulty;
  /** scale: ~2000 = world, ~50 = local */
  scale?: number;
  hintsPenalty?: number; // 0..1 (0.3 = -30%)
}

export function calcScore({
  distanceKm,
  difficulty,
  scale = 2000,
  hintsPenalty = 0,
}: ScoreParams): number {
  const base = 5000 * Math.exp(-distanceKm / scale);
  const withDiff = base * DIFFICULTY_MULTIPLIER[difficulty];
  const final = withDiff * (1 - hintsPenalty);
  return Math.max(0, Math.round(final));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 100) return `${km.toFixed(1)} km`;
  return `${Math.round(km).toLocaleString("de-DE")} km`;
}

/**
 * Mapbox helpers — opt-in via NEXT_PUBLIC_MAPBOX_TOKEN.
 *
 * Falls back gracefully if no token is set: every helper returns null/empty
 * and the rest of the app keeps working with the demo MapLibre raster style
 * + manual pinning.
 *
 * Uses the Mapbox Geocoding v6 REST API and the Mapbox Styles API — no
 * additional SDK bundle weight (we keep maplibre-gl as the renderer; it is
 * fully compatible with Mapbox style URLs).
 */

export function getMapboxToken(): string | null {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  return token && token.length > 10 ? token : null;
}

export function isMapboxEnabled(): boolean {
  return getMapboxToken() !== null;
}

export interface PlaceSuggestion {
  placeId: string;
  primary: string;
  secondary: string;
  /** Mapbox returns coords with the forward result, so we cache them here. */
  lat?: number;
  lng?: number;
}

export interface PlaceLocation {
  lat: number;
  lng: number;
  formatted: string;
}

/**
 * Mapbox style URL — works directly with maplibre-gl.
 * Default: `mapbox/streets-v12`. Pass any `{user}/{styleId}` to override.
 * Docs: https://docs.mapbox.com/api/maps/styles/
 */
export function mapboxStyleUrl(style = "mapbox/streets-v12"): string | null {
  const token = getMapboxToken();
  if (!token) return null;
  return `https://api.mapbox.com/styles/v1/${style}?access_token=${encodeURIComponent(token)}`;
}

/**
 * Mapbox satellite-streets style URL (hybrid imagery + labels).
 */
export function mapboxSatelliteStyleUrl(): string | null {
  return mapboxStyleUrl("mapbox/satellite-streets-v12");
}

/**
 * Forward geocoding via Mapbox Geocoding v6 (Search API).
 * Docs: https://docs.mapbox.com/api/search/geocoding/
 */
export async function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
  const token = getMapboxToken();
  if (!token || !query.trim()) return [];

  const url =
    `https://api.mapbox.com/search/geocode/v6/forward` +
    `?q=${encodeURIComponent(query)}` +
    `&limit=6&language=de` +
    `&access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as {
    features?: Array<{
      id: string;
      properties?: {
        name?: string;
        full_address?: string;
        place_formatted?: string;
        coordinates?: { latitude?: number; longitude?: number };
      };
      geometry?: { coordinates?: [number, number] };
    }>;
  };
  return (data.features ?? []).map((f) => {
    const coords = f.geometry?.coordinates;
    const propCoords = f.properties?.coordinates;
    const lng = coords?.[0] ?? propCoords?.longitude;
    const lat = coords?.[1] ?? propCoords?.latitude;
    return {
      placeId: f.id,
      primary: f.properties?.name ?? f.properties?.full_address ?? "",
      secondary: f.properties?.place_formatted ?? f.properties?.full_address ?? "",
      lat: typeof lat === "number" ? lat : undefined,
      lng: typeof lng === "number" ? lng : undefined,
    };
  });
}

/**
 * Resolve a suggestion from `searchPlaces()` to lat/lng.
 *
 * Mapbox returns coordinates inline with the forward result, so most calls
 * are a no-op. We keep the async signature for API parity with the previous
 * Google Places helper.
 */
export async function resolvePlace(suggestion: PlaceSuggestion): Promise<PlaceLocation | null> {
  if (typeof suggestion.lat === "number" && typeof suggestion.lng === "number") {
    return {
      lat: suggestion.lat,
      lng: suggestion.lng,
      formatted: suggestion.secondary || suggestion.primary,
    };
  }
  return null;
}

/**
 * Reverse-Geocoding via Mapbox Geocoding v6.
 * Returns a short human-readable label like "Florenz, Italien".
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const token = getMapboxToken();
  if (!token) return null;
  const url =
    `https://api.mapbox.com/search/geocode/v6/reverse` +
    `?longitude=${lng}&latitude=${lat}` +
    `&types=place,region,country&language=de` +
    `&access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as {
    features?: Array<{ properties?: { full_address?: string; name?: string; place_formatted?: string } }>;
  };
  const f = data.features?.[0];
  return f?.properties?.place_formatted ?? f?.properties?.full_address ?? f?.properties?.name ?? null;
}

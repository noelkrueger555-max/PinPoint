"use client";

import maplibregl, { type LngLatLike, type Map as MlMap } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { mapboxStyleUrl, isMapboxEnabled } from "@/lib/mapbox";

// Default fallback: free OSM raster tiles. Used when no Mapbox token is set
// or when the Mapbox style fails to load. Keeps the app usable everywhere.
const FALLBACK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: [
        "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
      maxzoom: 19,
    },
  },
  layers: [
    { id: "osm-bg", type: "background", paint: { "background-color": "#dfd6bd" } },
    { id: "osm", type: "raster", source: "osm" },
  ],
};

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  color?: string;
  label?: string;
}

export interface MapPickerProps {
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  marker?: { lat: number; lng: number } | null;
  markers?: MapMarker[];
  /** Draw a great-circle line between two points (e.g. guess vs. real). */
  line?: { from: { lat: number; lng: number }; to: { lat: number; lng: number } } | null;
  onPick?: (lat: number, lng: number) => void;
  fitBoundsTo?: Array<{ lat: number; lng: number }>;
  /** Optional override for fitBounds padding (in px). */
  fitBoundsPadding?: number | { top: number; bottom: number; left: number; right: number };
  interactive?: boolean;
  /** disables zoom (for No-Move mode) */
  noZoom?: boolean;
  className?: string;
}

// Probe the Mapbox style URL — if it 401/403s we skip it entirely and start
// with the OSM fallback. The result is cached for 5 minutes so a transient
// network error or a token rotation doesn't lock the app into the fallback
// for the entire tab lifetime.
const MAPBOX_PROBE_TTL_MS = 5 * 60 * 1000;
let mapboxStyleProbe: { ok: boolean; at: number } | null = null;
async function probeMapboxStyle(url: string): Promise<boolean> {
  const now = Date.now();
  if (mapboxStyleProbe && now - mapboxStyleProbe.at < MAPBOX_PROBE_TTL_MS) {
    return mapboxStyleProbe.ok;
  }
  try {
    const res = await fetch(url, { method: "GET", cache: "no-store" });
    mapboxStyleProbe = { ok: res.ok, at: now };
  } catch {
    mapboxStyleProbe = { ok: false, at: now };
  }
  return mapboxStyleProbe.ok;
}
function markMapboxStyleBroken() {
  mapboxStyleProbe = { ok: false, at: Date.now() };
}

export default function MapPicker({
  initialCenter = { lat: 20, lng: 0 },
  initialZoom = 1.5,
  marker,
  markers,
  line,
  onPick,
  fitBoundsTo,
  fitBoundsPadding,
  interactive = true,
  noZoom = false,
  className,
}: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const otherMarkersRef = useRef<maplibregl.Marker[]>([]);
  const onPickRef = useRef(onPick);
  const [tileError, setTileError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => { onPickRef.current = onPick; }, [onPick]);

  // init — but only AFTER the container has a non-zero size. This is critical
  // for maps that mount inside an animated modal: maplibre captures the
  // container size at construction time, and if that's 0×0 the WebGL canvas
  // is created at 0px and never recovers visually.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;
    let map: MlMap | null = null;
    let ro: ResizeObserver | null = null;
    let winResize: (() => void) | null = null;
    const rafIds: number[] = [];
    const timeouts: number[] = [];

    const start = async () => {
      // Wait until the container actually has a measurable size.
      await new Promise<void>((resolve) => {
        const check = () => {
          if (cancelled) return resolve();
          if (el.clientWidth > 0 && el.clientHeight > 0) return resolve();
          rafIds.push(requestAnimationFrame(check));
        };
        check();
      });
      if (cancelled) return;

      // Decide on initial style.
      // We deliberately default to the OSM fallback style: the public
      // Mapbox style v12 JSON contains source URLs (mapbox://...) and
      // properties that MapLibre v5's strict style validator rejects
      // (e.g. "unknown property name"), leaving the canvas blank.
      // To opt in to Mapbox tiles, set NEXT_PUBLIC_MAPBOX_STYLE to a
      // MapLibre-compatible style URL (e.g. a self-hosted style.json
      // that uses raster tile sources).
      const url = mapboxStyleUrl();
      const allowMapbox = process.env.NEXT_PUBLIC_ENABLE_MAPBOX_STYLE === "1";
      let initialStyle: maplibregl.StyleSpecification | string = FALLBACK_STYLE;
      let usingFallback = true;
      if (url && allowMapbox) {
        const ok = await probeMapboxStyle(url);
        if (cancelled) return;
        if (ok) {
          initialStyle = url;
          usingFallback = false;
        } else {
          setTileError("Mapbox-Stil nicht erreichbar — OSM-Fallback aktiv.");
          // eslint-disable-next-line no-console
          console.warn(
            "[MapPicker] Mapbox style probe failed (token/allowlist?). Using OSM fallback."
          );
        }
      } else if (!isMapboxEnabled()) {
        // eslint-disable-next-line no-console
        console.warn(
          "[MapPicker] NEXT_PUBLIC_MAPBOX_TOKEN missing — using OSM fallback."
        );
      }

      try {
        map = new maplibregl.Map({
          container: el,
          style: initialStyle,
          center: [initialCenter.lng, initialCenter.lat] as LngLatLike,
          zoom: initialZoom,
          attributionControl: { compact: true },
          interactive,
          fadeDuration: 0,
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[MapPicker] map construction failed:", err);
        setTileError("Karte konnte nicht initialisiert werden.");
        return;
      }
      mapRef.current = map;

      const handleErr = (e: maplibregl.ErrorEvent) => {
        const msg = e?.error?.message || "Tile/Style konnte nicht geladen werden";
        const lower = msg.toLowerCase();
        const fatal =
          lower.includes("style") ||
          lower.includes("token") ||
          lower.includes("403") ||
          lower.includes("401") ||
          lower.includes("forbidden") ||
          lower.includes("unauthorized") ||
          lower.includes("ajax") ||
          lower.includes("unknown property") ||
          lower.includes("validation") ||
          lower.includes("mapbox://") ||
          lower.includes("source") && lower.includes("mapbox");
        if (fatal && !usingFallback && map) {
          usingFallback = true;
          markMapboxStyleBroken();
          try {
            map.setStyle(FALLBACK_STYLE);
            setTileError("Mapbox-Stil/Tiles nicht erreichbar — OSM-Fallback aktiv.");
          } catch {
            setTileError(msg);
          }
        } else if (fatal) {
          setTileError(msg);
        }
        // eslint-disable-next-line no-console
        console.warn("[MapPicker] map error:", msg);
      };
      map.on("error", handleErr);

      // Watchdog: if Mapbox style is selected but no tiles paint within 4s,
      // assume the tile endpoint is blocked (URL allow-list) and swap to OSM.
      if (!usingFallback && map) {
        const watchdog = window.setTimeout(() => {
          if (cancelled || !map) return;
          const loaded = map.areTilesLoaded?.();
          if (!loaded && !usingFallback) {
            usingFallback = true;
            markMapboxStyleBroken();
            try {
              map.setStyle(FALLBACK_STYLE);
              setTileError("Mapbox-Tiles nicht erreichbar — OSM-Fallback aktiv.");
            } catch {}
          }
        }, 4000);
        timeouts.push(watchdog as unknown as number);
      }

      if (noZoom) {
        map.scrollZoom.disable();
        map.doubleClickZoom.disable();
        map.touchZoomRotate.disable();
        map.boxZoom.disable();
      }

      if (interactive) {
        map.on("click", (e) => {
          onPickRef.current?.(e.lngLat.lat, e.lngLat.lng);
        });
      }

      const safeResize = () => {
        if (!map) return;
        try { map.resize(); } catch {}
      };

      // Aggressive resize: ResizeObserver + several rAFs + window resize.
      ro = new ResizeObserver(safeResize);
      ro.observe(el);

      const queueResizes = (count: number) => {
        if (count <= 0) return;
        rafIds.push(
          requestAnimationFrame(() => {
            safeResize();
            queueResizes(count - 1);
          })
        );
      };
      queueResizes(8);

      map.once("load", () => {
        safeResize();
        rafIds.push(requestAnimationFrame(safeResize));
        if (!cancelled) setReady(true);
      });

      winResize = safeResize;
      window.addEventListener("resize", winResize);
    };

    start();

    return () => {
      cancelled = true;
      rafIds.forEach((id) => cancelAnimationFrame(id));
      timeouts.forEach((id) => clearTimeout(id));
      if (ro) ro.disconnect();
      if (winResize) window.removeEventListener("resize", winResize);
      const m = mapRef.current;
      if (m) {
        try { m.remove(); } catch {}
      }
      mapRef.current = null;
      userMarkerRef.current = null;
      otherMarkersRef.current.forEach((mk) => mk.remove());
      otherMarkersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // user marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (marker) {
      if (!userMarkerRef.current) {
        const el = document.createElement("div");
        el.className = "pp-pin";
        userMarkerRef.current = new maplibregl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([marker.lng, marker.lat])
          .addTo(map);
      } else {
        userMarkerRef.current.setLngLat([marker.lng, marker.lat]);
      }
    } else if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }
  }, [marker, ready]);

  // extra markers (e.g. real location on reveal)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    otherMarkersRef.current.forEach((m) => m.remove());
    otherMarkersRef.current = [];
    if (markers) {
      for (const m of markers) {
        const el = document.createElement("div");
        el.className = "pp-pin pp-pin-real";
        if (m.color) el.style.setProperty("--pin-color", m.color);
        const mk = new maplibregl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([m.lng, m.lat])
          .addTo(map);
        otherMarkersRef.current.push(mk);
      }
    }
  }, [markers, ready]);

  // line
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const SOURCE = "pp-line";
      try {
        if (map.getLayer(SOURCE)) map.removeLayer(SOURCE);
        if (map.getSource(SOURCE)) map.removeSource(SOURCE);
      } catch {}
      if (!line) return;
      try {
        map.addSource(SOURCE, {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: [
                [line.from.lng, line.from.lat],
                [line.to.lng, line.to.lat],
              ],
            },
          },
        });
        map.addLayer({
          id: SOURCE,
          type: "line",
          source: SOURCE,
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": "#c33129",
            "line-width": 2.5,
            "line-dasharray": [2, 2.5],
          },
        });
      } catch {}
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [line, ready]);

  // fit bounds
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !fitBoundsTo || fitBoundsTo.length === 0) return;
    const bounds = new maplibregl.LngLatBounds();
    fitBoundsTo.forEach((p) => bounds.extend([p.lng, p.lat]));
    const apply = () => {
      try { map.resize(); } catch {}
      try {
        // First, ask MapLibre what zoom fitBounds would pick. If it would
        // zoom out beyond ~continent level (zoom < 4), the guess and the
        // truth are far apart — instead of showing the whole globe, just
        // fly to the first point (the truth/focus point in our usage) at
        // a sensible zoom. The other pin is still on the map and the user
        // can pan/zoom to find it.
        const cam = map.cameraForBounds(bounds, {
          padding: fitBoundsPadding ?? 80,
          maxZoom: 8,
        });
        const FLOOR = 4;
        if (cam && typeof cam.zoom === "number" && cam.zoom < FLOOR) {
          const focus = fitBoundsTo[0];
          map.flyTo({
            center: [focus.lng, focus.lat],
            zoom: 5,
            duration: 1400,
            essential: true,
          });
        } else {
          map.fitBounds(bounds, {
            padding: fitBoundsPadding ?? 80,
            duration: 1200,
            maxZoom: 8,
          });
        }
      } catch {}
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [fitBoundsTo, fitBoundsPadding, ready]);

  return (
    <div
      className={`relative ${className ?? "h-full w-full min-h-[320px]"}`}
      style={{ minHeight: 320 }}
    >
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          background: "#e9dfc4",
        }}
      />
      {tileError && (
        <div className="absolute top-2 left-2 right-2 z-10 paper-card-soft p-3 text-xs font-mono text-pin border border-pin/40 pointer-events-none">
          Karte: {tileError}
        </div>
      )}
    </div>
  );
}

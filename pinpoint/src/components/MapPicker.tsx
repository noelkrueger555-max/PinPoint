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
  interactive?: boolean;
  /** disables zoom (for No-Move mode) */
  noZoom?: boolean;
  className?: string;
}

export default function MapPicker({
  initialCenter = { lat: 20, lng: 0 },
  initialZoom = 1.5,
  marker,
  markers,
  line,
  onPick,
  fitBoundsTo,
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
  useEffect(() => { onPickRef.current = onPick; }, [onPick]);

  // init
  useEffect(() => {
    if (!containerRef.current) return;
    const styleUrl = mapboxStyleUrl();
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrl ?? FALLBACK_STYLE,
      center: [initialCenter.lng, initialCenter.lat] as LngLatLike,
      zoom: initialZoom,
      attributionControl: { compact: true },
      interactive,
    });
    mapRef.current = map;

    let usingFallback = !styleUrl;
    const handleErr = (e: maplibregl.ErrorEvent) => {
      const msg = e?.error?.message || "Tile/Style konnte nicht geladen werden";
      const lower = msg.toLowerCase();
      const fatal =
        lower.includes("style") ||
        lower.includes("token") ||
        lower.includes("403") ||
        lower.includes("401");
      // Auto-recover from a Mapbox style failure by switching to OSM fallback.
      if (fatal && !usingFallback) {
        usingFallback = true;
        try {
          map.setStyle(FALLBACK_STYLE);
          setTileError("Mapbox-Stil nicht erreichbar — OSM-Fallback aktiv.");
        } catch {
          setTileError(msg);
        }
      } else if (fatal) {
        setTileError(msg);
      }
      // eslint-disable-next-line no-console
      console.warn("[MapPicker] map error:", msg, e);
    };
    map.on("error", handleErr);

    if (!isMapboxEnabled()) {
      // eslint-disable-next-line no-console
      console.warn("[MapPicker] NEXT_PUBLIC_MAPBOX_TOKEN missing at build time — using OSM fallback. Add the env-var to Vercel and redeploy to get full Mapbox tiles.");
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

    // Robust sizing: maplibre needs map.resize() whenever the container
    // changes size. Modals animate from 0px → final size, flex layouts
    // settle one frame late, etc. ResizeObserver covers all of these.
    const ro = new ResizeObserver(() => {
      try { map.resize(); } catch {}
    });
    ro.observe(containerRef.current);
    // Trigger initial resize after layout has settled.
    const raf1 = requestAnimationFrame(() => {
      try { map.resize(); } catch {}
      const raf2 = requestAnimationFrame(() => {
        try { map.resize(); } catch {}
      });
      (map as unknown as { __raf2?: number }).__raf2 = raf2;
    });
    (map as unknown as { __raf1?: number }).__raf1 = raf1;

    return () => {
      ro.disconnect();
      const r1 = (map as unknown as { __raf1?: number }).__raf1;
      const r2 = (map as unknown as { __raf2?: number }).__raf2;
      if (r1) cancelAnimationFrame(r1);
      if (r2) cancelAnimationFrame(r2);
      map.remove();
      mapRef.current = null;
      userMarkerRef.current = null;
      otherMarkersRef.current.forEach((m) => m.remove());
      otherMarkersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // user marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
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
  }, [marker]);

  // extra markers (e.g. real location on reveal)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
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
  }, [markers]);

  // line
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const SOURCE = "pp-line";
      if (map.getLayer(SOURCE)) map.removeLayer(SOURCE);
      if (map.getSource(SOURCE)) map.removeSource(SOURCE);
      if (!line) return;
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
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [line]);

  // fit bounds
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !fitBoundsTo || fitBoundsTo.length === 0) return;
    const bounds = new maplibregl.LngLatBounds();
    fitBoundsTo.forEach((p) => bounds.extend([p.lng, p.lat]));
    const apply = () =>
      map.fitBounds(bounds, { padding: 80, duration: 1200, maxZoom: 8 });
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [fitBoundsTo]);

  return (
    <div className={`relative ${className ?? "h-full w-full min-h-[320px]"}`}>
      <div ref={containerRef} className="absolute inset-0" />
      {tileError && (
        <div className="absolute top-2 left-2 right-2 z-10 paper-card-soft p-3 text-xs font-mono text-pin border border-pin/40 pointer-events-none">
          Karte: {tileError}. Prüfe NEXT_PUBLIC_MAPBOX_TOKEN + Mapbox-URL-Allowlist.
        </div>
      )}
    </div>
  );
}

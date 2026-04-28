"use client";

import maplibregl, { type LngLatLike, type Map as MlMap } from "maplibre-gl";
import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { mapboxStyleUrl } from "@/lib/mapbox";

// Default fallback: free, no-API-key raster style. Used only when no Mapbox
// token is configured. Keeps zero server cost on our side.
const FALLBACK_STYLE_URL = "https://demotiles.maplibre.org/style.json";

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
  useEffect(() => { onPickRef.current = onPick; }, [onPick]);

  // init
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapboxStyleUrl() ?? FALLBACK_STYLE_URL,
      center: [initialCenter.lng, initialCenter.lat] as LngLatLike,
      zoom: initialZoom,
      attributionControl: { compact: true },
      interactive,
    });
    mapRef.current = map;

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

    return () => {
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

  return <div ref={containerRef} className={className ?? "h-full w-full"} />;
}

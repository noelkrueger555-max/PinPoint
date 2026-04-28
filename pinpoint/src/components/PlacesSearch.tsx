"use client";

import { useEffect, useRef, useState } from "react";
import { Search, MapPin, Loader2 } from "lucide-react";
import {
  isMapboxEnabled,
  searchPlaces,
  resolvePlace,
  type PlaceSuggestion,
} from "@/lib/mapbox";

interface Props {
  onPick: (lat: number, lng: number, label: string) => void;
  placeholder?: string;
}

export default function PlacesSearch({ onPick, placeholder = "Ort suchen…" }: Props) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<number | null>(null);

  const enabled = isMapboxEnabled();

  useEffect(() => {
    if (!enabled) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const r = await searchPlaces(query);
        setSuggestions(r);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, enabled]);

  if (!enabled) return null;

  return (
    <div className="relative">
      <div className="flex items-center gap-2 paper-input">
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-ink-mute" />
        ) : (
          <Search className="w-4 h-4 text-ink-mute" />
        )}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none border-0 p-0 font-sans text-ink"
        />
      </div>
      {open && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 paper-card-soft z-50 max-h-72 overflow-auto">
          {suggestions.map((s) => (
            <button
              key={s.placeId}
              onMouseDown={async (e) => {
                e.preventDefault();
                const loc = await resolvePlace(s);
                if (loc) {
                  onPick(loc.lat, loc.lng, loc.formatted || s.primary);
                  setQuery(loc.formatted || s.primary);
                  setOpen(false);
                }
              }}
              className="w-full text-left px-4 py-3 hover:bg-paper-warm border-b border-dashed border-ink-mute/30 last:border-0 flex items-start gap-2"
            >
              <MapPin className="w-3.5 h-3.5 mt-0.5 text-pin shrink-0" />
              <div className="min-w-0">
                <div className="font-display text-sm font-bold truncate">{s.primary}</div>
                {s.secondary && s.secondary !== s.primary && (
                  <div className="text-xs text-ink-mute truncate">{s.secondary}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

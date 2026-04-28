# 📍 PinPoint

Persönliches GeoGuessr für Freunde & Familie. Local-first, offline-fähig, optional Cloud.

## Quickstart (lokal, kein Backend)

```bash
npm install
npm run dev
# → http://localhost:3000
```

Alle Daten landen in IndexedDB im Browser. Keine Server-Calls, kein Account
nötig. Spielen, Memory Lanes bauen, Stats — alles läuft offline.

## Deployment (statisch, gratis)

```bash
npm run build
# Deploy /out auf Vercel, Cloudflare Pages, Netlify oder beliebigen Static-Host.
```

`vercel.json` liefert sane Security-Header (X-Frame-Options, CSP-Lite,
Permissions-Policy).

## Cloud-Modus (optional, Phase 1+)

Für public Lobbies, Daily-Leaderboard, 1v1-Duell und Recap-Sharing kann
PinPoint optional an Supabase angedockt werden.

### Setup

1. **Supabase-Projekt** erstellen → https://supabase.com
2. SQL aus [`supabase/schema.sql`](supabase/schema.sql) im SQL-Editor ausführen
   (legt Tabellen, RLS-Policies, Trigger und View an)
3. Storage-Buckets anlegen:
   ```bash
   supabase storage create photos --public=false
   supabase storage create thumbs --public=true
   ```
4. Edge-Function deployen (Score-Validation):
   ```bash
   supabase functions deploy validate-score
   supabase secrets set SUPABASE_URL=https://… SUPABASE_SERVICE_ROLE_KEY=…
   ```
5. `.env.local` aus `.env.example` kopieren und Keys einsetzen:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ…
   ```
6. **Google OAuth** (optional): Supabase Dashboard → Authentication → Providers
   → Google aktivieren → OAuth-Client-ID + Secret aus Google Cloud Console
   einfügen. Redirect URL: `https://<dein-projekt>.supabase.co/auth/v1/callback`.
7. **Mapbox** (optional, separat): Public-Token bei
   [Mapbox](https://account.mapbox.com/access-tokens/) anlegen und in `.env.local`
   hinterlegen:
   ```
   NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ…
   ```
   Schaltet Places-Autocomplete im Upload, Reverse-Geocoding im Reveal und
   den Mapbox-Vektor-Style frei (sonst Demo-Raster-Fallback).
8. `npm run build && deploy`. Die App erkennt die Vars automatisch und
   schaltet alle Cloud-Features frei.

### Was Cloud freischaltet

| Feature | Route | Status |
|---|---|---|
| Magic-Link-Sign-in | `/share` | ✅ |
| Foto-/Lane-Sync | `/share` | ✅ |
| Lobby per 6-stelligem Code | `/share` | ✅ |
| 1v1-Duell live (Realtime) | `/duel` | ✅ |
| Daily-Leaderboard global | `/leaderboard` | ✅ |
| Server-side Score-Validation | Edge Function | ✅ |
| Public-Pool Moderation | `reports` Tabelle | ✅ Backend, UI: Report-Button auf Photo-Detail |
| Saisonale Ranglisten | `season_scores` | ✅ Schema, UI: TBD |

## Architektur

```
src/
  app/              # Next.js Routes (App Router)
    page.tsx        # Landing
    play/           # Game-Modi: classic/speedrun/no-move/daily/lane
    lanes/          # Memory-Lane-Editor (drag-reorder via @dnd-kit)
    library/        # Foto-Bibliothek
    stats/          # Persönliche Statistik
    share/          # Datei + Cloud-Lobby-Share
    duel/           # 1v1-Duell (Cloud)
    leaderboard/    # Daily Top-50 (Cloud)
    upload/         # Foto-Upload mit EXIF-Geocoding
  components/
    Game.tsx        # Spielloop, Reveal, Summary, Recap-Export
    PhotoUpload.tsx # Drag&Drop, EXIF, Auto-Difficulty
    MapPicker.tsx   # MapLibre wrapper
    PageHeader.tsx
  lib/
    store.ts        # IndexedDB-Layer
    geo.ts          # Haversine + Score-Formel
    exif.ts         # EXIF-Parsing
    difficulty.ts   # Auto-Difficulty Heuristik
    stats.ts        # Persönliche Stats
    share.ts        # JSON-Datei-Export/Import
    recap.ts        # Canvas + MediaRecorder → .webm Lane-Recap
    supabase.ts     # Cloud-Client (lazy, opt-in)
    cloud-sync.ts   # Lokal → Supabase Sync
    lobby.ts        # 6-stellige Lobby-Codes
    duel.ts         # Realtime-Duell-Channel
    leaderboard.ts  # Daily + Season scores
    moderation.ts   # Photo-Reports
supabase/
  schema.sql        # Vollständiges Schema + RLS
  functions/
    validate-score/ # Edge Function (Deno) — verifiziert Scores server-seitig
```

## Roadmap-Status

Siehe [`KONZEPT.md`](../KONZEPT.md) — alle Phasen 0 / 0.5 / 1 / 2 / 3 / 4 ✅
implementiert (Cloud-Phasen erfordern Supabase-Setup).

## Lizenz

Privater Prototyp. Kein offizieller Release.

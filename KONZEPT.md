# 📍 PinPoint — Das persönliche GeoGuessr für Freunde & Familie

> **Tagline:** *"Wo war das nochmal?" — Aus deinen Erinnerungen wird ein Spiel.*

---

## 1. Vision & Kernidee

PinPoint ist ein **soziales Geo-Guessing-Spiel auf Basis privater Fotos**. Statt anonymer Streetview-Bilder rätseln Spieler:innen über Orte, die ihre Freunde, Familie oder die Community tatsächlich besucht haben — Urlaubsspots, Lieblingscafés, Wanderungen, Roadtrips.

Das Ziel: **Erinnerungen spielerisch teilen.** Jedes Foto erzählt eine Geschichte, jeder Tipp wird zum Gespräch ("Warte, du warst da auch?!").

### Was es besonders macht
- **Persönlich statt generisch** — keine Streetview-Kachel, sondern echte Momente.
- **Hybrid-Modell** — privater Friends-Mode + öffentlicher Community-Pool.
- **Schwierigkeits-Scoring** — schwere Fotos geben mehr Punkte, leichte weniger.
- **Der Twist** ↓ siehe [Abschnitt 4](#4-der-twist--memory-lanes).

---

## 2. Zielgruppe & Use Cases

| Persona | Use Case |
|---|---|
| **Freundeskreis** | Privater Raum: jede:r lädt Urlaubsfotos, alle raten gegenseitig |
| **Familie** | Generationsübergreifend — Oma rät, wo Enkel im Auslandssemester war |
| **Reise-Communities** | Öffentlicher Pool: Globetrotter, Wanderfans, Foodies |
| **Casual Player** | Tägliche Daily Challenge mit 5 Community-Fotos |

---

## 3. Spielmechaniken

### 3.1 Grundloop
1. **Foto wird gezeigt** (mit/ohne Hinweise).
2. Spieler:in setzt Pin auf Weltkarte.
3. **Distanz wird berechnet** → Punkte basierend auf Distanz × Schwierigkeit.
4. Auflösung: tatsächlicher Ort + Story des Uploaders (optional).

### 3.2 Punktesystem

**Basis-Score:**
$$\text{Score} = \max\left(0, 5000 \cdot e^{-d / s}\right) \cdot M_{\text{difficulty}}$$

- $d$ = Distanz in km zum echten Ort
- $s$ = Skalierungskonstante (z. B. 2000 für Welt-Modus, 50 für Stadt-Modus)
- $M_{\text{difficulty}}$ = Schwierigkeits-Multiplikator (0.5× – 3.0×)

**Schwierigkeits-Klassifizierung** (vom Uploader gesetzt + Auto-Hint):
| Level | Multiplikator | Beispiel |
|---|---|---|
| 🟢 Einfach | 0.7× | Eiffelturm, Kolosseum |
| 🟡 Mittel | 1.0× | Generische Altstadt in Europa |
| 🟠 Schwer | 1.5× | Wanderweg, Café-Innenraum |
| 🔴 Brutal | 2.5× | Hotelzimmer, anonymer Strand |
| 💀 Insane | 3.0× | Foto vom Boden, Wand, Detail |

**Auto-Schwierigkeit:** ML-Modell (oder Heuristik) bewertet Bild-Features (Sehenswürdigkeit erkannt? Text/Schilder? Himmelsanteil?) und schlägt Level vor.

### 3.3 Spielmodi

- **🌍 World Round** — 5 zufällige Fotos, Welt-Karte
- **🏘️ Local Round** — alle Fotos aus einer Region (z. B. "Italien-Trip 2024")
- **⏱️ Speedrun** — 30s pro Foto, Bonus für schnelle Tipps

- **👥 Duell** — 1v1 Live, gleiche Fotos, Echtzeit-Score
- **📅 Daily Five** — täglich 5 kuratierte Community-Fotos (alle Spieler:innen weltweit dieselben → Leaderboard)

### 3.4 Hinweis-System (Joker)
Spieler:innen können Hinweise gegen Punktabzug freischalten:

- 📅 **Aufnahme-Monat** (-15%)
- 💬 **Story-Snippet** vom Uploader (-30%)

---

## 4. Der Twist — "Memory Lanes" 🛣️

> **Das Feature, das PinPoint von einem Klon abhebt.**

Statt einzelner Fotos können Uploader **"Memory Lanes"** erstellen — narrative Foto-Strecken einer Reise, die als **chronologische Geo-Trail-Challenge** gespielt werden:

- Spieler:innen sehen Foto 1, raten Ort.
- Auflösung zeigt Pin + **Pfeil zur ungefähren Richtung von Foto 2**.
- Mit jedem korrekten Tipp wird die Route auf der Karte sichtbar — wie ein Reise-Tagebuch, das sich aufdeckt.
- Bonus-Score, wenn Spieler:in die **Gesamtroute** korrekt vorhersagt.

**Warum das stark ist:**
- Skaliert das Content-Problem: 1 Reise = 1 Lane = 10–30 Fotos = lange Spielzeit.
- Emotional: am Ende sieht man die ganze Reise als animierte Linie über die Welt.
- Shareable: fertig gespielte Lanes lassen sich als **animiertes Video / GIF** exportieren ("Mein Italien-Trip durch die Augen meiner Freunde") → viraler Loop.

### Bonus-Twists
- **🏆 Trophy Pins:** Wer einen Ort als Erste:r exakt (<1km) tippt, bekommt einen permanenten Pin mit Avatar auf der globalen Karte.
- **🎭 Imposter-Round:** Unter 5 Fotos ist eines KI-generiert — wer es findet, kriegt Bonus.
- **🔄 Re-visit:** Wenn zwei Spieler:innen denselben Ort fotografiert haben, wird das Match angezeigt → "Ihr wart 2023 beide in Lissabon, 200m voneinander entfernt."

---

## 5. Content-Problem & Lösungen

> *"Das Spiel ist schnell durchgespielt, weil keiner genug Fotos hat."*

### Strategien

1. **Smart Bulk-Import**
   - Drag & Drop ganzer Ordner / Apple Photos / Google Photos Sync.
   - EXIF-Auto-Geocoding → 100 Fotos in 30s einsatzbereit.
   - Auto-Clustering: ähnliche Fotos werden zu Lanes gruppiert.

2. **Public Pool / Community-Mode**
   - Optionales Veröffentlichen einzelner Fotos in den globalen Pool.
   - Curation durch Upvotes & Schwierigkeits-Validierung.

3. **Replay-Wert durch Modi**
   - Dieselben Fotos in Speedrun / No-Move / Duell fühlen sich neu an.

4. **Daily Challenges**
   - Globaler Tages-Set hält tägliche Engagement-Loop am Leben.

5. **"Foto-Quest" Prompts**
   - Wöchentliche Challenges: *"Lade ein Foto hoch, auf dem kein Himmel zu sehen ist"* → produziert frischen, schweren Content.

6. **Familien-Archiv-Importer**
   - Großeltern-Modus: scanne alte Papierfotos → manueller Pin → emotionaler Content, der sonst nirgends existiert.

---

## 6. UX & Design

### 6.1 Design-Prinzipien
- **Cinematic** — großes Foto, minimale UI, Karte als zweiter Hauptdarsteller.
- **Tactile** — sanfte Animationen, haptisches Feedback (mobile), Sound-Cues.
- **Glassmorphism + Dark Mode First** — moderne Optik, Foto soll glänzen.
- **Map first, chrome second** — Mapbox/MapLibre als Bühne.

### 6.2 Visuelle Sprache
- **Farbpalette:**
  - Primary: `#0EA5E9` (Sky-500) — Ozean/Reise
  - Accent: `#F59E0B` (Amber-500) — Pin, Belohnung
  - Background: `#0B1220` (Deep Navy) → `#1E293B` Gradient
  - Success: `#10B981`, Error: `#EF4444`
- **Typografie:**
  - Display: **Cal Sans** oder **Inter Tight** (bold, geo-flavor)
  - Body: **Inter**
  - Mono (Koordinaten): **JetBrains Mono**
- **Iconography:** Lucide / Phosphor (rounded, modern)
- **Motion:** Framer Motion — Karten-Pin animiert mit Spring, Foto-Reveal mit Ken-Burns-Effekt.

### 6.3 Key Screens
1. **Home** — Hero mit animierter Welt-Globe (Three.js / globe.gl), Buttons "Spielen" / "Foto hochladen" / "Memory Lane starten".
2. **Game Screen** — Foto links (60%), Karte rechts (40%), Timer oben, Hinweis-Joker unten.
3. **Reveal Screen** — Splitscreen mit Pin-vs-Realität-Linie, Score-Counter zählt hoch, Story vom Uploader als Karte.
4. **Memory Lane Player** — Karte füllt sich progressiv mit Route, Polaroid-Stack-Animation links.
5. **Profile** — persönliche Heatmap der bereisten Orte, Trophy-Pins, Stats.
6. **Upload-Flow** — Drag & Drop, EXIF-Preview, Schwierigkeit-Slider, Privacy-Toggle (privat/Freunde/öffentlich).

---

## 7. Technische Architektur

> **🔋 Architektur-Prinzip: Client-First / Server-Lean**
> Maximale Berechnung im Browser, minimale Server-Last. Server ist primär *Datenspeicher* (Supabase) und *Static Host* (Vercel/Cloudflare Pages free tier). Kein eigener Node-Prozess nötig im Prototyp.
>
> **Was läuft im Browser:**
> - EXIF-Parsing (`exifr`)
> - Bild-Kompression & Thumbnail-Generierung (`browser-image-compression` + Canvas)
> - Distanz- & Score-Berechnung (Haversine)
> - Karten-Rendering (MapLibre WebGL)
> - Foto-Caching (IndexedDB via `idb-keyval`)
> - Auto-Difficulty-Heuristik (Canvas-Pixel-Analyse: Himmel-Anteil, Kontrast, Kanten)
> - Lane-Recap-Video-Export (FFmpeg.wasm — später)
>
> **Was der Server (Supabase) tut:**
> - Auth (Magic Link)
> - Photo-Metadaten-Storage (Postgres + RLS)
> - Bild-Files (Supabase Storage / R2)
> - Realtime-Channel für Duell-Modus
>
> **Trade-off:** Score-Berechnung im Client ist im *Friends-Mode* okay (Vertrauen). Für *Public Leaderboards* (Phase 3) wird ein leichter Edge-Function-Validator nachgereicht.

### 7.1 Tech-Stack (Prototyp-optimiert)

| Layer | Wahl | Begründung |
|---|---|---|
| **Frontend** | Next.js 15 (App Router) + React 19 + TypeScript | SSR, schnelle DX, Vercel-Deploy in 1 Klick |
| **Styling** | Tailwind CSS v4 + shadcn/ui | Schnell + ästhetisch out-of-the-box |
| **Animation** | Framer Motion | Smooth, deklarativ |
| **Karten** | MapLibre GL JS + Maptiler | Open-Source, free tier, schöner als Leaflet |
| **3D-Globe** | globe.gl / cobe | Hero-Element |
| **Backend** | Next.js API Routes + tRPC | Typsicher, kein extra Server |
| **DB** | PostgreSQL (Neon/Supabase) + PostGIS | Geo-Queries nativ |
| **ORM** | Drizzle ORM | Lightweight, edge-ready |
| **Auth** | Clerk oder Auth.js + Magic Link | Reibungsloser Login |
| **Storage** | Cloudflare R2 / Supabase Storage | Günstig, S3-kompatibel |
| **Image-Pipeline** | sharp + EXIFR | Resize, EXIF-Parsing |
| **Realtime** (Duell) | Supabase Realtime / Pusher | Websockets ohne Setup |
| **Analytics** | PostHog | Self-host möglich, Funnel-Analyse |
| **Deployment** | Vercel (Frontend) + Supabase (DB+Auth+Storage) | Schnellster Weg zu Public |

### 7.2 Datenmodell (vereinfacht)

```ts
User { id, name, avatar, email }
Photo {
  id, userId, url, thumbnailUrl,
  lat, lng, altitude?, takenAt?,
  difficulty: 1-5, autoDifficulty: 1-5,
  caption?, story?,
  visibility: 'private' | 'friends' | 'public',
  createdAt
}
Lane { id, userId, title, description, coverPhotoId, visibility }
LanePhoto { laneId, photoId, order }
Friendship { userA, userB, status }
GameSession { id, userId, mode, startedAt, totalScore }
Guess {
  id, sessionId, photoId,
  guessLat, guessLng, distanceKm,
  scoreEarned, hintsUsed, timeMs
}
TrophyPin { photoId, userId, achievedAt }
```

### 7.3 Schlüssel-APIs
- `POST /api/photos/upload` — Multipart, EXIF-Parse, R2-Upload, DB-Insert
- `GET /api/game/round?mode=world&pool=public` — liefert 5 Photos
- `POST /api/game/guess` — validiert, berechnet Score (server-side!)
- `GET /api/lanes/:id/play` — Lane-Modus
- `WS /api/duel/:roomId` — Realtime-Duell

### 7.4 Sicherheit & Privacy (kritisch!)
- **Geo-Daten niemals client-seitig vor Reveal**: Server schickt nur Foto-URL, hält `lat/lng` zurück.
- **EXIF-Stripping** der ausgelieferten Bilder (sonst Cheat via Browser-DevTools!).
- **Rate-Limiting** auf Guess-Endpoint.
- **Private Photos**: signed URLs mit kurzer Lifetime.
- **Visibility-Enforcement** in DB-Layer (Row Level Security via Supabase RLS).
- **DSGVO**: Klarer Consent für Foto-Upload, Recht auf Löschung, EU-Hosting (Frankfurt).
- **Content-Moderation**: NSFW-Filter (z. B. AWS Rekognition / open-source NSFW-JS) für public pool.

### 7.5 Auto-Difficulty (ML-light)
MVP-Heuristik (kein eigenes Modell nötig):
- **CLIP-Embedding** des Fotos → Similarity zu Wikidata-Landmarks-Embeddings.
- Hohe Similarity → "leicht". Niedrige + viel Himmel/Wand → "schwer".
- Optional: Vision-API (OpenAI / Google Vision) Tag-Extraction.

---

## 8. Roadmap & Prototyp-Plan

### Phase 0 — "Hello Pin" (MVP-Lite, public-ready)
**Ziel:** Eine Person lädt Fotos, Freunde raten via Link.
- [x] Next.js-Setup + Vercel-Deploy + Supabase-Projekt *(Cloud opt-in über env-vars)*
- [x] Auth (Magic Link) *(via `signInWithMagicLink`)*
- [x] Foto-Upload mit EXIF-Geocoding (manueller Fallback per Karten-Pin)
- [x] Spiel-Flow: 5 zufällige Fotos der eigenen Lobby, Karte, Score
- [x] Lobby-Share via Link/Code (kein Account nötig zum Mitspielen)
- [x] Basic Reveal-Animation

### Phase 1 — "Social Layer"
- [ ] Friend-System / Gruppen
- [ ] Profile + persönliche Heatmap
- [x] Schwierigkeits-System (manuell)
- [x] Hinweis-Joker

### Phase 2 — "Memory Lanes" (Der Twist)
- [x] Lane-Editor (Drag-Reorder, Cover-Foto) *(via @dnd-kit)*
- [x] Lane-Player mit progressiver Route
- [x] Animated Lane Recap (Export als WEBM via Canvas + MediaRecorder)

### Phase 3 — "Public Pool & Daily"
- [x] Public Visibility + Moderation *(`reports`-Tabelle + RLS-Policies)*
- [x] Daily Five mit globalem Leaderboard *(`/leaderboard`)*
- [ ] Trophy Pins
- [ ] Auto-Difficulty (CLIP) *(Heuristik bereits aktiv, CLIP TBD)*

### Phase 4 — "Competitive"
- [x] 1v1-Duell live *(`/duel`, Supabase Realtime)*
- [x] Saisonale Ranglisten *(`seasons` + `season_scores`)*
- [ ] Achievements / Badges

> **Cloud-Hinweis:** Phasen 0/3/4 markiert ✅ sind als opt-in implementiert.
> Ohne Supabase-Env-Vars läuft die App weiterhin 100% lokal/offline. Setup
> siehe [`pinpoint/README.md`](pinpoint/README.md).

### Phase 5 — "Polish & Scale"
- [ ] Mobile App (Expo / React Native, gleicher API-Layer)
- [ ] PWA + Offline-Modus
- [ ] iOS Photo-Sync via Shortcuts
- [ ] Premium-Tier (mehr Storage, private Lanes ohne Limit)

---

## 9. Schnell zum öffentlichen Prototyp — Konkreter 1-Wochen-Plan

> Annahme: ein:e Entwickler:in, fokussiert.

| Tag | Was |
|---|---|
| **1** | `create-next-app`, Tailwind + shadcn, Supabase-Projekt, Auth, Vercel-Deploy → schon live unter `pinpoint.vercel.app` |
| **2** | DB-Schema mit Drizzle, PostGIS aktivieren, Photo-Upload Endpoint, R2/Supabase Storage |
| **3** | EXIF-Parsing (`exifr`), Upload-UI mit Drag & Drop + Karten-Pin-Fallback |
| **4** | Game-Screen: MapLibre + Foto-Anzeige + Guess-Logik (server-side scoring) |
| **5** | Reveal-Screen mit Animation, Multi-Round-Flow, Lobby-Share-Link |
| **6** | UI-Polish: Globe-Hero, Sound, Framer-Motion-Transitions, Dark-Theme |
| **7** | Content-Moderation-Stub, Rate-Limiting, EXIF-Stripping fix, **Launch auf Twitter/Reddit/HN** |

**Launch-Hooks:**
- Show HN: *"I built a GeoGuessr where you guess your friends' vacation photos"*
- Reddit: r/sideproject, r/webdev, r/travel
- Product Hunt nach 2 Wochen Polish
- TikTok: Memory-Lane-Recap-Videos als Content

---

## 10. Monetarisierung (später, optional)

- **Free:** 100 Fotos, alle Spielmodi, Public-Mode
- **Pro (4€/Monat):** unlimited Fotos, private Lanes, MP4-Export in 4K, Custom-Subdomain für Familie
- **Family-Plan (8€/Monat):** 6 Accounts, geteiltes Foto-Archiv
- **Niemals:** Werbung im Spiel, Verkauf von Foto-Daten.

---

## 11. Risiken & Mitigationen

| Risiko | Mitigation |
|---|---|
| Content-Mangel | Memory Lanes, Daily, Imposter-Mode, Photo-Quests |
| Privacy-Leak (EXIF) | Server-side Stripping, signed URLs, Audit |
| NSFW im Public Pool | Auto-Filter + Report-Button + manuelle Review-Queue |
| Karten-Kosten skalieren | MapLibre + self-hosted Tiles ab X User |
| GeoGuessr klagt | klar differenziertes Konzept (privat/social), eigener Name & Branding |

---

## 12. North Star Metric

**Wöchentlich abgeschlossene Memory Lanes pro aktivem Nutzer.**
Misst gleichzeitig Content-Erstellung, Engagement, sozialen Loop.

---

## 13. Naming-Optionen

- **PinPoint** ✅ (mein Vorschlag — präzise, geo, doppeldeutig)
- WhereWasIt
- GuessMyTrip
- Pintrip
- Lanes
- Wanderwhere

---

## 14. Nächste konkrete Schritte

1. Namen final wählen + Domain sichern (`.app` oder `.travel`)
2. `npx create-next-app@latest pinpoint --typescript --tailwind --app`
3. Supabase-Projekt anlegen, PostGIS aktivieren
4. Logo-Sketch (z. B. Pin als stilisierte Foto-Ecke)
5. Phase-0-Tickets in Linear/GitHub Projects anlegen
6. Erste 50 Test-Fotos vom eigenen Urlaub hochladen → dogfood

---

## 15. 🚧 Implementation Progress

> Live-Tracking des Prototyp-Builds. Jeder Build-Schritt wird hier abgehakt.

### Phase 0 — MVP-Lite (lokal, kein Backend)
- [x] Konzept-Architektur auf "Client-First" umgestellt
- [x] Next.js 16 + TypeScript + Tailwind v4 + App Router initialisiert
- [x] Client-Side Dependencies installiert (maplibre-gl, exifr, framer-motion, idb-keyval, browser-image-compression, lucide-react, zustand)
- [x] Geo- & Score-Utilities (Haversine, exponentielles Punkte-Modell)
- [x] IndexedDB-Layer (`idb-keyval`) als lokaler Foto-Store
- [x] EXIF-Parsing + automatischer Geo-Extract beim Upload
- [x] Auto-Difficulty-Heuristik (Canvas-Pixel-Analyse)
- [x] Photo-Upload-UI (Drag & Drop + manueller Karten-Pin-Fallback)
- [x] Game-Screen mit MapLibre-Karte + Foto-Anzeige
- [x] Reveal-Screen mit Score-Animation + Distanz-Linie
- [x] Multi-Round-Flow (5 Fotos, Total-Score)
- [x] Home-Screen mit Hero
- [x] Dark Theme + Glassmorphism Polish
- [x] Build verifiziert (`npm run build`)

### Phase 0.5 — Local Polish (komplett offline)
- [x] Memory Lanes Datenmodell + Editor (Reorder + Sortieren nach Datum)
- [x] Lane-Player mit Richtungs-Hint zwischen Stationen
- [x] Speedrun-Mode (20s Timer + Zeitbonus)
- [x] No-Move-Mode (Zoom deaktiviert, ×1.5 Punkte)
- [x] Daily Five (deterministischer Seed pro Tag)
- [x] Stats-Dashboard (Beste Runde, Streak, Heatmap, Sessions)
- [x] Lobby-Share via `.pinpoint.json` Export/Import (Fotos als base64)
- [x] PWA-Manifest + App-Icon (installierbar)
- [x] Mode-Hub (`/play`) + Routen pro Modus
- [x] Build vollständig statisch (13 Routen, kein Server nötig)

### Phase 1 — Public Online (Supabase) — *optional*
- [x] Supabase-Projekt verbinden (Auth, Storage, Postgres + RLS)
- [x] **Google OAuth** zusätzlich zum Magic-Link
- [x] Photo-Upload zu Supabase Storage
- [x] Lobby-Share via Link/Code (statt Datei)
- [ ] Vercel-Deploy auf öffentliche URL *(braucht persönliches Vercel-Account)*

### Phase 2 — Memory Lanes Pro
- [x] Drag-Reorder im Editor (statt ↑↓ Buttons)
- [x] Animated Recap-Export (Canvas + MediaRecorder → .webm)

### Phase 3 — Public Pool & Daily
- [x] Public Visibility + Moderation
- [x] Globales Daily-Leaderboard
- [x] Server-side Score-Validation (Edge Function)

### Phase 4 — Competitive
- [x] 1v1-Duell (Supabase Realtime)
- [x] Saisonale Ranglisten

### Phase 5 — Pro-Polish
- [x] **Google Maps Places-Autocomplete** (Upload-UI)
- [x] **Google Reverse-Geocoding** (Reveal zeigt Ortsnamen)
- [x] **Achievements / Badges** (10 Trophys, lokal evaluiert)
- [x] **Sound-Effekte** (Web Audio, synth-on-fly, togglebar)
- [x] **Haptisches Feedback** (Vibration API auf Mobile)
- [x] **Service Worker** (offline-PWA, network-first für HTML, SWR für Assets)
- [x] **Keyboard-Shortcuts** (Enter/Space → Tippen / Nächste Runde)

---

*Built with ❤️ for shared memories.*

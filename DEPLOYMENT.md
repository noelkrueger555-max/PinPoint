# 🚀 PinPoint — Deployment & Setup-Anleitung

Schritt-für-Schritt-Guide, um PinPoint produktiv online zu stellen. Reihenfolge **strikt einhalten** — jeder Block baut auf dem vorigen auf.

---

## ✅ Voraussetzungen

- [ ] GitHub-Account
- [ ] Vercel-Account (kostenlos, mit GitHub verbinden)
- [ ] Supabase-Account (kostenlos)
- [ ] Mapbox-Account (kostenlos, 50k Map-Loads/Monat free)
- [ ] Google Cloud Account (nur falls Google-Login genutzt werden soll — optional)
- [ ] Domain (optional, z. B. `.app` / `.travel` über Namecheap/Cloudflare)
- [ ] Node.js ≥ 20, `npm`, `git` lokal installiert

---

## 1. Repo nach GitHub pushen

```bash
cd /Users/noelkruger/Desktop/geo
git init
git add .
git commit -m "PinPoint initial"

# Auf github.com → New Repository → "pinpoint" (private oder public)
git remote add origin git@github.com:noelkrueger555-max/PinPoint.git
git branch -M main
git push -u origin main
```

> **WICHTIG**: `.env.local` darf **nie** in Git landen. Ist über `.gitignore` bereits abgedeckt — vor dem ersten Push verifizieren mit `git status`.

---

## 2. Supabase-Projekt anlegen

### 2.1 Projekt erstellen
1. → [supabase.com/dashboard](https://supabase.com/dashboard) → **New Project**
2. Name: `pinpoint`, **Region: Frankfurt (eu-central-1)** (DSGVO!)
3. DB-Passwort generieren + **sicher speichern** (Passwortmanager).
4. Plan: **Free** reicht für Start (500 MB DB, 1 GB Storage, 50k Auth-Users).

### 2.2 Credentials notieren
Nach dem Setup → **Settings → API**:
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` Key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` Key → `SUPABASE_SERVICE_ROLE_KEY` ⚠ **NIEMALS** ins Frontend, nur in Edge-Function-Env.

### 2.3 Datenbank-Schema einspielen
1. Im Dashboard → **SQL Editor → New Query**
2. Inhalt von [pinpoint/supabase/schema.sql](pinpoint/supabase/schema.sql) komplett reinkopieren
3. **Run** klicken → es sollten Tabellen `profiles`, `photos`, `lanes`, `lane_photos`, `sessions`, `guesses`, `lobbies`, `daily_scores`, `seasons`, `season_scores`, `reports`, `friendships` entstehen + View `my_friends` + Funktion `send_friend_request`
4. Verifizieren: **Table Editor** → alle Tabellen sichtbar

> 💡 Schema bereits einmal eingespielt? Lass es einfach nochmal laufen — alle Statements sind `if not exists` / `or replace`. Neu sind: `friendships` Tabelle, `profiles.username`/`bio`, View `my_friends`, RPC `send_friend_request`.

### 2.4 Storage-Buckets anlegen
1. **Storage → New bucket**:
   - Name: `photos` → **Public: OFF** → Create
   - Name: `thumbs` → **Public: ON** → Create
2. **Storage → Policies → New Policy** (für jeden Bucket separat).
   Aus [pinpoint/supabase/schema.sql](pinpoint/supabase/schema.sql) ab dem Block `Storage buckets` die SQL-Policies kopieren und im **SQL Editor** ausführen — sie schreiben die richtigen RLS-Regeln direkt in `storage.objects`.

### 2.5 Auth konfigurieren
1. **Authentication → Providers**:
   - **Email**: an, "Confirm email" optional
   - **Google** (optional, nur wenn Google-Login gewünscht):
     - Google Cloud Console → APIs & Services → Credentials → **OAuth Client ID** (Web)
     - Authorized redirect URIs: `https://<dein-projekt>.supabase.co/auth/v1/callback`
     - Client-ID + Secret in Supabase eintragen
2. **Authentication → URL Configuration**:
   - Site URL: `https://pinpoint.vercel.app` (später durch eigene Domain ersetzen)
   - Redirect URLs: `https://pinpoint.vercel.app/**` und `http://localhost:3000/**`

### 2.6 Edge Function `validate-score` deployen
Lokal Supabase CLI nutzen:
```bash
brew install supabase/tap/supabase
cd /Users/noelkruger/Desktop/geo/pinpoint
supabase login
supabase link --project-ref <project-ref-aus-url>
supabase functions deploy validate-score
```

Verifizieren im Dashboard → **Edge Functions → validate-score → Logs** sollte `deployed` zeigen.
`SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` werden automatisch von Supabase gesetzt — nicht manuell überschreiben.

---

## 3. Mapbox-Token holen

1. → [account.mapbox.com/access-tokens](https://account.mapbox.com/access-tokens/)
2. **Create a token** → Name: `pinpoint-prod`
3. Scopes: alle **public** scopes lassen (default ist okay)
4. **URL allowlist** (kritisch!): später Production-Domain eintragen, z. B.
   ```
   https://pinpoint.vercel.app/*
   https://deine-domain.app/*
   http://localhost:3000/*
   ```
5. Token kopieren (`pk.eyJ…`) → `NEXT_PUBLIC_MAPBOX_TOKEN`

---

## 4. Lokal verifizieren

### 4.1 `.env.local` anlegen
```bash
cd /Users/noelkruger/Desktop/geo/pinpoint
cp .env.example .env.local
```

Werte eintragen:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ…
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ…
# SUPABASE_SERVICE_ROLE_KEY NICHT lokal ins Frontend — wird nur in der Edge-Function genutzt
```

### 4.2 Smoke-Test
```bash
npm install
npm run build      # muss grün durchlaufen
npm run dev        # http://localhost:3000
```

Manuell prüfen:
- [ ] Home lädt
- [ ] `/upload` zeigt Mapbox-Karte (statt Demo-Raster)
- [ ] Login per Magic-Link funktioniert (Mail kommt an)
- [ ] Foto-Upload landet in Supabase Storage (`Storage → photos`)
- [ ] `/play/daily` lädt eine Runde
- [ ] `/leaderboard` zeigt (leere) Tabelle ohne Fehler

---

## 5. Vercel-Deploy

### 5.1 Projekt importieren
1. → [vercel.com/new](https://vercel.com/new) → GitHub-Repo `pinpoint` auswählen
2. **Root Directory: `pinpoint`** (Unterordner!) — kritisch sonst findet Vercel `package.json` nicht
3. Framework Preset: **Next.js** (auto-detected)
4. Build Command: `npm run build` (default)
5. Output: `.next` (default)

### 5.2 Environment Variables setzen
Vor dem ersten Deploy unter **Settings → Environment Variables**:

| Name | Wert | Scope |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | aus 2.2 | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | aus 2.2 | Production, Preview, Development |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | aus 3 | Production, Preview, Development |

> ⚠ **Wichtig:** `NEXT_PUBLIC_*`-Variablen werden **beim Build** in den Bundle inlined.
> Wenn du einen Wert **nach** einem Deploy hinzufügst/änderst, musst du **redeployen**
> (Deployments → ... → **Redeploy** ohne Cache), sonst sieht der Browser den alten/leeren Wert
> und z. B. die Karte bleibt blank.

> ⚠ `SUPABASE_SERVICE_ROLE_KEY` **nicht** in Vercel hinzufügen — er gehört nur in die Supabase-Edge-Function, sonst riskiert man einen Bundle-Leak.

### 5.3 Deploy
- **Deploy** klicken → ~2 Min → fertig
- URL: `https://pinpoint-<hash>.vercel.app` → unter **Settings → Domains** auf `pinpoint.vercel.app` festlegen
- Eigene Domain: **Domains → Add** → CNAME bei deinem Registrar setzen

### 5.4 Supabase-URLs nachziehen
Nach dem Deploy noch einmal **Supabase → Authentication → URL Configuration**:
- Site URL = Production-URL
- Redirect URLs erweitern um die finale Domain

Und in **Mapbox URL allowlist** ebenfalls die Production-Domain eintragen.

---

## 6. Post-Deploy-Checks

### 6.1 Funktionale Smoke-Tests live
- [ ] Magic-Link-Login funktioniert über Production-URL
- [ ] Google-Login (falls aktiviert) redirected korrekt
- [ ] Foto-Upload erfolgreich; Bild erscheint in `Storage → photos/<userId>/`
- [ ] Daily-Modus → Score-Submit → Eintrag in `daily_scores` (Supabase Table Editor)
- [ ] `/leaderboard` zeigt deinen Score
- [ ] `/duel` öffnet einen Raum, zweiter Tab kann beitreten

### 6.2 Sicherheits-Checks
- [ ] DevTools → Network: keine `service_role`-Strings in Responses
- [ ] DevTools → Application → Local/Session Storage: keine Klartext-Geo-Coords vor Reveal
- [ ] `curl -I https://<domain>` → Response-Header enthalten `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` (aus [vercel.json](pinpoint/vercel.json))
- [ ] Supabase → Auth → Logs: nur erwartete Login-Events, keine Brute-Force-Spuren
- [ ] In `Storage → photos` ist kein Bucket-public-read aktiv (Bucket-Settings prüfen)

### 6.3 Performance / PWA
- [ ] Chrome DevTools → Lighthouse → PWA-Score ≥ 90
- [ ] App lässt sich auf iOS/Android via "Zum Home-Bildschirm" installieren
- [ ] Service Worker aktiv: DevTools → Application → Service Workers → `activated and is running`

---

## 7. Bekannte Punkte zum manuellen Nachziehen

| Item | Was tun | Wo |
|---|---|---|
| **EXIF-GPS in hochgeladenen Originalfotos** | Vor dem Upload via Canvas re-encoden, oder vor Reveal nur Thumbs ausliefern | [pinpoint/src/components/PhotoUpload.tsx](pinpoint/src/components/PhotoUpload.tsx) |
| **SW-Cache-Versionierung** | Bei jedem Deploy `CACHE = "pinpoint-vN"` hochzählen | [pinpoint/public/sw.js](pinpoint/public/sw.js) |
| **Friends-Lobby zeigt clientseitig lat/lng** | Akzeptiert für Friends-Mode; für Public später eigene `photos_public` View ohne Coords + Reveal-RPC | [pinpoint/src/lib/lobby.ts](pinpoint/src/lib/lobby.ts) |
| **Score-Validation aktivieren** | In `Game.tsx` nach lokalem Score zusätzlich `supabase.functions.invoke('validate-score', …)` aufrufen, falls noch nicht verdrahtet | [pinpoint/src/components/Game.tsx](pinpoint/src/components/Game.tsx) |
| **Trophy Pins / Auto-Difficulty (CLIP)** | offen laut KONZEPT Phase 3 | später |

---

## 8. Wartung & Updates

```bash
# Lokal entwickeln
npm run dev

# Schema-Änderungen
# 1. SQL in supabase/schema.sql ergänzen
# 2. Im Supabase Dashboard SQL Editor ausführen
# 3. Lokal testen, dann committen

# Edge-Function neu deployen
supabase functions deploy validate-score

# Frontend-Deploy passiert automatisch bei git push origin main
git push
```

### Backup-Strategie
- Supabase Free macht **automatische tägliche Backups** für 7 Tage (Pro-Tier: 30 Tage). Manuell vor großen Schema-Changes: **Database → Backups → Create**.
- Storage: monatlich `supabase storage download photos/` als Snapshot.

### Kosten-Schwellen (Free → Paid)
| Service | Free-Limit | Wann zahlen? |
|---|---|---|
| Supabase | 500 MB DB, 1 GB Storage, 2 GB Bandwidth | ab ~5k aktiver User |
| Vercel | 100 GB Bandwidth, 100 GB-Stunden | ab ~10k MAU |
| Mapbox | 50k Map Loads + 100k Geocoding/Monat | ab ~3k DAU |

---

## 9. Notfall-Runbook

| Problem | Schnellfix |
|---|---|
| Production weiß-Screen | Vercel → Deployments → Last working → **Promote to Production** |
| Auth bricht | Supabase Auth → URL Configuration prüfen, Redirect-URLs müssen Domain enthalten |
| Map lädt nicht | Mapbox-Token check + URL-Allowlist enthält Domain |
| Edge-Function 401 | Supabase → Functions → Logs → Auth-Header prüfen, JWT vorhanden? |
| Storage-Upload fail | RLS-Policies (siehe 2.4) — `auth.uid()::text = (storage.foldername(name))[1]` muss greifen |
| Service-Worker zeigt alte Version | `sw.js` Cache-Version hochzählen + redeploy → User bekommen Update beim nächsten Tab-Refresh |

---

## 10. Launch-Checkliste

- [ ] Production-Domain final + HTTPS aktiv
- [ ] Datenschutzerklärung + Impressum verlinkt (DSGVO!)
- [ ] Cookie-Banner falls Analytics
- [ ] 5–10 Test-Fotos hochgeladen, eine Memory Lane gebaut
- [ ] Erste 3 Freunde eingeladen, Bug-Feedback eingesammelt
- [ ] Show HN / Reddit r/sideproject Post vorbereitet
- [ ] TikTok/Twitter-Account `@pinpoint_app` reserviert
- [ ] Recap-Video als Demo gepostet

---

**Fragen oder Probleme?** Logs liegen in Vercel → Deployments → View Function Logs und Supabase → Logs Explorer. 95 % aller Fehler sind ENV-Vars oder RLS-Policies.

Viel Erfolg! 🎯

// PinPoint — server-side score validation.
//
// The client never sees photo `lat/lng` for non-owners (RLS hides them on
// public reads). When a session is finished, the client posts each guess
// here; this function reads the *truth* via service-role, recomputes the
// distance + score, and writes a verified row.
//
// Deploy:
//   supabase functions deploy validate-score
//
// Invoke (from client):
//   const { data, error } = await supabase.functions.invoke('validate-score', {
//     body: { sessionId, guesses }
//   });

// @ts-expect-error — Deno std import map at runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

interface IncomingGuess {
  photoId: string;
  guessLat: number;
  guessLng: number;
  hintsUsed?: number;
  timeMs?: number;
}

interface RequestBody {
  sessionId: string;
  guesses: IncomingGuess[];
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

const DIFFICULTY_MULTIPLIER: Record<number, number> = {
  1: 0.7, 2: 1.0, 3: 1.5, 4: 2.5, 5: 3.0,
};

function calcScore(distanceKm: number, difficulty: number, hintsPenalty: number): number {
  const base = Math.max(0, 5000 * Math.exp(-distanceKm / 2000));
  const mult = DIFFICULTY_MULTIPLIER[difficulty] ?? 1;
  return Math.round(base * mult * Math.max(0, 1 - hintsPenalty));
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateBody(b: unknown): RequestBody | null {
  if (!b || typeof b !== "object") return null;
  const o = b as Record<string, unknown>;
  if (typeof o.sessionId !== "string" || !UUID_RE.test(o.sessionId)) return null;
  if (!Array.isArray(o.guesses) || o.guesses.length === 0 || o.guesses.length > 50) return null;
  for (const g of o.guesses) {
    if (!g || typeof g !== "object") return null;
    const gg = g as Record<string, unknown>;
    if (typeof gg.photoId !== "string" || !UUID_RE.test(gg.photoId)) return null;
    if (typeof gg.guessLat !== "number" || gg.guessLat < -90 || gg.guessLat > 90) return null;
    if (typeof gg.guessLng !== "number" || gg.guessLng < -180 || gg.guessLng > 180) return null;
    if (gg.hintsUsed !== undefined && (typeof gg.hintsUsed !== "number" || gg.hintsUsed < 0 || gg.hintsUsed > 5)) return null;
    if (gg.timeMs !== undefined && (typeof gg.timeMs !== "number" || gg.timeMs < 0 || gg.timeMs > 1000 * 60 * 60)) return null;
  }
  return o as unknown as RequestBody;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405, headers: CORS_HEADERS });

  // Use the caller's JWT to enforce ownership; service-role to read photo truth.
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response("missing auth", { status: 401, headers: CORS_HEADERS });
  }
  const userClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
    global: { headers: { Authorization: authHeader } },
  });
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  const { data: userData } = await userClient.auth.getUser();
  const user = userData.user;
  if (!user) return new Response("unauthorized", { status: 401, headers: CORS_HEADERS });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return new Response("bad json", { status: 400, headers: CORS_HEADERS });
  }
  const body = validateBody(raw);
  if (!body) {
    return new Response("invalid payload", { status: 400, headers: CORS_HEADERS });
  }

  // Verify the session belongs to the caller AND hasn't been finalised yet
  const { data: session, error: sErr } = await admin
    .from("sessions")
    .select("id, player, finished_at")
    .eq("id", body.sessionId)
    .single();
  if (sErr || !session || session.player !== user.id) {
    return new Response("session not found", { status: 404, headers: CORS_HEADERS });
  }
  if (session.finished_at) {
    return new Response("session already finalised", { status: 409, headers: CORS_HEADERS });
  }

  // Pull truth for each photo in one round-trip
  const photoIds = body.guesses.map((g) => g.photoId);
  const { data: truth } = await admin
    .from("photos")
    .select("id, lat, lng, difficulty")
    .in("id", photoIds);
  const lookup = new Map(truth?.map((t) => [t.id, t]) ?? []);

  let total = 0;
  const rows = body.guesses.map((g) => {
    const t = lookup.get(g.photoId);
    if (!t) return null;
    const distanceKm = haversineKm(
      { lat: t.lat, lng: t.lng },
      { lat: g.guessLat, lng: g.guessLng }
    );
    const score = calcScore(distanceKm, t.difficulty, (g.hintsUsed ?? 0) * 0.15);
    total += score;
    return {
      session_id: body.sessionId,
      photo_id: g.photoId,
      guess_lat: g.guessLat,
      guess_lng: g.guessLng,
      distance_km: distanceKm,
      score,
      hints_used: g.hintsUsed ?? 0,
      time_ms: g.timeMs ?? 0,
      validated: true,
    };
  }).filter(Boolean);

  if (rows.length > 0) {
    await admin.from("guesses").insert(rows);
    await admin
      .from("sessions")
      .update({ total_score: total, photo_count: rows.length, finished_at: new Date().toISOString() })
      .eq("id", body.sessionId);
  }

  return new Response(
    JSON.stringify({ totalScore: total, validatedRounds: rows.length }),
    { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
  );
});

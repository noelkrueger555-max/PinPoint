/**
 * Daily-Five Leaderboard + season ranking client helpers.
 */

import { getSupabase } from "./supabase";

export interface DailyEntry {
  date: string;
  player_id: string;
  display_name: string;
  avatar_url: string | null;
  score: number;
  rank: number;
}

export async function fetchDailyLeaderboard(date: string, limit = 100): Promise<DailyEntry[]> {
  const sb = getSupabase();
  if (!sb) throw new Error("Cloud-Modus nicht konfiguriert.");
  const { data, error } = await sb
    .from("daily_leaderboard")
    .select("*")
    .eq("date", date)
    .order("rank", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as DailyEntry[];
}

export async function submitDailyScore(date: string, score: number) {
  const sb = getSupabase();
  if (!sb) throw new Error("Cloud-Modus nicht konfiguriert.");
  const { data: userData } = await sb.auth.getUser();
  const user = userData.user;
  if (!user) throw new Error("Bitte zuerst anmelden.");
  const { error } = await sb
    .from("daily_scores")
    .upsert({ date, player: user.id, score }, { onConflict: "date,player" });
  if (error) throw error;
}

/**
 * Server-validated submission: creates a sessions row, calls the
 * validate-score Edge Function (which recomputes scores using the truth
 * `lat/lng` from the photos table the client never sees), then writes the
 * validated total into daily_scores. Falls back to a plain `submitDailyScore`
 * if the function isn't deployed.
 */
export interface ValidateGuess {
  photoId: string;
  guessLat: number;
  guessLng: number;
  hintsUsed: number;
  timeMs: number;
}

/**
 * Generic server-validated session submit.
 * Creates a `sessions` row (with optional lobby_id), invokes the
 * validate-score Edge Function which writes verified `guesses` rows and
 * updates the session totals. Returns the server-confirmed total.
 *
 * Throws when the Edge Function is unavailable so callers can decide
 * whether to fall back. Daily mode has its own helper that catches.
 */
export async function submitValidatedSession(args: {
  mode: "daily" | "lobby" | "duel" | "classic" | "speedrun" | "no-move";
  guesses: ValidateGuess[];
  lobbyId?: string;
}): Promise<{ sessionId: string; totalScore: number; validatedRounds: number }> {
  const sb = getSupabase();
  if (!sb) throw new Error("Cloud-Modus nicht konfiguriert.");
  const { data: userData } = await sb.auth.getUser();
  const user = userData.user;
  if (!user) throw new Error("Bitte zuerst anmelden.");

  const { data: session, error: sErr } = await sb
    .from("sessions")
    .insert({
      player: user.id,
      mode: args.mode,
      lobby_id: args.lobbyId ?? null,
      photo_count: args.guesses.length,
    })
    .select("id")
    .single();
  if (sErr || !session) throw sErr ?? new Error("session insert failed");

  const { data: result, error: vErr } = await sb.functions.invoke<{
    totalScore: number;
    validatedRounds: number;
  }>("validate-score", {
    body: { sessionId: session.id, guesses: args.guesses },
  });
  if (vErr) throw vErr;

  return {
    sessionId: session.id,
    totalScore: result?.totalScore ?? 0,
    validatedRounds: result?.validatedRounds ?? 0,
  };
}

export async function submitValidatedDailyScore(
  date: string,
  guesses: ValidateGuess[],
  fallbackTotal: number
): Promise<{ score: number; validated: boolean }> {
  const sb = getSupabase();
  if (!sb) throw new Error("Cloud-Modus nicht konfiguriert.");
  const { data: userData } = await sb.auth.getUser();
  const user = userData.user;
  if (!user) throw new Error("Bitte zuerst anmelden.");

  try {
    const { totalScore } = await submitValidatedSession({ mode: "daily", guesses });
    const total = totalScore || fallbackTotal;
    const { error: dErr } = await sb
      .from("daily_scores")
      .upsert({ date, player: user.id, score: total }, { onConflict: "date,player" });
    if (dErr) throw dErr;
    return { score: total, validated: true };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[leaderboard] server validation unavailable — using client total", e);
    await submitDailyScore(date, fallbackTotal);
    return { score: fallbackTotal, validated: false };
  }
}

export interface SeasonEntry {
  season_id: number;
  player: string;
  rating: number;
  wins: number;
  losses: number;
}

export async function fetchSeasonStandings(seasonId: number, limit = 100): Promise<SeasonEntry[]> {
  const sb = getSupabase();
  if (!sb) throw new Error("Cloud-Modus nicht konfiguriert.");
  const { data, error } = await sb
    .from("season_scores")
    .select("*")
    .eq("season_id", seasonId)
    .order("rating", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as SeasonEntry[];
}

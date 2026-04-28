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

/**
 * Local-only achievements / badges. Evaluated against persisted stats.
 * No server roundtrip; fully works offline.
 */

import { get, set } from "idb-keyval";
import type { GameMode } from "./types";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first-pin", title: "Erster Pin", description: "Setze deinen ersten Tipp.", icon: "📍", rarity: "common" },
  { id: "bullseye", title: "Bullseye", description: "Tippe einen Ort auf <1 km genau.", icon: "🎯", rarity: "rare" },
  { id: "perfect-streak", title: "Heiße Hand", description: "5 Tipps in Folge unter 50 km.", icon: "🔥", rarity: "rare" },
  { id: "globetrotter", title: "Globetrotter", description: "Lade Fotos von 5 verschiedenen Kontinenten hoch.", icon: "🌍", rarity: "epic" },
  { id: "memory-keeper", title: "Memory Keeper", description: "Erstelle deine erste Memory Lane.", icon: "🛣️", rarity: "common" },
  { id: "speed-demon", title: "Speed Demon", description: "Beende eine Speedrun-Runde mit über 15.000 Punkten.", icon: "⚡", rarity: "epic" },
  { id: "no-move-master", title: "Statisch & smart", description: "Schließe eine No-Move-Runde mit über 10.000 Punkten ab.", icon: "🪨", rarity: "rare" },
  { id: "daily-warrior", title: "Daily Warrior", description: "Spiele 7 Tage am Stück Daily Five.", icon: "📅", rarity: "epic" },
  { id: "century-club", title: "Century Club", description: "100 Tipps insgesamt.", icon: "💯", rarity: "rare" },
  { id: "perfectionist", title: "Perfectionist", description: "Erreiche 25.000 Punkte in einer einzigen Runde.", icon: "👑", rarity: "legendary" },
];

const KEY = "pinpoint:achievements";

export async function getUnlocked(): Promise<Set<string>> {
  const arr = (await get<string[]>(KEY)) ?? [];
  return new Set(arr);
}

export async function unlock(id: string): Promise<boolean> {
  const set_ = await getUnlocked();
  if (set_.has(id)) return false;
  set_.add(id);
  await set(KEY, Array.from(set_));
  return true;
}

export interface CheckContext {
  mode: GameMode;
  totalScore: number;
  photoCount: number;
  bestDistanceKm?: number;
  guessesUnder50: number;
}

/**
 * Evaluate achievements after a session. Returns the IDs newly unlocked
 * (so UI can show a toast).
 */
export async function evaluateSession(ctx: CheckContext): Promise<string[]> {
  const newly: string[] = [];
  const tryUnlock = async (id: string) => {
    if (await unlock(id)) newly.push(id);
  };

  await tryUnlock("first-pin");

  if (ctx.bestDistanceKm !== undefined && ctx.bestDistanceKm < 1) {
    await tryUnlock("bullseye");
  }
  if (ctx.guessesUnder50 >= 5) {
    await tryUnlock("perfect-streak");
  }
  if (ctx.mode === "speedrun" && ctx.totalScore >= 15000) {
    await tryUnlock("speed-demon");
  }
  if (ctx.mode === "no-move" && ctx.totalScore >= 10000) {
    await tryUnlock("no-move-master");
  }
  if (ctx.totalScore >= 25000) {
    await tryUnlock("perfectionist");
  }

  return newly;
}

export async function unlockMemoryKeeper() {
  return (await unlock("memory-keeper")) ? "memory-keeper" : null;
}

export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

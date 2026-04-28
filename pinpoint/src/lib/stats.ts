"use client";

import { get, set } from "idb-keyval";
import type { GameMode, Guess, Photo } from "./types";

const STATS_KEY = "stats:v1";

export interface PlayedLocation {
  lat: number;
  lng: number;
  photoId: string;
  bestScore: number;
  attempts: number;
}

export interface SessionRecord {
  mode: GameMode;
  totalScore: number;
  photoCount: number;
  at: number;
}

export interface Stats {
  totalGuesses: number;
  totalScore: number;
  bestSession: number;
  sessions: SessionRecord[];
  locations: PlayedLocation[];
  bestStreak: number;
  currentStreak: number;
  lastPlayedDay?: string;
}

const empty: Stats = {
  totalGuesses: 0,
  totalScore: 0,
  bestSession: 0,
  sessions: [],
  locations: [],
  bestStreak: 0,
  currentStreak: 0,
};

export async function getStats(): Promise<Stats> {
  const s = await get<Stats>(STATS_KEY);
  return s ?? empty;
}

export async function recordGuess(g: Guess, photo: Photo): Promise<void> {
  const s = await getStats();
  s.totalGuesses += 1;
  s.totalScore += g.score;
  const existing = s.locations.find((l) => l.photoId === g.photoId);
  if (existing) {
    existing.attempts += 1;
    if (g.score > existing.bestScore) existing.bestScore = g.score;
  } else {
    s.locations.push({
      lat: photo.lat,
      lng: photo.lng,
      photoId: g.photoId,
      bestScore: g.score,
      attempts: 1,
    });
  }
  await set(STATS_KEY, s);
}

export async function recordSession(opts: {
  mode: GameMode;
  totalScore: number;
  photoCount: number;
}): Promise<void> {
  const s = await getStats();
  s.sessions.push({ ...opts, at: Date.now() });
  if (opts.totalScore > s.bestSession) s.bestSession = opts.totalScore;

  // streak: a "play" today counts
  const today = new Date().toISOString().slice(0, 10);
  if (s.lastPlayedDay !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (s.lastPlayedDay === yesterday) s.currentStreak += 1;
    else s.currentStreak = 1;
    if (s.currentStreak > s.bestStreak) s.bestStreak = s.currentStreak;
    s.lastPlayedDay = today;
  }
  // keep only last 50 sessions
  s.sessions = s.sessions.slice(-50);
  await set(STATS_KEY, s);
}

export async function resetStats(): Promise<void> {
  await set(STATS_KEY, empty);
}

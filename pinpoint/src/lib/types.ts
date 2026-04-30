export type Difficulty = 1 | 2 | 3 | 4 | 5;

export interface Photo {
  id: string;
  blob: Blob;          // stored in IndexedDB
  thumbBlob: Blob;     // smaller preview
  lat: number;
  lng: number;
  takenAt?: number;    // unix ms
  caption?: string;
  story?: string;
  /**
   * Optional progressive hints, revealed one at a time when the player
   * presses the hint button. Each revealed hint costs 15% of the score.
   */
  hints?: string[];
  difficulty: Difficulty;
  autoDifficulty?: Difficulty;
  source: "exif" | "manual";
  createdAt: number;
}

export interface Guess {
  photoId: string;
  guessLat: number;
  guessLng: number;
  distanceKm: number;
  score: number;
  hintsUsed: number;
  timeMs: number;
}

export interface GameRound {
  photos: Photo[];
  guesses: Guess[];
  currentIndex: number;
  totalScore: number;
  startedAt: number;
}

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  1: "Einfach",
  2: "Mittel",
  3: "Schwer",
  4: "Brutal",
  5: "Insane",
};

export const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  1: 0.7,
  2: 1.0,
  3: 1.5,
  4: 2.5,
  5: 3.0,
};

export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  1: "#10b981",
  2: "#eab308",
  3: "#f97316",
  4: "#ef4444",
  5: "#a855f7",
};

export interface Lane {
  id: string;
  title: string;
  description?: string;
  coverPhotoId?: string;
  photoIds: string[]; // ordered
  createdAt: number;
}

export type GameMode = "classic" | "speedrun" | "no-move" | "lane" | "daily" | "lobby" | "duel" | "album";

export const GAME_MODE_LABELS: Record<GameMode, string> = {
  classic: "Klassisch",
  speedrun: "Speedrun",
  "no-move": "No-Move",
  lane: "Memory Lane",
  daily: "Daily Five",
  lobby: "Lobby",
  duel: "Duell",
  album: "Album",
};

export const GAME_MODE_DESC: Record<GameMode, string> = {
  classic: "5 zufällige Fotos · entspannt raten",
  speedrun: "20s pro Foto · Zeit-Bonus",
  "no-move": "Karte darf nicht gezoomt werden · ×1.5 Punkte",
  lane: "Eine Reise als chronologischer Geo-Trail",
  daily: "Jeden Tag dieselben 5 Fotos für alle",
  lobby: "Geteilte Lobby · serverseitig validiert",
  duel: "Realtime · 1 vs 1",
  album: "Spiele ein Foto-Album",
};

/**
 * Realtime 1v1 duel — Supabase Realtime channel wrapper.
 *
 * Two players join the same `room:<code>` channel and broadcast their
 * round-by-round guesses. Final scores are posted to `duel_rooms`.
 */

import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";

export type DuelEvent =
  | { type: "ready"; player: "host" | "challenger" }
  | { type: "guess"; player: "host" | "challenger"; round: number; score: number; distanceKm: number }
  | { type: "round-end"; round: number }
  | { type: "finished"; hostScore: number; challengerScore: number };

export interface DuelRoom {
  id: string;
  code: string;
  host: string;
  challenger: string | null;
  photo_ids: string[];
  state: "waiting" | "playing" | "finished";
  host_score: number;
  challenger_score: number;
  current_round: number;
}

export async function createDuelRoom(photoIds: string[]): Promise<DuelRoom> {
  const sb = getSupabase();
  if (!sb) throw new Error("Cloud-Modus nicht konfiguriert.");
  const { data: userData } = await sb.auth.getUser();
  const user = userData.user;
  if (!user) throw new Error("Bitte zuerst anmelden.");

  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  const { data, error } = await sb
    .from("duel_rooms")
    .insert({ host: user.id, code, photo_ids: photoIds })
    .select()
    .single();
  if (error) throw error;
  return data as DuelRoom;
}

export async function joinDuelRoom(code: string): Promise<DuelRoom> {
  const sb = getSupabase();
  if (!sb) throw new Error("Cloud-Modus nicht konfiguriert.");
  const { data: userData } = await sb.auth.getUser();
  const user = userData.user;
  if (!user) throw new Error("Bitte zuerst anmelden.");

  const { data: room, error: rErr } = await sb
    .from("duel_rooms")
    .select("*")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (rErr) throw rErr;
  if (!room) throw new Error("Raum nicht gefunden.");
  if (room.host === user.id) return room as DuelRoom;
  if (room.challenger && room.challenger !== user.id) {
    throw new Error("Raum ist voll.");
  }

  const { data, error } = await sb
    .from("duel_rooms")
    .update({ challenger: user.id, state: "playing" })
    .eq("id", room.id)
    .select()
    .single();
  if (error) throw error;
  return data as DuelRoom;
}

/**
 * Subscribe to a duel channel. Returns the channel, a sender helper, and a
 * `dispose` cleanup that MUST be called on unmount to avoid Realtime leaks.
 */
export function subscribeDuel(
  code: string,
  onEvent: (e: DuelEvent) => void
): { channel: RealtimeChannel; send: (e: DuelEvent) => void; dispose: () => void } | null {
  const sb = getSupabase();
  if (!sb) return null;

  const channel = sb.channel(`duel:${code.toUpperCase()}`, {
    config: { broadcast: { self: false } },
  });
  channel.on("broadcast", { event: "duel" }, (payload) => {
    onEvent(payload.payload as DuelEvent);
  });
  channel.subscribe();

  const send = (e: DuelEvent) => {
    channel.send({ type: "broadcast", event: "duel", payload: e });
  };
  const dispose = () => {
    try {
      sb.removeChannel(channel);
    } catch {
      // ignore — channel may already be torn down
    }
  };
  return { channel, send, dispose };
}

export async function reportDuelScore(roomId: string, scoreField: "host_score" | "challenger_score", score: number) {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("duel_rooms").update({ [scoreField]: score }).eq("id", roomId);
}

export async function finishDuel(roomId: string) {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("duel_rooms").update({ state: "finished" }).eq("id", roomId);
}

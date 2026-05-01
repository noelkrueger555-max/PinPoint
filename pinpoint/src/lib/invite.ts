/**
 * Invite-link helpers — build deep links for albums, lobbies, duels and
 * trigger the Web Share API (with a clipboard fallback) so users can send
 * the invite via WhatsApp / Mail / AirDrop / etc.
 */

import { toast } from "./toast";

function origin(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

export function albumInviteUrl(code: string): string {
  return `${origin()}/albums/join?code=${encodeURIComponent(code)}`;
}

export function lobbyInviteUrl(code: string): string {
  return `${origin()}/play/lobby?code=${encodeURIComponent(code)}`;
}

export function duelInviteUrl(code: string): string {
  return `${origin()}/duel?code=${encodeURIComponent(code)}`;
}

/**
 * Best-effort native share. Falls back to copying the URL when the device
 * doesn't support the Web Share API or the user dismisses it.
 */
export async function shareInvite(args: {
  title: string;
  text: string;
  url: string;
}): Promise<"shared" | "copied" | "cancelled"> {
  // Web Share API: only on supporting browsers (mainly mobile + Safari).
  if (typeof navigator !== "undefined" && "share" in navigator) {
    try {
      await navigator.share({ title: args.title, text: args.text, url: args.url });
      return "shared";
    } catch (err) {
      // User cancelled or share failed — fall through to clipboard
      if (err instanceof Error && err.name === "AbortError") return "cancelled";
    }
  }
  // Clipboard fallback
  try {
    await navigator.clipboard.writeText(args.url);
    toast.success("Einladungslink kopiert");
    return "copied";
  } catch {
    toast.error("Kopieren fehlgeschlagen");
    return "cancelled";
  }
}

/**
 * Photo-Reporting (Public-Pool moderation pipeline).
 *
 * Players can flag any public photo. Service-role workers triage the
 * `reports` table; once a photo accumulates ≥3 flags an admin sets
 * `moderation_status='flagged'` (auto-removed from public reads via RLS).
 */

import { getSupabase } from "./supabase";

export type ReportReason = "nsfw" | "private-info" | "wrong-place" | "spam" | "other";

export async function reportPhoto(photoId: string, reason: ReportReason, comment?: string) {
  const sb = getSupabase();
  if (!sb) throw new Error("Cloud-Modus nicht konfiguriert.");
  const { data: userData } = await sb.auth.getUser();
  const user = userData.user;
  if (!user) throw new Error("Bitte zuerst anmelden.");

  const { error } = await sb.from("reports").insert({
    reporter: user.id,
    photo_id: photoId,
    reason: comment ? `${reason}: ${comment}` : reason,
  });
  if (error) throw error;
}

/**
 * Supabase client — initialised lazily from public env vars.
 *
 * The app stays fully functional offline: every cloud feature checks
 * `isCloudEnabled()` first and falls back to local IndexedDB.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function isCloudEnabled(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function getSupabase(): SupabaseClient | null {
  if (cached) return cached;
  if (!isCloudEnabled()) return null;
  cached = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: true, autoRefreshToken: true },
      realtime: { params: { eventsPerSecond: 10 } },
    }
  );
  return cached;
}

/**
 * Magic-Link sign-in. Resolves once Supabase has sent the email.
 * Returns immediately if cloud isn't configured.
 */
export async function signInWithMagicLink(email: string) {
  const sb = getSupabase();
  if (!sb) throw new Error("Cloud-Modus nicht konfiguriert.");
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
  });
  if (error) throw error;
}

export async function signOut() {
  const sb = getSupabase();
  if (!sb) return;
  await sb.auth.signOut();
}

/**
 * Google OAuth sign-in. Configure in Supabase dashboard:
 * Authentication → Providers → Google → enable + paste OAuth client ID/secret.
 */
export async function signInWithGoogle() {
  const sb = getSupabase();
  if (!sb) throw new Error("Cloud-Modus nicht konfiguriert.");
  const { error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: typeof window !== "undefined" ? `${window.location.origin}/share` : undefined,
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });
  if (error) throw error;
}

export async function getCurrentUser() {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  return data.user;
}

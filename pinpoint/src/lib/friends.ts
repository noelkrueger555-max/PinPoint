/**
 * Friends — search profiles, send/accept/decline requests, list friends.
 *
 * All functions return early with `[]` / `false` if cloud is not configured,
 * so the rest of the app keeps working in offline mode.
 */

import { getSupabase, isCloudEnabled } from "./supabase";

export interface ProfileLite {
  id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
}

export interface FriendRow extends ProfileLite {
  friend_id: string;
  status: "pending" | "accepted" | "blocked";
  requested_by: string;
  accepted_at: string | null;
}

interface FriendRowRaw {
  friend_id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  status: "pending" | "accepted" | "blocked";
  requested_by: string;
  accepted_at: string | null;
  created_at: string;
}

export async function searchProfiles(query: string): Promise<ProfileLite[]> {
  const sb = getSupabase();
  if (!sb || !query.trim()) return [];
  const q = query.trim().toLowerCase();
  const { data, error } = await sb
    .from("profiles")
    .select("id, display_name, username, avatar_url")
    .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
    .limit(20);
  if (error) {
    console.warn("[friends] searchProfiles", error);
    return [];
  }
  return (data ?? []) as ProfileLite[];
}

export async function listFriends(): Promise<FriendRow[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("my_friends")
    .select("friend_id, display_name, username, avatar_url, status, requested_by, accepted_at, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("[friends] listFriends", error);
    return [];
  }
  return ((data ?? []) as FriendRowRaw[]).map((r) => ({
    id: r.friend_id,
    friend_id: r.friend_id,
    display_name: r.display_name,
    username: r.username,
    avatar_url: r.avatar_url,
    status: r.status,
    requested_by: r.requested_by,
    accepted_at: r.accepted_at,
  }));
}

export async function sendFriendRequest(targetUserId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.rpc("send_friend_request", { target: targetUserId });
  if (error) {
    console.warn("[friends] sendFriendRequest", error);
    throw error;
  }
  return true;
}

export async function acceptFriendRequest(friendUserId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const me = (await sb.auth.getUser()).data.user?.id;
  if (!me) return false;
  const [a, b] = me < friendUserId ? [me, friendUserId] : [friendUserId, me];
  const { error } = await sb
    .from("friendships")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("user_a", a)
    .eq("user_b", b);
  if (error) {
    console.warn("[friends] acceptFriendRequest", error);
    throw error;
  }
  return true;
}

export async function removeFriend(friendUserId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const me = (await sb.auth.getUser()).data.user?.id;
  if (!me) return false;
  const [a, b] = me < friendUserId ? [me, friendUserId] : [friendUserId, me];
  const { error } = await sb.from("friendships").delete().eq("user_a", a).eq("user_b", b);
  if (error) {
    console.warn("[friends] removeFriend", error);
    throw error;
  }
  return true;
}

/**
 * Update the current user's profile (display name / username / bio).
 */
export async function updateProfile(patch: {
  display_name?: string;
  username?: string;
  bio?: string;
  avatar_url?: string;
}): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const me = (await sb.auth.getUser()).data.user?.id;
  if (!me) return false;
  const cleaned: Record<string, string> = {};
  if (patch.display_name) cleaned.display_name = patch.display_name.trim().slice(0, 40);
  if (patch.username) cleaned.username = patch.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24);
  if (patch.bio !== undefined) cleaned.bio = patch.bio.trim().slice(0, 280);
  if (patch.avatar_url) cleaned.avatar_url = patch.avatar_url;
  const { error } = await sb.from("profiles").update(cleaned).eq("id", me);
  if (error) {
    console.warn("[friends] updateProfile", error);
    throw error;
  }
  return true;
}

export async function getMyProfile(): Promise<ProfileLite | null> {
  const sb = getSupabase();
  if (!sb || !isCloudEnabled()) return null;
  const me = (await sb.auth.getUser()).data.user?.id;
  if (!me) return null;
  const { data } = await sb
    .from("profiles")
    .select("id, display_name, username, avatar_url")
    .eq("id", me)
    .single();
  return (data as ProfileLite) ?? null;
}

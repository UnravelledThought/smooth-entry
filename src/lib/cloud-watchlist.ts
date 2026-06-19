import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth";
import type { Anime } from "./anime-api";

export type WatchStatus = "watching" | "completed" | "plan" | "dropped";

export interface CloudEntry {
  id: string;
  user_id: string;
  mal_id: number;
  title: string;
  image_url: string;
  episodes: number | null;
  status: WatchStatus;
  progress: number;
  personal_score: number | null;
  mal_score: number | null;
  is_shared: boolean;
  is_pinned: boolean;
  shared_at: string | null;
  updated_at: string;
}

export function useMyEntries() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["entries", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<CloudEntry[]> => {
      const { data, error } = await supabase
        .from("watchlist_entries")
        .select("*")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CloudEntry[];
    },
  });
}

export function useMyEntryFor(malId: number) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["entry", user?.id, malId],
    enabled: !!user,
    queryFn: async (): Promise<CloudEntry | null> => {
      const { data } = await supabase
        .from("watchlist_entries")
        .select("*")
        .eq("user_id", user!.id)
        .eq("mal_id", malId)
        .maybeSingle();
      return (data as CloudEntry | null) ?? null;
    },
  });
}

export type SharedEntry = CloudEntry & { profile: { username: string; accent_color: string } | null };

export function useSharedFeed(limit = 12) {
  return useQuery({
    queryKey: ["shared-feed", limit],
    queryFn: async (): Promise<SharedEntry[]> => {
      const { data, error } = await supabase
        .from("watchlist_entries")
        .select("*")
        .eq("is_shared", true)
        .order("shared_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      const rows = (data ?? []) as CloudEntry[];
      const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
      let profileMap = new Map<string, { username: string; accent_color: string }>();
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, username, accent_color")
          .in("id", userIds);
        for (const p of profs ?? []) profileMap.set(p.id, { username: p.username, accent_color: p.accent_color });
      }
      return rows.map((r) => ({ ...r, profile: profileMap.get(r.user_id) ?? null }));
    },
    refetchInterval: 30_000,
  });
}

export function useAddEntry() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ anime, status = "plan" as WatchStatus }: { anime: Anime; status?: WatchStatus }) => {
      if (!user) throw new Error("Sign in to track anime.");
      const { error } = await supabase.from("watchlist_entries").insert({
        user_id: user.id,
        mal_id: anime.mal_id,
        title: anime.title_english ?? anime.title,
        image_url: anime.images.jpg.large_image_url,
        episodes: anime.episodes ?? null,
        mal_score: anime.score ?? null,
        status,
      });
      if (error && error.code !== "23505") throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entries", user?.id] });
      qc.invalidateQueries({ queryKey: ["entry", user?.id] });
    },
  });
}

export function useUpdateEntry() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<CloudEntry> }) => {
      const { error } = await supabase.from("watchlist_entries").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entries", user?.id] });
      qc.invalidateQueries({ queryKey: ["shared-feed"] });
      qc.invalidateQueries({ queryKey: ["pinned"] });
    },
  });
}

export function useDeleteEntry() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("watchlist_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entries", user?.id] }),
  });
}

export function usePublicProfile(username: string, uid?: number | null) {
  return useQuery({
    queryKey: ["public-profile", username, uid ?? null],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id, uid, username, accent_color, bio, avatar_url, created_at")
        .ilike("username", username);
      if (uid != null) query = query.eq("uid", uid);
      const { data: profile } = await query.maybeSingle();
      if (!profile) return null;
      const { data: pinned } = await supabase
        .from("watchlist_entries")
        .select("*")
        .eq("user_id", (profile as any).id)
        .eq("is_pinned", true)
        .order("updated_at", { ascending: false });
      return { profile, pinned: (pinned ?? []) as CloudEntry[] };
    },
  });
}

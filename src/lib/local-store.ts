/**
 * Account-backed watchlist + settings store.
 * Keeps the old synchronous hook/mutation API: state lives in memory, mutations
 * apply optimistically and are written to the cloud database in the background.
 */
import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { displayTitle, type Anime } from "./anime/types";

export type WatchStatus = "watching" | "completed" | "onhold" | "plan" | "dropped";

export interface LocalEntry {
  id: string;
  mal_id: number | null;
  anilist_id: number | null;
  title: string;
  alt_titles?: string[];
  image_url: string;
  banner_url?: string | null;
  duration?: number | null;
  episodes: number | null;
  status: WatchStatus;
  progress: number;
  personal_score: number | null;
  mal_score: number | null;
  anilist_score: number | null;
  /** Pinned to the public profile. */
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocalSettings {
  accent_color: string;
}

export interface Profile {
  id: string;
  uid: number;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  accent_color: string;
}

export interface LocalState {
  version: 1;
  ready: boolean;
  /** True when the list couldn't be loaded (shown entries are not authoritative). */
  loadError?: boolean;
  userId: string | null;
  profile: Profile | null;
  entries: LocalEntry[];
  settings: LocalSettings;
}

export const DEFAULT_ACCENT = "#ff2d6f";
export const SYNTHETIC_DOMAIN = "otaku.local";

const EMPTY: LocalState = {
  version: 1, ready: false, userId: null, profile: null, entries: [], settings: { accent_color: DEFAULT_ACCENT },
};

let state: LocalState = EMPTY;
const listeners = new Set<() => void>();
function commit(next: LocalState) { state = next; listeners.forEach((l) => l()); }
function subscribe(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb); }; }
function getState() { return state; }

/* ---------- row mapping ---------- */

function fromRow(r: any): LocalEntry {
  return {
    id: r.id, mal_id: r.mal_id ?? null, anilist_id: r.anilist_id ?? null, title: r.title,
    alt_titles: r.alt_titles ?? [], image_url: r.image_url ?? "", banner_url: r.banner_url, duration: r.duration,
    episodes: r.episodes, status: r.status, progress: r.progress ?? 0,
    personal_score: r.personal_score != null ? Number(r.personal_score) : null,
    mal_score: r.mal_score != null ? Number(r.mal_score) : null,
    anilist_score: r.anilist_score != null ? Number(r.anilist_score) : null,
    is_favorite: !!r.is_pinned, created_at: r.created_at, updated_at: r.updated_at,
  };
}

function toRow(e: Partial<LocalEntry>) {
  const r: Record<string, unknown> = {};
  const keys = ["id","mal_id","anilist_id","title","alt_titles","image_url","banner_url","duration","episodes","status","progress","personal_score","mal_score","anilist_score","created_at"] as const;
  for (const k of keys) if (k in e) r[k] = (e as any)[k];
  if ("is_favorite" in e) r.is_pinned = e.is_favorite;
  return r;
}

/** Per-entry write counter so an older failed write never undoes a newer edit. */
const writeSeq = new Map<string, number>();
function bump(ids: string[]) { const m = new Map<string, number>(); for (const id of ids) { const n = (writeSeq.get(id) ?? 0) + 1; writeSeq.set(id, n); m.set(id, n); } return m; }

/** Restore the given pre-change entries (and re-add deleted ones) unless a newer write touched them. */
function rollback(before: LocalEntry[], seq: Map<string, number>, err: unknown, what = "that change") {
  console.error(err);
  const live = before.filter((b) => writeSeq.get(b.id) === seq.get(b.id));
  if (live.length) {
    const byId = new Map(live.map((b) => [b.id, b]));
    const present = new Set(state.entries.map((e) => e.id));
    const restored = state.entries.map((e) => byId.get(e.id) ?? e);
    const readd = live.filter((b) => !present.has(b.id));
    commit({ ...state, entries: [...readd, ...restored].sort((a, b) => b.created_at.localeCompare(a.created_at)) });
  }
  toast.error(`Couldn't save ${what}. It has been undone.`);
}

function fail(err: unknown) {
  console.error(err);
  toast.error("Couldn't save that change.");
}

/* ---------- session ---------- */

async function loadUser(userId: string) {
  let res;
  try {
    res = await Promise.all([
      supabase.from("profiles").select("id, uid, username, bio, avatar_url, accent_color").eq("id", userId).maybeSingle(),
      supabase.from("watchlist_entries").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    ]);
  } catch (e) { res = [{ data: null, error: e }, { data: null, error: e }] as const; }
  if (state.userId !== userId) return;
  const [{ data: profile, error: pErr }, { data: rows, error: rErr }] = res;
  if (pErr || rErr) {
    console.error(pErr ?? rErr);
    commit({ ...state, ready: true, loadError: true });
    toast.error("Couldn't load your list.", {
      duration: Infinity, id: "load-error",
      action: { label: "Retry", onClick: () => { void loadUser(userId); } },
    });
    return;
  }
  toast.dismiss("load-error");
  commit({
    ...state, ready: true, loadError: false, profile: (profile as Profile) ?? null,
    entries: (rows ?? []).map(fromRow),
    settings: { accent_color: profile?.accent_color || DEFAULT_ACCENT },
  });
}

let started = false;
export function startSession() {
  if (started || typeof window === "undefined") return;
  started = true;
  const apply = (uid: string | null) => {
    if (uid === state.userId && state.ready) return;
    if (!uid) { commit({ ...EMPTY, ready: true }); return; }
    commit({ ...EMPTY, userId: uid, ready: false });
    void loadUser(uid);
  };
  supabase.auth.getSession()
    .then(({ data }) => apply(data.session?.user.id ?? null))
    .catch((e) => { console.error(e); apply(null); });
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "INITIAL_SESSION") apply(session?.user.id ?? null);
  });
}

/* ---------- auth ---------- */

export const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
export function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return "Password needs at least 8 characters.";
  if (!/[A-Z]/.test(pw)) return "Password needs an uppercase letter.";
  if (!/[a-z]/.test(pw)) return "Password needs a lowercase letter.";
  if (!/[0-9]/.test(pw)) return "Password needs a number.";
  return null;
}
const emailFor = (u: string) => `${u.trim().toLowerCase()}@${SYNTHETIC_DOMAIN}`;

export async function signUp(username: string, password: string) {
  if (!USERNAME_RE.test(username)) throw new Error("Username must be 3–20 letters, numbers or _.");
  const p = passwordProblem(password); if (p) throw new Error(p);
  const { data: taken, error: tErr } = await supabase.from("profiles").select("id").ilike("username", username).maybeSingle();
  if (tErr) throw new Error("Couldn't check that username. Try again.");
  if (taken) throw new Error("That username is taken.");
  const { error } = await supabase.auth.signUp({
    email: emailFor(username), password, options: { data: { username } },
  });
  if (error) throw new Error(error.message.includes("registered") ? "That username is taken." : error.message);
}

export async function signIn(username: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email: emailFor(username), password });
  if (error) throw new Error("Wrong username or password.");
}

export async function signOut() { await supabase.auth.signOut(); }

function requireUser(): string | null {
  if (state.userId) return state.userId;
  toast("Sign in to track anime.", { action: { label: "Sign in", onClick: () => { window.location.href = "/auth"; } } });
  return null;
}

/* ---------- hooks ---------- */

export function useLocalState(): LocalState { return useSyncExternalStore(subscribe, getState, () => EMPTY); }
export function useEntries(): LocalEntry[] { return useLocalState().entries; }
export function useSettings(): LocalSettings { return useLocalState().settings; }
export function useProfile(): Profile | null { return useLocalState().profile; }
export function useSession() { const s = useLocalState(); return { ready: s.ready, userId: s.userId, profile: s.profile }; }
export function useFavorites(): LocalEntry[] { return useLocalState().entries.filter((e) => e.is_favorite); }

export function useEntryForAnime(anime: Pick<Anime, "mal_id" | "anilist_id"> | null | undefined): LocalEntry | null {
  const entries = useLocalState().entries;
  if (!anime) return null;
  return entries.find((e) =>
    (anime.mal_id != null && e.mal_id === anime.mal_id) ||
    (anime.anilist_id != null && e.anilist_id === anime.anilist_id)) ?? null;
}

export function entryRouteId(e: Pick<LocalEntry, "mal_id" | "anilist_id">): string {
  return e.mal_id != null ? String(e.mal_id) : `al${e.anilist_id ?? 0}`;
}

export function profileSlug(p: Pick<Profile, "username" | "uid">) { return `${p.username}.${p.uid}`; }

/* ---------- mutations ---------- */

const now = () => new Date().toISOString();
const newId = () => crypto.randomUUID();

export function setAccentColor(accent_color: string) {
  const uid = requireUser(); if (!uid) return;
  commit({ ...state, settings: { accent_color }, profile: state.profile ? { ...state.profile, accent_color } : null });
  supabase.from("profiles").update({ accent_color }).eq("id", uid).then(({ error }) => error && fail(error));
}

export async function updateProfile(patch: { bio?: string; avatar_url?: string | null }) {
  const uid = requireUser(); if (!uid) return;
  const { error } = await supabase.from("profiles").update(patch).eq("id", uid);
  if (error) throw error;
  if (state.profile) commit({ ...state, profile: { ...state.profile, ...patch } });
}

export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/gif"];
export const AVATAR_MAX = 25 * 1024 * 1024;

export async function uploadAvatar(file: File) {
  const uid = requireUser(); if (!uid) return;
  if (!AVATAR_TYPES.includes(file.type)) throw new Error("Use a JPG, PNG or GIF.");
  if (file.size > AVATAR_MAX) throw new Error("Pictures can be up to 25 MB.");
  const ext = file.type === "image/gif" ? "gif" : file.type === "image/png" ? "png" : "jpg";
  const path = `${uid}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type, upsert: true });
  if (error) throw error;
  const { data, error: sErr } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (sErr || !data) throw sErr ?? new Error("Upload failed");
  await updateProfile({ avatar_url: data.signedUrl });
}

export function altTitles(anime: Pick<Anime, "titles">): string[] {
  const t = anime.titles;
  return [t.romaji, t.english, t.native].filter((v): v is string => !!v);
}

export function entryMatches(e: Pick<LocalEntry, "title" | "alt_titles">, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [e.title, ...(e.alt_titles ?? [])].some((t) => t.toLowerCase().includes(q));
}

export function addEntry(anime: Anime, status: WatchStatus = "plan"): string {
  const exists = state.entries.find((e) =>
    (anime.mal_id != null && e.mal_id === anime.mal_id) ||
    (anime.anilist_id != null && e.anilist_id === anime.anilist_id));
  if (exists) return exists.id;
  const uid = requireUser(); if (!uid) return "";
  const entry: LocalEntry = {
    id: newId(), mal_id: anime.mal_id, anilist_id: anime.anilist_id, title: displayTitle(anime),
    alt_titles: altTitles(anime), image_url: anime.images.cover, banner_url: anime.images.banner,
    duration: anime.duration, episodes: anime.episodes ?? null, status, progress: 0, personal_score: null,
    mal_score: anime.mal?.score ?? null, anilist_score: anime.anilist_score ?? null, is_favorite: false,
    created_at: now(), updated_at: now(),
  };
  commit({ ...state, entries: [entry, ...state.entries] });
  supabase.from("watchlist_entries").insert({ ...toRow(entry), user_id: uid } as any).then(({ error }) => error && fail(error));
  return entry.id;
}

export function updateEntry(id: string, patch: Partial<LocalEntry>) {
  if (!requireUser()) return;
  commit({ ...state, entries: state.entries.map((e) => (e.id === id ? { ...e, ...patch, updated_at: now() } : e)) });
  supabase.from("watchlist_entries").update(toRow(patch) as any).eq("id", id).then(({ error }) => error && fail(error));
}

export function deleteEntry(id: string) { bulkDelete([id]); }

export function bulkSetStatus(ids: string[], status: WatchStatus) {
  if (!requireUser() || ids.length === 0) return;
  const set = new Set(ids);
  commit({ ...state, entries: state.entries.map((e) => (set.has(e.id) ? { ...e, status, updated_at: now() } : e)) });
  supabase.from("watchlist_entries").update({ status }).in("id", ids).then(({ error }) => error && fail(error));
}

export function bulkDelete(ids: string[]) {
  if (!requireUser() || ids.length === 0) return;
  const set = new Set(ids);
  commit({ ...state, entries: state.entries.filter((e) => !set.has(e.id)) });
  supabase.from("watchlist_entries").delete().in("id", ids).then(({ error }) => error && fail(error));
}

export function toggleFavorite(id: string) {
  const e = state.entries.find((x) => x.id === id);
  if (e) updateEntry(id, { is_favorite: !e.is_favorite });
}

export function getEntriesSnapshot(): LocalEntry[] { return state.entries; }

export type ImportRow = Partial<LocalEntry> & { mal_id: number; title: string };

function normalizeNew(r: Partial<LocalEntry>): LocalEntry {
  return {
    id: newId(), mal_id: r.mal_id ?? null, anilist_id: r.anilist_id ?? null, title: r.title ?? "Untitled",
    alt_titles: r.alt_titles ?? [], image_url: r.image_url ?? "", banner_url: r.banner_url ?? null,
    duration: r.duration ?? null, episodes: r.episodes ?? null, status: r.status ?? "plan",
    progress: Number(r.progress) || 0, personal_score: r.personal_score ?? null, mal_score: r.mal_score ?? null,
    anilist_score: r.anilist_score ?? null, is_favorite: !!r.is_favorite,
    created_at: r.created_at ?? now(), updated_at: now(),
  };
}

async function insertMany(uid: string, entries: LocalEntry[]) {
  for (let i = 0; i < entries.length; i += 200) {
    const { error } = await supabase.from("watchlist_entries")
      .insert(entries.slice(i, i + 200).map((e) => ({ ...toRow(e), user_id: uid })) as any);
    if (error) throw error;
  }
}

export async function addManyEntries(rows: ImportRow[]): Promise<{ imported: number; skipped: number }> {
  const uid = requireUser(); if (!uid) return { imported: 0, skipped: rows.length };
  const existing = new Set(state.entries.map((e) => e.mal_id).filter((v): v is number => v != null));
  const fresh: LocalEntry[] = [];
  for (const r of rows) {
    if (existing.has(r.mal_id)) continue;
    existing.add(r.mal_id);
    fresh.push(normalizeNew(r));
  }
  if (fresh.length) {
    await insertMany(uid, fresh);
    commit({ ...state, entries: [...fresh, ...state.entries] });
  }
  return { imported: fresh.length, skipped: rows.length - fresh.length };
}

export function exportBackup(): string {
  return JSON.stringify({ version: 1, entries: state.entries, settings: state.settings }, null, 2);
}

export async function importBackup(json: string): Promise<number> {
  const uid = requireUser(); if (!uid) return 0;
  const parsed = JSON.parse(json);
  if (!Array.isArray(parsed.entries)) throw new Error("Not an AniTrack backup file.");
  const entries = parsed.entries.map(normalizeNew);
  const { error } = await supabase.from("watchlist_entries").delete().eq("user_id", uid);
  if (error) throw error;
  await insertMany(uid, entries);
  commit({ ...state, entries });
  if (parsed.settings?.accent_color) setAccentColor(parsed.settings.accent_color);
  return entries.length;
}

export async function clearAll() {
  const uid = requireUser(); if (!uid) return;
  const { error } = await supabase.from("watchlist_entries").delete().eq("user_id", uid);
  if (error) throw error;
  commit({ ...state, entries: [] });
}

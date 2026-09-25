import { useSyncExternalStore } from "react";
import { displayTitle, type Anime } from "./anime/types";

export type WatchStatus = "watching" | "completed" | "plan" | "dropped";

export interface LocalEntry {
  id: string;
  /** MyAnimeList id — null for titles that only exist on AniList. */
  mal_id: number | null;
  anilist_id: number | null;
  title: string;
  image_url: string;
  episodes: number | null;
  status: WatchStatus;
  progress: number;
  personal_score: number | null;
  /** Snapshot of the MyAnimeList score, when known. */
  mal_score: number | null;
  /** Snapshot of the AniList score. Kept separate from mal_score. */
  anilist_score: number | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocalSettings {
  accent_color: string;
}

export interface LocalState {
  version: 1;
  entries: LocalEntry[];
  settings: LocalSettings;
}

const KEY = "anitrack.local.v1";
export const DEFAULT_ACCENT = "#ff2d6f";

const EMPTY: LocalState = { version: 1, entries: [], settings: { accent_color: DEFAULT_ACCENT } };

let cache: LocalState | null = null;
const listeners = new Set<() => void>();

function normalize(e: any): LocalEntry {
  return {
    id: e?.id ?? newId(),
    mal_id: typeof e?.mal_id === "number" ? e.mal_id : null,
    anilist_id: typeof e?.anilist_id === "number" ? e.anilist_id : null,
    title: e?.title ?? "Untitled",
    image_url: e?.image_url ?? "",
    episodes: e?.episodes ?? null,
    status: (e?.status as WatchStatus) ?? "plan",
    progress: Number(e?.progress) || 0,
    personal_score: e?.personal_score ?? null,
    mal_score: e?.mal_score ?? null,
    anilist_score: e?.anilist_score ?? null,
    is_favorite: !!e?.is_favorite,
    created_at: e?.created_at ?? now(),
    updated_at: e?.updated_at ?? now(),
  };
}

function read(): LocalState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<LocalState>;
    return {
      version: 1,
      entries: Array.isArray(parsed.entries) ? parsed.entries.map(normalize) : [],
      settings: { accent_color: parsed.settings?.accent_color || DEFAULT_ACCENT },
    };
  } catch {
    return EMPTY;
  }
}

function getState(): LocalState {
  if (!cache) cache = read();
  return cache;
}

function commit(next: LocalState) {
  cache = next;
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage full or blocked — keep in-memory state */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = read();
      cb();
    }
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

/* ---------- hooks ---------- */

export function useLocalState(): LocalState {
  return useSyncExternalStore(subscribe, getState, () => EMPTY);
}

export function useEntries(): LocalEntry[] {
  return useLocalState().entries;
}

/** Match a stored entry to an anime by either id. */
export function useEntryForAnime(anime: Pick<Anime, "mal_id" | "anilist_id"> | null | undefined): LocalEntry | null {
  const entries = useLocalState().entries;
  if (!anime) return null;
  return (
    entries.find(
      (e) =>
        (anime.mal_id != null && e.mal_id === anime.mal_id) ||
        (anime.anilist_id != null && e.anilist_id === anime.anilist_id),
    ) ?? null
  );
}

export function useFavorites(): LocalEntry[] {
  return useLocalState().entries.filter((e) => e.is_favorite);
}

export function useSettings(): LocalSettings {
  return useLocalState().settings;
}

/** Route id for /anime/$id — MAL id when known, else the AniList id. */
export function entryRouteId(e: Pick<LocalEntry, "mal_id" | "anilist_id">): string {
  return e.mal_id != null ? String(e.mal_id) : `al${e.anilist_id ?? 0}`;
}

/* ---------- mutations ---------- */

function now() {
  return new Date().toISOString();
}

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function setAccentColor(accent_color: string) {
  const s = getState();
  commit({ ...s, settings: { ...s.settings, accent_color } });
}

export function addEntry(anime: Anime, status: WatchStatus = "plan") {
  const s = getState();
  const exists = s.entries.some(
    (e) =>
      (anime.mal_id != null && e.mal_id === anime.mal_id) ||
      (anime.anilist_id != null && e.anilist_id === anime.anilist_id),
  );
  if (exists) return;
  const entry: LocalEntry = {
    id: newId(),
    mal_id: anime.mal_id,
    anilist_id: anime.anilist_id,
    title: displayTitle(anime),
    image_url: anime.images.cover,
    episodes: anime.episodes ?? null,
    status,
    progress: 0,
    personal_score: null,
    mal_score: anime.mal?.score ?? null,
    anilist_score: anime.anilist_score ?? null,
    is_favorite: false,
    created_at: now(),
    updated_at: now(),
  };
  commit({ ...s, entries: [entry, ...s.entries] });
}

export function updateEntry(id: string, patch: Partial<LocalEntry>) {
  const s = getState();
  commit({
    ...s,
    entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch, updated_at: now() } : e)),
  });
}

export function deleteEntry(id: string) {
  const s = getState();
  commit({ ...s, entries: s.entries.filter((e) => e.id !== id) });
}

export function bulkSetStatus(ids: string[], status: WatchStatus) {
  const set = new Set(ids);
  const s = getState();
  commit({
    ...s,
    entries: s.entries.map((e) => (set.has(e.id) ? { ...e, status, updated_at: now() } : e)),
  });
}

export function bulkDelete(ids: string[]) {
  const set = new Set(ids);
  const s = getState();
  commit({ ...s, entries: s.entries.filter((e) => !set.has(e.id)) });
}

export function toggleFavorite(id: string) {
  const s = getState();
  commit({
    ...s,
    entries: s.entries.map((e) => (e.id === id ? { ...e, is_favorite: !e.is_favorite, updated_at: now() } : e)),
  });
}

export function getEntriesSnapshot(): LocalEntry[] {
  return getState().entries;
}

export type ImportRow = Partial<LocalEntry> & { mal_id: number; title: string };

export function addManyEntries(rows: ImportRow[]): { imported: number; skipped: number } {
  const s = getState();
  const existing = new Set(s.entries.map((e) => e.mal_id).filter((v): v is number => v != null));
  const fresh: LocalEntry[] = [];
  for (const r of rows) {
    if (existing.has(r.mal_id)) continue;
    existing.add(r.mal_id);
    fresh.push(normalize({ ...r, id: newId(), created_at: now(), updated_at: now() }));
  }
  if (fresh.length > 0) commit({ ...s, entries: [...fresh, ...s.entries] });
  return { imported: fresh.length, skipped: rows.length - fresh.length };
}

export function exportBackup(): string {
  return JSON.stringify(getState(), null, 2);
}

export function importBackup(json: string): number {
  const parsed = JSON.parse(json) as Partial<LocalState>;
  if (!Array.isArray(parsed.entries)) throw new Error("Not an AniTrack backup file.");
  const entries = parsed.entries.map(normalize);
  commit({
    version: 1,
    entries,
    settings: { accent_color: parsed.settings?.accent_color || getState().settings.accent_color },
  });
  return entries.length;
}

export function clearAll() {
  commit({ version: 1, entries: [], settings: { accent_color: DEFAULT_ACCENT } });
}

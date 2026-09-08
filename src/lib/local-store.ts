import { useSyncExternalStore } from "react";
import type { Anime } from "./anime-api";

export type WatchStatus = "watching" | "completed" | "plan" | "dropped";

export interface LocalEntry {
  id: string;
  mal_id: number;
  title: string;
  image_url: string;
  episodes: number | null;
  status: WatchStatus;
  progress: number;
  personal_score: number | null;
  mal_score: number | null;
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

function read(): LocalState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<LocalState>;
    return {
      version: 1,
      entries: Array.isArray(parsed.entries) ? (parsed.entries as LocalEntry[]) : [],
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

export function useEntryFor(malId: number): LocalEntry | null {
  return useLocalState().entries.find((e) => e.mal_id === malId) ?? null;
}

export function useFavorites(): LocalEntry[] {
  return useLocalState().entries.filter((e) => e.is_favorite);
}

export function useSettings(): LocalSettings {
  return useLocalState().settings;
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
  if (s.entries.some((e) => e.mal_id === anime.mal_id)) return;
  const entry: LocalEntry = {
    id: newId(),
    mal_id: anime.mal_id,
    title: anime.title_english ?? anime.title,
    image_url: anime.images.jpg.large_image_url,
    episodes: anime.episodes ?? null,
    status,
    progress: 0,
    personal_score: null,
    mal_score: anime.score ?? null,
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

export function addManyEntries(
  rows: Array<Omit<LocalEntry, "id" | "created_at" | "updated_at" | "is_favorite">>,
): { imported: number; skipped: number } {
  const s = getState();
  const existing = new Set(s.entries.map((e) => e.mal_id));
  const fresh: LocalEntry[] = [];
  for (const r of rows) {
    if (existing.has(r.mal_id)) continue;
    existing.add(r.mal_id);
    fresh.push({ ...r, id: newId(), is_favorite: false, created_at: now(), updated_at: now() });
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
  const entries = (parsed.entries as LocalEntry[]).map((e) => ({
    ...e,
    id: e.id || newId(),
    created_at: e.created_at || now(),
    updated_at: e.updated_at || now(),
    is_favorite: !!e.is_favorite,
  }));
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

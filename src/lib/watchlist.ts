import { useEffect, useState } from "react";
import type { Anime } from "./anime-api";

export type Status = "watching" | "completed" | "plan" | "dropped";

export interface WatchlistEntry {
  id: number;
  title: string;
  image: string;
  episodes: number | null;
  progress: number;
  status: Status;
  score: number | null;
  malScore: number | null;
  added: number;
}

const KEY = "anime-watchlist-v1";

function read(): WatchlistEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function write(list: WatchlistEntry[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("watchlist:change"));
}

export function useWatchlist() {
  const [list, setList] = useState<WatchlistEntry[]>([]);

  useEffect(() => {
    setList(read());
    const onChange = () => setList(read());
    window.addEventListener("watchlist:change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("watchlist:change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  return list;
}

export function isInList(id: number): boolean {
  return read().some((e) => e.id === id);
}

export function addToList(anime: Anime, status: Status = "plan") {
  const list = read();
  if (list.some((e) => e.id === anime.mal_id)) return;
  list.unshift({
    id: anime.mal_id,
    title: anime.title_english ?? anime.title,
    image: anime.images.jpg.large_image_url,
    episodes: anime.episodes,
    progress: 0,
    status,
    score: null,
    added: Date.now(),
  });
  write(list);
}

export function removeFromList(id: number) {
  write(read().filter((e) => e.id !== id));
}

export function updateEntry(id: number, patch: Partial<WatchlistEntry>) {
  write(read().map((e) => (e.id === id ? { ...e, ...patch } : e)));
}

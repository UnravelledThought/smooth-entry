import { fetchAnimeCached } from "./anime-cache.functions";

export interface Anime {
  mal_id: number;
  title: string;
  title_english: string | null;
  images: { jpg: { large_image_url: string; image_url: string } };
  score: number | null;
  episodes: number | null;
  year: number | null;
  status: string;
  synopsis: string | null;
  genres: { mal_id: number; name: string }[];
  type: string | null;
}

// L1: per-browser localStorage cache (instant, free).
// L2: shared Supabase `anime_cache` table via server fn (fills once per
// unique query across all users, then served from DB forever).
const PREFIX = "anime-cache:";

function lsGet<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}
function lsSet<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); }
  catch {
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k?.startsWith(PREFIX)) localStorage.removeItem(k);
      }
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch { /* ignore */ }
  }
}

async function cached<T>(key: string, path: string): Promise<T> {
  const hit = lsGet<T>(key);
  if (hit !== null) return hit;
  const fresh = (await fetchAnimeCached({ data: { key, path } })) as T;
  lsSet(key, fresh);
  return fresh;
}

export async function getTopAnime(): Promise<Anime[]> {
  const v = await cached<Anime[] | null>("top", "top/anime?limit=18");
  return v ?? [];
}

export async function getSeasonNow(): Promise<Anime[]> {
  const v = await cached<Anime[] | null>("season", "seasons/now?limit=12");
  return v ?? [];
}

export async function searchAnime(q: string): Promise<Anime[]> {
  const query = q.trim();
  if (!query) return [];
  const norm = query.toLowerCase();
  const v = await cached<Anime[] | null>(
    `q:${norm}`,
    `anime?q=${encodeURIComponent(norm)}&limit=20&sfw=true`,
  );
  return v ?? [];
}

export async function getAnime(id: number): Promise<Anime | null> {
  return cached<Anime | null>(`a:${id}`, `anime/${id}`);
}

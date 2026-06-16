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

const BASE = "https://api.jikan.moe/v4";

// 24h cache for anime data — Jikan rate-limits aggressively and anime metadata
// rarely changes, so persist results to localStorage.
const TTL_MS = 24 * 60 * 60 * 1000;
const PREFIX = "anime-cache:";

type CacheShape<T> = { t: number; v: T };

function cacheGet<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheShape<T>;
    if (Date.now() - parsed.t > TTL_MS) {
      localStorage.removeItem(PREFIX + key);
      return null;
    }
    return parsed.v;
  } catch {
    return null;
  }
}

function cacheSet<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ t: Date.now(), v: value }));
  } catch {
    // quota — try evicting old entries
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k?.startsWith(PREFIX)) localStorage.removeItem(k);
      }
      localStorage.setItem(PREFIX + key, JSON.stringify({ t: Date.now(), v: value }));
    } catch { /* ignore */ }
  }
}

async function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const hit = cacheGet<T>(key);
  if (hit !== null) return hit;
  const fresh = await fetcher();
  cacheSet(key, fresh);
  return fresh;
}

export async function getTopAnime(): Promise<Anime[]> {
  return cached("top", async () => {
    const res = await fetch(`${BASE}/top/anime?limit=18`);
    const json = await res.json();
    return (json.data ?? []) as Anime[];
  });
}

export async function getSeasonNow(): Promise<Anime[]> {
  return cached("season", async () => {
    const res = await fetch(`${BASE}/seasons/now?limit=12`);
    const json = await res.json();
    return (json.data ?? []) as Anime[];
  });
}

export async function searchAnime(q: string): Promise<Anime[]> {
  const query = q.trim();
  if (!query) return [];
  return cached(`q:${query.toLowerCase()}`, async () => {
    const res = await fetch(`${BASE}/anime?q=${encodeURIComponent(query)}&limit=20&sfw=true`);
    const json = await res.json();
    return (json.data ?? []) as Anime[];
  });
}

export async function getAnime(id: number): Promise<Anime | null> {
  return cached(`a:${id}`, async () => {
    const res = await fetch(`${BASE}/anime/${id}`);
    const json = await res.json();
    return (json.data ?? null) as Anime | null;
  });
}

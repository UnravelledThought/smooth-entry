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

// Single-user local app: anime info comes straight from the public Jikan
// (MyAnimeList) API and is cached in this browser so repeat views and repeat
// searches don't hit the network again.

const BASE = "https://api.jikan.moe/v4";
const CACHE_PREFIX = "anitrack.cache.";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function cacheGet<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const { t, data } = JSON.parse(raw) as { t: number; data: T };
    if (Date.now() - t > TTL_MS) {
      window.localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function cacheSet(key: string, data: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ t: Date.now(), data }));
  } catch {
    /* quota exceeded — cache is best-effort */
  }
}

function mapAnime(raw: any): Anime {
  return {
    mal_id: raw?.mal_id,
    title: raw?.title ?? "Untitled",
    title_english: raw?.title_english ?? null,
    images: {
      jpg: {
        large_image_url: raw?.images?.jpg?.large_image_url ?? raw?.images?.jpg?.image_url ?? "",
        image_url: raw?.images?.jpg?.image_url ?? "",
      },
    },
    score: raw?.score ?? null,
    episodes: raw?.episodes ?? null,
    year: raw?.year ?? null,
    status: raw?.status ?? "",
    synopsis: raw?.synopsis ?? null,
    genres: Array.isArray(raw?.genres) ? raw.genres.map((g: any) => ({ mal_id: g.mal_id, name: g.name })) : [],
    type: raw?.type ?? null,
  };
}

async function jikan<T>(key: string, path: string, pick: (json: any) => T): Promise<T | null> {
  const hit = cacheGet<T>(key);
  if (hit != null) return hit;
  try {
    const res = await fetch(`${BASE}${path}`, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Upstream ${res.status}`);
    const json = await res.json();
    const data = pick(json);
    cacheSet(key, data);
    return data;
  } catch (err) {
    console.warn("anime fetch failed", err);
    return null;
  }
}

const list = (json: any) => (Array.isArray(json?.data) ? json.data.map(mapAnime) : []);

export async function getTopAnime(): Promise<Anime[]> {
  return (await jikan("top", "/top/anime?limit=24&sfw", list)) ?? [];
}

export async function getSeasonNow(): Promise<Anime[]> {
  return (await jikan("season", "/seasons/now?limit=24&sfw", list)) ?? [];
}

export async function searchAnime(q: string): Promise<Anime[]> {
  const query = q.trim().toLowerCase();
  if (!query) return [];
  return (
    (await jikan(`search:${query}`, `/anime?q=${encodeURIComponent(query)}&limit=24&sfw`, list)) ?? []
  );
}

export async function getAnime(id: number): Promise<Anime | null> {
  if (!Number.isFinite(id)) return null;
  return await jikan(`detail:${id}`, `/anime/${id}/full`, (json) =>
    json?.data ? mapAnime(json.data) : null,
  );
}

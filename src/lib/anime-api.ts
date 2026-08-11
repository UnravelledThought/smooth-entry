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

// All anime data flows through the shared server-side cache table
// (public.anime_cache). No browser-local storage — once any user has fetched
// a given key, every user gets it from the DB.

// The cache endpoint requires a signed-in caller and depends on an upstream API,
// so both "not signed in yet" and "upstream hiccup" are normal outcomes.
// Never let them bubble up as a route error (blank screen) — degrade instead.
type CacheReq =
  | { kind: "top" }
  | { kind: "season" }
  | { kind: "detail"; id: number }
  | { kind: "search"; q: string };

async function safeFetch(data: CacheReq) {
  try {
    return (await fetchAnimeCached({ data })) as unknown;
  } catch (err) {
    console.warn("anime fetch failed", err);
    return null;
  }
}

export async function getTopAnime(): Promise<Anime[]> {
  return ((await safeFetch({ kind: "top" })) as Anime[] | null) ?? [];
}

export async function getSeasonNow(): Promise<Anime[]> {
  return ((await safeFetch({ kind: "season" })) as Anime[] | null) ?? [];
}

export async function searchAnime(q: string): Promise<Anime[]> {
  const query = q.trim().toLowerCase();
  if (!query) return [];
  return ((await safeFetch({ kind: "search", q: query })) as Anime[] | null) ?? [];
}

export async function getAnime(id: number): Promise<Anime | null> {
  return (await safeFetch({ kind: "detail", id })) as Anime | null;
}

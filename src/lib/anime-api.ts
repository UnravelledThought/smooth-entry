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

export async function getTopAnime(): Promise<Anime[]> {
  const v = (await fetchAnimeCached({ data: { kind: "top" } })) as Anime[] | null;
  return v ?? [];
}

export async function getSeasonNow(): Promise<Anime[]> {
  const v = (await fetchAnimeCached({ data: { kind: "season" } })) as Anime[] | null;
  return v ?? [];
}

export async function searchAnime(q: string): Promise<Anime[]> {
  const query = q.trim().toLowerCase();
  if (!query) return [];
  const v = (await fetchAnimeCached({ data: { kind: "search", q: query } })) as Anime[] | null;
  return v ?? [];
}

export async function getAnime(id: number): Promise<Anime | null> {
  return (await fetchAnimeCached({ data: { kind: "detail", id } })) as Anime | null;
}

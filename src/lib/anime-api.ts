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
  const v = (await fetchAnimeCached({ data: { key: "top", path: "top/anime?limit=18" } })) as Anime[] | null;
  return v ?? [];
}

export async function getSeasonNow(): Promise<Anime[]> {
  const v = (await fetchAnimeCached({ data: { key: "season", path: "seasons/now?limit=12" } })) as Anime[] | null;
  return v ?? [];
}

export async function getLatestReleases(): Promise<Anime[]> {
  const v = (await fetchAnimeCached({
    data: {
      key: "latest",
      path: "anime?status=airing&order_by=start_date&sort=desc&limit=12&sfw=true",
    },
  })) as Anime[] | null;
  return v ?? [];
}


export async function searchAnime(q: string): Promise<Anime[]> {
  const query = q.trim().toLowerCase();
  if (!query) return [];
  const v = (await fetchAnimeCached({
    data: { key: `q:${query}`, path: `anime?q=${encodeURIComponent(query)}&limit=20&sfw=true` },
  })) as Anime[] | null;
  return v ?? [];
}

export async function getAnime(id: number): Promise<Anime | null> {
  return (await fetchAnimeCached({ data: { key: `a:${id}`, path: `anime/${id}` } })) as Anime | null;
}

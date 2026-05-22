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

export async function getTopAnime(): Promise<Anime[]> {
  const res = await fetch(`${BASE}/top/anime?limit=18`);
  const json = await res.json();
  return json.data ?? [];
}

export async function getSeasonNow(): Promise<Anime[]> {
  const res = await fetch(`${BASE}/seasons/now?limit=12`);
  const json = await res.json();
  return json.data ?? [];
}

export async function searchAnime(q: string): Promise<Anime[]> {
  if (!q.trim()) return [];
  const res = await fetch(`${BASE}/anime?q=${encodeURIComponent(q)}&limit=20&sfw=true`);
  const json = await res.json();
  return json.data ?? [];
}

export async function getAnime(id: number): Promise<Anime | null> {
  const res = await fetch(`${BASE}/anime/${id}`);
  const json = await res.json();
  return json.data ?? null;
}

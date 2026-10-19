/**
 * Jikan (MyAnimeList) client — enrichment only.
 * Always keyed by MAL id (never by title). Owns MAL scores/ranks and per-episode
 * data. Failures here must never take AniList metadata down with them.
 */

import { SourceUnavailableError } from "./anilist";
import type { Episode, MalDetails } from "./types";

const BASE = "https://api.jikan.moe/v4";

/* Serialize requests and keep a gap between them — Jikan allows ~3 req/s. */
const MIN_GAP_MS = 400;
let chain: Promise<unknown> = Promise.resolve();
let lastAt = 0;

function queued<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const wait = Math.max(0, lastAt + MIN_GAP_MS - Date.now());
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    try {
      return await fn();
    } finally {
      lastAt = Date.now();
    }
  });
  chain = run.catch(() => undefined);
  return run as Promise<T>;
}

/** One retry with backoff, then report unavailable. No loops. */
/* Circuit breaker: after a network/5xx failure, skip MAL for a minute so the UI doesn't hang. */
let downUntil = 0;

async function get<T>(path: string): Promise<T> {
  if (Date.now() < downUntil) throw new SourceUnavailableError("jikan", "MyAnimeList unavailable");
  return queued(async () => {
    if (Date.now() < downUntil) throw new SourceUnavailableError("jikan", "MyAnimeList unavailable");
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 900));
      try {
        const res = await fetch(`${BASE}${path}`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(6000) });
        if (res.status === 429 && attempt === 0) continue;
        if (res.status >= 500) downUntil = Date.now() + 60_000;
        if (res.status === 429 || res.status >= 500) {
          throw new SourceUnavailableError("jikan", `MyAnimeList responded ${res.status}`);
        }
        if (res.status === 404) throw new SourceUnavailableError("jikan", "Not found on MyAnimeList");
        if (!res.ok) throw new SourceUnavailableError("jikan", `MyAnimeList responded ${res.status}`);
        return (await res.json()) as T;
      } catch (err) {
        if (err instanceof SourceUnavailableError) throw err;
        downUntil = Date.now() + 60_000;
        throw new SourceUnavailableError("jikan", `Network error: ${String(err)}`);
      }
    }
    throw new SourceUnavailableError("jikan", "MyAnimeList unavailable");
  });
}

export async function jikanDetails(malId: number): Promise<MalDetails> {
  const json = await get<any>(`/anime/${malId}`);
  const d = json?.data ?? {};
  return {
    mal_id: malId,
    score: typeof d.score === "number" ? d.score : null,
    rank: typeof d.rank === "number" ? d.rank : null,
    popularity: typeof d.popularity === "number" ? d.popularity : null,
    members: typeof d.members === "number" ? d.members : null,
    last_synced_at: new Date().toISOString(),
  };
}

export async function jikanEpisodes(malId: number, animeInternalId: string): Promise<Episode[]> {
  const out: Episode[] = [];
  let page = 1;
  let hasNext = true;
  // Cap the pages so a very long series can't turn into a request storm.
  while (hasNext && page <= 8) {
    const json = await get<any>(`/anime/${malId}/episodes?page=${page}`);
    const rows: any[] = Array.isArray(json?.data) ? json.data : [];
    for (const e of rows) {
      const num = Number(e?.mal_id);
      if (!Number.isFinite(num)) continue;
      out.push({
        internal_id: `${animeInternalId}-ep${num}`,
        anime_id: animeInternalId,
        mal_episode_id: num,
        episode_number: num,
        title: e.title ?? null,
        title_japanese: e.title_japanese ?? null,
        air_date: e.aired ?? null,
        score: typeof e.score === "number" ? e.score : null,
        filler: !!e.filler,
        recap: !!e.recap,
      });
    }
    hasNext = !!json?.pagination?.has_next_page;
    page += 1;
  }
  return out.sort((a, b) => a.episode_number - b.episode_number);
}

/**
 * Unified anime data service. The only anime data module the UI imports.
 *
 *   Frontend → Anime Data Service → { AniList client, Jikan client } → cache
 *
 * Routing rules:
 *   search / trending / season  → AniList only
 *   anime metadata              → AniList (cached), by MAL id or AniList id
 *   MAL score/rank/members      → Jikan, keyed by AniList's idMal
 *   episodes                    → Jikan, keyed by AniList's idMal
 *
 * The two sources are independent failure points: each operation reports its own
 * status, and neither one falls back to the other for data it does not own.
 */

import { SourceUnavailableError, alByAnilistId, alByMalId, alByMalIds, alSearch, alSeasonNow, alTrending } from "./anilist";
import { jikanDetails, jikanEpisodes } from "./jikan";
import { TTL, cacheRead, cacheWrite, isStale, type CacheRecord } from "./cache";
import type { Anime, Episode, MalDetails, SourceResult } from "./types";

export { SourceUnavailableError };
export * from "./types";
export { clearAnimeCache } from "./cache";

function ok<T>(data: T, rec: CacheRecord<unknown> | null, stale = false): SourceResult<T> {
  return { data, status: "ok", stale, last_synced_at: rec?.last_synced_at ?? null };
}

/**
 * Serve cache when fresh; otherwise fetch. If the fetch fails but we hold stale
 * cached data, serve that and flag it — cached AniList data keeps working while
 * the source is down.
 */
async function cached<T>(key: string, ttl: number, fetcher: () => Promise<T>): Promise<SourceResult<T>> {
  const rec = cacheRead<T>(key);
  if (rec && !isStale(rec, ttl)) return ok(rec.data, rec);
  try {
    const data = await fetcher();
    return ok(data, cacheWrite(key, data));
  } catch (err) {
    if (rec) return { data: rec.data, status: "ok", stale: true, last_synced_at: rec.last_synced_at };
    throw err;
  }
}

/* ---------- AniList-backed operations ---------- */

export async function searchAnime(query: string): Promise<SourceResult<Anime[]>> {
  const q = query.trim();
  if (!q) return { data: [], status: "ok", stale: false, last_synced_at: null };
  return cached(`search:${q.toLowerCase()}`, TTL.search, () => alSearch(q));
}

export async function getTrending(): Promise<SourceResult<Anime[]>> {
  return cached("list:top", TTL.list, () => alTrending());
}

export async function getSeasonNow(): Promise<SourceResult<Anime[]>> {
  return cached("list:season", TTL.list, () => alSeasonNow());
}

export async function getAnimeSummaries(malIds: number[]): Promise<Anime[]> {
  const found: Anime[] = [];
  const missing: number[] = [];
  for (const id of new Set(malIds)) {
    const rec = cacheRead<Anime>(`anilist:mal:${id}`) ?? cacheRead<Anime>(`summary:mal:${id}`);
    if (rec?.data && !isStale(rec, TTL.metadata)) found.push(rec.data);
    else missing.push(id);
  }
  for (let i = 0; i < missing.length; i += 50) {
    if (i > 0) await new Promise((resolve) => setTimeout(resolve, 700));
    const batch = await alByMalIds(missing.slice(i, i + 50));
    for (const anime of batch) {
      cacheWrite(`summary:mal:${anime.mal_id}`, anime);
      found.push(anime);
    }
  }
  return found;
}

/** `id` is a MAL id, or `al<anilistId>` for titles with no MAL entry. */
export async function getAnime(id: string, opts: { force?: boolean } = {}): Promise<SourceResult<Anime | null>> {
  const isAl = id.startsWith("al");
  const numeric = Number(isAl ? id.slice(2) : id);
  if (!Number.isFinite(numeric)) return { data: null, status: "ok", stale: false, last_synced_at: null };
  const key = isAl ? `anilist:${numeric}` : `anilist:mal:${numeric}`;
  const fetcher = () => (isAl ? alByAnilistId(numeric) : alByMalId(numeric));
  if (opts.force) {
    const data = await fetcher();
    return ok(data, cacheWrite(key, data));
  }
  return cached(key, TTL.metadata, fetcher);
}

/* ---------- Jikan-backed operations ---------- */

/** MyAnimeList numbers only. Requested separately so failure stays isolated. */
export async function getMalDetails(
  malId: number | null | undefined,
  opts: { force?: boolean } = {},
): Promise<SourceResult<MalDetails | null>> {
  if (!malId) return { data: null, status: "ok", stale: false, last_synced_at: null };
  const key = `mal:${malId}`;
  try {
    if (opts.force) {
      const data = await jikanDetails(malId);
      return ok(data, cacheWrite(key, data));
    }
    return await cached(key, TTL.mal, () => jikanDetails(malId));
  } catch {
    return { data: null, status: "unavailable", stale: false, last_synced_at: null };
  }
}

export async function getEpisodes(
  anime: Pick<Anime, "mal_id" | "internal_id">,
  opts: { force?: boolean } = {},
): Promise<SourceResult<Episode[]>> {
  if (!anime.mal_id) return { data: [], status: "unavailable", stale: false, last_synced_at: null };
  const key = `episodes:${anime.mal_id}`;
  try {
    if (opts.force) {
      const data = await jikanEpisodes(anime.mal_id, anime.internal_id);
      return ok(data, cacheWrite(key, data));
    }
    return await cached(key, TTL.episodes, () => jikanEpisodes(anime.mal_id!, anime.internal_id));
  } catch {
    return { data: [], status: "unavailable", stale: false, last_synced_at: null };
  }
}

/** Force a re-sync of both sides for one anime. */
export async function refreshAnime(id: string): Promise<SourceResult<Anime | null>> {
  const res = await getAnime(id, { force: true });
  const a = res.data;
  if (a?.mal_id) {
    await getMalDetails(a.mal_id, { force: true });
    await getEpisodes(a, { force: true });
  }
  return res;
}

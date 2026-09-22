# AniList + Jikan data layer

## Why this is needed now

Search, trending and seasonal are all failing right now. Confirmed: the MyAnimeList service AniTrack uses (Jikan) returns a gateway timeout on every request — "Jikan failed to connect to MyAnimeList". The site's own code is fine; the source is down. AniList, tested just now, works.

So the fix and your spec are the same job: AniList becomes the main source, Jikan becomes an extra that can fail without breaking the site.

## What you'll get

- Search, trending, seasonal and anime pages work again, powered by AniList.
- Richer anime pages: Japanese title, banner image, studios, tags, characters with voice actors, staff, sequels/prequels, streaming links, airing countdown, and both scores side by side (AniList score and MyAnimeList score, never mixed together).
- Episode lists with episode titles, Japanese titles, air dates, episode scores, and filler/recap markers — from MyAnimeList.
- When MyAnimeList is down, the anime page still loads fully; only the MAL score and episode list show as temporarily unavailable, with a retry.
- When AniList is down, anything you've viewed before still loads from the local cache.
- Everything is cached in your browser with a "last synced" time, plus a refresh action per anime so you can pull fresh data on demand.

## Technical section

Internal model (`src/lib/anime/types.ts`)
- `Anime`: `internal_id` (`al-<anilistId>`), `anilist_id`, `mal_id`, `titles {romaji,english,native}`, `description`, `images {cover,banner}`, `format`, `status`, `dates {start,end}`, `season`, `season_year`, `episodes`, `duration`, `genres`, `tags`, `studios`, `staff`, `characters` (with voice actors), `relations`, `recommendations`, `airing {nextEpisode,timeUntil}`, `streaming`, `anilist_score`, `popularity`, `rankings`, `mal_score`, `mal_rank`, `mal_popularity`, `mal_members`, `last_synced_at`.
- `Episode`: `internal_id`, `anime_id`, `mal_episode_id`, `episode_number`, `title`, `title_japanese`, `air_date`, `score`, `filler`, `recap`.
- MAL fields live in a separate optional `mal` block so an AniList refresh can never clobber them and vice versa.

Clients
- `src/lib/anime/anilist.ts`: GraphQL POST to `https://graphql.anilist.co`. Queries: `searchAnime`, `animeByAnilistId`, `trending` (`TRENDING_DESC`), `season` (current season/year). Maps `Media` → internal model, strips HTML from `description`, `averageScore/10` → `anilist_score`.
- `src/lib/anime/jikan.ts`: REST to `https://api.jikan.moe/v4`, keyed strictly by `idMal` — `/anime/{malId}` for score/rank/popularity/members, `/anime/{malId}/episodes` (paged) for episodes. No title matching. Rate-limit aware: at most one in-flight request, small queue, single retry on 429/5xx with backoff, then give up and report unavailable.

Service (`src/lib/anime/service.ts`) — the only module routes import
- `searchAnime(query)` → AniList only.
- `getTrending()` / `getSeasonNow()` → AniList only.
- `getAnime(internalOrAnilistId)` → cached AniList entity, fetch if stale/missing.
- `getMalDetails(malId)` → Jikan score block, separate query so failure is isolated.
- `getEpisodes(animeId)` → Jikan via `mal_id`.
- `refreshAnime(animeId)` → force re-fetch both sides, update `last_synced_at`.
- Each returns typed results with per-source status; no cross-source fallback.

Caching
- `src/lib/anime/cache.ts`: versioned localStorage store, new prefix (`anitrack.v2.`) so the current poisoned/empty entries are dropped. Separate records per source (`anilist:<id>`, `mal:<malId>`, `episodes:<malId>`) each with `last_synced_at`. Only successful responses are stored. TTLs: metadata 7 days, MAL scores 1 day, episodes 3 days, search results 1 hour; stale data is still served while a refresh runs.
- React Query keys mirror the service operations; long `staleTime`, no retry storms.

Routes
- `src/lib/anime-api.ts` is replaced by the service; existing imports in `index.tsx`, `search.tsx`, `anime.$id.tsx`, `list.tsx`, `stats.tsx`, `mal-io.ts` are repointed. `list.tsx`/`local-store.ts` keep storing `mal_id` so saved lists and MAL import/export stay valid; entries also gain `anilist_id` when known.
- `anime.$id.tsx` becomes tabbed (Overview / Episodes / Characters / Related), with each panel degrading independently and a "Refresh data" button showing the last-synced time.
- `search.tsx` and `index.tsx` distinguish "no results" from "data source unavailable — retry".
- Route IDs stay MAL-based (`/anime/$id`) so existing links keep working; the service resolves a MAL id to the AniList entity.

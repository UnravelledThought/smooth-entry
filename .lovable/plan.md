# Fix anime search (data source is down)

## What's wrong

Search isn't broken in your site's code — the MyAnimeList data service AniTrack uses (Jikan) is currently failing every request with a gateway timeout: "Jikan failed to connect to MyAnimeList." Trending and seasonal rows on the home page fail for the same reason. Verified just now: every request to it times out, from the preview and from a direct test.

Also, when a fetch fails the page just shows "No results", so it looks like the anime doesn't exist instead of telling you the service is unavailable.

## The fix

1. Switch the primary anime source to AniList, which is up and returns the same information (title, English title, cover art, score, episodes, year, status, synopsis, genres, type) and includes the MyAnimeList ID, so your existing list entries and links keep working unchanged.
2. Keep MyAnimeList/Jikan as an automatic fallback, so if AniList ever has an outage the site tries the other source instead of failing.
3. Show a clear message when both sources are unreachable ("Anime data is temporarily unavailable — try again in a moment") with a retry button, separate from the genuine "no results" message.
4. Don't cache failures. Only successful responses go into the browser cache, so a temporary outage doesn't stick around for 30 days.

## Technical section

- `src/lib/anime-api.ts`: add an AniList GraphQL provider (`https://graphql.anilist.co`) mapping `Media` → the existing `Anime` interface (`idMal` → `mal_id`, `coverImage.large` → `images.jpg.large_image_url`, `averageScore/10` → `score`, `seasonYear` → `year`, strip HTML from `description`). Keep the Jikan path as fallback. Fetchers become: `getTopAnime` (sort `SCORE_DESC`), `getSeasonNow` (current season/year), `searchAnime` (`search:`), `getAnime(id)` (`idMal:`). Keep the same exported signatures and the `anitrack.cache.` localStorage cache, bumped to a new prefix version so stale/empty entries are dropped; write to cache only on success.
- Fetchers throw on total failure instead of returning `[]`/`null`, so React Query surfaces `isError`; `src/routes/search.tsx`, `src/routes/index.tsx`, and `src/routes/anime.$id.tsx` render an unavailable state with a refetch action. Detail route keeps not-found handling for a valid-but-missing ID.

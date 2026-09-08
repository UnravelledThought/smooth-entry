# AniTrack as a single-person local app

Turn AniTrack into a personal tracker that runs without accounts. Everything you track is saved in your own browser.

## What changes for you

- No sign-in, no sign-up, no passwords, no user numbers. Opening the site drops you straight into Discover.
- Your watchlist, favorites, and settings live in your browser. Nothing is sent to a server.
- Favorites stay: mark any anime as a favorite and your top picks show on the home page.
- The community feed and other people's profile pages go away.
- Accent color stays in Settings, saved in the browser.
- Backup and restore: the existing MyAnimeList import/export stays, plus a one-click "export my data" / "import" so you can move your list to another browser or keep a backup.

## Pages after the change

- Discover — trending/seasonal anime, plus your favorites strip
- Search — search and add anime
- My List — tabbed watching / completed / plan / dropped, with progress and ratings
- Stats — insights from your local list
- Settings — accent color, backup/restore, clear all data

Removed: sign-in page, public profile page, community shares feed, share/pin buttons (pin becomes favorite).

## Note on anime info caching

Anime details still come from the public MyAnimeList data source. The shared server-side cache required a signed-in user, so it can no longer be used. Requests will be cached in your browser instead, so repeat searches and repeat visits to the same anime don't re-fetch. This means slightly more outside requests than the shared cache, but no account is needed.

## Technical section

Local storage layer
- New `src/lib/local-store.ts`: versioned localStorage store for entries (`mal_id`, title, image, episodes, status, progress, personal_score, mal_score, is_favorite, timestamps) plus settings (accent color, display name optional). Exposes hooks mirroring today's API shape (`useMyEntries`, `useEntryFor`, `useAddEntry`, `useUpdateEntry`, `useDeleteEntry`, `useFavorites`) so route code changes minimally. SSR-safe: read inside `useEffect`/after hydration, never during render.
- Delete `src/lib/cloud-watchlist.ts`, `src/lib/auth.tsx`, `src/lib/watchlist.ts` (legacy), `src/routes/auth.tsx`, `src/routes/u.$slug.tsx`.

Routes/components
- `Layout.tsx`: drop auth dropdown and sign-in button; keep nav (Discover, Search, List, Stats) and a Settings link/icon.
- `index.tsx`: remove auth redirect and community feed; add "Favorites" section from local store; keep trending/seasonal.
- `list.tsx`, `stats.tsx`, `anime.$id.tsx`, `settings.tsx`, `mal-io.ts`: swap cloud hooks for local-store hooks; "Pin"/"Share" toggles collapse into a single favorite toggle.
- `AccentApplier.tsx`: read accent from local settings instead of profile.
- `__root.tsx`: remove `AuthProvider` and `onAuthStateChange` wiring.

Data fetching
- `anime-api.ts` calls the public Jikan endpoints directly from the client via React Query with long `staleTime`/`gcTime` and a localStorage persister for durable caching. Remove use of `anime-cache.functions.ts` (file deleted).

Backend cleanup
- Backend tables (`profiles`, `watchlist_entries`, `anime_cache`) and the avatar storage bucket become unused. The plan leaves them in place rather than dropping data; a follow-up migration can remove them once you confirm nothing there is worth keeping. Supabase client imports are removed from app code either way.

SEO/head
- Update per-route `head()` titles/descriptions where the auth/profile routes are removed.

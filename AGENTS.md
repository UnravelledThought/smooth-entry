# Project rules
- Keep watchlists and settings in the account-backed store (`src/lib/local-store.ts`): in-memory state, optimistic mutations written to Lovable Cloud; anime metadata caching stays in the browser.
- Auth is username + password mapped to a synthetic email; public profiles resolve by `username.uid` slug through a server function using the publishable client.
- Resolve imported anime artwork through the normalized anime service, in batches, and persist metadata without overwriting personal tracking fields.
- Preserve MAL On-Hold as a distinct watch status across import, export, list controls, and statistics.
- Keep source scores separate: MAL ratings come from Jikan, never substitute AniList scores under a MAL label.
- Route Jikan cooldown configuration through the anime service, defaulting to 60 seconds, and retain cached MAL scores and episodes on failed refreshes so outages cannot erase useful source data.
- Snapshot watchlist sorting values until the user changes the sort or reopens the page, so tracking edits save immediately without moving cards mid-interaction.

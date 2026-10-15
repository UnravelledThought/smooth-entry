# Project rules
- Keep watchlists and settings in the versioned browser store; this is a single-person local app.
- Resolve imported anime artwork through the normalized anime service, in batches, and persist metadata without overwriting personal tracking fields.
- Preserve MAL On-Hold as a distinct watch status across import, export, list controls, and statistics.
- Keep source scores separate: MAL ratings come from Jikan, never substitute AniList scores under a MAL label.
- Snapshot watchlist sorting values until the user changes the sort or reopens the page, so tracking edits save immediately without moving cards mid-interaction.
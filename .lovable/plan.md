# Discover page: featured banner slideshow

Replace the "one list for all anime." text block at the top of Discover with a large rotating banner like the reference, styled in AniTrack's look: black and white, your accent color as the only color, soft-square corners, Google Sans Flex.

## What it shows
- The wide banner artwork of anime airing this season (the ones that have a banner), up to 6 slides
- A dark fade from the left and bottom so text stays readable on black
- Small labels: status (e.g. "Airing", "Upcoming") in your accent color, format (TV, Movie) as a plain outlined tag
- Big title, then a quiet line: format · season year · episode count
- Up to 3 genre tags as small outlined soft-square chips
- A two-line description
- Buttons: **View details** (accent), **Add to list** / **In list** (outlined), and a heart for favorites. No trailer button, since the anime info we use doesn't include trailers.
- Left/right arrows, small progress dashes at the bottom, auto-advance every 7 seconds, pausing when you point at it
- Keeps a short "one list for all anime." line below as a small subtitle? No: removed, to keep the page minimal. The "Start tracking" and "My list" links are covered by the banner buttons and the top menu.

## Fallbacks
- While loading: a plain dark block of the same size
- If anime info can't load: the current text block with "Start tracking" returns, so the page never looks broken
- On phones: shorter banner, description hidden, arrows hidden (swipe-free, uses the dashes)

## Technical details
- New `src/components/FeaturedHero.tsx`, fed by the existing `season` query in `src/routes/index.tsx` (no extra requests); filter `images.banner`.
- Uses `addEntry` / `useEntryFor` / `toggleFavorite` from the local store; the heart is enabled only once the anime is in the list (favorites live on list entries).
- Description: strip HTML from AniList text.
- Gradients use `from-background` tokens; no hardcoded colors. Corners `rounded-md`.
- Verify with Playwright screenshots on desktop and mobile widths.

# Replace pill buttons with soft-square corners

Use the same corner shape as the Search tab's search box (`rounded-md`, about 6px) for buttons and button-like controls across the site.

## What changes
- Header nav links and the settings button (Layout)
- Discover, Search, List, Stats, Settings and anime detail page buttons: Add, Retry, Refresh, Select/Done, sort dropdown, list search field, status tabs, bulk-action bar and its buttons, favorite toggle, small tags/chips
- The bottom selection bar on My list becomes a soft-square panel

## What stays round
- Things that are naturally circles, not buttons: progress bars, slider thumbs, toggle switches, radio dots, color swatches, avatars
- Tiny circular icon buttons (+/− episode buttons, trash, close X) also switch to soft-square so nothing looks pill-like, except the selection check mark dot

## Technical details
- Replace `rounded-full` with `rounded-md` on interactive elements in `src/components/Layout.tsx` and `src/routes/{index,search,list,stats,settings,anime.$id}.tsx`; remove `sm:rounded-full` on the list tabs.
- Leave `src/components/ui/*` primitives (switch, slider, progress, radio, avatar) untouched.
- Save a design memory: buttons use soft-square corners, no pills.
- Verify with Playwright screenshots of List and an anime page.

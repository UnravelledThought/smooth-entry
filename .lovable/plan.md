## AniTrack Logo System — Plan

Deliver a dark-mode-first, accent-reactive logo system as **live SVG React components** (no PNG assets). Two-layer architecture per the brief:

- **Base layer** — `currentColor` (white/off-white on dark).
- **Accent layer** — `var(--accent-color)`, used only for small highlights. Logo must read cleanly with the accent hidden.

### 1. Component architecture

New folder: `src/components/brand/`

- `LogoMonogram.tsx` — the AT lettermark (icon-only, square).
- `LogoRing.tsx` — AT inside a progress-ring arc.
- `LogoBrush.tsx` — calligraphy-inspired mark (single confident stroke + AT tuck).
- `LogoWordmark.tsx` — "AniTrack" typographic wordmark with a subtle accent detail (dot on the "i" or underline tick).
- `Logo.tsx` — composed lockup (icon + wordmark), the default used across the app. Props: `variant: 'monogram' | 'ring' | 'brush' | 'wordmark' | 'lockup'`, `size`, `showAccent` (default true), `mono` (force monochrome).

Every SVG:
- Uses `fill="currentColor"` / `stroke="currentColor"` on the base layer so text color drives it.
- Uses `fill="var(--accent-color)"` on the accent layer, wrapped in a group that can be hidden via `showAccent={false}` or the `mono` prop.
- No hardcoded hex. No raster. `viewBox` normalized (24 for icon, 120×24 for wordmark).
- Accessible: `role="img"` + `<title>AniTrack</title>`, `aria-label` on interactive uses.

### 2. Concept direction (what each mark actually looks like)

- **Monogram (AT)** — Geometric A and T sharing the horizontal crossbar. Single-weight strokes, sharp terminals. Accent = a short diagonal slash through the T's stem (the "track" tick).
- **Progress Ring** — 270° arc ring around the monogram. Base ring is a dim outline; a ~90° arc segment at the top-right is the accent (the "progress" indicator).
- **Brush mark** — One tapered stroke forming an implied A with a horizontal T bar, drawn with variable width to feel like sumi-e but constructed from Bézier paths (not a raster brush). Accent = a small stamp dot (hanko-style square) at the baseline.
- **Wordmark** — "AniTrack" set in Syne (already loaded in `__root.tsx`), 700 weight, -0.03em tracking. Accent = the dot on the lowercase "i" replaced with a small accent-colored square, plus an optional 2px accent underline under "Track".

### 3. Integration points

- **Navbar** — `src/components/Layout.tsx`: replace the current text/logo header with `<Logo variant="lockup" />`. Keep it a `Link` to `/`.
- **Loading screen** — Any full-screen "Loading…" state (settings, profile) gets `<Logo variant="ring" />` with a subtle CSS spin on the accent arc (`animation: spin 1.4s linear infinite` on the accent group only).
- **Auth page** — `src/routes/auth.tsx` header uses `<Logo variant="lockup" size="lg" />`.
- **Favicon / app icon** — Add `public/favicon.svg` (monogram, `currentColor` won't apply in a favicon so bake in `#ffffff` for base and `#ff2d6f` default for the accent slash — favicon can't read the user's runtime accent). Reference from `src/routes/__root.tsx` `head().links`.
- **Social/OG** — Leave existing `og:*` untouched; no og:image change (no meaningful cover image exists).

### 4. Accent reactivity verification

`AccentApplier` already writes `--accent-color` to `:root` from the user's profile. Because all logo components read `var(--accent-color)` inline, changing the accent on `/settings` updates every logo instance live with zero extra wiring.

Mono/print fallback: `<Logo mono />` hides the accent group entirely — the mark must still read as AniTrack. This is a hard acceptance criterion for each concept.

### 5. Out of scope (not in this pass)

- No PNG/JPG concept sheets (per your pick: SVG components in the app).
- No animated intro sequence beyond the loading-ring spin.
- No rebrand of colors, fonts, or copy elsewhere.
- No changes to routing, auth, or backend.

### Files touched

- **New**: `src/components/brand/Logo.tsx`, `LogoMonogram.tsx`, `LogoRing.tsx`, `LogoBrush.tsx`, `LogoWordmark.tsx`, `public/favicon.svg`.
- **Edited**: `src/components/Layout.tsx` (navbar swap), `src/routes/__root.tsx` (favicon link), `src/routes/auth.tsx` (header lockup), `src/routes/settings.tsx` + `src/routes/u.$slug.tsx` (loading state uses `LogoRing`).

### Acceptance

1. All four concepts render as standalone components and can be previewed by importing them anywhere.
2. Default app chrome uses the **lockup** (monogram + wordmark) — the strongest, most Linear/Vercel-like direction.
3. Changing accent color in `/settings` recolors the accent layer in the navbar logo in real time.
4. `<Logo mono />` still reads correctly (accent hidden).
5. Favicon shows the monogram on both light and dark browser chromes.

/** Pure rules for watchlist entry values; shared by edits and imports. */
export const STATUSES = ["watching", "completed", "onhold", "plan", "dropped"] as const;
export type Status = (typeof STATUSES)[number];

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Episode count: positive integer or unknown. */
export function cleanEpisodes(v: unknown): number | null {
  const n = num(v);
  return n != null && n > 0 ? Math.floor(n) : null;
}

/** Progress: whole number between 0 and the episode count (when known). */
export function clampProgress(v: unknown, episodes: number | null | undefined): number {
  const n = Math.max(0, Math.floor(num(v) ?? 0));
  return episodes != null && episodes > 0 ? Math.min(n, episodes) : n;
}

/** Scores: 0.0–10.0 with one decimal, or none. */
export function clampScore(v: unknown): number | null {
  const n = num(v);
  if (n == null) return null;
  return Math.round(Math.min(10, Math.max(0, n)) * 10) / 10;
}

export function cleanStatus(v: unknown): Status {
  return (STATUSES as readonly unknown[]).includes(v) ? (v as Status) : "plan";
}

export function cleanId(v: unknown): number | null {
  const n = num(v);
  return n != null && Number.isInteger(n) && n > 0 ? n : null;
}

/** Same anime if either source ID matches. */
export function sameAnime(
  a: { mal_id: number | null; anilist_id: number | null },
  b: { mal_id: number | null; anilist_id: number | null },
): boolean {
  return (a.mal_id != null && a.mal_id === b.mal_id) || (a.anilist_id != null && a.anilist_id === b.anilist_id);
}

/** Keeps the first occurrence of each anime (matched by MAL or AniList ID). */
export function dedupeAnime<T extends { mal_id: number | null; anilist_id: number | null }>(
  rows: T[], existing: { mal_id: number | null; anilist_id: number | null }[] = [],
): T[] {
  const mal = new Set(existing.map((e) => e.mal_id).filter((v) => v != null));
  const al = new Set(existing.map((e) => e.anilist_id).filter((v) => v != null));
  const out: T[] = [];
  for (const r of rows) {
    if ((r.mal_id != null && mal.has(r.mal_id)) || (r.anilist_id != null && al.has(r.anilist_id))) continue;
    if (r.mal_id != null) mal.add(r.mal_id);
    if (r.anilist_id != null) al.add(r.anilist_id);
    out.push(r);
  }
  return out;
}
